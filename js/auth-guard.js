// Authentication Guard for TourApp Admin Web Interface
// Prevents unauthorized access to admin pages

class AuthGuard {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.userRole = null;
    }

    // Initialize authentication guard
    async initialize() {
        if (this.isInitialized) return true;

        try {
            console.log('AuthGuard: Initializing...');
            
            // Wait for Firebase to initialize
            let attempts = 0;
            const maxAttempts = 30;
            
            while (attempts < maxAttempts) {
                if (typeof firebaseServices !== 'undefined' && firebaseServices.auth) {
                    console.log('AuthGuard: Firebase auth available');
                    break;
                }
                console.log(`AuthGuard: Waiting for Firebase auth... attempt ${attempts + 1}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }

            if (typeof firebaseServices === 'undefined' || !firebaseServices.auth) {
                console.error('AuthGuard: Firebase services not available');
                this.redirectToLogin('Firebase services not available. Please refresh the page.');
                return false;
            }

            // Wait for auth state to be determined with timeout
            console.log('AuthGuard: Waiting for auth state...');
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.log('AuthGuard: Auth state timeout, checking current user');
                    resolve(firebaseServices.auth.currentUser);
                }, 5000); // 5 second timeout
                
                const unsubscribe = firebaseServices.auth.onAuthStateChanged((user) => {
                    clearTimeout(timeout);
                    unsubscribe();
                    resolve(user);
                });
            });

            // Check if user is authenticated
            this.currentUser = firebaseServices.auth.currentUser;
            console.log('AuthGuard: Current user:', this.currentUser ? this.currentUser.email : 'None');
            
            if (!this.currentUser) {
                console.log('AuthGuard: No authenticated user');
                this.redirectToLogin('Please log in to access the admin dashboard.');
                return false;
            }

            // Check if user has admin role
            try {
                console.log('AuthGuard: Checking user role for:', this.currentUser.uid);
                const userDoc = await firebaseServices.usersCollection.doc(this.currentUser.uid).get();
                
                if (!userDoc.exists) {
                    console.error('AuthGuard: User document not found');
                    this.redirectToLogin('User profile not found. Please contact administrator.');
                    return false;
                }

                const userData = userDoc.data();
                this.userRole = (userData.role || '').toLowerCase();
                console.log('AuthGuard: User role:', this.userRole);
                
                if (this.userRole !== 'admin') {
                    console.error('AuthGuard: User does not have admin privileges:', this.userRole);
                    this.redirectToLogin('Access denied. Admin privileges required.');
                    return false;
                }

                console.log('AuthGuard: User authenticated as admin:', this.currentUser.email);
                this.isInitialized = true;
                return true;
                
            } catch (error) {
                console.error('AuthGuard: Error checking user role:', error);
                this.redirectToLogin('Error verifying admin access. Please try again.');
                return false;
            }

        } catch (error) {
            console.error('AuthGuard: Initialization failed:', error);
            this.redirectToLogin('Authentication check failed. Please refresh the page.');
            return false;
        }
    }

    // Check if user is authenticated and has admin role
    async checkAuth() {
        if (!this.isInitialized) {
            return await this.initialize();
        }

        // Re-check current user
        this.currentUser = firebaseServices.auth.currentUser;
        if (!this.currentUser) {
            console.log('AuthGuard: User no longer authenticated');
            this.redirectToLogin('Session expired. Please log in again.');
            return false;
        }

        return true;
    }

    // Redirect to login page
    redirectToLogin(message) {
        console.log('AuthGuard: Redirecting to login:', message);
        
        // Show message to user
        if (message) {
            alert(message);
        }
        
        // Redirect to login page
        window.location.href = 'login.html';
    }

    // Get current user info
    getCurrentUser() {
        return {
            user: this.currentUser,
            role: this.userRole,
            email: this.currentUser?.email
        };
    }

    // Logout user
    async logout() {
        try {
            // Show confirmation dialog if SweetAlert2 is available
            if (typeof Swal !== 'undefined') {
                const result = await Swal.fire({
                    title: 'Logout Confirmation',
                    text: 'Are you sure you want to logout?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, Logout',
                    cancelButtonText: 'Cancel',
                    reverseButtons: true
                });
                
                if (!result.isConfirmed) {
                    return; // User cancelled logout
                }
                
                // Show loading state
                Swal.fire({
                    title: 'Logging out...',
                    text: 'Please wait',
                    icon: 'info',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            }
            
            if (firebaseServices && firebaseServices.auth) {
                await firebaseServices.auth.signOut();
                console.log('AuthGuard: User logged out');
            }
            
            // Show success message if SweetAlert2 is available
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Logged Out',
                    text: 'You have been successfully logged out.',
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false
                }).then(() => {
                    this.redirectToLogin('You have been logged out.');
                });
            } else {
                this.redirectToLogin('You have been logged out.');
            }
        } catch (error) {
            console.error('AuthGuard: Logout error:', error);
            
            // Show error message if SweetAlert2 is available
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Logout Failed',
                    text: 'Logout failed. Please refresh the page.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                }).then(() => {
                    this.redirectToLogin('Logout failed. Please refresh the page.');
                });
            } else {
                this.redirectToLogin('Logout failed. Please refresh the page.');
            }
        }
    }

    // Setup authentication state listener
    setupAuthStateListener() {
        if (firebaseServices && firebaseServices.auth) {
            firebaseServices.auth.onAuthStateChanged((user) => {
                if (!user) {
                    console.log('AuthGuard: Auth state changed - no user');
                    // Only redirect if we were previously authenticated
                    if (this.currentUser) {
                        console.log('AuthGuard: User logged out, redirecting to login');
                        this.redirectToLogin('You have been logged out.');
                    }
                } else {
                    console.log('AuthGuard: Auth state changed - user:', user.email);
                    // Update current user if it changed
                    if (!this.currentUser || this.currentUser.uid !== user.uid) {
                        this.currentUser = user;
                        console.log('AuthGuard: User updated');
                    }
                }
            });
        }
    }
}

// Global authentication guard instance
window.authGuard = new AuthGuard();

// Auto-initialize on page load with delay to allow Firebase to restore session
document.addEventListener('DOMContentLoaded', async () => {
    console.log('AuthGuard: Auto-initializing...');
    
    // Give Firebase time to restore the session
    setTimeout(async () => {
        await window.authGuard.initialize();
        window.authGuard.setupAuthStateListener();
    }, 1000);
});

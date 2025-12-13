// Authentication management for TourApp Admin Web Interface

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }

    init() {
        // Wait for Firebase services to be available before setting up auth listener
        const waitForFirebase = () => {
            if (typeof firebaseServices !== 'undefined' && firebaseServices.auth) {
                console.log('AuthManager: Firebase services available');
                // Listen for authentication state changes
                firebaseServices.auth.onAuthStateChanged((user) => {
                    if (user) {
                        this.currentUser = user;
                        this.checkAdminStatus(user);
                    } else {
                        this.currentUser = null;
                        this.isAdmin = false;
                        // Don't redirect here - let AuthGuard handle it
                        console.log('AuthManager: User logged out');
                    }
                });
            } else {
                console.log('AuthManager: Waiting for Firebase services...');
                setTimeout(waitForFirebase, 100);
            }
        };
        waitForFirebase();
    }

    async checkAdminStatus(user) {
        try {
            console.log('Checking admin status for user:', user.uid, user.email);
            
            // First, try to read the existing document without any modifications
            try {
                const userDoc = await firebaseServices.usersCollection.doc(user.uid).get();
                console.log('User document exists:', userDoc.exists);
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    console.log('User data:', userData);
                    console.log('User role:', userData.role);
                    
                    // Check for admin role (case insensitive)
                    const userRole = (userData.role || '').toLowerCase();
                    this.isAdmin = userRole === 'admin' || userRole === 'super_admin';
                    
                    console.log('Is admin:', this.isAdmin);
                    
                    if (!this.isAdmin) {
                        alert(`Access denied. Admin privileges required. Your role: ${userData.role || 'undefined'}`);
                        this.signOut();
                        return;
                    }
                    
                    // Update UI with admin info
                    this.updateAdminUI(userData);
                    return; // Success, exit early
                }
            } catch (readError) {
                console.error('Error reading user document:', readError);
                // Continue to fallback logic below
            }
            
            // If document doesn't exist or read failed, try to create it
            console.log('User document not found or read failed, attempting to create...');
            
            // Special handling for known admin users
            const knownAdmins = {
                'VDBmu6zYyY08UKRKTi7L3b7xYsP2': {
                    firstName: 'Jonathan',
                    lastName: 'Tiglao',
                    phoneNumber: '09623045917',
                    role: 'admin'
                }
            };
            
            const knownAdmin = knownAdmins[user.uid];
            const adminUserData = {
                uid: user.uid,
                email: user.email,
                role: knownAdmin ? knownAdmin.role : 'admin',
                firstName: knownAdmin ? knownAdmin.firstName : (user.displayName?.split(' ')[0] || 'Admin'),
                lastName: knownAdmin ? knownAdmin.lastName : (user.displayName?.split(' ').slice(1).join(' ') || 'User'),
                phoneNumber: knownAdmin ? knownAdmin.phoneNumber : (user.phoneNumber || ''),
                profileImageUrl: user.photoURL || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                isEmailVerified: user.emailVerified || false,
                emergencyContacts: [],
                passwordHistory: [],
                course: '',
                section: '',
                yearLevel: '',
                studentId: ''
            };
            
            try {
                // Use merge: true to avoid conflicts if document already exists
                await firebaseServices.usersCollection.doc(user.uid).set(adminUserData, { merge: true });
                console.log('Admin user document created/updated successfully');
                
                this.isAdmin = true;
                this.updateAdminUI(adminUserData);
            } catch (createError) {
                console.error('Error creating admin user document:', createError);
                
                // If it's a "Target ID already exists" error or any other error, 
                // just grant admin access based on email domain
                if (createError.code === 'failed-precondition' || 
                    createError.message.includes('Target ID already exists') ||
                    createError.code === 'permission-denied') {
                    
                    console.log('Document creation failed, checking email domain for admin access...');
                    
                    // Grant admin access if email is from @cca.edu.ph domain
                    if (user.email && user.email.endsWith('@cca.edu.ph')) {
                        console.log('Granting admin access based on email domain');
                        this.isAdmin = true;
                        this.updateAdminUI({
                            uid: user.uid,
                            email: user.email,
                            role: 'admin',
                            firstName: knownAdmin ? knownAdmin.firstName : 'Admin',
                            lastName: knownAdmin ? knownAdmin.lastName : 'User',
                            phoneNumber: knownAdmin ? knownAdmin.phoneNumber : '',
                            profileImageUrl: user.photoURL || '',
                            isEmailVerified: user.emailVerified || false
                        });
                    } else {
                        alert('Access denied. Only @cca.edu.ph email addresses are allowed for admin access.');
                        this.signOut();
                    }
                } else {
                    alert('Error creating admin user profile. Please contact administrator.');
                    this.signOut();
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            console.error('Error details:', error.message, error.code);
            
            // Fallback: grant admin access if email is from @cca.edu.ph domain
            if (user.email && user.email.endsWith('@cca.edu.ph')) {
                console.log('Fallback: Granting admin access based on email domain');
                this.isAdmin = true;
                this.updateAdminUI({
                    uid: user.uid,
                    email: user.email,
                    role: 'admin',
                    firstName: 'Admin',
                    lastName: 'User',
                    phoneNumber: '',
                    profileImageUrl: user.photoURL || '',
                    isEmailVerified: user.emailVerified || false
                });
            } else {
                // More specific error messages
                if (error.code === 'permission-denied') {
                    alert('Permission denied. Please ensure you have admin access to the Firebase project.');
                } else if (error.code === 'unavailable') {
                    alert('Firebase service is currently unavailable. Please try again later.');
                } else {
                    alert(`Error verifying admin status: ${error.message}. Please try again.`);
                }
            }
        }
    }

    updateAdminUI(userData) {
        // Update sidebar admin info
        const adminNameElement = document.querySelector('.admin-name');
        const adminEmailElement = document.querySelector('.admin-email');
        
        if (adminNameElement) {
            adminNameElement.textContent = `${userData.firstName} ${userData.lastName}`;
        }
        if (adminEmailElement) {
            adminEmailElement.textContent = userData.email;
        }
    }

    async signIn(email, password) {
        try {
            // Validate email domain
            if (!email.endsWith('@cca.edu.ph')) {
                throw new Error('Only @cca.edu.ph email addresses are allowed.');
            }

            // Wait for Firebase services if not available
            if (typeof firebaseServices === 'undefined' || !firebaseServices.auth) {
                throw new Error('Firebase services not available. Please refresh the page.');
            }

            const userCredential = await firebaseServices.auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            // Check if Firebase services are available
            if (typeof firebaseServices !== 'undefined' && firebaseServices.auth) {
                await firebaseServices.auth.signOut();
            }
            this.currentUser = null;
            this.isAdmin = false;
            this.redirectToLogin();
        } catch (error) {
            console.error('Sign out error:', error);
            // Even if signOut fails, clear local state and redirect
            this.currentUser = null;
            this.isAdmin = false;
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        if (window.location.pathname !== '/login.html' && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null && this.isAdmin;
    }
}

// Initialize auth manager
window.authManager = new AuthManager();

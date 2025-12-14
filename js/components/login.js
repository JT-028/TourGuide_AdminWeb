// Login Page JavaScript
// Handles authentication and UI interactions for the login page

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in and redirect to dashboard
    setTimeout(() => {
        if (typeof firebaseServices !== 'undefined' && firebaseServices.auth) {
            firebaseServices.auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('User already logged in, redirecting to dashboard');
                    window.location.href = 'dashboard.html';
                }
            });
        }
    }, 1000);

    // Initialize feather icons
    feather.replace();

    // Enhanced login form handling
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const statusMessage = document.getElementById('statusMessage');
        const originalText = loginBtn.innerHTML;
        
        // Clear previous messages
        statusMessage.classList.add('hidden');
        
        // Validate email domain
        if (!['@cca.edu.ph', '@gmail.com'].some(d => email.toLowerCase().endsWith(d))) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Invalid Email Domain',
                    text: 'Allowed domains: @cca.edu.ph or @gmail.com.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            } else {
                showStatusMessage('Allowed domains: @cca.edu.ph or @gmail.com.', 'error');
            }
            return;
        }
        
        try {
            // Show loading state
            loginBtn.innerHTML = '<i data-feather="loader" class="w-5 h-5 mr-2 animate-spin"></i><span>Signing in...</span>';
            loginBtn.disabled = true;
            loginBtn.classList.add('opacity-75');
            
            // Authenticate with Firebase
            await window.authManager.signIn(email, password);
            
            // Show success message
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Login Successful!',
                    text: 'Redirecting to dashboard...',
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                showStatusMessage('Login successful! Redirecting to dashboard...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. ';
            if (error.code === 'auth/user-not-found') {
                errorMessage += 'No account found with this email address.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage += 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage += 'Invalid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage += 'Too many failed attempts. Please try again later.';
            } else if (error.message.includes('Target ID already exists')) {
                errorMessage += 'Authentication system error. Please try the "Fix Access" tool below.';
            } else {
                errorMessage += error.message;
            }
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Login Failed',
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            } else {
                showStatusMessage(errorMessage, 'error');
            }
            
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
            loginBtn.classList.remove('opacity-75');
        }
    });

    document.getElementById('togglePassword').addEventListener('click', function() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = this.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.setAttribute('data-feather', 'eye-off');
        } else {
            passwordInput.type = 'password';
            toggleIcon.setAttribute('data-feather', 'eye');
        }
        feather.replace();
    });

    document.getElementById('rememberMe').addEventListener('change', function() {
        if (this.checked) {
            localStorage.setItem('rememberEmail', document.getElementById('email').value);
        } else {
            localStorage.removeItem('rememberEmail');
        }
    });

    window.addEventListener('load', function() {
        const rememberedEmail = localStorage.getItem('rememberEmail');
        if (rememberedEmail) {
            document.getElementById('email').value = rememberedEmail;
            document.getElementById('rememberMe').checked = true;
        }
    });

    document.getElementById('email').addEventListener('focus', function() {
        if (!this.value && !document.getElementById('rememberMe').checked) {
            this.placeholder = 'E-mail';
        }
    });

    function showStatusMessage(message, type) {
        const statusMessage = document.getElementById('statusMessage');
        const isError = type === 'error';
        
        statusMessage.className = `mb-4 p-3 rounded-lg text-sm ${isError ? 'bg-red-100 text-red-700 border border-red-200 error-message' : 'bg-green-100 text-green-700 border border-green-200 success-message'}`;
        statusMessage.innerHTML = `
            <div class="flex items-center">
                <i data-feather="${isError ? 'alert-circle' : 'check-circle'}" class="w-4 h-4 mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        statusMessage.classList.remove('hidden');
        feather.replace();
    }

    document.getElementById('email').addEventListener('input', function() {
        const email = this.value;
        if (email && !email.endsWith('@cca.edu.ph')) {
            this.classList.add('border-red-300');
            this.classList.remove('border-gray-300');
        } else {
            this.classList.remove('border-red-300');
            this.classList.add('border-gray-300');
        }
    });

    setInterval(() => {
        feather.replace();
    }, 100);

    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('ring-2', 'ring-sky-500', 'ring-opacity-20');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('ring-2', 'ring-sky-500', 'ring-opacity-20');
        });
    });
});
// Login Page JavaScript - Additional Functions
// This file contains the remaining login page functionality

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
});
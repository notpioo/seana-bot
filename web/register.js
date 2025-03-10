
import { registerUser, checkAuthState } from './firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('error-message');
    
    // Check if user is already logged in
    checkAuthState((user) => {
        if (user) {
            // User is signed in, redirect to dashboard
            window.location.href = 'index.html';
        }
    });
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        errorMessage.textContent = '';
        
        // Validate password match
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match.';
            return;
        }
        
        // Validate password strength
        if (password.length < 6) {
            errorMessage.textContent = 'Password must be at least 6 characters.';
            return;
        }
        
        try {
            const result = await registerUser(username, email, password);
            
            if (result.success) {
                // Save auth token to localStorage for API requests
                localStorage.setItem('authToken', result.user.uid);
                window.location.href = 'index.html';
            } else {
                errorMessage.textContent = result.error || 'Registration failed. Please try again.';
            }
        } catch (error) {
            errorMessage.textContent = error.message || 'An error occurred during registration.';
        }
    });
});

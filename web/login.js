
import { loginUser, checkAuthState } from './firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    
    // Check if user is already logged in
    checkAuthState((user) => {
        if (user) {
            // User is signed in, redirect to dashboard
            window.location.href = 'index.html';
        }
    });
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        errorMessage.textContent = '';
        
        try {
            const result = await loginUser(email, password);
            
            if (result.success) {
                window.location.href = 'index.html';
            } else {
                errorMessage.textContent = result.error || 'Login failed. Please try again.';
            }
        } catch (error) {
            errorMessage.textContent = error.message || 'An error occurred during login.';
        }
    });
});

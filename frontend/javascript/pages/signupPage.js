import { registerUser } from '../api/usersApi.js';
import { updateNavbar } from '../components/navbar.js'; // Make sure you export this from navbar.js

// Get element references
const signupForm = document.getElementById('signupForm');
const errorMessage = document.getElementById('errorMessage');
const submitButton = document.getElementById('submitButton');

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Hide error message
function hideError() {
    errorMessage.style.display = 'none';
}

// Handle signup form submission
async function handleSignup(event) {
    event.preventDefault();
    hideError();

    // Get form values
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Frontend validation
    if (!fullname || !email || !password) {
        showError('All fields are required');
        return;
    }

    if (password.length < 8) {
        showError('Password must be at least 8 characters');
        return;
    }

    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Creating Account...';

    try {
        // Call API to register user
        const response = await registerUser({
            name: fullname,
            email: email,
            password: password
        });

        // Store token in localStorage
        localStorage.setItem('accessToken', response.accessToken);

        // Update navbar immediately
        if (typeof updateNavbar === 'function') {
            updateNavbar(); // this will switch "Sign Up" to "Profile"
        }

        // Show success message
        alert('Account created successfully!');

        // Redirect to home page
        window.location.href = '/html/profile.html';
    } catch (error) {
        // Show error message
        showError(error.message || 'Registration failed. Please try again.');

        // Re-enable button
        submitButton.disabled = false;
        submitButton.textContent = 'Create Account';
    }
}

// Add event listener to form
if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
}

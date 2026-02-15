import { loginUser } from '../api/usersApi.js';
import { updateNavbar } from '../components/navbar.js';

const signinForm = document.getElementById('signinForm');
const errorMessage = document.getElementById('errorMessage');
const submitButton = document.getElementById('submitButton');

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

async function handleSignin(event) {
    event.preventDefault();
    hideError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        showError('All fields are required');
        return;
    }

    if (password.length < 8) {
        showError('Password must be at least 8 characters');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Signing In....';

    try {
        const response = await loginUser({ email, password });
        localStorage.setItem('accessToken', response.accessToken);

        // Call the navbar update function from navbar.js
        await updateNavbar();

        // Redirect to home or dashboard
        window.location.href = '/html/profile.html';
    } catch (error) {
        showError(error.message || 'Sign-In failed. Please try again.');
        submitButton.disabled = false;
        submitButton.textContent = 'Sign In';
    }
}

if (signinForm) {
    signinForm.addEventListener('submit', handleSignin);
}
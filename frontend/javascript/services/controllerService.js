import { saveUserController } from '../api/controllersApi.js';
import { removeUserController } from '../api/profileDetailsApi.js';

// handle save controller functionality
export async function handleSaveController(controllerId) {
    try {
        await saveUserController(controllerId);
        alert('Controller saved successfully!');
    } catch (error) {
        if (error.message === 'NOT_LOGGED_IN') {
            alert('Please log in to save controllers');
            window.location.href = '/html/signin.html';
        } else if (error.message === 'Controller already saved') {
            alert('You have already saved this controller!');
        } else {
            console.error('Error saving controller:', error);
            alert('Failed to save controller. Please try again.');
        }
    }
}

// handle remove controller functionality
export async function handleRemoveController(controllerId) {
    if (!confirm('Are you sure you want to remove this controller from your saved list?')) {
        return false;
    }
    try {
        await removeUserController(controllerId); // call api function
        alert('Controller removed successfully!');
        return true; // return to page once removed
    } catch (err) {
        console.error('Error removing controller:', err);
        alert('Failed to remove controller. Please try again.');
        return false; // error handling
    }
}
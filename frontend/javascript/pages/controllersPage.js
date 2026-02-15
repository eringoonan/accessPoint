// pages/controllersPage.js
import Controller from '../models/Controller.js';
import { getAllControllers, saveUserController } from '../api/controllersApi.js';


// Function to create a controller card
function createControllerCard(controller) {
    const card = document.createElement('div');
    card.className = 'controller-card';

    // Platform (first one only)
    const platform = controller.platforms?.[0];

    // First two features (mapped needs)
    const features = controller.friendlyNeeds().slice(0, 2);

    card.innerHTML = `
        <div class="controller-image">
            <img src="${controller.imageUrl}" 
                 alt="${controller.name}"
                 onerror="this.src='/assets/placeholder-controller.jpg'"> 
        </div>

        <div class="controller-content">
            <div class="controller-header">
                <h3>${controller.name}</h3>
                <span class="controller-price">${controller.formattedPrice()}</span>
            </div>

            <div class="controller-features">
                ${platform ? `<span class="feature-tag">${platform}</span>` : ''}
                ${features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
            </div>

            <p class="controller-description">
                ${controller.description()}
            </p>

            <div class="controller-actions">
                <button class="btn btn-primary" 
                        onclick="window.open('${controller.productUrl}', '_blank')">
                    Learn More >
                </button>

                <button class="btn btn-secondary" 
                        onclick="saveController(${controller.id})">
                    Save
                </button>
            </div>
        </div>
    `;

    return card;
}

// Display controllers
function displayControllers(controllers) {
  // attain grid from html code
    const grid = document.getElementById('controllers-grid');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');

    loading.style.display = 'none';
    grid.innerHTML = '';

    // placeholder if no controllers returned by db
    if (!controllers || controllers.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 40px; color: #666;">No controllers found.</p>';
        return;
    }

    // for each instance of controller in the data
    controllers.forEach(ctrlData => {
        const controller = new Controller(ctrlData); // create new controller object
        const card = createControllerCard(controller); // generate new card with controller object
        grid.appendChild(card); // append card to grid
    });
}

// Show error
function showError(message) {
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');

    loading.style.display = 'none';
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Save controller (placeholder)
window.saveController = function(controllerId) {
    console.log('Saving controller:', controllerId);
    alert('Save feature not implemented yet!');
};

// Load controllers from backend
async function loadControllers() {
    try {
        const controllers = await getAllControllers(); // fetch from API
        displayControllers(controllers);
    } catch (error) {
        console.error('Error loading controllers:', error);
        showError('Failed to load controllers. Please try again later.');
    }
}

window.saveController = async function(controllerId) {
    try {
        await saveUserController(controllerId);
        alert('Controller saved successfully!');
        // Optionally update UI to show it's saved
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
};

// Initialize page
document.addEventListener('DOMContentLoaded', loadControllers);

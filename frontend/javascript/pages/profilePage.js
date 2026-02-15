import { getCurrentUser } from '../api/usersApi.js';
import { getUserDetails, removeUserController } from '../api/profileDetailsApi.js'; 
import { updateNavbar } from '../components/navbar.js';
import User from '../models/User.js';
import Controller from '../models/Controller.js';

function createProfileControllerCard(controller) {
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

                <button class="btn btn-secondary btn-remove" 
                        data-controller-id="${controller.id}">
                    Remove
                </button>
            </div>
        </div>
    `;

    // Add event listener to remove button instead of using onclick
    const removeBtn = card.querySelector('.btn-remove');
    removeBtn.addEventListener('click', () => removeController(controller.id));

    return card;
}

// Function to render controllers in the grid
function renderControllers(controllers) {
    console.log('renderControllers called with:', controllers);
    
    const grid = document.getElementById('controllers-grid');
    const loading = document.getElementById('loading');

    console.log('Grid element:', grid);
    console.log('Loading element:', loading);

    if (!grid) {
        console.error('controllers-grid element not found!');
        return;
    }

    // Hide loading
    if (loading) {
        loading.style.display = 'none';
    }

    if (!controllers || controllers.length === 0) {
        grid.innerHTML = '<p class="no-results">You haven\'t saved any controllers yet.</p>';
        return;
    }

    // Clear the grid
    grid.innerHTML = '';

    // Create Controller instances and cards
    controllers.forEach(controllerData => {
        console.log('Processing controller:', controllerData);
        try {
            const controller = new Controller(controllerData);
            console.log('Controller instance created:', controller);
            const card = createProfileControllerCard(controller);
            grid.appendChild(card);
        } catch (error) {
            console.error('Error creating controller card:', error, controllerData);
        }
    });

    console.log('Finished rendering controllers');
}

async function removeController(controllerId) {
    if (!confirm('Are you sure you want to remove this controller from your saved list?')) {
        return;
    }
    
    try {
        await removeUserController(controllerId);
        
        // Show success message
        alert('Controller removed successfully!');
        
        // Reload the controllers list
        const token = localStorage.getItem('accessToken');
        if (token) {
            const data = await getCurrentUser(token);
            if (data.loggedIn) {
                const user = new User(data.user);
                const controllerData = await getUserDetails(user.id);
                renderControllers(controllerData);
            }
        }
    } catch (err) {
        console.error('Error removing controller:', err);
        alert('Failed to remove controller. Please try again.');
    }
}

async function loadProfileDetails(event){
    console.log('loadProfileDetails called');
    
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    
    // Get token inside the function
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
        window.location.href = "/html/signin.html";
        return;
    }
    
    try {
        const data = await getCurrentUser(token);
        console.log('User data:', data);
        console.log('data.user:', data.user); // ADD THIS LINE
        
        if (!data.loggedIn){
            localStorage.removeItem('accessToken');
            window.location.href = "/html/signin.html";
            return;      
        }
        const user = new User(data.user);
        console.log('User instance:', user); // ADD THIS LINE
        console.log('User ID:', user.id); // ADD THIS LINE
        
        // Update profile card info
        document.getElementById('profile-name').textContent = user.name || 'N/A';
        document.getElementById('profile-email').textContent = user.email || 'N/A';
        document.getElementById('profile-date').textContent = user.getFormattedDate() || 'N/A';
        
        // Fetch user's saved controllers
        try {
            console.log('Fetching controllers for user:', user.id);
            const controllerData = await getUserDetails(user.id);
            console.log('Controller data received:', controllerData);
            renderControllers(controllerData);
        } catch (err){
            console.error("Failed to load user controllers:", err);
            if (loading) loading.style.display = 'none';
            if (errorMessage) {
                errorMessage.textContent = 'Failed to load saved controllers. Please try again.';
                errorMessage.style.display = 'block';
            }
        }
    } catch (err){
        console.error("Failed to load profile", err);
        if (loading) loading.style.display = 'none';
        if (errorMessage) {
            errorMessage.textContent = 'Failed to load profile. Please try again.';
            errorMessage.style.display = 'block';
        }
    }
}

// Sign out functionality
document.getElementById('signoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    window.location.href = '/html/signin.html';
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    loadProfileDetails();
    updateNavbar();
});
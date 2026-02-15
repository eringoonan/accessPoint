// pages/controllersPage.js
import Controller from '../models/Controller.js';
import { getAllControllers, saveUserController } from '../api/controllersApi.js';
import { FEATURE_MAP } from '../components/featureMapper.js';

// Global state
let allControllers = []; // Will store Controller instances
let selectedPlatforms = [];
let selectedFeatures = [];
let requiresAdapter = 'all'; // 'all', 'native', 'adapter'
let currentSort = 'relevance';

// Function to create a controller card
function createControllerCard(controller) {
    const card = document.createElement('div');
    card.className = 'controller-card';

    // Get primary platform (last in array = first added)
    const primaryPlatform = controller.getPrimaryPlatform();
    const primaryPlatformDisplay = primaryPlatform 
        ? `${primaryPlatform.name}${primaryPlatform.requires_adapter ? ' (adapter)' : ''}` 
        : '';

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
                ${primaryPlatformDisplay ? `<span class="feature-tag">${primaryPlatformDisplay}</span>` : ''}
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

// Filter and sort controllers
function filterAndSortControllers() {
    let filtered = [...allControllers];

    // Filter by platforms (checks if controller supports ANY selected platform)
    if (selectedPlatforms.length > 0) {
        filtered = filtered.filter(ctrl => {
            const platformNames = ctrl.getPlatformNames();
            return selectedPlatforms.some(platform => 
                platformNames.includes(platform)
            );
        });
    }

    // Filter by adapter requirement
    if (requiresAdapter === 'native') {
        // Only show controllers with at least one native (no adapter) platform
        filtered = filtered.filter(ctrl => ctrl.getNativePlatforms().length > 0);
    } else if (requiresAdapter === 'adapter') {
        // Only show controllers that work with adapters
        filtered = filtered.filter(ctrl => ctrl.getAdapterPlatforms().length > 0);
    }

    // Filter by features (using friendly names)
    if (selectedFeatures.length > 0) {
        filtered = filtered.filter(ctrl => {
            const controllerFriendlyNeeds = ctrl.friendlyNeeds();
            return selectedFeatures.some(selectedFeature => 
                controllerFriendlyNeeds.includes(selectedFeature)
            );
        });
    }

    // Sort
    if (currentSort === 'price-low') {
        filtered.sort((a, b) => {
            const priceA = a.price || 0;
            const priceB = b.price || 0;
            return priceA - priceB;
        });
    } else if (currentSort === 'price-high') {
        filtered.sort((a, b) => {
            const priceA = a.price || 0;
            const priceB = b.price || 0;
            return priceB - priceA;
        });
    }

    displayControllers(filtered);
    updateActiveFilters();
}

// Display controllers
function displayControllers(controllers) {
    const grid = document.getElementById('controllers-grid');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');

    loading.style.display = 'none';
    errorMessage.style.display = 'none';
    grid.innerHTML = '';

    if (!controllers || controllers.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 40px; color: #666;">No controllers match your filters.</p>';
        return;
    }

    controllers.forEach(controller => {
        const card = createControllerCard(controller);
        grid.appendChild(card);
    });
}

// Update active filters display
function updateActiveFilters() {
    const activeFiltersDiv = document.getElementById('active-filters');
    const hasFilters = selectedPlatforms.length > 0 || selectedFeatures.length > 0 || requiresAdapter !== 'all';

    if (!hasFilters) {
        activeFiltersDiv.style.display = 'none';
        return;
    }

    activeFiltersDiv.style.display = 'flex';
    activeFiltersDiv.innerHTML = '<span class="filter-label">Active Filters:</span>';

    // Add platform tags
    selectedPlatforms.forEach(platform => {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.innerHTML = `
            ${platform}
            <button class="remove-filter" data-type="platform" data-value="${platform}">&times;</button>
        `;
        activeFiltersDiv.appendChild(tag);
    });

    // Add adapter filter tag
    if (requiresAdapter !== 'all') {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.innerHTML = `
            ${requiresAdapter === 'native' ? 'Native Support' : 'Works with Adapter'}
            <button class="remove-filter" data-type="adapter" data-value="all">&times;</button>
        `;
        activeFiltersDiv.appendChild(tag);
    }

    // Add feature tags
    selectedFeatures.forEach(feature => {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.innerHTML = `
            ${feature}
            <button class="remove-filter" data-type="feature" data-value="${feature}">&times;</button>
        `;
        activeFiltersDiv.appendChild(tag);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            const value = btn.getAttribute('data-value');
            
            if (type === 'platform') {
                removePlatformFilter(value);
            } else if (type === 'feature') {
                removeFeatureFilter(value);
            } else if (type === 'adapter') {
                requiresAdapter = 'all';
                filterAndSortControllers();
            }
        });
    });

    // Add clear all button
    if (hasFilters) {
        const clearAll = document.createElement('button');
        clearAll.className = 'clear-all-btn';
        clearAll.textContent = 'Clear All';
        clearAll.addEventListener('click', clearAllFilters);
        activeFiltersDiv.appendChild(clearAll);
    }
}

// Initialize filter dropdowns
function initializeFilters() {
    const platforms = new Set();
    const features = new Set();

    allControllers.forEach(ctrl => {
        // Add platform names
        ctrl.getPlatformNames().forEach(p => {
            if (p && p.trim()) platforms.add(p);
        });
        
        // Add friendly feature names
        ctrl.friendlyNeeds().forEach(f => {
            if (f && f.trim()) features.add(f);
        });
    });

    console.log('Available platforms:', Array.from(platforms));
    console.log('Available features:', Array.from(features));

    // Populate platform options
    const platformOptions = document.getElementById('platform-options');
    platformOptions.innerHTML = '';
    
    Array.from(platforms).sort().forEach(platform => {
        const option = document.createElement('label');
        option.className = 'dropdown-option';
        option.innerHTML = `
            <input type="checkbox" value="${platform}" class="platform-checkbox">
            <span>${platform}</span>
        `;
        platformOptions.appendChild(option);
    });

    // Populate feature options
    const featureOptions = document.getElementById('feature-options');
    featureOptions.innerHTML = '';
    
    Array.from(features).sort().forEach(feature => {
        const option = document.createElement('label');
        option.className = 'dropdown-option';
        option.innerHTML = `
            <input type="checkbox" value="${feature}" class="feature-checkbox">
            <span>${feature}</span>
        `;
        featureOptions.appendChild(option);
    });

    setupFilterListeners();
}

// Setup filter event listeners
function setupFilterListeners() {
    // Platform dropdown toggle
    const platformBtn = document.getElementById('platform-filter-btn');
    const platformDropdown = document.getElementById('platform-dropdown');
    
    platformBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        platformDropdown.classList.toggle('show');
        document.getElementById('feature-dropdown').classList.remove('show');
    });

    // Feature dropdown toggle
    const featureBtn = document.getElementById('feature-filter-btn');
    const featureDropdown = document.getElementById('feature-dropdown');
    
    featureBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        featureDropdown.classList.toggle('show');
        platformDropdown.classList.remove('show');
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        platformDropdown.classList.remove('show');
        featureDropdown.classList.remove('show');
    });

    // Prevent dropdown from closing when clicking inside
    platformDropdown.addEventListener('click', (e) => e.stopPropagation());
    featureDropdown.addEventListener('click', (e) => e.stopPropagation());

    // Platform checkboxes
    document.querySelectorAll('.platform-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedPlatforms.push(checkbox.value);
            } else {
                selectedPlatforms = selectedPlatforms.filter(p => p !== checkbox.value);
            }
            updatePlatformButtonText();
            filterAndSortControllers();
        });
    });

    // Feature checkboxes
    document.querySelectorAll('.feature-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedFeatures.push(checkbox.value);
            } else {
                selectedFeatures = selectedFeatures.filter(f => f !== checkbox.value);
            }
            updateFeatureButtonText();
            filterAndSortControllers();
        });
    });

    // Clear buttons
    document.getElementById('clear-platforms').addEventListener('click', () => {
        selectedPlatforms = [];
        document.querySelectorAll('.platform-checkbox').forEach(cb => cb.checked = false);
        updatePlatformButtonText();
        filterAndSortControllers();
    });

    document.getElementById('clear-features').addEventListener('click', () => {
        selectedFeatures = [];
        document.querySelectorAll('.feature-checkbox').forEach(cb => cb.checked = false);
        updateFeatureButtonText();
        filterAndSortControllers();
    });

    // Sort select
    document.getElementById('sort-filter').addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndSortControllers();
    });

    // Search filters
    document.getElementById('platform-search').addEventListener('input', (e) => {
        filterDropdownOptions(e.target.value, '.platform-checkbox');
    });

    document.getElementById('feature-search').addEventListener('input', (e) => {
        filterDropdownOptions(e.target.value, '.feature-checkbox');
    });
}

// Filter dropdown options based on search
function filterDropdownOptions(searchTerm, checkboxClass) {
    const term = searchTerm.toLowerCase();
    document.querySelectorAll(checkboxClass).forEach(checkbox => {
        const label = checkbox.parentElement;
        const text = label.textContent.toLowerCase();
        label.style.display = text.includes(term) ? 'flex' : 'none';
    });
}

// Update button text
function updatePlatformButtonText() {
    const btn = document.querySelector('#platform-filter-btn .select-text');
    if (selectedPlatforms.length === 0) {
        btn.textContent = 'All Platforms';
    } else if (selectedPlatforms.length === 1) {
        btn.textContent = selectedPlatforms[0];
    } else {
        btn.textContent = `${selectedPlatforms.length} Platforms`;
    }
}

function updateFeatureButtonText() {
    const btn = document.querySelector('#feature-filter-btn .select-text');
    if (selectedFeatures.length === 0) {
        btn.textContent = 'All Features';
    } else if (selectedFeatures.length === 1) {
        btn.textContent = selectedFeatures[0];
    } else {
        btn.textContent = `${selectedFeatures.length} Features`;
    }
}

// Remove individual filters
function removePlatformFilter(platform) {
    selectedPlatforms = selectedPlatforms.filter(p => p !== platform);
    const checkbox = document.querySelector(`.platform-checkbox[value="${platform}"]`);
    if (checkbox) checkbox.checked = false;
    updatePlatformButtonText();
    filterAndSortControllers();
}

function removeFeatureFilter(feature) {
    selectedFeatures = selectedFeatures.filter(f => f !== feature);
    const checkbox = document.querySelector(`.feature-checkbox[value="${feature}"]`);
    if (checkbox) checkbox.checked = false;
    updateFeatureButtonText();
    filterAndSortControllers();
}

// Clear all filters
function clearAllFilters() {
    selectedPlatforms = [];
    selectedFeatures = [];
    requiresAdapter = 'all';
    document.querySelectorAll('.platform-checkbox, .feature-checkbox').forEach(cb => cb.checked = false);
    updatePlatformButtonText();
    updateFeatureButtonText();
    filterAndSortControllers();
}

// Show error
function showError(message) {
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');

    loading.style.display = 'none';
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Save controller
window.saveController = async function(controllerId) {
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
};

// Load controllers from backend
async function loadControllers() {
    try {
        const controllersData = await getAllControllers();
        
        // Convert raw data to Controller instances
        allControllers = controllersData.map(data => new Controller(data));
        
        console.log('Loaded controllers:', allControllers.length);
        if (allControllers.length > 0) {
            console.log('Sample controller:');
            allControllers[0].debug();
        }
        
        displayControllers(allControllers);
        initializeFilters();
    } catch (error) {
        console.error('Error loading controllers:', error);
        showError('Failed to load controllers. Please try again later.');
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', loadControllers);
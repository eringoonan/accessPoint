// pages/gamesPage.js
import Game from '../models/Game.js';
import { getGames, enrichGames } from '../api/gamesApi.js';
import { getAllConditions, getConditionsWithFeatures } from '../api/conditionsApi.js';
import { createGamesCard } from '../components/gamesCard.js';

// Global state
let allConditions = [];
let selectedConditions = [];
let selectedPlatforms = [];
let selectedFeatures = [];
let selectedGenre = null;
let currentSort = 'default';

// Pagination state
let currentOffset = 0;
const PAGE_SIZE = 20;
let isLoading = false;
let hasMore = true;

// loaded games cache
let loadedGames = [];

// filtered games cache
let filteredGames = [];

// fetch games function
async function fetchGames(offset = 0) {
    if (isLoading) return;
    isLoading = true;
    toggleShowMoreButton(false); // disable load more button
    showLoadingSpinner(true); // enable loading icon

    try {
        // 1. fetch base games
        const baseGames = await getGames(); // call get games function

        if (!baseGames || baseGames.length === 0) {
            hasMore = false;
            return;
        }

        // 2. enrich with api
        const enrichedData = await enrichGames(baseGames);

        // 3. create instances of games classes
        const newGames = enrichedData.map(d => new Game(d));

        // 4. store in loaded games
        loadedGames = [...loadedGames, ...newGames];

        hasMore = false;

        // call filter/sort function
        applyFiltersAndSort();

    } catch (error) {
        console.error('Error fetching games:', error);
        showError('Failed to load games. Please try again later.');
    } finally {
        isLoading = false;
        showLoadingSpinner(false);
        toggleShowMoreButton(hasMore);
    }
}

// filter and sort function
async function applyFiltersAndSort() {
    let filtered = [...loadedGames];

    // platform filter
    if (selectedPlatforms.length > 0) {
        filtered = filtered.filter(game =>
            selectedPlatforms.some(platform =>
                game.getPlatformNames().includes(platform) // sort games based on platforms stored in their instances
            )
        );
    }

    // genre filter
    if (selectedGenre) {
        filtered = filtered.filter(game => game.genre === selectedGenre); // sort games based on genre stored in their instances
    }

    // feature filter
    if (selectedFeatures.length > 0) {
        filtered = filtered.filter(game =>
            selectedFeatures.some(feature =>
                game.getFeatureNames().includes(feature)
            )
        );
    }

    // condition filter
    if (selectedConditions.length > 0) {
        filtered = filtered.filter(game => {
            const gameFeatureNames = game.getFeatureNames().map(f => f.toLowerCase());

            return selectedConditions.every(conditionId => {
                const condition = allConditions.find(c => c.condition_id === conditionId);
                if (!condition) return false;

                const criticalFeatures = condition.features.filter(f => f.importance === 'critical');

                // if the condition has critical features, the game must have ALL of them
                if (criticalFeatures.length > 0) {
                    const MATCH_THRESHOLD = 0.5; // game must have at least 50% of critical features

                    return criticalFeatures.filter(f =>
                        gameFeatureNames.includes(f.name.toLowerCase())
                    ).length >= Math.ceil(criticalFeatures.length * MATCH_THRESHOLD);
                }

                // if no critical features, fall back to matching any recommended feature
                return condition.features.some(f =>
                    gameFeatureNames.includes(f.name.toLowerCase())
                );
            });
        });
    }

    // sort
    if (currentSort === 'release-new') {
        filtered.sort((a, b) => (b.releaseDate || 0) - (a.releaseDate || 0)); // release new
    } else if (currentSort === 'release-old') {
        filtered.sort((a, b) => (a.releaseDate || 0) - (b.releaseDate || 0)); // release old
    } else if (currentSort === 'name-az') {
        filtered.sort((a, b) => a.name.localeCompare(b.name)); // a - z alpha
    } else if (currentSort === 'name-za') {
        filtered.sort((a, b) => b.name.localeCompare(a.name)); // z - a alpha
    }

    // store in global filtered variable
    filteredGames = filtered;
    displayGames(filteredGames); // display games
    updateActiveFilters(); // update filters
}

// display games
function displayGames(games) {
    const grid = document.getElementById('games-grid');
    const errorMessage = document.getElementById('error-message');

    errorMessage.style.display = 'none';
    grid.innerHTML = '';

    // error message if no games match filters
    if (!games || games.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding:40px; color:#666;">No games match your filters.</p>';
        return;
    }

    // attain primary platform for each game
    games.forEach(game => {
        const primaryPlatform = game.getPrimaryPlatform();

        // call create games card function with info
        const card = createGamesCard(game, {
            secondaryButtonText: 'Save',
            secondaryButtonClass: 'btn btn-secondary',
            overridePlatform: primaryPlatform
        });

        // add cards to the gird
        grid.appendChild(card);
    });
}

// filters UI
function initializeFilters() {
    const platforms = new Set();
    const features  = new Set();
    const genres    = new Set();

    // for all games loaded, get platform, feature and genres to add to filters
    loadedGames.forEach(game => {
        // fallback if empty
        if (game.platforms.length === 0) platforms.add('Unknown Platform');
        else game.getPlatformNames().forEach(p => platforms.add(p));

        if (game.features.length === 0) features.add('No Accessibility Features');
        else game.getFeatureNames().forEach(f => features.add(f));

        if (game.genre) genres.add(game.genre);
    });

    // populate checkboxes with sorted options
    populateCheckboxGroup('platform-options', '.platform-checkbox', [...platforms].sort());
    populateCheckboxGroup('feature-options',  '.feature-checkbox',  [...features].sort());
    populateGenreOptions([...genres].sort());

    // conditions options
    const conditionOptions = document.getElementById('condition-options');
    conditionOptions.innerHTML = '';

    allConditions
        .sort((a, b) => a.condition_name.localeCompare(b.condition_name))
        .forEach(condition => {
            const label = document.createElement('label');
            label.className = 'dropdown-option';
            label.innerHTML = `
                <input type="checkbox" value="${condition.condition_id}" class="condition-checkbox">
                <span>${condition.condition_name}</span>
            `;
            conditionOptions.appendChild(label);
        });

    setupFilterListeners();
}
// populate checkboxes
function populateCheckboxGroup(containerId, checkboxClass, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    items.forEach(item => {
        const label = document.createElement('label');
        label.className = 'dropdown-option';
        label.innerHTML = `
            <input type="checkbox" value="${item}" class="${checkboxClass.replace('.', '')}">
            <span>${item}</span>
        `;
        container.appendChild(label);
    });
}

// populate genre selections
function populateGenreOptions(genres) {
    const container = document.getElementById('genre-options');
    container.innerHTML = '';
    genres.forEach(genre => {
        const label = document.createElement('label');
        label.className = 'dropdown-option';
        label.innerHTML = `
            <input type="radio" name="genre" value="${genre}" class="genre-radio">
            <span>${genre}</span>
        `;
        container.appendChild(label);
    });
}

// create filter listeners
function setupFilterListeners() {
    const dropdowns = [
        { btn: 'condition-filter-btn', dropdown: 'condition-dropdown' },
        { btn: 'platform-filter-btn',  dropdown: 'platform-dropdown'  },
        { btn: 'feature-filter-btn',   dropdown: 'feature-dropdown'   },
        { btn: 'genre-filter-btn',     dropdown: 'genre-dropdown'     },
    ];

    dropdowns.forEach(({ btn, dropdown }) => {
        document.getElementById(btn).addEventListener('click', (e) => { // event listener for click
            e.stopPropagation();
            const current = document.getElementById(dropdown);
            const isOpen  = current.classList.contains('show');
            // close all
            dropdowns.forEach(d => document.getElementById(d.dropdown).classList.remove('show'));
            if (!isOpen) current.classList.add('show');
        });
        document.getElementById(dropdown).addEventListener('click', e => e.stopPropagation());
    });

    document.addEventListener('click', () =>
        dropdowns.forEach(d => document.getElementById(d.dropdown).classList.remove('show'))
    );

    // Checkboxes
    document.querySelectorAll('.condition-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const id = parseInt(cb.value);
            selectedConditions = cb.checked
                ? [...selectedConditions, id]
                : selectedConditions.filter(c => c !== id);
            updateButtonText('condition-filter-btn', selectedConditions.length, 'Conditions', 'Select Conditions');
            applyFiltersAndSort();
        });
    });

    document.querySelectorAll('.platform-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            selectedPlatforms = cb.checked
                ? [...selectedPlatforms, cb.value]
                : selectedPlatforms.filter(p => p !== cb.value);
            updateButtonText('platform-filter-btn', selectedPlatforms.length, 'Platforms', 'All Platforms');
            applyFiltersAndSort();
        });
    });

    document.querySelectorAll('.feature-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            selectedFeatures = cb.checked
                ? [...selectedFeatures, cb.value]
                : selectedFeatures.filter(f => f !== cb.value);
            updateButtonText('feature-filter-btn', selectedFeatures.length, 'Features', 'All Features');
            applyFiltersAndSort();
        });
    });

    document.querySelectorAll('.genre-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            selectedGenre = radio.value;
            updateButtonText('genre-filter-btn', 1, '', radio.value, radio.value);
            applyFiltersAndSort();
        });
    });

    // Clear buttons
    document.getElementById('clear-conditions').addEventListener('click', () => clearFilter('condition'));
    document.getElementById('clear-platforms').addEventListener('click',  () => clearFilter('platform'));
    document.getElementById('clear-features').addEventListener('click',   () => clearFilter('feature'));
    document.getElementById('clear-genre').addEventListener('click',      () => clearFilter('genre'));

    // Sort
    document.getElementById('sort-filter').addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndSort();
    });

    // Search inputs
    document.getElementById('condition-search').addEventListener('input', e =>
        filterDropdownOptions(e.target.value, '.condition-checkbox'));
    document.getElementById('platform-search').addEventListener('input', e =>
        filterDropdownOptions(e.target.value, '.platform-checkbox'));
    document.getElementById('feature-search').addEventListener('input', e =>
        filterDropdownOptions(e.target.value, '.feature-checkbox'));
    document.getElementById('genre-search').addEventListener('input', e =>
        filterDropdownOptions(e.target.value, '.genre-radio'));

    // Show more
    document.getElementById('show-more-btn').addEventListener('click', () => {
        fetchGames(currentOffset);
    });
}

// clear filter function
function clearFilter(type) {
    if (type === 'condition') {
        selectedConditions = [];
        document.querySelectorAll('.condition-checkbox').forEach(cb => cb.checked = false);
        updateButtonText('condition-filter-btn', 0, 'Conditions', 'Select Conditions');
    } else if (type === 'platform') {
        selectedPlatforms = [];
        document.querySelectorAll('.platform-checkbox').forEach(cb => cb.checked = false);
        updateButtonText('platform-filter-btn', 0, 'Platforms', 'All Platforms');
    } else if (type === 'feature') {
        selectedFeatures = [];
        document.querySelectorAll('.feature-checkbox').forEach(cb => cb.checked = false);
        updateButtonText('feature-filter-btn', 0, 'Features', 'All Features');
    } else if (type === 'genre') {
        selectedGenre = null;
        document.querySelectorAll('.genre-radio').forEach(r => r.checked = false);
        updateButtonText('genre-filter-btn', 0, '', 'All Genres');
    }
    applyFiltersAndSort();
}

function clearAllFilters() {
    ['condition', 'platform', 'feature', 'genre'].forEach(clearFilter);
}

function filterDropdownOptions(searchTerm, inputClass) {
    const term = searchTerm.toLowerCase();
    document.querySelectorAll(inputClass).forEach(input => {
        const label = input.parentElement;
        label.style.display = label.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
    });
}

function updateButtonText(btnId, count, pluralLabel, emptyLabel, singleLabel = null) {
    const btn = document.querySelector(`#${btnId} .select-text`);
    if (!btn) return;
    if (count === 0)      btn.textContent = emptyLabel;
    else if (count === 1) btn.textContent = singleLabel ?? emptyLabel;
    else                  btn.textContent = `${count} ${pluralLabel}`;
}

// active filter tags
function updateActiveFilters() {
    const container = document.getElementById('active-filters');
    const hasFilters = selectedConditions.length || selectedPlatforms.length ||
                       selectedFeatures.length   || selectedGenre;

    if (!hasFilters) { container.style.display = 'none'; return; }

    container.style.display = 'flex';
    container.innerHTML = '<span class="filter-label">Active Filters:</span>';

    selectedConditions.forEach(id => {
        const condition = allConditions.find(c => c.condition_id === id);
        if (condition) appendFilterTag(container, condition.condition_name, 'condition', id);
    });

    selectedPlatforms.forEach(p => appendFilterTag(container, p, 'platform', p));
    selectedFeatures.forEach(f  => appendFilterTag(container, f,  'feature',  f));

    if (selectedGenre) appendFilterTag(container, selectedGenre, 'genre', selectedGenre);

    const clearAll = document.createElement('button');
    clearAll.className = 'clear-all-btn';
    clearAll.textContent = 'Clear All';
    clearAll.addEventListener('click', clearAllFilters);
    container.appendChild(clearAll);

    container.querySelectorAll('.remove-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            const { type, value } = btn.dataset;
            if (type === 'condition') {
                selectedConditions = selectedConditions.filter(id => id !== parseInt(value));
                const cb = document.querySelector(`.condition-checkbox[value="${value}"]`);
                if (cb) cb.checked = false;
                updateButtonText('condition-filter-btn', selectedConditions.length, 'Conditions', 'Select Conditions');
            } else if (type === 'platform') {
                selectedPlatforms = selectedPlatforms.filter(p => p !== value);
                const cb = document.querySelector(`.platform-checkbox[value="${value}"]`);
                if (cb) cb.checked = false;
                updateButtonText('platform-filter-btn', selectedPlatforms.length, 'Platforms', 'All Platforms');
            } else if (type === 'feature') {
                selectedFeatures = selectedFeatures.filter(f => f !== value);
                const cb = document.querySelector(`.feature-checkbox[value="${value}"]`);
                if (cb) cb.checked = false;
                updateButtonText('feature-filter-btn', selectedFeatures.length, 'Features', 'All Features');
            } else if (type === 'genre') {
                selectedGenre = null;
                document.querySelectorAll('.genre-radio').forEach(r => r.checked = false);
                updateButtonText('genre-filter-btn', 0, '', 'All Genres');
            }
            applyFiltersAndSort();
        });
    });
}

// add filter tag
function appendFilterTag(container, label, type, value) {
    const tag = document.createElement('span');
    tag.className = 'filter-tag';
    tag.innerHTML = `
        ${label}
        <button class="remove-filter" data-type="${type}" data-value="${value}">&times;</button>
    `;
    container.appendChild(tag);
}

// UI helpers
function showLoadingSpinner(show) {
    const el = document.getElementById('loading');
    if (el) el.style.display = show ? 'block' : 'none';
}

function toggleShowMoreButton(show) {
    const btn = document.getElementById('show-more-btn');
    if (btn) btn.style.display = show ? 'block' : 'none';
}

function showError(message) {
    const el = document.getElementById('error-message');
    if (el) { el.textContent = message; el.style.display = 'block'; }
    showLoadingSpinner(false);
}

// init function
async function init() {
    try {
        allConditions = await getConditionsWithFeatures();
    } catch (e) {
        console.warn('Could not load conditions:', e);
    }

    await fetchGames(0);
    initializeFilters();
}

document.addEventListener('DOMContentLoaded', init);
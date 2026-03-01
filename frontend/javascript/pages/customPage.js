// /javascript/pages/customPage.js
import { initialiseControllerFilterForm, getLoadedConditions } from '../components/forms/controllerFilterForm.js';
import { searchControllers } from '../api/controllersApi.js';
import { createControllerCard } from '../components/controllerCard.js';
import Controller from '../models/Controller.js';
import { handleSaveController } from '../services/controllerService.js';

// DOM references
const filterContainer = document.getElementById('custom-filter-container');
const searchSelection = document.getElementById('search-type-selection');
const resultsSection  = document.getElementById('results-section');
const resultsGrid     = document.getElementById('results-grid');
const resultsCount    = document.getElementById('results-count');
const noResultsMsg    = document.getElementById('no-results-msg');

// scoring weights for suitability
const SUITABILITY_SCORE = {
  excellent: 4,
  good:      3,
  fair:      2,
  limited:   1,
};

// search type selection
document.getElementById('controller-search-btn').addEventListener('click', async () => { // click event listener
  try {
    searchSelection.style.display = 'none';

    // fetch filter form
    const response = await fetch('/javascript/components/forms/controllerFilterForm.html');
    if (!response.ok) throw new Error('Failed to load controller filter form HTML');

    filterContainer.innerHTML = await response.text();
    filterContainer.style.display = 'block';

    // run function to intialise the form
    await initialiseControllerFilterForm();

    // listen for the custom event fired by the Search button inside the form
    document.getElementById('controller-filter-form')
      ?.addEventListener('filter-search', runControllerSearch);

      // error handling if form wont load
  } catch (error) {
    console.error('Error loading controller filter form:', error);
    filterContainer.innerHTML = `<p style="color:red;">Failed to load controller filter form.</p>`; // error message
    filterContainer.style.display = 'block';
  }
});

// handle game search, not implemented yet
document.getElementById('game-search-btn').addEventListener('click', () => {
  searchSelection.style.display = 'none';
  filterContainer.innerHTML = `<p>Game search form coming soon!</p>`;
  filterContainer.style.display = 'block';
});

// core search + scoring function
async function runControllerSearch() {

  // read fieldset selections from each dropdown
  const platformFieldset   = document.querySelector('#platforms-dropdown')?.closest('fieldset');
  const needsFieldset      = document.querySelector('#needs-dropdown')?.closest('fieldset');
  const conditionsFieldset = document.querySelector('#conditions-dropdown')?.closest('fieldset');

  // store results of the dropdown selection
  const selectedPlatforms  = platformFieldset?.__getSelections()   ?? [];
  const selectedNeeds      = needsFieldset?.__getSelections()      ?? [];
  const selectedConditions = conditionsFieldset?.__getSelections() ?? [];

  if (!selectedPlatforms.length && !selectedNeeds.length && !selectedConditions.length) {
    alert('Please select at least one platform, need, or condition before searching.');
    return;
  }

  // match conditions to the child needs
  // getLoadedConditions() returns the full conditions array fetched during init,
  const allConditions = getLoadedConditions();

  // build payload for backend
  const payload = {
    platforms: selectedPlatforms,
    needs: selectedNeeds,
    conditions: selectedConditions,
    mustSupportAll: document.getElementById('must-support-all')?.checked ?? true
  };

  let controllers;

  try {
    // backend now handles filtering + scoring + sorting
    const data = await searchControllers(payload);
    controllers = data.map(d => new Controller(d));
  } catch (err) {
    console.error('Failed to search controllers:', err);
    showResults([]);
    return;
  }

  showResults(controllers);
}

// show results
function showResults(controllers) {
  resultsSection.style.display = 'block';
  resultsGrid.innerHTML = ''; // clear inner html

  // if no controllers returned
  if (!controllers.length) {
    noResultsMsg.style.display = 'block';
    resultsCount.textContent   = '0 controllers matched your search';
    return;
  }

  noResultsMsg.style.display = 'none';
  resultsCount.textContent   =
    `${controllers.length} controller${controllers.length !== 1 ? 's' : ''} matched your search`;

  // create new card for each returned controller
  controllers.forEach(controller => {
      const card = createControllerCard(controller, {
          secondaryButtonText: 'Save',
          secondaryButtonClass: 'btn btn-secondary',
          onSecondaryClick: handleSaveController
      });
      resultsGrid.appendChild(card);
  });

  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
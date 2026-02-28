// /javascript/pages/customPage.js
import { initialiseControllerFilterForm, getLoadedConditions } from '../components/forms/controllerFilterForm.js';
import { getAllControllers, saveUserController } from '../api/controllersApi.js';
import Controller from '../models/Controller.js';

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

  const IMPORTANCE_WEIGHT = { critical: 3, recommended: 2, optional: 1 };

  // map conditions with need name and given weight
  const conditionNeedWeights = new Map();

  // find severity level for conditions
  selectedConditions.forEach(sel => {
    const condition = allConditions.find(c => c.condition_name === sel.value);
    if (!condition) return;

    const severityLevel = sel.level ?? 1;

    condition.needs.forEach(condNeed => {
      const importanceMult = IMPORTANCE_WEIGHT[condNeed.importance?.toLowerCase()] ?? 1;
      const weight = severityLevel * importanceMult;
      conditionNeedWeights.set(
        condNeed.name,
        (conditionNeedWeights.get(condNeed.name) ?? 0) + weight
      );
    });
  });

  // fetch controllers
  let controllers;
  try {
    const data = await getAllControllers(); // run query to return all controllers
    controllers = data.map(d => new Controller(d)); // map controllers
  } catch (err) {
    console.error('Failed to load controllers:', err);
    showResults([]);
    return;
  }

  // check the support all platforms checkbox, create bool
  const mustSupportAll = document.getElementById('must-support-all')?.checked ?? true;

  // 1. hard filter
  const filtered = controllers.filter(ctrl => {

    // Platforms
    if (selectedPlatforms.length) {
      const ctrlPlatformNames = ctrl.getPlatformNames();
      const check = mustSupportAll
        ? selectedPlatforms.every(sel => ctrlPlatformNames.includes(sel.value))
        : selectedPlatforms.some(sel  => ctrlPlatformNames.includes(sel.value));
      if (!check) return false;
    }

    // Functional needs
    if (selectedNeeds.length) {
      const ctrlNeedNames = ctrl.getNeedNames();
      if (!selectedNeeds.every(sel => ctrlNeedNames.includes(sel.value))) return false;
    }

    // Conditions - cover at least one need from select condition
    if (selectedConditions.length) {
      const ctrlNeedNames = ctrl.getNeedNames();
      const allCovered = selectedConditions.every(sel => {
        const condition = allConditions.find(c => c.condition_name === sel.value);
        if (!condition) return false;
        return condition.needs.some(condNeed => ctrlNeedNames.includes(condNeed.name));
      });
      if (!allCovered) return false;
    }

    return true;
  });

  // 2. scoring
  const scored = filtered.map(ctrl => { // create filtered map of scored objects
    let score = 0;

    // importance slider x suitability
    selectedNeeds.forEach(sel => {
      const ctrlNeed = ctrl.needs.find(n => n.name === sel.value); 
      if (!ctrlNeed) return;
      const importanceWeight = sel.level ?? 3;
      const suitabilityScore = SUITABILITY_SCORE[ctrlNeed.suitability?.toLowerCase()] ?? 1;
      score += importanceWeight * suitabilityScore; // score = importance x suitability
    });

    // condition needs, weight x suitability
    conditionNeedWeights.forEach((weight, needName) => {
      const ctrlNeed = ctrl.needs.find(n => n.name === needName); // extract the need
      if (!ctrlNeed) return;
      const suitabilityScore = SUITABILITY_SCORE[ctrlNeed.suitability?.toLowerCase()] ?? 1; // extract suitability from need name
      score += weight * suitabilityScore; // score = importance x suitability
    });

    // prioritise native over adapter platforms
    selectedPlatforms.forEach(sel => {
      const ctrlPlatform = ctrl.platforms.find(p => p.name === sel.value);
      if (!ctrlPlatform) return;
      score += ctrlPlatform.requires_adapter ? 1 : 2; // add to the score
    });

    return { controller: ctrl, score };
  });

  // 3. sort descending by scoore
  scored.sort((a, b) => b.score - a.score);

  showResults(scored.map(s => s.controller));
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
  controllers.forEach(ctrl => resultsGrid.appendChild(createControllerCard(ctrl)));

  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// card builder
function createControllerCard(controller) {
  const card = document.createElement('div'); // create div for card
  card.className = 'controller-card'; // assign class name

  const primaryPlatform = controller.getPrimaryPlatform(); // get primary platform from controller object
  const primaryPlatformDisplay = primaryPlatform
    ? `${primaryPlatform.name}${primaryPlatform.requires_adapter ? ' (adapter)' : ''}`
    : '';

  // use feature mapper to assign friendly needs
  const features = controller.friendlyNeeds().slice(0, 2);

  // inner html of the card
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
      <p class="controller-description">${controller.description()}</p>
      <div class="controller-actions">
        <button class="btn btn-primary"
                onclick="window.open('${controller.productUrl}', '_blank')">
          Learn More >
        </button>
        <button class="btn btn-secondary"
                onclick="window.saveController(${controller.id})">
          Save
        </button>
      </div>
    </div>
  `;

  return card;
}

// use save controller function from controllersApi
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
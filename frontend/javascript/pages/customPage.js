// /javascript/pages/customPage.js
import { initialiseControllerFilterForm, getLoadedConditions } from '../components/forms/controllerFilterForm.js';
import { searchControllers } from '../api/controllersApi.js';
import { searchGames } from '../api/gamesApi.js';
import { createControllerCard } from '../components/controllerCard.js';
import { createGamesCard } from '../components/gamesCard.js';
import Controller from '../models/Controller.js';
import Game from '../models/Game.js';
import { handleSaveController } from '../services/controllerService.js';
import { initialiseGameFilterForm } from '../components/forms/gamesFilterForm.js';

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

document.getElementById('controller-search-btn').addEventListener('click', async () => {
  try {
    searchSelection.style.display = 'none';

    const response = await fetch('/javascript/components/forms/controllerFilterForm.html');
    if (!response.ok) throw new Error('Failed to load controller filter form HTML');

    filterContainer.innerHTML = await response.text();
    filterContainer.style.display = 'block';

    await initialiseControllerFilterForm();

    document.getElementById('controller-filter-form')
      ?.addEventListener('filter-search', runControllerSearch);

  } catch (error) {
    console.error('Error loading controller filter form:', error);
    filterContainer.innerHTML = `<p style="color:red;">Failed to load controller filter form.</p>`;
    filterContainer.style.display = 'block';
  }
});

document.getElementById('game-search-btn').addEventListener('click', async () => {
  try {
    searchSelection.style.display = 'none';

    const response = await fetch('/javascript/components/forms/gameFilterForm.html');
    if (!response.ok) throw new Error('Failed to load game filter form HTML');

    filterContainer.innerHTML = await response.text();
    filterContainer.style.display = 'block';

    await initialiseGameFilterForm();

    document.getElementById('game-filter-form')
      ?.addEventListener('filter-search', runGameSearch);

  } catch (error) {
    console.error('Error loading game filter form:', error);
    filterContainer.innerHTML = `<p style="color:red;">Failed to load game filter form.</p>`;
    filterContainer.style.display = 'block';
  }
});

async function runControllerSearch() {

  const platformFieldset   = document.querySelector('#platforms-dropdown')?.closest('fieldset');
  const needsFieldset      = document.querySelector('#needs-dropdown')?.closest('fieldset');
  const conditionsFieldset = document.querySelector('#conditions-dropdown')?.closest('fieldset');

  const selectedPlatforms  = platformFieldset?.__getSelections()   ?? [];
  const selectedNeeds      = needsFieldset?.__getSelections()      ?? [];
  const selectedConditions = conditionsFieldset?.__getSelections() ?? [];

  if (!selectedPlatforms.length && !selectedNeeds.length && !selectedConditions.length) {
    alert('Please select at least one platform, need, or condition before searching.');
    return;
  }

  const payload = {
    platforms: selectedPlatforms,
    needs: selectedNeeds,
    conditions: selectedConditions,
    mustSupportAll: document.getElementById('must-support-all')?.checked ?? true
  };

  let controllers;

  try {
    const data = await searchControllers(payload);
    controllers = data.map(d => new Controller(d));
  } catch (err) {
    console.error('Failed to search controllers:', err);
    showControllerResults([]);
    return;
  }

  showControllerResults(controllers);
}

async function runGameSearch() {

  const btn = document.getElementById('must-support-all-features-btn');
  console.log('btn found:', btn, 'active:', btn?.dataset.active);

  const platformFieldset   = document.querySelector('#platforms-dropdown')?.closest('fieldset');
  const featuresFieldset   = document.querySelector('#features-dropdown')?.closest('fieldset');
  const conditionsFieldset = document.querySelector('#conditions-dropdown')?.closest('fieldset');
  const genreFieldset      = document.querySelector('#genre-dropdown')?.closest('fieldset');

  const selectedPlatforms  = platformFieldset?.__getSelections()   ?? [];
  const selectedFeatures   = featuresFieldset?.__getSelections()   ?? [];
  const selectedConditions = conditionsFieldset?.__getSelections() ?? [];
  const selectedGenre      = genreFieldset?.__getSelections()?.[0]?.value || null;

  if (!selectedPlatforms.length && !selectedFeatures.length && !selectedConditions.length) {
    alert('Please select at least one platform, feature, or condition before searching.');
    return;
  }
  const mustSupportAllFeatures =
    document.getElementById('must-support-all')?.checked ?? true;

  const payload = {
    platform: selectedPlatforms[0]?.value || null,
    features: selectedFeatures,
    conditions: selectedConditions,
    genre: selectedGenre,
    mustSupportAllFeatures
  };

  let rawGames;

  try {
    rawGames = await searchGames(payload);
  } catch (err) {
    console.error('Failed to search games:', err);
    showGameResults([]);
    return;
  }

  // ✅ Ensure all raw game objects are converted to Game instances
  const games = rawGames.map(g => new Game(g));

  showGameResults(games, payload.platform);;
}

function showControllerResults(controllers) {

  resultsSection.style.display = 'block';
  resultsGrid.innerHTML = '';

  if (!controllers.length) {
    noResultsMsg.style.display = 'block';
    resultsCount.textContent = '0 controllers matched your search';
    return;
  }

  noResultsMsg.style.display = 'none';
  resultsCount.textContent =
    `${controllers.length} controller${controllers.length !== 1 ? 's' : ''} matched your search`;

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

function showGameResults(games, selectedPlatform) {

  resultsSection.style.display = 'block';
  resultsGrid.innerHTML = '';

  if (!games.length) {
    noResultsMsg.style.display = 'block';
    resultsCount.textContent = '0 games matched your search';
    return;
  }

  noResultsMsg.style.display = 'none';
  resultsCount.textContent =
    `${games.length} game${games.length !== 1 ? 's' : ''} matched your search`;

  games.forEach(game => {

    game.debug();

    // 🔥 Find matching platform from user's selection
    let matchedPlatform = null;

    if (selectedPlatform && game.platforms) {
      matchedPlatform = game.platforms.find(
        p => p.name === selectedPlatform
      );
    }

    const card = createGamesCard(game, {
      secondaryButtonText: 'Save',
      secondaryButtonClass: 'btn btn-secondary',

      // 👇 pass override into card
      overridePlatform: matchedPlatform
    });

    resultsGrid.appendChild(card);
  });

  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
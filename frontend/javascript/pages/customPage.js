// /javascript/pages/customPage.js
import { initializeControllerFilterForm } from '../components/forms/controllerFilterForm.js'; // import the controller filter form
// to do import/create game filter form

// define filter and search selection
const filterContainer = document.getElementById('custom-filter-container');
const searchSelection = document.getElementById('search-type-selection');

// handle when controller search is clicked
document.getElementById('controller-search-btn').addEventListener('click', async () => {
  try {
    // hide the search type selection
    searchSelection.style.display = 'none';

    // load controller filter form from HTML file
    const response = await fetch('/javascript/components/forms/controllerFilterForm.html');
    if (!response.ok) throw new Error('Failed to load controller filter form HTML');

    // display the form html
    const formHtml = await response.text();
    filterContainer.innerHTML = formHtml;
    filterContainer.style.display = 'block';

    // intialise the form to populate with the values from db
    await initializeControllerFilterForm();
  } catch (error) {
    console.error('Error loading controller filter form:', error);
    filterContainer.innerHTML = `<p style="color:red;">Failed to load controller filter form.</p>`; // error hanndling
    filterContainer.style.display = 'block';
  }
});

// handle when game search is clicked
document.getElementById('game-search-btn').addEventListener('click', async () => {
  // hide search selection
  searchSelection.style.display = 'none';

  // Placeholder for future game form
  filterContainer.innerHTML = `<p>Game search form coming soon!</p>`;
  filterContainer.style.display = 'block';
});
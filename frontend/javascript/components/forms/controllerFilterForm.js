// /javascript/components/forms/controllerFilterForm.js
import { getAllControllers } from '../../api/controllersApi.js';
import { getAllConditions } from '../../api/conditionsApi.js';
import { FEATURE_MAP } from '../featureMapper.js';

// create mapped labels with feature mapper
function getMappedLabel(needName) {
  return FEATURE_MAP[needName] || needName;
}


// intialise controller filter form
export async function initializeControllerFilterForm() {
  try {
    const [controllers, conditions] = await Promise.all([
      getAllControllers(), // get all conditions/controllers from the API
      getAllConditions()
    ]);

    // create empty sets for platforms, needs, conditions
    const platformsSet = new Set();
    const needsSet = new Set();
    const conditionsSet = new Set();

    // iterate over each controller returned by backend
    controllers.forEach(ctrl => {
      ctrl.platforms.forEach(p => platformsSet.add(p.name)); // add each new platform
      ctrl.needs.forEach(n => needsSet.add(n.name)); // add each new need
    });
    conditions.forEach(cond => conditionsSet.add(cond.condition_name)); // add each new condition

    const platformsList = Array.from(platformsSet).sort(); // turn sets into array and sort
    const needsList = Array.from(needsSet).sort();
    const conditionsList = Array.from(conditionsSet).sort();

    // create platform dropdown using platform list
    _wireDropdown('platforms-dropdown', 'platforms-list', 'platforms-selected', platformsList, v => v, null);

    // create needs dropdown using needs list, add necessary labels
    _wireDropdown('needs-dropdown', 'needs-list', 'needs-selected', needsList, getMappedLabel, {
      label: 'Importance',
      min: 1, max: 5,
      defaultVal: 3,
      lowLabel: 'low',
      highLabel: 'high'
    });

    // create conditions dropdown from conditions list, add necessary labels
    _wireDropdown('conditions-dropdown', 'conditions-list', 'conditions-selected', conditionsList, v => v, {
      label: 'Severity',
      min: 1, max: 5,
      defaultVal: 1,
      lowLabel: 'mild',
      highLabel: 'severe'
    });

    // make global clear button functional
    document.getElementById('clear-all-btn')?.addEventListener('click', () => {
      document.querySelectorAll('.filter-fieldset').forEach(fs => {
        if (typeof fs.__clearSelections === 'function') fs.__clearSelections(); // clear all selections
      });
    });

    // error handling
  } catch (error) {
    console.error('Error initializing controller filter form:', error);
  }
}

// configurable dropdown builder
function _wireDropdown(dropdownContainerId, listId, selectedAreaId, items, labelFn, levelConfig) {

  // search input, dropdown list results, selected area tags
  const container = document.getElementById(dropdownContainerId);
  const searchInput = container && container.querySelector('.dropdown-search');
  const list = document.getElementById(listId);
  const selectedArea = document.getElementById(selectedAreaId);

  // error handling
  if (!searchInput || !list || !selectedArea) {
    console.warn(`Dropdown wiring failed for #${dropdownContainerId}`);
    return;
  }

  // map storing user picks
  const selected = new Map();

  // render the list
  function renderList(filter = '') {
    list.innerHTML = ''; // clear previous html
    const lower = filter.toLowerCase();
    const visible = items.filter(item =>
      labelFn(item).toLowerCase().includes(lower) && !selected.has(item) // show what user has types and not already selected
    );

    if (visible.length === 0) {
      list.style.display = 'none';
      return;
    }

    // build dropdown options
    visible.forEach(item => {
      const li = document.createElement('li'); // create tags
      li.textContent = labelFn(item);
      li.dataset.value = item; // set text value of tag to specific item

      // handle selection
      li.addEventListener('mousedown', e => {
        e.preventDefault();
        addItem(item);
        searchInput.value = ''; // hide dropdown after selection
        list.style.display = 'none';
      });
      list.appendChild(li);
    });

    list.style.display = 'block';
  }

  // add value to the map
  function addItem(rawValue) {
    if (selected.has(rawValue)) return;
    selected.set(rawValue, { level: levelConfig ? levelConfig.defaultVal : null }); // store value with the level if necessary
    renderTags(); // refresh tags to show new selected
  }

  function removeItem(rawValue) {
    selected.delete(rawValue); // delete tag from the map
    renderTags(); // refresh tags to show new selected
  }

  // render selected tags on the page
  function renderTags() {
    selectedArea.innerHTML = ''; // clear html
    selected.forEach((data, rawValue) => {
      const tag = document.createElement('div'); // create div for the tag
      tag.className = 'selected-tag';

      const nameSpan = document.createElement('span'); // create span
      nameSpan.className = 'tag-name';
      nameSpan.textContent = labelFn(rawValue); // assign the label
      tag.appendChild(nameSpan); // append

      // handle if tag has level config
      if (levelConfig) {
        const sel = document.createElement('select');
        sel.className = 'tag-level-select';
        for (let i = levelConfig.min; i <= levelConfig.max; i++) { // create tags 1-5
          const opt = document.createElement('option');
          opt.value = i;
          const suffix = i === levelConfig.min
            ? ` (${levelConfig.lowLabel})`
            : i === levelConfig.max
            ? ` (${levelConfig.highLabel})`
            : '';
          opt.textContent = `${i}${suffix}`;
          if (i === data.level) opt.selected = true;
          sel.appendChild(opt);
        }
        // handle if user changes
        sel.addEventListener('change', () => {
          selected.get(rawValue).level = parseInt(sel.value);
        });
        tag.appendChild(sel);
      }

      // add remove button functionality
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'tag-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => removeItem(rawValue)); // call function to remove the chosen item
      tag.appendChild(removeBtn);

      selectedArea.appendChild(tag);
    });
  }

  searchInput.addEventListener('focus', () => renderList(searchInput.value));
  searchInput.addEventListener('input', () => renderList(searchInput.value));
  searchInput.addEventListener('blur', () => {
    setTimeout(() => { list.style.display = 'none'; }, 150);
  });

  // Expose selections and clear method on the fieldset
  const fieldset = container.closest('fieldset');
  if (fieldset) {
    fieldset.__getSelections = () =>
      Array.from(selected.entries()).map(([value, data]) => ({ value, level: data.level }));
    fieldset.__clearSelections = () => { selected.clear(); renderTags(); };
  }

  // Wire the per-section Clear button
  const clearBtn = fieldset?.querySelector('.clear-section-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => { selected.clear(); renderTags(); });
  }
}
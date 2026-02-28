// /javascript/components/forms/controllerFilterForm.js
import { getAllControllers } from '../../api/controllersApi.js';
import { getAllConditions } from '../../api/conditionsApi.js';
import { FEATURE_MAP } from '../featureMapper.js';

// create mapped labels with feature mapper
function getMappedLabel(needName) {
  return FEATURE_MAP[needName] || needName;
}

// Stored after load so customPage.js can read it via getLoadedConditions()
let _loadedConditions = [];

export function getLoadedConditions() {
  return _loadedConditions;
}

// initialise controller filter form
export async function initialiseControllerFilterForm() {
  try {
    const [controllers, conditions] = await Promise.all([
      getAllControllers(),
      getAllConditions()
    ]);

    _loadedConditions = conditions; // cache for external use

    // create empty sets for platforms, needs, conditions
    const platformsSet = new Set();
    const needsSet     = new Set();
    const conditionsSet = new Set();

    controllers.forEach(ctrl => {
      ctrl.platforms.forEach(p => platformsSet.add(p.name));
      ctrl.needs.forEach(n => needsSet.add(n.name));
    });
    conditions.forEach(cond => conditionsSet.add(cond.condition_name));

    const platformsList   = Array.from(platformsSet).sort();
    const needsList       = Array.from(needsSet).sort();
    const conditionsList  = Array.from(conditionsSet).sort();

    _wireDropdown('platforms-dropdown',  'platforms-list',  'platforms-selected',  platformsList,  v => v,            null);
    _wireDropdown('needs-dropdown',      'needs-list',      'needs-selected',      needsList,      getMappedLabel,    {
      label: 'Importance', min: 1, max: 5, defaultVal: 3, lowLabel: 'low', highLabel: 'high'
    });
    _wireDropdown('conditions-dropdown', 'conditions-list', 'conditions-selected', conditionsList, v => v,            {
      label: 'Severity',   min: 1, max: 5, defaultVal: 1, lowLabel: 'mild', highLabel: 'severe'
    });

    // global Clear All button
    document.getElementById('clear-all-btn')?.addEventListener('click', () => {
      document.querySelectorAll('.filter-fieldset').forEach(fs => {
        if (typeof fs.__clearSelections === 'function') fs.__clearSelections();
      });
    });

    // submit button, creates custom event
    document.getElementById('controller-search-submit')?.addEventListener('click', () => {
      document.getElementById('controller-filter-form')
        ?.dispatchEvent(new CustomEvent('filter-search', { bubbles: true }));
    });

  } catch (error) {
    console.error('Error initialising controller filter form:', error);
  }
}

// configurable dropdown builder
function _wireDropdown(dropdownContainerId, listId, selectedAreaId, items, labelFn, levelConfig) {
  const container   = document.getElementById(dropdownContainerId);
  const searchInput = container && container.querySelector('.dropdown-search');
  const list        = document.getElementById(listId);
  const selectedArea = document.getElementById(selectedAreaId);

  // error handling
  if (!searchInput || !list || !selectedArea) {
    console.warn(`Dropdown wiring failed for #${dropdownContainerId}`);
    return;
  }

  // new map for features selected
  const selected = new Map();

  // renders list
  function renderList(filter = '') {
    list.innerHTML = '';
    const lower = filter.toLowerCase();
    const visible = items.filter(item => // list of visible items
      labelFn(item).toLowerCase().includes(lower) && !selected.has(item) // matching and not already selected
    );

    if (visible.length === 0) {
      list.style.display = 'none';
      return;
    }

    // iterate over items in visible
    visible.forEach(item => {
      const li = document.createElement('li');
      li.textContent = labelFn(item);
      li.dataset.value = item;
      li.addEventListener('mousedown', e => { // event listener for mouse click
        e.preventDefault();
        addItem(item); // add item to selected map
        searchInput.value = ''; // clear html
        list.style.display = 'none';
      });
      list.appendChild(li);
    });

    list.style.display = 'block';
  }

  // adds item to selected map
  function addItem(rawValue) {
    if (selected.has(rawValue)) return;
    selected.set(rawValue, { level: levelConfig ? levelConfig.defaultVal : null }); // stores raw value and given level
    renderTags();
  }

  // remove item from selected map
  function removeItem(rawValue) {
    selected.delete(rawValue);
    renderTags();
  }

  // render the current selected tags
  function renderTags() {
    selectedArea.innerHTML = '';
    selected.forEach((data, rawValue) => {
      const tag = document.createElement('div'); // create div for the tag
      tag.className = 'selected-tag'; // div text assigned with tag name

      const nameSpan = document.createElement('span'); // span created
      nameSpan.className = 'tag-name'; // span name = tag name
      nameSpan.textContent = labelFn(rawValue);
      tag.appendChild(nameSpan); // append the tag

      // create the levels if variable has them
      if (levelConfig) {
        const sel = document.createElement('select'); // create dropdown
        sel.className = 'tag-level-select';
        for (let i = levelConfig.min; i <= levelConfig.max; i++) { // generate level tags from 1-5
          const opt = document.createElement('option'); // create each option
          opt.value = i;
          const suffix = i === levelConfig.min // add high and low labels
            ? ` (${levelConfig.lowLabel})`
            : i === levelConfig.max
            ? ` (${levelConfig.highLabel})`
            : '';
          opt.textContent = `${i}${suffix}`; // set display text with the suffix value for selected level
          if (i === data.level) opt.selected = true; // set selected level
          sel.appendChild(opt);
        }
        sel.addEventListener('change', () => { // update data when changed
          selected.get(rawValue).level = parseInt(sel.value);
        });
        tag.appendChild(sel);
      }

      // create remove button
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'tag-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => removeItem(rawValue)); // calls remove item function
      tag.appendChild(removeBtn);

      selectedArea.appendChild(tag);
    });
  }

  searchInput.addEventListener('focus', () => renderList(searchInput.value));
  searchInput.addEventListener('input', () => renderList(searchInput.value));
  searchInput.addEventListener('blur',  () => {
    setTimeout(() => { list.style.display = 'none'; }, 150);
  });

  // Expose selections and clear on the fieldset
  const fieldset = container.closest('fieldset');
  if (fieldset) {
    fieldset.__getSelections  = () =>
      Array.from(selected.entries()).map(([value, data]) => ({ value, level: data.level }));
    fieldset.__clearSelections = () => { selected.clear(); renderTags(); };
  }

  // initialise clear button logic for each section
  const clearBtn = fieldset?.querySelector('.clear-section-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => { selected.clear(); renderTags(); });
  }
}
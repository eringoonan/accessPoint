//javascript/pages/adminPage.js
import { createController, getAllControllers } from '../api/controllersApi.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const controllers = await getAllControllers(); // return all controllers from API

    // set for platforms and needs
    const platformsSet = new Set();
    const needsSet = new Set();

    // for each controller
    controllers.forEach(ctrl => {
      (ctrl.platforms || []).forEach(p => platformsSet.add(p.name)); // add platform
      (ctrl.needs || []).forEach(n => needsSet.add(n.name)); // add need
    });

    // sort sets into arrays
    const platformsList = Array.from(platformsSet).sort();
    const needsList = Array.from(needsSet).sort();

    // initialise platform search + adapter variable
    _wireAdminDropdown(
      'platform-search',
      'platform-dropdown',
      'platform-tags',
      'platform-empty',
      platformsList,
      _buildPlatformTag
    );

    // initialise needs search
    _wireAdminDropdown(
      'need-search',
      'need-dropdown',
      'need-tags',
      'need-empty',
      needsList,
      _buildNeedTag
    );

  } catch (err) {
    console.error('Failed to initialise admin form options:', err);
  }

  initializeControllerFormSubmit();
});

// create generic dropdown function
function _wireAdminDropdown(searchId, listId, tagsId, emptyId, items, buildTagFn) {
  const searchInput = document.getElementById(searchId);
  const list        = document.getElementById(listId);
  const tagsArea    = document.getElementById(tagsId);
  const emptyMsg    = document.getElementById(emptyId);

  // error handling
  if (!searchInput || !list || !tagsArea) {
    console.warn(`Admin dropdown wiring failed for #${searchId}`);
    return;
  }

  // map of selected values
  const selected = new Map();

  // function to render list
  function renderList(filter = '') {
    list.innerHTML = ''; // clear html
    const lower = filter.toLowerCase();
    const visible = items.filter(
      item => item.toLowerCase().includes(lower) && !selected.has(item) // search and only show if not selected
    );

    if (visible.length === 0) {
      list.style.display = 'none';
      return;
    }

    // adding tags
    visible.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item; // text set to item name
      li.dataset.value = item; // data set to item name
      li.addEventListener('mousedown', e => { // event for mouse click
        e.preventDefault();
        addItem(item); //adds item to selected map
        searchInput.value = ''; // reset html
        list.style.display = 'none';
      });
      list.appendChild(li);
    });

    list.style.display = 'block';
  }

  // add item to map
  function addItem(rawValue) {
    if (selected.has(rawValue)) return;
    selected.set(rawValue, {});  // extra detail stored inside the tag element itself
    renderTags(); // show the tags
    if (emptyMsg) emptyMsg.style.display = 'none';
  }

  // remove item from map
  function removeItem(rawValue) {
    selected.delete(rawValue);
    renderTags();
    if (selected.size === 0 && emptyMsg) emptyMsg.style.display = '';
  }

  function renderTags() {
    tagsArea.innerHTML = '';
    selected.forEach((_, rawValue) => {
      const tagEl = buildTagFn(rawValue, () => removeItem(rawValue), selected);
      tagsArea.appendChild(tagEl);
    });
  }

  // expose getSelections so the form submit can read current values
  searchInput._getSelections = () => Array.from(selected.keys());
  searchInput._reset = () => {
    selected.clear();
    renderTags();
    searchInput.value = '';
    list.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = '';
  };

  searchInput.addEventListener('focus', () => renderList(searchInput.value));
  searchInput.addEventListener('input', () => renderList(searchInput.value));
  searchInput.addEventListener('blur',  () => setTimeout(() => { list.style.display = 'none'; }, 150));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { list.style.display = 'none'; searchInput.blur(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = list.querySelector('li');
      if (first) first.dispatchEvent(new Event('mousedown'));
    }
  });
}

// ─── Platform tag card ────────────────────────────────────────────────────────
function _buildPlatformTag(name, onRemove, selectedMap) {
  const wrapper = document.createElement('div');
  wrapper.className = 'tag-item platform-tag';
  wrapper.setAttribute('data-tag', name);

  wrapper.innerHTML = `
    <div class="tag-header">
      <span class="tag-label">${_esc(name)}</span>
      <button type="button" class="tag-remove" aria-label="Remove ${_esc(name)}">×</button>
    </div>
    <div class="tag-details">
      <input
        type="text"
        class="tag-detail-input"
        placeholder="Compatibility notes (optional)"
      />
      <label class="tag-adapter-label">
        <input type="checkbox" />
        <span>Requires adapter</span>
      </label>
    </div>
  `;

  const notesInput      = wrapper.querySelector('input[type="text"]');
  const adapterCheckbox = wrapper.querySelector('input[type="checkbox"]');

  // keep selectedMap entry in sync so collectControllerFormData can read it
  notesInput.addEventListener('input', () => {
    selectedMap.get(name).compatibility_notes = notesInput.value || null;
  });
  adapterCheckbox.addEventListener('change', () => {
    selectedMap.get(name).requires_adapter = adapterCheckbox.checked;
  });

  // initialise entry with defaults
  selectedMap.set(name, { compatibility_notes: null, requires_adapter: false });

  wrapper.querySelector('.tag-remove').addEventListener('click', onRemove);
  return wrapper;
}

// ─── Functional need tag card ─────────────────────────────────────────────────
function _buildNeedTag(name, onRemove, selectedMap) {
  const wrapper = document.createElement('div');
  wrapper.className = 'tag-item need-tag';
  wrapper.setAttribute('data-tag', name);

  wrapper.innerHTML = `
    <div class="tag-header">
      <span class="tag-label">${_esc(name)}</span>
      <button type="button" class="tag-remove" aria-label="Remove ${_esc(name)}">×</button>
    </div>
    <div class="tag-details">
      <select class="tag-suitability-select">
        <option value="">Suitability level (optional)</option>
        <option value="Excellent">Excellent</option>
        <option value="Good">Good</option>
        <option value="Fair">Fair</option>
        <option value="Limited">Limited</option>
      </select>
    </div>
  `;

  const select = wrapper.querySelector('select');

  selectedMap.set(name, { suitability: null });

  select.addEventListener('change', () => {
    selectedMap.get(name).suitability = select.value || null;
  });

  wrapper.querySelector('.tag-remove').addEventListener('click', onRemove);
  return wrapper;
}

// ─── Form Submission ──────────────────────────────────────────────────────────
function initializeControllerFormSubmit() {
  const controllerForm = document.getElementById('controller-form');
  if (!controllerForm) return;

  controllerForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = collectControllerFormData();

    if (formData.platforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }
    if (formData.functional_needs.length === 0) {
      alert('Please select at least one functional need');
      return;
    }

    console.log('Controller form data:', formData);

    const submitBtn = controllerForm.querySelector('button[type="submit"]');
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';

      const result = await createController(formData);

      if (result.success) {
        alert('Controller created successfully!');
        _resetControllerForm(controllerForm);
      } else {
        alert('Failed to create controller: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating controller:', error);
      if (error.message.includes('authentication token')) {
        alert('You are not logged in. Please log in and try again.');
      } else if (error.message.includes('Admin access required')) {
        alert('You do not have permission to add controllers. Admin access is required.');
      } else {
        alert('Error creating controller: ' + error.message);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Controller';
    }
  });
}

// ─── Collect form data ────────────────────────────────────────────────────────
function collectControllerFormData() {
  const form = document.getElementById('controller-form');

  const controllerData = {
    controller_name: form.querySelector('[name="controller_name"]').value,
    manufacturer:    form.querySelector('[name="manufacturer"]').value,
    controller_type: form.querySelector('[name="controller_type"]').value,
    product_url:     form.querySelector('[name="product_url"]').value  || null,
    image_url:       form.querySelector('[name="image_url"]').value    || null,
    price:           form.querySelector('[name="price"]').value        || null,
    release_date:    form.querySelector('[name="release_date"]').value || null,
  };

  // read platforms from the rendered tag cards directly
  const platforms = [];
  document.querySelectorAll('#platform-tags .platform-tag').forEach(tag => {
    const name             = tag.getAttribute('data-tag');
    const notesInput       = tag.querySelector('input[type="text"]');
    const adapterCheckbox  = tag.querySelector('input[type="checkbox"]');
    platforms.push({
      platform_name:       name,
      compatibility_notes: notesInput?.value || null,
      requires_adapter:    adapterCheckbox?.checked ?? false,
    });
  });

  // read needs from the rendered tag cards directly
  const functional_needs = [];
  document.querySelectorAll('#need-tags .need-tag').forEach(tag => {
    const name   = tag.getAttribute('data-tag');
    const select = tag.querySelector('select');
    functional_needs.push({
      need_name:   name,
      suitability: select?.value || null,
    });
  });

  return { controller: controllerData, platforms, functional_needs };
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function _resetControllerForm(form) {
  form.reset();
  document.getElementById('platform-search')?._reset();
  document.getElementById('need-search')?._reset();
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
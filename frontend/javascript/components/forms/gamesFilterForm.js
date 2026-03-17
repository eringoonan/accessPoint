// /javascript/components/forms/gameFilterForm.js
import { getAllConditions } from '../../api/conditionsApi.js';
import { getGames, enrichGames } from '../../api/gamesApi.js';
import { getAllFeatures } from "../../api/featuresApi.js";
import { getAllGenres } from "../../api/genreApi.js";

// stored after load so other modules can read
let _loadedConditions = [];
let _loadedFeatures = [];
let _loadedGenres = [];

export function getLoadedConditions() {
  return _loadedConditions;
}

export function getLoadedFeatures() {
  return _loadedFeatures;
}

export function getLoadedGenres() {
  return _loadedGenres;
}

// initialise game filter form
export async function initialiseGameFilterForm() {
  try {

    const [games, conditions, features, genres] = await Promise.all([
      getGames(),
      getAllConditions(),
      getAllFeatures(),
      getAllGenres()
    ]);

    const enrichedGames = await enrichGames(games);

    _loadedConditions = conditions;
    _loadedFeatures = features;
    _loadedGenres = genres;

    // sets for dropdown lists
    const platformsSet = new Set();
    const conditionsSet = new Set();
    const featuresSet = new Set();

    enrichedGames.forEach(game => {
      game.platforms?.forEach(p => platformsSet.add(p.platform_name));
    });

    conditions.forEach(c => conditionsSet.add(c.condition_name));
    features.forEach(f => featuresSet.add(f.feature_name));

    const platformsList = Array.from(platformsSet).sort();
    const conditionsList = Array.from(conditionsSet).sort();
    const featuresList = Array.from(featuresSet).sort();
    const genresList = genres.map(g => g.genre_name).sort();

    // multi-select dropdowns
    _wireDropdown(
      "platforms-dropdown",
      "platforms-list",
      "platforms-selected",
      platformsList,
      v => v,
      null
    );

    _wireDropdown(
      "features-dropdown",
      "features-list",
      "features-selected",
      featuresList,
      v => v,
      {
        label: "Importance",
        min: 1,
        max: 5,
        defaultVal: 3,
        lowLabel: "low",
        highLabel: "high"
      }
    );

    _wireDropdown(
      "conditions-dropdown",
      "conditions-list",
      "conditions-selected",
      conditionsList,
      v => v,
      {
        label: "Severity",
        min: 1,
        max: 5,
        defaultVal: 1,
        lowLabel: "mild",
        highLabel: "severe"
      }
    );

    // SINGLE SELECT genre dropdown
    _wireSingleSelectDropdown(
      "genre-dropdown",
      "genre-list",
      "genre-selected",
      genresList,
      v => v
    );

    // MUST SUPPORT ALL FEATURES toggle
    const mustSupportAllFeaturesBtn = document.getElementById("must-support-all-features-btn");
    if (mustSupportAllFeaturesBtn) {
      mustSupportAllFeaturesBtn.dataset.active = "true";

      mustSupportAllFeaturesBtn.addEventListener("click", () => {
        const active = mustSupportAllFeaturesBtn.dataset.active === "true";
        mustSupportAllFeaturesBtn.dataset.active = (!active).toString();

        mustSupportAllFeaturesBtn.classList.toggle("active", !active);
      });
    }

    // clear all button
    document.getElementById("clear-all-btn")?.addEventListener("click", () => {
      document.querySelectorAll(".filter-fieldset").forEach(fs => {
        if (typeof fs.__clearSelections === "function") fs.__clearSelections();
      });
    });

    // submit search
    document
      .getElementById("game-search-submit")
      ?.addEventListener("click", () => {
        document
          .getElementById("game-filter-form")
          ?.dispatchEvent(new CustomEvent("filter-search", { bubbles: true }));
      });

  } catch (error) {
    console.error("Error initialising game filter form:", error);
  }
}


// reusable MULTI-select dropdown builder
function _wireDropdown(dropdownContainerId, listId, selectedAreaId, items, labelFn, levelConfig) {

  const container = document.getElementById(dropdownContainerId);
  const searchInput = container && container.querySelector(".dropdown-search");
  const list = document.getElementById(listId);
  const selectedArea = document.getElementById(selectedAreaId);

  if (!searchInput || !list || !selectedArea) {
    console.warn(`Dropdown wiring failed for #${dropdownContainerId}`);
    return;
  }

  const selected = new Map();

  function renderList(filter = "") {

    list.innerHTML = "";

    const lower = filter.toLowerCase();

    const visible = items.filter(item =>
      labelFn(item).toLowerCase().includes(lower) && !selected.has(item)
    );

    if (visible.length === 0) {
      list.style.display = "none";
      return;
    }

    visible.forEach(item => {
      const li = document.createElement("li");
      li.textContent = labelFn(item);

      li.addEventListener("mousedown", e => {
        e.preventDefault();
        addItem(item);
        searchInput.value = "";
        list.style.display = "none";
      });

      list.appendChild(li);
    });

    list.style.display = "block";
  }

  function addItem(rawValue) {
    if (selected.has(rawValue)) return;

    selected.set(rawValue, {
      level: levelConfig ? levelConfig.defaultVal : null
    });

    renderTags();
  }

  function removeItem(rawValue) {
    selected.delete(rawValue);
    renderTags();
  }

  function renderTags() {

    selectedArea.innerHTML = "";

    selected.forEach((data, rawValue) => {

      const tag = document.createElement("div");
      tag.className = "selected-tag";

      const nameSpan = document.createElement("span");
      nameSpan.className = "tag-name";
      nameSpan.textContent = labelFn(rawValue);

      tag.appendChild(nameSpan);

      if (levelConfig) {

        const sel = document.createElement("select");
        sel.className = "tag-level-select";

        for (let i = levelConfig.min; i <= levelConfig.max; i++) {

          const opt = document.createElement("option");
          opt.value = i;

          const suffix =
            i === levelConfig.min
              ? ` (${levelConfig.lowLabel})`
              : i === levelConfig.max
              ? ` (${levelConfig.highLabel})`
              : "";

          opt.textContent = `${i}${suffix}`;

          if (i === data.level) opt.selected = true;

          sel.appendChild(opt);
        }

        sel.addEventListener("change", () => {
          selected.get(rawValue).level = parseInt(sel.value);
        });

        tag.appendChild(sel);
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "tag-remove";
      removeBtn.textContent = "×";

      removeBtn.addEventListener("click", () => removeItem(rawValue));

      tag.appendChild(removeBtn);
      selectedArea.appendChild(tag);
    });
  }

  searchInput.addEventListener("focus", () => renderList(searchInput.value));
  searchInput.addEventListener("input", () => renderList(searchInput.value));

  searchInput.addEventListener("blur", () => {
    setTimeout(() => {
      list.style.display = "none";
    }, 150);
  });

  const fieldset = container.closest("fieldset");

  if (fieldset) {
    fieldset.__getSelections = () =>
      Array.from(selected.entries()).map(([value, data]) => ({
        value,
        level: data.level
      }));

    fieldset.__clearSelections = () => {
      selected.clear();
      renderTags();
    };
  }

  const clearBtn = fieldset?.querySelector(".clear-section-btn");

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      selected.clear();
      renderTags();
    });
  }
}


// SINGLE-select dropdown (for genre)
function _wireSingleSelectDropdown(dropdownContainerId, listId, selectedAreaId, items, labelFn) {

  const container = document.getElementById(dropdownContainerId);
  const searchInput = container && container.querySelector(".dropdown-search");
  const list = document.getElementById(listId);
  const selectedArea = document.getElementById(selectedAreaId);

  if (!searchInput || !list || !selectedArea) {
    console.warn(`Dropdown wiring failed for #${dropdownContainerId}`);
    return;
  }

  let selected = null;

  function renderList(filter = "") {
    list.innerHTML = "";

    const lower = filter.toLowerCase();

    const visible = items.filter(item =>
      labelFn(item).toLowerCase().includes(lower) && item !== selected
    );

    if (!visible.length) {
      list.style.display = "none";
      return;
    }

    visible.forEach(item => {
      const li = document.createElement("li");
      li.textContent = labelFn(item);

      li.addEventListener("mousedown", e => {
        e.preventDefault();
        selected = item;
        renderTag();
        searchInput.value = "";
        list.style.display = "none";
      });

      list.appendChild(li);
    });

    list.style.display = "block";
  }

  function renderTag() {
    selectedArea.innerHTML = "";

    if (!selected) return;

    const tag = document.createElement("div");
    tag.className = "selected-tag";

    const nameSpan = document.createElement("span");
    nameSpan.className = "tag-name";
    nameSpan.textContent = labelFn(selected);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.className = "tag-remove";

    removeBtn.addEventListener("click", () => {
      selected = null;
      renderTag();
    });

    tag.appendChild(nameSpan);
    tag.appendChild(removeBtn);

    selectedArea.appendChild(tag);
  }

  searchInput.addEventListener("focus", () => renderList(searchInput.value));
  searchInput.addEventListener("input", () => renderList(searchInput.value));

  searchInput.addEventListener("blur", () => {
    setTimeout(() => list.style.display = "none", 150);
  });

  const fieldset = container.closest("fieldset");

  if (fieldset) {
    fieldset.__getSelections = () =>
      selected ? [{ value: selected }] : [];

    fieldset.__clearSelections = () => {
      selected = null;
      renderTag();
    };
  }

  const clearBtn = fieldset?.querySelector(".clear-section-btn");

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      selected = null;
      renderTag();
    });
  }
}
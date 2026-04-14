// /javascript/components/accessibility.js
const STORAGE_KEY = 'ap-accessibility';

const DEFAULTS = {
  fontSize:       0,
  highContrast:   false,
  reducedMotion:  false,
  dyslexiaFont:   false,
};

function loadPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function applyPrefs(prefs) {
  const root = document.documentElement;

  root.style.fontSize = prefs.fontSize !== 0 ? `${16 + prefs.fontSize}px` : '';

  root.classList.toggle('ap-high-contrast', prefs.highContrast);
  root.classList.toggle('ap-reduced-motion', prefs.reducedMotion);
  root.classList.toggle('ap-dyslexia-font', prefs.dyslexiaFont);
}


function mount() {
  const style = document.createElement('style');
  style.textContent = `
    /* Dyslexia font import */
    @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap');

    /* Toolbar */
    #ap-a11y-toolbar {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    }

    #ap-a11y-panel {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      padding: 16px;
      width: 240px;
      display: none;
      flex-direction: column;
      gap: 12px;
    }

    #ap-a11y-panel.open {
      display: flex;
    }

    #ap-a11y-panel h3 {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin: 0 0 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Toggle button (FAB) */
    #ap-a11y-toggle-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: #5dceac;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: background-color 0.2s ease, transform 0.2s ease;
      flex-shrink: 0;
    }

    #ap-a11y-toggle-btn:hover {
      background-color: #4ab898;
      transform: scale(1.08);
    }

    #ap-a11y-toggle-btn svg {
      width: 24px;
      height: 24px;
      fill: #fff;
    }

    /* Rows inside the panel */
    .ap-a11y-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .ap-a11y-label {
      font-size: 14px;
      color: #444;
      font-weight: 500;
      flex: 1;
    }

    /* Toggle switch */
    .ap-switch {
      position: relative;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
    }

    .ap-switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }

    .ap-switch-track {
      position: absolute;
      inset: 0;
      background-color: #ccc;
      border-radius: 11px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .ap-switch input:checked + .ap-switch-track {
      background-color: #5dceac;
    }

    .ap-switch-track::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }

    .ap-switch input:checked + .ap-switch-track::after {
      transform: translateX(18px);
    }

    .ap-switch input:focus-visible + .ap-switch-track {
      outline: 2px solid #5dceac;
      outline-offset: 2px;
    }

    /* Font size stepper */
    .ap-stepper {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ap-stepper button {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid #ddd;
      background: #fff;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      color: #333;
      transition: background-color 0.15s ease, border-color 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ap-stepper button:hover {
      background-color: #f0f0f0;
      border-color: #999;
    }

    .ap-stepper button:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .ap-stepper-value {
      font-size: 13px;
      color: #555;
      min-width: 28px;
      text-align: center;
    }

    /* Reset link */
    #ap-a11y-reset {
      font-size: 12px;
      color: #999;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      text-align: right;
      align-self: flex-end;
      transition: color 0.15s ease;
    }

    #ap-a11y-reset:hover {
      color: #555;
    }

    /* ── Global pref classes applied to <html> ── */

    .ap-high-contrast body {
      background-color: #fff !important;
      color: #000 !important;
    }

    .ap-high-contrast a,
    .ap-high-contrast .navbar-left a,
    .ap-high-contrast .navbar-right a {
      color: #0000cc !important;
    }

    .ap-high-contrast .controller-card,
    .ap-high-contrast .game-card {
      border: 2px solid #000 !important;
    }

    .ap-high-contrast .btn,
    .ap-high-contrast .select-button,
    .ap-high-contrast .sort-select {
      border: 2px solid #000 !important;
      color: #000 !important;
    }

    .ap-high-contrast .feature-tag,
    .ap-high-contrast .filter-tag {
      background-color: #000 !important;
      color: #fff !important;
    }

    .ap-high-contrast header {
      background-color: #fff !important;
      border-bottom: 2px solid #000;
    }

    .ap-reduced-motion *,
    .ap-reduced-motion *::before,
    .ap-reduced-motion *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }

    .ap-dyslexia-font body,
    .ap-dyslexia-font input,
    .ap-dyslexia-font button,
    .ap-dyslexia-font select,
    .ap-dyslexia-font textarea {
      font-family: 'Lexend', sans-serif !important;
      letter-spacing: 0.03em;
      word-spacing: 0.1em;
      line-height: 1.8 !important;
    }
  `;
  document.head.appendChild(style);

  // ── HTML ────────────────────────────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.id = 'ap-a11y-toolbar';
  toolbar.setAttribute('aria-label', 'Accessibility options');
  toolbar.innerHTML = `
    <div id="ap-a11y-panel" role="region" aria-label="Accessibility settings">
      <h3>Accessibility</h3>

      <div class="ap-a11y-row">
        <span class="ap-a11y-label">Text size</span>
        <div class="ap-stepper">
          <button id="ap-font-down" aria-label="Decrease text size">−</button>
          <span class="ap-stepper-value" id="ap-font-value">0px</span>
          <button id="ap-font-up" aria-label="Increase text size">+</button>
        </div>
      </div>

      <div class="ap-a11y-row">
        <label class="ap-a11y-label" for="ap-contrast-toggle">High contrast</label>
        <label class="ap-switch">
          <input type="checkbox" id="ap-contrast-toggle" />
          <span class="ap-switch-track"></span>
        </label>
      </div>

      <div class="ap-a11y-row">
        <label class="ap-a11y-label" for="ap-motion-toggle">Reduce motion</label>
        <label class="ap-switch">
          <input type="checkbox" id="ap-motion-toggle" />
          <span class="ap-switch-track"></span>
        </label>
      </div>

      <div class="ap-a11y-row">
        <label class="ap-a11y-label" for="ap-dyslexia-toggle">Dyslexia font</label>
        <label class="ap-switch">
          <input type="checkbox" id="ap-dyslexia-toggle" />
          <span class="ap-switch-track"></span>
        </label>
      </div>

      <button id="ap-a11y-reset" aria-label="Reset all accessibility settings">Reset to defaults</button>
    </div>

    <button id="ap-a11y-toggle-btn" aria-expanded="false" aria-controls="ap-a11y-panel" title="Accessibility options">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="4" r="2"/>
        <path d="M19 8.5c-2.3-.8-4.6-1.2-7-1.2s-4.7.4-7 1.2l.7 2c1.9-.6 3.8-1 5.8-1h.1c-.4.8-.7 1.8-.8 2.8L9 17l-3 4h2.5l2.5-3.5L13.5 21H16l-3-4-1.8-4.7c.1-1 .4-1.9.8-2.7 1.9.1 3.7.5 5.5 1.1l.5-2z"/>
      </svg>
    </button>
  `;
  document.body.appendChild(toolbar);

  let prefs = loadPrefs();
  applyPrefs(prefs);

  const panel        = document.getElementById('ap-a11y-panel');
  const toggleBtn    = document.getElementById('ap-a11y-toggle-btn');
  const fontUp       = document.getElementById('ap-font-up');
  const fontDown     = document.getElementById('ap-font-down');
  const fontValue    = document.getElementById('ap-font-value');
  const contrastChk  = document.getElementById('ap-contrast-toggle');
  const motionChk    = document.getElementById('ap-motion-toggle');
  const dyslexiaChk  = document.getElementById('ap-dyslexia-toggle');
  const resetBtn     = document.getElementById('ap-a11y-reset');

  const FONT_MIN = -4;
  const FONT_MAX = 12;
  const FONT_STEP = 2;

  function syncUI(p) {
    fontValue.textContent = p.fontSize === 0
      ? '0px'
      : `${p.fontSize > 0 ? '+' : ''}${p.fontSize}px`;

    fontDown.disabled   = p.fontSize <= FONT_MIN;
    fontUp.disabled     = p.fontSize >= FONT_MAX;
    contrastChk.checked = p.highContrast;
    motionChk.checked   = p.reducedMotion;
    dyslexiaChk.checked = p.dyslexiaFont;
  }

  function update(changes) {
    prefs = { ...prefs, ...changes };
    applyPrefs(prefs);
    syncUI(prefs);
    savePrefs(prefs);
  }

  syncUI(prefs);

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!toolbar.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  fontUp.addEventListener('click', () =>
    update({ fontSize: Math.min(prefs.fontSize + FONT_STEP, FONT_MAX) })
  );

  fontDown.addEventListener('click', () =>
    update({ fontSize: Math.max(prefs.fontSize - FONT_STEP, FONT_MIN) })
  );

  contrastChk.addEventListener('change', () =>
    update({ highContrast: contrastChk.checked })
  );

  motionChk.addEventListener('change', () =>
    update({ reducedMotion: motionChk.checked })
  );

  dyslexiaChk.addEventListener('change', () =>
    update({ dyslexiaFont: dyslexiaChk.checked })
  );

  resetBtn.addEventListener('click', () =>
    update({ ...DEFAULTS })
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
'use strict';

let allFonts     = [];
let loadedFonts  = new Set();

// ── Asset paths ───────────────────────────────────────────────
const CUPID_GIF    = 'assets/typecupidlogoanimate.gif';
const CUPID_STATIC = 'assets/heart2.svg';
const LOCK_OPEN    = 'assets/Lockopen.svg';
const LOCK_CLOSED  = 'assets/Lockclosed.svg';

// ── Font catalogue ────────────────────────────────────────────
const FONTS = {
  display: [
    { name: 'Playfair Display',   category: 'serif' },
    { name: 'Cormorant Garamond', category: 'serif' },
    { name: 'Abril Fatface',      category: 'display' },
    { name: 'Lobster',            category: 'display' },
    { name: 'Oswald',             category: 'sans-serif' },
    { name: 'Righteous',          category: 'display' },
    { name: 'Bebas Neue',         category: 'display' },
    { name: 'Yeseva One',         category: 'serif' },
    { name: 'Arvo',               category: 'serif' },
    { name: 'Alfa Slab One',      category: 'display' },
  ],
  subheading: [
    { name: 'Lora',               category: 'serif' },
    { name: 'Merriweather',       category: 'serif' },
    { name: 'Libre Baskerville',  category: 'serif' },
    { name: 'Raleway',            category: 'sans-serif' },
    { name: 'Josefin Sans',       category: 'sans-serif' },
    { name: 'Nunito',             category: 'sans-serif' },
    { name: 'Source Serif 4',     category: 'serif' },
    { name: 'DM Serif Display',   category: 'serif' },
    { name: 'PT Serif',           category: 'serif' },
    { name: 'Spectral',           category: 'serif' },
  ],
  body: [
    { name: 'Inter',              category: 'sans-serif' },
    { name: 'Source Sans 3',      category: 'sans-serif' },
    { name: 'Open Sans',          category: 'sans-serif' },
    { name: 'Roboto',             category: 'sans-serif' },
    { name: 'Lato',               category: 'sans-serif' },
    { name: 'Crimson Text',       category: 'serif' },
    { name: 'EB Garamond',        category: 'serif' },
    { name: 'Literata',           category: 'serif' },
    { name: 'Noto Serif',         category: 'serif' },
    { name: 'Nunito Sans',        category: 'sans-serif' },
  ],
};

// ── Personality filters — zone-specific filters applied against the full allFonts catalogue
const PERSONALITIES = {
  "Elegant": {
    heading:    f => f.category === 'serif',
    subheading: f => f.category === 'sans-serif',
    body:       f => f.category === 'sans-serif'
  },
  "Playful": {
    heading:    f => f.category === 'display',
    subheading: f => f.category === 'sans-serif',
    body:       f => f.category === 'sans-serif'
  },
  "Corporate": {
    heading:    f => f.category === 'sans-serif',
    subheading: f => f.category === 'sans-serif',
    body:       f => f.category === 'sans-serif'
  },
  "Bold": {
    heading:    f => f.category === 'display',
    subheading: f => f.category === 'sans-serif',
    body:       f => f.category === 'sans-serif'
  },
  "Artistic": {
    heading:    f => f.category === 'handwriting' || f.category === 'display',
    subheading: f => f.category === 'serif',
    body:       f => f.category === 'sans-serif'
  },
  "Friendly": {
    heading:    f => f.category === 'handwriting',
    subheading: f => f.category === 'sans-serif',
    body:       f => f.category === 'sans-serif'
  },
  "Techy": {
    heading:    f => f.category === 'monospace' || f.category === 'sans-serif',
    subheading: f => f.category === 'sans-serif',
    body:       f => f.category === 'monospace' || f.category === 'sans-serif'
  },
  "Luxurious": {
    heading:    f => f.category === 'serif',
    subheading: f => f.category === 'serif',
    body:       f => f.category === 'sans-serif'
  },
  "Vintage": {
    heading:    f => f.category === 'serif' || f.category === 'display',
    subheading: f => f.category === 'serif',
    body:       f => f.category === 'serif'
  },
  "Childlike": {
    heading:    f => f.category === 'handwriting',
    subheading: f => f.category === 'handwriting' || f.category === 'display',
    body:       f => f.category === 'sans-serif'
  }
};

// Lowercase keys for pill data-personality lookup and arrow navigation
const PERSONALITY_KEYS = Object.keys(PERSONALITIES).map(k => k.toLowerCase());

// ── State ─────────────────────────────────────────────────────
const state = {
  heading:    { font: null, locked: false },
  subheading: { font: null, locked: false },
  body:       { font: null, locked: false },
};

// Font weight per zone — controlled by the weight picker dropdown
const fontWeights = { heading: 700, subheading: 400, body: 400 };
const WEIGHT_LABELS = { 700: 'Bold', 500: 'Medium', 400: 'Regular', 300: 'Light' };
(function initWeightVars() {
  Object.entries(fontWeights).forEach(([zone, w]) =>
    document.documentElement.style.setProperty(`--weight-${zone}`, w));
})();

// ── Combination history (arrow up/down navigation) ────────────
const comboHistory = [];   // array of font snapshots [ {heading, subheading, body} ]
let historyPos     = -1;   // current position in comboHistory

function pushCombo() {
  const snap = {
    heading:    state.heading.font    ? { ...state.heading.font }    : null,
    subheading: state.subheading.font ? { ...state.subheading.font } : null,
    body:       state.body.font       ? { ...state.body.font }       : null,
  };
  comboHistory.splice(historyPos + 1);   // discard forward stack on new pick
  comboHistory.push(snap);
  historyPos = comboHistory.length - 1;
}

function applyCombo(snap) {
  ZONES.forEach(zone => {
    if (snap[zone] && !state[zone].locked) applyFont(zone, snap[zone]);
  });
  updateFontImport();
}

let activePersonality   = null;   // currently selected personality key
let personalityIndex    = 0;      // for arrow navigation

// ── Chip element IDs per level (footer chips + font panel chips)
const CHIP_IDS = {
  heading:    ['chip-heading',    'panel-chip-heading'],
  subheading: ['chip-subheading', 'panel-chip-subheading'],
  body:       ['chip-body',       'panel-chip-body'],
};

// ── Helpers ───────────────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Builds the @import URL from current state and injects it into a <style> tag.
// Also writes --heading-font / --subheading-font / --body-font into :root.
function updateFontImport() {
  const h = state.heading.font;
  const s = state.subheading.font;
  const b = state.body.font;
  if (!h || !s || !b) return;   // called before initApp completes

  const enc      = name => name.replace(/ /g, '+');
  const fallback = cat  => cat === 'serif'     ? 'serif'
                         : cat === 'monospace'  ? 'monospace'
                         : 'sans-serif';

  const importUrl =
    `family=${enc(h.name)}:wght@300;400;500;700` +
    `&family=${enc(s.name)}:wght@300;400;500;700` +
    `&family=${enc(b.name)}:wght@300;400;500;700` +
    `&display=swap`;

  // setProperty writes inline styles on <html> — highest specificity, always instant
  const root = document.documentElement.style;
  root.setProperty('--heading-font',    `'${h.name}', ${fallback(h.category)}`);
  root.setProperty('--subheading-font', `'${s.name}', ${fallback(s.category)}`);
  root.setProperty('--body-font',       `'${b.name}', ${fallback(b.category)}`);

  // @import provides the combined batch request
  let el = document.getElementById('dynamic-fonts');
  if (!el) {
    el = document.createElement('style');
    el.id = 'dynamic-fonts';
    document.head.appendChild(el);
  }
  el.textContent = `@import url('https://fonts.googleapis.com/css2?${importUrl}');`;

  // Also load each font via individual <link> tags — reliable cross-browser fallback
  // (loadedFonts Set deduplicates so already-loaded fonts are skipped)
  loadFont(h.name);
  loadFont(s.name);
  loadFont(b.name);
}

function applyFont(level, font) {
  state[level].font = font;
  // Body text defaults to Regular when a new font is picked (Bold/Medium feel wrong for body copy)
  if (level === 'body' && fontWeights.body > 400) {
    setFontWeight('body', 400);
  }
  CHIP_IDS[level].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = font.name;
  });
}

function refreshFonts({ heading, subheading, body } = {}) {
  const loaded = [];

  if (!state.heading.locked) {
    const f = heading || pick(FONTS.display);
    applyFont('heading', f);
    loaded.push(f.name);
  } else { loaded.push(state.heading.font?.name); }

  if (!state.subheading.locked) {
    const f = subheading || pick(FONTS.subheading);
    applyFont('subheading', f);
    loaded.push(f.name);
  } else { loaded.push(state.subheading.font?.name); }

  if (!state.body.locked) {
    const f = body || pick(FONTS.body);
    applyFont('body', f);
    loaded.push(f.name);
  } else { loaded.push(state.body.font?.name); }

  updateFontImport();
  pushCombo();
}

function toggleLock(zone) {
  state[zone].locked = !state[zone].locked;
  const isLocked = state[zone].locked;

  // Toggle .is-locked on the zone container ([data-level] rows)
  document.querySelectorAll(`[data-level="${zone}"]`).forEach(el => {
    el.classList.toggle('is-locked', isLocked);
  });
  // Swap lock icon across all lock buttons for this zone
  document.querySelectorAll(`.btn-lock[data-zone="${zone}"] .lock-icon`).forEach(img => {
    img.src = isLocked ? LOCK_CLOSED : LOCK_OPEN;
  });
  // Visually disable / re-enable every reload button in this zone
  document.querySelectorAll(`.btn-shuffle[data-zone="${zone}"]`).forEach(btn => {
    btn.classList.toggle('is-disabled', isLocked);
    btn.setAttribute('aria-disabled', isLocked ? 'true' : 'false');
  });
}

// ── Ding sound (Web Audio API, no external file) ─────────────
function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[1047, 0], [1319, 0.06], [1568, 0.12]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.connect(env);
      env.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0,    ctx.currentTime + delay);
      env.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.4);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime  + delay + 1.4);
    });
  } catch (_) {}
}

// ── Heart confetti (pink / white / red shades) ────────────────
const CONFETTI_COLORS = [
  '#D377B7', '#f0c8e0', '#e879a8', '#ffb3c6', /* pinks  */
  '#ffffff', '#fff0f6',                        /* whites */
  '#e63946', '#d62828', '#c1121f',             /* reds   */
];

function spawnConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  for (let i = 0; i < 55; i++) {
    const el    = document.createElement('span');
    el.className = 'confetti-heart';
    el.textContent = '♥';
    const size  = 10 + Math.random() * 26;
    const dur   = (1.4 + Math.random() * 1.4).toFixed(2);
    const delay = (Math.random() * 0.9).toFixed(2);
    el.style.cssText =
      `left:${(Math.random() * 100).toFixed(1)}%;` +
      `color:${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};` +
      `font-size:${size.toFixed(0)}px;` +
      `animation-duration:${dur}s;` +
      `animation-delay:${delay}s;`;
    container.appendChild(el);
  }

  setTimeout(() => container.remove(), 3600);
}

// ── Default zone filters used when no personality is active ──
const ZONE_FILTERS = {
  heading:    f => f.category === 'display'    || f.category === 'serif',
  subheading: f => f.category === 'serif'      || f.category === 'sans-serif',
  body:       f => f.category === 'sans-serif' || f.category === 'serif',
};

// ── Anti-repetition random font picker ───────────────────────
const recentFonts = new Set();

function pickRandom(zone, filterFn) {
  if (state[zone].locked) return;

  // Use the full API catalogue when loaded; fall back to hardcoded arrays
  const catalogue = allFonts.length > 0
    ? allFonts
    : (zone === 'heading'    ? FONTS.display
     : zone === 'subheading' ? FONTS.subheading
     : FONTS.body).map(f => ({ family: f.name, category: f.category }));

  let pool = filterFn ? catalogue.filter(filterFn) : catalogue;
  if (pool.length === 0) pool = catalogue;

  // Remove recently used fonts to avoid repetition
  let fresh = pool.filter(f => !recentFonts.has(f.family));

  // If all fonts in pool have been used, reset and start fresh
  if (fresh.length === 0) {
    recentFonts.clear();
    fresh = pool;
  }

  // Pick a random font from the fresh pool
  const font = fresh[Math.floor(Math.random() * fresh.length)];

  // Track it as recently used (keep last 30)
  recentFonts.add(font.family);
  if (recentFonts.size > 30) {
    recentFonts.delete(recentFonts.values().next().value);
  }

  applyFont(zone, { name: font.family, category: font.category });
  updateFontImport();
}

// ── Shake the lock button for a given zone ────────────────────
function shakeLockIcon(zone) {
  document.querySelectorAll(`.btn-lock[data-zone="${zone}"]`).forEach(btn => {
    btn.classList.remove('is-shaking');
    void btn.offsetWidth;                  // force reflow to restart animation
    btn.classList.add('is-shaking');
    btn.addEventListener('animationend', () => btn.classList.remove('is-shaking'), { once: true });
  });
}

// ── Cupid Match gif animation (used by personality / arrows) ──
let cupidTimer = null;
function animateCupidMatch() {
  clearTimeout(cupidTimer);
  document.querySelectorAll('.cupid-icon').forEach(img => { img.src = CUPID_GIF; });
  cupidTimer = setTimeout(() => {
    document.querySelectorAll('.cupid-icon').forEach(img => { img.src = CUPID_STATIC; });
  }, 1800);
}

// ── Cupid Match button handler ────────────────────────────────
const CUPID_BTN_IDS  = ['btn-cupid-match', 'btn-cupid-mobile'];
const ZONES          = ['heading', 'subheading', 'body'];

// Rapid slot-machine cycle through font names inside the chip while picking
function startChipCounter(zone) {
  const pool   = zone === 'heading'    ? FONTS.display
               : zone === 'subheading' ? FONTS.subheading
               : FONTS.body;
  let i = 0;
  const interval = setInterval(() => {
    const name = pool[i % pool.length].name;
    CHIP_IDS[zone].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('is-matched');
        el.textContent = name;
        el.classList.add('is-counting');
      }
    });
    i++;
  }, 80);
  return interval;
}

function stopChipCounter(zone, interval) {
  clearInterval(interval);
  CHIP_IDS[zone].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-counting');
  });
}

const ANIM_MS = 1800;  // gif duration — counter and gif start/stop together

async function cupidMatch() {
  const buttons = CUPID_BTN_IDS.map(id => document.getElementById(id)).filter(Boolean);

  // Everything starts at t=0: gif, #D377B7 button, chip counters
  buttons.forEach(btn => btn.classList.add('is-matching'));
  document.querySelectorAll('.cupid-icon').forEach(img => { img.src = CUPID_GIF; });

  const counters = {};
  ZONES.forEach(zone => {
    if (!state[zone].locked) counters[zone] = startChipCounter(zone);
  });

  // Everything stops at t=1800ms: gif reverts, button reverts, counters land on real fonts
  clearTimeout(cupidTimer);
  cupidTimer = setTimeout(() => {
    ZONES.forEach(zone => {
      if (!state[zone].locked) {
        stopChipCounter(zone, counters[zone]);
        pickRandom(zone, ZONE_FILTERS[zone]);
        CHIP_IDS[zone].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.add('is-matched');
        });
      }
    });
    pushCombo();
    playDing();
    spawnConfetti();
    buttons.forEach(btn => btn.classList.remove('is-matching'));
    document.querySelectorAll('.cupid-icon').forEach(img => { img.src = CUPID_STATIC; });
  }, ANIM_MS);
}

// ── Personality dropdown ──────────────────────────────────────
const dropdown = document.getElementById('personality-dropdown');

function openDropdown()  { closeWeightDropdown(); dropdown.classList.add('is-open'); }
function closeDropdown() { dropdown.classList.remove('is-open'); }
function toggleDropdown() { closeWeightDropdown(); dropdown.classList.toggle('is-open'); }

function clearPersonalitySelection() {
  activePersonality = null;
  document.querySelectorAll('.personality-pill.active').forEach(btn => {
    btn.classList.remove('active');
  });
}

function selectPersonality(key) {
  activePersonality = key;
  personalityIndex  = PERSONALITY_KEYS.indexOf(key);

  // Mark the clicked pill active, remove from all others
  document.querySelectorAll('.personality-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.personality === key);
  });

  // Get zone-specific filters for this personality
  const name    = key[0].toUpperCase() + key.slice(1);
  const filters = PERSONALITIES[name];

  // Pick a font per unlocked zone using its own filter
  pickRandom('heading',    filters ? filters.heading    : ZONE_FILTERS.heading);
  pickRandom('subheading', filters ? filters.subheading : ZONE_FILTERS.subheading);
  pickRandom('body',       filters ? filters.body       : ZONE_FILTERS.body);

  pushCombo();
  animateCupidMatch();
  closeDropdown();
}

// Close dropdown when clicking outside of it or the trigger buttons
document.addEventListener('click', e => {
  if (
    dropdown.classList.contains('is-open') &&
    !dropdown.contains(e.target) &&
    !e.target.closest('#btn-personality') &&
    !e.target.closest('#btn-personality-mobile')
  ) {
    closeDropdown();
  }
});

// ── Font weight picker ────────────────────────────────────────
const weightDropdown   = document.getElementById('weight-dropdown');
let   activeWeightZone = null;

function setFontWeight(zone, weight) {
  fontWeights[zone] = weight;
  document.documentElement.style.setProperty(`--weight-${zone}`, weight);
}

function openWeightDropdown(zone, chipEl) {
  closeDropdown();   // close personality dropdown if open
  activeWeightZone = zone;

  // Position above the chip, centered on it, clamped away from screen edges
  const chipRect = chipEl.getBoundingClientRect();
  const cardEl   = document.querySelector('.app-card');
  const cardRect = cardEl.getBoundingClientRect();
  const dropW    = 340;
  const margin   = 16;
  // Center dropdown on the chip
  let leftPx = Math.round(chipRect.left - cardRect.left + chipRect.width / 2 - dropW / 2);
  const botPx    = Math.round(cardRect.bottom - chipRect.top + 12);

  if (leftPx + dropW > cardRect.width - margin) leftPx = cardRect.width - dropW - margin;
  if (leftPx < margin) leftPx = margin;

  weightDropdown.style.bottom = `${botPx}px`;
  weightDropdown.style.left   = `${leftPx}px`;
  weightDropdown.style.top    = '';

  // Title shows the current font name for the zone
  const fontName = (state[zone].font && state[zone].font.name)
    || chipEl.textContent.trim().split(' · ')[0]
    || 'Font name';
  weightDropdown.querySelector('.weight-dropdown__title').textContent = fontName;

  // Mark the current weight
  weightDropdown.querySelectorAll('.weight-pill').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.weight) === fontWeights[zone]);
  });

  // Pink chip while open
  document.querySelectorAll('.font-chip').forEach(c => c.classList.remove('is-weight-open'));
  chipEl.classList.add('is-weight-open');

  weightDropdown.classList.add('is-open');
}

function closeWeightDropdown() {
  weightDropdown.classList.remove('is-open');
  document.querySelectorAll('.font-chip').forEach(c => c.classList.remove('is-weight-open'));
  activeWeightZone = null;
}

// Chip buttons: open/toggle the weight dropdown
document.querySelectorAll('.font-chip[data-zone]').forEach(chip => {
  chip.addEventListener('click', e => {
    e.stopPropagation();
    const zone = chip.dataset.zone;
    if (weightDropdown.classList.contains('is-open') && activeWeightZone === zone) {
      closeWeightDropdown();
    } else {
      openWeightDropdown(zone, chip);
    }
  });
});

// Weight pills: apply weight, update chip text, close dropdown
weightDropdown.querySelectorAll('.weight-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    if (!activeWeightZone) return;
    const weight = parseInt(pill.dataset.weight);
    setFontWeight(activeWeightZone, weight);
    weightDropdown.querySelectorAll('.weight-pill').forEach(p => {
      p.classList.toggle('active', parseInt(p.dataset.weight) === weight);
    });
    closeWeightDropdown();
  });
});

// Close weight dropdown on outside click
document.addEventListener('click', e => {
  if (weightDropdown.classList.contains('is-open') &&
      !weightDropdown.contains(e.target) &&
      !e.target.closest('.font-chip[data-zone]')) {
    closeWeightDropdown();
  }
});

// ── Event listeners ───────────────────────────────────────────

// Cupid Match (header + mobile)
CUPID_BTN_IDS.forEach(id => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', () => {
    clearPersonalitySelection();
    closeDropdown();
    cupidMatch();
  });
});

// Pick Personality (header + mobile): toggle the dropdown
['btn-personality', 'btn-personality-mobile'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', e => {
    e.stopPropagation();
    toggleDropdown();
  });
});

// Personality pills
document.querySelectorAll('.personality-pill').forEach(btn => {
  btn.addEventListener('click', () => selectPersonality(btn.dataset.personality));
});

// Arrow up: go back to the previous font combination in history
document.querySelectorAll('.btn-arrow-up').forEach(btn => {
  btn.addEventListener('click', () => {
    if (historyPos > 0) {
      historyPos--;
      applyCombo(comboHistory[historyPos]);
    }
  });
});

// Arrow down: go forward to the next font combination in history
document.querySelectorAll('.btn-arrow-down').forEach(btn => {
  btn.addEventListener('click', () => {
    if (historyPos < comboHistory.length - 1) {
      historyPos++;
      applyCombo(comboHistory[historyPos]);
    }
  });
});

// Lock buttons (all preview rows + font panel rows)
// Lock buttons — reads data-zone, toggles lock state for that zone
document.querySelectorAll('.btn-lock').forEach(btn => {
  btn.addEventListener('click', () => toggleLock(btn.dataset.zone));
});

// Reload buttons — reads data-zone; shakes lock icon if zone is locked
document.querySelectorAll('.btn-shuffle').forEach(btn => {
  btn.addEventListener('click', () => {
    const zone = btn.dataset.zone;
    if (state[zone].locked) {
      shakeLockIcon(zone);
      return;
    }
    pickRandom(zone, ZONE_FILTERS[zone]);
  });
});

// ── Google Fonts API ──────────────────────────────────────────
async function fetchFonts() {
  try {
    const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`);
    if (!res.ok) {
      console.error('API Error:', res.status, res.statusText);
      return;
    }
    const data = await res.json();
    allFonts = (data.items || []).map(({ family, category, variants }) => ({ family, category, variants }));
    console.log('Total fonts:', allFonts.length);
    console.log('serif:',       allFonts.filter(f => f.category === 'serif').length);
    console.log('sans-serif:',  allFonts.filter(f => f.category === 'sans-serif').length);
    console.log('display:',     allFonts.filter(f => f.category === 'display').length);
    console.log('handwriting:', allFonts.filter(f => f.category === 'handwriting').length);
    console.log('monospace:',   allFonts.filter(f => f.category === 'monospace').length);
    initApp();
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

function loadFont(fontName) {
  if (loadedFonts.has(fontName)) return;
  const link  = document.createElement('link');
  link.rel    = 'stylesheet';
  link.href   = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;500;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

// ── Init ──────────────────────────────────────────────────────

// Pick fonts immediately from the hardcoded catalogue — chips are never empty
refreshFonts();

// Fetch the full Google Fonts catalogue in the background for personality filtering
// initApp is called by fetchFonts() once allFonts is populated
function initApp() {
  console.log(`TypeCupid: ${allFonts.length} fonts ready for personality filtering`);
}

fetchFonts();

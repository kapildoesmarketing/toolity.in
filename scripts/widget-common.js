/* Designed by Kapil Pidhwani: Shared runtime for Toolity Widgets (scripts/widget-common.js).
 * Powers BOTH the chromeless embed (/widgets/<slug>/embed/) and the builder tool page (/widgets/<slug>/).
 * All state lives in the URL query string — zero backend, zero storage required.
 * Trust boundary: URL parameters come from arbitrary external links; every value is strictly validated
 * and rendered with textContent / CSS custom properties only.
 */
(function () {
  'use strict';

  const SITE_ORIGIN = 'https://toolity.in';
  const HEX_RE = /^[0-9a-fA-F]{6}$/;

  const GOOGLE_FONTS = {
    'inter':          { family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' },
    'dm-sans':        { family: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap' },
    'space-grotesk':  { family: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif", href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap' },
    'jetbrains-mono': { family: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace", href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap' },
    'playfair':       { family: "'Playfair Display', Georgia, Cambria, serif", href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap' }
  };

  const SYSTEM_FONTS = {
    'sans':  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    'serif': 'Georgia, Cambria, "Times New Roman", Times, serif',
    'mono':  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  };

  const STYLE_PRESETS = {
    'toolity': {
      label: 'Toolity',
      values: { theme: 'auto', bg: '', surface: '', fg: '', accent: 'F4511E', transparent: false, radius: 12 }
    },
    'notion-light': {
      label: 'Notion Light',
      values: { theme: 'light', bg: 'FFFFFF', surface: 'F7F6F3', fg: '37352F', accent: 'D9730D', transparent: false, radius: 8 }
    },
    'notion-dark': {
      label: 'Notion Dark',
      values: { theme: 'dark', bg: '191919', surface: '252525', fg: 'FFFFFF', accent: 'FFA344', transparent: false, radius: 8 }
    },
    'minimal': {
      label: 'Minimal Clear',
      values: { theme: 'auto', bg: '', surface: '', fg: '', accent: 'F4511E', transparent: true, radius: 8 }
    },
    'warm-cream': {
      label: 'Warm Editorial',
      values: { theme: 'light', bg: 'FFF8F1', surface: 'FFF1E2', fg: '1F1A17', accent: 'D84315', transparent: false, radius: 16 }
    }
  };

  /** Shared style schema appended to every widget definition */
  const SHARED_STYLE_SCHEMA = [
    { key: 'theme',       type: 'enum',   default: 'auto',   options: ['auto', 'light', 'dark'], id: 'opt-theme',       label: 'Theme mode' },
    { key: 'transparent', type: 'bool',   default: false,    id: 'opt-transparent', label: 'Transparent background' },
    { key: 'font',        type: 'enum',   default: 'sans',   options: ['sans', 'serif', 'mono', 'inter', 'dm-sans', 'space-grotesk', 'jetbrains-mono', 'playfair'], id: 'opt-font', label: 'Font family' },
    { key: 'size',        type: 'enum',   default: 'md',     options: ['sm', 'md', 'lg'], id: 'opt-size', label: 'Widget scale' },
    { key: 'align',       type: 'enum',   default: 'center', options: ['center', 'left'], id: 'opt-align', label: 'Alignment' },
    { key: 'radius',      type: 'number', default: 12,       min: 0, max: 28, id: 'opt-radius', label: 'Corner radius (px)' },
    { key: 'accent',      type: 'color',  default: 'F4511E', id: 'opt-accent',  label: 'Accent colour' },
    { key: 'bg',          type: 'color',  default: '',       id: 'opt-bg',      label: 'Background colour (optional override)' },
    { key: 'surface',     type: 'color',  default: '',       id: 'opt-surface', label: 'Tile surface colour (optional override)' },
    { key: 'fg',          type: 'color',  default: '',       id: 'opt-fg',      label: 'Text colour (optional override)' },
    { key: 'badge',       type: 'bool',   default: true,     id: 'opt-badge',   label: 'Show "Toolity" corner badge' }
  ];

  function fullSchema(def) {
    const ownKeys = new Set((def.schema || []).map((f) => f.key));
    return [...(def.schema || []), ...SHARED_STYLE_SCHEMA.filter((f) => !ownKeys.has(f.key))];
  }

  function cleanHex(v) {
    const s = String(v || '').trim().replace(/^#/, '').toUpperCase();
    if (/^[0-9A-F]{3}$/.test(s)) return s.split('').map((c) => c + c).join('');
    return HEX_RE.test(s) ? s : '';
  }

  function isValidTz(tz) {
    if (!tz || tz === 'local') return true;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Trust-boundary parser: takes schema + URL search string or URLSearchParams or plain object,
   * returns validated state with safe defaults for any missing or hostile input.
   */
  function parse(schema, input) {
    let params;
    if (typeof input === 'string') {
      const q = input.includes('?') ? input.slice(input.indexOf('?') + 1) : input.replace(/^\?/, '');
      params = new URLSearchParams(q);
    } else if (input instanceof URLSearchParams) {
      params = input;
    } else if (input && typeof input === 'object') {
      params = new URLSearchParams();
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== null) params.set(k, String(v));
      }
    } else {
      params = new URLSearchParams();
    }

    const out = {};
    for (const f of schema) {
      const raw = params.has(f.key) ? params.get(f.key) : null;
      if (raw === null || raw === '') {
        out[f.key] = f.default;
        continue;
      }
      if (f.type === 'bool') {
        out[f.key] = raw === '1' || raw === 'true' ? true : raw === '0' || raw === 'false' ? false : !!f.default;
      } else if (f.type === 'number') {
        const n = Number(raw);
        if (!Number.isFinite(n)) out[f.key] = f.default;
        else out[f.key] = Math.min(f.max ?? 9999, Math.max(f.min ?? -9999, Math.round(n)));
      } else if (f.type === 'decimal') {
        // Coordinates etc.: finite, clamped, rounded to f.decimals (default 2 ≈ 1 km for lat/lon)
        const n = Number(raw), k = 10 ** (f.decimals ?? 2);
        out[f.key] = Number.isFinite(n) ? Math.round(Math.min(f.max ?? 9999, Math.max(f.min ?? -9999, n)) * k) / k : f.default;
      } else if (f.type === 'enum') {
        out[f.key] = Array.isArray(f.options) && f.options.includes(raw) ? raw : f.default;
      } else if (f.type === 'color') {
        const h = cleanHex(raw);
        out[f.key] = h || f.default;
      } else if (f.type === 'tz') {
        out[f.key] = isValidTz(raw) ? raw : f.default;
      } else if (f.type === 'datetime') {
        // Accept YYYY-MM-DDTHH:mm or ISO strings that parse cleanly
        const s = String(raw).trim().slice(0, 25);
        const ok = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(s) && !Number.isNaN(Date.parse(s));
        out[f.key] = ok ? s.slice(0, 16) : f.default;
      } else {
        // Plain text: strip control chars, cap length (default 120 chars)
        const max = f.maxLength || 120;
        out[f.key] = String(raw).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
      }
    }
    return out;
  }

  /**
   * Serializes state to a compact query string containing ONLY non-default values.
   */
  function toQuery(schema, state) {
    const sp = new URLSearchParams();
    for (const f of schema) {
      const val = state[f.key];
      if (val === undefined || val === null) continue;
      if (f.type === 'bool') {
        const b = !!val;
        if (b !== !!f.default) sp.set(f.key, b ? '1' : '0');
      } else if (f.type === 'number') {
        const n = Number(val);
        if (Number.isFinite(n) && n !== f.default) sp.set(f.key, String(n));
      } else if (f.type === 'color') {
        const h = cleanHex(val);
        const defH = cleanHex(f.default);
        if (h && h !== defH) sp.set(f.key, h);
      } else {
        const s = String(val).trim();
        if (s !== String(f.default ?? '').trim()) sp.set(f.key, s);
      }
    }
    const qs = sp.toString();
    return qs ? `${qs}&v=1` : '';
  }

  /**
   * Wall-clock "YYYY-MM-DDTHH:mm" in an IANA zone (or 'local') → epoch ms. Shared by Countdown and Timer (days since).
   * Designed by Kapil Pidhwani: Intl offset probing, no Moment/Luxon. Ceiling: an ambiguous DST fold hour picks the first
   * offset; upgrade path: Temporal.ZonedDateTime once it is baseline.
   */
  function zonedMs(str, tz) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(str || '');
    if (!m) return NaN;
    const Y = +m[1], M = +m[2], D = +m[3], h = +(m[4] || 0), min = +(m[5] || 0);
    if (!tz || tz === 'local') return new Date(Y, M - 1, D, h, min, 0).getTime();
    try {
      const guess = Date.UTC(Y, M - 1, D, h, min, 0), parts = {};
      for (const p of new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(guess))) parts[p.type] = p.value;
      const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, (+parts.hour) % 24, +parts.minute, +parts.second);
      return guess - (asUtc - guess);
    } catch (e) {
      return new Date(Y, M - 1, D, h, min, 0).getTime();
    }
  }

  function buildEmbedUrl(slug, schema, state, origin) {
    const base = `${origin || SITE_ORIGIN}/widgets/${slug}/embed/`;
    const qs = toQuery(schema, state);
    return qs ? `${base}?${qs}` : base;
  }

  function buildBuilderUrl(slug, schema, state, origin) {
    const base = `${origin || SITE_ORIGIN}/widgets/${slug}/`;
    const qs = toQuery(schema, state);
    return qs ? `${base}?${qs}` : base;
  }

  /** WCAG 2.1 relative luminance & contrast ratio for 6-digit hex colours */
  function luminance(hex) {
    const h = cleanHex(hex);
    if (!h) return null;
    const rgb = [0, 2, 4].map((i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contrastRatio(hex1, hex2) {
    const l1 = luminance(hex1), l2 = luminance(hex2);
    if (l1 === null || l2 === null) return null;
    const bright = Math.max(l1, l2), dark = Math.min(l1, l2);
    return (bright + 0.05) / (dark + 0.05);
  }

  /** Ensure optional Google Font stylesheet is injected once when selected */
  function ensureFont(fontKey) {
    if (GOOGLE_FONTS[fontKey]) {
      const id = `gf-${fontKey}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = GOOGLE_FONTS[fontKey].href;
        document.head.appendChild(link);
      }
      return GOOGLE_FONTS[fontKey].family;
    }
    return SYSTEM_FONTS[fontKey] || SYSTEM_FONTS.sans;
  }

  /** Apply shared visual variables & attributes to the embed document */
  function applyEmbedStyle(slug, schema, state) {
    const root = document.documentElement;
    let autoDark = false;
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        const parentTheme = window.parent.document.documentElement.getAttribute('data-theme');
        if (parentTheme === 'dark' || parentTheme === 'light') {
          autoDark = parentTheme === 'dark';
        } else {
          autoDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
      } else {
        autoDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    } catch (e) {
      autoDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    const resolvedTheme = state.theme === 'auto' ? (autoDark ? 'dark' : 'light') : state.theme;
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-bg', state.transparent ? 'transparent' : 'solid');
    root.setAttribute('data-size', state.size || 'md');
    root.setAttribute('data-align', state.align || 'center');
    if (state.variant) root.setAttribute('data-variant', state.variant);
    else root.removeAttribute('data-variant');

    const fontStack = ensureFont(state.font || 'sans');
    root.style.setProperty('--font', fontStack);
    root.style.setProperty('--radius', `${Number.isFinite(state.radius) ? state.radius : 12}px`);

    const setOrClear = (prop, hex) => {
      const h = cleanHex(hex);
      if (h) root.style.setProperty(prop, `#${h}`);
      else root.style.removeProperty(prop);
    };
    setOrClear('--accent', state.accent);
    if (state.transparent) {
      root.style.setProperty('--bg', 'transparent');
    } else {
      setOrClear('--bg', state.bg);
    }
    setOrClear('--surface', state.surface);
    setOrClear('--fg', state.fg);
  }

  /** Plain in-flow credit (never overlaps the widget). badge=0 hides it. */
  function appendCredit(root, slug, schema, state) {
    if (!state.badge) return;
    const wrap = root.querySelector('.w-card-wrap') || root;
    const a = document.createElement('a');
    a.className = 'w-credit';
    a.href = buildBuilderUrl(slug, schema, state, location.origin);
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = 'Customise this widget on Toolity.in';
    a.textContent = 'toolity.in';
    wrap.appendChild(a);
  }

  /**
   * Mounts the chromeless embed page (/widgets/<slug>/embed/).
   */
  function mountEmbed(def) {
    const schema = fullSchema(def);
    const root = document.getElementById('widget-root');
    if (!root) return;

    let currentState = parse(schema, location.search);
    let cleanup = null;

    function renderNow(nextState) {
      currentState = nextState;
      applyEmbedStyle(def.slug, schema, currentState);
      if (typeof cleanup === 'function') {
        try { cleanup(); } catch (e) {}
        cleanup = null;
      }
      cleanup = def.render(root, currentState);
      appendCredit(root, def.slug, schema, currentState);
    }

    renderNow(currentState);

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentState.theme === 'auto') applyEmbedStyle(def.slug, schema, currentState);
      });
    }

    window.ToolityWidget = {
      slug: def.slug,
      schema,
      getState: () => ({ ...currentState }),
      update(rawOrObj) {
        renderNow(parse(schema, rawOrObj));
      }
    };
  }

  /**
   * Populate a <select> with curated + Intl IANA timezones
   */
  function populateTimezoneSelect(selectEl) {
    if (!selectEl) return;
    const localTz = (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || 'UTC';
    const common = [
      ['local', `Visitor's local time (${localTz})`],
      ['UTC', 'UTC (Coordinated Universal Time)'],
      ['Asia/Kolkata', 'Asia/Kolkata (IST)'],
      ['America/New_York', 'America/New_York (Eastern)'],
      ['America/Chicago', 'America/Chicago (Central)'],
      ['America/Denver', 'America/Denver (Mountain)'],
      ['America/Los_Angeles', 'America/Los_Angeles (Pacific)'],
      ['Europe/London', 'Europe/London (GMT/BST)'],
      ['Europe/Paris', 'Europe/Paris (CET)'],
      ['Europe/Berlin', 'Europe/Berlin (CET)'],
      ['Asia/Dubai', 'Asia/Dubai (GST)'],
      ['Asia/Singapore', 'Asia/Singapore (SGT)'],
      ['Asia/Tokyo', 'Asia/Tokyo (JST)'],
      ['Australia/Sydney', 'Australia/Sydney (AEST)'],
      ['Pacific/Auckland', 'Pacific/Auckland (NZST)']
    ];
    const seen = new Set(common.map((x) => x[0]));
    selectEl.innerHTML = '';
    for (const [val, label] of common) {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = label;
      selectEl.appendChild(o);
    }
    if (typeof Intl.supportedValuesOf === 'function') {
      try {
        for (const tz of Intl.supportedValuesOf('timeZone')) {
          if (seen.has(tz)) continue;
          const o = document.createElement('option');
          o.value = tz;
          o.textContent = tz;
          selectEl.appendChild(o);
        }
      } catch (e) {}
    }
  }

  /**
   * Mounts the full Toolity builder page (/widgets/<slug>/).
   */
  function mountBuilder(def) {
    const schema = fullSchema(def);
    const $ = (id) => document.getElementById(id);
    const { copyText, downloadBlob, bindSegmented, bindDropdown, bindShortcuts, toast } = window.Toolity || {};

    populateTimezoneSelect($('opt-tz'));

    let state = parse(schema, location.search);
    const frame = $('widget-preview-frame');
    const stage = $('widget-preview-stage');
    const urlOut = $('embed-url-output');
    const settingsSummary = $('settings-summary');
    const errBox = $('input-error');

    function showNotice(msg) {
      if (!errBox) return;
      errBox.hidden = !msg;
      const sp = errBox.querySelector('span');
      if (sp) sp.textContent = msg || '';
    }

    /** Push state values into DOM controls */
    function writeControlsFromState() {
      for (const f of schema) {
        if (!f.id) continue;
        const el = $(f.id);
        if (!el) continue;
        const val = state[f.key];
        if (el.classList && el.classList.contains('segmented-group')) {
          el.querySelectorAll('.seg-pill').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.value === String(val));
          });
        } else if (el.type === 'checkbox') {
          el.checked = !!val;
        } else if (f.type === 'color') {
          const hex = cleanHex(val);
          el.value = hex ? `#${hex}` : '';
          const picker = $(`${f.id}-picker`);
          if (picker && hex) picker.value = `#${hex}`;
        } else {
          el.value = val ?? '';
        }
        const rangeBadge = $(`${f.id}-val`);
        if (rangeBadge) rangeBadge.textContent = `${val}${f.unit || 'px'}`;
      }
    }

    /** Read DOM controls into state object */
    function readStateFromControls() {
      const raw = {};
      for (const f of schema) {
        if (!f.id) continue;
        const el = $(f.id);
        if (!el) continue;
        if (el.classList && el.classList.contains('segmented-group')) {
          const act = el.querySelector('.seg-pill.active');
          raw[f.key] = act ? act.dataset.value : f.default;
        } else if (el.type === 'checkbox') {
          raw[f.key] = el.checked ? '1' : '0';
        } else if (f.type === 'color') {
          raw[f.key] = cleanHex(el.value);
        } else {
          raw[f.key] = el.value;
        }
        const rangeBadge = $(`${f.id}-val`);
        if (rangeBadge) rangeBadge.textContent = `${el.value}${f.unit || 'px'}`;
      }
      state = parse(schema, raw);
    }

    function checkGuardrails() {
      const effBg = state.transparent
        ? (state.theme === 'dark' ? '191919' : 'FFFFFF')
        : (cleanHex(state.bg) || cleanHex(state.surface) || (state.theme === 'dark' ? '181818' : 'F7F7F5'));
      const effFg = cleanHex(state.fg) || (state.theme === 'dark' ? 'F5F5F2' : '17191C');
      const ratio = contrastRatio(effBg, effFg);
      if (ratio !== null && ratio < 4.5) {
        return `Low contrast (${ratio.toFixed(1)}:1) between text and background — aim for at least 4.5:1 for readability.`;
      }
      if (typeof def.validate === 'function') {
        const msg = def.validate(state);
        if (msg) return msg;
      }
      return '';
    }

    function iframeSnippet(embedUrl) {
      return `<iframe src="${embedUrl}" width="100%" height="${def.height || 180}" frameborder="0" loading="lazy" allowtransparency="true" title="Toolity ${def.title}"></iframe>`;
    }

    function syncOutputs(updateIframeSrc) {
      const embedUrl = buildEmbedUrl(def.slug, schema, state, SITE_ORIGIN);
      const localEmbedUrl = buildEmbedUrl(def.slug, schema, state, location.origin);
      const qs = toQuery(schema, state);

      if (urlOut) urlOut.value = embedUrl;

      if (settingsSummary) {
        const tLabel = state.theme === 'auto' ? 'Auto theme' : state.theme === 'dark' ? 'Dark' : 'Light';
        settingsSummary.textContent = `${tLabel} · #${cleanHex(state.accent) || 'F4511E'}`;
      }

      // Mirror state into builder URL without adding history spam
      const newBuilderPath = qs ? `${location.pathname}?${qs}` : location.pathname;
      if (`${location.pathname}${location.search}` !== newBuilderPath) {
        try { history.replaceState(null, '', newBuilderPath); } catch (e) {}
      }

      // Update live preview iframe immediately via same-origin hook, or fallback to src
      if (frame) {
        try {
          if (!updateIframeSrc && frame.contentWindow && frame.contentWindow.ToolityWidget) {
            frame.contentWindow.ToolityWidget.update(state);
          } else if (frame.getAttribute('src') !== localEmbedUrl) {
            frame.setAttribute('src', localEmbedUrl);
          }
        } catch (e) {
          frame.setAttribute('src', localEmbedUrl);
        }
      }

      showNotice(checkGuardrails());
    }

    // Bind all schema controls
    for (const f of schema) {
      if (!f.id) continue;
      const el = $(f.id);
      if (!el) continue;
      if (el.classList && el.classList.contains('segmented-group')) {
        if (bindSegmented) {
          bindSegmented(el, () => {
            readStateFromControls();
            syncOutputs(false);
          });
        }
      } else {
        const onInput = () => {
          if (f.type === 'color') {
            const hex = cleanHex(el.value);
            const picker = $(`${f.id}-picker`);
            if (picker && hex) picker.value = `#${hex}`;
          }
          readStateFromControls();
          syncOutputs(false);
        };
        el.addEventListener('input', onInput);
        el.addEventListener('change', onInput);

        const picker = $(`${f.id}-picker`);
        if (picker) {
          picker.addEventListener('input', () => {
            el.value = picker.value.toUpperCase();
            readStateFromControls();
            syncOutputs(false);
          });
        }
      }
    }

    // Style preset <select>: only touches style/colour keys, never user content (Rule 11)
    const presetSel = $('opt-preset');
    if (presetSel) {
      presetSel.addEventListener('change', () => {
        const p = STYLE_PRESETS[presetSel.value];
        if (!p) return;
        Object.assign(state, p.values);
        writeControlsFromState();
        syncOutputs(false);
      });
    }

    // Preview width toggle (Wide · Column · Mini) — shows how the embed sits in a Notion column
    if (bindSegmented && stage) {
      bindSegmented($('seg-preview-size'), (val) => stage.setAttribute('data-canvas-size', val));
    }

    // Paste-to-edit existing embed URL or <iframe> snippet
    const pasteInput = $('paste-embed-url');
    if (pasteInput) {
      pasteInput.addEventListener('input', () => {
        const raw = pasteInput.value.trim();
        if (!raw) return;
        const srcMatch = raw.match(/src=["']([^"']+)["']/i);
        const candidate = srcMatch ? srcMatch[1] : raw;
        const qIndex = candidate.indexOf('?');
        if (qIndex === -1 && !candidate.includes('=')) return;
        const qs = qIndex !== -1 ? candidate.slice(qIndex + 1) : candidate;
        state = parse(schema, qs);
        writeControlsFromState();
        syncOutputs(false);
        if (toast) toast('Loaded settings from widget URL');
      });
    }

    // Toolbar actions: Reset · Copy · Download(▾) · Open
    function copyEmbed() {
      const url = buildEmbedUrl(def.slug, schema, state, SITE_ORIGIN);
      if (copyText) copyText(url, 'Embed URL copied — paste with /embed in Notion');
    }

    function resetAll() {
      state = parse(schema, '');
      if (pasteInput) pasteInput.value = '';
      if (presetSel) presetSel.value = 'toolity';
      writeControlsFromState();
      syncOutputs(false);
      if (toast) toast('Reset to defaults');
    }

    const btnReset = $('btn-reset');
    if (btnReset) btnReset.addEventListener('click', resetAll);

    const btnCopy = $('btn-copy');
    if (btnCopy) btnCopy.addEventListener('click', copyEmbed);

    const btnOpen = $('btn-open');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        const url = buildEmbedUrl(def.slug, schema, state, location.origin);
        window.open(url, '_blank', 'noopener');
      });
    }

    const dlWrap = $('download-dropdown-wrap');
    if (dlWrap && bindDropdown) bindDropdown(dlWrap);

    const optDlHtml = $('opt-dl-html');
    if (optDlHtml) {
      optDlHtml.addEventListener('click', () => {
        const url = buildEmbedUrl(def.slug, schema, state, SITE_ORIGIN);
        const snippet = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>${def.title} Widget</title></head>\n<body style="margin:0">\n${iframeSnippet(url)}\n</body>\n</html>\n`;
        if (downloadBlob) downloadBlob(new Blob([snippet], { type: 'text/html' }), `toolity-${def.slug}-widget.html`);
      });
    }

    const optCopyIframe = $('opt-copy-iframe');
    if (optCopyIframe) {
      optCopyIframe.addEventListener('click', () => {
        const url = buildEmbedUrl(def.slug, schema, state, SITE_ORIGIN);
        if (copyText) copyText(iframeSnippet(url), '<iframe> HTML snippet copied');
      });
    }

    const optCopyMd = $('opt-copy-md');
    if (optCopyMd) {
      optCopyMd.addEventListener('click', () => {
        const url = buildEmbedUrl(def.slug, schema, state, SITE_ORIGIN);
        if (copyText) copyText(`[${def.title} Widget](${url})`, 'Markdown link copied');
      });
    }

    if (bindShortcuts) bindShortcuts({ primary: copyEmbed, reset: resetAll });

    // Sync initial controls and iframe load
    writeControlsFromState();
    syncOutputs(true);
    if (frame) {
      frame.addEventListener('load', () => {
        try {
          if (frame.contentWindow && frame.contentWindow.ToolityWidget) {
            frame.contentWindow.ToolityWidget.update(state);
          }
        } catch (e) {}
      });
    }

    if (typeof MutationObserver === 'function') {
      new MutationObserver(() => {
        if (state.theme === 'auto') syncOutputs(false);
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    return {
      schema,
      getState: () => ({ ...state }),
      setState(next) {
        state = parse(schema, next);
        writeControlsFromState();
        syncOutputs(false);
      },
      reset: resetAll,
      copyEmbed
    };
  }

  /** Auto-boot either Embed or Builder once a widget definition calls register(def) */
  function register(def) {
    const boot = () => {
      if (document.getElementById('widget-root')) {
        mountEmbed(def);
      } else if (document.getElementById('tool-card')) {
        mountBuilder(def);
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }

  window.ToolityWidgets = {
    SITE_ORIGIN,
    STYLE_PRESETS,
    SHARED_STYLE_SCHEMA,
    fullSchema,
    cleanHex,
    parse,
    toQuery,
    buildEmbedUrl,
    buildBuilderUrl,
    contrastRatio,
    zonedMs,
    populateTimezoneSelect,
    mountEmbed,
    mountBuilder,
    register
  };
})();

#!/usr/bin/env node
/* Designed by Kapil Pidhwani: widget pages from config (rule 47) → /widgets/<slug>/index.html (builder) + /widgets/<slug>/embed/index.html.
 * Mirrors the hand-built Flip Clock / Countdown builder shell exactly: toolbar Reset · Copy · Download(▾) · Open, settings LEFT,
 * live preview + embed URL RIGHT, "Colours & typography" accordion closed by default. Only the left-pane controls,
 * copy, guide and FAQ come from the config. Existing Flip Clock / Countdown pages are not regenerated.
 * Usage: node gen_widget_pages.js [slug]   — idempotent. */
const fs = require('fs');
const path = require('path');
const only = process.argv[2];
const MAIN_V = '4.6', CSS_V = '6.1', WC_V = '1.2', EMBED_CSS_V = '5.9';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonStr = (s) => JSON.stringify(String(s).replace(/<[^>]+>/g, ''));

/* ── control helpers ── */
const group = (label, inner, desc = '', forId = '') => `
                <div class="form-group">
                  ${forId ? `<label class="form-label" for="${forId}">` : '<span class="form-label">'}<span>${label}</span>${desc ? `<span class="form-label-desc">${desc}</span>` : ''}${forId ? '</label>' : '</span>'}${inner}
                </div>`;
const text = (id, label, ph, max = 60, desc = 'Optional') => group(label, `
                  <input type="text" id="${id}" class="input-clean" placeholder="${esc(ph)}" maxlength="${max}" autocomplete="off">`, desc, id);
const num = (id, label, min, max, step, ph) => group(label, `
                  <input type="number" id="${id}" class="input-clean" min="${min}" max="${max}" step="${step}" placeholder="${ph}" inputmode="decimal">`, '', id);
const seg = (id, label, opts) => group(label, `
                  <div class="segmented-group segmented-group-pill" id="${id}" role="group" aria-label="${label}">${opts.map(([v, t], i) => `
                    <button type="button" class="seg-pill${i === 0 ? ' active' : ''}" data-value="${v}">${t}</button>`).join('')}
                  </div>`);
const row2 = (a, b) => `
                <div class="form-row-2col">${a}${b}
                </div>`;
const checks = (items) => group('Show', `
                  <div class="widget-checks-grid">${items.map(([id, label, on]) => `
                    <div class="control-item"><input type="checkbox" id="${id}"${on ? ' checked' : ''}><label for="${id}">${label}</label></div>`).join('')}
                  </div>`);
const tz = (label = 'Time zone') => group(label, `
                  <select id="opt-tz" class="select-clean"><option value="local" selected>Visitor's local time</option></select>`, '', 'opt-tz');
const THEME_PRESET = row2(group('Theme', `
                  <select id="opt-theme" class="select-clean">
                    <option value="auto" selected>Auto (follows the page)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>`, '', 'opt-theme'), group('Style preset', `
                  <select id="opt-preset" class="select-clean">
                    <option value="toolity" selected>Toolity</option>
                    <option value="notion-light">Notion Light</option>
                    <option value="notion-dark">Notion Dark</option>
                    <option value="minimal">Minimal (transparent)</option>
                    <option value="warm-cream">Warm editorial</option>
                  </select>`, '', 'opt-preset'));
const EMBED_FAQ = [
  ['How do I embed this widget in Notion?', 'Click Copy in the toolbar to copy the embed URL, open your Notion page, type <code>/embed</code>, paste the link and press Enter. Drag the block handles to fit your column.'],
  ['Where are my settings saved?', 'Every setting is encoded in the embed URL itself. No account or database is needed, and the link keeps working on any device.'],
  ['Does the embedded widget track visitors?', 'No. The <code>/embed/</code> page loads no analytics or third-party scripts and runs entirely in the visitor\'s browser.']
];

const WIDGETS = [
  {
    slug: 'sunrise-sunset', name: 'Sunrise & Sunset Widget', short: 'Sunrise & Sunset', pane: 'Sun', icon: 'lucide:sunrise', css: true,
    desc: 'Free embeddable Sunrise & Sunset widget for Notion and websites. Shows today\'s sunrise, sunset, day length and a live sun arc for any city — calculated in the browser, no account.',
    lead: 'Show today\'s sunrise, sunset and day length for any place, with a live sun arc — one URL for Notion or any website.',
    cardDesc: 'Today\'s sunrise, sunset and day length for any city, with a live sun arc — works in Notion.',
    tags: ['sunrise', 'sunset', 'sun', 'day length', 'golden hour', 'twilight', 'widget', 'notion', 'embed', 'notion widget', 'daylight', 'weather'],
    left: text('opt-title', 'Header label', 'Golden hour at home') + group('Location', `
                  <div class="widget-loc-row">
                    <select id="city-pick" class="select-clean" aria-label="Pick a city"><option value="">Pick a city…</option></select>
                    <button type="button" class="btn-toolbar-sm" id="btn-geo"><iconify-icon icon="lucide:locate-fixed" width="14" height="14"></iconify-icon><span>Use my location</span></button>
                  </div>
                  <p class="form-helper" id="geo-note" aria-live="polite"></p>`, 'Saved in the link · about 1 km precision')
      + row2(num('opt-lat', 'Latitude', -90, 90, 0.01, '19.08'), num('opt-lon', 'Longitude', -180, 180, 0.01, '72.88'))
      + text('opt-place', 'Place name', 'Mumbai', 40, 'Shown as the header if no label') + tz('Time zone for the times')
      + row2(seg('seg-format', 'Time format', [['12', '12-hour'], ['24', '24-hour']]), seg('seg-variant', 'Display style', [['arc', 'Arc'], ['minimal', 'Minimal'], ['compact', 'Compact']]))
      + checks([['opt-daylen', 'Day length', 1], ['opt-next', 'Next sunrise / sunset', 1], ['opt-golden', 'Golden hour', 0], ['opt-twilight', 'Twilight', 0], ['opt-badge', 'Toolity link', 1], ['opt-transparent', 'Transparent', 0]]) + THEME_PRESET,
    guide: [['Choose the place', 'Pick one of 130 cities, tap <strong>Use my location</strong>, or type coordinates. Set the time zone the times should show in.'], ['Style it', 'Pick Arc, Minimal or Compact, switch golden hour and twilight on if you want them, and match your page with a preset or theme.'], ['Copy and embed', 'Click Copy, type <code>/embed</code> in Notion and paste. The widget updates by itself every day.']],
    faq: [EMBED_FAQ[0], ['How accurate are the times?', 'They are calculated with the standard NOAA solar model and are usually within a minute for most places. Close to the poles, or when the sun only just skims the horizon, they can be a few minutes off.'], ['Does it ask visitors for their location?', 'No. You choose the location once in the builder; it is saved in the link, rounded to about 1 km. "Use my location" runs only on your device and nothing is sent to a server.'], ['What happens near the poles?', 'When the sun never sets or never rises that day, the widget says "Sun up all day" or "No sunrise today" instead of showing times.'], EMBED_FAQ[1], EMBED_FAQ[2]]
  },
  {
    slug: 'timer', name: 'Timer Widget', short: 'Timer', pane: 'Timer', icon: 'lucide:timer',
    desc: 'Free embeddable Timer widget for Notion and websites: a Pomodoro focus timer, a stopwatch with laps, or a "days since" counter. Keeps running after a refresh — no account, all in the URL.',
    lead: 'A Pomodoro focus timer, a stopwatch with laps or a "days since" counter — one embeddable widget that keeps running after a refresh.',
    cardDesc: 'Pomodoro focus timer, stopwatch with laps or a days-since counter — embeddable in Notion.',
    tags: ['timer', 'pomodoro', 'stopwatch', 'days since', 'focus timer', 'count up', 'widget', 'notion', 'embed', 'notion timer', 'study timer', 'lap timer'],
    left: text('opt-title', 'Header label', 'Deep work · Thesis') + seg('seg-mode', 'Mode', [['pomodoro', 'Pomodoro'], ['stopwatch', 'Stopwatch'], ['since', 'Days since']]) + `
                <div data-mode-only="pomodoro">${row2(num('opt-focus', 'Focus (min)', 1, 120, 1, '25'), num('opt-break', 'Short break (min)', 1, 60, 1, '5'))}${row2(num('opt-long', 'Long break (min)', 1, 60, 1, '15'), num('opt-rounds', 'Rounds before long break', 2, 8, 1, '4'))}
                  <div class="control-item"><input type="checkbox" id="opt-chime" checked><label for="opt-chime">Chime when a phase ends</label></div>
                </div>
                <div data-mode-only="since" hidden>${group('Count up from', `
                  <input type="datetime-local" id="opt-since" class="input-clean">`, 'Launch, quit date, anniversary…', 'opt-since')}${tz()}${seg('seg-units', 'Show', [['days', 'Days only'], ['full', 'Days + time']])}
                </div>` + seg('seg-variant', 'Display style', [['flip', 'Flip'], ['minimal', 'Minimal'], ['compact', 'Compact']])
      + checks([['opt-badge', 'Toolity link', 1], ['opt-transparent', 'Transparent', 0]]) + THEME_PRESET,
    guide: [['Pick a mode', '<strong>Pomodoro</strong> for focus sessions, <strong>Stopwatch</strong> for timing with laps, or <strong>Days since</strong> to count up from a date.'], ['Set it up', 'Choose focus and break lengths (or the start date), then a display style and a preset that matches your page.'], ['Copy and embed', 'Click Copy, type <code>/embed</code> in Notion and paste. Start, pause and reset right inside the embedded widget.']],
    faq: [EMBED_FAQ[0], ['Does the timer keep running if I close the page?', 'Yes. Only the start time is saved in your own browser (local storage), so when you reopen the page the stopwatch or Pomodoro carries on with the right time. Nothing is sent anywhere.'], ['How does the Pomodoro work?', 'Focus for the set length, then take a short break; after the chosen number of rounds you get a long break. The timer pauses at each switch and can play a chime, so it never runs on through a break you missed.'], ['Why is there no sound?', 'Browsers only allow sound after you interact with the page, so the chime works once you have pressed Start. Check that Chime is on and the tab is not muted.'], ['Can it count down to a date?', 'Use the Countdown Timer widget for that. "Days since" here counts up from a past date, like days since launch or since you quit smoking.'], EMBED_FAQ[2]]
  }
];

function builder(w) {
  const url = `https://toolity.in/widgets/${w.slug}/`, title = `Free Online ${w.name} | Toolity Widgets`;
  const faqLd = w.faq.map(([q, a]) => `          { "@type": "Question", "name": ${jsonStr(q)}, "acceptedAnswer": { "@type": "Answer", "text": ${jsonStr(a)} } }`).join(',\n');
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-W5SC3TGR');</script>
  <!-- End Google Tag Manager -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Theme Preload Initialization (Zero Flash) -->
  <script>
    (function(){
      var t = localStorage.getItem('toolity_theme') || (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', t);
    })();
  </script>

  <title>${title}</title>
  <link rel="canonical" href="${url}">
  <meta name="description" content="${esc(w.desc)}">
  <meta name="author" content="Kapil Pidhwani">

  <!-- Open Graph / Twitter -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Toolity.in">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${esc(w.desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="https://toolity.in/assets/og-image.svg">
  <meta name="twitter:card" content="summary_large_image">

  <!-- Favicons -->
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicons/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicons/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicons/apple-touch-icon.png">
  <link rel="shortcut icon" href="/assets/favicons/favicon.ico">

  <!-- Fonts & critical assets -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="preload" href="/styles/main.css?v=${CSS_V}" as="style">
  <link rel="preload" href="/assets/Toolity.in%20Logo.webp" as="image" type="image/webp">
  <script defer src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>

  <link rel="stylesheet" href="/styles/main.css?v=${CSS_V}">
${w.css ? `  <link rel="stylesheet" href="/styles/tools/${w.slug}.css?v=1.0">\n` : ''}
  <!-- Structured data: WebApplication + BreadcrumbList + FAQPage -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": ${jsonStr(w.name)},
        "url": "${url}",
        "description": ${jsonStr(w.desc)},
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Any",
        "browserRequirements": "Requires JavaScript",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "author": { "@type": "Person", "name": "Kapil Pidhwani" }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://toolity.in/" },
          { "@type": "ListItem", "position": 2, "name": "Widgets", "item": "https://toolity.in/widgets/" },
          { "@type": "ListItem", "position": 3, "name": ${jsonStr(w.name)}, "item": "${url}" }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
${faqLd}
        ]
      }
    ]
  }
  </script>
</head>

<body>
  <div data-include="/components/header.html"></div>

  <main>
    <!-- ═══════════ 1. HERO ═══════════ -->
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="/" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">/</span>
          <a href="/widgets/" class="breadcrumb-link">Widgets</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">${w.name}</span>
        </nav>
        <div class="page-title-row">
          <div class="page-header-content">
            <span class="section-eyebrow">Widgets</span>
            <h1 class="page-title">${w.name}</h1>
            <p class="page-desc">${esc(w.lead)}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════ 2. WORKSPACE ═══════════ -->
    <section class="section-wrapper tool-section">
      <div class="container">

        <div class="tool-workspace-card" data-layout="split" data-split="40/60" id="tool-card">

          <!-- 2a. Toolbar — Reset · Copy · Download(▾) · Open -->
          <div class="tool-actions-toolbar">
            <div class="toolbar-group">
              <button type="button" class="btn-toolbar-sm" id="btn-reset" title="Reset all inputs and settings" aria-label="Reset all inputs and settings">
                <iconify-icon icon="lucide:rotate-ccw" width="14" height="14"></iconify-icon>
                <span>Reset</span>
              </button>
              <button type="button" class="btn-toolbar-sm btn-brand-sm" id="btn-copy" title="Copy embed URL for Notion" aria-label="Copy embed URL for Notion">
                <iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon>
                <span>Copy</span>
              </button>
              <div class="dropdown-menu-wrapper" id="download-dropdown-wrap">
                <button type="button" class="btn-toolbar-sm" id="btn-download-menu-toggle" aria-haspopup="true" aria-expanded="false" title="Download or copy embed code" aria-label="Download or copy embed code">
                  <iconify-icon icon="lucide:download" width="14" height="14"></iconify-icon>
                  <span>Download</span>
                  <iconify-icon icon="lucide:chevron-down" class="dropdown-arrow" width="13" height="13"></iconify-icon>
                </button>
                <div class="dropdown-popup" id="download-dropdown-menu" role="menu">
                  <button type="button" class="dropdown-item" id="opt-copy-iframe" role="menuitem">
                    <div class="dropdown-item-left"><iconify-icon icon="lucide:code" width="14" height="14"></iconify-icon><span>Copy &lt;iframe&gt; HTML</span></div>
                    <span class="dropdown-item-badge">HTML</span>
                  </button>
                  <button type="button" class="dropdown-item" id="opt-dl-html" role="menuitem">
                    <div class="dropdown-item-left"><iconify-icon icon="lucide:file-code" width="14" height="14"></iconify-icon><span>Download .html file</span></div>
                    <span class="dropdown-item-badge">.html</span>
                  </button>
                  <button type="button" class="dropdown-item" id="opt-copy-md" role="menuitem">
                    <div class="dropdown-item-left"><iconify-icon icon="lucide:file-text" width="14" height="14"></iconify-icon><span>Copy Markdown link</span></div>
                    <span class="dropdown-item-badge">.md</span>
                  </button>
                </div>
              </div>
              <button type="button" class="btn-toolbar-sm" id="btn-open" title="Open live widget in a new tab" aria-label="Open live widget in a new tab">
                <iconify-icon icon="lucide:external-link" width="14" height="14"></iconify-icon>
                <span>Open</span>
              </button>
            </div>
          </div>

          <!-- 2b. Panes — settings LEFT, live preview + embed URL RIGHT -->
          <div class="split-pane-grid">

            <div class="tool-pane">
              <div class="pane-header">
                <span>${w.pane}</span>
              </div>
              <div class="pane-error" id="input-error" role="alert" hidden>
                <iconify-icon icon="lucide:alert-circle" width="14" height="14"></iconify-icon>
                <span></span>
              </div>
              <div class="pane-content pane-content-tall">${w.left}
              </div>
            </div>

            <div class="tool-pane">
              <div class="pane-header">
                <span>Live preview</span>
                <div class="segmented-group segmented-group-pill" id="seg-preview-size" role="group" aria-label="Preview width">
                  <button type="button" class="seg-pill active" data-value="full">Wide</button>
                  <button type="button" class="seg-pill" data-value="half">Column</button>
                  <button type="button" class="seg-pill" data-value="compact">Mini</button>
                </div>
              </div>
              <div class="pane-content widget-preview-out">
                <div class="widget-preview-stage" id="widget-preview-stage" data-canvas-size="full">
                  <iframe id="widget-preview-frame" class="widget-preview-frame" src="/widgets/${w.slug}/embed/" title="${esc(w.short)} live preview"></iframe>
                </div>
                <div class="form-group">
                  <label class="form-label" for="embed-url-output"><span>Embed URL</span><span class="form-label-desc">Type <code>/embed</code> in Notion and paste</span></label>
                  <input type="text" id="embed-url-output" class="input-clean widget-url-input" readonly value="https://toolity.in/widgets/${w.slug}/embed/">
                </div>
              </div>
            </div>

          </div>

          <!-- 2c. Secondary settings — closed by default (Rule 19) -->
          <details class="tool-settings-accordion">
            <summary class="tool-settings-summary">
              <div class="tool-settings-summary-left">
                <iconify-icon icon="lucide:sliders-horizontal" width="15" height="15"></iconify-icon>
                <span>Colours &amp; typography</span>
                <span class="pane-badge" id="settings-summary">Auto theme · #F4511E</span>
              </div>
              <iconify-icon class="tool-settings-chevron" icon="lucide:chevron-down" width="16" height="16"></iconify-icon>
            </summary>
            <div class="tool-settings-panel">
              <div class="control-item">
                <label for="opt-font">Font</label>
                <select id="opt-font" class="select-clean">
                  <option value="sans" selected>System sans-serif</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Monospace</option>
                  <option value="inter">Inter</option>
                  <option value="dm-sans">DM Sans</option>
                  <option value="space-grotesk">Space Grotesk</option>
                  <option value="jetbrains-mono">JetBrains Mono</option>
                  <option value="playfair">Playfair Display</option>
                </select>
              </div>
              <div class="control-item">
                <label for="opt-size">Size</label>
                <select id="opt-size" class="select-clean">
                  <option value="sm">Small</option>
                  <option value="md" selected>Medium</option>
                  <option value="lg">Large</option>
                </select>
              </div>
              <div class="control-item">
                <label for="opt-align">Alignment</label>
                <select id="opt-align" class="select-clean">
                  <option value="center" selected>Centred</option>
                  <option value="left">Left</option>
                </select>
              </div>
              <div class="control-item">
                <label for="opt-radius">Corner radius (<span id="opt-radius-val">12px</span>)</label>
                <input type="range" id="opt-radius" class="range-slider-clean" min="0" max="28" step="2" value="12">
              </div>
              <div class="control-item">
                <label for="opt-accent">Accent</label>
                <div class="widget-color-field">
                  <input type="color" id="opt-accent-picker" class="widget-color-picker" value="#F4511E" aria-label="Pick accent colour">
                  <input type="text" id="opt-accent" class="input-clean" value="#F4511E" placeholder="#F4511E" maxlength="7">
                </div>
              </div>
              <div class="control-item">
                <label for="opt-bg">Background</label>
                <div class="widget-color-field">
                  <input type="color" id="opt-bg-picker" class="widget-color-picker" value="#FFFFFF" aria-label="Pick background colour">
                  <input type="text" id="opt-bg" class="input-clean" placeholder="Theme default" maxlength="7">
                </div>
              </div>
              <div class="control-item">
                <label for="opt-surface">Tile</label>
                <div class="widget-color-field">
                  <input type="color" id="opt-surface-picker" class="widget-color-picker" value="#F7F7F5" aria-label="Pick tile colour">
                  <input type="text" id="opt-surface" class="input-clean" placeholder="Theme default" maxlength="7">
                </div>
              </div>
              <div class="control-item">
                <label for="opt-fg">Text</label>
                <div class="widget-color-field">
                  <input type="color" id="opt-fg-picker" class="widget-color-picker" value="#17191C" aria-label="Pick text colour">
                  <input type="text" id="opt-fg" class="input-clean" placeholder="Theme default" maxlength="7">
                </div>
              </div>
              <div class="control-item">
                <label for="paste-embed-url">Edit an existing widget</label>
                <input type="url" id="paste-embed-url" class="input-clean" placeholder="Paste its embed URL to load the settings" autocomplete="off" spellcheck="false">
              </div>
            </div>
          </details>

        </div>


        <!-- ═══════════ 3. GUIDE (exactly 3 steps) ═══════════ -->
        <section class="guide-section">
          <div class="section-header-compact">
            <span class="section-eyebrow">How It Works</span>
            <h2 class="section-heading-sm">How to Embed a ${w.short} Widget in 3 Steps</h2>
          </div>
          <div class="guide-steps-grid">
${w.guide.map(([h, d], i) => `            <div class="guide-step-card">
              <div class="step-num-badge">${i + 1}</div>
              <h3 class="step-title">${h}</h3>
              <p class="step-desc">${d}</p>
            </div>`).join('\n')}
          </div>
        </section>

        <!-- ═══════════ 5. FAQ (mirrored in JSON-LD) ═══════════ -->
        <section class="faq-section">
          <div class="section-header-compact">
            <span class="section-eyebrow">FAQ</span>
            <h2 class="section-heading-sm">${w.name} — Frequently Asked Questions</h2>
          </div>
          <div class="faq-list">
${w.faq.map(([q, a]) => `            <details class="faq-item">
              <summary>${q}</summary>
              <p>${a}</p>
            </details>`).join('\n')}
          </div>
        </section>

        <!-- ═══════════ 6. CATEGORY CTA ═══════════ -->
        <div data-include="/components/tool-cta.html" data-category="widgets"></div>

      </div>
    </section>
  </main>

  <div data-include="/components/footer.html"></div>

  <script src="/scripts/main.js?v=${MAIN_V}"></script>
  <script src="/scripts/tool-common.js?v=1.1"></script>
  <script src="/scripts/widget-common.js?v=${WC_V}"></script>
  <script src="/scripts/widgets/${w.slug}.js?v=1.0"></script>
</body>

</html>
`;
}

const embed = (w) => `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <link rel="canonical" href="https://toolity.in/widgets/${w.slug}/">
  <title>${w.name} | Toolity</title>
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicons/favicon-32x32.png">
  <link rel="stylesheet" href="/styles/widget-embed.css?v=${EMBED_CSS_V}">
</head>

<body>
  <main class="w-stage" id="widget-root" role="region" aria-label="${esc(w.short)}"></main>
  <script src="/scripts/widget-common.js?v=${WC_V}"></script>
  <script src="/scripts/widgets/${w.slug}.js?v=1.0"></script>
</body>

</html>
`;

if (require.main === module) {
  for (const w of WIDGETS) {
    if (only && w.slug !== only) continue;
    const dir = path.join(__dirname, 'widgets', w.slug);
    fs.mkdirSync(path.join(dir, 'embed'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), builder(w));
    fs.writeFileSync(path.join(dir, 'embed', 'index.html'), embed(w));
    console.log(`wrote widgets/${w.slug}/ (+ embed/)`);
  }
}
module.exports = WIDGETS.map(({ slug, name, icon, desc, cardDesc, tags }) => ({ slug, name, icon, desc, cardDesc, tags }));

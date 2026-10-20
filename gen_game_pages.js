#!/usr/bin/env node
/* Designed by Kapil Pidhwani: cfg_game_tools.js → /games/<slug>/index.html, mirroring the hand-built Sudoku shell (rule 47).
 * Toolbar: seg-mode · Reset · Undo · New game; one game pane with #stage, #overlay, #hint; Game options accordion; guide,
 * reference table, FAQ, category CTA. Existing games (built before this generator) are not regenerated.
 * Usage: node gen_game_pages.js [slug]   — idempotent. */
const fs = require('fs'), path = require('path');
const GAMES = require('./cfg_game_tools.js');
const only = process.argv[2];
const MAIN_V = '5.2', CSS_V = '6.5';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonStr = (s) => JSON.stringify(String(s).replace(/<[^>]+>/g, ''));

function page(g) {
  const url = `https://toolity.in/games/${g.slug}/`, title = `Free Online ${g.name} | Toolity Games`;
  const faqLd = g.faq.map(([q, a]) => `          { "@type": "Question", "name": ${jsonStr(q)}, "acceptedAnswer": { "@type": "Answer", "text": ${jsonStr(a)} } }`).join(',\n');
  const faqHtml = g.faq.map(([q, a]) => `            <details class="faq-item">\n              <summary>${q}</summary>\n              <p>${a}</p>\n            </details>`).join('\n');
  const guide = g.guide.map(([h, d], i) => `            <div class="guide-step-card">\n              <div class="step-num-badge">${i + 1}</div>\n              <h3 class="step-title">${h}</h3>\n              <p class="step-desc">${d}</p>\n            </div>`).join('\n');
  const ref = g.reference.map((r) => `                <tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n');
  const modes = g.modes ? `
            <div class="toolbar-group">
              <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="${esc(g.modesLabel || 'Mode')}">${g.modes.map(([v, l], i) => `
                <button type="button" class="seg-pill${i === (g.defaultModeIndex || 0) ? ' active' : ''}" data-value="${v}">${l}</button>`).join('')}
              </div>
            </div>` : '';
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
  <meta name="description" content="${esc(g.desc)}">
  <meta name="author" content="Kapil Pidhwani">

  <!-- Open Graph / Twitter -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Toolity.in">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${esc(g.desc)}">
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
${g.css ? `  <link rel="stylesheet" href="/styles/tools/${g.slug}.css?v=1.0">\n` : ''}
  <!-- Structured data: WebApplication + BreadcrumbList + FAQPage -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": ${jsonStr(g.name)},
        "url": "${url}",
        "description": ${jsonStr(g.desc)},
        "applicationCategory": "GameApplication",
        "operatingSystem": "Any",
        "browserRequirements": "Requires JavaScript",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "author": { "@type": "Person", "name": "Kapil Pidhwani" }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://toolity.in/" },
          { "@type": "ListItem", "position": 2, "name": "Games", "item": "https://toolity.in/games/" },
          { "@type": "ListItem", "position": 3, "name": ${jsonStr(g.name)}, "item": "${url}" }
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

  <main id="main">
    <!-- ═══════════ 1. HERO ═══════════ -->
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="/" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">/</span>
          <a href="/games/" class="breadcrumb-link">Games</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">${esc(g.name)}</span>
        </nav>
        <div class="page-title-row">
          <div class="page-header-content">
            <span class="section-eyebrow">Games</span>
            <h1 class="page-title">${esc(g.name)}</h1>
            <p class="page-desc">${g.lead}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════ 2. WORKSPACE ═══════════ -->
    <section class="section-wrapper tool-section">
      <div class="container">

        <div class="tool-workspace-card" data-layout="stacked" id="tool-card">

          <!-- 2a. Toolbar -->
          <div class="tool-actions-toolbar">${modes}
            <div class="toolbar-group">
              <button type="button" class="btn-toolbar-sm" id="btn-reset" title="Reset all inputs and settings" aria-label="Reset all inputs and settings">
                <iconify-icon icon="lucide:rotate-ccw" width="14" height="14"></iconify-icon>
                <span>Reset</span>
              </button>
              <button type="button" class="btn-toolbar-sm" id="btn-undo" title="Undo last move" aria-label="Undo last move" disabled>
                <iconify-icon icon="lucide:undo-2" width="14" height="14"></iconify-icon>
                <span>Undo</span>
              </button>${g.copy ? `
              <button type="button" class="btn-toolbar-sm" id="btn-copy" title="${esc(g.copy)}" aria-label="${esc(g.copy)}" disabled>
                <iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon>
                <span>Copy</span>
              </button>` : ''}
              <button type="button" class="btn-toolbar-sm btn-brand-sm" id="btn-play" aria-label="${esc(g.playLabel || 'New game')}">
                <iconify-icon icon="lucide:play" width="14" height="14" id="play-icon"></iconify-icon>
                <span id="play-label">${esc(g.playLabel || 'New game')}</span>
              </button>
            </div>
          </div>

          <!-- 2b. Game pane -->
          <div class="split-pane-grid">
            <div class="tool-pane">
              <div class="pane-header">
                <span>${esc(g.paneLabel || 'Progress')}</span>
                <span class="game-score" id="score" aria-live="polite">${g.scoreHtml}</span>
                <span id="status-badge" class="pane-badge">${esc(g.idle || 'Ready')}</span>
              </div>
              <div class="pane-content game-pane-wrap">
                <div class="game-stage${g.wide ? ' game-stage-wide' : ''}" id="stage">${g.stageHtml}
                  <div class="game-overlay" id="overlay" hidden>
                    <strong id="overlay-title">Game over</strong>
                    <span id="overlay-text">Press Space or New game to play again</span>
                    <button type="button" class="btn-toolbar-sm" id="overlay-btn" hidden></button>
                  </div>
                </div>
                <p class="form-helper game-hint" id="hint">${g.hint}</p>
              </div>
            </div>
          </div>

          <!-- 2c. Settings -->
          <details class="tool-settings-accordion">
            <summary class="tool-settings-summary">
              <div class="tool-settings-summary-left">
                <iconify-icon icon="lucide:sliders-horizontal" width="15" height="15"></iconify-icon>
                <span>Game options</span>
                <span class="pane-badge" id="settings-summary">${esc(g.settingsSummary || '')}</span>
              </div>
              <iconify-icon class="tool-settings-chevron" icon="lucide:chevron-down" width="16" height="16"></iconify-icon>
            </summary>
            <div class="tool-settings-panel">${g.settings}
            </div>
          </details>

        </div>

        <!-- ═══════════ 3. GUIDE ═══════════ -->
        <section class="guide-section">
          <div class="section-header-compact">
            <span class="section-eyebrow">How It Works</span>
            <h2 class="section-heading-sm">How to Play ${esc(g.name)} in 3 Steps</h2>
          </div>
          <div class="guide-steps-grid">
${guide}
          </div>
        </section>

        <!-- ═══════════ 4. REFERENCE ═══════════ -->
        <section class="reference-section">
          <div class="section-header-compact">
            <span class="section-eyebrow">Reference</span>
            <h2 class="section-heading-sm">Controls &amp; rules</h2>
          </div>
          <div class="formats-table-card">
            <table class="formats-table">
              <thead><tr><th>Action</th><th>Keyboard</th><th>Mouse / Touch</th></tr></thead>
              <tbody>
${ref}
              </tbody>
            </table>
          </div>
        </section>

        <!-- ═══════════ 5. FAQ ═══════════ -->
        <section class="faq-section">
          <div class="section-header-compact">
            <span class="section-eyebrow">FAQ</span>
            <h2 class="section-heading-sm">${esc(g.name)} — Frequently Asked Questions</h2>
          </div>
          <div class="faq-list">
${faqHtml}
          </div>
        </section>

        <!-- ═══════════ 6. CATEGORY CTA ═══════════ -->
        <div data-include="/components/tool-cta.html" data-category="games"></div>

      </div>
    </section>
  </main>

  <div data-include="/components/footer.html"></div>

  <script src="/scripts/main.js?v=${MAIN_V}"></script>
  <script src="/scripts/tool-common.js?v=1.2"></script>
  <script src="/scripts/game-common.js?v=1.0"></script>
  <script src="/games/${g.slug}/${g.slug}.js?v=1.0"></script>
</body>
</html>
`;
}
if (require.main === module) {
  for (const g of GAMES) {
    if (only && g.slug !== only) continue;
    const dir = path.join(__dirname, 'games', g.slug); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), page(g)); console.log('wrote', `games/${g.slug}/index.html`);
  }
}
module.exports = GAMES;

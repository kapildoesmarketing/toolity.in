#!/usr/bin/env node
/* Designed by Kapil Pidhwani: cfg_web_tools.js → /labs/<slug>/index.html, mirroring templates/tool-page.html (rule 47).
 * Form-input variant of gen_pdf_pages.js: no dropzone, optional primary button (#btn-run), optional Download dropdown.
 * Usage: node gen_web_pages.js [slug]   — idempotent; re-run after editing the config. */
const fs = require('fs');
const path = require('path');
const TOOLS = require('./cfg_web_tools.js');
const only = process.argv[2];
const CAT = 'labs', CAT_LABEL = 'Labs';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonStr = (s) => JSON.stringify(String(s).replace(/<[^>]+>/g, ''));
const MAIN_V = '3.8', CSS_V = '4.8';
const LIBS = { color: '  <script src="/scripts/color-common.js?v=1.0"></script>\n' };

function downloadBtn(t) {
  if (!t.downloads) return `
              <button type="button" class="btn-toolbar-sm btn-brand-sm" id="btn-download" title="Download result" aria-label="Download result" disabled>
                <iconify-icon icon="lucide:download" width="14" height="14"></iconify-icon>
                <span>Download</span>
              </button>`;
  const items = t.downloads.map(([fmt, label, icon]) => `
                  <button type="button" class="dropdown-item" data-format="${fmt}" role="menuitem">
                    <div class="dropdown-item-left">
                      <iconify-icon icon="${icon}" width="14" height="14"></iconify-icon>
                      <span>${label}</span>
                    </div>
                  </button>`).join('');
  return `
              <div class="dropdown-menu-wrapper" id="download-dropdown-wrap">
                <button type="button" class="btn-toolbar-sm btn-brand-sm" id="btn-download" title="Download result" aria-label="Download result" aria-haspopup="true" disabled>
                  <iconify-icon icon="lucide:download" width="14" height="14"></iconify-icon>
                  <span>Download</span>
                  <iconify-icon icon="lucide:chevron-down" class="dropdown-arrow" width="13" height="13"></iconify-icon>
                </button>
                <div class="dropdown-popup" role="menu">${items}
                </div>
              </div>`;
}

function settings(t) {
  if (!t.settings) return '';
  return `
          <!-- 2c. Settings -->
          <details class="tool-settings-accordion">
            <summary class="tool-settings-summary">
              <div class="tool-settings-summary-left">
                <iconify-icon icon="lucide:sliders-horizontal" width="15" height="15"></iconify-icon>
                <span>Settings</span>
                <span class="pane-badge" id="settings-summary">${esc(t.settingsSummary || '')}</span>
              </div>
              <iconify-icon class="tool-settings-chevron" icon="lucide:chevron-down" width="16" height="16"></iconify-icon>
            </summary>
            <div class="tool-settings-panel">${t.settings}
            </div>
          </details>
`;
}

function page(t) {
  const url = `https://toolity.in/${CAT}/${t.slug}/`;
  const title = `Free Online ${t.name} | Toolity ${CAT_LABEL}`;
  const libs = (t.libs || []).map((l) => LIBS[l]).join('');
  const faqLd = t.faq.map(([q, a]) => `          { "@type": "Question", "name": ${jsonStr(q)}, "acceptedAnswer": { "@type": "Answer", "text": ${jsonStr(a)} } }`).join(',\n');
  const faqHtml = t.faq.map(([q, a]) => `            <details class="faq-item">
              <summary>${q}</summary>
              <p>${a}</p>
            </details>`).join('\n');
  const guide = t.guide.map(([h, d], i) => `            <div class="guide-step-card">
              <div class="step-num-badge">${i + 1}</div>
              <h3 class="step-title">${h}</h3>
              <p class="step-desc">${d}</p>
            </div>`).join('\n');
  const action = t.action ? `
                <button type="button" id="btn-run" class="btn-toolbar-sm btn-brand-sm btn-primary-action">
                  <iconify-icon icon="${t.actionIcon || 'lucide:play'}" width="16" height="16"></iconify-icon>
                  <span>${t.action}</span>
                </button>` : '';
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
  <meta name="description" content="${esc(t.desc)}">
  <meta name="author" content="Kapil Pidhwani">

  <!-- Open Graph / Twitter -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Toolity.in">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${esc(t.desc)}">
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
${t.css ? `  <link rel="stylesheet" href="/styles/tools/${t.slug}.css?v=1.0">\n` : ''}
  <!-- Structured data: WebApplication + BreadcrumbList + FAQPage -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": ${jsonStr(t.name)},
        "url": "${url}",
        "description": ${jsonStr(t.desc)},
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
          { "@type": "ListItem", "position": 2, "name": "${CAT_LABEL}", "item": "https://toolity.in/${CAT}/" },
          { "@type": "ListItem", "position": 3, "name": ${jsonStr(t.name)}, "item": "${url}" }
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
          <a href="/${CAT}/" class="breadcrumb-link">${CAT_LABEL}</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">${t.name}</span>
        </nav>
        <div class="page-title-row">
          <div class="page-header-content">
            <span class="section-eyebrow">${CAT_LABEL}</span>
            <h1 class="page-title">${t.name}</h1>
            <p class="page-desc">${esc(t.lead)}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════ 2. WORKSPACE ═══════════ -->
    <section class="section-wrapper tool-section">
      <div class="container">

        <div class="tool-workspace-card" data-layout="split" data-split="${t.split || '40/60'}" id="tool-card">

          <!-- 2a. Toolbar -->
          <div class="tool-actions-toolbar">
            <div class="toolbar-group">
              <span class="pane-badge web-status-badge" id="status-badge">${esc(t.idle || 'Waiting for input')}</span>
            </div>
            <div class="toolbar-group">
              <button type="button" class="btn-toolbar-sm" id="btn-reset" title="Reset all inputs and settings" aria-label="Reset all inputs and settings">
                <iconify-icon icon="lucide:rotate-ccw" width="14" height="14"></iconify-icon>
                <span>Reset</span>
              </button>
              <button type="button" class="btn-toolbar-sm" id="btn-copy" title="Copy result" aria-label="Copy result" disabled>
                <iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon>
                <span>Copy</span>
              </button>${downloadBtn(t)}
              <button type="button" class="btn-toolbar-sm" id="btn-open" title="Open result in a new tab" aria-label="Open result in a new tab" disabled>
                <iconify-icon icon="lucide:external-link" width="14" height="14"></iconify-icon>
                <span>Open</span>
              </button>
            </div>
          </div>

          <!-- 2b. Panes -->
          <div class="split-pane-grid">

            <div class="tool-pane">
              <div class="pane-header">
                <span>${t.sourceLabel}</span>
                <span class="pane-badge" id="input-badge">—</span>
              </div>
              <div class="pane-error" id="input-error" role="alert" hidden>
                <iconify-icon icon="lucide:alert-circle" width="14" height="14"></iconify-icon>
                <span></span>
              </div>
              <div class="pane-content web-form">${t.sourceHtml}${action}
              </div>
            </div>

            <div class="tool-pane">
              <div class="pane-header">
                <span>${t.outputLabel}</span>
                <span class="pane-badge" id="output-badge">—</span>
              </div>
              <div class="pane-content web-output-pane">
                <div class="pane-empty" id="output-empty">
                  <iconify-icon icon="${t.outputIcon}"></iconify-icon>
                  <span>${esc(t.outputEmpty)}</span>
                </div>
                <div class="web-output" id="output-content" hidden>${t.outputHtml}
                </div>
              </div>
            </div>

          </div>
${settings(t)}
        </div>


        <!-- ═══════════ 3. GUIDE (exactly 3 steps) ═══════════ -->
        <section class="guide-section">
          <div class="section-header-compact">
            <span class="section-eyebrow">How It Works</span>
            <h2 class="section-heading-sm">How to Use ${t.name} in 3 Steps</h2>
          </div>
          <div class="guide-steps-grid">
${guide}
          </div>
        </section>

        <!-- ═══════════ 5. FAQ ═══════════ -->
        <section class="faq-section">
          <div class="section-header-compact">
            <span class="section-eyebrow">FAQ</span>
            <h2 class="section-heading-sm">${t.name} — Frequently Asked Questions</h2>
          </div>
          <div class="faq-list">
${faqHtml}
          </div>
        </section>

        <!-- ═══════════ 6. CATEGORY CTA ═══════════ -->
        <div data-include="/components/tool-cta.html" data-category="${CAT}"></div>

      </div>
    </section>
  </main>

  <div data-include="/components/footer.html"></div>

  <script src="/scripts/main.js?v=${MAIN_V}"></script>
  <script src="/scripts/tool-common.js?v=1.0"></script>
${libs}  <script src="/scripts/web-common.js?v=1.0"></script>
  <script src="/${CAT}/${t.slug}/${t.slug}.js?v=1.0"></script>
</body>
</html>
`;
}

for (const t of TOOLS) {
  if (only && t.slug !== only) continue;
  const dir = path.join(__dirname, CAT, t.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(t));
  console.log(`wrote ${CAT}/${t.slug}/index.html`);
}

#!/usr/bin/env node
/* Designed by Kapil Pidhwani: cfg_pdf_tools.js → /docs/<slug>/index.html, mirroring templates/tool-page.html (rule 47).
 * Usage: node gen_pdf_pages.js [slug]   — idempotent; re-run after editing the config. */
const fs = require('fs');
const path = require('path');
const TOOLS = require('./cfg_pdf_tools.js');
const only = process.argv[2];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonStr = (s) => JSON.stringify(String(s).replace(/<[^>]+>/g, ''));
const MAIN_V = '3.7', CSS_V = '4.8';

function sourcePane(t) {
  const drop = `
                  <div id="dropzone" class="video-dropzone" tabindex="0" role="button" aria-label="${esc(t.dropTitle)}">
                    <input type="file" id="file-input" accept="${t.accept === 'image/' ? 'image/*' : 'application/pdf, .pdf'}"${t.multiple ? ' multiple' : ''}>
                    <div class="video-drop-icon">
                      <iconify-icon icon="lucide:upload-cloud" width="22" height="22"></iconify-icon>
                    </div>
                    <div class="video-drop-title">${esc(t.dropTitle)}</div>
                    <div class="video-drop-subtitle">${esc(t.dropSub)}</div>
                  </div>`;
  if (t.source === 'images') return `
                <div class="media-canvas-viewport pdf-tall">${drop}
                  <ul id="file-list" class="pdf-files" hidden></ul>
                </div>
                <button type="button" class="btn-toolbar-sm" id="btn-add-more" hidden>
                  <iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon><span>Add more images</span>
                </button>`;
  if (t.source === 'custom') return `
                <div class="media-canvas-viewport pdf-tall">${drop}${t.sourceHtml}
                </div>`;
  return `
                <div class="media-canvas-viewport">${drop}
                  <canvas id="source-canvas" class="pdf-page-canvas" hidden aria-label="First page of the PDF"></canvas>
                </div>`;
}

function outputPane(t) {
  if (t.outputKind === 'text') return `
                <div class="media-canvas-viewport pdf-tall">
                  <div id="output-empty" class="media-empty-placeholder">
                    <iconify-icon icon="${t.outputIcon}" width="32" height="32"></iconify-icon>
                    <p>${esc(t.outputEmpty)}</p>
                  </div>
                  <textarea id="output-text" class="pdf-text-out" readonly hidden aria-label="Extracted text" spellcheck="false"></textarea>
                </div>`;
  if (t.outputKind === 'zip') return `
                <div class="media-canvas-viewport pdf-tall">
                  <div id="output-empty" class="media-empty-placeholder">
                    <iconify-icon icon="${t.outputIcon}" width="32" height="32"></iconify-icon>
                    <p>${esc(t.outputEmpty)}</p>
                  </div>
                  <img id="output-img" class="pdf-page-canvas" hidden alt="First exported page">
                  <ul id="output-list" class="pdf-files" hidden></ul>
                </div>`;
  return `
                <div class="media-canvas-viewport">
                  <div id="output-empty" class="media-empty-placeholder">
                    <iconify-icon icon="${t.outputIcon}" width="32" height="32"></iconify-icon>
                    <p>${esc(t.outputEmpty)}</p>
                  </div>
                  <canvas id="output-canvas" class="pdf-page-canvas" hidden aria-label="First page of result"></canvas>
                </div>`;
}

function page(t) {
  const url = `https://toolity.in/docs/${t.slug}/`;
  const libs = (t.libs || []).map((l) => ({ jszip: '  <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js" defer></script>\n' })[l]).join('');
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
  const openBtn = t.outputKind === 'zip' ? '' : `
              <button type="button" class="btn-toolbar-sm" id="btn-open" title="Open result in a new tab" aria-label="Open result in a new tab" disabled>
                <iconify-icon icon="lucide:external-link" width="14" height="14"></iconify-icon>
                <span>Open</span>
              </button>`;
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

  <title>Free Online ${t.name} | Toolity Docs</title>
  <link rel="canonical" href="${url}">
  <meta name="description" content="${esc(t.desc)}">
  <meta name="author" content="Kapil Pidhwani">

  <!-- Open Graph / Twitter -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Toolity.in">
  <meta property="og:title" content="Free Online ${t.name} | Toolity Docs">
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
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Any",
        "browserRequirements": "Requires JavaScript",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "author": { "@type": "Person", "name": "Kapil Pidhwani" }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://toolity.in/" },
          { "@type": "ListItem", "position": 2, "name": "Docs", "item": "https://toolity.in/docs/" },
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
          <a href="/docs/" class="breadcrumb-link">Docs</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">${t.name}</span>
        </nav>
        <div class="page-title-row">
          <div class="page-header-content">
            <span class="section-eyebrow">Docs</span>
            <h1 class="page-title">${t.name}</h1>
            <p class="page-desc">${esc(t.lead)}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════ 2. WORKSPACE ═══════════ -->
    <section class="section-wrapper tool-section">
      <div class="container">

        <div class="tool-workspace-card" data-layout="split" data-split="40/60" id="tool-card">

          <!-- 2a. Toolbar -->
          <div class="tool-actions-toolbar">
            <div class="toolbar-group">
              <span class="pane-badge pdf-result-badge" id="result-badge">Drop a PDF to begin</span>
            </div>
            <div class="toolbar-group">
              <button type="button" class="btn-toolbar-sm" id="btn-reset" title="Reset all inputs and settings" aria-label="Reset all inputs and settings">
                <iconify-icon icon="lucide:rotate-ccw" width="14" height="14"></iconify-icon>
                <span>Reset</span>
              </button>
              <button type="button" class="btn-toolbar-sm" id="btn-copy" title="Copy result" aria-label="Copy result" disabled>
                <iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon>
                <span>Copy</span>
              </button>
              <button type="button" class="btn-toolbar-sm btn-brand-sm" id="btn-download" title="Download result" aria-label="Download result" disabled>
                <iconify-icon icon="lucide:download" width="14" height="14"></iconify-icon>
                <span>Download</span>
              </button>${openBtn}
            </div>
          </div>

          <!-- 2b. Panes -->
          <div class="split-pane-grid">

            <div class="tool-pane">
              <div class="pane-header">
                <span>${t.sourceLabel}</span>
                <span class="pane-badge" id="source-badge">No file loaded</span>
              </div>
              <div class="pane-error" id="input-error" role="alert" hidden>
                <iconify-icon icon="lucide:alert-circle" width="14" height="14"></iconify-icon>
                <span></span>
              </div>
              <div class="pane-content pane-content-between">${sourcePane(t)}
              </div>
            </div>

            <div class="tool-pane">
              <div class="pane-header">
                <span>${t.outputLabel}</span>
                <span class="pane-badge" id="output-badge">Awaiting file</span>
              </div>
              <div class="pane-content pane-content-between">${outputPane(t)}
                <div>
                  <button type="button" id="btn-compress" class="btn-toolbar-sm btn-brand-sm btn-primary-action" disabled>
                    <iconify-icon icon="${t.actionIcon}" width="16" height="16"></iconify-icon>
                    <span id="btn-compress-label">${t.action}</span>
                  </button>
                  <div class="slim-progress-bar" id="progress-bar">
                    <div class="slim-progress-fill" id="progress-fill"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- 2c. Settings -->
          <details class="tool-settings-accordion">
            <summary class="tool-settings-summary">
              <div class="tool-settings-summary-left">
                <iconify-icon icon="lucide:sliders-horizontal" width="15" height="15"></iconify-icon>
                <span>Settings</span>
                <span class="pane-badge" id="settings-summary">${esc(t.settingsSummary)}</span>
              </div>
              <iconify-icon class="tool-settings-chevron" icon="lucide:chevron-down" width="16" height="16"></iconify-icon>
            </summary>
            <div class="tool-settings-panel">${t.settings}
            </div>
          </details>

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
        <div data-include="/components/tool-cta.html" data-category="docs"></div>

      </div>
    </section>
  </main>

  <div data-include="/components/footer.html"></div>

  <script src="/scripts/main.js?v=${MAIN_V}"></script>
  <script src="/scripts/tool-common.js?v=1.0"></script>
  <script src="https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.11.1/dist/pdf-lib.min.js" defer></script>
${libs}  <script src="/scripts/pdf-common.js?v=1.1"></script>
  <script src="/docs/${t.slug}/${t.slug}.js?v=1.0"></script>
</body>
</html>
`;
}

for (const t of TOOLS) {
  if (only && t.slug !== only) continue;
  const dir = path.join(__dirname, 'docs', t.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(t));
  console.log('wrote docs/' + t.slug + '/index.html');
}

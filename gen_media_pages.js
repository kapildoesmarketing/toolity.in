#!/usr/bin/env node
/* Designed by Kapil Pidhwani: cfg_media_tools.js → /<cat>/<slug>/index.html, mirroring templates/tool-page.html and the
 * markup the shared mount() runtimes expect (audio-common · gif-common · video-common · image-common) — rule 47.
 * Workspace = toolbar (Reset · Copy · Download) + source pane + output pane (+ primary #btn-compress) + settings.
 * Usage: node gen_media_pages.js [slug]   — idempotent; re-run after editing the config. */
const fs = require('fs');
const path = require('path');
const TOOLS = require(process.env.CFG ? `./${process.env.CFG}` : './cfg_media_tools.js'); // CFG=cfg_batch3_tools.js node gen_media_pages.js [slug]
const only = process.argv[2];
const CAT_LABEL = { media: 'Media', labs: 'Labs' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonStr = (s) => JSON.stringify(String(s).replace(/<[^>]+>/g, ''));
const MAIN_V = '5.0', CSS_V = '6.4';
const RUNTIME = {
  audio: '  <script src="/scripts/audio-common.js?v=1.1"></script>\n  <script src="https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.all.js" defer></script>\n',
  gif: '  <script src="/scripts/gif-common.js?v=1.0"></script>\n',
  video: '  <script src="/scripts/video-common.js?v=1.1"></script>\n',
  image: '  <script src="/scripts/image-common.js?v=1.0"></script>\n',
  mockup: '  <script src="/scripts/mockup-common.js?v=1.0"></script>\n',
};
const LIBS = { jszip: '  <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js" defer></script>\n', 'webp-anim': '  <script src="/scripts/webp-anim.js?v=1.0"></script>\n', 'video-common': '  <script src="/scripts/video-common.js?v=1.1"></script>\n' };

const dropzone = (d) => `
                  <div id="dropzone" class="video-dropzone" tabindex="0" role="button" aria-label="${esc(d.title)}">
                    <input type="file" id="file-input" accept="${d.accept}"${d.multiple ? ' multiple' : ''}>
                    <div class="video-drop-icon">
                      <iconify-icon icon="lucide:upload-cloud" width="22" height="22"></iconify-icon>
                    </div>
                    <div class="video-drop-title">${d.title}</div>
                    <div class="video-drop-subtitle">${d.sub}</div>
                  </div>`;

/* Primary action + progress. Lives under the output pane, or under the source pane with actionIn: 'source' (Camera). */
const actionBlock = (t) => `
                  <button type="button" id="btn-compress" class="btn-toolbar-sm btn-brand-sm btn-primary-action"${t.actionEnabled ? '' : ' disabled'}>
                    <iconify-icon icon="${t.actionIcon}" width="16" height="16"></iconify-icon>
                    <span id="btn-compress-label">${t.action}</span>
                  </button>
                  <div class="slim-progress-bar" id="progress-bar">
                    <div class="slim-progress-fill" id="progress-fill"></div>
                  </div>`;

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
  const CAT = t.cat || 'media', LABEL = CAT_LABEL[CAT];
  const url = `https://toolity.in/${CAT}/${t.slug}/`;
  const title = `Free Online ${t.name} | Toolity ${LABEL}`;
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
  const src = t.source, out = t.output;
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
${t.css ? [].concat(t.cssFile || t.slug).map((f) => `  <link rel="stylesheet" href="/styles/tools/${f}.css?v=1.0">\n`).join('') : ''}
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
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Any",
        "browserRequirements": "Requires JavaScript",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "author": { "@type": "Person", "name": "Kapil Pidhwani" }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://toolity.in/" },
          { "@type": "ListItem", "position": 2, "name": "${LABEL}", "item": "https://toolity.in/${CAT}/" },
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

  <main id="main">
    <!-- ═══════════ 1. HERO ═══════════ -->
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="/" class="breadcrumb-link">Home</a>
          <span class="breadcrumb-separator">/</span>
          <a href="/${CAT}/" class="breadcrumb-link">${LABEL}</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">${t.name}</span>
        </nav>
        <div class="page-title-row">
          <div class="page-header-content">
            <span class="section-eyebrow">${LABEL}</span>
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
              <span class="pane-badge" id="result-badge">${esc(t.idle || 'Drop a file to begin')}</span>
            </div>
            <div class="toolbar-group">
              <button type="button" class="btn-toolbar-sm" id="btn-reset" title="Reset all inputs and settings" aria-label="Reset all inputs and settings">
                <iconify-icon icon="lucide:rotate-ccw" width="14" height="14"></iconify-icon>
                <span>Reset</span>
              </button>
              <button type="button" class="btn-toolbar-sm" id="btn-copy" title="${esc(t.copyTitle || 'Copy result')}" aria-label="${esc(t.copyTitle || 'Copy result')}" disabled>
                <iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon>
                <span>Copy</span>
              </button>
              <button type="button" class="btn-toolbar-sm btn-brand-sm" id="btn-download" title="${esc(t.downloadTitle || 'Download result')}" aria-label="${esc(t.downloadTitle || 'Download result')}" disabled>
                <iconify-icon icon="lucide:download" width="14" height="14"></iconify-icon>
                <span>Download</span>
              </button>
            </div>
          </div>

          <!-- 2b. Panes -->
          <div class="split-pane-grid">

            <div class="tool-pane">
              <div class="pane-header">
                <span>${src.label || 'Source'}</span>
                <span class="pane-badge" id="source-badge">${esc(src.badge || 'No file loaded')}</span>
              </div>
              <div class="pane-error" id="input-error" role="alert" hidden>
                <iconify-icon icon="lucide:alert-circle" width="14" height="14"></iconify-icon>
                <span></span>
              </div>
              <div class="pane-content pane-content-between">
                <div class="media-canvas-viewport${src.tall ? ' pdf-tall' : ''}">${src.drop ? dropzone(src.drop) : ''}${src.html || ''}
                </div>${src.after || ''}${t.actionIn === 'source' ? `
                <div>${actionBlock(t)}
                </div>` : ''}
              </div>
            </div>

            <div class="tool-pane">
              <div class="pane-header">
                <span>${out.label}</span>
                <span class="pane-badge" id="output-badge">${esc(out.badge || 'Awaiting file')}</span>
              </div>
              <div class="pane-content pane-content-between">
                <div class="media-canvas-viewport${out.tall ? ' pdf-tall' : ''}">
                  <div id="output-empty" class="media-empty-placeholder">
                    <iconify-icon icon="${out.icon}" width="32" height="32"></iconify-icon>
                    <p>${out.empty}</p>
                  </div>${out.html || ''}
                </div>
                <div>${out.after || ''}${t.actionIn === 'source' ? '' : actionBlock(t)}
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
  <script src="/scripts/tool-common.js?v=1.2"></script>
${t.runtime ? RUNTIME[t.runtime] : ''}${libs}  <script src="/${CAT}/${t.slug}/${t.slug}.js?v=1.0"></script>
</body>
</html>
`;
}

for (const t of TOOLS) {
  if (only && t.slug !== only) continue;
  const dir = path.join(__dirname, t.cat || 'media', t.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(t));
  console.log(`wrote ${t.cat || 'media'}/${t.slug}/index.html`);
}

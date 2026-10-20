/* Designed by Kapil Pidhwani: the Labs web-utility batch. Each entry drives gen_web_pages.js (page), wire_web.py (cards,
 * registry, sitemap, llms) and the tool's own <slug>.js (behaviour). Required: slug, name, icon, desc, lead, cardDesc, tags,
 * sourceLabel, sourceHtml, outputLabel, outputIcon, outputEmpty, outputHtml, guide[3], faq[4–6].
 * Optional: split, idle, action, actionIcon, downloads [[fmt,label,icon]], settingsSummary, settings, css, libs ['color']. */
const PRIVACY_FAQ = ['Is my input sent anywhere?', 'No. Everything is computed by JavaScript in your browser tab. Nothing is uploaded, logged or stored by Toolity.'];
const RELAY_FAQ = ['Why does fetching sometimes fail — and what is the relay?', 'Browsers block JavaScript from reading other websites directly (CORS). The tool first tries a direct request; when the site forbids it, the <em>URL only</em> is sent to a public read-only relay (allorigins.win, then codetabs.com) that fetches the page and returns its HTML. The relay sees the URL you typed, nothing else — Toolity has no server and keeps no record. If the relay is busy or the site blocks bots, paste the page source instead: that path is 100% local.'];
const PASTE_FAQ = ['How do I use paste mode?', 'Open the page in your browser, press <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>U</kbd> (view source), select all, copy, and paste into the HTML box. Only the <code>&lt;head&gt;</code> is needed. Paste mode never contacts any server.'];
const COLOR_INPUT = (id, label, placeholder) => `
                <div class="form-group">
                  <label class="form-label" for="${id}-input"><span>${label}</span></label>
                  <div class="web-inline">
                    <input type="text" id="${id}-input" class="input-clean" placeholder="${placeholder}" spellcheck="false" autocomplete="off" autocapitalize="off">
                    <input type="color" id="${id}-pick" class="web-color-input" aria-label="${label} picker" value="#000000">
                  </div>
                </div>`;
const URL_INPUT = (placeholder) => `
                <div class="form-group">
                  <label class="form-label" for="url-input"><span>Page URL</span></label>
                  <input type="url" id="url-input" class="input-clean" placeholder="${placeholder}" spellcheck="false" autocomplete="off" autocapitalize="off" inputmode="url">
                </div>`;
const HTML_PASTE = `
                <div class="form-group">
                  <label class="form-label" for="html-input"><span>Or paste the page's HTML</span><span class="form-label-desc">Works offline · overrides the URL</span></label>
                  <textarea id="html-input" class="textarea-clean" rows="6" placeholder="&lt;head&gt;…&lt;/head&gt; — view-source, select all, paste" spellcheck="false"></textarea>
                </div>`;
/* Site-file checkers (robots / sitemap / ads.txt / security.txt): URL of the site or of the file itself + paste fallback. */
const SITE_INPUT = (placeholder, desc) => `
                <div class="form-group">
                  <label class="form-label" for="url-input"><span>Site or file URL</span>${desc ? `<span class="form-label-desc">${desc}</span>` : ''}</label>
                  <input type="url" id="url-input" class="input-clean" placeholder="${placeholder}" spellcheck="false" autocomplete="off" autocapitalize="off" inputmode="url">
                </div>`;
const FILE_PASTE = (name, placeholder, rows = 6) => `
                <div class="form-group">
                  <label class="form-label" for="text-input"><span>Or paste ${name}</span><span class="form-label-desc">Works offline · overrides the URL</span></label>
                  <textarea id="text-input" class="textarea-clean" rows="${rows}" placeholder="${placeholder}" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>`;

/* Generators batch (Oct 2026): `section` = heading on /labs/ (read by wire_labs_dev.py; the generator ignores it). */
const OPTS = (list, sel) => list.map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');
const CHECK = (id, label, on) => `
              <div class="control-item"><input type="checkbox" id="${id}"${on ? ' checked' : ''}><label for="${id}">${label}</label></div>`;
const FIELD = (id, label, attrs, desc = '') => `
                <div class="form-group">
                  <label class="form-label" for="${id}"><span>${label}</span>${desc ? `<span class="form-label-desc">${desc}</span>` : ''}</label>
                  <input id="${id}" class="input-clean" autocomplete="off" ${attrs}>
                </div>`;
const RANGE = (id, label, min, max, val, unit = '') => `
                <div class="form-group">
                  <label class="form-label" for="${id}"><span>${label}</span><span class="form-label-desc"><span id="${id}-val">${val}${unit}</span></span></label>
                  <input type="range" id="${id}" min="${min}" max="${max}" step="1" value="${val}"${unit ? ` data-unit="${unit}"` : ''}>
                </div>`;
const SHARE_PLATFORMS = [['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['x', 'X (Twitter)'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['reddit', 'Reddit'], ['pinterest', 'Pinterest'], ['email', 'Email'], ['sms', 'SMS']];
const BARCODE_FORMATS = [['CODE128', 'Code 128 (any text)'], ['EAN13', 'EAN-13 (retail, 12–13 digits)'], ['EAN8', 'EAN-8 (7–8 digits)'], ['UPC', 'UPC-A (11–12 digits)'], ['CODE39', 'Code 39 (A–Z, 0–9)'], ['ITF14', 'ITF-14 (cartons, 13–14 digits)'], ['codabar', 'Codabar (libraries, blood banks)']];
/* SEO & Site Helpers batch (Oct 2026): `section` = heading on /labs/ (read by wire_seo_text.py). */
const SEO_TOOLS = [
  {
    slug: 'robots-sitemap-generator', name: 'Robots.txt & Sitemap Generator', icon: 'lucide:bot', section: 'SEO & Site Helpers', split: '50/50', css: true,
    desc: 'Free online robots.txt and sitemap.xml generator: build crawler rules with presets (allow all, block all, block AI bots, WordPress), add Allow / Disallow paths and crawl-delay, and turn a list of URLs into a valid XML sitemap. Runs in your browser — nothing crawled or uploaded.',
    lead: 'Build a correct robots.txt with presets and rule groups, and turn a list of URLs into a valid sitemap.xml — both ready to download.',
    cardDesc: 'Rule builder with AI-bot and WordPress presets; URL list → sitemap.xml.',
    tags: ['robots.txt generator', 'sitemap generator', 'sitemap.xml', 'block ai crawlers', 'gptbot robots.txt', 'disallow', 'crawl-delay', 'xml sitemap', 'seo tools', 'robots txt'],
    idle: 'Add a rule group or paste URLs', sourceLabel: 'Builder', outputLabel: 'Output', outputIcon: 'lucide:bot', outputEmpty: 'Your robots.txt or sitemap.xml will appear here',
    downloads: [['robots', 'robots.txt', 'lucide:bot'], ['sitemap', 'sitemap.xml', 'lucide:map']],
    sourceHtml: `
                <div class="form-group">
                  <span class="form-label"><span>File</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="File">
                    <button type="button" class="seg-pill active" data-value="robots">robots.txt</button>
                    <button type="button" class="seg-pill" data-value="sitemap">sitemap.xml</button>
                  </div>
                </div>${FIELD('site-url', 'Site URL', 'type="url" placeholder="https://example.com" inputmode="url" spellcheck="false"', 'adds the Sitemap: line · resolves relative paths')}
                <div class="web-group" id="rb-pane">
                  <div class="form-group">
                    <span class="form-label"><span>Presets</span></span>
                    <div class="web-tags rb-presets" role="group" aria-label="Presets">${[['allow', 'Allow everything'], ['block', 'Block everything'], ['ai', 'Block AI crawlers'], ['wordpress', 'WordPress'], ['staging', 'Staging site']].map(([v, l]) => `<button type="button" class="web-tag rb-preset" data-preset="${v}">${l}</button>`).join('')}</div>
                  </div>
                  <div class="web-group" id="rb-groups"></div>
                  <button type="button" class="btn-toolbar-sm" id="btn-add-group"><iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon><span>Add rule group</span></button>
                  <datalist id="rb-ua-list">${['*', 'Googlebot', 'Googlebot-Image', 'Bingbot', 'DuckDuckBot', 'Applebot', 'YandexBot', 'Baiduspider', 'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'Google-Extended', 'CCBot', 'anthropic-ai', 'ClaudeBot', 'PerplexityBot', 'Bytespider', 'Applebot-Extended', 'Amazonbot', 'FacebookBot', 'meta-externalagent', 'AhrefsBot', 'SemrushBot', 'MJ12bot'].map((u) => `<option value="${u}">`).join('')}</datalist>
                </div>
                <div class="form-group form-group-grow" id="sm-pane" hidden>
                  <label class="form-label" for="text-input"><span>URLs — one per line</span><span class="form-label-desc">optional: , lastmod, changefreq, priority</span></label>
                  <textarea id="text-input" class="textarea-clean" rows="10" placeholder="/&#10;/about&#10;/blog/first-post, 2026-01-15, monthly, 0.8&#10;https://example.com/contact" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>`,
    outputHtml: `
                  <pre class="web-code" id="output-text"></pre>
                  <div class="web-tags" id="output-issues"></div>`,
    settingsSummary: 'lastmod today · no changefreq · no priority',
    settings: `
              <div class="control-item">
                <label for="opt-lastmod">Sitemap lastmod default</label>
                <select id="opt-lastmod" class="select-clean">${OPTS([['today', 'Today'], ['none', 'Omit']], 'today')}</select>
              </div>
              <div class="control-item">
                <label for="opt-freq">Sitemap changefreq default</label>
                <select id="opt-freq" class="select-clean">${OPTS([['', 'Omit'], ['always', 'always'], ['hourly', 'hourly'], ['daily', 'daily'], ['weekly', 'weekly'], ['monthly', 'monthly'], ['yearly', 'yearly'], ['never', 'never']], '')}</select>
              </div>
              <div class="control-item">
                <label for="opt-priority">Sitemap priority default</label>
                <select id="opt-priority" class="select-clean">${OPTS([['', 'Omit'], ['1.0', '1.0'], ['0.8', '0.8'], ['0.5', '0.5'], ['0.3', '0.3']], '')}</select>
              </div>`,
    guide: [['Pick a preset or add groups', 'Start from <strong>Allow everything</strong>, <strong>Block AI crawlers</strong> or <strong>WordPress</strong>, then adjust: each rule group has one or more user-agents (comma-separated), Disallow and Allow paths (one per line) and an optional crawl-delay. Enter your site URL to get the <code>Sitemap:</code> line.'], ['Paste URLs for the sitemap', 'Switch to <strong>sitemap.xml</strong> and paste one URL per line — relative paths like <code>/about</code> are resolved against your site URL. Add <code>, lastmod, changefreq, priority</code> after a URL to override the defaults for that page.'], ['Download both files', 'Problems (foreign hosts, bad dates, duplicates) are listed under the output. Download <code>robots.txt</code> and <code>sitemap.xml</code> and upload them to the root of your site, then submit the sitemap in Search Console.']],
    faq: [['Does blocking AI crawlers in robots.txt actually work?', 'Reputable crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot, PerplexityBot, Bytespider and others in the preset) state that they honour robots.txt. It is a request, not a lock — content stays publicly reachable, and bots that ignore the standard are not stopped. The preset list is current as of October 2026; add or remove agents freely.'], ['Why is there an empty <code>Disallow:</code> line?', 'A group with a user-agent and an empty Disallow is the standard way to say “this agent may crawl everything”. Omitting the line entirely is ambiguous to some crawlers, so the generator always writes it.'], ['Why not just crawl my site to build the sitemap?', 'Toolity runs entirely in your browser and has no server, so it cannot crawl. Paste the URLs from your CMS, an export, or your existing sitemap. Up to 50,000 URLs per file (the sitemap protocol limit); split larger sites into several files and list them in a sitemap index.'], ['What do lastmod, changefreq and priority do?', '<code>lastmod</code> (YYYY-MM-DD) is the one search engines actually use — keep it honest. <code>changefreq</code> and <code>priority</code> are hints that Google ignores; they are omitted by default and only written when you set them.'], ['Do the files need to be at a specific location?', 'Yes: <code>https://your-site.com/robots.txt</code> — exactly at the root of the host. The sitemap can live anywhere on the same host, but the root is conventional and is what the <code>Sitemap:</code> line points to.'], PRIVACY_FAQ]
  },
  {
    slug: 'serp-snippet-preview', name: 'SERP Snippet Preview', icon: 'lucide:search', section: 'SEO & Site Helpers', split: '50/50', css: true,
    desc: 'Free online SERP snippet preview: see how your title and meta description will look in Google results on desktop and mobile, with pixel-width meters that show exactly where Google truncates. Import from a live page or type your own. Runs in your browser.',
    lead: 'See your title and description the way Google will show them — desktop and mobile — with pixel meters that tell you where the cut-off is.',
    cardDesc: 'Google result preview with pixel-width truncation, desktop & mobile.',
    tags: ['serp preview', 'google snippet preview', 'meta title length', 'meta description length', 'title tag pixel width', 'serp simulator', 'search result preview', 'seo title checker', 'snippet optimizer'],
    idle: 'Type a title or import a page', sourceLabel: 'Snippet', outputLabel: 'Preview', outputIcon: 'lucide:search', outputEmpty: 'The Google result preview will appear here',
    action: 'Import', actionIcon: 'lucide:download',
    downloads: [['png', 'Preview as PNG', 'lucide:image'], ['txt', 'Title + description (.txt)', 'lucide:file-text']],
    sourceHtml: `
                <div class="form-group">
                  <span class="form-label"><span>Device</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-device" role="group" aria-label="Device">
                    <button type="button" class="seg-pill active" data-value="desktop">Desktop</button>
                    <button type="button" class="seg-pill" data-value="mobile">Mobile</button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="f-title"><span>Title</span><span class="form-label-desc" id="f-title-count"></span></label>
                  <input type="text" id="f-title" class="input-clean" placeholder="Free Online Image Compressor | Toolity" autocomplete="off">
                </div>
                <div class="form-group">
                  <label class="form-label" for="f-desc"><span>Meta description</span><span class="form-label-desc" id="f-desc-count"></span></label>
                  <textarea id="f-desc" class="textarea-clean" rows="3" placeholder="Compress JPG, PNG and WebP images in your browser — no upload, no sign-up." spellcheck="true"></textarea>
                </div>${FIELD('f-url', 'Page URL', 'type="url" placeholder="https://example.com/blog/my-post" inputmode="url" spellcheck="false"', 'shown as a breadcrumb')}${FIELD('f-date', 'Date (optional)', 'type="date"', 'prefixes the description, like Google does for articles')}
                <div class="form-group">
                  <label class="form-label" for="url-input"><span>Import from a live page</span><span class="form-label-desc">fills the fields above</span></label>
                  <input type="url" id="url-input" class="input-clean" placeholder="https://example.com/page-to-check" spellcheck="false" autocomplete="off" autocapitalize="off" inputmode="url">
                </div>`,
    outputHtml: `
                  <div class="serp" id="output-card" data-device="desktop">
                    <div class="serp-site">
                      <span class="serp-fav" id="serp-fav"><img id="serp-fav-img" alt="" width="18" height="18" hidden><iconify-icon icon="lucide:globe" width="16" height="16" id="serp-fav-fb"></iconify-icon></span>
                      <div class="serp-site-text"><div class="serp-name" id="serp-name"></div><div class="serp-url" id="serp-url"></div></div>
                    </div>
                    <div class="serp-title" id="serp-title"></div>
                    <div class="serp-desc"><span class="serp-date" id="serp-date"></span><span id="serp-desc-text"></span></div>
                  </div>
                  <div class="serp-meters">
                    <div class="serp-meter"><span>Title</span><div class="serp-bar"><i id="m-title"></i></div><b id="m-title-val">—</b></div>
                    <div class="serp-meter"><span>Description</span><div class="serp-bar"><i id="m-desc"></i></div><b id="m-desc-val">—</b></div>
                  </div>
                  <div class="web-tags" id="output-issues"></div>`,
    settingsSummary: 'favicon from site · no pasted HTML',
    settings: `${CHECK('opt-favicon', 'Show the site’s favicon (loaded from the page URL’s host by your browser)', true)}
                <div class="form-group">
                  <label class="form-label" for="html-input"><span>Or import from pasted HTML</span><span class="form-label-desc">Works offline · overrides the URL when you press Import</span></label>
                  <textarea id="html-input" class="textarea-clean" rows="4" placeholder="&lt;head&gt;…&lt;/head&gt; — view-source, select all, paste" spellcheck="false"></textarea>
                </div>`,
    guide: [['Type or import', 'Enter a title, description and URL — or paste a live URL in <strong>Import from a live page</strong> and press <strong>Import</strong> to pull them from the page’s tags. Switch between <strong>Desktop</strong> and <strong>Mobile</strong>.'], ['Watch the meters', 'Google cuts titles at about 600 px on desktop and 920 px on mobile, and descriptions at roughly 920 / 1,300 px — not at a character count. The meters measure your text in Google’s actual font sizes and show the cut with an ellipsis, exactly where it would appear.'], ['Export', 'Download the preview as a PNG for a client deck or a ticket, or copy the final title and description. Then paste them into the <a href="/labs/meta-tag-generator/">Meta Tag Generator</a> to produce the tags.']],
    faq: [['Why pixels and not characters?', 'Google truncates by available width, so “WWW” uses far more room than “iii”. A 55-character title full of wide capitals can be cut while a 65-character title of narrow letters fits. The meters measure the real rendered width in Arial at Google’s sizes (20 px title, 14 px description) — the same method Google’s own tooling uses.'], ['Will Google show exactly this?', 'Mostly. Google often rewrites titles (adding the site name, dropping boilerplate) and may pick a different snippet from the page when the description doesn’t match the query. The preview shows what your tags ask for; the limits are accurate as of 2026 but Google changes them from time to time.'], ['How does the date work?', 'For articles Google prefixes the description with the publish date (“18 Oct 2026 — ”), which eats into the description’s width. Set a date to see the effect; the meter includes it.'], ['Where does the favicon come from?', 'Your browser loads <code>/favicon.ico</code> from the host in the Page URL field — Toolity never fetches it. If the site has no favicon at that path, a globe icon is shown, which is also what Google does.'], RELAY_FAQ, PASTE_FAQ]
  },
  {
    slug: 'meta-tag-generator', name: 'Meta Tag Generator', icon: 'lucide:code-xml', section: 'SEO & Site Helpers', split: '50/50',
    desc: 'Free online meta tag generator: fill in title, description, canonical, robots, Open Graph and Twitter Card fields and get a clean, copy-paste <head> block — with pixel-width checks for the title and description. Runs in your browser.',
    lead: 'Fill in the fields, get a complete, correct <head> block — title, description, canonical, robots, Open Graph and Twitter tags — ready to paste.',
    cardDesc: 'Title, description, OG, Twitter, canonical → copy-paste <head> block.',
    tags: ['meta tag generator', 'open graph generator', 'twitter card generator', 'meta tags', 'og tags', 'canonical tag', 'robots meta', 'head tags', 'seo meta tags', 'html meta generator'],
    idle: 'Start with a title', sourceLabel: 'Fields', outputLabel: 'Head block', outputIcon: 'lucide:code-xml', outputEmpty: 'Your <head> tags will appear here',
    downloads: [['html', 'head.html', 'lucide:code-xml']],
    sourceHtml: `
                <div class="form-group">
                  <label class="form-label" for="f-title"><span>Title</span><span class="form-label-desc" id="f-title-count"></span></label>
                  <input type="text" id="f-title" class="input-clean" placeholder="Free Online Image Compressor | Toolity" autocomplete="off">
                </div>
                <div class="form-group">
                  <label class="form-label" for="f-desc"><span>Description</span><span class="form-label-desc" id="f-desc-count"></span></label>
                  <textarea id="f-desc" class="textarea-clean" rows="3" placeholder="Compress JPG, PNG and WebP images in your browser — no upload, no sign-up." spellcheck="true"></textarea>
                </div>${FIELD('f-canonical', 'Canonical URL', 'type="url" placeholder="https://example.com/page" inputmode="url" spellcheck="false"')}
                <div class="web-convert-row web-convert-row-2">${FIELD('f-site', 'Site name', 'type="text" placeholder="Toolity"')}${FIELD('f-author', 'Author', 'type="text" placeholder="Kapil Pidhwani"')}
                </div>
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <label class="form-label" for="f-ogtype"><span>Open Graph type</span></label>
                    <select id="f-ogtype" class="select-clean">${OPTS([['website', 'website'], ['article', 'article'], ['product', 'product'], ['profile', 'profile'], ['video.other', 'video']], 'website')}</select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="f-twcard"><span>Twitter card</span></label>
                    <select id="f-twcard" class="select-clean">${OPTS([['summary_large_image', 'Large image'], ['summary', 'Summary'], ['', 'None']], 'summary_large_image')}</select>
                  </div>
                </div>${FIELD('f-image', 'Share image URL', 'type="url" placeholder="https://example.com/og-image.png" inputmode="url" spellcheck="false"', '1200×630 recommended')}${FIELD('f-imagealt', 'Image alt text', 'type="text" placeholder="What the image shows"')}
                <div class="web-convert-row web-convert-row-2">${FIELD('f-twsite', 'X / Twitter @site', 'type="text" placeholder="@toolity_in" spellcheck="false"')}${FIELD('f-twcreator', '@creator', 'type="text" placeholder="@kapil" spellcheck="false"')}
                </div>
                <div class="form-group">
                  <span class="form-label"><span>Robots</span></span>
                  <div class="web-checks">${CHECK('f-index', 'index', true)}${CHECK('f-follow', 'follow', true)}${CHECK('f-maximage', 'max-image-preview:large', true)}${CHECK('f-noarchive', 'noarchive', false)}
                  </div>
                </div>`,
    outputHtml: `
                  <div class="serp-meters">
                    <div class="serp-meter"><span>Title</span><div class="serp-bar"><i id="m-title"></i></div><b id="m-title-val">—</b></div>
                    <div class="serp-meter"><span>Description</span><div class="serp-bar"><i id="m-desc"></i></div><b id="m-desc-val">—</b></div>
                  </div>
                  <pre class="web-code" id="output-text"></pre>
                  <div class="web-tags" id="output-issues"></div>
                  <p class="web-muted"><a id="serp-link" href="/labs/serp-snippet-preview/">Preview this snippet in Google results →</a></p>`,
    settingsSummary: 'charset + viewport · og:url = canonical · en',
    settings: `${CHECK('opt-boiler', 'Include charset and viewport', true)}${CHECK('opt-ogurl', 'Set og:url to the canonical URL', true)}${CHECK('opt-locale', 'Include og:locale', true)}${CHECK('opt-favicons', 'Include favicon link placeholders', false)}
              <div class="control-item">
                <label for="opt-lang">Language (og:locale)</label>
                <select id="opt-lang" class="select-clean">${OPTS([['en_US', 'English (US)'], ['en_GB', 'English (UK)'], ['en_IN', 'English (India)'], ['hi_IN', 'Hindi'], ['de_DE', 'German'], ['fr_FR', 'French'], ['es_ES', 'Spanish'], ['pt_BR', 'Portuguese (BR)'], ['ja_JP', 'Japanese']], 'en_US')}</select>
              </div>
              <div class="control-item">
                <label for="opt-theme">Theme colour (optional)</label>
                <input type="text" id="opt-theme" class="input-clean" placeholder="#F4511E" spellcheck="false" autocomplete="off">
              </div>`,
    guide: [['Fill in what you have', 'Title and description drive everything — the Open Graph and Twitter tags reuse them unless you add a share image. Canonical, site name, author and robots are optional but recommended.'], ['Check the meters', 'The title and description meters use Google’s real pixel limits (about 600 px and 920 px on desktop). Warnings below the code flag a missing description, an image without alt text, or a canonical that isn’t absolute.'], ['Copy the block', 'Copy the <code>&lt;head&gt;</code> block or download it as <code>head.html</code> and paste it inside <code>&lt;head&gt;</code>, replacing any existing tags with the same names. Then check the live page with the <a href="/labs/meta-tag-extractor/">Meta Tag Extractor</a> and <a href="/labs/open-graph-preview/">Open Graph Preview</a>.']],
    faq: [['Which tags does it generate?', '<code>&lt;title&gt;</code>, description, canonical, robots, author, theme-color, charset and viewport; Open Graph (<code>og:title</code>, <code>og:description</code>, <code>og:type</code>, <code>og:url</code>, <code>og:site_name</code>, <code>og:image</code>, <code>og:image:alt</code>, <code>og:locale</code>) and Twitter Card (<code>twitter:card</code>, <code>twitter:site</code>, <code>twitter:creator</code>, <code>twitter:title</code>, <code>twitter:description</code>, <code>twitter:image</code>). Empty fields are simply left out — no blank tags.'], ['Do I need the twitter:title and twitter:description tags?', 'X falls back to the Open Graph tags when they are missing, so strictly no. They are included because other platforms (Slack, Discord, iMessage) and some X previews behave more predictably with both sets present. Set the Twitter card to “None” to leave them out.'], ['What is the keywords meta tag — and why isn’t it here?', 'Google has ignored <code>&lt;meta name="keywords"&gt;</code> since 2009 and no major search engine ranks on it. Leaving it out keeps your head clean; nothing is lost.'], ['Why the pixel limits instead of character counts?', 'Google truncates by width, not length. The meters measure your text in Google’s font sizes; see the <a href="/labs/serp-snippet-preview/">SERP Snippet Preview</a> for the full rendered result on desktop and mobile.'], ['Should og:url be the canonical URL?', 'Yes, in almost every case — it tells Facebook and LinkedIn which URL to count shares against, so tracking parameters and duplicates roll up to one page. The default follows the canonical; untick the setting if you need them to differ.'], PRIVACY_FAQ]
  }
];

/* Handy batch (Oct 2026, part 2): Text to Handwriting + Countdown Page Maker (Generators & Links), Schema Markup Generator (SEO). */
const HW_FONTS = [['caveat', 'Caveat', 30], ['homemade-apple', 'Homemade Apple', 22], ['indie-flower', 'Indie Flower', 26], ['shadows-into-light', 'Shadows Into Light', 28], ['reenie-beanie', 'Reenie Beanie', 30], ['kalam', 'Kalam', 26], ['patrick-hand', 'Patrick Hand', 27], ['dancing-script', 'Dancing Script', 28], ['gloria-hallelujah', 'Gloria Hallelujah', 24], ['nothing-you-could-do', 'Nothing You Could Do', 24], ['zeyada', 'Zeyada', 30], ['liu-jian-mao-cao', 'Liu Jian Mao Cao', 30]];
const SCHEMA_TYPES = [['Organization', 'Organization'], ['LocalBusiness', 'Local Business'], ['Person', 'Person'], ['WebSite', 'Website (+ search box)'], ['Article', 'Article / Blog post'], ['Product', 'Product (+ offer, rating)'], ['FAQPage', 'FAQ page'], ['HowTo', 'How-to'], ['Event', 'Event'], ['BreadcrumbList', 'Breadcrumbs'], ['Recipe', 'Recipe'], ['VideoObject', 'Video'], ['JobPosting', 'Job posting']];
const HANDY_TOOLS = [
  {
    slug: 'ads-txt-validator', name: 'ads.txt Validator', icon: 'lucide:badge-dollar-sign', section: 'SEO & Site Helpers', layout: 'stacked', css: true, libs: ['wellknown'],
    action: 'Validate', actionIcon: 'lucide:badge-check',
    desc: 'Free online ads.txt and app-ads.txt validator: fetch a site’s /ads.txt and /app-ads.txt (or paste them) and check every line against the IAB Tech Lab 1.1 spec — field count, DIRECT / RESELLER, certification authority IDs, OWNERDOMAIN / MANAGERDOMAIN / INVENTORYPARTNERDOMAIN variables, duplicates, BOM and whitespace — confirm your AdSense or GAM publisher ID is present, and cross-check seller IDs against each ad system’s sellers.json. Runs in your browser.',
    lead: 'Fix “ads.txt not found” and “earnings at risk” for good: validate every line against the IAB spec, confirm your publisher ID is there, and check that each seller ID really exists in the ad system’s sellers.json.',
    cardDesc: 'IAB 1.1 line-by-line validation for ads.txt and app-ads.txt, publisher-ID check, optional sellers.json cross-check.',
    tags: ['ads.txt validator', 'ads.txt checker', 'app-ads.txt validator', 'ads.txt not found adsense', 'earnings at risk ads.txt', 'ads.txt syntax', 'sellers.json checker', 'ownerdomain managerdomain', 'ads.txt direct reseller', 'iab ads.txt', 'google ads.txt line'],
    idle: 'Enter a site URL or paste ads.txt', sourceLabel: 'ads.txt', outputLabel: 'Validation', outputIcon: 'lucide:badge-check', outputEmpty: 'Line-by-line results, variables and the sellers.json cross-check appear here',
    downloads: [['md', 'Report (Markdown)', 'lucide:file-text'], ['csv', 'Records (CSV)', 'lucide:file-spreadsheet'], ['json', 'Report (JSON)', 'lucide:braces'], ['clean', 'Cleaned ads.txt', 'lucide:file-check']],
    file: { accept: '.txt' },
    sourceHtml: SITE_INPUT('https://example.com', 'fetches /ads.txt and /app-ads.txt') + FILE_PASTE('ads.txt', 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0&#10;appnexus.com, 1234, RESELLER&#10;OWNERDOMAIN=example.com&#10;CONTACT=ads@example.com') + `
                <div class="form-group">
                  <label class="form-label" for="ad-pubid"><span>Expect this publisher / seller ID</span><span class="form-label-desc">optional · e.g. pub-1234567890123456 — confirms your own line is present</span></label>
                  <input type="text" id="ad-pubid" class="input-clean" placeholder="pub-1234567890123456" spellcheck="false" autocomplete="off" autocapitalize="off">
                </div>`,
    outputHtml: `
                  <div class="web-grid-2" id="ad-stats"></div>
                  <div class="web-tags" id="ad-issues"></div>
                  <div class="web-tags" id="ad-pub"></div>
                  <div class="ad-toolbar"><button type="button" class="btn-toolbar-sm" id="btn-sellers"><iconify-icon icon="lucide:search-check" width="14" height="14"></iconify-icon><span>Cross-check with sellers.json</span></button><span class="web-muted" id="ad-sellers-note">Fetches each ad system’s sellers.json (Google’s is tens of MB) — only when you ask.</span></div>
                  <div class="web-table-wrap"><table class="web-table ad-table" id="ad-table"><thead><tr><th>#</th><th>Ad system</th><th>Seller ID</th><th>Rel.</th><th>Cert. ID</th><th>Issues</th><th class="ad-col-sj" hidden>sellers.json</th></tr></thead><tbody></tbody></table></div>
                  <div id="ad-vars"></div>
                  <div id="ad-app"></div>
                  <details class="td-more"><summary>ads.txt as fetched</summary><pre class="web-code" id="ad-raw"></pre></details>`,
    settingsSummary: 'Also checks app-ads.txt',
    settings: `${CHECK('opt-app', 'Also fetch and validate /app-ads.txt', true)}`,
    guide: [['Fetch or paste', 'Enter the site — the tool fetches <code>/ads.txt</code> (and <code>/app-ads.txt</code>) from the root, exactly where buyers look — or paste the file. Optionally type your AdSense / Ad Manager publisher ID so the report confirms the line exists. Press <strong>Validate</strong>.'], ['Fix the flagged lines', 'Each record is checked against the IAB Tech Lab ads.txt 1.1 spec: three or four comma-separated fields, a bare domain for the ad system, <code>DIRECT</code> or <code>RESELLER</code> in capitals, a plausible certification authority ID (Google’s is always <code>f08c47fec0942fa0</code>), no duplicates or conflicting relationships, no stray BOM, quotes or tabs. Variables (<code>OWNERDOMAIN</code>, <code>MANAGERDOMAIN</code>, <code>CONTACT</code>, <code>SUBDOMAIN</code>, <code>INVENTORYPARTNERDOMAIN</code>) are validated too.'], ['Cross-check sellers', 'Press <strong>Cross-check with sellers.json</strong> to fetch each ad system’s <code>sellers.json</code> and confirm every seller ID is listed there with the expected type — a line that points to an unknown seller earns nothing. Download the cleaned file (deduplicated, normalised) or the report.']],
    faq: [['Where must ads.txt live, and why “not found”?', 'At <code>https://yourdomain.com/ads.txt</code> — the root of the registrable domain, served as <code>text/plain</code> with a 200 status, no redirect to another domain. Common causes of “not found” in AdSense: the file is on <code>www</code> only (or the bare domain only) and the other host does not redirect; a CMS returns an HTML 404 page with status 200; a CDN or firewall blocks Google’s crawler; or the file is cached empty. This tool shows the exact status and content type it received.'], ['DIRECT or RESELLER?', '<code>DIRECT</code> means you control the account in that ad system (your own AdSense publisher ID). <code>RESELLER</code> means a partner sells your inventory through their account. Each partner tells you which lines to add — paste them verbatim. The same seller ID appearing as both is flagged as a conflict.'], ['What is sellers.json and why cross-check it?', 'Every ad system publishes <code>sellers.json</code>, the mirror image of ads.txt: a list of the seller IDs it pays. Buyers match the two. If your ads.txt names a seller ID that the ad system’s sellers.json does not list, that line is dead — bids are rejected. The cross-check downloads each system’s file in your browser (Google’s alone is tens of megabytes, which is why it is a button) and reports found / not found / confidential.'], ['Do I need app-ads.txt?', 'Only if you monetise a mobile or CTV app: stores link the app to your developer website, and buyers look for <code>app-ads.txt</code> there. For a plain website a missing app-ads.txt is normal and reported as informational.'], ['What are OWNERDOMAIN and MANAGERDOMAIN?', 'Spec 1.1 additions. <code>OWNERDOMAIN</code> names the business that owns the site (one per file); <code>MANAGERDOMAIN</code> names a company that manages monetisation on your behalf, optionally per country (<code>MANAGERDOMAIN=agency.com, FR</code>). They let buyers verify the chain of custody and are required by some programmatic platforms — invalid or repeated values are flagged.'], RELAY_FAQ, PRIVACY_FAQ]
  },
  {
    slug: 'sitemap-health-checker', name: 'Sitemap Health Checker', icon: 'lucide:map', section: 'SEO & Site Helpers', layout: 'stacked', css: true, libs: ['wellknown'],
    action: 'Check', actionIcon: 'lucide:map',
    desc: 'Free online XML sitemap checker: fetch any sitemap.xml or sitemap index (or paste it) and validate it against the sitemaps.org protocol — XML well-formedness, namespace, 50,000-URL and 50 MB limits, duplicate and cross-host URLs, lastmod dates, changefreq and priority values — with an interactive breakdown of URLs by site section, a filter, and an optional live status check of sample URLs. Runs in your browser.',
    lead: 'Validate a sitemap the way Google reads it — limits, namespace, dates, duplicates, wrong hosts — then explore it by section and spot-check that the URLs actually return 200.',
    cardDesc: 'Protocol validation, nested index support, duplicates and lastmod checks, section breakdown with filter, optional 200/404 sampling.',
    tags: ['sitemap checker', 'sitemap validator', 'xml sitemap validator', 'sitemap.xml checker', 'validate sitemap', 'sitemap index checker', 'sitemap lastmod', 'sitemap 50000 urls', 'sitemap errors google search console', 'sitemap tester', 'sitemap url count'],
    idle: 'Enter a site URL or paste sitemap.xml', sourceLabel: 'Sitemap', outputLabel: 'Health report', outputIcon: 'lucide:map', outputEmpty: 'Validation results, URL counts by section and the URL list appear here',
    downloads: [['md', 'Report (Markdown)', 'lucide:file-text'], ['csv', 'URLs (CSV)', 'lucide:file-spreadsheet'], ['txt', 'URLs (one per line)', 'lucide:list'], ['json', 'Report (JSON)', 'lucide:braces']],
    file: { accept: '.xml,.txt' },
    sourceHtml: SITE_INPUT('https://example.com  or  https://example.com/sitemap_index.xml', 'fetches /sitemap.xml · follows sitemap indexes') + FILE_PASTE('sitemap.xml', '&lt;?xml version=&quot;1.0&quot; encoding=&quot;UTF-8&quot;?&gt;&#10;&lt;urlset xmlns=&quot;http://www.sitemaps.org/schemas/sitemap/0.9&quot;&gt;&#10;  &lt;url&gt;&lt;loc&gt;https://example.com/&lt;/loc&gt;&lt;lastmod&gt;2026-01-15&lt;/lastmod&gt;&lt;/url&gt;&#10;&lt;/urlset&gt;'),
    outputHtml: `
                  <div class="web-grid-2" id="sm-stats"></div>
                  <div class="web-tags" id="sm-issues"></div>
                  <div class="sm-children" id="sm-children"></div>
                  <div class="sm-tree-wrap"><div class="web-group-head"><span>URLs by section</span><span class="web-muted" id="sm-tree-sum"></span></div><div class="sm-tree" id="sm-tree"></div></div>
                  <div class="sm-toolbar">
                    <label class="visually-hidden" for="sm-filter">Filter URLs</label>
                    <input type="search" id="sm-filter" class="input-clean" placeholder="Filter URLs… (text or /regex/)" autocomplete="off" spellcheck="false">
                    <button type="button" class="btn-toolbar-sm" id="btn-sample"><iconify-icon icon="lucide:activity" width="14" height="14"></iconify-icon><span>Check status of 25 URLs</span></button>
                  </div>
                  <div class="web-table-wrap"><table class="web-table sm-table" id="sm-table"><thead><tr><th>URL</th><th>lastmod</th><th>freq · prio</th><th>extras</th><th class="sm-col-status" hidden>status</th></tr></thead><tbody></tbody></table></div>
                  <p class="web-muted" id="sm-more"></p>
                  <details class="td-more"><summary>Sitemap as fetched</summary><pre class="web-code" id="sm-raw"></pre></details>`,
    settingsSummary: 'Follow index · up to 10 child sitemaps',
    settings: `${CHECK('opt-children', 'Follow a sitemap index and read its child sitemaps', true)}
              <div class="control-item">
                <label for="opt-max-children">Child sitemaps to read</label>
                <select id="opt-max-children" class="select-clean">${OPTS([['5', '5'], ['10', '10'], ['25', '25']], '10')}</select>
              </div>`,
    guide: [['Fetch or paste', 'Enter the site (the tool fetches <code>/sitemap.xml</code>), the sitemap’s own URL, or paste the XML. A sitemap index is followed automatically — up to the number of child sitemaps set in Settings. Plain-text sitemaps (one URL per line) work too. Press <strong>Check</strong>.'], ['Read the report', 'Errors are what Search Console would reject: malformed XML, wrong namespace, over 50,000 URLs or 50 MB, URLs on another host or scheme, missing <code>&lt;loc&gt;</code>. Warnings cover duplicates, invalid or future <code>lastmod</code> dates, identical timestamps on every URL, and <code>changefreq</code> / <code>priority</code> noise. The section bars show where your URLs live; click one to filter the list.'], ['Spot-check live URLs', 'Press <strong>Check status of 25 URLs</strong> to fetch a spread sample through the relay and see the HTTP status, redirects, <code>noindex</code> and canonical mismatches — the three things that silently waste a sitemap entry. Export the URL list as CSV or TXT, or the whole report as Markdown.']],
    faq: [['What makes a sitemap invalid for Google?', 'Malformed XML (an unescaped <code>&amp;</code> is the classic), a missing or wrong <code>xmlns</code>, more than 50,000 URLs or 50 MB uncompressed per file, URLs that are not absolute, URLs on a different host or scheme than the sitemap itself, and a sitemap index that points to another index (Google supports one level). This tool reports all of those as errors.'], ['Does lastmod matter? What about changefreq and priority?', '<code>lastmod</code> matters — Google uses it to decide what to recrawl, as long as it is consistently accurate. Dates must be W3C format (<code>2026-01-15</code> or full ISO 8601 with a timezone); future dates and “every URL has the same timestamp” are flagged because they teach Google to ignore the field. <code>changefreq</code> and <code>priority</code> are ignored by Google and Bing; invalid values are reported, but removing them entirely is fine.'], ['How does the status check work and why is it limited?', 'Toolity has no server, so each sampled URL is fetched by your browser — directly where the site allows it, otherwise through a public read-only relay that sees only the URL. That costs a request per URL, so the sample is capped at 25 evenly spread across the list and never runs unless you press the button. For a full crawl use a desktop crawler.'], ['Why is a URL marked “another host”?', 'The sitemap protocol says a sitemap at <code>https://www.example.com/sitemap.xml</code> may only list URLs on <code>https://www.example.com</code>. <code>http://</code> URLs in an <code>https</code> sitemap, or a bare-domain sitemap listing <code>www</code> URLs, are ignored by Google unless the host is verified in Search Console — a common cause of “sitemap could not be read”.'], ['Can it read compressed (.xml.gz) sitemaps?', 'Not yet — the browser receives the gzip bytes as text. Paste the decompressed XML, or point the tool at the uncompressed version. Everything else (sitemap index, image, video and hreflang extensions, plain-text sitemaps) is supported.'], RELAY_FAQ, PRIVACY_FAQ]
  },
  {
    slug: 'robots-txt-tester', name: 'Robots.txt Tester', icon: 'lucide:bot', section: 'SEO & Site Helpers', layout: 'stacked', css: true, libs: ['wellknown'],
    action: 'Test', actionIcon: 'lucide:bot',
    desc: 'Free online robots.txt tester: fetch any site’s robots.txt (or paste it) and test URLs against Googlebot, Bingbot, GPTBot, ClaudeBot and any user-agent — allowed or blocked, with the exact matching line, using RFC 9309 longest-match rules with wildcards and $. Flags syntax problems (rules outside a group, unknown directives, Crawl-delay, relative Sitemap URLs, 500 KB limit) and summarises which AI crawlers you block. Runs in your browser.',
    lead: 'Test any URL against any crawler the way Google does — longest match, wildcards, $ — see the exact line that decides, catch syntax mistakes, and learn which AI bots your robots.txt really blocks.',
    cardDesc: 'URL × user-agent matrix with the deciding line, RFC 9309 matching, syntax lint and an AI-crawler summary.',
    tags: ['robots.txt tester', 'robots.txt checker', 'robots.txt validator', 'test robots.txt', 'is url blocked by robots.txt', 'googlebot robots.txt test', 'robots txt syntax check', 'block gptbot', 'ai crawlers robots.txt', 'disallow allow precedence', 'robots.txt wildcard'],
    idle: 'Enter a site URL or paste robots.txt', sourceLabel: 'robots.txt', outputLabel: 'Results', outputIcon: 'lucide:bot', outputEmpty: 'Allowed / blocked per URL and crawler, with the deciding line, appear here',
    downloads: [['md', 'Report (Markdown)', 'lucide:file-text'], ['json', 'Report (JSON)', 'lucide:braces'], ['csv', 'Matrix (CSV)', 'lucide:file-spreadsheet']],
    file: { accept: '.txt' },
    sourceHtml: SITE_INPUT('https://example.com  or  https://example.com/robots.txt', 'fetches /robots.txt') + FILE_PASTE('robots.txt', 'User-agent: *&#10;Disallow: /admin/&#10;Allow: /admin/public/&#10;Sitemap: https://example.com/sitemap.xml') + `
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <label class="form-label" for="rt-urls"><span>URLs to test</span><span class="form-label-desc">one per line · / is always tested</span></label>
                    <textarea id="rt-urls" class="textarea-clean" rows="4" placeholder="/admin/settings&#10;/blog/post?utm_source=x&#10;https://example.com/wp-content/uploads/a.pdf" spellcheck="false" autocapitalize="off"></textarea>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="rt-agents"><span>User-agents</span><span class="form-label-desc">comma-separated · product tokens</span></label>
                    <textarea id="rt-agents" class="textarea-clean" rows="4" placeholder="Googlebot, Googlebot-Image, Bingbot, GPTBot, ClaudeBot, *" spellcheck="false" autocapitalize="off"></textarea>
                  </div>
                </div>`,
    outputHtml: `
                  <div class="web-grid-2" id="rt-stats"></div>
                  <div class="web-tags" id="rt-issues"></div>
                  <div class="web-table-wrap"><table class="web-table rt-table" id="rt-table"><thead></thead><tbody></tbody></table></div>
                  <div class="rt-ai"><div class="web-group-head"><span>AI &amp; LLM crawlers</span><span class="web-muted" id="rt-ai-sum"></span></div><div class="web-tags" id="rt-ai"></div></div>
                  <details class="td-more"><summary>Parsed groups</summary><pre class="web-code" id="rt-groups"></pre></details>
                  <details class="td-more"><summary>robots.txt as fetched</summary><pre class="web-code" id="rt-raw"></pre></details>`,
    settingsSummary: 'Google fallback rules · AI summary on',
    settings: `${CHECK('opt-fallback', 'Fall back like Google: Googlebot-Image → Googlebot → *, AdsBot ignores *', true)}${CHECK('opt-ai', 'Show the AI-crawler summary', true)}`,
    guide: [['Fetch or paste', 'Enter the site (the tool fetches <code>/robots.txt</code>) or the file’s own URL, or paste the contents. Add the URLs you care about — relative paths are fine — and the crawler names to test; the root <code>/</code> and a sensible default set of crawlers are included when you leave them blank. Press <strong>Test</strong>.'], ['Read the matrix', 'Each cell says <strong>Allowed</strong> or <strong>Blocked</strong> and names the line that decided it. Matching follows RFC 9309 and Google’s implementation: the most specific user-agent group wins, then the longest matching path pattern, with <code>Allow</code> winning ties; <code>*</code> and <code>$</code> work as wildcards.'], ['Fix what the lint found', 'Issues above the table flag rules outside a group (ignored by crawlers), unknown or misspelled directives, <code>Crawl-delay</code> (ignored by Google), relative Sitemap URLs, the 500 KB limit and a root block for everyone. The AI section lists which LLM crawlers are blocked, allowed or partially blocked.']],
    faq: [['How exactly does matching work?', 'Google picks the group whose <code>User-agent</code> is the most specific match for the crawler (an exact product token first, then its parent — Googlebot-Image falls back to Googlebot — then <code>*</code>). Within that group every <code>Allow</code> and <code>Disallow</code> is compared to the URL path + query; <code>*</code> matches any run of characters and <code>$</code> anchors the end. The longest matching pattern wins; if an Allow and a Disallow tie, Allow wins. An empty <code>Disallow:</code> means everything is allowed. This tool implements those rules; other crawlers (Bing, Yandex) agree on the essentials.'], ['Why is a rule marked “outside a group”?', 'Allow / Disallow lines only count after a <code>User-agent</code> line. Rules at the top of the file before any user-agent — a common copy-paste mistake — are silently ignored by every major crawler, so the tool flags them as errors.'], ['Does blocking GPTBot, ClaudeBot and others actually work?', 'Those crawlers publish that they honour robots.txt, and the summary tells you whether your file blocks them for the whole site, for parts of it, or not at all. It is a request, not a lock: content stays publicly reachable and bots that ignore the standard are not stopped. Blocking training crawlers (GPTBot, Google-Extended, CCBot) does not remove you from search; blocking search crawlers does.'], ['What about noindex, Crawl-delay and Host?', '<code>noindex</code> in robots.txt has been ignored by Google since 2019 — use a meta robots tag or X-Robots-Tag. <code>Crawl-delay</code> is honoured by Bing and Yandex but ignored by Google (set crawl rate in Search Console). <code>Host</code> is Yandex-only. All three are reported as warnings, not errors.'], ['Can it check a staging robots.txt or one that isn’t live yet?', 'Yes — paste it. Paste mode never contacts any server, and you can test the exact file you are about to deploy. Use the <a href="/labs/robots-sitemap-generator/">Robots.txt &amp; Sitemap Generator</a> to build one from scratch.'], RELAY_FAQ, PRIVACY_FAQ]
  },
  {
    slug: 'tag-detector', name: 'Tag Detector', icon: 'lucide:radar', section: 'SEO & Site Helpers', layout: 'stacked', css: true, libs: ['tagscan'],
    action: 'Scan', actionIcon: 'lucide:radar',
    desc: 'Free online website tag detector: scan any URL (or paste HTML) for 60+ analytics, advertising, heatmap, chat and consent tags — Google Tag Manager, GA4, Google Ads, Meta Pixel, TikTok, LinkedIn, Clarity, Hotjar and more — with their IDs, where they load (head, body, inside GTM), duplicates and hard-coded tags outside GTM. Also reads the GTM container itself.',
    lead: 'See every tracking tag on a page — including the ones fired from inside Google Tag Manager — with IDs, placement, duplicates and what to fix.',
    cardDesc: '60+ tag signatures with IDs, head/body/GTM placement, duplicate finder, reads the GTM container too.',
    tags: ['tag detector', 'tracking tag scanner', 'what tags are on a website', 'gtm detector', 'ga4 detector', 'meta pixel checker', 'facebook pixel detector', 'tag audit', 'tracking pixel finder', 'google tag manager container scanner', 'website tracker checker'],
    idle: 'Enter a URL or paste HTML', sourceLabel: 'Page', outputLabel: 'Tags found', outputIcon: 'lucide:radar', outputEmpty: 'Detected tags, IDs and placement appear here',
    downloads: [['md', 'Report (Markdown)', 'lucide:file-text'], ['json', 'Report (JSON)', 'lucide:braces'], ['csv', 'Tags (CSV)', 'lucide:file-spreadsheet']],
    sourceHtml: URL_INPUT('https://example.com') + HTML_PASTE + `
                <div class="web-checks td-opts">
                  <div class="control-item"><input type="checkbox" id="opt-gtm" checked><label for="opt-gtm">Also read the GTM container(s) — finds tags fired via GTM</label></div>
                  <div class="control-item"><input type="checkbox" id="opt-scripts" checked><label for="opt-scripts">Also read first-party scripts (up to 10)</label></div>
                </div>`,
    outputHtml: `
                  <div class="web-grid-2" id="td-stats"></div>
                  <div class="web-tags" id="td-issues"></div>
                  <div id="td-groups"></div>
                  <details class="td-more"><summary>Not detected (common tags)</summary><div class="web-tags" id="td-missing"></div></details>
                  <details class="td-more"><summary>Third-party hosts & scripts</summary><div id="td-hosts"></div></details>`,
    settingsSummary: 'Deep scan · GTM + first-party scripts',
    guide: [['Scan a page', 'Enter the URL and press <strong>Scan</strong>. The HTML is fetched (directly or through a public relay), and by default the page’s Google Tag Manager container and up to ten first-party scripts are read too, so tags set up <em>inside</em> GTM are found — most detectors stop at the HTML.'], ['Read the report', 'Tags are grouped by purpose with their IDs (GTM-…, G-…, AW-…, pixel IDs), where they load — head, body, via GTM, in a script — and whether external scripts are async. Issues call out duplicate IDs, hard-coded tags that should live in GTM, legacy Universal Analytics and missing consent management.'], ['Export', 'Download the report as Markdown for a client, JSON for a pipeline or CSV for a spreadsheet; Copy copies the Markdown.']],
    faq: [['How is this different from other tag detectors?', 'Most tools only grep the HTML. This one also fetches the GTM container JavaScript and the page’s own scripts, extracts measurement and pixel IDs, and tells you whether each tag is hard-coded or fired through GTM — the questions an audit actually asks. And it runs in your browser.'], ['Why might a tag be missing from the results?', 'Static scanning cannot see tags that are injected only after cookie consent, loaded by server-side GTM, or added by scripts that themselves load other scripts at runtime. Tags on pages behind a login are also out of reach. Treat the result as “what a first visitor’s browser receives”.'], ['Can I scan a competitor?', 'The tool reads only what any visitor’s browser downloads — public HTML and scripts. Use it responsibly and respect site terms.'], ['What do the placement labels mean?', '<strong>head</strong> / <strong>body</strong>: hard-coded in the page. <strong>via GTM</strong>: found only inside the container, i.e. managed through Tag Manager. <strong>script</strong>: found inside a first-party JavaScript file. <strong>noscript</strong>: the fallback pixel image/iframe.'], ['Does it detect Consent Mode?', 'It flags whether a consent default exists and which CMP is present; for the full Consent Mode v2 checklist use the companion <a href="/labs/consent-mode-checker/">Consent Mode Checker</a>.'], PRIVACY_FAQ, RELAY_FAQ]
  },
  {
    slug: 'consent-mode-checker', name: 'Consent Mode Checker', icon: 'lucide:shield-check', section: 'SEO & Site Helpers', layout: 'stacked', css: true, libs: ['tagscan'],
    action: 'Check', actionIcon: 'lucide:shield-check',
    desc: 'Free online Google Consent Mode v2 checker: scan a URL or paste HTML to verify the consent default exists, uses v2 parameters (ad_user_data, ad_personalization), sets all seven storage types, fires before gtag/GTM loads, uses regions, wait_for_update, ads_data_redaction and url_passthrough, and which CMP is installed — with a scored checklist and a corrected snippet you can paste.',
    lead: 'Check a site’s Google Consent Mode v2 setup the way Google will: default before the tag, v2 parameters, all storage types, regions, CMP — scored, explained, with the fix snippet ready.',
    cardDesc: '12-point Consent Mode v2 audit with score, CMP detection, GTM container read, and a corrected default snippet.',
    tags: ['consent mode checker', 'google consent mode v2', 'consent mode v2 checker', 'ad_user_data ad_personalization', 'gtag consent default', 'consent mode audit', 'cmp detector', 'cookie banner checker', 'gdpr google ads', 'consent mode test'],
    idle: 'Enter a URL or paste HTML', sourceLabel: 'Page', outputLabel: 'Consent Mode report', outputIcon: 'lucide:shield-check', outputEmpty: 'The scored checklist and fix snippet appear here',
    downloads: [['md', 'Report (Markdown)', 'lucide:file-text'], ['json', 'Report (JSON)', 'lucide:braces'], ['snippet', 'Fixed snippet (.html)', 'lucide:code']],
    sourceHtml: URL_INPUT('https://example.com') + HTML_PASTE + `
                <div class="web-checks td-opts">
                  <div class="control-item"><input type="checkbox" id="opt-gtm" checked><label for="opt-gtm">Also read the GTM container(s) — detects consent set inside GTM</label></div>
                  <div class="control-item"><input type="checkbox" id="opt-eea" checked><label for="opt-eea">Judge defaults for EEA/UK visitors (denied by default expected)</label></div>
                </div>`,
    outputHtml: `
                  <div class="cm-score" id="cmc-score"></div>
                  <div class="web-table-wrap"><table class="web-table cmc-table" id="cmc-table"><thead><tr><th>Check</th><th>Result</th><th>Detail &amp; fix</th></tr></thead><tbody></tbody></table></div>
                  <details class="td-more" open><summary>Detected consent defaults</summary><pre class="web-code" id="cmc-defaults"></pre></details>
                  <details class="td-more"><summary>Suggested default snippet</summary><pre class="web-code" id="cmc-snippet"></pre></details>`,
    settingsSummary: 'EEA defaults · GTM container read',
    guide: [['Check a page', 'Enter the URL (or paste the HTML) and press <strong>Check</strong>. The page, and by default its GTM container, are read for <code>gtag(\'consent\', \'default\', …)</code> calls, consent-initialisation tags, a CMP and the Google tags that depend on them.'], ['Read the checklist', 'Twelve checks, each Pass / Warn / Fail with the exact fix: v2 parameters, all seven storage types, denied-by-default for the EEA, region arrays, <code>wait_for_update</code>, default <em>before</em> the GTM/gtag loader, <code>ads_data_redaction</code>, <code>url_passthrough</code>, CMP present, TCF API, and Google tags firing without any consent signal.'], ['Fix it', 'Copy the suggested default snippet — generated from what you already have, with missing keys filled in — and place it above your GTM or gtag snippet. Re-run to confirm.']],
    faq: [['What changed with Consent Mode v2?', 'Since March 2024 Google requires two extra parameters for EEA traffic — <code>ad_user_data</code> and <code>ad_personalization</code> — alongside <code>ad_storage</code> and <code>analytics_storage</code>. Without them Google Ads stops building audiences and measuring conversions for EU users, and Google Analytics loses modelled data.'], ['Why must the default fire before the tag loads?', 'The default tells Google tags how to behave <em>before</em> they send anything. If gtag.js or gtm.js loads first, the first hits go out with full storage — a compliance gap and a reason Google’s own diagnostics flag the setup. The checker compares the position of both in your HTML.'], ['My CMP sets consent inside GTM — will this detect it?', 'Yes, when “read the GTM container” is on: the container is fetched and scanned for consent-initialisation templates and default calls. If the CMP injects the default purely at runtime from its own script, the checker reports the CMP and notes that it could not see the default statically.'], ['What score is “good enough”?', 'All Fail items fixed and at most cosmetic Warns. The score weights the things that lose data: v2 parameters, default-before-tag, and denied defaults for the EEA count most.'], ['Does Basic vs Advanced Consent Mode matter here?', 'In Basic mode tags are blocked entirely until consent, so no default is strictly required; in Advanced mode the default is essential. The checker assumes Advanced when Google tags are present in the HTML without a blocking CMP, and says so.'], PRIVACY_FAQ, RELAY_FAQ]
  },
  {
    slug: 'ambient-focus-room', name: 'Ambient Focus Room', icon: 'lucide:coffee', section: 'Experiments', layout: 'stacked', css: true,
    desc: 'Free online focus room: a calm fullscreen page with a focus timer (25/50/90 or custom), a mixer of ambient sounds generated on-device (rain, brown noise, wind, fire, stream, café), a tiny task list, soft scenes and a clock. Shareable setup link, keyboard shortcuts, no account, nothing uploaded.',
    lead: 'A quiet place to work: a focus timer, rain and fire you can mix, a three-item task list and a scene that slowly drifts — fullscreen, offline, shareable.',
    cardDesc: 'Focus timer + on-device ambient sound mixer + tiny task list in one calm fullscreen room.',
    tags: ['focus room', 'study with me', 'ambient sounds for focus', 'rain sounds', 'brown noise', 'pomodoro with sounds', 'deep work timer', 'virtual study room', 'white noise generator', 'focus music alternative', 'fullscreen timer'],
    idle: 'Press Space to start a focus session', sourceLabel: 'Room', outputLabel: 'Today', outputIcon: 'lucide:coffee', outputEmpty: 'Your focus sessions today will be logged here',
    sourceHtml: `
                <div class="afr-room scene-dawn" id="afr-room">
                  <div class="afr-sky" aria-hidden="true"></div>
                  <div class="afr-top">
                    <div class="afr-clock" id="afr-clock" aria-live="off">--:--</div>
                    <div class="afr-top-btns">
                      <button type="button" class="afr-icon" id="btn-mute" title="Mute / unmute sounds (M)" aria-pressed="false"><iconify-icon icon="lucide:volume-2" width="18" height="18"></iconify-icon></button>
                      <button type="button" class="afr-icon" id="btn-hide" title="Hide controls (H)" aria-pressed="false"><iconify-icon icon="lucide:eye-off" width="18" height="18"></iconify-icon></button>
                      <button type="button" class="afr-icon" id="btn-full" title="Fullscreen (F)"><iconify-icon icon="lucide:maximize-2" width="18" height="18"></iconify-icon></button>
                    </div>
                  </div>
                  <div class="afr-center">
                    <div class="afr-phase" id="afr-phase">Focus</div>
                    <div class="afr-timer" id="afr-timer" role="timer" aria-live="off">25:00</div>
                    <div class="afr-presets" id="afr-presets" role="group" aria-label="Focus length">
                      <button type="button" class="afr-pill is-on" data-min="25">25</button><button type="button" class="afr-pill" data-min="50">50</button><button type="button" class="afr-pill" data-min="90">90</button><label class="afr-pill afr-custom"><span class="visually-hidden">Custom minutes</span><input type="number" id="opt-custom" min="1" max="240" placeholder="min" inputmode="numeric"></label>
                    </div>
                    <div class="afr-controls">
                      <button type="button" class="btn-toolbar-sm btn-brand-sm afr-big" id="btn-start"><iconify-icon icon="lucide:play" width="18" height="18"></iconify-icon><span>Start</span></button>
                      <button type="button" class="btn-toolbar-sm afr-big" id="btn-skip" title="Skip to break / focus"><iconify-icon icon="lucide:skip-forward" width="18" height="18"></iconify-icon><span>Skip</span></button>
                    </div>
                    <p class="afr-quote" id="afr-quote"></p>
                  </div>
                  <div class="afr-bottom">
                    <div class="afr-mixer" id="afr-mixer" role="group" aria-label="Ambient sounds">
                      <label class="afr-ch"><iconify-icon icon="lucide:cloud-rain" width="18" height="18"></iconify-icon><span>Rain</span><input type="range" id="snd-rain" min="0" max="1" step="0.02" value="0" aria-label="Rain volume"></label>
                      <label class="afr-ch"><iconify-icon icon="lucide:waves" width="18" height="18"></iconify-icon><span>Brown noise</span><input type="range" id="snd-brown" min="0" max="1" step="0.02" value="0" aria-label="Brown noise volume"></label>
                      <label class="afr-ch"><iconify-icon icon="lucide:wind" width="18" height="18"></iconify-icon><span>Wind</span><input type="range" id="snd-wind" min="0" max="1" step="0.02" value="0" aria-label="Wind volume"></label>
                      <label class="afr-ch"><iconify-icon icon="lucide:flame" width="18" height="18"></iconify-icon><span>Fire</span><input type="range" id="snd-fire" min="0" max="1" step="0.02" value="0" aria-label="Fire volume"></label>
                      <label class="afr-ch"><iconify-icon icon="lucide:droplets" width="18" height="18"></iconify-icon><span>Stream</span><input type="range" id="snd-stream" min="0" max="1" step="0.02" value="0" aria-label="Stream volume"></label>
                      <label class="afr-ch"><iconify-icon icon="lucide:coffee" width="18" height="18"></iconify-icon><span>Café</span><input type="range" id="snd-cafe" min="0" max="1" step="0.02" value="0" aria-label="Café volume"></label>
                    </div>
                    <div class="afr-tasks">
                      <form class="afr-task-form" id="afr-task-form"><input type="text" id="afr-task-input" class="input-clean" placeholder="What are you working on? (max 3)" maxlength="80" autocomplete="off"><button type="button" class="btn-toolbar-sm" id="btn-task-add" aria-label="Add task"><iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon></button></form>
                      <ul class="afr-task-list" id="afr-task-list"></ul>
                    </div>
                  </div>
                </div>
                <div class="afr-scenes" id="afr-scenes" role="group" aria-label="Scene">
                  <button type="button" class="afr-scene is-on" data-scene="dawn" title="Dawn"></button><button type="button" class="afr-scene" data-scene="forest" title="Forest"></button><button type="button" class="afr-scene" data-scene="ocean" title="Ocean"></button><button type="button" class="afr-scene" data-scene="night" title="Night"></button><button type="button" class="afr-scene" data-scene="ember" title="Ember"></button><button type="button" class="afr-scene" data-scene="mono" title="Monochrome"></button>
                </div>`,
    outputHtml: `
                  <div class="web-grid-2" id="afr-stats"></div>
                  <ul class="web-list" id="afr-log"></ul>`,
    settingsSummary: '5-min breaks · chime on · clock on',
    settings: `
              <div class="control-item">
                <label for="opt-break">Break length</label>
                <select id="opt-break" class="select-clean"><option value="0">No break</option><option value="5" selected>5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-autobreak" checked><label for="opt-autobreak">Start the break automatically</label></div>
              <div class="control-item"><input type="checkbox" id="opt-chime" checked><label for="opt-chime">Chime when a phase ends</label></div>
              <div class="control-item"><input type="checkbox" id="opt-clock" checked><label for="opt-clock">Show the clock</label></div>
              <div class="control-item"><input type="checkbox" id="opt-quotes" checked><label for="opt-quotes">Show a quiet quote</label></div>
              <div class="control-item"><input type="checkbox" id="opt-fade"><label for="opt-fade">Fade sounds out during breaks</label></div>`,
    guide: [['Set the room', 'Pick a scene, slide a few sounds up — rain with a little fire is the classic — and type the one to three things you are working on. Press <kbd>F</kbd> for fullscreen and <kbd>H</kbd> to hide everything but the timer.'], ['Focus', 'Choose 25, 50, 90 or your own minutes and press <strong>Start</strong> (or <kbd>Space</kbd>). The timer keeps exact time even in a background tab; a soft chime marks the end and the break starts on its own if you let it.'], ['Keep the setup', 'Press <strong>Copy</strong> to copy a link with your scene, sounds and focus length — open it tomorrow or send it to a study partner. Today’s sessions are logged below the room.']],
    faq: [['Where do the sounds come from?', 'They are synthesised live in your browser with the Web Audio API — filtered noise shaped into rain, wind, a crackling fire, a stream and a café murmur, plus true brown noise. No audio files are downloaded, so it works offline and there are no licences to worry about.'], ['Does the timer keep running in a background tab?', 'Yes. It is based on timestamps, not tick counting, so when you come back the remaining time is exact. The chime plays even if the tab is in the background on desktop browsers; mobile browsers may delay it.'], ['Can I use this as a “study with me” room with friends?', 'Share the setup link so everyone has the same scene, sounds and focus length. Sessions are not synchronised between people — it is a shared recipe, not a shared clock.'], ['Why does my browser ask me to interact before sound plays?', 'Browsers block audio until you click or press a key on the page. Press Start or any slider once and the mixer wakes up.'], ['Is my task list saved?', 'In your browser only (localStorage), together with today’s session count. Reset clears it. Nothing is sent anywhere.'], PRIVACY_FAQ]
  },
  {
    slug: 'responsive-breakpoint-previewer', name: 'Responsive Breakpoint Previewer', icon: 'lucide:monitor-smartphone', section: 'Web Utilities', layout: 'stacked', css: true,
    action: 'Preview', actionIcon: 'lucide:scan-eye',
    desc: 'Free online responsive design tester: paste HTML/CSS or a page URL and see it rendered side by side at phone, tablet and desktop widths (320 to 1440 px, plus custom), scaled to fit, with synced scrolling, landscape toggle and dark-scheme preview. Runs in your browser — nothing uploaded.',
    lead: 'See one page at every breakpoint at once — paste HTML or a URL and compare 320, 375, 768, 1024 and 1440 px side by side.',
    cardDesc: 'Paste HTML or a URL; see it at 320–1440 px side by side, synced scroll, dark scheme.',
    tags: ['responsive design tester', 'breakpoint previewer', 'test website on different screen sizes', 'mobile preview', 'responsive checker', 'media query tester', 'viewport tester', 'multi device preview', 'screen size simulator', 'html preview responsive'],
    idle: 'Paste HTML or enter a URL', sourceLabel: 'Page', outputLabel: 'Breakpoints', outputIcon: 'lucide:monitor-smartphone', outputEmpty: 'Device frames appear here — paste HTML or fetch a URL',
    sourceHtml: URL_INPUT('https://example.com') + `
                <div class="form-group">
                  <label class="form-label" for="html-input"><span>Or paste HTML (CSS and scripts inline)</span><span class="form-label-desc">Overrides the URL · drop an .html file here</span></label>
                  <textarea id="html-input" class="textarea-clean" rows="7" placeholder="&lt;!doctype html&gt;&lt;style&gt;.card{display:grid;grid-template-columns:1fr 1fr}@media(max-width:600px){.card{grid-template-columns:1fr}}&lt;/style&gt;…" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>
                <div class="web-file-row rb-row">
                  <button type="button" class="btn-toolbar-sm" id="btn-sample"><iconify-icon icon="lucide:sparkles" width="14" height="14"></iconify-icon><span>Load a sample layout</span></button>
                  <span class="web-muted">Tip: paste only the parts you are testing — a component, a hero, a form.</span>
                </div>`,
    outputHtml: `
                  <div class="rb-toolbar">
                    <div class="rb-chips" id="rb-chips" role="group" aria-label="Widths to show"></div>
                    <label class="rb-custom"><span class="web-muted">Custom</span><input type="number" id="opt-custom" class="input-clean" min="200" max="3000" step="1" placeholder="px" inputmode="numeric"></label>
                  </div>
                  <div class="rb-frames" id="rb-frames"></div>`,
    settingsSummary: 'Portrait · light · synced scroll',
    settings: `
              <div class="control-item"><input type="checkbox" id="opt-landscape"><label for="opt-landscape">Landscape (swap width and height)</label></div>
              <div class="control-item"><input type="checkbox" id="opt-dark"><label for="opt-dark">Preview with prefers-color-scheme: dark</label></div>
              <div class="control-item"><input type="checkbox" id="opt-sync" checked><label for="opt-sync">Synced scrolling across frames</label></div>
              <div class="control-item"><input type="checkbox" id="opt-scripts" checked><label for="opt-scripts">Allow scripts in pasted HTML (sandboxed)</label></div>
              <div class="control-item">
                <label for="opt-height">Frame height</label>
                <select id="opt-height" class="select-clean"><option value="640">640 px</option><option value="800" selected>800 px</option><option value="1000">1000 px</option><option value="1400">1400 px</option></select>
              </div>`,
    guide: [['Give it a page', 'Paste HTML (with inline CSS/JS) or an .html file — or enter a URL and press <strong>Preview</strong>; the page is fetched and rendered with its original base URL so images and stylesheets resolve. If a site blocks fetching, paste its source instead.'],
      ['Compare widths', 'Each frame is a real viewport at the exact pixel width shown, scaled down to fit. Toggle widths with the chips, add a custom one, switch to landscape or dark scheme, and scroll one frame to scroll them all.'],
      ['Fix and repeat', 'Edit the HTML on the left and the frames re-render live. Press the ⤢ button on any frame to open it full size in a new tab for a closer look.']],
    faq: [['Why can’t it show a live third-party site in an iframe?', 'Most sites send <code>X-Frame-Options</code> or a CSP <code>frame-ancestors</code> header that forbids embedding, so a live iframe would simply be blank. Instead the tool fetches the HTML (directly or via a public read-only relay, see Privacy) and renders that snapshot with a <code>&lt;base href&gt;</code> so assets load. Pages behind logins or heavy client-side apps may render partially — paste the rendered DOM from DevTools in that case.'],
      ['Are the widths real viewports?', 'Yes. Each iframe is laid out at the exact CSS pixel width (and height) you see, so media queries, container queries and <code>vw</code> units behave as on a device of that size; only the visual scale is reduced to fit the grid. Device pixel ratio and touch events are not simulated.'],
      ['Which widths are included?', '320 (small phones), 375 and 390 (iPhone), 414 (large phones), 768 and 820 (tablets), 1024 (small laptop), 1280 and 1440 (desktop). Add any custom width between 200 and 3000 px.'],
      ['Is pasted HTML safe to run?', 'Pasted pages run in a sandboxed iframe without access to this page, cookies or storage. Untick “Allow scripts” for a pure layout check with JavaScript disabled.'],
      ['Can I take screenshots?', 'Use the ⤢ button to open a frame at full size, then your browser or OS screenshot tool. Cross-origin content inside the frames prevents the page from exporting a PNG directly.'],
      PRIVACY_FAQ, RELAY_FAQ]
  },
  {
    slug: 'accessibility-contrast-matrix', name: 'Accessibility Contrast Matrix', icon: 'lucide:grid-3x3', section: 'Web Utilities', split: '40/60', css: true, libs: ['color'],
    desc: 'Free online colour palette contrast matrix: paste up to 12 colours (hex list or CSS variables) and see every pair’s WCAG contrast ratio in one grid — AA / AAA pass-fail for normal text, large text and UI components, with a one-click nearest passing colour for failing pairs. Export CSV, Markdown or PNG. Runs in your browser.',
    lead: 'Paste your palette, get every colour pair’s WCAG ratio in one grid — AA/AAA at a glance, plus a suggested fix for any pair that fails.',
    cardDesc: 'Whole-palette WCAG grid: every pair’s ratio, AA/AAA flags, nearest passing fix.',
    tags: ['contrast matrix', 'palette contrast checker', 'wcag palette', 'color combinations accessibility', 'contrast grid', 'design system contrast', 'aa aaa matrix', 'accessible color palette', 'color pair contrast', 'wcag 2 contrast'],
    idle: 'Paste at least two colours', sourceLabel: 'Palette', outputLabel: 'Contrast grid', outputIcon: 'lucide:grid-3x3', outputEmpty: 'Every pair in your palette will be rated here',
    downloads: [['csv', 'CSV (all pairs)', 'lucide:file-spreadsheet'], ['md', 'Markdown table', 'lucide:file-text'], ['png', 'PNG of the grid', 'lucide:image']],
    sourceHtml: `
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Colours</span><span class="form-label-desc" id="input-count">hex, rgb(), hsl(), CSS variables or “name: #hex” — one per line or comma-separated</span></label>
                  <textarea id="text-input" class="textarea-clean" rows="9" placeholder="--brand: #F4511E&#10;--ink: #17191C&#10;--paper: #FFFFFF&#10;--muted: #6B7076&#10;#0F766E" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>
                <div class="web-file-row">
                  <button type="button" class="btn-toolbar-sm" id="btn-sample"><iconify-icon icon="lucide:palette" width="14" height="14"></iconify-icon><span>Try a sample palette</span></button>
                  <input type="color" id="opt-add" class="cm-add" value="#2563eb" aria-label="Pick a colour to add" title="Pick a colour to add">
                  <button type="button" class="btn-toolbar-sm" id="btn-add"><iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon><span>Add picked</span></button>
                </div>
                <div class="web-swatches cm-swatches" id="cm-swatches" aria-label="Parsed colours"></div>`,
    outputHtml: `
                  <div class="web-grid-2" id="cm-stats"></div>
                  <div class="web-table-wrap cm-grid-wrap"><table class="cm-grid" id="cm-grid" aria-describedby="cm-legend"></table></div>
                  <p class="web-muted" id="cm-legend">Rows are text, columns are background. Click any failing cell for the nearest passing colour.</p>
                  <div class="cm-fix" id="cm-fix" hidden></div>`,
    settingsSummary: 'Normal text · AA 4.5:1',
    settings: `
              <div class="control-item">
                <label for="opt-level">Judge against</label>
                <select id="opt-level" class="select-clean"><option value="aa" selected>AA normal text — 4.5:1</option><option value="aa-large">AA large text / UI — 3:1</option><option value="aaa">AAA normal text — 7:1</option><option value="aaa-large">AAA large text — 4.5:1</option></select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-half" checked><label for="opt-half">Hide the mirrored half (the ratio is the same either way round)</label></div>
              <div class="control-item"><input type="checkbox" id="opt-names" checked><label for="opt-names">Show colour names in headers</label></div>`,
    guide: [['Paste the palette', 'Drop in hex codes, <code>rgb()</code>/<code>hsl()</code>, a block of CSS custom properties or <code>name: #hex</code> lines — up to 12 colours. Names are picked up from variable names so the grid reads like your design system.'],
      ['Read the grid', 'Each cell is the WCAG 2 contrast ratio of the row colour as text on the column colour as background. Green passes the level you chose, amber passes only for large text, red fails. The summary counts usable pairs.'],
      ['Fix what fails', 'Click a failing cell: the tool nudges the text colour’s lightness until the pair passes and shows the new hex with the ratio, ready to copy. Export the whole matrix as CSV, Markdown (for docs) or PNG (for a design review).']],
    faq: [['Which formula is used?', 'WCAG 2.x relative luminance contrast — the same numbers browsers’ DevTools and Lighthouse report. Semi-transparent colours are composited on white before measuring. APCA (WCAG 3 draft) is not included yet.'],
      ['What do AA and AAA mean here?', 'AA needs 4.5:1 for normal text and 3:1 for large text (≥ 24 px, or ≥ 19 px bold) and UI components such as borders and icons. AAA raises that to 7:1 and 4.5:1. Pick the level you are designing for in Settings and the grid recolours.'],
      ['Why is the diagonal empty?', 'A colour on itself has a ratio of 1:1 and is never usable. The lower-left half mirrors the upper-right because the ratio does not depend on which colour is the text — hide it in Settings for a cleaner grid.'],
      ['How is the suggested fix chosen?', 'It keeps the hue and saturation of the text colour and moves only its lightness — toward white on dark backgrounds, toward black on light ones — stopping at the first value that reaches the target. That keeps the fix recognisably “your” colour.'],
      ['Can I check more than 12 colours?', 'The grid grows quadratically (12 colours = 66 pairs), which is already a lot to read. Split larger palettes into neutrals, brand and semantic groups and run each.'],
      PRIVACY_FAQ]
  },
  {
    slug: 'keyboard-shortcut-cheat-sheet-maker', name: 'Keyboard Shortcut Cheat-Sheet Maker', icon: 'lucide:keyboard', section: 'Web Utilities', split: '40/60', css: true,
    desc: 'Free online keyboard shortcut cheat sheet maker: type shortcuts one per line, group them with headings, switch between Mac and Windows symbols, pick a theme and columns, then export a printable PDF, PNG, Markdown table or HTML. Presets for VS Code, Gmail, Figma and Chrome. Runs in your browser.',
    lead: 'Type shortcuts one per line, get a clean printable cheat sheet — Mac or Windows symbols, themes, columns — as PDF, PNG or Markdown.',
    cardDesc: 'Shortcuts → printable cheat sheet with keycaps; Mac/Windows symbols, PDF, PNG, Markdown.',
    tags: ['keyboard shortcut cheat sheet', 'cheat sheet maker', 'shortcut cheat sheet generator', 'printable shortcuts', 'keycap generator', 'hotkey list', 'vs code shortcuts pdf', 'mac keyboard symbols', 'shortcut poster', 'notion shortcut table'],
    idle: 'Type a shortcut to begin', sourceLabel: 'Shortcuts', outputLabel: 'Cheat sheet', outputIcon: 'lucide:keyboard', outputEmpty: 'Your cheat sheet renders here as you type',
    downloads: [['png', 'PNG image', 'lucide:image'], ['print', 'Print / save as PDF', 'lucide:printer'], ['md', 'Markdown table (Notion)', 'lucide:file-text'], ['html', 'Standalone HTML', 'lucide:code']],
    sourceHtml: `
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <label class="form-label" for="opt-title"><span>Title</span></label>
                    <input type="text" id="opt-title" class="input-clean" value="VS Code essentials" maxlength="60" autocomplete="off">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="opt-subtitle"><span>Subtitle</span><span class="form-label-desc">Optional</span></label>
                    <input type="text" id="opt-subtitle" class="input-clean" placeholder="The 30 I actually use" maxlength="80" autocomplete="off">
                  </div>
                </div>
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <span class="form-label"><span>Show keys for</span></span>
                    <div class="segmented-group segmented-group-pill" id="seg-os" role="group" aria-label="Platform">
                      <button type="button" class="seg-pill active" data-value="mac">Mac</button>
                      <button type="button" class="seg-pill" data-value="win">Windows</button>
                      <button type="button" class="seg-pill" data-value="both">Both</button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="opt-preset"><span>Start from a preset</span></label>
                    <select id="opt-preset" class="select-clean"><option value="">— keep my list —</option><option value="vscode">VS Code</option><option value="chrome">Chrome</option><option value="gmail">Gmail</option><option value="figma">Figma</option><option value="slack">Slack</option><option value="excel">Excel / Sheets</option><option value="toolity">Toolity</option></select>
                  </div>
                </div>
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Shortcuts</span><span class="form-label-desc" id="input-count">## Heading · Ctrl+K — what it does</span></label>
                  <textarea id="text-input" class="textarea-clean" rows="14" placeholder="## Editing&#10;Ctrl+D — Select next match&#10;Alt+Up — Move line up&#10;Ctrl+K Ctrl+C — Comment (chord)&#10;&#10;## Navigation&#10;Ctrl+P — Quick open" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>`,
    outputHtml: `
                  <div class="ks-stage-wrap"><div class="ks-sheet" id="ks-sheet"></div></div>`,
    settingsSummary: '2 columns · Light · A4',
    settings: `
              <div class="control-item">
                <label for="opt-cols">Columns</label>
                <select id="opt-cols" class="select-clean"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select>
              </div>
              <div class="control-item">
                <label for="opt-theme">Theme</label>
                <select id="opt-theme" class="select-clean"><option value="light" selected>Light</option><option value="dark">Dark</option><option value="paper">Paper</option><option value="brand">Brand colour</option></select>
              </div>
              <div class="control-item">
                <label for="opt-accent">Accent</label>
                <input type="color" id="opt-accent" value="#f4511e">
              </div>
              <div class="control-item">
                <label for="opt-paper">Print size</label>
                <select id="opt-paper" class="select-clean"><option value="a4" selected>A4</option><option value="letter">US Letter</option></select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-numbers"><label for="opt-numbers">Number the shortcuts</label></div>
              <div class="control-item"><input type="checkbox" id="opt-credit" checked><label for="opt-credit">“Made with Toolity” footer</label></div>`,
    guide: [['List your shortcuts', 'One per line: <code>Ctrl+Shift+P — Command palette</code>. Start a line with <code>##</code> to open a group. Chords like <code>Ctrl+K Ctrl+C</code> and alternatives like <code>Ctrl+Y / Ctrl+Shift+Z</code> are understood. Or load a preset and edit it.'],
      ['Pick the look', 'Write keys Windows-style; the <strong>Mac</strong> view turns Ctrl/Alt/Shift into ⌘ ⌥ ⇧ automatically (use <code>Control</code> to force ⌃). Choose columns, theme, accent and whether to number rows.'],
      ['Export', '<strong>Print / PDF</strong> opens a clean A4 or Letter page, <strong>PNG</strong> is pixel-perfect for Slack or a wallpaper, <strong>Markdown</strong> pastes straight into Notion, GitHub or Obsidian, and <strong>HTML</strong> is a self-contained file for your wiki.']],
    faq: [['How are Mac symbols decided?', 'Ctrl becomes ⌘, Alt becomes ⌥, Shift becomes ⇧ and Win/Super becomes ⌘ — that is how almost every cross-platform app maps its shortcuts. Write <code>Control</code> or <code>Cmd</code> explicitly when you need ⌃ or ⌘ regardless of platform. Arrows, Enter, Backspace, Tab, Esc and Space get their standard glyphs.'],
      ['Can I show both Mac and Windows keys?', 'Yes — choose <strong>Both</strong> and each row shows the Mac combination with the Windows one beside it. Handy for team docs where people use different machines.'],
      ['What does the Markdown export look like?', 'A GitHub-flavoured table per group with the keys in backticks, so it renders correctly in Notion, GitHub, Obsidian and most wikis. The Copy button copies the same Markdown.'],
      ['How do I get a PDF?', 'Choose <strong>Print / save as PDF</strong> from the Download menu: a print-ready page opens with your sheet laid out for A4 or Letter; pick “Save as PDF” in the print dialog. Multi-page sheets flow naturally.'],
      ['Can I save my list?', 'Your text stays in the box while the tab is open; copy it into a note to keep it. There is no account — nothing is stored on a server.'],
      PRIVACY_FAQ]
  },
  {
    slug: 'text-to-handwriting', name: 'Text to Handwriting', icon: 'lucide:pen-line', section: 'Generators & Links', split: '40/60', css: true,
    desc: 'Free online text to handwriting converter: turn typed text into realistic handwritten pages — 12 handwriting fonts or your own, ruled / grid / blank paper, ink colours, pen-pressure jitter and a scanner effect. Download as PNG or multi-page PDF. Runs in your browser.',
    lead: 'Type or paste text and get realistic handwritten pages — pick a hand, paper and ink, add natural jitter, then download PNG or a multi-page PDF.',
    cardDesc: '12 handwriting fonts or your own, ruled paper, ink & jitter — PNG / PDF.',
    tags: ['text to handwriting', 'handwriting converter', 'handwritten assignment', 'text to handwritten notes', 'handwriting generator', 'fake handwriting', 'handwriting font', 'ruled paper pdf', 'assignment writer', 'handwritten pdf'],
    idle: 'Type something to write it by hand', sourceLabel: 'Text & style', outputLabel: 'Pages', outputIcon: 'lucide:pen-line', outputEmpty: 'Your handwritten page will appear here',
    file: { accept: '.txt,.md' },
    downloads: [['png', 'This page (PNG)', 'lucide:image'], ['zip', 'All pages (PNG, .zip)', 'lucide:file-archive'], ['pdf', 'All pages (PDF)', 'lucide:file-text']],
    sourceHtml: `
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Text</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="9" placeholder="Paste your notes, essay or assignment. Blank lines start a new paragraph; a line of --- starts a new page." spellcheck="true" data-file-target></textarea>
                </div>${FIELD('hw-header', 'Header line (optional)', 'type="text" placeholder="Name · Roll no · Date" autocomplete="off"', 'top-right of page 1')}
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <label class="form-label" for="hw-font"><span>Handwriting</span></label>
                    <select id="hw-font" class="select-clean">${OPTS(HW_FONTS.map(([v, l]) => [v, l]), 'homemade-apple')}<option value="custom">Your font (upload below)</option></select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="hw-ink"><span>Ink</span></label>
                    <div class="web-inline">
                      <select id="hw-ink" class="select-clean">${OPTS([['#1f3a93', 'Blue'], ['#1a1a1a', 'Black'], ['#b3261e', 'Red'], ['#1b5e20', 'Green'], ['#4a2c2a', 'Brown'], ['custom', 'Custom']], '#1f3a93')}</select>
                      <input type="color" id="hw-ink-pick" class="web-color-input" aria-label="Custom ink colour" value="#1f3a93">
                    </div>
                  </div>
                </div>
                <div class="web-file-row">
                  <button type="button" class="btn-toolbar-sm" id="btn-font-file"><iconify-icon icon="lucide:type" width="14" height="14"></iconify-icon><span>Upload your handwriting font</span></button>
                  <input type="file" id="font-input" accept=".ttf,.otf,.woff,.woff2" hidden>
                  <span class="web-muted" id="font-name">.ttf / .otf · stays in your browser</span>
                </div>
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <label class="form-label" for="hw-paper"><span>Paper</span></label>
                    <select id="hw-paper" class="select-clean">${OPTS([['ruled-margin', 'Ruled with margin'], ['ruled', 'Ruled'], ['grid', 'Grid'], ['blank', 'Blank']], 'ruled-margin')}</select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="hw-paper-color"><span>Paper colour</span></label>
                    <select id="hw-paper-color" class="select-clean">${OPTS([['#ffffff', 'White'], ['#fbf7ec', 'Cream'], ['#fff8c4', 'Yellow pad'], ['#f3f4f6', 'Light grey']], '#ffffff')}</select>
                  </div>
                </div>${RANGE('hw-size', 'Font size', 16, 48, 24, 'px')}${RANGE('hw-jitter', 'Pen pressure & jitter', 0, 100, 40, '%')}`,
    outputHtml: `
                  <div class="hw-pager" id="hw-pager"></div>
                  <div class="hw-stage" id="hw-stage"><canvas id="hw-canvas" aria-label="Handwritten page preview"></canvas></div>`,
    settingsSummary: 'A4 · line height 1.7 · scanner off',
    settings: `
              <div class="control-item">
                <label for="opt-page">Page size</label>
                <select id="opt-page" class="select-clean">${OPTS([['a4', 'A4'], ['letter', 'US Letter'], ['a5', 'A5']], 'a4')}</select>
              </div>
              <div class="control-item">
                <label for="opt-lh">Line height</label>
                <select id="opt-lh" class="select-clean">${OPTS([['1.5', 'Tight (1.5)'], ['1.7', 'Normal (1.7)'], ['2', 'Loose (2.0)']], '1.7')}</select>
              </div>
              <div class="control-item">
                <label for="opt-margin">Margins</label>
                <select id="opt-margin" class="select-clean">${OPTS([['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']], 'normal')}</select>
              </div>${RANGE('opt-lspace', 'Letter spacing', -2, 6, 0, 'px')}${RANGE('opt-wspace', 'Word spacing', -4, 16, 2, 'px')}${CHECK('opt-scan', 'Scanner effect (paper grain, soft shadow, slight skew)', false)}`,
    guide: [['Write or paste', 'Type your text, or drop a .txt / .md file. Blank lines make paragraphs; a line containing only <code>---</code> forces a page break. Add an optional header line (name, roll number, date) for page 1.'], ['Pick the hand, paper and ink', 'Choose one of 12 handwriting styles — or upload your own .ttf/.otf — set the ink colour, paper type and size. Raise <strong>Pen pressure &amp; jitter</strong> for natural variation: every letter gets a tiny rotation, baseline wobble and ink-density change, so no two lines look identical. Settings hold line height, spacing, margins and the scanner effect.'], ['Download', 'Pages paginate automatically; flick through them above the preview. Download the current page as PNG, every page as a ZIP of PNGs, or everything as one PDF sized exactly A4 / Letter / A5 — ready to print or submit.']],
    faq: [['How do I make it look less like a font?', 'Three things matter: jitter (40–70 % is the sweet spot), a hand that is a little irregular (Homemade Apple, Nothing You Could Do, Zeyada), and the scanner effect, which adds paper grain, a soft page shadow and a slight skew like a phone photo of a notebook. Blue ink on ruled paper with the text sitting on the lines completes it.'], ['Can I use my own handwriting?', 'Yes — upload a .ttf or .otf font of your handwriting (free services like Calligraphr turn a scanned sample into a font). The file is loaded with the browser’s FontFace API and never leaves your device. It is not saved between visits.'], ['Why are some characters boxes or in a different style?', 'Decorative handwriting fonts often cover only Latin letters. Characters outside the font (Devanagari, CJK, some symbols) fall back to a system font. Use the upload option with a font that covers your script.'], ['What resolution are the downloads?', 'Pages render at 200 dpi (A4 = 1654 × 2339 px), which prints crisply. The PDF embeds those images at true A4 / Letter / A5 size using <a href="https://github.com/parallax/jsPDF" target="_blank" rel="noopener">jsPDF</a>, loaded only when you download a PDF.'], ['Is there a length limit?', 'No fixed limit — a 50-page essay works, but each page is rendered as an image, so very long documents take a few seconds to export and the ZIP/PDF grows by roughly 300–500 KB per page.'], PRIVACY_FAQ]
  },
  {
    slug: 'countdown-page-maker', name: 'Countdown Page Maker', icon: 'lucide:timer', section: 'Generators & Links', split: '40/60', css: true, libs: ['qr'],
    desc: 'Free online countdown page maker: create a full-screen countdown to any event — launch, exam, wedding, sale — with your title, colours and time zone, and share it as a link or QR code. No account, nothing stored; the page lives in the link. Add the event to your calendar in one click.',
    lead: 'Name the event, set the date and colours — get a full-screen countdown page you can share as a link or QR, plus a calendar file.',
    cardDesc: 'Full-screen shareable countdown — link, QR code and .ics in one click.',
    tags: ['countdown page', 'countdown timer link', 'event countdown', 'shareable countdown', 'launch countdown', 'exam countdown', 'wedding countdown', 'countdown qr code', 'countdown maker', 'days until'],
    idle: 'Name the event and pick a date', sourceLabel: 'Event', outputLabel: 'Your page', outputIcon: 'lucide:timer', outputEmpty: 'The live countdown page will appear here',
    downloads: [['qr', 'QR code (PNG)', 'lucide:qr-code'], ['ics', 'Calendar event (.ics)', 'lucide:calendar-plus'], ['txt', 'Link (.txt)', 'lucide:link']],
    sourceHtml: `${FIELD('cd-title', 'Event title', 'type="text" placeholder="Product launch" maxlength="80" autocomplete="off"')}
                <div class="web-convert-row web-convert-row-2">${FIELD('cd-to', 'Date & time', 'type="datetime-local"')}
                  <div class="form-group">
                    <label class="form-label" for="cd-tz"><span>Time zone</span></label>
                    <select id="cd-tz" class="select-clean"><option value="local" selected>Viewer’s local time</option></select>
                  </div>
                </div>${FIELD('cd-done', 'Message when it ends', 'type="text" placeholder="We’re live!" maxlength="80" autocomplete="off"')}
                <div class="form-group">
                  <span class="form-label"><span>Style</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-variant" role="group" aria-label="Style">
                    <button type="button" class="seg-pill active" data-value="flip">Flip clock</button>
                    <button type="button" class="seg-pill" data-value="minimal">Minimal</button>
                    <button type="button" class="seg-pill" data-value="compact">Compact</button>
                  </div>
                </div>
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <label class="form-label" for="cd-theme"><span>Theme</span></label>
                    <select id="cd-theme" class="select-clean">${OPTS([['dark', 'Dark'], ['light', 'Light'], ['auto', 'Match viewer']], 'dark')}</select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="cd-font"><span>Font</span></label>
                    <select id="cd-font" class="select-clean">${OPTS([['inter', 'Inter'], ['space-grotesk', 'Space Grotesk'], ['dm-sans', 'DM Sans'], ['playfair', 'Playfair Display'], ['jetbrains-mono', 'JetBrains Mono'], ['serif', 'System serif'], ['mono', 'System mono']], 'inter')}</select>
                  </div>
                </div>
                <div class="web-convert-row web-convert-row-2">${COLOR_INPUT('cd-accent', 'Accent colour', '#F4511E')}${COLOR_INPUT('cd-bg', 'Background (optional)', 'theme default')}
                </div>`,
    outputHtml: `
                  <div class="cd-frame-wrap"><iframe id="cd-frame" class="cd-frame" title="Countdown page preview" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe></div>
                  <div class="form-group">
                    <label class="form-label" for="cd-link"><span>Shareable link</span><span class="form-label-desc">everything lives in the URL</span></label>
                    <div class="web-inline"><input type="text" id="cd-link" class="input-clean" readonly><a id="cd-open" class="web-row-btn" href="#" target="_blank" rel="noopener" title="Open full screen" aria-label="Open full screen"><iconify-icon icon="lucide:maximize-2" width="16" height="16"></iconify-icon></a></div>
                  </div>
                  <div class="cd-share">
                    <canvas id="cd-qr" class="cd-qr" width="160" height="160" aria-label="QR code for the countdown link"></canvas>
                    <div class="web-tags" id="cd-share-links"></div>
                  </div>`,
    settingsSummary: 'days · hours · minutes · seconds · Toolity badge',
    settings: `${CHECK('opt-days', 'Show days', true)}${CHECK('opt-hours', 'Show hours', true)}${CHECK('opt-minutes', 'Show minutes', true)}${CHECK('opt-seconds', 'Show seconds', true)}${CHECK('opt-badge', 'Show the small “Toolity” badge on the page', true)}`,
    guide: [['Describe the event', 'Give it a title, a date and time, and — if the audience is spread out — a time zone so everyone counts down to the same instant. Add the message that replaces the clock when it hits zero.'], ['Style the page', 'Pick flip-clock, minimal or compact, dark or light, a font and an accent colour. The preview on the right is the real page, so what you see is what people get.'], ['Share it', 'Copy the link, open it full screen for a projector or lobby display, download the QR code for posters, or send it with the share chips. The .ics file adds the event to Google / Apple / Outlook calendars. Nothing is stored anywhere — the link <em>is</em> the page.']],
    faq: [['Where is the countdown stored?', 'Nowhere. Every setting is encoded in the link itself, so it works forever, needs no account and cannot expire. The page is served by Toolity’s static site, which has no database — if you lose the link, make a new one in seconds.'], ['How do time zones work?', '“Viewer’s local time” means the date you entered is interpreted in each viewer’s own zone (good for “midnight on New Year’s Eve wherever you are”). Pick a specific zone for a single global moment such as a product launch at 9:00 IST — every visitor then sees the same remaining time.'], ['Can I embed it in my website or Notion?', 'Yes — the same page is the Countdown widget. Paste the link into an iframe, or open the <a href="/widgets/countdown/">Countdown Widget</a> builder for ready-made embed code with the same settings.'], ['What happens when it reaches zero?', 'The clock is replaced by your end message (or “Time’s up” if you left it blank). The page keeps working after the date, so a “days since” style page is just a countdown to a past date.'], ['Does the QR code expire?', 'No — it encodes the link, nothing else. Print it on a poster or invite; it keeps working as long as toolity.in does.'], PRIVACY_FAQ]
  },
  {
    slug: 'schema-markup-generator', name: 'Schema Markup Generator', icon: 'lucide:braces', section: 'SEO & Site Helpers', split: '50/50', css: true,
    desc: 'Free online schema markup generator: build valid JSON-LD structured data for Organization, Local Business, Article, Product, FAQ, How-to, Event, Breadcrumbs, Recipe, Video, Job posting, Person and Website — with required-field checks — and copy the script tag. Runs in your browser.',
    lead: 'Pick a type, fill in the fields, copy the JSON-LD — with required fields and formats checked before you paste it into your page.',
    cardDesc: 'JSON-LD for 13 schema.org types with required-field checks.',
    tags: ['schema markup generator', 'json-ld generator', 'structured data generator', 'faq schema', 'article schema', 'product schema', 'local business schema', 'breadcrumb schema', 'rich results', 'schema.org'],
    idle: 'Pick a type and fill the required fields', sourceLabel: 'Fields', outputLabel: 'JSON-LD', outputIcon: 'lucide:braces', outputEmpty: 'Your structured data will appear here',
    downloads: [['html', 'Script tag (.html)', 'lucide:code-xml'], ['json', 'JSON only (.json)', 'lucide:braces']],
    sourceHtml: `
                <div class="form-group">
                  <label class="form-label" for="sc-type"><span>Schema type</span></label>
                  <select id="sc-type" class="select-clean">${OPTS(SCHEMA_TYPES, 'Article')}</select>
                </div>
                <div class="web-group" id="sc-fields"></div>`,
    outputHtml: `
                  <div class="web-tags" id="output-issues"></div>
                  <pre class="web-code" id="output-text"></pre>
                  <p class="web-muted">Validate it with <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener">Google’s Rich Results Test</a> or the <a href="https://validator.schema.org/" target="_blank" rel="noopener">Schema.org validator</a> — paste the code there; nothing is sent from here.</p>`,
    settingsSummary: '2-space indent · with @context',
    settings: `
              <div class="control-item">
                <label for="opt-indent">Indent</label>
                <select id="opt-indent" class="select-clean">${OPTS([['2', '2 spaces'], ['4', '4 spaces'], ['0', 'Minified']], '2')}</select>
              </div>${CHECK('opt-context', 'Include "@context": "https://schema.org"', true)}${CHECK('opt-id', 'Add an @id based on the URL field', false)}`,
    guide: [['Choose the type', 'Article for posts, Product for shop pages, FAQ and How-to for help content, Event, Local Business, Recipe, Video, Job posting, Breadcrumbs, Website (adds the sitelinks search box), Organization or Person. The form changes to the fields that type needs; required ones are marked.'], ['Fill it in', 'Repeatable sections (FAQ questions, How-to steps, breadcrumb items) have Add / remove buttons. Dates use the picker (ISO 8601 comes out), prices and ratings are checked for range, URLs must be absolute. Warnings appear above the code as you type.'], ['Paste and test', 'Copy the <code>&lt;script type="application/ld+json"&gt;</code> block into your page’s <code>&lt;head&gt;</code> (or before <code>&lt;/body&gt;</code>), publish, then test the live URL in Google’s Rich Results Test. One block per entity — repeat for other types on the same page.']],
    faq: [['Which types can show rich results in Google?', 'Article, Product, FAQ, How-to, Event, Local Business, Recipe, Video, Job posting and Breadcrumbs are all documented Google rich-result types (eligibility rules change — FAQ rich results, for example, are now limited to authoritative government and health sites). Organization, Person and Website feed the Knowledge Panel and sitelinks search box rather than a visible snippet.'], ['Do I need every field?', 'Only the ones marked required — those are what Google lists as required for the rich result. Recommended fields raise the chance of a richer display; leave the rest blank and they are simply omitted from the output.'], ['Where exactly does the code go?', 'Anywhere in the HTML, but <code>&lt;head&gt;</code> is conventional. JSON-LD does not need to wrap visible content, unlike Microdata, which is why Google recommends it. If your CMS has a “custom head code” field, paste it there.'], ['Can I combine several types in one script?', 'Yes — put them in a JSON array or an <code>@graph</code>. This tool outputs one entity at a time to keep the form manageable; generate each, then combine. Reference one from another with the <code>@id</code> option (e.g. an Article’s publisher pointing at your Organization).'], ['Why does my FAQ schema not show up?', 'Since 2023 Google shows FAQ rich results only for well-known authoritative sites, and How-to results only on desktop. Valid markup is still useful for other search engines and AI assistants, but do not expect the dropdown in Google for a typical site.'], PRIVACY_FAQ]
  },
  {
    slug: 'utm-link-builder', name: 'UTM Link Builder', icon: 'lucide:link-2', section: 'Generators & Links', split: '50/50', css: true, libs: ['qr'],
    desc: 'Free online UTM link builder: add utm_source, utm_medium, utm_campaign, utm_term, utm_content and custom parameters to any URL, with platform presets, lowercase and space normalisation, saved presets, bulk tagging and a ready QR code. Runs in your browser — nothing is stored on a server.',
    lead: 'Tag campaign links the consistent way: presets for Google Ads, Meta, LinkedIn and email, saved sources, bulk mode and a QR code for print.',
    cardDesc: 'Campaign URLs with presets, normalisation, saved sources, bulk and QR.',
    tags: ['utm', 'utm builder', 'utm link', 'campaign url builder', 'utm_source', 'utm_medium', 'utm_campaign', 'google analytics', 'ga4', 'tracking link', 'bulk utm', 'qr code', 'marketing'],
    sourceLabel: 'Campaign', outputLabel: 'Tagged link', outputIcon: 'lucide:link-2', outputEmpty: 'Enter a URL and campaign details', idle: 'Enter a URL',
    downloads: [['txt', 'Link (.txt)', 'lucide:file-text'], ['csv', 'Table (.csv)', 'lucide:table'], ['png', 'QR code (.png)', 'lucide:qr-code']],
    sourceHtml: `
                <div class="form-group">
                  <span class="form-label"><span>Mode</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Mode">
                    <button type="button" class="seg-pill active" data-value="single">One link</button>
                    <button type="button" class="seg-pill" data-value="bulk">Bulk</button>
                  </div>
                </div>
                <div class="form-group" id="utm-url-group">
                  <label class="form-label" for="utm-url"><span>Website URL</span><span class="form-label-desc">existing utm_* are replaced</span></label>
                  <input type="url" id="utm-url" class="input-clean" placeholder="https://example.com/landing-page" spellcheck="false" autocomplete="off" autocapitalize="off" inputmode="url">
                </div>
                <div class="form-group" id="utm-urls-group" hidden>
                  <label class="form-label" for="utm-urls"><span>URLs — one per line</span><span class="form-label-desc">optionally “url, content” to vary utm_content per line</span></label>
                  <textarea id="utm-urls" class="textarea-clean" rows="6" placeholder="https://example.com/&#10;https://example.com/pricing, pricing-cta&#10;https://example.com/blog/post, blog-banner" spellcheck="false" autocapitalize="off"></textarea>
                </div>
                <div class="form-group">
                  <span class="form-label"><span>Platform preset</span><span class="form-label-desc">fills source + medium</span></span>
                  <div class="web-tags utm-presets" role="group" aria-label="Platform presets">${[['google', 'cpc', 'Google Ads'], ['facebook', 'paid_social', 'Meta Ads'], ['instagram', 'social', 'Instagram'], ['linkedin', 'social', 'LinkedIn'], ['x', 'social', 'X'], ['youtube', 'video', 'YouTube'], ['newsletter', 'email', 'Newsletter'], ['whatsapp', 'messaging', 'WhatsApp'], ['partner', 'referral', 'Partner'], ['qr', 'offline', 'Print / QR']].map(([s, m, l]) => `<button type="button" class="web-tag utm-preset" data-source="${s}" data-medium="${m}">${l}</button>`).join('')}</div>
                </div>
                <div class="web-convert-row web-convert-row-2">
                  ${FIELD('utm-source', 'Source *', 'type="text" list="utm-source-list" placeholder="google, newsletter, linkedin" spellcheck="false" autocapitalize="off"', 'where the traffic comes from')}
                  ${FIELD('utm-medium', 'Medium *', 'type="text" list="utm-medium-list" placeholder="cpc, email, social" spellcheck="false" autocapitalize="off"', 'the channel')}
                </div>
                <datalist id="utm-source-list"><option value="google"><option value="bing"><option value="facebook"><option value="instagram"><option value="linkedin"><option value="x"><option value="youtube"><option value="newsletter"><option value="whatsapp"><option value="telegram"><option value="reddit"><option value="partner"><option value="qr"></datalist>
                <datalist id="utm-medium-list"><option value="cpc"><option value="paid_social"><option value="social"><option value="email"><option value="referral"><option value="display"><option value="video"><option value="affiliate"><option value="messaging"><option value="offline"><option value="organic"></datalist>
                ${FIELD('utm-campaign', 'Campaign *', 'type="text" placeholder="spring_sale_2026" spellcheck="false" autocapitalize="off"', 'promotion or product name')}
                <div class="web-convert-row web-convert-row-2">
                  ${FIELD('utm-term', 'Term', 'type="text" placeholder="running+shoes" spellcheck="false" autocapitalize="off"', 'paid keywords')}
                  ${FIELD('utm-content', 'Content', 'type="text" placeholder="hero_button" spellcheck="false" autocapitalize="off"', 'A/B variant or placement')}
                </div>
                <details class="utm-more">
                  <summary>More parameters</summary>
                  <div class="web-convert-row web-convert-row-2">
                    ${FIELD('utm-id', 'Campaign ID (utm_id)', 'type="text" placeholder="abc.123" spellcheck="false" autocapitalize="off"')}
                    ${FIELD('utm-source-platform', 'Source platform', 'type="text" placeholder="Search Ads 360" spellcheck="false"')}
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="utm-custom"><span>Custom parameters</span><span class="form-label-desc">key=value, one per line (ref=, fbclid=, gclid=…)</span></label>
                    <textarea id="utm-custom" class="textarea-clean" rows="2" placeholder="ref=partner42&#10;promo=SPRING" spellcheck="false" autocapitalize="off"></textarea>
                  </div>
                </details>
                <div class="form-group">
                  <span class="form-label"><span>Saved presets</span><span class="form-label-desc">kept on this device only</span></span>
                  <div class="web-inline">
                    <select id="utm-saved" class="select-clean" aria-label="Load a saved preset"><option value="">Load a saved preset…</option></select>
                    <button type="button" class="btn-toolbar-sm" id="btn-save-preset" title="Save source, medium, campaign, term and content under a name"><iconify-icon icon="lucide:bookmark-plus" width="14" height="14"></iconify-icon><span>Save</span></button>
                    <button type="button" class="btn-toolbar-sm" id="btn-del-preset" title="Delete the selected preset" disabled><iconify-icon icon="lucide:trash-2" width="14" height="14"></iconify-icon></button>
                  </div>
                </div>`,
    outputHtml: `
                  <button type="button" class="utm-final" id="output-final" title="Click to copy"></button>
                  <div class="web-tags" id="output-flags"></div>
                  <div class="utm-result-grid">
                    <div class="web-table-wrap"><table class="web-table" id="output-params"><tbody></tbody></table></div>
                    <canvas id="output-qr" class="utm-qr" width="160" height="160" aria-label="QR code of the tagged link"></canvas>
                  </div>
                  <div class="web-table-wrap" id="output-bulk-wrap" hidden><table class="web-table utm-bulk" id="output-bulk"><thead><tr><th>#</th><th>Tagged link</th></tr></thead><tbody></tbody></table></div>`,
    settingsSummary: 'lowercase · spaces → _ · keep #fragment',
    settings: `${CHECK('opt-lower', 'Lowercase all values (GA4 treats “Google” and “google” as different sources)', true)}
              <div class="control-item">
                <label for="opt-space">Replace spaces with</label>
                <select id="opt-space" class="select-clean">${OPTS([['_', 'underscore _'], ['-', 'hyphen -'], ['%20', 'keep (encoded %20)'], ['+', 'plus +']], '_')}</select>
              </div>${CHECK('opt-strip', 'Remove existing utm_* and click IDs (gclid, fbclid…) from the pasted URL', true)}${CHECK('opt-fragment', 'Keep the #fragment at the end', true)}${CHECK('opt-qr', 'Show a QR code for the link', true)}`,
    guide: [['Paste the destination', 'Enter the landing-page URL. Existing utm_* tags and click IDs are stripped (toggle in Settings) so you never double-tag. Pick a platform preset to fill source and medium with the conventional values, or type your own — the suggestions follow GA4’s default channel grouping.'], ['Name the campaign', 'Source, medium and campaign are required; term and content are optional. Values are lower-cased and spaces are replaced so “Spring Sale” and “spring_sale” don’t split your reports. Save a frequently used combination as a preset — it stays in this browser only.'], ['Copy, QR or bulk', 'Click the big link to copy it. The QR code is ready for posters and packaging (download as PNG). Switch to <strong>Bulk</strong> to tag many URLs at once — one per line, optionally with a different utm_content — and download the table as CSV.']],
    faq: [['Which parameters does Google Analytics read?', '<code>utm_source</code>, <code>utm_medium</code> and <code>utm_campaign</code> are the core three (GA4 needs source and medium to attribute a session). <code>utm_term</code> and <code>utm_content</code> add keyword and creative detail; <code>utm_id</code> and <code>utm_source_platform</code> are newer GA4 fields used with cost-data imports. Custom parameters are passed through for your own tooling but GA ignores them unless you register them.'], ['What should I put in medium?', 'Use the values GA4 maps to channels automatically: <code>cpc</code> or <code>paid_search</code> for paid search, <code>paid_social</code> for paid social, <code>social</code> for organic social posts, <code>email</code>, <code>referral</code>, <code>display</code>, <code>video</code>, <code>affiliate</code>. The presets follow that list; inventing new words lands traffic in “Unassigned”.'], ['Why lowercase everything?', 'Analytics tools are case-sensitive: <code>Newsletter</code> and <code>newsletter</code> become two rows. Lower-casing and replacing spaces with underscores keeps every report tidy. Turn it off in Settings if your team has a different convention.'], ['Where are saved presets stored?', 'In your browser’s localStorage — never on a server. They survive reloads on this device and browser only; clearing site data removes them. A preset stores source, medium, campaign, term and content, not the URL, so one “Newsletter” preset works for every link you send.'], ['Can I tag many links at once?', 'Yes — Bulk mode accepts one URL per line and applies the same source, medium and campaign to each. Add a comma and a value after a URL to set a per-line <code>utm_content</code> (e.g. <code>https://example.com/pricing, pricing-cta</code>). The CSV download lists the original URL, every parameter and the final link.'], PRIVACY_FAQ]
  },
  {
    slug: 'qr-barcode-scanner', name: 'QR & Barcode Scanner', icon: 'lucide:scan-line', section: 'Generators & Links', split: '50/50', css: true,
    desc: 'Free online QR code and barcode scanner: read QR, EAN, UPC, Code 128, Code 39, Data Matrix, PDF417 and more from your camera, an image file, a screenshot or the clipboard. Wi-Fi, vCard, UPI, links and events are decoded into one-tap actions. Runs in your browser — images never leave your device.',
    lead: 'Point your camera or drop a screenshot — QR codes and barcodes are decoded on your device, with one-tap actions for links, Wi-Fi, contacts and UPI.',
    cardDesc: 'Scan QR and barcodes from camera, image or clipboard — links, Wi-Fi, vCard, UPI.',
    tags: ['qr scanner', 'qr code reader', 'barcode scanner', 'barcode reader', 'scan qr from image', 'scan screenshot', 'ean', 'upc', 'code 128', 'data matrix', 'pdf417', 'wifi qr', 'vcard', 'upi qr', 'camera'],
    sourceLabel: 'Scan', outputLabel: 'Results', outputIcon: 'lucide:scan-line', outputEmpty: 'Decoded codes appear here', idle: 'Open an image or start the camera',
    file: { accept: 'image/*', multiple: true },
    downloads: [['txt', 'Latest result (.txt)', 'lucide:file-text'], ['csv', 'All results (.csv)', 'lucide:table'], ['json', 'All results (.json)', 'lucide:braces']],
    sourceHtml: `
                <p class="web-muted qs-hint">or paste a screenshot with <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>V</kbd></p>
                <div class="qs-stage" id="qs-stage">
                  <video id="cam-video" class="qs-video" autoplay playsinline muted hidden></video>
                  <canvas id="img-canvas" class="qs-image" hidden aria-label="Scanned image"></canvas>
                  <canvas id="qs-overlay" class="qs-overlay" hidden aria-hidden="true"></canvas>
                  <div class="qs-stage-empty" id="qs-stage-empty"><iconify-icon icon="lucide:camera" width="28" height="28"></iconify-icon><span>Camera preview or image</span></div>
                </div>
                <div class="qs-camrow">
                  <button type="button" class="btn-toolbar-sm btn-brand-sm" id="btn-cam"><iconify-icon icon="lucide:camera" width="14" height="14"></iconify-icon><span>Start camera</span></button>
                  <select id="cam-select" class="select-clean" aria-label="Camera" hidden></select>
                  <button type="button" class="btn-toolbar-sm" id="btn-torch" title="Torch" aria-label="Toggle torch" hidden><iconify-icon icon="lucide:flashlight" width="14" height="14"></iconify-icon></button>
                  <button type="button" class="btn-toolbar-sm" id="btn-rescan" hidden><iconify-icon icon="lucide:refresh-cw" width="14" height="14"></iconify-icon><span>Scan again</span></button>
                </div>
                <p class="web-muted" id="qs-status"></p>`,
    outputHtml: `
                  <div class="qs-results" id="output-results"></div>`,
    settingsSummary: 'All formats · beep on · auto-pause',
    settings: `
              <div class="control-item">
                <label for="opt-formats">Formats to look for</label>
                <select id="opt-formats" class="select-clean">${OPTS([['all', 'All (QR, 1D barcodes, Data Matrix, PDF417, Aztec)'], ['qr', 'QR codes only (faster)'], ['1d', '1D retail / logistics barcodes only'], ['2d', '2D codes only (QR, Data Matrix, Aztec, PDF417)']], 'all')}</select>
              </div>${CHECK('opt-beep', 'Beep when a code is found', true)}${CHECK('opt-pause', 'Pause the camera after a successful scan', true)}${CHECK('opt-dedupe', 'Ignore repeats of a code already in the list', true)}`,
    guide: [['Choose a source', 'Click <strong>Start camera</strong> (the back camera is preferred on phones — switch cameras or turn on the torch from the row below the preview), or <strong>Open file</strong>, drop an image, or paste a screenshot straight from the clipboard. Several images can be dropped at once.'], ['Read the result', 'Every code found is listed with its format and content. Links open in a new tab, Wi-Fi codes show the network and password, vCard / MeCard become a downloadable contact, UPI codes show payee and amount, calendar events save as .ics, and phone / SMS / email codes get the right button.'], ['Copy or export', 'Copy any single result, or download the latest as text and the whole session as CSV / JSON. Nothing is stored — reload the page and the list is gone.']],
    faq: [['Which codes can it read?', 'QR Code, Micro QR, Data Matrix, Aztec, PDF417, and the 1D families EAN-13 / EAN-8, UPC-A / UPC-E, Code 128, Code 39, Code 93, Codabar, ITF and DataBar. The browser’s own <code>BarcodeDetector</code> is used when available (Chrome on Android / macOS, Safari); elsewhere the ZXing library is loaded as WebAssembly (about 1 MB, once) and decodes on your device.'], ['Why does the camera not start?', 'Camera access needs a secure page (https) and your permission — look for the camera icon in the address bar. On iPhone, Safari and Chrome both work; inside some in-app browsers (Instagram, Facebook) the camera API is blocked, so open the page in the real browser. If you have no camera, use a file or paste a screenshot.'], ['The code is in a photo but nothing is found — what helps?', 'Crop so the code fills more of the frame, make sure it is in focus and not glaring, and keep some light margin around it. Tiny codes in a full-page screenshot can be below the decoder’s minimum size — zoom in and take the screenshot again. Inverted (white-on-black) 1D barcodes are not read.'], ['Is the scanned content safe to open?', 'The decoder only reads text; nothing runs. Links are shown in full before you open them, and they open in a new tab with <code>noopener</code>. Treat QR codes on posters like any unknown link — check the domain first.'], ['Does anything get uploaded or saved?', 'No. Frames and images are decoded in your browser and never sent anywhere; results live in the page only until you reload or press Reset. The ZXing fallback is a static file fetched from a CDN, it receives no image data.'], ['Can it read a Wi-Fi or UPI code and connect or pay?', 'It shows the network name, security type and password (with a copy button) — browsers cannot join Wi-Fi for you. UPI codes show the payee and amount with an <em>Open</em> button that hands the <code>upi://</code> link to an installed payment app on Android.']]
  }
];

const GEN_TOOLS = [
  {
    slug: 'share-link-generator', name: 'Share & Message Link Generator', icon: 'lucide:share-2', section: 'Generators & Links',
    desc: 'Free share link generator: turn a URL and message into ready-to-use share links for WhatsApp, Telegram, X, Facebook, LinkedIn, Reddit, Pinterest, email and SMS — plus a copy-paste share-buttons HTML snippet. In your browser.',
    lead: 'Type a link and a message once — get a working share link for every app, plus share buttons for your site.',
    cardDesc: 'One link and message → share links for WhatsApp, X, Telegram, SMS and more.',
    tags: ['share link generator', 'social share links', 'whatsapp share link', 'telegram share link', 'twitter share link', 'facebook share link', 'linkedin share link', 'sms link', 'share buttons html'],
    idle: 'Add a link or a message to begin', sourceLabel: 'What to share', outputLabel: 'Share links', outputIcon: 'lucide:share-2', outputEmpty: 'Share links for each app will appear here',
    downloads: [['txt', 'All links (.txt)', 'lucide:file-text'], ['html', 'Share buttons (.html)', 'lucide:code']],
    sourceHtml: `${FIELD('url-input', 'Link to share', 'type="url" inputmode="url" spellcheck="false" autocapitalize="off" placeholder="https://example.com/article"')}
                <div class="form-group">
                  <label class="form-label" for="text-input"><span>Message</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="3" placeholder="Check this out — it saved me an hour today."></textarea>
                </div>${FIELD('title-input', 'Title', 'type="text" placeholder="Used by Reddit, Pinterest and as the email subject"', 'Optional')}${FIELD('tags-input', 'Hashtags', 'type="text" spellcheck="false" autocapitalize="off" placeholder="launch, privacy"', 'X only · optional')}${FIELD('phone-input', 'SMS number', 'type="tel" inputmode="tel" placeholder="+91 98765 43210"', 'Optional')}`,
    outputHtml: `
                  <div class="web-rows" id="output-rows"></div>`,
    settingsSummary: 'All 9 apps · universal SMS',
    settings: `
              <div class="web-checks" role="group" aria-label="Apps to include">${SHARE_PLATFORMS.map(([v, l]) => CHECK('opt-' + v, l, true)).join('')}
              </div>
              <div class="control-item">
                <label for="opt-smsstyle">SMS link style</label>
                <select id="opt-smsstyle" class="select-clean">${OPTS([['universal', 'Universal (?&body=)'], ['ios', 'iPhone only (&body=)'], ['android', 'Android only (?body=)']], 'universal')}</select>
              </div>`,
    guide: [['Add your link and message', 'Paste the page you want to share and write the message people will see. A title, hashtags and an SMS number are optional extras.'], ['Get a link for every app', 'Each app gets its own correctly encoded link with Copy and Open buttons. Apps that only accept a link (Facebook, LinkedIn) ignore the message — that is their rule, not ours.'], ['Use them anywhere', 'Paste links into emails, bios, QR codes or buttons. Download the share-buttons HTML for your website: plain links, no scripts and no trackers.']],
    faq: [['Why doesn’t Facebook or LinkedIn show my message?', 'Both only accept a URL in share links and read the title, description and image from the page’s Open Graph tags. Check how your page will look with the <a href="/labs/open-graph-preview/">Open Graph Preview</a>.'], ['What is the difference from the WhatsApp Link Creator?', 'This tool makes a WhatsApp <em>share</em> link — the sender picks who to send it to. The <a href="/labs/whatsapp-link-creator/">WhatsApp Link Creator</a> opens a chat with one specific phone number.'], ['Which SMS style should I use?', 'iPhones expect <code>sms:number&amp;body=</code> and Android expects <code>sms:number?body=</code>. The universal form <code>?&amp;body=</code> works on both in current versions, so it is the default; pick a specific style only if you know the device.'], ['Do the share buttons track clicks?', 'No. The HTML snippet is plain <code>&lt;a&gt;</code> links with <code>rel="noopener noreferrer"</code> — no JavaScript, no third-party scripts, no tracking pixels. Style them with your own CSS.'], PRIVACY_FAQ]
  },
  {
    slug: 'youtube-link-generator', name: 'YouTube Link & Embed Generator', icon: 'lucide:youtube', section: 'Generators & Links', css: true,
    desc: 'Free YouTube link and embed code generator: make timestamp links that start at a set time, and iframe embed code with start/end, autoplay, mute, loop, captions and privacy-enhanced mode. Works with Shorts and youtu.be links.',
    lead: 'Paste any YouTube link — get a link that starts at the right second and embed code with exactly the options you want.',
    cardDesc: 'Start-at-time links and embed code with autoplay, loop and privacy mode.',
    tags: ['youtube timestamp link', 'youtube start time link', 'youtube embed code generator', 'youtube iframe', 'youtube embed autoplay', 'youtube loop embed', 'youtube-nocookie', 'youtube shorts embed', 'youtu.be link'],
    idle: 'Paste a YouTube link to begin', sourceLabel: 'Video', outputLabel: 'Links & embed code', outputIcon: 'lucide:youtube', outputEmpty: 'Links and embed code will appear here',
    sourceHtml: `${FIELD('url-input', 'YouTube link or video ID', 'type="url" inputmode="url" spellcheck="false" autocapitalize="off" placeholder="https://youtu.be/dQw4w9WgXcQ or a Shorts link"')}
                <div class="web-convert-row web-convert-row-2">${FIELD('start-input', 'Start at', 'type="text" inputmode="numeric" spellcheck="false" placeholder="1:23"', 'Optional')}${FIELD('end-input', 'End at', 'type="text" inputmode="numeric" spellcheck="false" placeholder="2:10"', 'Embed only')}
                </div>
                <div class="yt-preview" id="yt-preview" hidden>
                  <button type="button" class="yt-thumb" id="btn-preview" aria-label="Play preview with these settings">
                    <img id="yt-thumb-img" alt="Video thumbnail" width="480" height="360" loading="lazy" referrerpolicy="no-referrer">
                    <span class="yt-play"><iconify-icon icon="lucide:play" width="26" height="26"></iconify-icon></span>
                  </button>
                  <span class="web-muted">Click to play the embed with your settings</span>
                </div>`,
    outputHtml: `
                  <div class="web-rows" id="output-rows"></div>`,
    settingsSummary: 'Privacy mode · responsive',
    settings: `${CHECK('opt-nocookie', 'Privacy-enhanced mode (youtube-nocookie.com)', true)}${CHECK('opt-responsive', 'Responsive width (fills its container, 16:9)', true)}${CHECK('opt-autoplay', 'Autoplay', false)}${CHECK('opt-mute', 'Start muted', false)}${CHECK('opt-loop', 'Loop', false)}${CHECK('opt-nocontrols', 'Hide player controls', false)}${CHECK('opt-cc', 'Show captions by default', false)}
              <div class="control-item">
                <label for="opt-title">Video title (for accessibility)</label>
                <input type="text" id="opt-title" class="input-clean" placeholder="YouTube video player" autocomplete="off">
              </div>`,
    guide: [['Paste the video', 'Any YouTube address works — watch pages, youtu.be, Shorts, live, embed links or just the 11-character ID. A thumbnail confirms it is the right video.'], ['Set the times', 'Type when it should start (and, for embeds, stop) as <code>1:23</code>, <code>83</code> or <code>1m23s</code>. Open Settings for autoplay, mute, loop, captions and privacy mode.'], ['Copy what you need', 'Copy the short link, the full link, the iframe code or a Markdown thumbnail link. Click the thumbnail to test the embed with your exact settings.']],
    faq: [['Why does autoplay not start?', 'Browsers block videos that autoplay with sound. Tick <strong>Start muted</strong> together with Autoplay and it will start on every modern browser.'], ['Why does loop add a playlist parameter?', 'YouTube only loops an embedded video when it is also given a playlist — so the tool adds <code>playlist=</code> with the same video ID. That is the documented way to loop one video.'], ['What does privacy-enhanced mode do?', 'The embed loads from youtube-nocookie.com, so YouTube does not set tracking cookies until the visitor presses play. It is on by default.'], ['Does the end time work on share links?', 'No — YouTube supports an end time only in embeds. Share links accept a start time (<code>?t=</code>).'], ['Does this page contact YouTube?', 'Only to show the video’s thumbnail image, and to play the preview if you click it. Building the links and embed code happens entirely in your browser.']]
  },
  {
    slug: 'password-generator', name: 'Password Generator', icon: 'lucide:key-round', section: 'Generators & Links', css: true,
    desc: 'Free strong password generator: random passwords, memorable passphrases (EFF word list) and PINs made with your browser’s cryptographic random generator, with a strength meter and bulk generation. Nothing is sent or stored.',
    lead: 'Strong random passwords, easy-to-type passphrases or PINs — generated on your device and never stored.',
    cardDesc: 'Strong passwords, passphrases and PINs with a strength meter.',
    tags: ['password generator', 'strong password generator', 'random password', 'passphrase generator', 'diceware', 'pin generator', 'secure password', 'password strength'],
    idle: 'Generating…', sourceLabel: 'Options', outputLabel: 'Password', outputIcon: 'lucide:key-round', outputEmpty: 'Your password will appear here',
    action: 'New password', actionIcon: 'lucide:refresh-cw',
    sourceHtml: `
                <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Type">
                  <button type="button" class="seg-pill active" data-value="password">Password</button>
                  <button type="button" class="seg-pill" data-value="passphrase">Passphrase</button>
                  <button type="button" class="seg-pill" data-value="pin">PIN</button>
                </div>
                <div class="web-group" id="grp-password">${RANGE('opt-length', 'Length', 4, 128, 20)}
                  <div class="web-checks" role="group" aria-label="Characters">${CHECK('opt-upper', 'A–Z', true)}${CHECK('opt-lower', 'a–z', true)}${CHECK('opt-digits', '0–9', true)}${CHECK('opt-symbols', '!@#…', true)}
                  </div>
                </div>
                <div class="web-group" id="grp-passphrase" hidden>${RANGE('opt-words', 'Words', 3, 12, 5)}
                  <div class="form-group">
                    <label class="form-label" for="opt-sep"><span>Separator</span></label>
                    <select id="opt-sep" class="select-clean">${OPTS([['-', 'Hyphen  (word-word)'], [' ', 'Space  (word word)'], ['.', 'Dot  (word.word)'], ['_', 'Underscore  (word_word)'], ['', 'None  (wordword)']], '-')}</select>
                  </div>
                  <div class="web-checks">${CHECK('opt-cap', 'Capitalise words', true)}${CHECK('opt-num', 'Add a number', true)}
                  </div>
                </div>
                <div class="web-group" id="grp-pin" hidden>${RANGE('opt-pin', 'Digits', 4, 12, 6)}
                </div>`,
    outputHtml: `
                  <div class="pw-list" id="output-list" aria-live="polite"></div>
                  <div class="pw-meter" id="output-meter">
                    <div class="pw-bar"><span id="pw-bar-fill"></span></div>
                    <div class="pw-meter-row"><strong id="pw-label"></strong><span class="web-muted" id="pw-detail"></span></div>
                  </div>`,
    settingsSummary: '1 at a time · all characters',
    settings: `
              <div class="control-item">
                <label for="opt-count">How many</label>
                <input type="number" id="opt-count" class="input-clean" min="1" max="100" value="1" inputmode="numeric">
              </div>${CHECK('opt-similar', 'Avoid look-alike characters (I l 1 O 0 o)', false)}${CHECK('opt-each', 'Use every ticked character type at least once', true)}
              <div class="control-item">
                <label for="opt-symset">Symbols to use</label>
                <input type="text" id="opt-symset" class="input-clean" value="!@#$%^&amp;*-_=+?" spellcheck="false" autocomplete="off">
              </div>`,
    guide: [['Pick a type', '<strong>Password</strong> for maximum strength, <strong>Passphrase</strong> for something you can remember and type on a phone, <strong>PIN</strong> for number-only codes.'], ['Tune it', 'Set the length or number of words and which characters to use. The meter shows the strength in bits and how long a fast offline attack would take.'], ['Copy and save', 'Copy it straight into your password manager. Need several? Set “How many” in Settings and download them as a .txt. Press <strong>New password</strong> for another.']],
    faq: [['How random are these passwords?', 'They use <code>crypto.getRandomValues</code>, the browser’s cryptographically secure random generator — the same source password managers use — with rejection sampling so every character is equally likely.'], ['Are passwords saved or sent anywhere?', 'No. They are created in this tab and never stored — not in cookies, not in local storage, not on a server. Closing the tab forgets them.'], ['Where do the passphrase words come from?', 'From the <a href="https://www.eff.org/dice" target="_blank" rel="noopener">EFF long word list</a>: 7,776 common, easy-to-spell words. Each word adds about 12.9 bits, so 5 words ≈ 64 bits and 6 words ≈ 77 bits before the extra number.'], ['How is the crack time estimated?', 'From the entropy: on average an attacker must try half of all possibilities. The estimate assumes a fast offline attack of 10 billion guesses per second — real websites that rate-limit logins are far slower.'], ['What length should I use?', 'For accounts in a password manager, 16–20 random characters is plenty. For a master password you have to type, a 6-word passphrase is strong and much easier to remember.']]
  },
  {
    slug: 'upi-qr-generator', name: 'UPI Payment QR Generator', icon: 'lucide:indian-rupee', section: 'Generators & Links', libs: ['qr'], css: true,
    desc: 'Free UPI QR code generator: create a scan-to-pay QR for any UPI ID with your name, an optional fixed amount and a note — works with Google Pay, PhonePe, Paytm, BHIM and every UPI app. Download PNG, SVG or a printable stand card.',
    lead: 'Enter your UPI ID — get a scan-to-pay QR that works in every UPI app, plus a printable card for your counter.',
    cardDesc: 'Scan-to-pay QR for any UPI ID, with amount, note and a printable card.',
    tags: ['upi qr code generator', 'upi qr', 'upi payment qr', 'google pay qr', 'phonepe qr', 'paytm qr', 'bhim upi qr', 'upi link generator', 'upi://pay', 'payment qr code'],
    idle: 'Enter a UPI ID to begin', sourceLabel: 'Payment details', outputLabel: 'Scan to pay', outputIcon: 'lucide:qr-code', outputEmpty: 'Your payment QR will appear here',
    downloads: [['png', 'QR code (.png)', 'lucide:image'], ['svg', 'QR code (.svg)', 'lucide:pen-tool'], ['card', 'Printable card (.png)', 'lucide:printer']],
    sourceHtml: `${FIELD('upi-input', 'UPI ID', 'type="text" spellcheck="false" autocapitalize="off" inputmode="email" placeholder="yourname@okaxis"')}${FIELD('name-input', 'Payee name', 'type="text" placeholder="Name shown to the payer" maxlength="60"')}${FIELD('amount-input', 'Amount (₹)', 'type="text" inputmode="decimal" placeholder="Leave blank to let the payer enter it"', 'Optional')}${FIELD('note-input', 'Note', 'type="text" placeholder="Order #1024" maxlength="50"', 'Optional')}`,
    outputHtml: `
                  <div class="upi-out">
                    <img id="upi-qr" class="upi-qr" alt="UPI payment QR code" width="280" height="280">
                    <div class="upi-meta"><strong id="upi-name"></strong><span id="upi-vpa"></span><span class="upi-amt" id="upi-amt"></span></div>
                    <pre class="web-code" id="output-text"></pre>
                  </div>`,
    settingsSummary: 'ECC M · 1024 px',
    settings: `
              <div class="control-item">
                <label for="opt-ecc">Error correction</label>
                <select id="opt-ecc" class="select-clean">${OPTS([['L', 'Low (7%) — smallest'], ['M', 'Medium (15%)'], ['Q', 'Quartile (25%)'], ['H', 'High (30%) — best for print']], 'M')}</select>
              </div>
              <div class="control-item">
                <label for="opt-size">PNG size</label>
                <select id="opt-size" class="select-clean">${OPTS([['512', '512 px'], ['1024', '1024 px'], ['2048', '2048 px']], '1024')}</select>
              </div>
              <div class="control-item">
                <label for="opt-card">Card headline</label>
                <input type="text" id="opt-card" class="input-clean" value="Scan &amp; pay with any UPI app" maxlength="40" autocomplete="off">
              </div>`,
    guide: [['Enter your UPI ID', 'Type the UPI ID you receive money on (for example <code>name@okaxis</code>) and the name the payer should see. Add an amount for a fixed price, or leave it blank.'], ['Check the QR', 'The QR updates as you type. On a phone, press Open to launch your UPI app with the same details — the safest way to test before printing.'], ['Download and display', 'Download the QR as PNG or SVG, or the printable card with your name and UPI ID for a shop counter or invoice.']],
    faq: [['Does this work with Google Pay, PhonePe and Paytm?', 'Yes. The QR contains a standard <code>upi://pay</code> link defined by NPCI, which every UPI app can read — Google Pay, PhonePe, Paytm, BHIM, Amazon Pay, bank apps and more.'], ['Is my UPI ID checked or stored?', 'Neither. The QR is made in your browser and nothing is sent anywhere, so Toolity cannot confirm the ID is real. Scan it and pay ₹1 to yourself before printing it.'], ['Should I set an amount?', 'Set it for a fixed price (a product, a fee). Leave it blank for a shop counter, so each customer types their own amount. Some apps limit how much can be paid to a personal UPI ID through a QR.'], ['Why does Open do nothing on my computer?', 'UPI links only open on phones that have a UPI app installed. On a computer, scan the QR with your phone instead.'], ['Can I use this for my business?', 'Yes — it is free with no watermark. For payment confirmations, settlement reports or GST invoices you still need a merchant account with your bank or a payment provider.']]
  },
  {
    slug: 'barcode-generator', name: 'Barcode Generator', icon: 'lucide:barcode', section: 'Generators & Links', css: true,
    desc: 'Free barcode generator: create Code 128, EAN-13, EAN-8, UPC-A, Code 39, ITF-14 and Codabar barcodes with automatic check digits. Download SVG or PNG, or make a whole batch as a ZIP — in your browser.',
    lead: 'Type a value — get a scannable barcode in the format you need, or paste a list for a whole batch.',
    cardDesc: 'Code 128, EAN-13, UPC-A and more — SVG, PNG or a batch ZIP.',
    tags: ['barcode generator', 'ean 13 generator', 'upc barcode generator', 'code 128 generator', 'code 39', 'itf-14', 'codabar', 'bulk barcode generator', 'barcode svg', 'barcode png'],
    idle: 'Enter a value to begin', sourceLabel: 'Barcode', outputLabel: 'Preview', outputIcon: 'lucide:barcode', outputEmpty: 'Your barcode will appear here',
    downloads: [['svg', 'SVG (vector)', 'lucide:pen-tool'], ['png', 'PNG (high-res)', 'lucide:image'], ['zip', 'Batch ZIP (one PNG per line)', 'lucide:archive']],
    sourceHtml: `
                <div class="form-group">
                  <label class="form-label" for="opt-format"><span>Format</span></label>
                  <select id="opt-format" class="select-clean">${OPTS(BARCODE_FORMATS, 'CODE128')}</select>
                </div>
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Value</span><span class="form-label-desc" id="input-count">One per line for a batch</span></label>
                  <textarea id="text-input" class="textarea-clean" rows="5" placeholder="590123412345" spellcheck="false" autocapitalize="off"></textarea>
                </div>`,
    outputHtml: `
                  <div class="bc-list" id="output-list"></div>`,
    settingsSummary: 'Width 2 · 100 px · text on',
    settings: `
              <div class="control-item">
                <label for="opt-width">Bar width (<span id="opt-width-val">2</span>)</label>
                <input type="range" id="opt-width" min="1" max="4" step="1" value="2">
              </div>
              <div class="control-item">
                <label for="opt-height">Height (<span id="opt-height-val">100px</span>)</label>
                <input type="range" id="opt-height" min="30" max="200" step="5" value="100" data-unit="px">
              </div>${CHECK('opt-text', 'Show the value under the bars', true)}
              <div class="control-item">
                <label for="opt-font">Text size (<span id="opt-font-val">18px</span>)</label>
                <input type="range" id="opt-font" min="10" max="32" step="1" value="18" data-unit="px">
              </div>
              <div class="control-item">
                <label for="opt-margin">Quiet zone (<span id="opt-margin-val">10px</span>)</label>
                <input type="range" id="opt-margin" min="0" max="40" step="1" value="10" data-unit="px">
              </div>
              <div class="control-item">
                <label for="opt-fg">Bar colour</label>
                <input type="color" id="opt-fg" class="web-color-input" value="#000000">
              </div>
              <div class="control-item">
                <label for="opt-bg">Background</label>
                <input type="color" id="opt-bg" class="web-color-input" value="#ffffff">
              </div>`,
    guide: [['Pick a format', 'Use <strong>EAN-13</strong> or <strong>UPC-A</strong> for retail products, <strong>Code 128</strong> for anything else (inventory, shipping, IDs), <strong>ITF-14</strong> for cartons.'], ['Type the value', 'Leave the check digit off and it is calculated for you; type it and it is verified. Paste several lines to make a batch.'], ['Download', 'SVG stays sharp at any size for print and design tools. PNG is 4× resolution. A batch downloads as a ZIP with one PNG per line.']],
    faq: [['Do I need to calculate the check digit?', 'No. For EAN-13, EAN-8, UPC-A and ITF-14, type the number without its last digit and the check digit is added. If you type the full number, the check digit is verified and a wrong one is reported.'], ['Can I sell products with these EAN codes?', 'The barcodes are technically correct, but retail EAN/UPC numbers must be licensed from GS1 (GS1 India for Indian products) so they are unique worldwide. Use any number for internal stock.'], ['Which format should I use for inventory?', '<strong>Code 128</strong>: it holds letters, digits and symbols, is compact and every scanner reads it. Code 39 is older and wider but still common in industry.'], ['How are batches made?', 'Each non-empty line becomes one barcode. The preview shows the first 12; the ZIP contains all of them as PNGs named by line number and value.'], ['Which library draws the barcodes?', '<a href="https://github.com/lindell/JsBarcode" target="_blank" rel="noopener">JsBarcode</a> (MIT), loaded from a pinned CDN link and run in your browser. Nothing you type is uploaded.']]
  }
];

module.exports = [
  {
    slug: 'url-cleaner', name: 'URL Cleaner', icon: 'lucide:eraser',
    desc: 'Free online URL cleaner: strip utm_*, fbclid, gclid and other tracking parameters from one or many links at once, optionally remove fragments and force HTTPS. Runs entirely in your browser.',
    lead: 'Paste one or a hundred links — get them back without tracking parameters, ready to share.',
    cardDesc: 'Remove utm, fbclid, gclid and other tracking junk from links in bulk.', tags: ['url cleaner', 'remove utm', 'strip tracking parameters', 'fbclid', 'gclid', 'clean link', 'unshorten'],
    idle: 'Paste URLs to begin', sourceLabel: 'Links', outputLabel: 'Clean links', outputIcon: 'lucide:sparkles', outputEmpty: 'Cleaned URLs will appear here',
    sourceHtml: `
                <div class="form-group form-group-grow">
                  <label class="form-label" for="url-input"><span>URLs — one per line</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="url-input" class="textarea-clean" rows="10" placeholder="https://example.com/page?utm_source=newsletter&amp;utm_medium=email&amp;id=42" spellcheck="false" autocapitalize="off"></textarea>
                </div>`,
    outputHtml: `
                  <pre class="web-code" id="output-text" aria-live="polite"></pre>
                  <div class="web-tags" id="output-removed" aria-label="Removed parameters"></div>`,
    settingsSummary: 'Trackers · empty params',
    settings: `
              <div class="control-item"><input type="checkbox" id="opt-trackers" checked><label for="opt-trackers">Remove known tracking parameters</label></div>
              <div class="control-item"><input type="checkbox" id="opt-empty" checked><label for="opt-empty">Remove empty parameters</label></div>
              <div class="control-item"><input type="checkbox" id="opt-fragment"><label for="opt-fragment">Remove #fragment</label></div>
              <div class="control-item"><input type="checkbox" id="opt-https"><label for="opt-https">Upgrade http:// to https://</label></div>
              <div class="control-item"><input type="checkbox" id="opt-www"><label for="opt-www">Drop leading www.</label></div>
              <div class="control-item"><input type="checkbox" id="opt-all"><label for="opt-all">Remove <em>all</em> query parameters</label></div>
              <div class="control-item">
                <label for="opt-extra">Also remove</label>
                <input type="text" id="opt-extra" class="input-clean" placeholder="ref, source, mc_cid" autocomplete="off">
              </div>`,
    guide: [['Paste your links', 'One URL per line. Bare domains like <code>example.com/page?x=1</code> are fine — https:// is assumed.'], ['Pick what to strip', 'Known trackers (utm_*, fbclid, gclid, mc_cid, igshid, ref…) go by default. Open Settings to also drop fragments, force HTTPS or remove every parameter.'], ['Copy or download', 'The clean list updates live. Copy it, download a .txt, or press Open to visit the first link.']],
    faq: [['Which parameters count as tracking?', 'Everything in the utm_* family plus fbclid, gclid, dclid, gbraid, wbraid, msclkid, mc_cid, mc_eid, igshid, yclid, twclid, ttclid, _hsenc, _hsmi, hsCtaTracking, oly_anon_id, oly_enc_id, vero_id, s_cid, mkt_tok, ref, ref_src, spm and si (YouTube share). Add your own under “Also remove”.'], ['Will it break links that need a parameter?', 'Functional parameters (ids, page numbers, search queries) are kept unless you tick “Remove all query parameters”. Removed names are listed under the output so you can double-check.'], ['Does it unshorten bit.ly links?', 'No — that needs a network request. Use the Redirect Checker for that, then clean the final URL here.'], ['Can I paste text that contains links?', 'Each line is treated as one URL. Lines that are not URLs are left as they are and marked “skipped” in the badge, so a mixed paste survives.'], PRIVACY_FAQ]
  },
  {
    slug: 'url-encoder-decoder', name: 'URL Encoder Decoder', icon: 'lucide:code-2',
    desc: 'Free online URL encoder and decoder: percent-encode text for query strings (encodeURIComponent), encode full URLs safely (encodeURI) or decode %20-style escapes back to text. In your browser, line by line.',
    lead: 'Percent-encode a value, safely encode a whole URL, or decode %-escapes back to readable text.',
    cardDesc: 'Percent-encode or decode text and URLs, line by line.', tags: ['url encode', 'url decode', 'percent encoding', 'encodeURIComponent', 'urlencode', 'escape'],
    idle: 'Type or paste to begin', sourceLabel: 'Input', outputLabel: 'Output', outputIcon: 'lucide:arrow-right-left', outputEmpty: 'Encoded or decoded text will appear here',
    sourceHtml: `
                <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Mode">
                  <button type="button" class="seg-pill active" data-value="component">Encode value</button>
                  <button type="button" class="seg-pill" data-value="uri">Encode URL</button>
                  <button type="button" class="seg-pill" data-value="decode">Decode</button>
                </div>
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Text or URL</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="10" placeholder="Hello world &amp; friends? café/2024" spellcheck="false" autocapitalize="off"></textarea>
                </div>`,
    outputHtml: `
                  <pre class="web-code" id="output-text" aria-live="polite"></pre>`,
    settingsSummary: 'Line by line · %20 for spaces',
    settings: `
              <div class="control-item"><input type="checkbox" id="opt-lines" checked><label for="opt-lines">Process each line separately</label></div>
              <div class="control-item"><input type="checkbox" id="opt-plus"><label for="opt-plus">Use + for spaces (form encoding)</label></div>
              <div class="control-item"><input type="checkbox" id="opt-strict"><label for="opt-strict">Also encode ! ' ( ) * (RFC 3986 strict)</label></div>`,
    guide: [['Choose a mode', '<strong>Encode value</strong> escapes everything that is not safe inside a query parameter. <strong>Encode URL</strong> keeps <code>:/?#&amp;=</code> so a full address stays clickable. <strong>Decode</strong> reverses either.'], ['Paste text', 'Output updates as you type. Multi-line input is handled line by line unless you switch that off in Settings.'], ['Copy the result', 'Copy to the clipboard, download a .txt, or press Open to visit a decoded/encoded URL.']],
    faq: [['What is the difference between “Encode value” and “Encode URL”?', '“Encode value” is <code>encodeURIComponent</code>: it escapes <code>&amp;</code>, <code>=</code>, <code>/</code>, <code>?</code> and <code>#</code> too, which is what you want for a single parameter. “Encode URL” is <code>encodeURI</code>: it leaves URL structure characters alone so an entire address stays valid.'], ['Why does + sometimes mean a space?', 'HTML form submissions (application/x-www-form-urlencoded) encode spaces as <code>+</code>; everywhere else <code>%20</code> is correct. Tick “Use + for spaces” when you are building form data; Decode understands both.'], ['Decoding failed with “malformed” — why?', 'A lone <code>%</code> or a <code>%</code> followed by non-hex characters is not valid percent-encoding. The tool decodes what it can and flags the bad sequence instead of throwing the whole text away.'], ['Does it handle emoji and non-Latin scripts?', 'Yes. Text is encoded as UTF-8, so “café” becomes <code>caf%C3%A9</code> and emoji become four-byte sequences, exactly as browsers do.'], PRIVACY_FAQ]
  },
  {
    slug: 'open-graph-preview', name: 'Open Graph Preview', icon: 'lucide:share-2', css: true,
    desc: 'Free online Open Graph preview: see how any link will look when shared on Facebook, X (Twitter), LinkedIn and Slack. Fetches the page or reads pasted HTML — in your browser.',
    lead: 'See the link card a URL will produce on Facebook, X, LinkedIn and Slack — before you share it.',
    cardDesc: 'Preview how a link unfurls on Facebook, X, LinkedIn and Slack.', tags: ['open graph preview', 'og preview', 'social share preview', 'twitter card', 'link preview', 'og:image', 'unfurl'],
    idle: 'Enter a URL or paste HTML', action: 'Fetch Page', actionIcon: 'lucide:globe', split: '40/60',
    sourceLabel: 'Page', outputLabel: 'Preview', outputIcon: 'lucide:share-2', outputEmpty: 'The social card preview will appear here',
    sourceHtml: URL_INPUT('https://example.com/blog/post') + HTML_PASTE,
    outputHtml: `
                  <div class="segmented-group segmented-group-pill" id="seg-platform" role="group" aria-label="Platform">
                    <button type="button" class="seg-pill active" data-value="facebook">Facebook</button>
                    <button type="button" class="seg-pill" data-value="x">X</button>
                    <button type="button" class="seg-pill" data-value="linkedin">LinkedIn</button>
                    <button type="button" class="seg-pill" data-value="slack">Slack</button>
                  </div>
                  <div class="og-card" id="output-card" data-platform="facebook">
                    <img class="og-card-img" id="output-img" alt="" hidden>
                    <div class="og-card-noimg" id="output-noimg" hidden>No og:image</div>
                    <div class="og-card-body">
                      <div class="og-card-domain" id="output-domain"></div>
                      <div class="og-card-title" id="output-title"></div>
                      <div class="og-card-desc" id="output-desc"></div>
                    </div>
                  </div>
                  <div class="web-tags" id="output-issues"></div>
                  <div class="web-table-wrap"><table class="web-table" id="output-table"><tbody></tbody></table></div>`,
    guide: [['Enter the URL', 'Type or paste the page address and press <strong>Fetch Page</strong>. If the site blocks fetching, paste its HTML source into the second box instead.'], ['Switch platforms', 'Facebook, X, LinkedIn and Slack each render the same tags differently — image ratio, title length, where the domain sits. Flip between them to catch truncation.'], ['Fix and re-check', 'Issues (missing image, long title, no description) are flagged under the card; the full og:* / twitter:* table is below. Copy or download the tags as JSON.']],
    faq: [['Why doesn’t the preview match what Facebook actually shows?', 'Facebook, X and LinkedIn cache cards aggressively and apply their own cropping. This tool renders the tags as they are right now; if a platform still shows an old card, use its debugger (Sharing Debugger, Card Validator, Post Inspector) to force a re-scrape.'], ['The og:image is blank — is my tag broken?', 'Not necessarily. The image is loaded straight from the site; if it blocks hot-linking or is behind a login the preview cannot display it, but the tag itself may be fine. The table shows the exact URL found.'], ['Which tags are used when og:* is missing?', 'Falls back the same way platforms do: <code>og:title</code> → <code>twitter:title</code> → <code>&lt;title&gt;</code>; <code>og:description</code> → <code>twitter:description</code> → meta description; <code>og:image</code> → <code>twitter:image</code>. X prefers <code>twitter:*</code> when both exist.'], RELAY_FAQ, PASTE_FAQ]
  },
  {
    slug: 'meta-tag-extractor', name: 'Meta Tag Extractor', icon: 'lucide:tags',
    desc: 'Free online meta tag extractor: list a page’s title, description, canonical, robots, viewport, Open Graph, Twitter Card, hreflang and icon tags with SEO warnings. Fetches the page or reads pasted HTML — in your browser.',
    lead: 'Pull every SEO-relevant tag out of a page — title, description, canonical, robots, og:*, twitter:*, icons — with warnings.',
    cardDesc: 'Extract title, description, canonical, og:* and twitter:* tags with SEO checks.', tags: ['meta tag extractor', 'meta tags checker', 'seo meta tags', 'canonical', 'robots meta', 'og tags', 'twitter card tags'],
    idle: 'Enter a URL or paste HTML', action: 'Extract Tags', actionIcon: 'lucide:scan-search', split: '40/60',
    sourceLabel: 'Page', outputLabel: 'Tags', outputIcon: 'lucide:tags', outputEmpty: 'Extracted meta tags will appear here',
    sourceHtml: URL_INPUT('https://example.com') + HTML_PASTE,
    outputHtml: `
                  <div class="segmented-group segmented-group-pill" id="seg-view" role="group" aria-label="View">
                    <button type="button" class="seg-pill active" data-value="table">Table</button>
                    <button type="button" class="seg-pill" data-value="all">All tags</button>
                    <button type="button" class="seg-pill" data-value="json">JSON</button>
                  </div>
                  <div class="web-tags" id="output-issues"></div>
                  <div class="web-table-wrap" id="output-table-wrap"><table class="web-table" id="output-table"><tbody></tbody></table></div>
                  <pre class="web-code" id="output-json" hidden></pre>`,
    guide: [['Enter the URL', 'Paste the page address and press <strong>Extract Tags</strong>. If the site refuses, paste its source into the HTML box — only the <code>&lt;head&gt;</code> is needed.'], ['Read the summary', 'The table shows the tags that matter for search and sharing, with length counts. Switch to <strong>All tags</strong> for every <code>&lt;meta&gt;</code> and <code>&lt;link&gt;</code>, or <strong>JSON</strong> for a machine-readable dump.'], ['Act on warnings', 'Missing description, a title over 60 characters, no canonical, <code>noindex</code>, missing og:image or viewport are flagged at the top. Copy or download the JSON for a report.']],
    faq: [['What length limits do the warnings use?', 'Title: 60 characters (Google typically truncates around 50–60). Description: 160 characters. These are guidance, not hard rules — a slightly longer tag is not an error.'], ['Does it see tags added by JavaScript?', 'No. It reads the HTML as served, which is also what most crawlers see first. If your framework injects meta tags client-side, they will not appear here — a good hint that they may not appear for search engines either.'], ['Why is the canonical URL different from the one I entered?', 'The page declares it. Relative canonicals are resolved against the final URL after redirects, so a redirecting address will show the destination’s canonical.'], ['Can I extract tags from a local HTML file?', 'Yes — open the file in a text editor, copy it all, and paste into the HTML box. Nothing leaves your browser in that mode.'], RELAY_FAQ, PASTE_FAQ]
  },
  {
    slug: 'redirect-checker', name: 'Redirect Checker', icon: 'lucide:corner-down-right',
    desc: 'Free online redirect checker and link unshortener: find where a short link or redirecting URL finally lands, the final HTTP status, and whether it changed host or upgraded to HTTPS. Browser-based.',
    lead: 'Find out where a short or redirecting link really lands — final URL, status code, host and HTTPS changes.',
    cardDesc: 'See where a short link or redirect finally lands, with status and host changes.', tags: ['redirect checker', 'unshorten url', 'link expander', 'bit.ly expander', 'final url', '301 302 check', 'where does this link go'],
    idle: 'Enter a URL to check', action: 'Check Redirect', actionIcon: 'lucide:corner-down-right',
    sourceLabel: 'Link', outputLabel: 'Destination', outputIcon: 'lucide:corner-down-right', outputEmpty: 'The final destination will appear here',
    sourceHtml: URL_INPUT('https://bit.ly/… or http://example.com'),
    outputHtml: `
                  <div class="web-list" id="output-list"></div>
                  <div class="web-grid-2" id="output-stats"></div>
                  <p class="web-muted" id="output-note"></p>`,
    guide: [['Paste the link', 'Any http or https URL — short links (bit.ly, t.co, tinyurl), tracking links, or a page you suspect redirects.'], ['Press Check Redirect', 'The link is followed to its end. You get the start URL, the final URL, the final HTTP status, and flags for host change, HTTPS upgrade and path change.'], ['Open or copy', 'Press <strong>Open</strong> to visit the final destination directly, or copy the summary. Clean the final URL with URL Cleaner if it still carries tracking parameters.']],
    faq: [['Does it list every hop in the chain?', 'No — it shows the start and the final destination. Browsers hide intermediate redirect responses from JavaScript, and the relay follows the chain server-side, so hop-by-hop detail would need a dedicated server, which Toolity does not run. For 95% of “where does this go?” questions the final URL is the answer.'], ['Why does the relay see my URL?', 'Cross-site requests are blocked in browsers (CORS). A direct request is tried first; when the destination forbids it, the URL alone is sent to a public read-only relay (allorigins.win, then codetabs.com) which follows the redirect and reports back. No page content you type is sent — only the link.'], ['The status says 200 but I expected 301 — why?', 'The status shown is the <em>final</em> response after all redirects. A 200 means the chain ended on a real page. “Redirected: yes” tells you a redirect happened on the way.'], ['It says “couldn’t reach” — is the link dead?', 'Possibly, or the site blocks automated fetches (common with login walls and bot protection). Try opening it normally; if it works there but not here, the site is blocking relays, not you.'], ['Is it safe to check suspicious links?', 'Safer than clicking them: nothing runs, no cookies are sent, and only the final address is shown. Treat unknown destinations with the usual care before pressing Open.']]
  },
  {
    slug: 'gradient-generator', name: 'Gradient Generator', icon: 'lucide:blend', css: true, libs: ['color'],
    desc: 'Free online CSS gradient generator: build linear, radial and conic gradients with unlimited colour stops, live preview, CSS / Tailwind / SVG output and PNG export. Runs in your browser.',
    lead: 'Design linear, radial and conic gradients with any number of stops — copy the CSS or export a PNG.',
    cardDesc: 'Build linear, radial and conic CSS gradients with live preview and PNG export.', tags: ['gradient generator', 'css gradient', 'linear gradient', 'radial gradient', 'conic gradient', 'tailwind gradient', 'gradient png'],
    idle: 'Adjust stops to design', split: '40/60',
    sourceLabel: 'Design', outputLabel: 'Preview & CSS', outputIcon: 'lucide:blend', outputEmpty: 'Your gradient will appear here',
    downloads: [['png-wide', 'PNG · 1920 × 1080', 'lucide:image'], ['png-og', 'PNG · 1200 × 630', 'lucide:image'], ['png-square', 'PNG · 1080 × 1080', 'lucide:image'], ['css', 'CSS file', 'lucide:file-code']],
    sourceHtml: `
                <div class="segmented-group segmented-group-pill" id="seg-type" role="group" aria-label="Gradient type">
                  <button type="button" class="seg-pill active" data-value="linear">Linear</button>
                  <button type="button" class="seg-pill" data-value="radial">Radial</button>
                  <button type="button" class="seg-pill" data-value="conic">Conic</button>
                </div>
                <div class="form-group" id="angle-group">
                  <label class="form-label" for="opt-angle"><span>Angle</span><span class="form-label-desc"><span id="opt-angle-val">90°</span></span></label>
                  <input type="range" id="opt-angle" min="0" max="360" step="1" value="90" data-unit="°">
                </div>
                <div class="form-group">
                  <div class="form-label"><span>Colour stops</span><span class="form-label-desc">Colour · position %</span></div>
                  <div class="web-rows" id="stops"></div>
                  <button type="button" class="btn-toolbar-sm" id="btn-add-stop"><iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon><span>Add stop</span></button>
                </div>`,
    outputHtml: `
                  <div class="web-preview gradient-preview" id="output-preview" role="img" aria-label="Gradient preview"></div>
                  <pre class="web-code" id="output-css" aria-live="polite"></pre>`,
    settingsSummary: 'CSS · hex colours · no fallback',
    settings: `
              <div class="control-item">
                <label for="opt-format">Output</label>
                <select id="opt-format" class="select-clean">
                  <option value="css" selected>CSS background</option>
                  <option value="tailwind">Tailwind arbitrary class</option>
                  <option value="svg">SVG</option>
                </select>
              </div>
              <div class="control-item">
                <label for="opt-space">Colours as</label>
                <select id="opt-space" class="select-clean">
                  <option value="hex" selected>hex</option>
                  <option value="rgb">rgb()</option>
                  <option value="hsl">hsl()</option>
                </select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-fallback"><label for="opt-fallback">Include solid-colour fallback line</label></div>
              <div class="control-item"><input type="checkbox" id="opt-repeat"><label for="opt-repeat">Repeating gradient</label></div>`,
    guide: [['Pick a type and stops', 'Linear, radial or conic. Each stop has a colour and a position; add as many as you like, remove any beyond two, and drag the angle slider for linear and conic.'], ['Watch the preview', 'The preview and the code update live. Switch the output to Tailwind or SVG in Settings, or choose rgb()/hsl() colours.'], ['Copy or export', 'Copy the code, download it as a .css file, or export the gradient as a PNG in 1920×1080, 1200×630 (social) or 1080×1080.']],
    faq: [['Which browsers support these gradients?', 'Linear and radial gradients work everywhere. Conic gradients work in all current browsers (Chrome 69+, Firefox 83+, Safari 12.1+). No vendor prefixes are needed today, so none are added.'], ['What does “Include fallback” do?', 'It adds a plain <code>background-color</code> line with the first stop’s colour before the gradient, so very old browsers or email clients that ignore gradients still show something sensible.'], ['How does the PNG export render?', 'The same stops are painted on a canvas with the browser’s own gradient engine at the chosen size, so the PNG matches the preview. Angles and positions are honoured; the image is opaque unless a stop is transparent.'], ['Can I use hsl() or named colours?', 'Yes — type any CSS colour into a stop’s text field (names, rgb(), hsl(), oklch()…). The picker beside it syncs to the parsed value.'], PRIVACY_FAQ]
  },
  {
    slug: 'color-palette-generator', name: 'Color Palette Generator', icon: 'lucide:palette', libs: ['color'],
    desc: 'Free online colour palette generator: enter one colour and get complementary, analogous, triadic, tetradic, split-complementary, shades and tints palettes as hex, RGB or HSL — exported as CSS variables, JSON or PNG. In your browser.',
    lead: 'Start from one colour and get harmonious palettes — complementary, analogous, triadic, shades, tints — as CSS variables, JSON or PNG.',
    cardDesc: 'Generate complementary, analogous, triadic, shade and tint palettes from one colour.', tags: ['color palette generator', 'colour palette', 'complementary colors', 'analogous', 'triadic', 'shades tints', 'css variables palette'],
    idle: 'Enter a base colour',
    sourceLabel: 'Base colour', outputLabel: 'Palette', outputIcon: 'lucide:palette', outputEmpty: 'Your palette will appear here — click a swatch to copy it',
    downloads: [['css', 'CSS variables', 'lucide:file-code'], ['json', 'JSON', 'lucide:braces'], ['png', 'PNG strip', 'lucide:image']],
    sourceHtml: COLOR_INPUT('color', 'Base colour', '#f4511e, rgb(30 136 229), hsl(210 80% 50%), tomato…') + `
                <div class="form-group">
                  <div class="form-label"><span>Harmony</span></div>
                  <div class="segmented-group segmented-group-pill" id="seg-harmony" role="group" aria-label="Harmony">
                    <button type="button" class="seg-pill active" data-value="analogous">Analogous</button>
                    <button type="button" class="seg-pill" data-value="complementary">Complementary</button>
                    <button type="button" class="seg-pill" data-value="split">Split</button>
                    <button type="button" class="seg-pill" data-value="triadic">Triadic</button>
                    <button type="button" class="seg-pill" data-value="tetradic">Tetradic</button>
                    <button type="button" class="seg-pill" data-value="shades">Shades</button>
                    <button type="button" class="seg-pill" data-value="tints">Tints</button>
                    <button type="button" class="seg-pill" data-value="tones">Tones</button>
                  </div>
                </div>`,
    outputHtml: `
                  <div class="web-swatches" id="output-swatches" role="list"></div>
                  <pre class="web-code" id="output-css" aria-live="polite"></pre>`,
    settingsSummary: '5 colours · hex · --color',
    settings: `
              <div class="control-item">
                <label for="opt-count">Colours (<span id="opt-count-val">5</span>)</label>
                <input type="range" id="opt-count" min="3" max="10" step="1" value="5">
              </div>
              <div class="control-item">
                <label for="opt-space">Show as</label>
                <select id="opt-space" class="select-clean">
                  <option value="hex" selected>hex</option>
                  <option value="rgb">rgb()</option>
                  <option value="hsl">hsl()</option>
                </select>
              </div>
              <div class="control-item">
                <label for="opt-prefix">Variable prefix</label>
                <input type="text" id="opt-prefix" class="input-clean" value="--color" autocomplete="off">
              </div>`,
    guide: [['Enter a base colour', 'Type any CSS colour — hex, rgb(), hsl(), oklch() or a name — or use the picker. The palette appears immediately.'], ['Choose a harmony', 'Analogous, complementary, split-complementary, triadic and tetradic rotate the hue; shades, tints and tones step lightness or saturation. “Colours” in Settings sets how many steps you get.'], ['Copy or export', 'Click any swatch to copy that one colour, copy the whole block as CSS custom properties, or download CSS, JSON or a PNG strip.']],
    faq: [['How are the harmonies calculated?', 'In HSL hue space: complementary is +180°, split-complementary ±150°, triadic ±120°, tetradic every 90°, analogous in 30° steps around the base. Shades move lightness towards black, tints towards white, tones reduce saturation. Hue-based harmonies are a starting point — always check contrast for text.'], ['Why does “Colours” not change the complementary palette?', 'Complementary, split, triadic and tetradic have a fixed number of members by definition (2, 3, 3, 4). The count applies to analogous, shades, tints and tones.'], ['Can I use these as Tailwind or design tokens?', 'Download the JSON for tokens, or copy the CSS variables and drop them in <code>:root</code>. The prefix is configurable, e.g. <code>--brand</code> gives <code>--brand-1 … --brand-5</code>.'], ['Is the PNG useful for anything?', 'It is a horizontal strip with each colour and its code — handy for pasting into a brief, a Figma frame or a chat.'], PRIVACY_FAQ]
  },
  {
    slug: 'contrast-checker', name: 'Contrast Checker', icon: 'lucide:contrast', css: true, libs: ['color'],
    desc: 'Free online WCAG contrast checker: enter a text and background colour to get the contrast ratio, AA/AAA pass-fail for normal text, large text and UI components, a live sample and an automatic fix suggestion. In your browser.',
    lead: 'Check text and background colours against WCAG AA and AAA — ratio, pass/fail for every size, and a one-click fix.',
    cardDesc: 'WCAG AA/AAA contrast ratio with live sample and a suggested passing colour.', tags: ['contrast checker', 'wcag contrast', 'color contrast ratio', 'accessibility', 'aa aaa', 'a11y colors'],
    idle: 'Enter two colours', split: '40/60',
    sourceLabel: 'Colours', outputLabel: 'Result', outputIcon: 'lucide:contrast', outputEmpty: 'The contrast ratio and WCAG results will appear here',
    sourceHtml: COLOR_INPUT('fg', 'Text colour', '#333333, rgb(…), hsl(…), navy…') + COLOR_INPUT('bg', 'Background colour', '#ffffff, white…') + `
                <button type="button" class="btn-toolbar-sm" id="btn-swap"><iconify-icon icon="lucide:arrow-up-down" width="14" height="14"></iconify-icon><span>Swap colours</span></button>`,
    outputHtml: `
                  <div class="web-preview" id="output-sample" aria-label="Sample text preview">
                    <p class="cc-sample-large" id="sample-large">Large text — 24px regular or 19px bold</p>
                    <p class="cc-sample-normal" id="sample-normal">Normal body text at 16px. The quick brown fox jumps over the lazy dog, 0123456789.</p>
                    <span class="cc-sample-ui" id="sample-ui">UI component</span>
                  </div>
                  <div class="web-inline">
                    <div class="web-big" id="output-ratio">—</div>
                    <span class="web-tag" id="output-grade"></span>
                  </div>
                  <div class="web-grid-2" id="output-grid"></div>
                  <div class="web-stat" id="output-fix" hidden></div>`,
    settingsSummary: 'Fix targets AA',
    settings: `
              <div class="control-item">
                <label for="opt-target">Suggested fix should reach</label>
                <select id="opt-target" class="select-clean">
                  <option value="4.5" selected>AA normal text (4.5:1)</option>
                  <option value="7">AAA normal text (7:1)</option>
                  <option value="3">AA large text / UI (3:1)</option>
                </select>
              </div>
              <div class="control-item">
                <label for="opt-fix-side">Adjust</label>
                <select id="opt-fix-side" class="select-clean">
                  <option value="fg" selected>text colour</option>
                  <option value="bg">background colour</option>
                </select>
              </div>`,
    guide: [['Enter both colours', 'Text colour and background — any CSS colour string or the picker. The sample on the right repaints instantly.'], ['Read the verdict', 'The ratio is shown big, with pass/fail badges for AA and AAA at normal text, large text and UI component thresholds (4.5:1, 3:1, 7:1).'], ['Apply the fix', 'If it fails, a nearest passing colour is suggested — same hue, lightness nudged until it meets the target in Settings. Press <strong>Use this</strong> to apply it.']],
    faq: [['What do the thresholds mean?', 'WCAG 2.2: normal text needs 4.5:1 for AA and 7:1 for AAA; large text (≥24px, or ≥19px bold) needs 3:1 for AA and 4.5:1 for AAA; non-text UI parts such as input borders and icons need 3:1. The ratio is computed from relative luminance exactly as the spec defines.'], ['Does semi-transparent text work?', 'Yes. A text colour with alpha is composited over the background first, then measured — the same thing your screen does. Transparent backgrounds are composited over white.'], ['How is the fix colour chosen?', 'The hue and saturation stay the same; lightness is moved step by step away from the background until the target ratio is met. It is the smallest change that passes, not necessarily the prettiest — treat it as a starting point.'], ['Is passing AA enough?', 'AA is the legal baseline in most jurisdictions. AAA is recommended for body text people read for long stretches. Also remember contrast is only one check — colour should never be the only way information is conveyed.'], PRIVACY_FAQ]
  },
  {
    slug: 'color-converter', name: 'Color Converter', icon: 'lucide:pipette', css: true, libs: ['color'],
    desc: 'Free online colour converter: turn any CSS colour — hex, RGB, HSL, HWB, CMYK, OKLCH, named — into every other format at once, with alpha, uppercase hex and copy buttons. In your browser.',
    lead: 'Paste any colour — hex, rgb(), hsl(), hwb(), oklch(), a name — and get every format back, ready to copy.',
    cardDesc: 'Convert between hex, RGB, HSL, HWB, CMYK and OKLCH in one go.', tags: ['color converter', 'hex to rgb', 'rgb to hex', 'hsl to hex', 'cmyk', 'oklch', 'hwb', 'color code converter'],
    idle: 'Enter a colour',
    sourceLabel: 'Colour', outputLabel: 'Formats', outputIcon: 'lucide:pipette', outputEmpty: 'Every format of your colour will appear here',
    sourceHtml: COLOR_INPUT('color', 'Any CSS colour', '#1e88e5 · rgb(30, 136, 229) · hsl(207 77% 51%) · oklch(60% 0.15 250) · dodgerblue') + `
                <div class="form-group">
                  <div class="form-label"><span>Opacity</span><span class="form-label-desc"><span id="opt-alpha-val">100%</span></span></div>
                  <input type="range" id="opt-alpha" min="0" max="100" step="1" value="100" data-unit="%" aria-label="Opacity">
                </div>`,
    outputHtml: `
                  <div class="web-preview cc-swatch" id="output-swatch" role="img" aria-label="Colour swatch"></div>
                  <div class="web-table-wrap"><table class="web-table" id="output-table"><tbody></tbody></table></div>`,
    settingsSummary: 'Lowercase hex',
    settings: `
              <div class="control-item"><input type="checkbox" id="opt-upper"><label for="opt-upper">Uppercase hex</label></div>
              <div class="control-item"><input type="checkbox" id="opt-modern"><label for="opt-modern">Modern syntax — rgb(30 136 229 / 50%)</label></div>`,
    guide: [['Enter a colour', 'Type anything a browser understands — <code>#1e88e5</code>, <code>1e88e5</code>, <code>rgb(30,136,229)</code>, <code>hsl(207 77% 51%)</code>, <code>oklch(60% 0.15 250)</code>, <code>dodgerblue</code> — or use the picker.'], ['Read every format', 'HEX, RGB, HSL, HWB, CMYK and OKLCH are listed together with a live swatch. Drag Opacity to add alpha to all of them.'], ['Copy what you need', 'Each row has its own copy button; the toolbar Copy grabs all formats as text and Download saves them as JSON.']],
    faq: [['Which input formats are accepted?', 'Anything valid in CSS Color Level 4: hex (3/4/6/8 digits, with or without #), rgb()/rgba(), hsl()/hsla(), hwb(), lab(), lch(), oklab(), oklch(), color(), the 148 named colours and <code>transparent</code>. Parsing is done by the browser itself, so it is always up to date.'], ['How accurate is CMYK?', 'CMYK here is the simple formula print designers use for a quick look (no ICC profile). Real print conversion depends on the paper and press profile — use your print software for final values.'], ['What is OKLCH and why include it?', 'OKLCH is the perceptually uniform colour space now supported in all modern browsers. Equal steps in L look equally bright, which makes it the best space for building palettes and dark-mode variants. Values are rounded to what CSS tools normally display.'], ['Why did my 8-digit hex lose its alpha?', 'Opacity is controlled by the slider so every output stays in sync. Pasting <code>#1e88e580</code> sets the slider to 50% automatically; move it to change the alpha in all formats at once.'], PRIVACY_FAQ]
  },
  {
    slug: 'blob-maker', name: 'Blob Maker', icon: 'lucide:shapes', css: true,
    desc: 'Free online blob maker: design organic SVG blob shapes with full control over points, randomness, smoothness, gradients, background, layers, blur, grain and animation. Export SVG, animated SVG, CSS, PNG, GIF or video — all in your browser.',
    lead: 'Shape, colour and animate organic blobs — then export SVG, animated SVG, CSS, PNG, GIF or video. Everything runs in your browser.',
    cardDesc: 'Design and animate organic blobs — export SVG, CSS, PNG, GIF or video.', tags: ['blob maker', 'blob generator', 'svg blob', 'organic shape', 'animated blob', 'blob animation', 'svg shape', 'css blob', 'clip-path', 'background shape', 'hero background', 'morphing shape'],
    idle: 'Shape your blob', split: '40/60',
    sourceLabel: 'Design', outputLabel: 'Preview & code', outputIcon: 'lucide:shapes', outputEmpty: 'Your blob will appear here',
    downloads: [['svg', 'SVG · still', 'lucide:file-image'], ['svg-anim', 'SVG · animated (needs movement)', 'lucide:sparkles'], ['css', 'CSS · clip-path', 'lucide:file-code'], ['png', 'PNG · 1×', 'lucide:image'], ['png-2x', 'PNG · 2×', 'lucide:image'], ['png-4x', 'PNG · 4×', 'lucide:image'], ['webp', 'WebP', 'lucide:image'], ['jpg', 'JPG', 'lucide:image'], ['gif', 'GIF · loop (needs movement)', 'lucide:film'], ['webm', 'Video · WebM (needs movement)', 'lucide:video'], ['mp4', 'Video · MP4 (needs movement)', 'lucide:video']],
    sourceHtml: `
                <div class="form-group">
                  <label class="form-label" for="opt-preset"><span>Start from a preset</span><span class="form-label-desc">Changes style, keeps your canvas</span></label>
                  <select id="opt-preset" class="select-clean">
                    <option value="" selected>Custom</option>
                    <option value="sunset">Sunset hero</option>
                    <option value="pastel">Pastel scene</option>
                    <option value="aurora">Aurora glow</option>
                    <option value="mint">Mint pebble</option>
                    <option value="candy">Candy splash</option>
                    <option value="outline">Outline sticker</option>
                    <option value="mono">Monochrome</option>
                  </select>
                </div>
                <h3 class="blob-h">Shape</h3>
                <div class="form-group">
                  <span class="form-label"><span>Style</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-style" role="group" aria-label="Style">
                    <button type="button" class="seg-pill active" data-value="organic">Organic</button>
                    <button type="button" class="seg-pill" data-value="flower">Flower</button>
                    <button type="button" class="seg-pill" data-value="wave">Wave</button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="opt-points"><span>Points</span><span class="form-label-desc"><span id="opt-points-val">7</span></span></label>
                  <input type="range" id="opt-points" class="range-slider-clean" min="3" max="20" step="1" value="7" data-unit="">
                </div>
                <div class="form-group">
                  <label class="form-label" for="opt-random"><span>Randomness</span><span class="form-label-desc"><span id="opt-random-val">45%</span></span></label>
                  <input type="range" id="opt-random" class="range-slider-clean" min="0" max="100" step="1" value="45" data-unit="%">
                </div>
                <div class="form-group">
                  <label class="form-label" for="opt-smooth"><span>Smoothness</span><span class="form-label-desc"><span id="opt-smooth-val">80%</span></span></label>
                  <input type="range" id="opt-smooth" class="range-slider-clean" min="0" max="100" step="1" value="80" data-unit="%">
                </div>
                <div class="form-group">
                  <label class="form-label" for="opt-size"><span>Size</span><span class="form-label-desc"><span id="opt-size-val">72%</span></span></label>
                  <input type="range" id="opt-size" class="range-slider-clean" min="20" max="100" step="1" value="72" data-unit="%">
                </div>
                <div class="form-group">
                  <label class="form-label" for="opt-rotate"><span>Rotation</span><span class="form-label-desc"><span id="opt-rotate-val">0°</span></span></label>
                  <input type="range" id="opt-rotate" class="range-slider-clean" min="0" max="359" step="1" value="0" data-unit="°">
                </div>
                <div class="form-group">
                  <label class="form-label" for="opt-seed"><span>Seed</span><span class="form-label-desc">Same seed + settings = same blob</span></label>
                  <div class="web-inline">
                    <input type="number" id="opt-seed" class="input-clean" min="1" max="999999" step="1" value="1234" inputmode="numeric">
                    <button type="button" class="btn-toolbar-sm" id="btn-random"><iconify-icon icon="lucide:dices" width="14" height="14"></iconify-icon><span>Randomise</span></button>
                  </div>
                </div>
                <h3 class="blob-h">Colour</h3>
                <div class="form-group">
                  <span class="form-label"><span>Blob fill</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-fill" role="group" aria-label="Blob fill">
                    <button type="button" class="seg-pill active" data-value="linear">Linear</button>
                    <button type="button" class="seg-pill" data-value="radial">Radial</button>
                    <button type="button" class="seg-pill" data-value="solid">Solid</button>
                  </div>
                </div>
                <div class="blob-colors" role="group" aria-label="Blob colours">
                  <div class="blob-color"><input type="color" id="opt-c1" class="web-color-input" value="#ff6a2a" aria-label="Colour 1"><input type="text" id="opt-c1-hex" class="input-clean blob-hex" value="#ff6a2a" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Colour 1 hex"></div>
                  <div class="blob-color" id="c2-wrap"><input type="color" id="opt-c2" class="web-color-input" value="#ffc14d" aria-label="Colour 2"><input type="text" id="opt-c2-hex" class="input-clean blob-hex" value="#ffc14d" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Colour 2 hex"></div>
                </div>
                <div class="form-group" id="angle-group">
                  <label class="form-label" for="opt-angle"><span>Gradient angle</span><span class="form-label-desc"><span id="opt-angle-val">135°</span></span></label>
                  <input type="range" id="opt-angle" class="range-slider-clean" min="0" max="359" step="1" value="135" data-unit="°">
                </div>
                <div class="form-group">
                  <label class="form-label" for="opt-opacity"><span>Opacity</span><span class="form-label-desc"><span id="opt-opacity-val">100%</span></span></label>
                  <input type="range" id="opt-opacity" class="range-slider-clean" min="10" max="100" step="1" value="100" data-unit="%">
                </div>
                <h3 class="blob-h">Background</h3>
                <div class="form-group">
                  <span class="form-label"><span>Background</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-bg" role="group" aria-label="Background">
                    <button type="button" class="seg-pill active" data-value="solid">Solid</button>
                    <button type="button" class="seg-pill" data-value="gradient">Gradient</button>
                    <button type="button" class="seg-pill" data-value="none">Transparent</button>
                  </div>
                </div>
                <div class="blob-colors" id="bg-colors">
                  <div class="blob-color"><input type="color" id="opt-bg1" class="web-color-input" value="#fff4ec" aria-label="Colour 1"><input type="text" id="opt-bg1-hex" class="input-clean blob-hex" value="#fff4ec" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Colour 1 hex"></div>
                  <div class="blob-color" id="bg2-wrap"><input type="color" id="opt-bg2" class="web-color-input" value="#ffe0cc" aria-label="Colour 2"><input type="text" id="opt-bg2-hex" class="input-clean blob-hex" value="#ffe0cc" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Colour 2 hex"></div>
                </div>
                <h3 class="blob-h">Movement</h3>
                <div class="form-group">
                  <span class="form-label"><span>Movement</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-motion" role="group" aria-label="Movement">
                    <button type="button" class="seg-pill" data-value="off">Off</button>
                    <button type="button" class="seg-pill active" data-value="morph" data-default>Morph</button>
                    <button type="button" class="seg-pill" data-value="float">Float</button>
                    <button type="button" class="seg-pill" data-value="spin">Spin</button>
                    <button type="button" class="seg-pill" data-value="pulse">Pulse</button>
                  </div>
                </div>
                <div id="motion-group">
                <div class="form-group">
                  <label class="form-label" for="opt-loop"><span>Loop length</span><span class="form-label-desc"><span id="opt-loop-val">6 s</span></span></label>
                  <input type="range" id="opt-loop" class="range-slider-clean" min="2" max="20" step="1" value="6" data-unit=" s">
                </div>
                <div class="form-group">
                  <label class="form-label" for="opt-amount"><span>Intensity</span><span class="form-label-desc"><span id="opt-amount-val">60%</span></span></label>
                  <input type="range" id="opt-amount" class="range-slider-clean" min="10" max="100" step="1" value="60" data-unit="%">
                </div>
                </div>`,
    outputHtml: `
                  <div class="web-preview blob-stage" id="output-preview">
                    <canvas id="blob-canvas" width="1000" height="1000" role="img" aria-label="Blob preview"></canvas>
                  </div>
                  <div class="blob-actions">
                    <button type="button" class="btn-toolbar-sm" id="btn-play" aria-pressed="true"><iconify-icon icon="lucide:pause" width="14" height="14"></iconify-icon><span>Pause</span></button>
                    <button type="button" class="btn-toolbar-sm" id="btn-share"><iconify-icon icon="lucide:link" width="14" height="14"></iconify-icon><span>Copy share link</span></button>
                    <span class="pane-badge" id="blob-size"></span>
                  </div>
                  <details class="blob-code-wrap">
                    <summary>Show code</summary>
                    <pre class="web-code blob-code" id="output-code" aria-label="Generated code"></pre>
                  </details>`,
    settingsSummary: '1:1 · 1 layer · no effects',
    settings: `
              <div class="control-item">
                <label for="opt-ratio">Canvas</label>
                <select id="opt-ratio" class="select-clean">
                  <option value="1:1" selected>Square 1:1 · 1000 × 1000</option>
                  <option value="16:9">Landscape 16:9 · 1600 × 900</option>
                  <option value="9:16">Story 9:16 · 900 × 1600</option>
                  <option value="4:5">Portrait 4:5 · 1000 × 1250</option>
                  <option value="3:2">Photo 3:2 · 1500 × 1000</option>
                </select>
              </div>
              <div class="control-item">
                <label for="opt-layers">Layers (<span id="opt-layers-val">1</span>)</label>
                <input type="range" id="opt-layers" class="range-slider-clean" min="1" max="5" step="1" value="1" data-unit="">
              </div>
              <div class="control-item">
                <label for="opt-lstep">Layer shrink (<span id="opt-lstep-val">14%</span>)</label>
                <input type="range" id="opt-lstep" class="range-slider-clean" min="0" max="30" step="1" value="14" data-unit="%">
              </div>
              <div class="control-item">
                <label for="opt-loffset">Layer offset (<span id="opt-loffset-val">6%</span>)</label>
                <input type="range" id="opt-loffset" class="range-slider-clean" min="0" max="30" step="1" value="6" data-unit="%">
              </div>
              <div class="control-item">
                <label for="opt-blur">Blur / glow (<span id="opt-blur-val">0%</span>)</label>
                <input type="range" id="opt-blur" class="range-slider-clean" min="0" max="100" step="1" value="0" data-unit="%">
              </div>
              <div class="control-item">
                <label for="opt-grain">Grain (<span id="opt-grain-val">0%</span>)</label>
                <input type="range" id="opt-grain" class="range-slider-clean" min="0" max="100" step="1" value="0" data-unit="%">
              </div>
              <div class="control-item"><input type="checkbox" id="opt-shadow"><label for="opt-shadow">Drop shadow</label></div>
              <div class="control-item"><input type="checkbox" id="opt-outline"><label for="opt-outline">Outline only (no fill)</label></div>
              <div class="control-item">
                <label for="opt-stroke">Outline width (<span id="opt-stroke-val">8 px</span>)</label>
                <input type="range" id="opt-stroke" class="range-slider-clean" min="1" max="40" step="1" value="8" data-unit=" px">
              </div>
              <div class="control-item">
                <label for="opt-code">Code shows</label>
                <select id="opt-code" class="select-clean">
                  <option value="svg" selected>SVG (animated when moving)</option>
                  <option value="css">CSS (clip-path)</option>
                </select>
              </div>`,
    guide: [['Shape it', 'Pick a style, then drag Points, Randomness and Smoothness — or hit <strong>Randomise</strong> for a new seed. The preview stays in view while you scroll the controls. Presets give you a styled starting point.'], ['Colour and move it', 'Choose a solid, linear or radial fill, a background (or transparent) and a movement: morph, float, spin or pulse. Layers, blur, grain and shadow live in Settings.'], ['Export', 'Copy the SVG or CSS, or use Download for SVG, animated SVG, PNG up to 4×, WebP, JPG, a looping GIF or a WebM/MP4 video. Copy share link saves the design in a URL.']],
    faq: [['Which export should I use?', '<strong>SVG</strong> for websites and design tools (Figma, Illustrator) — tiny and sharp at any size. <strong>Animated SVG</strong> plays by itself in any browser via an &lt;img&gt; tag. <strong>CSS</strong> gives a clip-path you can put on any element. <strong>PNG/WebP</strong> for slides and social posts, <strong>GIF</strong> for chats and email, <strong>WebM/MP4</strong> for video editors and reels.'], ['Do the animations loop seamlessly?', 'Yes. Every movement is built on one loop of the length you set, so the last frame flows straight back into the first — in the animated SVG, the GIF and the video alike.'], ['Why does the video take as long as the loop?', 'Browsers record video in real time, so a 6-second loop takes about 6 seconds to export. Keep the tab visible while it records. GIFs are rendered frame by frame instead and are usually quicker.'], ['Will blur and grain look the same everywhere?', 'In browsers, yes. Design tools sometimes render SVG filters (blur, grain, shadow) differently or ignore them; export a PNG if you need an exact match there. Safari before version 18 shows the live preview without blur, but the SVG export keeps it.'], ['Can I come back to a design later?', 'Yes — every setting is saved in the page link. Use <strong>Copy share link</strong> and open it any time; nothing is stored on a server.'], PRIVACY_FAQ]
  },
  {
    slug: 'chronometer-lap-timer', name: 'Chronometer & Lap Timer', icon: 'lucide:timer', section: 'Experiments', split: '40/60', css: true,
    desc: 'Free online chronometer and lap timer: a precise stopwatch with laps and splits, fastest/slowest highlighting, keyboard shortcuts, a countdown mode with chime, fullscreen display and CSV export. Keeps running across reloads — in your browser.',
    lead: 'A precise stopwatch with laps, splits and a countdown mode. Space starts, L laps, R resets — and it keeps counting if you reload.',
    cardDesc: 'Stopwatch with laps & splits, countdown mode, shortcuts, fullscreen, CSV export.',
    tags: ['stopwatch online', 'lap timer', 'chronometer', 'online timer', 'split timer', 'countdown timer', 'stopwatch with laps', 'precise stopwatch', 'timer fullscreen', 'interval timer'],
    idle: 'Ready · Space to start', sourceLabel: 'Timer', outputLabel: 'Laps', outputIcon: 'lucide:flag', outputEmpty: 'Press Lap (L) while running — each lap, split and delta lands here',
    sourceHtml: `
                <div class="form-group">
                  <span class="form-label"><span>Mode</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Mode">
                    <button type="button" class="seg-pill active" data-value="stopwatch">Stopwatch</button>
                    <button type="button" class="seg-pill" data-value="countdown">Countdown</button>
                  </div>
                </div>
                <div class="chrono-face" id="chrono-face" role="timer" aria-live="off" aria-atomic="true">
                  <span class="chrono-main" id="chrono-main">00:00<small>.00</small></span>
                  <span class="chrono-sub" id="chrono-sub"></span>
                </div>
                <div class="chrono-set" id="chrono-set" hidden>
                  <label class="chrono-set-field"><span>h</span><input type="number" id="opt-h" class="input-clean" min="0" max="99" value="0" inputmode="numeric"></label>
                  <label class="chrono-set-field"><span>min</span><input type="number" id="opt-m" class="input-clean" min="0" max="59" value="5" inputmode="numeric"></label>
                  <label class="chrono-set-field"><span>sec</span><input type="number" id="opt-s" class="input-clean" min="0" max="59" value="0" inputmode="numeric"></label>
                </div>
                <div class="chrono-presets" id="chrono-presets" hidden>
                  <button type="button" class="btn-toolbar-sm" data-preset="60">1 min</button><button type="button" class="btn-toolbar-sm" data-preset="180">3 min</button><button type="button" class="btn-toolbar-sm" data-preset="300">5 min</button><button type="button" class="btn-toolbar-sm" data-preset="600">10 min</button><button type="button" class="btn-toolbar-sm" data-preset="1500">25 min</button>
                </div>
                <div class="chrono-controls">
                  <button type="button" class="btn-toolbar-sm btn-brand-sm chrono-btn" id="btn-start" title="Start / pause (Space)"><iconify-icon icon="lucide:play" width="18" height="18"></iconify-icon><span>Start</span></button>
                  <button type="button" class="btn-toolbar-sm chrono-btn" id="btn-lap" title="Lap (L)" disabled><iconify-icon icon="lucide:flag" width="18" height="18"></iconify-icon><span>Lap</span></button>
                  <button type="button" class="btn-toolbar-sm chrono-btn" id="btn-clear" title="Reset timer (R)" disabled><iconify-icon icon="lucide:rotate-ccw" width="18" height="18"></iconify-icon><span>Reset</span></button>
                </div>
                <p class="web-muted chrono-keys"><kbd>Space</kbd> start / pause · <kbd>L</kbd> lap · <kbd>R</kbd> reset · <kbd>F</kbd> fullscreen</p>`,
    outputHtml: `
                  <div class="web-grid-2" id="lap-stats"></div>
                  <div class="web-table-wrap chrono-table-wrap"><table class="web-table chrono-table" id="lap-table"><thead><tr><th>#</th><th>Lap</th><th>Split</th><th>Δ best</th></tr></thead><tbody id="lap-body"></tbody></table></div>`,
    settingsSummary: 'Hundredths · chime on',
    settings: `
              <div class="control-item">
                <label for="opt-precision">Display precision</label>
                <select id="opt-precision" class="select-clean"><option value="2" selected>Hundredths (0.01 s)</option><option value="3">Milliseconds (0.001 s)</option><option value="1">Tenths (0.1 s)</option></select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-sound" checked><label for="opt-sound">Chime when the countdown ends</label></div>
              <div class="control-item"><input type="checkbox" id="opt-newest"><label for="opt-newest">Newest lap first</label></div>`,
    guide: [['Start', 'Press <strong>Start</strong> or hit <kbd>Space</kbd>. The clock is timestamp-based, so it stays accurate in background tabs and even survives a page reload.'],
      ['Lap', 'Press <strong>Lap</strong> or <kbd>L</kbd> at each checkpoint. Every row shows the lap time, the running split and the gap to your best lap; fastest and slowest are highlighted and the stats update live.'],
      ['Export or count down', 'Copy the laps as text or download them as CSV. Switch to <strong>Countdown</strong>, type a duration or tap a preset, and a chime plays when it reaches zero. <kbd>F</kbd> goes fullscreen for a wall display.']],
    faq: [['How accurate is it?', 'Each tick is computed from the system clock (Date.now()) rather than by counting intervals, so drift is zero — the display is only ever as late as the frame it is painted in (≈16 ms) and the stored lap times are exact to the millisecond.'],
      ['Does it keep running if I close the tab?', 'Yes. The start timestamp and laps are saved in your browser’s local storage, so reopening the page shows the correct elapsed time. Clearing site data resets it.'],
      ['Can I use it on a phone?', 'Yes — the controls are large touch targets and the display scales to the screen. Add the page to your home screen for a one-tap stopwatch. Note that mobile browsers pause JavaScript in background tabs, but because the clock is timestamp-based the time is still right when you return.'],
      ['What does “Δ best” mean?', 'The difference between that lap and your fastest lap so far, so you can see at a glance how consistent your intervals are. The average, best and worst lap appear above the table.'],
      ['Does the countdown chime need permission?', 'No — it uses the Web Audio API, which only needs you to have interacted with the page (pressing Start counts). Turn the chime off in Settings if you prefer silence.'],
      PRIVACY_FAQ]
  },
  ...GEN_TOOLS,
  ...SEO_TOOLS,
  ...HANDY_TOOLS
];

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
  ...GEN_TOOLS,
  ...SEO_TOOLS,
  ...HANDY_TOOLS
];

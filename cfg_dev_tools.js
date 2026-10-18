/* Designed by Kapil Pidhwani: the Dev batch. Same contract as cfg_web_tools.js (see its header) plus `section` (heading on /dev/).
 * Build: node gen_web_pages.js --cfg=cfg_dev_tools.js --cat=dev   ·   Wire: python3 wire_labs_dev.py */
const PRIVACY_FAQ = ['Is my code uploaded anywhere?', 'No. Formatting and minifying run in JavaScript inside your browser tab. The formatter libraries are downloaded once from a CDN; your code never leaves the page.'];
const opts = (list, sel) => list.map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');
const H = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CHECKBOX = (id, label, on) => `
              <div class="control-item"><input type="checkbox" id="${id}"${on ? ' checked' : ''}><label for="${id}">${label}</label></div>`;
const CFG_FORMATS = [['env', '.env (dotenv)'], ['json', 'JSON'], ['yaml', 'YAML'], ['toml', 'TOML'], ['ini', 'INI'], ['properties', 'Java .properties'], ['export', 'Shell export'], ['compose', 'docker-compose environment:'], ['configmap', 'Kubernetes ConfigMap / Secret']];
const LANGS = [['html', 'HTML'], ['css', 'CSS'], ['scss', 'SCSS'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['json', 'JSON'], ['sql', 'SQL'], ['xml', 'XML'], ['markdown', 'Markdown'], ['yaml', 'YAML']];

module.exports = [
  {
    slug: 'code-formatter', name: 'Code Formatter & Minifier', icon: 'lucide:wand-sparkles', section: 'Formatters & Validators', split: '50/50', css: true,
    desc: 'Free online code formatter and minifier: beautify HTML, CSS, SCSS, JavaScript, TypeScript, JSON, SQL, XML, Markdown and YAML with Prettier, or minify HTML, CSS, JS, JSON, SQL and XML. Auto-detects the language — runs in your browser.',
    lead: 'Paste messy or minified code — get it cleanly formatted with Prettier, or squeezed down to the smallest size.',
    cardDesc: 'Beautify or minify HTML, CSS, JS, TS, JSON, SQL and XML — Prettier inside.',
    tags: ['code formatter', 'code beautifier', 'prettier online', 'html formatter', 'css minifier', 'javascript minifier', 'js beautifier', 'sql formatter', 'xml formatter', 'json formatter', 'typescript formatter', 'minify code'],
    idle: 'Paste code to begin', sourceLabel: 'Input', outputLabel: 'Output', outputIcon: 'lucide:wand-sparkles', outputEmpty: 'Formatted code will appear here',
    file: { accept: '.html,.htm,.css,.scss,.js,.mjs,.cjs,.jsx,.ts,.tsx,.json,.sql,.xml,.svg,.md,.yaml,.yml,.txt' },
    sourceHtml: `
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <label class="form-label" for="opt-lang"><span>Language</span></label>
                    <select id="opt-lang" class="select-clean"><option value="auto" selected>Auto-detect</option>${opts(LANGS)}</select>
                  </div>
                  <div class="form-group">
                    <span class="form-label"><span>Mode</span></span>
                    <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Mode">
                      <button type="button" class="seg-pill active" data-value="beautify">Beautify</button>
                      <button type="button" class="seg-pill" data-value="minify">Minify</button>
                    </div>
                  </div>
                </div>
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Code</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="16" placeholder="Paste HTML, CSS, JavaScript, TypeScript, JSON, SQL, XML, Markdown or YAML…" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>`,
    outputHtml: `
                  <pre class="web-code" id="output-text" aria-live="polite"></pre>`,
    settingsSummary: '2 spaces · 80 cols · double quotes',
    settings: `
              <div class="control-item">
                <label for="opt-indent">Indent</label>
                <select id="opt-indent" class="select-clean">${opts([['2', '2 spaces'], ['4', '4 spaces'], ['tab', 'Tabs']], '2')}</select>
              </div>
              <div class="control-item">
                <label for="opt-width">Line width</label>
                <select id="opt-width" class="select-clean">${opts([['80', '80 characters'], ['100', '100 characters'], ['120', '120 characters']], '80')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-single"><label for="opt-single">Single quotes (JS / TS / CSS)</label></div>
              <div class="control-item"><input type="checkbox" id="opt-semi" checked><label for="opt-semi">Semicolons (JS / TS)</label></div>
              <div class="control-item">
                <label for="opt-dialect">SQL dialect</label>
                <select id="opt-dialect" class="select-clean">${opts([['sql', 'Standard SQL'], ['mysql', 'MySQL / MariaDB'], ['postgresql', 'PostgreSQL'], ['sqlite', 'SQLite'], ['bigquery', 'BigQuery'], ['tsql', 'SQL Server (T-SQL)'], ['plsql', 'Oracle PL/SQL'], ['snowflake', 'Snowflake']], 'sql')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-upper" checked><label for="opt-upper">Uppercase SQL keywords</label></div>
              <div class="control-item"><input type="checkbox" id="opt-mangle" checked><label for="opt-mangle">Shorten variable names when minifying JS</label></div>
              <div class="control-item"><input type="checkbox" id="opt-console"><label for="opt-console">Remove console.* calls when minifying JS</label></div>`,
    guide: [['Paste or open code', 'Paste a snippet or drop a file. The language is detected automatically — pick it yourself for SCSS, Markdown or YAML, or if the guess is wrong.'], ['Beautify or minify', '<strong>Beautify</strong> re-indents with Prettier (the formatter most teams use). <strong>Minify</strong> strips whitespace and comments — and for JavaScript, shortens names with Terser.'], ['Copy or download', 'The output updates as you type. Copy it, or download it with the right file extension. The badge shows how many bytes you saved.']],
    faq: [['Which tools does it use?', 'Beautify uses <a href="https://prettier.io" target="_blank" rel="noopener">Prettier</a> for HTML, CSS, SCSS, JS, TS, Markdown and YAML, and <a href="https://github.com/sql-formatter-org/sql-formatter" target="_blank" rel="noopener">sql-formatter</a> for SQL. Minify uses <a href="https://terser.org" target="_blank" rel="noopener">Terser</a> for JavaScript and <a href="https://github.com/css/csso" target="_blank" rel="noopener">CSSO</a> for CSS. JSON uses the browser’s own JSON engine; XML and HTML minify are built in.'], ['Is minified JavaScript safe to use?', 'Yes — Terser only applies transformations that keep behaviour identical. Turn off “Shorten variable names” if other scripts call your functions by name, and leave console calls in while debugging.'], ['What does HTML minify remove?', 'Comments and the whitespace between block-level tags (div, p, li, table…). Spaces between inline elements are kept so text doesn’t run together, and the contents of &lt;pre&gt;, &lt;textarea&gt;, &lt;script&gt; and &lt;style&gt; are left exactly as they are.'], ['Why can’t I minify TypeScript, SCSS or Markdown?', 'They are source formats that get compiled first — minify the compiled JavaScript or CSS instead. Beautify works for all of them.'], ['Why do I see “Loading formatter…”?', 'Each formatter downloads once, the first time you use that language (Prettier’s TypeScript support is the biggest at about 1 MB). After that it is cached by your browser and formatting is instant.'], PRIVACY_FAQ]
  },
  {
    slug: 'markdown-studio', name: 'Markdown Studio', icon: 'lucide:notebook-text', section: 'Formatters & Validators', split: '50/50', css: true,
    desc: 'Free online Markdown editor with live preview: convert Markdown to HTML or HTML to Markdown, GitHub-flavoured tables and task lists, then export as HTML, Markdown or PDF. Runs in your browser — nothing uploaded.',
    lead: 'Write or paste Markdown and watch it render live — or paste HTML and get clean Markdown back. Export HTML, Markdown or PDF.',
    cardDesc: 'Live preview, Markdown ⇄ HTML, export HTML / Markdown / PDF.',
    tags: ['markdown editor', 'markdown preview', 'markdown to html', 'html to markdown', 'markdown to pdf', 'md to html', 'readme preview', 'gfm', 'markdown converter', 'online markdown'],
    idle: 'Paste Markdown to begin', sourceLabel: 'Input', outputLabel: 'Output', outputIcon: 'lucide:notebook-text', outputEmpty: 'The rendered preview will appear here',
    file: { accept: '.md,.markdown,.mdown,.html,.htm,.txt' },
    downloads: [['html', 'HTML', 'lucide:code'], ['md', 'Markdown', 'lucide:file-text'], ['pdf', 'PDF (print)', 'lucide:printer']],
    sourceHtml: `
                <div class="form-group">
                  <span class="form-label"><span>Direction</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Direction">
                    <button type="button" class="seg-pill active" data-value="md2html">Markdown → HTML</button>
                    <button type="button" class="seg-pill" data-value="html2md">HTML → Markdown</button>
                  </div>
                </div>
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span id="input-label">Markdown</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="16" placeholder="# Title&#10;&#10;Some **bold** text, a [link](https://example.com) and a list:&#10;&#10;- item one&#10;- item two" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>`,
    outputHtml: `
                  <div class="segmented-group segmented-group-pill" id="seg-view" role="group" aria-label="Output view">
                    <button type="button" class="seg-pill active" data-value="preview">Preview</button>
                    <button type="button" class="seg-pill" data-value="code">Code</button>
                  </div>
                  <div class="md-preview" id="output-preview" aria-live="polite"></div>
                  <pre class="web-code" id="output-text" hidden></pre>`,
    settingsSummary: 'GFM · heading ids · full HTML page',
    settings: `
              <div class="control-item"><input type="checkbox" id="opt-gfm" checked><label for="opt-gfm">GitHub-flavoured Markdown (tables, task lists, strikethrough, autolinks)</label></div>
              <div class="control-item"><input type="checkbox" id="opt-breaks"><label for="opt-breaks">Single line breaks become &lt;br&gt;</label></div>
              <div class="control-item"><input type="checkbox" id="opt-ids" checked><label for="opt-ids">Add id attributes to headings (anchor links)</label></div>
              <div class="control-item"><input type="checkbox" id="opt-fulldoc" checked><label for="opt-fulldoc">Download HTML as a complete page (with &lt;head&gt; and print styles)</label></div>`,
    guide: [['Paste or write', 'Type Markdown on the left or drop a .md file — the preview on the right updates as you type. Switch to <strong>HTML → Markdown</strong> to paste HTML (from a web page or a CMS) and get Markdown back.'], ['Check Preview or Code', '<strong>Preview</strong> shows the rendered result; <strong>Code</strong> shows the generated HTML (or Markdown). Headings get anchor ids, tables and task lists render in GitHub style.'], ['Export', '<strong>Copy</strong> grabs the code. <strong>Download</strong> gives HTML (optionally a complete, print-ready page), Markdown, or PDF — the PDF option opens your browser’s print dialog with the rendered document, where “Save as PDF” is one click.']],
    faq: [['Which Markdown features are supported?', 'Everything in CommonMark plus GitHub extensions: tables, task lists, strikethrough, fenced code blocks and automatic links. Rendering uses <a href="https://marked.js.org" target="_blank" rel="noopener">marked</a>; HTML → Markdown uses <a href="https://github.com/mixmark-io/turndown" target="_blank" rel="noopener">Turndown</a>. Both download once, on first use.'], ['Why did my &lt;script&gt; or &lt;iframe&gt; disappear from the preview?', 'The preview is sanitised with DOMPurify so pasted content can never run code in your tab. Scripts, iframes, inline event handlers and javascript: links are removed from the rendered output and from the downloaded HTML.'], ['How does the PDF export work?', 'It renders the document into a hidden page and opens your browser’s print dialog. Choose “Save as PDF” (built into Chrome, Edge, Safari and Firefox). Page size and margins come from the print dialog; the document uses clean, print-friendly typography.'], ['Can I convert a whole web page to Markdown?', 'Yes — view the page source (Ctrl/⌘+U), copy the part you want (usually the &lt;article&gt; or &lt;main&gt;), paste it in HTML → Markdown mode. Navigation, scripts and styles are dropped; headings, lists, links, images, tables and code are kept.'], ['Does it save my document?', 'No. Nothing is stored — the text lives only in the box until you reload. Download the Markdown or HTML if you want to keep it.'], PRIVACY_FAQ]
  },
  {
    slug: 'regex-tester', name: 'Regex Tester', icon: 'lucide:regex', section: 'Encoders & Inspectors', split: '50/50', css: true,
    desc: 'Free online regex tester: write a JavaScript regular expression, see matches highlighted live with capture groups and named groups, test replacements with $1 and $<name>, and use the built-in cheat sheet. Runs in your browser — nothing uploaded.',
    lead: 'Type a pattern and a test string — matches, groups and replacements update as you type. Cheat sheet included.',
    cardDesc: 'Live matches, groups, replace mode and a cheat sheet — JavaScript flavour.',
    tags: ['regex tester', 'regular expression tester', 'regex online', 'javascript regex', 'regex match', 'regex replace', 'regex groups', 'named groups', 'regex cheat sheet', 'regexp'],
    idle: 'Enter a pattern and a test string', sourceLabel: 'Pattern & test string', outputLabel: 'Matches', outputIcon: 'lucide:regex', outputEmpty: 'Matches will be highlighted here',
    file: { accept: '.txt,.log,.csv,.json,.md,.html,.xml,.js,.css' },
    downloads: [['txt', 'Matches (.txt)', 'lucide:file-text'], ['json', 'Matches (.json)', 'lucide:braces']],
    sourceHtml: `
                <div class="form-group">
                  <label class="form-label" for="rx-pattern"><span>Pattern</span><span class="form-label-desc">JavaScript flavour</span></label>
                  <div class="rx-pattern-row">
                    <span class="rx-slash" aria-hidden="true">/</span>
                    <input type="text" id="rx-pattern" class="input-clean rx-mono" placeholder="(\\w+)@(\\w+)\\.com" spellcheck="false" autocomplete="off" autocapitalize="off">
                    <span class="rx-slash" aria-hidden="true">/</span>
                    <div class="rx-flags" role="group" aria-label="Flags">${[['g', 'Global — find every match'], ['i', 'Ignore case'], ['m', 'Multiline — ^ and $ match at line breaks'], ['s', 'Dot matches newlines'], ['u', 'Unicode'], ['y', 'Sticky — match only from lastIndex']].map(([f, t]) => `
                      <input type="checkbox" id="flag-${f}"${f === 'g' ? ' checked' : ''}><label for="flag-${f}" title="${t}">${f}</label>`).join('')}
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <span class="form-label"><span>Mode</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Mode">
                    <button type="button" class="seg-pill active" data-value="match">Match</button>
                    <button type="button" class="seg-pill" data-value="replace">Replace</button>
                  </div>
                </div>
                <div class="form-group" id="rx-replace-group" hidden>
                  <label class="form-label" for="rx-replace"><span>Replacement</span><span class="form-label-desc">$1 · $&lt;name&gt; · $&amp;</span></label>
                  <input type="text" id="rx-replace" class="input-clean rx-mono" placeholder="$2 ($1)" spellcheck="false" autocomplete="off" autocapitalize="off">
                </div>
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Test string</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="10" placeholder="Paste the text to search…" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>`,
    outputHtml: `
                  <div class="web-code rx-highlight" id="output-highlight" aria-label="Test string with matches highlighted"></div>
                  <div class="rx-matches" id="output-matches"></div>
                  <pre class="web-code" id="output-text" hidden></pre>`,
    reference: { title: 'Regex Cheat Sheet — click to insert', html: `          <div class="rx-sheet">${[
      ['Characters', [['.', 'any char but newline'], ['\\d', 'digit 0-9'], ['\\D', 'not a digit'], ['\\w', 'word char [A-Za-z0-9_]'], ['\\W', 'not a word char'], ['\\s', 'whitespace'], ['\\S', 'not whitespace'], ['[abc]', 'one of a, b, c'], ['[^abc]', 'not a, b or c'], ['[a-z]', 'range'], ['\\.', 'literal dot'], ['\\n', 'newline'], ['\\t', 'tab']]],
      ['Quantifiers', [['*', '0 or more'], ['+', '1 or more'], ['?', '0 or 1'], ['{3}', 'exactly 3'], ['{2,5}', '2 to 5'], ['{2,}', '2 or more'], ['*?', 'lazy (fewest)'], ['+?', 'lazy 1 or more']]],
      ['Anchors', [['^', 'start of string / line (m)'], ['$', 'end of string / line (m)'], ['\\b', 'word boundary'], ['\\B', 'not a word boundary']]],
      ['Groups', [['(abc)', 'capture group'], ['(?:abc)', 'non-capturing'], ['(?<name>abc)', 'named group'], ['a|b', 'a or b'], ['\\1', 'back-reference to group 1'], ['\\k<name>', 'back-reference by name']]],
      ['Lookaround', [['(?=x)', 'followed by x'], ['(?!x)', 'not followed by x'], ['(?<=x)', 'preceded by x'], ['(?<!x)', 'not preceded by x']]]
    ].map(([h, items]) => `
            <section class="rx-sheet-group">
              <h3>${h}</h3>
              <div class="rx-chips">${items.map(([t, d]) => `<button type="button" class="rx-chip" data-insert="${H(t)}"><code>${H(t)}</code><span>${d}</span></button>`).join('')}</div>
            </section>`).join('')}
            <section class="rx-sheet-group">
              <h3>Common patterns</h3>
              <div class="rx-chips">${[
      ['Email', '[\\w.+-]+@[\\w-]+\\.[\\w.-]+'], ['URL', 'https?:\\/\\/[^\\s/$.?#][^\\s]*'], ['IPv4', '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b'], ['Date YYYY-MM-DD', '\\b\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b'],
      ['Hex colour', '#(?:[0-9a-fA-F]{3}){1,2}\\b'], ['Indian mobile', '\\b[6-9]\\d{9}\\b'], ['Indian PIN code', '\\b[1-9]\\d{5}\\b'], ['Time HH:MM', '\\b([01]\\d|2[0-3]):[0-5]\\d\\b']
    ].map(([n, p]) => `<button type="button" class="rx-chip" data-pattern="${H(p)}"><code>${n}</code><span>${H(p)}</span></button>`).join('')}</div>
            </section>
          </div>` },
    guide: [['Write the pattern', 'Type a JavaScript regular expression between the slashes and tick the flags you need (<strong>g</strong> finds every match, <strong>i</strong> ignores case, <strong>m</strong> makes ^ and $ work per line). Click any token in the cheat sheet below to insert it.'], ['Paste a test string', 'Matches light up in the text as you type, and each one is listed with its position, numbered groups and named groups. An invalid pattern shows the exact syntax error under the input.'], ['Replace or export', 'Switch to <strong>Replace</strong> to preview a substitution — <code>$1</code>, <code>$&lt;name&gt;</code> and <code>$&amp;</code> work as in JavaScript. Copy the result, or download the match list as text or JSON.']],
    faq: [['Which regex flavour is this?', 'JavaScript (ECMAScript), exactly as your browser runs it — the same engine Node.js, React and every web page use. Named groups, lookbehind, Unicode property escapes (with the <strong>u</strong> flag) and the <strong>s</strong> flag are all supported. PCRE-only syntax such as possessive quantifiers or <code>\\A</code> is not.'], ['Why does it say “pattern took more than 1.5 s”?', 'Patterns with nested quantifiers like <code>(a+)+$</code> can backtrack exponentially on the wrong input. Matching runs in a background thread with a time limit, so the page stays responsive and tells you instead of freezing. Make the inner quantifier possessive-style by using a character class, or anchor the pattern.'], ['How do capture groups show up?', 'Each match lists its numbered groups (1, 2, …) and named groups (<code>(?&lt;year&gt;\\d{4})</code> appears as <em>year</em>). In Replace mode use <code>$1</code> or <code>$&lt;year&gt;</code> to reuse them.'], ['Is there a limit on text size or matches?', 'The test string can be up to 50 MB if you open a file, but highlighting is drawn for the first 200,000 characters and the first 2,000 matches so the page stays fast. The badge tells you when either limit kicks in; the match count and Replace output are still complete.'], ['Why does my pattern match nothing with the y flag?', 'Sticky (<strong>y</strong>) only tries to match at the current position (0 to begin with), so it behaves like an anchored search. Untick it unless you specifically need that behaviour.'], PRIVACY_FAQ]
  },
  {
    slug: 'html-css-js-playground', name: 'HTML / CSS / JS Playground', icon: 'lucide:code', section: 'Formatters & Validators', layout: 'stacked', css: true,
    desc: 'Free online HTML, CSS and JavaScript playground: write code in three editors, run it in a sandboxed preview with a console, and share the result as a link — no account, nothing stored. Download as a single HTML file or a ZIP.',
    lead: 'Three editors, a live sandboxed preview and a console — share the whole thing as a link, no sign-up.',
    cardDesc: '3-pane live editor, sandboxed preview + console, share by link.',
    tags: ['html css js playground', 'online code editor', 'live html editor', 'javascript playground', 'codepen alternative', 'jsfiddle alternative', 'run html online', 'css sandbox', 'web playground', 'html preview'],
    idle: 'Write some HTML, CSS or JavaScript', sourceLabel: 'Editors', outputLabel: 'Preview', outputIcon: 'lucide:code', outputEmpty: 'Press Run (or turn on auto-run) to see the result',
    action: 'Run', actionIcon: 'lucide:play',
    downloads: [['html', 'Single HTML file', 'lucide:file-code'], ['zip', 'index.html + style.css + script.js (.zip)', 'lucide:file-archive'], ['link', 'Share link (.txt)', 'lucide:link']],
    sourceHtml: `
                <div class="pg-editors">
                  <div class="form-group form-group-grow"><label class="form-label" for="pg-html"><span>HTML</span><span class="form-label-desc" id="pg-html-count"></span></label><textarea id="pg-html" class="textarea-clean pg-code" rows="12" placeholder="&lt;h1&gt;Hello&lt;/h1&gt;&#10;&lt;button id=&quot;go&quot;&gt;Click&lt;/button&gt;" spellcheck="false" autocapitalize="off" data-file-target></textarea></div>
                  <div class="form-group form-group-grow"><label class="form-label" for="pg-css"><span>CSS</span><span class="form-label-desc" id="pg-css-count"></span></label><textarea id="pg-css" class="textarea-clean pg-code" rows="12" placeholder="body { font-family: system-ui; padding: 2rem; }" spellcheck="false" autocapitalize="off"></textarea></div>
                  <div class="form-group form-group-grow"><label class="form-label" for="pg-js"><span>JavaScript</span><span class="form-label-desc" id="pg-js-count"></span></label><textarea id="pg-js" class="textarea-clean pg-code" rows="12" placeholder="document.getElementById('go').onclick = () => console.log('clicked');" spellcheck="false" autocapitalize="off"></textarea></div>
                </div>`,
    outputHtml: `
                  <div class="pg-result">
                    <iframe id="pg-frame" class="pg-frame" title="Preview" sandbox="allow-scripts allow-modals allow-forms allow-popups" referrerpolicy="no-referrer"></iframe>
                    <div class="pg-console" id="pg-console" aria-live="polite" aria-label="Console"></div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="pg-link"><span>Share link</span><span class="form-label-desc">the code lives in the URL — nothing is stored</span></label>
                    <div class="web-inline"><input type="text" id="pg-link" class="input-clean pg-link" readonly placeholder="Appears after the first run"><button type="button" class="btn-toolbar-sm" id="btn-link"><iconify-icon icon="lucide:link" width="14" height="14"></iconify-icon><span>Copy link</span></button></div>
                  </div>`,
    settingsSummary: 'Auto-run on · no CSS reset · no Tailwind',
    settings: `${CHECKBOX('opt-auto', 'Auto-run while typing (600 ms after you stop)', true)}${CHECKBOX('opt-normalize', 'Add normalize.css', false)}${CHECKBOX('opt-tailwind', 'Add Tailwind CSS (Play CDN)', false)}${CHECKBOX('opt-console', 'Show the console', true)}
              <div class="control-item">
                <label for="opt-tab">Tab key inserts</label>
                <select id="opt-tab" class="select-clean">${opts([['2', '2 spaces'], ['4', '4 spaces'], ['\\t', 'Tab character']], '2')}</select>
              </div>`,
    guide: [['Write', 'Type HTML, CSS and JavaScript in the three editors — Tab indents, Ctrl/⌘ + Enter runs. Drop an .html file onto the HTML editor to start from it.'], ['Run and debug', 'The preview is a sandboxed iframe: your script cannot touch Toolity, cookies or storage. <code>console.log</code>, warnings, errors and uncaught exceptions appear in the console under the preview, with line numbers where the browser provides them.'], ['Share or export', '<strong>Download ▾ Share link</strong> (or Copy) gives a URL with the whole pen compressed into it — open it anywhere, no account. Download a single self-contained HTML file, or a ZIP with the three files separated.']],
    faq: [['Where is my code saved?', 'Nowhere — Toolity has no server and this page uses no storage. The share link <em>is</em> the save: the three editors are compressed (deflate, via the browser’s CompressionStream) and base64-encoded into the URL fragment, which is never sent to any server. A typical pen is 1–3 KB of URL; browsers handle links up to about 60 KB.'], ['How safe is the preview?', 'It runs in an iframe with <code>sandbox="allow-scripts allow-modals allow-forms allow-popups"</code> and no <code>allow-same-origin</code>, so the code gets a unique opaque origin: it cannot read Toolity’s cookies or localStorage, cannot navigate this page, and network requests are subject to the usual CORS rules.'], ['Can I use libraries?', 'Yes — add a <code>&lt;script src="https://cdn.jsdelivr.net/npm/…"&gt;</code> or <code>&lt;link&gt;</code> tag in the HTML editor. Settings also offer one-click normalize.css and the Tailwind Play CDN. Modules work too: <code>&lt;script type="module"&gt;</code> with <code>import</code> from a CDN URL.'], ['Why is there no syntax highlighting?', 'The editors are plain textareas so the page loads instantly and works offline with zero dependencies. Tab indenting, line counts and Ctrl/⌘ + Enter are there; a full editor would add ~300 KB. Paste from your IDE for anything long.'], ['Does the console show everything?', '<code>console.log / info / warn / error / table (as JSON)</code>, uncaught errors and unhandled promise rejections are forwarded from the sandbox. Objects are printed as JSON (circular structures are flattened); DOM nodes print as their outerHTML.'], PRIVACY_FAQ]
  },
  {
    slug: 'config-converter', name: 'Config Converter', icon: 'lucide:settings-2', section: 'Formatters & Validators', split: '50/50', css: true,
    desc: 'Free online config converter: convert between .env, JSON, YAML, TOML, INI, Java .properties, shell exports, docker-compose environment blocks and Kubernetes ConfigMaps / Secrets — with duplicate-key and quoting checks. Runs in your browser; nothing uploaded.',
    lead: 'Paste any config — .env, JSON, YAML, TOML, INI, properties, compose or ConfigMap — and get it back in any other format, with the quoting handled.',
    cardDesc: '.env ⇄ JSON ⇄ YAML ⇄ TOML ⇄ INI ⇄ compose ⇄ ConfigMap.',
    tags: ['env to json', 'json to env', 'yaml to env', 'env to yaml', 'dotenv converter', 'docker compose environment', 'kubernetes configmap generator', 'toml to json', 'ini to json', 'properties to yaml', 'config converter'],
    idle: 'Paste a config to begin', sourceLabel: 'Input', outputLabel: 'Output', outputIcon: 'lucide:settings-2', outputEmpty: 'The converted config will appear here',
    file: { accept: '.env,.json,.yaml,.yml,.toml,.ini,.properties,.cfg,.conf,.sh,.txt' },
    sourceHtml: `
                <div class="web-convert-row">
                  <div class="form-group">
                    <label class="form-label" for="opt-from"><span>From</span></label>
                    <select id="opt-from" class="select-clean"><option value="auto" selected>Auto-detect</option>${opts(CFG_FORMATS)}</select>
                  </div>
                  <button type="button" class="web-row-btn" id="btn-swap" title="Swap From and To" aria-label="Swap From and To"><iconify-icon icon="lucide:arrow-left-right" width="16" height="16"></iconify-icon></button>
                  <div class="form-group">
                    <label class="form-label" for="opt-to"><span>To</span></label>
                    <select id="opt-to" class="select-clean">${opts(CFG_FORMATS, 'json')}</select>
                  </div>
                </div>
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Config</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="14" placeholder="DATABASE_URL=postgres://user:pass@localhost:5432/app&#10;PORT=3000&#10;DEBUG=true&#10;# comments are kept out of the output" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>`,
    outputHtml: `
                  <pre class="web-code" id="output-text"></pre>
                  <div class="web-tags" id="output-issues"></div>`,
    settingsSummary: 'Nest on __ · typed values · quote when needed',
    settings: `
              <div class="control-item">
                <label for="opt-nest">Flat ⇄ nested key rule</label>
                <select id="opt-nest" class="select-clean">${opts([['__', 'A__B ⇄ A.B (double underscore — compose / .NET style)'], ['.', 'A.B ⇄ A.B (dots)'], ['none', 'Never nest / flatten']], '__')}</select>
              </div>
              <div class="control-item">
                <label for="opt-case">Key case for flat formats</label>
                <select id="opt-case" class="select-clean">${opts([['upper', 'UPPER_SNAKE'], ['keep', 'Keep as-is']], 'upper')}</select>
              </div>${CHECKBOX('opt-types', 'Type values when going to JSON / YAML / TOML (true, 42, null)', true)}${CHECKBOX('opt-quote', 'Quote .env values only when needed (spaces, #, $, quotes)', true)}${CHECKBOX('opt-secret', 'Base64-encode values for Kubernetes Secret output', false)}`,
    guide: [['Paste the source', 'Drop a file or paste text. The format is detected from the shape — JSON braces, YAML keys, TOML tables, <code>KEY=value</code> lines, <code>export KEY=</code>, <code>[sections]</code>, compose <code>environment:</code> or a ConfigMap <code>data:</code> block. Override it with the From menu if the guess is wrong.'], ['Pick the target', 'Flat formats (.env, export, properties, compose, ConfigMap) and nested formats (JSON, YAML, TOML, INI) interconvert using the key rule in Settings — <code>DB__HOST</code> becomes <code>{ "DB": { "HOST": … } }</code> and back. Values are typed on the way to JSON / YAML / TOML and quoted on the way to .env only when they contain spaces, <code>#</code>, <code>$</code> or quotes.'], ['Check and download', 'Duplicate keys, keys that are invalid for the target (a dash in an env name), values that needed quoting and anything that looks like a secret are listed under the output. Download with the right extension and file name (<code>.env</code>, <code>configmap.yaml</code>, …).']],
    faq: [['Does it handle multi-line values and comments?', 'Yes. Quoted multi-line .env values (double quotes spanning lines, or <code>\\\\n</code> escapes) are read correctly; comments (<code>#</code>, <code>;</code> in INI, <code>!</code> in properties) are dropped from the output because most target formats have no place for them. Quoted values are unquoted on read and re-quoted only when the target needs it.'], ['What is the __ rule?', 'Flat formats cannot nest, so a convention is needed: <code>DATABASE__HOST=db</code> ↔ <code>database: { host: db }</code> is the double-underscore rule used by docker-compose overrides, ASP.NET and many config libraries. Choose dots if your keys look like <code>spring.datasource.url</code>, or “Never nest” to keep everything flat (nested input is then flattened with the same separator).'], ['How are types decided?', 'When converting to JSON / YAML / TOML, values that are exactly <code>true</code>/<code>false</code>, integers, decimals or <code>null</code> become those types; everything else stays a string. Untick “Type values” to keep every value a string — safer for ZIP codes, version numbers and IDs with leading zeros.'], ['Kubernetes Secret or ConfigMap?', 'ConfigMap output writes values as plain text under <code>data:</code>. Tick “Base64-encode values” to emit a <code>kind: Secret</code> with base64 values under <code>data:</code> — which is encoding, not encryption; keep real secrets out of pasted text and use a secrets manager.'], ['Are my secrets safe here?', 'The conversion runs entirely in your browser; nothing is sent anywhere. The “looks like a secret” warning exists because people paste real credentials into online tools — this one never transmits them, but your clipboard, screen and browser history still exist.'], PRIVACY_FAQ]
  },
  {
    slug: 'hash-id-generator', name: 'Hash & ID Generator', icon: 'lucide:fingerprint', section: 'Encoders & Inspectors', split: '40/60', css: true,
    desc: 'Free online hash and ID generator: MD5, SHA-1, SHA-256, SHA-384 and SHA-512 (with HMAC) for text or files, checksum verification, plus UUID v4 / v7, ULID, nanoid and short IDs in bulk — all generated in your browser with Web Crypto.',
    lead: 'Hash text or a file with MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512 (optionally HMAC), verify a checksum, or generate UUIDs, ULIDs and nanoids in bulk.',
    cardDesc: 'MD5 / SHA / HMAC for text & files, checksum verify, UUID v4/v7, ULID, nanoid.',
    tags: ['hash generator', 'sha256 generator', 'md5 generator', 'sha512 hash', 'hmac generator', 'checksum verifier', 'uuid generator', 'uuid v7', 'ulid generator', 'nanoid', 'random id generator', 'file hash'],
    idle: 'Enter text, drop a file, or switch to IDs', sourceLabel: 'Input', outputLabel: 'Result', outputIcon: 'lucide:fingerprint', outputEmpty: 'Hashes or IDs will appear here',
    file: { accept: '*/*' },
    downloads: [['txt', 'Text (.txt)', 'lucide:file-text'], ['json', 'JSON (.json)', 'lucide:braces'], ['csv', 'CSV (.csv)', 'lucide:table']],
    sourceHtml: `
                <div class="form-group">
                  <span class="form-label"><span>Mode</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Mode">
                    <button type="button" class="seg-pill active" data-value="hash">Hash</button>
                    <button type="button" class="seg-pill" data-value="ids">IDs</button>
                  </div>
                </div>
                <div class="web-group" id="hash-pane">
                  <div class="form-group form-group-grow">
                    <label class="form-label" for="text-input"><span>Text</span><span class="form-label-desc" id="input-count"></span></label>
                    <textarea id="text-input" class="textarea-clean" rows="6" placeholder="Type or paste text — or open / drop a file above" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="hash-key"><span>HMAC key (optional)</span><span class="form-label-desc">turns SHA-* into HMAC-SHA-*</span></label>
                    <input type="text" id="hash-key" class="input-clean" placeholder="secret" spellcheck="false" autocomplete="off" autocapitalize="off">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="hash-expect"><span>Verify against (optional)</span><span class="form-label-desc">paste an expected checksum</span></label>
                    <input type="text" id="hash-expect" class="input-clean" placeholder="e.g. the sha256 from a download page" spellcheck="false" autocomplete="off" autocapitalize="off">
                  </div>
                </div>
                <div class="web-group" id="ids-pane" hidden>
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group">
                      <label class="form-label" for="id-type"><span>ID type</span></label>
                      <select id="id-type" class="select-clean">${opts([['uuid4', 'UUID v4 (random)'], ['uuid7', 'UUID v7 (time-ordered)'], ['ulid', 'ULID'], ['nanoid', 'nanoid'], ['cuid', 'CUID2-style'], ['short', 'Short ID (base62)'], ['otp', 'Numeric code (OTP)']], 'uuid4')}</select>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="id-count"><span>How many</span></label>
                      <input type="number" id="id-count" class="input-clean" min="1" max="1000" value="10" inputmode="numeric">
                    </div>
                  </div>
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group">
                      <label class="form-label" for="id-len"><span>Length</span><span class="form-label-desc">nanoid · short · OTP</span></label>
                      <input type="number" id="id-len" class="input-clean" min="4" max="64" value="21" inputmode="numeric">
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="id-format"><span>UUID format</span></label>
                      <select id="id-format" class="select-clean">${opts([['plain', 'lowercase'], ['upper', 'UPPERCASE'], ['nodash', 'no dashes'], ['braces', '{braces}']], 'plain')}</select>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="id-decode"><span>Decode a UUID v7 / ULID</span><span class="form-label-desc">shows the embedded time</span></label>
                    <input type="text" id="id-decode" class="input-clean" placeholder="paste an id" spellcheck="false" autocomplete="off" autocapitalize="off">
                  </div>
                </div>`,
    outputHtml: `
                  <div class="hash-rows" id="output-rows"></div>
                  <pre class="web-code" id="output-text" hidden></pre>`,
    settingsSummary: 'Hex · lowercase',
    settings: `
              <div class="control-item">
                <label for="opt-enc">Hash encoding</label>
                <select id="opt-enc" class="select-clean">${opts([['hex', 'Hex'], ['base64', 'Base64'], ['base64url', 'Base64url']], 'hex')}</select>
              </div>${CHECKBOX('opt-upper', 'Uppercase hex', false)}
              <div class="control-item">
                <label for="opt-alpha">nanoid alphabet</label>
                <select id="opt-alpha" class="select-clean">${opts([['url', 'A–Z a–z 0–9 _ - (URL-safe, default)'], ['alnum', 'A–Z a–z 0–9'], ['lower', 'a–z 0–9'], ['hex', '0–9 a–f'], ['nolook', 'No look-alikes (no 0 O 1 l I)']], 'url')}</select>
              </div>`,
    guide: [['Hash text or a file', 'Type text or drop any file (up to 50 MB) — MD5, SHA-1, SHA-256, SHA-384 and SHA-512 are computed at once with the browser’s Web Crypto. Add an HMAC key to get keyed hashes; paste an expected checksum into <strong>Verify against</strong> and the matching algorithm lights up green (or red).'], ['Generate IDs', 'Switch to <strong>IDs</strong>: UUID v4 for random identifiers, UUID v7 or ULID when you want them to sort by creation time, nanoid for short URL-safe tokens, or a numeric code. Set how many (up to 1,000) and the format; paste a v7 / ULID into the decode box to read its timestamp.'], ['Copy or export', 'Click any row to copy that value, or use Copy for all of them. Download as text, JSON or CSV.']],
    faq: [['Is MD5 safe to use?', 'For checksums (did my download arrive intact?) and non-security fingerprints, yes. For passwords, signatures or anything an attacker could tamper with, no — MD5 and SHA-1 are broken for collision resistance; use SHA-256 or better, and for passwords use a dedicated slow hash (bcrypt, scrypt, Argon2) on the server.'], ['How are the hashes computed?', 'SHA-1/256/384/512 and HMAC use the browser’s native <code>crypto.subtle</code>; MD5 is a small built-in implementation (Web Crypto deliberately omits it), checked against the RFC 1321 test vectors. Files are read into memory and hashed in one call — fine up to the 50 MB limit.'], ['UUID v4 or v7?', 'v4 is 122 random bits — use it when ordering doesn’t matter. v7 puts a millisecond timestamp in the first 48 bits, so ids generated later sort later: much friendlier for database indexes and logs. ULID is the same idea in a shorter, case-insensitive base32 form. All three are generated with <code>crypto.getRandomValues</code>.'], ['How random are nanoids and short ids?', 'They use <code>crypto.getRandomValues</code> with rejection sampling, so every character is uniformly random — no modulo bias. A 21-character nanoid (the default) has the same collision resistance as a UUID v4; the length box lets you trade length for safety.'], ['Why can’t I see the file’s hash while typing?', 'Dropping a file replaces the text — the hash is of the file’s bytes, not its name. To hash text again, clear the box or press Reset.'], PRIVACY_FAQ]
  }
];

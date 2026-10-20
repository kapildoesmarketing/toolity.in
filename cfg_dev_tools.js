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
    slug: 'code-formatter', jsV: '1.1', name: 'Code Formatter & Minifier', icon: 'lucide:wand-sparkles', section: 'Formatters & Validators', split: '50/50', css: true,
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
                <select id="opt-dialect" class="select-clean">${opts([['sql', 'Standard SQL'], ['mysql', 'MySQL'], ['mariadb', 'MariaDB'], ['postgresql', 'PostgreSQL'], ['sqlite', 'SQLite'], ['duckdb', 'DuckDB'], ['bigquery', 'BigQuery'], ['tsql', 'SQL Server (T-SQL)'], ['plsql', 'Oracle PL/SQL'], ['snowflake', 'Snowflake'], ['redshift', 'Amazon Redshift'], ['spark', 'Spark SQL'], ['hive', 'Hive'], ['trino', 'Trino / Presto'], ['db2', 'IBM Db2'], ['singlestoredb', 'SingleStore'], ['tidb', 'TiDB'], ['n1ql', 'Couchbase N1QL']], 'sql')}</select>
              </div>
              <div class="control-item">
                <label for="opt-keycase">SQL keyword case</label>
                <select id="opt-keycase" class="select-clean">${opts([['upper', 'UPPERCASE'], ['lower', 'lowercase'], ['preserve', 'Keep as typed']], 'upper')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-mangle" checked><label for="opt-mangle">Shorten variable names when minifying JS</label></div>
              <div class="control-item"><input type="checkbox" id="opt-console"><label for="opt-console">Remove console.* calls when minifying JS</label></div>`,
    guide: [['Paste or open code', 'Paste a snippet or drop a file. The language is detected automatically — pick it yourself for SCSS, Markdown or YAML, or if the guess is wrong.'], ['Beautify or minify', '<strong>Beautify</strong> re-indents with Prettier (the formatter most teams use). <strong>Minify</strong> strips whitespace and comments — and for JavaScript, shortens names with Terser.'], ['Copy or download', 'The output updates as you type. Copy it, or download it with the right file extension. The badge shows how many bytes you saved.']],
    faq: [['Which tools does it use?', 'Beautify uses <a href="https://prettier.io" target="_blank" rel="noopener">Prettier</a> for HTML, CSS, SCSS, JS, TS, Markdown and YAML, and <a href="https://github.com/sql-formatter-org/sql-formatter" target="_blank" rel="noopener">sql-formatter</a> for SQL. Minify uses <a href="https://terser.org" target="_blank" rel="noopener">Terser</a> for JavaScript and <a href="https://github.com/css/csso" target="_blank" rel="noopener">CSSO</a> for CSS. JSON uses the browser’s own JSON engine; XML and HTML minify are built in.'], ['Is minified JavaScript safe to use?', 'Yes — Terser only applies transformations that keep behaviour identical. Turn off “Shorten variable names” if other scripts call your functions by name, and leave console calls in while debugging.'], ['What does HTML minify remove?', 'Comments and the whitespace between block-level tags (div, p, li, table…). Spaces between inline elements are kept so text doesn’t run together, and the contents of &lt;pre&gt;, &lt;textarea&gt;, &lt;script&gt; and &lt;style&gt; are left exactly as they are.'], ['Why can’t I minify TypeScript, SCSS or Markdown?', 'They are source formats that get compiled first — minify the compiled JavaScript or CSS instead. Beautify works for all of them.'], ['Which SQL dialects are supported?', 'Standard SQL plus MySQL, MariaDB, PostgreSQL, SQLite, DuckDB, BigQuery, SQL Server (T-SQL), Oracle PL/SQL, Snowflake, Redshift, Spark, Hive, Trino/Presto, Db2, SingleStore, TiDB and Couchbase N1QL. Pick the dialect in Settings so vendor-specific keywords and quoting are understood, choose UPPERCASE, lowercase or as-typed keywords, and use Minify to collapse a query to one line.'], ['Why do I see “Loading formatter…”?', 'Each formatter downloads once, the first time you use that language (Prettier’s TypeScript support is the biggest at about 1 MB). After that it is cached by your browser and formatting is instant.'], PRIVACY_FAQ]
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
  },
  {
    slug: 'cron-builder', name: 'Cron Builder', icon: 'lucide:alarm-clock', section: 'Encoders & Inspectors', split: '50/50', css: true,
    desc: 'Free online cron expression builder and explainer: build a schedule visually or paste an expression, read it in plain English, and see the next 10 run times in any time zone. Supports 5- and 6-field cron, @aliases, L, W and # — all in your browser.',
    lead: 'Build a cron schedule visually or paste one, read it in plain English, and see exactly when it will run next in your time zone.',
    cardDesc: 'Visual schedule ⇄ cron expression, plain English, next runs in any time zone.',
    tags: ['cron', 'crontab', 'cron expression', 'cron builder', 'cron generator', 'schedule', 'cron explainer', 'next run', 'quartz', 'kubernetes cronjob', 'github actions schedule', 'time zone', 'every 5 minutes'],
    sourceLabel: 'Schedule', outputLabel: 'Explanation & next runs', outputIcon: 'lucide:alarm-clock', outputEmpty: 'Build or paste a cron expression', idle: 'Enter an expression',
    downloads: [['txt', 'Text (.txt)', 'lucide:file-text'], ['json', 'JSON (.json)', 'lucide:braces']],
    sourceHtml: `
                <div class="form-group">
                  <label class="form-label" for="cron-input"><span>Cron expression</span><span class="form-label-desc" id="cron-fields-hint">minute · hour · day · month · weekday</span></label>
                  <div class="web-inline">
                    <input type="text" id="cron-input" class="input-clean cb-expr" placeholder="*/15 9-17 * * 1-5" spellcheck="false" autocomplete="off" autocapitalize="off">
                    <select id="cron-preset" class="select-clean cb-preset" aria-label="Presets">${opts([['', 'Presets…'], ['* * * * *', 'Every minute'], ['*/5 * * * *', 'Every 5 minutes'], ['*/15 * * * *', 'Every 15 minutes'], ['0 * * * *', 'Every hour'], ['0 */6 * * *', 'Every 6 hours'], ['0 0 * * *', 'Daily at midnight'], ['0 9 * * *', 'Daily at 09:00'], ['30 9 * * 1-5', 'Weekdays at 09:30'], ['0 0 * * 0', 'Weekly on Sunday'], ['0 0 1 * *', 'Monthly on the 1st'], ['0 0 L * *', 'Last day of the month'], ['0 9 * * 1#1', 'First Monday at 09:00'], ['0 0 1 1 *', 'Yearly on 1 Jan']], '')}</select>
                  </div>
                </div>
                <div class="cb-builder" id="cron-builder" aria-label="Visual builder"></div>`,
    outputHtml: `
                  <div class="cb-headline" id="output-human"></div>
                  <div class="web-tags" id="output-flags"></div>
                  <ol class="cb-runs" id="output-runs"></ol>`,
    settingsSummary: 'Device time zone · 10 runs · 5 fields',
    settings: `
              <div class="control-item">
                <label for="opt-tz">Time zone for next runs</label>
                <select id="opt-tz" class="select-clean"><option value="" selected>Device time zone</option></select>
              </div>
              <div class="control-item">
                <label for="opt-count">Runs to show</label>
                <select id="opt-count" class="select-clean">${opts([['5', '5'], ['10', '10'], ['20', '20'], ['50', '50']], '10')}</select>
              </div>${CHECKBOX('opt-seconds', 'Six fields — leading seconds (Quartz, Spring, some schedulers)', false)}${CHECKBOX('opt-24h', 'Show run times as 24-hour', true)}`,
    reference: { title: 'Cron fields & special characters', html: `
          <div class="web-table-wrap"><table class="web-table cb-ref"><thead><tr><th>Field</th><th>Allowed values</th><th>Special characters</th></tr></thead><tbody>
            <tr><th>Seconds (6-field only)</th><td>0–59</td><td><code>, - * /</code></td></tr>
            <tr><th>Minute</th><td>0–59</td><td><code>, - * /</code></td></tr>
            <tr><th>Hour</th><td>0–23</td><td><code>, - * /</code></td></tr>
            <tr><th>Day of month</th><td>1–31</td><td><code>, - * / ? L W</code> — <code>L</code> last day, <code>15W</code> nearest weekday to the 15th</td></tr>
            <tr><th>Month</th><td>1–12 or JAN–DEC</td><td><code>, - * /</code></td></tr>
            <tr><th>Day of week</th><td>0–7 or SUN–SAT (0 and 7 are Sunday)</td><td><code>, - * / ? L #</code> — <code>5L</code> last Friday, <code>1#2</code> second Monday</td></tr>
            <tr><th>Aliases</th><td colspan="2"><code>@yearly @annually @monthly @weekly @daily @midnight @hourly</code> expand to a standard expression; <code>@reboot</code> runs at start-up and has no next-run list.</td></tr>
          </tbody></table></div>` },
    guide: [['Build or paste', 'Pick a preset, type an expression, or use the visual builder: each field can be <em>every</em>, <em>every N</em>, <em>between</em> or <em>specific values</em> (click the chips). The builder and the expression stay in sync in both directions.'], ['Read it back', 'The right pane explains the schedule in plain English and lists the next runs in your device time zone — or any zone from Settings, so a server in UTC and a team in Mumbai see the same thing. Warnings flag expressions that never run or mix day-of-month with day-of-week.'], ['Copy into your scheduler', 'Copy the expression for crontab, Kubernetes CronJob, GitHub Actions or a cloud scheduler. Turn on <em>Six fields</em> for Quartz / Spring style schedules with a seconds column. Download the explanation and run list as text or JSON.']],
    faq: [['Which cron syntax does this follow?', 'Standard Vixie / POSIX cron (what crontab, Kubernetes, GitHub Actions and most cloud schedulers use): five fields, <code>,</code> lists, <code>-</code> ranges, <code>/</code> steps, names for months and weekdays, and the <code>@hourly</code>-style aliases. The Quartz extensions <code>L</code>, <code>W</code>, <code>#</code> and <code>?</code> are also understood, as is a leading seconds field when you turn it on. Year fields and non-standard words are not.'], ['Why does “1 and Monday” run more often than I expected?', 'When both day-of-month and day-of-week are restricted (neither is <code>*</code>), classic cron runs on days that match <em>either</em> one — <code>0 9 1 * 1</code> fires on the 1st <em>and</em> every Monday. The tool warns about this; use <code>#</code>, <code>L</code> or two separate jobs if you meant “and”.'], ['How are time zones handled?', 'Cron expressions have no time zone of their own — the scheduler’s zone applies. Pick the zone your server or platform uses in Settings and the next-run list is computed there, including daylight-saving changes: a time that does not exist on a spring-forward night is skipped, as real cron does.'], ['Why is the next-run list empty?', 'Either the expression can never match (for example <code>0 0 31 2 *</code> — there is no 31 February), or it is <code>@reboot</code>, which runs at start-up only. The tool searches up to five years ahead.'], ['Does this check how my specific scheduler reads it?', 'No — it validates the expression and simulates standard cron. Some platforms add limits (GitHub Actions runs at most every 5 minutes, AWS EventBridge uses a 6-field form with a year and requires <code>?</code>); check their docs for those rules.'], ['Is anything sent to a server?', 'No. Parsing and the next-run calculation happen in JavaScript in your browser; nothing you type leaves the page.']]
  },
  {
    slug: 'jwt-builder-verifier', name: 'JWT Builder & Verifier', icon: 'lucide:shield-check', section: 'Encoders & Inspectors', split: '50/50', css: true,
    desc: 'Free online JWT builder and verifier: sign tokens with HS256/384/512, RS256, PS256 or ES256 using Web Crypto, verify signatures with a secret, PEM public key or JWKS, check exp / nbf / iat, and decode any token — entirely in your browser, nothing is uploaded.',
    lead: 'Sign, decode and verify JSON Web Tokens with HS, RS, PS and ES algorithms — secrets and keys never leave your browser.',
    cardDesc: 'Sign HS/RS/PS/ES tokens, verify with secret, PEM or JWKS, check exp/nbf.',
    tags: ['jwt', 'json web token', 'jwt builder', 'jwt verifier', 'jwt decoder', 'hs256', 'rs256', 'es256', 'jwks', 'sign jwt', 'verify signature', 'exp', 'bearer token', 'oauth', 'oidc', 'web crypto'],
    sourceLabel: 'Token', outputLabel: 'Result', outputIcon: 'lucide:shield-check', outputEmpty: 'The signed or decoded token appears here', idle: 'Enter a payload or paste a token',
    downloads: [['txt', 'Token / result (.txt)', 'lucide:file-text'], ['json', 'Decoded (.json)', 'lucide:braces'], ['pem-private', 'Private key (.pem)', 'lucide:key-round'], ['pem-public', 'Public key (.pem)', 'lucide:key']],
    sourceHtml: `
                <div class="form-group">
                  <span class="form-label"><span>Mode</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Mode">
                    <button type="button" class="seg-pill active" data-value="build">Build & sign</button>
                    <button type="button" class="seg-pill" data-value="verify">Verify & decode</button>
                  </div>
                </div>
                <div class="web-group" id="pane-build">
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group">
                      <label class="form-label" for="jwt-alg"><span>Algorithm</span></label>
                      <select id="jwt-alg" class="select-clean">${opts([['HS256', 'HS256 · HMAC SHA-256'], ['HS384', 'HS384 · HMAC SHA-384'], ['HS512', 'HS512 · HMAC SHA-512'], ['RS256', 'RS256 · RSA PKCS#1 SHA-256'], ['RS384', 'RS384'], ['RS512', 'RS512'], ['PS256', 'PS256 · RSA-PSS SHA-256'], ['PS384', 'PS384'], ['PS512', 'PS512'], ['ES256', 'ES256 · ECDSA P-256'], ['ES384', 'ES384 · ECDSA P-384'], ['ES512', 'ES512 · ECDSA P-521']], 'HS256')}</select>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="jwt-kid"><span>Key ID (kid)</span><span class="form-label-desc">optional</span></label>
                      <input type="text" id="jwt-kid" class="input-clean" placeholder="e.g. 2026-10-key-1" spellcheck="false" autocomplete="off">
                    </div>
                  </div>
                  <div class="form-group form-group-grow">
                    <label class="form-label" for="jwt-payload"><span>Payload (JSON)</span><span class="form-label-desc">click a claim to insert it</span></label>
                    <div class="web-tags jwt-claims" role="group" aria-label="Insert a claim">${[['iat', 'iat · now'], ['exp', 'exp · +1 h'], ['nbf', 'nbf · now'], ['jti', 'jti · uuid'], ['iss', 'iss'], ['sub', 'sub'], ['aud', 'aud']].map(([k, l]) => `<button type="button" class="web-tag jwt-claim" data-claim="${k}">${l}</button>`).join('')}</div>
                    <textarea id="jwt-payload" class="textarea-clean" rows="7" placeholder='{ "sub": "1234567890", "name": "Ada" }' spellcheck="false" autocapitalize="off"></textarea>
                  </div>
                  <div class="form-group" id="jwt-secret-group">
                    <label class="form-label" for="jwt-secret"><span>Secret</span><span class="form-label-desc" id="jwt-secret-hint">shared HMAC secret</span></label>
                    <div class="web-inline">
                      <input type="password" id="jwt-secret" class="input-clean" placeholder="your-256-bit-secret" spellcheck="false" autocomplete="off">
                      <button type="button" class="btn-toolbar-sm" id="btn-gen-secret" title="Generate a random 256-bit secret"><iconify-icon icon="lucide:dices" width="14" height="14"></iconify-icon><span>Random</span></button>
                    </div>
                  </div>
                  <div class="form-group" id="jwt-privkey-group" hidden>
                    <label class="form-label" for="jwt-privkey"><span>Private key (PEM, PKCS#8)</span><span class="form-label-desc">-----BEGIN PRIVATE KEY-----</span></label>
                    <textarea id="jwt-privkey" class="textarea-clean jwt-pem" rows="5" placeholder="Paste a PKCS#8 private key, or generate a pair" spellcheck="false" autocapitalize="off"></textarea>
                    <button type="button" class="btn-toolbar-sm" id="btn-gen-keys"><iconify-icon icon="lucide:key-round" width="14" height="14"></iconify-icon><span>Generate key pair</span></button>
                  </div>
                </div>
                <div class="web-group" id="pane-verify" hidden>
                  <div class="form-group form-group-grow">
                    <label class="form-label" for="jwt-token"><span>Token</span><span class="form-label-desc" id="jwt-token-hint"></span></label>
                    <textarea id="jwt-token" class="textarea-clean jwt-pem" rows="6" placeholder="eyJhbGciOi…" spellcheck="false" autocapitalize="off"></textarea>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="jwt-verify-key"><span>Secret, public key (PEM) or JWK / JWKS</span><span class="form-label-desc">optional — leave empty to decode only</span></label>
                    <textarea id="jwt-verify-key" class="textarea-clean jwt-pem" rows="4" placeholder="HMAC secret · -----BEGIN PUBLIC KEY----- · { &quot;keys&quot;: [ … ] }" spellcheck="false" autocapitalize="off"></textarea>
                  </div>
                </div>`,
    outputHtml: `
                  <div class="jwt-token" id="output-token"></div>
                  <div class="web-tags" id="output-flags"></div>
                  <div class="jwt-section"><div class="web-group-head"><span>Header</span></div><div class="web-table-wrap"><table class="web-table" id="output-header"><tbody></tbody></table></div></div>
                  <div class="jwt-section"><div class="web-group-head"><span>Payload</span></div><div class="web-table-wrap"><table class="web-table" id="output-payload"><tbody></tbody></table></div></div>
                  <div class="jwt-section" id="output-keys" hidden><div class="web-group-head"><span>Public key (PEM) — share this with verifiers</span></div><pre class="web-code" id="output-pubkey"></pre></div>`,
    settingsSummary: 'No clock skew · UTF-8 secret',
    settings: `
              <div class="control-item">
                <label for="opt-skew">Clock skew tolerance (seconds)</label>
                <input type="number" id="opt-skew" class="input-clean" min="0" max="3600" step="1" value="0" inputmode="numeric">
              </div>
              <div class="control-item">
                <label for="opt-secret-enc">HMAC secret is</label>
                <select id="opt-secret-enc" class="select-clean">${opts([['utf8', 'Plain text (UTF-8 bytes)'], ['base64', 'Base64 / base64url encoded bytes']], 'utf8')}</select>
              </div>${CHECKBOX('opt-pretty', 'Pretty-print JSON in the payload box after inserting a claim', true)}`,
    guide: [['Build a token', 'Pick an algorithm, write the payload as JSON (click <em>iat</em>, <em>exp</em>, <em>jti</em>… to insert standard claims), and provide a secret for HS* or a PKCS#8 private key for RS*, PS* and ES*. No key yet? <strong>Generate key pair</strong> creates one in the browser and shows the matching public key. The token is signed live with Web Crypto.'], ['Verify a token', 'Switch to <strong>Verify & decode</strong> and paste a token. Header and payload are decoded immediately, with exp / nbf / iat shown as readable dates and status badges. Add the HMAC secret, a PEM public key or a JWK / JWKS document to check the signature — the right key in a JWKS is picked by <code>kid</code>.'], ['Copy or download', 'Copy puts the token (or decoded JSON) on the clipboard. Download the token, the decoded JSON, or the generated private / public key as PEM files.']],
    faq: [['Are my secrets and keys safe here?', 'They never leave the tab: signing and verification use the browser’s built-in <code>crypto.subtle</code>, nothing is stored in localStorage, and nothing is sent to Toolity. Still, treat anything you paste into any web page as sensitive — rotate test secrets before production.'], ['Which key formats are accepted?', 'Private keys as PKCS#8 PEM (<code>BEGIN PRIVATE KEY</code>), public keys as SPKI PEM (<code>BEGIN PUBLIC KEY</code>), and JWK or JWKS JSON. Legacy <code>BEGIN RSA PRIVATE KEY</code> / <code>BEGIN EC PRIVATE KEY</code> files are not understood by Web Crypto — convert with <code>openssl pkcs8 -topk8 -nocrypt -in key.pem</code>. X.509 certificates are not parsed.'], ['What do “expired” and “not yet valid” mean?', '<code>exp</code> is the moment after which a token must be rejected, <code>nbf</code> the moment before which it must not be accepted, and <code>iat</code> when it was issued — all Unix seconds. The badges compare them with your device clock plus the skew tolerance from Settings. A valid signature on an expired token is still shown as valid signature + expired, because those are separate checks.'], ['Why is <code>alg: none</code> flagged?', 'A token with <code>alg: none</code> is unsigned; libraries that accept it have been the source of real breaches. The tool decodes it but marks it as unsafe, and it will never report a “valid signature” for it.'], ['How do ES256 signatures compare with openssl output?', 'JWS uses the raw <code>r || s</code> form (64 bytes for P-256), which is also what Web Crypto produces, so tokens made here verify in jose, PyJWT, jsonwebtoken and friends. openssl prints DER-encoded signatures, which is a different wrapper around the same values.'], ['Can I decode a token without the key?', 'Yes — header and payload are only base64url-encoded, not encrypted, so anyone can read them. Verification needs the key; without it the signature badge says “unverified”. Encrypted tokens (JWE, five segments) show their header only.']]
  },
  {
    slug: 'cookie-header-decoder', name: 'Cookie Header Decoder', icon: 'lucide:cookie', section: 'Encoders & Inspectors', split: '40/60', css: true,
    desc: 'Free online cookie header decoder: paste Set-Cookie or Cookie headers, a whole response header block or a document.cookie string and get every cookie broken down — name, value (URL-, Base64- and JWT-decoded), Domain, Path, Expires / Max-Age as a real date, Secure, HttpOnly, SameSite, Partitioned, Priority — with RFC 6265bis checks: __Host- / __Secure- prefix rules, SameSite=None without Secure, 4 KB limit, 400-day cap, missing HttpOnly on session cookies. Runs in your browser.',
    lead: 'Paste a Set-Cookie header, a Cookie header or the whole response — every cookie decoded, every attribute explained, every browser rejection flagged before it bites.',
    cardDesc: 'Set-Cookie / Cookie / document.cookie → attributes, decoded values, expiry dates and browser-rejection warnings.',
    tags: ['cookie header decoder', 'set-cookie parser', 'set-cookie header checker', 'cookie attributes explained', 'samesite none secure', '__host- cookie prefix', 'cookie max-age expires', 'httponly cookie checker', 'decode cookie value', 'document.cookie parser', 'partitioned cookie chips'],
    idle: 'Paste a Set-Cookie or Cookie header', sourceLabel: 'Headers', outputLabel: 'Cookies', outputIcon: 'lucide:cookie', outputEmpty: 'Decoded cookies, attributes and warnings appear here',
    downloads: [['md', 'Report (Markdown)', 'lucide:file-text'], ['json', 'Cookies (JSON)', 'lucide:braces'], ['csv', 'Cookies (CSV)', 'lucide:file-spreadsheet']],
    file: { accept: '.txt,.har,.log,.http,.headers' },
    sourceHtml: `
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Set-Cookie / Cookie headers</span><span class="form-label-desc">or paste the whole response header block</span></label>
                  <textarea id="text-input" class="textarea-clean ck-input" rows="12" placeholder="Set-Cookie: session=eyJhbGciOi…; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600&#10;Set-Cookie: __Host-csrf=abc123; Path=/; Secure&#10;Cookie: a=1; theme=dark&#10;&#10;— or a document.cookie string: a=1; b=hello%20world" spellcheck="false" autocapitalize="off" autocomplete="off" data-file-target></textarea>
                </div>`,
    outputHtml: `
                  <div class="web-grid-2" id="ck-stats"></div>
                  <div class="web-tags" id="ck-issues"></div>
                  <div class="web-list" id="ck-list"></div>`,
    settingsSummary: 'Same-site request · https page · decode values',
    settings: `
              <div class="control-item">
                <label for="opt-context">Judge for</label>
                <select id="opt-context" class="select-clean">${opts([['same', 'Same-site request (first-party)'], ['cross', 'Cross-site request (embedded / third-party)']], 'same')}</select>
              </div>${CHECKBOX('opt-https', 'The page is served over HTTPS', true)}${CHECKBOX('opt-decode', 'Decode values (URL, Base64, JWT)', true)}`,
    guide: [['Paste headers', 'Copy the response headers from DevTools → Network → Headers (or <code>curl -I</code>) and paste them. <code>Set-Cookie:</code> and <code>Cookie:</code> lines are picked out automatically; bare lines are treated as a Set-Cookie when they carry attributes, otherwise as a <code>document.cookie</code> string.'], ['Read each cookie', 'Every cookie gets a card: name, raw value, the decoded value when it is URL-encoded, Base64 or a JWT, size, and each attribute as a chip — Domain, Path, when it expires (and how long from now), Secure, HttpOnly, SameSite, Partitioned, Priority. Warnings explain exactly what a browser will do with the cookie and why.'], ['Fix and export', 'Change <strong>Judge for</strong> in settings to see how the same cookies behave in a cross-site (embedded) request. Copy the Markdown report or download JSON / CSV for a ticket.']],
    faq: [['Which rules does it check?', 'The ones browsers actually enforce (RFC 6265bis, Chrome / Firefox / Safari behaviour as of 2026): <code>SameSite=None</code> requires <code>Secure</code>; <code>__Host-</code> needs Secure, <code>Path=/</code> and no Domain; <code>__Secure-</code> needs Secure; name + value over 4096 bytes is dropped; expiry beyond 400 days is clamped by Chrome; invalid characters in names or values; <code>Partitioned</code> without Secure; a Domain with a scheme or port; a past expiry (which deletes the cookie); missing <code>HttpOnly</code> on session-looking cookies; duplicate names; and whether the cookie is even sent in a cross-site context.'], ['How are values decoded?', 'If the value is percent-encoded it is URL-decoded. If it looks like a JWT (three Base64url parts whose header is JSON with an <code>alg</code>) the header and payload are shown as JSON, with <code>exp</code> / <code>iat</code> turned into dates. Otherwise, if it is valid Base64 and decodes to readable text or JSON, that is shown. Signatures are not verified here — use the <a href="/dev/jwt-builder-verifier/">JWT Builder &amp; Verifier</a> for that.'], ['What is the difference between Expires and Max-Age?', '<code>Max-Age</code> is a number of seconds from now and wins when both are present; <code>Expires</code> is an absolute HTTP date. Neither means a session cookie — deleted when the browser closes (Chrome may restore it with “continue where you left off”). A value of <code>Max-Age=0</code> or an <code>Expires</code> in the past is how servers delete a cookie.'], ['What does Partitioned mean?', 'CHIPS (Cookies Having Independent Partitioned State): a third-party cookie that is stored per top-level site, so the embed on site A cannot see what it set on site B. Chrome requires <code>Secure</code> and expects <code>SameSite=None</code> with it; it is the supported way for embedded widgets to keep state now that unpartitioned third-party cookies are being phased out.'], ['Can I paste a HAR file?', 'Yes — open a <code>.har</code> export with the file button; every <code>set-cookie</code> response header and <code>cookie</code> request header in it is extracted, labelled with its URL.'], PRIVACY_FAQ]
  }
];

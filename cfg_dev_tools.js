/* Designed by Kapil Pidhwani: the Dev batch. Same contract as cfg_web_tools.js (see its header) plus `section` (heading on /dev/).
 * Build: node gen_web_pages.js --cfg=cfg_dev_tools.js --cat=dev   ·   Wire: python3 wire_labs_dev.py */
const PRIVACY_FAQ = ['Is my code uploaded anywhere?', 'No. Formatting and minifying run in JavaScript inside your browser tab. The formatter libraries are downloaded once from a CDN; your code never leaves the page.'];
const opts = (list, sel) => list.map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');
const H = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  }
];

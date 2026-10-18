/* Designed by Kapil Pidhwani: the Dev batch. Same contract as cfg_web_tools.js (see its header) plus `section` (heading on /dev/).
 * Build: node gen_web_pages.js --cfg=cfg_dev_tools.js --cat=dev   ·   Wire: python3 wire_labs_dev.py */
const PRIVACY_FAQ = ['Is my code uploaded anywhere?', 'No. Formatting and minifying run in JavaScript inside your browser tab. The formatter libraries are downloaded once from a CDN; your code never leaves the page.'];
const opts = (list, sel) => list.map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');
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
  }
];

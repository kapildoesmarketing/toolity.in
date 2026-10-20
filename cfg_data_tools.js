/* Designed by Kapil Pidhwani: the Data batch. Same contract as cfg_web_tools.js (see its header) plus `section` (category
 * heading on /data/), `layout` ('stacked' for wide tables) and `file` { accept } (Open file + drop, handled by web-common).
 * Build: node gen_web_pages.js --cfg=cfg_data_tools.js --cat=data   ·   Wire: python3 wire_data.py */
const PRIVACY_FAQ = ['Is my data uploaded anywhere?', 'No. Parsing and converting happen in JavaScript inside your browser tab. Your text and files are never sent to Toolity or anyone else.'];
const TEXTAREA = (label, placeholder, rows = 10) => `
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>${label}</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="${rows}" placeholder="${placeholder}" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>`;
const FORMATS = [['json', 'JSON'], ['csv', 'CSV / TSV'], ['yaml', 'YAML'], ['toml', 'TOML'], ['xml', 'XML'], ['query', 'Query string'], ['markdown', 'Markdown table']];
const opts = (list, sel) => list.map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');

module.exports = [
  {
    slug: 'number-formats-converter', name: 'Number Formats Converter', icon: 'lucide:hash', section: 'Converters', split: '50/50', css: true,
    desc: 'Free online number converter: numbers to words in English (international and Indian lakh/crore), Hindi, Spanish, French, German and Portuguese; words back to numbers; Indian ↔ international ↔ European grouping; amounts in words for cheques (rupees/paise, dollars/cents, euros); Roman numerals; ordinals; scientific, engineering and compact notation. Batch, in your browser.',
    lead: 'Turn numbers into words (English, Indian, Hindi, Spanish, French, German, Portuguese), swap lakh/crore and international grouping, write cheque amounts, Roman numerals, ordinals and scientific notation — all at once.',
    cardDesc: 'Number ↔ words in 7 languages, lakh/crore ↔ million grouping, cheque amounts, Roman, ordinal, scientific.',
    tags: ['number to words', 'number to words indian rupees', 'amount in words', 'lakh crore converter', 'indian number system converter', 'words to number', 'roman numerals converter', 'number to hindi words', 'scientific notation converter', 'ordinal number converter', 'cheque amount in words'],
    idle: 'Type a number to begin', sourceLabel: 'Number', outputLabel: 'Formats', outputIcon: 'lucide:hash', outputEmpty: 'Every format of your number will appear here',
    downloads: [['txt', 'All formats (.txt)', 'lucide:file-text'], ['csv', 'Batch results (.csv)', 'lucide:file-spreadsheet']],
    sourceHtml: `
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Number or words</span><span class="form-label-desc" id="input-count">digits (12,34,567.89 · 1.5e6 · MMXXVI) or words (“two lakh fifty thousand”) · one per line for batch</span></label>
                  <textarea id="text-input" class="textarea-clean" rows="5" placeholder="1234567.89&#10;two crore fifteen lakh&#10;MMXXVI&#10;3.5e8" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <label class="form-label" for="opt-lang"><span>Words language</span></label>
                    <select id="opt-lang" class="select-clean">${opts([['en', 'English (international)'], ['en-IN', 'English (Indian: lakh / crore)'], ['hi', 'हिन्दी (Hindi)'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português']], 'en-IN')}</select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="opt-currency"><span>Currency for amount in words</span></label>
                    <select id="opt-currency" class="select-clean">${opts([['INR', 'Rupees & paise (₹)'], ['USD', 'Dollars & cents ($)'], ['EUR', 'Euros & cents (€)'], ['GBP', 'Pounds & pence (£)'], ['AED', 'Dirhams & fils'], ['none', 'No currency']], 'INR')}</select>
                  </div>
                </div>`,
    outputHtml: `
                  <div class="web-table-wrap"><table class="web-table nf-table" id="nf-table"><tbody></tbody></table></div>
                  <p class="web-muted nf-note" id="nf-note"></p>`,
    settingsSummary: 'Title case · “only” suffix · 2 decimals',
    settings: `
              <div class="control-item">
                <label for="opt-case">Words case</label>
                <select id="opt-case" class="select-clean">${opts([['title', 'Title Case'], ['lower', 'lower case'], ['upper', 'UPPER CASE'], ['sentence', 'Sentence case']], 'title')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-only" checked><label for="opt-only">Add “only” after cheque amounts</label></div>
              <div class="control-item"><input type="checkbox" id="opt-and" checked><label for="opt-and">British “and” (one hundred and five)</label></div>
              <div class="control-item">
                <label for="opt-dec">Decimals in grouped formats</label>
                <select id="opt-dec" class="select-clean">${opts([['auto', 'As typed'], ['0', '0'], ['2', '2'], ['3', '3']], 'auto')}</select>
              </div>`,
    guide: [['Type anything numeric', 'Digits with any grouping (<code>12,34,567</code> or <code>1,234,567</code> or <code>1 234 567,89</code>), scientific notation, a Roman numeral, or words in English — “two lakh fifty thousand” is understood. Paste several lines for a batch.'], ['Read every format', 'Words in the language you chose, the amount in words for a cheque, Indian and international grouping, European style, compact (1.2 Cr / 1.2M), scientific and engineering notation, Roman numerals and the ordinal.'], ['Copy the one you need', 'Each row has its own copy button; Copy in the toolbar copies the words, Download gives all formats or a CSV of the batch.']],
    faq: [['How does the Indian number system differ?', 'After the first thousand, digits are grouped in twos: 1,00,000 is one lakh (100 thousand) and 1,00,00,000 is one crore (10 million). Then arab (10⁹), kharab (10¹¹), neel (10¹³) and padma (10¹⁵). The international system groups in threes: thousand, million, billion, trillion.'], ['How large a number can it handle?', 'Integers up to 10³⁰ (nonillion / 10 quadrillion crore) exactly, using arbitrary-precision arithmetic; decimals are kept to the digits you type. Beyond that, scientific notation is still produced.'], ['Which languages are supported for words?', 'English (international and Indian styles), Hindi, Spanish, French (with the Swiss/Belgian septante–nonante variant off by default), German and Portuguese. Amounts in words follow each language’s currency phrasing — for Hindi, “रुपये … पैसे”.'], ['Is the cheque format correct for banks?', 'It follows the common conventions: the amount in words, paise/cents as a number of hundredths, and the word “only” at the end (switchable). Always check your bank’s guidance — some ask for “Rupees” first, which the output includes.'], ['Can it convert words back to numbers?', 'Yes, for English in both systems: “three crore twelve lakh”, “two million five hundred thousand” and mixed forms such as “1.5 lakh” are parsed. Other languages are output-only for now.'], PRIVACY_FAQ]
  },
  {
    slug: 'spreadsheet-formula-converter', name: 'Spreadsheet Formula Converter', icon: 'lucide:sigma', section: 'Converters', split: '50/50', css: true,
    desc: 'Free online spreadsheet formula converter between Excel, Google Sheets and LibreOffice Calc: renames functions (JOIN ↔ TEXTJOIN, SPLIT ↔ TEXTSPLIT, REGEXMATCH ↔ REGEXTEST, FLATTEN ↔ TOCOL…), swaps comma/semicolon separators and decimal marks, fixes sheet references and array constants, converts A1 ↔ R1C1, and reports every function that has no equivalent. Runs in your browser.',
    lead: 'Paste a formula from Excel, Google Sheets or LibreOffice and get it rewritten for another — functions renamed, separators and references fixed, and an honest report of what has no equivalent.',
    cardDesc: 'Excel ↔ Google Sheets ↔ LibreOffice: rename functions, fix separators & refs, A1 ↔ R1C1, compatibility report.',
    tags: ['excel to google sheets formula', 'google sheets to excel formula', 'formula converter', 'libreoffice formula', 'semicolon to comma formula', 'a1 to r1c1', 'arrayformula excel', 'textjoin vs join', 'spreadsheet function equivalents', 'formula compatibility'],
    idle: 'Paste a formula to convert', sourceLabel: 'Formula', outputLabel: 'Converted', outputIcon: 'lucide:sigma', outputEmpty: 'The converted formula and its compatibility report appear here',
    downloads: [['txt', 'Converted formulas (.txt)', 'lucide:file-text'], ['csv', 'Compatibility report (.csv)', 'lucide:file-spreadsheet']],
    sourceHtml: `
                <div class="web-convert-row">
                  <div class="form-group">
                    <label class="form-label" for="opt-from"><span>From</span></label>
                    <select id="opt-from" class="select-clean">${opts([['sheets', 'Google Sheets'], ['excel', 'Microsoft Excel'], ['libre', 'LibreOffice Calc']], 'sheets')}</select>
                  </div>
                  <button type="button" class="web-row-btn" id="btn-swap" title="Swap direction" aria-label="Swap direction"><iconify-icon icon="lucide:arrow-left-right" width="16" height="16"></iconify-icon></button>
                  <div class="form-group">
                    <label class="form-label" for="opt-to"><span>To</span></label>
                    <select id="opt-to" class="select-clean">${opts([['sheets', 'Google Sheets'], ['excel', 'Microsoft Excel'], ['libre', 'LibreOffice Calc']], 'excel')}</select>
                  </div>
                </div>
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Formulas</span><span class="form-label-desc" id="input-count">one per line for batch</span></label>
                  <textarea id="text-input" class="textarea-clean" rows="9" placeholder="=ARRAYFORMULA(IF(A2:A=&quot;&quot;,,JOIN(&quot;, &quot;,SPLIT(B2:B,&quot;;&quot;))))&#10;=QUERY(Data!A:D,&quot;select A, sum(D) where C='Paid' group by A&quot;,1)&#10;=TEXTJOIN(&quot;, &quot;;TRUE;'My Sheet'!B2:B20)" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                </div>
                <div class="web-file-row">
                  <button type="button" class="btn-toolbar-sm" id="btn-sample"><iconify-icon icon="lucide:sparkles" width="14" height="14"></iconify-icon><span>Try examples</span></button>
                  <span class="web-muted">Separators (, vs ;) are auto-detected from the input.</span>
                </div>`,
    outputHtml: `
                  <pre class="web-code sf-out" id="output-text" aria-live="polite"></pre>
                  <div class="web-tags sf-tags" id="sf-tags"></div>
                  <div class="web-table-wrap"><table class="web-table sf-report" id="sf-report"><thead><tr><th>Function</th><th>In target</th><th>Note</th></tr></thead><tbody></tbody></table></div>`,
    settingsSummary: 'Auto-detect separators · keep references',
    settings: `
              <div class="control-item">
                <label for="opt-src-locale">Input separators</label>
                <select id="opt-src-locale" class="select-clean">${opts([['auto', 'Auto-detect'], ['en', 'Comma arguments, dot decimal (US/UK/IN)'], ['eu', 'Semicolon arguments, comma decimal (EU)']], 'auto')}</select>
              </div>
              <div class="control-item">
                <label for="opt-dst-locale">Output separators</label>
                <select id="opt-dst-locale" class="select-clean">${opts([['en', 'Comma arguments, dot decimal (US/UK/IN)'], ['eu', 'Semicolon arguments, comma decimal (EU)']], 'en')}</select>
              </div>
              <div class="control-item">
                <label for="opt-refs">Cell references</label>
                <select id="opt-refs" class="select-clean">${opts([['keep', 'Keep as written'], ['r1c1', 'Convert A1 → R1C1'], ['a1', 'Convert R1C1 → A1'], ['abs', 'Make all absolute ($A$1)'], ['rel', 'Make all relative (A1)']], 'keep')}</select>
              </div>
              <div class="control-item">
                <label for="opt-cell">Formula lives in cell (for R1C1)</label>
                <input type="text" id="opt-cell" class="input-clean" value="A1" maxlength="8" autocomplete="off">
              </div>
              <div class="control-item"><input type="checkbox" id="opt-upper" checked><label for="opt-upper">Uppercase function names</label></div>`,
    guide: [['Pick the direction', 'Choose where the formula comes from and where it is going — Google Sheets, Excel or LibreOffice Calc. Paste one formula, or many (one per line) to convert a whole column of them.'],
      ['Read the result', 'Functions are renamed and arguments reordered where the apps differ (<code>JOIN</code> → <code>TEXTJOIN</code>, <code>SPLIT</code> → <code>TEXTSPLIT</code>, <code>REGEXMATCH</code> → <code>REGEXTEST</code>…), separators and decimal marks follow your output locale, sheet references and array constants use the target syntax.'],
      ['Check the report', 'Every function used is listed with ✅ same, ⚠ renamed/rewritten or ❌ no equivalent plus the closest alternative — so you know exactly what still needs a human before the sheet goes live.']],
    faq: [['Does it convert QUERY, IMPORTRANGE or ARRAYFORMULA?', 'Not magically. <code>ARRAYFORMULA</code> is unwrapped for Excel (dynamic arrays spill on their own) and LibreOffice (enter it as an array formula). <code>QUERY</code>, <code>IMPORTRANGE</code>, <code>GOOGLEFINANCE</code> and friends have no Excel/Calc equivalent; they are flagged ❌ with the nearest alternative (FILTER/SORT, Power Query, STOCKHISTORY) rather than silently broken.'],
      ['Why are separators different between apps?', 'They are not — they differ by <em>locale</em>. US/UK/India installs use a comma between arguments and a dot decimal; most European locales use a semicolon and a comma decimal. Array constants change too (<code>{1,2;3,4}</code> vs <code>{1\\2;3\\4}</code>, and <code>{1;2|3;4}</code> in Calc). Set the output locale to match the machine the sheet will open on.'],
      ['What about functions only in new versions?', 'XLOOKUP, LET, LAMBDA, FILTER, UNIQUE, VSTACK and the text-split family exist in Excel 365 and modern Sheets; LibreOffice gained XLOOKUP, FILTER, SORT, UNIQUE, SEQUENCE and LET in 24.8. The report says “Excel 365 only” or “Calc 24.8+” so you can decide whether that is fine for your users.'],
      ['How does A1 → R1C1 work?', 'R1C1 is relative to the cell that holds the formula, so enter that cell in Settings. <code>B2</code> seen from <code>A1</code> becomes <code>R[1]C[1]</code>; <code>$B$2</code> becomes <code>R2C2</code>. Whole columns and rows convert too.'],
      ['Are LibreOffice sheet references handled?', 'Yes. Calc writes <code>$Sheet1.A1</code> and <code>$\'My Sheet\'.A1</code> where Excel and Sheets write <code>Sheet1!A1</code> and <code>\'My Sheet\'!A1</code>; both directions are converted, as is <code>REGEX</code> ↔ the REGEXMATCH/EXTRACT/REPLACE family.'],
      PRIVACY_FAQ]
  },
  {
    slug: 'json-converter', name: 'JSON Converter', icon: 'lucide:braces', section: 'Converters',
    desc: 'Free online JSON converter: convert between JSON, CSV, YAML, TOML, XML, query strings and Markdown tables, or generate TypeScript interfaces and Zod schemas from JSON. Live, in your browser — nothing uploaded.',
    lead: 'Paste JSON, CSV, YAML, TOML, XML or a query string — get it back in any other format, or as TypeScript and Zod types.',
    cardDesc: 'JSON ⇄ CSV, YAML, TOML, XML, Markdown — plus TypeScript types.',
    tags: ['json converter', 'json to csv', 'csv to json', 'json to yaml', 'yaml to json', 'xml to json', 'json to xml', 'toml', 'json to typescript', 'zod schema', 'markdown table', 'query string'],
    idle: 'Paste data to begin', sourceLabel: 'Input', outputLabel: 'Output', outputIcon: 'lucide:braces', outputEmpty: 'Converted output will appear here',
    file: { accept: '.json,.csv,.tsv,.yaml,.yml,.toml,.xml,.md,.txt' },
    sourceHtml: `
                <div class="web-convert-row">
                  <div class="form-group">
                    <label class="form-label" for="opt-from"><span>From</span></label>
                    <select id="opt-from" class="select-clean"><option value="auto" selected>Auto-detect</option>${opts(FORMATS)}</select>
                  </div>
                  <button type="button" class="web-row-btn" id="btn-swap" title="Swap From and To" aria-label="Swap From and To">
                    <iconify-icon icon="lucide:arrow-left-right" width="16" height="16"></iconify-icon>
                  </button>
                  <div class="form-group">
                    <label class="form-label" for="opt-to"><span>To</span></label>
                    <select id="opt-to" class="select-clean">${opts(FORMATS, 'json')}<option value="typescript">TypeScript types</option><option value="zod">Zod schema</option></select>
                  </div>
                </div>${TEXTAREA('Data', '{ &quot;name&quot;: &quot;Ada&quot;, &quot;langs&quot;: [&quot;en&quot;, &quot;fr&quot;] }  — or CSV, YAML, TOML, XML, a=1&amp;b=2…', 12)}`,
    outputHtml: `
                  <pre class="web-code" id="output-text" aria-live="polite"></pre>`,
    settingsSummary: '2-space indent · comma · flatten',
    settings: `
              <div class="control-item">
                <label for="opt-indent">Indent</label>
                <select id="opt-indent" class="select-clean">${opts([['2', '2 spaces'], ['4', '4 spaces'], ['tab', 'Tab'], ['0', 'Minified (JSON only)']], '2')}</select>
              </div>
              <div class="control-item">
                <label for="opt-delim">CSV delimiter (output)</label>
                <select id="opt-delim" class="select-clean">${opts([[',', 'Comma'], [';', 'Semicolon'], ['\\t', 'Tab'], ['|', 'Pipe']], ',')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-flatten" checked><label for="opt-flatten">Flatten nested objects into dot.columns (CSV / Markdown)</label></div>
              <div class="control-item"><input type="checkbox" id="opt-types" checked><label for="opt-types">Detect numbers and true/false in CSV, Markdown and query strings</label></div>
              <div class="control-item">
                <label for="opt-root">Root type name (TypeScript / Zod)</label>
                <input type="text" id="opt-root" class="input-clean" placeholder="Root" autocomplete="off" spellcheck="false">
              </div>`,
    guide: [['Paste or open your data', 'Drop a .json, .csv, .yaml, .toml or .xml file, or paste text. The input format is detected automatically — pick it under <em>From</em> if the guess is wrong.'], ['Pick the output', 'Choose JSON, CSV, YAML, TOML, XML, query string, Markdown table, TypeScript types or a Zod schema. The result updates as you type; ⇄ swaps the direction.'], ['Copy or download', 'Copy the result or download it with the right file extension. Settings cover indentation, CSV delimiter, flattening and type names.']],
    faq: [['How are nested objects turned into CSV?', 'With “Flatten” on (default), nested keys become dot columns — <code>{"a":{"b":1}}</code> becomes a column <code>a.b</code>. Arrays inside a row are written as JSON text. Turn Flatten off to keep whole objects as JSON in one cell.'], ['Which libraries are used for YAML and TOML?', 'YAML uses <a href="https://github.com/nodeca/js-yaml" target="_blank" rel="noopener">js-yaml</a> and TOML uses <a href="https://github.com/squirrelchat/smol-toml" target="_blank" rel="noopener">smol-toml</a>. Both are downloaded from a pinned CDN link only when you pick that format, then run in your browser. Every other format is converted with built-in browser features.'], ['How does XML map to JSON?', 'Elements become keys, repeated elements become arrays, attributes become <code>@name</code> keys and mixed text becomes <code>#text</code>. Converting back follows the same rules, so a round trip keeps attributes.'], ['How good are the TypeScript and Zod types?', 'Types are inferred from your sample: fields missing from some array items become optional, mixed values become unions and <code>null</code> is kept. They describe the data you pasted — give a representative sample for the best result.'], ['Why does TOML say it needs an object?', 'A TOML document is always a table of keys. Arrays or plain values at the top level, and <code>null</code> values, cannot be written as TOML — wrap the array in a key such as <code>{"items": [...]}</code>.'], PRIVACY_FAQ]
  },
  {
    slug: 'unit-converter', name: 'Unit Converter', icon: 'lucide:ruler', section: 'Converters', css: true,
    desc: 'Free online unit converter for length, weight, temperature, area, volume, speed, data size and time. Convert to one unit or see every unit at once, with precise factors — in your browser.',
    lead: 'Convert length, weight, temperature, area, volume, speed, data size and time — to one unit or all of them at once.',
    cardDesc: 'Length, weight, temperature, area, volume, speed, data size and time.',
    tags: ['unit converter', 'length converter', 'weight converter', 'temperature converter', 'celsius to fahrenheit', 'km to miles', 'kg to lbs', 'mb to gb', 'area', 'volume', 'speed'],
    idle: 'Enter a value to begin', sourceLabel: 'Convert', outputLabel: 'Result', outputIcon: 'lucide:ruler', outputEmpty: 'Converted values will appear here', split: '40/60',
    sourceHtml: `
                <div class="segmented-group segmented-group-pill" id="seg-cat" role="group" aria-label="Quantity">
                  <button type="button" class="seg-pill active" data-value="length">Length</button>
                  <button type="button" class="seg-pill" data-value="weight">Weight</button>
                  <button type="button" class="seg-pill" data-value="temperature">Temperature</button>
                  <button type="button" class="seg-pill" data-value="area">Area</button>
                  <button type="button" class="seg-pill" data-value="volume">Volume</button>
                  <button type="button" class="seg-pill" data-value="speed">Speed</button>
                  <button type="button" class="seg-pill" data-value="data">Data size</button>
                  <button type="button" class="seg-pill" data-value="time">Time</button>
                </div>
                <div class="form-group">
                  <label class="form-label" for="value-input"><span>Value</span></label>
                  <input type="text" id="value-input" class="input-clean" inputmode="decimal" placeholder="e.g. 42 or 1.5e3" autocomplete="off" spellcheck="false">
                </div>
                <div class="web-convert-row">
                  <div class="form-group">
                    <label class="form-label" for="opt-from"><span>From</span></label>
                    <select id="opt-from" class="select-clean"></select>
                  </div>
                  <button type="button" class="web-row-btn" id="btn-swap" title="Swap From and To" aria-label="Swap From and To">
                    <iconify-icon icon="lucide:arrow-left-right" width="16" height="16"></iconify-icon>
                  </button>
                  <div class="form-group">
                    <label class="form-label" for="opt-to"><span>To</span></label>
                    <select id="opt-to" class="select-clean"></select>
                  </div>
                </div>`,
    outputHtml: `
                  <div class="unit-single" id="output-single" hidden>
                    <div class="web-big" id="output-value"></div>
                    <div class="web-muted" id="output-formula"></div>
                  </div>
                  <div class="web-rows" id="output-list"></div>`,
    settingsSummary: 'Auto precision · separators',
    settings: `
              <div class="control-item">
                <label for="opt-precision">Precision</label>
                <select id="opt-precision" class="select-clean">${opts([['auto', 'Auto (10 significant digits)'], ['0', '0 decimals'], ['2', '2 decimals'], ['4', '4 decimals'], ['6', '6 decimals'], ['10', '10 decimals']], 'auto')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-group" checked><label for="opt-group">Thousands separators (1,000,000)</label></div>`,
    guide: [['Pick a quantity', 'Length, weight, temperature, area, volume, speed, data size or time. The unit lists change to match.'], ['Type a value and its unit', 'Enter any number (decimals and 1.5e3-style exponents work) and choose the unit it is in under <em>From</em>.'], ['Read one or all', 'Leave <em>To</em> on “All units” to see every conversion with its own copy button, or pick one unit for a big single answer and its formula.']],
    faq: [['How precise are the conversions?', 'Exact definitions are used where they exist (1 inch = 2.54 cm, 1 lb = 0.45359237 kg, 1 US gallon = 3.785411784 L). Results show up to 10 significant digits by default; choose fixed decimals in Settings.'], ['How is temperature handled?', 'Temperature uses formulas, not a single factor, so offsets are correct: °F = °C × 9/5 + 32, K = °C + 273.15, °R = K × 9/5. Values below absolute zero are flagged.'], ['Why are there both MB and MiB?', 'Storage makers use decimal units (1 MB = 1,000,000 bytes); operating systems and RAM often use binary units (1 MiB = 1,048,576 bytes). Both are listed so you can compare a “500 GB” drive with what your computer reports.'], ['How long is a month or a year here?', 'An average Gregorian month (30.436875 days) and year (365.2425 days). For calendar dates, use a date calculator instead.'], ['Does it convert currencies?', 'No — exchange rates change constantly and need a live server, which Toolity tools do not use. Everything here uses fixed, published factors.'], PRIVACY_FAQ]
  },
  {
    slug: 'csv-viewer-editor', name: 'CSV Viewer & Editor', icon: 'lucide:table', section: 'Parsers', layout: 'stacked', css: true,
    desc: 'Free online CSV viewer and editor: open CSV or TSV files as a table, sort, filter, edit cells, add or delete rows, remove duplicates and export to CSV, JSON or Excel (.xlsx). Runs in your browser — nothing uploaded.',
    lead: 'Open a CSV or TSV as a table — sort, filter, edit, remove duplicates, then export to CSV, JSON or Excel.',
    cardDesc: 'Sort, filter, edit and dedupe CSV — export to CSV, JSON or Excel.',
    tags: ['csv viewer', 'csv editor', 'open csv online', 'csv to excel', 'csv to json', 'tsv viewer', 'remove duplicate rows', 'csv table', 'xlsx'],
    idle: 'Open or paste a CSV to begin', sourceLabel: 'CSV source', outputLabel: 'Table', outputIcon: 'lucide:table', outputEmpty: 'Your table will appear here',
    file: { accept: '.csv,.tsv,.txt' },
    downloads: [['csv', 'CSV', 'lucide:file-text'], ['json', 'JSON', 'lucide:braces'], ['xlsx', 'Excel (.xlsx)', 'lucide:sheet']],
    sourceHtml: `${TEXTAREA('Paste CSV', 'name,email,city&#10;Ada,ada@example.com,London&#10;Linus,linus@example.com,Helsinki', 5)}`,
    outputHtml: `
                  <div class="csv-bar">
                    <label class="visually-hidden" for="csv-filter">Filter rows</label>
                    <input type="search" id="csv-filter" class="input-clean" placeholder="Filter rows…" autocomplete="off" spellcheck="false">
                    <button type="button" class="btn-toolbar-sm" id="btn-add-row" title="Add an empty row at the end"><iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon><span>Add row</span></button>
                    <button type="button" class="btn-toolbar-sm" id="btn-dedupe" title="Remove rows that exactly repeat an earlier row"><iconify-icon icon="lucide:copy-minus" width="14" height="14"></iconify-icon><span>Remove duplicates</span></button>
                  </div>
                  <div class="web-table-wrap csv-wrap">
                    <table class="csv-table" id="output-table"></table>
                  </div>
                  <div class="csv-pager" id="csv-pager" hidden>
                    <button type="button" class="btn-toolbar-sm" id="btn-prev" aria-label="Previous page"><iconify-icon icon="lucide:chevron-left" width="14" height="14"></iconify-icon></button>
                    <span class="web-muted" id="csv-page"></span>
                    <button type="button" class="btn-toolbar-sm" id="btn-next" aria-label="Next page"><iconify-icon icon="lucide:chevron-right" width="14" height="14"></iconify-icon></button>
                  </div>`,
    settingsSummary: 'Auto delimiter · header row',
    settings: `
              <div class="control-item">
                <label for="opt-delim">Delimiter</label>
                <select id="opt-delim" class="select-clean">${opts([['auto', 'Auto-detect'], [',', 'Comma'], [';', 'Semicolon'], ['\\t', 'Tab'], ['|', 'Pipe']], 'auto')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-header" checked><label for="opt-header">First row is a header</label></div>`,
    guide: [['Open your CSV', 'Drop a .csv or .tsv file, use Open file, or paste the text. The delimiter (comma, semicolon, tab or pipe) is detected automatically.'], ['Sort, filter and edit', 'Click a column header to sort, type in the filter box to narrow rows, click any cell to edit it. Add rows, delete rows with ×, or remove exact duplicates in one click.'], ['Export', 'Download what you see — current sort and filter — as CSV, JSON or a real Excel .xlsx file, or copy it as CSV.']],
    faq: [['How large a file can it open?', 'Files up to 50 MB load; the table shows 500 rows per page so the browser stays fast. Sorting, filtering and export always cover every row, not just the page you are on.'], ['Are my edits saved to the file?', 'Edits update the CSV source box straight away, so Copy and Download include them. Nothing is saved on a server — download before you close the tab.'], ['What exactly does the export contain?', 'The rows you can currently see, across all pages: the filter and sort order are applied. Clear the filter to export everything.'], ['Is the Excel file a real .xlsx?', 'Yes — a genuine Office Open XML workbook built in your browser with <a href="https://stuk.github.io/jszip/" target="_blank" rel="noopener">JSZip</a> (loaded only when you choose Excel). Numbers are stored as numbers, everything else as text; there are no formulas or formatting.'], ['How are quotes and line breaks inside cells handled?', 'Fields follow RFC 4180: values in double quotes can contain the delimiter, line breaks and escaped quotes (<code>""</code>). Exported CSV quotes any field that needs it.'], PRIVACY_FAQ]
  },
  {
    slug: 'text-extractor', name: 'Text Extractor', icon: 'lucide:scan-text', section: 'Parsers',
    desc: 'Free online text extractor: pull emails, phone numbers, links, numbers and hashtags out of any text or file, remove duplicates, sort and export as TXT or CSV. Runs in your browser — nothing uploaded.',
    lead: 'Paste any text and pull out the emails, phone numbers, links, numbers or hashtags — de-duplicated and ready to copy.',
    cardDesc: 'Pull emails, phone numbers, links and hashtags out of any text.',
    tags: ['email extractor', 'extract emails from text', 'phone number extractor', 'url extractor', 'link extractor', 'number extractor', 'hashtag extractor', 'text extractor'],
    idle: 'Paste text to begin', sourceLabel: 'Text', outputLabel: 'Extracted', outputIcon: 'lucide:scan-text', outputEmpty: 'Found items will appear here',
    file: { accept: '.txt,.csv,.md,.html,.htm,.json,.log,.xml' },
    downloads: [['txt', 'Text (.txt)', 'lucide:file-text'], ['csv', 'CSV (type,value)', 'lucide:sheet']],
    sourceHtml: `
                <div class="web-checks" role="group" aria-label="What to extract">
                  <div class="control-item"><input type="checkbox" id="opt-email" checked><label for="opt-email">Emails</label></div>
                  <div class="control-item"><input type="checkbox" id="opt-phone" checked><label for="opt-phone">Phone numbers</label></div>
                  <div class="control-item"><input type="checkbox" id="opt-url" checked><label for="opt-url">Links</label></div>
                  <div class="control-item"><input type="checkbox" id="opt-number"><label for="opt-number">Numbers</label></div>
                  <div class="control-item"><input type="checkbox" id="opt-hashtag"><label for="opt-hashtag">Hashtags</label></div>
                </div>${TEXTAREA('Text', 'Paste an email thread, a web page, a spreadsheet export…', 12)}`,
    outputHtml: `
                  <div class="web-rows" id="output-groups"></div>`,
    settingsSummary: 'Unique · original order · one per line',
    settings: `
              <div class="control-item"><input type="checkbox" id="opt-unique" checked><label for="opt-unique">Remove duplicates</label></div>
              <div class="control-item"><input type="checkbox" id="opt-sort"><label for="opt-sort">Sort A → Z (numbers by value)</label></div>
              <div class="control-item"><input type="checkbox" id="opt-lower"><label for="opt-lower">Lowercase emails</label></div>
              <div class="control-item">
                <label for="opt-sep">Separate items with</label>
                <select id="opt-sep" class="select-clean">${opts([['\\n', 'New line'], [', ', 'Comma + space'], [',', 'Comma'], ['; ', 'Semicolon']], '\\n')}</select>
              </div>`,
    guide: [['Paste or open text', 'Anything works: an email thread, a copied web page, a CSV or log file. Drop a file or use Open file.'], ['Choose what to find', 'Tick emails, phone numbers, links, numbers or hashtags. Results appear instantly, grouped by type with a count.'], ['Copy or export', 'Copy one group with its button, copy everything from the toolbar, or download a .txt or a type,value CSV. Settings control duplicates, sorting and separators.']],
    faq: [['How are phone numbers detected?', 'By pattern: 7 to 15 digits, optionally starting with +, with spaces, dashes, dots or brackets between them. Dates such as 2024-05-01 are skipped. It does not check whether a number really exists in its country.'], ['Will it find links without https://?', 'Yes for links that start with <code>www.</code>. Bare domains like <code>example.com</code> are not matched, because too many ordinary words with a dot would be picked up.'], ['Why are numbers not taken from phone numbers or links?', 'Emails, links and phone numbers are matched first and masked, so the numbers list contains real standalone numbers (including 1,234.56 and negatives) rather than pieces of other items.'], ['Are duplicates removed case-insensitively?', 'Emails and links are compared without regard to case, so <code>Ada@Example.com</code> and <code>ada@example.com</code> count once — the first spelling is kept unless “Lowercase emails” is on.'], PRIVACY_FAQ]
  },
  {
    slug: 'log-parser', name: 'Log Parser', icon: 'lucide:scroll-text', section: 'Parsers', css: true,
    desc: 'Free online log parser and viewer: auto-detects JSON lines, Apache/Nginx access logs, syslog and timestamped app logs; filter by level, time and text, see stats, top messages and export. In your browser.',
    lead: 'Drop a log file — get levels, a timeline, the top repeated messages and filters by level, time and text.',
    cardDesc: 'Filter JSON, Nginx and syslog logs by level and time, with stats.',
    tags: ['log parser', 'log viewer', 'log analyzer', 'nginx log analyzer', 'apache access log', 'syslog viewer', 'json logs', 'filter logs by level', 'log file viewer'],
    idle: 'Open or paste a log to begin', sourceLabel: 'Log', outputLabel: 'Analysis', outputIcon: 'lucide:scroll-text', outputEmpty: 'Stats and matching lines will appear here', split: '35/65',
    file: { accept: '.log,.txt,.jsonl,.ndjson,.json,.out' },
    downloads: [['txt', 'Matching lines (.log)', 'lucide:file-text'], ['csv', 'CSV (time,level,message)', 'lucide:sheet'], ['json', 'JSON', 'lucide:braces']],
    sourceHtml: `${TEXTAREA('Log lines', '2024-05-01T10:15:02Z ERROR db: connection refused&#10;127.0.0.1 - - [01/May/2024:10:15:03 +0000] &quot;GET / HTTP/1.1&quot; 200 512', 9)}
                <div class="web-checks" role="group" aria-label="Levels">
                  <div class="control-item"><input type="checkbox" id="lvl-error" checked><label for="lvl-error">Error</label></div>
                  <div class="control-item"><input type="checkbox" id="lvl-warn" checked><label for="lvl-warn">Warn</label></div>
                  <div class="control-item"><input type="checkbox" id="lvl-info" checked><label for="lvl-info">Info</label></div>
                  <div class="control-item"><input type="checkbox" id="lvl-debug" checked><label for="lvl-debug">Debug</label></div>
                  <div class="control-item"><input type="checkbox" id="lvl-other" checked><label for="lvl-other">Other</label></div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="search-input"><span>Search</span></label>
                  <input type="search" id="search-input" class="input-clean" placeholder="timeout, /api/, user=42…" autocomplete="off" spellcheck="false">
                </div>
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <label class="form-label" for="time-from"><span>From</span></label>
                    <input type="datetime-local" id="time-from" class="input-clean" step="1">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="time-to"><span>To</span></label>
                    <input type="datetime-local" id="time-to" class="input-clean" step="1">
                  </div>
                </div>`,
    outputHtml: `
                  <div class="web-grid-2" id="output-stats"></div>
                  <div class="log-chart" id="output-chart" role="img"></div>
                  <div class="web-grid-2" id="output-tops"></div>
                  <div class="web-table-wrap">
                    <table class="web-table log-table" id="output-table"></table>
                  </div>
                  <div class="web-muted" id="output-note"></div>`,
    settingsSummary: 'Auto format · plain search',
    settings: `
              <div class="control-item">
                <label for="opt-format">Log format</label>
                <select id="opt-format" class="select-clean">${opts([['auto', 'Auto-detect'], ['json', 'JSON lines'], ['access', 'Apache / Nginx access log'], ['syslog', 'Syslog'], ['generic', 'Timestamp + level text']], 'auto')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-regex"><label for="opt-regex">Search is a regular expression</label></div>
              <div class="control-item"><input type="checkbox" id="opt-case"><label for="opt-case">Case-sensitive search</label></div>`,
    guide: [['Open a log', 'Drop a .log, .txt or .jsonl file, or paste lines. JSON lines, Apache/Nginx access logs, syslog and “timestamp LEVEL message” logs are recognised automatically; stack traces stay attached to their line.'], ['Filter', 'Untick levels you do not need, search for text (or a regex), and narrow to a time window with From and To.'], ['Read and export', 'See counts per level, a timeline, the most repeated messages (and status codes, paths and IPs for access logs). Download the matching lines as a log, CSV or JSON.']],
    faq: [['Which log formats are supported?', 'JSON lines (level/msg/time fields, including pino and bunyan numeric levels), Apache and Nginx common/combined access logs, syslog (RFC 3164 and 5424) and any text log that starts lines with a timestamp and a level word. Lines that match nothing are kept as “Other”.'], ['How are access-log levels decided?', 'Access logs have no level, so status codes are mapped: 5xx = Error, 4xx = Warn, everything else = Info. Filter by level to jump straight to failures.'], ['How are “top messages” counted?', 'Messages are grouped after replacing numbers, hex ids and UUIDs with #, so “user 41 timed out” and “user 97 timed out” count as one repeated message.'], ['Why do some lines have no time?', 'If a line has no recognisable timestamp it is still shown and counted, but a From/To time filter hides it. Syslog lines without a year are assumed to be in the current year.'], ['How big a log can it handle?', 'Up to 50 MB. All lines are parsed and counted; the table shows the first 1,000 matching lines to stay fast, and downloads include every match.'], PRIVACY_FAQ]
  },
  {
    slug: 'sql-on-csv', name: 'SQL on CSV', icon: 'lucide:database', section: 'Parsers', layout: 'stacked', css: true,
    desc: 'Free online SQL on CSV: load CSV, TSV or JSON files as tables and query them with real SQL (SQLite) — joins, GROUP BY, window functions, CTEs — then export the result as CSV, JSON or a SQLite database. Runs in your browser — nothing uploaded.',
    lead: 'Drop CSV or JSON files, write SQL, get a result table — joins, aggregates and window functions included. Export CSV, JSON or SQLite.',
    cardDesc: 'Query CSV / JSON files with real SQL (SQLite) — joins, GROUP BY, export.',
    tags: ['sql on csv', 'query csv with sql', 'csv sql', 'sqlite online', 'run sql on csv file', 'join csv files', 'csv group by', 'json sql query', 'csv to sqlite', 'sql playground'],
    idle: 'Add a CSV or JSON file to begin', sourceLabel: 'Tables & query', outputLabel: 'Result', outputIcon: 'lucide:database', outputEmpty: 'Query results will appear here',
    file: { accept: '.csv,.tsv,.txt,.json', multiple: true }, action: 'Run query', actionIcon: 'lucide:play',
    downloads: [['csv', 'Result as CSV', 'lucide:file-text'], ['json', 'Result as JSON', 'lucide:braces'], ['db', 'All tables as SQLite (.db)', 'lucide:database']],
    sourceHtml: `
                <div class="sql-tables" id="sql-tables" hidden></div>
                <div class="form-group">
                  <label class="form-label" for="text-input"><span>Or paste CSV / JSON</span><span class="form-label-desc">becomes a table named <code>pasted</code></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="3" placeholder="name,city,amount&#10;Ada,London,120&#10;Linus,Helsinki,80" spellcheck="false" autocapitalize="off"></textarea>
                </div>
                <div class="form-group form-group-grow">
                  <label class="form-label" for="sql-input"><span>SQL</span><span class="form-label-desc">SQLite dialect · Ctrl/⌘ + Enter runs</span></label>
                  <textarea id="sql-input" class="textarea-clean sql-mono" rows="5" placeholder="SELECT city, COUNT(*) AS orders, SUM(amount) AS total&#10;FROM pasted&#10;GROUP BY city&#10;ORDER BY total DESC" spellcheck="false" autocapitalize="off"></textarea>
                </div>`,
    outputHtml: `
                  <div class="web-table-wrap sql-wrap">
                    <table class="sql-table" id="output-table"></table>
                  </div>
                  <p class="web-muted" id="sql-more" hidden></p>`,
    settingsSummary: 'Header row · auto delimiter · detect numbers · 500 rows shown',
    settings: `
              <div class="control-item"><input type="checkbox" id="opt-header" checked><label for="opt-header">First row is a header (files loaded after changing this)</label></div>
              <div class="control-item">
                <label for="opt-delim">CSV delimiter</label>
                <select id="opt-delim" class="select-clean">${opts([['auto', 'Auto-detect'], [',', 'Comma'], [';', 'Semicolon'], ['tab', 'Tab'], ['|', 'Pipe']], 'auto')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-types" checked><label for="opt-types">Detect numbers (columns that are all numeric become INTEGER / REAL)</label></div>
              <div class="control-item">
                <label for="opt-limit">Rows shown in the result table</label>
                <select id="opt-limit" class="select-clean">${opts([['100', '100'], ['500', '500'], ['2000', '2,000'], ['10000', '10,000']], '500')}</select>
              </div>`,
    guide: [['Load your data', 'Drop one or more CSV, TSV or JSON files — each becomes a table named after the file (<code>sales.csv</code> → <code>sales</code>), listed with its columns and detected types. Or paste data to get a table called <code>pasted</code>. Click a table or column name to insert it into the query.'], ['Write SQL and run', 'Any SQLite query works: <code>WHERE</code>, <code>GROUP BY</code>, <code>JOIN</code> across files, <code>WITH</code> CTEs, window functions like <code>ROW_NUMBER() OVER (…)</code>, date functions, even <code>CREATE TABLE … AS SELECT</code>. Press <strong>Run query</strong> or Ctrl/⌘ + Enter.'], ['Export the result', 'Download the result as CSV or JSON, or export every loaded table as one SQLite <code>.db</code> file to open later in DB Browser, DBeaver or Python. Copy puts the result on the clipboard as CSV.']],
    faq: [['Which SQL dialect is this?', 'SQLite, running as WebAssembly (<a href="https://sql.js.org" target="_blank" rel="noopener">sql.js</a>) inside your browser — the same engine inside every phone and browser. Joins, subqueries, CTEs, window functions, <code>GROUP_CONCAT</code>, <code>strftime</code> and JSON functions are all available; <code>LIMIT</code> works, <code>TOP</code> does not. The engine (about 1 MB) downloads once, when you run your first query.'], ['How are column types decided?', 'Each CSV column that contains only numbers becomes <code>INTEGER</code> or <code>REAL</code>, so <code>SUM</code>, <code>AVG</code> and numeric sorting behave; everything else stays <code>TEXT</code>. Empty cells become <code>NULL</code> in numeric columns and empty strings in text columns. Untick “Detect numbers” to keep everything as text (useful for ZIP / PIN codes with leading zeros). JSON keeps its own numbers and strings.'], ['Can I join two files?', 'Yes — load both, then <code>SELECT … FROM orders o JOIN customers c ON c.id = o.customer_id</code>. Table names come from the file names (lower-cased, non-letters replaced by underscores); a second file with the same name gets a <code>_2</code> suffix. Column names with spaces need double quotes: <code>"Order Date"</code>.'], ['How big can the files be?', 'Up to 50 MB per file. Everything lives in your tab’s memory, so a few hundred thousand rows are fine; multi-million-row files will be slow to load. The result table shows up to the number of rows you choose in Settings, while downloads always include every row — add a <code>LIMIT</code> if a query returns more than you need.'], ['What JSON shapes are accepted?', 'An array of objects (<code>[{"id":1,"name":"Ada"}, …]</code>) — each key becomes a column, and keys missing from some objects are <code>NULL</code> there. An object with a <code>data</code> array is unwrapped. Nested objects and arrays are stored as JSON text, which you can query with SQLite’s <code>json_extract()</code>.'], PRIVACY_FAQ]
  },
  {
    slug: 'date-calculator', name: 'Date Calculator', icon: 'lucide:calendar-days', section: 'Converters', split: '40/60', css: true,
    desc: 'Free online date calculator: days between two dates, add or subtract days, weeks, months and years, count working days with your own holiday list, and work out an exact age on any date. Runs in your browser — nothing is sent anywhere.',
    lead: 'Days between dates, add or subtract time, working days with custom holidays, and exact age — all in one place.',
    cardDesc: 'Difference between dates, add/subtract, working days with holidays, age.',
    tags: ['date', 'calculator', 'days between', 'date difference', 'add days', 'subtract days', 'working days', 'business days', 'holidays', 'age calculator', 'duration', 'weeks', 'countdown', 'iso week'],
    sourceLabel: 'Dates', outputLabel: 'Result', outputIcon: 'lucide:calendar-days', outputEmpty: 'Pick dates to see the result', idle: 'Pick a date',
    downloads: [['txt', 'Text (.txt)', 'lucide:file-text'], ['json', 'JSON (.json)', 'lucide:braces']],
    sourceHtml: `
                <div class="form-group">
                  <span class="form-label"><span>Calculate</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Calculation">
                    <button type="button" class="seg-pill active" data-value="diff">Difference</button>
                    <button type="button" class="seg-pill" data-value="add">Add / Subtract</button>
                    <button type="button" class="seg-pill" data-value="work">Working days</button>
                    <button type="button" class="seg-pill" data-value="age">Age</button>
                  </div>
                </div>
                <div class="web-group" id="pane-diff">
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group"><label class="form-label" for="diff-a"><span>From</span></label><input type="datetime-local" id="diff-a" class="input-clean"></div>
                    <div class="form-group"><label class="form-label" for="diff-b"><span>To</span></label><input type="datetime-local" id="diff-b" class="input-clean"></div>
                  </div>
                </div>
                <div class="web-group" id="pane-add" hidden>
                  <div class="form-group"><label class="form-label" for="add-start"><span>Start</span><span class="form-label-desc">leave empty for now</span></label><input type="datetime-local" id="add-start" class="input-clean"></div>
                  <div class="form-group">
                    <span class="form-label"><span>Direction</span></span>
                    <div class="segmented-group segmented-group-pill" id="seg-dir" role="group" aria-label="Direction">
                      <button type="button" class="seg-pill active" data-value="add">Add</button>
                      <button type="button" class="seg-pill" data-value="sub">Subtract</button>
                    </div>
                  </div>
                  <div class="dc-units">${[['years', 'Years'], ['months', 'Months'], ['weeks', 'Weeks'], ['days', 'Days'], ['hours', 'Hours'], ['minutes', 'Minutes']].map(([k, l]) => `
                    <div class="form-group"><label class="form-label" for="add-${k}"><span>${l}</span></label><input type="number" id="add-${k}" class="input-clean" min="0" step="1" placeholder="0" inputmode="numeric"></div>`).join('')}
                  </div>
                </div>
                <div class="web-group" id="pane-work" hidden>
                  <div class="form-group"><label class="form-label" for="work-start"><span>Start date</span></label><input type="date" id="work-start" class="input-clean"></div>
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group"><label class="form-label" for="work-end"><span>End date</span></label><input type="date" id="work-end" class="input-clean"></div>
                    <div class="form-group"><label class="form-label" for="work-n"><span>…or working days to add</span></label><input type="number" id="work-n" class="input-clean" min="-10000" max="10000" step="1" placeholder="e.g. 10" inputmode="numeric"></div>
                  </div>
                  <div class="form-group"><label class="form-label" for="work-holidays"><span>Holidays</span><span class="form-label-desc">one date per line, any common format</span></label><textarea id="work-holidays" class="textarea-clean" rows="4" placeholder="2026-10-20&#10;25 Dec 2026&#10;01/26/2027" spellcheck="false"></textarea></div>
                </div>
                <div class="web-group" id="pane-age" hidden>
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group"><label class="form-label" for="age-dob"><span>Date of birth</span></label><input type="date" id="age-dob" class="input-clean"></div>
                    <div class="form-group"><label class="form-label" for="age-on"><span>Age on</span><span class="form-label-desc">empty = today</span></label><input type="date" id="age-on" class="input-clean"></div>
                  </div>
                </div>`,
    outputHtml: `
                  <div class="dc-headline" id="output-headline"></div>
                  <div class="web-grid-2" id="output-stats"></div>
                  <div class="web-table-wrap"><table class="web-table" id="output-table"><tbody></tbody></table></div>`,
    settingsSummary: 'Sat–Sun weekend · end day excluded',
    settings: `
              <div class="control-item">
                <label for="opt-weekend">Weekend</label>
                <select id="opt-weekend" class="select-clean">${opts([['60', 'Saturday & Sunday'], ['56', 'Friday & Saturday'], ['5', 'Friday only'], ['0', 'Sunday only'], ['', 'No weekend (every day counts)']], '60')}</select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-inclusive"><label for="opt-inclusive">Include the end day (difference & working days)</label></div>`,
    guide: [['Pick what to calculate', '<strong>Difference</strong> for the gap between two moments, <strong>Add / Subtract</strong> to move a date by years, months, weeks, days, hours or minutes, <strong>Working days</strong> to count or add business days around your own holiday list, and <strong>Age</strong> for an exact age on any date.'], ['Enter the dates', 'Type or pick dates; results update as you type. Leave <em>Start</em> or <em>Age on</em> empty to use right now. Holidays accept one date per line in almost any format (ISO, 25 Dec 2026, 12/25/2026).'], ['Copy or download', 'The result card shows the headline number plus breakdowns — total days, weeks, hours, ISO week, day of year and more. Copy everything as text or download as text or JSON.']],
    faq: [['How is “1 month” counted when adding?', 'Calendar-wise, the way people expect: 31 Jan + 1 month = 28 Feb (or 29 in a leap year), not 3 March. The day is clamped to the last day of the target month, and years follow the same rule for 29 Feb.'], ['Why do years/months/days and total days differ?', 'The breakdown walks the calendar (whole years, then whole months, then the leftover days), so month lengths matter. <em>Total days</em> is the exact number of 24-hour days between the two moments. Both are correct — they answer different questions.'], ['Which days count as working days?', 'Every day except the weekend pattern you choose in Settings and the dates in your holiday list. Weekends and holidays that overlap are counted once. “Working days to add” skips non-working days and lands on a working day; negative numbers go backwards.'], ['Are daylight-saving changes handled?', 'Yes. Dates are interpreted in your device’s local time zone, so a 23- or 25-hour day on a DST switch shows up correctly in the hours total while the day count stays whole.'], ['What does the ISO week mean?', 'ISO 8601 weeks start on Monday and week 1 is the week containing the year’s first Thursday — the numbering used across Europe and in most project tools. The tool also shows the day of the year (1–366).'], PRIVACY_FAQ]
  }
];

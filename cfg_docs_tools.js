/* Designed by Kapil Pidhwani: the Docs text batch (Text & Notes). Same contract as cfg_web_tools.js (see its header) plus
 * `section` (heading on /docs/) and `layout`. Build: node gen_web_pages.js --cfg=cfg_docs_tools.js --cat=docs   ·   Wire: python3 wire_seo_text.py */
const PRIVACY_FAQ = ['Is my text uploaded anywhere?', 'No. Everything runs in JavaScript inside your browser tab. Your text and files are never sent to Toolity or anyone else.'];
const opts = (list, sel) => list.map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');
const CHECK = (id, label, on) => `
              <div class="control-item"><input type="checkbox" id="${id}"${on ? ' checked' : ''}><label for="${id}">${label}</label></div>`;

module.exports = [
  {
    slug: 'diff-checker', name: 'Diff Checker', icon: 'lucide:git-compare', section: 'Text & Notes', layout: 'stacked', css: true,
    desc: 'Free online diff checker: compare two texts or JSON documents side by side or inline, with line and word-level highlighting, ignore-whitespace and ignore-case options, and a downloadable unified patch. Runs in your browser — nothing uploaded.',
    lead: 'Paste or drop two versions — see every added, removed and changed line side by side or inline, down to the word. JSON is compared by meaning, not formatting.',
    cardDesc: 'Text and JSON diff, side by side or inline, word-level highlights, .diff export.',
    tags: ['diff checker', 'text compare', 'compare two files', 'json diff', 'online diff tool', 'text difference', 'unified diff', 'side by side diff', 'compare text online', 'patch file'],
    idle: 'Paste the original and the changed text', sourceLabel: 'Original · Changed', outputLabel: 'Differences', outputIcon: 'lucide:git-compare', outputEmpty: 'Added, removed and changed lines will appear here',
    file: { accept: '.txt,.md,.json,.csv,.html,.css,.js,.ts,.py,.xml,.yaml,.yml,.log', multiple: true },
    downloads: [['diff', 'Unified patch (.diff)', 'lucide:file-diff'], ['html', 'Rendered diff (.html)', 'lucide:code']],
    sourceHtml: `
                <div class="diff-inputs">
                  <div class="form-group form-group-grow">
                    <label class="form-label" for="text-a"><span>Original</span><span class="form-label-desc" id="count-a"></span></label>
                    <textarea id="text-a" class="textarea-clean" rows="10" placeholder="Paste the original text or JSON, or drop a file…" spellcheck="false" autocapitalize="off" data-file-target></textarea>
                  </div>
                  <div class="form-group form-group-grow">
                    <label class="form-label" for="text-b"><span>Changed</span><span class="form-label-desc" id="count-b"></span></label>
                    <textarea id="text-b" class="textarea-clean" rows="10" placeholder="Paste the changed version, or drop a second file…" spellcheck="false" autocapitalize="off"></textarea>
                  </div>
                </div>
                <div class="web-convert-row web-convert-row-2">
                  <div class="form-group">
                    <span class="form-label"><span>Compare as</span></span>
                    <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Compare as">
                      <button type="button" class="seg-pill active" data-value="text">Text</button>
                      <button type="button" class="seg-pill" data-value="json">JSON</button>
                    </div>
                  </div>
                  <div class="form-group">
                    <span class="form-label"><span>View</span></span>
                    <div class="segmented-group segmented-group-pill" id="seg-view" role="group" aria-label="View">
                      <button type="button" class="seg-pill active" data-value="side">Side by side</button>
                      <button type="button" class="seg-pill" data-value="inline">Inline</button>
                    </div>
                  </div>
                </div>`,
    outputHtml: `
                  <div class="diff-bar">
                    <span class="diff-stats" id="diff-stats"></span>
                    <span class="diff-nav">
                      <button type="button" class="btn-toolbar-sm" id="btn-prev-change" title="Previous change"><iconify-icon icon="lucide:chevron-up" width="14" height="14"></iconify-icon></button>
                      <span class="web-muted" id="diff-pos">—</span>
                      <button type="button" class="btn-toolbar-sm" id="btn-next-change" title="Next change"><iconify-icon icon="lucide:chevron-down" width="14" height="14"></iconify-icon></button>
                    </span>
                  </div>
                  <div class="web-table-wrap diff-wrap" id="diff-wrap">
                    <table class="diff-table" id="output-table"></table>
                  </div>`,
    settingsSummary: 'Word highlights · all context',
    settings: `${CHECK('opt-words', 'Highlight changed words inside changed lines', true)}${CHECK('opt-ws', 'Ignore whitespace differences', false)}${CHECK('opt-case', 'Ignore case', false)}
              <div class="control-item">
                <label for="opt-context">Unchanged lines shown</label>
                <select id="opt-context" class="select-clean">${opts([['all', 'All'], ['3', '3 around each change'], ['0', 'Changes only']], 'all')}</select>
              </div>`,
    guide: [['Add both versions', 'Paste the original on the left and the changed version on the right, or drop two files onto the card — the first fills Original, the second Changed. Choose <strong>JSON</strong> to compare documents by content: keys are sorted and both sides are pretty-printed before diffing, so formatting differences disappear.'], ['Read the differences', 'Removed lines are red, added lines green, and changed lines show the exact words that differ. Use <strong>Side by side</strong> for prose and configs, <strong>Inline</strong> for a patch-style view. The arrows jump between changes; the badge counts them.'], ['Export', 'Copy or download a standard unified <code>.diff</code> that <code>git apply</code> and <code>patch</code> understand, or download the coloured diff as a standalone HTML page to attach to a review or email.']],
    faq: [['What algorithm does it use?', 'The line diff comes from <a href="https://github.com/kpdecker/jsdiff" target="_blank" rel="noopener">jsdiff</a> (Myers’ algorithm, the same family git uses); changed lines are then diffed again word by word for the inline highlights. The library (about 8 KB) downloads once on first use.'], ['How does JSON mode work?', 'Both sides are parsed, object keys are sorted recursively and the result is pretty-printed with two-space indentation before comparing. Different key order, indentation or trailing whitespace therefore produce no differences — only real value changes. Arrays keep their order (reordering an array is a change). Invalid JSON is reported with the side and the parser’s message.'], ['What do “Ignore whitespace” and “Ignore case” do?', 'Ignore whitespace treats lines as equal when they differ only in spaces, tabs or trailing whitespace (indentation changes vanish). Ignore case compares <code>Hello</code> and <code>hello</code> as the same. The patch export always uses the original text, so the diff you download still applies cleanly.'], ['Is there a size limit?', 'Files up to 50 MB load; the diff itself is computed on all lines but the table draws at most 20,000 rows to keep the page responsive — the patch download is always complete. Very large, almost entirely different files can take a few seconds.'], ['Can I apply the downloaded patch?', 'Yes — it is a standard unified diff with the file names <code>original</code> and <code>changed</code>. Run <code>patch original &lt; changes.diff</code> or <code>git apply changes.diff</code> after renaming the headers to your real paths.'], PRIVACY_FAQ]
  },
  {
    slug: 'readability-scorer', name: 'Readability Scorer', icon: 'lucide:glasses', section: 'Text & Notes', split: '40/60', css: true,
    desc: 'Free online readability scorer: Flesch Reading Ease, Flesch-Kincaid grade, Gunning Fog, SMOG, Coleman-Liau and ARI with word, sentence and syllable counts, reading time, and highlights for long sentences, passive voice and adverbs. Runs in your browser — nothing uploaded.',
    lead: 'Paste your text — get six readability scores, a grade level, reading time, and a marked-up copy showing the long sentences, passive voice and adverbs that drag it down.',
    cardDesc: 'Flesch, Fog, SMOG & grade level, reading time, long-sentence and passive-voice highlights.',
    tags: ['readability score', 'flesch reading ease', 'flesch kincaid grade', 'gunning fog', 'smog index', 'readability checker', 'reading level', 'passive voice checker', 'reading time calculator', 'text analysis'],
    idle: 'Paste text to score', sourceLabel: 'Text', outputLabel: 'Scores', outputIcon: 'lucide:glasses', outputEmpty: 'Scores and highlights will appear here',
    file: { accept: '.txt,.md,.html,.htm' },
    downloads: [['txt', 'Report (.txt)', 'lucide:file-text'], ['json', 'Report (.json)', 'lucide:braces']],
    sourceHtml: `
                <div class="form-group form-group-grow">
                  <label class="form-label" for="text-input"><span>Text</span><span class="form-label-desc" id="input-count"></span></label>
                  <textarea id="text-input" class="textarea-clean" rows="18" placeholder="Paste an article, email, landing page or essay. Markdown and HTML are stripped to plain text first." spellcheck="true" data-file-target></textarea>
                </div>`,
    outputHtml: `
                  <div class="rd-hero" id="output-fre"></div>
                  <div class="web-grid-2 rd-grid" id="output-scores"></div>
                  <div class="web-grid-2 rd-grid rd-counts" id="output-counts"></div>
                  <div class="rd-legend" id="rd-legend"></div>
                  <div class="rd-text" id="output-highlight" aria-label="Text with highlights"></div>`,
    settingsSummary: 'Long sentences · passive · adverbs · 200 wpm',
    settings: `${CHECK('opt-long', 'Highlight long sentences (over 25 words; over 40 stronger)', true)}${CHECK('opt-passive', 'Highlight possible passive voice', true)}${CHECK('opt-adverb', 'Highlight -ly adverbs', true)}
              <div class="control-item">
                <label for="opt-wpm">Reading speed</label>
                <select id="opt-wpm" class="select-clean">${opts([['150', '150 wpm (careful)'], ['200', '200 wpm (average)'], ['250', '250 wpm (fast)']], '200')}</select>
              </div>`,
    guide: [['Paste the text', 'Drop in anything from a tweet to a report — plain text, Markdown or HTML (tags are stripped). Scores update as you type.'], ['Read the scores', '<strong>Flesch Reading Ease</strong> runs 0–100 (higher is easier; 60–70 is plain English, newspapers sit around 50–60). The grade-level scores (Flesch-Kincaid, Gunning Fog, SMOG, Coleman-Liau, ARI) estimate the US school grade needed; the consensus is their median. Aim for grade 8 or below for a general audience.'], ['Fix what is highlighted', 'Long sentences, possible passive voice and -ly adverbs are marked in the text. Split long sentences, turn “was approved by the board” into “the board approved”, and cut adverbs that add nothing. Re-check the numbers as you edit.']],
    faq: [['How are the scores calculated?', 'Standard formulas on word, sentence and syllable counts: Flesch Reading Ease = 206.835 − 1.015 × (words ÷ sentences) − 84.6 × (syllables ÷ words); Flesch-Kincaid = 0.39 × (words ÷ sentences) + 11.8 × (syllables ÷ words) − 15.59; Gunning Fog = 0.4 × ((words ÷ sentences) + 100 × (complex words ÷ words)); SMOG = 1.043 × √(polysyllables × 30 ÷ sentences) + 3.1291; Coleman-Liau and ARI use letters per word and words per sentence. Syllables come from an English vowel-group heuristic, so expect ±1 on unusual words.'], ['Which languages does it work for?', 'The formulas and the syllable counter are calibrated for English. Other Latin-script languages produce numbers, but they are not meaningful — German compounds and French silent endings break the assumptions.'], ['What counts as a “complex” word?', 'Three or more syllables, as in the Gunning Fog and SMOG definitions. Proper nouns and compound words are not excluded, so technical text scores slightly harder than a human rater would say.'], ['How accurate is the passive-voice detection?', 'It is a heuristic: a form of “to be” followed by a past participle (“was approved”, “is being reviewed”). It catches most cases and also flags some adjectives (“was tired”) — treat each highlight as a prompt to look, not a verdict. Turn it off in Settings if it gets in the way.'], ['How is reading time estimated?', 'Words divided by your chosen speed (200 words per minute is a typical adult silent-reading rate); speaking time uses 130 wpm. Short texts round up to one minute.'], PRIVACY_FAQ]
  },
  {
    slug: 'dummy-text-data-generator', name: 'Dummy Text & Data Generator', icon: 'lucide:text-cursor-input', section: 'Text & Notes', split: '40/60', css: true,
    desc: 'Free online dummy text and data generator: lorem ipsum (plus hipster, corporate, tech and pangram flavours) by words, sentences or paragraphs; fake people with names, emails, phones and addresses (international or Indian); and a schema-based mock dataset with a seed for repeatable results. Export CSV, JSON or SQL — all in your browser.',
    lead: 'Placeholder text in five flavours, realistic fake people, and seedable mock datasets you can export as CSV, JSON or SQL — nothing leaves your browser.',
    cardDesc: 'Lorem ipsum, fake people and seedable mock datasets → CSV / JSON / SQL.',
    tags: ['lorem ipsum', 'dummy text', 'placeholder text', 'fake data', 'mock data', 'test data', 'fake names', 'fake email', 'fake address', 'random data generator', 'csv generator', 'json generator', 'sql insert', 'seed', 'indian names'],
    sourceLabel: 'What to generate', outputLabel: 'Generated', outputIcon: 'lucide:text-cursor-input', outputEmpty: 'Generated text or rows appear here', idle: 'Choose what to generate',
    downloads: [['txt', 'Text (.txt)', 'lucide:file-text'], ['csv', 'CSV (.csv)', 'lucide:table'], ['json', 'JSON (.json)', 'lucide:braces'], ['sql', 'SQL inserts (.sql)', 'lucide:database']],
    sourceHtml: `
                <div class="form-group">
                  <span class="form-label"><span>Generate</span></span>
                  <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Generator">
                    <button type="button" class="seg-pill active" data-value="text">Text</button>
                    <button type="button" class="seg-pill" data-value="people">People</button>
                    <button type="button" class="seg-pill" data-value="dataset">Dataset</button>
                  </div>
                </div>
                <div class="web-group" id="pane-text">
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group"><label class="form-label" for="txt-flavour"><span>Flavour</span></label><select id="txt-flavour" class="select-clean">${opts([['lorem', 'Lorem ipsum (classic)'], ['hipster', 'Hipster'], ['corporate', 'Corporate buzzwords'], ['tech', 'Tech jargon'], ['pangram', 'Pangrams (real English)']], 'lorem')}</select></div>
                    <div class="form-group"><label class="form-label" for="txt-format"><span>Format</span></label><select id="txt-format" class="select-clean">${opts([['plain', 'Plain text'], ['html', 'HTML <p>'], ['md', 'Markdown']], 'plain')}</select></div>
                  </div>
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group"><label class="form-label" for="txt-count"><span>How many</span></label><input type="number" id="txt-count" class="input-clean" min="1" max="500" value="3" inputmode="numeric"></div>
                    <div class="form-group"><label class="form-label" for="txt-unit"><span>Unit</span></label><select id="txt-unit" class="select-clean">${opts([['paragraphs', 'Paragraphs'], ['sentences', 'Sentences'], ['words', 'Words']], 'paragraphs')}</select></div>
                  </div>
                </div>
                <div class="web-group" id="pane-people" hidden>
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group"><label class="form-label" for="ppl-count"><span>How many people</span></label><input type="number" id="ppl-count" class="input-clean" min="1" max="5000" value="10" inputmode="numeric"></div>
                    <div class="form-group"><label class="form-label" for="ppl-locale"><span>Locale</span></label><select id="ppl-locale" class="select-clean">${opts([['intl', 'International (US-style)'], ['in', 'India']], 'intl')}</select></div>
                  </div>
                  <div class="web-checks" role="group" aria-label="Fields">${[['name', 'Name', 1], ['email', 'Email', 1], ['phone', 'Phone', 1], ['city', 'City', 1], ['address', 'Street address', 0], ['dob', 'Date of birth', 0], ['company', 'Company', 1], ['job', 'Job title', 0], ['username', 'Username', 0]].map(([k, l, on]) => `<div class="control-item"><input type="checkbox" id="ppl-${k}"${on ? ' checked' : ''}><label for="ppl-${k}">${l}</label></div>`).join('')}</div>
                </div>
                <div class="web-group" id="pane-dataset" hidden>
                  <div class="web-convert-row web-convert-row-2">
                    <div class="form-group"><label class="form-label" for="ds-count"><span>Rows</span></label><input type="number" id="ds-count" class="input-clean" min="1" max="10000" value="25" inputmode="numeric"></div>
                    <div class="form-group"><label class="form-label" for="ds-locale"><span>Locale</span></label><select id="ds-locale" class="select-clean">${opts([['intl', 'International'], ['in', 'India']], 'intl')}</select></div>
                  </div>
                  <div class="form-group">
                    <span class="form-label"><span>Columns</span><span class="form-label-desc">name · type · options (min-max or a|b|c)</span></span>
                    <div class="dd-rows" id="ds-rows"></div>
                    <button type="button" class="btn-toolbar-sm" id="btn-add-col"><iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon><span>Add column</span></button>
                  </div>
                </div>`,
    outputHtml: `
                  <pre class="web-code dd-text" id="output-text" hidden></pre>
                  <div class="web-table-wrap dd-table-wrap" id="output-table-wrap" hidden><table class="web-table dd-table" id="output-table"><thead></thead><tbody></tbody></table></div>
                  <p class="web-muted" id="output-note" hidden></p>`,
    settingsSummary: 'Random seed · example.com',
    settings: `
              <div class="control-item">
                <label for="opt-seed">Seed (same seed → same data)</label>
                <input type="text" id="opt-seed" class="input-clean" placeholder="leave empty for a fresh random seed" spellcheck="false" autocomplete="off">
              </div>
              <div class="control-item">
                <label for="opt-domain">Email domain</label>
                <select id="opt-domain" class="select-clean">${opts([['example.com', 'example.com'], ['example.org', 'example.org'], ['example.net', 'example.net'], ['test', 'name.test (reserved TLD)'], ['invalid', 'name.invalid (never resolves)']], 'example.com')}</select>
              </div>
              <div class="control-item">
                <label for="opt-table">SQL table name</label>
                <input type="text" id="opt-table" class="input-clean" placeholder="people / data" spellcheck="false" autocomplete="off">
              </div>${CHECK('opt-lorem-start', 'Classic lorem starts with “Lorem ipsum dolor sit amet…”', true)}${CHECK('opt-header', 'Include a header row in CSV', true)}`,
    guide: [['Pick a generator', '<strong>Text</strong> gives placeholder copy by paragraphs, sentences or words in five flavours — classic lorem, hipster, corporate, tech or real-English pangrams — as plain text, HTML or Markdown. <strong>People</strong> makes fake contacts (international or Indian names, phones, PIN codes). <strong>Dataset</strong> lets you define columns and types for any mock table.'], ['Shape it', 'Tick the people fields you need, or add dataset columns: names, emails, cities, dates, integers and floats with a range, booleans, UUIDs, prices, colours, IPs, or a pick-list (<code>a|b|c</code>). Set a <em>seed</em> in Settings and the same inputs produce the same rows every time — ideal for tests and fixtures.'], ['Export', 'Copy the result, or download as text, CSV, JSON or SQL <code>INSERT</code> statements. Emails always use reserved domains (example.com, .test, .invalid) so nothing you generate can reach a real inbox.']],
    faq: [['Is the data really random?', 'It comes from a small seeded pseudo-random generator (mulberry32). With an empty seed a fresh one is drawn each time you reset; with a seed of your own the output is fully reproducible — same seed, same counts, same rows, on any device. Nothing is pulled from the internet.'], ['Can generated emails or phone numbers belong to real people?', 'Names are combined from short lists, so coincidences with real names are possible, but emails use only the reserved domains example.com / .org / .net, .test and .invalid, which can never deliver mail. Phone numbers follow the right shape (+91 9xxxx xxxxx, +1 (xxx) xxx-xxxx) but are not checked against any directory.'], ['What are the lorem flavours for?', 'Classic lorem is unreadable on purpose, so designers see layout not content. Hipster, corporate and tech read like real sentences in a recognisable register when a mock-up needs believable copy, and pangrams contain every letter of the alphabet — useful for testing fonts.'], ['How big can a dataset be?', 'Up to 10,000 rows and any number of columns; the preview shows the first 50 rows and the downloads contain everything. Larger sets are better produced in a script — the browser tab would hold it all in memory.'], ['What does the SQL export look like?', 'One multi-row <code>INSERT INTO table (columns) VALUES (…), (…);</code> per 500 rows, with strings single-quoted and escaped, numbers and booleans bare, and empty values as <code>NULL</code>. Set the table name in Settings; it defaults to <code>people</code> or <code>data</code>.'], PRIVACY_FAQ]
  }
];

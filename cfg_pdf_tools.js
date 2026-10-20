/* Designed by Kapil Pidhwani: one config per PDF tool → gen_pdf_pages.js writes /docs/<slug>/index.html (rule 47).
 * Keys: slug, name, icon, desc (meta, 150–160 chars), lead (hero line), action, actionIcon, suffix, ext,
 *       source ('canvas' | 'images' | 'custom'), sourceLabel, sourceHtml (custom only), dropTitle, dropSub, accept, multiple,
 *       outputLabel, outputKind ('pdf' | 'text' | 'zip'), outputIcon, outputEmpty, settingsSummary, settings (HTML),
 *       css (true → /styles/tools/<slug>.css), libs ['jszip'], guide [[t,d]×3], faq [[q,a]×4–5], cardDesc, tags. */
const RANGE = (id, label, hint) => `
              <div class="control-item">
                <label for="${id}">${label}</label>
                <input type="text" id="${id}" class="input-clean" placeholder="${hint || 'All pages — or e.g. 1-3, 7'}" autocomplete="off">
              </div>`;
const DPI = (id = 'opt-dpi', def = '150') => `
              <div class="control-item">
                <label for="${id}">Resolution</label>
                <select id="${id}" class="select-clean">
                  <option value="72"${def === '72' ? ' selected' : ''}>72 dpi · screen</option>
                  <option value="96">96 dpi</option>
                  <option value="150"${def === '150' ? ' selected' : ''}>150 dpi · documents</option>
                  <option value="200">200 dpi</option>
                  <option value="300">300 dpi · print</option>
                </select>
              </div>`;
const QUALITY = (id = 'opt-quality', def = 85) => `
              <div class="control-item">
                <label for="${id}">JPEG quality (<span id="${id}-val">${def}%</span>)</label>
                <input type="range" id="${id}" class="range-slider-clean" min="40" max="100" step="5" value="${def}" data-unit="%">
              </div>`;
const PAPER = (id = 'opt-paper', extra = '') => `
              <div class="control-item">
                <label for="${id}">Page size</label>
                <select id="${id}" class="select-clean">${extra}
                  <option value="a4">A4 · 210 × 297 mm</option>
                  <option value="letter">Letter · 8.5 × 11 in</option>
                  <option value="legal">Legal · 8.5 × 14 in</option>
                  <option value="a5">A5 · 148 × 210 mm</option>
                  <option value="a3">A3 · 297 × 420 mm</option>
                  <option value="tabloid">Tabloid · 11 × 17 in</option>
                  <option value="custom">Custom (mm)</option>
                </select>
              </div>
              <div class="control-item" id="row-custom" hidden>
                <label for="opt-w">Custom width × height (mm)</label>
                <div class="pdf-two-inputs">
                  <input type="number" id="opt-w" class="input-clean" min="20" max="2000" step="1" placeholder="210" inputmode="numeric" aria-label="Width in millimetres">
                  <input type="number" id="opt-h" class="input-clean" min="20" max="2000" step="1" placeholder="297" inputmode="numeric" aria-label="Height in millimetres">
                </div>
              </div>`;
const PRIVACY_FAQ = ['Is my PDF uploaded anywhere?', 'No. The document is read by PDF.js (the engine Firefox uses) and rewritten by pdf-lib entirely inside your browser. Nothing is transmitted or stored.'];
const ENCRYPTED_FAQ = ['The tool says my PDF is encrypted — what now?', 'Password-protected PDFs must be opened with their password before they can be edited. Run them through Unlock PDF first, then come back.'];

module.exports = [
  {
    slug: 'images-to-pdf', name: 'Images to PDF', icon: 'lucide:images',
    desc: 'Free online images to PDF converter: combine JPG, PNG and WebP photos into one PDF, reorder them, pick A4/Letter or auto size, margins and fit. Runs in your browser — nothing uploaded.',
    lead: 'Turn JPG, PNG and WebP images into a single PDF — reorder, choose the page size and margins, all in your browser.',
    action: 'Convert to PDF', actionIcon: 'lucide:file-output', suffix: 'images', ext: 'pdf',
    source: 'images', sourceLabel: 'Images', dropTitle: 'Drop images here or click to browse', dropSub: 'JPG, PNG, WebP · as many as you like', accept: 'image/', multiple: true,
    outputLabel: 'PDF', outputKind: 'pdf', outputIcon: 'lucide:file-text', outputEmpty: "The PDF's first page will appear here",
    settingsSummary: 'Auto page size · fit · 10 mm margin',
    settings: `${PAPER('opt-paper', '\n                  <option value="auto" selected>Auto · each page matches its image</option>')}
              <div class="control-item">
                <span>Orientation</span>
                <div class="segmented-group segmented-group-pill" id="seg-orient" role="group" aria-label="Orientation">
                  <button type="button" class="seg-pill active" data-value="auto">Auto</button>
                  <button type="button" class="seg-pill" data-value="portrait">Portrait</button>
                  <button type="button" class="seg-pill" data-value="landscape">Landscape</button>
                </div>
              </div>
              <div class="control-item">
                <span>Image placement</span>
                <div class="segmented-group segmented-group-pill" id="seg-fit" role="group" aria-label="Image placement">
                  <button type="button" class="seg-pill active" data-value="fit">Fit inside</button>
                  <button type="button" class="seg-pill" data-value="fill">Fill &amp; crop</button>
                </div>
              </div>
              <div class="control-item">
                <label for="opt-margin">Margin (<span id="opt-margin-val">10 mm</span>)</label>
                <input type="range" id="opt-margin" class="range-slider-clean" min="0" max="40" step="2" value="10" data-unit=" mm">
              </div>
              ${QUALITY('opt-quality', 90)}`,
    guide: [['Drop Your Images', 'Add JPG, PNG or WebP files. They appear as a list you can reorder with the arrows or remove with ✕ — the order is the page order.'], ['Pick Page Size & Fit', 'Auto makes every page the size of its image. Choose A4 or Letter for a uniform document, set margins, and decide whether images fit inside or fill the page.'], ['Convert & Download', 'Click Convert. JPGs are embedded as-is, PNGs keep transparency, WebP is re-encoded. Download the PDF or open it in a new tab.']],
    faq: [['Will my photos lose quality?', 'JPG files are embedded byte-for-byte, so no. PNGs are embedded losslessly too. WebP and HEIC are not native PDF formats, so they are re-encoded as JPEG at the quality you set in Settings (90 % by default).'], ['How many images can I add?', 'There is no fixed limit; very large batches are bound by your device memory. A few hundred phone photos is fine. The pages are built one at a time with a yield so the tab stays responsive.'], ['Why does Auto page size produce mixed page sizes?', 'Auto sizes each page to its image (at 72 dpi for pixel dimensions), which is ideal for scans and screenshots. For a uniform printable document choose A4 or Letter.'], ['Can I add a title or page numbers?', 'Not here — the tool stays single-purpose. Convert first, then run the result through PDF Page Numberer or Watermark PDF.'], PRIVACY_FAQ],
    cardDesc: 'Combine JPG, PNG and WebP images into one PDF — reorder, A4/Letter or auto size, margins and fit.',
    tags: ['images to pdf', 'jpg to pdf', 'png to pdf', 'photo to pdf', 'webp to pdf', 'combine images', 'scan to pdf', 'picture to pdf', 'convert']
  },
  {
    slug: 'pdf-to-images', name: 'PDF to Images', icon: 'lucide:image-down',
    desc: 'Free online PDF to image converter: export every page (or a range) as PNG, JPG or WebP at 72–300 dpi and download them as a ZIP. Rendered entirely in your browser — nothing uploaded.',
    lead: 'Export PDF pages as PNG, JPG or WebP at the resolution you need — one file or a ZIP of every page, all in your browser.',
    action: 'Convert', actionIcon: 'lucide:image-down', suffix: 'pages', ext: 'zip',
    source: 'canvas', sourceLabel: 'PDF', dropTitle: 'Drop PDF here or click to browse', dropSub: 'Any PDF — up to 100 MB',
    outputLabel: 'Images', outputKind: 'zip', outputIcon: 'lucide:images', outputEmpty: 'The first exported page will appear here', libs: ['jszip'],
    settingsSummary: 'PNG · 150 dpi · all pages',
    settings: `
              <div class="control-item">
                <label for="opt-format">Format</label>
                <select id="opt-format" class="select-clean">
                  <option value="png" selected>PNG · lossless</option>
                  <option value="jpeg">JPG · smaller</option>
                  <option value="webp">WebP · smallest</option>
                </select>
              </div>
              ${DPI()}
              ${QUALITY()}
              ${RANGE('opt-pages', 'Pages')}`,
    guide: [['Drop a PDF', 'The first page renders as a preview so you can check it is the right file.'], ['Choose Format & Resolution', 'PNG for crisp text and diagrams, JPG or WebP for photo-heavy pages. 150 dpi suits screens and documents; 300 dpi is print quality. Limit to a page range if you only need a few.'], ['Convert & Download', 'Click Convert. One page downloads as an image; several pages come as a ZIP named after the PDF with one image per page.']],
    faq: [['Which resolution should I pick?', '72 dpi matches the PDF\'s nominal size in pixels; 150 dpi is sharp on screens and in slides; 300 dpi is what printers expect. Higher dpi means larger files and slower rendering — a 300 dpi A4 page is about 2 500 × 3 500 px.'], ['Why is PNG so much larger than JPG?', 'PNG is lossless, so photographic pages compress poorly. Use JPG or WebP for scans and photos, PNG for text, line art and anything with transparency.'], ['Is there a page limit?', 'No hard limit; rendering happens one page at a time with a progress bar. Several hundred pages at 300 dpi will take a while and use memory for the ZIP — split the PDF first if it is huge.'], ['Can I extract the original embedded images instead of rendering pages?', 'Not with this tool — it renders what you see on each page. Extracting embedded image streams is on the list if people ask.'], PRIVACY_FAQ],
    cardDesc: 'Export every page or a range as PNG, JPG or WebP at 72–300 dpi, zipped.',
    tags: ['pdf to images', 'pdf to png', 'pdf to jpg', 'pdf to webp', 'export pages', 'render pdf', 'convert pdf', 'pdf to image']
  },
  {
    slug: 'pdf-to-text', name: 'PDF to Text', icon: 'lucide:file-type',
    desc: 'Free online PDF to text extractor: pull the text layer out of any PDF with reading-order line breaks, copy it or download a .txt. Runs entirely in your browser — files never leave your device.',
    lead: 'Extract the text from a PDF in reading order — copy it or save a .txt, with no upload and no OCR guesswork.',
    action: 'Extract Text', actionIcon: 'lucide:file-type', suffix: 'text', ext: 'txt',
    source: 'canvas', sourceLabel: 'PDF', dropTitle: 'Drop PDF here or click to browse', dropSub: 'Any PDF with a text layer — up to 100 MB',
    outputLabel: 'Text', outputKind: 'text', outputIcon: 'lucide:text', outputEmpty: 'Extracted text will appear here',
    settingsSummary: 'Reading order · page breaks · all pages',
    settings: `
              <div class="control-item">
                <label for="opt-mode">Layout</label>
                <select id="opt-mode" class="select-clean">
                  <option value="reading" selected>Reading order · paragraphs</option>
                  <option value="lines">Raw lines · one per text line</option>
                </select>
              </div>
              <div class="control-item">
                <input type="checkbox" id="opt-breaks" checked>
                <label for="opt-breaks">Separate pages with a marker line</label>
              </div>
              ${RANGE('opt-pages', 'Pages')}`,
    guide: [['Drop a PDF', 'The first page renders so you can confirm the file. Scanned PDFs that are only images have no text layer — the tool will tell you.'], ['Choose the Layout', 'Reading order joins lines into paragraphs and keeps blank lines between blocks; Raw lines gives you exactly one line per text line, handy for tables and code.'], ['Extract, Copy or Download', 'Click Extract Text. Review it in the output pane, Copy it to the clipboard, or Download a .txt named after the PDF.']],
    faq: [['It says the PDF has no text layer — why?', 'Scanned documents and photos saved as PDF contain only images, so there is no text to extract. This tool deliberately ships without OCR (recognition engines are 10 MB+ downloads); it extracts the real text layer only.'], ['Why is the order wrong on some pages?', 'PDFs store text as positioned fragments, not paragraphs. Reading order sorts by line then column and works for most documents; multi-column layouts or floating captions can interleave. Switch to Raw lines to see the fragments as laid out.'], ['Are hyphenated line breaks joined?', 'Yes, in Reading order mode words split with a hyphen at the end of a line are rejoined. Raw lines leaves them untouched.'], ['Can I extract a single page?', 'Enter a range in Settings, e.g. 3 or 2-5, 9. Leave it empty for every page.'], PRIVACY_FAQ],
    cardDesc: 'Pull the text layer out of a PDF in reading order — copy it or save a .txt.',
    tags: ['pdf to text', 'extract text', 'pdf to txt', 'copy text from pdf', 'text layer', 'convert pdf to text', 'pdf text extractor']
  },
  {
    slug: 'pdf-page-numberer', name: 'PDF Page Numberer', icon: 'lucide:list-ordered',
    desc: 'Free online PDF page numberer: add page numbers in any corner or centre, formats like 1, Page 1 or 1 / 12, custom start number, font size, margin and skipped cover pages. Runs in your browser — no upload.',
    lead: 'Stamp page numbers onto any PDF — pick the position, format, start number and pages to skip, in your browser.',
    action: 'Add Numbers', actionIcon: 'lucide:list-ordered', suffix: 'numbered', ext: 'pdf',
    source: 'canvas', sourceLabel: 'PDF', dropTitle: 'Drop PDF here or click to browse', dropSub: 'Any PDF — up to 100 MB',
    outputLabel: 'Numbered PDF', outputIcon: 'lucide:file-check', outputEmpty: 'The first numbered page will appear here',
    settingsSummary: 'Bottom centre · "1" · from 1',
    settings: `
              <div class="control-item">
                <label for="opt-pos">Position</label>
                <select id="opt-pos" class="select-clean">
                  <option value="bc" selected>Bottom centre</option>
                  <option value="br">Bottom right</option>
                  <option value="bl">Bottom left</option>
                  <option value="tc">Top centre</option>
                  <option value="tr">Top right</option>
                  <option value="tl">Top left</option>
                  <option value="bo">Bottom outside (mirrored for duplex)</option>
                </select>
              </div>
              <div class="control-item">
                <label for="opt-format">Format</label>
                <select id="opt-format" class="select-clean">
                  <option value="n" selected>1</option>
                  <option value="page">Page 1</option>
                  <option value="of">1 / 12</option>
                  <option value="pageof">Page 1 of 12</option>
                  <option value="dash">– 1 –</option>
                </select>
              </div>
              <div class="control-item">
                <label for="opt-start">Start at</label>
                <input type="number" id="opt-start" class="input-clean" min="0" max="99999" step="1" value="1" inputmode="numeric">
              </div>
              <div class="control-item">
                <label for="opt-skip">Skip first pages (cover)</label>
                <input type="number" id="opt-skip" class="input-clean" min="0" max="999" step="1" value="0" inputmode="numeric">
              </div>
              <div class="control-item">
                <label for="opt-size">Font size (<span id="opt-size-val">11 pt</span>)</label>
                <input type="range" id="opt-size" class="range-slider-clean" min="7" max="24" step="1" value="11" data-unit=" pt">
              </div>
              <div class="control-item">
                <label for="opt-margin">Margin from edge (<span id="opt-margin-val">12 mm</span>)</label>
                <input type="range" id="opt-margin" class="range-slider-clean" min="4" max="30" step="1" value="12" data-unit=" mm">
              </div>
              <div class="control-item">
                <label for="opt-colour">Colour</label>
                <input type="color" id="opt-colour" class="widget-color-picker" value="#333333" aria-label="Number colour">
              </div>`,
    guide: [['Drop a PDF', 'The first page renders as a preview. Numbers are added on top of the existing content, so headers and footers stay as they are.'], ['Choose Position & Format', 'Open Settings to pick a corner or centre, a format such as "Page 1 of 12", the first number, how many cover pages to skip, and the size, margin and colour.'], ['Add & Download', 'Click Add Numbers. The preview jumps to the first numbered page; Download the PDF or Open it in a new tab to check every page.']],
    faq: [['Does "skip first pages" change the count?', 'Skipped pages get no number and are not counted: with 2 skipped and Start at 1, page 3 of the file shows "1". If you want the cover counted but unnumbered, set Start at to 3.'], ['What does Bottom outside mean?', 'For duplex printing: odd pages get the number bottom-right and even pages bottom-left, so it always sits on the outer edge of the open book.'], ['Will the numbers cover existing footers?', 'They are drawn on top at the margin you choose. If a footer already sits there, raise the margin or switch to a top position — the preview updates as soon as you run it again.'], ['Can I use Roman numerals or a different font?', 'Not yet — Arabic numerals in Helvetica keep every viewer happy and the file small. Roman numerals and bold are on the list.'], ENCRYPTED_FAQ],
    cardDesc: 'Add page numbers in any position with formats like "Page 1 of 12", a start number and skipped cover pages.',
    tags: ['page numbers', 'number pages', 'pdf page numberer', 'add page numbers to pdf', 'pagination', 'footer', 'stamp numbers']
  },
  {
    slug: 'pdf-metadata-editor', name: 'PDF Metadata Editor', icon: 'lucide:file-pen-line',
    desc: 'Free online PDF metadata editor: change the title, author, subject, keywords, creator, producer and dates of any PDF, or clear them. Edited entirely in your browser — documents never leave your device.',
    lead: 'Edit the title, author, keywords and dates stored inside a PDF — or wipe them — without uploading the file.',
    action: 'Save Metadata', actionIcon: 'lucide:save', suffix: 'metadata', ext: 'pdf',
    source: 'custom', sourceLabel: 'Document info', dropTitle: 'Drop PDF here or click to browse', dropSub: 'Any PDF — up to 100 MB',
    sourceHtml: `
                  <div id="meta-form" class="pdf-meta-form" hidden>
                    <div class="form-group"><label class="form-label" for="meta-title"><span>Title</span></label><input type="text" id="meta-title" class="input-clean" placeholder="Document title" autocomplete="off"></div>
                    <div class="form-row-2col">
                      <div class="form-group"><label class="form-label" for="meta-author"><span>Author</span></label><input type="text" id="meta-author" class="input-clean" placeholder="Name" autocomplete="off"></div>
                      <div class="form-group"><label class="form-label" for="meta-subject"><span>Subject</span></label><input type="text" id="meta-subject" class="input-clean" placeholder="What it is about" autocomplete="off"></div>
                    </div>
                    <div class="form-group"><label class="form-label" for="meta-keywords"><span>Keywords</span><span class="form-label-desc">Comma separated</span></label><input type="text" id="meta-keywords" class="input-clean" placeholder="invoice, 2026, acme" autocomplete="off"></div>
                    <div class="form-row-2col">
                      <div class="form-group"><label class="form-label" for="meta-creator"><span>Creator</span><span class="form-label-desc">App that made it</span></label><input type="text" id="meta-creator" class="input-clean" placeholder="e.g. Word" autocomplete="off"></div>
                      <div class="form-group"><label class="form-label" for="meta-producer"><span>Producer</span><span class="form-label-desc">PDF library</span></label><input type="text" id="meta-producer" class="input-clean" placeholder="e.g. pdf-lib" autocomplete="off"></div>
                    </div>
                    <div class="form-row-2col">
                      <div class="form-group"><label class="form-label" for="meta-created"><span>Created</span></label><input type="datetime-local" id="meta-created" class="input-clean"></div>
                      <div class="form-group"><label class="form-label" for="meta-modified"><span>Modified</span></label><input type="datetime-local" id="meta-modified" class="input-clean"></div>
                    </div>
                    <button type="button" class="btn-toolbar-sm" id="btn-clear-meta" title="Clear every field">
                      <iconify-icon icon="lucide:eraser" width="14" height="14"></iconify-icon><span>Clear all fields</span>
                    </button>
                  </div>`,
    outputLabel: 'Updated PDF', outputIcon: 'lucide:file-check', outputEmpty: 'The saved PDF will appear here',
    settingsSummary: 'Also strips XMP · keeps content',
    settings: `
              <div class="control-item">
                <input type="checkbox" id="opt-xmp" checked>
                <label for="opt-xmp">Remove the XMP metadata stream too (so viewers show the new values, not the old XMP)</label>
              </div>`,
    guide: [['Drop a PDF', 'The form fills with whatever the file currently stores — title, author, subject, keywords, creator, producer and both dates.'], ['Edit or Clear', 'Change any field, or press Clear all fields to blank everything (handy before sharing). Dates use your local time zone.'], ['Save & Download', 'Click Save Metadata. Page content is untouched; only the document information dictionary (and the XMP block, if the option is on) changes.']],
    faq: [['My viewer still shows the old title — why?', 'Some viewers prefer the XMP metadata stream over the classic Info dictionary. Leave "Remove the XMP metadata stream" on so the new values win; the file\'s pages and text are unaffected.'], ['Does this change the file content or quality?', 'No. Only the document information is rewritten; pages, fonts and images are saved exactly as they were.'], ['Can I remove metadata completely?', 'Press Clear all fields and save. For a one-click wipe (including XMP) use PDF Metadata Remover, which does exactly that.'], ['Which date format is used?', 'You pick dates with the browser\'s native picker in your local time zone; they are stored in the PDF\'s standard D:YYYYMMDDHHmmSS form with the time-zone offset.'], ENCRYPTED_FAQ],
    cardDesc: 'Change or clear a PDF\'s title, author, subject, keywords, creator, producer and dates.',
    tags: ['pdf metadata editor', 'edit pdf title', 'change author', 'pdf properties', 'document info', 'keywords', 'xmp', 'edit metadata']
  },
  {
    slug: 'pdf-cropper', name: 'PDF Cropper', icon: 'lucide:crop',
    desc: 'Free online PDF cropper: drag a box over a page to trim margins or isolate a region, apply it to one page, a range or the whole document — lossless, in your browser, nothing uploaded.',
    lead: 'Drag a crop box over any page and apply it to one page or the whole PDF — lossless margins trimming in your browser.',
    action: 'Crop', actionIcon: 'lucide:crop', suffix: 'cropped', ext: 'pdf', css: true,
    source: 'custom', sourceLabel: 'Page', dropTitle: 'Drop PDF here or click to browse', dropSub: 'Any PDF — up to 100 MB',
    sourceHtml: `
                  <div class="pdf-crop-stage" id="crop-stage" hidden>
                    <canvas id="source-canvas" class="pdf-page-canvas" aria-label="Page preview"></canvas>
                    <div class="pdf-crop-box" id="crop-box" role="img" aria-label="Crop area">
                      <span class="pdf-crop-handle" data-h="nw"></span><span class="pdf-crop-handle" data-h="ne"></span>
                      <span class="pdf-crop-handle" data-h="sw"></span><span class="pdf-crop-handle" data-h="se"></span>
                    </div>
                  </div>
                  <div class="pdf-pager" id="crop-pager" hidden>
                    <button type="button" class="pdf-thumb-btn" id="btn-prev" aria-label="Previous page"><iconify-icon icon="lucide:chevron-left" width="14" height="14"></iconify-icon></button>
                    <span id="crop-page-label">Page 1 of 1</span>
                    <button type="button" class="pdf-thumb-btn" id="btn-next" aria-label="Next page"><iconify-icon icon="lucide:chevron-right" width="14" height="14"></iconify-icon></button>
                  </div>`,
    outputLabel: 'Cropped PDF', outputIcon: 'lucide:file-check', outputEmpty: 'The cropped page will appear here',
    settingsSummary: 'Apply to all pages · free ratio',
    settings: `
              <div class="control-item">
                <span>Apply to</span>
                <div class="segmented-group segmented-group-pill" id="seg-scope" role="group" aria-label="Apply crop to">
                  <button type="button" class="seg-pill active" data-value="all">All pages</button>
                  <button type="button" class="seg-pill" data-value="this">This page</button>
                  <button type="button" class="seg-pill" data-value="range">Range</button>
                </div>
              </div>
              ${RANGE('opt-pages', 'Range', 'e.g. 2-5, 9')}
              <div class="control-item">
                <label for="opt-ratio">Aspect ratio</label>
                <select id="opt-ratio" class="select-clean">
                  <option value="free" selected>Free</option>
                  <option value="a">A-series (1 : 1.414)</option>
                  <option value="letter">Letter (8.5 : 11)</option>
                  <option value="1">Square</option>
                  <option value="1.7778">16 : 9</option>
                  <option value="1.3333">4 : 3</option>
                </select>
              </div>
              <div class="control-item">
                <button type="button" class="btn-toolbar-sm" id="btn-auto" title="Detect the content bounds on this page and set the box to them">
                  <iconify-icon icon="lucide:scan" width="14" height="14"></iconify-icon><span>Auto-detect margins</span>
                </button>
              </div>`,
    guide: [['Drop a PDF', 'The first page renders with a crop box over it. Use ‹ › to move to another page; the box keeps its relative position.'], ['Draw the Crop', 'Drag the box or its corners. Auto-detect margins in Settings snaps the box to the content on the current page — ideal for scans with wide white borders.'], ['Apply & Download', 'Choose All pages, This page or a Range, then click Crop. The page\'s crop box is set — nothing is re-rendered, so text stays sharp and selectable.']],
    faq: [['Is cropping lossless?', 'Yes. The tool sets each page\'s /CropBox, which tells viewers and printers what to show. Content outside stays in the file (hidden); quality and text are untouched.'], ['Can I permanently delete what is outside the box?', 'Not with a lossless crop. If you need the hidden area gone (for privacy), crop here and then run PDF Flattener in Everything mode, which re-renders only the visible region.'], ['The pages have different sizes — what does All pages do?', 'The box is stored as a fraction of the page, so a 10 % margin trim applies proportionally to every page regardless of size or orientation.'], ['Why is the box clamped?', 'A crop box must stay inside the page and be at least 20 pt wide and tall; the handles stop there so you cannot produce an empty page.'], ENCRYPTED_FAQ],
    cardDesc: 'Drag a box to trim margins or isolate a region — one page, a range or all, lossless.',
    tags: ['pdf cropper', 'crop pdf', 'trim margins', 'cropbox', 'cut pdf page', 'remove white space', 'crop pages']
  },
  {
    slug: 'pdf-page-resizer', name: 'PDF Page Resizer', icon: 'lucide:scaling',
    desc: 'Free online PDF page resizer: convert pages to A4, Letter, Legal, A5, A3 or a custom size, scaling content to fit or fill with per-page orientation. Runs in your browser — nothing uploaded.',
    lead: 'Change every page to A4, Letter or any size you need — content is scaled and centred, all in your browser.',
    action: 'Resize', actionIcon: 'lucide:scaling', suffix: 'resized', ext: 'pdf',
    source: 'canvas', sourceLabel: 'PDF', dropTitle: 'Drop PDF here or click to browse', dropSub: 'Any PDF — up to 100 MB',
    outputLabel: 'Resized PDF', outputIcon: 'lucide:file-check', outputEmpty: 'The first resized page will appear here',
    settingsSummary: 'A4 · fit · keep orientation',
    settings: `${PAPER()}
              <div class="control-item">
                <span>Orientation</span>
                <div class="segmented-group segmented-group-pill" id="seg-orient" role="group" aria-label="Orientation">
                  <button type="button" class="seg-pill active" data-value="auto">Keep each page's</button>
                  <button type="button" class="seg-pill" data-value="portrait">Portrait</button>
                  <button type="button" class="seg-pill" data-value="landscape">Landscape</button>
                </div>
              </div>
              <div class="control-item">
                <span>Scaling</span>
                <div class="segmented-group segmented-group-pill" id="seg-fit" role="group" aria-label="Scaling">
                  <button type="button" class="seg-pill active" data-value="fit">Fit (whole page visible)</button>
                  <button type="button" class="seg-pill" data-value="fill">Fill (crop edges)</button>
                  <button type="button" class="seg-pill" data-value="none">No scaling (centre)</button>
                </div>
              </div>`,
    guide: [['Drop a PDF', 'The first page renders as a preview with its current size shown in the badge.'], ['Choose the Target Size', 'Pick A4, Letter, Legal, A5, A3, Tabloid or type a custom width and height in millimetres. Keep each page\'s orientation, or force portrait/landscape.'], ['Resize & Download', 'Click Resize. Each page is placed on a new page of the target size — scaled to fit, scaled to fill, or centred at 100 % — and the result opens in the preview.']],
    faq: [['Does resizing change the text or image quality?', 'No. Each original page is embedded as a vector form onto the new page and scaled mathematically, so text stays text and images keep their pixels.'], ['What is the difference between Fit, Fill and No scaling?', 'Fit scales the page down (or up) so the whole thing is visible, leaving bars if the ratio differs. Fill scales until the target is covered and trims the overflow. No scaling keeps 100 % size and centres it — useful for putting A5 content onto A4.'], ['Why does my mixed-orientation PDF come out right?', 'With Keep each page\'s, a landscape source page becomes a landscape target page and a portrait one stays portrait. Force an orientation only if you want a uniform output.'], ['Will links and form fields survive?', 'Page content is copied; interactive annotations (links, form fields) are not re-positioned and are dropped. Flatten forms first if you need their values to remain visible.'], ENCRYPTED_FAQ],
    cardDesc: 'Convert pages to A4, Letter, Legal or a custom size — fit, fill or centre the content.',
    tags: ['pdf page resizer', 'resize pdf', 'a4 to letter', 'letter to a4', 'change page size', 'scale pdf', 'paper size', 'a5 to a4']
  },
  {
    slug: 'pdf-form-filler', name: 'PDF Form Filler', icon: 'lucide:clipboard-pen',
    desc: 'Free online PDF form filler: type into text fields, tick checkboxes, pick radio and dropdown options in any fillable PDF, then save it filled and optionally flattened. In your browser — nothing uploaded.',
    lead: 'Fill in any PDF form — text, checkboxes, radios and dropdowns — and save it flattened or still editable, in your browser.',
    action: 'Fill & Save', actionIcon: 'lucide:clipboard-check', suffix: 'filled', ext: 'pdf',
    source: 'custom', sourceLabel: 'Form fields', dropTitle: 'Drop a fillable PDF here or click to browse', dropSub: 'Forms with AcroForm fields — up to 100 MB',
    sourceHtml: `
                  <div id="form-fields" class="pdf-meta-form" hidden></div>`,
    outputLabel: 'Filled PDF', outputIcon: 'lucide:file-check', outputEmpty: 'The filled form will appear here',
    settingsSummary: 'Flatten after filling',
    settings: `
              <div class="control-item">
                <input type="checkbox" id="opt-flatten" checked>
                <label for="opt-flatten">Flatten — bake the values into the page so they cannot be edited and always print</label>
              </div>`,
    guide: [['Drop a Fillable PDF', 'Every form field becomes an input on the left, in page order, with its label. If the PDF has no fields the tool says so — scanned forms need a different approach.'], ['Fill in the Fields', 'Type, tick and pick. Values are kept in memory only; nothing is sent anywhere.'], ['Save & Download', 'Click Fill & Save. With Flatten on (default) the values become part of the page — safe to send, impossible to tamper with. Turn it off to keep the form editable.']],
    faq: [['The PDF opens but no fields appear — why?', 'It has no AcroForm fields: it is a scanned or printed form. Fields must exist in the file to be filled here. Use Sign PDF to place typed text onto it instead.'], ['What does Flatten do?', 'It draws each field\'s current value onto the page and removes the interactive widget, so every viewer shows the same thing and nothing can be changed afterwards. Leave it off if the recipient must edit the form.'], ['Why does a dropdown show fewer options than in Acrobat?', 'Only the options stored in the PDF are shown. Some forms compute options with JavaScript, which browsers (and this tool) do not run.'], ['Are signature fields supported?', 'Not here — digital signature fields need a certificate. For a visible drawn or typed signature, use Sign PDF after filling.'], ENCRYPTED_FAQ],
    cardDesc: 'Type, tick and pick in any fillable PDF, then save it flattened or still editable.',
    tags: ['pdf form filler', 'fill pdf form', 'acroform', 'fillable pdf', 'checkbox', 'dropdown', 'complete form', 'flatten form']
  },
  {
    slug: 'pdf-flattener', name: 'PDF Flattener', icon: 'lucide:layers',
    desc: 'Free online PDF flattener: merge form fields and annotations into the page losslessly, or rasterise every page so nothing stays editable or hidden. Runs entirely in your browser — nothing uploaded.',
    lead: 'Bake form fields and annotations into the page, or rasterise everything for a locked, print-safe PDF — in your browser.',
    action: 'Flatten', actionIcon: 'lucide:layers', suffix: 'flattened', ext: 'pdf',
    source: 'canvas', sourceLabel: 'PDF', dropTitle: 'Drop PDF here or click to browse', dropSub: 'Any PDF — up to 100 MB',
    outputLabel: 'Flattened PDF', outputIcon: 'lucide:file-check', outputEmpty: 'The flattened first page will appear here',
    settingsSummary: 'Forms & annotations · lossless',
    settings: `
              <div class="control-item">
                <span>Mode</span>
                <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Flatten mode">
                  <button type="button" class="seg-pill active" data-value="forms">Forms &amp; annotations</button>
                  <button type="button" class="seg-pill" data-value="raster">Everything (rasterise)</button>
                </div>
              </div>
              <div id="row-raster" hidden>
                ${DPI()}
                ${QUALITY()}
              </div>`,
    guide: [['Drop a PDF', 'The first page renders as a preview. The badge shows how many form fields and annotations the file contains.'], ['Pick a Mode', 'Forms & annotations keeps text selectable and simply bakes field values and comments into the page. Everything re-renders each page to an image so layers, hidden text and cropped-away areas are gone for good.'], ['Flatten & Download', 'Click Flatten. Lossless mode is instant; Everything shows a per-page progress bar and lets you choose the resolution and JPEG quality.']],
    faq: [['Which mode should I use?', 'Use Forms & annotations for filled forms and reviewed documents you want to lock — it is lossless. Use Everything before sharing something that was redacted, cropped or layered, when no hidden content may survive.'], ['Does Everything mode remove the text layer?', 'Yes. Pages become images, so text is no longer selectable or searchable and the file is usually larger. That is the point — nothing remains underneath.'], ['Will links still work after flattening?', 'In Forms & annotations mode link annotations are kept. In Everything mode all annotations, including links, are gone.'], ['Why did nothing change?', 'If the PDF has no form fields or annotations, lossless flattening has nothing to do and the output equals the input. Use Everything if you need a rasterised copy anyway.'], ENCRYPTED_FAQ],
    cardDesc: 'Bake form fields and annotations into the page losslessly, or rasterise every page.',
    tags: ['pdf flattener', 'flatten pdf', 'flatten form', 'merge annotations', 'rasterize pdf', 'lock pdf', 'non editable', 'print safe']
  },
  {
    slug: 'grayscale-pdf', name: 'Grayscale PDF', icon: 'lucide:contrast',
    desc: 'Free online grayscale PDF converter: turn a colour PDF black-and-white for cheaper printing or smaller files, at the resolution and quality you choose. Rendered entirely in your browser — nothing uploaded.',
    lead: 'Convert a colour PDF to grayscale for printing or sharing — choose the resolution and quality, all in your browser.',
    action: 'Convert to Grayscale', actionIcon: 'lucide:contrast', suffix: 'grayscale', ext: 'pdf',
    source: 'canvas', sourceLabel: 'PDF', dropTitle: 'Drop PDF here or click to browse', dropSub: 'Any PDF — up to 100 MB',
    outputLabel: 'Grayscale PDF', outputIcon: 'lucide:file-check', outputEmpty: 'The grayscale first page will appear here',
    settingsSummary: '150 dpi · 85 % quality',
    settings: `${DPI()}
              ${QUALITY()}
              ${RANGE('opt-pages', 'Pages')}`,
    guide: [['Drop a PDF', 'The first page renders in colour so you can compare it with the result.'], ['Choose Resolution & Quality', '150 dpi is right for on-screen reading and office printing; pick 300 dpi for print shops. Lower JPEG quality shrinks the file further.'], ['Convert & Download', 'Click Convert to Grayscale. Each page is rendered, desaturated and re-embedded; the preview shows the first page and the badge the new size.']],
    faq: [['Is the text still selectable afterwards?', 'No. Pages are re-rendered as grayscale images, so text becomes part of the picture. If you need selectable text in grayscale, your PDF editor\'s print-to-PDF with a grayscale printer profile is the right tool.'], ['Will the file get smaller?', 'Usually, for colour-heavy pages — a grayscale JPEG at 150 dpi is far smaller than embedded colour photos. Text-only PDFs can grow, because vector text is tiny and images are not.'], ['How is the conversion done?', 'Each page is drawn by PDF.js onto a canvas, desaturated with a luminance filter (the same maths printers use) and saved as a JPEG page with pdf-lib.'], ['Can I convert only some pages?', 'Yes — enter a range in Settings; other pages are copied unchanged (and stay in colour).'], PRIVACY_FAQ],
    cardDesc: 'Turn a colour PDF black-and-white for cheaper printing or smaller files.',
    tags: ['grayscale pdf', 'greyscale pdf', 'black and white pdf', 'convert pdf to grayscale', 'desaturate', 'monochrome', 'print friendly']
  },
  /* ═══════════ batch 4 ═══════════ */
  {
    slug: 'pdf-repair', name: 'PDF Repair', icon: 'lucide:wrench',
    desc: 'Free online PDF repair: fix PDFs that will not open or print — broken cross-reference tables, truncated downloads, damaged objects — by rebuilding the file structure in your browser, with a rasterise fallback for badly corrupted files. Nothing uploaded.',
    lead: 'Fix a PDF that won’t open, prints blank or says “file is damaged” — the structure is rebuilt on your device, nothing uploaded.',
    action: 'Repair', actionIcon: 'lucide:wrench', suffix: 'repaired', ext: 'pdf', lenient: true,
    source: 'canvas', sourceLabel: 'Damaged PDF', dropTitle: 'Drop the PDF here or click to browse', dropSub: 'Any PDF, even ones that fail to open — up to 100 MB',
    outputLabel: 'Repaired PDF', outputIcon: 'lucide:file-check', outputEmpty: 'The repaired first page appears here',
    settingsSummary: 'Auto · keep metadata',
    settings: `
              <div class="control-item">
                <label for="opt-method">Method</label>
                <select id="opt-method" class="select-clean">
                  <option value="auto" selected>Auto — rebuild structure, rasterise only if that fails</option>
                  <option value="rebuild">Rebuild structure (vector, keeps text)</option>
                  <option value="raster">Rasterise pages (last resort, 150 dpi images)</option>
                </select>
              </div>
              <div class="control-item">
                <input type="checkbox" id="opt-meta" checked>
                <label for="opt-meta">Keep title, author and other metadata</label>
              </div>
              <div class="control-item">
                <input type="checkbox" id="opt-strip">
                <label for="opt-strip">Drop annotations, forms and links (fixes most “broken object” errors)</label>
              </div>`,
    guide: [['Drop the broken PDF', 'It is accepted even if the viewer cannot open it. If it does open, the first page shows on the left.'], ['Pick a method', '<strong>Auto</strong> re-parses every object, rebuilds the cross-reference table and rewrites a clean file; if the content streams themselves are damaged it falls back to re-drawing each page as an image. You can force either.'], ['Repair and check', 'Click <strong>Repair</strong>. The badge reports pages recovered, what was dropped and whether the result opens cleanly. Download it and try printing again.']],
    faq: [PRIVACY_FAQ,
      ['What kinds of damage can it fix?', 'The common ones: a broken or missing cross-reference table (the “xref” error), a truncated download, wrong object offsets, duplicate or dangling objects, a bad trailer, junk before the header or after %%EOF, and malformed annotations or forms. It rebuilds the index by scanning for objects, like Acrobat’s repair does.'],
      ['What can it not fix?', 'Encrypted files (unlock them first), and files whose page content streams are themselves destroyed. For those the rasterise fallback re-draws whatever the renderer can still show — text becomes an image, so it is a last resort.'],
      ['Will the text still be selectable?', 'Yes with <em>Rebuild structure</em> — pages are copied as vector content. Only the rasterise method turns pages into pictures, and the badge tells you when that happened.'],
      ['Why is the repaired file a different size?', 'The file is rewritten with a fresh object table and compressed object streams; dead objects left behind by earlier edits are not copied, so it is often smaller. Dropping annotations also removes their data.'],
      ENCRYPTED_FAQ],
    cardDesc: 'Fix PDFs that won’t open — rebuild the structure, rasterise as a last resort.',
    tags: ['pdf repair', 'fix pdf', 'repair pdf', 'corrupt pdf', 'damaged pdf', 'pdf won\'t open', 'xref error', 'recover pdf', 'broken pdf', 'file is damaged', 'rebuild pdf']
  },
  {
    slug: 'pdf-booklet-nup', name: 'Booklet & N-up Imposition', icon: 'lucide:book-open',
    desc: 'Free online PDF booklet maker and N-up imposition: arrange pages for saddle-stitch booklet printing, put 2, 4, 6 or 9 pages per sheet, or split scanned two-page spreads in half — with gutter, margins and crop marks, in your browser, nothing uploaded.',
    lead: 'Print a booklet, fit several pages on one sheet, or split scanned spreads — imposition done on your device, vector-exact.',
    action: 'Impose', actionIcon: 'lucide:book-open', suffix: 'imposed', ext: 'pdf',
    source: 'canvas', sourceLabel: 'PDF', dropTitle: 'Drop PDF here or click to browse', dropSub: 'Any PDF — up to 100 MB',
    outputLabel: 'Imposed PDF', outputIcon: 'lucide:file-check', outputEmpty: 'The first imposed sheet appears here',
    settingsSummary: 'Booklet · A4 landscape',
    settings: `
              <div class="control-item">
                <span>Mode</span>
                <div class="segmented-group segmented-group-pill" id="seg-mode" role="group" aria-label="Mode">
                  <button type="button" class="seg-pill active" data-value="booklet">Booklet</button>
                  <button type="button" class="seg-pill" data-value="nup" title="Several pages per sheet">N-up</button>
                  <button type="button" class="seg-pill" data-value="halve" title="Split each spread into two pages">Halve</button>
                </div>
              </div>
              <div class="control-item" id="row-nup">
                <label for="opt-nup">Pages per sheet</label>
                <select id="opt-nup" class="select-clean"><option value="2" selected>2-up</option><option value="4">4-up</option><option value="6">6-up</option><option value="9">9-up</option><option value="16">16-up</option></select>
              </div>
              ${PAPER('opt-paper', '<option value="auto" selected>Auto — doubled source page</option>')}
              <div class="control-item" id="row-order">
                <span>Fill order</span>
                <div class="segmented-group segmented-group-pill" id="seg-order" role="group" aria-label="Fill order">
                  <button type="button" class="seg-pill active" data-value="row" title="Left to right, then down">Rows</button>
                  <button type="button" class="seg-pill" data-value="col" title="Top to bottom, then across">Columns</button>
                </div>
              </div>
              <div class="control-item" id="row-binding">
                <span>Binding edge</span>
                <div class="segmented-group segmented-group-pill" id="seg-bind" role="group" aria-label="Binding edge">
                  <button type="button" class="seg-pill active" data-value="left" title="Left-to-right languages">Left</button>
                  <button type="button" class="seg-pill" data-value="right" title="Right-to-left languages and manga">Right (RTL)</button>
                </div>
              </div>
              <div class="control-item" id="row-duplex">
                <span>Duplex flip</span>
                <div class="segmented-group segmented-group-pill" id="seg-duplex" role="group" aria-label="Duplex flip">
                  <button type="button" class="seg-pill active" data-value="short" title="Flip on short edge — most printers">Short edge</button>
                  <button type="button" class="seg-pill" data-value="long">Long edge</button>
                </div>
              </div>
              <div class="control-item" id="row-halve">
                <span>Spread order</span>
                <div class="segmented-group segmented-group-pill" id="seg-halve" role="group" aria-label="Spread order">
                  <button type="button" class="seg-pill active" data-value="lr" title="Left half becomes the first page">Left first</button>
                  <button type="button" class="seg-pill" data-value="rl" title="Right half becomes the first page">Right first</button>
                </div>
              </div>
              <div class="control-item">
                <label for="opt-margin">Sheet margin (mm)</label>
                <input type="range" id="opt-margin" class="range-slider-clean" min="0" max="30" step="1" value="8" data-unit=" mm"><span class="range-val-badge" id="opt-margin-val">8 mm</span>
              </div>
              <div class="control-item">
                <label for="opt-gutter">Gap between pages (mm)</label>
                <input type="range" id="opt-gutter" class="range-slider-clean" min="0" max="30" step="1" value="4" data-unit=" mm"><span class="range-val-badge" id="opt-gutter-val">4 mm</span>
              </div>
              <div class="control-item">
                <input type="checkbox" id="opt-marks">
                <label for="opt-marks">Crop marks</label>
              </div>
              <div class="control-item">
                <input type="checkbox" id="opt-border">
                <label for="opt-border">Thin border around each page</label>
              </div>`,
    guide: [['Drop a PDF', 'The first page previews on the left. Pick <strong>Booklet</strong>, <strong>Pages per sheet</strong> or <strong>Split spreads</strong>.'], ['Set the sheet', 'Choose the sheet size (Auto doubles the source page: A5 pages → A4 sheets), the margin and gap, binding edge and how your printer flips for duplex. Crop marks and page borders are optional.'], ['Impose and print', 'Click <strong>Impose</strong>. Booklets come out in print order — print double-sided, fold in the middle, staple. Page count is padded to a multiple of four with blank pages.']],
    faq: [PRIVACY_FAQ,
      ['How does booklet order work?', 'For an 8-page document the sheets are [8,1] [2,7] on sheet one, [6,3] [4,5] on sheet two — fold the stack and the pages read in order. Documents are padded with blank pages to a multiple of four; the blanks land at the end (before the back cover).'],
      ['Short edge or long edge?', 'Set this to match your printer’s duplex setting. Landscape booklet sheets normally need <em>short edge</em>; if your back sides come out upside down, switch to <em>long edge</em> — the tool rotates the back of every sheet 180°.'],
      ['Does it change the quality?', 'No. Each page is embedded as vector content and scaled mathematically, so text stays sharp and selectable. Split spreads are exact crops of the original page.'],
      ['What is “Split spreads in half” for?', 'Scanned books and magazines often come as one landscape page per two-page spread. This cuts every page down the middle into two portrait pages, in reading order — pick right page first for right-to-left books.'],
      ['Can I do 2-up handouts with page numbers and notes?', 'Use <em>Pages per sheet</em> with 2-up or 4-up and a border; add page numbers afterwards with PDF Page Numberer if you need them on the sheet.'],
      ENCRYPTED_FAQ],
    cardDesc: 'Booklet print order, 2/4/6/9-up sheets, or split scanned spreads — with gutter and crop marks.',
    tags: ['booklet maker', 'pdf booklet', 'imposition', 'n-up', '2 pages per sheet', '4 pages per sheet', 'saddle stitch', 'print booklet', 'split pdf pages in half', 'halve pages', 'two page spread', 'handout', 'zine']
  }
];

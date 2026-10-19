/* Designed by Kapil Pidhwani: media batch 2 (+ Labs Camera). Each entry drives gen_media_pages.js (page), wire_media.py (cards,
 * registry, sitemap, llms) and the tool's own <slug>.js (behaviour). Required: slug, name, icon, desc, lead, cardDesc, tags,
 * section, runtime, action, actionIcon, source { label, drop, html, after }, output { label, icon, empty, html, after },
 * guide[3], faq[4–6]. Optional: cat ('media'|'labs'), split, idle, settings, settingsSummary, css, libs ['jszip'],
 * actionEnabled, copyTitle, downloadTitle. */

/* ── shared pieces ── */
const AUDIO_ACCEPT = 'audio/*, .mp3, .wav, .m4a, .aac, .ogg, .opus, .flac, .weba, .webm';
const AUDIO_DROP = { accept: AUDIO_ACCEPT, title: 'Drop an audio file here or click to browse', sub: 'MP3, WAV, M4A, OGG, FLAC — up to 200 MB' };
const IMAGE_DROP = { accept: 'image/*', title: 'Drop an image here or click to browse', sub: 'JPG, PNG, WebP, GIF, AVIF, BMP — up to 50 MB' };
const AUDIO_SRC = `
                  <div id="source-wrap" class="aud-player" hidden>
                    <canvas id="source-wave" class="aud-wave" aria-label="Source waveform"></canvas>
                    <audio id="source-audio" controls preload="metadata"></audio>
                  </div>`;
const AUDIO_OUT = `
                  <div id="output-wrap" class="aud-player" hidden>
                    <canvas id="output-wave" class="aud-wave" aria-label="Result waveform"></canvas>
                    <audio id="output-audio" controls></audio>
                  </div>`;
const IMG_SRC = (alt = 'Original image') => `
                  <img id="source-img" alt="${alt}" class="media-preview-img" width="360" height="240">`;
const IMG_OUT = (alt = 'Result image') => `
                  <img id="output-img" alt="${alt}" class="media-preview-img" width="360" height="240">`;
const ctl = (inner) => `
              <div class="control-item">${inner}
              </div>`;
const select = (id, label, opts) => ctl(`
                <label for="${id}">${label}</label>
                <select id="${id}" class="select-clean">${opts.map(([v, t, sel]) => `
                  <option value="${v}"${sel ? ' selected' : ''}>${t}</option>`).join('')}
                </select>`);
const range = (id, label, min, max, step, value, badge) => ctl(`
                <label for="${id}">${label}</label>
                <input type="range" id="${id}" class="range-slider-clean" min="${min}" max="${max}" step="${step}" value="${value}">
                <span class="range-val-badge" id="${id}-val">${badge}</span>`);
const check = (id, label, on) => ctl(`
                <input type="checkbox" id="${id}"${on ? ' checked' : ''}>
                <label for="${id}">${label}</label>`);
const color = (id, label, value) => ctl(`
                <label for="${id}">${label}</label>
                <input type="color" id="${id}" value="${value}">`);
const OUT_FMT = select('opt-out', 'Output format', [['mp3-128', 'MP3 · 128 kbps'], ['mp3-192', 'MP3 · 192 kbps', 1], ['mp3-320', 'MP3 · 320 kbps'], ['wav', 'WAV · lossless']]);
const IMG_FMT = select('opt-format', 'Output format', [['auto', 'Same as original', 1], ['image/png', 'PNG'], ['image/jpeg', 'JPG'], ['image/webp', 'WebP']]) + range('opt-quality', 'Quality (JPG / WebP)', 40, 100, 1, 92, '92');
const PRIV_AUDIO = ['Is my audio uploaded anywhere?', 'No. The file is decoded by your browser\'s Web Audio engine, processed on your device and encoded in the page. Nothing is sent to a server.'];
const PRIV_IMAGE = ['Is my image uploaded anywhere?', 'No. The image is decoded and processed on a canvas in your browser tab. Nothing is sent to a server, and nothing is kept after you close the page.'];
const FMT_FAQ = ['Which formats can I open and save?', 'Open anything your browser plays: MP3, WAV, M4A/AAC, OGG, Opus, FLAC and WebM audio. Save as MP3 (128, 192 or 320 kbps) or lossless 16-bit WAV — pick under Settings.'];

module.exports = [
  /* ═══════════ IMAGE ═══════════ */
  {
    slug: 'image-resizer', name: 'Image Resizer', icon: 'lucide:scaling', section: 'Image Tools', runtime: 'image', css: true,
    desc: 'Free online image resizer: change the width and height of JPG, PNG and WebP images in pixels or percent, keep the aspect ratio, use social presets and download — all in your browser, no upload.',
    lead: 'Resize any photo to exact pixels or a percentage, with the aspect ratio locked and a high-quality downscale — privately in your browser.',
    cardDesc: 'Resize JPG, PNG or WebP to exact pixels, a percentage or a social preset.',
    tags: ['image', 'resize', 'resizer', 'scale', 'dimensions', 'pixels', 'photo', 'shrink', 'enlarge', 'width', 'height', 'jpg', 'png', 'webp', 'instagram'],
    action: 'Resize image', actionIcon: 'lucide:scaling',
    source: { drop: IMAGE_DROP, html: IMG_SRC(), after: `
                <div class="img-size-row" id="size-row" hidden>
                  <label class="img-size-field" for="opt-w"><span>Width</span><input type="number" id="opt-w" class="input-clean" min="1" max="16384" step="1" inputmode="numeric" placeholder="px"></label>
                  <button type="button" class="btn-toolbar-sm img-lock is-locked" id="btn-lock" aria-pressed="true" title="Keep aspect ratio" aria-label="Keep aspect ratio"><iconify-icon icon="lucide:link" width="14" height="14"></iconify-icon></button>
                  <label class="img-size-field" for="opt-h"><span>Height</span><input type="number" id="opt-h" class="input-clean" min="1" max="16384" step="1" inputmode="numeric" placeholder="px"></label>
                  <label class="img-size-field" for="opt-pct"><span>%</span><input type="number" id="opt-pct" class="input-clean" min="1" max="800" step="1" inputmode="numeric" placeholder="100"></label>
                </div>` },
    output: { label: 'Resized', icon: 'lucide:scaling', empty: 'The resized image appears here', html: IMG_OUT() },
    settingsSummary: 'Same format',
    settings: select('opt-preset', 'Preset', [['', 'Custom', 1], ['1080x1080', 'Instagram post · 1080 × 1080'], ['1080x1350', 'Instagram portrait · 1080 × 1350'], ['1080x1920', 'Story / Reel · 1080 × 1920'], ['1200x630', 'Open Graph / Facebook · 1200 × 630'], ['1500x500', 'X / Twitter header · 1500 × 500'], ['1280x720', 'HD 720p · 1280 × 720'], ['1920x1080', 'Full HD · 1920 × 1080'], ['3840x2160', '4K · 3840 × 2160']])
      + select('opt-fit', 'When the shape differs', [['stretch', 'Stretch to fit', 1], ['cover', 'Crop to fill (cover)'], ['contain', 'Fit inside (pad)']]) + IMG_FMT,
    guide: [['Drop an image', 'Drag a JPG, PNG, WebP, GIF or AVIF onto the left pane. Its size appears under the preview.'], ['Type the new size', 'Enter a width, height or percentage — the other side follows while the link is on. Presets and format live in Settings.'], ['Resize and download', 'Click <strong>Resize image</strong>, check the result on the right and download it.']],
    faq: [PRIV_IMAGE, ['Does shrinking lose quality?', 'Large reductions are done in halving steps with high-quality smoothing, which avoids the jagged, shimmering edges of a single big downscale. Enlarging cannot add detail — it only interpolates.'], ['What happens when the preset has a different shape?', 'Pick under Settings: <em>Stretch</em> distorts to the exact size, <em>Crop to fill</em> trims the edges to keep proportions, <em>Fit inside</em> keeps everything and pads with transparency (white for JPG).'], ['Is the photo rotated correctly?', 'Yes — phone photos are turned upright using their EXIF orientation before resizing. EXIF metadata is not copied to the new file.'], ['What is the maximum size?', 'Up to 16,384 px per side and 50 MB per file. Very large canvases may fail on phones with little memory.']]
  },
  {
    slug: 'image-cropper', name: 'Image Cropper', icon: 'lucide:crop', section: 'Image Tools', runtime: 'image',
    desc: 'Free online image cropper: drag a crop box over a JPG, PNG or WebP, lock an aspect ratio (1:1, 16:9, 4:5…), rotate or flip, and download the cropped image — processed in your browser, no upload.',
    lead: 'Drag a box, lock a ratio, rotate or flip — then download exactly the part of the photo you want, privately in your browser.',
    cardDesc: 'Crop to any box or ratio, rotate and flip — exact pixel control.',
    tags: ['image', 'crop', 'cropper', 'cut', 'trim', 'aspect ratio', 'square', 'photo', 'rotate', 'flip', 'instagram', 'profile picture'],
    action: 'Crop image', actionIcon: 'lucide:crop',
    source: { drop: IMAGE_DROP, html: `
                  <canvas id="stage" class="media-preview-canvas gif-stage" width="360" height="240" aria-label="Image to crop"></canvas>
                  <div id="crop-box" class="vcr-box" hidden aria-hidden="true"><span class="vcr-handle"></span></div>` },
    output: { label: 'Cropped', icon: 'lucide:crop', empty: 'The cropped image appears here', html: IMG_OUT('Cropped image') },
    settingsSummary: 'Free',
    settings: select('opt-aspect', 'Aspect ratio', [['free', 'Free', 1], ['1:1', 'Square 1:1'], ['16:9', 'Landscape 16:9'], ['9:16', 'Portrait 9:16'], ['4:3', 'Classic 4:3'], ['3:4', 'Portrait 3:4'], ['4:5', 'Instagram 4:5'], ['3:2', 'Photo 3:2']])
      + ctl(`
                <label for="crop-x">Crop (px)</label>
                <div class="vcr-nums">
                  <input type="number" id="crop-x" class="input-clean" min="0" step="1" aria-label="Crop X" placeholder="X">
                  <input type="number" id="crop-y" class="input-clean" min="0" step="1" aria-label="Crop Y" placeholder="Y">
                  <input type="number" id="crop-w" class="input-clean" min="1" step="1" aria-label="Crop width" placeholder="W">
                  <input type="number" id="crop-h" class="input-clean" min="1" step="1" aria-label="Crop height" placeholder="H">
                </div>`)
      + select('opt-rot', 'Rotate', [['0', 'None', 1], ['90', '90° clockwise'], ['180', '180°'], ['270', '90° anticlockwise']])
      + select('opt-flip', 'Flip', [['none', 'None', 1], ['h', 'Mirror horizontally'], ['v', 'Flip vertically'], ['hv', 'Both']]) + IMG_FMT,
    guide: [['Drop an image', 'Drag a photo onto the left pane. A crop box appears over it.'], ['Drag the box', 'Move it, pull the corner handle to resize, or open Settings for a fixed ratio, exact pixels, rotation and flip.'], ['Crop and download', 'Click <strong>Crop image</strong>. The result appears on the right at full resolution.']],
    faq: [PRIV_IMAGE, ['Is the crop done at full resolution?', 'Yes. The box is drawn on a scaled preview but the crop is taken from the original pixels, so a 4000 px photo stays sharp.'], ['How do I make a perfect square or Instagram crop?', 'Open Settings and pick <em>Square 1:1</em> or <em>Instagram 4:5</em>. The box keeps that shape while you drag and resize.'], ['Can I rotate or mirror as well?', 'Yes — rotation and flip are applied after cropping, so the box always matches what you see on the left.'], ['Does it keep transparency?', 'PNG and WebP keep transparent areas. JPG has no transparency, so they are filled with white.']]
  },
  {
    slug: 'image-to-base64', name: 'Image to Base64', icon: 'lucide:binary', section: 'Image Tools', runtime: 'image', css: true,
    desc: 'Free online image to Base64 converter: turn a JPG, PNG, WebP, SVG or GIF into a data URI, raw Base64, CSS background or HTML img tag — or paste Base64 to get the image back. In your browser, no upload.',
    lead: 'Turn any image into a data URI, CSS or HTML snippet — or paste Base64 to get the picture back. Nothing leaves your browser.',
    cardDesc: 'Image → data URI, CSS or <img> snippet, and Base64 → image.',
    tags: ['base64', 'data uri', 'data url', 'image to base64', 'encode', 'decode', 'base64 to image', 'css', 'html', 'embed', 'inline image', 'svg'],
    action: 'Convert', actionIcon: 'lucide:binary', idle: 'Drop an image or paste Base64',
    source: { drop: { accept: 'image/*', title: 'Drop an image here or click to browse', sub: 'JPG, PNG, WebP, SVG, GIF, ICO — up to 50 MB' }, html: IMG_SRC(), after: `
                <div class="form-group b64-paste">
                  <label class="form-label" for="b64-input"><span>Or paste Base64 / a data URI to decode</span></label>
                  <textarea id="b64-input" class="textarea-clean" rows="3" placeholder="data:image/png;base64,iVBORw0KGgo…" spellcheck="false" autocomplete="off"></textarea>
                </div>` },
    output: { label: 'Base64', icon: 'lucide:binary', empty: 'The Base64 string appears here', html: `
                  <textarea id="output-text" class="pane-output-fill b64-out" readonly hidden aria-label="Base64 output"></textarea>
                  <img id="output-img" alt="Decoded image" class="media-preview-img" width="360" height="240">` },
    settingsSummary: 'Data URI',
    settings: select('opt-as', 'Output as', [['uri', 'Data URI (data:image/…;base64,…)', 1], ['raw', 'Raw Base64 only'], ['css', 'CSS background-image'], ['html', 'HTML &lt;img&gt; tag'], ['md', 'Markdown image']]),
    copyTitle: 'Copy the Base64 text', downloadTitle: 'Download as .txt (or the decoded image)',
    guide: [['Drop an image', 'Drag any image onto the left pane — or paste a Base64 string or data URI into the box below it to decode.'], ['Pick the snippet', 'Settings switches between a data URI, raw Base64, a CSS rule, an HTML tag or Markdown.'], ['Copy or download', 'The text updates instantly. Copy it, download it as a .txt, or download the decoded image.']],
    faq: [PRIV_IMAGE, ['Is the original file encoded byte-for-byte?', 'Yes. The file\'s exact bytes are encoded — no re-compression — so decoding the string gives back the identical file.'], ['Why is the Base64 bigger than the file?', 'Base64 stores 3 bytes in 4 text characters, so it is always about 33% larger. Inline only small images (icons, logos under ~10 KB); link larger ones.'], ['Can I decode Base64 back to an image?', 'Yes — paste a data URI or raw Base64 into the box under the dropzone. Raw strings are recognised by their PNG, JPG, GIF, WebP or SVG signature.'], ['Does it work with SVG?', 'Yes. SVG is encoded like any other file and the data URI uses the <code>image/svg+xml</code> type.']]
  },
  {
    slug: 'image-negative-inverter', name: 'Image Negative Inverter', icon: 'lucide:contrast', section: 'Image Tools', runtime: 'image',
    desc: 'Free online image negative inverter: invert the colours of a JPG, PNG or WebP into a photo negative, with strength, grayscale and per-channel options. Instant preview, all in your browser — no upload.',
    lead: 'Flip every colour to its opposite for a photo negative — or scan a film negative back to positive. Instant and private.',
    cardDesc: 'Invert colours to a photo negative — strength, grayscale and channels.',
    tags: ['invert', 'negative', 'inverter', 'invert colors', 'colour', 'photo negative', 'film negative', 'image', 'filter', 'grayscale', 'opposite colors'],
    action: 'Invert image', actionIcon: 'lucide:contrast',
    source: { drop: IMAGE_DROP, html: IMG_SRC() },
    output: { label: 'Inverted', icon: 'lucide:contrast', empty: 'The inverted image appears here', html: IMG_OUT('Inverted image') },
    settingsSummary: '100% · RGB',
    settings: range('opt-strength', 'Strength', 0, 100, 1, 100, '100%')
      + select('opt-channels', 'Channels', [['rgb', 'All colours (RGB)', 1], ['r', 'Red only'], ['g', 'Green only'], ['b', 'Blue only']])
      + check('opt-gray', 'Grayscale first (black-and-white negative)') + check('opt-alpha', 'Invert transparency too') + IMG_FMT,
    guide: [['Drop an image', 'Drag a photo onto the left pane. The negative appears on the right straight away.'], ['Fine-tune', 'Settings adjusts strength (50% gives flat grey), single channels, grayscale and transparency.'], ['Download', 'The preview updates as you change settings. Download or copy the result.']],
    faq: [PRIV_IMAGE, ['How does inverting work?', 'Every channel value v becomes 255 − v: black turns white, red turns cyan, blue turns yellow. Strength blends between the original and the full negative.'], ['Can I turn a scanned film negative into a positive?', 'Inverting gives a usable preview of B&amp;W negatives. Colour film has an orange mask, so colours will look blue-tinted — correct them in a photo editor afterwards.'], ['Is transparency inverted?', 'Not by default: transparent areas stay transparent. Tick <em>Invert transparency too</em> for masks and cut-outs.'], ['Does it reduce quality?', 'Inversion is lossless on the pixels. Saving as JPG adds normal JPG compression; choose PNG to keep it perfect.']]
  },
  /* ═══════════ VIDEO / GIF ═══════════ */
  {
    slug: 'video-muter', name: 'Video Muter', icon: 'lucide:volume-x', section: 'Video Tools', runtime: 'video',
    desc: 'Free online video muter: remove the sound from an MP4, MOV or WebM video. MP4 and MOV are muted losslessly in seconds with no re-encoding; other files are re-encoded silently. All in your browser — no upload.',
    lead: 'Strip the audio track from any video. MP4 and MOV are muted instantly and losslessly — the picture is untouched.',
    cardDesc: 'Remove the sound from MP4, MOV or WebM — lossless for MP4/MOV.',
    tags: ['video', 'mute', 'muter', 'remove audio', 'remove sound', 'silent video', 'no sound', 'strip audio', 'mp4', 'mov', 'webm', 'lossless'],
    action: 'Mute video', actionIcon: 'lucide:volume-x',
    source: { label: 'Original', drop: { accept: 'video/mp4, video/quicktime, video/webm, video/*', title: 'Drop a video here or click to browse', sub: 'MP4, MOV or WebM — up to 500 MB' }, html: `
                  <video id="source-video" class="source-video-player" controls playsinline preload="metadata"></video>` },
    output: { label: 'Muted', icon: 'lucide:volume-x', empty: 'The silent video appears here', html: `
                  <video id="output-video" class="video-converted-preview" controls playsinline muted></video>` },
    guide: [['Drop a video', 'Drag an MP4, MOV or WebM onto the left pane.'], ['Mute it', 'Click <strong>Mute video</strong>. MP4 and MOV finish in a second or two; other formats are re-encoded in real time.'], ['Download', 'Play the silent result on the right, then download it.']],
    faq: [['Is my video uploaded anywhere?', 'No. The file is read and rewritten inside your browser tab. Nothing is sent to a server.'], ['What does "lossless" mean here?', 'For MP4, MOV and M4V the audio track is removed from the file\'s index and its samples are blanked. The video stream is copied byte-for-byte — no re-encoding, no quality loss, no waiting.'], ['Why is a WebM slower?', 'WebM files are re-recorded without sound using the browser\'s encoder, which runs in real time (a 2-minute clip takes about 2 minutes) and re-compresses the picture slightly.'], ['Why is the muted MP4 almost the same size?', 'To stay lossless the file layout is kept and the audio bytes are overwritten with silence rather than cut out. If you need a smaller file, run it through the Video Compressor afterwards.'], ['Can I keep part of the sound?', 'Not here — this tool removes all audio. Use the Video Trimmer to cut a section, or Video to Audio to keep only the sound.']]
  },
  {
    slug: 'gif-rotator', name: 'GIF Rotator', icon: 'lucide:rotate-cw', section: 'GIF Tools', runtime: 'gif',
    desc: 'Free online GIF rotator: rotate an animated GIF 90°, 180° or 270° and mirror or flip it, keeping every frame and its timing. Processed entirely in your browser — no upload.',
    lead: 'Turn a sideways GIF upright or mirror it — every frame and its timing is kept, privately in your browser.',
    cardDesc: 'Rotate 90/180/270° or mirror an animated GIF, timing kept.',
    tags: ['gif', 'rotate', 'rotator', 'flip', 'mirror', 'turn', 'sideways', 'upside down', '90 degrees', 'animated gif', 'orientation'],
    action: 'Rotate GIF', actionIcon: 'lucide:rotate-cw',
    source: { label: 'Original', drop: { accept: 'image/gif', title: 'Drop a GIF here or click to browse', sub: 'Animated GIF — up to 50 MB' }, html: `
                  <img id="source-img" alt="Original GIF" class="media-preview-img" width="360" height="240">` },
    output: { label: 'Rotated', icon: 'lucide:rotate-cw', empty: 'The rotated GIF appears here', html: `
                  <img id="output-img" alt="Rotated GIF" class="media-preview-img" width="360" height="240">` },
    settingsSummary: '90° clockwise',
    settings: select('opt-rot', 'Rotate', [['0', 'None'], ['90', '90° clockwise', 1], ['180', '180°'], ['270', '90° anticlockwise']])
      + select('opt-flip', 'Flip', [['none', 'None', 1], ['h', 'Mirror horizontally'], ['v', 'Flip vertically'], ['hv', 'Both']]),
    guide: [['Drop a GIF', 'Drag an animated GIF onto the left pane. It plays as a preview.'], ['Choose the turn', 'Open Settings to pick 90°, 180° or 270° and an optional mirror or flip.'], ['Rotate and download', 'Click <strong>Rotate GIF</strong>. Every frame is turned and re-encoded with its original delay.']],
    faq: [['Is my GIF uploaded anywhere?', 'No. Frames are decoded, rotated on a canvas and re-encoded in your browser. Nothing is sent to a server.'], ['Is the animation speed kept?', 'Yes — each frame keeps its own delay, so the timing is identical to the original.'], ['Does rotating lose quality?', 'Rotations by 90° steps are pixel-exact. The GIF is re-encoded with a fresh colour palette, which can shift colours very slightly on gradients.'], ['What is the difference between mirror and flip?', '<em>Mirror</em> swaps left and right (like a selfie camera). <em>Flip</em> swaps top and bottom. 180° rotation equals both together.']]
  },
  {
    slug: 'sprite-sheet-studio', name: 'Sprite Sheet Studio', icon: 'lucide:grid-3x3', section: 'GIF Tools', runtime: 'gif', libs: ['jszip'], css: true, split: '50/50',
    desc: 'Free online sprite sheet studio: turn a sprite sheet into an animated GIF or APNG (auto grid detection, frame order, FPS, pixel-perfect scaling, ping-pong), or pack a GIF / APNG / WebP animation into a sprite sheet with JSON metadata and CSS keyframes. Runs in your browser — no upload.',
    lead: 'Sprite sheet → GIF / APNG with auto grid detection and crisp pixel scaling, or animation → sprite sheet with JSON metadata and a CSS steps() snippet — all on your device.',
    cardDesc: 'Sprite sheet ⇄ GIF / APNG — auto grid, pixel scaling, JSON + CSS export.',
    tags: ['sprite sheet', 'spritesheet', 'sprite to gif', 'gif to sprite sheet', 'apng', 'pixel art', 'game dev', 'texture atlas', 'frames', 'animation', 'css sprite animation', 'steps()', 'phaser', 'godot', 'unity'],
    action: 'Build', actionIcon: 'lucide:grid-3x3', idle: 'Drop a sprite sheet or an animation',
    source: { label: 'Source', drop: { accept: 'image/*', title: 'Drop a sprite sheet (PNG/JPG/WebP) or an animation (GIF/APNG/WebP)', sub: 'Up to 50 MB — static image = sheet, animated file = frames' }, html: `
                  <canvas id="stage" class="media-preview-canvas gif-stage" width="360" height="240" aria-label="Sprite sheet with grid overlay"></canvas>
                  <canvas id="scrub-canvas" class="media-preview-canvas gif-stage" width="360" height="240" aria-label="Animation frame"></canvas>`, after: `
                <div class="ss-grid-row" id="ss-grid-row" hidden>
                  <label class="ss-num" for="grid-cols">Columns<input type="number" id="grid-cols" class="input-clean" min="1" max="64" value="1" inputmode="numeric"></label>
                  <span class="ss-x" aria-hidden="true">×</span>
                  <label class="ss-num" for="grid-rows">Rows<input type="number" id="grid-rows" class="input-clean" min="1" max="64" value="1" inputmode="numeric"></label>
                  <button type="button" class="btn-toolbar-sm" id="btn-auto-grid" title="Detect the grid from transparent or solid gutters"><iconify-icon icon="lucide:scan-search" width="14" height="14"></iconify-icon><span>Auto</span></button>
                  <span class="web-muted" id="ss-cell-info"></span>
                </div>
                <p class="web-muted ss-tip" id="ss-tip" hidden>Click a cell to skip it.</p>
                <div class="vdt-range" id="rng-wrap" hidden>
                  <div class="vdt-range-row"><label for="rng-start">First</label><input type="range" id="rng-start" class="range-slider-clean" min="0" max="0" step="1" value="0" aria-label="First frame"><span class="range-val-badge" id="rng-start-val">#1</span><span></span></div>
                  <div class="vdt-range-row"><label for="rng-end">Last</label><input type="range" id="rng-end" class="range-slider-clean" min="0" max="0" step="1" value="0" aria-label="Last frame"><span class="range-val-badge" id="rng-end-val">#1</span><span id="rng-len" class="web-muted"></span></div>
                </div>` },
    output: { label: 'Result', icon: 'lucide:grid-3x3', empty: 'The animation or sprite sheet appears here', html: `
                  <canvas id="preview" class="media-preview-canvas ss-preview" width="360" height="240" aria-label="Live animation preview"></canvas>
                  <img id="output-img" alt="Result" class="media-preview-img" width="360" height="240">`, after: `
                  <div class="web-tags ss-extras" id="ss-extras" hidden>
                    <button type="button" class="web-tag" data-x="json" title="Download frame metadata as JSON"><iconify-icon icon="lucide:braces" width="12" height="12"></iconify-icon> metadata.json</button>
                    <button type="button" class="web-tag" data-x="css" title="Download a CSS steps() animation"><iconify-icon icon="lucide:code" width="12" height="12"></iconify-icon> sprite.css</button>
                  </div>` },
    settingsSummary: 'Auto · 12 fps · GIF',
    settings: `
              <div class="control-item ss-mode" data-mode="anim">
                <label for="opt-out">Output</label>
                <select id="opt-out" class="select-clean"><option value="gif" selected>Animated GIF</option><option value="apng">APNG (lossless, keeps alpha)</option><option value="zip">Frames as PNG (ZIP)</option></select>
              </div>` + range('opt-fps', 'Speed', 1, 60, 1, 12, '12 fps').replace('class="control-item"', 'class="control-item ss-mode" data-mode="anim"')
      + select('opt-order', 'Frame order', [['row', 'Row by row (left → right, top → bottom)', 1], ['col', 'Column by column'], ['row-rev', 'Row by row, reversed']]).replace('class="control-item"', 'class="control-item ss-mode" data-mode="anim"')
      + select('opt-loop', 'Loop', [['0', 'Forever', 1], ['1', 'Play once'], ['3', '3 times']]).replace('class="control-item"', 'class="control-item ss-mode" data-mode="anim"')
      + check('opt-pingpong', 'Ping-pong (play forwards then backwards)', false).replace('class="control-item"', 'class="control-item ss-mode" data-mode="anim"')
      + check('opt-skip-empty', 'Skip empty cells automatically', true).replace('class="control-item"', 'class="control-item ss-mode" data-mode="anim"')
      + `
              <div class="control-item ss-mode" data-mode="anim">
                <label for="opt-margin">Sheet margin / spacing (px)</label>
                <div class="ss-pair"><input type="number" id="opt-margin" class="input-clean" min="0" max="512" value="0" inputmode="numeric" aria-label="Margin"><input type="number" id="opt-spacing" class="input-clean" min="0" max="512" value="0" inputmode="numeric" aria-label="Spacing"></div>
              </div>`
      + select('opt-layout', 'Sheet layout', [['square', 'Auto (near-square)', 1], ['cols', 'Fixed columns'], ['row', 'Single row (strip)'], ['col', 'Single column']]).replace('class="control-item"', 'class="control-item ss-mode" data-mode="sheet"')
      + `
              <div class="control-item ss-mode" data-mode="sheet">
                <label for="opt-cols">Columns (fixed layout)</label>
                <input type="number" id="opt-cols" class="input-clean" min="1" max="64" value="8" inputmode="numeric">
              </div>
              <div class="control-item ss-mode" data-mode="sheet">
                <label for="opt-pad">Sheet padding / spacing (px)</label>
                <div class="ss-pair"><input type="number" id="opt-pad" class="input-clean" min="0" max="512" value="0" inputmode="numeric" aria-label="Padding"><input type="number" id="opt-sp" class="input-clean" min="0" max="512" value="0" inputmode="numeric" aria-label="Spacing"></div>
              </div>`
      + select('opt-every', 'Keep every', [['1', 'frame', 1], ['2', '2nd frame'], ['3', '3rd frame'], ['4', '4th frame']]).replace('class="control-item"', 'class="control-item ss-mode" data-mode="sheet"')
      + select('opt-bg', 'Sheet background', [['transparent', 'Transparent', 1], ['#ffffff', 'White'], ['#000000', 'Black'], ['#ff00ff', 'Magenta key']]).replace('class="control-item"', 'class="control-item ss-mode" data-mode="sheet"')
      + select('opt-scale', 'Scale (nearest-neighbour)', [['1', '1×', 1], ['2', '2×'], ['3', '3×'], ['4', '4×'], ['0.5', '½×']]),
    guide: [['Drop a sheet or an animation', 'A static PNG / JPG / WebP is treated as a sprite sheet; an animated GIF, APNG or WebP is split into frames. For a sheet, press <strong>Auto</strong> to detect the grid from the gutters, or type columns × rows — the overlay shows exactly which cells will be used. Click a cell to skip it.'], ['Tune the animation or layout', 'Sheet → animation: set the speed, frame order, loop, ping-pong and scale (nearest-neighbour keeps pixel art crisp) and watch the live preview. Animation → sheet: choose a near-square grid, a fixed column count or a single strip, padding, spacing and background.'], ['Build and export', 'Press <strong>Build</strong>. Animations download as GIF, APNG (lossless with alpha) or a ZIP of PNG frames. Sheets download as PNG, with one-click <code>metadata.json</code> (frame rectangles and delays for Phaser, Godot, Unity, PixiJS) and <code>sprite.css</code> (a <code>steps()</code> keyframe animation).']],
    faq: [['How does Auto grid detection work?', 'It looks for fully transparent (or solid background-coloured) columns and rows that separate the sprites and counts the content runs between them. Uniform sheets with gutters are detected exactly; tightly packed sheets fall back to a square-cell guess, which you can correct by typing columns × rows. Irregular texture atlases with mixed sizes are not supported — use their JSON instead.'], ['GIF or APNG?', 'GIF is universal but limited to 256 colours and 1-bit transparency, so soft edges get jagged. APNG keeps full 24-bit colour and 8-bit alpha, loses nothing, and plays in every modern browser, Discord, Slack and iMessage — the better choice for pixel art and UI stickers. Choose GIF only where APNG is not accepted (some chat apps, older email clients).'], ['Why do my pixels look blurry / crisp?', 'Scaling uses nearest-neighbour sampling, so 2× / 3× / 4× keeps pixel art razor sharp. ½× halves the size and will soften detail — it is meant for photo-style frames, not pixel art.'], ['What is in metadata.json and sprite.css?', 'The JSON lists the sheet size, frame size, columns, rows, padding and every frame’s x, y, width, height and delay in milliseconds — enough to import into Phaser, PixiJS, Godot or Unity, or to write your own loader. The CSS animates a <code>div</code> with <code>background-position</code> in <code>steps()</code>, with keyframe percentages that follow the original per-frame delays.'], ['Is there a size limit?', 'Files up to 50 MB. Sheets wider or taller than 8,192 px are flagged — many GPUs and engines refuse textures above that; switch to more rows, a smaller scale or “keep every 2nd frame”.'], ['Is anything uploaded?', 'No. Decoding, slicing, scaling and encoding all run in your browser; the ZIP library and GIF encoder are static scripts. Your sprites never leave your device.']]
  },
  /* ═══════════ AUDIO ═══════════ */
  {
    slug: 'audio-normalizer', name: 'Audio Normalizer (LUFS)', icon: 'lucide:gauge', section: 'Audio Tools', runtime: 'audio',
    desc: 'Free online LUFS audio normalizer: measure integrated loudness (ITU-R BS.1770 / EBU R128) and normalize MP3, WAV or M4A to −14 LUFS for Spotify and YouTube, −16 for podcasts or −23 for broadcast, with a true-peak ceiling. In your browser — no upload.',
    lead: 'Measure loudness the way Spotify, YouTube and broadcasters do, then hit your target LUFS with a safe true-peak ceiling — privately in your browser.',
    cardDesc: 'Measure LUFS and normalize to −14, −16 or −23 with a true-peak ceiling.',
    tags: ['lufs', 'normalize', 'normalizer', 'loudness', 'ebu r128', 'bs.1770', 'spotify', 'youtube', 'podcast', 'true peak', 'volume', 'mastering', 'gain'],
    action: 'Normalize', actionIcon: 'lucide:gauge',
    source: { drop: AUDIO_DROP, html: AUDIO_SRC },
    output: { label: 'Normalized', icon: 'lucide:gauge', empty: 'The normalized audio appears here', html: AUDIO_OUT },
    settingsSummary: '−14 LUFS · −1 dBTP · MP3 · 192 kbps',
    settings: select('opt-target', 'Target loudness', [['-9', '−9 LUFS · loud / club'], ['-11', '−11 LUFS · loud streaming'], ['-14', '−14 LUFS · Spotify, YouTube, Tidal', 1], ['-16', '−16 LUFS · Apple Music, podcasts'], ['-18', '−18 LUFS · audiobooks (ACX range)'], ['-23', '−23 LUFS · EBU R128 broadcast'], ['-24', '−24 LUFS · ATSC A/85 (US TV)']])
      + select('opt-ceiling', 'True-peak ceiling', [['-1', '−1 dBTP (recommended)', 1], ['-2', '−2 dBTP (safer for MP3/AAC)'], ['-0.1', '−0.1 dBTP'], ['off', 'Off — allow clipping']]) + OUT_FMT,
    guide: [['Drop an audio file', 'Drag a song, podcast or voice-over onto the left pane. Its integrated loudness is measured straight away.'], ['Pick a target', 'Open Settings to choose a platform target (−14 LUFS is the streaming standard) and a true-peak ceiling.'], ['Normalize and download', 'Click <strong>Normalize</strong>. The badge shows measured → final LUFS; play and download the result.']],
    faq: [PRIV_AUDIO, ['What is LUFS?', 'Loudness Units relative to Full Scale — a measure of how loud audio <em>sounds</em>, not just its peak. It follows ITU-R BS.1770: K-weighting, 400 ms blocks, and gating that ignores silence and quiet passages.'], ['Which target should I use?', '−14 LUFS for Spotify, YouTube, Tidal and Amazon; −16 for Apple Music and most podcasts; −23 for EBU broadcast. Streaming platforms turn louder tracks down anyway, so −14 is a safe default.'], ['What does the true-peak ceiling do?', 'Raising loudness can push peaks above 0 dB, which clips after MP3/AAC encoding. The tool measures inter-sample (4× oversampled) peaks and, if needed, uses less gain so the ceiling is never crossed — the badge then shows the loudest level that fit.'], ['Why is my quiet recording below the target?', 'This is pure gain with no compression or limiting, so dynamics are kept. When a peak would cross the ceiling, the target cannot be reached without a limiter — set the ceiling to Off only if you accept clipping.'], ['Are mono files measured correctly?', 'Yes — per BS.1770 a mono channel is weighted 1.0, so a mono file reads about 3 LU quieter than the same audio as dual-mono stereo, matching broadcast meters.']]
  },
  {
    slug: 'audio-equalizer', name: 'Audio Equalizer', icon: 'lucide:sliders-vertical', section: 'Audio Tools', runtime: 'audio', css: true,
    desc: 'Free online audio equalizer: boost bass, clear up vocals or tame harsh treble with a 10-band graphic EQ and presets. Hear changes live, then download as MP3 or WAV — processed in your browser, no upload.',
    lead: 'Shape any track with a 10-band EQ and presets, hear every change live, then download the result — all in your browser.',
    cardDesc: '10-band graphic EQ with presets and live preview — boost bass or vocals.',
    tags: ['equalizer', 'eq', 'bass boost', 'treble', 'vocals', 'frequency', 'audio', 'graphic eq', '10 band', 'tone', 'mp3', 'sound'],
    action: 'Apply EQ', actionIcon: 'lucide:sliders-vertical',
    source: { drop: AUDIO_DROP, html: AUDIO_SRC },
    output: { label: 'Equalized', icon: 'lucide:sliders-vertical', empty: 'The equalized audio appears here', html: AUDIO_OUT },
    settingsSummary: 'Flat · MP3 · 192 kbps',
    settings: select('opt-preset', 'Preset', [['flat', 'Flat', 1], ['bass', 'Bass boost'], ['bassx', 'Bass reducer'], ['treble', 'Treble boost'], ['vocal', 'Vocal clarity'], ['podcast', 'Podcast / voice'], ['loud', 'Loudness (smile)'], ['lofi', 'Lo-fi / telephone'], ['custom', 'Custom']]) + `
              <div class="control-item eq-bank" role="group" aria-label="10-band equalizer">${[31, 62, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'].map((f, i) => `
                <label class="eq-band" for="eq-${i}"><input type="range" id="eq-${i}" class="eq-slider" min="-12" max="12" step="0.5" value="0" aria-label="${f} Hz gain"><span id="eq-${i}-val">0</span><small>${f}</small></label>`).join('')}
              </div>` + check('opt-safe', 'Prevent clipping (auto-lower the level if boosts overload)', true) + OUT_FMT,
    guide: [['Drop an audio file', 'Drag a song or recording onto the left pane and press play.'], ['Shape the sound', 'Open Settings, pick a preset or drag the 10 sliders. Changes are heard live in the player.'], ['Apply and download', 'Click <strong>Apply EQ</strong> to render the full file with your curve, then download it.']],
    faq: [PRIV_AUDIO, ['Can I hear the EQ before applying it?', 'Yes. The source player runs through the same filters in real time, so every slider move is heard instantly — exactly what will be rendered.'], ['What do the bands do?', '31–125 Hz is sub-bass and kick, 250–500 Hz warmth (and mud), 1–4 kHz presence and vocals, 8–16 kHz air and sparkle. Each slider is a peaking filter of ±12 dB.'], ['Why does my boosted track sound quieter?', 'Boosting can push peaks over 0 dB. With <em>Prevent clipping</em> on, the whole track is lowered just enough to avoid distortion. Cutting the frequencies you don\'t want often works better than boosting.'], FMT_FAQ]
  },
  {
    slug: 'audio-pitch-shifter', name: 'Audio Pitch Shifter', icon: 'lucide:music-2', section: 'Audio Tools', runtime: 'audio',
    desc: 'Free online audio pitch shifter: raise or lower the pitch of a song or voice by up to 12 semitones without changing its speed. Change the key, fix tuning in cents, then download as MP3 or WAV — in your browser, no upload.',
    lead: 'Change the key of a song or the pitch of a voice by semitones and cents — the tempo stays the same. Private, in your browser.',
    cardDesc: 'Shift pitch ±12 semitones and fine-tune in cents — speed unchanged.',
    tags: ['pitch', 'pitch shifter', 'key change', 'transpose', 'semitone', 'cents', 'tuning', 'karaoke', 'voice', 'chipmunk', 'deep voice', 'audio'],
    action: 'Shift pitch', actionIcon: 'lucide:music-2',
    source: { drop: AUDIO_DROP, html: AUDIO_SRC },
    output: { label: 'Shifted', icon: 'lucide:music-2', empty: 'The pitch-shifted audio appears here', html: AUDIO_OUT },
    settingsSummary: '+2 semitones · MP3 · 192 kbps',
    settings: range('opt-semi', 'Semitones', -12, 12, 1, 2, '+2') + range('opt-cents', 'Fine-tune (cents)', -50, 50, 1, 0, '0') + OUT_FMT,
    guide: [['Drop an audio file', 'Drag a song, instrumental or voice recording onto the left pane.'], ['Set the shift', 'Open Settings: semitones change the key (+12 = one octave up), cents fine-tune for A=432 or slightly off recordings.'], ['Shift and download', 'Click <strong>Shift pitch</strong>. Duration stays exactly the same; play and download the result.']],
    faq: [PRIV_AUDIO, ['Does the speed change?', 'No. The audio is time-stretched with WSOLA and then resampled, so pitch moves while the length stays identical.'], ['How many semitones should I use?', 'One semitone is one piano key. ±1–3 changes the key for singing along; ±12 is a full octave. Voices start sounding cartoonish beyond about ±5.'], ['What are cents for?', '100 cents = 1 semitone. Use cents to match a recording to your instrument — for example −32 cents takes A440 to roughly A432.'], ['Will it sound perfect?', 'Speech and solo instruments shift cleanly. Dense mixes and large shifts can get a slight phasey or grainy quality — that is the trade-off of any in-browser shifter without heavy AI models.'], FMT_FAQ]
  },
  {
    slug: 'noise-reducer', name: 'Noise Reducer', icon: 'lucide:audio-waveform', section: 'Audio Tools', runtime: 'audio',
    desc: 'Free online noise reducer: remove steady background hiss, hum, fan and air-conditioner noise from voice recordings and podcasts with spectral noise reduction. Preview, then download MP3 or WAV — in your browser, no upload.',
    lead: 'Clean steady hiss, hum and fan noise out of voice recordings with spectral noise reduction — privately in your browser.',
    cardDesc: 'Remove steady hiss, hum and fan noise from voice recordings.',
    tags: ['noise', 'noise reduction', 'noise reducer', 'denoise', 'hiss', 'hum', 'background noise', 'podcast', 'voice', 'clean audio', 'remove noise', 'fan noise'],
    action: 'Reduce noise', actionIcon: 'lucide:audio-waveform',
    source: { drop: AUDIO_DROP, html: AUDIO_SRC },
    output: { label: 'Cleaned', icon: 'lucide:audio-waveform', empty: 'The cleaned audio appears here', html: AUDIO_OUT },
    settingsSummary: 'Medium · Auto profile · MP3 · 192 kbps',
    settings: range('opt-strength', 'Strength', 10, 100, 5, 60, 'Medium')
      + select('opt-profile', 'Noise profile from', [['auto', 'Quietest parts (automatic)', 1], ['start', 'First second of the file']]) + OUT_FMT,
    guide: [['Drop a recording', 'Drag a voice note, podcast or interview onto the left pane. A few seconds of "room tone" helps.'], ['Set the strength', 'Open Settings. Medium suits most recordings; push higher for loud hiss, lower if voices start to sound watery.'], ['Clean and download', 'Click <strong>Reduce noise</strong>, compare with the original, then download.']],
    faq: [PRIV_AUDIO, ['What noise can it remove?', 'Steady, constant noise: tape or mic hiss, electrical hum, fans, air-conditioning, computer whine. It learns the noise\'s spectrum and turns those frequencies down whenever nobody is speaking over them.'], ['What can\'t it remove?', 'Noise that changes — traffic, music, other voices, keyboard clicks, echo. Those need AI separation models that are too large to run in a page.'], ['What is the noise profile?', 'The tool measures what the noise sounds like. <em>Automatic</em> uses the quietest moments of the file; choose <em>First second</em> if your recording starts with clean room tone.'], ['Why does the voice sound watery or robotic?', 'Strength is too high for that recording. Lower it until the artefacts disappear — some residual hiss usually sounds more natural than none.'], FMT_FAQ]
  },
  {
    slug: 'audio-splitter', name: 'Audio Splitter', icon: 'lucide:split', section: 'Audio Tools', runtime: 'audio', libs: ['jszip'], css: true,
    desc: 'Free online audio splitter: cut an MP3, WAV or M4A into equal parts, fixed-length chunks or at every silence. Preview each piece and download them all as a ZIP — processed in your browser, no upload.',
    lead: 'Cut a long recording into equal parts, fixed-length chunks or at each pause — preview every piece and download them as a ZIP.',
    cardDesc: 'Split audio into equal parts, fixed chunks or at silences — ZIP download.',
    tags: ['split', 'splitter', 'cut', 'audio splitter', 'chunks', 'segments', 'silence', 'mp3 splitter', 'divide', 'zip', 'podcast', 'audiobook'],
    action: 'Split audio', actionIcon: 'lucide:split',
    source: { drop: AUDIO_DROP, html: AUDIO_SRC },
    output: { label: 'Parts', icon: 'lucide:split', empty: 'The pieces appear here', tall: true, html: `
                  <ol id="parts-list" class="split-parts" hidden aria-label="Split parts"></ol>` },
    downloadTitle: 'Download all parts as ZIP', copyTitle: 'Copy the cut points',
    settingsSummary: '2 equal parts · MP3 · 192 kbps',
    settings: select('opt-mode', 'Split', [['parts', 'Into equal parts', 1], ['every', 'Every N seconds'], ['silence', 'At silences']])
      + range('opt-n', 'Number of parts', 2, 20, 1, 2, '2') + range('opt-every', 'Chunk length', 5, 600, 5, 60, '1:00')
      + range('opt-thresh', 'Silence below', -60, -20, 1, -40, '−40 dB') + range('opt-minsil', 'Silence at least', 0.3, 3, 0.1, 0.8, '0.8 s') + OUT_FMT,
    guide: [['Drop an audio file', 'Drag a long recording, mix or audiobook onto the left pane.'], ['Choose how to cut', 'Open Settings: equal parts, fixed-length chunks, or automatic cuts at pauses with a silence threshold.'], ['Split and download', 'Click <strong>Split audio</strong>. Preview or save single parts on the right, or download them all as a ZIP.']],
    faq: [PRIV_AUDIO, ['How does splitting at silences work?', 'The tool finds stretches quieter than the threshold that last at least the minimum length, and cuts in the middle of each one. Raise the threshold (e.g. −30 dB) for noisy recordings.'], ['Are the cuts sample-accurate?', 'Yes. Cuts are made on the decoded samples. With MP3 output each part gets a fresh encoder frame, so there are no clicks at the joins.'], ['Can I download one part only?', 'Yes — every part has its own player and save link. The toolbar Download saves all of them in one ZIP.'], ['Is there a limit on parts?', 'Silence mode stops at 200 parts. Equal parts go up to 20, and chunk length goes from 5 seconds to 10 minutes.'], FMT_FAQ]
  },
  {
    slug: 'audio-crossfader', name: 'Audio Crossfader', icon: 'lucide:blend', section: 'Audio Tools', runtime: 'audio',
    desc: 'Free online audio crossfader: blend the end of one song into the start of another with an adjustable crossfade length and equal-power, linear or S-curve fades. Download as MP3 or WAV — in your browser, no upload.',
    lead: 'Blend one track into the next like a DJ — choose the crossfade length and curve, then download the mix. Private, in your browser.',
    cardDesc: 'Blend two tracks with a smooth crossfade — length and curve control.',
    tags: ['crossfade', 'crossfader', 'blend', 'mix', 'transition', 'dj', 'fade', 'join songs', 'merge', 'audio', 'mixtape', 'segue'],
    action: 'Crossfade', actionIcon: 'lucide:blend', idle: 'Drop two audio files',
    source: { drop: { accept: AUDIO_ACCEPT, multiple: true, title: 'Drop two audio files here or click to browse', sub: 'First file fades out, second fades in — MP3, WAV, M4A, OGG, FLAC' }, tall: true, html: `
                  <div id="source-wrap" class="aud-player" hidden>
                    <ul id="file-list" class="pdf-files aud-list" aria-label="Tracks to crossfade"></ul>
                    <button type="button" class="btn-toolbar-sm" id="btn-swap">Swap order</button>
                  </div>` },
    output: { label: 'Mixed', icon: 'lucide:blend', empty: 'The crossfaded mix appears here', html: AUDIO_OUT },
    settingsSummary: '5 s · Equal power · MP3 · 192 kbps',
    settings: range('opt-dur', 'Crossfade length', 0.5, 20, 0.5, 5, '5 s')
      + select('opt-curve', 'Curve', [['equal', 'Equal power (smooth, no dip)', 1], ['linear', 'Linear'], ['scurve', 'S-curve (quick swap in the middle)']]) + OUT_FMT,
    guide: [['Drop two tracks', 'Drag both files onto the left pane (or pick them together). The first one fades out, the second fades in.'], ['Tune the blend', 'Open Settings to set the crossfade length and curve. <strong>Swap order</strong> flips which plays first.'], ['Crossfade and download', 'Click <strong>Crossfade</strong>, listen to the transition and download the mix.']],
    faq: [PRIV_AUDIO, ['Which curve should I use?', '<em>Equal power</em> keeps the loudness steady through the blend — best for music. <em>Linear</em> can dip slightly in the middle. <em>S-curve</em> holds each track longer and swaps quickly, like a DJ cut.'], ['How long should the crossfade be?', '3–8 seconds suits most songs; 10–20 seconds gives a slow ambient blend. It can never be longer than the shorter track.'], ['Can I crossfade more than two files?', 'This tool blends a pair. For longer mixes, crossfade two, then drop the result with the next track — or use the Audio Merger for simple joins.'], ['Do the tracks need the same sample rate?', 'No. Both are decoded at the same rate and the mono/stereo layout is matched automatically.'], FMT_FAQ]
  },
  {
    slug: 'bpm-detector', name: 'Beat / BPM Detector', icon: 'lucide:activity', section: 'Audio Tools', runtime: 'audio', css: true,
    desc: 'Free online BPM detector: find the tempo of any song in beats per minute from an MP3, WAV or M4A, check it with a click track or tap tempo, and download the click mix. In your browser — no upload.',
    lead: 'Find a song\'s tempo in seconds, hear a click track laid over it to confirm, or tap along — all in your browser.',
    cardDesc: 'Detect a song\'s tempo in BPM — click-track check and tap tempo.',
    tags: ['bpm', 'tempo', 'beat', 'bpm detector', 'beats per minute', 'tap tempo', 'dj', 'metronome', 'click track', 'song tempo', 'music', 'beat finder'],
    action: 'Detect BPM', actionIcon: 'lucide:activity',
    source: { drop: AUDIO_DROP, html: AUDIO_SRC },
    output: { label: 'Tempo', icon: 'lucide:activity', empty: 'The tempo appears here', html: `
                  <div id="output-wrap" class="aud-player" hidden>
                    <div class="bpm-readout"><strong id="bpm-value">—</strong><span>BPM</span></div>
                    <div class="bpm-sub" id="bpm-sub"></div>
                    <audio id="output-audio" controls></audio>
                  </div>`, after: `
                  <div class="bpm-tap-row">
                    <button type="button" class="btn-toolbar-sm" id="btn-tap" title="Tap along to the beat (or press T)">Tap tempo</button>
                    <span class="pane-badge" id="tap-badge">Tap 4+ times</span>
                  </div>` },
    copyTitle: 'Copy the BPM', downloadTitle: 'Download the song with the click track',
    settingsSummary: '80–160 BPM · Click −6 dB · MP3 · 192 kbps',
    settings: select('opt-range', 'Expected tempo', [['60', '60–120 BPM (ballads, hip-hop)'], ['80', '80–160 BPM (most music)', 1], ['100', '100–200 BPM (dance, drum & bass)']])
      + range('opt-click', 'Click track level', -24, 0, 1, -6, '−6 dB') + OUT_FMT,
    guide: [['Drop a song', 'Drag an MP3, WAV, M4A or FLAC onto the left pane.'], ['Detect', 'Click <strong>Detect BPM</strong>. The tempo appears with a confidence score and a click track laid over the song.'], ['Confirm', 'Play the click mix — if the clicks sit on the beat, the BPM is right. Not sure? Tap along with <strong>Tap tempo</strong>.']],
    faq: [PRIV_AUDIO, ['How is the tempo detected?', 'The tool builds an onset curve (where the energy jumps — kicks, snares, strums), then autocorrelates it to find the most regular beat spacing, refined to a decimal.'], ['Why is the result half or double the real BPM?', 'A 70 BPM song and a 140 BPM song share the same beat grid. Pick the expected range in Settings to tell the detector which one you mean.'], ['How accurate is it?', 'Songs with a steady drum beat are usually within ±0.5 BPM. Live recordings with drifting tempo, rubato classical music or beatless ambient tracks are unreliable — the confidence score drops for those.'], ['What is the click track for?', 'It is the song with a metronome mixed on top at the detected tempo and phase. If the clicks line up you can trust the number; you can download it for practice.'], ['How does tap tempo work?', 'Tap the button (or press T) on each beat. After four taps it averages the gaps; stop for 2 seconds to start over.']]
  },
  {
    slug: 'audio-spectrum-visualizer', name: 'Audio Spectrum Visualizer', icon: 'lucide:bar-chart-3', section: 'Audio Tools', runtime: 'audio', css: true,
    desc: 'Free online audio spectrum visualizer: watch frequency bars, a waveform or a scrolling spectrogram react to any song, then record it as a video with sound for social media. In your browser — no upload.',
    lead: 'Watch any track as live frequency bars, a waveform or a spectrogram — and record the animation as a video with sound.',
    cardDesc: 'Live frequency bars, waveform or spectrogram — record as a video.',
    tags: ['spectrum', 'visualizer', 'audio visualizer', 'spectrogram', 'frequency', 'analyzer', 'fft', 'music video', 'waveform', 'equalizer bars', 'audiogram', 'video'],
    action: 'Record video', actionIcon: 'lucide:video',
    source: { drop: AUDIO_DROP, html: AUDIO_SRC },
    output: { label: 'Visualizer', icon: 'lucide:bar-chart-3', empty: 'Load a file and press play to see the spectrum', html: `
                  <canvas id="viz" class="media-preview-canvas viz-canvas" width="1280" height="720" aria-label="Live audio spectrum"></canvas>
                  <video id="output-video" class="video-converted-preview" controls playsinline></video>` },
    copyTitle: 'Copy the current frame as PNG', downloadTitle: 'Download the recorded video',
    settingsSummary: 'Bars · 1280 × 720',
    settings: select('opt-style', 'Style', [['bars', 'Frequency bars', 1], ['wave', 'Waveform (oscilloscope)'], ['gram', 'Spectrogram (scrolling)']])
      + select('opt-size', 'Video size', [['1280x720', 'Landscape · 1280 × 720', 1], ['1080x1080', 'Square · 1080 × 1080'], ['1080x1920', 'Vertical · 1080 × 1920']])
      + color('opt-color', 'Colour', '#e8590c') + color('opt-bg', 'Background', '#0b0b0f'),
    guide: [['Drop an audio file', 'Drag a song or voice clip onto the left pane, then press play — the spectrum moves on the right.'], ['Style it', 'Open Settings to switch between bars, waveform and spectrogram, and pick the colours and video shape.'], ['Record', 'Click <strong>Record video</strong> to capture the whole track as a WebM with sound, or Copy for a still frame.']],
    faq: [PRIV_AUDIO, ['What am I looking at?', '<em>Bars</em> show loudness per frequency band (bass on the left, treble on the right). <em>Waveform</em> shows the raw signal. <em>Spectrogram</em> scrolls time left to right with frequency upwards and brightness as loudness.'], ['How long does recording take?', 'Recording runs in real time — a 3-minute song takes 3 minutes. Keep the tab visible; browsers slow down hidden tabs.'], ['Which video format do I get?', 'WebM (VP8/VP9 with Opus audio), which plays in browsers, VLC and most editors, and uploads to YouTube. Convert to MP4 with the Video Converter for Instagram.'], ['Can I use it with my microphone?', 'Not yet — it visualizes files. For live mic levels, try the Voice Recorder.']]
  },
  {
    slug: 'text-to-speech', name: 'Text to Speech', icon: 'lucide:speech', section: 'Audio Tools', runtime: 'audio', css: true,
    desc: 'Free online text to speech: read text aloud instantly with your device\'s voices, or create a natural neural voice MP3/WAV with an AI model that runs entirely in your browser — no sign-up, no upload.',
    lead: 'Hear any text read aloud instantly, or turn it into a natural-sounding MP3 with an AI voice that runs on your device.',
    cardDesc: 'Read text aloud or save a natural AI voice as MP3 — on your device.',
    tags: ['text to speech', 'tts', 'read aloud', 'voice', 'speech', 'ai voice', 'narration', 'voiceover', 'mp3', 'kokoro', 'speak', 'audio'],
    action: 'Create audio file', actionIcon: 'lucide:file-audio', actionEnabled: true, idle: 'Type or paste text',
    source: { label: 'Text', badge: '0 characters', html: `
                  <textarea id="tts-text" class="textarea-clean tts-text" placeholder="Type or paste the text to read aloud…" aria-label="Text to speak" spellcheck="true"></textarea>`, after: `
                <div class="tts-row">
                  <button type="button" class="btn-toolbar-sm" id="btn-speak" title="Read aloud now with a device voice"><iconify-icon icon="lucide:volume-2" width="14" height="14"></iconify-icon><span>Speak</span></button>
                  <button type="button" class="btn-toolbar-sm" id="btn-stop" disabled><iconify-icon icon="lucide:square" width="14" height="14"></iconify-icon><span>Stop</span></button>
                </div>` },
    output: { label: 'Audio file', badge: 'Nothing created yet', icon: 'lucide:file-audio', empty: 'Create audio file uses an on-device AI voice (≈90 MB, downloaded once)', html: AUDIO_OUT },
    settingsSummary: 'Heart (US) · 1× · MP3 · 192 kbps',
    settings: select('opt-voice', 'Device voice (Speak)', [['', 'Default']])
      + select('opt-nvoice', 'AI voice (audio file)', [['af_heart', 'Heart · US female', 1], ['af_bella', 'Bella · US female'], ['af_nicole', 'Nicole · US female, soft'], ['am_michael', 'Michael · US male'], ['am_fenrir', 'Fenrir · US male, deep'], ['bf_emma', 'Emma · UK female'], ['bm_george', 'George · UK male']])
      + range('opt-rate', 'Speed', 0.5, 2, 0.05, 1, '1×') + OUT_FMT,
    guide: [['Type or paste text', 'Enter anything from a sentence to a few pages in the left pane.'], ['Listen instantly', 'Press <strong>Speak</strong> to hear it with a voice built into your device. Pick a voice and speed in Settings.'], ['Create an audio file', 'Click <strong>Create audio file</strong> for a natural AI voice saved as MP3 or WAV. The model downloads once, then works offline.']],
    faq: [['Is my text sent to a server?', 'No. <em>Speak</em> uses your operating system\'s voices, and the AI voice model runs inside your browser. The model files are downloaded from Hugging Face the first time; your text never leaves the device.'], ['Why can\'t I download the Speak voice?', 'Browsers play device voices directly to the speakers and give web pages no way to record them. That is why audio files are made with the on-device AI voice instead.'], ['How big is the AI voice download?', 'About 90 MB (Kokoro-82M, quantised), downloaded once and cached by your browser. It runs on your CPU: a modern laptop speaks faster than real time, older phones more slowly.'], ['Which languages are supported?', '<em>Speak</em> supports every language your device has voices for. The AI voices are English (US and UK accents); other languages will be read with English pronunciation.'], ['Is there a length limit?', 'Long text is split into sentences and generated piece by piece, so several pages work — it just takes longer. Very long jobs are easier in chunks of a few thousand characters.']]
  },
  {
    slug: 'audio-waveform-image-generator', name: 'Audio Waveform Image Generator', icon: 'lucide:audio-lines', section: 'Audio Tools', runtime: 'audio', css: true,
    desc: 'Free online audio waveform image generator: turn an MP3, WAV or M4A into a PNG or SVG waveform with bars, mirrored or line styles, custom colours and a transparent background. In your browser — no upload.',
    lead: 'Turn any track into a clean waveform graphic — bars, mirrored or line, your colours, PNG or SVG.',
    cardDesc: 'Make a PNG or SVG waveform from audio — styles, colours, transparency.',
    tags: ['waveform', 'waveform image', 'audio waveform', 'soundwave', 'png', 'svg', 'podcast art', 'audiogram', 'music art', 'visualization', 'sound wave', 'generator'],
    action: 'Generate image', actionIcon: 'lucide:audio-lines',
    source: { drop: AUDIO_DROP, html: AUDIO_SRC },
    output: { label: 'Waveform image', icon: 'lucide:audio-lines', empty: 'The waveform image appears here', html: `
                  <img id="output-img" alt="Waveform image" class="media-preview-img wfi-img" width="600" height="150">` },
    copyTitle: 'Copy the image (PNG) or SVG markup',
    settingsSummary: 'Bars · 1800 × 400 · PNG',
    settings: select('opt-style', 'Style', [['bars', 'Rounded bars', 1], ['mirror', 'Mirrored (filled)'], ['line', 'Line']])
      + select('opt-size', 'Size', [['1800x400', 'Banner · 1800 × 400', 1], ['1200x300', 'Wide · 1200 × 300'], ['1080x1080', 'Square · 1080 × 1080'], ['1920x1080', 'Full HD · 1920 × 1080'], ['3000x600', 'Print · 3000 × 600']])
      + range('opt-bar', 'Bar width', 1, 24, 1, 6, '6 px') + range('opt-gap', 'Gap', 0, 12, 1, 3, '3 px')
      + color('opt-color', 'Wave colour', '#e8590c') + color('opt-bg', 'Background', '#ffffff') + check('opt-transparent', 'Transparent background', true)
      + select('opt-format', 'File type', [['png', 'PNG image', 1], ['svg', 'SVG (vector)']]),
    guide: [['Drop an audio file', 'Drag a song, podcast or voice note onto the left pane. A waveform image appears immediately.'], ['Style it', 'Open Settings to change the style, size, bar width, colours and transparency — the preview updates live.'], ['Download', 'Save as PNG for social posts or SVG for print and web, or copy it straight into a design tool.']],
    faq: [PRIV_AUDIO, ['PNG or SVG?', 'PNG is a ready-to-post image at the chosen size. SVG is a vector file that stays sharp at any size and can be recoloured in Figma, Illustrator or CSS.'], ['How is the waveform drawn?', 'Each bar (or point) is the peak level of its slice of the track across all channels, scaled so the loudest moment fills the height.'], ['Can I make it match my brand?', 'Yes — pick any wave colour and background, or keep the background transparent to place it over artwork.'], ['Does it work on long files?', 'Yes. Hour-long podcasts render in a second or two because only peaks are measured.']]
  },
  /* ═══════════ LABS ═══════════ */
  {
    slug: 'camera', cat: 'labs', name: 'Camera', icon: 'lucide:camera', section: 'Experiments', css: true,
    desc: 'Free online camera: take photos and record videos with your webcam or phone camera in the browser — switch front/back, self-timer, grid, mirror and resolution, then download. Nothing is uploaded.',
    lead: 'Take photos and record videos with your webcam or phone camera — timer, grid, mirror and front/back switch. Everything stays on your device.',
    cardDesc: 'Webcam & phone camera: photos and videos with timer, grid and mirror.',
    tags: ['camera', 'webcam', 'take photo', 'selfie', 'record video', 'webcam recorder', 'online camera', 'front camera', 'mirror', 'timer', 'snapshot', 'phone camera'],
    action: 'Start camera', actionIcon: 'lucide:camera', actionEnabled: true, actionIn: 'source', idle: 'Camera off',
    source: { label: 'Camera', badge: 'Off', html: `
                  <video id="cam-video" class="source-video-player cam-video" playsinline muted aria-label="Live camera"></video>
                  <div id="cam-grid" class="cam-grid" hidden aria-hidden="true"></div>
                  <div id="cam-count" class="cam-count" hidden aria-live="assertive"></div>
                  <div id="cam-flash" class="cam-flash" aria-hidden="true"></div>
                  <div id="cam-rec" class="cam-rec" hidden><span class="status-dot"></span><span id="cam-rec-time">0:00</span></div>`, after: `
                <div class="cam-bar">
                  <div class="segmented-group" id="cam-mode" role="group" aria-label="Capture mode">
                    <button type="button" class="seg-pill active" data-value="photo">Photo</button>
                    <button type="button" class="seg-pill" data-value="video">Video</button>
                  </div>
                  <button type="button" class="btn-toolbar-sm" id="btn-flip" title="Switch between front and back camera" aria-label="Switch camera" disabled><iconify-icon icon="lucide:switch-camera" width="16" height="16"></iconify-icon></button>
                </div>` },
    output: { label: 'Shots', badge: 'None yet', icon: 'lucide:images', empty: 'Your photos and videos appear here', html: `
                  <img id="output-img" alt="Selected photo" class="media-preview-img">
                  <video id="output-video" class="video-converted-preview" controls playsinline></video>`, after: `
                <div class="thumb-rail cam-rail" id="cam-rail" aria-label="Captured shots"></div>` },
    copyTitle: 'Copy the selected photo', downloadTitle: 'Download the selected shot',
    settingsSummary: 'No timer · 1080p · Mirrored',
    settings: select('opt-timer', 'Self-timer', [['0', 'Off', 1], ['3', '3 seconds'], ['10', '10 seconds']])
      + select('opt-res', 'Resolution', [['720', '720p (HD)'], ['1080', '1080p (Full HD)', 1], ['2160', '4K (if the camera supports it)']])
      + check('opt-mirror', 'Mirror the preview and photos (selfie view)', true) + check('opt-grid', 'Show rule-of-thirds grid') + check('opt-audio', 'Record sound with videos', true)
      + select('opt-format', 'Photo format', [['image/jpeg', 'JPG', 1], ['image/png', 'PNG'], ['image/webp', 'WebP']]),
    guide: [['Start the camera', 'Click <strong>Start camera</strong> and allow access. On phones, use the switch button for the front or back camera.'], ['Shoot', 'Choose Photo or Video, then press the button. Settings has a self-timer, grid, mirror, resolution and sound.'], ['Keep the best', 'Shots collect on the right. Click one to view it, then download or copy it.']],
    faq: [['Are my photos uploaded?', 'No. The camera feed is shown and captured inside your browser tab. Shots exist only in this page\'s memory until you download them — closing the tab discards them.'], ['Why does it ask for permission?', 'Browsers never let a page use the camera or microphone without your consent. You can revoke it at any time from the padlock icon in the address bar.'], ['Why are my selfies mirrored?', 'Mirroring makes the preview behave like a mirror, which feels natural. Turn it off in Settings if you want text and logos to read correctly in photos.'], ['What format are videos saved in?', 'Your browser\'s recorder decides: WebM (VP8/VP9 + Opus) in Chrome, Edge and Firefox; MP4 in Safari. Use the Video Converter for other formats.'], ['How is this different from the Photo Booth?', 'The Photo Booth makes decorated photo strips. Camera is a plain, full-resolution camera for single photos and videos.']]
  },
];

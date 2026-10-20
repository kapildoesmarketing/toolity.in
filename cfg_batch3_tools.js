/* Designed by Kapil Pidhwani: batch 3 (20 Oct 2026) — Shape Crop · Video to Sticker · Chat Mockup · Social Post Mockups ·
 * Audio Visualizer · Audio to Text. Same contract as cfg_media_tools.js (see its header); builders are shared via its `h` export.
 * Generate: CFG=cfg_batch3_tools.js node gen_media_pages.js [slug]   Wire: python3 wire_batch3.py */
const { IMAGE_DROP, IMG_SRC, IMG_OUT, ctl, select, range, check, color, IMG_FMT, PRIV_IMAGE } = require('./cfg_media_tools.js').h;

module.exports = [
  /* ═══════════ 1. SHAPE CROP ═══════════ */
  {
    slug: 'shape-crop', name: 'Shape Crop', icon: 'lucide:circle-dashed', section: 'Image Tools', runtime: 'image', css: true,
    desc: 'Free online shape crop: cut any photo into a circle, rounded square, squircle, heart, star, hexagon or your own SVG path, with soft edges and a border — transparent PNG, made in your browser, no upload.',
    lead: 'Crop a photo into a circle, heart, star or any SVG shape — with a soft edge and an optional border — as a transparent PNG, privately in your browser.',
    cardDesc: 'Circle, heart, star, squircle or custom SVG crop with soft edge and border.',
    tags: ['shape crop', 'circle crop', 'crop circle', 'round image', 'rounded corners', 'heart crop', 'star crop', 'squircle', 'hexagon', 'profile picture', 'avatar', 'transparent png', 'svg mask', 'cut out', 'photo'],
    action: 'Crop to shape', actionIcon: 'lucide:circle-dashed',
    source: { drop: IMAGE_DROP, html: `
                  <canvas id="stage" class="media-preview-canvas gif-stage" width="360" height="240" aria-label="Image with shape outline"></canvas>
                  <div id="crop-box" class="vcr-box" hidden aria-hidden="true"><span class="vcr-handle"></span></div>` },
    output: { label: 'Cropped', icon: 'lucide:circle-dashed', empty: 'The shaped image appears here', html: IMG_OUT('Shape-cropped image') },
    settingsSummary: 'Circle',
    settings: select('opt-shape', 'Shape', [['circle', 'Circle', 1], ['rounded', 'Rounded rectangle'], ['squircle', 'Squircle'], ['heart', 'Heart'], ['star', 'Star'], ['hexagon', 'Hexagon'], ['triangle', 'Triangle'], ['custom', 'Custom SVG path…']])
      + ctl(`
                <label for="opt-path">SVG path (d attribute)</label>
                <textarea id="opt-path" class="textarea-clean sc-path" rows="2" spellcheck="false" placeholder="M 50 0 L 100 100 L 0 100 Z"></textarea>`)
      + range('opt-radius', 'Corner radius', 0, 50, 1, 20, '20%')
      + range('opt-feather', 'Soft edge', 0, 40, 1, 0, 'Off')
      + range('opt-border', 'Border width', 0, 40, 1, 0, 'Off')
      + color('opt-border-color', 'Border colour', '#ffffff')
      + select('opt-size', 'Output size', [['0', 'Same as crop', 1], ['256', '256 px'], ['512', '512 px'], ['1024', '1024 px'], ['2048', '2048 px']])
      + IMG_FMT.replace("['auto', 'Same as original', 1]", "['auto', 'Same as original']").replace("['image/png', 'PNG']", "['image/png', 'PNG · keeps transparency', 1]"),
    guide: [['Drop an image', 'Drag a photo onto the left pane. A square crop box with the shape outline appears over it.'], ['Pick a shape and position', 'Move or resize the box; choose a shape under Settings — or paste your own SVG path. Add a soft edge or a border if you like.'], ['Download the PNG', 'The result on the right updates live. Download it as a transparent PNG, or copy it straight to the clipboard.']],
    faq: [PRIV_IMAGE,
      ['Is the background really transparent?', 'Yes, when you save as PNG or WebP. JPG cannot hold transparency, so the outside of the shape is filled with white instead.'],
      ['How do I use my own shape?', 'Choose <em>Custom SVG path…</em> and paste the <code>d</code> attribute of any SVG <code>&lt;path&gt;</code> (from Figma, Illustrator or an icon set). It is scaled to fit the crop box automatically.'],
      ['Can I make a round profile picture at an exact size?', 'Yes — keep <em>Circle</em>, drag the box over your face, then set <em>Output size</em> to 512 px or 1024 px. The crop is taken from the full-resolution original, not the preview.'],
      ['What does “Soft edge” do?', 'It feathers the outline by the chosen number of pixels so the shape fades into transparency instead of ending in a hard line — useful over busy backgrounds.'],
      ['Does the border sit inside or outside the shape?', 'Inside, so the output stays the size you chose. For a border that does not cover the photo, make the box slightly larger than the subject.']]
  },

  /* ═══════════ 2. VIDEO TO STICKER ═══════════ */
  {
    slug: 'video-to-sticker', name: 'Video to Sticker', icon: 'lucide:sticker', section: 'Video Tools', runtime: 'video', css: true, libs: ['webp-anim'],
    desc: 'Free online video to sticker converter: turn any clip into a Telegram video sticker (WebM VP9, 512 px, 3 s, under 256 KB) or a WhatsApp animated sticker (animated WebP, 512 px, under 500 KB) — trimmed, cropped and size-fitted in your browser, no upload.',
    lead: 'Trim and crop a clip into a ready-to-import Telegram or WhatsApp sticker — 512 px square, under the size limit, made on your device.',
    cardDesc: 'Telegram WebM or WhatsApp animated WebP stickers — 512 px, auto-fitted under the size cap.',
    tags: ['video to sticker', 'telegram sticker', 'whatsapp sticker', 'animated sticker', 'webm sticker', 'vp9', 'animated webp', '512x512', 'sticker maker', 'video sticker', 'gif to sticker', 'green screen', 'transparent sticker'],
    action: 'Make sticker', actionIcon: 'lucide:sticker', idle: 'Drop a video to begin',
    source: { label: 'Clip', drop: { accept: 'video/mp4, video/quicktime, video/webm, video/*', title: 'Drop a video here or click to browse', sub: 'MP4, MOV or WebM — up to 500 MB' }, html: `
                  <video id="source-video" class="source-video-player" controls playsinline preload="metadata" muted></video>
                  <div id="crop-box" class="vcr-box vts-box" hidden aria-hidden="true"><span class="vcr-handle"></span></div>`, after: `
                <div class="vdt-range" id="rng-wrap" hidden>
                  <div class="vdt-range-row"><label for="rng-start">Start</label><input type="range" id="rng-start" class="range-slider-clean" min="0" max="0" step="0.1" value="0" aria-label="Start time"><span class="range-val-badge" id="rng-start-val">0:00.0</span><button type="button" class="btn-toolbar-sm" id="btn-start-now" title="Set start to the playhead">Now</button></div>
                  <div class="vdt-range-row"><label for="rng-end">End</label><input type="range" id="rng-end" class="range-slider-clean" min="0" max="0" step="0.1" value="0" aria-label="End time"><span class="range-val-badge" id="rng-end-val">0:00.0</span><button type="button" class="btn-toolbar-sm" id="btn-end-now" title="Set end to the playhead">Now</button></div>
                  <p class="web-muted vts-len">Selected: <span id="rng-len">0:00.0</span> <span id="vts-fit-note"></span></p>
                </div>` },
    output: { label: 'Sticker', icon: 'lucide:sticker', empty: 'Your sticker appears here', html: `
                  <div class="vts-checker">
                    <video id="output-video" class="video-converted-preview vts-out" playsinline muted loop autoplay></video>
                    <img id="output-img" alt="Sticker preview" class="media-preview-img vts-out" width="256" height="256">
                  </div>`, after: `
                  <p class="web-muted vts-verdict" id="vts-verdict" hidden></p>` },
    settingsSummary: 'Telegram · 30 fps',
    settings: select('opt-platform', 'Sticker type', [['telegram', 'Telegram video sticker — WebM VP9, 3 s, ≤ 256 KB', 1], ['whatsapp', 'WhatsApp animated sticker — animated WebP, ≤ 500 KB'], ['static', 'Static sticker (WhatsApp / Telegram) — WebP, ≤ 100 KB']])
      + select('opt-fps', 'Frame rate', [['30', '30 fps (Telegram)', 1], ['15', '15 fps'], ['12', '12 fps'], ['10', '10 fps (smallest)']])
      + check('opt-speedfit', 'Speed up the clip to fit the time limit instead of cutting it', true)
      + check('opt-chroma', 'Transparent background (green / blue screen)', false)
      + range('opt-chroma-tol', 'Key tolerance', 10, 90, 1, 40, '40')
      + range('opt-pad', 'Padding inside the square', 0, 20, 1, 0, 'None'),
    guide: [['Drop a clip and trim', 'Drag a video in, then set the start and end with the sliders or the <strong>Now</strong> buttons. Telegram allows 3 seconds; the clip is sped up to fit unless you turn that off.'], ['Frame the square', 'Drag or resize the square over the part you want. Pick <em>Telegram</em>, <em>WhatsApp</em> or <em>Static</em> under Settings — and turn on the green-screen option for a transparent WhatsApp sticker.'], ['Make and import', 'Click <strong>Make sticker</strong>. The badge confirms it is under the platform limit. Telegram: send the .webm to @Stickers. WhatsApp: add the .webp with any sticker-maker app or WhatsApp Web.']],
    faq: [['Is my video uploaded anywhere?', 'No. The clip is decoded by your browser, cropped on a canvas and encoded on your device. Nothing is sent to a server.'],
      ['What exactly does Telegram require?', 'Video stickers must be WebM with the VP9 codec, 512 × 512 px, up to 3 seconds, 30 fps, no audio and at most 256 KB. This tool enforces all of that and lowers the bitrate automatically until the file fits.'],
      ['And WhatsApp?', 'Animated stickers are animated WebP files, 512 × 512 px, under 500 KB; static stickers are WebP under 100 KB. WhatsApp has no built-in importer for files, so add the .webp through a sticker-maker app (Android / iOS) or WhatsApp Web’s sticker button.'],
      ['Can the background be transparent?', 'For WhatsApp and static stickers, yes — record against a green or blue screen and turn on <em>Transparent background</em>; the key colour is sampled from the corners. Telegram video stickers are encoded by the browser’s VP9 recorder, which cannot carry an alpha channel, so they stay opaque.'],
      ['My clip is longer than 3 seconds — what happens?', 'With <em>Speed up to fit</em> on (default) the selected range is played faster so it lands at exactly 3 s (Telegram) or 10 s (WhatsApp). Turn it off to be told to trim instead.'],
      ['Why does encoding take as long as the clip?', 'The browser’s MediaRecorder encodes in real time, and if the first result is over the size cap it is re-encoded at a lower bitrate — a 3 s sticker takes 3–9 s. Keep the tab visible while it runs.']]
  }
];

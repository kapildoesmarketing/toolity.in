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
  },

  /* ═══════════ 3. CHAT MOCKUP ═══════════ */
  {
    slug: 'chat-mockup', name: 'Chat Mockup', icon: 'lucide:message-square-text', section: 'Image Tools', runtime: 'mockup', css: true, cssFile: ['mockup', 'mockup-chat'], actionEnabled: true, split: '45/55', idle: 'Live preview',
    desc: 'Free online chat mockup generator: create realistic fake WhatsApp, iMessage, Instagram DM, Telegram, Messenger, Discord, Slack and Google Messages conversations with avatars, read receipts, reactions, images and voice notes — exported as a sharp PNG, made in your browser.',
    lead: 'Build a realistic WhatsApp, iMessage, Instagram, Telegram, Messenger, Discord, Slack or Android chat — bubbles, ticks, reactions, voice notes and images — and export it as a crisp PNG.',
    cardDesc: 'Fake WhatsApp, iMessage, Instagram, Telegram, Discord or Slack chats as PNG.',
    tags: ['chat mockup', 'fake chat', 'whatsapp chat generator', 'imessage generator', 'fake text message', 'instagram dm generator', 'telegram chat', 'discord message generator', 'slack message', 'fake conversation', 'chat screenshot', 'mockup', 'meme'],
    action: 'Export PNG', actionIcon: 'lucide:image-down', copyTitle: 'Copy PNG to clipboard', downloadTitle: 'Download PNG',
    source: { label: 'Conversation', badge: 'Edit on the left', html: `
                  <div class="mk-form" id="mk-form">
                    <div class="mk-row">
                      <label class="mk-field mk-grow"><span>App</span><select id="opt-platform" class="select-clean">
                        <option value="whatsapp" selected>WhatsApp</option><option value="imessage">iMessage</option><option value="instagram">Instagram DM</option><option value="telegram">Telegram</option><option value="messenger">Messenger</option><option value="android">Google Messages</option><option value="discord">Discord</option><option value="slack">Slack</option></select></label>
                      <label class="mk-field"><span>Theme</span><select id="opt-theme" class="select-clean"><option value="light" selected>Light</option><option value="dark">Dark</option></select></label>
                    </div>
                    <div class="mk-row">
                      <label class="mk-field mk-grow"><span>Contact name</span><input type="text" id="ct-name" class="input-clean" placeholder="e.g. Priya" maxlength="40"></label>
                      <label class="mk-field mk-grow"><span>Status line</span><input type="text" id="ct-status" class="input-clean" placeholder="online · last seen · typing…" maxlength="40"></label>
                      <label class="mk-field mk-file"><span>Avatar</span><input type="file" id="ct-avatar" accept="image/*" data-image="contact" aria-label="Contact avatar"></label>
                    </div>
                    <div class="mk-row">
                      <label class="mk-field mk-grow"><span>Your name <small>(Discord / Slack)</small></span><input type="text" id="me-name" class="input-clean" placeholder="You" maxlength="40"></label>
                      <label class="mk-field mk-file"><span>Your avatar</span><input type="file" id="me-avatar" accept="image/*" data-image="me" aria-label="Your avatar"></label>
                    </div>
                    <div class="mk-msgs-head"><span>Messages</span><button type="button" class="btn-toolbar-sm" id="btn-add-msg"><iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon><span>Add message</span></button></div>
                    <div id="msg-list" class="mk-msg-list" role="list" aria-label="Messages"></div>
                  </div>` },
    output: { label: 'Preview', badge: 'Live', icon: 'lucide:smartphone', empty: 'The chat preview appears here', html: `
                  <div id="mockup-stage" class="mk-stage"></div>` },
    settingsSummary: 'Status bar · 2×',
    settings: check('opt-statusbar', 'Show phone status bar', true)
      + ctl(`
                <label for="opt-time">Clock</label>
                <input type="text" id="opt-time" class="input-clean mk-short" value="9:41" maxlength="5" aria-label="Status bar clock">`)
      + range('opt-battery', 'Battery', 1, 100, 1, 86, '86%')
      + check('opt-frame', 'Phone frame with rounded corners', true)
      + check('opt-header', 'Show chat header', true)
      + check('opt-composer', 'Show message box at the bottom', true)
      + ctl(`
                <label for="opt-divider">Date divider</label>
                <input type="text" id="opt-divider" class="input-clean" placeholder="Today" maxlength="24">`)
      + check('opt-typing', 'Typing indicator at the end', false)
      + select('opt-scale', 'Export resolution', [['1', '1× (390 px wide)'], ['2', '2× (780 px — sharp on phones)', 1], ['3', '3× (1170 px — print / 4K)']])
      + check('opt-credit', 'Show “Made with Toolity.in” credit', true),
    guide: [['Pick the app and the people', 'Choose WhatsApp, iMessage, Instagram, Telegram, Messenger, Google Messages, Discord or Slack. Type the contact’s name and status and drop in avatars if you want them.'], ['Write the messages', 'Add a message per line of the conversation: who sent it, the text (emoji work), the time, delivered/read ticks, a reaction — or switch a message to an image or a voice note.'], ['Export the PNG', 'The preview updates as you type. Click <strong>Export PNG</strong> for a 2× or 3× image, then download it or copy it straight into a document or post.']],
    faq: [['Is any of this sent to a server?', 'No. The chat is rendered as HTML in your tab and converted to a PNG on a canvas in the page. Names, messages and avatars never leave your device.'],
      ['How close is it to the real apps?', 'Colours, bubble shapes, ticks, timestamps, the status bar and the composer follow each app’s current design, using the system UI font like the apps do. It is a mockup for presentations, tutorials, memes and UX work — not a tool for deceiving people; please label fabricated screenshots as such.'],
      ['Can I add photos and voice notes?', 'Yes — change a message’s type to <em>Image</em> and upload a picture, or to <em>Voice note</em> and set a duration; it draws a waveform bubble like the real apps.'],
      ['Which platforms show read receipts?', 'WhatsApp and Telegram show grey/blue double ticks, Google Messages shows “Delivered / Read”, iMessage shows “Delivered” or “Read” under your last bubble, Messenger and Instagram show the seen avatar. Discord and Slack have no receipts, so the option is hidden there.'],
      ['Why is the export sharp but the text size looks different from my phone?', 'The mockup is laid out at 390 CSS px (an iPhone-class width) and exported at 2× or 3× so it is crisp. Your phone may use a larger system text size; the proportions match the default setting.'],
      ['Can I remove the Toolity credit?', 'Yes — untick <em>Show “Made with Toolity.in” credit</em> under Settings before exporting.']]
  },

  /* ═══════════ 4. SOCIAL POST MOCKUPS ═══════════ */
  {
    slug: 'social-post-mockup', name: 'Social Post Mockups', icon: 'lucide:layout-template', section: 'Image Tools', runtime: 'mockup', css: true, cssFile: ['mockup', 'mockup-post'], actionEnabled: true, split: '45/55', idle: 'Live preview',
    desc: 'Free online social post mockup generator: create realistic X (Twitter) posts, Instagram posts and stories, LinkedIn, Facebook and Threads posts with your name, avatar, verified badge, text, image and like/reply counts — exported as a sharp PNG, made in your browser.',
    lead: 'Mock up an X post, Instagram post or story, LinkedIn, Facebook or Threads post — avatar, verified badge, text, image, metrics — and export a crisp PNG.',
    cardDesc: 'X, Instagram, LinkedIn, Facebook and Threads post mockups as PNG.',
    tags: ['tweet generator', 'fake tweet', 'x post mockup', 'instagram post generator', 'instagram story mockup', 'linkedin post generator', 'facebook post mockup', 'threads post', 'social media mockup', 'tweet to image', 'post to image', 'mockup', 'screenshot'],
    action: 'Export PNG', actionIcon: 'lucide:image-down', copyTitle: 'Copy PNG to clipboard', downloadTitle: 'Download PNG',
    source: { label: 'Post', badge: 'Edit on the left', html: `
                  <div class="mk-form" id="mk-form">
                    <div class="mk-row">
                      <label class="mk-field mk-grow"><span>Platform</span><select id="opt-platform" class="select-clean">
                        <option value="x" selected>X (Twitter) post</option><option value="instagram">Instagram post</option><option value="story">Instagram story</option><option value="linkedin">LinkedIn post</option><option value="facebook">Facebook post</option><option value="threads">Threads post</option></select></label>
                      <label class="mk-field"><span>Theme</span><select id="opt-theme" class="select-clean"><option value="light" selected>Light</option><option value="dark">Dark</option></select></label>
                    </div>
                    <div class="mk-row">
                      <label class="mk-field mk-grow"><span>Name</span><input type="text" id="au-name" class="input-clean" placeholder="e.g. Kapil Pidhwani" maxlength="50"></label>
                      <label class="mk-field mk-grow"><span>Handle / headline</span><input type="text" id="au-handle" class="input-clean" placeholder="@handle · or a LinkedIn headline" maxlength="80"></label>
                    </div>
                    <div class="mk-row">
                      <label class="mk-field mk-file"><span>Avatar</span><input type="file" id="au-avatar" accept="image/*" data-image="avatar" aria-label="Avatar"></label>
                      <label class="mk-field mk-check"><input type="checkbox" id="au-verified"> <span>Verified badge</span></label>
                      <label class="mk-field mk-grow"><span>Time / date</span><input type="text" id="po-time" class="input-clean" placeholder="2h · or 9:41 AM · Oct 20, 2026" maxlength="40"></label>
                    </div>
                    <label class="mk-field"><span>Text</span><textarea id="po-text" class="textarea-clean mk-text" rows="4" placeholder="What’s happening? @mentions, #hashtags and links are highlighted." maxlength="3000"></textarea></label>
                    <div class="mk-row">
                      <label class="mk-field mk-file"><span>Image</span><input type="file" id="po-image" accept="image/*" data-image="post" aria-label="Post image"></label>
                      <label class="mk-field"><span>Likes</span><input type="number" id="m-likes" class="input-clean mk-num" min="0" placeholder="0"></label>
                      <label class="mk-field"><span>Comments</span><input type="number" id="m-comments" class="input-clean mk-num" min="0" placeholder="0"></label>
                      <label class="mk-field"><span>Reposts / shares</span><input type="number" id="m-reposts" class="input-clean mk-num" min="0" placeholder="0"></label>
                      <label class="mk-field"><span>Views</span><input type="number" id="m-views" class="input-clean mk-num" min="0" placeholder="0"></label>
                    </div>
                    <label class="mk-field"><span>Caption source / location <small>(Instagram)</small></span><input type="text" id="po-sub" class="input-clean" placeholder="e.g. Bengaluru, India" maxlength="60"></label>
                  </div>` },
    output: { label: 'Preview', badge: 'Live', icon: 'lucide:layout-template', empty: 'The post preview appears here', html: `
                  <div id="mockup-stage" class="mk-stage"></div>` },
    settingsSummary: 'Card · 2×',
    settings: select('opt-width', 'Card width', [['390', 'Phone (390 px)'], ['520', 'Standard (520 px)', 1], ['600', 'Wide (600 px)']])
      + check('opt-frame', 'Rounded card with border', true)
      + check('opt-actions', 'Show action row (like / reply / share)', true)
      + check('opt-liked', 'Show the post as liked', false)
      + select('opt-scale', 'Export resolution', [['1', '1×'], ['2', '2× (sharp on phones)', 1], ['3', '3× (print / 4K)']])
      + check('opt-credit', 'Show “Made with Toolity.in” credit', true),
    guide: [['Pick the platform and the author', 'Choose X, Instagram post or story, LinkedIn, Facebook or Threads. Enter a name and handle (or LinkedIn headline), upload an avatar and tick the verified badge if you want it.'], ['Write the post', 'Type the text — @mentions, #hashtags and links are highlighted like the real thing — attach an image and set the like, comment, repost and view counts.'], ['Export the PNG', 'The card updates live. Click <strong>Export PNG</strong> for a 2× or 3× image, then download it or copy it into a deck, article or chat.']],
    faq: [['Is my post or avatar uploaded anywhere?', 'No. The card is rendered in your browser tab and turned into a PNG on a canvas in the page. Nothing is sent to a server.'],
      ['Are the platform logos real?', 'Yes — the X, Instagram, LinkedIn, Facebook and Threads marks are the official vector logos, fetched from the same icon library the site uses and embedded in the export. The layouts follow each platform’s current post design. Brands own their marks; this is a mockup tool for presentations, previews and tutorials — please label fabricated posts clearly.'],
      ['Why is there no X or Threads image size limit?', 'The attached image is scaled to the card width and kept at its own aspect ratio (Instagram posts crop to the feed ratio, stories to 9:16). Upload up to a few thousand pixels — it is downscaled to keep the PNG small.'],
      ['What do the number fields do on each platform?', 'They fill the metric row in the platform’s own format: X shows replies, reposts, likes and views; Instagram shows likes and the caption; LinkedIn shows reactions and comments; Facebook shows reactions, comments and shares; Threads shows replies and likes. Large numbers are abbreviated (12.4K, 1.2M).'],
      ['Can I make it look like dark mode?', 'Yes — switch <em>Theme</em> to Dark. Every platform has its real dark palette.'],
      ['Can I remove the Toolity credit?', 'Yes — untick <em>Show “Made with Toolity.in” credit</em> under Settings before exporting.']]
  }
];

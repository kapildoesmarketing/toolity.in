/* Photo Booth — Toolity.in
 * Layout → Shoot (camera or upload) → Customize (frame, stickers, logo, caption) → Download.
 * Everything stays in the browser: getUserMedia + Canvas 2D. No network calls with images.
 */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, bindSegmented, bindDropdown, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const card = $('tool-card');

  /* ── Layouts (inches; export at 300 dpi). Photo ratio is w/h after cover-crop. ── */
  const DPI = 300;
  const LAYOUTS = {
    strip3: { label: 'Strip · 3', w: 2, h: 6, cols: 1, rows: 3, pad: 0.15, gap: 0.12, ratio: 1.15 },
    strip4: { label: 'Strip · 4', w: 2, h: 6, cols: 1, rows: 4, pad: 0.15, gap: 0.12, ratio: 1.45 },
    duo:    { label: 'Duo · 2',   w: 2, h: 6, cols: 1, rows: 2, pad: 0.2,  gap: 0.15, ratio: 0.7 },
    grid4:  { label: 'Grid · 4',  w: 4, h: 6, cols: 2, rows: 2, pad: 0.2,  gap: 0.15, ratio: 0.85 },
    big6:   { label: 'Big · 6',   w: 4, h: 6, cols: 2, rows: 3, pad: 0.2,  gap: 0.12, ratio: 1.2 },
  };
  /** Photo rectangles + footer box in inches for a layout. */
  function geometry(L) {
    const pw = (L.w - 2 * L.pad - (L.cols - 1) * L.gap) / L.cols;
    const ph = pw / L.ratio;
    const photos = [];
    for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
      photos.push({ x: L.pad + c * (pw + L.gap), y: L.pad + r * (ph + L.gap), w: pw, h: ph });
    }
    const top = L.pad + L.rows * ph + (L.rows - 1) * L.gap;
    return { photos, footer: { x: L.pad, y: top, w: L.w - 2 * L.pad, h: L.h - top - L.pad } };
  }

  const FILTERS = {
    none: 'none',
    bw: 'grayscale(1) contrast(1.08)',
    sepia: 'sepia(0.85)',
    warm: 'sepia(0.3) saturate(1.35) hue-rotate(-8deg)',
    cool: 'saturate(1.1) hue-rotate(14deg) brightness(1.04)',
    vintage: 'sepia(0.4) contrast(0.92) brightness(1.08) saturate(0.8)',
  };
  const SWATCHES = ['#ffffff', '#f6efe6', '#111111', '#2b2b2b', '#f8c8d4', '#f45a1e', '#ffd166', '#9bd3ae', '#8ecae6', '#5a67d8', '#b388eb', '#c8102e'];
  const PACKS = {
    Cute:    ['🐰', '🌸', '🍓', '🧸', '☁️'],
    Party:   ['🎉', '🎈', '🥳', '🎊', '✨'],
    Love:    ['❤️', '💕', '💌', '🌹', '😘'],
    Retro:   ['📼', '🕶️', '💿', '⭐', '🪩'],
    Holiday: ['🎄', '⛄', '🎁', '❄️', '🔔'],
  };
  const FONTS = { sans: '"Inter", system-ui, sans-serif', serif: 'Georgia, "Times New Roman", serif', hand: '"Segoe Script", "Bradley Hand", "Comic Sans MS", cursive' };

  /* ── State ── */
  const S = {
    step: 'layout', source: 'camera', layout: 'strip4', filter: 'none',
    shots: [],            // HTMLCanvasElement per slot (null = empty)
    stream: null, busy: false, pendingRetake: null,
    frame: '#ffffff', radius: 8, stickers: [], selected: -1, activePack: null,
    logo: null, logoSize: 45, captionMode: 'custom', caption: '', font: 'sans', captionColor: '#222222', captionAuto: true, brand: false,
  };
  const L = () => LAYOUTS[S.layout];
  const count = () => L().rows * L().cols;

  /* ── Step switching ── */
  const STEPS = ['layout', 'shoot', 'customize'];
  function go(step) {
    S.step = step;
    card.dataset.step = step;
    card.dataset.split = step === 'customize' ? '40/60' : '60/40'; // camera gets room while shooting, controls while customizing
    STEPS.forEach((s, i) => {
      $('step-' + s).hidden = s !== step;
      const li = document.querySelector(`.step-item[data-step="${s}"]`);
      li.classList.toggle('is-current', s === step);
      li.classList.toggle('is-done', i < STEPS.indexOf(step));
    });
    if (step === 'shoot') { renderRail(); S.source === 'camera' ? startCamera() : showUpload(); }
    else stopCamera();
    if (step === 'customize') { $('preview-badge').textContent = `${L().w} × ${L().h} in`; requestAnimationFrame(renderPreview); }
    const ready = step === 'customize';
    $('btn-copy').disabled = !ready;
    $('btn-download-menu-toggle').disabled = !ready;
    $('dl-size-badge').textContent = `${L().w * DPI}×${L().h * DPI}`;
  }

  /* ── Step 1: source + layout ── */
  bindSegmented($('seg-source'), (v) => { S.source = v; });
  $('layout-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.booth-layout-card');
    if (!btn) return;
    const prev = count();
    S.layout = btn.dataset.layout;
    document.querySelectorAll('.booth-layout-card').forEach((b) => b.classList.toggle('is-selected', b === btn));
    // Keep existing shots when the count still fits; otherwise trim/extend slots
    S.shots = Array.from({ length: count() }, (_, i) => S.shots[i] || null);
    if (prev !== count()) S.stickers = [];
    go(S.shots.every(Boolean) ? 'customize' : 'shoot');
  });
  $('btn-back-layout').addEventListener('click', () => go('layout'));
  $('btn-back-shoot').addEventListener('click', () => go('shoot'));
  $('btn-continue').addEventListener('click', () => go('customize'));

  /* ── Step 2: camera ── */
  const video = $('cam-video');
  const camBadge = $('cam-badge');
  const shutter = $('btn-shutter');
  const supportsCanvasFilter = 'filter' in CanvasRenderingContext2D.prototype;
  if (!supportsCanvasFilter) $('seg-filter').hidden = true; // Designed by Kapil Pidhwani: Safari <18 lacks ctx.filter → no filters rather than a wrong preview

  async function startCamera() {
    $('upload-zone').hidden = true;
    $('cam-error').hidden = true;
    video.hidden = false;
    video.classList.toggle('is-mirrored', $('opt-mirror').checked);
    if (S.stream) { updateShutter(); return; }
    if (!navigator.mediaDevices?.getUserMedia) return camFail('Camera not supported', 'This browser cannot access a camera. Use photos from your device instead.');
    camBadge.textContent = 'Starting…';
    shutter.disabled = true;
    const h = Number($('opt-res').value);
    try {
      S.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: h * 16 / 9 }, height: { ideal: h } }, audio: false });
      video.srcObject = S.stream;
      await video.play().catch(() => {});
      const t = S.stream.getVideoTracks()[0].getSettings();
      camBadge.textContent = `${t.width || '?'}×${t.height || '?'}`;
      updateShutter();
    } catch (err) {
      const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      camFail(denied ? 'Camera access blocked' : 'No camera found', denied ? 'Allow the camera in your browser\'s address bar and try again — or use photos from your device.' : 'Plug in a camera or use photos from your device instead.');
    }
  }
  function camFail(title, text) {
    camBadge.textContent = 'Unavailable';
    $('cam-error-title').textContent = title;
    $('cam-error-text').textContent = text;
    $('cam-error').hidden = false;
    shutter.disabled = true;
  }
  function stopCamera() {
    if (S.stream) { S.stream.getTracks().forEach((t) => t.stop()); S.stream = null; video.srcObject = null; }
  }
  $('btn-switch-upload').addEventListener('click', () => {
    S.source = 'upload';
    $('seg-source').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'upload'));
    showUpload();
  });
  function showUpload() {
    stopCamera();
    video.hidden = true;
    $('cam-error').hidden = true;
    $('upload-zone').hidden = false;
    $('upload-hint').textContent = `Pick up to ${count()} images · JPG, PNG, WebP`;
    camBadge.textContent = 'Upload';
    shutter.disabled = true;
    $('seg-filter').hidden = !supportsCanvasFilter;
  }
  bindSegmented($('seg-filter'), (v) => { S.filter = v; video.style.filter = FILTERS[v]; });
  $('opt-mirror').addEventListener('change', () => { video.classList.toggle('is-mirrored', $('opt-mirror').checked); summarize(); });
  $('opt-res').addEventListener('change', () => { if (S.stream) { stopCamera(); startCamera(); } });
  ['opt-countdown', 'opt-auto', 'opt-sound'].forEach((id) => $(id).addEventListener('change', summarize));
  function summarize() {
    const cd = $('opt-countdown').value;
    $('settings-summary').textContent = `${cd === '0' ? 'no' : cd + ' s'} countdown · ${$('opt-auto').checked ? 'auto-advance' : 'manual'} · ${$('opt-mirror').checked ? 'mirrored' : 'not mirrored'}`;
  }

  /* ── Capture ── */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function nextSlot() { const i = S.shots.indexOf(null); return S.pendingRetake ?? (i === -1 ? -1 : i); }
  function updateShutter() {
    const n = nextSlot();
    shutter.disabled = S.busy || n === -1 || !S.stream;
    $('shutter-label').textContent = n === -1 ? 'All shots taken' : (S.pendingRetake !== null ? `Retake photo ${n + 1}` : `Take photo ${n + 1}/${count()}`);
    $('btn-continue').disabled = !S.shots.every(Boolean);
    $('shots-badge').textContent = `${S.shots.filter(Boolean).length} / ${count()}`;
  }
  function grabFrame() {
    const c = document.createElement('canvas');
    c.width = video.videoWidth || 1280; c.height = video.videoHeight || 720;
    const ctx = c.getContext('2d');
    if (supportsCanvasFilter) ctx.filter = FILTERS[S.filter];
    if ($('opt-mirror').checked) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, c.width, c.height);
    return c;
  }
  function flash() {
    const f = $('cam-flash'); f.classList.remove('is-on'); void f.offsetWidth; f.classList.add('is-on');
    if ($('opt-sound').checked && !matchMedia('(prefers-reduced-motion: reduce)').matches) click();
  }
  let audio;
  function click() { // Designed by Kapil Pidhwani: synthesized shutter click, no audio asset
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = 1800;
      g.gain.setValueAtTime(0.15, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.06);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.07);
    } catch (e) { /* audio blocked — silent is fine */ }
  }
  async function countdown() {
    const n = Number($('opt-countdown').value);
    const el = $('cam-countdown');
    for (let i = n; i > 0; i--) {
      el.textContent = i; el.hidden = false; el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick');
      await sleep(1000);
    }
    el.hidden = true;
  }
  async function shootSequence() {
    if (S.busy || !S.stream) return;
    S.busy = true; shutter.classList.add('is-busy'); updateShutter();
    try {
      do {
        const slot = nextSlot();
        if (slot === -1) break;
        await countdown();
        S.shots[slot] = grabFrame();
        flash();
        S.pendingRetake = null;
        renderRail();
        if (!$('opt-auto').checked || !S.shots.includes(null)) break;
        await sleep(900);
      } while (true);
    } finally {
      S.busy = false; shutter.classList.remove('is-busy'); updateShutter();
    }
  }
  shutter.addEventListener('click', shootSequence);

  /* ── Upload source ── */
  const upZone = $('upload-zone'), upInput = $('photo-input');
  ['dragenter', 'dragover'].forEach((ev) => upZone.addEventListener(ev, (e) => { e.preventDefault(); upZone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) => upZone.addEventListener(ev, (e) => { e.preventDefault(); upZone.classList.remove('dragover'); }));
  upZone.addEventListener('drop', (e) => takeFiles(e.dataTransfer.files));
  upZone.addEventListener('click', (e) => { if (e.target !== upInput) upInput.click(); });
  upZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upInput.click(); } });
  upInput.addEventListener('change', () => { takeFiles(upInput.files); upInput.value = ''; });
  async function takeFiles(files) {
    const imgs = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return toast('Please choose image files');
    let placed = 0;
    for (const f of imgs) {
      const slot = nextSlot();
      if (slot === -1) break;
      try {
        const bmp = await createImageBitmap(f);
        const c = document.createElement('canvas');
        c.width = bmp.width; c.height = bmp.height;
        const ctx = c.getContext('2d');
        if (supportsCanvasFilter) ctx.filter = FILTERS[S.filter];
        ctx.drawImage(bmp, 0, 0);
        bmp.close?.();
        S.shots[slot] = c; S.pendingRetake = null; placed++;
      } catch (e) { toast(`Couldn't read ${f.name}`); }
    }
    renderRail();
    if (placed && S.shots.every(Boolean)) go('customize');
  }

  /* ── Thumbnail rail (retake + drag reorder) ── */
  const rail = $('thumb-rail');
  let dragFrom = null;
  function renderRail() {
    const next = nextSlot();
    rail.innerHTML = '';
    S.shots.forEach((shot, i) => {
      const el = document.createElement(shot ? 'button' : 'div');
      el.className = 'thumb-slot' + (shot ? ' is-filled' : '') + (i === next ? ' is-next' : '');
      el.dataset.index = i;
      if (shot) {
        el.type = 'button';
        el.title = `Retake photo ${i + 1}`;
        el.setAttribute('aria-label', `Photo ${i + 1} — tap to retake, drag to reorder`);
        el.draggable = true;
        const img = new Image(); img.src = shot.toDataURL('image/jpeg', 0.6); img.alt = '';
        el.append(img);
        const ov = document.createElement('span'); ov.className = 'thumb-retake'; ov.textContent = '↻ Retake'; el.append(ov);
      } else {
        el.textContent = i === next ? 'Next' : `${i + 1}`;
      }
      const num = document.createElement('span'); num.className = 'thumb-num'; num.textContent = i + 1; el.append(num);
      rail.append(el);
    });
    updateShutter();
  }
  rail.addEventListener('click', (e) => {
    const el = e.target.closest('.thumb-slot.is-filled');
    if (!el) return;
    const i = Number(el.dataset.index);
    if (S.source === 'upload') { S.shots[i] = null; S.pendingRetake = i; renderRail(); upInput.click(); return; }
    S.pendingRetake = i; updateShutter(); shootSequence();
  });
  rail.addEventListener('dragstart', (e) => { const el = e.target.closest('.thumb-slot'); if (!el) return; dragFrom = Number(el.dataset.index); el.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; });
  rail.addEventListener('dragover', (e) => { if (dragFrom !== null) e.preventDefault(); });
  rail.addEventListener('drop', (e) => {
    const el = e.target.closest('.thumb-slot'); if (!el || dragFrom === null) return;
    const to = Number(el.dataset.index);
    [S.shots[dragFrom], S.shots[to]] = [S.shots[to], S.shots[dragFrom]];
    dragFrom = null; renderRail();
  });
  rail.addEventListener('dragend', () => { dragFrom = null; renderRail(); });

  /* ── Step 3: frame ── */
  const swatches = $('frame-swatches');
  SWATCHES.forEach((hex) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch'; b.style.background = hex; b.dataset.hex = hex;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-label', `Frame colour ${hex}`); b.setAttribute('aria-checked', String(hex === S.frame));
    swatches.append(b);
  });
  swatches.addEventListener('click', (e) => { const b = e.target.closest('.swatch'); if (b) setFrame(b.dataset.hex); });
  $('frame-color').addEventListener('input', (e) => setFrame(e.target.value));
  function setFrame(hex) {
    S.frame = hex; $('frame-color').value = hex;
    swatches.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.hex === hex)));
    renderPreview();
  }
  $('corner-radius').addEventListener('input', (e) => { S.radius = Number(e.target.value); renderPreview(); });

  /* ── Stickers ── */
  const packsEl = $('sticker-packs');
  Object.entries(PACKS).forEach(([name, emojis]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'booth-pack'; b.dataset.pack = name;
    b.innerHTML = `<span class="booth-pack-emoji">${emojis.slice(0, 3).join('')}</span><span>${name}</span>`;
    packsEl.append(b);
  });
  packsEl.addEventListener('click', (e) => { const b = e.target.closest('.booth-pack'); if (b) scatter(b.dataset.pack); });
  /** Scatter a pack along the strip's margins/gaps (relative coords: x,y in [0,1], size as fraction of width). */
  function scatter(name) {
    const emojis = PACKS[name];
    const g = geometry(L()), Lw = L().w, Lh = L().h;
    const spots = [];
    g.photos.forEach((p, i) => { // corners of every photo, alternating sides so stickers don't pile up
      const left = i % 2 === 0;
      spots.push({ x: left ? p.x : p.x + p.w, y: p.y + (i % 3) * 0.1 * p.h });
      spots.push({ x: left ? p.x + p.w : p.x, y: p.y + p.h - (i % 2) * 0.12 * p.h });
    });
    spots.push({ x: g.footer.x + 0.08 * g.footer.w, y: g.footer.y + 0.5 * g.footer.h }, { x: g.footer.x + 0.92 * g.footer.w, y: g.footer.y + 0.5 * g.footer.h });
    const rnd = (a) => (Math.random() - 0.5) * a;
    S.stickers = S.stickers.filter((s) => s.pack !== name);
    spots.slice(0, 8 + (count() > 4 ? 2 : 0)).forEach((sp, i) => {
      const cl = (v) => Math.min(0.94, Math.max(0.06, v));
      S.stickers.push({ pack: name, emoji: emojis[i % emojis.length], x: cl((sp.x + rnd(0.1)) / Lw), y: cl((sp.y + rnd(0.1)) / Lh), size: 0.1 + Math.random() * 0.04, rot: rnd(0.6) });
    });
    S.activePack = name; S.selected = -1;
    packsEl.querySelectorAll('.booth-pack').forEach((b) => b.classList.toggle('is-active', b.dataset.pack === name));
    syncStickerControls(); renderPreview();
  }
  function syncStickerControls() {
    const has = S.stickers.length > 0, sel = S.selected >= 0;
    $('btn-clear-stickers').disabled = !has;
    $('btn-remove-sticker').disabled = !sel;
    $('sticker-size').disabled = !sel;
    if (sel) $('sticker-size').value = Math.round(S.stickers[S.selected].size * 100);
    $('sticker-hint').textContent = sel ? 'Sticker selected — drag, resize or remove' : (has ? 'Drag stickers to move · tap to select' : 'Pick a pack to add stickers');
  }
  $('btn-clear-stickers').addEventListener('click', () => { S.stickers = []; S.selected = -1; S.activePack = null; packsEl.querySelectorAll('.booth-pack').forEach((b) => b.classList.remove('is-active')); syncStickerControls(); renderPreview(); });
  $('btn-remove-sticker').addEventListener('click', removeSelected);
  function removeSelected() { if (S.selected < 0) return; S.stickers.splice(S.selected, 1); S.selected = -1; syncStickerControls(); renderPreview(); }
  $('sticker-size').addEventListener('input', (e) => { if (S.selected >= 0) { S.stickers[S.selected].size = Number(e.target.value) / 100; renderPreview(); } });

  // Drag / select on the preview canvas (Pointer Events; coordinates are relative so they map 1:1 to export)
  const canvas = $('strip-canvas');
  let drag = null;
  const rel = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
  function hit(pt) { // topmost first; hit box ≥ 44 css px for touch
    const r = canvas.getBoundingClientRect(), minHalf = 22 / r.width;
    for (let i = S.stickers.length - 1; i >= 0; i--) {
      const s = S.stickers[i], half = Math.max(s.size / 2, minHalf), halfY = half * (r.width / r.height);
      if (Math.abs(pt.x - s.x) <= half && Math.abs(pt.y - s.y) <= halfY) return i;
    }
    return -1;
  }
  canvas.addEventListener('pointerdown', (e) => {
    const pt = rel(e), i = hit(pt);
    S.selected = i;
    if (i >= 0) { drag = { i, dx: S.stickers[i].x - pt.x, dy: S.stickers[i].y - pt.y }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging'); }
    syncStickerControls(); renderPreview();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = rel(e), s = S.stickers[drag.i];
    s.x = Math.min(1, Math.max(0, pt.x + drag.dx)); s.y = Math.min(1, Math.max(0, pt.y + drag.dy));
    renderPreview();
  });
  ['pointerup', 'pointercancel'].forEach((ev) => canvas.addEventListener(ev, () => { drag = null; canvas.classList.remove('is-dragging'); }));
  canvas.addEventListener('wheel', (e) => { if (S.selected < 0) return; e.preventDefault(); const s = S.stickers[S.selected]; s.size = Math.min(0.22, Math.max(0.05, s.size - Math.sign(e.deltaY) * 0.01)); syncStickerControls(); renderPreview(); }, { passive: false });
  canvas.addEventListener('keydown', (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && S.selected >= 0) { e.preventDefault(); removeSelected(); } });

  /* ── Logo ── */
  $('logo-input').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f || !f.type.startsWith('image/')) return;
    try {
      const img = new Image(); img.decoding = 'async';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = URL.createObjectURL(f); });
      S.logo = img; $('logo-btn-label').textContent = 'Replace logo'; $('btn-remove-logo').hidden = false; $('logo-size').disabled = false; renderPreview();
    } catch (err) { toast("Couldn't read that image"); }
  });
  $('btn-remove-logo').addEventListener('click', () => { S.logo = null; $('logo-btn-label').textContent = 'Add logo'; $('btn-remove-logo').hidden = true; $('logo-size').disabled = true; renderPreview(); });
  $('logo-size').addEventListener('input', (e) => { S.logoSize = Number(e.target.value); renderPreview(); });

  /* ── Caption ── */
  const fmtDate = () => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
  const fmtDateTime = () => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date());
  const captionText = () => S.captionMode === 'date' ? fmtDate() : S.captionMode === 'datetime' ? fmtDateTime() : S.caption.trim();
  bindSegmented($('seg-caption-preset'), (v) => {
    S.captionMode = v;
    const input = $('caption-text');
    input.disabled = v !== 'custom';
    input.placeholder = v === 'custom' ? "e.g. Priya's birthday · Goa trip · 2026" : captionText();
    renderPreview();
  });
  $('caption-text').addEventListener('input', (e) => { S.caption = e.target.value; renderPreview(); });
  bindSegmented($('seg-caption-font'), (v) => { S.font = v; renderPreview(); });
  $('caption-color').addEventListener('input', (e) => { S.captionColor = e.target.value; S.captionAuto = false; $('caption-auto').checked = false; renderPreview(); });
  $('caption-auto').addEventListener('change', (e) => { S.captionAuto = e.target.checked; renderPreview(); });
  $('brand-toggle').addEventListener('change', (e) => { S.brand = e.target.checked; renderPreview(); });
  const luminance = (hex) => { const n = parseInt(hex.slice(1), 16); const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const inkColor = () => (S.captionAuto ? (luminance(S.frame) > 0.4 ? '#222222' : '#f5f5f5') : S.captionColor);

  /* ── Render (one function for preview + export; `px` = pixels per inch) ── */
  function render(ctx, px) {
    const lay = L(), g = geometry(lay), W = lay.w * px, H = lay.h * px;
    ctx.save();
    ctx.fillStyle = S.frame; ctx.fillRect(0, 0, W, H);
    const radius = (S.radius / 40) * 0.12 * px; // slider 0–40 → 0–0.12 in
    g.photos.forEach((p, i) => {
      const x = p.x * px, y = p.y * px, w = p.w * px, h = p.h * px, shot = S.shots[i];
      ctx.save();
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, radius) : ctx.rect(x, y, w, h); ctx.clip();
      if (shot) { // cover-crop from the centre
        const sr = shot.width / shot.height, dr = w / h;
        const sw = sr > dr ? shot.height * dr : shot.width, sh = sr > dr ? shot.height : shot.width / dr;
        ctx.drawImage(shot, (shot.width - sw) / 2, (shot.height - sh) / 2, sw, sh, x, y, w, h);
      } else { ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x, y, w, h); }
      ctx.restore();
    });
    // Footer: logo above caption above brand line, vertically centred as a block
    const f = g.footer, fx = f.x * px, fy = f.y * px, fw = f.w * px, fh = f.h * px, text = captionText();
    const capSize = Math.min(fh * 0.28, px * 0.22), brandSize = px * 0.085, gapPx = px * 0.05;
    const logoH = S.logo ? Math.min(fh * (S.logoSize / 100), fh - (text ? capSize + gapPx : 0) - (S.brand ? brandSize + gapPx : 0)) : 0;
    const block = (logoH ? logoH + gapPx : 0) + (text ? capSize + gapPx : 0) + (S.brand ? brandSize : 0);
    let cy = fy + (fh - block) / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = inkColor();
    if (S.logo && logoH > 0) {
      const lw = Math.min(fw * 0.9, logoH * (S.logo.naturalWidth / S.logo.naturalHeight)), lh = lw / (S.logo.naturalWidth / S.logo.naturalHeight);
      ctx.drawImage(S.logo, fx + (fw - lw) / 2, cy + (logoH - lh) / 2, lw, lh); cy += logoH + gapPx;
    }
    if (text) { ctx.font = `${S.font === 'hand' ? '' : '500 '}${capSize}px ${FONTS[S.font]}`; ctx.fillText(fit(ctx, text, fw * 0.92), fx + fw / 2, cy); cy += capSize + gapPx; }
    if (S.brand) { ctx.globalAlpha = 0.6; ctx.font = `500 ${brandSize}px ${FONTS.sans}`; ctx.fillText('toolity.in', fx + fw / 2, cy); ctx.globalAlpha = 1; }
    // Stickers (relative coords → absolute); emoji drawn with the system emoji font, same as the DOM
    ctx.textBaseline = 'middle';
    S.stickers.forEach((s, i) => {
      const size = s.size * W;
      ctx.save(); ctx.translate(s.x * W, s.y * H); ctx.rotate(s.rot);
      ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText(s.emoji, 0, 0);
      if (i === S.selected && ctx.canvas === canvas) { ctx.setLineDash([4, 4]); ctx.strokeStyle = '#f4511e'; ctx.lineWidth = 2; ctx.strokeRect(-size * 0.6, -size * 0.6, size * 1.2, size * 1.2); }
      ctx.restore();
    });
    ctx.restore();
  }
  function fit(ctx, text, maxW) { let t = text; while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -2) + '…'; return t; }
  function renderPreview() {
    if (S.step !== 'customize') return;
    const lay = L(), wrap = canvas.parentElement;
    // Width-driven: fit the pane width, cap by 72vh and a sane max (the pane's own height depends on the canvas, so never read it)
    const maxH = window.innerHeight * 0.72, maxW = Math.max(160, wrap.clientWidth - 4);
    const cssW = Math.min(maxW, maxH * lay.w / lay.h, 300 * lay.w / 2);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = cssW + 'px'; canvas.style.height = (cssW * lay.h / lay.w) + 'px';
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssW * lay.h / lay.w * dpr);
    render(canvas.getContext('2d'), canvas.width / lay.w);
  }
  addEventListener('resize', renderPreview);

  /* ── Export ── */
  function exportBlob(type) {
    const lay = L(), c = document.createElement('canvas');
    c.width = lay.w * DPI; c.height = lay.h * DPI;
    const sel = S.selected; S.selected = -1; render(c.getContext('2d'), DPI); S.selected = sel;
    return new Promise((res) => c.toBlob(res, type, 0.92));
  }
  const fileName = (ext) => `photo-strip-${S.layout}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  async function download(type, ext) {
    const b = await exportBlob(type);
    if (!b) return toast('Export failed');
    downloadBlob(b, fileName(ext)); toast(`Downloaded ${ext.toUpperCase()} · ${L().w * DPI}×${L().h * DPI}`);
  }
  $('opt-dl-png').addEventListener('click', () => download('image/png', 'png'));
  $('opt-dl-jpg').addEventListener('click', () => download('image/jpeg', 'jpg'));
  $('btn-copy').addEventListener('click', async () => copyBlob(await exportBlob('image/png'), 'Strip copied to clipboard'));
  bindDropdown($('download-dropdown-wrap'));

  /* ── Reset (everything: layout, photos, decorations, settings) ── */
  function reset() {
    stopCamera();
    Object.assign(S, { source: 'camera', layout: 'strip4', filter: 'none', shots: [], busy: false, pendingRetake: null, frame: '#ffffff', radius: 8, stickers: [], selected: -1, activePack: null, logo: null, logoSize: 45, captionMode: 'custom', caption: '', font: 'sans', captionColor: '#222222', captionAuto: true, brand: false });
    document.querySelectorAll('.booth-layout-card').forEach((b) => b.classList.remove('is-selected'));
    [['seg-source', 'camera'], ['seg-filter', 'none'], ['seg-caption-preset', 'custom'], ['seg-caption-font', 'sans']].forEach(([id, v]) => $(id).querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === v)));
    video.style.filter = 'none';
    $('frame-color').value = '#ffffff'; swatches.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.hex === '#ffffff')));
    $('corner-radius').value = 8; $('sticker-size').value = 10; $('logo-size').value = 45;
    packsEl.querySelectorAll('.booth-pack').forEach((b) => b.classList.remove('is-active'));
    $('logo-btn-label').textContent = 'Add logo'; $('btn-remove-logo').hidden = true; $('logo-size').disabled = true;
    $('caption-text').value = ''; $('caption-text').disabled = false; $('caption-text').placeholder = "e.g. Priya's birthday · Goa trip · 2026";
    $('caption-color').value = '#222222'; $('caption-auto').checked = true; $('brand-toggle').checked = false;
    $('opt-countdown').value = '3'; $('opt-res').value = '720'; $('opt-auto').checked = true; $('opt-mirror').checked = true; $('opt-sound').checked = true; summarize();
    syncStickerControls(); go('layout'); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary: () => { if (S.step === 'shoot') shootSequence(); else if (S.step === 'customize') download('image/png', 'png'); }, reset });
  addEventListener('pagehide', stopCamera);
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.step === 'shoot') stopCamera(); else if (!document.hidden && S.step === 'shoot' && S.source === 'camera') startCamera(); });

  // Expose for the automated test only
  window.__booth = { S, go, exportBlob, renderPreview };
  syncStickerControls(); summarize(); go('layout');
})();

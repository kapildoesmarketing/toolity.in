/* Camera — Toolity.in. getUserMedia preview → canvas snapshots (JPG/PNG/WebP) or MediaRecorder clips; front/back switch, timer,
 * mirror, grid, resolution. Shots live only in page memory until downloaded. Uses /scripts/tool-common.js helpers. */
(function () {
  'use strict';
  const { copyBlob, downloadBlob, formatBytes, formatTime, bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const vid = $('cam-video'), btn = $('btn-compress'), label = $('btn-compress-label'), rail = $('cam-rail'), outImg = $('output-img'), outV = $('output-video');
  const panel = document.querySelector('.tool-settings-panel');
  const S = { stream: null, mic: null, facing: 'user', mode: 'photo', rec: null, shots: [], sel: -1, busy: false };
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const showError = (msg) => { const el = $('input-error'); el.hidden = !msg; el.querySelector('span').textContent = msg || ''; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const summary = () => { $('settings-summary').textContent = [$('opt-timer').value === '0' ? 'No timer' : `${$('opt-timer').value} s timer`, `${$('opt-res').value === '2160' ? '4K' : $('opt-res').value + 'p'}`, $('opt-mirror').checked ? 'Mirrored' : 'Not mirrored'].join(' · '); };
  function paintButton() {
    const icon = btn.querySelector('iconify-icon');
    if (!S.stream) { label.textContent = 'Start camera'; icon.setAttribute('icon', 'lucide:camera'); }
    else if (S.mode === 'photo') { label.textContent = 'Take photo'; icon.setAttribute('icon', 'lucide:aperture'); }
    else { label.textContent = S.rec ? 'Stop recording' : 'Start recording'; icon.setAttribute('icon', S.rec ? 'lucide:square' : 'lucide:circle'); }
  }
  function view() { vid.classList.toggle('cam-mirror', $('opt-mirror').checked && S.facing === 'user'); $('cam-grid').hidden = !$('opt-grid').checked || !S.stream; }
  function stop() { [S.stream, S.mic].forEach((s) => s && s.getTracks().forEach((t) => t.stop())); S.stream = S.mic = null; vid.srcObject = null; vid.classList.remove('is-shown'); }
  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return showError('This browser cannot open the camera. Use a recent Chrome, Edge, Firefox or Safari over https.');
    const h = Number($('opt-res').value);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: S.facing, width: { ideal: Math.round((h * 16) / 9) }, height: { ideal: h } }, audio: false });
      stop(); S.stream = s; vid.srcObject = s; await Promise.race([vid.play(), sleep(3000)]); vid.classList.add('is-shown'); showError('');
      const t = s.getVideoTracks()[0].getSettings(); $('source-badge').textContent = `${t.width || vid.videoWidth} × ${t.height || vid.videoHeight}${t.frameRate ? ` · ${Math.round(t.frameRate)} fps` : ''}`;
      $('result-badge').textContent = 'Camera on';
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); $('btn-flip').disabled = cams.length < 2;
    } catch (e) {
      console.warn(e);
      showError(e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow it from the padlock icon in the address bar, then try again.' : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'No camera was found (or it cannot do that resolution — try 720p in Settings).' : e.name === 'NotReadableError' ? 'The camera is busy in another app or tab. Close it and try again.' : `The camera could not start (${e.name || e.message}).`);
    }
    view(); paintButton();
  }
  function addShot(shot) {
    S.shots.push(shot); select(S.shots.length - 1);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'thumb-slot is-filled'; b.dataset.i = S.shots.length - 1; b.setAttribute('aria-label', `${shot.kind} ${S.shots.length}`);
    b.innerHTML = shot.kind === 'photo' ? `<img src="${shot.url}" alt="">` : '<iconify-icon icon="lucide:film" width="22" height="22"></iconify-icon>';
    b.insertAdjacentHTML('beforeend', `<span class="thumb-num">${shot.kind === 'video' ? formatTime(shot.dur) : S.shots.length}</span>`);
    rail.appendChild(b);
  }
  function select(i) {
    S.sel = i; const s = S.shots[i]; if (!s) return;
    outImg.classList.toggle('is-shown', s.kind === 'photo'); outV.classList.toggle('is-shown', s.kind === 'video');
    if (s.kind === 'photo') outImg.src = s.url; else { outV.src = s.url; }
    rail.querySelectorAll('.thumb-slot').forEach((el) => el.classList.toggle('is-next', Number(el.dataset.i) === i));
    $('output-empty').hidden = true; $('btn-download').disabled = false; $('btn-copy').disabled = s.kind !== 'photo';
    $('output-badge').textContent = `${s.kind === 'photo' ? `${s.w} × ${s.h}` : formatTime(s.dur)} · ${formatBytes(s.blob.size)} · ${S.shots.length} shot${S.shots.length > 1 ? 's' : ''}`;
  }
  rail.addEventListener('click', (e) => { const b = e.target.closest('.thumb-slot'); if (b) select(Number(b.dataset.i)); });
  async function countdown() {
    const n = Number($('opt-timer').value), el = $('cam-count'); if (!n) return;
    el.hidden = false; for (let i = n; i > 0; i--) { el.textContent = i; await sleep(1000); } el.hidden = true;
  }
  async function photo() {
    await countdown(); if (!S.stream) return;
    const w = vid.videoWidth, h = vid.videoHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); if ($('opt-mirror').checked && S.facing === 'user') { x.translate(w, 0); x.scale(-1, 1); } x.drawImage(vid, 0, 0, w, h);
    const type = $('opt-format').value, blob = await new Promise((r) => c.toBlob(r, type, 0.92));
    $('cam-flash').classList.remove('is-on'); void $('cam-flash').offsetWidth; $('cam-flash').classList.add('is-on');
    addShot({ kind: 'photo', blob, url: URL.createObjectURL(blob), w, h, ext: EXT[blob.type] || 'png' });
  }
  async function record() {
    if (S.rec) { S.rec.stop(); return; }
    await countdown(); if (!S.stream) return;
    const tracks = [...S.stream.getVideoTracks()];
    if ($('opt-audio').checked) { try { S.mic = S.mic || await navigator.mediaDevices.getUserMedia({ audio: true }); tracks.push(...S.mic.getAudioTracks()); } catch (e) { toast('Microphone blocked — recording without sound'); } }
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
    if (!mime) return showError('This browser cannot record video.');
    const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime }), chunks = [], t0 = performance.now();
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const iv = setInterval(() => { $('cam-rec-time').textContent = formatTime((performance.now() - t0) / 1000); }, 250);
    rec.onstop = () => {
      clearInterval(iv); S.rec = null; $('cam-rec').hidden = true; paintButton();
      const blob = new Blob(chunks, { type: mime.split(';')[0] });
      if (blob.size) addShot({ kind: 'video', blob, url: URL.createObjectURL(blob), dur: (performance.now() - t0) / 1000, ext: mime.includes('mp4') ? 'mp4' : 'webm' });
    };
    S.rec = rec; rec.start(500); $('cam-rec-time').textContent = '0:00'; $('cam-rec').hidden = false; paintButton();
  }
  async function primary() {
    if (S.busy) return; S.busy = true; btn.disabled = true;
    try { if (!S.stream) await start(); else if (S.mode === 'photo') await photo(); else await record(); }
    finally { S.busy = false; btn.disabled = false; }
  }
  btn.addEventListener('click', primary);
  bindSegmented($('cam-mode'), (v) => { if (S.rec) S.rec.stop(); S.mode = v; paintButton(); });
  $('btn-flip').addEventListener('click', () => { if (S.rec) return toast('Stop recording first'); S.facing = S.facing === 'user' ? 'environment' : 'user'; start(); });
  if (panel) panel.addEventListener('input', (e) => { summary(); view(); if (e.target.id === 'opt-res' && S.stream && !S.rec) start(); });
  $('btn-download').addEventListener('click', () => { const s = S.shots[S.sel]; if (s) downloadBlob(s.blob, `toolity-${s.kind}-${String(S.sel + 1).padStart(2, '0')}.${s.ext}`); });
  $('btn-copy').addEventListener('click', async () => {
    const s = S.shots[S.sel]; if (!s || s.kind !== 'photo') return;
    if (s.blob.type === 'image/png') return copyBlob(s.blob);
    const bmp = await createImageBitmap(s.blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0);
    c.toBlob((b) => copyBlob(b, 'Photo copied (PNG)'), 'image/png');
  });
  function reset() {
    if (S.rec) { S.rec.onstop = null; S.rec.stop(); S.rec = null; }
    stop(); S.shots.forEach((s) => URL.revokeObjectURL(s.url)); S.shots = []; S.sel = -1; S.facing = 'user'; S.mode = 'photo';
    rail.innerHTML = ''; [outImg, outV].forEach((el) => { el.classList.remove('is-shown'); el.removeAttribute('src'); });
    $('cam-mode').querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'photo'));
    if (panel) panel.querySelectorAll('input, select').forEach((el) => { if (el.type === 'checkbox') el.checked = el.defaultChecked; else if (el.tagName === 'SELECT') el.value = ([...el.options].find((o) => o.defaultSelected) || el.options[0]).value; });
    ['cam-rec', 'cam-count'].forEach((id) => { $(id).hidden = true; });
    $('output-empty').hidden = false; $('btn-download').disabled = true; $('btn-copy').disabled = true; $('btn-flip').disabled = true;
    $('source-badge').textContent = 'Off'; $('output-badge').textContent = 'None yet'; $('result-badge').textContent = 'Camera off';
    showError(''); summary(); view(); paintButton(); toast('Reset');
  }
  $('btn-reset').addEventListener('click', reset);
  bindShortcuts({ primary }); // no Esc-to-reset here: one stray key would wipe every unsaved shot
  window.addEventListener('pagehide', stop);
  summary(); view();
  window.__cam = { S, start, photo, record, reset };
})();

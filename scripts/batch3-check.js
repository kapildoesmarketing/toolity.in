#!/usr/bin/env node
// Batch 3 check (rule 50): real pages in headless Chrome, synthetic fixtures built in-page, asserts on decoded output.
// Usage: python3 -m http.server 3011 &  then  node scripts/batch3-check.js   (ONLY=slug for one tool · BASE=http://localhost:3000/)
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));
const BASE = process.env.BASE || 'http://localhost:3011/';

fs.mkdirSync('scratch', { recursive: true });
const ff = (out, args) => { if (!fs.existsSync(out)) execSync(`ffmpeg -loglevel error -y -f lavfi -i testsrc=size=320x240:rate=25 -f lavfi -i sine=frequency=440:sample_rate=48000 -t 4 ${args} ${out}`); };
try {
  ff('scratch/clip4.mp4', '-c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart');
  // green-screen fixture: solid green with a red square in the middle (for the chroma-key path)
  if (!fs.existsSync('scratch/green.mp4')) execSync(`ffmpeg -loglevel error -y -f lavfi -i "color=c=0x00ff00:size=320x240:rate=25,drawbox=x=110:y=70:w=100:h=100:color=red:t=fill" -t 2 -c:v libx264 -pix_fmt yuv420p scratch/green.mp4`);
} catch (e) { console.log('ffmpeg fixture skipped:', e.message.split('\n')[0]); }

const HELPERS = `
  const tick = (ms = 200) => new Promise(r => setTimeout(r, ms));
  const f = []; const A = (c, m) => { if (!c) f.push(m); };
  const $ = (id) => document.getElementById(id);
  const waitFor = async (cond, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (cond()) return true; await tick(100); } return false; };
  const set = (id, v) => { const el = $(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const feed = (files, input = 'file-input') => { const dt = new DataTransfer(); [].concat(files).forEach(x => dt.items.add(x)); $(input).files = dt.files; $(input).dispatchEvent(new Event('change', { bubbles: true })); };
  const busy = () => $('tool-card').classList.contains('is-busy');
  const go = async (T, ms = 60000) => { $('btn-compress').click(); await tick(50); A(await waitFor(() => !busy() && (T.S.out || !$('input-error').hidden), ms), 'no output / no error within ' + ms + 'ms: ' + $('result-badge').textContent); if (!$('input-error').hidden) f.push('error shown: ' + $('input-error').textContent.trim()); };
  const png = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#f00'; x.fillRect(0, 0, w, h); return new Promise(r => c.toBlob(b => r(new File([b], 'fixture.png', { type: 'image/png' })), 'image/png')); };
  const RATE = 48000;
  const buffer = (sec, fn, ch = 1) => { const b = new AudioBuffer({ numberOfChannels: ch, length: Math.round(sec * RATE), sampleRate: RATE }); for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = fn(i / RATE, i, c); } return b; };
  const wavFile = (b, name = 'fixture.wav') => new File([window.ToolityAudio.wav(b)], name, { type: 'audio/wav' });
  const loadAudio = async (T, b) => { feed(wavFile(b)); A(await waitFor(() => T.S.buf), 'audio did not decode'); };
  const imgOf = (blob) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = URL.createObjectURL(blob); });
  const pixel = async (blob, x, y) => { const i = await imgOf(blob), c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return [...g.getImageData(x, y, 1, 1).data]; };
  const four = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  const videoMeta = (blob) => new Promise(r => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { if (!isFinite(v.duration)) { v.onseeked = () => r({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }); v.currentTime = 1e9; } else r({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }); }; v.onerror = () => r(null); v.src = URL.createObjectURL(blob); });
`;

const CASES = [
  ['media/shape-crop/', `
    const T = window.__sc.T, C = window.__sc.C; feed(await png(400, 300)); A(await waitFor(() => T.S.canvas), 'no decode'); await tick(400);
    A(!$('crop-box').hidden, 'crop box hidden'); A(Math.round(C.w) === 300 && Math.round(C.h) === 300 && Math.round(C.x) === 50, 'square box centred: ' + JSON.stringify(C));
    A(await waitFor(() => T.S.out, 5000), 'auto run'); A(T.S.out.type === 'image/png' && T.S.outW === 300 && T.S.outH === 300, 'png 300: ' + T.S.out.type + ' ' + T.S.outW);
    let p = await pixel(T.S.out, 2, 2); A(p[3] === 0, 'corner transparent (circle): ' + p); p = await pixel(T.S.out, 150, 150); A(p[0] > 240 && p[3] === 255, 'centre red opaque: ' + p);
    set('opt-size', '512'); A(await waitFor(() => T.S.outW === 512, 5000), 'output size 512: ' + T.S.outW);
    set('opt-border', 20); set('opt-border-color', '#0000ff'); await tick(700); p = await pixel(T.S.out, 256, 6); A(p[2] > 200 && p[0] < 60, 'top-centre is blue border: ' + p);
    set('opt-border', 0); set('opt-feather', 30); await tick(700); p = await pixel(T.S.out, 256, 4); A(p[3] > 0 && p[3] < 250, 'feathered edge semi-transparent: ' + p[3]);
    set('opt-feather', 0); set('opt-shape', 'rounded'); await tick(300); A(!$('opt-radius').closest('.control-item').hidden && $('opt-path').closest('.control-item').hidden, 'rounded shows radius only');
    set('opt-radius', 0); await tick(700); p = await pixel(T.S.out, 1, 1); A(p[3] === 255, 'rounded r=0 → square corner opaque: ' + p);
    set('opt-shape', 'heart'); await tick(700); p = await pixel(T.S.out, 256, 500); A(p[3] === 0, 'heart: below the point is transparent'); p = await pixel(T.S.out, 256, 300); A(p[3] === 255, 'heart centre opaque');
    set('opt-shape', 'custom'); await tick(300); A(!$('opt-path').closest('.control-item').hidden, 'custom shows path'); $('btn-compress').click(); await tick(200); A(!$('input-error').hidden, 'empty path validation');
    set('opt-path', 'M 10 10 H 90 V 90 H 10 Z'); await tick(700); p = await pixel(T.S.out, 8, 8); A(p[3] === 255 && $('input-error').hidden, 'custom square fills box: ' + p + ' ' + $('input-error').textContent);
    set('opt-format', 'image/jpeg'); await tick(700); A(T.S.out.type === 'image/jpeg', 'jpg out'); set('opt-shape', 'circle'); await tick(700); p = await pixel(T.S.out, 2, 2); A(p[0] > 240 && p[1] > 240 && p[2] > 240, 'jpg corner flattened white: ' + p);
    $('btn-reset').click(); await tick(); A(!T.S.out && $('crop-box').hidden && $('opt-shape').value === 'circle' && !$('output-empty').hidden, 'reset');`],
  ['media/video-to-sticker/', `
    const T = window.__vts.T, C = window.__vts.C, LIM = window.__vts.LIMIT;
    const mp4 = new File([await (await fetch('/scratch/clip4.mp4')).arrayBuffer()], 'clip.mp4', { type: 'video/mp4' });
    feed(mp4); A(await waitFor(() => T.S.file && T.S.dur > 3.9), 'mp4 load'); await tick(400);
    A(!$('crop-box').hidden && C.s === 240 && C.x === 40, 'square box centred: ' + JSON.stringify(C));
    A(Math.abs(window.__vts.R.to - 3) < 0.01, 'telegram preselects 3 s: ' + window.__vts.R.to);
    // Telegram: VP9 WebM, 512², ≤ 3 s, ≤ 256 KB
    await go(T, 60000); A(T.S.out && T.S.out.type.includes('webm'), 'webm out: ' + (T.S.out && T.S.out.type)); A(T.S.out.size <= LIM.telegram.bytes, 'size ' + T.S.out.size);
    let m = await videoMeta(T.S.out); A(m && m.w === 512 && m.h === 512, 'telegram 512: ' + JSON.stringify(m)); A(m && m.dur <= 3.3, 'telegram ≤3 s: ' + (m && m.dur));
    A($('vts-verdict').classList.contains('is-ok') && /Telegram-ready/.test($('vts-verdict').textContent), 'verdict: ' + $('vts-verdict').textContent);
    A($('output-video').classList.contains('is-shown') && !$('output-img').classList.contains('is-shown'), 'video preview shown');
    // speed-fit off + 4 s range → validation
    window.__vts.R.set(0, 4); set('opt-speedfit', false); $('btn-compress').click(); await tick(200); A(!$('input-error').hidden && /allows 3 s/.test($('input-error').textContent), 'speed-fit validation: ' + $('input-error').textContent);
    set('opt-speedfit', true); window.__vts.R.set(0, 1.5);
    // WhatsApp: animated WebP with ANIM/ANMF, 512², ≤ 500 KB
    set('opt-platform', 'whatsapp'); set('opt-fps', '12'); A(!$('opt-chroma').closest('.control-item').hidden, 'chroma option visible for whatsapp');
    await go(T, 90000); A(T.S.out && T.S.out.type === 'image/webp', 'webp out: ' + (T.S.out && T.S.out.type)); A(T.S.out.size <= LIM.whatsapp.bytes, 'wa size ' + T.S.out.size);
    const inf = await window.ToolityWebP.info(T.S.out); A(inf.animated && inf.width === 512 && inf.height === 512 && inf.frames >= 15 && inf.frames <= 20, 'animated webp 1.5s@12fps≈18 frames: ' + JSON.stringify(inf));
    if (window.ImageDecoder) { const d = new ImageDecoder({ data: await T.S.out.arrayBuffer(), type: 'image/webp' }); await d.tracks.ready; A(d.tracks.selectedTrack.frameCount === inf.frames, 'decoder frameCount ' + d.tracks.selectedTrack.frameCount); d.close(); }
    A($('output-img').classList.contains('is-shown') && !$('output-video').classList.contains('is-shown'), 'img preview shown');
    // Static: single WebP ≤ 100 KB
    set('opt-platform', 'static'); await go(T, 20000); const si = await window.ToolityWebP.info(T.S.out); A(!si.animated && T.S.out.size <= LIM.static.bytes, 'static webp: ' + JSON.stringify(si) + ' ' + T.S.out.size);
    // Chroma key on the green clip → corner transparent, centre red
    $('btn-reset').click(); await tick(300); A(!T.S.out && $('crop-box').hidden && $('opt-platform').value === 'telegram', 'reset');
    feed(new File([await (await fetch('/scratch/green.mp4')).arrayBuffer()], 'green.mp4', { type: 'video/mp4' })); A(await waitFor(() => T.S.file && T.S.dur > 1.5), 'green load'); await tick(400);
    set('opt-platform', 'static'); set('opt-chroma', true); await go(T, 20000);
    let p = await pixel(T.S.out, 4, 4); A(p[3] === 0, 'keyed corner transparent: ' + p); p = await pixel(T.S.out, 256, 256); A(p[0] > 180 && p[1] < 90 && p[3] > 200, 'centre red kept: ' + p);`],
  ['media/chat-mockup/', `
    A(await waitFor(() => window.__cm, 8000), 'mount'); const api = window.__cm.api, list = window.__cm.list;
    A($('mockup-stage').classList.contains('is-shown') && $('mockup-stage').querySelector('.mk.p-whatsapp'), 'live preview rendered: ' + $('mockup-stage').innerHTML.slice(0, 80));
    A(list.children.length === 2, 'two seed rows');
    set('ct-name', 'Priya'); const rows = () => [...list.children];
    rows()[0].querySelector('.mk-text').value = 'Hey 👋'; rows()[0].querySelector('.mk-text').dispatchEvent(new Event('input', { bubbles: true }));
    rows()[1].querySelector('.mk-text').value = 'Hi! https://toolity.in #tools'; rows()[1].querySelector('.mk-text').dispatchEvent(new Event('input', { bubbles: true }));
    rows()[1].querySelector('.mk-react').value = '❤️'; rows()[1].querySelector('.mk-react').dispatchEvent(new Event('change', { bubbles: true }));
    await tick(400); const st = $('mockup-stage');
    A(st.querySelectorAll('.mk-m').length === 2 && st.querySelector('.mk-m.them .mk-txt').textContent.includes('Hey'), 'bubbles render');
    A(st.querySelector('.mk-m.me .mk-tick.is-read'), 'whatsapp read ticks'); A(st.querySelector('.mk-m.me .mk-react').textContent === '❤️', 'reaction'); A(st.querySelectorAll('.mk-link').length === 2, 'linkify url + hashtag: ' + st.querySelectorAll('.mk-link').length);
    A(st.querySelector('.mk-header b').textContent === 'Priya' && st.querySelector('.mk-statusbar') && st.querySelector('.mk-credit'), 'header/statusbar/credit');
    // add a voice note, reorder, delete
    $('btn-add-msg').click(); await tick(200); A(rows().length === 3 && rows()[2].querySelector('.mk-side').value === 'them', 'add alternates sender');
    set(rows()[2].querySelector('.mk-type').id || (rows()[2].querySelector('.mk-type').id = 'tmp-type'), 'voice'); await tick(300); A(st.querySelector('.mk-voice .mk-wave') && st.querySelector('.mk-dur').textContent === '0:14', 'voice bubble');
    rows()[2].querySelector('.mk-up').click(); await tick(300); A(rows()[1].querySelector('.mk-type').value === 'voice', 'move up');
    rows()[1].querySelector('.mk-del').click(); await tick(300); A(rows().length === 2 && !st.querySelector('.mk-voice'), 'delete');
    // platforms
    set('opt-platform', 'imessage'); await tick(300); A(st.querySelector('.mk.p-imessage') && st.querySelector('.mk-label') && /Read/.test(st.querySelector('.mk-label').textContent), 'imessage Read label');
    set('opt-platform', 'discord'); await tick(300); A(st.querySelector('.mk.p-discord .mk-l') && rows()[1].querySelector('.mk-status').hidden, 'discord linear + status hidden');
    set('opt-platform', 'slack'); set('opt-theme', 'dark'); await tick(300); A(st.querySelector('.mk.p-slack.dark .mk-l-head b'), 'slack dark');
    set('opt-platform', 'telegram'); set('opt-typing', true); set('opt-divider', 'Today'); await tick(300); A(st.querySelector('.mk-typing') && st.querySelector('.mk-divider span').textContent === 'Today', 'typing + divider');
    set('opt-credit', false); await tick(300); A(!st.querySelector('.mk-credit'), 'credit removable'); set('opt-credit', true);
    // export @2x → PNG 780 wide, non-white pixel in a bubble
    set('opt-platform', 'whatsapp'); set('opt-theme', 'light'); await tick(300); await go(api, 30000);
    A(api.S.out && api.S.out.type === 'image/png' && api.S.outW === 780, 'png 2x: ' + (api.S.out && api.S.out.type) + ' ' + api.S.outW);
    const img = await imgOf(api.S.out); A(img.naturalHeight > 600, 'export height ' + img.naturalHeight);
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const me = st.querySelector('.mk-m.me .mk-b').getBoundingClientRect(), root = st.firstElementChild.getBoundingClientRect(); const px = g.getImageData(Math.round((me.left - root.left + 10) * 2), Math.round((me.top - root.top + 10) * 2), 1, 1).data;
    A(px[1] > 230 && px[0] > 200 && px[2] < 230, 'me bubble is WhatsApp green in the PNG: ' + [...px]);
    set('opt-scale', '3'); await tick(300); await go(api, 30000); A(api.S.outW === 1170, '3x width ' + api.S.outW);
    $('btn-reset').click(); await tick(300); A(list.children.length === 2 && $('ct-name').value === '' && $('opt-platform').value === 'whatsapp' && st.classList.contains('is-shown'), 'reset reseeds + still previews');`],
];

(async () => {
  const only = process.env.ONLY;
  const port = 9700 + Math.floor(Math.random() * 100);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500); try { await getJson(`http://127.0.0.1:${port}/json/version`); break; } catch (e) {} }
  const run = async (path, expr) => {
    const t = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
    let id = 0; const pending = {}; const errs = [];
    const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description?.split('\n')[0] || d.params.exceptionDetails.text); };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${BASE}${path}` }); await sleep(2000);
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${HELPERS} try { ${expr} } catch (e) { f.push('threw: ' + (e && e.message || e)); } return f; })()`, returnByValue: true, awaitPromise: true, userGesture: true, timeout: 240000 });
    ws.close(); await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    return (r?.result?.value || ['eval failed: ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r)]).concat(errs.map(e => 'JS error: ' + e));
  };
  let fails = 0, n = 0;
  for (const [path, expr] of CASES) {
    const slug = path.split('/')[1]; if (only && slug !== only) continue; n++;
    const f = await run(path, expr);
    console.log((f.length ? '✗ ' : '✓ ') + slug + (f.length ? '\n    ' + f.join('\n    ') : ''));
    if (f.length) fails++;
  }
  chrome.kill();
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} batch-3 tools passing`);
  process.exit(fails ? 1 : 0);
})();

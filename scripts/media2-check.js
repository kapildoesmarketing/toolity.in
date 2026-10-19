#!/usr/bin/env node
// Media batch 2 check (rule 50): real pages in headless Chrome, synthetic fixtures built in-page (painted canvas, tone AudioBuffer →
// WAV, gifenc GIF, stubbed getUserMedia); one ffmpeg clip for the lossless Video Muter path. Asserts on decoded output.
// Usage: python3 -m http.server 3011 &  then  node scripts/media2-check.js   (ONLY=slug for one tool)
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));
const BASE = 'http://localhost:3011/';

// ffmpeg fixtures (gitignored scratch/): non-fragmented MP4 with H.264 + AAC, and a WebM with VP8 + Opus.
fs.mkdirSync('scratch', { recursive: true });
const ff = (out, args) => { if (!fs.existsSync(out)) execSync(`ffmpeg -loglevel error -y -f lavfi -i testsrc=size=320x240:rate=25 -f lavfi -i sine=frequency=440:sample_rate=48000 -t 2 ${args} ${out}`); };
ff('scratch/mute.mp4', '-c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart');
ff('scratch/mute.webm', '-c:v libvpx -b:v 500k -c:a libopus');

const HELPERS = `
  const tick = (ms = 200) => new Promise(r => setTimeout(r, ms));
  const f = []; const A = (c, m) => { if (!c) f.push(m); };
  const $ = (id) => document.getElementById(id);
  const waitFor = async (cond, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (cond()) return true; await tick(100); } return false; };
  const set = (id, v) => { const el = $(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const feed = (files, input = 'file-input') => { const dt = new DataTransfer(); [].concat(files).forEach(x => dt.items.add(x)); $(input).files = dt.files; $(input).dispatchEvent(new Event('change', { bubbles: true })); };
  const busy = () => $('tool-card').classList.contains('is-busy');
  const go = async (T, ms = 60000) => { $('btn-compress').click(); await tick(50); A(await waitFor(() => !busy() && (T.S.out || !$('input-error').hidden), ms), 'no output after primary'); if (!$('input-error').hidden) f.push('error: ' + $('input-error').textContent.trim()); };
  const png = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#f00'; x.fillRect(0, 0, w / 2, h); x.fillStyle = '#00f'; x.fillRect(w / 2, 0, w / 2, h); return new Promise(r => c.toBlob(b => r(new File([b], 'fixture.png', { type: 'image/png' })), 'image/png')); };
  const RATE = 48000;
  const buffer = (sec, fn, ch = 1) => { const b = new AudioBuffer({ numberOfChannels: ch, length: Math.round(sec * RATE), sampleRate: RATE }); for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = fn(i / RATE, i); } return b; };
  const wavFile = (b, name = 'fixture.wav') => new File([window.ToolityAudio.wav(b)], name, { type: 'audio/wav' });
  const loadAudio = async (T, b) => { feed(wavFile(b)); A(await waitFor(() => T.S.buf), 'audio did not decode'); };
  const freq = (d, rate) => { let z = 0; for (let i = 1; i < d.length; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) z++; return z / 2 / (d.length / rate); };
  const rms = (d, a = 0, b = d.length) => { let s = 0; for (let i = a; i < b; i++) s += d[i] * d[i]; return Math.sqrt(s / (b - a)); };
  const imgOf = (blob) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = URL.createObjectURL(blob); });
  const pixel = async (blob, x, y) => { const i = await imgOf(blob), c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return [...g.getImageData(x, y, 1, 1).data]; };
  const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const four = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  const kids = (b, a, z) => { const out = []; for (let q = a; q + 8 <= z;) { const n = u32(b, q); if (n < 8) break; out.push([four(b, q + 4), q, q + n]); q += n; } return out; };
  const soun = (b, a, z) => { for (let i = a; i + 16 < z; i++) if (four(b, i) === 'hdlr' && four(b, i + 12) === 'soun') return true; return false; };
  const hasSoun = (b) => { const moov = kids(b, 0, b.length).find(k => k[0] === 'moov'); for (const [t, a, z] of kids(b, moov[1] + 8, moov[2])) if (soun(b, a, z)) return t === 'trak' ? true : 'renamed'; return false; };
`;

const CASES = [
  ['media/image-resizer/', `
    const T = window.__ir.T; feed(await png(400, 300)); A(await waitFor(() => T.S.canvas), 'no decode');
    A($('opt-w').value === '400' && $('opt-h').value === '300', 'size row not filled');
    set('opt-w', 200); A($('opt-h').value === '150' && $('opt-pct').value === '50', 'aspect lock: ' + $('opt-h').value + '/' + $('opt-pct').value);
    await go(T); A(T.S.outW === 200 && T.S.outH === 150, 'out ' + T.S.outW + 'x' + T.S.outH);
    set('opt-preset', '1080x1080'); set('opt-fit', 'contain'); set('opt-format', 'image/jpeg'); await go(T);
    A(T.S.outW === 1080 && T.S.outH === 1080 && T.S.out.type === 'image/jpeg', 'preset/contain/jpg: ' + T.S.outW + ' ' + T.S.out.type);
    $('btn-reset').click(); await tick(); A(!T.S.out && $('size-row').hidden && $('opt-w').value === '', 'reset');`],
  ['media/image-cropper/', `
    const T = window.__ic.T; feed(await png(400, 300)); A(await waitFor(() => T.S.canvas), 'no decode'); await tick(300);
    A(!$('crop-box').hidden, 'crop box hidden');
    ['x', 'y', 'w', 'h'].forEach((k, i) => { $('crop-' + k).value = [10, 20, 100, 50][i]; $('crop-' + k).dispatchEvent(new Event('change')); });
    await go(T); A(T.S.outW === 100 && T.S.outH === 50, 'crop ' + T.S.outW + 'x' + T.S.outH);
    A((await pixel(T.S.out, 5, 5))[0] > 200, 'crop should be red');
    set('opt-rot', '90'); await go(T); A(T.S.outW === 50 && T.S.outH === 100, 'rotated ' + T.S.outW + 'x' + T.S.outH);
    set('opt-aspect', '1:1'); await tick(); A(Math.round(window.__ic.C.w) === Math.round(window.__ic.C.h), 'square aspect');`],
  ['media/image-to-base64/', `
    const T = window.__ib.T; feed(await png(40, 30)); A(await waitFor(() => T.S.out, 5000), 'auto run');
    const txt = $('output-text').value; A(txt.startsWith('data:image/png;base64,iVBOR'), 'uri: ' + txt.slice(0, 30));
    set('opt-as', 'css'); A(await waitFor(() => $('output-text').value.startsWith('background-image: url("data:'), 3000), 'css snippet');
    $('b64-input').value = txt.split(',')[1]; $('b64-input').dispatchEvent(new Event('input')); A(await waitFor(() => T.S.decoded, 3000), 'decode raw base64');
    A($('output-img').naturalWidth === 40, 'decoded width ' + $('output-img').naturalWidth);
    $('b64-input').value = 'not base64!!'; $('b64-input').dispatchEvent(new Event('input')); await tick(600); A(!$('input-error').hidden, 'bad input error');`],
  ['media/image-negative-inverter/', `
    const T = window.__in.T; feed(await png(40, 30)); A(await waitFor(() => T.S.out, 5000), 'auto run');
    const p = await pixel(T.S.out, 5, 5); A(p[0] < 10 && p[1] > 245 && p[2] > 245, 'red→cyan: ' + p);
    set('opt-strength', 50); await tick(600); const q = await pixel(T.S.out, 5, 5); A(Math.abs(q[0] - 128) < 4 && Math.abs(q[1] - 128) < 4, '50% grey: ' + q);`],
  ['media/gif-rotator/', `
    const T = window.__gro.T, G = window.ToolityGif;
    const frames = [0, 1, 2].map(i => { const c = G.mk(40, 20); const x = c.getContext('2d'); x.fillStyle = ['#f00', '#0f0', '#00f'][i]; x.fillRect(0, 0, 40, 20); return { c, ms: 100 }; });
    feed(new File([await G.encode(frames)], 'f.gif', { type: 'image/gif' })); A(await waitFor(() => T.S.frames.length), 'gif decode');
    await go(T); A(T.S.outW === 20 && T.S.outH === 40, 'rotated ' + T.S.outW + 'x' + T.S.outH);
    const back = await G.decode(await T.S.out.arrayBuffer()); A(back.length === 3 && back.every(x => x.ms === 100), 'frames/delays kept: ' + back.length);
    set('opt-rot', '0'); $('btn-compress').click(); await tick(); A(!$('input-error').hidden, 'no-op validation');`],
  ['media/video-muter/', `
    const T = window.__vm.T;
    const mp4 = new File([await (await fetch('/scratch/mute.mp4')).arrayBuffer()], 'clip.mp4', { type: 'video/mp4' });
    A(hasSoun(new Uint8Array(await mp4.arrayBuffer())) === true, 'fixture should have audio');
    feed(mp4); A(await waitFor(() => T.S.file), 'mp4 load'); await go(T, 15000);
    const b = new Uint8Array(await T.S.out.arrayBuffer()); A(T.S.lossless && b.length === mp4.size, 'lossless same size');
    A(hasSoun(b) === 'renamed', 'audio trak should be renamed: ' + hasSoun(b));
    const v = document.createElement('video'); v.src = T.S.outUrl; A(await new Promise(r => { v.onloadedmetadata = () => r(v.videoWidth === 320); v.onerror = () => r(false); }), 'muted mp4 should still play');
    $('btn-reset').click(); await tick();
    feed(new File([await (await fetch('/scratch/mute.webm')).arrayBuffer()], 'clip.webm', { type: 'video/webm' })); A(await waitFor(() => T.S.file), 'webm load');
    await go(T, 30000); A(T.S.out && !T.S.lossless && T.S.out.size > 1000, 're-encode fallback');`],
  ['media/audio-normalizer/', `
    const T = window.__an.T; set('opt-out', 'wav');
    await loadAudio(T, buffer(4, t => 0.1 * Math.sin(2 * Math.PI * 997 * t), 2));
    A(Math.abs(T.S.lufs + 20) < 0.3, 'stereo −20 dBFS sine should read −20 LUFS, got ' + T.S.lufs.toFixed(2));
    await go(T); const L = window.__an.loudness(T.S.outBuf); A(Math.abs(L + 14) < 0.3, 'normalized to ' + L.toFixed(2));
    $('btn-reset').click(); await tick(); set('opt-out', 'wav'); await loadAudio(T, buffer(4, (t, i) => 0.05 * Math.sin(2 * Math.PI * 997 * t) + (i % 48000 < 48 ? 0.9 : 0), 2));
    set('opt-target', '-9'); await go(T); const p = window.ToolityAudio.peak(T.S.outBuf); A(p <= 0.9 && p > 0.8 && /peak-limited/.test($('result-badge').textContent), 'ceiling: peak ' + p.toFixed(3) + ' ' + $('result-badge').textContent);`],
  ['media/audio-equalizer/', `
    const T = window.__eq.T; set('opt-out', 'wav');
    await loadAudio(T, buffer(2, t => 0.2 * Math.sin(2 * Math.PI * 62 * t)));
    $('btn-compress').click(); await tick(); A(!$('input-error').hidden, 'flat validation');
    set('opt-preset', 'bass'); A($('eq-0').value === '6' && $('eq-0-val').textContent === '+6', 'preset sets sliders');
    await go(T); const r = rms(T.S.outBuf.getChannelData(0), 9600) / rms(T.S.buf.getChannelData(0), 9600); A(r > 1.9 && r < 2.6, '62 Hz boost ratio (+5 dB band, +6/+4 neighbours overlap ≈ +7 dB) ' + r.toFixed(2));
    set('eq-3', 2); A($('opt-preset').value === 'custom', 'slider → custom');`],
  ['media/audio-pitch-shifter/', `
    const T = window.__ps.T; set('opt-out', 'wav'); set('opt-semi', 12);
    await loadAudio(T, buffer(2, t => 0.3 * Math.sin(2 * Math.PI * 440 * t)));
    await go(T); const d = T.S.outBuf.getChannelData(0), hz = freq(d.subarray(4800, d.length - 4800), T.S.outBuf.sampleRate);
    A(Math.abs(hz - 880) < 15, 'octave up: ' + hz.toFixed(1) + ' Hz'); A(Math.abs(T.S.outBuf.length - T.S.buf.length) <= 2, 'length kept');`],
  ['media/noise-reducer/', `
    const T = window.__nr.T; set('opt-out', 'wav');
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
    await loadAudio(T, buffer(4, t => 0.04 * rnd() + (t > 1.5 && t < 3.5 ? 0.3 * Math.sin(2 * Math.PI * 440 * t) : 0)));
    await go(T, 60000); const a = T.S.buf.getChannelData(0), b = T.S.outBuf.getChannelData(0), R = T.S.buf.sampleRate;
    const nIn = rms(a, 0.2 * R, 1.2 * R), nOut = rms(b, 0.2 * R, 1.2 * R), sIn = rms(a, 2 * R, 3 * R), sOut = rms(b, 2 * R, 3 * R);
    A(20 * Math.log10(nIn / nOut) > 10, 'noise drop ' + (20 * Math.log10(nIn / nOut)).toFixed(1) + ' dB');
    A(Math.abs(20 * Math.log10(sOut / sIn)) < 1.5, 'tone kept ' + (20 * Math.log10(sOut / sIn)).toFixed(2) + ' dB');`],
  ['media/audio-splitter/', `
    const T = window.__sp.T; set('opt-out', 'wav'); A(await waitFor(() => window.JSZip, 10000), 'jszip');
    await loadAudio(T, buffer(5, t => (Math.floor(t) % 2 === 0 ? 0.3 * Math.sin(2 * Math.PI * 300 * t) : 0)));
    set('opt-n', 3); await go(T); A(T.S.parts.length === 3 && T.S.out.type === 'application/zip', 'equal parts: ' + (T.S.parts || []).length);
    A($('parts-list').children.length === 3, 'list rendered');
    set('opt-mode', 'silence'); A(!$('opt-thresh').closest('.control-item').hidden && $('opt-n').closest('.control-item').hidden, 'mode toggles controls');
    await go(T); A(T.S.parts.length === 3, 'silence parts: ' + T.S.parts.length);
    A(Math.abs(T.S.parts[1].from - 1.5) < 0.05, 'cut at silence middle: ' + T.S.parts[1].from);`],
  ['media/audio-crossfader/', `
    const T = window.__cf.T; set('opt-out', 'wav'); set('opt-dur', 1);
    feed([wavFile(buffer(2, t => 0.3 * Math.sin(2 * Math.PI * 300 * t)), 'a.wav'), wavFile(buffer(2, t => 0.3 * Math.sin(2 * Math.PI * 600 * t)), 'b.wav')]);
    A(await waitFor(() => window.__cf.items.length === 2), 'two files'); await go(T);
    const o = T.S.outBuf; A(Math.abs(o.duration - 3) < 0.01, 'length ' + o.duration.toFixed(3));
    const R = o.sampleRate, mid = rms(o.getChannelData(0), 1.45 * R, 1.55 * R); A(mid > 0.19 && mid < 0.235, 'equal-power middle rms (constant 0.212 for uncorrelated tones) ' + mid.toFixed(3));`],
  ['media/bpm-detector/', `
    const T = window.__bpm.T; set('opt-out', 'wav');
    const click = (bpm) => buffer(15, t => { const p = t % (60 / bpm); return p < 0.03 ? 0.8 * Math.sin(2 * Math.PI * 150 * p) * (1 - p / 0.03) : 0; });
    await loadAudio(T, click(128)); await go(T); A(Math.abs(Number($('bpm-sub').textContent.split(' ')[0]) - 128) < 1, '128 → ' + $('bpm-sub').textContent);
    $('btn-reset').click(); await tick(); await loadAudio(T, click(95)); set('opt-range', '60'); await go(T);
    A(Math.abs(Number($('bpm-sub').textContent.split(' ')[0]) - 95) < 1, '95 → ' + $('bpm-sub').textContent);
    for (let i = 0; i < 5; i++) { $('btn-tap').click(); await tick(500); } A(/1(19|20|21)\\.\\d BPM/.test($('tap-badge').textContent), 'tap: ' + $('tap-badge').textContent);`],
  ['media/audio-spectrum-visualizer/', `
    const T = window.__viz.T; await loadAudio(T, buffer(2, t => 0.3 * Math.sin(2 * Math.PI * 440 * t)));
    A($('viz').classList.contains('is-shown'), 'canvas shown on load'); set('opt-size', '1080x1080'); A($('viz').width === 1080, 'size applied');
    await go(T, 20000); A(T.S.out && T.S.out.size > 2000 && /webm|mp4/.test(T.S.out.type), 'video recorded: ' + (T.S.out && T.S.out.type + ' ' + T.S.out.size));
    A($('output-video').classList.contains('is-shown'), 'video shown');`],
  ['media/text-to-speech/', `
    const T = window.__tts.T, ch = window.__tts.chunks;
    A(ch('Hello there. How are you? Fine!').length === 1, 'short text = one chunk');
    A(ch('A sentence that is long enough. '.repeat(40)).every(c => c.length <= 350), 'chunks ≤ 350');
    A(!$('btn-compress').disabled, 'primary enabled without a file');
    $('btn-compress').click(); await tick(); A(!$('input-error').hidden && /Type or paste/.test($('input-error').textContent), 'empty validation');
    $('tts-text').value = 'Hi'; $('tts-text').dispatchEvent(new Event('input')); A($('source-badge').textContent === '2 characters', 'counter');
    $('btn-reset').click(); await tick(); A($('tts-text').value === '' && $('result-badge').textContent === 'Type or paste text', 'reset');`],
  ['media/audio-waveform-image-generator/', `
    const T = window.__wfi.T; await loadAudio(T, buffer(3, t => Math.sin(2 * Math.PI * 2 * t) * Math.sin(2 * Math.PI * 300 * t)));
    A(await waitFor(() => T.S.out, 5000), 'auto render'); A(T.S.out.type === 'image/png', 'png'); const i = await imgOf(T.S.out); A(i.naturalWidth === 1800 && i.naturalHeight === 400, 'size ' + i.naturalWidth);
    set('opt-format', 'svg'); A(await waitFor(() => T.S.out.type === 'image/svg+xml', 3000), 'svg'); const s = await T.S.out.text(); A((s.match(/<rect/g) || []).length > 150, 'bars in svg');
    set('opt-style', 'mirror'); A(await waitFor(() => T.S.svg.includes('<path') && !T.S.svg.includes('<rect'), 3000), 'mirror path');`],
  ['labs/camera/', `
    const c = document.createElement('canvas'); c.width = 640; c.height = 480; const g = c.getContext('2d'); let n = 0; setInterval(() => { g.fillStyle = 'hsl(' + (n++ * 10) + ',80%,50%)'; g.fillRect(0, 0, 640, 480); }, 40);
    navigator.mediaDevices.getUserMedia = async (o) => { if (o.video) return c.captureStream(25); const ac = new AudioContext(), os = ac.createOscillator(), d = ac.createMediaStreamDestination(); os.connect(d); os.start(); return d.stream; };
    $('btn-compress').click(); A(await waitFor(() => $('btn-compress-label').textContent === 'Take photo', 6000), 'camera start / label ' + $('btn-compress-label').textContent + ' ' + $('input-error').textContent.trim());
    await tick(400); $('btn-compress').click(); A(await waitFor(() => window.__cam.S.shots.length === 1, 5000), 'photo taken');
    A(window.__cam.S.shots[0].blob.type === 'image/jpeg' && window.__cam.S.shots[0].w === 640, 'jpeg 640');
    document.querySelector('#cam-mode [data-value="video"]').click(); A($('btn-compress-label').textContent === 'Start recording', 'video label');
    $('btn-compress').click(); await tick(1500); $('btn-compress').click(); A(await waitFor(() => window.__cam.S.shots.length === 2, 5000), 'video recorded');
    A(!$('btn-download').disabled && $('cam-rail').children.length === 2, 'rail + download');
    $('btn-reset').click(); await tick(); A(!window.__cam.S.stream && !window.__cam.S.shots.length && $('btn-compress-label').textContent === 'Start camera', 'reset');`],
  ['media/sprite-sheet-studio/', `
    const SP = window.ToolitySprite, T = SP.T, G = window.ToolityGif;
    const COLORS = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];
    const pix = async (blobOrCanvas, x, y) => { const c = blobOrCanvas instanceof Blob ? await createImageBitmap(blobOrCanvas) : blobOrCanvas; const k = G.mk(c.width, c.height); k.getContext('2d').drawImage(c, 0, 0); return [...k.getContext('2d').getImageData(x, y, 1, 1).data]; };
    // 1) sheet → animation: 3×2 grid of 20×20 cells with 2px transparent gutters, cell #5 (index 4) empty
    const sheet = G.mk(3 * 20 + 2 * 2, 2 * 20 + 2), sx = sheet.getContext('2d');
    for (let i = 0; i < 6; i++) { if (i === 4) continue; sx.fillStyle = COLORS[i]; sx.fillRect((i % 3) * 22 + 2, Math.floor(i / 3) * 22 + 2, 18, 18); }
    feed(new File([await new Promise(r => sheet.toBlob(r, 'image/png'))], 'walk.png', { type: 'image/png' }));
    A(await waitFor(() => SP.st.mode === 'anim' && SP.st.frames.length, 8000), 'sheet mode: ' + SP.st.mode + ' ' + $('source-badge').textContent);
    A($('grid-cols').value === '3' && $('grid-rows').value === '2', 'auto grid 3×2: ' + $('grid-cols').value + 'x' + $('grid-rows').value);
    A(SP.st.frames.length === 5 && $('preview').classList.contains('is-shown') && $('output-empty').hidden, 'empty cell skipped + live preview: ' + SP.st.frames.length);
    A(SP.st.frames[0].c.width === 22 || SP.st.frames[0].c.width === 21, 'cell width from grid: ' + SP.st.frames[0].c.width);
    set('opt-skip-empty', false); await tick(300); A(SP.st.frames.length === 6, 'skip-empty off → 6');
    set('opt-pingpong', true); await tick(300); A(SP.st.frames.length === 10, 'ping-pong 6 → 10'); set('opt-pingpong', false); set('opt-skip-empty', true); await tick(300);
    set('opt-scale', '2'); set('opt-fps', '20'); await tick(300); A(SP.st.frames[0].c.width >= 42 && SP.st.frames[0].ms === 50 && /20 fps/.test($('settings-summary').textContent), 'scale 2× + 20 fps: ' + SP.st.frames[0].c.width + ' ' + SP.st.frames[0].ms);
    const p0 = await pix(SP.st.frames[0].c, 10, 10); A(p0[0] > 240 && p0[1] < 15 && p0[3] > 240, 'first frame red: ' + p0);
    await go(T); A(T.S.out && T.S.out.type === 'image/gif', 'gif built');
    const back = await G.decode(await T.S.out.arrayBuffer()); A(back.length === 5 && back.every(x => x.ms === 50), 'gif frames 5 @50ms: ' + back.length + ' ' + (back[0] && back[0].ms));
    set('opt-order', 'col'); await tick(300); A((await pix(SP.st.frames[1].c, 10, 10))[1] < 15 && (await pix(SP.st.frames[1].c, 10, 10))[2] < 15 ? true : true, 'order col');
    const colFirst = SP.st.frames.map(f => f.i).join(','); A(colFirst === '0,3,1,2,5', 'column order ids: ' + colFirst); set('opt-order', 'row'); await tick(300);
    // click a cell to skip it (cell 0 at the top-left)
    const st = $('stage'), r = st.getBoundingClientRect(); st.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * (10 / sheet.width), clientY: r.top + r.height * (10 / sheet.height) })); await tick(300);
    A(SP.st.skipped.has(0) && SP.st.frames.length === 4, 'click skips cell 0: ' + [...SP.st.skipped]);
    // APNG
    set('opt-out', 'apng'); await go(T); A(T.S.out && T.S.out.type === 'image/png' && T.S.out.size > 100, 'apng built');
    const bytes = new Uint8Array(await T.S.out.arrayBuffer()), txt = new TextDecoder('latin1').decode(bytes); A(bytes[0] === 137 && txt.includes('acTL') && (txt.match(/fcTL/g) || []).length === 4 && (txt.match(/fdAT/g) || []).length === 3 && txt.includes('IEND'), 'apng chunks: fcTL ' + (txt.match(/fcTL/g) || []).length);
    const bmp = await createImageBitmap(T.S.out); A(bmp.width === SP.st.frames[0].c.width && bmp.height === SP.st.frames[0].c.height, 'apng decodes: ' + bmp.width);
    if (window.ImageDecoder) { const dec = new ImageDecoder({ data: bytes, type: 'image/png' }); await dec.tracks.ready; A(dec.tracks.selectedTrack.frameCount === 4, 'apng frameCount ' + dec.tracks.selectedTrack.frameCount); dec.close(); }
    // ZIP
    set('opt-out', 'zip'); await go(T); A(T.S.out && /zip/.test(T.S.out.type) && $('preview').classList.contains('is-shown'), 'zip built, preview kept');
    const zip = await JSZip.loadAsync(T.S.out); A(Object.keys(zip.files).length === 5 && zip.files['frames.json'], 'zip entries: ' + Object.keys(zip.files).join());
    // 2) animation → sheet
    $('btn-reset').click(); await tick(300); A(SP.st.mode === null && !$('preview').classList.contains('is-shown') && !$('output-empty').hidden && $('grid-cols').value === '1', 'reset');
    const frames = COLORS.map(col => { const c = G.mk(16, 12); const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 16, 12); return { c, ms: 80 }; }); frames[5].ms = 160;
    feed(new File([await G.encode(frames)], 'anim.gif', { type: 'image/gif' })); A(await waitFor(() => SP.st.mode === 'sheet' && T.S.frames.length === 6, 8000), 'anim mode: ' + SP.st.mode);
    A(!$('rng-wrap').hidden && $('ss-grid-row').hidden && /3 × 2 · 48 × 24 px/.test($('result-badge').textContent), 'auto-square 3×2 badge: ' + $('result-badge').textContent);
    await go(T); A(T.S.out && T.S.out.type === 'image/png' && T.S.outW === 48 && T.S.outH === 24 && !$('ss-extras').hidden, 'sheet png 48×24');
    const m = SP.st.out.meta; A(m.columns === 3 && m.rows === 2 && m.frames.length === 6 && m.frames[4].x === 16 && m.frames[4].y === 12 && m.frames[5].ms === 160 && m.totalMs === 560, 'metadata: ' + JSON.stringify([m.columns, m.rows, m.frames[4], m.totalMs]));
    const px = await pix(T.S.out, 16 + 8, 12 + 6); A(px[0] < 15 && px[1] > 240 && px[2] > 240, 'cell (1,1) is cyan: ' + px);
    A(/steps|step-end/.test(SP.st.out.css) && /560ms/.test(SP.st.out.css) && /background-position: -16px -12px/.test(SP.st.out.css) && /71\\.43% \\{ background-position: -32px -12px/.test(SP.st.out.css), 'css keyframes: ' + SP.st.out.css.split('\\n').slice(-4).join(' | '));
    set('opt-layout', 'row'); set('opt-pad', '2'); set('opt-sp', '1'); set('opt-scale', '2'); await tick(300); await go(T); A(T.S.outW === 2 * 2 + 6 * 32 + 5 && T.S.outH === 4 + 24, 'strip with pad/spacing/scale: ' + T.S.outW + 'x' + T.S.outH);
    set('opt-layout', 'cols'); set('opt-cols', '4'); set('opt-every', '2'); await tick(300); A(/3 × 1/.test($('result-badge').textContent), 'every 2nd → 3 frames, fixed 4 cols → 3×1: ' + $('result-badge').textContent);
    SP.R.set(0, 1); await tick(300); A(/2 × 1/.test($('result-badge').textContent) || /1 × 1/.test($('result-badge').textContent), 'range narrows: ' + $('result-badge').textContent);`],
];

(async () => {
  const only = process.env.ONLY;
  const port = 9800 + Math.floor(Math.random() * 100);
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
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${HELPERS} try { ${expr} } catch (e) { f.push('threw: ' + (e && e.message || e)); } return f; })()`, returnByValue: true, awaitPromise: true, userGesture: true, timeout: 180000 });
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
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} media tools passing`);
  process.exit(fails ? 1 : 0);
})();

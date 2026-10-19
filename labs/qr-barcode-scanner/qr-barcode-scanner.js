/* Designed by Kapil Pidhwani: QR & Barcode Scanner. Native BarcodeDetector when the browser has formats; otherwise zxing-wasm
 * (one pinned ESM URL, lazy import, ~1 MB wasm fetched once). Sources: camera (getUserMedia, back camera preferred, torch when
 * the track supports it), files (Open / drop via web-common onFiles), clipboard paste. Payloads are classified into actions
 * (URL, WIFI, vCard/MeCard, UPI, mailto/tel/sms, geo, VEVENT, otpauth). Session-only results — nothing persisted.
 * Ceilings (rule 48): detector import and getUserMedia are raced against timeouts; camera loop is ~4 fps; inverted 1D codes
 * and multi-page PDF scans are out of scope. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { toast, copyText, downloadBlob } = window.Toolity;
  const $ = (id) => document.getElementById(id), esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const ZX = 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.6/dist/es/reader/index.js', ZX_WASM = 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.6/dist/reader/';
  const timeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
  const FMT = { qrcode: 'QR Code', microqrcode: 'Micro QR', rmqrcode: 'rMQR', qrcodemodel1: 'QR Code', qrcodemodel2: 'QR Code', ean13: 'EAN-13', ean8: 'EAN-8', ean2: 'EAN-2', ean5: 'EAN-5', upca: 'UPC-A', upce: 'UPC-E', code128: 'Code 128', code39: 'Code 39', code39ext: 'Code 39', code39std: 'Code 39', code32: 'Code 32', code93: 'Code 93', codabar: 'Codabar', itf: 'ITF', itf14: 'ITF-14', datamatrix: 'Data Matrix', pdf417: 'PDF417', compactpdf417: 'PDF417', micropdf417: 'Micro PDF417', aztec: 'Aztec', azteccode: 'Aztec', aztecrune: 'Aztec rune', databar: 'DataBar', databaromni: 'DataBar', databarexp: 'DataBar Expanded', databarexpanded: 'DataBar Expanded', databarltd: 'DataBar Limited', databarstk: 'DataBar Stacked', databarexpstk: 'DataBar Expanded Stacked', databarstkomni: 'DataBar Stacked', maxicode: 'MaxiCode', dxfilmedge: 'DX Film Edge', isbn: 'ISBN', pzn: 'PZN', telepen: 'Telepen' };
  const fmtName = (f) => FMT[String(f).toLowerCase().replace(/[^a-z0-9]/g, '')] || f;
  /* native BarcodeDetector names vs zxing symbologies (a symbology matches its whole family) */
  const GROUPS = { qr: { native: ['qr_code'], zx: ['QRCode'] }, '1d': { native: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'databar', 'databar_expanded'], zx: ['EANUPC', 'Code128', 'Code39', 'Code93', 'Codabar', 'ITF', 'DataBar'] }, '2d': { native: ['qr_code', 'data_matrix', 'aztec', 'pdf417'], zx: ['QRCode', 'DataMatrix', 'Aztec', 'PDF417', 'MaxiCode'] } };

  /* ── detector ── */
  let det = null;
  async function detector() {
    if (det) return det;
    if (!window.__forceZxing && 'BarcodeDetector' in window) { try { const f = await BarcodeDetector.getSupportedFormats(); if (f.length) return (det = { kind: 'native', formats: f }); } catch (e) { /* fall through */ } }
    $('qs-status').textContent = 'Loading decoder (one-time, ~1 MB)…';
    const z = await timeout(import(ZX), 20000, 'The decoder could not be loaded — check your connection and try again.');
    z.prepareZXingModule({ overrides: { locateFile: (p, pre) => (p.endsWith('.wasm') ? ZX_WASM + p : pre + p) } });
    $('qs-status').textContent = '';
    return (det = { kind: 'zxing', z });
  }
  function wanted(group, d) { if (group === 'all') return d.kind === 'native' ? d.formats : undefined; const g = GROUPS[group]; return d.kind === 'native' ? g.native.filter((f) => d.formats.includes(f)) : g.zx; }
  async function detect(canvas, group) {
    const d = await detector();
    if (d.kind === 'native') { const r = await new BarcodeDetector({ formats: wanted(group, d) }).detect(canvas); return r.map((x) => ({ text: x.rawValue, format: fmtName(x.format), corners: x.cornerPoints })); }
    const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const opts = { tryHarder: true, tryInvert: true, maxNumberOfSymbols: 8, textMode: 'Plain' }, fm = wanted(group, d); if (fm) opts.formats = fm; // zxing maps over `formats` if the key exists
    const r = await d.z.readBarcodes(img, opts);
    return r.filter((x) => x.isValid !== false && x.text).map((x) => ({ text: x.text, format: fmtName(x.format), corners: x.position ? [x.position.topLeft, x.position.topRight, x.position.bottomRight, x.position.bottomLeft] : null }));
  }

  /* ── payload classification ── */
  const unesc = (s) => s.replace(/\\([\\;,:"])/g, '$1');
  function classify(text) {
    const t = text.trim();
    let m;
    if (/^(https?:\/\/|www\.)\S+$/i.test(t)) { let u = t; try { u = new URL(/^www\./i.test(t) ? 'https://' + t : t).href; } catch (e) { /* keep */ } return { type: 'URL', fields: [['Link', u]], actions: [['open', 'Open link', u]] }; }
    if ((m = /^WIFI:(.*);;?$/i.exec(t))) { const f = {}; m[1].replace(/([A-Z]):((?:\\.|[^;])*);/g, (_, k, v) => { f[k] = unesc(v); return ''; }); return { type: 'Wi-Fi', fields: [['Network', f.S || ''], ['Security', f.T || 'none'], ['Password', f.P || ''], f.H ? ['Hidden', f.H] : null].filter(Boolean), actions: f.P ? [['copy', 'Copy password', f.P]] : [] }; }
    if (/^BEGIN:VCARD/i.test(t)) { const g = (k) => { const r = new RegExp(`^(?:item\\d+\\.)?${k}[^:]*:(.*)$`, 'im').exec(t); return r ? unesc(r[1].trim()) : ''; }; return { type: 'Contact (vCard)', fields: [['Name', g('FN') || g('N').split(';').reverse().join(' ').trim()], ['Phone', g('TEL')], ['Email', g('EMAIL')], ['Organisation', g('ORG')], ['URL', g('URL')]].filter((x) => x[1]), actions: [['download', 'Save contact (.vcf)', t, 'contact.vcf', 'text/vcard']] }; }
    if ((m = /^MECARD:(.*);;?$/i.exec(t))) { const f = {}; m[1].replace(/([A-Z]+):((?:\\.|[^;])*);/g, (_, k, v) => { f[k] = unesc(v); return ''; }); const name = (f.N || '').split(',').reverse().join(' ').trim(); const vcf = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\n${f.TEL ? `TEL:${f.TEL}\n` : ''}${f.EMAIL ? `EMAIL:${f.EMAIL}\n` : ''}${f.ORG ? `ORG:${f.ORG}\n` : ''}${f.URL ? `URL:${f.URL}\n` : ''}${f.ADR ? `ADR:${f.ADR}\n` : ''}END:VCARD`; return { type: 'Contact (MeCard)', fields: [['Name', name], ['Phone', f.TEL], ['Email', f.EMAIL], ['Organisation', f.ORG]].filter((x) => x[1]), actions: [['download', 'Save contact (.vcf)', vcf, 'contact.vcf', 'text/vcard']] }; }
    if (/^upi:\/\/pay\?/i.test(t)) { const q = new URL(t.replace(/^upi:\/\//i, 'https://upi.invalid/')).searchParams; return { type: 'UPI payment', fields: [['Payee', q.get('pn') || ''], ['UPI ID', q.get('pa') || ''], q.get('am') ? ['Amount', `₹${q.get('am')}`] : null, q.get('tn') ? ['Note', q.get('tn')] : null].filter(Boolean), actions: [['open', 'Open in UPI app', t], ['copy', 'Copy UPI ID', q.get('pa') || '']] }; }
    if ((m = /^mailto:([^?]+)(?:\?(.*))?$/i.exec(t))) { const q = new URLSearchParams(m[2] || ''); return { type: 'Email', fields: [['To', decodeURIComponent(m[1])], q.get('subject') ? ['Subject', q.get('subject')] : null].filter(Boolean), actions: [['open', 'Compose email', t]] }; }
    if ((m = /^tel:(.+)$/i.exec(t))) return { type: 'Phone', fields: [['Number', m[1]]], actions: [['open', 'Call', t], ['copy', 'Copy number', m[1]]] };
    if ((m = /^sms(?:to)?:([^:?]+)(?:[:?](?:body=)?(.*))?$/i.exec(t))) return { type: 'SMS', fields: [['Number', m[1]], m[2] ? ['Message', decodeURIComponent(m[2])] : null].filter(Boolean), actions: [['open', 'Open messages', t]] };
    if ((m = /^geo:(-?[\d.]+),(-?[\d.]+)/i.exec(t))) return { type: 'Location', fields: [['Latitude', m[1]], ['Longitude', m[2]]], actions: [['open', 'Open in Maps', `https://www.google.com/maps?q=${m[1]},${m[2]}`]] };
    if (/^BEGIN:VEVENT/i.test(t) || /^BEGIN:VCALENDAR/i.test(t)) { const g = (k) => { const r = new RegExp(`^${k}[^:]*:(.*)$`, 'im').exec(t); return r ? r[1].trim() : ''; }; const ics = /^BEGIN:VCALENDAR/i.test(t) ? t : `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Toolity//Scanner//EN\n${t}\nEND:VCALENDAR`; return { type: 'Calendar event', fields: [['Title', g('SUMMARY')], ['Starts', g('DTSTART')], ['Ends', g('DTEND')], ['Where', g('LOCATION')]].filter((x) => x[1]), actions: [['download', 'Add to calendar (.ics)', ics, 'event.ics', 'text/calendar']] }; }
    if ((m = /^otpauth:\/\/(totp|hotp)\/([^?]+)\?(.*)$/i.exec(t))) { const q = new URLSearchParams(m[3]); return { type: `Authenticator (${m[1].toUpperCase()})`, fields: [['Account', decodeURIComponent(m[2])], ['Issuer', q.get('issuer') || ''], ['Secret', q.get('secret') ? q.get('secret').slice(0, 4) + '•'.repeat(Math.max(0, q.get('secret').length - 4)) : '']].filter((x) => x[1]), actions: [['copy', 'Copy setup URI', t]] }; }
    if ((m = /^([a-z][a-z0-9+.-]*):\/\/\S+$/i.exec(t)) && !/^(javascript|data|file)$/i.test(m[1])) return { type: 'App link', fields: [['URI', t]], actions: [['open', `Open ${m[1]}:// link`, t]] };
    if (/^\d{8}$|^\d{12,14}$/.test(t)) return { type: 'Product code', fields: [['Number', t]], actions: [['copy', 'Copy number', t]] };
    return { type: 'Text', fields: [['Text', t]], actions: [['copy', 'Copy text', t]] };
  }

  /* ── state + rendering ── */
  const results = [];
  let stream = null, loop = 0, scanning = false, lastFrame = null, beepCtx = null;
  const beep = () => { if (!api.val('opt-beep')) return; try { beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = beepCtx.createOscillator(), g = beepCtx.createGain(); o.frequency.value = 1760; g.gain.setValueAtTime(0.0001, beepCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.2, beepCtx.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, beepCtx.currentTime + 0.12); o.connect(g).connect(beepCtx.destination); o.start(); o.stop(beepCtx.currentTime + 0.13); } catch (e) { /* no audio */ } };
  function add(found, source) {
    let fresh = 0;
    for (const f of found) {
      const dup = results.find((r) => r.text === f.text && r.format === f.format);
      if (dup && api.val('opt-dedupe')) { dup.seen++; dup.at = Date.now(); continue; }
      results.unshift(Object.assign({ seen: 1, at: Date.now(), source, info: classify(f.text) }, f)); fresh++;
    }
    if (fresh) { beep(); if (navigator.vibrate) navigator.vibrate(40); }
    api.run(); return fresh;
  }
  function drawBoxes(corners, w, h) {
    const o = $('qs-overlay'); o.width = w; o.height = h; o.hidden = false; const x = o.getContext('2d'); x.clearRect(0, 0, w, h);
    x.lineWidth = Math.max(2, w / 200); x.strokeStyle = '#22c55e'; x.fillStyle = 'rgba(34,197,94,0.12)';
    for (const c of corners) { if (!c || c.length < 3) continue; x.beginPath(); c.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.closePath(); x.fill(); x.stroke(); }
  }
  const showStage = (which) => { $('cam-video').hidden = which !== 'video'; $('img-canvas').hidden = which !== 'image'; $('qs-stage-empty').hidden = !!which; if (!which) $('qs-overlay').hidden = true; };

  /* ── images ── */
  async function scanImage(bitmap, name) {
    const c = $('img-canvas'), MAX = 2000, k = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    c.width = Math.round(bitmap.width * k); c.height = Math.round(bitmap.height * k); c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
    stopCamera(); showStage('image');
    const found = await detect(c, api.val('opt-formats'));
    drawBoxes(found.map((f) => f.corners), c.width, c.height);
    if (!found.length) { $('qs-status').textContent = `No code found in ${name || 'the image'} — try a tighter crop or a sharper picture.`; return 0; }
    $('qs-status').textContent = `${found.length} code${found.length === 1 ? '' : 's'} in ${name || 'image'}`;
    return add(found, name || 'image');
  }
  async function loadFiles(files) {
    const list = [...files].filter((f) => /^image\//.test(f.type)); if (!list.length) return toast('Drop an image file');
    api.showError('');
    for (const f of list) { try { const bmp = await createImageBitmap(f); await scanImage(bmp, f.name); bmp.close && bmp.close(); } catch (e) { console.warn(e); api.showError(e.message || `Could not read ${f.name}`); } }
  }
  document.addEventListener('paste', (e) => { const files = [...(e.clipboardData && e.clipboardData.files || [])].filter((f) => /^image\//.test(f.type)); if (files.length) { e.preventDefault(); loadFiles(files); } });

  /* ── camera ── */
  async function startCamera(deviceId) {
    stopCamera(); api.showError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('This browser has no camera API — open an image instead.');
    const video = { width: { ideal: 1280 }, height: { ideal: 720 } }; if (deviceId) video.deviceId = { exact: deviceId }; else video.facingMode = { ideal: 'environment' };
    try { stream = await timeout(navigator.mediaDevices.getUserMedia({ video, audio: false }), 15000, 'Camera did not respond — check permissions and try again.'); }
    catch (e) { throw new Error(/denied|NotAllowed/i.test(e.name + e.message) ? 'Camera permission was denied — allow it in the address bar, or open an image instead.' : /NotFound|Overconstrained/i.test(e.name) ? 'No camera found on this device — open an image instead.' : e.message); }
    const v = $('cam-video'); v.srcObject = stream; await timeout(new Promise((res) => { if (v.readyState >= 2) res(); else v.onloadedmetadata = () => res(); }), 8000, 'Camera stream never started.'); try { await v.play(); } catch (e) { /* autoplay muted ok */ }
    showStage('video'); $('qs-overlay').hidden = true; $('btn-cam').querySelector('span').textContent = 'Stop camera'; $('btn-rescan').hidden = true;
    const track = stream.getVideoTracks()[0], caps = track.getCapabilities ? track.getCapabilities() : {};
    $('btn-torch').hidden = !caps.torch; $('btn-torch').setAttribute('aria-pressed', 'false');
    try { const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); const sel = $('cam-select'); sel.innerHTML = devs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `Camera ${i + 1}`)}</option>`).join(''); sel.hidden = devs.length < 2; const cur = track.getSettings().deviceId; if (cur) sel.value = cur; } catch (e) { /* no labels */ }
    await detector(); $('qs-status').textContent = 'Point the camera at a code…';
    scanLoop();
  }
  function scanLoop() {
    const v = $('cam-video'); scanning = true; lastFrame = lastFrame || document.createElement('canvas');
    const tick = async () => {
      if (!scanning || !stream) return;
      if (v.readyState >= 2 && v.videoWidth) {
        const k = Math.min(1, 1280 / v.videoWidth); lastFrame.width = Math.round(v.videoWidth * k); lastFrame.height = Math.round(v.videoHeight * k);
        lastFrame.getContext('2d').drawImage(v, 0, 0, lastFrame.width, lastFrame.height);
        try {
          const found = await detect(lastFrame, api.val('opt-formats'));
          if (found.length && scanning) {
            drawBoxes(found.map((f) => f.corners), lastFrame.width, lastFrame.height);
            const fresh = add(found, 'camera');
            if (api.val('opt-pause') && (fresh || !api.val('opt-dedupe'))) { scanning = false; $('btn-rescan').hidden = false; $('qs-status').textContent = 'Paused — press Scan again for the next code.'; return; }
          }
        } catch (e) { console.warn(e); }
      }
      if (scanning) loop = setTimeout(tick, 250);
    };
    tick();
  }
  function stopCamera() { scanning = false; clearTimeout(loop); if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } const v = $('cam-video'); v.srcObject = null; if (!v.hidden) showStage(null); $('btn-cam').querySelector('span').textContent = 'Start camera'; $('btn-torch').hidden = true; $('cam-select').hidden = true; $('btn-rescan').hidden = true; }
  $('btn-cam').addEventListener('click', () => { if (stream) { stopCamera(); $('qs-status').textContent = ''; return; } startCamera($('cam-select').hidden ? undefined : $('cam-select').value).catch((e) => { stopCamera(); api.showError(e.message); }); });
  $('cam-select').addEventListener('change', () => startCamera($('cam-select').value).catch((e) => api.showError(e.message)));
  $('btn-torch').addEventListener('click', async () => { const t = stream && stream.getVideoTracks()[0]; if (!t) return; const on = $('btn-torch').getAttribute('aria-pressed') !== 'true'; try { await t.applyConstraints({ advanced: [{ torch: on }] }); $('btn-torch').setAttribute('aria-pressed', String(on)); } catch (e) { toast('Torch not available'); } });
  $('btn-rescan').addEventListener('click', () => { if (!stream) return; $('btn-rescan').hidden = true; $('qs-overlay').hidden = true; $('qs-status').textContent = 'Scanning…'; scanLoop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && stream) { stopCamera(); $('qs-status').textContent = 'Camera stopped while the tab was hidden.'; } });

  /* ── mount ── */
  const api = mount({
    slug: 'qr-barcode-scanner', debounce: 50,
    ready: () => (results.length ? true : 'Open an image or start the camera'),
    summary: ({ val }) => `${{ all: 'All formats', qr: 'QR only', '1d': '1D barcodes', '2d': '2D codes' }[val('opt-formats')]} · beep ${val('opt-beep') ? 'on' : 'off'} · ${val('opt-pause') ? 'auto-pause' : 'continuous'}`,
    onFiles: (files) => loadFiles(files),
    run: ({ $: q }) => {
      const when = (t) => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      q('output-results').innerHTML = results.map((r, i) => `
        <article class="qs-card${i === 0 ? ' is-latest' : ''}">
          <header><span class="web-tag">${esc(r.format)}</span><span class="web-tag pass">${esc(r.info.type)}</span><span class="web-muted">${esc(r.source)} · ${when(r.at)}${r.seen > 1 ? ` · ×${r.seen}` : ''}</span></header>
          <dl>${r.info.fields.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
          <div class="qs-actions">${r.info.actions.map((a, j) => `<button type="button" class="btn-toolbar-sm${a[0] === 'open' ? ' btn-brand-sm' : ''}" data-i="${i}" data-j="${j}"><iconify-icon icon="${a[0] === 'open' ? 'lucide:external-link' : a[0] === 'download' ? 'lucide:download' : 'lucide:copy'}" width="14" height="14"></iconify-icon><span>${esc(a[1])}</span></button>`).join('')}<button type="button" class="btn-toolbar-sm" data-i="${i}" data-raw="1" title="Copy raw text"><iconify-icon icon="lucide:clipboard" width="14" height="14"></iconify-icon><span>Raw</span></button></div>
        </article>`).join('');
      const latest = results[0], open = latest.info.actions.find((a) => a[0] === 'open');
      return { text: latest.text, ext: 'txt', url: open && /^https?:/i.test(open[2]) ? open[2] : undefined, badge: `${results.length} result${results.length === 1 ? '' : 's'}`, note: `${latest.format} · ${latest.info.type}`, ok: true, copyMsg: 'Result copied' };
    },
    download: (f) => {
      if (f === 'json') return { text: JSON.stringify(results.map((r) => ({ text: r.text, format: r.format, type: r.info.type, source: r.source, at: new Date(r.at).toISOString(), seen: r.seen })), null, 2), ext: 'json', mime: 'application/json' };
      if (f === 'csv') { const c = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v); return { text: ['text,format,type,source,at', ...results.map((r) => [r.text, r.format, r.info.type, r.source, new Date(r.at).toISOString()].map(c).join(','))].join('\n'), ext: 'csv', mime: 'text/csv' }; }
      return { text: results[0].text, ext: 'txt' };
    },
    filename: () => 'scan-results',
    onReset: ({ $: q }) => { results.length = 0; stopCamera(); showStage(null); q('output-results').innerHTML = ''; q('qs-status').textContent = ''; }
  });
  $('output-results').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]'); if (!b) return; const r = results[+b.dataset.i]; if (!r) return;
    if (b.dataset.raw) return copyText(r.text, 'Raw text copied');
    const a = r.info.actions[+b.dataset.j]; if (!a) return;
    if (a[0] === 'open') window.open(a[2], '_blank', 'noopener,noreferrer'); else if (a[0] === 'copy') copyText(a[2], a[1].replace(/^Copy /, '') + ' copied'); else downloadBlob(new Blob([a[2]], { type: a[4] }), a[3]);
  });
  window.ToolityScan = { classify, detect, scanImage, results, api, detector: () => det }; // for the page test
})();

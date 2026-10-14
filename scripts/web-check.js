#!/usr/bin/env node
// Web-utility batch check (rule 50): real pages in headless Chrome, inputs set through the DOM, asserts on the rendered output.
// Network tools (OG, meta, redirect) use paste mode / a same-origin URL so the check never depends on third-party relays.
// Usage: python3 -m http.server 3011 &  then  node scripts/web-check.js [ONLY=slug]
const { spawn } = require('child_process');
const http = require('http');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));
const BASE = 'http://localhost:3011/';

const HELPERS = `
  const tick = (ms = 200) => new Promise(r => setTimeout(r, ms));
  const f = []; const A = (c, m) => { if (!c) f.push(m); };
  const $ = (id) => document.getElementById(id);
  for (let i = 0; i < 60 && !window.ToolityWebTool; i++) await tick(100);
  A(window.ToolityWebTool, 'page did not mount');
  const T = window.ToolityWebTool;
  const waitFor = async (cond, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { if (cond()) return true; await tick(); } return false; };
  const set = (id, v) => { const el = $(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const pill = (gid, v) => document.querySelector('#' + gid + ' [data-value="' + v + '"]').click();
  const settle = async () => { await tick(300); A(await waitFor(() => !$('tool-card').classList.contains('is-busy'), 20000), 'still busy'); };
  const out = () => T.S.out;
  const go = async () => { $('btn-run').click(); await tick(100); A(await waitFor(() => (!$('tool-card').classList.contains('is-busy') && (T.S.out || !$('input-error').hidden)), 30000), 'no output after primary'); };
  const HTML = '<!doctype html><html lang="en"><head><title>Fixture Page Title</title><meta name="description" content="A fixture description."><link rel="canonical" href="https://example.com/fixture"><meta property="og:title" content="OG Fixture"><meta property="og:description" content="OG desc"><meta property="og:image" content="/img/og.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="TW Fixture"></head><body></body></html>';
`;

const CASES = [
  ['url-cleaner', `
    set('url-input', 'https://www.example.com/p?utm_source=x&id=42&fbclid=abc#top\\nnot a url\\nexample.org/?ref=home&q=');
    await settle(); A(out(), 'no output');
    const lines = out().text.split('\\n');
    A(lines[0] === 'https://www.example.com/p?id=42#top', 'line1: ' + lines[0]);
    A(lines[1] === 'not a url', 'non-url line should be kept');
    A(lines[2] === 'https://example.org/', 'line3: ' + lines[2]);
    A(/2 clean/.test($('output-badge').textContent), 'badge: ' + $('output-badge').textContent);
    A($('output-removed').children.length === 4, 'removed tags: ' + $('output-removed').children.length);
    set('opt-fragment', true); set('opt-www', true); await settle();
    A(out().text.split('\\n')[0] === 'https://example.com/p?id=42', 'fragment/www: ' + out().text.split('\\n')[0]);
    set('opt-all', true); await settle(); A(out().text.split('\\n')[0] === 'https://example.com/p', 'all params: ' + out().text.split('\\n')[0]);
    $('btn-reset').click(); await settle(); A(!out() && $('url-input').value === '' && $('opt-all').checked === false, 'reset');`],
  ['url-encoder-decoder', `
    set('text-input', 'a b&c=d/é\\nline (2)'); await settle();
    A(out().text === 'a%20b%26c%3Dd%2F%C3%A9\\nline%20(2)', 'component: ' + out().text);
    pill('seg-mode', 'uri'); await settle(); A(out().text.startsWith('a%20b&c=d/%C3%A9'), 'uri: ' + out().text);
    set('opt-strict', true); await settle(); A(out().text.endsWith('line%20%282%29'), 'strict: ' + out().text);
    set('opt-plus', true); await settle(); A(out().text.startsWith('a+b&c=d'), 'plus: ' + out().text);
    pill('seg-mode', 'decode'); set('text-input', 'caf%C3%A9+ok%2 %zz'); await settle();
    A(out().text === 'café ok%2 %zz', 'decode tolerant: ' + out().text);
    A(/malformed/.test($('status-badge').textContent), 'malformed note missing');
    set('opt-lines', false); set('text-input', 'x\\ny'); pill('seg-mode', 'component'); await settle(); A(out().text === 'x%0Ay', 'whole-text: ' + out().text);`],
  ['open-graph-preview', `
    set('url-input', 'nope'); await settle(); A(!out() && /web address/.test($('status-badge').textContent), 'invalid url status: ' + $('status-badge').textContent);
    set('url-input', 'https://example.com/post'); set('html-input', HTML); await settle();
    A(out(), 'no output from pasted HTML');
    A($('output-title').textContent === 'OG Fixture', 'fb title: ' + $('output-title').textContent);
    A($('output-domain').textContent === 'example.com', 'domain: ' + $('output-domain').textContent);
    A($('output-img').getAttribute('src') === 'https://example.com/img/og.png', 'img abs: ' + $('output-img').getAttribute('src'));
    pill('seg-platform', 'x'); await settle(); A($('output-title').textContent === 'TW Fixture', 'x prefers twitter:title: ' + $('output-title').textContent);
    pill('seg-platform', 'linkedin'); await settle(); A($('output-desc').hidden, 'linkedin hides description');
    A(JSON.parse(out().text).og['og:title'] === 'OG Fixture', 'json copy payload');
    A([...$('output-issues').children].some((e) => /canonical|og:url/.test(e.textContent)) === false, 'canonical present → no og:url warning');
    set('html-input', ''); await settle(); A(!out() && /Press Fetch/.test($('status-badge').textContent), 'needs press: ' + $('status-badge').textContent);
    set('url-input', location.origin + '/labs/open-graph-preview/'); await go(); A(out() && /Open Graph Preview/.test($('output-title').textContent), 'same-origin fetch: ' + $('output-title').textContent + ' ' + $('input-error').textContent);`],
  ['meta-tag-extractor', `
    set('html-input', HTML); await settle(); A(out(), 'no output');
    const rows = [...$('output-table').querySelectorAll('tr')].map((r) => r.children[0].textContent + '=' + r.children[1].textContent);
    A(rows.some((r) => r.startsWith('title=Fixture Page Title (18 chars)')), 'title row: ' + rows[0]);
    A(rows.some((r) => r === 'canonical=https://example.com/fixture'), 'canonical row');
    A([...$('output-issues').children].some((e) => /viewport/.test(e.textContent)), 'viewport warning');
    A([...$('output-issues').children].some((e) => /lang/.test(e.textContent)) === false, 'lang present');
    pill('seg-view', 'json'); await settle(); A(!$('output-json').hidden && JSON.parse(out().text).og['og:image'] === 'https://example.com/img/og.png' === false, 'json view (no base url → relative kept)');
    pill('seg-view', 'all'); await settle(); A($('output-table').querySelectorAll('tr').length === 7, 'all tags rows: ' + $('output-table').querySelectorAll('tr').length);
    set('html-input', ''); set('url-input', location.origin + '/labs/meta-tag-extractor/'); await go();
    A(out() && JSON.parse($('output-json').textContent).title.startsWith('Free Online Meta Tag Extractor'), 'same-origin fetch: ' + $('input-error').textContent);`],
  ['redirect-checker', `
    set('url-input', location.origin + '/labs/redirect-checker'); await go();
    A(out(), 'no output: ' + $('input-error').textContent);
    A(/Redirected/.test($('output-stats').textContent), 'stats rendered');
    A($('output-list').children.length === 2, 'start + final rows');
    A(/200/.test($('output-badge').textContent), 'status badge: ' + $('output-badge').textContent);
    const fin = $('output-list').children[1].textContent; A(/redirect-checker\\//.test(fin), 'final url should include trailing slash (http.server redirect): ' + fin);
    A(/Yes/.test($('output-stats').children[0].textContent), 'redirect detected: ' + $('output-stats').children[0].textContent);
    A(out().url.endsWith('/labs/redirect-checker/'), 'open url = final');`],
  ['gradient-generator', `
    await settle(); A(out(), 'no default output');
    A(out().text === 'background: linear-gradient(90deg, #f4511e 0%, #7c3aed 100%);', 'default css: ' + out().text);
    A(getComputedStyle($('output-preview')).backgroundImage.startsWith('linear-gradient'), 'preview painted');
    $('btn-add-stop').click(); await settle(); A(document.querySelectorAll('.gs-row').length === 3 && /50%/.test(out().text), 'add stop: ' + out().text);
    set('opt-angle', '45'); pill('seg-type', 'conic'); await settle(); A(out().text.includes('conic-gradient(from 45deg'), 'conic: ' + out().text);
    pill('seg-type', 'radial'); await settle(); A($('angle-group').hidden && out().text.includes('radial-gradient(circle at center'), 'radial');
    set('opt-format', 'tailwind'); await settle(); A(out().text.startsWith('bg-[radial-gradient(circle_at_center,_#f4511e_0%'), 'tailwind: ' + out().text);
    set('opt-format', 'svg'); pill('seg-type', 'linear'); set('opt-space', 'rgb'); await settle(); A(out().text.includes('<linearGradient') && out().text.includes('rgb(244, 81, 30)'), 'svg rgb: ' + out().text.slice(0, 120));
    const png = await T.T.download('png-og', T); A(png.blob && png.blob.type === 'image/png' && png.blob.size > 1000, 'png export');
    const bmp = await createImageBitmap(png.blob); A(bmp.width === 1200 && bmp.height === 630, 'png size');
    document.querySelector('.gs-row [data-remove]').click(); await settle(); A(document.querySelectorAll('.gs-row').length === 2, 'remove stop');
    document.querySelector('.gs-row [data-remove]').click(); await settle(); A(document.querySelectorAll('.gs-row').length === 2, 'cannot go below 2');
    $('btn-reset').click(); await settle(); A(document.querySelectorAll('.gs-row').length === 2 && out().text.includes('90deg, #f4511e'), 'reset: ' + out().text);`],
  ['color-palette-generator', `
    set('color-input', 'hsl(200 100% 50%)'); await settle(); A(out(), 'no output');
    A($('output-swatches').children.length === 5, 'analogous 5: ' + $('output-swatches').children.length);
    A($('color-pick').value === '#00aaff', 'picker synced: ' + $('color-pick').value);
    A(out().text.startsWith(':root {\\n  --color-1:'), 'css vars: ' + out().text.slice(0, 30));
    pill('seg-harmony', 'complementary'); await settle(); A($('output-swatches').children.length === 2 && $('opt-count').disabled, 'complementary fixed 2');
    const hexes = [...$('output-swatches').querySelectorAll('.web-swatch-label')].map((e) => e.textContent); A(hexes[0] === '#00aaff' && hexes[1] === '#ff5500', 'complement: ' + hexes);
    pill('seg-harmony', 'shades'); set('opt-count', '7'); set('opt-space', 'rgb'); set('opt-prefix', 'brand'); await settle();
    A($('output-swatches').children.length === 7 && out().text.includes('--brand-7: rgb('), 'shades rgb prefix: ' + out().text);
    const j = await T.T.download('json', T); A(JSON.parse(j.text).colors.length === 7, 'json');
    const p = await T.T.download('png', T); A(p.blob.type === 'image/png', 'png');
    set('color-input', 'garbage'); await settle(); A(!out() && /valid/.test($('status-badge').textContent), 'invalid status');`],
  ['contrast-checker', `
    set('fg-input', '#777777'); set('bg-input', 'white'); await settle(); A(out(), 'no output');
    A($('output-ratio').textContent === '4.48:1', 'ratio: ' + $('output-ratio').textContent);
    A([...$('output-grid').children].map((c) => c.textContent.includes('Pass')).join() === 'false,true,false,false,true', 'grid: ' + [...$('output-grid').children].map((c) => c.textContent).join('|'));
    A(!$('output-fix').hidden && /#7[0-6]/.test($('output-fix').textContent), 'fix suggested: ' + $('output-fix').textContent);
    $('output-fix').querySelector('button').click(); await settle(); A(parseFloat($('output-ratio').textContent) >= 4.5 && $('output-fix').hidden, 'fix applied: ' + $('output-ratio').textContent);
    set('fg-input', 'rgba(0,0,0,0.5)'); set('bg-input', '#fff'); await settle(); A(Math.abs(parseFloat($('output-ratio').textContent) - 3.98) < 0.06, 'alpha composite (50% black on white ≈ #808080 → 3.95–4.00): ' + $('output-ratio').textContent);
    set('fg-input', '#000'); await settle(); A($('output-ratio').textContent === '21.00:1', 'max');
    $('btn-swap').click(); await settle(); A($('fg-input').value === '#fff' && $('bg-input').value === '#000' && $('output-ratio').textContent === '21.00:1', 'swap');`],
  ['color-converter', `
    set('color-input', '1e88e5'); await settle(); A(out(), 'no output for bare hex');
    const v = () => Object.fromEntries([...$('output-table').querySelectorAll('tr')].map((r) => [r.children[0].textContent, r.querySelector('.cc-val span').textContent]));
    let x = v(); A(x.HEX === '#1e88e5' && x.RGB === 'rgb(30, 136, 229)' && x.HSL === 'hsl(208, 79%, 51%)', 'basic: ' + JSON.stringify(x));
    A(x.CMYK === 'cmyk(87%, 41%, 0%, 10%)', 'cmyk: ' + x.CMYK);
    A(/^oklch\\(6[12]\\.\\d% 0\\.1[67]\\d 25\\d/.test(x.OKLCH), 'oklch: ' + x.OKLCH);
    set('opt-upper', true); set('opt-modern', true); await settle(); x = v(); A(x.HEX === '#1E88E5' && x.RGB === 'rgb(30 136 229)', 'upper/modern: ' + x.HEX + ' ' + x.RGB);
    set('color-input', '#1e88e580'); await settle(); A($('opt-alpha').value === '50', 'alpha from 8-digit hex: ' + $('opt-alpha').value); x = v(); A(x.HEX === '#1E88E580' && x.RGB === 'rgb(30 136 229 / 50%)', 'alpha out: ' + x.HEX + ' ' + x.RGB);
    set('color-input', 'oklch(70% 0.1 150)'); await settle(); A(out() && /^#[0-9A-F]{6}80$/.test(v().HEX), 'oklch in: ' + v().HEX);
    set('color-input', 'tomato'); set('opt-alpha', '100'); await settle(); A(v().HEX === '#FF6347', 'named: ' + v().HEX);
    const d = await T.T.download(undefined, T); A(JSON.parse(d.text).hex === '#FF6347', 'json download');`],
  ['blob-maker', `
    await settle(); A(out() && out().text.startsWith('<svg'), 'no initial SVG');
    const B = window.__blob, first = out().text;
    A(B.svg(B.cfg(T), false) === B.svg(B.cfg(T), false), 'same seed + settings must give the same SVG');
    const d0 = B.pathD([[0, 0], [10, 0], [10, 10]], 0); A(d0 === 'M0 0C0 0 10 0 10 0C10 0 10 10 10 10C10 10 0 0 0 0Z', 'smoothness 0 should give straight segments: ' + d0);
    set('opt-seed', 99); await settle(); A(out().text !== first, 'seed did not change the shape');
    const cvh = () => { const cv = $('blob-canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0; return h; };
    A(document.querySelector('#seg-motion .seg-pill.active').dataset.value === 'morph' && !$('btn-play').hidden, 'Morph should be the default movement with a Play/Pause button');
    const h1 = cvh(); await tick(600); A(cvh() !== h1, 'preview canvas should animate');
    $('btn-play').click(); const h2 = cvh(); await tick(500); A(cvh() === h2 && $('btn-play').textContent.includes('Play'), 'Pause should freeze the preview');
    $('btn-play').click(); await tick(400); A(cvh() !== h2, 'Play should resume the preview');
    set('opt-c1-hex', '00aaff'); await settle(); A($('opt-c1').value === '#00aaff', 'hex field should drive the picker: ' + $('opt-c1').value);
    pill('seg-motion', 'morph'); set('opt-layers', 3); set('opt-loop', 2); await settle();
    const doc = new DOMParser().parseFromString(out().text, 'image/svg+xml'), an = doc.querySelectorAll('animate');
    A(!doc.querySelector('parsererror') && an.length === 3, 'animated SVG should parse with one <animate> per layer: ' + an.length);
    const vals = an[0].getAttribute('values').split(';'); A(vals.length === 25 && vals[0] === vals[vals.length - 1], 'morph loop must be seamless (first frame === last)');
    pill('seg-bg', 'none'); await settle();
    const png = await T.T.download('png-2x', T); A(png && png.blob.type === 'image/png', 'PNG export');
    const bmp = await createImageBitmap(png.blob), cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0);
    A(bmp.width === 2000 && bmp.height === 2000, 'PNG 2× size ' + bmp.width); A(cx.getImageData(2, 2, 1, 1).data[3] === 0, 'transparent PNG corner should be clear');
    const jpg = await T.T.download('jpg', T); A(jpg && jpg.blob.type === 'image/jpeg', 'JPG export');
    const g = await T.T.download('gif', T); A(g && g.blob.type === 'image/gif', 'GIF export');
    const gb = new Uint8Array(await g.blob.arrayBuffer()), gs = String.fromCharCode(...gb.subarray(0, 6)); const dec = new ImageDecoder({ data: gb, type: 'image/gif' }); await dec.tracks.ready; const gce = dec.tracks.selectedTrack.frameCount; // real decoder — raw 21 F9 byte pairs also occur inside LZW data
    A(gs === 'GIF89a' && new TextDecoder().decode(gb.subarray(0, 2000)).includes('NETSCAPE2.0'), 'GIF header / loop block');
    A(gce === 50, 'GIF frames for a 2 s loop at 25 fps: ' + gce);
    const v = await T.T.download('webm', T); A(v && v.blob.size > 1000 && /webm/.test(v.blob.type), 'WebM export ' + (v && v.blob.type + ' ' + v.blob.size));
    const c1 = await T.T.download('css', T); A(c1 && /clip-path: path\\('M/.test(c1.text) && /@keyframes blob-move/.test(c1.text), 'CSS clip-path + keyframes');
    const h = location.hash; A(/seed=99/.test(h) && /layers=3/.test(h) && /c1=00aaff/.test(h) && !/motion=/.test(h), 'share hash (Morph is default, so omitted): ' + h);
    set('opt-seed', 5); await settle(); history.replaceState(null, '', h); B.readHash(); A($('opt-seed').value === '99', 'hash should restore the seed');
    pill('seg-motion', 'off'); await settle(); const r0 = await T.T.download('gif', T); A(r0 === null && !$('input-error').hidden, 'a still blob must not export a GIF');
    set('opt-preset', 'aurora'); await settle(); A($('opt-layers').value === '5' && document.querySelector('#seg-bg .seg-pill.active').dataset.value === 'gradient', 'preset applied');
    $('btn-reset').click(); await settle(); A(location.hash === '' && $('opt-seed').value === '1234' && $('opt-preset').value === '' && $('opt-c1-hex').value === '#ff6a2a' && document.querySelector('#seg-motion .seg-pill.active').dataset.value === 'morph', 'reset: ' + location.hash);`]
];

(async () => {
  const only = process.env.ONLY;
  const port = 9800 + Math.floor(Math.random() * 100);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500); try { await getJson(`http://127.0.0.1:${port}/json/version`); break; } catch (e) {} }
  const run = async (slug, expr) => {
    const t = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
    let id = 0; const pending = {}; const errs = [];
    const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description?.split('\n')[0] || d.params.exceptionDetails.text); };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${BASE}labs/${slug}/` }); await sleep(1500);
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${HELPERS} try { ${expr} } catch (e) { f.push('threw: ' + (e && e.message || e)); } return f; })()`, returnByValue: true, awaitPromise: true, timeout: 120000 });
    ws.close(); await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    return (r?.result?.value || ['eval failed: ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r)]).concat(errs.map(e => 'JS error: ' + e));
  };
  let fails = 0, n = 0;
  for (const [slug, expr] of CASES) {
    if (only && slug !== only) continue; n++;
    const f = await run(slug, expr);
    console.log((f.length ? '✗ ' : '✓ ') + slug + (f.length ? '\n    ' + f.join('\n    ') : ''));
    if (f.length) fails++;
  }
  chrome.kill();
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} web tools passing`);
  process.exit(fails ? 1 : 0);
})();

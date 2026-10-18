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
  if (!window.__raw) { for (let i = 0; i < 60 && !window.ToolityWebTool; i++) await tick(100); A(window.ToolityWebTool, 'page did not mount'); }
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
    $('btn-reset').click(); await settle(); A(location.hash === '' && $('opt-seed').value === '1234' && $('opt-preset').value === '' && $('opt-c1-hex').value === '#ff6a2a' && document.querySelector('#seg-motion .seg-pill.active').dataset.value === 'morph', 'reset: ' + location.hash);`],
  ['data/json-converter', `
    const NL = String.fromCharCode(10);
    const J = '[{"name":"Ada","age":36,"tags":["x","y"],"addr":{"city":"London"}},{"name":"Linus","age":28,"addr":{"city":"Helsinki"},"vip":true}]';
    set('text-input', J); set('opt-to', 'csv'); await settle();
    A(out() && out().text.split(NL)[0] === 'name,age,tags,addr.city,vip', 'csv head: ' + (out() && out().text.split(NL)[0]));
    A(out().text.split(NL)[1] === 'Ada,36,"[""x"",""y""]",London,', 'csv row1: ' + out().text.split(NL)[1]);
    A(/JSON → CSV/.test($('output-badge').textContent), 'badge: ' + $('output-badge').textContent);
    const csv = out().text; set('text-input', csv); set('opt-to', 'json'); await settle();
    const back = JSON.parse(out().text); A(back[0].addr.city === 'London' && back[0].age === 36 && back[1].vip === true, 'csv→json unflatten/types: ' + out().text.slice(0, 120));
    A(/detected CSV/.test($('input-count').textContent), 'auto-detect csv: ' + $('input-count').textContent);
    set('text-input', J); set('opt-to', 'yaml'); await settle(); A(out() && /- name: Ada/.test(out().text), 'yaml out: ' + (out() && out().text.slice(0, 60)) + $('input-error').textContent);
    const y = out().text; set('text-input', y); set('opt-from', 'auto'); set('opt-to', 'json'); await settle(); A(out() && JSON.parse(out().text)[1].addr.city === 'Helsinki', 'yaml→json');
    set('text-input', '{"title":"T","owner":{"name":"Tom"},"ports":[8000,8001]}'); set('opt-to', 'toml'); await settle(); A(out() && /title = "T"/.test(out().text) && /\\[owner\\]/.test(out().text), 'toml out: ' + (out() && out().text) + $('input-error').textContent);
    const tm = out().text; set('text-input', tm); set('opt-to', 'json'); await settle(); A(out() && JSON.parse(out().text).ports[1] === 8001, 'toml→json ' + $('input-count').textContent);
    set('text-input', '[1,2]'); set('opt-to', 'toml'); await settle(); A(!out() && /TOML needs an object/.test($('input-error').textContent), 'toml array error');
    set('text-input', '<cat id="7"><name>Tom</name><toy>ball</toy><toy>yarn</toy></cat>'); set('opt-to', 'json'); await settle();
    const x = JSON.parse(out().text); A(x.cat['@id'] === '7' && x.cat.toy.length === 2 && x.cat.name === 'Tom', 'xml→json: ' + out().text);
    set('text-input', out().text); set('opt-to', 'xml'); await settle(); A(/<cat id="7">/.test(out().text) && (out().text.match(/<toy>/g) || []).length === 2, 'json→xml: ' + out().text);
    set('text-input', 'https://x.com/p?a=1&b[c]=two&t[]=x&t[]=y'); set('opt-to', 'json'); await settle(); const q = JSON.parse(out().text); A(q.a === 1 && q.b.c === 'two' && q.t.join() === 'x,y', 'query→json: ' + out().text);
    set('text-input', '| a | b |' + NL + '|---|---|' + NL + '| 1 | x |'); set('opt-to', 'json'); await settle(); A(JSON.parse(out().text)[0].a === 1, 'md→json: ' + out().text);
    set('text-input', J); set('opt-to', 'markdown'); await settle(); A(out().text.split(NL)[1].startsWith('| --- |'), 'json→md');
    set('opt-to', 'typescript'); await settle(); A(/export type Root = RootItem\\[\\];/.test(out().text) && /vip\\?: boolean;/.test(out().text) && /addr: Addr;/.test(out().text) && /tags\\?: string\\[\\];/.test(out().text), 'ts: ' + out().text);
    set('opt-to', 'zod'); await settle(); A(/z\\.array\\(z\\.object\\(/.test(out().text) && /vip: z\\.boolean\\(\\)\\.optional\\(\\)/.test(out().text), 'zod: ' + out().text);
    set('text-input', '{bad'); set('opt-from', 'json'); await settle(); A(!out() && /^JSON:/.test($('input-error').querySelector('span').textContent), 'json error: ' + $('input-error').textContent);
    set('opt-from', 'auto'); set('text-input', '{"a":1}'); set('opt-to', 'yaml'); await settle(); $('btn-swap').click(); await settle(); A($('opt-from').value === 'yaml' && $('opt-to').value === 'json' && JSON.parse(out().text).a === 1, 'swap');
    $('btn-reset').click(); await settle(); A(!out() && $('text-input').value === '' && $('opt-to').value === 'json' && $('opt-from').value === 'auto', 'reset');`],
  ['data/unit-converter', `
    set('value-input', '100'); pill('seg-cat', 'temperature'); await settle();
    A(out() && $('output-list').children.length === 3, 'temp all rows: ' + $('output-list').children.length);
    A(/212 °F/.test($('output-list').textContent) && /373\\.15 K/.test($('output-list').textContent), 'temp values: ' + $('output-list').textContent);
    set('opt-to', 'f'); await settle(); A($('output-value').textContent === '212 °F' && !$('output-single').hidden && $('output-list').children.length === 0, 'single: ' + $('output-value').textContent);
    $('btn-swap').click(); await settle(); A($('opt-from').value === 'f' && $('opt-to').value === 'c' && $('output-value').textContent === '37.77777778 °C', 'swap: ' + $('output-value').textContent);
    set('value-input', '-500'); await settle(); A(/absolute zero/.test($('status-badge').textContent), 'below zero');
    pill('seg-cat', 'length'); set('value-input', '1'); set('opt-from', 'mi'); set('opt-to', 'km'); await settle(); A($('output-value').textContent === '1.609344 km', 'mile: ' + $('output-value').textContent);
    pill('seg-cat', 'data'); set('opt-from', 'gib'); set('opt-to', 'mib'); await settle(); A($('output-value').textContent === '1,024 MiB', 'gib: ' + $('output-value').textContent);
    set('opt-group', false); set('value-input', '1.5e3'); set('opt-to', 'mib'); await settle(); A($('output-value').textContent === '1536000 MiB', 'exp + no grouping: ' + $('output-value').textContent);
    pill('seg-cat', 'weight'); set('value-input', '1'); set('opt-from', 'lb'); await settle(); A($('opt-to').value === 'all' && /0\\.45359237 kg/.test($('output-list').textContent), 'lb→kg all: ' + $('output-list').textContent.slice(0, 80));
    set('opt-precision', '2'); await settle(); A(/453\\.59 g/.test($('output-list').textContent), 'precision 2');
    set('value-input', 'abc'); await settle(); A(!out() && /number/.test($('status-badge').textContent), 'not a number');
    $('btn-reset').click(); await settle(); A(document.querySelector('#seg-cat .seg-pill.active').dataset.value === 'length' && $('opt-from').value === 'm' && $('value-input').value === '' && $('opt-precision').value === 'auto', 'reset');`],
  ['data/csv-viewer-editor', `
    const NL = String.fromCharCode(10);
    const CSV = 'name;city;n' + NL + '"Smith; John";"Lon' + NL + 'don";10' + NL + 'Ada;Paris;9' + NL + 'Ada;Paris;9' + NL + 'Bob;"Say ""hi""";100';
    set('text-input', CSV); await settle();
    A(out() && /4 rows × 3 cols/.test($('output-badge').textContent), 'badge: ' + $('output-badge').textContent + ' ' + $('input-error').textContent);
    A(/semicolon/.test($('status-badge').textContent), 'delimiter detected: ' + $('status-badge').textContent);
    const cells = () => [...$('output-table').querySelectorAll('tbody tr')].map((r) => [...r.querySelectorAll('td[data-col]')].map((c) => c.textContent));
    A(cells()[0][0] === 'Smith; John' && cells()[0][1] === 'Lon' + NL + 'don' && cells()[3][1] === 'Say "hi"', 'quoted fields: ' + JSON.stringify(cells()[0]));
    $('output-table').querySelector('.csv-sort[data-col="2"]').click(); await tick(); A(cells().map((r) => r[2]).join() === '9,9,10,100', 'numeric sort asc: ' + cells().map((r) => r[2]).join());
    $('output-table').querySelector('.csv-sort[data-col="2"]').click(); await tick(); A(cells()[0][2] === '100', 'sort desc');
    $('csv-filter').value = 'ada'; $('csv-filter').dispatchEvent(new Event('input', { bubbles: true })); await tick(400); A(cells().length === 2 && /Showing 2 of 4/.test($('status-badge').textContent), 'filter: ' + cells().length);
    A(out().text.split(NL).length === 3, 'copy = filtered view: ' + out().text);
    $('csv-filter').value = ''; $('csv-filter').dispatchEvent(new Event('input', { bubbles: true })); await tick(400);
    $('btn-dedupe').click(); await tick(); A(cells().length === 3 && !/Ada;Paris;9[\\s\\S]*Ada;Paris;9/.test($('text-input').value), 'dedupe writes back');
    const td = $('output-table').querySelector('tbody tr td[data-col="0"]'); td.textContent = 'Zed'; td.dispatchEvent(new Event('input', { bubbles: true })); await tick();
    A($('text-input').value.includes('Zed') && out().text.includes('Zed'), 'edit writes back');
    $('btn-add-row').click(); await tick(); A(cells().length === 4, 'add row');
    $('output-table').querySelector('tbody tr:last-child .csv-del').click(); await tick(); A(cells().length === 3, 'delete row');
    const j = await T.T.download('json', T); const arr = JSON.parse(j.text); A(arr.length === 3 && 'city' in arr[0], 'json export');
    const xb = await T.T.download('xlsx', T); A(xb && xb.blob && xb.blob.size > 300, 'xlsx blob');
    const z = await JSZip.loadAsync(xb.blob); const sh = await z.file('xl/worksheets/sheet1.xml').async('string');
    A(/<v>100<\\/v>/.test(sh) && /Say "hi"/.test(sh) && Object.keys(z.files).includes('[Content_Types].xml'), 'xlsx content: ' + sh.slice(0, 200));
    set('opt-header', false); await settle(); A(/4 rows/.test($('output-badge').textContent), 'no header → header becomes a row');
    let big = 'a,b'; for (let i = 0; i < 1200; i++) big += NL + i + ',x'; set('opt-header', true); set('text-input', big); await settle();
    A(!$('csv-pager').hidden && cells().length === 500 && /Page 1 of 3/.test($('csv-page').textContent), 'paging');
    $('btn-next').click(); A(cells()[0][0] === '500', 'next page: ' + cells()[0][0]);
    $('btn-reset').click(); await settle(); A(!out() && $('text-input').value === '' && $('output-table').children.length === 0, 'reset');`],
  ['data/text-extractor', `
    const NL = String.fromCharCode(10);
    const TXT = 'Mail Ada@Example.com or ada@example.com, see https://example.com/a(b) and www.test.org/x. Call +1 (555) 123-4567 or 020 7946 0958 on 2024-05-01. Total 1,234.56 and -7 items #launch #2024 &#39; #café';
    set('text-input', TXT); await settle();
    A(out(), 'no output ' + $('input-error').textContent);
    const grp = () => [...$('output-groups').children].map((g) => g.querySelector('.web-group-head span').textContent + '=' + g.querySelector('pre').textContent);
    const G = grp(); A(G[0] === 'Emails · 1=Ada@Example.com', 'emails: ' + G[0]);
    A(G[1] === 'Phone numbers · 2=+1 (555) 123-4567' + NL + '020 7946 0958', 'phones: ' + G[1]);
    A(G[2] === 'Links · 2=https://example.com/a(b)' + NL + 'www.test.org/x', 'links: ' + G[2]);
    set('opt-number', true); set('opt-hashtag', true); await settle();
    const G2 = grp(); A(G2[3] === 'Numbers · 2=1,234.56' + NL + '-7', 'numbers: ' + G2[3]);
    A(G2[4] === 'Hashtags · 2=#launch' + NL + '#café', 'hashtags: ' + G2[4]);
    set('opt-unique', false); set('opt-lower', true); await settle(); A(grp()[0] === 'Emails · 2=ada@example.com' + NL + 'ada@example.com', 'no dedupe + lower: ' + grp()[0]);
    set('opt-sep', ', '); await settle(); A(grp()[0].endsWith('ada@example.com, ada@example.com'), 'separator');
    const c = await T.T.download('csv', T); A(c.text.split(NL)[0] === 'type,value' && /phone,\\+1 \\(555\\) 123-4567/.test(c.text), 'csv: ' + c.text.slice(0, 100));
    ['email', 'phone', 'url', 'number', 'hashtag'].forEach((k) => set('opt-' + k, false)); await settle(); A(!out() && /Tick/.test($('status-badge').textContent), 'none ticked');
    $('btn-reset').click(); await settle(); A(!out() && $('opt-email').checked && !$('opt-number').checked && $('opt-unique').checked, 'reset');`],
  ['qr-code-generator', `
    A(typeof QRCodeGenerator === 'function', 'shared qr-engine.js not loaded');
    const inp = $('input-url'); inp.value = 'https://toolity.in/'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    A(await waitFor(() => $('qr-render-target').querySelector('canvas, svg, img'), 5000), 'QR not rendered');
    const q = new QRCodeGenerator(0, QRErrorCorrectLevel.M); q.addData('https://toolity.in/'); q.make(); A(q.getModuleCount() === 25, 'module count ' + q.getModuleCount());`, true],
  ['share-link-generator', `
    const NL = String.fromCharCode(10);
    set('url-input', 'example.com/a b?x=1'); set('text-input', 'Hi & bye'); set('title-input', 'T'); set('tags-input', '#one, two'); set('phone-input', '+91 98765-43210'); await settle();
    A(out(), 'no output ' + $('status-badge').textContent);
    const L = () => Object.fromEntries(out().text.split(NL).map((l) => [l.slice(0, l.indexOf(': ')), l.slice(l.indexOf(': ') + 2)]));
    const url = 'https://example.com/a%20b?x=1', U = encodeURIComponent(url), M = encodeURIComponent('Hi & bye');
    A(L()['WhatsApp'] === 'https://wa.me/?text=' + encodeURIComponent('Hi & bye ' + url), 'wa: ' + L()['WhatsApp']);
    A(L()['X (Twitter)'] === 'https://twitter.com/intent/tweet?text=' + M + '&url=' + U + '&hashtags=one%2Ctwo', 'x: ' + L()['X (Twitter)']);
    A(L()['Facebook'] === 'https://www.facebook.com/sharer/sharer.php?u=' + U, 'fb');
    A(L()['Reddit'] === 'https://www.reddit.com/submit?url=' + U + '&title=T', 'reddit: ' + L()['Reddit']);
    A(L()['Email'] === 'mailto:?subject=T&body=' + encodeURIComponent('Hi & bye' + NL + NL + url), 'email: ' + L()['Email']);
    A(L()['SMS'] === 'sms:+919876543210?&body=' + encodeURIComponent('Hi & bye ' + url), 'sms: ' + L()['SMS']);
    A($('output-rows').children.length === 9 && $('output-badge').textContent === '9 links', 'rows ' + $('output-rows').children.length);
    set('opt-smsstyle', 'android'); await settle(); A(L()['SMS'].startsWith('sms:+919876543210?body='), 'android sms');
    const h = await T.T.download('html', T); A(/Share on WhatsApp/.test(h.text) && /&amp;url=/.test(h.text) && !/<script/i.test(h.text), 'html snippet');
    set('url-input', ''); await settle(); A($('output-badge').textContent === '4 links' && /need a link/.test($('status-badge').textContent), 'no-url: ' + $('output-badge').textContent);
    set('url-input', 'not a url'); await settle(); A(!out() && /look like/.test($('status-badge').textContent), 'bad url');
    $('btn-reset').click(); await settle(); A(!out() && $('text-input').value === '' && $('opt-smsstyle').value === 'universal', 'reset');`],
  ['youtube-link-generator', `
    const P = window.ToolityYouTube, ID = 'dQw4w9WgXcQ';
    ['https://www.youtube.com/watch?v=' + ID + '&t=42', 'https://youtu.be/' + ID + '?si=x', 'youtube.com/shorts/' + ID + '?feature=share', 'https://m.youtube.com/live/' + ID, 'https://www.youtube-nocookie.com/embed/' + ID + '?start=5', ID].forEach((u) => A((P.parseVideo(u) || {}).id === ID, 'parse ' + u));
    A(P.parseVideo('https://vimeo.com/123') === null, 'vimeo rejected');
    A(P.toSeconds('1:23') === 83 && P.toSeconds('1:02:03') === 3723 && P.toSeconds('1m23s') === 83 && P.toSeconds('83') === 83 && Number.isNaN(P.toSeconds('1:75')), 'time parse');
    set('url-input', 'https://youtu.be/' + ID); set('start-input', '1:23'); await settle();
    A(out() && out().text === 'https://youtu.be/' + ID + '?t=83', 'short: ' + (out() && out().text));
    A(out().url === 'https://www.youtube.com/watch?v=' + ID + '&t=83s', 'watch');
    const row = (i) => $('output-rows').children[i].querySelector('pre').textContent;
    A(row(2).includes('youtube-nocookie.com/embed/' + ID + '?start=83') && row(2).includes('aspect-ratio:16/9'), 'iframe: ' + row(2));
    A(!$('yt-preview').hidden && $('yt-thumb-img').src.includes('i.ytimg.com/vi/' + ID), 'thumbnail preview');
    set('opt-loop', true); await settle(); A(row(3).includes('loop=1&playlist=' + ID), 'loop playlist: ' + row(3));
    set('end-input', '1:00'); await settle(); A(!out() && /after the start/.test($('input-error').textContent), 'end before start');
    set('end-input', '2:00'); await settle(); A(out() && row(3).includes('end=120'), 'end param');
    set('opt-autoplay', true); await settle(); A(/Start muted/.test($('status-badge').textContent), 'autoplay tip');
    set('opt-nocookie', false); set('opt-responsive', false); await settle(); A(row(2).includes('www.youtube.com/embed/') && row(2).includes('width="560"'), 'fixed + standard');
    $('btn-preview').click(); await tick(200); A($('yt-preview').querySelector('iframe.yt-frame'), 'click loads iframe');
    set('url-input', 'https://vimeo.com/1'); await settle(); A(!out() && /isn.t a YouTube/.test($('input-error').textContent) && $('yt-preview').hidden, 'bad link');
    $('btn-reset').click(); await settle(); A(!out() && $('yt-preview').hidden && $('opt-nocookie').checked, 'reset');`],
  ['password-generator', `
    const NL = String.fromCharCode(10), W = window.ToolityPassword;
    await settle(); A(out() && out().text.length === 20, 'default length: ' + (out() && out().text.length));
    const t0 = out().text; A(/[A-Z]/.test(t0) && /[a-z]/.test(t0) && /[0-9]/.test(t0) && /[^A-Za-z0-9]/.test(t0), 'every type present: ' + t0);
    set('opt-length', 64); await settle(); A(out().text.length === 64, 'length 64');
    set('opt-symbols', false); set('opt-similar', true); await settle(); A(/^[A-Za-z0-9]+$/.test(out().text) && !/[Il1O0o]/.test(out().text), 'no symbols / look-alikes: ' + out().text);
    const c = new Array(7).fill(0); for (let i = 0; i < 14000; i++) c[W.randInt(7)]++; A(c.every((n) => n > 1600 && n < 2400), 'uniform randInt: ' + c);
    set('opt-count', 10); await settle(); const many = out().text.split(NL); A(many.length === 10 && new Set(many).size === 10 && $('output-list').children.length === 10, 'bulk 10');
    set('opt-count', 1); set('opt-upper', false); set('opt-lower', false); set('opt-digits', false); await settle(); A(!out() && /Tick at least one/.test($('input-error').textContent), 'no types error');
    set('opt-lower', true);
    pill('seg-mode', 'passphrase'); set('opt-sep', ' '); await settle(); A(await waitFor(() => out() && out().text.split(' ').length === 5, 15000), 'passphrase 5 words: ' + (out() && out().text) + $('input-error').textContent);
    A(out().text.split(' ').every((w) => /^[A-Z]/.test(w)) && /\\d/.test(out().text), 'capitalised + number: ' + out().text);
    A($('output-badge').textContent === '74 bits' && !$('grp-passphrase').hidden && $('grp-password').hidden, 'passphrase bits: ' + $('output-badge').textContent);
    pill('seg-mode', 'pin'); await settle(); A(/^\\d{6}$/.test(out().text) && $('output-badge').textContent === '20 bits', 'pin: ' + out().text);
    A(W.crackTime(30) === 'instantly' && /years|universe/.test(W.crackTime(80)), 'crack time: ' + W.crackTime(80));
    $('btn-run').click(); await settle(); A(/^\\d{6}$/.test(out().text), 'new password button');
    $('btn-reset').click(); await settle(); A(out() && out().text.length === 20 && !$('grp-password').hidden && $('opt-length').value === '20', 'reset');`],
  ['upi-qr-generator', `
    set('upi-input', 'ada.l@okaxis'); set('name-input', 'Ada Lovelace'); set('amount-input', '1,250.5'); set('note-input', 'Order #12'); await settle();
    A(out() && out().text === 'upi://pay?pa=ada.l@okaxis&pn=Ada%20Lovelace&am=1250.50&cu=INR&tn=Order%20%2312', 'link: ' + (out() && out().text) + $('input-error').textContent);
    A(out().url === out().text && $('output-badge').textContent === '₹1,250.50', 'badge: ' + $('output-badge').textContent);
    A($('upi-qr').src.startsWith('data:image/png') && $('upi-amt').textContent === '₹1,250.50', 'preview');
    const q = new QRCodeGenerator(0, QRErrorCorrectLevel.M); q.addData(out().text); q.make(); A(T.S.qr.getModuleCount() === q.getModuleCount(), 'shared engine matrix');
    if ('BarcodeDetector' in window) { try { const r = await new BarcodeDetector({ formats: ['qr_code'] }).detect($('upi-qr')); if (r.length) A(r[0].rawValue === out().text, 'QR decodes to the link'); } catch (e) {} }
    const png = await T.T.download('png', T); A(png.blob.type === 'image/png' && (await createImageBitmap(png.blob)).width === 1024, 'png 1024');
    const svg = await T.T.download('svg', T); A(svg.text.startsWith('<svg') && /path d="M/.test(svg.text), 'svg');
    const card = await T.T.download('card', T); const bm = await createImageBitmap(card.blob); A(bm.width === 1200 && bm.height === 1800 && card.name === 'upi-card-ada.l.png', 'card ' + card.name);
    set('amount-input', ''); await settle(); A(!/am=/.test(out().text) && $('output-badge').textContent === 'Any amount', 'open amount');
    set('amount-input', '12.345'); await settle(); A(!out() && /Amount/.test($('input-error').textContent), 'bad amount');
    set('amount-input', ''); set('upi-input', 'ada'); await settle(); A(!out() && /name@bank/.test($('input-error').textContent), 'bad vpa');
    set('upi-input', 'ada@ybl'); set('name-input', ''); await settle(); A(out() && /payee name/.test($('status-badge').textContent), 'name warning');
    $('btn-reset').click(); await settle(); A(!out() && $('upi-input').value === '' && !$('upi-qr').getAttribute('src'), 'reset');`],
  ['barcode-generator', `
    const NL = String.fromCharCode(10), B = window.ToolityBarcode;
    A(B.gs1('590123412345') === 7 && B.gs1('03600029145') === 2, 'gs1 maths');
    set('opt-format', 'EAN13'); set('text-input', '590123412345'); await settle();
    A(out() && out().badge === '5901234123457' && /Check digit 7 added/.test($('status-badge').textContent), 'ean13: ' + (out() && out().badge) + $('input-error').textContent);
    A($('output-list').querySelector('svg rect, svg g'), 'svg drawn');
    set('text-input', '5901234123458'); await settle(); A(!out() && /should be 7/.test($('input-error').textContent), 'wrong check digit');
    set('text-input', '12345'); await settle(); A(!out() && /needs 12 digits/.test($('input-error').textContent), 'length error');
    set('opt-format', 'UPC'); set('text-input', '03600029145'); await settle(); A(out() && out().badge === '036000291452', 'upc');
    set('opt-format', 'CODE39'); set('text-input', 'abc-1'); await settle(); A(out() && out().badge === 'ABC-1', 'code39 upper');
    set('opt-format', 'CODE128'); set('text-input', 'A-1' + NL + NL + 'B-2' + NL + 'C-3'); await settle();
    A(out() && out().badge === '3 barcodes' && $('output-list').querySelectorAll('.bc-tile').length === 3, 'batch');
    const z = await T.T.download('zip', T); const zip = await JSZip.loadAsync(z.blob); A(Object.keys(zip.files).length === 3 && z.name === 'barcodes-code128-3.zip', 'zip ' + z.name);
    const p = await T.T.download('png', T); A(p.blob.type === 'image/png' && p.name === 'barcode-A-1.png', 'png');
    set('text-input', 'Line two' + NL + 'naïve'); await settle(); A(!out() && /Line 2/.test($('input-error').textContent), 'batch error line');
    $('btn-reset').click(); await settle(); A(!out() && $('opt-format').value === 'CODE128' && $('text-input').value === '', 'reset');`],
  ['dev/code-formatter', `
    const NL = String.fromCharCode(10), F = window.ToolityFormatter;
    const fin = async () => { await tick(500); A(await waitFor(() => !/Formatting|Loading/.test($('status-badge').textContent) && (out() || !$('input-error').hidden), 60000), 'timed out'); };
    set('text-input', 'function  f( a,b ){return a+b}'); await fin();
    A(out() && out().text === 'function f(a, b) {' + NL + '  return a + b;' + NL + '}' + NL, 'prettier js: ' + JSON.stringify(out() && out().text) + $('input-error').textContent);
    A(/Detected JavaScript/.test($('status-badge').textContent) && out().ext === 'js', 'detect js');
    pill('seg-mode', 'minify'); await fin(); A(out() && out().text.length < 30 && new Function(out().text + ';return f(2,3)')() === 5, 'terser: ' + (out() && out().text));
    set('text-input', 'a{color:red;margin:0 0 0 0}'); await fin(); A(out() && out().text === 'a{color:red;margin:0}', 'csso: ' + (out() && out().text));
    pill('seg-mode', 'beautify'); await fin(); A(out() && out().text === 'a {' + NL + '  color: red;' + NL + '  margin: 0 0 0 0;' + NL + '}' + NL, 'prettier css: ' + JSON.stringify(out() && out().text));
    set('text-input', 'select a,b from t where x=1'); await fin(); A(out() && out().text.startsWith('SELECT' + NL + '  a,' + NL + '  b' + NL + 'FROM'), 'sql: ' + JSON.stringify(out() && out().text));
    set('text-input', '<?xml version="1.0"?><r><a x="1">t</a><b/></r>'); await fin();
    A(out() && out().text === '<?xml version="1.0"?>' + NL + '<r>' + NL + '  <a x="1">t</a>' + NL + '  <b/>' + NL + '</r>' + NL, 'xml beautify: ' + JSON.stringify(out() && out().text));
    pill('seg-mode', 'minify'); set('text-input', out().text); await fin(); A(out() && out().text === '<?xml version="1.0"?><r><a x="1">t</a><b/></r>', 'xml minify: ' + (out() && out().text));
    A(F.minifyHtml('<div>' + NL + '  <b>a</b> <i>b</i>' + NL + '  <!-- x -->' + NL + '  <pre>  keep  </pre>' + NL + '</div>') === '<div><b>a</b> <i>b</i><pre>  keep  </pre></div>', 'html minify');
    A(F.minifySql("SELECT  a , 'x  y' -- c" + NL + "FROM t /* z */ WHERE b = 1") === "SELECT a,'x  y' FROM t WHERE b=1", 'sql minify: ' + F.minifySql("SELECT  a , 'x  y' -- c" + NL + "FROM t /* z */ WHERE b = 1"));
    A(F.detect('<div>x</div>') === 'html' && F.detect('{"a":1}') === 'json' && F.detect('interface A { b: string }') === 'typescript' && F.detect('.a { color: red; }') === 'css', 'detect');
    set('opt-lang', 'typescript'); await fin(); A(!out() && /minify TypeScript/.test($('input-error').textContent), 'ts minify refused');
    pill('seg-mode', 'beautify'); set('text-input', 'const a: number = 1'); await fin(); A(out() && out().text === 'const a: number = 1;' + NL && out().ext === 'ts', 'prettier ts: ' + JSON.stringify(out() && out().text));
    set('opt-lang', 'json'); set('text-input', '{"a":1,}'); await fin(); A(!out() && /JSON error/.test($('input-error').textContent), 'json error');
    set('opt-lang', 'javascript'); set('text-input', 'function ('); await fin(); A(!out() && /JavaScript error at line 1/.test($('input-error').textContent), 'js error: ' + $('input-error').textContent);
    $('btn-reset').click(); await tick(500); A(!out() && $('text-input').value === '' && $('opt-lang').value === 'auto', 'reset');`],
  ['data/log-parser', `
    const NL = String.fromCharCode(10);
    const GEN = ['2024-05-01T10:00:01Z INFO server started', '2024-05-01T10:05:00Z WARN slow query 812ms', '2024-05-01T11:00:00Z ERROR db: connection refused id=41', 'java.lang.Exception: boom', '    at Foo.bar(Foo.java:10)', '2024-05-01T11:30:00Z ERROR db: connection refused id=97', '2024-05-01T12:00:00Z DEBUG cache hit', 'garbage line'].join(NL);
    set('text-input', GEN); await settle();
    A(out() && /text log/.test($('input-count').textContent), 'format: ' + $('input-count').textContent + $('input-error').textContent);
    const stat = (i) => $('output-stats').children[i].querySelector('strong').textContent;
    A(stat(0) === '6 of 6' && stat(1) === '2' && stat(2) === '1', 'counts: ' + [0, 1, 2].map(stat).join('|'));
    A($('output-table').querySelectorAll('tbody tr')[2].querySelector('.log-msg').textContent.includes('at Foo.bar'), 'stack trace folded');
    A(/db: connection refused id=#/.test($('output-tops').textContent) && /2/.test($('output-tops').textContent), 'top messages normalised');
    A($('output-chart').children.length >= 2, 'chart bars: ' + $('output-chart').children.length);
    set('lvl-info', false); set('lvl-debug', false); set('lvl-other', false); await settle(); A(stat(0) === '3 of 6', 'level filter: ' + stat(0));
    set('search-input', 'ID=97'); await settle(); A(stat(0) === '1 of 6', 'search case-insensitive: ' + stat(0));
    set('opt-regex', true); set('search-input', 'id=(41|97)'); await settle(); A(stat(0) === '2 of 6', 'regex: ' + stat(0));
    set('search-input', '('); await settle(); A(!out() && /Search:/.test($('input-error').textContent), 'bad regex error');
    set('search-input', ''); set('opt-regex', false);
    ['info', 'debug', 'other'].forEach((l) => set('lvl-' + l, true));
    const d = new Date('2024-05-01T11:15:00Z'); const loc = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    set('time-from', loc); await settle(); A(stat(0) === '2 of 6', 'time from: ' + stat(0));
    set('time-from', '');
    const ACC = ['10.0.0.1 - - [01/May/2024:10:15:03 +0000] "GET /a?x=1 HTTP/1.1" 200 512 "-" "curl"', '10.0.0.2 - - [01/May/2024:10:16:03 +0000] "POST /b HTTP/1.1" 500 0', '10.0.0.1 - - [01/May/2024:10:17:03 +0000] "GET /a HTTP/1.1" 404 9'].join(NL);
    set('text-input', ACC); await settle(); A(/access log/.test($('input-count').textContent) && stat(1) === '1' && stat(2) === '1', 'access: ' + $('input-count').textContent + ' ' + stat(1));
    A(/Top paths/.test($('output-tops').textContent) && /\\/a2/.test($('output-tops').textContent.replace(/\\s/g, '')), 'access tops: ' + $('output-tops').textContent);
    const JL = ['{"level":50,"time":1714557600000,"msg":"pino fail"}', '{"level":"warn","timestamp":"2024-05-01T10:00:00Z","message":"careful"}'].join(NL);
    set('text-input', JL); await settle(); A(/JSON lines/.test($('input-count').textContent) && stat(1) === '1' && stat(2) === '1', 'json lines: ' + $('input-count').textContent);
    const SYS = '<11>May  1 10:00:00 host sshd[12]: Failed password' + NL + 'May  1 10:01:00 host cron[5]: job ok';
    set('text-input', SYS); await settle(); A(/syslog/.test($('input-count').textContent) && stat(1) === '1', 'syslog: ' + $('input-count').textContent + ' ' + stat(1));
    const csv = await T.T.download('csv', T); A(csv.text.split(NL)[0] === 'time,level,message' && csv.text.split(NL).length === 3, 'csv export');
    $('btn-reset').click(); await settle(); A(!out() && $('text-input').value === '' && $('lvl-info').checked, 'reset');`],
  ['dev/markdown-studio', `
    set('text-input', '# Hello World\\n\\nSome **bold** and a [link](https://example.com).\\n\\n| a | b |\\n|---|---|\\n| 1 | 2 |\\n\\n- [x] done\\n- [ ] todo');
    A(await waitFor(() => out() && /<h1/.test(out().text), 30000), 'no html output');
    A(/<h1 id="hello-world">Hello World<\\/h1>/.test(out().text), 'h1 id: ' + out().text.slice(0, 80));
    A(/<table>/.test(out().text) && /<strong>bold<\\/strong>/.test(out().text) && /type="checkbox"/.test(out().text), 'gfm: ' + out().text);
    A($('output-preview').querySelector('h1') && !$('output-preview').hidden && $('output-text').hidden, 'preview rendered');
    A(/1 heading/.test($('output-badge').textContent) && /min read/.test($('output-badge').textContent), 'badge: ' + $('output-badge').textContent);
    pill('seg-view', 'code'); await tick(300); A(!$('output-text').hidden && $('output-preview').hidden && /<h1/.test($('output-text').textContent), 'code view');
    set('text-input', 'Hi <script>alert(1)</script> <img src=x onerror=alert(1)>');
    A(await waitFor(() => out() && /Hi/.test(out().text) && !/script/.test(out().text), 20000), 'sanitize wait');
    A(!/onerror|<script/.test(out().text), 'sanitized: ' + out().text);
    pill('seg-mode', 'html2md'); A($('input-label').textContent === 'HTML', 'label switch');
    set('text-input', '<h2>Title</h2><p>Some <em>it</em> and <code>x</code></p><ul><li>one</li><li>two</li></ul>');
    A(await waitFor(() => out() && /^## Title/.test(out().text), 30000), 'md output: ' + (out() && out().text));
    A(/- +one\\n- +two/.test(out().text) && /_it_/.test(out().text) && /\`x\`/.test(out().text), 'md details: ' + out().text);
    const dl = await T.T.download('html', T); A(/<!doctype html>/i.test(dl.text) && /<h2[^>]*>Title/.test(dl.text) && /\\.html$/.test(dl.name), 'full doc download');
    const md = await T.T.download('md', T); A(/^## Title/.test(md.text) && /\\.md$/.test(md.name), 'md download');
    $('btn-reset').click(); await settle(); A(!out() && $('text-input').value === '' && $('input-label').textContent === 'Markdown' && $('output-preview').innerHTML === '', 'reset');`],
  ['dev/regex-tester', `
    set('rx-pattern', '(?<user>\\\\w+)@(\\\\w+)\\\\.com'); set('text-input', 'ada@example.com, linus@kernel.com and bad@x.org');
    A(await waitFor(() => out() && /2 matches/.test($('output-badge').textContent), 20000), 'badge: ' + $('output-badge').textContent);
    A($('output-highlight').querySelectorAll('mark').length === 2, 'highlight count: ' + $('output-highlight').querySelectorAll('mark').length);
    A(out().text === 'ada@example.com\\nlinus@kernel.com', 'text: ' + out().text);
    A($('output-matches').textContent.includes('user') && $('output-matches').textContent.includes('example') && $('output-matches').querySelectorAll('.rx-match').length === 2, 'groups listed');
    set('flag-g', false); A(await waitFor(() => /^1 match ·/.test($('output-badge').textContent), 10000), 'non-global: ' + $('output-badge').textContent);
    set('flag-g', true); await tick(400);
    set('rx-pattern', '(abc'); await tick(500); A(!$('input-error').hidden && /Invalid pattern/.test($('input-error').textContent), 'syntax error: ' + $('input-error').textContent);
    set('rx-pattern', '(\\\\w+)@(\\\\w+)\\\\.com'); pill('seg-mode', 'replace'); set('rx-replace', '$2:$1');
    A(await waitFor(() => out() && /example:ada, kernel:linus/.test(out().text), 20000), 'replace: ' + (out() && out().text));
    A(!$('rx-replace-group').hidden && !$('output-text').hidden && $('output-highlight').hidden, 'replace ui');
    pill('seg-mode', 'match'); set('rx-pattern', '(a+)+$'); set('text-input', 'a'.repeat(40) + 'b');
    A(await waitFor(() => !$('input-error').hidden && /took more than/.test($('input-error').textContent), 8000), 'timeout: ' + $('input-error').textContent);
    set('rx-pattern', '\\\\d+'); set('text-input', 'a1b22c333');
    A(await waitFor(() => out() && /3 matches/.test($('output-badge').textContent), 10000), 'recovered after timeout: ' + $('output-badge').textContent);
    const j = JSON.parse((await T.T.download('json', T)).text); A(j.total === 3 && j.matches[2].match === '333' && j.matches[2].index === 6, 'json download');
    document.querySelector('.rx-chip[data-insert="(abc)"]').click(); await tick(200); A($('rx-pattern').value.endsWith('(abc)'), 'cheat insert: ' + $('rx-pattern').value);
    document.querySelector('.rx-chip[data-pattern]').click(); await tick(200); A($('rx-pattern').value.includes('@'), 'preset: ' + $('rx-pattern').value);
    $('btn-reset').click(); await settle(); A(!out() && $('rx-pattern').value === '' && $('flag-g').checked && !$('flag-i').checked && $('rx-replace-group').hidden, 'reset');`],
  ['data/sql-on-csv', `
    const addFile = (name, text) => { const dt = new DataTransfer(); dt.items.add(new File([text], name, { type: 'text/plain' })); const i = $('file-input'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); };
    addFile('Sales 2024.csv', 'id,city,amount\\n1,London,120\\n2,Helsinki,80\\n3,London,30');
    A(await waitFor(() => !$('sql-tables').hidden && /sales_2024/.test($('sql-tables').textContent), 40000), 'table card: ' + $('sql-tables').textContent);
    A(/3 rows · 3 cols/.test($('sql-tables').textContent) && /INTEGER/.test($('sql-tables').textContent) && /TEXT/.test($('sql-tables').textContent), 'schema: ' + $('sql-tables').textContent);
    A(/sales_2024/.test($('sql-input').placeholder), 'placeholder: ' + $('sql-input').placeholder);
    set('sql-input', 'SELECT city, SUM(amount) AS total FROM sales_2024 GROUP BY city ORDER BY total DESC'); await tick(300);
    A(/Press Run query/.test($('status-badge').textContent), 'status: ' + $('status-badge').textContent);
    await go(); A(out() && out().text === 'city,total\\nLondon,150\\nHelsinki,80', 'result: ' + (out() && out().text));
    A($('output-table').querySelectorAll('tbody tr').length === 2 && $('output-table').querySelector('td.is-num'), 'table rows');
    A(/2 rows · 2 cols/.test($('output-badge').textContent), 'badge: ' + $('output-badge').textContent);
    set('sql-input', 'SELECT 1'); await tick(300); A(out() && /Query changed/.test($('status-badge').textContent) && $('output-table').querySelectorAll('tbody tr').length === 2, 'result kept while editing');
    addFile('cities.json', '[{"city":"London","country":"UK"},{"city":"Helsinki","country":"FI"}]');
    A(await waitFor(() => /cities/.test($('sql-tables').textContent), 20000), 'json table');
    set('text-input', 'city,tax\\nLondon,20\\nHelsinki,24');
    set('sql-input', 'SELECT c.country, SUM(s.amount * p.tax / 100.0) AS tax FROM sales_2024 s JOIN cities c ON c.city = s.city JOIN pasted p ON p.city = s.city GROUP BY c.country ORDER BY c.country');
    await go(); A(out() && out().text === 'country,tax\\nFI,19.2\\nUK,30', 'join: ' + (out() && out().text));
    A(/pasted/.test($('sql-tables').textContent), 'pasted table listed');
    set('sql-input', 'SELECT * FROM nope'); await go(); A(!$('input-error').hidden && /no such table/.test($('input-error').textContent), 'sql error: ' + $('input-error').textContent);
    set('sql-input', 'SELECT id, city FROM sales_2024 ORDER BY id LIMIT 2'); await go();
    const js = JSON.parse((await T.T.download('json', T)).text); A(js.length === 2 && js[0].city === 'London' && js[0].id === 1, 'json download: ' + JSON.stringify(js));
    const dbf = await T.T.download('db', T); A(dbf.blob && dbf.blob.size > 4096 && dbf.name === 'tables.db', 'db export');
    $('sql-tables').querySelector('.sql-col').click(); await tick(100); A(/"?id"?$/.test($('sql-input').value), 'column insert: ' + $('sql-input').value);
    $('btn-reset').click(); await settle(); A(!out() && $('sql-tables').hidden && $('sql-input').value === '' && $('text-input').value === '', 'reset');`],
  ['robots-sitemap-generator', `
    await settle(); A(out() && /^User-agent: \\*\\nDisallow:\\n$/.test(out().text), 'default allow-all: ' + JSON.stringify(out() && out().text));
    document.querySelector('[data-preset="ai"]').click(); await settle();
    A(/User-agent: GPTBot\\nUser-agent: ChatGPT-User/.test(out().text) && /Disallow: \\/\\n\\nUser-agent: \\*\\nDisallow:\\n$/.test(out().text), 'ai preset: ' + out().text);
    set('site-url', 'example.com'); await settle(); A(/\\nSitemap: https:\\/\\/example.com\\/sitemap.xml\\n$/.test(out().text), 'sitemap line: ' + out().text);
    $('btn-add-group').click(); await tick(100); const g = $('rb-groups').lastElementChild;
    g.querySelector('.rb-ua').value = 'Bingbot, DuckDuckBot'; g.querySelector('.rb-dis').value = 'admin/\\n/private'; g.querySelector('.rb-allow').value = '/admin/public'; g.querySelector('.rb-delay').value = '5';
    g.querySelector('.rb-ua').dispatchEvent(new Event('input', { bubbles: true })); await settle();
    A(/User-agent: Bingbot\\nUser-agent: DuckDuckBot\\nDisallow: \\/admin\\/\\nDisallow: \\/private\\nAllow: \\/admin\\/public\\nCrawl-delay: 5/.test(out().text), 'custom group: ' + out().text);
    A(/3 groups · 4 rules/.test($('output-badge').textContent), 'badge: ' + $('output-badge').textContent);
    g.querySelector('.rb-del').click(); await settle(); A(/2 groups/.test($('output-badge').textContent), 'remove group');
    pill('seg-mode', 'sitemap'); A($('rb-pane').hidden && !$('sm-pane').hidden, 'pane switch');
    set('text-input', '/\\n/about\\n/blog/post-1, 2026-01-15, monthly, 0.8\\nhttps://other.com/x\\n/about\\nnot a url ::\\n/bad, 15/01/2026'); await settle();
    const xml = out().text; A(/<loc>https:\\/\\/example.com\\/<\\/loc>/.test(xml) && /<loc>https:\\/\\/example.com\\/about<\\/loc>/.test(xml), 'resolved urls: ' + xml);
    A(/<lastmod>2026-01-15<\\/lastmod>\\s*<changefreq>monthly<\\/changefreq>\\s*<priority>0.8<\\/priority>/.test(xml), 'overrides: ' + xml);
    A((xml.match(/<url>/g) || []).length === 5 && /5 URLs/.test($('output-badge').textContent), 'url count: ' + (xml.match(/<url>/g) || []).length);
    const iss = $('output-issues').textContent; A(/Different host/.test(iss) && /Duplicate removed/.test(iss) && /Bad lastmod/.test(iss) && /Not a URL/.test(iss), 'issues: ' + iss);
    A(/<lastmod>\\d{4}-\\d{2}-\\d{2}<\\/lastmod>/.test(xml), 'default lastmod today');
    set('opt-lastmod', 'none'); await settle(); A((out().text.match(/<lastmod>/g) || []).length === 1, 'lastmod omitted by default');
    const r = await T.T.download('robots', T); A(r.name === 'robots.txt' && /User-agent/.test(r.text), 'robots download from sitemap mode');
    $('btn-reset').click(); await settle(); A(out() && /^User-agent: \\*\\nDisallow:\\n$/.test(out().text) && $('rb-groups').children.length === 1 && !$('rb-pane').hidden, 'reset');`],
  ['serp-snippet-preview', `
    set('f-title', 'Free Online Image Compressor | Toolity'); set('f-desc', 'Compress JPG, PNG and WebP images in your browser — no upload, no sign-up, no limits on how many files you process.'); set('f-url', 'https://toolity.in/media/image-compressor/'); await settle();
    A(out() && $('serp-title').textContent === 'Free Online Image Compressor | Toolity', 'title: ' + $('serp-title').textContent);
    A($('serp-url').textContent === 'toolity.in › media › image-compressor' && $('serp-name').textContent === 'toolity.in', 'breadcrumb: ' + $('serp-url').textContent);
    A(/\\d+ \\/ 600 px/.test($('m-title-val').textContent) && parseFloat($('m-title').style.width) > 20, 'title meter: ' + $('m-title-val').textContent);
    A(/Fits desktop/.test($('output-issues').textContent), 'issues: ' + $('output-issues').textContent);
    set('f-title', 'An Extremely Long Title That Keeps Going And Going Well Past What Google Will Ever Show In Results Anywhere'); await settle();
    A(/\\.\\.\\.$/.test($('serp-title').textContent) && /truncated/i.test($('output-issues').textContent) && $('m-title').classList.contains('is-over'), 'truncation: ' + $('serp-title').textContent);
    pill('seg-device', 'mobile'); await settle(); A($('output-card').dataset.device === 'mobile' && /\\/ 920 px/.test($('m-title-val').textContent), 'mobile limits: ' + $('m-title-val').textContent);
    set('f-date', '2026-10-18'); await settle(); A(/^18 Oct 2026 — /.test($('serp-desc-text').textContent), 'date prefix: ' + $('serp-desc-text').textContent);
    set('html-input', HTML); set('url-input', ''); $('btn-run').click(); await tick(150); await settle();
    A($('f-title').value === 'Fixture Page Title' && $('f-desc').value === 'A fixture description.' && $('f-url').value === 'https://example.com/fixture', 'import: ' + $('f-title').value + ' | ' + $('f-url').value);
    const png = await T.T.download('png', T); A(png.blob && png.blob.type === 'image/png' && png.blob.size > 2000, 'png export');
    $('btn-reset').click(); await settle(); A(!out() && $('f-title').value === '' && $('html-input').value === '', 'reset');`],
  ['meta-tag-generator', `
    set('f-title', 'Free Online Image Compressor | Toolity'); set('f-desc', 'Compress JPG, PNG and WebP images in your browser.'); set('f-canonical', 'https://toolity.in/media/image-compressor/'); await settle();
    let c = out().text;
    A(/^<meta charset="UTF-8">\\n<meta name="viewport"/.test(c) && /<title>Free Online Image Compressor \\| Toolity<\\/title>/.test(c), 'head start: ' + c);
    A(/<link rel="canonical" href="https:\\/\\/toolity.in\\/media\\/image-compressor\\/">/.test(c) && /<meta property="og:url" content="https:\\/\\/toolity.in\\/media\\/image-compressor\\/">/.test(c), 'canonical + og:url');
    A(/<meta property="og:locale" content="en_US">/.test(c) && /<meta name="twitter:card" content="summary_large_image">/.test(c) && !/og:image/.test(c) && /<meta name="robots" content="index, follow, max-image-preview:large">/.test(c), 'defaults: ' + c);
    A(/Large-image card without an image/.test($('output-issues').textContent), 'image warning');
    set('f-image', 'https://toolity.in/og.png'); set('f-imagealt', 'Toolity'); set('f-index', false); set('f-twsite', '@toolity'); await settle(); c = out().text;
    A(/<meta property="og:image" content="https:\\/\\/toolity.in\\/og.png">\\n<meta property="og:image:alt" content="Toolity">/.test(c) && /<meta name="twitter:image"/.test(c) && /<meta name="twitter:site" content="@toolity">/.test(c), 'image tags: ' + c);
    A(/<meta name="robots" content="noindex, follow, max-image-preview:large">/.test(c) && /noindex/.test($('output-issues').textContent), 'robots: ' + c);
    set('f-canonical', 'not a url'); await settle(); A(/Canonical must be an absolute/.test($('output-issues').textContent) && !/rel="canonical"/.test(out().text), 'bad canonical');
    set('f-canonical', ''); set('opt-boiler', false); set('f-twcard', ''); await settle(); c = out().text;
    A(!/charset/.test(c) && !/twitter:/.test(c) && /^<title>/.test(c), 'toggles off: ' + c);
    A(/serp-snippet-preview\\/#t=Free\\+Online/.test($('serp-link').href), 'serp link: ' + $('serp-link').href);
    set('f-desc', '<b>x</b> & "y"'); await settle(); A(/content="&lt;b&gt;x&lt;\\/b&gt; &amp; &quot;y&quot;"/.test(out().text), 'escaping: ' + out().text);
    const dl = await T.T.download('html', T); A(dl.name === 'head.html' && dl.text === out().text, 'download');
    $('btn-reset').click(); await settle(); A(!out() && $('f-title').value === '' && $('f-index').checked && $('opt-boiler').checked, 'reset');`],
  ['docs/diff-checker', `
    set('text-a', 'line one\\nline two\\nline three\\nline four'); set('text-b', 'line one\\nline 2\\nline three\\nline five\\nline six');
    A(await waitFor(() => out() && /\\+1 −0 ~2/.test($('output-badge').textContent), 30000), 'badge: ' + $('output-badge').textContent);
    const rows = () => [...$('output-table').querySelectorAll('tr')];
    A(rows().length === 5 && rows()[1].classList.contains('diff-chg') && rows()[3].classList.contains('diff-chg') && rows()[4].classList.contains('diff-add'), 'side rows: ' + rows().map(r => r.className).join(','));
    A(rows()[1].querySelector('.diff-l em') && rows()[1].querySelector('.diff-l em').textContent === 'two' && rows()[1].querySelector('.diff-r em').textContent === '2', 'word highlight');
    A(/^Index: original|^={3,}|^--- original/m.test(out().text) && /^-line two$/m.test(out().text) && /^\\+line 2$/m.test(out().text), 'patch: ' + out().text);
    A($('output-table').querySelectorAll('tr[data-change]').length === 2 && /2 changes/.test($('diff-pos').textContent), 'change count: ' + $('diff-pos').textContent);
    $('btn-next-change').click(); await tick(100); A(/1 \\/ 2/.test($('diff-pos').textContent) && rows()[1].classList.contains('is-current'), 'nav');
    pill('seg-view', 'inline'); await settle(); A(rows().length === 7 && rows()[1].classList.contains('diff-del') && rows()[2].classList.contains('diff-add'), 'inline rows: ' + rows().map(r => r.className).join(','));
    set('opt-context', '0'); await settle(); A(rows().some(r => r.classList.contains('diff-skip')) && !rows().some(r => r.classList.contains('diff-same')), 'changes only');
    set('opt-context', 'all'); pill('seg-view', 'side'); set('opt-ws', true); set('text-a', 'a  b\\n\\tc'); set('text-b', 'a b\\nc');
    A(await waitFor(() => out() && /No differences/.test($('output-badge').textContent), 20000), 'ignore ws: ' + $('output-badge').textContent);
    set('opt-ws', false); set('opt-case', true); set('text-a', 'Hello'); set('text-b', 'hello'); A(await waitFor(() => /No differences/.test($('output-badge').textContent), 20000), 'ignore case');
    set('opt-case', false); pill('seg-mode', 'json'); set('text-a', '{"b":1,"a":{"y":2,"x":[1,2]}}'); set('text-b', '{\\n "a": {"x": [1,2], "y": 2},\\n "b": 1\\n}');
    A(await waitFor(() => /No differences/.test($('output-badge').textContent), 20000), 'json canonical: ' + $('output-badge').textContent);
    set('text-b', '{"b":2,"a":{"y":2,"x":[1,2]}}'); A(await waitFor(() => /~1/.test($('output-badge').textContent), 20000), 'json change: ' + $('output-badge').textContent);
    set('text-b', '{bad'); await tick(600); A(await waitFor(() => !$('input-error').hidden && /Changed is not valid JSON/.test($('input-error').textContent), 10000), 'json error: ' + $('input-error').textContent);
    pill('seg-mode', 'text'); set('text-a', 'x'); set('text-b', 'y'); await waitFor(() => out() && /~1/.test($('output-badge').textContent), 20000);
    const dt = new DataTransfer(); dt.items.add(new File(['f1'], 'a.txt')); dt.items.add(new File(['f2'], 'b.txt')); $('file-input').files = dt.files; $('file-input').dispatchEvent(new Event('change', { bubbles: true }));
    A(await waitFor(() => $('text-a').value === 'f1' && $('text-b').value === 'f2', 5000), 'two files');
    const h = await T.T.download('html', T); A(/<!doctype html>/.test(h.text) && /diff-chg/.test(h.text), 'html export');
    $('btn-reset').click(); await settle(); A(!out() && $('text-a').value === '' && $('output-table').innerHTML === '', 'reset');`],
  ['docs/readability-scorer', `
    const EASY = 'The cat sat on the mat. It was warm. The sun was out. We went to the park. It was a good day.';
    set('text-input', EASY); await settle(); let r = out().res;
    A(r.nS === 5 && r.nW === 23 && r.fre > 90, 'easy: ' + JSON.stringify([r.nS, r.nW, r.fre]));
    A(/FRE 1\\d\\d|FRE 9\\d/.test($('output-badge').textContent) && $('output-fre').dataset.band === 'good', 'badge: ' + $('output-badge').textContent);
    const HARD = 'Notwithstanding the aforementioned considerations, the implementation of comprehensive organisational restructuring initiatives necessitates extraordinarily meticulous evaluation of multidimensional stakeholder perspectives, which was subsequently approved by the committee after the proposal had been reviewed carefully by external consultants.';
    set('text-input', HARD); await settle(); r = out().res;
    A(r.nS === 1 && r.fre < 10 && r.consensus > 16 && r.longS === 1, 'hard: ' + JSON.stringify([r.nS, r.fre, r.consensus, r.longS]));
    A($('output-highlight').querySelector('.rd-s.rd-long') && $('output-highlight').querySelectorAll('.rd-passive').length >= 2 && $('output-highlight').querySelectorAll('.rd-adverb').length >= 2, 'highlights: ' + $('output-highlight').querySelectorAll('.rd-passive').length + ' passive, ' + $('output-highlight').querySelectorAll('.rd-adverb').length + ' adverbs');
    A($('output-fre').dataset.band === 'bad' && /Very hard/.test($('output-fre').textContent), 'band: ' + $('output-fre').textContent);
    set('opt-passive', false); set('opt-adverb', false); await settle(); A(!$('output-highlight').querySelector('.rd-passive, .rd-adverb'), 'toggles off');
    set('text-input', 'Dr. Smith arrived at 3.5 p.m. He left, e.g. quickly. Fine!'); await settle(); A(out().res.nS === 3, 'abbrev sentences: ' + out().res.nS);
    set('text-input', '<h1>Title</h1><p>This is <b>html</b> text. It has two sentences.</p><script>var x = 1;</script>'); await settle(); A(out().res.nS === 3 && !/var x/.test($('output-highlight').textContent), 'html stripped: ' + out().res.nS);
    set('text-input', '# Heading\\n\\nSome **bold** text with a [link](https://x.y). Another line.'); await settle(); A(out().res.nW === 9 && !/https/.test($('output-highlight').textContent), 'markdown stripped: ' + out().res.nW);
    const j = JSON.parse((await T.T.download('json', T)).text); A(typeof j.fre === 'number' && j.nW === 9 && !('html' in j), 'json report');
    A(/Flesch Reading Ease:/.test(out().text) && /Words: 9/.test(out().text), 'txt report');
    $('btn-reset').click(); await settle(); A(!out() && $('text-input').value === '' && $('opt-passive').checked, 'reset');`]
];

(async () => {
  const only = process.env.ONLY;
  const port = 9800 + Math.floor(Math.random() * 100);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500); try { await getJson(`http://127.0.0.1:${port}/json/version`); break; } catch (e) {} }
  const run = async (slug, expr, raw) => {
    const t = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
    let id = 0; const pending = {}; const errs = [];
    const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description?.split('\n')[0] || d.params.exceptionDetails.text); };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${BASE}${slug.includes('/') ? slug : 'labs/' + slug}/` }); await sleep(1500);
    const r = await send('Runtime.evaluate', { expression: `(async () => { window.__raw = ${!!raw}; ${HELPERS} try { ${expr} } catch (e) { f.push('threw: ' + (e && e.message || e)); } return f; })()`, returnByValue: true, awaitPromise: true, timeout: 120000 });
    ws.close(); await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    return (r?.result?.value || ['eval failed: ' + JSON.stringify(r?.exceptionDetails?.exception?.description || r)]).concat(errs.map(e => 'JS error: ' + e));
  };
  let fails = 0, n = 0;
  for (const [slug, expr, raw] of CASES) {
    if (only && slug !== only) continue; n++;
    const f = await run(slug, expr, raw);
    console.log((f.length ? '✗ ' : '✓ ') + slug + (f.length ? '\n    ' + f.join('\n    ') : ''));
    if (f.length) fails++;
  }
  chrome.kill();
  console.log(fails ? `\n${fails}/${n} failing` : `\n✓ ${n}/${n} web tools passing`);
  process.exit(fails ? 1 : 0);
})();

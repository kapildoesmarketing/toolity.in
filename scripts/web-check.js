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
    $('btn-reset').click(); await settle(); A(!out() && $('text-input').value === '' && $('opt-passive').checked, 'reset');`],
  ['text-to-handwriting', `
    set('text-input', 'The quick brown fox jumps over the lazy dog. '.repeat(40) + '\\n---\\nSecond page here.');
    A(await waitFor(() => out() && /[2-4] pages/.test($('output-badge').textContent), 30000), 'pages: ' + $('output-badge').textContent);
    const cv = $('hw-canvas'); A(cv.width === 1654 && cv.height === 2339, 'a4 size: ' + cv.width + 'x' + cv.height);
    const inked = () => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 160) if (d[i] < 120 && d[i + 2] > 100) n++; return n; };
    A(inked() > 200, 'blue ink drawn: ' + inked());
    A(/Page 1 of [2-4]/.test($('hw-pager').textContent), 'pager: ' + $('hw-pager').textContent);
    $('hw-pager').querySelector('[data-go="1"]').click(); await tick(100); A(/Page 2 of/.test($('hw-pager').textContent), 'next page');
    set('opt-page', 'a5'); await settle(); A(await waitFor(() => cv.width === 1166, 10000), 'a5 size: ' + cv.width);
    set('hw-ink', '#1a1a1a'); set('opt-scan', true); await settle(); await tick(300); A(out() && /A5/.test($('output-badge').textContent), 'scan + black ok');
    const png = await T.T.download('png', T); A(png.blob && png.blob.type === 'image/png' && png.blob.size > 20000, 'png: ' + (png.blob && png.blob.size));
    const pdf = await T.T.download('pdf', T); A(pdf.blob && pdf.blob.size > 50000 && /\\.pdf$/.test(pdf.name), 'pdf: ' + (pdf.blob && pdf.blob.size));
    const zip = await T.T.download('zip', T); A(zip.blob && zip.blob.size > 40000 && /\\.zip$/.test(zip.name), 'zip: ' + (zip.blob && zip.blob.size));
    set('hw-font', 'custom'); await settle(); A(/Upload a font file first/.test($('status-badge').textContent), 'custom font gate: ' + $('status-badge').textContent);
    $('btn-reset').click(); await settle(); A(!out() && $('text-input').value === '' && $('hw-pager').innerHTML === '' && $('hw-font').value === 'homemade-apple', 'reset');`],
  ['countdown-page-maker', `
    set('cd-title', 'Launch day'); set('cd-to', '2030-01-01T09:00'); set('cd-tz', 'Asia/Kolkata'); set('cd-done', 'We are live'); await settle();
    const u = new URL($('cd-link').value); A(u.pathname === '/widgets/countdown/embed/' && u.searchParams.get('title') === 'Launch day' && u.searchParams.get('to') === '2030-01-01T09:00' && u.searchParams.get('tz') === 'Asia/Kolkata' && u.searchParams.get('size') === 'lg' && u.searchParams.get('theme') === 'dark', 'link: ' + u.href);
    A($('cd-frame').src === u.href && $('cd-open').href === u.href, 'preview + open');
    A(/days to go/.test($('output-badge').textContent), 'badge: ' + $('output-badge').textContent);
    A($('cd-share-links').querySelectorAll('a').length === 4 && /wa\\.me/.test($('cd-share-links').querySelector('a').href), 'share chips');
    A(location.hash.includes('title=Launch+day'), 'deep link hash: ' + location.hash);
    pill('seg-variant', 'minimal'); set('opt-seconds', false); await settle(); const u2 = new URL($('cd-link').value); A(u2.searchParams.get('variant') === 'minimal' && u2.searchParams.get('seconds') === '0', 'variant + units: ' + u2.search);
    set('cd-accent-input', '#00AA55'); await settle(); A(new URL($('cd-link').value).searchParams.get('accent') === '00aa55', 'accent');
    const ics = await T.T.download('ics', T); A(/BEGIN:VCALENDAR/.test(ics.text) && /SUMMARY:Launch day/.test(ics.text) && /DTSTART:20300101T033000Z/.test(ics.text) && ics.name === 'launch-day.ics', 'ics: ' + ics.text);
    const qr = await T.T.download('qr', T); A(qr.blob && qr.blob.type === 'image/png' && qr.blob.size > 500, 'qr png');
    $('btn-reset').click(); await settle(); A(!out() && $('cd-title').value === '' && !$('cd-frame').getAttribute('src') && location.hash === '', 'reset');`],
  ['schema-markup-generator', `
    await settle(); A($('sc-type').value === 'Article' && $('f-headline') && $('f-datePublished'), 'article form rendered');
    A(!out(), 'no output while empty');
    set('f-headline', 'Hello World'); set('f-image', 'not a url'); await settle();
    let j = () => JSON.parse(out().text.replace(/^<script[^>]*>\\n|\\n<\\/script>$/g, ''));
    A(out() && j()['@type'] === 'Article' && j().headline === 'Hello World' && j()['@context'] === 'https://schema.org', 'article json: ' + out().text);
    let iss = $('output-issues').textContent; A(/Image URL must be an absolute/.test(iss) && /Published is required/.test(iss) && /Author name is required/.test(iss), 'issues: ' + iss);
    set('f-image', 'https://example.com/a.png'); set('f-datePublished', '2026-10-18T09:30'); set('f-author', 'Kapil'); set('f-publisher', 'Toolity'); set('f-kind', 'BlogPosting'); await settle();
    A(j()['@type'] === 'BlogPosting' && /^2026-10-18T09:30:00[+-]\\d{2}:\\d{2}$/.test(j().datePublished) && j().author.name === 'Kapil' && j().publisher['@type'] === 'Organization' && !('description' in j()), 'filled: ' + out().text);
    A(/All required fields present/.test($('output-issues').textContent) && /valid/.test($('output-badge').textContent), 'valid badge: ' + $('output-badge').textContent);
    set('sc-type', 'FAQPage'); await settle(); A($('sc-fields').querySelectorAll('.sc-row').length === 1, 'faq one row');
    $('sc-fields').querySelector('.sc-add').click(); await settle(); const rows = $('sc-fields').querySelectorAll('.sc-row'); A(rows.length === 2, 'faq add row');
    const setIn = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    setIn(rows[0].querySelector('[data-key="q"]'), 'Is it free?'); setIn(rows[0].querySelector('[data-key="a"]'), 'Yes.'); setIn(rows[1].querySelector('[data-key="q"]'), 'Offline?'); setIn(rows[1].querySelector('[data-key="a"]'), 'Mostly.'); await settle();
    A(j().mainEntity.length === 2 && j().mainEntity[1].acceptedAnswer.text === 'Mostly.', 'faq json: ' + out().text);
    rows[0].querySelector('.sc-del').click(); await settle(); A(j().mainEntity.length === 1 && j().mainEntity[0].name === 'Offline?', 'faq remove');
    set('sc-type', 'Product'); await settle(); set('f-name', 'Widget'); set('f-image', 'https://x.y/p.png'); set('f-price', '9.99'); set('f-ratingValue', '7'); await settle();
    A(/Rating \\(1–5\\) must be 1–5/.test($('output-issues').textContent) && j().offers.price === '9.99' && j().offers.priceCurrency === 'INR', 'product: ' + out().text);
    set('opt-indent', '0'); await settle(); A(!/\\n  /.test(out().json), 'minified');
    const dl = await T.T.download('json', T); A(/\\.json$/.test(dl.name) && JSON.parse(dl.text)['@type'] === 'Product', 'json download');
    $('btn-reset').click(); await settle(); A(!out() && $('sc-type').value === 'Article' && $('f-headline') && $('f-headline').value === '', 'reset');`],
  ['dev/html-css-js-playground', `
    set('pg-html', '<h1 id="t">Hi</h1>'); set('pg-css', 'h1 { color: rgb(255, 0, 0); }'); set('pg-js', 'console.log("hello", {a:1}); console.warn("careful"); document.getElementById("t").textContent = "Changed"; setTimeout(() => { throw new Error("boom"); }, 10);');
    A(await waitFor(() => out() && $('pg-frame').srcdoc.includes('Hi'), 10000), 'ran');
    A(await waitFor(() => $('pg-console').querySelectorAll('.pg-log').length >= 3, 8000), 'console count: ' + $('pg-console').textContent);
    const logs = [...$('pg-console').querySelectorAll('.pg-log')].map(l => l.className + ':' + l.textContent);
    A(logs.some(l => /pg-log:hello/.test(l) && /"a": 1/.test(l)) && logs.some(l => /pg-warn:careful/.test(l)) && logs.some(l => /pg-error:.*boom.*line 1/.test(l)), 'console: ' + logs.join(' | '));
    A(await waitFor(() => /#h=[A-Za-z0-9_-]{10,}/.test($('pg-link').value), 5000), 'share link: ' + $('pg-link').value);
    const link = $('pg-link').value;
    A(/<style>\\nh1 \\{ color/.test(out().text) && /<script>\\nconsole\\.log/.test(out().text) && !/postMessage/.test(out().text), 'single html clean');
    set('opt-tailwind', true); await settle(); await tick(700); A(/cdn\\.tailwindcss\\.com/.test($('pg-frame').srcdoc), 'tailwind toggle');
    const zip = await T.T.download('zip', T); A(zip.blob && zip.blob.size > 300 && zip.name === 'playground.zip', 'zip');
    const ta = $('pg-js'); ta.focus(); ta.setSelectionRange(0, 0); ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); A(ta.value.startsWith('  console'), 'tab indent: ' + JSON.stringify(ta.value.slice(0, 10)));
    const dec = await window.ToolityPlayground.decode(link.split('#h=')[1]); A(dec[0] === '<h1 id="t">Hi</h1>' && /rgb\\(255, 0, 0\\)/.test(dec[1]) && /boom/.test(dec[2]), 'link round-trip: ' + JSON.stringify(dec[0]));
    $('btn-reset').click(); await settle(); A(!out() && $('pg-html').value === '' && $('pg-console').innerHTML === '' && $('pg-link').value === '', 'reset');`],
  ['dev/config-converter', `
    const until = async (re, ms = 30000) => { const ok = await waitFor(() => out() && re.test(out().text) && !/Converting/.test($('status-badge').textContent), ms); return ok; };
    const ENV = 'DATABASE__HOST=db.local\\nDATABASE__PORT=5432\\nDEBUG=true\\nAPP_NAME="My App" # trailing\\nAPI_TOKEN=abc\\nMULTI="line1\\\\nline2"\\n# comment\\nEMPTY=';
    set('text-input', ENV); A(await until(/DATABASE/), 'json out');
    let j = JSON.parse(out().text); A(j.DATABASE.HOST === 'db.local' && j.DATABASE.PORT === 5432 && j.DEBUG === true && j.APP_NAME === 'My App' && j.MULTI === 'line1\\nline2' && j.EMPTY === '', 'env→json: ' + out().text);
    A(/Detected \\.env → JSON/.test($('status-badge').textContent) && /secrets \\(API_TOKEN\\)/.test($('output-issues').textContent), 'detect + secret warn: ' + $('status-badge').textContent + ' ' + $('output-issues').textContent);
    set('opt-types', false); A(await until(/"PORT": "5432"/), 'untyped'); j = JSON.parse(out().text); A(j.DEBUG === 'true', 'untyped bool');
    set('opt-to', 'yaml'); A(await until(/^DATABASE:\\n  HOST: "?db\\.local"?/m), 'yaml: ' + out().text);
    set('opt-to', 'configmap'); A(await until(/kind: "?ConfigMap"?/), 'configmap kind'); A(/DATABASE__HOST: "db\\.local"/.test(out().text), 'configmap data: ' + out().text);
    set('opt-secret', true); A(await until(/kind: "?Secret"?/), 'secret kind'); A(/DATABASE__HOST: "ZGIubG9jYWw="/.test(out().text), 'secret b64: ' + out().text);
    set('opt-secret', false); set('opt-to', 'compose'); A(await until(/^environment:\\n  DATABASE__HOST: "db\\.local"/m), 'compose: ' + out().text);
    set('text-input', '{"server":{"port":8080,"name":"api x"},"debug":false,"tags":["a","b"]}'); set('opt-to', 'env'); A(await until(/^SERVER__PORT/m), 'json→env wait');
    A(out().text === 'SERVER__PORT=8080\\nSERVER__NAME="api x"\\nDEBUG=false\\nTAGS="[\\\\"a\\\\",\\\\"b\\\\"]"\\n', 'json→env: ' + JSON.stringify(out().text));
    set('opt-nest', '.'); A(await until(/^SERVER\\.PORT=8080/m), 'dot rule: ' + out().text);
    set('opt-case', 'keep'); A(await until(/^server\\.port=8080/m), 'keep case: ' + out().text);
    set('opt-nest', '__'); set('opt-case', 'upper'); set('opt-to', 'toml'); set('text-input', '[database]\\nhost = "db"\\nport = 5432\\n\\n[cache]\\nttl = 60');
    A(await until(/\\[database\\]\\nhost = "db"\\nport = 5432/), 'toml round trip: ' + out().text); A(/Detected TOML/.test($('status-badge').textContent), 'toml detected: ' + $('status-badge').textContent);
    set('opt-to', 'ini'); A(await until(/\\[database\\]\\nhost = db\\nport = 5432/), 'ini: ' + out().text);
    set('opt-case', 'keep'); set('text-input', 'A=1\\nA=2\\nbad-key=3'); set('opt-to', 'export'); A(await until(/^export A=2$/m), 'export wait');
    A(/Duplicate key/.test($('output-issues').textContent) && /Invalid key.*bad-key/.test($('output-issues').textContent), 'dups + invalid: ' + $('output-issues').textContent);
    set('opt-case', 'upper'); A(await until(/^export BAD_KEY=3$/m), 'upper fixes key'); A(!/Invalid key/.test($('output-issues').textContent), 'no invalid after upper');
    set('text-input', 'services:\\n  web:\\n    environment:\\n      - PORT=80\\n      - MODE=prod\\n  db:\\n    environment:\\n      PG_USER: admin'); set('opt-to', 'json'); set('opt-types', true); A(await until(/PG_USER/), 'compose wait');
    A(/Detected compose/.test($('status-badge').textContent) && JSON.parse(out().text).PORT === 80 && JSON.parse(out().text).PG_USER === 'admin', 'compose in: ' + $('status-badge').textContent + ' ' + out().text);
    set('text-input', 'spring.datasource.url=jdbc:x\\nspring.profiles.active=dev'); set('opt-nest', '.'); A(await until(/datasource/), 'props wait');
    A(/Detected \\.properties/.test($('status-badge').textContent) && JSON.parse(out().text).spring.datasource.url === 'jdbc:x', 'properties: ' + $('status-badge').textContent + ' ' + out().text);
    $('btn-swap').click(); A(await until(/^spring\\.datasource\\.url=jdbc:x$/m), 'swap: ' + $('opt-from').value + '→' + $('opt-to').value + ' ' + out().text); A($('opt-to').value === 'properties' && $('opt-from').value === 'json', 'swap selects');
    set('text-input', '{bad'); set('opt-from', 'json'); A(await waitFor(() => !$('input-error').hidden, 8000), 'json error shown');
    $('btn-reset').click(); await settle(); A(!out() && $('text-input').value === '' && $('opt-to').value === 'json' && $('opt-nest').value === '__', 'reset');`],
  ['dev/hash-id-generator', `
    set('text-input', 'abc'); A(await waitFor(() => out() && out().rows && out().rows.length === 5, 10000), 'hashes computed');
    const row = (n) => out().rows.find(r => r.name === n).v;
    A(row('MD5') === '900150983cd24fb0d6963f7d28e17f72' && row('SHA-1') === 'a9993e364706816aba3e25717850c26c9cd0d89d' && row('SHA-256') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'vectors: ' + row('MD5') + ' ' + row('SHA-256'));
    A(row('SHA-512').length === 128 && row('SHA-384').length === 96, 'lengths');
    set('hash-expect', 'BA7816BF 8F01CFEA 414140DE 5DAE2223 B00361A3 96177A9C B410FF61 F20015AD'); await settle(); await tick(200);
    A(/Matches SHA-256/.test($('output-badge').textContent) && $('output-rows').querySelector('.hash-row.is-pass .hash-name').textContent === 'SHA-256', 'verify: ' + $('output-badge').textContent);
    set('hash-expect', 'deadbeef'); await settle(); await tick(200); A(/No match/.test($('output-badge').textContent), 'no match');
    set('hash-expect', ''); set('hash-key', 'key'); set('text-input', 'The quick brown fox jumps over the lazy dog'); await settle(); await tick(300);
    A(row('MD5') === '80070713463e7749b90c2dc24911e275' && row('SHA-256') === 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8', 'hmac: ' + row('MD5') + ' ' + row('SHA-256'));
    set('hash-key', ''); set('opt-enc', 'base64'); await settle(); await tick(300); A(row('SHA-256') === '16j7swfXgJRpypq8sAguT41WUeRtPNt2LQLQvzfJ5ZI=', 'base64: ' + row('SHA-256'));
    set('opt-enc', 'hex'); set('opt-upper', true); await settle(); await tick(300); A(/^[0-9A-F]+$/.test(row('MD5')), 'upper');
    const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array([0, 255, 10, 13, 128])], 'bin.dat')); $('file-input').files = dt.files; $('file-input').dispatchEvent(new Event('change', { bubbles: true }));
    A(await waitFor(() => /bin\\.dat/.test($('input-count').textContent) && out() && out().rows, 5000), 'file loaded: ' + $('input-count').textContent);
    await tick(300); A(row('MD5').toLowerCase() === '9e1daf0b7f744ffd0870b4bb64237f10', 'file md5: ' + row('MD5'));
    A($('text-input').value === '' && row('MD5').length === 32, 'file replaces text');
    pill('seg-mode', 'ids'); await settle(); A($('hash-pane').hidden && !$('ids-pane').hidden && !$('output-text').hidden, 'ids pane');
    A(out().list.length === 10 && out().list.every(x => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x)), 'uuid4: ' + out().list[0]);
    set('id-type', 'uuid7'); set('id-count', '50'); set('id-format', 'upper'); await settle();
    const l = out().list; A(l.length === 50 && l.every(x => /^[0-9A-F]{8}-[0-9A-F]{4}-7[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/.test(x)) && l.map(x => x.slice(0, 13)).every((v, i, a) => !i || v >= a[i - 1]), 'uuid7 time-ordered: ' + l[0]);
    set('id-decode', l[0]); await settle(); A(/UUID v7/.test($('output-rows').textContent) && Math.abs(new Date($('output-rows').textContent.match(/\\d{4}-\\d{2}-\\d{2}T[^ ]+Z/)[0]) - Date.now()) < 120000, 'decode v7: ' + $('output-rows').textContent);
    set('id-type', 'ulid'); set('id-count', '3'); await settle(); A(out().list.every(x => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(x)), 'ulid: ' + out().list[0]);
    set('id-decode', out().list[0]); await settle(); A(/ULID/.test($('output-rows').textContent), 'decode ulid');
    set('id-type', 'nanoid'); set('id-len', '12'); set('opt-alpha', 'nolook'); set('id-count', '200'); await settle(); A(out().list.every(x => x.length === 12 && !/[0OIl1]/.test(x)) && new Set(out().list).size === 200, 'nanoid nolook unique');
    set('id-type', 'otp'); set('id-len', '6'); await settle(); A(out().list.every(x => /^\\d{6}$/.test(x)), 'otp');
    const csv = await T.T.download('csv', T); A(csv.text.startsWith('id\\n') && csv.text.split('\\n').length === 201, 'csv');
    $('btn-reset').click(); await settle(); A(!out() && !$('hash-pane').hidden && $('id-count').value === '10' && $('text-input').value === '', 'reset');`],
  ['data/date-calculator', `
    set('diff-a', '2024-02-28T00:00'); set('diff-b', '2024-03-01T00:00'); await settle();
    A(out() && /^2 days$/.test(out().json.Result), 'leap diff: ' + (out() && out().json.Result));
    A(out().json['Total days'] === '2' && out().json['ISO 8601 duration'] === 'P2D', 'totals: ' + JSON.stringify(out().json));
    set('opt-inclusive', true); await settle(); A(out().json['Total days'] === '3', 'inclusive: ' + out().json['Total days']); set('opt-inclusive', false);
    set('diff-a', '2020-01-31T10:00'); set('diff-b', '2021-03-01T09:30'); await settle();
    A(out().json.Result === '1 year, 1 month, 23 hours, 30 minutes', 'calendar walk: ' + out().json.Result);
    const D = window.ToolityDate; A(D.addMonths(new Date(2025, 0, 31), 1).getDate() === 28 && D.addMonths(new Date(2024, 0, 31), 1).getDate() === 29, 'month clamp');
    A(D.isoWeek(new Date(2021, 0, 1)).week === 53 && D.isoWeek(new Date(2026, 0, 1)).week === 1, 'iso week');
    A(D.parseLoose('26/01/2027').getMonth() === 0 && D.parseLoose('01/26/2027').getDate() === 26 && D.parseLoose('25 Dec 2026').getDate() === 25 && D.parseLoose('nope') === null, 'loose parse');
    pill('seg-mode', 'add'); await settle(); A(!$('pane-add').hidden && $('pane-diff').hidden, 'add pane');
    set('add-start', '2025-01-31T00:00'); set('add-months', '1'); await settle(); A(out().json['ISO 8601'] === '2025-02-28', 'add month clamp: ' + out().json['ISO 8601']);
    pill('seg-dir', 'sub'); set('add-months', ''); set('add-days', '31'); await settle(); A(out().json['ISO 8601'] === '2024-12-31', 'subtract days: ' + out().json['ISO 8601']);
    pill('seg-mode', 'work'); set('work-start', '2026-10-19'); set('work-end', '2026-10-31'); await settle();
    A(/^10 working days$/.test(out().json.Result), 'working days: ' + out().json.Result);
    set('work-holidays', '2026-10-20\\n25 Dec 2026\\nbad line'); await settle(); A(/^9 working days$/.test(out().json.Result) && out().json['Holidays counted'] === '2026-10-20' && /bad line/.test(out().json['Unparsed holiday lines']), 'holiday: ' + JSON.stringify(out().json));
    set('work-end', ''); set('work-n', '10'); await settle(); A(out().json['ISO 8601'] === '2026-11-03', '+10 working days: ' + out().json['ISO 8601']);
    set('work-n', '-1'); await settle(); A(out().json['ISO 8601'] === '2026-10-16', '-1 working day: ' + out().json['ISO 8601']);
    pill('seg-mode', 'age'); set('age-dob', '2000-02-29'); set('age-on', '2026-02-28'); await settle();
    A(out().json.Result === '26 years, 0 months, 0 days' && /2027/.test(out().json['Next birthday']), 'age: ' + out().json.Result + ' / ' + out().json['Next birthday']);
    set('age-on', '1999-01-01'); await settle(); A(!out() && /before/.test($('status-badge').textContent), 'age before dob');
    $('btn-reset').click(); await settle(); A(!out() && !$('pane-diff').hidden && $('pane-age').hidden && $('age-dob').value === '', 'reset');`],
  ['dev/cron-builder', `
    const C = window.ToolityCron;
    set('cron-input', '*/15 9-17 * * 1-5'); await settle(); A(out(), 'no output');
    A(out().full.description === 'Every 15th minute past hour 9 through 17 on day-of-week Monday through Friday', 'describe: ' + out().full.description);
    A(out().full.nextRuns.length === 10 && out().full.nextRuns.every((iso, i, a) => { const d = new Date(iso); return [1,2,3,4,5].includes(d.getDay()) && d.getHours() >= 9 && d.getHours() <= 17 && d.getMinutes() % 15 === 0 && (!i || d > new Date(a[i-1])); }), 'runs: ' + out().full.nextRuns.slice(0, 3));
    A($('cb-minute-mode').value === 'step' && $('cb-minute-step').value === '15' && $('cb-hour-mode').value === 'range' && $('cb-hour-from').value === '9' && $('cb-hour-to').value === '17' && $('cb-dow-mode').value === 'range', 'builder reflects expression');
    A(C.describe(C.parse('30 9 * * 1-5')) === 'At 09:30 on day-of-week Monday through Friday', 'd1: ' + C.describe(C.parse('30 9 * * 1-5')));
    A(C.describe(C.parse('0 0 L * *')) === 'At 00:00 on the last day of the month', 'd2: ' + C.describe(C.parse('0 0 L * *')));
    A(C.describe(C.parse('0 9 * * MON#1')) === 'At 09:00 on the 1st Monday of the month', 'd3: ' + C.describe(C.parse('0 9 * * MON#1')));
    A(C.describe(C.parse('@hourly')) === 'At minute 0 past every hour', 'alias: ' + C.describe(C.parse('@hourly')));
    A(C.describe(C.parse('0 12 1,15 JAN,JUL *')) === 'At 12:00 on day-of-month 1 and 15 in month January and July', 'd4: ' + C.describe(C.parse('0 12 1,15 JAN,JUL *')));
    A(C.describe(C.parse('*/10 * * * * *', true), true) === 'Every 10th second, every minute', 'seconds: ' + C.describe(C.parse('*/10 * * * * *', true), true));
    let threw = ''; try { C.parse('61 * * * *'); } catch (e) { threw = e.message; } A(/0–59/.test(threw), 'range error: ' + threw);
    threw = ''; try { C.parse('* * * *'); } catch (e) { threw = e.message; } A(/Expected 5/.test(threw), 'count error: ' + threw);
    const first = C.nextRuns(C.parse('0 0 L * *'), 'UTC', 2, false).map(t => new Date(t)); A(first.every(d => d.getUTCHours() === 0 && new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate() === d.getUTCDate()), 'L in UTC: ' + first);
    const ist = C.nextRuns(C.parse('0 9 * * *'), 'Asia/Kolkata', 1, false)[0]; A(new Date(ist).getUTCHours() === 3 && new Date(ist).getUTCMinutes() === 30, 'IST 09:00 = 03:30Z: ' + new Date(ist).toISOString());
    A(C.zonedToUtc(2026, 3, 8, 2, 30, 0, 'America/New_York') === null && C.zonedToUtc(2026, 3, 8, 3, 30, 0, 'America/New_York') === Date.UTC(2026, 2, 8, 7, 30), 'DST gap skipped');
    A(C.nextRuns(C.parse('0 0 31 2 *'), 'UTC', 1, false).length === 0, 'never runs');
    set('cron-input', '0 0 31 2 *'); await settle(); A(out() && out().ok === false && /Never runs/.test($('output-flags').textContent), 'never flag: ' + $('output-flags').textContent);
    set('cron-input', '0 9 1 * 1'); await settle(); A(/OR/.test($('output-flags').textContent), 'dom/dow warning');
    set('cron-preset', '0 0 * * 0'); await settle(); A($('cron-input').value === '0 0 * * 0' && $('cron-preset').value === '' && $('cb-dow-mode').value === 'list' && document.querySelector('[data-k=dow] .cb-chip[data-v="0"]').getAttribute('aria-pressed') === 'true', 'preset → builder');
    document.querySelector('[data-k=dow] .cb-chip[data-v="3"]').click(); await settle(); A($('cron-input').value === '0 0 * * 0,3', 'chip → expression: ' + $('cron-input').value);
    set('cb-hour-mode', 'step'); set('cb-hour-step', '4'); await settle(); A($('cron-input').value === '0 */4 * * 0,3', 'builder select → expression: ' + $('cron-input').value);
    set('opt-seconds', true); await settle(); A($('cron-input').value === '0 0 */4 * * 0,3' && !document.querySelector('[data-k=second]').hidden && out().full.fields === 6, 'seconds toggle: ' + $('cron-input').value);
    set('opt-seconds', false); await settle(); A($('cron-input').value === '0 */4 * * 0,3' && document.querySelector('[data-k=second]').hidden, 'seconds off: ' + $('cron-input').value);
    set('opt-tz', 'Asia/Tokyo'); set('opt-count', '5'); await settle(); A(out().full.timeZone === 'Asia/Tokyo' && out().full.nextRuns.length === 5 && /Tokyo/.test($('settings-summary').textContent), 'tz + count');
    const txt = await T.T.download('txt', T); A(/Next runs:/.test(txt.text) && txt.text.split('\\n').length > 6, 'txt download');
    $('btn-reset').click(); await settle(); A(!out() && $('cron-input').value === '' && $('cb-hour-mode').value === 'any' && $('opt-tz').value === '' && document.querySelector('[data-k=dow] .cb-chip[aria-pressed="true"]') === null, 'reset');`],
  ['dev/jwt-builder-verifier', `
    const J = window.ToolityJwt;
    // jwt.io reference token: HS256, secret "your-256-bit-secret"
    const REF = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    set('jwt-payload', '{"sub":"1234567890","name":"John Doe","iat":1516239022}'); set('jwt-secret', 'your-256-bit-secret'); await settle();
    A(out() && out().text === REF, 'HS256 vector: ' + (out() && out().text));
    A(/Secret is 19 bytes/.test($('output-flags').textContent) && /never expires/.test($('output-flags').textContent), 'flags: ' + $('output-flags').textContent);
    $('jwt-secret').value = ''; set('jwt-payload', '{"a":1'); await settle(); A(!out() || !$('input-error').hidden, 'bad json → no token');
    set('jwt-payload', '{}'); set('jwt-secret', 's'); await settle(); document.querySelector('.jwt-claim[data-claim=exp]').click(); await settle();
    const pl = JSON.parse($('jwt-payload').value); A(Math.abs(pl.exp - Date.now() / 1000 - 3600) < 5 && /Expires in 1 hour|Expires in 60 minutes/.test($('output-flags').textContent), 'exp chip: ' + $('output-flags').textContent);
    set('jwt-alg', 'ES256'); await settle(); A($('jwt-secret-group').hidden && !$('jwt-privkey-group').hidden, 'alg switches key field');
    $('btn-gen-keys').click(); A(await waitFor(() => /BEGIN PRIVATE KEY/.test($('jwt-privkey').value) && out() && out().text.split('.').length === 3 && !$('output-keys').hidden, 15000), 'ES256 generated + signed');
    const es = out().text, pub = J.keys().publicPem; A(J.unb64u(es.split('.')[2]).length === 64, 'ES256 raw r||s = 64 bytes');
    A(await J.verify(es, pub) === true, 'ES256 verifies with public PEM');
    A(await J.verify(es.slice(0, -2) + (es.endsWith('A') ? 'BB' : 'AA'), pub) === false, 'tampered ES256 fails');
    set('jwt-alg', 'RS256'); $('btn-gen-keys').click(); A(await waitFor(() => J.keys().privatePem !== '' && out() && out().text !== es && /RS256/.test($('output-badge').textContent), 20000), 'RS256 generated + signed');
    const rs = out().text, rsPub = J.keys().publicPem; A(await J.verify(rs, rsPub) === true, 'RS256 verifies');
    set('jwt-alg', 'PS256'); await settle(); A(await waitFor(() => out() && /PS256/.test($('output-badge').textContent), 10000) && await J.verify(out().text, rsPub) === true, 'PS256 with same RSA key verifies');
    pill('seg-mode', 'verify'); await settle(); A($('pane-build').hidden && !$('pane-verify').hidden, 'verify pane');
    set('jwt-token', 'Bearer ' + REF); await settle(); A(out() && out().decoded.payload.name === 'John Doe' && /unverified/.test($('output-flags').textContent), 'decode only: ' + $('output-flags').textContent);
    set('jwt-verify-key', 'your-256-bit-secret'); await settle(); A(out().decoded.signatureValid === true && /Signature valid/.test($('output-flags').textContent), 'HS256 verified');
    set('jwt-verify-key', 'wrong'); await settle(); A(out().decoded.signatureValid === false && out().ok === false, 'wrong secret → invalid');
    set('jwt-verify-key', rsPub); await settle(); A(/Cannot verify/.test($('output-flags').textContent), 'PEM for HS → clear error: ' + $('output-flags').textContent);
    set('jwt-token', rs); await settle(); A(out().decoded.signatureValid === true, 'RS256 verified via PEM');
    // JWKS by kid: kid in header, key picked from a JWKS, wrong JWKS → false
    pill('seg-mode', 'build'); set('jwt-alg', 'ES256'); set('jwt-kid', 'mine'); $('btn-gen-keys').click();
    A(await waitFor(() => out() && /ES256/.test($('output-badge').textContent) && J.keys().publicPem !== rsPub, 15000), 'ES256 regenerated');
    const esKid = out().text; A(JSON.parse(atob(esKid.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).kid === 'mine', 'kid in header');
    const minePub = await crypto.subtle.exportKey('jwk', await crypto.subtle.importKey('spki', J.unb64u(J.keys().publicPem.replace(/-----[^-]+-----/g, '').replace(/\\s+/g, '')), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']));
    const other = await crypto.subtle.exportKey('jwk', (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])).publicKey);
    A(await J.verify(esKid, JSON.stringify({ keys: [Object.assign({ kid: 'other' }, other), Object.assign({ kid: 'mine' }, minePub)] })) === true, 'JWKS picks kid=mine');
    A(await J.verify(esKid, JSON.stringify({ keys: [Object.assign({ kid: 'other' }, other)] })) === false, 'JWKS wrong key → false');
    A(await J.verify(esKid, JSON.stringify(minePub)) === true, 'single JWK verifies');
    // expired + nbf + none
    pill('seg-mode', 'verify'); const hdr = (o) => J.b64u(new TextEncoder().encode(JSON.stringify(o)));
    set('jwt-verify-key', ''); set('jwt-token', hdr({ alg: 'HS256', typ: 'JWT' }) + '.' + hdr({ exp: 1000000000, nbf: 4102444800 }) + '.sig'); await settle();
    A(/Expired/.test($('output-flags').textContent) && /Not valid until/.test($('output-flags').textContent) && out().ok === false, 'exp/nbf flags: ' + $('output-flags').textContent);
    set('opt-skew', '3600'); await settle(); A(/3600 s clock skew|3600 s/.test($('settings-summary').textContent), 'skew summary');
    set('jwt-token', hdr({ alg: 'none' }) + '.' + hdr({ sub: 'x' }) + '.'); await settle(); A(/alg: none/.test($('output-flags').textContent) && out().ok === false, 'alg none flagged');
    set('jwt-token', 'a.b.c.d.e'); await settle(); A(out() && /JWE/.test($('output-badge').textContent), 'JWE detected');
    set('jwt-token', 'not a token'); await settle(); A(!$('input-error').hidden && /3 dot-separated/.test($('input-error').textContent), 'bad token error');
    const dl = await T.T.download('pem-public', T); A(dl && /BEGIN PUBLIC KEY/.test(dl.text) && dl.name === 'public.pem', 'pem download');
    $('btn-reset').click(); await settle(); A(!out() && !$('pane-build').hidden && $('jwt-payload').value === '' && $('jwt-privkey').value === '' && J.keys().publicPem === '' && $('opt-skew').value === '0', 'reset clears keys');`],
  ['utm-link-builder', `
    const U = window.ToolityUtm; localStorage.removeItem('toolity_utm_presets');
    set('utm-url', 'https://www.Example.com/p?a=1&utm_source=old&fbclid=zzz#top'); set('utm-source', 'Google'); set('utm-medium', 'CPC'); set('utm-campaign', 'Spring Sale 2026'); await settle();
    A(out() && out().text === 'https://www.example.com/p?a=1&utm_source=google&utm_medium=cpc&utm_campaign=spring_sale_2026#top', 'final: ' + (out() && out().text));
    A(/Removed utm_source, fbclid/.test($('output-flags').textContent) && out().ok === true, 'strip flag: ' + $('output-flags').textContent);
    A(!$('output-qr').hidden && $('output-qr').getContext('2d').getImageData(0, 0, 160, 160).data.some((v, i) => i % 4 === 0 && v === 0), 'qr drawn');
    set('opt-lower', false); set('opt-space', '-'); set('opt-fragment', false); await settle(); A(out().text === 'https://www.example.com/p?a=1&utm_source=Google&utm_medium=CPC&utm_campaign=Spring-Sale-2026' && /Mixed case/.test($('output-flags').textContent), 'settings: ' + out().text);
    set('opt-lower', true); set('opt-space', '_'); set('opt-fragment', true); set('opt-strip', false); await settle(); A(/utm_source=google/.test(out().text) && /fbclid=zzz/.test(out().text) && !/utm_source=old/.test(out().text), 'no strip keeps fbclid, utm overwritten: ' + out().text); set('opt-strip', true);
    set('utm-medium', ''); await settle(); A(out().ok === false && /utm_medium is required/.test($('status-badge').textContent), 'required flag');
    document.querySelector('.utm-preset[data-source="newsletter"]').click(); await settle(); A($('utm-source').value === 'newsletter' && $('utm-medium').value === 'email' && /utm_medium=email/.test(out().text), 'platform preset');
    set('utm-term', 'running shoes'); set('utm-custom', 'ref=partner 42\\nbad'); await settle(); A(/utm_term=running_shoes/.test(out().text) && /ref=partner\\+42|ref=partner%2042/.test(out().text) && /&bad=/.test(out().text), 'term + custom: ' + out().text);
    set('utm-custom', ''); set('utm-term', '');
    window.prompt = () => 'News Oct'; $('btn-save-preset').click(); await tick(100); A(U.loadPresets()['News Oct'].source === 'newsletter' && $('utm-saved').value === 'News Oct' && !$('btn-del-preset').disabled, 'preset saved');
    set('utm-source', 'x'); set('utm-campaign', 'y'); set('utm-saved', 'News Oct'); await settle(); A($('utm-source').value === 'newsletter' && $('utm-campaign').value === 'spring sale 2026'.replace(/ /g, ' ') || $('utm-campaign').value === 'Spring Sale 2026', 'preset loads: ' + $('utm-campaign').value);
    $('btn-del-preset').click(); await tick(100); A(!U.loadPresets()['News Oct'] && $('utm-saved').options.length === 1, 'preset deleted');
    pill('seg-mode', 'bulk'); await settle(); A($('utm-url-group').hidden && !$('utm-urls-group').hidden, 'bulk pane');
    set('utm-urls', 'https://example.com/\\nhttps://example.com/pricing, pricing CTA\\nnot a url'); await settle();
    const rows = out().text.split('\\n'); A(rows.length === 2 && /utm_content=pricing_cta/.test(rows[1]) && !/utm_content/.test(rows[0]), 'bulk rows: ' + rows);
    A(/1 line not a URL/.test($('output-flags').textContent) && $('output-bulk').querySelectorAll('tbody tr').length === 3, 'bulk flags');
    const csv = await T.T.download('csv', T); A(csv.text.split('\\n').length === 3 && csv.text.startsWith('url,utm_source') && /pricing_cta/.test(csv.text), 'bulk csv');
    $('btn-reset').click(); await settle(); A(!out() && !$('utm-url-group').hidden && $('utm-source').value === '' && $('opt-lower').checked, 'reset');`],
  ['docs/dummy-text-data-generator', `
    const G = window.ToolityDummy;
    await settle(); A(out() && /^Lorem ipsum dolor sit amet/.test(out().text) && out().text.split('\\n\\n').length === 3, 'default 3 lorem paragraphs: ' + (out() && out().text.slice(0, 40)));
    set('opt-lorem-start', false); set('txt-unit', 'words'); set('txt-count', '12'); await settle(); A(out().text.replace(/\\.$/, '').split(' ').length === 12 && !/^Lorem ipsum dolor/.test(out().text), '12 words: ' + out().text);
    set('txt-unit', 'sentences'); set('txt-count', '5'); set('txt-flavour', 'pangram'); await settle(); A(out().text.split(/[.!?]\\s/).length === 5 && /quick|Sphinx|zebras|wizards|Jackdaws|Frederick|buckles|discotheques|nymph|jocks|vixens/.test(out().text), 'pangram sentences: ' + out().text);
    set('txt-flavour', 'corporate'); set('txt-unit', 'paragraphs'); set('txt-count', '2'); set('txt-format', 'html'); await settle(); A((out().text.match(/<p>/g) || []).length === 2 && /synergy|leverage|roadmap|stakeholders|pivot|bandwidth|deliverables|alignment|paradigm|scalable/i.test(out().text), 'corporate html: ' + out().text.slice(0, 80));
    set('opt-seed', '42'); await settle(); const a = out().text; $('btn-reset').click(); await settle(); set('opt-seed', '42'); set('txt-flavour', 'corporate'); set('txt-unit', 'paragraphs'); set('txt-count', '2'); set('txt-format', 'html'); set('opt-lorem-start', false); await settle(); A(out().text === a, 'seed reproducible');
    pill('seg-mode', 'people'); await settle(); A(!$('pane-people').hidden && !$('output-table-wrap').hidden && $('output-text').hidden, 'people pane');
    set('ppl-count', '100'); await settle(); A(out().data.length === 100 && out().cols.join() === 'id,name,email,phone,city,company', 'people cols: ' + out().cols);
    A(out().data.every(p => /^[a-z0-9.]+@example\\.com$/.test(p.email)) && out().data.every(p => /^\\+1 \\(\\d{3}\\) \\d{3}-\\d{4}$/.test(p.phone)), 'intl email/phone: ' + out().data[0].email + ' ' + out().data[0].phone);
    set('ppl-locale', 'in'); set('opt-domain', 'test'); set('ppl-address', true); set('ppl-dob', true); await settle();
    A(out().data.every(p => /^\\+91 [6-9]\\d{4} \\d{5}$/.test(p.phone) && /\\.test$/.test(p.email) && /\\d{6}$/.test(p.address) && /^\\d{4}-\\d{2}-\\d{2}$/.test(p.dob)), 'india: ' + JSON.stringify(out().data[0]));
    const seedA = out().data.map(p => p.email).join(); set('opt-seed', '43'); await settle(); A(out().data.map(p => p.email).join() !== seedA, 'different seed → different people'); set('opt-seed', '42'); await settle(); A(out().data.map(p => p.email).join() === seedA, 'same seed → same people');
    A($('output-table').querySelectorAll('tbody tr').length === 50 && /Showing 50 of 100/.test($('output-note').textContent), 'preview capped at 50');
    const sql = await T.T.download('sql', T); A(/^INSERT INTO people \\(id, name, email, phone, city, address, dob, company\\) VALUES/.test(sql.text) && (sql.text.match(/\\n  \\(/g) || []).length === 100, 'sql: ' + sql.text.slice(0, 120));
    const json = await T.T.download('json', T); A(JSON.parse(json.text).length === 100 && JSON.parse(json.text)[0].id === 1, 'json');
    set('opt-header', false); await settle(); A(!/^id,name/.test(out().csv) && out().csv.split('\\n').length === 100, 'csv without header'); set('opt-header', true);
    pill('seg-mode', 'dataset'); await settle(); A($('ds-rows').querySelectorAll('.dd-row').length === 5 && out().cols.join() === 'increment,full_name,email,city,int' && out().data.length === 25, 'default schema: ' + out().cols);
    A(out().data.every((r, i) => r.increment === i + 1 && r.int >= 1 && r.int <= 100 && Number.isInteger(r.int)), 'increment + int range');
    $('btn-add-col').click(); await settle(); const last = $('ds-rows').lastElementChild; last.querySelector('.dd-name').value = 'plan'; last.querySelector('.dd-type').value = 'pick'; last.querySelector('.dd-opt').value = 'free|pro|team'; last.querySelector('.dd-opt').dispatchEvent(new Event('input', { bubbles: true })); await settle();
    A(out().cols.includes('plan') && out().data.every(r => ['free', 'pro', 'team'].includes(r.plan)), 'pick column: ' + out().data[0].plan);
    $('btn-add-col').click(); await settle(); const l2 = $('ds-rows').lastElementChild; l2.querySelector('.dd-type').value = 'price'; l2.querySelector('.dd-opt').value = '5-10'; l2.querySelector('.dd-opt').dispatchEvent(new Event('input', { bubbles: true })); await settle();
    A(out().data.every(r => r.price >= 5 && r.price <= 10), 'price range: ' + out().data[0].price);
    $('ds-rows').querySelector('.dd-del').click(); await settle(); A(!out().cols.includes('increment') && out().cols.length === 6, 'remove column');
    const sql2 = await T.T.download('sql', T); A(/^INSERT INTO data \\(/.test(sql2.text) && /'free'|'pro'|'team'/.test(sql2.text), 'dataset sql');
    set('ds-count', '0'); await settle(); A(out().data.length === 1, 'min 1 row');
    [...$('ds-rows').querySelectorAll('.dd-del')].forEach(b => b.click()); await settle(); A(!out() && /at least one column/.test($('output-note').textContent), 'no columns note');
    $('btn-reset').click(); await settle(); A(out() && !$('pane-text').hidden && $('ds-rows').querySelectorAll('.dd-row').length === 5 && $('opt-seed').value === '' && $('ppl-locale').value === 'intl', 'reset');`],
  ['qr-barcode-scanner', `
    const Sc = window.ToolityScan;
    const load = (src) => new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); });
    await load('/scripts/qr-engine.js'); await load('https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js');
    const qrCanvas = (text, size = 360) => { const q = new QRCodeGenerator(0, QRErrorCorrectLevel.M); q.addData(text); q.make(); const n = q.getModuleCount(), Q = 4, s = size / (n + Q * 2), c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) x.fillRect(Math.round((col + Q) * s), Math.round((r + Q) * s), Math.ceil(s), Math.ceil(s)); return c; };
    const toFile = (c, name) => new Promise(r => c.toBlob(b => r(new File([b], name, { type: 'image/png' })), 'image/png'));
    const feed = async (files) => { const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); $('file-input').files = dt.files; $('file-input').dispatchEvent(new Event('change', { bubbles: true })); };
    // classify (pure)
    const C = Sc.classify; A(C('https://toolity.in/x').type === 'URL' && C('www.example.com').actions[0][2] === 'https://www.example.com/', 'classify url');
    const w = C('WIFI:T:WPA;S:Home Net;P:pa\\\\;ss;H:true;;'); A(w.type === 'Wi-Fi' && w.fields[0][1] === 'Home Net' && w.fields[2][1] === 'pa;ss', 'classify wifi: ' + JSON.stringify(w.fields));
    const u = C('upi://pay?pa=shop@upi&pn=Tea%20Stall&am=40.00&cu=INR'); A(u.type === 'UPI payment' && u.fields[0][1] === 'Tea Stall' && u.fields[2][1] === '₹40.00', 'classify upi: ' + JSON.stringify(u.fields));
    const v = C('BEGIN:VCARD\\nVERSION:3.0\\nN:Doe;Jane\\nFN:Jane Doe\\nTEL;TYPE=cell:+1 555 0100\\nEMAIL:jane@example.com\\nEND:VCARD'); A(v.type === 'Contact (vCard)' && v.fields[0][1] === 'Jane Doe' && v.actions[0][3] === 'contact.vcf', 'classify vcard');
    const mc = C('MECARD:N:Doe,John;TEL:5550100;EMAIL:j@example.com;;'); A(mc.fields[0][1] === 'John Doe' && /BEGIN:VCARD/.test(mc.actions[0][2]), 'classify mecard');
    A(C('tel:+919999999999').type === 'Phone' && C('geo:12.97,77.59').actions[0][2].includes('12.97,77.59') && C('5901234123457').type === 'Product code' && C('hello world').type === 'Text' && C('javascript://x').type === 'Text', 'classify misc');
    A(C('otpauth://totp/Acme:bob?secret=ABCDEFGH&issuer=Acme').fields[2][1] === 'ABCD••••', 'otp secret masked');
    // image scan via the real file input (zxing fallback in headless Linux)
    await feed([await toFile(qrCanvas('https://toolity.in/labs/'), 'qr.png')]);
    A(await waitFor(() => out() && Sc.results.length === 1, 40000), 'qr decoded from file: ' + $('qs-status').textContent + ' ' + ($('input-error').hidden ? '' : $('input-error').textContent));
    A(Sc.results[0].text === 'https://toolity.in/labs/' && Sc.results[0].format === 'QR Code' && out().url === 'https://toolity.in/labs/' && /QR Code · URL/.test($('status-badge').textContent), 'result 1: ' + JSON.stringify(Sc.results[0] && [Sc.results[0].text, Sc.results[0].format]));
    A(!$('img-canvas').hidden && !$('qs-overlay').hidden && $('output-results').querySelectorAll('.qs-card').length === 1 && /Open link/.test($('output-results').textContent), 'image shown + card');
    // same code again → dedupe (×2), then with dedupe off → second card
    await feed([await toFile(qrCanvas('https://toolity.in/labs/'), 'qr2.png')]); await tick(1500); A(Sc.results.length === 1 && Sc.results[0].seen === 2 && /×2/.test($('output-results').textContent), 'dedupe: ' + Sc.results.length + ' seen ' + Sc.results[0].seen);
    set('opt-dedupe', false); await feed([await toFile(qrCanvas('WIFI:T:WPA;S:Cafe;P:latte123;;'), 'wifi.png')]); A(await waitFor(() => Sc.results.length === 2, 20000), 'second code'); A(Sc.results[0].info.type === 'Wi-Fi' && /latte123/.test($('output-results').textContent) && /Copy password/.test($('output-results').textContent), 'wifi card');
    // EAN-13 barcode via JsBarcode
    const bc = document.createElement('canvas'); JsBarcode(bc, '5901234123457', { format: 'EAN13', width: 3, height: 120, margin: 20 }); await feed([await toFile(bc, 'ean.png')]);
    A(await waitFor(() => Sc.results.length === 3, 20000), 'ean decoded: ' + $('qs-status').textContent); A(Sc.results[0].format === 'EAN-13' && Sc.results[0].text === '5901234123457' && Sc.results[0].info.type === 'Product code', 'ean: ' + Sc.results[0].format + ' ' + Sc.results[0].text);
    // formats filter: QR-only must not read the barcode
    set('opt-formats', 'qr'); await feed([await toFile(bc, 'ean2.png')]); await tick(2500); A(Sc.results.length === 3 && /No code found/.test($('qs-status').textContent), 'qr-only ignores EAN: ' + $('qs-status').textContent); set('opt-formats', 'all');
    // blank image → friendly status, no error
    const blank = document.createElement('canvas'); blank.width = blank.height = 200; blank.getContext('2d').fillStyle = '#fff'; blank.getContext('2d').fillRect(0, 0, 200, 200); await feed([await toFile(blank, 'blank.png')]); await tick(2500); A(/No code found in blank\\.png/.test($('qs-status').textContent) && $('input-error').hidden, 'blank status: ' + $('qs-status').textContent);
    // paste
    const pf = await toFile(qrCanvas('tel:+15550100'), 'paste.png'); const pdt = new DataTransfer(); pdt.items.add(pf); const pe = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: pdt }); document.dispatchEvent(pe); A(await waitFor(() => Sc.results.length === 4, 20000), 'paste decoded'); A(Sc.results[0].info.type === 'Phone', 'paste → phone card');
    // camera stub: captureStream of a QR canvas
    set('opt-dedupe', true); const camC = qrCanvas('https://example.com/cam', 480); const stream = camC.captureStream(10); navigator.mediaDevices.getUserMedia = async () => stream; navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'videoinput', deviceId: 'stub', label: 'Stub cam' }];
    $('btn-cam').click(); A(await waitFor(() => Sc.results.length === 5, 30000), 'camera decoded: ' + $('qs-status').textContent + ' ' + ($('input-error').hidden ? '' : $('input-error').textContent));
    A(Sc.results[0].text === 'https://example.com/cam' && Sc.results[0].source === 'camera' && !$('btn-rescan').hidden && /Paused/.test($('qs-status').textContent) && /Stop camera/.test($('btn-cam').textContent), 'camera result + paused: ' + $('qs-status').textContent);
    $('btn-rescan').click(); await tick(300); A($('btn-rescan').hidden, 'rescan resumes'); await tick(1500);
    $('btn-cam').click(); await tick(200); A(/Start camera/.test($('btn-cam').textContent) && $('cam-video').hidden && stream.getVideoTracks()[0].readyState === 'ended', 'camera stopped');
    const csv = await T.T.download('csv', T); A(csv.text.split('\\n').length === Sc.results.length + 1 && /^text,format,type,source,at/.test(csv.text), 'csv'); const js = await T.T.download('json', T); A(JSON.parse(js.text).length === Sc.results.length, 'json');
    const card = $('output-results').querySelector('.qs-card'); window.open = (u) => { window.__opened = u; return null; }; card.querySelector('.btn-brand-sm').click(); A(window.__opened === 'https://example.com/cam', 'open action: ' + window.__opened);
    $('btn-reset').click(); await settle(); A(!out() && Sc.results.length === 0 && $('output-results').children.length === 0 && !$('qs-stage-empty').hidden && $('opt-formats').value === 'all' && $('opt-dedupe').checked, 'reset');`],
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

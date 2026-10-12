#!/usr/bin/env node
// WebMCP check: stubs document.modelContext, loads pages, asserts registered tools and runs real tool calls.
// Usage: python3 -m http.server 3011 &  then  node scripts/webmcp-check.js        (core cases)
//        ALL=1 node scripts/webmcp-check.js   (+ schema sweep over every tool page; ONLY=slug to sweep one)
const { spawn, execSync } = require('child_process');
const http = require('http');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));
const BASE = 'http://localhost:3011/';

const STUB = `window.__tools = {}; document.modelContext = { registerTool(def) { window.__tools[def.name] = def; return Promise.resolve(); } };`;

// In-page helpers available to every case
const HELPERS = `
  const tick = (ms = 200) => new Promise(r => setTimeout(r, ms));
  const f = []; const A = (c, m) => { if (!c) f.push(m); };
  for (let i = 0; i < 40 && Object.keys(window.__tools).length < 2; i++) await tick();
  const names = Object.keys(window.__tools);
  const pageTool = () => names.map(n => window.__tools[n]).find(t => !/^toolity_(search|open)_tool/.test(t.name));
  const call = async (args) => (pageTool() ? pageTool().execute(args) : null);
  const txt = (r) => (r && r.content && r.content[0] && r.content[0].text) || '';
  const pngData = () => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d');
    for (let i = 0; i < 400; i++) { x.fillStyle = 'hsl(' + (i * 37 % 360) + ',70%,50%)'; x.fillRect((i * 13) % 320, (i * 7) % 240, 24, 24); } return c.toDataURL('image/png'); };
  const wavData = () => { const sr = 8000, n = sr, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(i / sr * 2 * Math.PI * 440) * 12000 * (i / n), true);
    let s = ''; new Uint8Array(b).forEach(x => s += String.fromCharCode(x)); return 'data:audio/wav;base64,' + btoa(s); };
  const pdfData = () => { const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>'];
    let out = '%PDF-1.4\\n'; const offs = []; objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\\n' + o + '\\nendobj\\n'; });
    const x = out.length; out += 'xref\\n0 ' + (objs.length + 1) + '\\n0000000000 65535 f \\n' + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \\n').join('');
    out += 'trailer\\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\\nstartxref\\n' + x + '\\n%%EOF'; return 'data:application/pdf;base64,' + btoa(out); };
  const firstStringInput = (re) => { const p = pageTool().inputSchema.properties.inputs; if (!p) return null;
    return Object.keys(p.properties).find(k => p.properties[k].type === 'string' && !p.properties[k].enum && (!re || re.test(k))); };
`;

const CASES = [
  ['home: site tools only + search works', '', `
    A(names.length === 2 && window.__tools.toolity_search_tools && window.__tools.toolity_open_tool, 'expected exactly 2 site tools, got ' + names);
    const r = await window.__tools.toolity_search_tools.execute({ query: 'compress image' });
    A(/media\\/image-compressor\\//.test(txt(r)), 'search did not return image compressor: ' + txt(r).slice(0, 120));
    A(/Done with Toolity\\.in/.test(txt(r)), 'missing credit line');
    const bad = await window.__tools.toolity_open_tool.execute({ url: 'https://evil.example/' });
    A(/Refused/.test(txt(bad)), 'open_tool accepted a foreign URL');`],
  ['category page: site tools only', 'media/', `A(names.length === 2, 'category page registered ' + names.length + ' tools');`],
  ['games: no page tool', 'games/snake/', `A(names.length === 2, 'game registered a page tool');`],
  ['text tool: mailto generator', 'labs/mailto-generator/', `
    A(pageTool() && pageTool().name === 'toolity_mailto_generator', 'page tool missing');
    const r = await call({ inputs: { 'email-to': 'a@b.com', 'email-subject': 'Hello there' } });
    A(/mailto:a@b\\.com/.test(txt(r)), 'no mailto URL in result: ' + txt(r).slice(0, 200));
    A(/Done with Toolity\\.in/.test(txt(r)), 'missing credit');`],
  ['text tool: QR code → image returned', 'labs/qr-code-generator/', `
    const k = firstStringInput(); A(k, 'no text input found in schema');
    const r = await call({ inputs: { [k]: 'https://toolity.in' }, return_file: true });
    const img = r && r.content.find(c => c.type === 'image');
    A(img && img.data.length > 200, 'no QR image returned: ' + txt(r).slice(0, 200));`],
  ['image family: compressor with data URL', 'media/image-compressor/', `
    const r = await call({ file_urls: [pngData()], file_names: ['test.png'], return_file: true, timeout_seconds: 60 });
    A(/loaded test\\.png/.test(txt(r)), 'file not loaded: ' + txt(r).slice(0, 200));
    const img = r && r.content.find(c => c.type === 'image');
    A(img && img.data.length > 100, 'no compressed image returned: ' + txt(r).slice(0, 300));`],
  ['audio family: reverser with WAV', 'media/audio-reverser/', `
    const r = await call({ file_urls: [wavData()], file_names: ['tone.wav'], return_file: true, timeout_seconds: 60 });
    const res = r && r.content.find(c => c.type === 'resource' || c.type === 'image');
    A(res, 'no audio file returned: ' + txt(r).slice(0, 300));`],
  ['pdf family: page rotator', 'docs/pdf-page-rotator/', `
    const r = await call({ file_urls: [pdfData()], file_names: ['one.pdf'], inputs: { 'seg-all': '90' }, return_file: true, timeout_seconds: 60 });
    const res = r && r.content.find(c => c.type === 'resource');
    A(res && /pdf/.test(res.resource.mimeType), 'no PDF returned: ' + txt(r).slice(0, 300));`],
  ['dev tool: JSON visualizer', 'dev/json-visualizer/', `
    const k = firstStringInput(); A(k, 'no text input found');
    const r = await call({ inputs: { [k]: '{"name":"toolity","tools":79}' } });
    A(/toolity/.test(txt(r)), 'JSON not reflected in result: ' + txt(r).slice(0, 200));`],
  ['widget builder: countdown embed URL + credit', 'widgets/countdown/', `
    A(pageTool() && pageTool().name === 'toolity_countdown', 'page tool missing');
    const r = await call({ inputs: { 'opt-title': 'Diwali Launch', 'opt-to': '2027-11-01T09:00', 'opt-theme': 'dark' } });
    A(/widgets\\/countdown\\/embed\\/\\?/.test(txt(r)) && /title=Diwali\\+Launch/.test(txt(r)), 'embed URL not returned: ' + txt(r).slice(0, 240));
    A(/Done with Toolity\\.in/.test(txt(r)), 'missing credit');`],
  ['web family: URL cleaner (live)', 'labs/url-cleaner/', `
    A(pageTool() && pageTool().name === 'toolity_url_cleaner', 'page tool missing');
    const r = await call({ inputs: { 'url-input': 'https://example.com/a?utm_source=x&id=1' } });
    A(/https:\\/\\/example\\.com\\/a\\?id=1(\\s|$)/.test(txt(r)) && !/\\?utm_source|&utm_source/.test(txt(r)), 'clean URL not in result: ' + txt(r).slice(0, 240));`],
  ['web family: contrast checker (colour inputs)', 'labs/contrast-checker/', `
    const r = await call({ inputs: { 'fg-input': '#777777', 'bg-input': '#ffffff' } });
    A(/4\\.48:1/.test(txt(r)), 'ratio not in result: ' + txt(r).slice(0, 240));`],
  ['web family: meta tag extractor (paste + action)', 'labs/meta-tag-extractor/', `
    const r = await call({ inputs: { 'html-input': '<html lang="en"><head><title>Agent Fixture</title><meta name="description" content="d"></head></html>' } });
    A(/Agent Fixture/.test(txt(r)), 'title not extracted: ' + txt(r).slice(0, 240));`],
];

(async () => {
  const port = 9700 + Math.floor(Math.random() * 100);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500); try { await getJson(`http://127.0.0.1:${port}/json/version`); break; } catch (e) {} }

  const run = async (path, expr) => {
    const t = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
    let id = 0; const pending = {}; const errs = [];
    const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description?.split('\n')[0]); };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
    await send('Page.navigate', { url: BASE + path }); await sleep(2500);
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${HELPERS} ${expr}; return f; })()`, returnByValue: true, awaitPromise: true });
    ws.close(); await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    return (r.result?.value || ['eval failed: ' + JSON.stringify(r.exceptionDetails?.exception?.description)]).concat(errs.map(e => 'JS error: ' + e));
  };

  let fails = 0;
  for (const [name, path, expr] of CASES) {
    if (process.env.ONLY && !path.includes(process.env.ONLY)) continue;
    const f = await run(path, expr);
    console.log((f.length ? '✗ ' : '✓ ') + name + (f.length ? '\n    ' + f.join('\n    ') : ''));
    if (f.length) fails++;
  }

  if (process.env.ALL) { // schema sweep: every non-game tool page registers 1 valid, serialisable page tool
    const pages = execSync("find media docs labs dev data widgets -mindepth 2 -maxdepth 2 -name index.html | sed 's|index.html$||' | sort", { encoding: 'utf8' }).trim().split('\n').filter((p) => !process.env.ONLY || p.includes(process.env.ONLY));
    let bad = 0;
    for (const p of pages) {
      const f = await run(p, `const t = pageTool(); A(names.length === 3 && t, 'expected 3 tools, got ' + names.length);
        if (t) { const s = JSON.stringify(t.inputSchema); A(s.length < 20000, 'schema too large ' + s.length); A(t.inputSchema.type === 'object', 'schema not object'); A(t.description.length > 40, 'weak description'); }`);
      if (f.length) { bad++; console.log('✗ sweep /' + p + '\n    ' + f.join('\n    ')); }
    }
    console.log(bad ? `sweep: ${bad}/${pages.length} failing` : `✓ sweep: ${pages.length}/${pages.length} tool pages register a valid page tool`);
    fails += bad;
  }
  chrome.kill();
  console.log(fails ? `\n${fails} failing` : '\n✓ all WebMCP checks passing');
  process.exit(fails ? 1 : 0);
})();

#!/usr/bin/env node
// Responsive regression check (suggestions.txt §7.6). No deps: node ≥ 22 + google-chrome.
// Usage: python3 -m http.server 3011 &  then  node scripts/responsive-check.js [filter]
// Exit 1 on any failure. Prints one line per (viewport, page) failure.
const { spawn } = require('child_process');
const http = require('http');

const BASE = 'http://localhost:3011/';
const VIEWPORTS = [[360, 780], [390, 844], [768, 1024], [1024, 768], [1180, 820], [1440, 900], [1920, 1080], [2560, 1080]];
// Default: 6 representative pages. ALL=1 → every index.html (categories + tools).
const PAGES = process.env.ALL
  ? require('child_process').execSync("find . -mindepth 2 -maxdepth 3 -name index.html -not -path './templates/*' -not -path './.git/*' | sed 's|^\\./||; s|index.html$||' | sort", { encoding: 'utf8' }).trim().split('\n').concat([''])
  : ['', 'utilities/', 'utilities/qr-code-generator/', 'utilities/image-compressor/', 'utilities/video-compressor/', 'utilities/audio-compressor/', 'utilities/pdf-compressor/', 'convertors/video-converter/', 'productivity/online-notepad/', 'development/json-visualizer/', 'experiments/photo-booth/', 'fun/pong/', 'visuals/image-color-extractor/', 'visuals/og-image-generator/', 'visuals/placeholder-image-generator/', 'fun/2048/', 'fun/flappy-bird/', 'fun/snake/', 'fun/tetris/', 'fun/tic-tac-toe/'];
const COARSE_MAX = 1180; // emulate touch (pointer: coarse) at and below this width

// Runs in the page. Returns [] when everything passes.
const CHECKS = `(async () => {
  const f = [];
  const tick = () => new Promise(r => setTimeout(r, 60));
  const vw = innerWidth, vh = innerHeight;
  if (!document.querySelector('.brand-link') || !document.querySelector('footer a')) return ['page/includes not loaded: ' + location.pathname];
  const r = (el) => el.getBoundingClientRect();
  const vis = (el) => { const b = r(el); return b.width > 0 && b.height > 0; };
  if (document.scrollingElement.scrollWidth > vw) f.push('x-overflow ' + document.scrollingElement.scrollWidth + '>' + vw);
  const brand = document.querySelector('.brand-link'), cap = document.querySelector('.nav-center');
  if (brand && cap && getComputedStyle(cap).display !== 'none') {
    const b = r(brand), c = r(cap);
    if (c.left < b.right + 8) f.push('nav overlaps brand (' + Math.round(b.right) + '>' + Math.round(c.left) + ')');
    if (c.right > vw - 56) f.push('nav capsule hits right edge');
  }
  if (matchMedia('(pointer: coarse)').matches) {
    document.querySelectorAll('input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=file]), select, textarea').forEach(el => {
      if (vis(el) && parseFloat(getComputedStyle(el).fontSize) < 16) f.push('input <16px: ' + (el.id || el.className));
    });
    const seen = new Set();
    document.querySelectorAll('button, summary, select, input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=file]), .nav-link, .pill-nav-item, .breadcrumb-link').forEach(el => {
      if (!vis(el) || r(el).height >= 44) return;
      const k = (el.className || el.tagName).toString().split(' ')[0];
      if (!seen.has(k)) { seen.add(k); f.push('target <44px: ' + k + ' ' + Math.round(r(el).height) + 'px'); }
    });
    document.querySelectorAll('.segmented-group').forEach(g => {
      if (g.scrollWidth > g.clientWidth + 1 && getComputedStyle(g).overflowX !== 'auto') f.push('segmented overflow w/o scroll: ' + (g.id || 'segmented-group'));
    });
  }
  // Nav state must match the breakpoint: capsule >1023, hamburger + pill nav ≤1023 (pill nav is non-home only)
  const tablet = vw <= 1023, toggle = document.getElementById('mobile-menu-toggle'), pill = document.querySelector('.mobile-bottom-pill-nav');
  if (cap && (getComputedStyle(cap).display === 'none') !== tablet) f.push('nav capsule visibility wrong for ' + vw);
  if (toggle && (getComputedStyle(toggle).display !== 'none') !== tablet) f.push('hamburger visibility wrong for ' + vw);
  if (pill && (getComputedStyle(pill).display !== 'none') !== tablet) f.push('pill nav visibility wrong for ' + vw);
  if (tablet && toggle) {
    toggle.click(); await tick();
    const drawer = document.getElementById('mobile-nav-drawer');
    const links = drawer ? [...drawer.querySelectorAll('a')].filter(vis) : [];
    if (!drawer || !drawer.classList.contains('open') || !links.length) f.push('hamburger does not open drawer');
    else if (matchMedia('(pointer: coarse)').matches && links.some(a => r(a).height < 44)) f.push('drawer links <44px');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick();
    if (drawer && drawer.classList.contains('open')) f.push('Escape does not close drawer');
  }
  // Overflowing segmented groups must actually scroll
  for (const g of document.querySelectorAll('.segmented-group')) {
    if (g.scrollWidth > g.clientWidth + 1) { g.scrollLeft = 9999; await tick(); if (g.scrollLeft < 1) f.push('segmented group cannot scroll: ' + (g.id || 'segmented-group')); g.scrollLeft = 0; }
  }
  const card = document.querySelector('.tool-workspace-card');
  if (card && r(card).top >= vh) f.push('tool card below fold (top ' + Math.round(r(card).top) + ')');
  // Nothing inside the tool card may stick out of it horizontally (catches non-shrinking flex items)
  if (card) {
    const cb = r(card);
    for (const el of card.querySelectorAll('.segmented-group, .toolbar-group, .tool-actions-toolbar, .tool-pane, .btn')) {
      const b = r(el); if (b.width && (b.right > cb.right + 1 || b.left < cb.left - 1)) { f.push('overflows card: ' + (el.id || '.' + (el.className || '').toString().split(' ')[0]) + ' ' + Math.round(b.right - cb.right) + 'px [el ' + Math.round(b.left) + '-' + Math.round(b.right) + ', card ' + Math.round(cb.left) + '-' + Math.round(cb.right) + ', parent ' + Math.round(r(el.parentElement).left) + '-' + Math.round(r(el.parentElement).right) + '] (parent .' + el.parentElement.className.split(' ')[0] + ' ' + Math.round(r(el.parentElement).width) + 'px)'); break; }
    }
  }
  const links = [...document.querySelectorAll('footer a')].filter(vis);
  if (links.length) {
    scrollTo({ top: document.scrollingElement.scrollHeight, behavior: 'instant' });
    const last = links[links.length - 1], b = r(last);
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    if (b.bottom > vh) f.push('footer link below viewport');
    else if (hit && !last.contains(hit) && !hit.contains(last)) f.push('footer link covered by ' + (hit.className || hit.tagName).toString().split(' ')[0]);
    scrollTo({ top: 0, behavior: 'instant' });
  }
  return f;
})()`;

const getJson = (u) => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { res(b); } }); }).on('error', rej));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const filter = process.argv[2] || '';
  const port = 9400 + Math.floor(Math.random() * 100);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, '--window-size=1366,900', 'about:blank'], { stdio: 'ignore' });
  let ready = false; for (let i = 0; i < 20 && !ready; i++) { await sleep(500); try { await getJson(`http://127.0.0.1:${port}/json/version`); ready = true; } catch (e) {} }

  // One fresh tab per page: a tab that has visited some tool pages starts refusing navigation
  // (net::ERR_BLOCKED_BY_ADMINISTRATOR under managed Chrome), so never reuse tabs.
  const runOne = async (w, h, p) => {
    const t = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 0; const pending = {}; let onLoad = null;
    const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } if (d.method === 'Page.loadEventFired' && onLoad) onLoad(); };
    await send('Page.enable'); await send('Runtime.enable');
    const coarse = w <= COARSE_MAX;
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: coarse });
    await send('Emulation.setTouchEmulationEnabled', { enabled: coarse });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: coarse ? 'coarse' : 'fine' }, { name: 'hover', value: coarse ? 'none' : 'hover' }] });
    const loaded = Promise.race([new Promise(r => onLoad = r), sleep(8000)]);
    const nav = await send('Page.navigate', { url: BASE + p });
    await loaded; await sleep(1200); // includes + iconify settle
    const res = await send('Runtime.evaluate', { expression: CHECKS, returnByValue: true, awaitPromise: true });
    ws.close();
    await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    if (nav?.errorText) return ['navigate error ' + nav.errorText];
    return res.result?.value || ['evaluate failed: ' + JSON.stringify(res.exceptionDetails?.exception?.description)];
  };

  let fails = 0, runs = 0;
  for (const [w, h] of VIEWPORTS) for (const p of PAGES) {
    if (filter && !(`${w}x${h} /${p}`).includes(filter)) continue;
    const list = await runOne(w, h, p);
    runs++;
    if (list.length) { fails++; console.log(`✗ ${w}x${h} /${p}\n    ` + list.join('\n    ')); }
  }
  console.log(fails ? `\n${fails}/${runs} failing` : `✓ ${runs}/${runs} passing`);
  chrome.kill();
  process.exit(fails ? 1 : 0);
})();

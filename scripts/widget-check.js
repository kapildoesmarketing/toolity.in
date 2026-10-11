#!/usr/bin/env node
// Designed by Kapil Pidhwani: End-to-end verification for Toolity Widgets (scripts/widget-check.js).
// Verifies:
//   1. Schema round-trip: parse(toQuery(state)) preserves every field for flip-clock & countdown.
//   2. Trust boundary: hostile params (<script>, bad hex, huge numbers, bad timezones) fall back safely with zero XSS.
//   3. Builder ↔ Preview sync: editing controls in /widgets/<slug>/ updates #embed-url-output, builder URL, and live preview iframe.
//   4. Embed container sizing: /widgets/<slug>/embed/ renders inside 300×120 and 800×400 viewports with zero overflow.
// Usage: python3 -m http.server 3011 &  then  node scripts/widget-check.js

const { spawn } = require('child_process');
const http = require('http');
const assert = require('assert');

const BASE = 'http://localhost:3011';
const getJson = (u) => new Promise((res, rej) => http.get(u, (r) => { let b = ''; r.on('data', (d) => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { res(b); } }); }).on('error', rej));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const port = 9500 + Math.floor(Math.random() * 90);
  const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${port}`, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
  let ready = false;
  for (let i = 0; i < 20 && !ready; i++) {
    await sleep(400);
    try { await getJson(`http://127.0.0.1:${port}/json/version`); ready = true; } catch (e) {}
  }
  assert(ready, 'Chrome DevTools failed to start');

  async function withTab(url, viewport, fn) {
    const t = await new Promise((res, rej) => {
      const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, (r) => {
        let b = ''; r.on('data', (d) => b += d); r.on('end', () => res(JSON.parse(b)));
      });
      q.on('error', rej); q.end();
    });
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => ws.onopen = r);
    let id = 0; const pending = new Map();
    const errs = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text);
    };
    const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
    await send('Page.enable');
    await send('Runtime.enable');
    if (viewport) {
      await send('Emulation.setDeviceMetricsOverride', { width: viewport[0], height: viewport[1], deviceScaleFactor: 1, mobile: false });
    }
    await send('Page.navigate', { url });
    await sleep(900);
    const evalJs = async (expression) => {
      const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (res && res.exceptionDetails) throw new Error(res.exceptionDetails.text + ': ' + (res.result && res.result.description));
      return res && res.result ? res.result.value : undefined;
    };
    try {
      const out = await fn(evalJs, errs);
      return out;
    } finally {
      ws.close();
      await getJson(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {});
    }
  }

  let passed = 0;
  const ok = (label) => { passed++; console.log(`  ✓ ${label}`); };

  try {
    // 1 & 2. Schema round-trip + hostile input sanitization on Flip Clock & Countdown embeds
    await withTab(`${BASE}/widgets/flip-clock/embed/?title=%3Cscript%3Ealert(1)%3C%2Fscript%3E&accent=javascript:1&radius=99999&format=bad&tz=Not/AZone`, [300, 120], async (evalJs, errs) => {
      assert.strictEqual(errs.length, 0, 'Console errors on flip-clock embed: ' + errs.join('; '));
      const res = await evalJs(`(() => {
        const W = window.ToolityWidgets;
        const T = window.ToolityWidget;
        const st = T.getState();
        // Round-trip non-default state
        const custom = {
          title: 'Tokyo Desk',
          format: '24',
          seconds: false,
          ampm: false,
          date: false,
          tz: 'Asia/Tokyo',
          variant: 'compact',
          labels: true,
          theme: 'dark',
          transparent: true,
          font: 'jetbrains-mono',
          size: 'lg',
          align: 'left',
          radius: 20,
          accent: '10B981',
          bg: '111827',
          surface: '1F2937',
          fg: 'F9FAFB',
          badge: false
        };
        const qs = W.toQuery(T.schema, custom);
        const back = W.parse(T.schema, qs);
        const roundTripOk = Object.keys(custom).every((k) => back[k] === custom[k]);
        const scriptCount = document.querySelectorAll('#widget-root script').length;
        const overflowX = document.scrollingElement.scrollWidth > innerWidth;
        const overflowY = document.scrollingElement.scrollHeight > innerHeight;
        return { st, roundTripOk, scriptCount, overflowX, overflowY };
      })()`);
      assert.strictEqual(res.st.title, '<script>alert(1)</script>');
      assert.strictEqual(res.scriptCount, 0, 'XSS script element was injected');
      assert.strictEqual(res.st.accent, 'F4511E', 'Invalid hex should fall back to default F4511E');
      assert.strictEqual(res.st.radius, 28, 'Radius 99999 should clamp to max 28');
      assert.strictEqual(res.st.format, '12', 'Invalid enum should fall back to default 12');
      assert.strictEqual(res.st.tz, 'local', 'Invalid timezone should fall back to local');
      assert.strictEqual(res.roundTripOk, true, 'Flip clock schema round-trip failed');
      assert.strictEqual(res.overflowX, false, 'Flip clock embed overflowed horizontally at 300x120');
      assert.strictEqual(res.overflowY, false, 'Flip clock embed overflowed vertically at 300x120');
      ok('flip-clock: schema round-trip, hostile param sanitization, and 300×120 zero-overflow');
    });

    await withTab(`${BASE}/widgets/countdown/embed/?to=2030-01-01T00:00&title=Launch+Day&variant=flip&theme=dark`, [300, 120], async (evalJs, errs) => {
      assert.strictEqual(errs.length, 0, 'Console errors on countdown embed: ' + errs.join('; '));
      const res = await evalJs(`(() => {
        const W = window.ToolityWidgets;
        const T = window.ToolityWidget;
        const custom = {
          title: 'Diwali 2027',
          to: '2027-10-29T18:30',
          tz: 'Asia/Kolkata',
          variant: 'minimal',
          days: true,
          hours: true,
          minutes: true,
          seconds: false,
          done: 'Happy Diwali!',
          theme: 'light',
          transparent: false,
          font: 'playfair',
          size: 'sm',
          align: 'center',
          radius: 8,
          accent: 'D84315',
          bg: 'FFF8F1',
          surface: 'FFF1E2',
          fg: '1F1A17',
          badge: true
        };
        const qs = W.toQuery(T.schema, custom);
        const back = W.parse(T.schema, qs);
        const roundTripOk = Object.keys(custom).every((k) => back[k] === custom[k]);
        const overflowX = document.scrollingElement.scrollWidth > innerWidth;
        const overflowY = document.scrollingElement.scrollHeight > innerHeight;
        const digits = [...document.querySelectorAll('.w-digit')].map((d) => d.textContent);
        return { roundTripOk, overflowX, overflowY, digits };
      })()`);
      assert.strictEqual(res.roundTripOk, true, 'Countdown schema round-trip failed');
      assert.strictEqual(res.overflowX, false, 'Countdown embed overflowed horizontally at 300x120');
      assert.strictEqual(res.overflowY, false, 'Countdown embed overflowed vertically at 300x120');
      assert(res.digits.length === 4 && res.digits.every((d) => /^\d+$/.test(d)), 'Countdown digits did not render');
      ok('countdown: schema round-trip, live countdown rendering, and 300×120 zero-overflow');
    });

    // 3. Builder live preview & URL synchronization test
    await withTab(`${BASE}/widgets/countdown/`, [1280, 800], async (evalJs, errs) => {
      assert.strictEqual(errs.length, 0, 'Console errors on countdown builder: ' + errs.join('; '));
      const res = await evalJs(`(async () => {
        const titleIn = document.getElementById('opt-title');
        const toIn = document.getElementById('opt-to');
        titleIn.value = 'Ship v2';
        titleIn.dispatchEvent(new Event('input', { bubbles: true }));
        toIn.value = '2028-06-15T09:00';
        toIn.dispatchEvent(new Event('input', { bubbles: true }));
        // Click Notion Dark preset
        document.querySelector('[data-preset="notion-dark"]').click();
        const outUrl = document.getElementById('embed-url-output').value;
        const builderSearch = location.search;
        const frameTitle = document.getElementById('widget-preview-frame').contentDocument.querySelector('.w-title').textContent;
        const frameTheme = document.getElementById('widget-preview-frame').contentDocument.documentElement.getAttribute('data-theme');
        // Test paste-to-edit round-trip
        document.getElementById('btn-reset').click();
        const afterResetUrl = document.getElementById('embed-url-output').value;
        const pasteIn = document.getElementById('paste-embed-url');
        pasteIn.value = outUrl;
        pasteIn.dispatchEvent(new Event('input', { bubbles: true }));
        const restoredUrl = document.getElementById('embed-url-output').value;
        return { outUrl, builderSearch, frameTitle, frameTheme, afterResetUrl, restoredUrl };
      })()`);
      assert(res.outUrl.includes('title=Ship+v2'), 'Output URL missing title param: ' + res.outUrl);
      assert(res.outUrl.includes('to=2028-06-15T09%3A00'), 'Output URL missing target date: ' + res.outUrl);
      assert(res.outUrl.includes('theme=dark'), 'Output URL missing preset theme: ' + res.outUrl);
      assert(res.builderSearch.includes('title=Ship+v2'), 'Builder URL did not sync via replaceState');
      assert.strictEqual(res.frameTitle, 'Ship v2', 'Live preview iframe did not update title immediately');
      assert.strictEqual(res.frameTheme, 'dark', 'Live preview iframe did not update theme immediately');
      assert.strictEqual(res.afterResetUrl, 'https://toolity.in/widgets/countdown/embed/', 'Reset did not clear URL to clean default');
      assert.strictEqual(res.restoredUrl, res.outUrl, 'Paste-to-edit did not restore exact embed URL');
      ok('builder ↔ embed sync: live preview update, replaceState, Reset, and Paste-to-edit round-trip');
    });

    console.log(`\n✓ ${passed}/3 widget test suites passing`);
  } finally {
    chrome.kill();
  }
})();

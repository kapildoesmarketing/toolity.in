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
        // credit must be in flow (below the widget), never over the digits/date
        const credit = document.querySelector('.w-credit');
        const units = document.querySelector('.w-units').getBoundingClientRect();
        const creditOk = !!credit && credit.getBoundingClientRect().top >= units.bottom && !getComputedStyle(credit).position.match(/fixed|absolute/);
        return { st, roundTripOk, scriptCount, overflowX, overflowY, creditOk };
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
      assert.strictEqual(res.creditOk, true, 'Credit is missing or overlaps the widget');
      ok('flip-clock: schema round-trip, hostile param sanitization, in-flow credit, and 300×120 zero-overflow');
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
        // Apply the Notion Dark preset via the select
        const presetSel = document.getElementById('opt-preset');
        presetSel.value = 'notion-dark';
        presetSel.dispatchEvent(new Event('change', { bubbles: true }));
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

    // 4. Sunrise & Sunset: hostile params, solar maths against published tables, round-trip, 300×180 zero-overflow
    await withTab(`${BASE}/widgets/sunrise-sunset/embed/?lat=999&lon=abc&tz=Bad/Zone&title=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E`, [300, 180], async (evalJs, errs) => {
      assert.strictEqual(errs.length, 0, 'Console errors on sunrise embed: ' + errs.join('; '));
      const res = await evalJs(`(() => {
        const W = window.ToolityWidgets, T = window.ToolityWidget, st = T.getState(), S = window.__sun.sunTimes;
        const hm = (ms, tz) => new Date(ms).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
        const mumbai = S(Date.parse('2026-06-21T06:30:00Z'), 19.08, 72.88), london = S(Date.parse('2026-12-21T12:00:00Z'), 51.51, -0.13), polar = S(Date.parse('2026-06-21T11:00:00Z'), 69.65, 18.96);
        const custom = { title: 'Home', place: 'Tokyo', lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo', format: '24', variant: 'compact', daylen: false, next: false, golden: true, twilight: true, theme: 'dark', badge: false };
        const back = W.parse(T.schema, W.toQuery(T.schema, custom));
        const fit = () => document.scrollingElement.scrollWidth <= innerWidth && document.scrollingElement.scrollHeight <= innerHeight;
        T.update({ lat: 19.08, lon: 72.88 }); const arcFit = fit() && !!document.querySelector('.w-sun-arc');
        T.update({ lat: 19.08, lon: 72.88, variant: 'compact', golden: 1, twilight: 1 }); const compactFit = fit();
        const linesAt = (lat) => { T.update({ lat, lon: 0, tz: 'UTC' }); return document.querySelector('.w-sun-lines').textContent; };
        // The embed shows *today*: one pole is in polar day and the other in polar night (date-independent except ±2 days of an equinox)
        const polarText = [linesAt(89.9), linesAt(-89.9)].sort().join(' | ');
        return { st, imgs: document.querySelectorAll('#widget-root img').length, m: [hm(mumbai.sun[0], 'Asia/Kolkata'), hm(mumbai.sun[1], 'Asia/Kolkata')], l: [hm(london.sun[0], 'Europe/London'), hm(london.sun[1], 'Europe/London')],
          polar: polar.sun === null && polar.noonAlt > 0, polarText, roundTrip: Object.keys(custom).every((k) => back[k] === custom[k]), arcFit, compactFit };
      })()`);
      const near = (a, b) => Math.abs((+a.slice(0, 2) * 60 + +a.slice(3)) - (+b.slice(0, 2) * 60 + +b.slice(3))) <= 2;
      assert.strictEqual(res.imgs, 0, 'XSS element injected');
      assert(res.st.lat === 90 && res.st.lon === 72.88 && res.st.tz === 'Asia/Kolkata', 'hostile lat/lon/tz: ' + JSON.stringify([res.st.lat, res.st.lon, res.st.tz]));
      assert(near(res.m[0], '06:02') && near(res.m[1], '19:18'), 'Mumbai 21 Jun: ' + res.m);
      assert(near(res.l[0], '08:04') && near(res.l[1], '15:53'), 'London 21 Dec: ' + res.l);
      assert(res.polar && /No sunrise today/.test(res.polarText) && /Sun up all day/.test(res.polarText), 'Tromsø midsummer maths should be polar day; poles today should show polar day + night: ' + res.polarText);
      assert.strictEqual(res.roundTrip, true, 'Sunrise schema round-trip failed');
      assert(res.arcFit && res.compactFit, 'Sunrise embed overflowed at 300×180 (arc ' + res.arcFit + ', compact ' + res.compactFit + ')');
      ok('sunrise-sunset: hostile params, ±2 min vs published tables (Mumbai, London), polar day, round-trip, 300×180 fit');
    });

    // 5. Timer: Pomodoro phase change + persistence, stopwatch with tap-pair Start/Pause, days since, 300×180 fit
    await withTab(`${BASE}/widgets/timer/embed/?focus=1&rounds=2`, [300, 180], async (evalJs, errs) => {
      assert.strictEqual(errs.length, 0, 'Console errors on timer embed: ' + errs.join('; '));
      const res = await evalJs(`(async () => {
        localStorage.clear(); window.ToolityWidget.update(location.search);
        const tick = (ms) => new Promise((r) => setTimeout(r, ms)), $b = (t) => [...document.querySelectorAll('.w-btn')].find((b) => b.textContent === t);
        const digits = () => [...document.querySelectorAll('.w-digit')].map((d) => d.textContent).join(':');
        const fit = document.scrollingElement.scrollWidth <= innerWidth && document.scrollingElement.scrollHeight <= innerHeight;
        const start0 = digits(); $b('Start').click(); await tick(1200); const running = window.__timer.P.run, moved = digits() !== start0;
        window.__timer.P.end = Date.now() + 200; await tick(700);
        const afterPhase = { phase: window.__timer.P.phase, run: window.__timer.P.run, sub: document.querySelector('.w-sub').textContent, saved: JSON.parse(localStorage.getItem('toolity-timer:pomodoro:' + location.search) || '{}').phase };
        $b('Skip').click(); const skipped = window.__timer.P.phase + ':' + window.__timer.P.round;
        // stopwatch: tap-pair (click immediately followed by click) must leave it paused, never stuck running
        window.ToolityWidget.update('mode=stopwatch'); const go = () => document.querySelector('.w-btn');
        go().click(); await tick(1100); const sw1 = window.__timer.S.run && (Date.now() - window.__timer.S.t0) >= 1000;
        go().click(); const pausedAt = digits(); await tick(400); const held = digits() === pausedAt && !window.__timer.S.run;
        go().click(); go().click(); await tick(150); const tapPair = !window.__timer.S.run;
        go().click(); await tick(300); $b('Lap').click(); const laps = document.querySelector('.w-laps').children.length;
        go().click(); $b('Reset').click(); const reset = window.__timer.S.acc === 0 && window.__timer.S.laps.length === 0;
        window.ToolityWidget.update('mode=since&since=2026-01-01T00:00&tz=UTC'); await tick(50);
        const days = +document.querySelector('.w-digit').textContent, expect = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 864e5);
        return { fit, running, moved, afterPhase, skipped, sw1, held, tapPair, laps, reset, days, expect };
      })()`);
      assert(res.fit, 'Timer embed overflowed at 300×180');
      assert(res.running && res.moved, 'Pomodoro did not start/count');
      assert(res.afterPhase.phase === 'break' && !res.afterPhase.run && /Short break/.test(res.afterPhase.sub) && res.afterPhase.saved === 'break', 'Phase change: ' + JSON.stringify(res.afterPhase));
      assert.strictEqual(res.skipped, 'focus:2', 'Skip after break should start focus round 2');
      assert(res.sw1 && res.held && res.tapPair, 'Stopwatch run/pause/tap-pair: ' + JSON.stringify([res.sw1, res.held, res.tapPair]));
      assert(res.laps === 1 && res.reset, 'Stopwatch lap/reset');
      assert.strictEqual(res.days, res.expect, 'Days since 2026-01-01 UTC');
      ok('timer: Pomodoro phase change + skip + saved state, stopwatch run/pause/tap-pair/lap/reset, days since, 300×180 fit');
    });
    await withTab(`${BASE}/widgets/timer/embed/?mode=stopwatch`, [300, 180], async (evalJs) => {
      await evalJs(`(() => { localStorage.removeItem('toolity-timer:stopwatch:?mode=stopwatch'); window.ToolityWidget.update(location.search); document.querySelector('.w-btn').click(); return true; })()`);
    });
    await withTab(`${BASE}/widgets/timer/embed/?mode=stopwatch`, [300, 180], async (evalJs) => {
      const r = await evalJs(`new Promise((res) => setTimeout(() => res({ run: window.__timer.S.run, label: document.querySelector('.w-btn').textContent }), 300))`);
      assert(r.run && r.label === 'Pause', 'Running stopwatch did not survive a reload: ' + JSON.stringify(r));
      ok('timer: running stopwatch survives a reload (localStorage)');
    });

    // 6. Builders: city picker + stubbed geolocation (sunrise), mode-specific settings (timer)
    await withTab(`${BASE}/widgets/sunrise-sunset/`, [1280, 800], async (evalJs, errs) => {
      assert.strictEqual(errs.length, 0, 'Console errors on sunrise builder: ' + errs.join('; '));
      const res = await evalJs(`(async () => {
        const $ = (id) => document.getElementById(id), tick = (ms) => new Promise((r) => setTimeout(r, ms));
        $('city-pick').value = 'Tokyo'; $('city-pick').dispatchEvent(new Event('change'));
        const tokyo = $('embed-url-output').value, place = $('widget-preview-frame').contentDocument.querySelector('.w-title').textContent;
        navigator.geolocation.getCurrentPosition = (ok) => ok({ coords: { latitude: 48.85837, longitude: 2.29448 } });
        $('btn-geo').click(); await tick(50);
        return { tokyo, place, geo: $('embed-url-output').value, note: $('geo-note').textContent };
      })()`);
      assert(/lat=35\.68/.test(res.tokyo) && /lon=139\.69/.test(res.tokyo) && /tz=Asia%2FTokyo/.test(res.tokyo) && res.place === 'Tokyo', 'City pick: ' + res.tokyo + ' / ' + res.place);
      assert(/lat=48\.86/.test(res.geo) && /lon=2\.29/.test(res.geo) && /about 1 km/.test(res.note), 'Geolocation rounding: ' + res.geo);
      ok('sunrise builder: city picker fills lat/lon/tz, geolocation rounded to 2 decimals');
    });
    await withTab(`${BASE}/widgets/timer/`, [1280, 800], async (evalJs, errs) => {
      assert.strictEqual(errs.length, 0, 'Console errors on timer builder: ' + errs.join('; '));
      const res = await evalJs(`(async () => {
        const tick = (ms) => new Promise((r) => setTimeout(r, ms)), vis = (m) => !document.querySelector('[data-mode-only="' + m + '"]').hidden;
        const before = [vis('pomodoro'), vis('since')];
        document.querySelector('#seg-mode [data-value="since"]').click(); await tick(50);
        const after = [vis('pomodoro'), vis('since')], url = document.getElementById('embed-url-output').value;
        document.getElementById('btn-reset').click(); await tick(50);
        return { before, after, url, reset: [vis('pomodoro'), vis('since')] };
      })()`);
      assert(res.before[0] && !res.before[1] && !res.after[0] && res.after[1] && /mode=since/.test(res.url) && res.reset[0] && !res.reset[1], 'Mode panels: ' + JSON.stringify(res));
      ok('timer builder: mode switch shows only that mode\'s settings, Reset restores Pomodoro');
    });

    console.log(`\n✓ ${passed} widget test suites passing`);
  } finally {
    chrome.kill();
  }
})();

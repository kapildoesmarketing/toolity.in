/* Designed by Kapil Pidhwani: World Clocks widget — 2–6 IANA zones, live via Intl.DateTimeFormat (DST-safe), day/night tint,
 * working-hours overlap strip in the first (home) city's time. Ceiling: overlap assumes the same work hours in every city. */
(function () {
  'use strict';
  const SCHEMA = [
    { key: 'title', type: 'text', maxLength: 40, default: '', id: 'opt-title', label: 'Header' },
    { key: 'cities', type: 'text', multiline: true, maxLength: 400, default: 'Asia/Kolkata | Mumbai\nEurope/London | London\nAmerica/New_York | New York', id: 'opt-cities', label: 'Cities' },
    { key: 'format', type: 'enum', default: '24', options: ['24', '12'], id: 'seg-format', label: 'Time format' },
    { key: 'variant', type: 'enum', default: 'cards', options: ['cards', 'row'], id: 'seg-variant', label: 'Display' },
    { key: 'start', type: 'number', default: 9, min: 0, max: 23, id: 'opt-start', label: 'Work start' },
    { key: 'end', type: 'number', default: 18, min: 1, max: 24, id: 'opt-end', label: 'Work end' },
    { key: 'date', type: 'bool', default: true, id: 'opt-date', label: 'Date' },
    { key: 'seconds', type: 'bool', default: false, id: 'opt-seconds', label: 'Seconds' },
    { key: 'overlap', type: 'bool', default: true, id: 'opt-overlap', label: 'Overlap bar' }
  ];
  const validTz = (tz) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch (e) { return false; } };
  const parse = (s) => String(s || '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p[0] && validTz(p[0])).slice(0, 6).map(([tz, label]) => ({ tz, label: label || tz.split('/').pop().replace(/_/g, ' ') }));
  const validate = (st) => (parse(st.cities).length >= 1 ? '' : 'Add at least one valid IANA zone, e.g. Europe/Berlin | Berlin');
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const parts = (d, tz) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(d).map((p) => [p.type, p.value]));
  const offsetMin = (d, tz) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(d).map((x) => [x.type, x.value])); return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - d.getTime()) / 60000); };

  function render(root, state) {
    root.innerHTML = '';
    const cities = parse(state.cities), wrap = el('div', 'w-card-wrap w-clocks-wrap'); if (state.title) wrap.appendChild(el('div', 'w-title', state.title));
    const row = el('div', `w-clocks variant-${state.variant}`); row.style.setProperty('--n', cities.length);
    const cards = cities.map((c) => { const card = el('div', 'w-clock'); card.appendChild(el('div', 'w-clock-city', c.label)); const t = el('div', 'w-clock-time'); card.appendChild(t); const sub = el('div', 'w-clock-sub'); card.appendChild(sub); row.appendChild(card); return { c, card, t, sub }; });
    wrap.appendChild(row);
    let bar = null; if (state.overlap && cities.length > 1) { bar = el('div', 'w-overlap'); const strip = el('div', 'w-overlap-strip'); bar.appendChild(strip); const lab = el('div', 'w-overlap-label'); bar.appendChild(lab); wrap.appendChild(bar); bar._strip = strip; bar._lab = lab; }
    root.appendChild(wrap);
    const tick = () => {
      const now = new Date(), home = offsetMin(now, cities[0].tz);
      cards.forEach(({ c, card, t, sub }) => {
        const p = parts(now, c.tz), h = +p.hour % 24, m = p.minute, s = p.second;
        t.textContent = state.format === '12' ? `${((h + 11) % 12) + 1}:${m}${state.seconds ? ':' + s : ''} ${h < 12 ? 'AM' : 'PM'}` : `${String(h).padStart(2, '0')}:${m}${state.seconds ? ':' + s : ''}`;
        const diff = (offsetMin(now, c.tz) - home) / 60, dd = diff === 0 ? 'home' : `${diff > 0 ? '+' : '−'}${Math.abs(diff) % 1 ? Math.abs(diff).toFixed(1) : Math.abs(diff)}h`;
        sub.textContent = `${state.date ? `${p.weekday} ${p.day} ${p.month} · ` : ''}${dd}`;
        card.classList.toggle('is-night', h < 6 || h >= 18); card.classList.toggle('is-work', h >= state.start && h < state.end);
      });
      if (bar) {
        // Designed by Kapil Pidhwani: each city's work window shifted into home time; overlap = intersection on a 24h strip.
        const win = cities.map((c) => { const sh = (offsetMin(now, c.tz) - home) / 60; return [state.start - sh, state.end - sh]; });
        const lo = Math.max(...win.map((w) => w[0])), hi = Math.min(...win.map((w) => w[1]));
        bar._strip.innerHTML = '';
        win.forEach((w, i) => { const seg = el('i', 'w-overlap-seg'); const a = ((w[0] % 24) + 24) % 24, b = a + (w[1] - w[0]); seg.style.left = `${a / 24 * 100}%`; seg.style.width = `${Math.min(24 - a, b - a) / 24 * 100}%`; seg.style.top = `${i * (100 / win.length)}%`; seg.style.height = `${100 / win.length}%`; bar._strip.appendChild(seg); });
        if (hi > lo) { const o = el('i', 'w-overlap-all'); const a = ((lo % 24) + 24) % 24; o.style.left = `${a / 24 * 100}%`; o.style.width = `${Math.min(24 - a, hi - lo) / 24 * 100}%`; bar._strip.appendChild(o); }
        const nowH = (+parts(now, cities[0].tz).hour % 24) + (+parts(now, cities[0].tz).minute) / 60; const cur = el('i', 'w-overlap-now'); cur.style.left = `${nowH / 24 * 100}%`; bar._strip.appendChild(cur);
        const f = (h) => { const x = ((h % 24) + 24) % 24; return `${String(Math.floor(x)).padStart(2, '0')}:${String(Math.round((x % 1) * 60)).padStart(2, '0')}`; };
        bar._lab.textContent = hi > lo ? `Everyone at work ${f(lo)}–${f(hi)} ${cities[0].label} time` : 'No hour when everyone is at work';
      }
    };
    tick(); const iv = setInterval(tick, state.seconds ? 1000 : 10000);
    return () => clearInterval(iv);
  }
  function builderExtras() {
    const pick = document.getElementById('tz-pick'), ta = document.getElementById('opt-cities'); if (!pick || !ta) return;
    window.ToolityWidgets.populateTimezoneSelect(pick); pick.querySelector('option[value="local"]') && pick.querySelector('option[value="local"]').remove(); pick.value = '';
    pick.addEventListener('change', () => { if (!pick.value) return; const lines = ta.value.trim() ? ta.value.trim().split('\n') : []; if (lines.length >= 6) { pick.value = ''; return; } lines.push(`${pick.value} | ${pick.value.split('/').pop().replace(/_/g, ' ')}`); ta.value = lines.join('\n'); ta.dispatchEvent(new Event('input', { bubbles: true })); pick.value = ''; });
  }
  window.__clocks = { parse, offsetMin, validTz };
  if (window.ToolityWidgets) {
    window.ToolityWidgets.register({ slug: 'world-clocks', title: 'World Clocks', height: 200, schema: SCHEMA, validate, render });
    if (document.getElementById('tool-card')) (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', builderExtras, { once: true }) : builderExtras());
  }
})();

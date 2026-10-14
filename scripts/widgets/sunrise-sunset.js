/* Designed by Kapil Pidhwani: Sunrise & Sunset widget definition (scripts/widgets/sunrise-sunset.js).
 * Shared by /widgets/sunrise-sunset/ (builder) and /widgets/sunrise-sunset/embed/ (chromeless embed).
 * Sun maths: the standard NOAA / Meeus low-precision solar model (as popularised by SunCalc) — offline, ±1 min at mid
 * latitudes. Ceiling: no refraction model beyond the fixed −0.833° horizon, no elevation correction; near the poles times
 * can drift several minutes. Upgrade path: full NREL SPA if minute-exact polar times are ever needed.
 * Location lives in the URL (lat/lon rounded to 2 decimals ≈ 1 km); embed viewers are never asked for their position.
 */
(function () {
  'use strict';

  const SCHEMA = [
    { key: 'title',    type: 'text',    default: '',             maxLength: 60, id: 'opt-title',    label: 'Header label' },
    { key: 'place',    type: 'text',    default: 'Mumbai',       maxLength: 40, id: 'opt-place',    label: 'Place name' },
    { key: 'lat',      type: 'decimal', default: 19.08,          min: -90,  max: 90,  decimals: 2, id: 'opt-lat', label: 'Latitude' },
    { key: 'lon',      type: 'decimal', default: 72.88,          min: -180, max: 180, decimals: 2, id: 'opt-lon', label: 'Longitude' },
    { key: 'tz',       type: 'tz',      default: 'Asia/Kolkata', id: 'opt-tz',       label: 'Time zone' },
    { key: 'format',   type: 'enum',    default: '12',           options: ['12', '24'], id: 'seg-format', label: 'Time format' },
    { key: 'variant',  type: 'enum',    default: 'arc',          options: ['arc', 'minimal', 'compact'], id: 'seg-variant', label: 'Display style' },
    { key: 'daylen',   type: 'bool',    default: true,           id: 'opt-daylen',   label: 'Day length' },
    { key: 'next',     type: 'bool',    default: true,           id: 'opt-next',     label: 'Next sunrise / sunset countdown' },
    { key: 'golden',   type: 'bool',    default: false,          id: 'opt-golden',   label: 'Golden hour' },
    { key: 'twilight', type: 'bool',    default: false,          id: 'opt-twilight', label: 'Civil twilight' }
  ];

  /* ── Solar model ── */
  const RAD = Math.PI / 180, DAY = 864e5, J1970 = 2440588, J2000 = 2451545, OBL = RAD * 23.4397, J0 = 0.0009;
  const toDays = (ms) => ms / DAY - 0.5 + J1970 - J2000;
  const fromJ = (j) => (j + 0.5 - J1970) * DAY;
  function sunTimes(ms, lat, lon) {
    const lw = RAD * -lon, phi = RAD * lat, d = toDays(ms);
    const n = Math.round(d - J0 - lw / (2 * Math.PI));
    const ds = J0 + lw / (2 * Math.PI) + n;
    const M = RAD * (357.5291 + 0.98560028 * ds);
    const L = M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(OBL) * Math.sin(L));
    const transit = (a) => J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const noonJ = transit(ds);
    const noonAlt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec)) / RAD;
    const pair = (deg) => { // [rise, set] in ms, or null when the sun never crosses that altitude today
      const c = (Math.sin(deg * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
      if (c < -1 || c > 1) return null;
      const setJ = transit(J0 + (Math.acos(c) + lw) / (2 * Math.PI) + n);
      return [fromJ(noonJ - (setJ - noonJ)), fromJ(setJ)];
    };
    return { noon: fromJ(noonJ), noonAlt, sun: pair(-0.833), civil: pair(-6), golden: pair(6) };
  }

  function fmtTime(ms, state) {
    const o = { hour: 'numeric', minute: '2-digit', hour12: state.format === '12' };
    if (state.tz && state.tz !== 'local') o.timeZone = state.tz;
    try { return new Intl.DateTimeFormat('en-US', o).format(new Date(ms)); } catch (e) { return new Date(ms).toLocaleTimeString(); }
  }
  const dur = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); const h = Math.floor(m / 60); return h ? `${h} h ${m % 60} m` : `${m} m`; };

  function validate(state) {
    if (Math.abs(state.lat) > 66.5) return 'Above the polar circles the sun may not rise or set for days — the widget then shows "Sun up all day" or "No sunrise today".';
    return '';
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  const SVG = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }

  function render(root, state) {
    root.innerHTML = '';
    const wrap = el('div', 'w-card-wrap w-sun');
    const head = state.title || state.place;
    const titleEl = el('div', 'w-title', head); titleEl.hidden = !head; wrap.appendChild(titleEl);

    let arcFill = null, arcSun = null;
    if (state.variant === 'arc') {
      const svg = svgEl('svg', { class: 'w-sun-arc', viewBox: '0 0 200 70', 'aria-hidden': 'true' });
      svg.appendChild(svgEl('line', { class: 'w-sun-horizon', x1: 2, y1: 62, x2: 198, y2: 62 }));
      const d = 'M 12 62 A 88 54 0 0 1 188 62';
      svg.appendChild(svgEl('path', { class: 'w-sun-track', d, pathLength: 100 }));
      arcFill = svgEl('path', { class: 'w-sun-fill', d, pathLength: 100, 'stroke-dasharray': '0 100' });
      svg.appendChild(arcFill);
      arcSun = svgEl('circle', { class: 'w-sun-dot', r: 6, cx: 12, cy: 62 });
      svg.appendChild(arcSun);
      wrap.appendChild(svg);
    }

    const compact = state.variant === 'compact';
    const row = el('div', compact ? 'w-sun-line' : 'w-sun-row');
    const stat = (label) => { const s = el('div', 'w-stat'); const v = el('span', 'w-stat-val'); s.appendChild(el('span', 'w-stat-label', label)); s.appendChild(v); row.appendChild(s); return v; };
    const riseV = stat(compact ? '↑' : 'Sunrise'), setV = stat(compact ? '↓' : 'Sunset');
    let lenV = null; if (compact && state.daylen) lenV = stat('☀');
    wrap.appendChild(row);

    const lines = el('div', 'w-sun-lines'); wrap.appendChild(lines);
    root.appendChild(wrap);

    function tick() {
      const now = Date.now(), t = sunTimes(now, state.lat, state.lon);
      const polar = !t.sun ? (t.noonAlt > -0.833 ? 'Sun up all day' : 'No sunrise today') : '';
      riseV.textContent = t.sun ? fmtTime(t.sun[0], state) : '—';
      setV.textContent = t.sun ? fmtTime(t.sun[1], state) : '—';
      const dayMs = t.sun ? t.sun[1] - t.sun[0] : (t.noonAlt > 0 ? DAY : 0);
      if (lenV) lenV.textContent = dur(dayMs);

      const out = [];
      if (polar) out.push(polar);
      if (state.daylen && !compact) out.push(`Day length ${dur(dayMs)}`);
      if (state.next && t.sun) {
        if (now < t.sun[0]) out.push(`Sunrise in ${dur(t.sun[0] - now)}`);
        else if (now < t.sun[1]) out.push(`Sunset in ${dur(t.sun[1] - now)}`);
        else { const nx = sunTimes(now + DAY, state.lat, state.lon); if (nx.sun) out.push(`Sunrise tomorrow ${fmtTime(nx.sun[0], state)}`); }
      }
      if (state.golden && t.golden && t.sun) out.push(`Golden hour ${fmtTime(t.sun[0], state)}–${fmtTime(t.golden[0], state)} · ${fmtTime(t.golden[1], state)}–${fmtTime(t.sun[1], state)}`);
      if (state.twilight && t.civil) out.push(`Twilight from ${fmtTime(t.civil[0], state)} · until ${fmtTime(t.civil[1], state)}`);
      lines.replaceChildren(...out.map((s) => el('div', 'w-sub', s)));

      if (arcSun) {
        const up = t.sun ? (now - t.sun[0]) / (t.sun[1] - t.sun[0]) : (t.noonAlt > 0 ? (now - t.noon) / DAY + 0.5 : -1);
        const f = Math.min(1, Math.max(0, up)), night = up < 0 || up > 1;
        arcSun.setAttribute('cx', (100 - 88 * Math.cos(Math.PI * f)).toFixed(1));
        arcSun.setAttribute('cy', (62 - 54 * Math.sin(Math.PI * f)).toFixed(1));
        arcSun.classList.toggle('is-night', night);
        arcFill.setAttribute('stroke-dasharray', `${(night ? (up > 1 ? 100 : 0) : f * 100).toFixed(1)} 100`);
      }
      root.setAttribute('aria-label', `${head ? head + ': ' : ''}${polar || `sunrise ${riseV.textContent}, sunset ${setV.textContent}`}${state.daylen ? `, day length ${dur(dayMs)}` : ''}`);
    }
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }

  /* ── Builder-only helpers: city list + "Use my location" (no network; geolocation stays on the device) ── */
  const CITIES = [
    ['Mumbai', 19.08, 72.88, 'Asia/Kolkata'], ['Delhi', 28.61, 77.21, 'Asia/Kolkata'], ['Bengaluru', 12.97, 77.59, 'Asia/Kolkata'], ['Hyderabad', 17.39, 78.49, 'Asia/Kolkata'],
    ['Chennai', 13.08, 80.27, 'Asia/Kolkata'], ['Kolkata', 22.57, 88.36, 'Asia/Kolkata'], ['Pune', 18.52, 73.86, 'Asia/Kolkata'], ['Ahmedabad', 23.02, 72.57, 'Asia/Kolkata'],
    ['Jaipur', 26.91, 75.79, 'Asia/Kolkata'], ['Lucknow', 26.85, 80.95, 'Asia/Kolkata'], ['Chandigarh', 30.73, 76.78, 'Asia/Kolkata'], ['Kochi', 9.93, 76.27, 'Asia/Kolkata'],
    ['Goa (Panaji)', 15.49, 73.83, 'Asia/Kolkata'], ['Indore', 22.72, 75.86, 'Asia/Kolkata'], ['Bhopal', 23.26, 77.41, 'Asia/Kolkata'], ['Nagpur', 21.15, 79.09, 'Asia/Kolkata'],
    ['Surat', 21.17, 72.83, 'Asia/Kolkata'], ['Varanasi', 25.32, 82.97, 'Asia/Kolkata'], ['Guwahati', 26.14, 91.74, 'Asia/Kolkata'], ['Srinagar', 34.08, 74.80, 'Asia/Kolkata'],
    ['Thiruvananthapuram', 8.52, 76.94, 'Asia/Kolkata'], ['Bhubaneswar', 20.30, 85.82, 'Asia/Kolkata'], ['Dehradun', 30.32, 78.03, 'Asia/Kolkata'], ['Patna', 25.59, 85.14, 'Asia/Kolkata'],
    ['Karachi', 24.86, 67.01, 'Asia/Karachi'], ['Lahore', 31.55, 74.34, 'Asia/Karachi'], ['Dhaka', 23.81, 90.41, 'Asia/Dhaka'], ['Kathmandu', 27.72, 85.32, 'Asia/Kathmandu'],
    ['Colombo', 6.93, 79.86, 'Asia/Colombo'], ['Dubai', 25.20, 55.27, 'Asia/Dubai'], ['Abu Dhabi', 24.45, 54.38, 'Asia/Dubai'], ['Doha', 25.29, 51.53, 'Asia/Qatar'],
    ['Riyadh', 24.71, 46.68, 'Asia/Riyadh'], ['Jeddah', 21.49, 39.19, 'Asia/Riyadh'], ['Muscat', 23.59, 58.41, 'Asia/Muscat'], ['Kuwait City', 29.38, 47.99, 'Asia/Kuwait'],
    ['Tehran', 35.69, 51.39, 'Asia/Tehran'], ['Istanbul', 41.01, 28.98, 'Europe/Istanbul'], ['Tel Aviv', 32.09, 34.78, 'Asia/Jerusalem'], ['Cairo', 30.04, 31.24, 'Africa/Cairo'],
    ['Singapore', 1.35, 103.82, 'Asia/Singapore'], ['Kuala Lumpur', 3.14, 101.69, 'Asia/Kuala_Lumpur'], ['Bangkok', 13.76, 100.50, 'Asia/Bangkok'], ['Jakarta', -6.21, 106.85, 'Asia/Jakarta'],
    ['Bali (Denpasar)', -8.65, 115.22, 'Asia/Makassar'], ['Manila', 14.60, 120.98, 'Asia/Manila'], ['Ho Chi Minh City', 10.82, 106.63, 'Asia/Ho_Chi_Minh'], ['Hanoi', 21.03, 105.85, 'Asia/Bangkok'],
    ['Hong Kong', 22.32, 114.17, 'Asia/Hong_Kong'], ['Shanghai', 31.23, 121.47, 'Asia/Shanghai'], ['Beijing', 39.90, 116.41, 'Asia/Shanghai'], ['Shenzhen', 22.54, 114.06, 'Asia/Shanghai'],
    ['Taipei', 25.03, 121.57, 'Asia/Taipei'], ['Seoul', 37.57, 126.98, 'Asia/Seoul'], ['Tokyo', 35.68, 139.69, 'Asia/Tokyo'], ['Osaka', 34.69, 135.50, 'Asia/Tokyo'],
    ['Sydney', -33.87, 151.21, 'Australia/Sydney'], ['Melbourne', -37.81, 144.96, 'Australia/Melbourne'], ['Brisbane', -27.47, 153.03, 'Australia/Brisbane'], ['Perth', -31.95, 115.86, 'Australia/Perth'],
    ['Adelaide', -34.93, 138.60, 'Australia/Adelaide'], ['Auckland', -36.85, 174.76, 'Pacific/Auckland'], ['Wellington', -41.29, 174.78, 'Pacific/Auckland'], ['Honolulu', 21.31, -157.86, 'Pacific/Honolulu'],
    ['London', 51.51, -0.13, 'Europe/London'], ['Manchester', 53.48, -2.24, 'Europe/London'], ['Edinburgh', 55.95, -3.19, 'Europe/London'], ['Dublin', 53.35, -6.26, 'Europe/Dublin'],
    ['Paris', 48.86, 2.35, 'Europe/Paris'], ['Berlin', 52.52, 13.40, 'Europe/Berlin'], ['Munich', 48.14, 11.58, 'Europe/Berlin'], ['Amsterdam', 52.37, 4.90, 'Europe/Amsterdam'],
    ['Brussels', 50.85, 4.35, 'Europe/Brussels'], ['Zurich', 47.38, 8.54, 'Europe/Zurich'], ['Vienna', 48.21, 16.37, 'Europe/Vienna'], ['Prague', 50.08, 14.44, 'Europe/Prague'],
    ['Warsaw', 52.23, 21.01, 'Europe/Warsaw'], ['Copenhagen', 55.68, 12.57, 'Europe/Copenhagen'], ['Stockholm', 59.33, 18.07, 'Europe/Stockholm'], ['Oslo', 59.91, 10.75, 'Europe/Oslo'],
    ['Helsinki', 60.17, 24.94, 'Europe/Helsinki'], ['Reykjavik', 64.15, -21.94, 'Atlantic/Reykjavik'], ['Madrid', 40.42, -3.70, 'Europe/Madrid'], ['Barcelona', 41.39, 2.17, 'Europe/Madrid'],
    ['Lisbon', 38.72, -9.14, 'Europe/Lisbon'], ['Rome', 41.90, 12.50, 'Europe/Rome'], ['Milan', 45.46, 9.19, 'Europe/Rome'], ['Athens', 37.98, 23.73, 'Europe/Athens'],
    ['Budapest', 47.50, 19.04, 'Europe/Budapest'], ['Bucharest', 44.43, 26.10, 'Europe/Bucharest'], ['Kyiv', 50.45, 30.52, 'Europe/Kyiv'], ['Moscow', 55.76, 37.62, 'Europe/Moscow'],
    ['Lagos', 6.52, 3.38, 'Africa/Lagos'], ['Nairobi', -1.29, 36.82, 'Africa/Nairobi'], ['Johannesburg', -26.20, 28.05, 'Africa/Johannesburg'], ['Cape Town', -33.92, 18.42, 'Africa/Johannesburg'],
    ['Casablanca', 33.57, -7.59, 'Africa/Casablanca'], ['Accra', 5.60, -0.19, 'Africa/Accra'], ['Addis Ababa', 9.03, 38.74, 'Africa/Addis_Ababa'], ['New York', 40.71, -74.01, 'America/New_York'],
    ['Boston', 42.36, -71.06, 'America/New_York'], ['Washington, D.C.', 38.91, -77.04, 'America/New_York'], ['Miami', 25.76, -80.19, 'America/New_York'], ['Atlanta', 33.75, -84.39, 'America/New_York'],
    ['Toronto', 43.65, -79.38, 'America/Toronto'], ['Montreal', 45.50, -73.57, 'America/Toronto'], ['Chicago', 41.88, -87.63, 'America/Chicago'], ['Dallas', 32.78, -96.80, 'America/Chicago'],
    ['Houston', 29.76, -95.37, 'America/Chicago'], ['Mexico City', 19.43, -99.13, 'America/Mexico_City'], ['Denver', 39.74, -104.99, 'America/Denver'], ['Phoenix', 33.45, -112.07, 'America/Phoenix'],
    ['Los Angeles', 34.05, -118.24, 'America/Los_Angeles'], ['San Francisco', 37.77, -122.42, 'America/Los_Angeles'], ['Seattle', 47.61, -122.33, 'America/Los_Angeles'], ['Vancouver', 49.28, -123.12, 'America/Vancouver'],
    ['Anchorage', 61.22, -149.90, 'America/Anchorage'], ['São Paulo', -23.55, -46.63, 'America/Sao_Paulo'], ['Rio de Janeiro', -22.91, -43.17, 'America/Sao_Paulo'], ['Buenos Aires', -34.60, -58.38, 'America/Argentina/Buenos_Aires'],
    ['Santiago', -33.45, -70.67, 'America/Santiago'], ['Lima', -12.05, -77.04, 'America/Lima'], ['Bogotá', 4.71, -74.07, 'America/Bogota']
  ];

  function builderExtras() {
    const $ = (id) => document.getElementById(id);
    const pick = $('city-pick'); if (!pick) return;
    const sorted = CITIES.slice().sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name] of sorted) { const o = document.createElement('option'); o.value = name; o.textContent = name; pick.appendChild(o); }
    const setVal = (id, v) => { const e = $(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    pick.addEventListener('change', () => {
      const c = CITIES.find((x) => x[0] === pick.value); if (!c) return;
      setVal('opt-place', c[0]); setVal('opt-lat', c[1]); setVal('opt-lon', c[2]);
      if ([...$('opt-tz').options].some((o) => o.value === c[3])) setVal('opt-tz', c[3]);
    });
    const geo = $('btn-geo'), note = $('geo-note');
    geo.addEventListener('click', () => {
      if (!navigator.geolocation) { note.textContent = 'This browser cannot share a location — pick a city or type coordinates.'; return; }
      geo.disabled = true; note.textContent = 'Finding you… (stays on this device)';
      navigator.geolocation.getCurrentPosition((p) => {
        setVal('opt-lat', p.coords.latitude.toFixed(2)); setVal('opt-lon', p.coords.longitude.toFixed(2)); setVal('opt-place', '');
        const tz = (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone;
        if (tz && [...$('opt-tz').options].some((o) => o.value === tz)) setVal('opt-tz', tz);
        pick.value = ''; geo.disabled = false; note.textContent = 'Location set to about 1 km — add a place name if you like.';
      }, (e) => { geo.disabled = false; note.textContent = e.code === 1 ? 'Location access was blocked — pick a city or type coordinates.' : 'Could not get a location — pick a city or type coordinates.'; }, { timeout: 10000, maximumAge: 600000 });
    });
    $('btn-reset').addEventListener('click', () => { pick.value = ''; note.textContent = ''; });
  }

  window.__sun = { sunTimes, CITIES };
  if (window.ToolityWidgets) {
    window.ToolityWidgets.register({ slug: 'sunrise-sunset', title: 'Sunrise & Sunset', height: 220, schema: SCHEMA, validate, render });
    if (document.getElementById('tool-card')) (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', builderExtras, { once: true }) : builderExtras());
  }
})();

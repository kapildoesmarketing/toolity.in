/* Designed by Kapil Pidhwani: Weather widget — Open-Meteo forecast (free, no key, CC BY 4.0) fetched by the viewer's browser,
 * cached 15 min in localStorage; WMO weather codes → emoji/labels. Builder: Open-Meteo geocoding search + geolocation.
 * Ceiling: no hourly view; 1–5 day daily forecast only. */
(function () {
  'use strict';
  const SCHEMA = [
    { key: 'title', type: 'text', maxLength: 40, default: '', id: 'opt-title', label: 'Header' },
    { key: 'lat', type: 'decimal', default: 19.08, min: -90, max: 90, decimals: 2, id: 'opt-lat', label: 'Latitude' },
    { key: 'lon', type: 'decimal', default: 72.88, min: -180, max: 180, decimals: 2, id: 'opt-lon', label: 'Longitude' },
    { key: 'place', type: 'text', maxLength: 40, default: 'Mumbai', id: 'opt-place', label: 'Place' },
    { key: 'units', type: 'enum', default: 'c', options: ['c', 'f'], id: 'seg-units', label: 'Units' },
    { key: 'days', type: 'enum', default: '3', options: ['1', '3', '5'], id: 'seg-days', label: 'Days' },
    { key: 'wind', type: 'bool', default: true, id: 'opt-wind', label: 'Wind' },
    { key: 'humidity', type: 'bool', default: true, id: 'opt-humidity', label: 'Humidity' },
    { key: 'hilo', type: 'bool', default: true, id: 'opt-hilo', label: 'High / low' }
  ];
  const WMO = { 0: ['☀️', 'Clear'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'], 45: ['🌫️', 'Fog'], 48: ['🌫️', 'Rime fog'], 51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'], 56: ['🌧️', 'Freezing drizzle'], 57: ['🌧️', 'Freezing drizzle'], 61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'], 66: ['🌧️', 'Freezing rain'], 67: ['🌧️', 'Freezing rain'], 71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 77: ['🌨️', 'Snow grains'], 80: ['🌦️', 'Showers'], 81: ['🌧️', 'Showers'], 82: ['⛈️', 'Heavy showers'], 85: ['🌨️', 'Snow showers'], 86: ['🌨️', 'Snow showers'], 95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunder + hail'], 99: ['⛈️', 'Thunder + hail'] };
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const wmo = (c) => WMO[c] || ['🌡️', 'Weather'];
  const url = (st) => `https://api.open-meteo.com/v1/forecast?latitude=${st.lat}&longitude=${st.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=${st.days}&timezone=auto${st.units === 'f' ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : ''}`;
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* blocked */ } } };
  async function load(st) {
    const key = 'toolity_wx_' + url(st), c = store.get(key);
    if (c && Date.now() - c.t < 15 * 60000) return c.d;
    try { const r = await fetch(url(st)); if (!r.ok) throw new Error(r.status); const d = await r.json(); store.set(key, { t: Date.now(), d }); return d; } catch (e) { if (c) return c.d; throw e; }
  }
  function paint(card, st, d) {
    card.innerHTML = '';
    const cur = d.current, [ico, lab] = wmo(cur.weather_code), u = st.units === 'f' ? '°F' : '°C', wu = st.units === 'f' ? 'mph' : 'km/h';
    const top = el('div', 'w-wx-now'); top.appendChild(el('span', 'w-wx-ico', ico));
    const t = el('div', 'w-wx-temp'); t.appendChild(el('b', '', `${Math.round(cur.temperature_2m)}${u}`)); t.appendChild(el('span', '', lab)); top.appendChild(t); card.appendChild(top);
    const meta = []; if (st.hilo && d.daily) meta.push(`↑ ${Math.round(d.daily.temperature_2m_max[0])}° ↓ ${Math.round(d.daily.temperature_2m_min[0])}°`); meta.push(`Feels ${Math.round(cur.apparent_temperature)}°`); if (st.wind) meta.push(`💨 ${Math.round(cur.wind_speed_10m)} ${wu}`); if (st.humidity) meta.push(`💧 ${cur.relative_humidity_2m}%`);
    card.appendChild(el('div', 'w-wx-meta', meta.join(' · ')));
    if (+st.days > 1 && d.daily) { const row = el('div', 'w-wx-days'); d.daily.time.slice(1).forEach((day, i) => { const c = el('div', 'w-wx-day'); c.appendChild(el('span', 'w-wx-dname', new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' }))); c.appendChild(el('span', 'w-wx-dico', wmo(d.daily.weather_code[i + 1])[0])); c.appendChild(el('span', 'w-wx-dt', `${Math.round(d.daily.temperature_2m_max[i + 1])}° / ${Math.round(d.daily.temperature_2m_min[i + 1])}°`)); row.appendChild(c); }); card.appendChild(row); }
    card.setAttribute('aria-label', `${st.place}: ${Math.round(cur.temperature_2m)}${u}, ${lab}`);
  }
  function render(root, st) {
    root.innerHTML = '';
    const wrap = el('div', 'w-card-wrap w-wx-wrap'); wrap.appendChild(el('div', 'w-title', st.title || st.place || 'Weather')); if (st.title && st.place) wrap.appendChild(el('div', 'w-sub', st.place));
    const card = el('div', 'w-wx'); card.appendChild(el('div', 'w-wx-meta', 'Loading forecast…')); wrap.appendChild(card);
    const credit = el('a', 'w-wx-src', 'Open-Meteo'); credit.href = 'https://open-meteo.com'; credit.target = '_blank'; credit.rel = 'noopener'; wrap.appendChild(credit); root.appendChild(wrap);
    let alive = true;
    const go = () => load(st).then((d) => { if (alive) paint(card, st, d); }).catch(() => { if (alive) { card.innerHTML = ''; card.appendChild(el('div', 'w-wx-meta', 'Weather unavailable right now')); } });
    go(); const iv = setInterval(go, 15 * 60000);
    return () => { alive = false; clearInterval(iv); };
  }
  function builderExtras() {
    const $ = (id) => document.getElementById(id), q = $('city-search'), res = $('city-results'); if (!q) return;
    const setVal = (id, v) => { const e = $(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    let t = 0;
    q.addEventListener('input', () => { clearTimeout(t); const v = q.value.trim(); if (v.length < 2) { res.hidden = true; return; } t = setTimeout(async () => { try { const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(v)}&count=6&language=en&format=json`); const d = await r.json(); res.innerHTML = ''; (d.results || []).forEach((p) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'widget-city-opt'; b.setAttribute('role', 'option'); b.textContent = `${p.name}${p.admin1 ? ', ' + p.admin1 : ''} · ${p.country || ''}`; b.addEventListener('click', () => { setVal('opt-lat', p.latitude.toFixed(2)); setVal('opt-lon', p.longitude.toFixed(2)); setVal('opt-place', p.name); res.hidden = true; q.value = ''; }); res.appendChild(b); }); res.hidden = !res.children.length; } catch (e) { res.hidden = true; } }, 300); });
    document.addEventListener('click', (e) => { if (!res.contains(e.target) && e.target !== q) res.hidden = true; });
    const geo = $('btn-geo'), note = $('geo-note');
    geo.addEventListener('click', () => { if (!navigator.geolocation) return (note.textContent = 'Geolocation is not available in this browser.'); geo.disabled = true; note.textContent = 'Asking your browser for a location…'; navigator.geolocation.getCurrentPosition((pos) => { setVal('opt-lat', pos.coords.latitude.toFixed(2)); setVal('opt-lon', pos.coords.longitude.toFixed(2)); geo.disabled = false; note.textContent = 'Location set — type a place name if you like.'; }, (e) => { geo.disabled = false; note.textContent = e.code === 1 ? 'Location access was blocked — search a city instead.' : 'Could not get a location — search a city instead.'; }); });
  }
  window.__wx = { url, wmo, WMO };
  if (window.ToolityWidgets) {
    window.ToolityWidgets.register({ slug: 'weather', title: 'Weather', height: 240, schema: SCHEMA, render });
    if (document.getElementById('tool-card')) (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', builderExtras, { once: true }) : builderExtras());
  }
})();

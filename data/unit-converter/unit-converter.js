/* Designed by Kapil Pidhwani: Unit Converter — factor tables to one base unit per quantity (temperature uses formulas).
 * "To: All units" lists every unit with its own copy button; picking one unit shows a single big answer + formula. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  // [id, label, factor to base]  — exact definitions where they exist (NIST / SI)
  const U = {
    length: { base: 'm', def: 'm', u: [['nm', 'Nanometre (nm)', 1e-9], ['um', 'Micrometre (µm)', 1e-6], ['mm', 'Millimetre (mm)', 1e-3], ['cm', 'Centimetre (cm)', 1e-2], ['m', 'Metre (m)', 1], ['km', 'Kilometre (km)', 1e3], ['in', 'Inch (in)', 0.0254], ['ft', 'Foot (ft)', 0.3048], ['yd', 'Yard (yd)', 0.9144], ['mi', 'Mile (mi)', 1609.344], ['nmi', 'Nautical mile (nmi)', 1852]] },
    weight: { def: 'kg', u: [['mg', 'Milligram (mg)', 1e-6], ['g', 'Gram (g)', 1e-3], ['kg', 'Kilogram (kg)', 1], ['t', 'Tonne (t)', 1e3], ['oz', 'Ounce (oz)', 0.028349523125], ['lb', 'Pound (lb)', 0.45359237], ['st', 'Stone (st)', 6.35029318], ['ust', 'US ton (short)', 907.18474], ['ukt', 'UK ton (long)', 1016.0469088]] },
    temperature: { def: 'c', u: [['c', 'Celsius (°C)'], ['f', 'Fahrenheit (°F)'], ['k', 'Kelvin (K)'], ['r', 'Rankine (°R)']] },
    area: { def: 'm2', u: [['mm2', 'Square millimetre (mm²)', 1e-6], ['cm2', 'Square centimetre (cm²)', 1e-4], ['m2', 'Square metre (m²)', 1], ['ha', 'Hectare (ha)', 1e4], ['km2', 'Square kilometre (km²)', 1e6], ['in2', 'Square inch (in²)', 0.00064516], ['ft2', 'Square foot (ft²)', 0.09290304], ['yd2', 'Square yard (yd²)', 0.83612736], ['ac', 'Acre (ac)', 4046.8564224], ['mi2', 'Square mile (mi²)', 2589988.110336]] },
    volume: { def: 'l', u: [['ml', 'Millilitre (mL)', 1e-3], ['l', 'Litre (L)', 1], ['m3', 'Cubic metre (m³)', 1e3], ['tsp', 'Teaspoon (US)', 0.00492892159375], ['tbsp', 'Tablespoon (US)', 0.01478676478125], ['floz', 'Fluid ounce (US)', 0.0295735295625], ['cup', 'Cup (US)', 0.2365882365], ['pt', 'Pint (US)', 0.473176473], ['qt', 'Quart (US)', 0.946352946], ['gal', 'Gallon (US)', 3.785411784], ['ukfloz', 'Fluid ounce (UK)', 0.0284130625], ['ukpt', 'Pint (UK)', 0.56826125], ['ukgal', 'Gallon (UK)', 4.54609], ['in3', 'Cubic inch (in³)', 0.016387064], ['ft3', 'Cubic foot (ft³)', 28.316846592]] },
    speed: { def: 'kmh', u: [['ms', 'Metre per second (m/s)', 1], ['kmh', 'Kilometre per hour (km/h)', 1 / 3.6], ['mph', 'Mile per hour (mph)', 0.44704], ['kn', 'Knot (kn)', 1852 / 3600], ['fts', 'Foot per second (ft/s)', 0.3048]] },
    data: { def: 'mb', u: [['bit', 'Bit (b)', 0.125], ['kbit', 'Kilobit (kb)', 125], ['mbit', 'Megabit (Mb)', 125e3], ['gbit', 'Gigabit (Gb)', 125e6], ['b', 'Byte (B)', 1], ['kb', 'Kilobyte (kB)', 1e3], ['mb', 'Megabyte (MB)', 1e6], ['gb', 'Gigabyte (GB)', 1e9], ['tb', 'Terabyte (TB)', 1e12], ['pb', 'Petabyte (PB)', 1e15], ['kib', 'Kibibyte (KiB)', 1024], ['mib', 'Mebibyte (MiB)', 1024 ** 2], ['gib', 'Gibibyte (GiB)', 1024 ** 3], ['tib', 'Tebibyte (TiB)', 1024 ** 4], ['pib', 'Pebibyte (PiB)', 1024 ** 5]] },
    time: { def: 's', u: [['ns', 'Nanosecond (ns)', 1e-9], ['us', 'Microsecond (µs)', 1e-6], ['ms', 'Millisecond (ms)', 1e-3], ['s', 'Second (s)', 1], ['min', 'Minute (min)', 60], ['h', 'Hour (h)', 3600], ['d', 'Day (d)', 86400], ['wk', 'Week', 604800], ['mo', 'Month (avg)', 2629746], ['yr', 'Year (avg)', 31556952]] }
  };
  const TO_K = { c: (v) => v + 273.15, f: (v) => (v - 32) * 5 / 9 + 273.15, k: (v) => v, r: (v) => v * 5 / 9 };
  const FROM_K = { c: (k) => k - 273.15, f: (k) => (k - 273.15) * 9 / 5 + 32, k: (k) => k, r: (k) => k * 9 / 5 };
  const short = (label) => (label.match(/\(([^)]+)\)$/) || [, label])[1];

  function convert(cat, v, from, to) {
    if (cat === 'temperature') return FROM_K[to](TO_K[from](v));
    const f = (id) => U[cat].u.find((x) => x[0] === id)[2];
    return v * f(from) / f(to);
  }
  function fmt(n, prec, group) {
    if (!Number.isFinite(n)) return '—';
    const a = Math.abs(n);
    if (prec === 'auto') {
      if (a !== 0 && (a >= 1e15 || a < 1e-6)) return n.toExponential(6).replace(/\.?0+e/, 'e');
      return new Intl.NumberFormat('en-US', { maximumSignificantDigits: 10, useGrouping: group }).format(n);
    }
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: +prec, useGrouping: group }).format(n);
  }
  const parseVal = (s) => { const t = String(s).trim().replace(/[,_\s]/g, ''); return t && /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? +t : NaN; };

  function fill(api, cat, keepFrom, keepTo) {
    const { $ } = api, list = U[cat].u;
    $('opt-from').innerHTML = list.map(([id, l]) => `<option value="${id}">${l}</option>`).join('');
    $('opt-to').innerHTML = '<option value="all">All units</option>' + list.map(([id, l]) => `<option value="${id}">${l}</option>`).join('');
    $('opt-from').value = list.some((x) => x[0] === keepFrom) ? keepFrom : U[cat].def;
    $('opt-to').value = keepTo && list.some((x) => x[0] === keepTo) ? keepTo : 'all';
    [...$('opt-from').options].forEach((o) => { o.defaultSelected = o.value === U[cat].def; });
    $('opt-to').options[0].defaultSelected = true;
  }

  mount({
    slug: 'unit-converter', idle: 'Enter a value to begin',
    ready: ({ val }) => { const s = val('value-input').trim(); if (!s) return 'Enter a value to begin'; return Number.isFinite(parseVal(s)) ? true : 'That isn’t a number'; },
    summary: ({ val }) => [val('opt-precision') === 'auto' ? 'Auto precision' : `${val('opt-precision')} decimals`, val('opt-group') ? 'separators' : 'no separators'].join(' · '),
    run: ({ val, pill, $ }) => {
      const cat = pill('seg-cat'), v = parseVal(val('value-input')), from = val('opt-from'), to = val('opt-to');
      const prec = val('opt-precision'), group = val('opt-group');
      const fromU = U[cat].u.find((x) => x[0] === from);
      const kelvin = cat === 'temperature' ? TO_K[from](v) : null;
      const below = kelvin !== null && kelvin < 0;
      const src = `${fmt(v, 'auto', group)} ${short(fromU[1])}`;
      if (to === 'all') {
        $('output-single').hidden = true;
        const rows = U[cat].u.filter((x) => x[0] !== from).map(([id, l]) => [l, fmt(convert(cat, v, from, id), prec, group), short(l)]);
        $('output-list').replaceChildren(...rows.map(([l, n, s]) => {
          const row = document.createElement('div'); row.className = 'web-row unit-row';
          row.innerHTML = '<div class="unit-cell"><span class="unit-name"></span><strong class="unit-val"></strong></div><button type="button" class="web-row-btn" aria-label="Copy"><iconify-icon icon="lucide:copy" width="16" height="16"></iconify-icon></button>';
          row.querySelector('.unit-name').textContent = l; row.querySelector('.unit-val').textContent = `${n} ${s}`;
          row.querySelector('button').setAttribute('aria-label', `Copy ${n} ${s}`);
          row.querySelector('button').addEventListener('click', () => window.Toolity.copyText(n.replace(/,/g, ''), `Copied ${n} ${s}`));
          return row;
        }));
        const text = `${src} =\n` + rows.map(([, n, s]) => `${n} ${s}`).join('\n');
        return { text, ext: 'txt', badge: `${rows.length} units`, note: below ? 'Below absolute zero' : `${src} in ${rows.length} units`, ok: !below };
      }
      $('output-list').replaceChildren(); $('output-single').hidden = false;
      const toU = U[cat].u.find((x) => x[0] === to), r = convert(cat, v, from, to), n = fmt(r, prec, group);
      $('output-value').textContent = `${n} ${short(toU[1])}`;
      const one = cat === 'temperature' ? '' : ` · 1 ${short(fromU[1])} = ${fmt(convert(cat, 1, from, to), 'auto', group)} ${short(toU[1])}`;
      $('output-formula').textContent = `${src} = ${n} ${short(toU[1])}${one}`;
      return { text: n.replace(/,/g, ''), ext: 'txt', copyMsg: `Copied ${n}`, badge: `${short(fromU[1])} → ${short(toU[1])}`, note: below ? 'Below absolute zero' : `${src} = ${n} ${short(toU[1])}`, ok: !below };
    },
    onPill: (g, api) => { if (g.id === 'seg-cat') fill(api, api.pill('seg-cat')); },
    onReset: (api) => fill(api, 'length'),
    filename: () => 'conversion'
  });

  const api = window.ToolityWebTool;
  fill(api, 'length'); api.run();
  api.$('btn-swap').addEventListener('click', () => {
    const from = api.$('opt-from'), to = api.$('opt-to');
    if (to.value === 'all') return api.toast('Pick a To unit first');
    [from.value, to.value] = [to.value, from.value];
    api.run();
  });
})();

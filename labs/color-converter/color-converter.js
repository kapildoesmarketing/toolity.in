/* Designed by Kapil Pidhwani: Color Converter — any CSS colour in, every format out. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const C = window.ToolityColor;
  const modern = (c) => {
    const { h, s, l } = C.rgb2hsl(c), a = c.a < 1 ? ` / ${Math.round(c.a * 100)}%` : '';
    return { rgb: `rgb(${c.r} ${c.g} ${c.b}${a})`, hsl: `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%${a})` };
  };
  function formats(c, o) {
    const m = modern(c);
    return [['HEX', C.toHex(c, o.upper)], ['RGB', o.modern ? m.rgb : C.toRgb(c)], ['HSL', o.modern ? m.hsl : C.toHsl(c)], ['HWB', C.toHwb(c)], ['CMYK', C.toCmyk(c)], ['OKLCH', C.toOklch(c)], ['Luminance', C.luminance(c).toFixed(4)], ['On white / on black', `${C.contrast(c, { r: 255, g: 255, b: 255 }).toFixed(2)}:1 / ${C.contrast(c, { r: 0, g: 0, b: 0 }).toFixed(2)}:1`]];
  }
  const row = ([k, v]) => {
    const tr = document.createElement('tr'); const th = document.createElement('th'); th.textContent = k;
    const td = document.createElement('td'); const wrap = document.createElement('div'); wrap.className = 'cc-val';
    const s = document.createElement('span'); s.textContent = v;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cc-row-copy'; b.title = `Copy ${k}`; b.setAttribute('aria-label', `Copy ${k}`); b.innerHTML = '<iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon>';
    b.addEventListener('click', () => window.Toolity.copyText(v, `${k} copied`));
    wrap.append(s, b); td.append(wrap); tr.append(th, td); return tr;
  };

  mount({
    slug: 'color-converter', idle: 'Enter a colour', filename: () => 'color',
    onInput(el, { $ }) {
      C.syncPair(el);
      if (el.id === 'color-input') { const c = C.parse(el.value); if (c && c.a < 1) $('opt-alpha').value = Math.round(c.a * 100); }
    },
    ready: ({ val }) => (!val('color-input').trim() ? 'Enter a colour' : C.parse(val('color-input')) ? true : 'Not a valid CSS colour'),
    summary: ({ val }) => [val('opt-upper') ? 'Uppercase hex' : 'Lowercase hex', val('opt-modern') && 'modern syntax'].filter(Boolean).join(' · '),
    run({ $, val }) {
      const base = C.parse(val('color-input')), alpha = (parseInt(val('opt-alpha'), 10) || 0) / 100;
      const c = { r: base.r, g: base.g, b: base.b, a: Math.round(alpha * 1000) / 1000 };
      const list = formats(c, { upper: val('opt-upper'), modern: val('opt-modern') });
      $('output-swatch').style.setProperty('--cc-color', C.toRgb(c));
      $('output-table').querySelector('tbody').replaceChildren(...list.map(row));
      const text = list.slice(0, 6).map(([k, v]) => `${k}: ${v}`).join('\n');
      return { text, ext: 'json', mime: 'application/json', badge: C.toHex(c, val('opt-upper')), note: `${C.isLight(c) ? 'Light' : 'Dark'} colour · ${C.toHex(c)}`, ok: true, json: JSON.stringify(Object.fromEntries(list.map(([k, v]) => [k.toLowerCase().replace(/\W+/g, '_'), v])), null, 2) };
    },
    download: (_, { S }) => ({ text: S.out.json, mime: 'application/json', name: 'color.json' }),
    onReset: ({ $ }) => { $('color-pick').value = '#000000'; $('output-swatch').style.removeProperty('--cc-color'); }
  });
})();

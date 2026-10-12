/* Designed by Kapil Pidhwani: Gradient Generator — linear / radial / conic, N stops, CSS·Tailwind·SVG text + PNG export. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const C = window.ToolityColor;
  const $ = (id) => document.getElementById(id);
  const DEFAULTS = [['#f4511e', 0], ['#7c3aed', 100]];
  let n = 0;

  function addStop(color, pos, before) {
    const id = ++n;
    const row = document.createElement('div'); row.className = 'web-row gs-row'; row.dataset.stop = id;
    row.innerHTML = `<input type="color" class="web-color-input" id="stop-c-${id}" value="${color}" aria-label="Stop ${id} colour">
      <input type="text" class="input-clean gs-hex" id="stop-t-${id}" value="${color}" aria-label="Stop ${id} colour value" spellcheck="false" autocomplete="off">
      <input type="number" class="input-clean gs-pos" id="stop-p-${id}" value="${pos}" min="0" max="100" step="1" aria-label="Stop ${id} position %">
      <button type="button" class="web-row-btn" data-remove aria-label="Remove stop"><iconify-icon icon="lucide:x" width="14" height="14"></iconify-icon></button>`;
    before ? $('stops').insertBefore(row, before) : $('stops').append(row);
    return row;
  }
  const rows = () => [...$('stops').querySelectorAll('.gs-row')];
  function stops() {
    return rows().map((r) => { const c = C.parse(r.querySelector('.gs-hex').value) || C.parse(r.querySelector('.web-color-input').value); return { c, pos: C.clamp(parseFloat(r.querySelector('.gs-pos').value) || 0, 0, 100) }; }).filter((s) => s.c).sort((a, b) => a.pos - b.pos);
  }
  const fmt = (c, space) => (space === 'rgb' ? C.toRgb(c) : space === 'hsl' ? C.toHsl(c) : C.toHex(c));

  function cssGradient(type, angle, list, space, repeat) {
    const body = list.map((s) => `${fmt(s.c, space)} ${s.pos}%`).join(', ');
    const head = type === 'linear' ? `${angle}deg, ` : type === 'radial' ? 'circle at center, ' : `from ${angle}deg at 50% 50%, `;
    return `${repeat ? 'repeating-' : ''}${type}-gradient(${head}${body})`;
  }
  function svg(type, angle, list, space) {
    if (type === 'conic') return '<!-- SVG has no conic gradient; use the CSS output or the PNG export. -->';
    const st = list.map((s) => `    <stop offset="${s.pos}%" stop-color="${fmt(s.c, space)}"${s.c.a < 1 ? ` stop-opacity="${s.c.a}"` : ''}/>`).join('\n');
    const a = (angle - 90) * Math.PI / 180, x = Math.cos(a) / 2, y = Math.sin(a) / 2;
    const def = type === 'linear' ? `<linearGradient id="g" x1="${(0.5 - x).toFixed(3)}" y1="${(0.5 - y).toFixed(3)}" x2="${(0.5 + x).toFixed(3)}" y2="${(0.5 + y).toFixed(3)}">` : '<radialGradient id="g" cx="50%" cy="50%" r="70.7%">';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">\n  <defs>\n  ${def}\n${st}\n  </${type}Gradient>\n  </defs>\n  <rect width="1200" height="630" fill="url(#g)"/>\n</svg>`;
  }
  /* PNG: same stops through the canvas gradient engine. Designed by Kapil Pidhwani: repeating-* is not reproduced in PNG. */
  function paint(w, h, type, angle, list) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d');
    let g;
    if (type === 'linear') { const a = angle * Math.PI / 180, len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a)), dx = Math.sin(a) * len / 2, dy = -Math.cos(a) * len / 2; g = x.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy); }
    else if (type === 'radial') g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w / 2, h / 2));
    else g = x.createConicGradient((angle - 90) * Math.PI / 180, w / 2, h / 2);
    list.forEach((s) => g.addColorStop(s.pos / 100, C.toRgb(s.c)));
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  }

  $('stops').addEventListener('click', (e) => { const b = e.target.closest('[data-remove]'); if (!b || rows().length <= 2) return; b.closest('.gs-row').remove(); window.ToolityWebTool.run(); });
  $('stops').addEventListener('input', (e) => {
    const row = e.target.closest('.gs-row'); if (!row) return;
    if (e.target.matches('.web-color-input')) row.querySelector('.gs-hex').value = e.target.value;
    else if (e.target.matches('.gs-hex')) { const c = C.parse(e.target.value); if (c) row.querySelector('.web-color-input').value = C.toHex({ ...c, a: 1 }); }
  });
  $('btn-add-stop').addEventListener('click', () => {
    const list = stops(); const a = list[list.length - 2], b = list[list.length - 1];
    addStop(C.toHex(C.mix(a.c, b.c, 0.5)), Math.round((a.pos + b.pos) / 2), rows()[rows().length - 1]);
    window.ToolityWebTool.run();
  });
  const build = () => { $('stops').replaceChildren(); DEFAULTS.forEach(([c, p]) => addStop(c, p)); };
  build();

  const state = ({ pill, val }) => ({ type: pill('seg-type'), angle: parseInt(val('opt-angle'), 10) || 0, list: stops(), space: val('opt-space'), repeat: val('opt-repeat') });
  mount({
    slug: 'gradient-generator', idle: 'Adjust stops to design', filename: () => 'gradient',
    ready: () => (stops().length >= 2 ? true : 'Add at least two valid colour stops'),
    summary: ({ val }) => [{ css: 'CSS', tailwind: 'Tailwind', svg: 'SVG' }[val('opt-format')], val('opt-space') + ' colours', val('opt-fallback') ? 'fallback' : 'no fallback', val('opt-repeat') && 'repeating'].filter(Boolean).join(' · '),
    run(api) {
      const { type, angle, list, space, repeat } = state(api), format = api.val('opt-format');
      $('angle-group').hidden = type === 'radial';
      rows().forEach((r) => r.querySelector('[data-remove]').disabled = rows().length <= 2);
      const g = cssGradient(type, angle, list, space, repeat);
      api.$('output-preview').style.background = g;
      const text = format === 'tailwind' ? `bg-[${g.replace(/\s+/g, '_')}]` : format === 'svg' ? svg(type, angle, list, space) : `${api.val('opt-fallback') ? `background-color: ${fmt(list[0].c, space)};\n` : ''}background: ${g};`;
      api.$('output-css').textContent = text;
      return { text, ext: format === 'svg' ? 'svg' : format === 'tailwind' ? 'txt' : 'css', mime: format === 'svg' ? 'image/svg+xml' : 'text/plain', badge: `${list.length} stops · ${type}`, note: `${type[0].toUpperCase()}${type.slice(1)} gradient ready`, ok: true };
    },
    async download(fmtKey, api) {
      const { type, angle, list } = state(api);
      const size = { 'png-wide': [1920, 1080], 'png-og': [1200, 630], 'png-square': [1080, 1080] }[fmtKey];
      if (!size) return { text: api.S.out.text, name: `gradient.${api.S.out.ext}` };
      return { blob: await paint(size[0], size[1], type, angle, list), name: `gradient-${size[0]}x${size[1]}.png` };
    },
    onReset: ({ $ }) => { build(); $('output-preview').style.background = ''; }
  });
})();

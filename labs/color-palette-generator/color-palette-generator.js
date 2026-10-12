/* Designed by Kapil Pidhwani: Color Palette Generator — one base colour → HSL harmonies, CSS vars / JSON / PNG. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const C = window.ToolityColor;
  const FIXED = { complementary: 2, split: 3, triadic: 3, tetradic: 4 };
  const fmt = (c, space) => (space === 'rgb' ? C.toRgb(c) : space === 'hsl' ? C.toHsl(c) : C.toHex(c));
  const varName = (prefix, i) => `${(prefix || '--color').trim().replace(/^-*/, '--').replace(/[^\w-]/g, '-')}-${i + 1}`;

  function png(list, space) {
    const w = 200, h = 240, cv = document.createElement('canvas'); cv.width = w * list.length; cv.height = h; const x = cv.getContext('2d');
    list.forEach((c, i) => {
      x.fillStyle = C.toRgb(c); x.fillRect(i * w, 0, w, h);
      x.fillStyle = C.isLight(c) ? '#111' : '#fff'; x.font = '600 18px ui-monospace, SFMono-Regular, Menlo, monospace'; x.textAlign = 'center';
      x.fillText(fmt(c, space), i * w + w / 2, h - 24);
    });
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  }

  mount({
    slug: 'color-palette-generator', idle: 'Enter a base colour', filename: () => 'palette',
    onInput: (el) => C.syncPair(el),
    ready: ({ val }) => (!val('color-input').trim() ? 'Enter a base colour' : C.parse(val('color-input')) ? true : 'Not a valid CSS colour'),
    summary: ({ val, pill }) => `${FIXED[pill('seg-harmony')] || val('opt-count')} colours · ${val('opt-space')} · ${varName(val('opt-prefix'), 0).replace(/-1$/, '')}`,
    run({ $, val, pill, toast }) {
      const base = C.parse(val('color-input')), kind = pill('seg-harmony'), space = val('opt-space'), n = parseInt(val('opt-count'), 10) || 5;
      const list = C.harmony(base, kind, FIXED[kind] || n);
      $('opt-count').disabled = !!FIXED[kind];
      $('output-swatches').replaceChildren(...list.map((c, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'web-swatch'; b.setAttribute('role', 'listitem'); b.title = 'Copy ' + fmt(c, space);
        const chip = document.createElement('div'); chip.className = 'web-swatch-chip'; chip.style.background = C.toRgb(c);
        const lab = document.createElement('div'); lab.className = 'web-swatch-label'; lab.textContent = fmt(c, space);
        b.append(chip, lab); b.addEventListener('click', () => window.Toolity.copyText(fmt(c, space), `${fmt(c, space)} copied`));
        return b;
      }));
      const css = `:root {\n${list.map((c, i) => `  ${varName(val('opt-prefix'), i)}: ${fmt(c, space)};`).join('\n')}\n}`;
      $('output-css').textContent = css;
      return { text: css, ext: 'css', badge: `${list.length} colours`, note: `${kind[0].toUpperCase()}${kind.slice(1)} palette`, ok: true, list, space };
    },
    async download(kind, { S, val }) {
      const { list, space } = S.out;
      if (kind === 'json') return { text: JSON.stringify({ base: val('color-input').trim(), harmony: S.out.note, colors: list.map((c) => ({ hex: C.toHex(c), rgb: C.toRgb(c), hsl: C.toHsl(c) })) }, null, 2), mime: 'application/json', name: 'palette.json' };
      if (kind === 'png') return { blob: await png(list, space), name: 'palette.png' };
      return { text: S.out.text, name: 'palette.css' };
    },
    onReset: ({ $ }) => { $('color-pick').value = '#000000'; $('opt-count').disabled = false; }
  });
})();

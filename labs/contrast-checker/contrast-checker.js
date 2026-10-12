/* Designed by Kapil Pidhwani: Contrast Checker — WCAG 2.x ratio with alpha compositing and a nearest-passing fix. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const C = window.ToolityColor;
  const WHITE = { r: 255, g: 255, b: 255, a: 1 };
  const over = (c, bg) => (c.a >= 1 ? c : { r: Math.round(c.r * c.a + bg.r * (1 - c.a)), g: Math.round(c.g * c.a + bg.g * (1 - c.a)), b: Math.round(c.b * c.a + bg.b * (1 - c.a)), a: 1 });
  const grade = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA Large' : 'Fail');

  /* Nudge lightness of `move` away from `fixed` until target ratio met; returns rgb or null when impossible. */
  function fix(move, fixed, target) {
    const { h, s, l } = C.rgb2hsl(move), dir = C.luminance(fixed) > 0.18 ? -1 : 1;
    for (let L = l; L >= 0 && L <= 100; L += dir) { const c = C.hsl2rgb(h, s, L); if (C.contrast(c, fixed) >= target) return c; }
    for (let L = l; L >= 0 && L <= 100; L -= dir) { const c = C.hsl2rgb(h, s, L); if (C.contrast(c, fixed) >= target) return c; }
    return null;
  }
  const cell = (label, need, r) => { const d = document.createElement('div'); d.className = 'web-stat'; const s = document.createElement('span'); s.textContent = `${label} · ${need}:1`; const b = document.createElement('strong'); b.className = 'web-tag ' + (r >= need ? 'pass' : 'fail'); b.textContent = r >= need ? 'Pass' : 'Fail'; d.append(s, b); return d; };

  mount({
    slug: 'contrast-checker', idle: 'Enter two colours', filename: () => 'contrast-report',
    onInput: (el) => C.syncPair(el),
    ready: ({ val }) => { const f = val('fg-input').trim(), b = val('bg-input').trim(); if (!f || !b) return 'Enter two colours'; return C.parse(f) && C.parse(b) ? true : 'Not a valid CSS colour'; },
    summary: ({ val }) => `Fix targets ${val('opt-target')}:1 on ${val('opt-fix-side') === 'bg' ? 'background' : 'text'}`,
    run({ $, val }) {
      const bg = over(C.parse(val('bg-input')), WHITE), fg = over(C.parse(val('fg-input')), bg);
      const r = C.contrast(fg, bg), rr = Math.round(r * 100) / 100;
      const sample = $('output-sample'); sample.style.background = C.toRgb(bg); sample.style.color = C.toRgb(fg);
      $('sample-ui').style.borderColor = C.toRgb(fg);
      $('output-ratio').textContent = `${rr.toFixed(2)}:1`;
      const g = $('output-grade'); g.textContent = grade(r); g.className = 'web-tag ' + (r >= 4.5 ? 'pass' : r >= 3 ? 'warn' : 'fail');
      $('output-grid').replaceChildren(cell('AA normal text', 4.5, r), cell('AA large text', 3, r), cell('AAA normal text', 7, r), cell('AAA large text', 4.5, r), cell('UI components', 3, r));
      const target = parseFloat(val('opt-target')), side = val('opt-fix-side'), box = $('output-fix');
      box.hidden = r >= target;
      if (r < target) {
        const moved = side === 'bg' ? fix(bg, fg, target) : fix(fg, bg, target);
        box.replaceChildren();
        const t = document.createElement('span'); box.append(t);
        if (!moved) t.textContent = `No ${side === 'bg' ? 'background' : 'text'} lightness reaches ${target}:1 against this colour — try adjusting the other one.`;
        else {
          const nr = (side === 'bg' ? C.contrast(fg, moved) : C.contrast(moved, bg)).toFixed(2);
          t.textContent = `Suggested ${side === 'bg' ? 'background' : 'text'} colour ${C.toHex(moved)} → ${nr}:1`;
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-toolbar-sm'; b.textContent = 'Use this';
          b.addEventListener('click', () => { const inp = $(side === 'bg' ? 'bg-input' : 'fg-input'); inp.value = C.toHex(moved); C.syncPair(inp); window.ToolityWebTool.run(); });
          const chip = document.createElement('span'); chip.className = 'web-swatch-chip cc-fix-chip'; chip.style.background = C.toHex(moved);
          box.append(chip, b);
        }
      }
      const text = `Text ${C.toHex(fg)} on ${C.toHex(bg)}\nContrast ${rr.toFixed(2)}:1 — ${grade(r)}\nAA normal (4.5): ${r >= 4.5 ? 'pass' : 'fail'}\nAA large / UI (3): ${r >= 3 ? 'pass' : 'fail'}\nAAA normal (7): ${r >= 7 ? 'pass' : 'fail'}\nAAA large (4.5): ${r >= 4.5 ? 'pass' : 'fail'}`;
      return { text, ext: 'txt', badge: grade(r), note: `${rr.toFixed(2)}:1 · ${grade(r)}`, ok: r >= 4.5 };
    },
    onReset: ({ $ }) => { ['fg-pick', 'bg-pick'].forEach((id) => { $(id).value = '#000000'; }); const s = $('output-sample'); s.style.background = ''; s.style.color = ''; }
  });
  document.getElementById('btn-swap').addEventListener('click', () => {
    const f = document.getElementById('fg-input'), b = document.getElementById('bg-input');
    [f.value, b.value] = [b.value, f.value]; C.syncPair(f); C.syncPair(b); window.ToolityWebTool.run();
  });
})();

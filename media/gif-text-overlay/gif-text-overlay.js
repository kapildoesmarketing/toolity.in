/* GIF Text Overlay — Toolity.in. Outlined, wrapped caption drawn on a frame range; live preview + encode share draw(). Via /scripts/gif-common.js. */
(function () {
  'use strict';
  const G = window.ToolityGif, $ = (id) => document.getElementById(id);
  const pv = $('preview-canvas'), pctx = pv.getContext('2d');
  let R;
  const FONTS = { impact: 'Impact, "Arial Black", sans-serif', sans: 'Inter, system-ui, sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, Menlo, monospace' };
  const o = () => ({ text: $('opt-text').value.trim(), pos: $('opt-pos').value, size: Number($('opt-size').value), color: $('opt-color').value, outline: $('opt-outline').value, font: FONTS[$('opt-font').value] });
  function wrap(ctx, text, maxW) {
    const lines = []; for (const para of text.split(/\n/)) { let line = ''; for (const word of para.split(/\s+/)) { const t = line ? `${line} ${word}` : word; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = word; } else line = t; } lines.push(line); }
    return lines;
  }
  function draw(ctx, frame, w, h) {
    ctx.drawImage(frame, 0, 0, w, h);
    const c = o(); if (!c.text) return;
    const px = Math.max(8, Math.round((h * c.size) / 100)), m = Math.round(Math.min(w, h) * 0.04);
    ctx.save(); ctx.font = `700 ${px}px ${c.font}`; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
    const lines = wrap(ctx, c.text, w - 2 * m), lh = px * 1.15, bh = lines.length * lh;
    const y0 = c.pos[0] === 't' ? m : c.pos[0] === 'm' ? (h - bh) / 2 : h - bh - m;
    ctx.textAlign = c.pos[1] === 'l' ? 'left' : c.pos[1] === 'c' ? 'center' : 'right';
    const x = c.pos[1] === 'l' ? m : c.pos[1] === 'c' ? w / 2 : w - m;
    lines.forEach((ln, i) => {
      if (c.outline !== 'none') { ctx.strokeStyle = c.outline === 'dark' ? '#000' : '#fff'; ctx.lineWidth = Math.max(2, px / 8); ctx.strokeText(ln, x, y0 + i * lh); }
      ctx.fillStyle = c.color; ctx.fillText(ln, x, y0 + i * lh);
    });
    ctx.restore();
  }
  function preview() {
    const S = T.S; if (!S.file) return; T.outImg.classList.remove('is-shown');
    const f = S.frames[R.from]; if (pv.width !== S.w || pv.height !== S.h) { pv.width = S.w; pv.height = S.h; }
    draw(pctx, f.c, S.w, S.h); pv.classList.add('is-shown'); $('output-empty').hidden = true;
  }
  const T = G.mount({
    actionLabel: 'Apply text', suffix: 'captioned',
    onLoad: (S) => { R.reset(S.frames.length); preview(); },
    onSetting: (el) => { if (el.id === 'opt-size') $('opt-size-val').textContent = `${el.value}%`; preview(); },
    onReset: () => { R.reset(0); pv.classList.remove('is-shown'); $('opt-size-val').textContent = '10%'; },
    summary: (S) => { const c = o(); return `${c.text ? `“${c.text.slice(0, 18)}${c.text.length > 18 ? '…' : ''}”` : 'No text yet'} · ${$('opt-pos').selectedOptions[0].textContent} · ${c.size}%${S.file && R && (R.from > 0 || R.to < S.frames.length - 1) ? ` · frames #${R.from + 1}–#${R.to + 1}` : ''}`; },
    validate: () => (o().text ? '' : 'Type the caption text in Settings.'),
    run: async (S, api) => {
      const frames = S.frames.map((f, i) => { if (i < R.from || i > R.to) return f; const c = G.mk(S.w, S.h); draw(c.getContext('2d'), f.c, S.w, S.h); return { c, ms: f.ms }; });
      return { blob: await G.encode(frames, { onProgress: api.onProgress }), w: S.w, h: S.h, n: frames.length };
    },
    present: (r, S, setOutput) => { setOutput(r.blob, r.w, r.h, `${r.w} × ${r.h} · ${r.n} frames · ${window.Toolity.formatBytes(r.blob.size)}`); T.outImg.src = S.outUrl; T.outImg.classList.add('is-shown'); pv.classList.remove('is-shown'); }
  });
  R = G.bindFrameRange(() => T.S.frames, () => { preview(); T.sync(); });
  window.__gx = { T, R, draw, o };
})();

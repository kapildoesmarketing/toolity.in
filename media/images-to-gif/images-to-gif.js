/* Images to GIF — Toolity.in. Ordered image list → frames (fit to first/largest), one delay, gifenc via /scripts/gif-common.js. All on-device. */
(function () {
  'use strict';
  const G = window.ToolityGif, { formatBytes, toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const list = $('clip-list');
  let items = [];
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const delay = () => Number($('opt-delay').value), fit = () => $('opt-fit').value, maxW = () => Number($('opt-size').value);
  function paint(S) {
    list.hidden = !items.length;
    list.innerHTML = items.map((it, i) => `<li class="pdf-file" data-i="${i}"><img class="gft-thumb" alt="" width="40" height="30"><span class="pdf-file-name" title="${esc(it.file.name)}">${esc(it.file.name)}</span><span class="pdf-file-meta">${it.img.naturalWidth}×${it.img.naturalHeight}</span>
      <button type="button" class="btn-toolbar-sm" data-act="up" aria-label="Move up"${i === 0 ? ' disabled' : ''}><iconify-icon icon="lucide:chevron-up" width="14" height="14"></iconify-icon></button>
      <button type="button" class="btn-toolbar-sm" data-act="down" aria-label="Move down"${i === items.length - 1 ? ' disabled' : ''}><iconify-icon icon="lucide:chevron-down" width="14" height="14"></iconify-icon></button>
      <button type="button" class="btn-toolbar-sm" data-act="x" aria-label="Remove"><iconify-icon icon="lucide:x" width="14" height="14"></iconify-icon></button></li>`).join('');
    list.querySelectorAll('.gft-thumb').forEach((im, i) => { im.src = items[i].img.src; });
    S.file = items[0] ? items[0].file : null;
    $('source-badge').textContent = items.length ? `${items.length} image${items.length > 1 ? 's' : ''} · ${formatBytes(items.reduce((s, it) => s + it.file.size, 0))}` : 'No file loaded';
    $('btn-compress').disabled = items.length < 2 || S.busy; $('result-badge').textContent = items.length < 2 ? 'Add two or more images' : `Ready · ${((items.length * delay()) / 1000).toFixed(1)} s`;
    T.sync();
  }
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const i = Number(b.closest('li').dataset.i), act = b.dataset.act;
    if (act === 'x') { const [it] = items.splice(i, 1); URL.revokeObjectURL(it.img.src); }
    else { const j = act === 'up' ? i - 1 : i + 1; [items[i], items[j]] = [items[j], items[i]]; }
    paint(T.S);
  });
  async function onFiles(files, S) {
    T.showError('');
    for (const file of files) { try { items.push({ file, img: await G.loadImage(file) }); } catch (err) { toast(err.message); } }
    paint(S);
  }
  function target() {
    const base = fit() === 'largest' ? items.reduce((a, b) => (b.img.naturalWidth * b.img.naturalHeight > a.img.naturalWidth * a.img.naturalHeight ? b : a)) : items[0];
    let w = base.img.naturalWidth, h = base.img.naturalHeight;
    if (maxW() && w > maxW()) { h = Math.round(h * maxW() / w); w = maxW(); }
    return [w, h];
  }
  const T = G.mount({
    actionLabel: 'Make GIF', suffix: 'animated', multiple: true, accept: 'image/', onFiles,
    onReset: () => { items.forEach((it) => URL.revokeObjectURL(it.img.src)); items = []; list.hidden = true; list.innerHTML = ''; },
    summary: () => `${delay() >= 1000 ? `${delay() / 1000} s` : `${delay()} ms`} per frame · ${{ first: 'Fit to first', cover: 'Fill to first', largest: 'Fit to largest' }[fit()]}${maxW() ? ` · ≤${maxW()} px` : ''} · ${{ 0: 'Loop forever', 1: 'Play once', 3: '3 times' }[$('opt-repeat').value]}`,
    onSetting: (el, S) => { if (items.length) paint(S); },
    validate: () => (items.length < 2 ? 'Add at least two images.' : ''),
    run: async (S, api) => {
      const [w, h] = target(), cover = fit() === 'cover';
      const frames = items.map((it) => {
        const c = G.mk(w, h), ctx = c.getContext('2d'), iw = it.img.naturalWidth, ih = it.img.naturalHeight, k = cover ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
        ctx.drawImage(it.img, (w - iw * k) / 2, (h - ih * k) / 2, iw * k, ih * k); return { c, ms: delay() };
      });
      const r = Number($('opt-repeat').value);
      return { blob: await G.encode(frames, { repeat: r === 0 ? 0 : r === 1 ? -1 : r - 1, onProgress: api.onProgress }), w, h, n: frames.length };
    }
  });
  window.__gi = { T, items: () => items, onFiles, target };
})();

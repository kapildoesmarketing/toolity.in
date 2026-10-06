/* GIF Splitter — Toolity.in. Equal parts / every N frames / at a frame → one GIF per part (original delays), thumbnails + ZIP. All on-device. */
(function () {
  'use strict';
  const G = window.ToolityGif, { downloadBlob, formatBytes, copyText } = window.Toolity, $ = (id) => document.getElementById(id);
  const grid = $('frames-grid');
  let R, urls = [];
  const mode = () => $('opt-mode').value, n = () => Math.max(2, Number($('opt-n').value) || 2);
  function ranges(S) {
    const N = S.frames.length, out = [];
    if (mode() === 'at') return R.from <= 0 || R.from >= N ? [[0, N]] : [[0, R.from], [R.from, N]];
    const size = mode() === 'every' ? n() : Math.ceil(N / Math.min(n(), N));
    for (let i = 0; i < N; i += size) out.push([i, Math.min(N, i + size)]);
    return out;
  }
  const pname = (S, i) => `${G.stem(S.file.name)}-part${String(i + 1).padStart(2, '0')}.gif`;
  const clear = () => { urls.forEach(URL.revokeObjectURL); urls = []; grid.textContent = ''; grid.hidden = true; };
  const T = G.mount({
    actionLabel: 'Split GIF', verb: 'Splitting', suffix: 'parts', outExt: () => 'zip',
    onLoad: (S) => { R.reset(S.frames.length); R.paintFrame(0); },
    onReset: () => { R.reset(0); clear(); },
    onSetting: () => { $('opt-n').closest('.control-item').hidden = mode() === 'at'; },
    summary: (S) => `${mode() === 'parts' ? `${n()} equal parts` : mode() === 'every' ? `Every ${n()} frames` : `Cut at frame #${R ? R.from + 1 : 1}`}${S.file ? ` · ${ranges(S).length} GIFs` : ''}`,
    copy: (S) => copyText(`${S.file.name}: ${urls.length} parts · ZIP ${formatBytes(S.out.size)}`, 'Summary copied'),
    validate: (S) => (ranges(S).length < 2 ? 'That split would leave a single part — pick a different cut.' : ''),
    async run(S, api) {
      if (!window.JSZip) throw new Error('ZIP library is still loading — try again in a second.');
      clear();
      const rs = ranges(S), parts = [], zip = new JSZip();
      for (let i = 0; i < rs.length; i++) {
        const frames = S.frames.slice(rs[i][0], rs[i][1]);
        const blob = await G.encode(frames, { onProgress: (p) => api.onProgress((i + p) / rs.length) });
        parts.push({ blob, n: frames.length, ms: frames.reduce((s, f) => s + f.ms, 0) }); zip.file(pname(S, i), blob);
      }
      return { parts, blob: await zip.generateAsync({ type: 'blob', compression: 'STORE' }) };
    },
    present: (r, S, setOutput) => {
      setOutput(r.blob, S.w, S.h, `${r.parts.length} GIFs · ZIP ${formatBytes(r.blob.size)}`);
      r.parts.forEach((p, i) => {
        const url = URL.createObjectURL(p.blob); urls.push(url);
        const fig = document.createElement('figure'); fig.className = 'vdt-thumb'; fig.tabIndex = 0; fig.title = `Download ${pname(S, i)}`;
        fig.innerHTML = `<img alt="Part ${i + 1}" width="${S.w}" height="${S.h}"><figcaption>Part ${i + 1} · ${p.n} fr · ${(p.ms / 1000).toFixed(1)} s</figcaption>`; fig.querySelector('img').src = url;
        const dl = () => downloadBlob(p.blob, pname(S, i));
        fig.addEventListener('click', dl); fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dl(); } });
        grid.appendChild(fig);
      });
      grid.hidden = false;
    }
  });
  R = G.bindFrameRange(() => T.S.frames, () => T.sync());
  window.__gs = { T, R, ranges };
})();

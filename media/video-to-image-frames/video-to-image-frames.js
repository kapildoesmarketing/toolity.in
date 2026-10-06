/* Video to Image Frames — Toolity.in. Seek-and-grab stills at an interval (or every frame, max 300) → thumbnails + ZIP via JSZip. All on-device. */
(function () {
  'use strict';
  const V = window.ToolityVideo, { downloadBlob, formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  const MAX = 300, grid = $('frames-grid');
  let R, urls = [];
  const step = () => ($('opt-step').value === 'frame' ? 1 / 30 : Number($('opt-step').value)), type = () => $('opt-format').value, res = () => Number($('opt-res').value);
  const count = () => Math.min(MAX, Math.max(0, Math.ceil((R.to - R.from) / step() - 1e-6)));
  const stamp = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}m${(t % 60).toFixed(1).padStart(4, '0')}s`;
  const name = (S, t) => `${V.stem(S.file.name)}-${stamp(t)}.${type() === 'png' ? 'png' : 'jpg'}`;
  const clear = () => { urls.forEach(URL.revokeObjectURL); urls = []; grid.textContent = ''; grid.hidden = true; };
  const T = V.mount({
    actionLabel: 'Capture frames', verb: 'Capturing', suffix: 'frames', outExt: () => 'zip',
    onLoad: (S) => R.reset(S.dur),
    onReset: () => { R.reset(0); clear(); },
    summary: (S) => `${$('opt-step').selectedOptions[0].textContent} · ${type() === 'png' ? 'PNG' : 'JPG'} · ${res() ? res() + 'p' : 'Original size'}${S.file ? ` · ${count()} frame${count() === 1 ? '' : 's'}` : ''}`,
    copyText: (S) => `${S.file.name}: ${urls.length} frames (${type().toUpperCase()}) · ZIP ${formatBytes(S.out.size)}`,
    validate: () => (count() < 1 ? 'Select a longer range or a smaller interval.' : ''),
    async run(S, api) {
      if (!window.JSZip) throw new Error('ZIP library is still loading — try again in a second.');
      clear();
      const [w, h] = V.fitBox(S.w, S.h, res());
      const frames = await V.extractFrames(api.src, { from: R.from, to: R.to, step: step(), max: MAX, w, h, type: `image/${type()}`, stop: api.stop, onProgress: (p) => api.progress(p * 0.9, `Capturing ${Math.round(p * 100)}%`) });
      api.progress(0.95, 'Zipping…');
      const zip = new JSZip(); frames.forEach((f) => zip.file(name(S, f.t), f.blob));
      return { frames, w, h, blob: await zip.generateAsync({ type: 'blob', compression: 'STORE' }) };
    },
    present: (r, S, setOutput) => {
      setOutput(r.blob, r.w, r.h, `${r.frames.length} × ${r.w} × ${r.h} · ZIP ${formatBytes(r.blob.size)}`);
      r.frames.forEach((f) => {
        const url = URL.createObjectURL(f.blob); urls.push(url);
        const fig = document.createElement('figure'); fig.className = 'vdt-thumb'; fig.tabIndex = 0; fig.title = `Download ${name(S, f.t)}`;
        fig.innerHTML = `<img alt="Frame at ${stamp(f.t)}" width="${r.w}" height="${r.h}"><figcaption>${stamp(f.t)}</figcaption>`;
        fig.querySelector('img').src = url;
        const dl = () => downloadBlob(f.blob, name(S, f.t));
        fig.addEventListener('click', dl); fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dl(); } });
        grid.appendChild(fig);
      });
      grid.hidden = false;
    }
  });
  R = V.bindRange(T.src, () => T.sync());
  window.__vf = { T, R, count };
})();

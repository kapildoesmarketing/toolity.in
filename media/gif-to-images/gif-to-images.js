/* GIF to Images — Toolity.in. Every (Nth) composed frame → PNG/JPG, thumbnails + ZIP via JSZip. Decoding via /scripts/gif-common.js. All on-device. */
(function () {
  'use strict';
  const G = window.ToolityGif, { downloadBlob, formatBytes, copyText } = window.Toolity, $ = (id) => document.getElementById(id);
  const grid = $('frames-grid');
  let urls = [];
  const every = () => Number($('opt-every').value), fmt = () => $('opt-format').value, ext = () => (fmt() === 'png' ? 'png' : 'jpg');
  const name = (S, i) => `${G.stem(S.file.name)}-${String(i + 1).padStart(3, '0')}.${ext()}`;
  const clear = () => { urls.forEach(URL.revokeObjectURL); urls = []; grid.textContent = ''; grid.hidden = true; };
  const T = G.mount({
    actionLabel: 'Extract frames', verb: 'Extracting', suffix: 'frames', outExt: () => 'zip',
    onReset: clear,
    summary: (S) => `${$('opt-every').selectedOptions[0].textContent} · ${ext().toUpperCase()}${S.file ? ` · ${Math.ceil(S.frames.length / every())} images` : ''}`,
    copy: (S) => copyText(`${S.file.name}: ${urls.length} frames (${ext().toUpperCase()}) · ZIP ${formatBytes(S.out.size)}`, 'Summary copied'),
    async run(S, api) {
      if (!window.JSZip) throw new Error('ZIP library is still loading — try again in a second.');
      clear();
      const picked = S.frames.filter((_, i) => i % every() === 0), out = [], zip = new JSZip();
      for (let i = 0; i < picked.length; i++) {
        let c = picked[i].c;
        if (fmt() === 'jpeg') { const j = G.mk(c.width, c.height), x = j.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0); c = j; }
        const blob = await new Promise((r) => c.toBlob(r, `image/${fmt()}`, 0.92));
        out.push({ i: S.frames.indexOf(picked[i]), blob }); zip.file(name(S, out[i].i), blob); api.onProgress((i + 1) / picked.length);
      }
      return { frames: out, blob: await zip.generateAsync({ type: 'blob', compression: 'STORE' }) };
    },
    present: (r, S, setOutput) => {
      setOutput(r.blob, S.w, S.h, `${r.frames.length} × ${S.w} × ${S.h} · ZIP ${formatBytes(r.blob.size)}`);
      r.frames.forEach((f) => {
        const url = URL.createObjectURL(f.blob); urls.push(url);
        const fig = document.createElement('figure'); fig.className = 'vdt-thumb'; fig.tabIndex = 0; fig.title = `Download ${name(S, f.i)}`;
        fig.innerHTML = `<img alt="Frame ${f.i + 1}" width="${S.w}" height="${S.h}"><figcaption>#${f.i + 1}</figcaption>`; fig.querySelector('img').src = url;
        const dl = () => downloadBlob(f.blob, name(S, f.i));
        fig.addEventListener('click', dl); fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dl(); } });
        grid.appendChild(fig);
      });
      grid.hidden = false;
    }
  });
  window.__g2i = { T };
})();

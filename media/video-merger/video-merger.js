/* Video Merger — Toolity.in. N clips → hidden <video> elements played back to back into one MediaRecorder (letterbox/fill to the first clip). All on-device. */
(function () {
  'use strict';
  const V = window.ToolityVideo, { formatTime, formatBytes, toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const list = $('clip-list'), stage = $('clip-stage');
  let clips = [];
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function paint(S) {
    list.hidden = !clips.length;
    list.innerHTML = clips.map((c, i) => `<li class="pdf-file" data-i="${i}"><span class="vdm-idx">${i + 1}</span><span class="pdf-file-name" title="${esc(c.file.name)}">${esc(c.file.name)}</span><span class="pdf-file-meta">${formatTime(c.dur)} · ${c.w}×${c.h}</span>
      <button type="button" class="btn-toolbar-sm" data-act="up" aria-label="Move up"${i === 0 ? ' disabled' : ''}><iconify-icon icon="lucide:chevron-up" width="14" height="14"></iconify-icon></button>
      <button type="button" class="btn-toolbar-sm" data-act="down" aria-label="Move down"${i === clips.length - 1 ? ' disabled' : ''}><iconify-icon icon="lucide:chevron-down" width="14" height="14"></iconify-icon></button>
      <button type="button" class="btn-toolbar-sm" data-act="x" aria-label="Remove"><iconify-icon icon="lucide:x" width="14" height="14"></iconify-icon></button></li>`).join('');
    const total = clips.reduce((s, c) => s + c.dur, 0);
    S.file = clips[0] ? clips[0].file : null; S.dur = total;
    $('source-badge').textContent = clips.length ? `${clips.length} clip${clips.length > 1 ? 's' : ''} · ${formatTime(total)} · ${formatBytes(clips.reduce((s, c) => s + c.file.size, 0))}` : 'No file loaded';
    $('btn-compress').disabled = clips.length < 2 || S.busy; $('result-badge').textContent = clips.length < 2 ? 'Add two or more clips' : `Ready · output ${clips[0].w} × ${clips[0].h}`;
    T.sync();
  }
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const i = Number(b.closest('li').dataset.i), act = b.dataset.act;
    if (act === 'x') { const [c] = clips.splice(i, 1); URL.revokeObjectURL(c.video.src); c.video.remove(); }
    else { const j = act === 'up' ? i - 1 : i + 1; [clips[i], clips[j]] = [clips[j], clips[i]]; }
    paint(T.S);
  });
  async function onFiles(files, S) {
    T.showError('');
    for (const file of files) {
      const video = document.createElement('video'); video.playsInline = true; video.preload = 'auto'; stage.appendChild(video);
      try { const info = await V.load(video, file); clips.push({ file, video, ...info }); }
      catch (err) { video.remove(); toast(`${file.name}: ${err.message}`); }
    }
    paint(S);
  }
  const T = V.mount({
    actionLabel: 'Merge videos', verb: 'Merging', suffix: 'merged', multiple: true, onFiles,
    onReset: () => { clips.forEach((c) => { URL.revokeObjectURL(c.video.src); c.video.remove(); }); clips = []; list.hidden = true; list.innerHTML = ''; },
    summary: () => `${$('opt-fit').value === 'cover' ? 'Fill' : 'Letterbox'} · ${$('opt-audio').value === 'keep' ? 'Keep audio' : 'Remove audio'}`,
    validate: () => (clips.length < 2 ? 'Add at least two clips to merge.' : ''),
    run: (S, api) => {
      const w = clips[0].w, h = clips[0].h, cover = $('opt-fit').value === 'cover';
      const draw = (ctx, v) => {
        const vw = v.videoWidth, vh = v.videoHeight, k = cover ? Math.max(w / vw, h / vh) : Math.min(w / vw, h / vh), dw = vw * k, dh = vh * k;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
      };
      return V.render({ w, h, segments: clips.map((c) => ({ video: c.video, from: 0, to: c.dur })), draw, audio: $('opt-audio').value === 'keep', onProgress: api.onProgress, stop: api.stop });
    }
  });
  window.__vm = { T, clips: () => clips, onFiles };
})();

/* Audio Merger — Toolity.in. Decode N files → match rate/channels to the first → concat with optional gap, via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, { formatTime, formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const items = [], list = $('file-list');
  const total = () => items.reduce((s, it) => s + it.buf.duration, 0) + Math.max(0, items.length - 1) * Number($('opt-gap').value);
  function paint(S) {
    list.innerHTML = items.map((it, i) => `<li class="pdf-file" data-i="${i}"><span class="pdf-file-name" title="${esc(it.file.name)}">${esc(it.file.name)}</span><span class="pdf-file-meta">${formatTime(it.buf.duration)}</span>
      <button type="button" class="btn-toolbar-sm" data-act="up" aria-label="Move up"${i === 0 ? ' disabled' : ''}><iconify-icon icon="lucide:chevron-up" width="14" height="14"></iconify-icon></button>
      <button type="button" class="btn-toolbar-sm" data-act="down" aria-label="Move down"${i === items.length - 1 ? ' disabled' : ''}><iconify-icon icon="lucide:chevron-down" width="14" height="14"></iconify-icon></button>
      <button type="button" class="btn-toolbar-sm" data-act="x" aria-label="Remove"><iconify-icon icon="lucide:x" width="14" height="14"></iconify-icon></button></li>`).join('');
    const has = items.length > 0;
    $('source-wrap').hidden = !has; $('dropzone').hidden = has; $('btn-compress').disabled = items.length < 2;
    S.file = has ? items[0].file : null;
    $('source-badge').textContent = has ? `${items.length} file${items.length > 1 ? 's' : ''} · ${formatTime(total())} · ${formatBytes(items.reduce((s, it) => s + it.file.size, 0))}` : 'No file loaded';
    $('result-badge').textContent = items.length >= 2 ? 'Ready' : has ? 'Add at least one more file' : 'Drop two or more files';
  }
  async function add(files, S) {
    T.showError(''); $('source-badge').textContent = 'Decoding…';
    for (const file of files) {
      if (file.size > A.MAX_FILE) { T.showError(`${file.name} is over 200 MB and was skipped.`); continue; }
      try { items.push({ file, buf: await A.decode(file) }); } catch (e) { console.warn(e); T.showError(`Couldn't decode ${file.name} — skipped.`); }
    }
    paint(S);
  }
  const T = A.mount({
    actionLabel: 'Merge audio', verb: 'Merging', suffix: 'merged', multiple: true,
    summary: () => `${A.fmtLabel($('opt-out').value)} · ${Number($('opt-gap').value) ? `${$('opt-gap').value} s gap` : 'No gap'}`,
    fmtRange: (el) => `${el.value} s`,
    onFiles: add,
    onSetting: (el, S) => { if (el.id === 'opt-gap' && items.length) paint(S); },
    validate: () => (items.length < 2 ? 'Add at least two files to merge.' : ''),
    onReset: () => { items.length = 0; list.innerHTML = ''; },
    run: async (S, api) => {
      const first = items[0].buf, bufs = [];
      for (let i = 0; i < items.length; i++) { api.onProgress(i / items.length, 'Matching'); bufs.push(await A.resampleTo(items[i].buf, first.sampleRate, first.numberOfChannels)); }
      return { buf: A.concat(bufs, Number($('opt-gap').value)), note: `Merged ${items.length} files` };
    }
  });
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]'); if (!btn) return;
    const i = Number(btn.closest('li').dataset.i), act = btn.dataset.act;
    if (act === 'x') items.splice(i, 1); else { const j = act === 'up' ? i - 1 : i + 1; [items[i], items[j]] = [items[j], items[i]]; }
    paint(T.S);
  });
  $('btn-add-more').addEventListener('click', () => $('file-input-more').click());
  $('file-input-more').addEventListener('change', (e) => { add([...e.target.files], T.S); e.target.value = ''; });
  window.__am = { T, items, add };
})();

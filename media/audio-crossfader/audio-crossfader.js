/* Audio Crossfader — Toolity.in. Two tracks, overlap of N seconds with equal-power / linear / S-curve gain laws.
 * Rate matched by decode, channels matched to the wider file. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, { formatTime, formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const items = [], list = $('file-list');
  const CURVES = { // [fade-out gain, fade-in gain] at t ∈ [0, 1]
    equal: (t) => [Math.cos((t * Math.PI) / 2), Math.sin((t * Math.PI) / 2)],
    linear: (t) => [1 - t, t],
    scurve: (t) => { const s = t * t * (3 - 2 * t), k = s * s * (3 - 2 * s); return [Math.cos((k * Math.PI) / 2), Math.sin((k * Math.PI) / 2)]; }
  };
  const dur = () => Number($('opt-dur').value);
  function paint(S) {
    list.innerHTML = items.map((it, i) => `<li class="pdf-file"><span class="pdf-file-name" title="${esc(it.file.name)}">${i === 0 ? 'Out · ' : 'In · '}${esc(it.file.name)}</span><span class="pdf-file-meta">${formatTime(it.buf.duration)}</span></li>`).join('');
    const has = items.length > 0;
    $('source-wrap').hidden = !has; $('dropzone').hidden = has; $('btn-compress').disabled = items.length < 2; $('btn-swap').disabled = items.length < 2;
    S.file = has ? items[0].file : null;
    $('source-badge').textContent = has ? `${items.length} file${items.length > 1 ? 's' : ''} · ${formatBytes(items.reduce((s, it) => s + it.file.size, 0))}` : 'No file loaded';
    $('result-badge').textContent = items.length >= 2 ? 'Ready' : has ? 'Add a second file' : 'Drop two audio files';
  }
  async function add(files, S) {
    T.showError(''); $('source-badge').textContent = 'Decoding…';
    for (const file of files) {
      if (items.length >= 2) { T.showError('Only two files are crossfaded — extra files were skipped.'); break; }
      if (file.size > A.MAX_FILE) { T.showError(`${file.name} is over 200 MB and was skipped.`); continue; }
      try { items.push({ file, buf: await A.decode(file) }); } catch (e) { console.warn(e); T.showError(`Couldn't decode ${file.name} — skipped.`); }
    }
    paint(S);
    if (items.length === 1) $('dropzone').hidden = false; // keep the dropzone open for the second file
  }
  function crossfade(a, b, sec, curve) {
    const rate = a.sampleRate, ch = Math.max(a.numberOfChannels, b.numberOfChannels), n = Math.min(Math.round(sec * rate), a.length, b.length);
    const out = A.make(ch, a.length + b.length - n, rate), f = CURVES[curve] || CURVES.equal, start = a.length - n;
    for (let c = 0; c < ch; c++) {
      const da = a.getChannelData(Math.min(c, a.numberOfChannels - 1)), dbb = b.getChannelData(Math.min(c, b.numberOfChannels - 1)), o = out.getChannelData(c);
      o.set(da.subarray(0, start), 0);
      for (let i = 0; i < n; i++) { const [ga, gb] = f(i / n); o[start + i] = da[start + i] * ga + dbb[i] * gb; }
      o.set(dbb.subarray(n), a.length);
    }
    return { out, n };
  }
  const T = A.mount({
    actionLabel: 'Crossfade', verb: 'Mixing', suffix: 'crossfade', multiple: true,
    fmtRange: (el) => `${el.value} s`,
    summary: () => `${dur()} s · ${$('opt-curve').selectedOptions[0].textContent.replace(/ \(.*/, '')} · ${A.fmtLabel($('opt-out').value)}`,
    onFiles: add,
    validate: () => (items.length < 2 ? 'Add a second file to crossfade into.' : ''),
    onReset: () => { items.length = 0; list.innerHTML = ''; },
    run: async () => {
      const a = items[0].buf, b = await A.resampleTo(items[1].buf, a.sampleRate);
      const { out, n } = crossfade(a, b, dur(), $('opt-curve').value);
      return { buf: out, note: `${(n / a.sampleRate).toFixed(1)} s crossfade${n / a.sampleRate < dur() - 0.05 ? ' (limited by the shorter track)' : ''}` };
    }
  });
  $('btn-swap').addEventListener('click', () => { items.reverse(); paint(T.S); });
  window.__cf = { T, items, crossfade, CURVES };
})();

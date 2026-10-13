/* Audio Splitter — Toolity.in. Equal parts / fixed chunks / cut in the middle of every silence; each part encoded separately,
 * previewable and bundled into a ZIP (JSZip). Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, { formatTime, formatBytes, copyText } = window.Toolity, $ = (id) => document.getElementById(id);
  const list = $('parts-list'), mode = () => $('opt-mode').value;
  const show = () => { const m = mode(); [['opt-n', 'parts'], ['opt-every', 'every'], ['opt-thresh', 'silence'], ['opt-minsil', 'silence']].forEach(([id, on]) => { $(id).closest('.control-item').hidden = m !== on; }); };
  // Silence = 10 ms windows whose RMS (all channels) stays under the threshold for ≥ minSil; cut at each run's midpoint.
  function silenceCuts(buf, thrDb, minSil) {
    const hop = Math.round(buf.sampleRate / 100), thr = 10 ** (thrDb / 20), chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
    const cuts = []; let run = -1;
    for (let s = 0, w = 0; s < buf.length; s += hop, w++) {
      let e = 0; const end = Math.min(buf.length, s + hop); for (const d of chans) for (let i = s; i < end; i++) e += d[i] * d[i];
      const quiet = Math.sqrt(e / ((end - s) * chans.length)) < thr;
      if (quiet && run < 0) run = w;
      if ((!quiet || end === buf.length) && run >= 0) { const len = (w - run) / 100; if (len >= minSil && run > 0 && end < buf.length) cuts.push(((run + w) / 2) / 100); run = -1; }
      if (cuts.length >= 199) break;
    }
    return cuts;
  }
  function cutPoints(buf) {
    const d = buf.duration, m = mode();
    if (m === 'parts') { const n = Number($('opt-n').value); return Array.from({ length: n - 1 }, (_, i) => ((i + 1) * d) / n); }
    if (m === 'every') { const s = Number($('opt-every').value), out = []; for (let t = s; t < d - 0.05; t += s) out.push(t); return out; }
    return silenceCuts(buf, Number($('opt-thresh').value), Number($('opt-minsil').value));
  }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = A.mount({
    actionLabel: 'Split audio', verb: 'Encoding', suffix: 'parts',
    fmtRange: (el) => (el.id === 'opt-every' ? formatTime(Number(el.value)) : el.id === 'opt-thresh' ? `−${-el.value} dB` : el.id === 'opt-minsil' ? `${Number(el.value).toFixed(1)} s` : el.value),
    summary: () => `${{ parts: `${$('opt-n').value} equal parts`, every: `Every ${formatTime(Number($('opt-every').value))}`, silence: `At silences < −${-$('opt-thresh').value} dB` }[mode()]} · ${A.fmtLabel($('opt-out').value)}`,
    onSetting: show, onReset: () => { list.hidden = true; list.innerHTML = ''; show(); },
    run: async (S, api) => {
      if (!window.JSZip) throw new Error('The ZIP library is still loading — try again in a second.');
      const cuts = cutPoints(S.buf); if (!cuts.length) throw new Error(mode() === 'silence' ? 'No silences found — raise the threshold or shorten the minimum length.' : 'The file is too short for that split.');
      const bounds = [0, ...cuts, S.buf.duration], parts = [], zip = new JSZip(), base = A.stem(S.file.name);
      for (let i = 0; i < bounds.length - 1; i++) {
        const buf = A.slice(S.buf, bounds[i], bounds[i + 1]);
        const blob = await A.encode(buf, api.fmt, (p) => api.onProgress((i + p) / (bounds.length - 1), `Part ${i + 1}/${bounds.length - 1}`), api.stop);
        const name = `${base}-part${String(i + 1).padStart(2, '0')}.${A.extFor(api.fmt, blob.type)}`;
        parts.push({ name, blob, from: bounds[i], to: bounds[i + 1], url: URL.createObjectURL(blob) }); zip.file(name, blob);
      }
      return { blob: await zip.generateAsync({ type: 'blob' }), parts, note: `${parts.length} parts` };
    },
    present: (r, S, setOutput) => {
      (S.parts || []).forEach((p) => URL.revokeObjectURL(p.url)); S.parts = r.parts;
      setOutput(r.blob, null, `${r.parts.length} parts · ZIP · ${formatBytes(r.blob.size)}`);
      list.innerHTML = r.parts.map((p, i) => `<li><div class="split-part-head"><strong>${i + 1}</strong><span>${formatTime(p.from)} – ${formatTime(p.to)}</span><a href="${p.url}" download="${esc(p.name)}" class="btn-toolbar-sm" aria-label="Save part ${i + 1}"><iconify-icon icon="lucide:download" width="13" height="13"></iconify-icon></a></div><audio controls preload="none" src="${p.url}"></audio></li>`).join('');
      list.hidden = false;
    },
    outExt: () => 'zip',
    copy: (S) => copyText(S.parts.map((p, i) => `${i + 1}\t${formatTime(p.from)}\t${formatTime(p.to)}\t${p.name}`).join('\n'), 'Cut points copied')
  });
  show();
  window.__sp = { T, cutPoints, silenceCuts };
})();

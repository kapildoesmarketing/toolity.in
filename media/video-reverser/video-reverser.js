/* Video Reverser — Toolity.in. Browsers can't decode backwards, so frames are captured as JPEGs then played back in reverse (or boomerang) into MediaRecorder; audio reversed sample-wise. All on-device. */
(function () {
  'use strict';
  const V = window.ToolityVideo, $ = (id) => document.getElementById(id);
  const FPS = 24, MAX_SEC = 60; // Designed by Kapil Pidhwani: 60 s × 24 fps × ~100 KB JPEG ≈ 150 MB in memory; upgrade path is WebCodecs decode into a ring of VideoFrames.
  let R;
  const mode = () => $('opt-mode').value, audio = () => $('opt-audio').value === 'reverse', res = () => Number($('opt-res').value);
  function concatBuffers(a, b) {
    const ctx = V.audioCtx(), out = ctx.createBuffer(a.numberOfChannels, a.length + b.length, a.sampleRate);
    for (let c = 0; c < a.numberOfChannels; c++) { out.copyToChannel(a.getChannelData(c), c, 0); out.copyToChannel(b.getChannelData(c), c, a.length); }
    return out;
  }
  const T = V.mount({
    actionLabel: 'Reverse video', verb: 'Encoding', suffix: 'reversed',
    onLoad: (S) => R.reset(S.dur),
    onReset: () => R.reset(0),
    summary: () => `${mode() === 'boomerang' ? 'Boomerang' : 'Reverse'} · ${audio() ? 'Reversed audio' : 'No audio'} · ${res()}p`,
    validate: () => (R.to - R.from > MAX_SEC ? `Select up to ${MAX_SEC} seconds (currently ${Math.round(R.to - R.from)} s). Trim longer clips with the Video Trimmer first.` : R.to - R.from < 0.2 ? 'Select at least 0.2 s.' : ''),
    async run(S, api) {
      const [w, h] = V.fitBox(S.w, S.h, res());
      const grabbed = await V.extractFrames(api.src, { from: R.from, to: R.to, step: 1 / FPS, max: MAX_SEC * FPS + 1, w, h, stop: api.stop, onProgress: (p) => api.progress(p * 0.5, `Capturing frames ${Math.round(p * 100)}%`) });
      const fwd = grabbed.map((f) => f.blob), rev = fwd.slice().reverse();
      const frames = mode() === 'boomerang' ? fwd.concat(rev.slice(1)) : rev;
      let audioBuffer = null;
      if (audio()) {
        api.progress(0.5, 'Decoding audio…');
        const full = await V.decodeAudio(S.file);
        if (full) { const r = V.sliceBuffer(full, R.from, R.to, true); audioBuffer = mode() === 'boomerang' ? concatBuffers(V.sliceBuffer(full, R.from, R.to, false), r) : r; }
      }
      return V.renderFrames({ frames, fps: FPS, w, h, audioBuffer, stop: api.stop, onProgress: (p, left) => api.onProgress(0.5 + p * 0.5, left) });
    }
  });
  R = V.bindRange(T.src, () => { if (T.S.file) $('result-badge').textContent = R.to - R.from > MAX_SEC ? `Selection too long — max ${MAX_SEC} s` : `Will reverse ${$('rng-len').textContent}`; });
  window.__vrv = { T, R };
})();

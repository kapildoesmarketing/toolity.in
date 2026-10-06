/* Silence Remover — Toolity.in. 10 ms RMS envelope → gaps below threshold for ≥ min length are cut, keeping padding; pieces joined with 5 ms de-click fades. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, { formatTime } = window.Toolity, $ = (id) => document.getElementById(id);
  const th = () => Number($('opt-th').value), minLen = () => Number($('opt-min').value), pad = () => Number($('opt-pad').value);
  // Designed by Kapil Pidhwani: fixed-threshold RMS gate; no adaptive noise-floor estimate. Upgrade path: estimate floor from the quietest 10 % of windows and gate relative to it.
  function keptRegions(buf) {
    const win = Math.round(buf.sampleRate * 0.01), n = Math.floor(buf.length / win), chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)), lim = 10 ** (th() / 20);
    const loud = new Uint8Array(n);
    for (let w = 0; w < n; w++) { let s = 0; for (const d of chans) for (let i = w * win; i < (w + 1) * win; i++) s += d[i] * d[i]; loud[w] = Math.sqrt(s / (win * chans.length)) >= lim ? 1 : 0; }
    const minW = Math.round(minLen() / 0.01), gaps = []; let i = 0;
    while (i < n) { if (loud[i]) { i++; continue; } let j = i; while (j < n && !loud[j]) j++; if (j - i >= minW) gaps.push([i * 0.01, j * 0.01]); i = j; }
    const regions = []; let cur = 0;
    for (const [a, b] of gaps) { // gaps touching the file edges are removed fully — padding only matters between words
      const end = a <= 0 ? 0 : Math.min(buf.duration, a + pad()), next = b >= buf.duration - 0.02 ? buf.duration : Math.max(0, b - pad()); if (end - cur > 0.02) regions.push([cur, end]); cur = Math.max(cur, next); }
    if (buf.duration - cur > 0.02) regions.push([cur, buf.duration]);
    return { regions, gaps };
  }
  const T = A.mount({
    actionLabel: 'Remove silence', verb: 'Scanning', suffix: 'tight',
    summary: () => `${th()} dB · ≥ ${minLen()} s gaps · ${pad()} s padding · ${A.fmtLabel($('opt-out').value)}`,
    fmtRange: (el) => `${el.value}${el.id === 'opt-th' ? ' dB' : ' s'}`,
    run: async (S) => {
      const { regions, gaps } = keptRegions(S.buf);
      if (!gaps.length) return { buf: S.buf, note: `No silence ≥ ${minLen()} s below ${th()} dB — try a higher threshold` };
      if (!regions.length) throw new Error('Everything is below the threshold — lower it (e.g. −55 dB) and try again.');
      const buf = A.concat(regions.map(([a, b]) => A.fade(A.slice(S.buf, a, b), 0.005, 0.005)));
      return { buf, note: `Cut ${gaps.length} gap${gaps.length > 1 ? 's' : ''} · saved ${formatTime(S.buf.duration - buf.duration)}` };
    }
  });
  window.__sr = { T, keptRegions };
})();

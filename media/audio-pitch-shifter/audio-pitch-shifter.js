/* Audio Pitch Shifter — Toolity.in. WSOLA time-stretch by the pitch ratio, then resample back to the original length
 * (playbackRate in an OfflineAudioContext): pitch moves, duration stays. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const semis = () => Number($('opt-semi').value) + Number($('opt-cents').value) / 100;
  const label = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;
  const T = A.mount({
    actionLabel: 'Shift pitch', verb: 'Shifting', suffix: 'pitch',
    fmtRange: (el) => label(Number(el.value)),
    summary: () => { const s = Number($('opt-semi').value), c = Number($('opt-cents').value); return `${label(s)} semitone${Math.abs(s) === 1 ? '' : 's'}${c ? ` ${label(c)} cents` : ''} · ${A.fmtLabel($('opt-out').value)}`; },
    validate: () => (semis() === 0 ? 'Set a semitone or cents shift in Settings first.' : ''),
    run: async (S, api) => {
      const r = 2 ** (semis() / 12);
      api.progress(0.2, 'Stretching…'); await new Promise((res) => setTimeout(res, 0)); // let the label paint before the synchronous stretch
      const long = A.stretch(S.buf, r);
      const buf = await A.offline(long, (ctx, src) => { src.playbackRate.value = r; return src; }, { length: S.buf.length });
      return { buf, note: `${label(+(semis()).toFixed(2))} semitones · duration unchanged` };
    }
  });
  window.__ps = { T };
})();

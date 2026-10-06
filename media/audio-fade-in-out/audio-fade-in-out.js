/* Audio Fade In / Out — Toolity.in. Multiplies the head and tail by a linear / S-curve / exponential ramp, via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const fin = () => Number($('opt-in').value), fout = () => Number($('opt-out-len').value);
  const T = A.mount({
    actionLabel: 'Apply fades', verb: 'Fading', suffix: 'faded',
    summary: () => `In ${fin()} s · Out ${fout()} s · ${$('opt-curve').options[$('opt-curve').selectedIndex].text.split(' ')[0]} · ${A.fmtLabel($('opt-out').value)}`,
    fmtRange: (el) => `${el.value} s`,
    validate: () => (!fin() && !fout() ? 'Set a fade-in or fade-out longer than 0 seconds.' : ''),
    run: async (S) => ({ buf: A.fade(A.clone(S.buf), fin(), fout(), $('opt-curve').value) })
  });
  window.__af = { T };
})();

/* Audio Speed Changer — Toolity.in. Natural = playbackRate in an OfflineAudioContext (pitch follows); Preserve = granular time-stretch. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, { formatTime } = window.Toolity, $ = (id) => document.getElementById(id);
  const speed = () => Number($('opt-speed').value);
  const T = A.mount({
    actionLabel: 'Change speed', verb: 'Stretching', suffix: 'speed',
    summary: () => `${speed()}× · ${$('opt-mode').value === 'preserve' ? 'Preserve pitch' : 'Natural'} · ${A.fmtLabel($('opt-out').value)}`,
    fmtRange: (el) => `${Number(el.value).toFixed(2).replace(/\.?0+$/, '')}×`,
    run: async (S) => {
      const s = speed();
      const buf = $('opt-mode').value === 'preserve' ? A.stretch(S.buf, 1 / s) : await A.offline(S.buf, (ctx, src) => { src.playbackRate.value = s; return src; }, { length: S.buf.length / s });
      return { buf, note: `${formatTime(S.buf.duration)} → ${formatTime(buf.duration)}` };
    }
  });
  window.__as = { T };
})();

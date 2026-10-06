/* Audio Reverser — Toolity.in. Mirrors every sample, then encodes via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const T = A.mount({
    actionLabel: 'Reverse audio', verb: 'Reversing', suffix: 'reversed',
    summary: () => A.fmtLabel($('opt-out').value),
    run: async (S) => {
      const out = A.make(S.buf.numberOfChannels, S.buf.length, S.buf.sampleRate);
      for (let c = 0; c < S.buf.numberOfChannels; c++) out.copyToChannel(S.buf.getChannelData(c).slice().reverse(), c);
      return { buf: out };
    }
  });
  window.__ar = { T };
})();

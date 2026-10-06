/* Audio Converter — Toolity.in. Decode anything the browser plays → optional channel/rate change → MP3 / WAV / Opus via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const txt = (id) => $(id).options[$(id).selectedIndex].text;
  const T = A.mount({
    actionLabel: 'Convert audio', verb: 'Converting', suffix: 'converted',
    summary: () => `${A.fmtLabel($('opt-out').value)} · ${$('opt-ch').value === 'keep' ? 'Keep channels' : txt('opt-ch')} · ${$('opt-rate').value === 'keep' ? 'Keep sample rate' : txt('opt-rate')}`,
    run: async (S) => {
      const ch = $('opt-ch').value, rate = $('opt-rate').value;
      return { buf: await A.resampleTo(S.buf, rate === 'keep' ? S.buf.sampleRate : Number(rate), ch === 'keep' ? 0 : Number(ch)) };
    }
  });
  window.__ac = { T };
})();

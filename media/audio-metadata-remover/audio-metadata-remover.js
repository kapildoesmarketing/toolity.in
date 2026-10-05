/* Audio Metadata Remover — thin page wiring over /scripts/meta-common.js + meta-audio.js (+ meta-video.js for M4A) */
(function () {
  'use strict';
  const wrap = document.getElementById('source-wrap'), audio = document.getElementById('source-audio');
  ToolityMeta.app({
    mode: 'strip', parser: ToolityMeta.audio, accept: '', maxMB: 300,
    preview: (file, url) => { audio.src = url; wrap.hidden = false; },
    clear: () => { if (audio.src) URL.revokeObjectURL(audio.src); audio.removeAttribute('src'); wrap.hidden = true; },
    ext: (f) => (f.name.match(/\.(\w+)$/) || [, 'bin'])[1].toLowerCase(),
    options: () => ({ keepCover: document.getElementById('opt-cover').checked }),
  });
  document.querySelectorAll('.tool-settings-panel input').forEach((el) => el.addEventListener('change', () => {
    const s = document.getElementById('settings-summary'); if (s) s.textContent = document.getElementById('opt-cover').checked ? 'Cover art kept' : 'Cover art removed';
  }));
})();

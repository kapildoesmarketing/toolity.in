/* Video Metadata Viewer — thin page wiring over /scripts/meta-common.js + meta-video.js */
(function () {
  'use strict';
  const video = document.getElementById('source-video');
  ToolityMeta.app({
    mode: 'view', parser: ToolityMeta.video, accept: '', maxMB: 1024,
    preview: (file, url) => { video.src = url; video.classList.add('is-show'); },
    clear: () => { if (video.src) URL.revokeObjectURL(video.src); video.removeAttribute('src'); video.load(); video.classList.remove('is-show'); },
    ext: (f) => (f.name.match(/\.(\w+)$/) || [, 'bin'])[1].toLowerCase(),
  });
})();

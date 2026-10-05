/* Image Metadata Viewer — thin page wiring over /scripts/meta-common.js + meta-image.js */
(function () {
  'use strict';
  const img = document.getElementById('source-img');
  ToolityMeta.app({
    mode: 'view', parser: ToolityMeta.image, accept: '', maxMB: 50,
    preview: (file, url) => { img.src = url; img.classList.add('is-show'); },
    clear: () => { if (img.src) URL.revokeObjectURL(img.src); img.removeAttribute('src'); img.classList.remove('is-show'); },
    ext: (f) => (f.name.match(/\.(\w+)$/) || [, 'bin'])[1].toLowerCase(),
  });
  document.querySelectorAll('.tool-settings-panel input').forEach((el) => el.addEventListener('change', () => {
    const s = document.getElementById('settings-summary'); if (s) s.textContent = `${document.getElementById('opt-icc').checked ? 'Keep ICC' : 'Drop ICC'} · ${document.getElementById('opt-bake').checked ? 'Bake rotation' : 'Raw strip'}`;
  }));
})();

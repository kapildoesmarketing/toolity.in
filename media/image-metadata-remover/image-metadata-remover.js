/* Image Metadata Remover — thin page wiring over /scripts/meta-common.js + meta-image.js */
(function () {
  'use strict';
  const img = document.getElementById('source-img');
  ToolityMeta.app({
    mode: 'strip', parser: ToolityMeta.image, accept: '', maxMB: 50,
    preview: (file, url) => { img.src = url; img.classList.add('is-show'); },
    clear: () => { if (img.src) URL.revokeObjectURL(img.src); img.removeAttribute('src'); img.classList.remove('is-show'); },
    ext: (f) => (f.name.match(/\.(\w+)$/) || [, 'bin'])[1].toLowerCase(),
    options: () => ({ keepIcc: document.getElementById('opt-icc').checked, bake: document.getElementById('opt-bake').checked }),
    // Designed by Kapil Pidhwani: rotation is baked with Canvas (lossy re-encode) only when EXIF orientation ≠ 1 and the user keeps the default on.
    bake: async (file, buf, result, o) => {
      if (!o.bake || !(result.orientation > 1) || !/^image\/(jpeg|png|webp)$/.test(file.type)) return null;
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); bmp.close();
      const blob = await new Promise((r) => c.toBlob(r, file.type, 0.92));
      return blob ? blob.arrayBuffer() : null;
    },
  });
  document.querySelectorAll('.tool-settings-panel input').forEach((el) => el.addEventListener('change', () => {
    const s = document.getElementById('settings-summary'); if (s) s.textContent = `${document.getElementById('opt-icc').checked ? 'Keep ICC' : 'Drop ICC'} · ${document.getElementById('opt-bake').checked ? 'Bake rotation' : 'Raw strip'}`;
  }));
})();

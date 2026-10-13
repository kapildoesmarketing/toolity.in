/* Image to Base64 — Toolity.in. File bytes → data URI / raw / CSS / HTML / Markdown (no re-encode), and pasted Base64 → image.
 * Page controller from /scripts/image-common.js. All on-device. */
(function () {
  'use strict';
  const I = window.ToolityImage, { copyText, formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  const outText = $('output-text'), outImg = $('output-img'), paste = $('b64-input');
  const SIG = [['iVBOR', 'image/png'], ['/9j/', 'image/jpeg'], ['R0lGOD', 'image/gif'], ['UklGR', 'image/webp'], ['PHN2Zy', 'image/svg+xml'], ['PD94', 'image/svg+xml'], ['AAABAA', 'image/x-icon'], ['Qk', 'image/bmp']];
  const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/bmp': 'bmp', 'image/avif': 'avif' };
  const dataUri = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read the file.')); r.readAsDataURL(blob); });
  function wrap(uri, name) {
    const raw = uri.slice(uri.indexOf(',') + 1);
    return { uri, raw, css: `background-image: url("${uri}");`, html: `<img src="${uri}" alt="${name.replace(/"/g, '&quot;')}">`, md: `![${name.replace(/[[\]]/g, '')}](${uri})` }[$('opt-as').value];
  }
  function showText(text) { outImg.classList.remove('is-shown'); outText.hidden = false; outText.value = text; }
  const T = I.mount({
    actionLabel: 'Convert', suffix: 'base64', auto: true, accept: 'image/',
    summary: () => $('opt-as').selectedOptions[0].textContent.replace(/ \(.*/, ''),
    onLoad: () => { paste.value = ''; },
    onReset: () => { outText.hidden = true; outText.value = ''; paste.value = ''; T.S.decoded = false; },
    run: async (S) => {
      S.decoded = false;
      const text = wrap(await dataUri(S.file), S.file.name);
      return { blob: new Blob([text], { type: 'text/plain' }), text, note: `${text.length.toLocaleString()} characters` };
    },
    present: (r, S, setOutput) => { setOutput(r.blob, 0, 0, `${r.text.length.toLocaleString()} chars · ${formatBytes(S.file.size)} → ${formatBytes(r.blob.size)} (+${Math.round((r.blob.size / S.file.size - 1) * 100)}%)`); showText(r.text); },
    outExt: (S) => (S.decoded ? EXT[S.out.type] || 'png' : 'txt'),
    copy: (S) => (S.decoded ? window.Toolity.copyBlob(S.out) : copyText(outText.value, 'Base64 copied'))
  });
  // Base64 → image. Accepts a full data URI or a raw string (type sniffed from its first characters).
  let t = 0;
  async function decodePaste() {
    const v = paste.value.trim().replace(/\s+/g, ''); if (!v) return;
    T.showError('');
    try {
      let type = 'image/png', b64 = v;
      const m = v.match(/^data:([^;,]+)?(;base64)?,(.*)$/i);
      if (m) { type = m[1] || type; b64 = m[2] ? m[3] : btoa(unescape(decodeURIComponent(m[3]))); }
      else { const s = SIG.find(([p]) => v.startsWith(p)); if (!s) throw new Error('sig'); type = s[1]; }
      const bin = atob(b64), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type });
      T.setOutput(blob, 0, 0, '');
      await new Promise((res, rej) => { outImg.onload = res; outImg.onerror = () => rej(new Error('img')); outImg.src = T.S.outUrl; });
      T.S.decoded = true; outText.hidden = true; outImg.classList.add('is-shown');
      $('output-badge').textContent = `${outImg.naturalWidth} × ${outImg.naturalHeight} · ${(EXT[type] || type).toUpperCase()} · ${formatBytes(blob.size)}`;
      $('result-badge').textContent = 'Decoded';
    } catch (e) { console.warn(e); T.showError('That doesn\'t look like a Base64 image. Paste a data URI (data:image/…;base64,…) or a raw PNG/JPG/GIF/WebP/SVG string.'); }
  }
  paste.addEventListener('input', () => { clearTimeout(t); t = setTimeout(decodePaste, 300); });
  window.__ib = { T, decodePaste };
})();

/* Designed by Kapil Pidhwani: Google Maps Embed Creator — keyless maps.google.com embed URL, live preview, responsive snippet */
(function () {
  'use strict';
  const { copyText, downloadBlob, bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);
  const el = {
    q: $('map-q'), from: $('map-from'), to: $('map-to'), zoom: $('map-zoom'), zoomVal: $('map-zoom-val'),
    w: $('map-w'), h: $('map-h'), responsive: $('opt-responsive'), lang: $('opt-lang'), info: $('opt-info'),
    frame: $('gm-frame'), code: $('output-code'), empty: $('output-empty'), badge: $('output-badge'),
    err: $('input-error'), summary: $('settings-summary'), grpPlace: $('grp-place'), grpDir: $('grp-directions')
  };
  let mode = 'place', type = 'm', previewTimer = 0, lastPreview = '';

  const state = () => ({
    mode, type, q: el.q.value.trim(), from: el.from.value.trim(), to: el.to.value.trim(),
    zoom: +el.zoom.value, w: Math.max(100, +el.w.value || 600), h: Math.max(100, +el.h.value || 450),
    responsive: el.responsive.checked, lang: el.lang.value, info: el.info.checked
  });

  // Designed by Kapil Pidhwani: no geocoding/autocomplete — the keyless embed geocodes server-side. Upgrade path: Places API with the user's own key.
  function embedUrl(s) {
    const p = new URLSearchParams();
    if (s.mode === 'place') p.set('q', s.q); else { p.set('saddr', s.from); p.set('daddr', s.to); }
    p.set('t', s.type); p.set('z', s.zoom);
    if (s.lang) p.set('hl', s.lang);
    p.set('ie', 'UTF8'); p.set('iwloc', s.info ? 'B' : 'near'); p.set('output', 'embed');
    return 'https://maps.google.com/maps?' + p;
  }
  function mapsLink(s) {
    return s.mode === 'place'
      ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.q)
      : 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(s.from) + '&destination=' + encodeURIComponent(s.to);
  }
  const escAttr = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  function snippet(s) {
    const title = escAttr(s.mode === 'place' ? `Map of ${s.q}` : `Directions from ${s.from} to ${s.to}`);
    const common = `src="${escAttr(embedUrl(s))}" title="${title}" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"`;
    return s.responsive
      ? `<div style="width:100%;aspect-ratio:${s.w}/${s.h}">\n  <iframe ${common} style="border:0;width:100%;height:100%"></iframe>\n</div>`
      : `<iframe ${common} width="${s.w}" height="${s.h}" style="border:0"></iframe>`;
  }
  const ready = (s) => (s.mode === 'place' ? !!s.q : !!(s.from && s.to));

  function render() {
    const s = state();
    el.zoomVal.textContent = s.zoom;
    el.summary.textContent = (s.lang ? el.lang.selectedOptions[0].textContent : 'Browser language') + (s.info ? '' : ' · No info card');
    const ok = ready(s);
    ['btn-copy', 'btn-download', 'btn-open'].forEach((id) => { $(id).disabled = !ok; });
    el.code.hidden = !ok;
    el.empty.hidden = ok;
    el.badge.textContent = ok ? (s.responsive ? `Responsive · ${s.w}:${s.h}` : `${s.w} × ${s.h} px`) : 'Waiting for a place';
    if (!ok) { el.frame.hidden = true; el.frame.removeAttribute('src'); lastPreview = ''; el.code.textContent = ''; return; }
    el.code.textContent = snippet(s);
    const url = embedUrl(s);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => { if (url !== lastPreview) { lastPreview = url; el.frame.src = url; el.frame.hidden = false; } }, 600);
  }

  function setMode(m) {
    mode = m;
    el.grpPlace.hidden = m !== 'place';
    el.grpDir.hidden = m === 'place';
    render();
  }
  function reset() {
    [el.q, el.from, el.to].forEach((i) => { i.value = ''; });
    el.zoom.value = 14; el.w.value = 600; el.h.value = 450; el.responsive.checked = true; el.lang.value = ''; el.info.checked = true;
    type = 'm';
    document.querySelectorAll('#seg-type .seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'm'));
    document.querySelectorAll('#seg-mode .seg-pill').forEach((b) => b.classList.toggle('active', b.dataset.value === 'place'));
    setMode('place');
    toast('Reset');
  }
  function copy() { if (!ready(state())) return toast('Enter a place first'); copyText(el.code.textContent, 'Embed code copied'); }
  function download() {
    if (!ready(state())) return toast('Enter a place first');
    downloadBlob(new Blob([el.code.textContent + '\n'], { type: 'text/html' }), 'google-map-embed.html');
  }

  [el.q, el.from, el.to, el.zoom, el.w, el.h].forEach((i) => i.addEventListener('input', render));
  [el.responsive, el.lang, el.info].forEach((i) => i.addEventListener('change', render));
  bindSegmented($('seg-mode'), setMode);
  bindSegmented($('seg-type'), (v) => { type = v; render(); });
  $('btn-reset').addEventListener('click', reset);
  $('btn-copy').addEventListener('click', copy);
  $('btn-download').addEventListener('click', download);
  $('btn-open').addEventListener('click', () => { const s = state(); if (ready(s)) window.open(mapsLink(s), '_blank', 'noopener'); });
  bindShortcuts({ primary: copy, reset });
  window.__gmEmbed = { embedUrl, snippet, mapsLink }; // self-check hook
  render();
})();

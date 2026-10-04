/* Designed by Kapil Pidhwani: Website Favicon Extractor */
(function () {
  'use strict';
  const { copyText, downloadBlob, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);

  const input = $('domain-input');
  const img = $('favicon-preview-img');
  const actionBtns = ['btn-copy', 'btn-download', 'btn-open'].map($);
  let domain = null;
  let size = '256';
  let activeUrl = null;

  // Accept bare domains or full URLs; return clean hostname without www.
  function sanitize(str) {
    str = str.trim().toLowerCase();
    if (!str) return null;
    try {
      const host = new URL(/^https?:\/\//.test(str) ? str : 'https://' + str).hostname.replace(/^www\./, '');
      return host.includes('.') || host === 'localhost' ? host : null;
    } catch (e) {
      const m = str.match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})(?:\/.*)?$/);
      return m ? m[1] : null;
    }
  }

  const cdnUrl = (d, s) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=${s}`;

  function setSize(s) {
    size = s;
    document.querySelectorAll('.quality-card-btn').forEach((b) => b.classList.toggle('active', b.dataset.size === s));
  }

  function showEmpty() {
    activeUrl = null;
    $('preview-viewport').classList.add('empty');
    $('output-empty').hidden = false;
    img.hidden = true; img.removeAttribute('src');
    $('badge-overlay').style.display = 'none';
    $('snippet-group').hidden = true;
    $('output-badge').textContent = '—';
    $('domain-host-text').textContent = 'None';
    $('domain-status-text').textContent = 'Enter a domain or URL above';
    $('status-badge').textContent = 'Waiting for domain';
    actionBtns.forEach((b) => { b.disabled = true; });
  }

  function updatePreview() {
    if (!domain) return showEmpty();
    const url = cdnUrl(domain, size);
    activeUrl = url;
    const tester = new Image();
    tester.onload = () => {
      $('preview-viewport').classList.remove('empty');
      $('output-empty').hidden = true;
      img.src = url; img.hidden = false;
      $('overlay-text').textContent = `${size}px`;
      $('badge-overlay').style.display = 'flex';
      $('output-badge').textContent = `${size} × ${size} px`;
      $('snippet-code-text').textContent = `<link rel="icon" type="image/png" sizes="${size}x${size}" href="${url}">`;
      $('snippet-group').hidden = false;
      actionBtns.forEach((b) => { b.disabled = false; });
    };
    tester.onerror = () => toast('Could not load favicon from Google CDN');
    tester.src = url;
  }

  function onInput() {
    const raw = input.value;
    domain = sanitize(raw);
    $('btn-clear-domain').hidden = !raw;
    $('input-error').hidden = !(raw.trim() && !domain);
    $('input-badge').textContent = raw ? `${raw.length} chars` : '—';
    if (domain) {
      $('domain-host-text').textContent = domain;
      $('domain-status-text').textContent = 'Active domain';
      $('status-badge').textContent = 'Valid host';
    }
    updatePreview();
  }

  function setValue(v, msg) { input.value = v; onInput(); if (msg) toast(msg); }
  function reset() { setSize('256'); setValue('', 'Workspace reset'); input.focus(); }

  // Cross-origin image → public proxies first, then direct
  async function fetchBlob(url) {
    const candidates = [
      `https://images.weserv.nl/?url=${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      url
    ];
    for (const c of candidates) {
      try { const r = await fetch(c); if (r.ok) { const b = await r.blob(); if (b.size) return b; } } catch (e) { /* next */ }
    }
    throw new Error('fetch failed');
  }

  async function download() {
    if (!activeUrl) return toast('Enter a valid website domain first');
    toast('Downloading favicon…');
    try {
      downloadBlob(await fetchBlob(activeUrl), `favicon-${domain}-${size}px.png`);
      toast('Favicon downloaded');
    } catch (e) {
      toast('Download blocked — use Open and save the image manually');
    }
  }

  input.addEventListener('input', onInput);
  $('btn-clear-domain').addEventListener('click', () => { setValue(''); input.focus(); });
  $('btn-paste').addEventListener('click', async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setValue(t, 'Pasted from clipboard'); }
    catch (e) { input.focus(); toast('Press Ctrl/⌘+V to paste'); }
  });
  document.querySelectorAll('.sample-chip').forEach((c) => c.addEventListener('click', () => setValue(c.dataset.domain, `Loaded ${c.dataset.domain}`)));
  $('quality-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.quality-card-btn');
    if (b && b.dataset.size !== size) { setSize(b.dataset.size); updatePreview(); }
  });
  $('btn-reset').addEventListener('click', reset);
  $('btn-copy').addEventListener('click', () => activeUrl && copyText(activeUrl, 'Favicon URL copied'));
  $('btn-copy-snippet').addEventListener('click', () => copyText($('snippet-code-text').textContent, 'HTML <link> snippet copied'));
  $('btn-download').addEventListener('click', download);
  $('btn-open').addEventListener('click', () => activeUrl && window.open(activeUrl, '_blank', 'noopener'));
  bindShortcuts({ primary: download, reset });

  onInput();
})();

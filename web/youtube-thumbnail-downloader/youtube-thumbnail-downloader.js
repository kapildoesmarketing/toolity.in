/* Designed by Kapil Pidhwani: YouTube Thumbnail Downloader */
(function () {
  'use strict';
  const { copyText, downloadBlob, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);

  const QUALITY = {
    maxres: { file: 'maxresdefault.jpg', label: 'HD 1080p' },
    hq:     { file: 'hqdefault.jpg',     label: 'HQ 480p' },
    sd:     { file: 'sddefault.jpg',     label: 'SD 480p' },
    mq:     { file: 'mqdefault.jpg',     label: 'MQ 360p' }
  };
  const ID = '([a-zA-Z0-9_-]{11})';
  const PATTERNS = [
    [new RegExp('youtube\\.com/shorts/' + ID, 'i'), 'YouTube Shorts'],
    [new RegExp('youtu\\.be/' + ID, 'i'), 'Shortened Link'],
    [new RegExp('youtube\\.com/(?:embed|v)/' + ID, 'i'), 'Embedded Video'],
    [new RegExp('youtube\\.com/watch\\?.*v=' + ID, 'i'), 'Standard Video']
  ];

  const input = $('yt-url-input');
  const img = $('thumbnail-preview-img');
  const actionBtns = ['btn-copy', 'btn-download', 'btn-open'].map($);
  let videoId = null;
  let quality = 'maxres';
  let activeUrl = null;

  function parse(str) {
    str = str.trim();
    if (!str) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return { id: str, type: 'Direct ID' };
    for (const [re, type] of PATTERNS) { const m = str.match(re); if (m) return { id: m[1], type }; }
    return { error: true };
  }

  const cdnUrl = (id, q) => `https://img.youtube.com/vi/${id}/${QUALITY[q].file}`;

  function setQuality(q) {
    quality = q;
    document.querySelectorAll('.quality-card-btn').forEach((b) => b.classList.toggle('active', b.dataset.quality === q));
  }

  function showEmpty() {
    activeUrl = null;
    $('preview-viewport').classList.add('empty');
    $('output-empty').hidden = false;
    img.hidden = true; img.removeAttribute('src');
    $('badge-overlay').style.display = 'none';
    $('output-badge').textContent = '—';
    $('video-id-text').textContent = 'None';
    $('video-type-text').textContent = 'Paste a YouTube link above';
    $('status-badge').textContent = 'Waiting for URL';
    actionBtns.forEach((b) => { b.disabled = true; });
  }

  function updatePreview() {
    if (!videoId) return showEmpty();
    const url = cdnUrl(videoId, quality);
    activeUrl = url;
    const tester = new Image();
    tester.onload = () => {
      // YouTube serves a 120x90 placeholder when maxres doesn't exist → fall back to HQ
      if (quality === 'maxres' && tester.naturalWidth <= 120) {
        setQuality('hq'); toast('HD (1080p) unavailable for this video — showing HQ (480p)'); return updatePreview();
      }
      $('preview-viewport').classList.remove('empty');
      $('output-empty').hidden = true;
      img.src = url; img.hidden = false;
      $('overlay-text').textContent = QUALITY[quality].label;
      $('badge-overlay').style.display = 'flex';
      $('output-badge').textContent = `${tester.naturalWidth} × ${tester.naturalHeight} px`;
      actionBtns.forEach((b) => { b.disabled = false; });
    };
    tester.onerror = () => { if (quality !== 'hq') { setQuality('hq'); updatePreview(); } };
    tester.src = url;
  }

  function onInput() {
    const parsed = parse(input.value);
    $('btn-clear-url').hidden = !input.value;
    $('input-error').hidden = !(parsed && parsed.error);
    $('input-badge').textContent = input.value ? `${input.value.length} chars` : '—';
    videoId = parsed && !parsed.error ? parsed.id : null;
    if (videoId) {
      $('video-id-text').textContent = parsed.id;
      $('video-type-text').textContent = parsed.type;
      $('status-badge').textContent = parsed.type;
    }
    updatePreview();
  }

  function setUrl(v, msg) { input.value = v; onInput(); if (msg) toast(msg); }

  function reset() { setQuality('maxres'); setUrl('', 'Workspace reset'); input.focus(); }

  // Browser CORS blocks a direct fetch of img.youtube.com → try public image proxies, then direct
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
    if (!activeUrl) return toast('Enter a valid YouTube link first');
    toast('Downloading thumbnail…');
    try {
      downloadBlob(await fetchBlob(activeUrl), `youtube-thumbnail-${videoId}-${quality}.jpg`);
      toast('Thumbnail downloaded');
    } catch (e) {
      toast('Download blocked — use Open and save the image manually');
    }
  }

  input.addEventListener('input', onInput);
  $('btn-clear-url').addEventListener('click', () => { setUrl(''); input.focus(); });
  $('btn-paste').addEventListener('click', async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setUrl(t, 'Link pasted from clipboard'); }
    catch (e) { input.focus(); toast('Press Ctrl/⌘+V to paste'); }
  });
  document.querySelectorAll('.sample-chip').forEach((c) => c.addEventListener('click', () => setUrl(c.dataset.url, 'Sample link loaded')));
  $('quality-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.quality-card-btn');
    if (b && b.dataset.quality !== quality) { setQuality(b.dataset.quality); updatePreview(); }
  });
  $('btn-reset').addEventListener('click', reset);
  $('btn-copy').addEventListener('click', () => activeUrl && copyText(activeUrl, 'Thumbnail URL copied'));
  $('btn-download').addEventListener('click', download);
  $('btn-open').addEventListener('click', () => activeUrl && window.open(activeUrl, '_blank', 'noopener'));
  bindShortcuts({ primary: download, reset });

  onInput();
})();

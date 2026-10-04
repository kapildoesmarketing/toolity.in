/* Designed by Kapil Pidhwani: Image to Favicon Generator */
/* Designed by Kapil Pidhwani: Image to Favicon Converter Engine */
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const fileInput = document.getElementById('image-file-input');
  const dropZone = document.getElementById('image-dropzone');
  const sourceMetaBadge = document.getElementById('source-meta-badge');
  const previewStatusBadge = document.getElementById('preview-status-badge');
  const fitModeGroup = document.getElementById('fit-mode-group');
  const shapeGroup = document.getElementById('shape-group');
  const paddingSlider = document.getElementById('padding-slider');
  const paddingValBadge = document.getElementById('padding-val-badge');
  const customColorPicker = document.getElementById('custom-color-picker');
  const bgColorLabel = document.getElementById('bg-color-label');
  const siteTitleInput = document.getElementById('site-title-input');
  const settingsSummaryBadge = document.getElementById('settings-summary-badge');
  const btnReset = document.getElementById('btn-reset-tool');
  const btnCopyHtmlTop = document.getElementById('btn-copy-html-top');
  const btnDownloadMaster = document.getElementById('btn-download-master');
  const downloadDropdownWrapper = document.getElementById('download-dropdown-wrapper');

  // Previews
  const tabPreviewImg = document.getElementById('tab-preview-img');
  const tabMainPreviewImg = document.getElementById('tab-main-preview-img');
  const tabTitleText = document.getElementById('tab-title-text');
  const mobilePreviewImg = document.getElementById('mobile-preview-img');
  const mobileAppName = document.getElementById('mobile-app-name');
  const serpPreviewImg = document.getElementById('serp-preview-img');
  const serpSitename = document.getElementById('serp-sitename');
  const serpTitleLink = document.getElementById('serp-title-link');

  // Size matrix previews
  const sizeImgs = {
    16: document.getElementById('size-img-16'),
    32: document.getElementById('size-img-32'),
    48: document.getElementById('size-img-48'),
    180: document.getElementById('size-img-180'),
    192: document.getElementById('size-img-192'),
    512: document.getElementById('size-img-512')
  };

  // State
  let sourceImage = null;
  let fitMode = 'contain';
  let bgColor = 'transparent';
  let paddingPct = 8;
  let cornerRadiusPct = 0;
  let renderedCanvases = {};

  // Initialize tool
  updateSettingsBadge();
  renderAllSizes();

  function updateSettingsBadge() {
    const fitCapitalized = fitMode.charAt(0).toUpperCase() + fitMode.slice(1);
    const bgText = bgColor === 'transparent' ? 'Transparent BG' : `${bgColor.toUpperCase()} BG`;
    const shapeText = cornerRadiusPct === 0 ? 'Square' : (cornerRadiusPct === 22 ? 'Squircle' : 'Circle');
    if (settingsSummaryBadge) {
      settingsSummaryBadge.textContent = `(${fitCapitalized} • ${bgText} • ${paddingPct}% Padding • ${shapeText})`;
    }
  }

  // Event Listeners for File Input & Dropzone
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--brand)';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  });

  // Fit mode segmented buttons
  fitModeGroup.querySelectorAll('.seg-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      fitModeGroup.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fitMode = btn.dataset.fit;
      updateSettingsBadge();
      renderAllSizes();
    });
  });

  // Shape segmented buttons
  shapeGroup.querySelectorAll('.seg-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      shapeGroup.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cornerRadiusPct = parseInt(btn.dataset.radius, 10);
      updateSettingsBadge();
      renderAllSizes();
    });
  });

  // Padding slider
  paddingSlider.addEventListener('input', (e) => {
    paddingPct = parseInt(e.target.value, 10);
    paddingValBadge.textContent = `${paddingPct}%`;
    updateSettingsBadge();
    renderAllSizes();
  });

  // Color Swatches
  document.querySelectorAll('.color-swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bgColor = btn.dataset.bg;
      bgColorLabel.textContent = bgColor === 'transparent' ? 'Transparent' : bgColor.toUpperCase();
      updateSettingsBadge();
      renderAllSizes();
    });
  });

  customColorPicker.addEventListener('input', (e) => {
    document.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('active'));
    bgColor = e.target.value;
    bgColorLabel.textContent = bgColor.toUpperCase();
    updateSettingsBadge();
    renderAllSizes();
  });

  // Site Title Customizer
  siteTitleInput.addEventListener('input', (e) => {
    const val = e.target.value.trim() || 'My Awesome Website';
    tabTitleText.textContent = val;
    mobileAppName.textContent = val.split(' ')[0] || val;
    serpSitename.textContent = val;
    serpTitleLink.textContent = `${val} — Simple & Fast Solutions`;
  });

  // Preview sub-tab switcher
  document.querySelectorAll('.preview-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.preview-mode-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach(v => v.style.display = 'none');
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.style.display = 'block';
    });
  });

  // Download dropdown toggle (using .open on .dropdown-menu-wrapper matching main.css)
  btnDownloadMaster.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = downloadDropdownWrapper.classList.toggle('open');
    btnDownloadMaster.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', () => {
    downloadDropdownWrapper.classList.remove('open');
    btnDownloadMaster.setAttribute('aria-expanded', 'false');
  });

  // Copy HTML buttons
  function copyHtmlCode() {
    const code = document.getElementById('html-snippet-display').textContent;
    navigator.clipboard.writeText(code)
      .then(() => showToast('HTML embed tags copied to clipboard!'))
      .catch(() => showToast('Copy failed — select the code and press Ctrl/⌘+C'));
  }

  btnCopyHtmlTop.addEventListener('click', copyHtmlCode);

  // Download actions
  document.getElementById('opt-dl-ico').addEventListener('click', downloadIco);
  document.getElementById('opt-dl-zip').addEventListener('click', downloadZip);
  document.getElementById('opt-dl-apple').addEventListener('click', () => downloadSinglePng(180, 'apple-touch-icon.png'));
  document.getElementById('opt-dl-32').addEventListener('click', () => downloadSinglePng(32, 'favicon-32x32.png'));
  document.getElementById('opt-dl-512').addEventListener('click', () => downloadSinglePng(512, 'android-chrome-512x512.png'));

  // Individual size download buttons
  document.querySelectorAll('.size-btn-download').forEach(btn => {
    btn.addEventListener('click', () => {
      const sz = parseInt(btn.dataset.size, 10);
      downloadSinglePng(sz, sz === 180 ? 'apple-touch-icon.png' : `favicon-${sz}x${sz}.png`);
    });
  });

  // Reset
  btnReset.addEventListener('click', () => {
    sourceImage = null;
    fileInput.value = '';
    if (sourceMetaBadge) sourceMetaBadge.textContent = 'No image loaded';
    if (previewStatusBadge) previewStatusBadge.textContent = 'Awaiting Image';
    fitMode = 'contain';
    bgColor = 'transparent';
    paddingPct = 8;
    cornerRadiusPct = 0;
    paddingSlider.value = 8;
    paddingValBadge.textContent = '8%';
    siteTitleInput.value = 'My Awesome Website';
    tabTitleText.textContent = 'My Awesome Website';
    mobileAppName.textContent = 'My Website';
    serpSitename.textContent = 'My Awesome Website';
    serpTitleLink.textContent = 'My Awesome Website — Simple & Fast Solutions';
    fitModeGroup.querySelectorAll('.seg-pill').forEach((b, i) => b.classList.toggle('active', i === 0));
    shapeGroup.querySelectorAll('.seg-pill').forEach((b, i) => b.classList.toggle('active', i === 0));
    document.querySelectorAll('.color-swatch-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    bgColorLabel.textContent = 'Transparent';
    updateSettingsBadge();
    renderAllSizes();
    showToast('Tool reset');
  });

  // Handlers
  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }

  function processFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG, JPG, WebP, SVG, GIF, BMP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        sourceImage = img;
        if (sourceMetaBadge) sourceMetaBadge.textContent = `${img.naturalWidth}×${img.naturalHeight} px`;
        if (previewStatusBadge) previewStatusBadge.textContent = 'Live Ready';
        renderAllSizes();
        showToast('Image loaded successfully');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderFaviconToCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw Corner Radius Clip
    const radius = (cornerRadiusPct / 100) * (size / 2);
    if (radius > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, radius);
      ctx.clip();
    }

    // Fill background
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    }

    if (!sourceImage) return canvas;

    // Apply Padding
    const padPx = (paddingPct / 100) * size;
    const targetW = size - (padPx * 2);
    const targetH = size - (padPx * 2);

    const sw = sourceImage.naturalWidth || sourceImage.width;
    const sh = sourceImage.naturalHeight || sourceImage.height;

    let dx, dy, dw, dh;

    if (fitMode === 'contain') {
      const ratio = Math.min(targetW / sw, targetH / sh);
      dw = sw * ratio;
      dh = sh * ratio;
      dx = padPx + (targetW - dw) / 2;
      dy = padPx + (targetH - dh) / 2;
      ctx.drawImage(sourceImage, dx, dy, dw, dh);
    } else if (fitMode === 'cover') {
      const ratio = Math.max(targetW / sw, targetH / sh);
      const cropW = targetW / ratio;
      const cropH = targetH / ratio;
      const sx = (sw - cropW) / 2;
      const sy = (sh - cropH) / 2;
      ctx.drawImage(sourceImage, sx, sy, cropW, cropH, padPx, padPx, targetW, targetH);
    } else {
      // Stretch
      ctx.drawImage(sourceImage, padPx, padPx, targetW, targetH);
    }

    return canvas;
  }

  function renderAllSizes() {
    const sizes = [16, 32, 48, 64, 128, 180, 192, 512];
    sizes.forEach(sz => {
      const cvs = renderFaviconToCanvas(sz);
      renderedCanvases[sz] = cvs;
      const dataUrl = cvs.toDataURL('image/png');

      if (sizeImgs[sz]) {
        sizeImgs[sz].src = dataUrl;
      }
    });

    // Update live contextual previews
    const url32 = renderedCanvases[32].toDataURL('image/png');
    const url180 = renderedCanvases[180].toDataURL('image/png');

    tabPreviewImg.src = url32;
    tabMainPreviewImg.src = url32;
    mobilePreviewImg.src = url180;
    serpPreviewImg.src = url32;
  }

  /* Designed by Kapil Pidhwani: Pure Client-Side Binary Windows .ICO File Generator */
  async function generateIcoBlob() {
    const icoSizes = [16, 32, 48];
    const pngBlobs = await Promise.all(icoSizes.map(sz => {
      return new Promise(resolve => renderedCanvases[sz].toBlob(resolve, 'image/png'));
    }));

    const pngBuffers = await Promise.all(pngBlobs.map(b => b.arrayBuffer()));

    // Calculate Header & Entries size
    const numImages = icoSizes.length;
    const headerSize = 6;
    const entrySize = 16;
    const dirSize = headerSize + (numImages * entrySize);

    let totalSize = dirSize;
    pngBuffers.forEach(buf => totalSize += buf.byteLength);

    const icoBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(icoBuffer);
    const uint8 = new Uint8Array(icoBuffer);

    // 1. ICONDIR Header
    view.setUint16(0, 0, true); // Reserved (must be 0)
    view.setUint16(2, 1, true); // Type (1 = ICO)
    view.setUint16(4, numImages, true); // Image count

    // 2. ICONDIRENTRY Structures
    let currentOffset = dirSize;
    for (let i = 0; i < numImages; i++) {
      const sz = icoSizes[i];
      const pngBytes = new Uint8Array(pngBuffers[i]);
      const entryOffset = headerSize + (i * entrySize);

      view.setUint8(entryOffset + 0, sz >= 256 ? 0 : sz); // Width
      view.setUint8(entryOffset + 1, sz >= 256 ? 0 : sz); // Height
      view.setUint8(entryOffset + 2, 0); // Color palette
      view.setUint8(entryOffset + 3, 0); // Reserved
      view.setUint16(entryOffset + 4, 1, true); // Color planes
      view.setUint16(entryOffset + 6, 32, true); // Bits per pixel
      view.setUint32(entryOffset + 8, pngBytes.length, true); // Image data length
      view.setUint32(entryOffset + 12, currentOffset, true); // Image data offset

      // Copy PNG bytes into icoBuffer
      uint8.set(pngBytes, currentOffset);
      currentOffset += pngBytes.length;
    }

    return new Blob([icoBuffer], { type: 'image/x-icon' });
  }

  /* Designed by Kapil Pidhwani: Pure Client-Side ZIP Archive Generator */
  async function generateZipBlob() {
    const filesToZip = [];

    // 1. Add favicon.ico
    const icoBlob = await generateIcoBlob();
    const icoBytes = new Uint8Array(await icoBlob.arrayBuffer());
    filesToZip.push({ name: 'favicon.ico', bytes: icoBytes });

    // 2. Add PNG sizes
    const exportPngSizes = [
      { sz: 16, name: 'favicon-16x16.png' },
      { sz: 32, name: 'favicon-32x32.png' },
      { sz: 48, name: 'favicon-48x48.png' },
      { sz: 180, name: 'apple-touch-icon.png' },
      { sz: 192, name: 'android-chrome-192x192.png' },
      { sz: 512, name: 'android-chrome-512x512.png' }
    ];

    for (const item of exportPngSizes) {
      const b = await new Promise(res => renderedCanvases[item.sz].toBlob(res, 'image/png'));
      const bytes = new Uint8Array(await b.arrayBuffer());
      filesToZip.push({ name: item.name, bytes });
    }

    // 3. Add site.webmanifest
    const manifestText = JSON.stringify({
      name: siteTitleInput.value.trim() || 'My Website',
      short_name: (siteTitleInput.value.trim() || 'My Website').split(' ')[0],
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
      ],
      theme_color: bgColor !== 'transparent' ? bgColor : '#ffffff',
      background_color: '#ffffff',
      display: 'standalone'
    }, null, 2);
    filesToZip.push({ name: 'site.webmanifest', bytes: new TextEncoder().encode(manifestText) });

    // 4. Add HTML Snippet instructions file
    const htmlSnippet = document.getElementById('html-snippet-display').textContent;
    filesToZip.push({ name: 'favicon-html-code.html', bytes: new TextEncoder().encode(htmlSnippet) });

    // Build ZIP buffer (Store format)
    let localHeaders = [];
    let centralHeaders = [];
    let offset = 0;

    for (const file of filesToZip) {
      const nameBytes = new TextEncoder().encode(file.name);
      const crc = calculateCRC32(file.bytes);
      const size = file.bytes.length;

      // Local File Header (30 bytes + name length)
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true); // Local header signature
      lv.setUint16(4, 10, true); // Version needed
      lv.setUint16(6, 0, true); // Flags
      lv.setUint16(8, 0, true); // Compression (0 = Store)
      lv.setUint16(10, 0, true); // Mod time
      lv.setUint16(12, 0, true); // Mod date
      lv.setUint32(14, crc, true); // CRC-32
      lv.setUint32(18, size, true); // Compressed size
      lv.setUint32(22, size, true); // Uncompressed size
      lv.setUint16(26, nameBytes.length, true); // Filename length
      lv.setUint16(28, 0, true); // Extra length
      localHeader.set(nameBytes, 30);

      localHeaders.push({ header: localHeader, data: file.bytes, offset });

      // Central Directory Header (46 bytes + name length)
      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true); // Central header signature
      cv.setUint16(4, 10, true); // Version made by
      cv.setUint16(6, 10, true); // Version needed
      cv.setUint16(8, 0, true); // Flags
      cv.setUint16(10, 0, true); // Compression (0 = Store)
      cv.setUint16(12, 0, true); // Mod time
      cv.setUint16(14, 0, true); // Mod date
      cv.setUint32(16, crc, true); // CRC-32
      cv.setUint32(20, size, true); // Compressed size
      cv.setUint32(24, size, true); // Uncompressed size
      cv.setUint16(28, nameBytes.length, true); // Filename length
      cv.setUint16(30, 0, true); // Extra field length
      cv.setUint16(32, 0, true); // Comment length
      cv.setUint16(34, 0, true); // Disk number
      cv.setUint16(36, 0, true); // Internal attributes
      cv.setUint32(38, 0, true); // External attributes
      cv.setUint32(42, offset, true); // Local header offset
      centralHeader.set(nameBytes, 46);

      centralHeaders.push(centralHeader);

      offset += localHeader.length + size;
    }

    const centralDirOffset = offset;
    let centralDirSize = 0;
    centralHeaders.forEach(c => centralDirSize += c.length);

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true); // EOCD signature
    ev.setUint16(4, 0, true); // Disk number
    ev.setUint16(6, 0, true); // Disk with central dir
    ev.setUint16(8, filesToZip.length, true); // Entries on disk
    ev.setUint16(10, filesToZip.length, true); // Total entries
    ev.setUint32(12, centralDirSize, true); // Central directory size
    ev.setUint32(16, centralDirOffset, true); // Offset of central dir
    ev.setUint16(20, 0, true); // Comment length

    // Combine into single blob
    const blobParts = [];
    localHeaders.forEach(lh => {
      blobParts.push(lh.header);
      blobParts.push(lh.data);
    });
    centralHeaders.forEach(ch => blobParts.push(ch));
    blobParts.push(eocd);

    return new Blob(blobParts, { type: 'application/zip' });
  }

  function calculateCRC32(bytes) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  // CRC32 Lookup Table
  const crcTable = (() => {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
    }
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[n] = c;
    }
    return table;
  })();

  // Download Helpers
  async function downloadIco() {
    if (!sourceImage) {
      showToast('Please upload an image first');
      return;
    }
    const blob = await generateIcoBlob();
    triggerDownload(blob, 'favicon.ico');
    showToast('Downloaded favicon.ico');
  }

  async function downloadZip() {
    if (!sourceImage) {
      showToast('Please upload an image first');
      return;
    }
    const blob = await generateZipBlob();
    triggerDownload(blob, 'toolity-favicons.zip');
    showToast('Downloaded Favicon Suite (.zip)');
  }

  function downloadSinglePng(size, filename) {
    if (!sourceImage) {
      showToast('Please upload an image first');
      return;
    }
    const cvs = renderedCanvases[size];
    if (!cvs) return;
    cvs.toBlob(blob => {
      triggerDownload(blob, filename);
      showToast(`Downloaded ${filename}`);
    }, 'image/png');
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

});

/* Designed by Kapil Pidhwani: QR Code Generator */
/* ==========================================================================
   Pure Vanilla Client-Side QR Generator Engine (Designed by Kapil Pidhwani)
   Zero external API calls • 100% Offline & Private • Reed-Solomon QR BitMatrix
   ========================================================================== */


// QR engine (QRCodeGenerator, QRErrorCorrectLevel) lives in /scripts/qr-engine.js, loaded before this file.

/* ==========================================================================
   QR UI Logic, Custom Drawing Engine & Multi-Format Exporters
   ========================================================================== */

let currentPayloadType = 'url';
let uploadedLogoImg = null;
let uploadedLogoSrc = null;

// State Variables for Segmented Options
let currentDotStyle = 'square';
let currentEyeStyle = 'square';
let currentMarginSize = '2';
let currentEccLevel = 'M';
let currentExportRes = '1024';
let currentBgMode = 'solid'; // 'solid' or 'transparent'

// DOM Elements
const qrRenderTarget = document.getElementById('qr-render-target');
const qrPreviewBox = document.getElementById('qr-preview-box');
const qrInputStats = document.getElementById('qr-input-stats');
const qrMatrixInfo = document.getElementById('qr-matrix-info');
const inputPaneTitle = document.getElementById('input-pane-title');
const settingsSummaryBadge = document.getElementById('settings-summary-badge');
const dlPngResBadge = document.getElementById('dl-png-res-badge');

// Colors
const colorFg = document.getElementById('qr-color-fg');
const colorBg = document.getElementById('qr-color-bg');
const fgColorPreview = document.getElementById('fg-color-preview');
const bgColorPreview = document.getElementById('bg-color-preview');
const fgHexVal = document.getElementById('fg-hex-val');
const bgHexVal = document.getElementById('bg-hex-val');

// Logo controls
const logoInput = document.getElementById('qr-logo-input');
const btnRemoveLogo = document.getElementById('btn-remove-logo');
const logoSizeSlider = document.getElementById('qr-logo-size');
const logoSizeWrap = document.getElementById('logo-size-wrap');
const logoSizeVal = document.getElementById('logo-size-val');
const logoBtnText = document.getElementById('logo-upload-btn-text');

// Input fields
const inputUrl = document.getElementById('input-url');
const inputText = document.getElementById('input-text');
const inputWifiSsid = document.getElementById('input-wifi-ssid');
const inputWifiPass = document.getElementById('input-wifi-pass');
const inputWifiEnc = document.getElementById('input-wifi-enc');
const inputWifiHidden = document.getElementById('input-wifi-hidden');
const inputVcardFirst = document.getElementById('input-vcard-first');
const inputVcardLast = document.getElementById('input-vcard-last');
const inputVcardPhone = document.getElementById('input-vcard-phone');
const inputVcardEmail = document.getElementById('input-vcard-email');
const inputVcardOrg = document.getElementById('input-vcard-org');
const inputVcardUrl = document.getElementById('input-vcard-url');
const inputEmailTo = document.getElementById('input-email-to');
const inputEmailSub = document.getElementById('input-email-sub');
const inputEmailBody = document.getElementById('input-email-body');
const inputPhoneNum = document.getElementById('input-phone-num');
const inputPhoneSms = document.getElementById('input-phone-sms');

// Helper: Bind Segmented Group Button switching
function initSegmentedGroup(containerId, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.seg-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.seg-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.val);
    });
  });
}

// Initialize Segmented Controls
initSegmentedGroup('seg-dot-style', (val) => { currentDotStyle = val; generateQR(); });
initSegmentedGroup('seg-eye-style', (val) => { currentEyeStyle = val; generateQR(); });
initSegmentedGroup('seg-margin-size', (val) => { currentMarginSize = val; generateQR(); });
initSegmentedGroup('seg-ecc-level', (val) => { currentEccLevel = val; generateQR(); });
initSegmentedGroup('seg-export-res', (val) => {
  currentExportRes = val;
  if (dlPngResBadge) dlPngResBadge.textContent = `${val}px`;
  generateQR();
});
initSegmentedGroup('seg-transparency', (val) => { currentBgMode = val; generateQR(); });

// Set Error Correction programmatically
function setEccLevelActive(level) {
  currentEccLevel = level;
  const seg = document.getElementById('seg-ecc-level');
  if (seg) {
    seg.querySelectorAll('.seg-pill').forEach(b => {
      b.classList.toggle('active', b.dataset.val === level);
    });
  }
}

// Payload Mode Titles Map
const modeTitles = {
  'url': 'Website URL or Link',
  'text': 'Plain Text Payload',
  'wifi': 'Wi-Fi Network Credentials',
  'vcard': 'vCard Contact Details',
  'email': 'Email Message Draft',
  'phone': 'Phone Dialer & SMS'
};

// Type Switcher
function setPayloadType(type) {
  currentPayloadType = type;
  document.querySelectorAll('#top-type-tabs .seg-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  document.querySelectorAll('.type-form-section').forEach(sec => {
    sec.style.display = (sec.id === `form-${type}`) ? 'block' : 'none';
  });
  if (inputPaneTitle) {
    inputPaneTitle.textContent = modeTitles[type] || 'Input Configuration';
  }
  generateQR();
}

document.querySelectorAll('#top-type-tabs .seg-pill').forEach(btn => {
  btn.addEventListener('click', () => setPayloadType(btn.dataset.type));
});

// Color Swatch Event Handlers
colorFg.addEventListener('input', (e) => {
  const val = e.target.value.toUpperCase();
  fgColorPreview.style.background = val;
  fgHexVal.textContent = val;
  document.querySelectorAll('.quick-palette-dot').forEach(d => d.classList.toggle('active', d.dataset.color === val));
  generateQR();
});

colorBg.addEventListener('input', (e) => {
  const val = e.target.value.toUpperCase();
  bgColorPreview.style.background = val;
  bgHexVal.textContent = val;
  generateQR();
});

document.querySelectorAll('.quick-palette-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    const c = dot.dataset.color;
    colorFg.value = c;
    fgColorPreview.style.background = c;
    fgHexVal.textContent = c.toUpperCase();
    document.querySelectorAll('.quick-palette-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    generateQR();
  });
});

// Reset / Clear Payload Action
document.getElementById('btn-clear-payload').addEventListener('click', () => {
  // Designed by Kapil Pidhwani: reset = defaults for every input and setting.
  // Defaults are re-applied by clicking the default pills so existing handlers stay the single source of truth.
  document.querySelectorAll('.type-form-section input, .type-form-section textarea').forEach(el => {
    if (el.type === 'checkbox') el.checked = false; else el.value = '';
  });
  document.querySelectorAll('.type-form-section select').forEach(el => { el.selectedIndex = 0; });
  colorFg.value = '#17191C'; colorFg.dispatchEvent(new Event('input'));
  colorBg.value = '#FFFFFF'; colorBg.dispatchEvent(new Event('input'));
  Object.entries({ 'seg-dot-style': 'square', 'seg-eye-style': 'square', 'seg-margin-size': '2', 'seg-ecc-level': 'M', 'seg-export-res': '1024', 'seg-transparency': 'solid' })
    .forEach(([id, val]) => document.querySelector(`#${id} .seg-pill[data-val="${val}"]`)?.click());
  if (uploadedLogoImg) btnRemoveLogo.click();
  setPayloadType('url');
  showToast('Reset to defaults');
});

// Single Download Dropdown Menu Logic
const dlDropdownWrap = document.getElementById('download-dropdown-wrap');
const btnDlToggle = document.getElementById('btn-download-menu-toggle');

btnDlToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = dlDropdownWrap.classList.toggle('open');
  btnDlToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!dlDropdownWrap.contains(e.target)) {
    dlDropdownWrap.classList.remove('open');
    btnDlToggle.setAttribute('aria-expanded', 'false');
  }
});

// Construct Payload String
function getPayloadString() {
  switch (currentPayloadType) {
    case 'url':
      return inputUrl.value.trim();
    case 'text':
      return inputText.value;
    case 'wifi': {
      const ssid = inputWifiSsid.value.trim();
      if (!ssid) return '';
      const pass = inputWifiPass.value;
      const enc = inputWifiEnc.value;
      const hidden = inputWifiHidden.checked;
      const esc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/:/g, '\\:').replace(/,/g, '\\,');
      return `WIFI:T:${enc};S:${esc(ssid)};P:${esc(pass)};H:${hidden ? 'true' : 'false'};;`;
    }
    case 'vcard': {
      const first = inputVcardFirst.value.trim();
      const last = inputVcardLast.value.trim();
      const fullName = (first || last) ? `${first} ${last}`.trim() : '';
      const phone = inputVcardPhone.value.trim();
      const email = inputVcardEmail.value.trim();
      const org = inputVcardOrg.value.trim();
      const url = inputVcardUrl.value.trim();
      if (!fullName && !phone && !email && !org && !url) return '';
      let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
      if (fullName) {
        vcard += `N:${last};${first};;;\n`;
        vcard += `FN:${fullName}\n`;
      }
      if (org) vcard += `ORG:${org}\n`;
      if (phone) vcard += `TEL;TYPE=CELL:${phone}\n`;
      if (email) vcard += `EMAIL:${email}\n`;
      if (url) vcard += `URL:${url}\n`;
      vcard += 'END:VCARD';
      return vcard;
    }
    case 'email': {
      const to = inputEmailTo.value.trim();
      if (!to) return '';
      const sub = encodeURIComponent(inputEmailSub.value.trim());
      const body = encodeURIComponent(inputEmailBody.value.trim());
      let mailto = `mailto:${to}`;
      const params = [];
      if (sub) params.push(`subject=${sub}`);
      if (body) params.push(`body=${body}`);
      if (params.length) mailto += `?${params.join('&')}`;
      return mailto;
    }
    case 'phone': {
      const num = inputPhoneNum.value.trim();
      if (!num) return '';
      const sms = inputPhoneSms.value.trim();
      if (sms) {
        return `SMSTO:${num}:${sms}`;
      }
      return `tel:${num}`;
    }
    default:
      return '';
  }
}

// Helper: Check if cell is part of Finder Pattern (Top-Left, Top-Right, Bottom-Left 7x7)
function isFinderEye(row, col, N) {
  if (row < 7 && col < 7) return true;
  if (row < 7 && col >= N - 7) return true;
  if (row >= N - 7 && col < 7) return true;
  return false;
}

// Intelligent Logo Dot Clearance: Check if cell is inside the protected center logo quiet-zone
function isLogoQuietZone(row, col, N, options) {
  if (!options.hasLogo) return false;
  const logoRatio = (options.logoSize || 20) / 100;
  const logoSpanModules = N * logoRatio;
  const clearanceRadius = (logoSpanModules / 2) + 0.8;
  const center = (N - 1) / 2;
  return Math.abs(row - center) <= clearanceRadius && Math.abs(col - center) <= clearanceRadius;
}

// Render QR Code onto Canvas with Dot Clearance & Logo Shield
function renderQRToCanvas(qr, targetSize, options) {
  const N = qr.getModuleCount();
  const marginModules = parseInt(options.margin, 10);
  const totalModules = N + marginModules * 2;
  const cellSize = targetSize / totalModules;

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');

  // 1. Background Fill
  if (!options.isTransparent) {
    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, targetSize, targetSize);
  } else {
    ctx.clearRect(0, 0, targetSize, targetSize);
  }

  ctx.fillStyle = options.fgColor;

  // 2. Draw 3 Finder Corner Eyes
  const drawEye = (startRow, startCol) => {
    const eyeX = (startCol + marginModules) * cellSize;
    const eyeY = (startRow + marginModules) * cellSize;
    const eyeSize = 7 * cellSize;

    if (options.eyeStyle === 'circle') {
      ctx.beginPath();
      ctx.arc(eyeX + eyeSize / 2, eyeY + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
      ctx.arc(eyeX + eyeSize / 2, eyeY + eyeSize / 2, eyeSize / 2 - cellSize, 0, Math.PI * 2, true);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(eyeX + eyeSize / 2, eyeY + eyeSize / 2, 1.5 * cellSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (options.eyeStyle === 'rounded') {
      const rOuter = cellSize * 1.8;
      ctx.beginPath();
      ctx.roundRect(eyeX, eyeY, eyeSize, eyeSize, rOuter);
      ctx.fill();

      if (!options.isTransparent) {
        ctx.fillStyle = options.bgColor;
      } else {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.beginPath();
      ctx.roundRect(eyeX + cellSize, eyeY + cellSize, 5 * cellSize, 5 * cellSize, rOuter * 0.7);
      ctx.fill();

      if (options.isTransparent) ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = options.fgColor;

      ctx.beginPath();
      ctx.roundRect(eyeX + 2 * cellSize, eyeY + 2 * cellSize, 3 * cellSize, 3 * cellSize, cellSize * 0.8);
      ctx.fill();
    } else {
      ctx.fillRect(eyeX, eyeY, eyeSize, eyeSize);
      if (!options.isTransparent) {
        ctx.fillStyle = options.bgColor;
      } else {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.fillRect(eyeX + cellSize, eyeY + cellSize, 5 * cellSize, 5 * cellSize);

      if (options.isTransparent) ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = options.fgColor;

      ctx.fillRect(eyeX + 2 * cellSize, eyeY + 2 * cellSize, 3 * cellSize, 3 * cellSize);
    }
  };

  drawEye(0, 0);
  drawEye(0, N - 7);
  drawEye(N - 7, 0);

  // 3. Draw Data Modules (Excluding Finder Eyes AND Logo Quiet-Zone)
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isFinderEye(r, c, N)) continue;
      if (isLogoQuietZone(r, c, N, options)) continue; // Suppress dots under logo!

      if (qr.isDark(r, c)) {
        const x = (c + marginModules) * cellSize;
        const y = (r + marginModules) * cellSize;

        if (options.dotStyle === 'rounded') {
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.44, 0, Math.PI * 2);
          ctx.fill();
        } else if (options.dotStyle === 'smooth') {
          ctx.beginPath();
          ctx.roundRect(x + cellSize * 0.06, y + cellSize * 0.06, cellSize * 0.88, cellSize * 0.88, cellSize * 0.35);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, cellSize + 0.3, cellSize + 0.3);
        }
      }
    }
  }

  // 4. Draw Center Brand Logo on Clean Floating Badge
  if (options.logoImg) {
    const logoRatio = (options.logoSize || 20) / 100;
    const logoBoxSize = targetSize * logoRatio;
    const logoX = (targetSize - logoBoxSize) / 2;
    const logoY = (targetSize - logoBoxSize) / 2;
    const badgePadding = cellSize * 0.7;
    const badgeRadius = cellSize * 1.5;

    // Protective Plate Shield
    ctx.fillStyle = options.isTransparent ? '#FFFFFF' : options.bgColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = targetSize * 0.015;
    ctx.shadowOffsetY = targetSize * 0.005;

    ctx.beginPath();
    ctx.roundRect(logoX - badgePadding, logoY - badgePadding, logoBoxSize + badgePadding * 2, logoBoxSize + badgePadding * 2, badgeRadius);
    ctx.fill();

    // Subtle Plate Border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = options.isTransparent ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = Math.max(1, targetSize * 0.002);
    ctx.stroke();

    // Draw Image
    try {
      ctx.drawImage(options.logoImg, logoX, logoY, logoBoxSize, logoBoxSize);
    } catch (e) {
      console.error("Failed drawing logo image onto canvas", e);
    }
  }

  return canvas;
}

// Generate Vector SVG Markup String with Quiet-Zone Clearance
function generateVectorSVG(qr, options) {
  const N = qr.getModuleCount();
  const marginModules = parseInt(options.margin, 10);
  const totalModules = N + marginModules * 2;
  const size = 1000;
  const cellSize = size / totalModules;

  const fg = options.fgColor;
  const bg = options.isTransparent ? 'none' : options.bgColor;

  // Finder Eyes
  const makeSvgEye = (startRow, startCol) => {
    const eyeX = (startCol + marginModules) * cellSize;
    const eyeY = (startRow + marginModules) * cellSize;
    const eyeSize = 7 * cellSize;

    if (options.eyeStyle === 'circle') {
      return `
        <circle cx="${eyeX + eyeSize / 2}" cy="${eyeY + eyeSize / 2}" r="${eyeSize / 2}" fill="${fg}"/>
        <circle cx="${eyeX + eyeSize / 2}" cy="${eyeY + eyeSize / 2}" r="${eyeSize / 2 - cellSize}" fill="${options.isTransparent ? '#ffffff' : bg}"/>
        <circle cx="${eyeX + eyeSize / 2}" cy="${eyeY + eyeSize / 2}" r="${1.5 * cellSize}" fill="${fg}"/>
      `;
    } else if (options.eyeStyle === 'rounded') {
      const rOuter = cellSize * 1.8;
      return `
        <rect x="${eyeX}" y="${eyeY}" width="${eyeSize}" height="${eyeSize}" rx="${rOuter}" fill="${fg}"/>
        <rect x="${eyeX + cellSize}" y="${eyeY + cellSize}" width="${5 * cellSize}" height="${5 * cellSize}" rx="${rOuter * 0.7}" fill="${options.isTransparent ? '#ffffff' : bg}"/>
        <rect x="${eyeX + 2 * cellSize}" y="${eyeY + 2 * cellSize}" width="${3 * cellSize}" height="${3 * cellSize}" rx="${cellSize * 0.8}" fill="${fg}"/>
      `;
    } else {
      return `
        <rect x="${eyeX}" y="${eyeY}" width="${eyeSize}" height="${eyeSize}" fill="${fg}"/>
        <rect x="${eyeX + cellSize}" y="${eyeY + cellSize}" width="${5 * cellSize}" height="${5 * cellSize}" fill="${options.isTransparent ? '#ffffff' : bg}"/>
        <rect x="${eyeX + 2 * cellSize}" y="${eyeY + 2 * cellSize}" width="${3 * cellSize}" height="${3 * cellSize}" fill="${fg}"/>
      `;
    }
  };

  const eyesSvg = makeSvgEye(0, 0) + makeSvgEye(0, N - 7) + makeSvgEye(N - 7, 0);

  // Data Modules (Suppressed around logo)
  let modulesSvg = '';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isFinderEye(r, c, N)) continue;
      if (isLogoQuietZone(r, c, N, options)) continue;

      if (qr.isDark(r, c)) {
        const x = (c + marginModules) * cellSize;
        const y = (r + marginModules) * cellSize;

        if (options.dotStyle === 'rounded') {
          modulesSvg += `<circle cx="${x + cellSize / 2}" cy="${y + cellSize / 2}" r="${cellSize * 0.44}" fill="${fg}"/>`;
        } else if (options.dotStyle === 'smooth') {
          modulesSvg += `<rect x="${x + cellSize * 0.06}" y="${y + cellSize * 0.06}" width="${cellSize * 0.88}" height="${cellSize * 0.88}" rx="${cellSize * 0.35}" fill="${fg}"/>`;
        } else {
          modulesSvg += `<rect x="${x}" y="${y}" width="${cellSize + 0.1}" height="${cellSize + 0.1}" fill="${fg}"/>`;
        }
      }
    }
  }

  // Center Logo
  let logoSvg = '';
  if (options.logoSrc) {
    const logoRatio = (options.logoSize || 20) / 100;
    const logoBoxSize = size * logoRatio;
    const logoX = (size - logoBoxSize) / 2;
    const logoY = (size - logoBoxSize) / 2;
    const badgePadding = cellSize * 0.7;
    const badgeRadius = cellSize * 1.5;

    logoSvg = `
      <rect x="${logoX - badgePadding}" y="${logoY - badgePadding}" width="${logoBoxSize + badgePadding * 2}" height="${logoBoxSize + badgePadding * 2}" rx="${badgeRadius}" fill="${options.isTransparent ? '#ffffff' : bg}" stroke="rgba(0,0,0,0.06)" stroke-width="${size * 0.002}"/>
      <image href="${options.logoSrc}" x="${logoX}" y="${logoY}" width="${logoBoxSize}" height="${logoBoxSize}" preserveAspectRatio="xMidYMid meet"/>
    `;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${!options.isTransparent ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}
  ${eyesSvg}
  ${modulesSvg}
  ${logoSvg}
</svg>`;
}

// Main Reactive Generation Function
function generateQR() {
  const payload = getPayloadString();
  qrInputStats.textContent = `${payload.length} chars`;

  const dotName = currentDotStyle.charAt(0).toUpperCase() + currentDotStyle.slice(1);
  const isTrans = currentBgMode === 'transparent';
  settingsSummaryBadge.textContent = `(${dotName} Dots • ECC ${currentEccLevel} • ${currentExportRes}px)`;

  qrPreviewBox.classList.toggle('transparent-bg', isTrans);

  if (!payload) {
    qrRenderTarget.innerHTML = `
      <div class="pane-empty">
        <iconify-icon icon="lucide:qr-code"></iconify-icon>
        <span>Enter content to render QR code</span>
      </div>`;
    qrMatrixInfo.textContent = 'Waiting for input';
    qrMatrixInfo.style.color = 'var(--text-muted)';
    return;
  }

  try {
    const ecc = QRErrorCorrectLevel[currentEccLevel] || QRErrorCorrectLevel.M;
    const qr = new QRCodeGenerator(0, ecc);
    qr.addData(payload);
    qr.make();

    const renderOptions = {
      fgColor: colorFg.value,
      bgColor: colorBg.value,
      isTransparent: isTrans,
      dotStyle: currentDotStyle,
      eyeStyle: currentEyeStyle,
      margin: currentMarginSize,
      hasLogo: Boolean(uploadedLogoImg),
      logoImg: uploadedLogoImg,
      logoSrc: uploadedLogoSrc,
      logoSize: parseInt(logoSizeSlider.value, 10)
    };

    const previewCanvas = renderQRToCanvas(qr, 512, renderOptions);
    previewCanvas.style.width = '100%';
    previewCanvas.style.height = '100%';
    previewCanvas.style.display = 'block';

    qrRenderTarget.innerHTML = '';
    qrRenderTarget.appendChild(previewCanvas);

    qrMatrixInfo.textContent = `Version ${qr.typeNumber} (${qr.getModuleCount()}x${qr.getModuleCount()}) • Ready to Scan`;
    qrMatrixInfo.style.color = '#10B981';

  } catch (err) {
    console.error(err);
    qrRenderTarget.innerHTML = `
      <div class="qr-overflow-error">
        <strong>Payload Overflow</strong><br>
        Content is too large for the selected error correction level.
      </div>`;
    qrMatrixInfo.textContent = 'Payload Overflow';
    qrMatrixInfo.style.color = '#EF4444';
  }
}

// Logo Upload Handlers
logoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    uploadedLogoSrc = event.target.result;
    const img = new Image();
    img.onload = () => {
      uploadedLogoImg = img;
      btnRemoveLogo.style.display = 'inline-flex';
      logoSizeWrap.style.display = 'inline-flex';
      logoBtnText.textContent = file.name.length > 14 ? file.name.substring(0, 11) + '...' : file.name;
      setEccLevelActive('H');
      showToast('Logo added with automatic quiet-zone clearance');
      generateQR();
    };
    img.src = uploadedLogoSrc;
  };
  reader.readAsDataURL(file);
});

btnRemoveLogo.addEventListener('click', () => {
  uploadedLogoImg = null;
  uploadedLogoSrc = null;
  logoInput.value = '';
  btnRemoveLogo.style.display = 'none';
  logoSizeWrap.style.display = 'none';
  logoBtnText.textContent = 'Choose Logo Image';
  generateQR();
  showToast('Logo removed');
});

logoSizeSlider.addEventListener('input', (e) => {
  logoSizeVal.textContent = `${e.target.value}%`;
  generateQR();
});

// Event Listeners for Live Reactive Inputs
[inputUrl, inputText, inputWifiSsid, inputWifiPass, inputWifiEnc, inputWifiHidden,
  inputVcardFirst, inputVcardLast, inputVcardPhone, inputVcardEmail, inputVcardOrg, inputVcardUrl,
  inputEmailTo, inputEmailSub, inputEmailBody, inputPhoneNum, inputPhoneSms
].forEach(el => {
  if (el) {
    el.addEventListener('input', generateQR);
    el.addEventListener('change', generateQR);
  }
});

// Export Helpers
function getExportCanvas() {
  const payload = getPayloadString();
  if (!payload) return null;
  const ecc = QRErrorCorrectLevel[currentEccLevel] || QRErrorCorrectLevel.M;
  const qr = new QRCodeGenerator(0, ecc);
  qr.addData(payload);
  qr.make();

  const targetRes = parseInt(currentExportRes, 10) || 1024;
  return renderQRToCanvas(qr, targetRes, {
    fgColor: colorFg.value,
    bgColor: colorBg.value,
    isTransparent: currentBgMode === 'transparent',
    dotStyle: currentDotStyle,
    eyeStyle: currentEyeStyle,
    margin: currentMarginSize,
    hasLogo: Boolean(uploadedLogoImg),
    logoImg: uploadedLogoImg,
    logoSrc: uploadedLogoSrc,
    logoSize: parseInt(logoSizeSlider.value, 10)
  });
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// 1. Download PNG
function downloadPNG() {
  const canvas = getExportCanvas();
  if (!canvas) return showToast('No QR code to download');
  canvas.toBlob((blob) => {
    downloadBlob(blob, `toolity-qr-${currentExportRes}px.png`);
    showToast(`Downloaded ${currentExportRes}px PNG`);
  }, 'image/png');
}

// 2. Download SVG
function downloadSVG() {
  const payload = getPayloadString();
  if (!payload) return showToast('No QR code to download');
  const ecc = QRErrorCorrectLevel[currentEccLevel] || QRErrorCorrectLevel.M;
  const qr = new QRCodeGenerator(0, ecc);
  qr.addData(payload);
  qr.make();

  const svgString = generateVectorSVG(qr, {
    fgColor: colorFg.value,
    bgColor: colorBg.value,
    isTransparent: currentBgMode === 'transparent',
    dotStyle: currentDotStyle,
    eyeStyle: currentEyeStyle,
    margin: currentMarginSize,
    hasLogo: Boolean(uploadedLogoImg),
    logoSrc: uploadedLogoSrc,
    logoSize: parseInt(logoSizeSlider.value, 10)
  });

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, 'toolity-qr-vector.svg');
  showToast('Downloaded Vector SVG');
}

// 3. Download WebP
function downloadWebP() {
  const canvas = getExportCanvas();
  if (!canvas) return showToast('No QR code to download');
  canvas.toBlob((blob) => {
    downloadBlob(blob, `toolity-qr-${currentExportRes}px.webp`);
    showToast('Downloaded WebP image');
  }, 'image/webp', 0.95);
}

// 4. Download JPEG
function downloadJPEG() {
  const payload = getPayloadString();
  if (!payload) return showToast('No QR code to download');
  const ecc = QRErrorCorrectLevel[currentEccLevel] || QRErrorCorrectLevel.M;
  const qr = new QRCodeGenerator(0, ecc);
  qr.addData(payload);
  qr.make();

  const targetRes = parseInt(currentExportRes, 10) || 1024;
  const canvas = renderQRToCanvas(qr, targetRes, {
    fgColor: colorFg.value,
    bgColor: currentBgMode === 'transparent' ? '#FFFFFF' : colorBg.value,
    isTransparent: false,
    dotStyle: currentDotStyle,
    eyeStyle: currentEyeStyle,
    margin: currentMarginSize,
    hasLogo: Boolean(uploadedLogoImg),
    logoImg: uploadedLogoImg,
    logoSrc: uploadedLogoSrc,
    logoSize: parseInt(logoSizeSlider.value, 10)
  });

  canvas.toBlob((blob) => {
    downloadBlob(blob, `toolity-qr-${currentExportRes}px.jpg`);
    showToast('Downloaded JPEG image');
  }, 'image/jpeg', 0.92);
}

// 5. Copy Image to Clipboard
async function copyImageToClipboard() {
  const canvas = getExportCanvas();
  if (!canvas) return showToast('No QR code to copy');

  if (!navigator.clipboard || !window.ClipboardItem) {
    return showToast('Clipboard image copy not supported in this browser');
  }

  canvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showToast('QR Code image copied to clipboard!');
    } catch (err) {
      console.error("Copy failed", err);
      showToast('Could not copy image to clipboard');
    }
  }, 'image/png');
}

// Bind Dropdown Items
document.getElementById('opt-dl-png').addEventListener('click', () => {
  dlDropdownWrap.classList.remove('open');
  downloadPNG();
});
document.getElementById('opt-dl-svg').addEventListener('click', () => {
  dlDropdownWrap.classList.remove('open');
  downloadSVG();
});
document.getElementById('opt-dl-webp').addEventListener('click', () => {
  dlDropdownWrap.classList.remove('open');
  downloadWebP();
});
document.getElementById('opt-dl-jpeg').addEventListener('click', () => {
  dlDropdownWrap.classList.remove('open');
  downloadJPEG();
});

document.getElementById('btn-copy-image').addEventListener('click', copyImageToClipboard);

// Initial Load
generateQR();

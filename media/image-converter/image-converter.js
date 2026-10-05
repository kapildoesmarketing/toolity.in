/* Designed by Kapil Pidhwani: Image Format Converter */
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropzone = document.getElementById('image-dropzone');
  const fileInput = document.getElementById('image-file-input');
  const sourceImgElement = document.getElementById('source-img-element');
  const sourceMetaBadge = document.getElementById('source-meta-badge');

  const outputEmptyPlaceholder = document.getElementById('output-empty-placeholder');
  const outputImgElement = document.getElementById('output-img-element');
  const outputStatusBadge = document.getElementById('output-status-badge');
  const settingsSummaryBadge = document.getElementById('settings-summary-badge');

  const btnConvert = document.getElementById('btn-convert-action');
  const btnConvertIcon = document.getElementById('btn-convert-icon');
  const btnConvertLabel = document.getElementById('btn-convert-label');
  const slimProgressBar = document.getElementById('slim-progress-bar');
  const slimProgressFill = document.getElementById('slim-progress-fill');

  const btnReset = document.getElementById('btn-reset-tool');
  const btnCopy = document.getElementById('btn-copy-img');
  const btnDownload = document.getElementById('btn-download-img');
  const qualitySlider = document.getElementById('quality-slider');
  const qualityValBadge = document.getElementById('quality-val-badge');
  const groupQuality = document.getElementById('group-quality');

  // State
  let selectedFormat = 'webp';
  let selectedQuality = 0.90;
  let selectedScale = 1.0;
  let selectedBg = 'transparent';

  let imageFile = null;
  let sourceImageUrl = null;
  let outputUrl = null;
  let generatedBlob = null;
  let naturalWidth = 0;
  let naturalHeight = 0;
  let isConverting = false;


  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function updateSettingsSummary() {
    const fmtText = selectedFormat.toUpperCase();
    const qualText = ['jpg', 'webp', 'avif'].includes(selectedFormat) ? `${Math.round(selectedQuality * 100)}% Quality` : 'Lossless';
    const scaleText = selectedScale === 1.0 ? 'Original Size' : `${Math.round(selectedScale * 100)}% Scale`;
    const bgText = selectedBg === 'transparent' ? 'Transparent BG' : `${selectedBg.charAt(0).toUpperCase() + selectedBg.slice(1)} BG`;
    settingsSummaryBadge.textContent = `(${fmtText} • ${qualText} • ${scaleText} • ${bgText})`;

    if (groupQuality) {
      groupQuality.style.opacity = ['jpg', 'webp', 'avif'].includes(selectedFormat) ? '1' : '0.4';
    }
  }

  function selectFormat(fmt) {
    selectedFormat = fmt;
    const container = document.getElementById('seg-format');
    if (container) {
      const buttons = container.querySelectorAll('.seg-pill');
      buttons.forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-val') === fmt);
      });
    }
    updateSettingsSummary();
  }

  function bindSegmentedPills(containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const buttons = container.querySelectorAll('.seg-pill');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        callback(btn.getAttribute('data-val'));
        updateSettingsSummary();
        if (imageFile) performImageConversion();
      });
    });
  }

  bindSegmentedPills('seg-format', (val) => { selectedFormat = val; });
  bindSegmentedPills('seg-scale', (val) => { selectedScale = parseFloat(val); });
  bindSegmentedPills('seg-bg', (val) => { selectedBg = val; });

  qualitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    selectedQuality = val / 100;
    qualityValBadge.textContent = `${val}%`;
    updateSettingsSummary();
  });

  qualitySlider.addEventListener('change', () => {
    if (imageFile) performImageConversion();
  });

  // Dropzone & File Input
  dropzone.addEventListener('click', () => fileInput.click());
  sourceImgElement.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });

  function handleImageFile(file) {
    if (!file.type.startsWith('image/') && !file.name.match(/\.(png|jpg|jpeg|webp|avif|bmp|svg|ico)$/i)) {
      showToast('Please select a valid image file');
      return;
    }

    imageFile = file;
    if (sourceImageUrl) URL.revokeObjectURL(sourceImageUrl);
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }

    sourceImageUrl = URL.createObjectURL(file);
    sourceImgElement.src = sourceImageUrl;

    sourceImgElement.onload = () => {
      naturalWidth = sourceImgElement.naturalWidth || 800;
      naturalHeight = sourceImgElement.naturalHeight || 600;

      const rawExt = (file.name.split('.').pop() || '').toLowerCase();
      sourceMetaBadge.textContent = `${naturalWidth}×${naturalHeight} • ${rawExt.toUpperCase()} • ${formatBytes(file.size)}`;

      dropzone.style.display = 'none';
      sourceImgElement.style.display = 'block';
      sourceImgElement.style.cursor = 'pointer';
      sourceImgElement.title = 'Click to change image';
      btnConvert.disabled = false;

      // Auto-select alternative target format for optimal UX
      if (rawExt === 'png') {
        selectFormat('webp');
      } else if (rawExt === 'jpg' || rawExt === 'jpeg') {
        selectFormat('png');
      } else if (rawExt === 'webp') {
        selectFormat('jpg');
      } else {
        selectFormat('png');
      }

      showToast(`Loaded ${file.name} (${naturalWidth}×${naturalHeight})`);
      performImageConversion();
    };
  }

  // Convert Image via Canvas
  async function performImageConversion() {
    if (!imageFile || isConverting) return;

    isConverting = true;
    btnConvert.disabled = true;
    btnConvertIcon.setAttribute('icon', 'lucide:loader-2');
    btnConvertLabel.textContent = 'Converting...';
    slimProgressBar.classList.add('active');
    slimProgressFill.style.width = '40%';
    outputStatusBadge.textContent = 'Processing...';

    try {
      const targetW = Math.max(1, Math.round(naturalWidth * selectedScale));
      const targetH = Math.max(1, Math.round(naturalHeight * selectedScale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      // Handle background fill
      if (selectedBg === 'white') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
      } else if (selectedBg === 'black') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetW, targetH);
      } else if (selectedFormat === 'jpg') {
        // JPG does not support alpha, default fill to white if transparent selected
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
      }

      ctx.drawImage(sourceImgElement, 0, 0, targetW, targetH);
      slimProgressFill.style.width = '80%';

      // Determine target MIME
      let mimeType = 'image/png';
      if (selectedFormat === 'webp') mimeType = 'image/webp';
      else if (selectedFormat === 'jpg') mimeType = 'image/jpeg';
      else if (selectedFormat === 'avif') mimeType = 'image/avif';
      else if (selectedFormat === 'bmp') mimeType = 'image/bmp';
      else if (selectedFormat === 'ico') mimeType = 'image/x-icon';

      generatedBlob = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to PNG if browser doesn't support specific mimeType (e.g. AVIF/BMP)
            canvas.toBlob((fallbackBlob) => resolve(fallbackBlob), 'image/png');
          }
        }, mimeType, selectedQuality);
      });

      if (outputUrl) URL.revokeObjectURL(outputUrl);
      outputUrl = URL.createObjectURL(generatedBlob);

      outputEmptyPlaceholder.style.display = 'none';
      outputImgElement.src = outputUrl;
      outputImgElement.style.display = 'block';

      // Calculate file size difference percentage
      const diff = ((generatedBlob.size - imageFile.size) / imageFile.size) * 100;
      const diffText = diff < 0 ? ` (${Math.round(diff)}%)` : ` (+${Math.round(diff)}%)`;

      outputStatusBadge.textContent = `${selectedFormat.toUpperCase()} • ${formatBytes(generatedBlob.size)}${diffText}`;
      slimProgressFill.style.width = '100%';
      btnCopy.disabled = false;
      btnDownload.disabled = false;

      showToast(`Converted to ${selectedFormat.toUpperCase()} • ${formatBytes(generatedBlob.size)}`);
    } catch (err) {
      console.error('Image conversion error:', err);
      outputStatusBadge.textContent = 'Conversion Error';
      showToast('Image conversion failed');
    } finally {
      isConverting = false;
      btnConvert.disabled = false;
      btnConvertIcon.setAttribute('icon', 'lucide:refresh-cw');
      btnConvertLabel.textContent = 'Convert Image';
      setTimeout(() => {
        slimProgressBar.classList.remove('active');
        slimProgressFill.style.width = '0%';
      }, 600);
    }
  }

  btnConvert.addEventListener('click', performImageConversion);

  // Download Converted Image
  btnDownload.addEventListener('click', () => {
    if (!generatedBlob) return;
    const a = document.createElement('a');
    const baseName = imageFile ? imageFile.name.replace(/\.[^/.]+$/, "") : "toolity-image";
    const ext = selectedFormat.toLowerCase();
    const filename = `${baseName}.${ext}`;
    a.href = URL.createObjectURL(generatedBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded ${filename}`);
  });

  // Copy Image to Clipboard
  btnCopy.addEventListener('click', async () => {
    if (!generatedBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        // Browsers universally support image/png in clipboard
        if (generatedBlob.type === 'image/png') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': generatedBlob })]);
        } else {
          // Convert to PNG blob for clipboard compatibility
          const canvas = document.createElement('canvas');
          canvas.width = outputImgElement.naturalWidth || naturalWidth;
          canvas.height = outputImgElement.naturalHeight || naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(outputImgElement, 0, 0);
          canvas.toBlob(async (pngBlob) => {
            if (pngBlob) {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
              showToast('Image copied to clipboard!');
            }
          }, 'image/png');
          return;
        }
        showToast('Image copied to clipboard!');
      } else {
        showToast('Direct image copy not supported by browser; click Download');
      }
    } catch (e) {
      console.warn('Clipboard write image failed:', e);
      showToast('Could not copy image directly; click Download instead');
    }
  });

  // Reset Tool
  btnReset.addEventListener('click', () => {
    if (sourceImageUrl) URL.revokeObjectURL(sourceImageUrl);
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }

    imageFile = null;
    sourceImageUrl = null;
    generatedBlob = null;

    fileInput.value = '';
    sourceImgElement.src = '';
    sourceImgElement.style.display = 'none';
    dropzone.style.display = 'flex';
    sourceMetaBadge.textContent = 'No image loaded';

    outputImgElement.src = '';
    outputImgElement.style.display = 'none';
    outputEmptyPlaceholder.style.display = 'flex';
    outputStatusBadge.textContent = 'Awaiting Image';

    btnConvert.disabled = true;
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    slimProgressBar.classList.remove('active');

    showToast('Tool reset');
  });
});

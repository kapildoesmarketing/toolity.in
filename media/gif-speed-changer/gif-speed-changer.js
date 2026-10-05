/* Designed by Kapil Pidhwani: GIF Speed Changer */
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Left Pane (Source)
  const dropzone = document.getElementById('gif-dropzone');
  const fileInput = document.getElementById('gif-file-input');
  const srcGifImg = document.getElementById('src-gif-img');
  const srcGifBadge = document.getElementById('src-gif-badge');
  const srcFramesStat = document.getElementById('src-frames-stat');
  const srcDimsStat = document.getElementById('src-dims-stat');
  const srcDurationStat = document.getElementById('src-duration-stat');
  const srcSpeedStat = document.getElementById('src-speed-stat');

  // DOM Elements - Right Pane (Output)
  const resultPlaceholder = document.getElementById('result-empty-placeholder');
  const resultGifImg = document.getElementById('result-gif-img');
  const resultGifBadge = document.getElementById('result-gif-badge');
  const slimProgressBar = document.getElementById('slim-progress-bar');
  const slimProgressFill = document.getElementById('slim-progress-fill');
  const resultSizeStat = document.getElementById('result-size-stat');
  const resultDimsStat = document.getElementById('result-dims-stat');
  const resultDurationStat = document.getElementById('result-duration-stat');
  const resultMultiplierStat = document.getElementById('result-multiplier-stat');

  // Top Toolbar Buttons
  const btnReset = document.getElementById('btn-reset-tool');
  const btnProcess = document.getElementById('btn-process-gif');
  const btnProcessIcon = document.getElementById('btn-process-icon');
  const btnProcessLabel = document.getElementById('btn-process-label');
  const btnCopy = document.getElementById('btn-copy-gif');
  const btnDownload = document.getElementById('btn-download-gif');

  // Settings Controls
  const settingsSummaryBadge = document.getElementById('settings-summary-badge');

  // Internal State
  let selectedSpeed = 2.0;
  let selectedWidth = 'original';
  let selectedQuality = 5;

  let rawFile = null;
  let rawArrayBuffer = null;
  let srcObjectUrl = null;
  let decodedFrames = []; // Array of { canvas, durationMs, width, height }
  let originalTotalDurationMs = 0;
  let naturalWidth = 0;
  let naturalHeight = 0;

  let generatedGifBlob = null;
  let isProcessing = false;


  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function updateSettingsSummary() {
    const wText = selectedWidth === 'original' ? 'Original Dims' : `${selectedWidth}px Max`;
    const qText = selectedQuality === 1 ? 'High Quality' : selectedQuality === 5 ? 'Balanced' : 'Fast';
    settingsSummaryBadge.textContent = `(${selectedSpeed.toFixed(2)}× Speed • ${wText} • ${qText})`;
  }

  // 1. Bind Speed Presets
  const presetButtons = document.querySelectorAll('#seg-speed-presets .seg-pill');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSpeed = parseFloat(btn.getAttribute('data-val'));
      updateSettingsSummary();
      updatePredictedStats();
    });
  });

  // 3. Bind Segmented Control Options
  function bindSegmentedGroup(containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const buttons = container.querySelectorAll('.seg-pill');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        callback(btn.getAttribute('data-val'));
        updateSettingsSummary();
      });
    });
  }

  bindSegmentedGroup('seg-width', val => { selectedWidth = val === 'original' ? 'original' : parseInt(val, 10); });
  bindSegmentedGroup('seg-quality', val => { selectedQuality = parseInt(val, 10); });

  function updatePredictedStats() {
    if (decodedFrames.length > 0 && originalTotalDurationMs > 0) {
      const newDurSec = (originalTotalDurationMs / 1000) / selectedSpeed;
      resultDurationStat.textContent = `~${newDurSec.toFixed(2)}s Duration`;
      resultMultiplierStat.textContent = `${selectedSpeed.toFixed(2)}× Speed`;
    }
  }

  // 4. File Drag & Drop Handling
  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(ev => {
    dropzone.addEventListener(ev, e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(ev => {
    dropzone.addEventListener(ev, e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleGifFile(files[0]);
    }
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files.length > 0) {
      handleGifFile(e.target.files[0]);
    }
  });

  async function handleGifFile(file) {
    if (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif')) {
      showToast('Please upload a valid animated GIF file (.gif)');
      return;
    }

    rawFile = file;
    srcGifBadge.textContent = 'Decoding GIF...';
    showToast('Reading and decoding GIF frames in browser...');

    if (srcObjectUrl) URL.revokeObjectURL(srcObjectUrl);
    srcObjectUrl = URL.createObjectURL(file);

    srcGifImg.src = srcObjectUrl;
    dropzone.style.display = 'none';
    srcGifImg.style.display = 'block';

    try {
      rawArrayBuffer = await file.arrayBuffer();
      await decodeGifFrames(rawArrayBuffer);

      srcGifBadge.textContent = `${formatBytes(file.size)} • ${decodedFrames.length} Frames`;
      srcFramesStat.textContent = `${decodedFrames.length} Frames`;
      srcDimsStat.textContent = `${naturalWidth} × ${naturalHeight} px`;
      srcDurationStat.textContent = `${(originalTotalDurationMs / 1000).toFixed(2)}s Duration`;
      srcSpeedStat.textContent = '1.0× Native';

      btnProcess.disabled = false;
      resultGifBadge.textContent = 'Ready to Process';
      updatePredictedStats();

      showToast(`GIF loaded: ${decodedFrames.length} frames, ${naturalWidth}×${naturalHeight}px`);
    } catch (err) {
      console.error('GIF decoding error:', err);
      srcGifBadge.textContent = 'Decode Error';
      showToast('Failed to decode GIF frames. File might be corrupted.');
    }
  }

  /**
   * Deisgned by Kapil Pidhwani: High-Performance Multi-API GIF Frame Decoder
   * Utilizes native WebCodecs ImageDecoder with transparent fallback to gifuct-js.
   */
  async function decodeGifFrames(arrayBuffer) {
    decodedFrames = [];
    originalTotalDurationMs = 0;

    if (typeof window.ImageDecoder !== 'undefined') {
      try {
        const decoder = new ImageDecoder({
          data: arrayBuffer,
          type: 'image/gif'
        });

        await decoder.tracks.ready;
        const track = decoder.tracks.selectedTrack;
        const frameCount = track.frameCount;

        for (let i = 0; i < frameCount; i++) {
          const result = await decoder.decode({ frameIndex: i });
          const frame = result.image;
          const w = frame.displayWidth;
          const h = frame.displayHeight;

          if (i === 0) {
            naturalWidth = w;
            naturalHeight = h;
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(frame, 0, 0);

          const durationMs = (frame.duration || 100000) / 1000;
          originalTotalDurationMs += durationMs;

          decodedFrames.push({
            canvas: canvas,
            durationMs: durationMs,
            width: w,
            height: h
          });

          frame.close();
        }

        if (decodedFrames.length > 0) return;
      } catch (e) {
        console.warn('ImageDecoder failed, falling back to gifuct-js:', e);
      }
    }

    // Fallback using gifuct-js (Firefox/Safari have no ImageDecoder).
    // Designed by Kapil Pidhwani: the package ships CommonJS only, so it is
    // loaded lazily as an ES module via jsDelivr's +esm bridge, only when needed.
    const parser = await import('https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/+esm').catch(() => null);
    if (parser && parser.parseGIF) {
      const parsedGif = parser.parseGIF(arrayBuffer);
      const rawFrames = parser.decompressFrames(parsedGif, true);

      if (!rawFrames || rawFrames.length === 0) {
        throw new Error('No frames parsed by fallback decoder');
      }

      naturalWidth = parsedGif.lsd.width;
      naturalHeight = parsedGif.lsd.height;

      // Composite frames on a master canvas
      const masterCanvas = document.createElement('canvas');
      masterCanvas.width = naturalWidth;
      masterCanvas.height = naturalHeight;
      const masterCtx = masterCanvas.getContext('2d');

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      for (let i = 0; i < rawFrames.length; i++) {
        const f = rawFrames[i];
        const dims = f.dims;
        const delay = f.delay || 100;
        originalTotalDurationMs += delay;

        if (tempCanvas.width !== dims.width || tempCanvas.height !== dims.height) {
          tempCanvas.width = dims.width;
          tempCanvas.height = dims.height;
        }

        const imgData = new ImageData(f.patch, dims.width, dims.height);
        tempCtx.putImageData(imgData, 0, 0);

        // Handle disposal method before drawing
        if (f.disposalType === 2) {
          // Restore to background
          masterCtx.clearRect(0, 0, naturalWidth, naturalHeight);
        }

        masterCtx.drawImage(tempCanvas, dims.left, dims.top);

        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = naturalWidth;
        frameCanvas.height = naturalHeight;
        const fCtx = frameCanvas.getContext('2d');
        fCtx.drawImage(masterCanvas, 0, 0);

        decodedFrames.push({
          canvas: frameCanvas,
          durationMs: delay,
          width: naturalWidth,
          height: naturalHeight
        });
      }
      return;
    }

    throw new Error('No compatible GIF decoder available');
  }

  // 5. Change Speed & Re-encode GIF
  btnProcess.addEventListener('click', () => {
    if (!rawFile || decodedFrames.length === 0 || isProcessing) return;

    if (typeof window.gifshot === 'undefined') {
      showToast('GIF engine is loading. Please wait a moment...');
      return;
    }

    isProcessing = true;
    btnProcess.disabled = true;
    btnProcessIcon.setAttribute('icon', 'lucide:loader-2');
    btnProcessLabel.textContent = 'Processing (0%)...';
    slimProgressBar.classList.add('active');
    slimProgressFill.style.width = '0%';
    resultGifBadge.textContent = 'Compiling GIF...';

    showToast(`Re-timing ${decodedFrames.length} frames at ${selectedSpeed.toFixed(2)}× speed...`);

    // Compute target dimensions
    let targetW = naturalWidth;
    let targetH = naturalHeight;

    if (selectedWidth !== 'original') {
      const maxDim = selectedWidth;
      if (naturalWidth > maxDim) {
        const ratio = maxDim / naturalWidth;
        targetW = Math.round(naturalWidth * ratio);
        targetH = Math.round(naturalHeight * ratio);
      }
    }

    // Even dimensions guarantee
    if (targetW % 2 !== 0) targetW--;
    if (targetH % 2 !== 0) targetH--;

    // Calculate frame interval based on average original duration divided by speed multiplier
    const avgDurationMs = originalTotalDurationMs / decodedFrames.length;
    const newIntervalSec = Math.max(0.015, (avgDurationMs / 1000) / selectedSpeed);

    // Convert frame canvases to resized data URLs or canvas elements
    const frameImages = decodedFrames.map(f => {
      if (f.width === targetW && f.height === targetH) {
        return f.canvas;
      }
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = targetW;
      scaledCanvas.height = targetH;
      const sCtx = scaledCanvas.getContext('2d');
      sCtx.drawImage(f.canvas, 0, 0, targetW, targetH);
      return scaledCanvas;
    });

    const numWorkers = Math.min(8, Math.max(2, navigator.hardwareConcurrency || 4));

    gifshot.createGIF({
      images: frameImages,
      interval: newIntervalSec,
      numFrames: frameImages.length,
      gifWidth: targetW,
      gifHeight: targetH,
      sampleInterval: selectedQuality,
      numWorkers: numWorkers,
      progressCallback: function(progress) {
        const percent = Math.min(99, Math.round(progress * 100));
        slimProgressFill.style.width = `${percent}%`;
        btnProcessLabel.textContent = `Processing (${percent}%)...`;
      }
    }, function(obj) {
      if (!obj.error) {
        fetch(obj.image)
          .then(res => res.blob())
          .then(blob => {
            generatedGifBlob = blob;
            const resultUrl = URL.createObjectURL(blob);

            resultPlaceholder.style.display = 'none';
            resultGifImg.src = resultUrl;
            resultGifImg.style.display = 'block';

            const totalDurSec = (originalTotalDurationMs / 1000) / selectedSpeed;
            resultGifBadge.textContent = `${formatBytes(blob.size)} • ${selectedSpeed.toFixed(2)}×`;
            resultSizeStat.textContent = formatBytes(blob.size);
            resultDimsStat.textContent = `${targetW} × ${targetH} px`;
            resultDurationStat.textContent = `${totalDurSec.toFixed(2)}s Duration`;
            resultMultiplierStat.textContent = `${selectedSpeed.toFixed(2)}× Speed`;

            slimProgressFill.style.width = '100%';
            btnCopy.disabled = false;
            btnDownload.disabled = false;
            showToast(`Speed changed! New GIF: ${formatBytes(blob.size)} (${selectedSpeed.toFixed(2)}×)`);
          })
          .catch(err => {
            console.error('Blob conversion error:', err);
            resultGifBadge.textContent = 'Error';
            showToast('Failed to generate preview image');
          })
          .finally(() => {
            isProcessing = false;
            btnProcess.disabled = false;
            btnProcessIcon.setAttribute('icon', 'lucide:play');
            btnProcessLabel.textContent = 'Change Speed';
            setTimeout(() => {
              slimProgressBar.classList.remove('active');
            }, 1000);
          });
      } else {
        console.error('gifshot error:', obj.errorCode, obj.errorMsg);
        resultGifBadge.textContent = 'Error';
        showToast(`Conversion failed: ${obj.errorMsg || 'Unknown error'}`);
        isProcessing = false;
        btnProcess.disabled = false;
        btnProcessIcon.setAttribute('icon', 'lucide:play');
        btnProcessLabel.textContent = 'Change Speed';
        slimProgressBar.classList.remove('active');
      }
    });
  });

  // 6. Download GIF Action
  btnDownload.addEventListener('click', () => {
    if (!generatedGifBlob) return;
    const baseName = rawFile ? rawFile.name.replace(/\.gif$/i, '') : 'animated';
    const filename = `${baseName}_${selectedSpeed.toFixed(2)}x.gif`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(generatedGifBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloading ${filename}`);
  });

  // 7. Copy GIF to Clipboard Action
  btnCopy.addEventListener('click', async () => {
    if (!generatedGifBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ [generatedGifBlob.type || 'image/gif']: generatedGifBlob });
        await navigator.clipboard.write([item]);
        showToast('GIF copied to clipboard!');
      } else {
        showToast('Direct image clipboard copying not supported on this browser');
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
      showToast('Could not copy image directly. Use Download GIF button.');
    }
  });

  // 8. Reset Tool Action
  btnReset.addEventListener('click', () => {
    if (isProcessing) return;

    rawFile = null;
    rawArrayBuffer = null;
    decodedFrames = [];
    originalTotalDurationMs = 0;
    naturalWidth = 0;
    naturalHeight = 0;
    generatedGifBlob = null;
    fileInput.value = '';

    if (srcObjectUrl) {
      URL.revokeObjectURL(srcObjectUrl);
      srcObjectUrl = null;
    }

    srcGifImg.style.display = 'none';
    srcGifImg.src = '';
    dropzone.style.display = 'flex';
    srcGifBadge.textContent = 'No GIF loaded';
    srcFramesStat.textContent = '0 Frames';
    srcDimsStat.textContent = '0 × 0 px';
    srcDurationStat.textContent = '0.0s Duration';
    srcSpeedStat.textContent = '1.0× Native';

    resultGifImg.style.display = 'none';
    resultGifImg.src = '';
    resultPlaceholder.style.display = 'flex';
    resultGifBadge.textContent = 'Awaiting Input';
    resultSizeStat.textContent = '—';
    resultDimsStat.textContent = '—';
    resultDurationStat.textContent = '—';
    resultMultiplierStat.textContent = `${selectedSpeed.toFixed(2)}× Speed`;

    btnProcess.disabled = true;
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    slimProgressBar.classList.remove('active');
    slimProgressFill.style.width = '0%';

    showToast('Tool reset');
  });

  // Initial update
  updateSettingsSummary();
});

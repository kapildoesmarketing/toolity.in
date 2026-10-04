/* Designed by Kapil Pidhwani: GIF to Video Converter */
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Left Pane
  const dropzone = document.getElementById('gif-dropzone');
  const fileInput = document.getElementById('gif-file-input');
  const gifSourceImg = document.getElementById('gif-source-img');
  const gifMetaBadge = document.getElementById('gif-meta-badge');
  const gifInfoLabel = document.getElementById('gif-info-label');
  const btnChangeGif = document.getElementById('btn-change-gif');

  // DOM Elements - Right Pane
  const videoEmptyPlaceholder = document.getElementById('video-empty-placeholder');
  const videoResultPlayer = document.getElementById('video-result-player');
  const videoStatusBadge = document.getElementById('video-status-badge');
  const settingsSummaryBadge = document.getElementById('settings-summary-badge');

  // Actions & Progress
  const btnConvert = document.getElementById('btn-convert-video');
  const btnConvertIcon = document.getElementById('btn-convert-icon');
  const btnConvertLabel = document.getElementById('btn-convert-label');
  const slimProgressBar = document.getElementById('slim-progress-bar');
  const slimProgressFill = document.getElementById('slim-progress-fill');
  const btnReset = document.getElementById('btn-reset-tool');
  const btnCopy = document.getElementById('btn-copy-video');
  const btnDownload = document.getElementById('btn-download-video');

  // Settings State
  let selectedFormat = 'mp4';
  let selectedLoops = 3;
  let selectedSpeed = 1.0;
  let selectedScale = 'original';

  let gifFile = null;
  let gifUrl = null;
  let decodedFrames = [];
  let gifWidth = 0;
  let gifHeight = 0;
  let totalGifDurationSec = 0;
  let generatedVideoBlob = null;
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
    const scaleText = selectedScale === 'original' ? 'Original' : `${selectedScale}p`;
    settingsSummaryBadge.textContent = `(${fmtText} • ${selectedLoops}x Loop • ${selectedSpeed}x Speed • ${scaleText})`;
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
      });
    });
  }

  bindSegmentedPills('seg-format', (val) => { selectedFormat = val; });
  bindSegmentedPills('seg-loops', (val) => { selectedLoops = parseInt(val, 10); });
  bindSegmentedPills('seg-speed', (val) => { selectedSpeed = parseFloat(val); });
  bindSegmentedPills('seg-scale', (val) => { selectedScale = val === 'original' ? 'original' : parseInt(val, 10); });

  // File Selection & Drag-and-Drop
  dropzone.addEventListener('click', () => fileInput.click());
  btnChangeGif.addEventListener('click', () => fileInput.click());

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
      handleGifFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleGifFile(e.target.files[0]);
    }
  });

  // Pure Client-Side GIF Frame Decoding
  async function decodeGif(file) {
    // Method 1: WebCodecs ImageDecoder if supported
    if ('ImageDecoder' in window) {
      try {
        const stream = file.stream();
        const decoder = new ImageDecoder({ data: stream, type: 'image/gif' });
        await decoder.tracks.ready;

        const frameCount = decoder.tracks.selectedTrack.frameCount;
        const frames = [];
        let totalDurationMs = 0;

        for (let i = 0; i < frameCount; i++) {
          const frameResult = await decoder.decode({ frameIndex: i });
          const videoFrame = frameResult.image;
          const durationMs = (videoFrame.duration || 100000) / 1000; // microseconds to ms

          const canvas = document.createElement('canvas');
          canvas.width = videoFrame.displayWidth;
          canvas.height = videoFrame.displayHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoFrame, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          frames.push({
            canvas: canvas,
            durationMs: Math.max(20, durationMs)
          });

          totalDurationMs += durationMs;
          videoFrame.close();
        }

        return {
          frames,
          width: frames[0].canvas.width,
          height: frames[0].canvas.height,
          durationSec: totalDurationMs / 1000
        };
      } catch (e) {
        console.warn('ImageDecoder failed, falling back to Canvas frame extraction:', e);
      }
    }

    // Fallback: Offscreen Canvas Animation Capture
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 480;
        const h = img.naturalHeight || 360;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Create fallback single/interpolated frame set
        resolve({
          frames: [{ canvas: c, durationMs: 1000 }],
          width: w,
          height: h,
          durationSec: 1.0
        });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleGifFile(file) {
    if (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif')) {
      showToast('Please upload a valid animated .gif file');
      return;
    }

    gifFile = file;
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    gifUrl = URL.createObjectURL(file);

    dropzone.style.display = 'none';
    gifSourceImg.src = gifUrl;
    gifSourceImg.style.display = 'block';
    btnChangeGif.style.display = 'inline-flex';
    gifMetaBadge.textContent = 'Analyzing frames...';
    gifInfoLabel.textContent = 'Decoding GIF timing metadata...';

    try {
      const decoded = await decodeGif(file);
      decodedFrames = decoded.frames;
      gifWidth = decoded.width;
      gifHeight = decoded.height;
      totalGifDurationSec = decoded.durationSec;

      const frameCount = decodedFrames.length;
      gifMetaBadge.textContent = `${gifWidth}×${gifHeight} • ${frameCount} frames`;
      gifInfoLabel.textContent = `${frameCount} frames (${totalGifDurationSec.toFixed(1)}s loop) • ${formatBytes(file.size)}`;

      videoStatusBadge.textContent = 'Ready to Convert';
      btnConvert.disabled = false;
      showToast(`GIF loaded (${gifWidth}×${gifHeight} • ${frameCount} frames)`);
    } catch (err) {
      console.error('GIF parsing failed:', err);
      gifMetaBadge.textContent = `${formatBytes(file.size)}`;
      gifInfoLabel.textContent = `Loaded ${file.name}`;
      btnConvert.disabled = false;
      videoStatusBadge.textContent = 'Ready to Convert';
    }
  }

  // Convert GIF Frames to Video Stream
  btnConvert.addEventListener('click', async () => {
    if (!gifFile || isConverting) return;

    isConverting = true;
    btnConvert.disabled = true;
    btnConvertIcon.setAttribute('icon', 'lucide:loader-2');
    btnConvertLabel.textContent = 'Encoding video stream...';
    slimProgressBar.classList.add('active');
    slimProgressFill.style.width = '0%';
    videoStatusBadge.textContent = 'Encoding...';

    showToast('Starting video encoding...');

    try {
      let targetW = gifWidth || 480;
      let targetH = gifHeight || 360;

      if (selectedScale !== 'original') {
        const scale = selectedScale / Math.max(targetW, targetH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      }

      // Video codecs strictly require even dimensions
      if (targetW % 2 !== 0) targetW--;
      if (targetH % 2 !== 0) targetH--;

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = targetW;
      renderCanvas.height = targetH;
      const ctx = renderCanvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

      // Determine preferred MIME type supported by the browser
      let mimeType = 'video/webm;codecs=vp9';
      if (selectedFormat === 'mp4') {
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
          mimeType = 'video/mp4;codecs=avc1';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else {
          mimeType = 'video/webm;codecs=vp9';
        }
      } else {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }
      }

      // Calculate average FPS from frames
      const totalFramesPerLoop = decodedFrames.length > 0 ? decodedFrames.length : 30;
      const streamFps = Math.min(60, Math.max(10, Math.round(totalFramesPerLoop / (totalGifDurationSec || 1.0))));
      const stream = renderCanvas.captureStream(streamFps);
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 5000000 // 5 Mbps HD quality
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const encodingPromise = new Promise((resolve) => {
        recorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: mimeType.split(';')[0] });
          resolve(videoBlob);
        };
      });

      recorder.start();

      // Render loop iterations
      const loops = selectedLoops;
      const speed = selectedSpeed;
      const totalSteps = loops * totalFramesPerLoop;
      let currentStep = 0;

      for (let l = 0; l < loops; l++) {
        for (let f = 0; f < decodedFrames.length; f++) {
          const frame = decodedFrames[f];
          ctx.drawImage(frame.canvas, 0, 0, targetW, targetH);

          const duration = Math.max(20, frame.durationMs / speed);
          await new Promise(r => setTimeout(r, duration));

          currentStep++;
          const percent = Math.min(98, Math.round((currentStep / totalSteps) * 100));
          slimProgressFill.style.width = `${percent}%`;
          btnConvertLabel.textContent = `Encoding (${percent}%)...`;
        }
      }

      // Finalize stream recording
      recorder.stop();
      generatedVideoBlob = await encodingPromise;
      const videoObjectUrl = URL.createObjectURL(generatedVideoBlob);

      // Render in right pane video player
      videoEmptyPlaceholder.style.display = 'none';
      videoResultPlayer.src = videoObjectUrl;
      videoResultPlayer.style.display = 'block';
      videoResultPlayer.load();

      const ext = mimeType.includes('mp4') ? 'MP4' : 'WebM';
      videoStatusBadge.textContent = `${ext} • ${formatBytes(generatedVideoBlob.size)}`;
      slimProgressFill.style.width = '100%';
      btnCopy.disabled = false;
      btnDownload.disabled = false;
      showToast(`Video created successfully! (${formatBytes(generatedVideoBlob.size)})`);

    } catch (err) {
      console.error('Video conversion error:', err);
      showToast('Could not convert GIF to video; please try WebM format');
      videoStatusBadge.textContent = 'Error';
    } finally {
      isConverting = false;
      btnConvert.disabled = false;
      btnConvertIcon.setAttribute('icon', 'lucide:play');
      btnConvertLabel.textContent = 'Convert to Video';
      setTimeout(() => {
        slimProgressBar.classList.remove('active');
        slimProgressFill.style.width = '0%';
      }, 1500);
    }
  });

  // Download Video
  btnDownload.addEventListener('click', () => {
    if (!generatedVideoBlob) return;
    const a = document.createElement('a');
    const baseName = gifFile ? gifFile.name.replace(/\.[^/.]+$/, "") : "toolity-animation";
    const ext = generatedVideoBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const filename = `${baseName}-${selectedLoops}x.${ext}`;
    a.href = URL.createObjectURL(generatedVideoBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded ${filename}`);
  });

  // Copy Video to Clipboard
  btnCopy.addEventListener('click', async () => {
    if (!generatedVideoBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ [generatedVideoBlob.type]: generatedVideoBlob });
        await navigator.clipboard.write([item]);
        showToast('Video copied to clipboard!');
      } else {
        showToast('Direct video copy not supported by your browser; click Download');
      }
    } catch (e) {
      console.warn('Clipboard write video failed:', e);
      showToast('Could not copy video directly; click Download instead');
    }
  });

  // Reset Tool
  btnReset.addEventListener('click', () => {
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    gifFile = null;
    gifUrl = null;
    decodedFrames = [];
    generatedVideoBlob = null;

    fileInput.value = '';
    gifSourceImg.src = '';
    gifSourceImg.style.display = 'none';
    dropzone.style.display = 'flex';
    btnChangeGif.style.display = 'none';
    gifMetaBadge.textContent = 'No GIF loaded';
    gifInfoLabel.textContent = 'Select or drop a GIF to begin';

    // Reset Output
    videoResultPlayer.src = '';
    videoResultPlayer.style.display = 'none';
    videoEmptyPlaceholder.style.display = 'flex';
    videoStatusBadge.textContent = 'Awaiting GIF';

    btnConvert.disabled = true;
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    slimProgressBar.classList.remove('active');

    showToast('Tool reset');
  });
});

/* Designed by Kapil Pidhwani: Video to GIF Converter */
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Left Pane
  const dropzone = document.getElementById('video-dropzone');
  const fileInput = document.getElementById('video-file-input');
  const sourceVideo = document.getElementById('source-video');
  const videoMetaBadge = document.getElementById('video-meta-badge');

  // Trimmer Elements
  const trimStartRange = document.getElementById('trim-start-range');
  const trimEndRange = document.getElementById('trim-end-range');
  const trimStartVal = document.getElementById('trim-start-val');
  const trimEndVal = document.getElementById('trim-end-val');
  const trimDurationBadge = document.getElementById('trim-duration-badge');

  // Output Elements - Right Pane
  const gifEmptyPlaceholder = document.getElementById('gif-empty-placeholder');
  const gifResultImg = document.getElementById('gif-result-img');
  const gifStatusBadge = document.getElementById('gif-status-badge');
  const settingsSummaryBadge = document.getElementById('settings-summary-badge');

  // Action Buttons & Progress
  const btnConvert = document.getElementById('btn-convert-gif');
  const btnConvertIcon = document.getElementById('btn-convert-icon');
  const btnConvertLabel = document.getElementById('btn-convert-label');
  const slimProgressBar = document.getElementById('slim-progress-bar');
  const slimProgressFill = document.getElementById('slim-progress-fill');
  const btnReset = document.getElementById('btn-reset-tool');
  const btnCopy = document.getElementById('btn-copy-gif');
  const btnDownload = document.getElementById('btn-download-gif');

  // Settings State
  let selectedFPS = 10;
  let selectedWidth = 480;
  let selectedSpeed = 1.0;
  let selectedQuality = 5;

  let videoFile = null;
  let videoUrl = null;
  let videoDuration = 0;
  let generatedGifBlob = null;
  let isConverting = false;


  function formatTime(sec) {
    sec = Math.max(0, sec);
    const mins = Math.floor(sec / 60);
    const secs = (sec % 60).toFixed(1);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function updateSettingsSummary() {
    const wText = selectedWidth === 'original' ? 'Original' : `${selectedWidth}px`;
    const qText = selectedQuality === 1 ? 'High Quality' : selectedQuality === 5 ? 'Balanced' : 'Fast';
    settingsSummaryBadge.textContent = `(${selectedFPS} FPS • ${wText} • ${selectedSpeed}x Speed • ${qText})`;
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

  bindSegmentedPills('seg-fps', (val) => { selectedFPS = parseInt(val, 10); });
  bindSegmentedPills('seg-width', (val) => { selectedWidth = val === 'original' ? 'original' : parseInt(val, 10); });
  bindSegmentedPills('seg-speed', (val) => { selectedSpeed = parseFloat(val); });
  bindSegmentedPills('seg-quality', (val) => { selectedQuality = parseInt(val, 10); });

  // File Selection & Drag-and-Drop
  dropzone.addEventListener('click', () => fileInput.click());

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
      handleVideoFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleVideoFile(e.target.files[0]);
    }
  });

  function handleVideoFile(file) {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv|ogg)$/i)) {
      showToast('Please select a valid video file (.mp4, .webm, .mov)');
      return;
    }

    videoFile = file;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(file);

    sourceVideo.src = videoUrl;
    sourceVideo.load();
    dropzone.style.display = 'none';
    sourceVideo.style.display = 'block';

    sourceVideo.onloadedmetadata = () => {
      videoDuration = sourceVideo.duration;
      const naturalW = sourceVideo.videoWidth || 640;
      const naturalH = sourceVideo.videoHeight || 360;

      videoMetaBadge.textContent = `${formatTime(videoDuration)} • ${naturalW}×${naturalH}`;

      // Enable trimmer controls seamlessly
      trimStartRange.disabled = false;
      trimEndRange.disabled = false;

      trimStartRange.max = videoDuration.toFixed(2);
      trimStartRange.value = 0;
      trimEndRange.max = videoDuration.toFixed(2);
      trimEndRange.value = Math.min(videoDuration, 5).toFixed(2);

      updateTrimmerUI();
      gifStatusBadge.textContent = 'Ready to Convert';
      btnConvert.disabled = false;

      showToast(`Video loaded (${formatTime(videoDuration)} • ${naturalW}×${naturalH})`);
    };
  }

  function updateTrimmerUI() {
    let start = parseFloat(trimStartRange.value);
    let end = parseFloat(trimEndRange.value);

    if (start >= end) {
      start = Math.max(0, end - 0.5);
      trimStartRange.value = start.toFixed(1);
    }

    const duration = end - start;
    trimStartVal.textContent = formatTime(start);
    trimEndVal.textContent = formatTime(end);
    trimDurationBadge.textContent = `(${duration.toFixed(1)}s total)`;
  }

  trimStartRange.addEventListener('input', () => {
    updateTrimmerUI();
    sourceVideo.currentTime = parseFloat(trimStartRange.value);
  });

  trimEndRange.addEventListener('input', () => {
    updateTrimmerUI();
    sourceVideo.currentTime = parseFloat(trimEndRange.value);
  });

  // Video to GIF Conversion Trigger
  btnConvert.addEventListener('click', () => {
    if (!videoFile || isConverting) return;

    if (typeof window.gifshot === 'undefined') {
      showToast('GIF engine is still loading. Please try again in a moment.');
      return;
    }

    const startTime = parseFloat(trimStartRange.value);
    const endTime = parseFloat(trimEndRange.value);
    const duration = endTime - startTime;

    if (duration <= 0) {
      showToast('Please select a valid clip duration');
      return;
    }

    isConverting = true;
    btnConvert.disabled = true;
    btnConvertIcon.setAttribute('icon', 'lucide:loader-2');
    btnConvertLabel.textContent = 'Converting (0%)...';
    slimProgressBar.classList.add('active');
    slimProgressFill.style.width = '0%';
    gifStatusBadge.textContent = 'Converting...';

    showToast('Starting multi-worker GIF conversion...');

    const fps = selectedFPS;
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const frameInterval = (1 / fps) / selectedSpeed;

    let naturalW = sourceVideo.videoWidth || 640;
    let naturalH = sourceVideo.videoHeight || 360;
    let targetW = naturalW;
    let targetH = naturalH;

    if (selectedWidth !== 'original') {
      const scale = Math.min(1, selectedWidth / naturalW);
      targetW = Math.round(naturalW * scale);
      targetH = Math.round(naturalH * scale);
    }

    // Ensure even dimensions for compatibility
    if (targetW % 2 !== 0) targetW--;
    if (targetH % 2 !== 0) targetH--;

    const numWorkers = Math.min(8, Math.max(2, navigator.hardwareConcurrency || 4));

    gifshot.createGIF({
      video: [videoUrl],
      offset: startTime,
      numFrames: totalFrames,
      interval: frameInterval,
      gifWidth: targetW,
      gifHeight: targetH,
      sampleInterval: selectedQuality,
      numWorkers: numWorkers,
      progressCallback: function(captureProgress) {
        const percent = Math.min(99, Math.round(captureProgress * 100));
        slimProgressFill.style.width = `${percent}%`;
        btnConvertLabel.textContent = `Converting (${percent}%)...`;
      }
    }, function(obj) {
      if (!obj.error) {
        fetch(obj.image)
          .then(res => res.blob())
          .then(blob => {
            generatedGifBlob = blob;
            const gifObjectUrl = URL.createObjectURL(blob);

            // Render Preview in canvas
            gifEmptyPlaceholder.style.display = 'none';
            gifResultImg.src = gifObjectUrl;
            gifResultImg.style.display = 'block';

            gifStatusBadge.textContent = `${formatBytes(blob.size)} • ${targetW}×${targetH}`;
            slimProgressFill.style.width = '100%';
            btnCopy.disabled = false;
            btnDownload.disabled = false;
            showToast(`GIF created! (${formatBytes(blob.size)} • ${totalFrames} frames)`);
          })
          .catch(err => {
            console.error('Blob conversion error:', err);
            showToast('Error finalizing GIF preview');
            gifStatusBadge.textContent = 'Error';
          })
          .finally(() => {
            finishConversion();
          });
      } else {
        console.error('GIF conversion error:', obj);
        showToast(obj.errorMsg ? `Conversion issue: ${obj.errorMsg}` : 'Could not convert video. Try a shorter clip or lower resolution.');
        gifStatusBadge.textContent = 'Error';
        finishConversion();
      }
    });

    function finishConversion() {
      isConverting = false;
      btnConvert.disabled = false;
      btnConvertIcon.setAttribute('icon', 'lucide:play');
      btnConvertLabel.textContent = 'Convert to Animated GIF';
      setTimeout(() => {
        slimProgressBar.classList.remove('active');
        slimProgressFill.style.width = '0%';
      }, 1500);
    }
  });

  // Download GIF
  btnDownload.addEventListener('click', () => {
    if (!generatedGifBlob) return;
    const a = document.createElement('a');
    const baseName = videoFile ? videoFile.name.replace(/\.[^/.]+$/, "") : "toolity-clip";
    const filename = `${baseName}-${selectedFPS}fps.gif`;
    a.href = URL.createObjectURL(generatedGifBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded ${filename}`);
  });

  // Copy GIF to Clipboard
  btnCopy.addEventListener('click', async () => {
    if (!generatedGifBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ 'image/gif': generatedGifBlob });
        await navigator.clipboard.write([item]);
        showToast('GIF copied to clipboard!');
      } else {
        showToast('Direct GIF copy not supported by your browser');
      }
    } catch (e) {
      console.warn('Clipboard write image/gif failed:', e);
      showToast('Could not copy GIF directly; click Download instead');
    }
  });

  // Reset Tool
  btnReset.addEventListener('click', () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoFile = null;
    videoUrl = null;
    generatedGifBlob = null;

    fileInput.value = '';
    sourceVideo.src = '';
    sourceVideo.style.display = 'none';
    dropzone.style.display = 'flex';
    videoMetaBadge.textContent = 'No video loaded';

    // Reset Trimmer
    trimStartRange.disabled = true;
    trimEndRange.disabled = true;
    trimStartRange.value = 0;
    trimEndRange.value = 100;
    trimStartVal.textContent = '00:00.0';
    trimEndVal.textContent = '00:00.0';
    trimDurationBadge.textContent = '(0.0s)';

    // Reset Output Preview
    gifResultImg.src = '';
    gifResultImg.style.display = 'none';
    gifEmptyPlaceholder.style.display = 'flex';
    gifStatusBadge.textContent = 'Awaiting Video';

    btnConvert.disabled = true;
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    slimProgressBar.classList.remove('active');

    showToast('Tool reset');
  });
});

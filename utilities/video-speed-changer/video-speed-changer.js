/* Designed by Kapil Pidhwani: Video Speed Changer */
/* Designed by Kapil Pidhwani: Client-Side Video Speed Changer Engine */
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropzone = document.getElementById('video-dropzone');
  const fileInput = document.getElementById('video-file-input');
  const sourceVideo = document.getElementById('source-video');
  const outputVideoPlayer = document.getElementById('output-video-player');
  const outputEmptyPlaceholder = document.getElementById('output-empty-placeholder');
  
  const videoMetaBadge = document.getElementById('video-meta-badge');
  const outputStatusBadge = document.getElementById('output-status-badge');
  const srcDurationText = document.getElementById('src-duration-text');
  const srcSpeedText = document.getElementById('src-speed-text');
  const estDurationText = document.getElementById('est-duration-text');
  const outputFormatText = document.getElementById('output-format-text');
  const settingsSummaryBadge = document.getElementById('settings-summary-badge');
  
  const trimStartRange = document.getElementById('trim-start-range');
  const trimEndRange = document.getElementById('trim-end-range');
  const trimStartVal = document.getElementById('trim-start-val');
  const trimEndVal = document.getElementById('trim-end-val');
  const trimDurationBadge = document.getElementById('trim-duration-badge');
  
  const speedContinuousSlider = document.getElementById('speed-continuous-slider');
  const speedSliderBadge = document.getElementById('speed-slider-badge');
  const audioModeDesc = document.getElementById('audio-mode-desc');
  
  const btnProcess = document.getElementById('btn-process-video');
  const btnProcessIcon = document.getElementById('btn-process-icon');
  const btnProcessLabel = document.getElementById('btn-process-label');
  const btnReset = document.getElementById('btn-reset-tool');
  const btnCopy = document.getElementById('btn-copy-video');
  const btnDownload = document.getElementById('btn-download-video');
  const slimProgressBar = document.getElementById('slim-progress-bar');
  const slimProgressFill = document.getElementById('slim-progress-fill');

  // State Variables
  let videoFile = null;
  let videoUrl = null;
  let outputVideoBlob = null;
  let isProcessing = false;

  let selectedSpeed = 2.0;
  let selectedAudioMode = 'mute'; // 'mute', 'preserve', 'shift'
  let selectedFormat = 'mp4'; // 'mp4', 'webm'
  let selectedScale = 'original'; // 'original', 1080, 720, 480

  let videoDuration = 0;
  let trimStartTime = 0;
  let trimEndTime = 0;

  // Toast Helper

  // Format seconds as MM:SS.S
  function formatTime(sec) {
    if (!sec || isNaN(sec) || sec < 0) return "00:00.0";
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(4, '0');
    return `${mm}:${ss}`;
  }

  // Format bytes
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Update Settings Summary Badge
  function updateSettingsSummary() {
    const audioLabels = {
      'mute': 'Muted',
      'preserve': 'Pitch Correct',
      'shift': 'Pitch Shift'
    };
    const scaleLabels = {
      'original': 'Original Res',
      '1080': '1080p',
      '720': '720p',
      '480': '480p'
    };
    const summary = `(${selectedSpeed.toFixed(2)}× Speed • ${audioLabels[selectedAudioMode]} • ${selectedFormat.toUpperCase()} • ${scaleLabels[selectedScale]})`;
    settingsSummaryBadge.textContent = summary;
    outputFormatText.textContent = `${selectedFormat.toUpperCase()} • ${scaleLabels[selectedScale]}`;
    updateEstimatedDuration();
  }

  // Calculate and update estimated output duration
  function updateEstimatedDuration() {
    if (videoDuration > 0) {
      const activeDuration = Math.max(0.1, trimEndTime - trimStartTime);
      const estOutSec = activeDuration / selectedSpeed;
      estDurationText.textContent = `Est. Output: ${estOutSec.toFixed(1)}s`;
      srcSpeedText.textContent = `${selectedSpeed.toFixed(2)}× Speed`;
    } else {
      estDurationText.textContent = `Est. Output: 0.0s`;
      srcSpeedText.textContent = `${selectedSpeed.toFixed(2)}× Speed`;
    }
  }

  // Sync Speed controls (Pills & Continuous Slider)
  function setSpeed(val) {
    selectedSpeed = Math.max(0.1, Math.min(10.0, parseFloat(val)));
    speedContinuousSlider.value = selectedSpeed;
    speedSliderBadge.textContent = `${selectedSpeed.toFixed(2)}×`;

    // Update pills active state
    document.querySelectorAll('#speed-presets-group .seg-pill').forEach(btn => {
      const pillSpeed = parseFloat(btn.getAttribute('data-speed'));
      btn.classList.toggle('active', Math.abs(pillSpeed - selectedSpeed) < 0.01);
    });

    // Live preview in source video player
    if (sourceVideo && !sourceVideo.paused) {
      sourceVideo.playbackRate = selectedSpeed;
      sourceVideo.preservesPitch = (selectedAudioMode === 'preserve');
    } else if (sourceVideo) {
      sourceVideo.playbackRate = selectedSpeed;
      sourceVideo.preservesPitch = (selectedAudioMode === 'preserve');
    }

    updateSettingsSummary();
  }

  // Segmented Button Binder Helper
  function bindSegmentedPills(containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const buttons = container.querySelectorAll('.seg-pill');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const dataVal = btn.dataset.speed || btn.dataset.audio || btn.dataset.format || btn.dataset.scale;
        callback(dataVal);
        updateSettingsSummary();
      });
    });
  }

  // Bind Segmented Controls
  bindSegmentedPills('speed-presets-group', (val) => setSpeed(val));

  speedContinuousSlider.addEventListener('input', (e) => {
    setSpeed(e.target.value);
  });

  bindSegmentedPills('audio-mode-group', (val) => {
    selectedAudioMode = val;
    if (val === 'mute') {
      audioModeDesc.textContent = 'Audio will be silenced. Ideal for timelapses & >2× speeds.';
    } else if (val === 'preserve') {
      audioModeDesc.textContent = 'Pitch correction preserves normal human voice timbre.';
    } else {
      audioModeDesc.textContent = 'Pitch shifts naturally (faster = chipmunk, slower = deep voice).';
    }
    if (sourceVideo) {
      sourceVideo.muted = (val === 'mute');
      sourceVideo.preservesPitch = (val === 'preserve');
    }
  });

  bindSegmentedPills('format-group', (val) => { selectedFormat = val; });
  bindSegmentedPills('scale-group', (val) => { selectedScale = val; });

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

  // Handle Loaded Video File
  function handleVideoFile(file) {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv|avi|ogg)$/i)) {
      showToast('Please select a valid video file (MP4, WebM, MOV, MKV, AVI)');
      return;
    }

    videoFile = file;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(file);

    dropzone.style.display = 'none';
    sourceVideo.src = videoUrl;
    sourceVideo.style.display = 'block';
    sourceVideo.playbackRate = selectedSpeed;
    sourceVideo.preservesPitch = (selectedAudioMode === 'preserve');
    sourceVideo.muted = (selectedAudioMode === 'mute');

    videoMetaBadge.textContent = 'Loading metadata...';
    outputStatusBadge.textContent = 'Ready to Process';
    btnProcess.disabled = false;

    sourceVideo.onloadedmetadata = () => {
      videoDuration = sourceVideo.duration;
      trimStartTime = 0;
      trimEndTime = videoDuration;

      trimStartRange.disabled = false;
      trimEndRange.disabled = false;
      trimStartRange.max = videoDuration;
      trimEndRange.max = videoDuration;
      trimStartRange.value = 0;
      trimEndRange.value = videoDuration;

      trimStartVal.textContent = formatTime(0);
      trimEndVal.textContent = formatTime(videoDuration);
      trimDurationBadge.textContent = `(${videoDuration.toFixed(1)}s)`;
      srcDurationText.textContent = `Original: ${videoDuration.toFixed(1)}s`;

      videoMetaBadge.textContent = `${sourceVideo.videoWidth}×${sourceVideo.videoHeight} • ${formatBytes(file.size)}`;
      updateEstimatedDuration();
      showToast(`Video loaded (${sourceVideo.videoWidth}×${sourceVideo.videoHeight}, ${videoDuration.toFixed(1)}s)`);
    };
  }

  // Trimmer Sliders Event Listeners
  trimStartRange.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val >= trimEndTime - 0.2) {
      trimStartRange.value = trimEndTime - 0.2;
      trimStartTime = trimEndTime - 0.2;
    } else {
      trimStartTime = val;
    }
    trimStartVal.textContent = formatTime(trimStartTime);
    const activeDur = trimEndTime - trimStartTime;
    trimDurationBadge.textContent = `(${activeDur.toFixed(1)}s)`;
    sourceVideo.currentTime = trimStartTime;
    updateEstimatedDuration();
  });

  trimEndRange.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val <= trimStartTime + 0.2) {
      trimEndRange.value = trimStartTime + 0.2;
      trimEndTime = trimStartTime + 0.2;
    } else {
      trimEndTime = val;
    }
    trimEndVal.textContent = formatTime(trimEndTime);
    const activeDur = trimEndTime - trimStartTime;
    trimDurationBadge.textContent = `(${activeDur.toFixed(1)}s)`;
    sourceVideo.currentTime = trimEndTime;
    updateEstimatedDuration();
  });

  // Pure Client-Side Video Speed Transcoding Engine
  btnProcess.addEventListener('click', async () => {
    if (!videoFile || !sourceVideo || isProcessing) return;

    isProcessing = true;
    btnProcess.disabled = true;
    btnProcessIcon.setAttribute('icon', 'lucide:loader-2');
    btnProcessLabel.textContent = 'Encoding speed-adjusted video...';
    slimProgressBar.classList.add('active');
    slimProgressFill.style.width = '0%';
    outputStatusBadge.textContent = 'Encoding...';

    showToast('Transcoding speed adjustment in browser sandbox...');

    try {
      const originalW = sourceVideo.videoWidth || 1280;
      const originalH = sourceVideo.videoHeight || 720;
      let targetW = originalW;
      let targetH = originalH;

      if (selectedScale !== 'original') {
        const scaleMax = parseInt(selectedScale, 10);
        const scale = scaleMax / Math.max(originalW, originalH);
        if (scale < 1) {
          targetW = Math.round(originalW * scale);
          targetH = Math.round(originalH * scale);
        }
      }

      // Force even dimensions for MP4/H.264 & WebM codecs
      if (targetW % 2 !== 0) targetW--;
      if (targetH % 2 !== 0) targetH--;

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = targetW;
      renderCanvas.height = targetH;
      const ctx = renderCanvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetW, targetH);

      // Select optimum supported MIME codec
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

      const stream = renderCanvas.captureStream(30); // 30 FPS smooth video stream
      
      // Audio routing via AudioContext if audio is preserved
      let audioContext = null;
      let audioSourceNode = null;
      if (selectedAudioMode !== 'mute') {
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioDest = audioContext.createMediaStreamDestination();
          audioSourceNode = audioContext.createMediaElementSource(sourceVideo);
          audioSourceNode.connect(audioDest);
          audioSourceNode.connect(audioContext.destination);

          audioDest.stream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
        } catch (audioErr) {
          console.warn('Direct AudioContext routing unavailable:', audioErr);
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 6000000 // 6 Mbps clean bitrate
      });

      const recordedChunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      const encodingPromise = new Promise((resolve) => {
        recorder.onstop = () => {
          const finalBlob = new Blob(recordedChunks, { type: mimeType.split(';')[0] });
          resolve(finalBlob);
        };
      });

      // Prepare playback for capture
      const startSec = trimStartTime || 0;
      const endSec = trimEndTime || videoDuration;
      const totalActiveSec = Math.max(0.2, endSec - startSec);

      sourceVideo.currentTime = startSec;
      sourceVideo.playbackRate = selectedSpeed;
      sourceVideo.preservesPitch = (selectedAudioMode === 'preserve');
      sourceVideo.muted = (selectedAudioMode === 'mute');

      await new Promise(r => { sourceVideo.onseeked = r; });

      recorder.start();
      await sourceVideo.play();

      // Render loop driving canvas stream frame extraction
      await new Promise((resolve) => {
        let animId;
        const drawFrame = () => {
          if (sourceVideo.paused || sourceVideo.ended || sourceVideo.currentTime >= endSec) {
            cancelAnimationFrame(animId);
            sourceVideo.pause();
            recorder.stop();
            resolve();
            return;
          }

          ctx.drawImage(sourceVideo, 0, 0, targetW, targetH);
          
          // Update live progress
          const progress = Math.min(100, Math.max(0, ((sourceVideo.currentTime - startSec) / totalActiveSec) * 100));
          slimProgressFill.style.width = `${progress}%`;
          outputStatusBadge.textContent = `Encoding ${Math.round(progress)}%`;

          animId = requestAnimationFrame(drawFrame);
        };

        animId = requestAnimationFrame(drawFrame);

        sourceVideo.onended = () => {
          cancelAnimationFrame(animId);
          recorder.stop();
          resolve();
        };
      });

      outputVideoBlob = await encodingPromise;

      if (audioContext) {
        audioContext.close().catch(() => {});
      }

      // Display Converted Result Video
      const outputBlobUrl = URL.createObjectURL(outputVideoBlob);
      outputEmptyPlaceholder.style.display = 'none';
      outputVideoPlayer.src = outputBlobUrl;
      outputVideoPlayer.style.display = 'block';
      outputVideoPlayer.playbackRate = 1.0; // Play at normal 1.0x native rate because frames are already speed-encoded

      outputStatusBadge.textContent = 'Completed';
      btnCopy.disabled = false;
      btnDownload.disabled = false;

      showToast(`Success! Video speed adjusted (${selectedSpeed.toFixed(2)}×, ${formatBytes(outputVideoBlob.size)})`);
    } catch (err) {
      console.error('Video speed encoding error:', err);
      showToast('Failed to process video speed. Try selecting WebM format.');
      outputStatusBadge.textContent = 'Error';
    } finally {
      isProcessing = false;
      btnProcess.disabled = false;
      btnProcessIcon.setAttribute('icon', 'lucide:play');
      btnProcessLabel.textContent = 'Change Video Speed';
      setTimeout(() => {
        slimProgressBar.classList.remove('active');
        slimProgressFill.style.width = '0%';
      }, 1200);
    }
  });

  // Download Video File
  btnDownload.addEventListener('click', () => {
    if (!outputVideoBlob) return;
    const a = document.createElement('a');
    const baseName = videoFile ? videoFile.name.replace(/\.[^/.]+$/, "") : "toolity-speed-video";
    const ext = outputVideoBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const filename = `${baseName}-${selectedSpeed.toFixed(2)}x.${ext}`;
    a.href = URL.createObjectURL(outputVideoBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded ${filename}`);
  });

  // Copy Video to Clipboard
  btnCopy.addEventListener('click', async () => {
    if (!outputVideoBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ [outputVideoBlob.type]: outputVideoBlob });
        await navigator.clipboard.write([item]);
        showToast('Video copied to clipboard!');
      } else {
        showToast('Direct video clipboard copy not supported by your browser; click Download');
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
      showToast('Could not copy video directly; click Download instead');
    }
  });

  // Reset Tool
  btnReset.addEventListener('click', () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoFile = null;
    videoUrl = null;
    outputVideoBlob = null;
    videoDuration = 0;
    trimStartTime = 0;
    trimEndTime = 0;

    fileInput.value = '';
    sourceVideo.src = '';
    sourceVideo.style.display = 'none';
    dropzone.style.display = 'flex';

    outputVideoPlayer.src = '';
    outputVideoPlayer.style.display = 'none';
    outputEmptyPlaceholder.style.display = 'flex';

    videoMetaBadge.textContent = 'No video loaded';
    outputStatusBadge.textContent = 'Awaiting Video';
    srcDurationText.textContent = 'Original: 0.0s';
    estDurationText.textContent = 'Est. Output: 0.0s';

    trimStartRange.disabled = true;
    trimEndRange.disabled = true;
    trimStartRange.value = 0;
    trimEndRange.value = 100;
    trimStartVal.textContent = '00:00.0';
    trimEndVal.textContent = '00:00.0';
    trimDurationBadge.textContent = '(0.0s)';

    setSpeed(2.0);
    btnProcess.disabled = true;
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    slimProgressBar.classList.remove('active');

    showToast('Tool reset');
  });
});

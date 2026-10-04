/* Designed by Kapil Pidhwani: Video Format Converter */
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
  const outputEmptyPlaceholder = document.getElementById('output-empty-placeholder');
  const outputVideoPlayer = document.getElementById('output-video-player');
  const videoStatusBadge = document.getElementById('video-status-badge');
  const settingsSummaryBadge = document.getElementById('settings-summary-badge');

  // Action Buttons & Progress
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
  let selectedScale = 'original';
  let selectedFps = 'auto';
  let selectedAudio = 'keep';
  let selectedSpeed = 1.0;

  let videoFile = null;
  let videoUrl = null;
  let outputUrl = null;
  let videoDuration = 0;
  let naturalWidth = 0;
  let naturalHeight = 0;
  let generatedBlob = null;
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
    const fmtText = selectedFormat.toUpperCase();
    const resText = selectedScale === 'original' ? 'Original' : `${selectedScale}p`;
    const fpsText = selectedFps === 'auto' ? 'Auto FPS' : `${selectedFps} FPS`;
    const audioText = selectedAudio === 'keep' ? 'Audio On' : 'Muted';
    settingsSummaryBadge.textContent = `(${fmtText} • ${resText} • ${fpsText} • ${audioText})`;
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
      });
    });
  }

  bindSegmentedPills('seg-format', (val) => { selectedFormat = val; });
  bindSegmentedPills('seg-scale', (val) => { selectedScale = val; });
  bindSegmentedPills('seg-fps', (val) => { selectedFps = val; });
  bindSegmentedPills('seg-audio', (val) => { selectedAudio = val; });
  bindSegmentedPills('seg-speed', (val) => { selectedSpeed = parseFloat(val); });

  // Persistent Audio Node Singleton to allow infinite conversions without InvalidStateError
  let audioCtx = null;
  let audioSourceNode = null;

  function getAudioRouting(videoEl) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      if (!audioSourceNode) {
        audioSourceNode = audioCtx.createMediaElementSource(videoEl);
      }
      const destNode = audioCtx.createMediaStreamDestination();
      audioSourceNode.disconnect();
      audioSourceNode.connect(destNode);
      audioSourceNode.connect(audioCtx.destination);
      return destNode;
    } catch (e) {
      console.warn('Audio node routing fallback:', e);
      return null;
    }
  }

  // File Drag & Drop
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
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv|avi|ogg|3gp|flv)$/i)) {
      showToast('Please select a valid video file (.mp4, .webm, .mov, .mkv, .avi)');
      return;
    }

    videoFile = file;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
    videoUrl = URL.createObjectURL(file);

    sourceVideo.src = videoUrl;
    sourceVideo.load();
    dropzone.style.display = 'none';
    sourceVideo.style.display = 'block';

    sourceVideo.onloadedmetadata = () => {
      videoDuration = sourceVideo.duration;
      naturalWidth = sourceVideo.videoWidth || 1280;
      naturalHeight = sourceVideo.videoHeight || 720;

      const rawExt = (file.name.split('.').pop() || '').toLowerCase();
      videoMetaBadge.textContent = `${formatTime(videoDuration)} • ${naturalWidth}×${naturalHeight} • ${rawExt.toUpperCase()}`;

      // Auto-select an alternative target format by default for superior UX
      if (rawExt === 'mp4') {
        selectFormat('mov');
      } else if (rawExt === 'mov') {
        selectFormat('mp4');
      } else if (rawExt === 'webm') {
        selectFormat('mp4');
      } else {
        selectFormat('mp4');
      }

      trimStartRange.disabled = false;
      trimEndRange.disabled = false;
      trimStartRange.max = videoDuration.toFixed(2);
      trimStartRange.value = 0;
      trimEndRange.max = videoDuration.toFixed(2);
      trimEndRange.value = videoDuration.toFixed(2);

      updateTrimmerUI();
      videoStatusBadge.textContent = 'Ready to Convert';
      btnConvert.disabled = false;

      showToast(`Video loaded (${formatTime(videoDuration)} • ${naturalWidth}×${naturalHeight})`);
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

  // Transcode Video Stream
  btnConvert.addEventListener('click', async () => {
    if (!videoFile || isConverting) return;

    const startTime = parseFloat(trimStartRange.value);
    const endTime = parseFloat(trimEndRange.value);
    const clipDuration = endTime - startTime;

    if (clipDuration <= 0) {
      showToast('Please select a valid clip duration');
      return;
    }

    isConverting = true;
    btnConvert.disabled = true;
    btnConvertIcon.setAttribute('icon', 'lucide:loader-2');
    btnConvertLabel.textContent = 'Transcoding stream...';
    slimProgressBar.classList.add('active');
    slimProgressFill.style.width = '0%';
    videoStatusBadge.textContent = 'Transcoding...';

    showToast(`Transcoding to ${selectedFormat.toUpperCase()}...`);

    try {
      // 1. Calculate Target Dimensions
      let targetW = naturalWidth;
      let targetH = naturalHeight;

      if (selectedScale !== 'original') {
        const scaleTargetH = parseInt(selectedScale, 10);
        targetW = Math.round(naturalWidth * (scaleTargetH / naturalHeight));
        targetH = scaleTargetH;
      }

      // Codecs strictly require even numbers
      if (targetW % 2 !== 0) targetW--;
      if (targetH % 2 !== 0) targetH--;

      // 2. Setup Offscreen Canvas & Web Audio Node
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      const fps = selectedFps === 'auto' ? 30 : parseInt(selectedFps, 10);
      const canvasStream = canvas.captureStream(fps);

      if (selectedAudio === 'keep') {
        const destNode = getAudioRouting(sourceVideo);
        if (destNode && destNode.stream) {
          const audioTrack = destNode.stream.getAudioTracks()[0];
          if (audioTrack) {
            canvasStream.addTrack(audioTrack);
          }
        }
      }

      // 3. Determine Best Supported Container Format
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (selectedFormat === 'mp4' || selectedFormat === 'mov') {
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
          mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
        } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
          mimeType = 'video/mp4;codecs=avc1';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
        } else {
          mimeType = 'video/webm';
        }
      } else {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(canvasStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 8000000 // 8 Mbps high-bitrate quality
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise((resolve) => {
        recorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: mimeType.split(';')[0] });
          resolve(videoBlob);
        };
      });

      // 4. Perform Playback & Canvas Render Pipeline
      sourceVideo.currentTime = startTime;
      sourceVideo.playbackRate = selectedSpeed;
      sourceVideo.muted = selectedAudio === 'mute';

      await new Promise(r => {
        sourceVideo.addEventListener('seeked', r, { once: true });
      });

      recorder.start();
      await sourceVideo.play();

      let animId = null;
      const renderLoop = () => {
        if (!isConverting) return;

        ctx.drawImage(sourceVideo, 0, 0, targetW, targetH);

        const progress = (sourceVideo.currentTime - startTime) / clipDuration;
        const percent = Math.min(99, Math.max(0, Math.round(progress * 100)));
        slimProgressFill.style.width = `${percent}%`;
        btnConvertLabel.textContent = `Transcoding (${percent}%)...`;

        if (sourceVideo.currentTime >= endTime || sourceVideo.ended) {
          sourceVideo.pause();
          recorder.stop();
          return;
        }

        animId = requestAnimationFrame(renderLoop);
      };

      animId = requestAnimationFrame(renderLoop);

      generatedBlob = await recordingDone;
      if (animId) cancelAnimationFrame(animId);

      // 5. Render Output in Player
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      outputUrl = URL.createObjectURL(generatedBlob);
      outputEmptyPlaceholder.style.display = 'none';
      outputVideoPlayer.pause();
      outputVideoPlayer.src = outputUrl;
      outputVideoPlayer.style.display = 'block';
      outputVideoPlayer.load();

      videoStatusBadge.textContent = `${selectedFormat.toUpperCase()} • ${formatBytes(generatedBlob.size)}`;
      slimProgressFill.style.width = '100%';
      btnCopy.disabled = false;
      btnDownload.disabled = false;
      showToast(`Video converted to ${selectedFormat.toUpperCase()}! (${formatBytes(generatedBlob.size)})`);

    } catch (err) {
      console.error('Transcoding failed:', err);
      showToast('Conversion issue; please try WebM format or shorter clip');
      videoStatusBadge.textContent = 'Error';
    } finally {
      isConverting = false;
      btnConvert.disabled = false;
      btnConvertIcon.setAttribute('icon', 'lucide:play');
      btnConvertLabel.textContent = 'Convert Video';
      sourceVideo.muted = false;
      setTimeout(() => {
        slimProgressBar.classList.remove('active');
        slimProgressFill.style.width = '0%';
      }, 1500);
    }
  });

  // Download Converted Video with exact target format
  btnDownload.addEventListener('click', () => {
    if (!generatedBlob) return;
    const a = document.createElement('a');
    const baseName = videoFile ? videoFile.name.replace(/\.[^/.]+$/, "") : "toolity-video";
    const ext = selectedFormat === 'audio' ? 'wav' : selectedFormat.toLowerCase();
    const filename = `${baseName}.${ext}`;
    a.href = URL.createObjectURL(generatedBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded ${filename}`);
  });

  // Copy Video to Clipboard
  btnCopy.addEventListener('click', async () => {
    if (!generatedBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ [generatedBlob.type]: generatedBlob });
        await navigator.clipboard.write([item]);
        showToast('Video copied to clipboard!');
      } else {
        showToast('Direct video copy not supported; click Download instead');
      }
    } catch (e) {
      console.warn('Clipboard write video failed:', e);
      showToast('Could not copy video directly; click Download instead');
    }
  });

  // Reset Tool
  btnReset.addEventListener('click', () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
    videoFile = null;
    videoUrl = null;
    generatedBlob = null;

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

    // Reset Output
    outputVideoPlayer.src = '';
    outputVideoPlayer.style.display = 'none';
    outputEmptyPlaceholder.style.display = 'flex';
    videoStatusBadge.textContent = 'Awaiting Video';

    btnConvert.disabled = true;
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    slimProgressBar.classList.remove('active');

    showToast('Tool reset');
  });
});

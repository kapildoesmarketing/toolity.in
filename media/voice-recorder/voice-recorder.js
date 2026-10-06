/* Voice Recorder — Toolity.in. getUserMedia → MediaRecorder (pause/resume) + AnalyserNode level meter → decode → MP3/WAV via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const rec = { stream: null, mr: null, chunks: [], t0: 0, acc: 0, timer: 0, raf: 0, src: null };
  const clock = () => { const s = Math.floor((rec.acc + (rec.mr && rec.mr.state === 'recording' ? performance.now() - rec.t0 : 0)) / 1000); $('rec-clock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const buttons = (state) => { $('btn-rec').disabled = state !== 'idle'; $('btn-pause').disabled = state === 'idle'; $('btn-stop').disabled = state === 'idle'; $('btn-pause').textContent = state === 'paused' ? '▶ Resume' : '❚❚ Pause'; };
  function teardown() {
    cancelAnimationFrame(rec.raf); clearInterval(rec.timer); if (rec.src) rec.src.disconnect();
    if (rec.stream) rec.stream.getTracks().forEach((t) => t.stop());
    Object.assign(rec, { stream: null, mr: null, src: null }); $('rec-meter').style.width = '0%'; buttons('idle');
  }
  async function listMics() {
    try { const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput' && d.deviceId); if (!devs.length) return;
      const sel = $('opt-mic'), cur = sel.value; sel.innerHTML = devs.map((d, i) => `<option value="${d.deviceId}">${d.label || `Microphone ${i + 1}`}</option>`).join(''); if ([...sel.options].some((o) => o.value === cur)) sel.value = cur; } catch (e) { console.warn(e); }
  }
  async function start() {
    if (!navigator.mediaDevices || !window.MediaRecorder) return T.showError('This browser cannot record audio. Try Chrome, Edge, Firefox or Safari 14.1+.');
    T.showError(''); const clean = $('opt-clean').value === 'on', id = $('opt-mic').value;
    try { rec.stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: id ? { exact: id } : undefined, echoCancellation: clean, noiseSuppression: clean, autoGainControl: clean } }); }
    catch (e) { console.warn(e); return T.showError(e.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it from the padlock icon in the address bar, then try again.' : 'No microphone found or it is in use by another app.'); }
    listMics();
    const ctx = A.liveCtx(); if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const an = ctx.createAnalyser(); an.fftSize = 512; rec.src = ctx.createMediaStreamSource(rec.stream); rec.src.connect(an); const data = new Uint8Array(an.fftSize);
    const meter = () => { an.getByteTimeDomainData(data); let p = 0; for (let i = 0; i < data.length; i++) p = Math.max(p, Math.abs(data[i] - 128)); $('rec-meter').style.width = `${Math.min(100, (p / 128) * 140)}%`; rec.raf = requestAnimationFrame(meter); }; meter();
    const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    rec.mr = new MediaRecorder(rec.stream, mime ? { mimeType: mime } : {}); rec.chunks = []; rec.acc = 0; rec.t0 = performance.now();
    rec.mr.ondataavailable = (e) => e.data.size && rec.chunks.push(e.data);
    rec.mr.onstop = async () => {
      const blob = new Blob(rec.chunks, { type: rec.mr.mimeType || 'audio/webm' }); teardown();
      try { const buf = await A.decode(blob); T.showSource(new File([blob], `voice-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.webm`, { type: blob.type }), buf); $('rec-hint').textContent = 'Listen below, then Save — or Record a new take.'; }
      catch (e) { console.warn(e); T.showError('The recording came back empty — check the microphone level and try again.'); }
    };
    rec.mr.start(250); rec.timer = setInterval(clock, 250); clock(); buttons('recording'); $('rec-hint').textContent = 'Recording… speak now.'; $('result-badge').textContent = 'Recording';
  }
  const T = A.mount({
    actionLabel: 'Save recording', verb: 'Encoding', suffix: 'recording', noFile: true,
    summary: () => `${A.fmtLabel($('opt-out').value)} · ${$('opt-mic').options[$('opt-mic').selectedIndex].text}`,
    validate: (S) => (!S.buf ? 'Record something first.' : rec.mr ? 'Stop the recording before saving.' : ''),
    onReset: () => { if (rec.mr && rec.mr.state !== 'inactive') { rec.mr.onstop = null; rec.mr.stop(); } teardown(); $('rec-clock').textContent = '00:00'; $('source-badge').textContent = 'No take yet'; $('rec-hint').textContent = 'Click Record and allow microphone access.'; },
    run: async (S) => ({ buf: S.buf })
  });
  $('btn-rec').addEventListener('click', start);
  $('btn-pause').addEventListener('click', () => { if (!rec.mr) return; if (rec.mr.state === 'recording') { rec.mr.pause(); rec.acc += performance.now() - rec.t0; buttons('paused'); } else { rec.mr.resume(); rec.t0 = performance.now(); buttons('recording'); } });
  $('btn-stop').addEventListener('click', () => { if (rec.mr && rec.mr.state !== 'inactive') { if (rec.mr.state === 'recording') rec.acc += performance.now() - rec.t0; rec.mr.stop(); } });
  $('source-badge').textContent = 'No take yet';
  if (navigator.mediaDevices) listMics();
  window.__vr = { T, rec, start };
})();

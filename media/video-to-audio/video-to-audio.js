/* Video to Audio — Toolity.in. Web Audio decode (or real-time capture fallback) → lamejs MP3 / PCM WAV. All on-device via /scripts/video-common.js. */
(function () {
  'use strict';
  const V = window.ToolityVideo, { formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  let R;
  const fmt = () => $('opt-format').value, kbps = () => Number(fmt().split('-')[1] || 0);
  const toI16 = (f32) => { const o = new Int16Array(f32.length); for (let i = 0; i < f32.length; i++) { const v = Math.max(-1, Math.min(1, f32[i])); o[i] = v < 0 ? v * 32768 : v * 32767; } return o; };
  // Designed by Kapil Pidhwani: lamejs on the main thread in 50-block slices with a yield so progress paints (~15× realtime). Upgrade path: a Worker.
  async function mp3(buf, progress) {
    if (!window.lamejs) throw new Error('MP3 encoder is still loading — try again in a second.');
    const ch = Math.min(2, buf.numberOfChannels), enc = new lamejs.Mp3Encoder(ch, buf.sampleRate, kbps());
    const L = toI16(buf.getChannelData(0)), Rr = ch > 1 ? toI16(buf.getChannelData(1)) : null, parts = [], B = 1152, n = buf.length;
    for (let i = 0; i < n; i += B * 50) {
      for (let j = i; j < Math.min(n, i + B * 50); j += B) { const b = ch > 1 ? enc.encodeBuffer(L.subarray(j, j + B), Rr.subarray(j, j + B)) : enc.encodeBuffer(L.subarray(j, j + B)); if (b.length) parts.push(b); }
      progress(i / n); await new Promise((r) => setTimeout(r, 0));
    }
    const tail = enc.flush(); if (tail.length) parts.push(tail);
    return new Blob(parts, { type: 'audio/mpeg' });
  }
  function wav(buf) {
    const ch = buf.numberOfChannels, n = buf.length, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * ch * 2, true);
    const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
    for (let i = 0, p = 44; i < n; i++) for (let c = 0; c < ch; c++, p += 2) { const v = Math.max(-1, Math.min(1, chans[c][i])); out.setInt16(p, v < 0 ? v * 32768 : v * 32767, true); }
    return new Blob([out], { type: 'audio/wav' });
  }
  const T = V.mount({
    actionLabel: 'Extract audio', verb: 'Recording audio', suffix: 'audio', outExt: () => (fmt() === 'wav' ? 'wav' : 'mp3'),
    onLoad: (S) => R.reset(S.dur),
    onReset: () => { R.reset(0); $('output-wrap').hidden = true; $('output-audio').removeAttribute('src'); },
    summary: () => (fmt() === 'wav' ? 'WAV · lossless' : `MP3 · ${kbps()} kbps`),
    copyText: (S) => `${S.file.name} → ${fmt() === 'wav' ? 'WAV' : `MP3 ${kbps()} kbps`} · ${formatBytes(S.out.size)}`,
    async run(S, api) {
      api.progress(0.05, 'Decoding…');
      let buf = await V.decodeAudio(S.file);
      if (!buf) { const rec = await V.recordAudio(api.src, R.from, R.to, api.onProgress, api.stop); buf = await V.decodeAudio(rec); }
      if (!buf) throw new Error("Couldn't read an audio track from this video.");
      if (!(R.from === 0 && R.to >= buf.duration - 0.05)) buf = V.sliceBuffer(buf, R.from, R.to, false);
      if (fmt() === 'wav') return { blob: wav(buf), buf };
      return { blob: await mp3(buf, (p) => api.progress(0.1 + p * 0.9, `Encoding MP3 ${Math.round(p * 100)}%`)), buf };
    },
    present: (r, S, setOutput) => {
      setOutput(r.blob, 0, 0, `${fmt() === 'wav' ? 'WAV' : `MP3 · ${kbps()} kbps`} · ${r.buf.numberOfChannels > 1 ? 'Stereo' : 'Mono'} ${Math.round(r.buf.sampleRate / 100) / 10} kHz · ${formatBytes(r.blob.size)}`);
      $('output-audio').src = S.outUrl; $('output-name').textContent = `${V.stem(S.file.name)}-audio.${fmt() === 'wav' ? 'wav' : 'mp3'}`; $('output-wrap').hidden = false;
    }
  });
  R = V.bindRange(T.src);
  window.__vta = { T, R, wav };
})();

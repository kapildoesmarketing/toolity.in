/* Audio to Text — Toolity.in. Whisper (onnx-community/whisper-{tiny,base,small}) via Transformers.js, lazily imported and cached;
 * WebGPU when available (falls back to WASM on any failure), 30 s chunks with 5 s stride, text streams in per chunk. Export TXT /
 * SRT / VTT / JSON. Via /scripts/audio-common.js. All on-device — only the model file is downloaded (from Hugging Face, once). */
(function () {
  'use strict';
  const A = window.ToolityAudio, { copyText, downloadBlob, formatTime, formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js';
  const out = $('output-text'), v = (id) => $(id).value, on = (id) => $(id).checked;
  let lib = null, pipe = null, pipeKey = '', tick = 0;
  const segs = { list: [], text: '' };

  // Rule 48: a download/compile that emits nothing for 90 s rejects instead of spinning forever.
  const guard = (p) => new Promise((res, rej) => { tick = Date.now(); const iv = setInterval(() => { if (Date.now() - tick > 90000) { clearInterval(iv); pipe = null; rej(new Error('The model download stalled. Check your connection (or an ad-blocker for huggingface.co / jsdelivr.net) and try again.')); } }, 1000); p.then((x) => { clearInterval(iv); res(x); }, (e) => { clearInterval(iv); rej(e); }); });
  async function load(model, device, onProgress) {
    const key = `${model}|${device}`; if (pipe && pipeKey === key) return pipe;
    lib = lib || import(LIB);
    const { pipeline, env } = await lib; env.allowLocalModels = false;
    const files = {};
    pipeKey = key;
    pipe = pipeline('automatic-speech-recognition', model, {
      dtype: device === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8', device,
      progress_callback: (e) => { tick = Date.now(); if (e.status !== 'progress' || !e.total) return; files[e.file] = [e.loaded, e.total]; const all = Object.values(files), l = all.reduce((s, x) => s + x[0], 0), t = all.reduce((s, x) => s + x[1], 0); onProgress(Math.min(0.99, l / t) * 0.3, `Downloading model ${formatBytes(l)} / ${formatBytes(t)}`); }
    }).catch((e) => { pipe = null; throw e; });
    return pipe;
  }
  const stamp = (s, sep = ',') => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.round((s - Math.floor(s)) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}${sep}${String(ms).padStart(3, '0')}`; };
  const fmt = {
    txt: () => (on('opt-ts') ? segs.list.map((c) => `[${formatTime(c.start)}] ${c.text.trim()}`).join('\n') : segs.text.trim()),
    srt: () => segs.list.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text.trim()}\n`).join('\n'),
    vtt: () => 'WEBVTT\n\n' + segs.list.map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text.trim()}\n`).join('\n'),
    json: () => JSON.stringify({ text: segs.text.trim(), segments: segs.list.map((c) => ({ start: +c.start.toFixed(2), end: +c.end.toFixed(2), text: c.text.trim() })) }, null, 2)
  };
  const paint = () => { out.value = on('opt-ts') && segs.list.length ? fmt.txt() : segs.text.trim(); out.scrollTop = out.scrollHeight; };
  const note = () => { const o = $('opt-model').selectedOptions[0]; $('att-note').textContent = `First run downloads ${o.dataset.mb} MB once (cached after). ${navigator.gpu && on('opt-gpu') ? 'WebGPU available — fast.' : 'Runs on WebAssembly — slower but works everywhere.'}`; };
  note(); $('opt-model').addEventListener('change', note);

  const T = A.mount({
    actionLabel: 'Transcribe', verb: 'Transcribing', suffix: 'transcript',
    summary: () => `${on('opt-ts') ? 'Timestamps' : 'Plain'} · ${v('opt-fmt').toUpperCase()}${v('opt-task') === 'translate' ? ' · → English' : ''}`,
    onSetting: (el) => { if (el.id === 'opt-ts' && segs.list.length) paint(); if (el.id === 'opt-gpu') note(); },
    onLoad: () => { segs.list = []; segs.text = ''; out.value = ''; },
    onReset: () => { segs.list = []; segs.text = ''; out.value = ''; out.classList.remove('is-shown'); },
    validate: (S) => (S.buf.duration > 3600 ? `That recording is ${formatTime(S.buf.duration)} — the limit is 60 minutes. Split it with the Audio Splitter first.` : ''),
    run: async (S, api) => {
      segs.list = []; segs.text = ''; out.value = ''; out.classList.add('is-shown'); $('output-empty').hidden = true;
      const model = v('opt-model'), wantGpu = on('opt-gpu') && !!navigator.gpu;
      api.progress(0.01, 'Loading model…');
      let asr;
      try { asr = await guard(load(model, wantGpu ? 'webgpu' : 'wasm', api.progress)); }
      catch (e) { if (!wantGpu) throw e; console.warn('WebGPU pipeline failed, falling back to WASM', e); api.progress(0.01, 'Loading model (CPU)…'); asr = await guard(load(model, 'wasm', api.progress)); }
      if (api.stop()) throw new Error('Cancelled');
      api.progress(0.3, 'Preparing audio…');
      const mono = await A.resampleTo(S.buf, 16000, 1), pcm = mono.getChannelData(0), dur = S.buf.duration;
      const opts = { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true, task: v('opt-task'), force_full_sequences: false };
      if (v('opt-lang')) opts.language = v('opt-lang');
      // Designed by Kapil Pidhwani: chunk_callback streams finished windows into the textarea; progress = last timestamp / duration.
      opts.chunk_callback = (chunk) => {
        tick = Date.now(); const last = chunk && chunk.chunks && chunk.chunks[chunk.chunks.length - 1]; const t = last && last.timestamp && last.timestamp[1] != null ? last.timestamp[1] : null;
        if (t != null) api.progress(0.3 + 0.7 * Math.min(1, t / dur), `Transcribing ${formatTime(Math.min(t, dur))} / ${formatTime(dur)}`);
      };
      const r = await guard(asr(pcm, opts));
      segs.text = r.text || '';
      segs.list = (r.chunks || []).filter((c) => c.text && c.text.trim()).map((c) => ({ start: c.timestamp[0] || 0, end: c.timestamp[1] == null ? dur : c.timestamp[1], text: c.text }));
      if (!segs.list.length && segs.text.trim()) segs.list = [{ start: 0, end: dur, text: segs.text }];
      paint();
      const words = segs.text.trim().split(/\s+/).filter(Boolean).length;
      return { blob: new Blob([fmt[v('opt-fmt')]()], { type: 'text/plain' }), note: `${words} words · ${segs.list.length} segments` };
    },
    present: (r, S, setOutput) => { setOutput(r.blob, null, `${segs.text.trim().split(/\s+/).filter(Boolean).length} words · ${segs.list.length} segments`); paint(); },
    outExt: () => v('opt-fmt'),
    copy: () => copyText(fmt.txt(), 'Transcript copied')
  });
  // Download reflects the current format select even after the run
  $('btn-download').addEventListener('click', (e) => { if (!segs.list.length) return; e.stopImmediatePropagation(); downloadBlob(new Blob([fmt[v('opt-fmt')]()], { type: v('opt-fmt') === 'json' ? 'application/json' : 'text/plain' }), `${A.stem(T.S.file ? T.S.file.name : 'audio')}-transcript.${v('opt-fmt')}`); }, true);
  window.__att = { T, segs, fmt, stamp };
})();

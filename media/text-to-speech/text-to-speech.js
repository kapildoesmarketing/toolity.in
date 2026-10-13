/* Text to Speech — Toolity.in. "Speak" = the OS voices via speechSynthesis (instant, cannot be recorded by a page).
 * "Create audio file" = Kokoro-82M (kokoro-js, q8 ONNX on WASM) running in the tab → AudioBuffer → MP3/WAV via /scripts/audio-common.js. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const LIB = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js', MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
  const text = $('tts-text'), synth = window.speechSynthesis;
  const rate = () => Number($('opt-rate').value);
  // Sentence-ish chunks ≤ 350 chars: the model truncates long inputs and Chrome cuts long utterances after ~15 s.
  const chunks = (s) => (s.replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) || []).reduce((out, part) => {
    const p = part.trim(); if (!p) return out;
    if (out.length && (out[out.length - 1] + ' ' + p).length <= 350) out[out.length - 1] += ' ' + p; else for (let i = 0; i < p.length; i += 350) out.push(p.slice(i, i + 350));
    return out;
  }, []);
  function count() { const n = text.value.length; $('source-badge').textContent = `${n.toLocaleString()} character${n === 1 ? '' : 's'}`; }
  text.addEventListener('input', count);
  /* ── device voices ── */
  function voices() {
    if (!synth) return; const sel = $('opt-voice'), keep = sel.value, list = synth.getVoices();
    sel.innerHTML = '<option value="">Default</option>' + list.map((v) => `<option value="${v.voiceURI.replace(/"/g, '&quot;')}">${v.name.replace(/</g, '&lt;')} · ${v.lang}</option>`).join('');
    sel.value = keep;
  }
  if (synth) { voices(); synth.addEventListener('voiceschanged', voices); }
  $('btn-speak').addEventListener('click', () => {
    if (!synth) return T.showError('This browser has no built-in speech voices. Use Create audio file instead.');
    const parts = chunks(text.value); if (!parts.length) return T.showError('Type or paste some text first.');
    T.showError(''); synth.cancel();
    const v = synth.getVoices().find((x) => x.voiceURI === $('opt-voice').value);
    parts.forEach((p, i) => { const u = new SpeechSynthesisUtterance(p); if (v) { u.voice = v; u.lang = v.lang; } u.rate = rate(); if (i === parts.length - 1) u.onend = u.onerror = () => { $('btn-stop').disabled = true; }; synth.speak(u); });
    $('btn-stop').disabled = false;
  });
  $('btn-stop').addEventListener('click', () => { if (synth) synth.cancel(); $('btn-stop').disabled = true; });
  /* ── on-device AI voice ── */
  let model = null, tick = 0;
  // Rule 48: a download/compile that emits nothing for 90 s rejects instead of spinning forever.
  const guard = (p) => new Promise((res, rej) => { tick = Date.now(); const iv = setInterval(() => { if (Date.now() - tick > 90000) { clearInterval(iv); model = null; rej(new Error('The AI voice download stalled — check your connection and try again.')); } }, 1000); p.then((v) => { clearInterval(iv); res(v); }, (e) => { clearInterval(iv); rej(e); }); });
  function load(onProgress) {
    if (model) return model;
    const files = {};
    model = import(LIB).then(({ KokoroTTS }) => KokoroTTS.from_pretrained(MODEL, {
      dtype: 'q8', device: 'wasm',
      progress_callback: (e) => { tick = Date.now(); if (e.status !== 'progress' || !e.total) return; files[e.file] = [e.loaded, e.total]; const v = Object.values(files), l = v.reduce((s, x) => s + x[0], 0), t = v.reduce((s, x) => s + x[1], 0); onProgress(l / t, `Downloading voice ${Math.round(l / 1048576)} / ${Math.round(t / 1048576)} MB`); }
    })).catch((e) => { model = null; console.warn(e); throw new Error('The AI voice could not be downloaded. Check your connection (or ad-blocker for huggingface.co / jsdelivr.net) and try again.'); });
    return model;
  }
  const T = A.mount({
    actionLabel: 'Create audio file', verb: 'Speaking', suffix: 'speech', noFile: true,
    fmtRange: (el) => `${Number(el.value).toFixed(2).replace(/\.?0+$/, '')}×`,
    summary: () => `${$('opt-nvoice').selectedOptions[0].textContent.split(' · ')[0]} · ${rate()}× · ${A.fmtLabel($('opt-out').value)}`,
    validate: () => (chunks(text.value).length ? '' : 'Type or paste some text first.'),
    onReset: () => { text.value = ''; count(); if (synth) synth.cancel(); $('btn-stop').disabled = true; $('result-badge').textContent = 'Type or paste text'; $('output-badge').textContent = 'Nothing created yet'; },
    run: async (S, api) => {
      api.progress(0.01, 'Loading AI voice…');
      const tts = await guard(load(api.onProgress)), parts = chunks(text.value), pcm = [], voice = $('opt-nvoice').value;
      for (let i = 0; i < parts.length; i++) {
        if (api.stop()) throw new Error('Cancelled');
        api.progress(i / parts.length, `Speaking ${i + 1} / ${parts.length}`); await new Promise((r) => setTimeout(r, 0));
        const a = await tts.generate(parts[i], { voice, speed: rate() }); pcm.push(a.audio, new Float32Array(Math.round(a.sampling_rate * 0.12)));
      }
      const len = pcm.reduce((s, x) => s + x.length, 0), buf = A.make(1, len, 24000), d = buf.getChannelData(0); let o = 0;
      for (const x of pcm) { d.set(x, o); o += x.length; }
      return { buf, note: `${parts.length} sentence${parts.length > 1 ? 's' : ''} spoken` };
    }
  });
  $('result-badge').textContent = 'Type or paste text';
  window.__tts = { T, chunks };
})();

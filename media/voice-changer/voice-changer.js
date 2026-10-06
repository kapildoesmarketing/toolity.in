/* Voice Changer — Toolity.in. Presets = length-preserving pitch shift (granular stretch + resample) plus Web Audio effect graphs (ring mod, delay, band-pass, convolver). Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, $ = (id) => document.getElementById(id);
  const PRESETS = { deep: { pitch: -4 }, chipmunk: { pitch: 7 }, robot: { pitch: 0, fx: 'ring', hz: 50 }, echo: { pitch: 0, fx: 'echo' }, telephone: { pitch: 0, fx: 'phone' }, cave: { pitch: 0, fx: 'cave' }, alien: { pitch: 2, fx: 'ring', hz: 18 }, custom: { pitch: 0 } };
  const preset = () => $('opt-preset').value, semis = () => (PRESETS[preset()].pitch + Number($('opt-pitch').value));
  async function shift(buf, st) {
    if (!st) return buf; const r = 2 ** (st / 12), stretched = A.stretch(buf, r);
    return A.offline(stretched, (ctx, src) => { src.playbackRate.value = r; return src; }, { length: buf.length });
  }
  function impulse(ctx, sec, decay) { const ir = ctx.createBuffer(2, Math.round(ctx.sampleRate * sec), ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** decay; } return ir; }
  const FX = {
    ring: (ctx, src, p) => { const g = ctx.createGain(); g.gain.value = 0; const o = ctx.createOscillator(); o.frequency.value = p.hz; o.connect(g.gain); o.start(); src.connect(g); return g; },
    echo: (ctx, src) => { const mix = ctx.createGain(), d = ctx.createDelay(1); d.delayTime.value = 0.28; const fb = ctx.createGain(); fb.gain.value = 0.42; src.connect(mix); src.connect(d); d.connect(fb); fb.connect(d); d.connect(mix); return mix; },
    phone: (ctx, src) => { const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; const ws = ctx.createWaveShaper(); const k = 12, curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = (i / 127.5) - 1; curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); } ws.curve = curve; src.connect(hp); hp.connect(lp); lp.connect(ws); return ws; },
    cave: (ctx, src) => { const mix = ctx.createGain(), cv = ctx.createConvolver(); cv.buffer = impulse(ctx, 2.5, 3); const wet = ctx.createGain(); wet.gain.value = 0.7; src.connect(mix); src.connect(cv); cv.connect(wet); wet.connect(mix); return mix; }
  };
  const TAIL = { echo: 1.6, cave: 2.5 };
  const T = A.mount({
    actionLabel: 'Apply effect', verb: 'Transforming', suffix: preset(),
    summary: () => `${$('opt-preset').options[$('opt-preset').selectedIndex].text}${Number($('opt-pitch').value) ? ` · ${Number($('opt-pitch').value) > 0 ? '+' : ''}${$('opt-pitch').value} st` : ''} · ${A.fmtLabel($('opt-out').value)}`,
    fmtRange: (el) => `${Number(el.value) > 0 ? '+' : ''}${el.value} st`,
    run: async (S, api) => {
      const p = PRESETS[preset()]; api.onProgress(0.1, 'Pitching');
      let buf = await shift(S.buf, semis()); api.onProgress(0.5, 'Effects');
      if (p.fx) buf = await A.offline(buf, (ctx, src) => FX[p.fx](ctx, src, p), { length: buf.length + (TAIL[p.fx] || 0) * buf.sampleRate });
      return { buf };
    }
  });
  window.__vc = { T };
})();

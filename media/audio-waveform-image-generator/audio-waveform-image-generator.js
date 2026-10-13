/* Audio Waveform Image Generator — Toolity.in. Peak per column (all channels) → SVG (bars / mirrored / line); PNG rasterised from
 * the same SVG so both exports match exactly. Live preview on every setting change. Via /scripts/audio-common.js. All on-device. */
(function () {
  'use strict';
  const A = window.ToolityAudio, { copyText, copyBlob, formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  const img = $('output-img');
  function peaks(buf, n) {
    const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)), per = buf.length / n, out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = Math.floor(i * per), b = Math.min(buf.length, Math.floor((i + 1) * per)), step = Math.max(1, Math.floor((b - a) / 400)); let m = 0; for (const d of chans) for (let j = a; j < b; j += step) { const v = Math.abs(d[j]); if (v > m) m = v; } out[i] = m; }
    const max = Math.max(1e-6, ...out); return out.map((v) => v / max);
  }
  function svg(buf) {
    const [W, H] = $('opt-size').value.split('x').map(Number), style = $('opt-style').value, bw = Number($('opt-bar').value), gap = Number($('opt-gap').value);
    const fg = $('opt-color').value, bg = $('opt-transparent').checked ? '' : `<rect width="${W}" height="${H}" fill="${$('opt-bg').value}"/>`, pad = H * 0.05, mid = H / 2, amp = (H - 2 * pad) / 2;
    let body;
    if (style === 'bars') {
      const n = Math.max(1, Math.floor((W + gap) / (bw + gap))), p = peaks(buf, n), r = Math.min(bw / 2, 4);
      body = Array.from(p, (v, i) => { const h = Math.max(bw, v * amp * 2); return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="${r}"/>`; }).join('');
    } else {
      const n = Math.min(W, 4000), p = peaks(buf, n), x = (i) => ((i / (n - 1)) * W).toFixed(1);
      if (style === 'mirror') body = `<path d="M0 ${mid} ${Array.from(p, (v, i) => `L${x(i)} ${(mid - v * amp).toFixed(1)}`).join(' ')} ${Array.from(p, (v, i) => `L${x(n - 1 - i)} ${(mid + p[n - 1 - i] * amp).toFixed(1)}`).join(' ')} Z"/>`;
      else body = `<path fill="none" stroke="${fg}" stroke-width="${Math.max(1, bw / 2)}" stroke-linejoin="round" d="${Array.from(p, (v, i) => `${i ? 'L' : 'M'}${x(i)} ${(mid - v * amp * (i % 2 ? -1 : 1)).toFixed(1)}`).join(' ')}"/>`;
    }
    return { W, H, text: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}<g fill="${fg}">${body}</g></svg>` };
  }
  const png = (s) => new Promise((res, rej) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = s.W; c.height = s.H; c.getContext('2d').drawImage(im, 0, 0); c.toBlob((b) => (b ? res(b) : rej(new Error('PNG export failed'))), 'image/png'); }; im.onerror = () => rej(new Error('Could not render the waveform.')); im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.text)}`; });
  let timer = 0;
  const T = A.mount({
    actionLabel: 'Generate image', verb: 'Drawing', suffix: 'waveform',
    fmtRange: (el) => `${el.value} px`,
    summary: () => `${$('opt-style').selectedOptions[0].textContent.replace('Rounded ', '').replace(/ \(.*/, '')} · ${$('opt-size').value.replace('x', ' × ')} · ${$('opt-format').value.toUpperCase()}`,
    onLoad: () => { clearTimeout(timer); timer = setTimeout(T.run, 50); },
    onSetting: () => { if (T.S.buf) { clearTimeout(timer); timer = setTimeout(T.run, 200); } },
    onReset: () => { clearTimeout(timer); img.classList.remove('is-shown'); img.removeAttribute('src'); },
    run: async (S) => {
      const s = svg(S.buf); S.svg = s.text;
      const blob = $('opt-format').value === 'svg' ? new Blob([s.text], { type: 'image/svg+xml' }) : await png(s);
      return { blob, note: `${s.W} × ${s.H}`, W: s.W, H: s.H };
    },
    present: (r, S, setOutput) => { setOutput(r.blob, null, `${r.W} × ${r.H} · ${r.blob.type.includes('svg') ? 'SVG' : 'PNG'} · ${formatBytes(r.blob.size)}`); img.src = S.outUrl; img.classList.add('is-shown'); },
    outExt: (S) => (S.out.type.includes('svg') ? 'svg' : 'png'),
    copy: (S) => (S.out.type.includes('svg') ? copyText(S.svg, 'SVG markup copied') : copyBlob(S.out))
  });
  window.__wfi = { T, svg, peaks };
})();

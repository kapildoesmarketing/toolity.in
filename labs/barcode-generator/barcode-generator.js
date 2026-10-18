/* Designed by Kapil Pidhwani: Barcode Generator — JsBarcode (pinned, loaded once) draws the bars; GS1 check digits (EAN/UPC/ITF)
 * are computed here so errors can say exactly what's wrong. PNG is re-drawn by JsBarcode on a canvas at 4× (no SVG rasterising).
 * Ceiling: batch capped at 1,000 lines (ZIP built in memory). */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const LIB = { JsBarcode: 'https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js', JSZip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js' };
  const MAX_BATCH = 1000, PREVIEW = 12, PNG_SCALE = 4;
  const loading = {};
  const load = (g) => window[g] ? Promise.resolve(window[g]) : (loading[g] = loading[g] || Promise.race([
    new Promise((res, rej) => { const s = document.createElement('script'); s.src = LIB[g]; s.onload = () => (window[g] ? res(window[g]) : rej()); s.onerror = rej; document.head.append(s); }),
    new Promise((_, rej) => setTimeout(rej, 15000))
  ]).catch(() => { delete loading[g]; throw new Error(`Couldn't load ${g} — check your connection and try again.`); }));

  /* GS1 mod-10: weights 3,1,3,1… from the right of the data digits */
  const gs1 = (d) => (10 - ([...d].reverse().reduce((s, c, i) => s + (+c) * (i % 2 ? 1 : 3), 0) % 10)) % 10;
  const GS1 = { EAN13: [12, 'EAN-13'], EAN8: [7, 'EAN-8'], UPC: [11, 'UPC-A'], ITF14: [13, 'ITF-14'] };
  function normalise(fmt, v) {
    if (GS1[fmt]) {
      const [n, label] = GS1[fmt];
      if (!/^\d+$/.test(v)) return { err: `${label} takes digits only` };
      if (v.length === n) return { value: v + gs1(v) };
      if (v.length === n + 1) { const c = gs1(v.slice(0, n)); return +v[n] === c ? { value: v } : { err: `${label} check digit should be ${c}, not ${v[n]}` }; }
      return { err: `${label} needs ${n} digits (check digit added for you) or ${n + 1} with the check digit — got ${v.length}` };
    }
    if (fmt === 'CODE39') { const u = v.toUpperCase(); return /^[0-9A-Z\-. $/+%]+$/.test(u) ? { value: u } : { err: 'Code 39 allows A–Z, 0–9, space and - . $ / + %' }; }
    if (fmt === 'codabar') { const u = v.toUpperCase(); return /^[A-D]?[0-9\-$:/.+]+[A-D]?$/.test(u) ? { value: u } : { err: 'Codabar allows digits and - $ : / . + (optionally wrapped in A–D)' }; }
    return /^[\x20-\x7E]+$/.test(v) ? { value: v } : { err: 'Code 128 supports plain keyboard characters (no emoji or accents)' };
  }

  const opts = (val, k = 1) => ({ format: val('opt-format'), width: (+val('opt-width') || 2) * k, height: (+val('opt-height') || 100) * k, displayValue: val('opt-text'), fontSize: (+val('opt-font') || 18) * k, margin: (+val('opt-margin') || 0) * k, lineColor: val('opt-fg'), background: val('opt-bg'), font: 'monospace' });
  function svgFor(value, o) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    let ok = true; window.JsBarcode(s, value, Object.assign({ valid: (v) => { ok = v; } }, o));
    if (!ok) throw new Error(`“${value}” can't be encoded as ${o.format}`);
    s.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return s;
  }
  function pngFor(value, o) {
    const c = document.createElement('canvas'); window.JsBarcode(c, value, o);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not create the PNG.'))), 'image/png'));
  }
  const safe = (v) => v.replace(/[^\w.-]+/g, '_').slice(0, 60);

  function build({ val, $, S }) {
    const fmt = val('opt-format'), o = opts(val);
    const lines = val('text-input').split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > MAX_BATCH) throw new Error(`Batches are limited to ${MAX_BATCH.toLocaleString()} lines — split the list.`);
    const values = lines.map((l, i) => { const r = normalise(fmt, l); if (r.err) throw new Error(lines.length > 1 ? `Line ${i + 1}: ${r.err}` : r.err); return r.value; });
    const batch = values.length > 1;
    $('input-count').textContent = batch ? `${values.length} barcodes` : 'One per line for a batch';
    const tiles = values.slice(0, PREVIEW).map((v) => {
      const t = document.createElement('div'); t.className = 'bc-tile'; t.append(svgFor(v, o));
      if (batch) { const cap = document.createElement('span'); cap.className = 'bc-cap'; cap.textContent = v; t.append(cap); }
      return t;
    });
    if (values.length > PREVIEW) { const m = document.createElement('p'); m.className = 'web-muted bc-more'; m.textContent = `+ ${values.length - PREVIEW} more in the ZIP download`; tiles.push(m); }
    $('output-list').classList.toggle('is-batch', batch);
    $('output-list').replaceChildren(...tiles);
    S.values = values; S.fmt = fmt;
    const svg = new XMLSerializer().serializeToString(tiles[0].querySelector('svg'));
    const added = !batch && GS1[fmt] && values[0] !== lines[0];
    return { text: svg, svg, copyMsg: 'SVG code copied', blob: new Blob([svg], { type: 'image/svg+xml' }), badge: batch ? `${values.length} barcodes` : values[0], note: added ? `Check digit ${values[0].slice(-1)} added` : batch ? `${values.length} barcodes · download the ZIP for all` : 'Barcode ready' };
  }

  mount({
    slug: 'barcode-generator', idle: 'Enter a value to begin', busyLabel: 'Loading barcode library…',
    ready: ({ val }) => (val('text-input').trim() ? true : 'Enter a value to begin'),
    summary: ({ val }) => `Width ${val('opt-width')} · ${val('opt-height')} px · text ${val('opt-text') ? 'on' : 'off'}`,
    run: (api) => (window.JsBarcode ? build(api) : load('JsBarcode').then(() => build(api))), // sync after first load: no busy flicker per keystroke
    download: async (fmt, { S, val }) => {
      if (fmt === 'svg') return { text: S.out.svg, name: `barcode-${safe(S.values[0])}.svg`, mime: 'image/svg+xml' };
      const hi = opts(val, PNG_SCALE);
      if (fmt === 'png') return { blob: await pngFor(S.values[0], hi), name: `barcode-${safe(S.values[0])}.png` };
      const JSZip = await load('JSZip'), zip = new JSZip(), pad = String(S.values.length).length;
      for (let i = 0; i < S.values.length; i++) zip.file(`${String(i + 1).padStart(pad, '0')}-${safe(S.values[i])}.png`, await pngFor(S.values[i], hi));
      return { blob: await zip.generateAsync({ type: 'blob' }), name: `barcodes-${S.fmt.toLowerCase()}-${S.values.length}.zip` };
    },
    onReset: ({ $, S }) => { $('output-list').replaceChildren(); $('input-count').textContent = 'One per line for a batch'; S.values = null; }
  });
  window.ToolityBarcode = { gs1, normalise }; // exposed for the page test
})();

/* Designed by Kapil Pidhwani: colour maths shared by the Labs colour tools (rule 46). No dependencies.
 * parse() lets the browser do the parsing (any CSS colour: hex, rgb, hsl, hwb, lab, oklch, names…) and reads the
 * pixel back from a canvas — ceiling is 8-bit precision, which is what every output format here shows anyway. */
(function () {
  'use strict';
  let ctx;
  const probe = typeof Option === 'function' ? new Option() : null;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const r1 = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

  function parse(str) {
    str = String(str || '').trim();
    if (!str || !probe) return null;
    probe.style.color = ''; probe.style.color = str;
    if (!probe.style.color) { if (/^[0-9a-f]{3,8}$/i.test(str)) return parse('#' + str); return null; }
    /* Legacy forms (hex, rgb, hsl, hwb, names) serialise to exact rgb()/rgba(); only lab/lch/oklab/oklch/color() need the canvas. */
    const m = probe.style.color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : r1(+m[4], 3) };
    if (!ctx) { const c = document.createElement('canvas'); c.width = c.height = 1; ctx = c.getContext('2d', { willReadFrequently: true }); }
    const over = (bg) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, 1, 1); ctx.fillStyle = str; ctx.fillRect(0, 0, 1, 1); return ctx.getImageData(0, 0, 1, 1).data; };
    const w = over('#fff'), b = over('#000');
    const a = clamp(1 - (w[0] - b[0]) / 255, 0, 1);
    const ch = (i) => (a === 0 ? 0 : clamp(Math.round(b[i] / a), 0, 255));
    return { r: ch(0), g: ch(1), b: ch(2), a: r1(a, 3) };
  }

  const hex2 = (n) => n.toString(16).padStart(2, '0');
  const toHex = (c, upper) => { const s = '#' + hex2(c.r) + hex2(c.g) + hex2(c.b) + (c.a < 1 ? hex2(Math.round(c.a * 255)) : ''); return upper ? s.toUpperCase() : s; };
  const toRgb = (c) => (c.a < 1 ? `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})` : `rgb(${c.r}, ${c.g}, ${c.b})`);

  function rgb2hsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
    let h = 0, s = 0;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
    return { h, s: s * 100, l: l * 100 };
  }
  function hsl2rgb(h, s, l, a = 1) {
    s /= 100; l /= 100; h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255), a };
  }
  const toHsl = (c) => { const { h, s, l } = rgb2hsl(c); return c.a < 1 ? `hsla(${r1(h, 0)}, ${r1(s, 0)}%, ${r1(l, 0)}%, ${c.a})` : `hsl(${r1(h, 0)}, ${r1(s, 0)}%, ${r1(l, 0)}%)`; };
  const toHwb = (c) => { const { h } = rgb2hsl(c), w = Math.min(c.r, c.g, c.b) / 255 * 100, k = 100 - Math.max(c.r, c.g, c.b) / 255 * 100; return `hwb(${r1(h, 0)} ${r1(w, 0)}% ${r1(k, 0)}%${c.a < 1 ? ' / ' + c.a : ''})`; };
  function toCmyk(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255, k = 1 - Math.max(r, g, b);
    if (k === 1) return 'cmyk(0%, 0%, 0%, 100%)';
    const f = (v) => r1((1 - v - k) / (1 - k) * 100, 0);
    return `cmyk(${f(r)}%, ${f(g)}%, ${f(b)}%, ${r1(k * 100, 0)}%)`;
  }
  /* sRGB → OKLab → OKLCH (Björn Ottosson's reference matrices). */
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  function oklab(c) {
    const r = lin(c.r), g = lin(c.g), b = lin(c.b);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return { L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s };
  }
  function toOklch(c) {
    const { L, a, b } = oklab(c), C = Math.hypot(a, b), H = C < 0.0005 ? 0 : (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
    return `oklch(${r1(L * 100, 1)}% ${r1(C, 3)} ${r1(H, 1)}${c.a < 1 ? ' / ' + c.a : ''})`;
  }
  const luminance = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const contrast = (c1, c2) => { const a = luminance(c1), b = luminance(c2); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const isLight = (c) => luminance(c) > 0.4;
  const mix = (c1, c2, t) => ({ r: Math.round(c1.r + (c2.r - c1.r) * t), g: Math.round(c1.g + (c2.g - c1.g) * t), b: Math.round(c1.b + (c2.b - c1.b) * t), a: 1 });

  /* Harmonies in HSL hue space. Returns arrays of rgb objects (base first). */
  function harmony(c, kind, n = 5) {
    const { h, s, l } = rgb2hsl(c);
    const rot = (deg) => hsl2rgb(h + deg, s, l);
    const spread = (list) => list.map(rot);
    const steps = (from, to) => Array.from({ length: n }, (_, i) => hsl2rgb(h, s, from + (to - from) * i / (n - 1)));
    switch (kind) {
      case 'complementary': return spread([0, 180]);
      case 'split': return spread([0, 150, 210]);
      case 'analogous': return spread(Array.from({ length: n }, (_, i) => (i - Math.floor(n / 2)) * 30));
      case 'triadic': return spread([0, 120, 240]);
      case 'tetradic': return spread([0, 90, 180, 270]);
      case 'shades': return steps(l, Math.max(4, l * 0.15));
      case 'tints': return steps(l, Math.min(96, 100 - (100 - l) * 0.15));
      case 'tones': return Array.from({ length: n }, (_, i) => hsl2rgb(h, s * (1 - i / (n - 1) * 0.85), l));
      default: return Array.from({ length: n }, (_, i) => rot(360 / n * i));
    }
  }

  /* Keeps a text input and the <input type=color> beside it (same .web-inline) in step; call with whichever changed. */
  function syncPair(el) {
    const wrap = el.closest('.web-inline'); if (!wrap) return;
    const t = wrap.querySelector('input[type=text]'), p = wrap.querySelector('input[type=color]'); if (!t || !p) return;
    if (el === p) t.value = p.value; else { const c = parse(t.value); if (c) p.value = toHex({ r: c.r, g: c.g, b: c.b, a: 1 }); }
  }

  window.ToolityColor = { parse, toHex, toRgb, toHsl, toHwb, toCmyk, toOklch, rgb2hsl, hsl2rgb, luminance, contrast, isLight, mix, harmony, clamp, syncPair };
})();

/* Accessibility Contrast Matrix — Toolity.in. Palette text → parsed colours (names from CSS vars) → N×N WCAG 2 ratio grid with
 * AA/AAA thresholds, nearest-passing fix (lightness nudge, same method as Contrast Checker), CSV / Markdown / PNG exports.
 * Designed by Kapil Pidhwani: capped at 12 colours (66 pairs) — beyond that the grid stops being readable; split the palette. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, C = window.ToolityColor, { toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const MAX = 12, LEVEL = { aa: 4.5, 'aa-large': 3, aaa: 7, 'aaa-large': 4.5 };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SAMPLE = '--brand: #F4511E\n--ink: #17191C\n--paper: #FFFFFF\n--muted: #6B7076\n--surface: #F6F7F9\n--success: #15803D\n--warning: #CA8A04\n--info: #2563EB';
  const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|\b(?:white|black|red|blue|green|gray|grey|orange|purple|yellow|navy|teal|maroon|olive|silver)\b/gi;
  const onWhite = (c) => (c.a < 1 ? C.mix({ r: 255, g: 255, b: 255, a: 1 }, { ...c, a: 1 }, c.a) : c);

  function parsePalette(text) {
    const out = [], seen = new Set();
    for (const raw of text.split(/\n|;(?![^(]*\))|,(?![^(]*\))/)) {
      const line = raw.trim(); if (!line) continue;
      const m = line.match(COLOR_RE); if (!m) continue;
      const c = C.parse(m[0]); if (!c) continue;
      const hex = C.toHex(onWhite(c), true); if (seen.has(hex)) continue; seen.add(hex);
      const nm = line.match(/^(?:--|\$|@)?([a-z][\w-]*)\s*[:=]/i); out.push({ hex, rgb: onWhite(c), name: nm ? nm[1].replace(/^(color|clr|c)-/i, '') : '' });
      if (out.length >= MAX) break;
    }
    return out;
  }
  function fix(move, fixed, target) {
    const { h, s, l } = C.rgb2hsl(move), dir = C.luminance(fixed) > 0.18 ? -1 : 1;
    for (let L = l; L >= 0 && L <= 100; L += dir) { const c = C.hsl2rgb(h, s, L); if (C.contrast(c, fixed) >= target) return c; }
    return null;
  }
  const grade = (r, target) => (r >= target ? 'pass' : r >= 3 && target > 3 ? 'large' : 'fail');
  const label = (p, i) => (p.name && $('opt-names').checked ? p.name : p.hex);
  const sw = (p) => `<span class="cm-sw" style="background:${p.hex}"></span>`;
  let P = [], R = [], target = 4.5;

  function gridHtml(both) {
    const head = `<thead><tr><th class="cm-corner">text ↓ bg →</th>${P.map((p, i) => `<th scope="col" title="${p.hex}">${sw(p)}<span>${esc(label(p, i))}</span></th>`).join('')}</tr></thead>`;
    const rows = P.map((a, i) => `<tr><th scope="row" title="${a.hex}">${sw(a)}<span>${esc(label(a, i))}</span></th>${P.map((b, j) => {
      if (i === j || (!both && j < i)) return '<td class="cm-cell is-void"></td>';
      const r = R[i][j], g = grade(r, target);
      return `<td class="cm-cell is-${g}" style="background:${b.hex};color:${a.hex}" data-i="${i}" data-j="${j}" title="${esc(label(a))} on ${esc(label(b))}: ${r.toFixed(2)}:1"><button type="button" class="cm-cell-btn" aria-label="${esc(label(a))} on ${esc(label(b))}, ${r.toFixed(2)} to 1, ${g}"><b>${r.toFixed(2)}</b><i>${g === 'pass' ? '✓' : g === 'large' ? 'Lg' : '✗'}</i></button></td>`;
    }).join('')}</tr>`).join('');
    return head + '<tbody>' + rows + '</tbody>';
  }
  const pairs = () => { const o = []; for (let i = 0; i < P.length; i++) for (let j = 0; j < P.length; j++) if (i !== j && j > i) o.push([i, j, R[i][j]]); return o; };
  const csv = () => 'text,text_hex,background,background_hex,ratio,aa_normal,aa_large,aaa_normal\n' + pairs().map(([i, j, r]) => `${label(P[i])},${P[i].hex},${label(P[j])},${P[j].hex},${r.toFixed(2)},${r >= 4.5},${r >= 3},${r >= 7}`).join('\n') + '\n';
  const md = () => `| text \\ bg | ${P.map((p) => label(p)).join(' | ')} |\n|---|${P.map(() => '---').join('|')}|\n` + P.map((a, i) => `| **${label(a)}** | ${P.map((b, j) => (i === j ? '—' : `${R[i][j].toFixed(2)} ${grade(R[i][j], target) === 'pass' ? '✅' : grade(R[i][j], target) === 'large' ? '⚠️' : '❌'}`)).join(' | ')} |`).join('\n') + '\n';
  async function png() {
    const t = $('cm-grid'), w = t.offsetWidth + 24, h = t.offsetHeight + 24, cssText = await fetch(document.querySelector('link[href*="accessibility-contrast-matrix.css"]').getAttribute('href')).then((r) => r.text()).catch(() => '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}"><foreignObject width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="padding:12px;background:#fff;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif"><style>${cssText}</style>${t.outerHTML.replace(/<button[^>]*>/g, '<span class="cm-cell-btn">').replace(/<\/button>/g, '</span>')}</div></foreignObject></svg>`;
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not rasterise the grid')); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  mount({
    slug: 'accessibility-contrast-matrix', debounce: 150,
    ready: ({ val }) => (parsePalette(val('text-input')).length >= 2 ? true : 'Paste at least two colours'),
    summary: ({ val }) => $('opt-level').selectedOptions[0].textContent.replace(' — ', ' · '),
    run({ val }) {
      P = parsePalette(val('text-input')); target = LEVEL[val('opt-level')];
      R = P.map((a) => P.map((b) => C.contrast(a.rgb, b.rgb)));
      $('input-count').textContent = `${P.length} colour${P.length === 1 ? '' : 's'}${P.length >= MAX ? ' (max)' : ''}`;
      $('cm-swatches').innerHTML = P.map((p) => `<span class="web-swatch-chip" title="${p.hex}"><span class="web-swatch" style="background:${p.hex}"></span><span class="web-swatch-label">${esc(p.name || p.hex)}</span></span>`).join('');
      const all = pairs(), pass = all.filter(([, , r]) => r >= target).length, large = all.filter(([, , r]) => r >= 3 && r < target).length, best = all.reduce((m, x) => (x[2] > m[2] ? x : m), all[0]);
      const stat = (k, v) => `<div class="web-stat"><span class="web-muted">${k}</span><strong>${v}</strong></div>`;
      $('cm-stats').innerHTML = stat('Pairs', all.length) + stat(`Pass ${target}:1`, `${pass} (${Math.round(pass / all.length * 100)}%)`) + (target > 3 ? stat('Large text only', large) : '') + stat('Best pair', `${label(P[best[0]])} on ${label(P[best[1]])} · ${best[2].toFixed(1)}:1`);
      $('cm-grid').innerHTML = gridHtml(!val('opt-half')); $('cm-fix').hidden = true;
      return { text: md(), ext: 'md', mime: 'text/markdown', badge: `${pass}/${all.length} pass`, note: pass === all.length ? '✓ Every pair passes' : `${all.length - pass} pair${all.length - pass === 1 ? '' : 's'} below ${target}:1 — click a cell for a fix`, ok: pass === all.length, copyMsg: 'Markdown table copied' };
    },
    async download(fmt) { if (fmt === 'csv') return { text: csv(), mime: 'text/csv', ext: 'csv' }; if (fmt === 'png') return { blob: await png(), ext: 'png' }; return { text: md(), mime: 'text/markdown', ext: 'md' }; },
    filename: () => 'contrast-matrix',
    onReset() { $('cm-swatches').innerHTML = ''; $('cm-fix').hidden = true; }
  });
  $('btn-sample').addEventListener('click', () => { $('text-input').value = SAMPLE; $('text-input').dispatchEvent(new Event('input', { bubbles: true })); });
  $('btn-add').addEventListener('click', () => { const t = $('text-input'); t.value = (t.value.trim() ? t.value.replace(/\s*$/, '\n') : '') + $('opt-add').value.toUpperCase(); t.dispatchEvent(new Event('input', { bubbles: true })); });
  $('cm-grid').addEventListener('click', (e) => {
    const td = e.target.closest('td[data-i]'); if (!td) return; const a = P[+td.dataset.i], b = P[+td.dataset.j], r = R[+td.dataset.i][+td.dataset.j], box = $('cm-fix'); box.hidden = false;
    if (r >= target) { box.innerHTML = `<p><strong>${esc(label(a))}</strong> on <strong>${esc(label(b))}</strong> is ${r.toFixed(2)}:1 — passes ${target}:1. ${r >= 7 ? 'AAA for everything.' : r >= 4.5 ? 'AA normal text, AAA large text.' : 'AA large text / UI only.'}</p>`; return; }
    const f = fix(a.rgb, b.rgb, target), g = fix(b.rgb, a.rgb, target);
    const opt = (name, from, to, fixed) => (to ? `<button type="button" class="cm-fix-opt" data-hex="${C.toHex(to, true)}"><span class="cm-sw" style="background:${C.toHex(to)}"></span><span>${name} → <code>${C.toHex(to, true)}</code> · ${C.contrast(to, fixed).toFixed(2)}:1</span><span class="cm-fix-demo" style="background:${C.toHex(fixed)};color:${C.toHex(to)}">Aa</span></button>` : `<span class="web-muted">${name}: no lightness alone reaches ${target}:1</span>`);
    box.innerHTML = `<p><strong>${esc(label(a))}</strong> on <strong>${esc(label(b))}</strong> is ${r.toFixed(2)}:1 — needs ${target}:1. Nearest fixes (click to copy):</p><div class="cm-fix-opts">${opt('Lighten/darken text', a, f, b.rgb)}${opt('Adjust background', b, g, a.rgb)}</div>`;
  });
  $('cm-fix').addEventListener('click', (e) => { const b = e.target.closest('[data-hex]'); if (b) window.Toolity.copyText(b.dataset.hex, `${b.dataset.hex} copied`); });
  window.__cm = { parsePalette, fix, grade, get P() { return P; }, get R() { return R; } };
})();

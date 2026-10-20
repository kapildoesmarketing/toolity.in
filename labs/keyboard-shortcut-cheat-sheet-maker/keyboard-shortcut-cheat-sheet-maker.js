/* Keyboard Shortcut Cheat-Sheet Maker — Toolity.in. Text → parsed groups/combos → themed sheet; Mac/Windows glyph mapping;
 * exports PNG (SVG foreignObject with the tool CSS inlined), print/PDF (self-contained HTML in a new tab), Markdown, HTML.
 * Designed by Kapil Pidhwani: the sheet is laid out at a fixed export width per column count and visually scaled to the pane,
 * so the PNG matches the preview line for line. Ceiling: PNG needs the browser to rasterise foreignObject (all evergreen do). */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const WIDTH = { 1: 640, 2: 900, 3: 1200 };
  const MAC = { ctrl: '⌘', cmd: '⌘', command: '⌘', win: '⌘', super: '⌘', meta: '⌘', alt: '⌥', option: '⌥', opt: '⌥', shift: '⇧', control: '⌃', ctl: '⌃' };
  const WIN = { ctrl: 'Ctrl', cmd: 'Ctrl', command: 'Ctrl', win: 'Win', super: 'Win', meta: 'Win', alt: 'Alt', option: 'Alt', opt: 'Alt', shift: 'Shift', control: 'Ctrl', ctl: 'Ctrl' };
  const GLYPH = { up: '↑', down: '↓', left: '←', right: '→', enter: '↵', return: '↵', backspace: '⌫', delete: '⌦', del: '⌦', tab: '⇥', esc: 'Esc', escape: 'Esc', space: 'Space', pgup: 'PgUp', pageup: 'PgUp', pgdn: 'PgDn', pagedown: 'PgDn', home: 'Home', end: 'End', plus: '+', minus: '−', comma: ',', period: '.' };
  const ORDER = ['⌃', '⌥', '⇧', '⌘', 'Ctrl', 'Alt', 'Shift', 'Win'];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const PRESETS = {
    vscode: `## Editing\nCtrl+D — Select next occurrence\nCtrl+Shift+L — Select all occurrences\nAlt+Up / Alt+Down — Move line\nShift+Alt+Down — Copy line down\nCtrl+/ — Toggle comment\nCtrl+K Ctrl+C — Comment block (chord)\nF2 — Rename symbol\nShift+Alt+F — Format document\n\n## Navigation\nCtrl+P — Quick open file\nCtrl+Shift+P — Command palette\nCtrl+G — Go to line\nF12 — Go to definition\nCtrl+Shift+O — Go to symbol\nCtrl+Tab — Switch editor\n\n## View\nCtrl+B — Toggle sidebar\nCtrl+\` — Toggle terminal\nCtrl+\\ — Split editor\nCtrl+Shift+E — Explorer\nCtrl+Shift+F — Search in files`,
    chrome: `## Tabs & windows\nCtrl+T — New tab\nCtrl+W — Close tab\nCtrl+Shift+T — Reopen closed tab\nCtrl+Tab — Next tab\nCtrl+1…8 — Jump to tab\nCtrl+N — New window\nCtrl+Shift+N — Incognito window\n\n## Page\nCtrl+L — Focus address bar\nCtrl+F — Find on page\nCtrl+R — Reload\nCtrl+Shift+R — Hard reload\nCtrl+D — Bookmark page\nCtrl+Plus / Ctrl+Minus — Zoom\nSpace / Shift+Space — Scroll page\n\n## DevTools\nF12 — Toggle DevTools\nCtrl+Shift+C — Inspect element\nCtrl+Shift+J — Console\nCtrl+Shift+M — Device toolbar`,
    gmail: `## Compose\nC — Compose\nCtrl+Enter — Send\nCtrl+Shift+C — Add Cc\nCtrl+K — Insert link\n\n## Reading\nE — Archive\n# — Delete\nR — Reply\nA — Reply all\nF — Forward\nShift+U — Mark unread\nS — Star\n\n## Navigation\nG then I — Go to inbox\nG then S — Go to starred\nJ / K — Older / newer conversation\n/ — Search\n? — Show all shortcuts`,
    figma: `## Tools\nV — Move\nF — Frame\nR — Rectangle\nO — Ellipse\nT — Text\nP — Pen\nK — Scale\nH — Hand\n\n## Edit\nCtrl+D — Duplicate\nCtrl+G — Group\nCtrl+Alt+G — Frame selection\nCtrl+Shift+K — Place image\nAlt+Drag — Duplicate while moving\nShift+A — Auto layout\nCtrl+Alt+C — Copy properties\nCtrl+Alt+V — Paste properties\n\n## View\nShift+1 — Zoom to fit\nShift+2 — Zoom to selection\nCtrl+\\ — Toggle UI\nCtrl+Shift+E — Export`,
    slack: `## Messages\nCtrl+K — Jump to conversation\nUp — Edit last message\nCtrl+Shift+Enter — Code block\nShift+Enter — New line\nE — Edit selected message\n\n## Navigation\nAlt+Up / Alt+Down — Previous / next channel\nAlt+Shift+Down — Next unread channel\nCtrl+Shift+A — All unreads\nCtrl+Shift+M — Activity\nCtrl+. — Toggle right pane\nEsc — Mark channel read\nShift+Esc — Mark all read`,
    excel: `## Navigation\nCtrl+Arrow — Jump to edge of data\nCtrl+Shift+Arrow — Select to edge\nCtrl+Home — Go to A1\nCtrl+PgDn — Next sheet\nF5 — Go to\n\n## Editing\nF2 — Edit cell\nCtrl+D — Fill down\nCtrl+R — Fill right\nCtrl+; — Insert today's date\nCtrl+Shift+; — Insert time\nAlt+Enter — New line in cell\nCtrl+Shift+L — Toggle filters\nF4 — Toggle absolute reference\n\n## Formatting\nCtrl+1 — Format cells\nCtrl+Shift+$ — Currency\nCtrl+Shift+% — Percent\nCtrl+B — Bold\nAlt+= — AutoSum`,
    toolity: `## Site\nCtrl+K — Search tools\nT — Toggle theme\n\n## Tool pages\nCtrl+Enter — Run / convert\nEsc — Reset\nCtrl+Shift+C — Copy result\nCtrl+S — Download result\n\n## Chronometer\nSpace — Start / pause\nL — Lap\nR — Reset\nF — Fullscreen`
  };

  /* ── Parse ── */
  function parse(text) {
    const groups = []; let g = null;
    for (const raw of text.split('\n')) {
      const line = raw.trim(); if (!line) continue;
      if (/^#{1,3}\s*/.test(line)) { g = { title: line.replace(/^#{1,3}\s*/, ''), rows: [] }; groups.push(g); continue; }
      const m = line.match(/^(.+?)\s*(?:—|–|->|→|:|\t| - |\s{2,})\s*(.+)$/); if (!m) continue;
      if (!g) { g = { title: '', rows: [] }; groups.push(g); }
      g.rows.push({ keys: m[1].trim(), desc: m[2].trim() });
    }
    return groups;
  }
  // "Ctrl+K Ctrl+C" → chord of two combos; "A / B" → alternatives; "G then I" → sequence
  function combos(keys, os) {
    const alts = keys.split(/\s+\/\s+|\s+or\s+/i);
    return alts.map((alt) => alt.split(/\s+then\s+|\s+/i).filter(Boolean).map((combo) => render(combo, os)));
  }
  function render(combo, os) {
    const map = os === 'mac' ? MAC : WIN, parts = combo.split(/(?<!^)\+(?!$)/).map((p) => p.trim()).filter(Boolean);
    const out = parts.map((p) => { const k = p.toLowerCase(); return map[k] || GLYPH[k] || (p.length === 1 ? p.toUpperCase() : p); });
    const mods = out.filter((k) => ORDER.includes(k)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), rest = out.filter((k) => !ORDER.includes(k));
    return mods.concat(rest);
  }
  const kbdHtml = (list, os) => list.map((alt, i) => (i ? '<span class="ks-or">or</span>' : '') + alt.map((combo, j) => (j ? '<span class="ks-then">then</span>' : '') + combo.map((k) => `<kbd class="ks-key${os === 'mac' && /^[⌘⌥⇧⌃]$/.test(k) ? ' is-sym' : ''}">${esc(k)}</kbd>`).join('<span class="ks-plus">+</span>')).join('')).join('');
  const kbdText = (list, os) => list.map((alt) => alt.map((combo) => combo.join(os === 'mac' ? '' : '+')).join(' then ')).join(' / ');

  /* ── Render ── */
  function sheetHtml(st, forExport) {
    let n = 0;
    const row = (r) => { n++; const mac = combos(r.keys, 'mac'), win = combos(r.keys, 'win'); const keys = st.os === 'both' ? `<span class="ks-keys">${kbdHtml(mac, 'mac')}</span><span class="ks-keys ks-keys-alt">${kbdHtml(win, 'win')}</span>` : `<span class="ks-keys">${kbdHtml(st.os === 'mac' ? mac : win, st.os)}</span>`; return `<li class="ks-row">${st.numbers ? `<span class="ks-num">${n}</span>` : ''}${keys}<span class="ks-desc">${esc(r.desc)}</span></li>`; };
    const groups = st.groups.map((g) => `<section class="ks-group">${g.title ? `<h3 class="ks-group-title">${esc(g.title)}</h3>` : ''}<ul class="ks-rows">${g.rows.map(row).join('')}</ul></section>`).join('');
    return `<div class="ks-paper theme-${st.theme}${forExport ? ' is-export' : ''}" style="--ks-accent:${st.accent};--ks-cols:${st.cols}"><header class="ks-head"><h2 class="ks-title">${esc(st.title || 'Shortcuts')}</h2>${st.subtitle ? `<p class="ks-sub">${esc(st.subtitle)}</p>` : ''}<span class="ks-os">${{ mac: 'macOS', win: 'Windows / Linux', both: 'Mac · Windows' }[st.os]}</span></header><div class="ks-cols">${groups}</div>${st.credit ? '<footer class="ks-credit">Made with toolity.in/labs/keyboard-shortcut-cheat-sheet-maker</footer>' : ''}</div>`;
  }
  const markdown = (st) => `# ${st.title || 'Shortcuts'}${st.subtitle ? `\n\n_${st.subtitle}_` : ''}\n\n` + st.groups.map((g) => `${g.title ? `## ${g.title}\n\n` : ''}| Shortcut${st.os === 'both' ? ' (Mac) | Shortcut (Windows)' : ''} | Action |\n|---${st.os === 'both' ? '|---' : ''}|---|\n` + g.rows.map((r) => st.os === 'both' ? `| \`${kbdText(combos(r.keys, 'mac'), 'mac')}\` | \`${kbdText(combos(r.keys, 'win'), 'win')}\` | ${r.desc} |` : `| \`${kbdText(combos(r.keys, st.os), st.os)}\` | ${r.desc} |`).join('\n')).join('\n\n') + '\n';
  let css = ''; const cssReady = fetch(document.querySelector('link[href*="keyboard-shortcut-cheat-sheet-maker.css"]').getAttribute('href')).then((r) => r.text()).then((t) => { css = t; }).catch(() => {});
  const standalone = (st, print) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(st.title || 'Shortcuts')}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\nbody{margin:0;background:#fff;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.ks-paper{width:auto;max-width:${WIDTH[st.cols]}px;margin:0 auto}@page{size:${st.paper === 'letter' ? 'Letter' : 'A4'};margin:14mm}@media print{.ks-paper{box-shadow:none;border:0;border-radius:0;max-width:none}.ks-group{break-inside:avoid}}</style></head><body>${sheetHtml(st, true)}${print ? '<script>addEventListener("load",()=>setTimeout(()=>print(),300))<\/script>' : ''}</body></html>`;
  async function toPng(st) {
    await cssReady;
    const w = WIDTH[st.cols], host = document.createElement('div'); host.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px`; host.innerHTML = sheetHtml(st, true); document.body.appendChild(host);
    const h = Math.ceil(host.firstChild.getBoundingClientRect().height); host.remove();
    const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"><style>${css}</style>${sheetHtml(st, true)}</div>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}"><foreignObject width="${w}" height="${h}">${html}</foreignObject></svg>`;
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('The browser could not rasterise the sheet — try the HTML export.')); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }
  const state = ({ val, pill }) => ({ title: val('opt-title').trim(), subtitle: val('opt-subtitle').trim(), os: pill('seg-os') || 'mac', cols: +val('opt-cols'), theme: val('opt-theme'), accent: val('opt-accent'), paper: val('opt-paper'), numbers: val('opt-numbers'), credit: val('opt-credit'), groups: parse(val('text-input')) });
  function fit() { const wrap = $('ks-sheet').parentElement, sheet = $('ks-sheet'), w = +sheet.dataset.w || 900, avail = wrap.clientWidth; const k = Math.min(1, avail / w); sheet.style.transform = `scale(${k})`; wrap.style.height = `${sheet.offsetHeight * k}px`; }
  let last = null;

  mount({
    slug: 'keyboard-shortcut-cheat-sheet-maker', debounce: 150,
    ready: ({ val }) => (parse(val('text-input')).some((g) => g.rows.length) ? true : 'Type a shortcut to begin'),
    summary: ({ val }) => `${val('opt-cols')} column${val('opt-cols') === '1' ? '' : 's'} · ${val('opt-theme')[0].toUpperCase() + val('opt-theme').slice(1)} · ${val('opt-paper') === 'letter' ? 'Letter' : 'A4'}`,
    onInput(el, api) { if (el.id === 'opt-preset' && el.value) { $('text-input').value = PRESETS[el.value]; const t = $('opt-preset').selectedOptions[0].textContent; $('opt-title').value = `${t} shortcuts`; el.value = ''; } },
    run(api) {
      const st = last = state(api), rows = st.groups.reduce((a, g) => a + g.rows.length, 0);
      $('input-count').textContent = `${rows} shortcut${rows === 1 ? '' : 's'} · ${st.groups.length} group${st.groups.length === 1 ? '' : 's'}`;
      const sheet = $('ks-sheet'); sheet.innerHTML = sheetHtml(st, false); sheet.dataset.w = WIDTH[st.cols]; sheet.style.width = `${WIDTH[st.cols]}px`; requestAnimationFrame(fit);
      return { text: markdown(st), ext: 'md', mime: 'text/markdown', badge: `${rows} shortcuts · ${WIDTH[st.cols]} px wide`, note: `${{ mac: 'Mac symbols', win: 'Windows keys', both: 'Mac + Windows' }[st.os]} · Copy = Markdown`, copyMsg: 'Markdown copied', ok: true };
    },
    filename: ({ val }) => (val('opt-title').trim() || 'shortcuts').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    async download(fmt, api) {
      const st = last || state(api); await cssReady;
      if (fmt === 'png') return { blob: await toPng(st), ext: 'png' };
      if (fmt === 'html') return { text: standalone(st, false), mime: 'text/html', ext: 'html' };
      if (fmt === 'print') { const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print'); return null; } w.document.open(); w.document.write(standalone(st, true)); w.document.close(); return null; }
      return { text: markdown(st), mime: 'text/markdown', ext: 'md' };
    },
    onReset() { $('text-input').value = ''; last = null; }
  });
  addEventListener('resize', fit);
  if (!$('text-input').value) { $('text-input').value = PRESETS.vscode; window.ToolityWebTool.run(); }
  window.__ks = { parse, combos, render, markdown, PRESETS, toPng, state: () => last };
})();

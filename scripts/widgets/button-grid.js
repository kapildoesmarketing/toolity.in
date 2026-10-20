/* Designed by Kapil Pidhwani: Button Grid widget — 2–8 big link buttons (label | url | icon) for dashboards. Icons are Iconify
 * names rendered by the Iconify API (SVG fetched by the viewer's browser, cached); emoji or any text works too. */
(function () {
  'use strict';
  const SCHEMA = [
    { key: 'items', type: 'text', multiline: true, maxLength: 900, default: 'Inbox | https://mail.google.com | lucide:mail\nCalendar | https://calendar.google.com | lucide:calendar\nTasks | https://todoist.com | lucide:check-square\nNotes | https://notion.so | simple-icons:notion', id: 'opt-items', label: 'Buttons' },
    { key: 'cols', type: 'enum', default: '2', options: ['1', '2', '3', '4'], id: 'seg-cols', label: 'Columns' },
    { key: 'style', type: 'enum', default: 'soft', options: ['soft', 'filled', 'outline'], id: 'seg-style', label: 'Style' },
    { key: 'newtab', type: 'bool', default: true, id: 'opt-newtab', label: 'Open in new tab' },
    { key: 'labels', type: 'bool', default: true, id: 'opt-labels', label: 'Show labels' }
  ];
  const parse = (s) => String(s || '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p[0] && p[1]).slice(0, 8).map(([label, url, icon]) => ({ label, url: /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : 'https://' + url, icon: icon || '' })).filter((b) => /^https?:|^mailto:|^tel:/i.test(b.url));
  const validate = (st) => (parse(st.items).length >= 1 ? '' : 'Add at least one line: Label | https://url | lucide:icon');
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  function iconEl(name, color) {
    if (!name) return null;
    if (/^[a-z0-9-]+:[a-z0-9-]+$/i.test(name)) { const i = el('span', 'w-btn-icon'); const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.width = 28; img.height = 28; img.src = `https://api.iconify.design/${name.split(':')[0]}/${name.split(':')[1]}.svg?color=${encodeURIComponent(color)}`; i.appendChild(img); return i; }
    return el('span', 'w-btn-icon w-btn-emoji', name);
  }
  function render(root, state) {
    root.innerHTML = '';
    const wrap = el('div', 'w-card-wrap w-grid-wrap'), items = parse(state.items), grid = el('div', `w-grid style-${state.style}${state.labels ? '' : ' no-labels'}`);
    grid.style.setProperty('--cols', state.cols); grid.setAttribute('role', 'list');
    items.forEach((b) => {
      const a = el('a', 'w-gbtn'); a.href = b.url; a.setAttribute('role', 'listitem'); a.title = b.label; if (state.newtab) { a.target = '_blank'; a.rel = 'noopener'; }
      const ic = iconEl(b.icon, state.style === 'filled' ? '#ffffff' : '#' + (state.accent || 'F4511E')); if (ic) a.appendChild(ic); a.appendChild(el('span', 'w-gbtn-label', b.label)); if (!state.labels) a.setAttribute('aria-label', b.label);
      grid.appendChild(a);
    });
    wrap.appendChild(grid); root.appendChild(wrap);
    // Designed by Kapil Pidhwani: the stage is a fixed container; scale button size to the available width per column.
    const fit = () => { const w = root.clientWidth / +state.cols; grid.style.setProperty('--btn', `${Math.max(56, Math.min(140, w * 0.55))}px`); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(root);
    return () => ro.disconnect();
  }
  window.__grid = { parse };
  if (window.ToolityWidgets) window.ToolityWidgets.register({ slug: 'button-grid', title: 'Button Grid', height: 200, schema: SCHEMA, validate, render });
})();

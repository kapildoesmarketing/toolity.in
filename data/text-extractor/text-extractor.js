/* Designed by Kapil Pidhwani: Text Extractor — regex passes in a fixed order (emails → links → dates* → phones → numbers → hashtags; *masked only).
 * Each earlier match is masked with spaces so later passes never pick pieces of it (no "42" out of a phone number).
 * Ceiling: pattern-based; phone numbers aren't validated per country (FAQ says so). */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const TYPES = [
    { id: 'email', label: 'Emails', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, ci: true },
    { id: 'url', label: 'Links', re: /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi, ci: true, clean: (s) => { s = s.replace(/[.,;:!?'"]+$/, ''); while (s.endsWith(')') && (s.match(/\(/g) || []).length < (s.match(/\)/g) || []).length) s = s.slice(0, -1); while (s.endsWith(']') && !s.includes('[')) s = s.slice(0, -1); return s; } },
    { id: 'date', mask: true, re: /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?\b|\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b|\b\d{1,2}:\d{2}(?::\d{2})?\b/g },
    { id: 'phone', label: 'Phone numbers', re: /(?<![\w+])\+?\(?\d[\d\s().-]{5,}\d(?![\w])/g, keep: (s) => { const d = s.replace(/\D/g, ''); return d.length >= 7 && d.length <= 15 && !/^\d{4}-\d{2}-\d{2}$|^\d{2}[./-]\d{2}[./-]\d{2,4}$/.test(s.trim()) && !/^\d+\.\d+$/.test(s.trim()); } },
    { id: 'number', label: 'Numbers', re: /(?<![\w.,#&])[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\w]|[.,]\d)/g, num: true },
    { id: 'hashtag', label: 'Hashtags', re: /(?<![\w&#])#[\p{L}\p{N}_]*\p{L}[\p{L}\p{N}_]*/gu, ci: true }
  ];
  const ORDER = ['email', 'phone', 'url', 'number', 'hashtag']; // display order = checkbox order
  const SEP = { '\\n': '\n', ', ': ', ', ',': ',', '; ': '; ' };

  function extract(text, o) {
    let t = text; const found = {};
    for (const T of TYPES) {
      const list = [];
      t = t.replace(T.re, (m) => {
        let v = T.clean ? T.clean(m) : m.trim();
        if (T.keep && !T.keep(v)) return m;
        list.push(v);
        return ' '.repeat(m.length);
      });
      if (T.mask || !o[T.id]) continue;
      let out = T.id === 'email' && o.lower ? list.map((s) => s.toLowerCase()) : list;
      if (o.unique) { const seen = new Set(); out = out.filter((v) => { const k = T.ci ? v.toLowerCase() : T.num ? String(+v.replace(/,/g, '')) : v.replace(/[^\d+]/g, '') || v; if (seen.has(k)) return false; seen.add(k); return true; }); }
      if (o.sort) out = [...out].sort(T.num ? (a, b) => a.replace(/,/g, '') - b.replace(/,/g, '') : (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      found[T.id] = out;
    }
    return found;
  }

  mount({
    slug: 'text-extractor', idle: 'Paste text to begin',
    ready: ({ val }) => (!val('text-input').trim() ? 'Paste text to begin' : ORDER.some((id) => val('opt-' + id)) ? true : 'Tick at least one thing to extract'),
    summary: ({ val }) => [val('opt-unique') ? 'Unique' : 'All matches', val('opt-sort') ? 'sorted' : 'original order', { '\\n': 'one per line', ', ': 'comma + space', ',': 'comma', '; ': 'semicolon' }[val('opt-sep')]].join(' · '),
    run: ({ val, $ }) => {
      const o = Object.fromEntries(ORDER.map((id) => [id, val('opt-' + id)]));
      Object.assign(o, { unique: val('opt-unique'), sort: val('opt-sort'), lower: val('opt-lower') });
      const sep = SEP[val('opt-sep')] || '\n', text = val('text-input');
      const found = extract(text, o);
      const groups = ORDER.map((id) => TYPES.find((T) => T.id === id)).filter((T) => found[T.id]);
      const total = groups.reduce((n, T) => n + found[T.id].length, 0);
      $('input-count').textContent = `${text.length.toLocaleString()} characters`;
      $('output-groups').replaceChildren(...groups.map((T) => {
        const items = found[T.id], g = document.createElement('div'); g.className = 'web-group';
        g.innerHTML = '<div class="web-group-head"><span></span><button type="button" class="btn-toolbar-sm"><iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon><span>Copy</span></button></div><pre class="web-code"></pre>';
        g.querySelector('.web-group-head > span').textContent = `${T.label} · ${items.length}`;
        g.querySelector('pre').textContent = items.length ? items.join(sep) : 'None found';
        g.querySelector('pre').classList.toggle('web-muted', !items.length);
        const b = g.querySelector('button'); b.disabled = !items.length; b.setAttribute('aria-label', `Copy ${T.label.toLowerCase()}`);
        b.addEventListener('click', () => window.Toolity.copyText(items.join(sep), `Copied ${items.length} ${T.label.toLowerCase()}`));
        return g;
      }));
      const all = groups.filter((T) => found[T.id].length).map((T) => (groups.length > 1 ? `${T.label} (${found[T.id].length})\n` : '') + found[T.id].join(sep)).join('\n\n');
      const csv = ['type,value', ...groups.flatMap((T) => found[T.id].map((v) => `${T.id},${/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v}`))].join('\n');
      return { text: all || '', csv, ext: 'txt', badge: `${total} found`, note: total ? groups.map((T) => { const n = found[T.id].length, l = T.label.toLowerCase(); return `${n} ${n === 1 ? l.slice(0, -1) : l}`; }).join(' · ') : 'Nothing found', ok: total > 0 };
    },
    download: (fmt, { S }) => (fmt === 'csv' ? { text: S.out.csv, ext: 'csv', mime: 'text/csv;charset=utf-8' } : { text: S.out.text, ext: 'txt' }),
    filename: () => 'extracted',
    onReset: ({ $ }) => { $('input-count').textContent = ''; $('output-groups').replaceChildren(); }
  });
})();

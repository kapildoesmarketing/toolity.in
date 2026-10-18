/* Designed by Kapil Pidhwani: Diff Checker on jsdiff (pinned ESM, loaded on first use). diffLines gives the line parts;
 * a removed run followed by an added run is paired line-by-line as "changed" rows, each re-diffed with diffWordsWithSpace
 * for the inline word highlights. JSON mode canonicalises (sorted keys, 2-space pretty print) before diffing.
 * run() stays synchronous with the cache trick so typing never trips the busy overlay. Ceilings: 20 000 table rows
 * drawn (the patch is always complete); the diff runs on the main thread. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const ROWS_MAX = 20000;
  let libP = null;
  const lib = () => (libP = libP || import('https://cdn.jsdelivr.net/npm/diff@8.0.2/+esm').catch(() => { libP = null; throw new Error("Couldn't load the diff engine — check your connection and try again."); }));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
  const asJson = (s, side) => { try { return JSON.stringify(canon(JSON.parse(s)), null, 2) + '\n'; } catch (e) { throw new Error(`${side} is not valid JSON — ${e.message.replace(/^JSON\.parse: /, '')}`); } };
  const splitLines = (s) => { const a = s.split('\n'); if (a[a.length - 1] === '') a.pop(); return a; };

  /* parts → rows: { kind: 'same'|'add'|'del'|'chg', a?, b?, na?, nb? } (one row per line; chg carries both sides) */
  function rows(parts) {
    const out = []; let na = 1, nb = 1, i = 0;
    while (i < parts.length) {
      const p = parts[i];
      if (!p.added && !p.removed) { for (const l of splitLines(p.value)) out.push({ kind: 'same', a: l, b: l, na: na++, nb: nb++ }); i++; continue; }
      const del = p.removed ? splitLines(p.value) : [], add = p.removed && parts[i + 1] && parts[i + 1].added ? splitLines(parts[i + 1].value) : p.added ? splitLines(p.value) : [];
      i += p.removed && parts[i + 1] && parts[i + 1].added ? 2 : 1;
      const n = Math.min(del.length, add.length);
      for (let k = 0; k < n; k++) out.push({ kind: 'chg', a: del[k], b: add[k], na: na++, nb: nb++ });
      for (let k = n; k < del.length; k++) out.push({ kind: 'del', a: del[k], na: na++ });
      for (let k = n; k < add.length; k++) out.push({ kind: 'add', b: add[k], nb: nb++ });
    }
    return out;
  }
  const wordHtml = (D, a, b, opt) => { // → [htmlA, htmlB]
    const parts = D.diffWordsWithSpace(a, b, { ignoreCase: opt.ignoreCase });
    let ha = '', hb = '';
    for (const p of parts) { const t = esc(p.value); if (p.added) hb += `<em>${t}</em>`; else if (p.removed) ha += `<em>${t}</em>`; else { ha += t; hb += t; } }
    return [ha, hb];
  };
  function table(D, R, view, opt, ctx) {
    const keep = new Array(R.length).fill(ctx === null);
    if (ctx !== null) R.forEach((r, i) => { if (r.kind !== 'same') for (let k = Math.max(0, i - ctx); k <= Math.min(R.length - 1, i + ctx); k++) keep[k] = true; });
    const html = []; let drawn = 0, skipped = 0, changeIdx = 0, prevKind = 'same';
    const flushSkip = () => { if (skipped) { html.push(`<tr class="diff-skip"><td colspan="${view === 'side' ? 4 : 3}">… ${skipped.toLocaleString()} unchanged line${skipped === 1 ? '' : 's'}</td></tr>`); skipped = 0; } };
    for (let i = 0; i < R.length && drawn < ROWS_MAX; i++) {
      const r = R[i];
      if (!keep[i]) { skipped++; prevKind = 'same'; continue; }
      flushSkip();
      const start = r.kind !== 'same' && prevKind === 'same' ? ` data-change="${changeIdx++}"` : '';
      prevKind = r.kind;
      let ha = r.a !== undefined ? esc(r.a) : '', hb = r.b !== undefined ? esc(r.b) : '';
      if (r.kind === 'chg' && opt.words) [ha, hb] = wordHtml(D, r.a, r.b, opt);
      if (view === 'side') {
        html.push(`<tr class="diff-${r.kind}"${start}><td class="diff-n">${r.na || ''}</td><td class="diff-c diff-l">${r.kind === 'add' ? '' : ha}</td><td class="diff-n">${r.nb || ''}</td><td class="diff-c diff-r">${r.kind === 'del' ? '' : hb}</td></tr>`);
      } else if (r.kind === 'chg') {
        html.push(`<tr class="diff-del"${start}><td class="diff-n">${r.na}</td><td class="diff-n"></td><td class="diff-c">−&nbsp;${ha}</td></tr>`, `<tr class="diff-add"><td class="diff-n"></td><td class="diff-n">${r.nb}</td><td class="diff-c">+&nbsp;${hb}</td></tr>`); drawn++;
      } else {
        html.push(`<tr class="diff-${r.kind}"${start}><td class="diff-n">${r.na || ''}</td><td class="diff-n">${r.nb || ''}</td><td class="diff-c">${r.kind === 'add' ? '+' : r.kind === 'del' ? '−' : '&nbsp;'}&nbsp;${r.kind === 'del' ? ha : hb}</td></tr>`);
      }
      drawn++;
    }
    flushSkip();
    if (drawn >= ROWS_MAX) html.push(`<tr class="diff-skip"><td colspan="${view === 'side' ? 4 : 3}">Showing the first ${ROWS_MAX.toLocaleString()} rows — the downloaded patch is complete.</td></tr>`);
    return { html: html.join(''), changes: changeIdx };
  }

  const job = (val, pill) => ({ a: val('text-a'), b: val('text-b'), mode: pill('seg-mode') || 'text', ignoreWhitespace: val('opt-ws'), ignoreCase: val('opt-case') });
  let cache = { key: null }, pending = null, cur = -1;
  async function compute(j) {
    const D = await lib();
    const a = j.mode === 'json' ? asJson(j.a, 'Original') : j.a, b = j.mode === 'json' ? asJson(j.b, 'Changed') : j.b;
    const norm = (s) => { let t = s; if (j.ignoreWhitespace) t = t.replace(/\s+/g, ' ').trim(); if (j.ignoreCase) t = t.toLowerCase(); return t; };
    const parts = D.diffLines(a, b, j.ignoreWhitespace || j.ignoreCase ? { comparator: (x, y) => norm(x) === norm(y) } : {});
    const R = rows(parts);
    const add = R.filter((r) => r.kind === 'add').length, del = R.filter((r) => r.kind === 'del').length, chg = R.filter((r) => r.kind === 'chg').length;
    const patch = D.createTwoFilesPatch('original', 'changed', a, b, '', '', { context: 3 });
    return { D, R, add, del, chg, patch, total: R.length };
  }
  const api = mount({
    slug: 'diff-checker', debounce: 200,
    ready: ({ val }) => (val('text-a') || val('text-b') ? true : 'Paste the original and the changed text'),
    summary: ({ val }) => [val('opt-words') ? 'Word highlights' : 'Line highlights', val('opt-ws') ? 'ignore whitespace' : null, val('opt-case') ? 'ignore case' : null, val('opt-context') === 'all' ? 'all context' : val('opt-context') === '0' ? 'changes only' : '3 lines context'].filter(Boolean).join(' · '),
    run: ({ val, pill, $, S, status }) => {
      const j = job(val, pill), key = JSON.stringify(j);
      $('count-a').textContent = `${splitLines(j.a).length.toLocaleString()} lines`; $('count-b').textContent = `${splitLines(j.b).length.toLocaleString()} lines`;
      if (cache.key === key) {
        if (cache.err) throw cache.err;
        const r = cache.res, view = pill('seg-view') || 'side', ctx = val('opt-context') === 'all' ? null : +val('opt-context'), vkey = `${key}|${view}|${ctx}|${val('opt-words')}`;
        if ($('output-table').dataset.key !== vkey) {
          const t = table(r.D, r.R, view, { words: val('opt-words'), ignoreCase: j.ignoreCase }, ctx);
          $('output-table').innerHTML = t.html; $('output-table').dataset.key = vkey; $('output-table').dataset.changes = t.changes; cur = -1; $('diff-pos').textContent = t.changes ? `${t.changes} change${t.changes === 1 ? '' : 's'}` : 'identical';
        }
        const n = r.add + r.del + r.chg, pct = r.total ? Math.round((n / r.total) * 100) : 0;
        $('diff-stats').innerHTML = `<b class="diff-stat-add">+${r.add + r.chg}</b> <b class="diff-stat-del">−${r.del + r.chg}</b> <span class="web-muted">${pct}% of lines</span>`;
        return { text: r.patch, ext: 'diff', badge: n ? `+${r.add} −${r.del} ~${r.chg} · ${pct}%` : 'No differences', note: n ? `${n.toLocaleString()} line${n === 1 ? '' : 's'} differ` : 'Identical', ok: n === 0, copyMsg: 'Unified diff copied' };
      }
      if (pending !== key) {
        pending = key;
        compute(j).then((res) => { cache = { key, res }; }, (err) => { cache = { key, err }; })
          .finally(() => { if (pending === key) { pending = null; window.ToolityWebTool.run(); } });
      }
      status(libP ? 'Comparing…' : 'Loading diff engine…');
      return S.out ? Object.assign({}, S.out, { note: 'Comparing…' }) : null;
    },
    onFiles: async (files, a) => {
      const [f1, f2] = files;
      if (f2) { a.$('text-a').value = await f1.text(); a.$('text-b').value = await f2.text(); }
      else { const t = a.$('text-a').value.trim() ? a.$('text-b') : a.$('text-a'); t.value = await f1.text(); }
      a.$('text-b').dispatchEvent(new Event('input', { bubbles: true }));
    },
    download: (fmt, { S, $ }) => (fmt === 'html'
      ? { text: `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Diff</title><style>body{font:14px/1.5 -apple-system,Segoe UI,sans-serif;margin:2rem;color:#17191c}table{border-collapse:collapse;width:100%;font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace}td{padding:0 .5rem;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}.diff-n{color:#888;text-align:right;user-select:none;width:1%}.diff-add td{background:#e6ffec}.diff-del td{background:#ffebe9}.diff-chg .diff-l{background:#ffebe9}.diff-chg .diff-r{background:#e6ffec}em{font-style:normal;background:rgba(220,38,38,.25)}.diff-r em,.diff-add em{background:rgba(22,163,74,.3)}.diff-skip td{color:#888;text-align:center;background:#f5f5f5}</style></head><body><p>${esc($('diff-stats').textContent)}</p><table>${$('output-table').innerHTML}</table></body></html>\n`, name: 'diff.html', mime: 'text/html;charset=utf-8' }
      : { text: S.out.text, name: 'changes.diff', mime: 'text/x-diff;charset=utf-8' }),
    onReset: ({ $ }) => { $('output-table').innerHTML = ''; delete $('output-table').dataset.key; $('diff-stats').textContent = ''; $('diff-pos').textContent = '—'; $('count-a').textContent = ''; $('count-b').textContent = ''; cache = { key: null }; pending = null; cur = -1; }
  });
  const jump = (dir) => {
    const rows_ = api.$('output-table').querySelectorAll('tr[data-change]'); if (!rows_.length) return;
    cur = (cur + dir + rows_.length) % rows_.length;
    rows_.forEach((r) => r.classList.remove('is-current')); rows_[cur].classList.add('is-current');
    rows_[cur].scrollIntoView({ block: 'center', behavior: 'smooth' }); api.$('diff-pos').textContent = `${cur + 1} / ${rows_.length}`;
  };
  api.$('btn-next-change').addEventListener('click', () => jump(1)); api.$('btn-prev-change').addEventListener('click', () => jump(-1));
})();

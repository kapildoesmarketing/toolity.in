/* Designed by Kapil Pidhwani: Regex Tester — JavaScript flavour, zero libraries. Syntax is validated synchronously
 * (instant error under the input); matching runs in an inline Worker with a 1.5 s kill so a catastrophic pattern
 * ((a+)+$) reports instead of freezing the tab. run() stays synchronous with the Code Formatter cache trick, so typing
 * never trips the busy overlay. Ceilings: the first 2 000 matches are stored/listed (the total is still counted),
 * highlighting covers the first 200 k characters, the match list paints 300 rows. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const CAP = 2000, HL_MAX = 200000, LIST_MAX = 300, TIMEOUT = 1500;
  const WORKER = `onmessage = (e) => {
    const { pattern, flags, text, mode, repl } = e.data, t0 = performance.now();
    try {
      const re = new RegExp(pattern, flags), out = { matches: [], total: 0 };
      const pack = (m) => ({ index: m.index, match: m[0], groups: Array.from(m).slice(1), named: m.groups ? Object.assign({}, m.groups) : null });
      if (mode === 'replace') out.replaced = text.replace(re, repl);
      let m;
      if (flags.includes('g') || flags.includes('y')) {
        re.lastIndex = 0;
        while ((m = re.exec(text))) { out.total++; if (out.matches.length < ${CAP}) out.matches.push(pack(m)); if (m[0] === '') re.lastIndex++; }
      } else if ((m = re.exec(text))) { out.total = 1; out.matches.push(pack(m)); }
      out.ms = performance.now() - t0;
      postMessage(out);
    } catch (err) { postMessage({ error: err.message }); }
  };`;
  let worker = null;
  const spawn = () => worker || (worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' }))));
  function exec(msg) {
    return new Promise((res, rej) => {
      const w = spawn();
      const t = setTimeout(() => { w.terminate(); worker = null; rej(new Error(`That pattern took more than ${TIMEOUT / 1000} s — probably catastrophic backtracking. Simplify nested quantifiers like (a+)+ or anchor the pattern.`)); }, TIMEOUT);
      w.onmessage = (e) => { clearTimeout(t); e.data.error ? rej(new Error(e.data.error)) : res(e.data); };
      w.onerror = (e) => { clearTimeout(t); rej(new Error(e.message || 'Matching failed.')); };
      w.postMessage(msg);
    });
  }

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const show = (s) => (s === '' ? '<i>empty</i>' : esc(s));
  function highlight(text, matches) {
    const src = text.length > HL_MAX ? text.slice(0, HL_MAX) : text;
    let html = '', pos = 0, k = 0;
    for (const m of matches) {
      if (m.index >= src.length) break;
      const end = Math.min(m.index + m.match.length, src.length);
      if (m.index < pos) continue;
      html += esc(src.slice(pos, m.index));
      html += m.match === '' ? '<mark class="rx-m rx-m-empty"></mark>' : `<mark class="rx-m${k++ % 2 ? ' rx-m-alt' : ''}">${esc(src.slice(m.index, end))}</mark>`;
      pos = end;
    }
    html += esc(src.slice(pos));
    if (text.length > HL_MAX) html += `<span class="rx-cut">… ${(text.length - HL_MAX).toLocaleString()} more characters not drawn</span>`;
    return html;
  }
  function list(matches, total) {
    const rows = matches.slice(0, LIST_MAX).map((m, i) => {
      const groups = m.groups.map((g, gi) => `<span class="rx-group"><i>${gi + 1}</i>${g === undefined ? '<em>—</em>' : show(g)}</span>`);
      if (m.named) for (const [k, v] of Object.entries(m.named)) groups.push(`<span class="rx-group rx-group-named"><i>${esc(k)}</i>${v === undefined ? '<em>—</em>' : show(v)}</span>`);
      return `<div class="rx-match"><div class="rx-match-head"><b>#${i + 1}</b><code>${show(m.match)}</code><span class="web-muted">${m.index}–${m.index + m.match.length}</span></div>${groups.length ? `<div class="rx-groups">${groups.join('')}</div>` : ''}</div>`;
    });
    if (total > rows.length) rows.push(`<div class="web-muted">Showing ${rows.length.toLocaleString()} of ${total.toLocaleString()} matches — download the list for all${total > CAP ? ` (first ${CAP.toLocaleString()} stored)` : ''}.</div>`);
    return rows.join('');
  }
  const asText = (ms) => ms.map((m) => m.match).join('\n');
  const asJson = (r) => JSON.stringify({ pattern: r.pattern, flags: r.flags, total: r.total, matches: r.matches }, null, 2);

  const job = (val, pill) => ({ pattern: val('rx-pattern'), flags: ['g', 'i', 'm', 's', 'u', 'y'].filter((f) => val(`flag-${f}`)).join(''), text: val('text-input'), mode: pill('seg-mode') || 'match', repl: val('rx-replace') || '' });
  let cache = { key: null }, pending = null;

  const api = mount({
    slug: 'regex-tester', debounce: 150,
    ready: ({ val }) => (!val('rx-pattern') ? 'Enter a pattern' : !val('text-input') ? 'Paste a test string' : true),
    onPill: (g, { $, pill }) => { if (g.id === 'seg-mode') $('rx-replace-group').hidden = pill('seg-mode') !== 'replace'; },
    run: ({ val, pill, $, S, status }) => {
      const j = job(val, pill), key = JSON.stringify(j);
      $('input-count').textContent = `${j.text.length.toLocaleString()} chars · ${j.text.split('\n').length.toLocaleString()} lines`;
      try { new RegExp(j.pattern, j.flags); } catch (e) { throw new Error(e.message.replace(/^Invalid regular expression: /, 'Invalid pattern: ')); }
      if (cache.key === key) {
        if (cache.err) throw cache.err;
        const r = cache.res, n = r.total, rep = j.mode === 'replace';
        if ($('output-highlight').dataset.key !== key) {
          $('output-highlight').innerHTML = highlight(j.text, r.matches); $('output-matches').innerHTML = list(r.matches, n);
          $('output-text').textContent = r.replaced || ''; $('output-highlight').dataset.key = key;
        }
        $('output-highlight').hidden = rep; $('output-matches').hidden = rep; $('output-text').hidden = !rep;
        const badge = `${n.toLocaleString()} match${n === 1 ? '' : 'es'} · ${r.ms < 1 ? '<1' : Math.round(r.ms)} ms`;
        return { text: rep ? r.replaced : asText(r.matches), ext: 'txt', res: Object.assign({ pattern: j.pattern, flags: j.flags }, r), badge, note: n ? (rep ? 'Replaced' : 'Matched') : 'No matches', ok: n > 0, copyMsg: rep ? 'Result copied' : 'Matches copied' };
      }
      if (pending !== key) {
        pending = key;
        exec(j).then((res) => { cache = { key, res }; }, (err) => { cache = { key, err }; })
          .finally(() => { if (pending === key) { pending = null; window.ToolityWebTool.run(); } });
      }
      status('Matching…');
      return S.out ? Object.assign({}, S.out, { note: 'Matching…' }) : null;
    },
    download: (fmt, { S, pill }) => (fmt === 'json' ? { text: asJson(S.out.res), ext: 'json', mime: 'application/json' } : { text: pill('seg-mode') === 'replace' ? S.out.res.replaced : asText(S.out.res.matches), ext: 'txt' }),
    filename: ({ pill }) => (pill('seg-mode') === 'replace' ? 'replaced' : 'matches'),
    onReset: ({ $ }) => { $('input-count').textContent = ''; $('output-highlight').innerHTML = ''; delete $('output-highlight').dataset.key; $('output-matches').innerHTML = ''; $('output-text').textContent = ''; $('rx-replace-group').hidden = true; cache = { key: null }; pending = null; }
  });

  /* Cheat sheet: insert a token at the caret, or load a whole preset pattern. */
  const sheet = document.querySelector('.rx-sheet');
  if (sheet) sheet.addEventListener('click', (e) => {
    const b = e.target.closest('.rx-chip'); if (!b) return;
    const el = api.$('rx-pattern');
    if (b.dataset.pattern !== undefined) el.value = b.dataset.pattern;
    else { const a = el.selectionStart ?? el.value.length, z = el.selectionEnd ?? a; el.value = el.value.slice(0, a) + b.dataset.insert + el.value.slice(z); el.setSelectionRange(a + b.dataset.insert.length, a + b.dataset.insert.length); }
    el.dispatchEvent(new Event('input', { bubbles: true })); el.focus();
    api.card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

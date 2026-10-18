/* Designed by Kapil Pidhwani: SQL on CSV. Each dropped CSV/TSV/JSON file becomes a SQLite table (sql.js, WASM, loaded on
 * first use); the paste box becomes table `pasted`, rebuilt whenever its text changes. Numeric columns are typed
 * INTEGER/REAL so aggregates behave. run() is synchronous until Run query is pressed, so editing SQL never flickers the
 * busy overlay and the last result stays on screen. Ceilings: files parsed and inserted on the main thread in one go
 * (50 MB cap); db.exec() materialises the whole result in memory — add a LIMIT for huge outputs. The schema panel is
 * rebuilt from sqlite_master after every run, so CREATE / DROP in the editor show up too. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const { parseCsv, sniffDelim, setBusy } = window.Toolity;
  const CDN = 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/';
  let SQLP = null, db = null;
  const engine = () => (SQLP = SQLP || new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = CDN + 'sql-wasm.js';
    s.onload = () => window.initSqlJs({ locateFile: (f) => CDN + f }).then(res, rej); s.onerror = rej; document.head.append(s);
  }).catch(() => { SQLP = null; throw new Error("Couldn't load the SQL engine — check your connection and try again."); }));

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ident = (s) => (/^[a-z_][a-z0-9_]*$/i.test(s) ? s : '"' + String(s).replace(/"/g, '""') + '"');
  const NUM = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
  const names = () => (db ? db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY rowid").flatMap((r) => r.values.map((v) => v[0])) : []);
  function tname(file) {
    let n = file.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'table';
    if (/^\d/.test(n)) n = 't_' + n;
    const have = new Set(names()); let k = n, i = 2; while (have.has(k)) k = `${n}_${i++}`; return k;
  }
  const dedupe = (cols) => { const seen = Object.create(null); return cols.map((c) => { let k = c; while (k in seen) k = `${c}_${++seen[c]}`; seen[k] = seen[k] || 1; return k; }); };
  const settings = (val) => ({ header: val('opt-header'), delim: val('opt-delim') === 'tab' ? '\t' : val('opt-delim'), types: val('opt-types'), limit: +val('opt-limit') });

  /* text → { cols, rows } — JSON array of objects (or {data:[…]}), else CSV/TSV. */
  function grid(text, label, j) {
    const t = text.trim();
    if (/^[[{]/.test(t)) {
      let data; try { data = JSON.parse(t); } catch (e) { throw new Error(`${label}: not valid JSON — ${e.message}`); }
      if (!Array.isArray(data)) data = Array.isArray(data.data) ? data.data : [data];
      const cols = []; const seen = new Set();
      for (const r of data) for (const k of Object.keys(r && typeof r === 'object' ? r : { value: 0 })) if (!seen.has(k)) { seen.add(k); cols.push(k); }
      const rows = data.map((r) => cols.map((c) => { const v = r && typeof r === 'object' ? r[c] : r; return v == null ? null : typeof v === 'object' ? JSON.stringify(v) : v; }));
      return { cols, rows, json: true };
    }
    const all = parseCsv(text, j.delim === 'auto' ? sniffDelim(text) : j.delim);
    if (!all.length) throw new Error(`${label} is empty.`);
    const width = Math.max(...all.map((r) => r.length));
    const cols = j.header ? Array.from({ length: width }, (_, i) => (all[0][i] || '').trim() || `col${i + 1}`) : Array.from({ length: width }, (_, i) => `col${i + 1}`);
    return { cols, rows: (j.header ? all.slice(1) : all).map((r) => cols.map((_, i) => r[i] ?? null)) };
  }
  async function addTable(name, g, j) {
    const SQL = await engine(); db = db || new SQL.Database();
    const cols = dedupe(g.cols);
    const types = cols.map((_, i) => {
      if (g.json) { let num = false; for (const r of g.rows) { const v = r[i]; if (v == null) continue; if (typeof v !== 'number') return 'TEXT'; num = true; } return num ? 'REAL' : 'TEXT'; }
      if (!j.types) return 'TEXT';
      let any = false, int = true;
      for (const r of g.rows) { const v = r[i]; if (v == null || v === '') continue; if (!NUM.test(v)) return 'TEXT'; any = true; if (!/^-?\d+$/.test(v)) int = false; }
      return any ? (int ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.run(`DROP TABLE IF EXISTS ${ident(name)}`);
    db.run(`CREATE TABLE ${ident(name)} (${cols.map((c, i) => `${ident(c)} ${types[i]}`).join(', ')})`);
    const st = db.prepare(`INSERT INTO ${ident(name)} VALUES (${cols.map(() => '?').join(',')})`);
    db.run('BEGIN');
    try {
      for (const r of g.rows) st.run(r.map((v, i) => (v == null ? null : types[i] === 'TEXT' ? (typeof v === 'string' ? v : String(v)) : v === '' ? null : +v)));
      db.run('COMMIT');
    } catch (e) { db.run('ROLLBACK'); throw e; } finally { st.free(); }
  }
  function paintTables($) {
    const box = $('sql-tables'), list = names();
    box.hidden = !list.length;
    box.innerHTML = list.map((n) => {
      const cols = db.exec(`PRAGMA table_info(${ident(n)})`)[0]?.values || [], rows = db.exec(`SELECT COUNT(*) FROM ${ident(n)}`)[0].values[0][0];
      return `<details class="sql-table-card"><summary><button type="button" class="sql-ins" data-ins="${esc(ident(n))}" title="Insert into query">${esc(n)}</button><span class="web-muted">${rows.toLocaleString()} rows · ${cols.length} cols</span></summary><div class="sql-cols">${cols.map((c) => `<button type="button" class="sql-ins sql-col" data-ins="${esc(ident(c[1]))}" title="Insert into query">${esc(c[1])}<i>${esc(c[2] || 'ANY')}</i></button>`).join('')}</div></details>`;
    }).join('');
    const first = list.find((n) => n !== 'pasted') || list[0];
    if (first) $('sql-input').placeholder = `SELECT *\nFROM ${ident(first)}\nLIMIT 100`;
  }
  let pasted = '';
  async function syncPasted(api, j) {
    const text = api.val('text-input').trim();
    if (text === pasted) return;
    if (pasted && db) db.run('DROP TABLE IF EXISTS pasted');
    if (text) await addTable('pasted', grid(text, 'Pasted data', j), j);
    pasted = text; paintTables(api.$);
  }
  const quote = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const cell = (v) => (v == null ? '' : typeof v === 'object' ? `[blob ${v.length} bytes]` : String(v));
  const toCsv = (cols, rows) => [cols, ...rows].map((r) => r.map((v) => quote(cell(v))).join(',')).join('\n');
  function render($, cols, rows, limit) {
    const shown = rows.slice(0, limit);
    $('output-table').innerHTML = `<thead><tr><th class="sql-num">#</th>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${shown.map((r, i) => `<tr><td class="sql-num">${i + 1}</td>${r.map((v) => (v == null ? '<td class="is-null">NULL</td>' : `<td${typeof v === 'number' ? ' class="is-num"' : ''}>${esc(cell(v))}</td>`)).join('')}</tr>`).join('')}</tbody>`;
    const more = $('sql-more'); more.hidden = rows.length <= limit;
    more.textContent = `Showing ${limit.toLocaleString()} of ${rows.length.toLocaleString()} rows — Copy and Download include every row.`;
  }
  let last = { key: null };
  async function execute(api, q, j, key) {
    const { $ } = api;
    await syncPasted(api, j);
    if (!db) throw new Error('Add a CSV or JSON file first.');
    const t0 = performance.now(); let res;
    try { res = db.exec(q); } catch (e) { throw new Error(e.message.replace(/^Error: /, '')); }
    const ms = performance.now() - t0, r = res[res.length - 1];
    paintTables($);
    const cols = r ? r.columns : [], rows = r ? r.values : [];
    render($, cols, rows, j.limit);
    const out = { text: toCsv(cols, rows), ext: 'csv', res: { cols, rows }, ok: true, copyMsg: 'Result copied as CSV',
      badge: `${rows.length.toLocaleString()} row${rows.length === 1 ? '' : 's'} · ${cols.length} col${cols.length === 1 ? '' : 's'} · ${ms < 1 ? '<1' : Math.round(ms)} ms`,
      note: r ? 'Query ran' : `Done · ${db.getRowsModified().toLocaleString()} row${db.getRowsModified() === 1 ? '' : 's'} affected` };
    last = { key, out }; return out;
  }

  const api = mount({
    slug: 'sql-on-csv', busyLabel: 'Running query…',
    ready: ({ val }) => (!db && !val('text-input').trim() ? 'Add a CSV or JSON file to begin' : !val('sql-input').trim() ? 'Write a query, then press Run query' : true),
    summary: ({ val }) => [val('opt-header') ? 'Header row' : 'No header', val('opt-delim') === 'auto' ? 'auto delimiter' : { ',': 'comma', ';': 'semicolon', tab: 'tab', '|': 'pipe' }[val('opt-delim')], val('opt-types') ? 'detect numbers' : 'all text', `${(+val('opt-limit')).toLocaleString()} rows shown`].join(' · '),
    run: (a) => {
      const { val, S, status } = a, j = settings(val), q = val('sql-input').trim(), key = JSON.stringify([q, j, val('text-input')]);
      if (S.go) return execute(a, q, j, key);
      if (last.key === key) return last.out;
      status(S.out ? 'Query changed — press Run query' : 'Press Run query');
      return S.out ? Object.assign({}, S.out, { note: 'Query changed — press Run query', ok: false }) : null;
    },
    onFiles: async (files, a) => {
      const { $, card, showError, status } = a;
      setBusy(card, true); status('Loading tables…'); showError('');
      try {
        const j = settings(a.val);
        for (const f of files) await addTable(tname(f.name), grid(await f.text(), f.name, j), j);
        paintTables($); last = { key: null }; a.run();
      } catch (e) { console.warn(e); showError(e.message || 'Could not read that file.'); status('Failed'); }
      finally { setBusy(card, false); if (a.S.out) a.$('btn-copy').disabled = a.$('btn-download').disabled = a.$('btn-open').disabled = false; }
    },
    download: (fmt, { S }) => {
      const { cols, rows } = S.out.res;
      if (fmt === 'db') return { blob: new Blob([db.export()], { type: 'application/vnd.sqlite3' }), name: 'tables.db' };
      if (fmt === 'json') return { text: JSON.stringify(rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i] != null && typeof r[i] === 'object' ? null : r[i]]))), null, 2), ext: 'json', mime: 'application/json' };
      return { text: S.out.text, ext: 'csv', mime: 'text/csv;charset=utf-8' };
    },
    filename: () => 'query-result',
    onReset: ({ $ }) => { if (db) db.close(); db = null; pasted = ''; last = { key: null }; $('sql-tables').hidden = true; $('sql-tables').innerHTML = ''; $('output-table').innerHTML = ''; $('sql-more').hidden = true; $('sql-input').placeholder = 'SELECT city, COUNT(*) AS orders, SUM(amount) AS total\nFROM pasted\nGROUP BY city\nORDER BY total DESC'; }
  });

  /* Click a table or column name → insert at the caret in the SQL box. */
  api.$('sql-tables').addEventListener('click', (e) => {
    const b = e.target.closest('.sql-ins'); if (!b) return;
    e.preventDefault();
    const el = api.$('sql-input'), a = el.selectionStart ?? el.value.length, z = el.selectionEnd ?? a, ins = b.dataset.ins;
    el.value = el.value.slice(0, a) + ins + el.value.slice(z); el.setSelectionRange(a + ins.length, a + ins.length);
    el.dispatchEvent(new Event('input', { bubbles: true })); el.focus();
  });
})();

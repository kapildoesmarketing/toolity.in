/* Designed by Kapil Pidhwani: CSV Viewer & Editor. The CSV source textarea is the single source of truth: parsing fills the
 * model; table edits, added/deleted rows and dedupe write the CSV back into the textarea (without re-running), so Copy,
 * Download and the next re-parse always agree. Sort + filter are a view; export = what you see (all pages).
 * Ceiling: 500 rows rendered per page; a 50 MB file is parsed in one go on the main thread. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const PAGE = 500;
  const M = { head: [], rows: [], delim: ',', sort: null, page: 0, view: [] };
  const DNAME = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' };

  function sniff(text) {
    const line = text.split(/\r?\n/).find((l) => l.trim()) || '';
    const [d, n] = [',', '\t', ';', '|'].map((x) => [x, line.split(x).length]).sort((a, b) => b[1] - a[1])[0];
    return n > 1 ? d : ',';
  }
  function parse(text, d) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"' && f === '') q = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (q) throw new Error('The CSV has an unclosed quote — check the last quoted field.');
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter((r) => r.length > 1 || r[0] !== '');
  }
  const quote = (s, d) => (s.includes(d) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const toCsv = (head, rows, d) => [...(head ? [head] : []), ...rows].map((r) => r.map((c) => quote(c ?? '', d)).join(d)).join('\n');
  const num = (s) => (s !== '' && /^-?\d+(\.\d+)?$/.test(s.replace(/,/g, '')) ? +s.replace(/,/g, '') : null);

  function viewRows(api) {
    const q = (api.$('csv-filter').value || '').trim().toLowerCase();
    let idx = M.rows.map((_, i) => i);
    if (q) idx = idx.filter((i) => M.rows[i].some((c) => (c || '').toLowerCase().includes(q)));
    if (M.sort) {
      const { col, dir } = M.sort;
      idx.sort((a, b) => {
        const x = M.rows[a][col] || '', y = M.rows[b][col] || '', nx = num(x), ny = num(y);
        const r = nx !== null && ny !== null ? nx - ny : x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
        return r * dir || a - b;
      });
    }
    return idx;
  }
  const exportRows = () => M.view.map((i) => M.rows[i]);
  const hasHead = (api) => api.val('opt-header');
  const writeBack = (api) => { api.$('text-input').value = toCsv(hasHead(api) ? M.head : null, M.rows, M.delim); };

  function render(api) {
    const { $ } = api;
    M.view = viewRows(api);
    const pages = Math.max(1, Math.ceil(M.view.length / PAGE));
    M.page = Math.min(M.page, pages - 1);
    const slice = M.view.slice(M.page * PAGE, M.page * PAGE + PAGE);
    const t = $('output-table');
    const th = M.head.map((h, c) => {
      const s = M.sort && M.sort.col === c ? (M.sort.dir > 0 ? 'ascending' : 'descending') : 'none';
      return `<th aria-sort="${s}"><button type="button" class="csv-sort" data-col="${c}"><span></span><iconify-icon icon="${s === 'ascending' ? 'lucide:arrow-up' : s === 'descending' ? 'lucide:arrow-down' : 'lucide:arrow-up-down'}" width="12" height="12"></iconify-icon></button></th>`;
    }).join('');
    t.innerHTML = `<thead><tr><th class="csv-num">#</th>${th}</tr></thead><tbody></tbody>`;
    t.querySelectorAll('.csv-sort span').forEach((s, c) => { s.textContent = M.head[c]; });
    const frag = document.createDocumentFragment();
    slice.forEach((ri) => {
      const tr = document.createElement('tr'); tr.dataset.row = ri;
      const n = document.createElement('td'); n.className = 'csv-num';
      n.innerHTML = '<span></span><button type="button" class="csv-del" aria-label="Delete row">×</button>';
      n.firstChild.textContent = ri + 1; n.querySelector('button').setAttribute('aria-label', `Delete row ${ri + 1}`);
      tr.appendChild(n);
      M.head.forEach((_, c) => { const td = document.createElement('td'); td.contentEditable = 'plaintext-only'; td.dataset.col = c; td.textContent = M.rows[ri][c] ?? ''; tr.appendChild(td); });
      frag.appendChild(tr);
    });
    t.tBodies[0].appendChild(frag);
    $('csv-pager').hidden = pages < 2;
    $('csv-page').textContent = `Page ${M.page + 1} of ${pages}`;
    $('btn-prev').disabled = M.page === 0; $('btn-next').disabled = M.page >= pages - 1;
    return M.view.length;
  }

  function result(api, shown) {
    const filtered = shown !== M.rows.length;
    const text = toCsv(hasHead(api) ? M.head : null, exportRows(), M.delim);
    return { text, ext: 'csv', mime: 'text/csv;charset=utf-8', badge: `${M.rows.length.toLocaleString()} rows × ${M.head.length} cols`, note: filtered ? `Showing ${shown.toLocaleString()} of ${M.rows.length.toLocaleString()} rows — export uses these` : `${M.rows.length.toLocaleString()} rows · ${DNAME[M.delim]}-separated`, ok: true };
  }
  const refresh = (api) => { if (api.S.out) api.present(result(api, render(api))); };

  /* Designed by Kapil Pidhwani: minimal Office Open XML workbook (5 parts, inline strings, numbers as numbers) zipped with
   * JSZip — the site's existing pinned dependency, loaded only when Excel is chosen. No styles/formulas by design. */
  const loadZip = () => window.JSZip ? Promise.resolve(window.JSZip) : new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload = () => res(window.JSZip); s.onerror = () => rej(new Error("Couldn't load the Excel builder — check your connection.")); document.head.appendChild(s);
  });
  async function xlsx(rows) {
    const JSZip = await loadZip();
    const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    const col = (i) => { let s = ''; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
    const sheet = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => { const v = c ?? '', ref = col(ci) + (ri + 1); return /^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(v) ? `<c r="${ref}"><v>${v}</v></c>` : v === '' ? '' : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`; }).join('')}</row>`).join('');
    const z = new JSZip();
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>');
    z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
    z.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`);
    return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
  }

  let lastText = null;
  mount({
    slug: 'csv-viewer-editor', idle: 'Open or paste a CSV to begin',
    ready: ({ val }) => (val('text-input').trim() ? true : 'Open or paste a CSV to begin'),
    summary: ({ val }) => [val('opt-delim') === 'auto' ? 'Auto delimiter' : DNAME[val('opt-delim') === '\\t' ? '\t' : val('opt-delim')], val('opt-header') ? 'header row' : 'no header'].join(' · '),
    run: (api) => {
      const { val, $ } = api, text = val('text-input');
      const d = val('opt-delim') === 'auto' ? sniff(text) : val('opt-delim') === '\\t' ? '\t' : val('opt-delim');
      const key = `${d}|${val('opt-header')}|${text}`;
      if (key !== lastText) {
        const rows = parse(text, d);
        const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
        rows.forEach((r) => { while (r.length < width) r.push(''); });
        M.delim = d;
        M.head = val('opt-header') ? rows.shift().map((h, i) => h || `Column ${i + 1}`) : Array.from({ length: width }, (_, i) => `Column ${i + 1}`);
        M.rows = rows;
        if (M.sort && M.sort.col >= width) M.sort = null;
        lastText = key;
      }
      const lines = M.rows.length + (val('opt-header') ? 1 : 0);
      $('input-count').textContent = `${lines.toLocaleString()} line${lines === 1 ? '' : 's'}`;
      return result(api, render(api));
    },
    download: async (fmt, api) => {
      const head = hasHead(api) ? M.head : null, rows = exportRows();
      if (fmt === 'json') return { text: JSON.stringify(rows.map((r) => (head ? Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])) : r)), null, 2), ext: 'json', mime: 'application/json' };
      if (fmt === 'xlsx') { api.status('Building Excel file…'); const blob = await xlsx(head ? [head, ...rows] : rows); api.status(`${rows.length.toLocaleString()} rows exported`, true); return { blob, ext: 'xlsx' }; }
      return { text: toCsv(head, rows, M.delim), ext: 'csv', mime: 'text/csv;charset=utf-8' };
    },
    filename: () => 'table',
    onFile: () => { lastText = null; M.page = 0; },
    onReset: ({ $ }) => { lastText = null; Object.assign(M, { head: [], rows: [], sort: null, page: 0, view: [] }); $('csv-filter').value = ''; $('output-table').replaceChildren(); $('input-count').textContent = ''; }
  });

  const api = window.ToolityWebTool, $ = api.$;
  const sync = () => { lastText = `${M.delim}|${api.val('opt-header')}|${api.val('text-input')}`; };
  let ft;
  $('csv-filter').addEventListener('input', () => { clearTimeout(ft); ft = setTimeout(() => { M.page = 0; refresh(api); }, 150); });
  $('output-table').addEventListener('click', (e) => {
    const s = e.target.closest('.csv-sort');
    if (s) { const c = +s.dataset.col; M.sort = !M.sort || M.sort.col !== c ? { col: c, dir: 1 } : M.sort.dir > 0 ? { col: c, dir: -1 } : null; return refresh(api); }
    const del = e.target.closest('.csv-del');
    if (del) { const ri = +del.closest('tr').dataset.row; M.rows.splice(ri, 1); writeBack(api); sync(); refresh(api); api.toast(`Row ${ri + 1} deleted`); }
  });
  $('output-table').addEventListener('input', (e) => {
    const td = e.target.closest('td[data-col]'); if (!td) return;
    M.rows[+td.parentElement.dataset.row][+td.dataset.col] = td.textContent;
    writeBack(api); sync();
    api.S.out = result(api, M.view.length);
  });
  $('output-table').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('td[data-col]')) { e.preventDefault(); e.target.blur(); } });
  $('btn-add-row').addEventListener('click', () => {
    if (!M.head.length) return api.toast('Open or paste a CSV first');
    M.rows.push(M.head.map(() => '')); writeBack(api); sync();
    $('csv-filter').value = ''; M.sort = null; M.page = Math.ceil(M.rows.length / PAGE) - 1; refresh(api);
    const last = $('output-table').querySelector('tbody tr:last-child td[data-col]'); if (last) last.focus();
  });
  $('btn-dedupe').addEventListener('click', () => {
    if (!M.rows.length) return api.toast('Open or paste a CSV first');
    const seen = new Set(), before = M.rows.length;
    M.rows = M.rows.filter((r) => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; });
    const gone = before - M.rows.length;
    if (gone) { writeBack(api); sync(); refresh(api); }
    api.toast(gone ? `Removed ${gone} duplicate row${gone === 1 ? '' : 's'}` : 'No duplicate rows found');
  });
  $('btn-prev').addEventListener('click', () => { M.page--; render(api); });
  $('btn-next').addEventListener('click', () => { M.page++; render(api); });
})();

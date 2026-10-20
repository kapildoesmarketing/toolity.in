/* Spreadsheet Formula Converter — Toolity.in. Tokenise (locale-aware) → rename/rewrite functions from a compatibility table →
 * re-emit with the target app's separators, decimal mark, sheet-reference and array-constant syntax; optional A1 ↔ R1C1.
 * Designed by Kapil Pidhwani: this is a syntax converter plus an honest report, not a semantic translator — QUERY, IMPORT*,
 * GOOGLEFINANCE and friends are flagged ❌ with the nearest alternative. Ceiling: nested structural rewrites (e.g. turning
 * QUERY into FILTER/SORT) are left to the human; the table covers ~130 functions that differ, everything else passes through. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const APP = { excel: 'Excel', sheets: 'Google Sheets', libre: 'LibreOffice Calc' };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const SAMPLE = '=ARRAYFORMULA(IF(A2:A="",,JOIN(", ",SPLIT(B2:B,";"))))\n=QUERY(Data!A:D,"select A, sum(D) where C=\'Paid\' group by A",1)\n=IF(REGEXMATCH(C2,"^INV-\\d+$"),FLATTEN(D2:F2),"n/a")\n=SUMIFS(\'Q3 Sales\'!D:D,\'Q3 Sales\'!A:A,A2,\'Q3 Sales\'!B:B,">="&DATE(2026,7,1))\n=COUNTUNIQUE(A2:A100)&" distinct"\n=LET(x,B2*1.18,ROUND(x,2))';

  /* ── Compatibility table. Keys are source function names; each app entry is: true (same), 'NEWNAME', fn(args)→{name,args}|string,
   *    or { no: 'note / nearest alternative' }. Optional ver note marks version-gated functions. ── */
  const T = {
    // Google Sheets specials
    ARRAYFORMULA: { excel: (a) => ({ unwrap: a[0], note: 'Dynamic arrays spill automatically in Excel 365 — wrapper removed' }), libre: (a) => ({ unwrap: a[0], note: 'Enter as an array formula (Ctrl+Shift+Enter) in Calc' }), sheets: true },
    QUERY: { excel: { no: 'No equivalent — rebuild with FILTER / SORT / SUMIFS, or Power Query' }, libre: { no: 'No equivalent — use FILTER / SORT (24.8+) or a pivot table' }, sheets: true },
    IMPORTRANGE: { excel: { no: 'Excel cannot pull from another workbook by URL — use Power Query or a linked workbook' }, libre: { no: 'Use Sheet ▸ Link to External Data' }, sheets: true },
    IMPORTDATA: { excel: { no: 'Use Data ▸ From Web (Power Query)' }, libre: { no: 'Use Sheet ▸ Link to External Data' }, sheets: true },
    IMPORTHTML: { excel: { no: 'Use Data ▸ From Web (Power Query)' }, libre: { no: 'Use Sheet ▸ Link to External Data' }, sheets: true },
    IMPORTXML: { excel: { no: 'WEBSERVICE + FILTERXML approximate it' }, libre: { no: 'WEBSERVICE + FILTERXML approximate it' }, sheets: true },
    IMPORTFEED: { excel: { no: 'No equivalent' }, libre: { no: 'No equivalent' }, sheets: true },
    GOOGLEFINANCE: { excel: { no: 'STOCKHISTORY (Excel 365) covers prices; attributes differ' }, libre: { no: 'No equivalent' }, sheets: true },
    GOOGLETRANSLATE: { excel: { no: 'No equivalent' }, libre: { no: 'No equivalent' }, sheets: true },
    DETECTLANGUAGE: { excel: { no: 'No equivalent' }, libre: { no: 'No equivalent' }, sheets: true },
    SPARKLINE: { excel: { no: 'Use Insert ▸ Sparklines (not a formula)' }, libre: { no: 'Use Insert ▸ Sparkline (24.2+, not a formula)' }, sheets: true },
    SPLIT: { excel: (a) => ({ name: 'TEXTSPLIT', args: a.slice(0, 2), note: 'TEXTSPLIT (Excel 365); SPLIT’s split-by-each-character default is not replicated' }), libre: { no: 'No equivalent — REGEX() can extract parts' }, sheets: true },
    JOIN: { excel: (a) => ({ name: 'TEXTJOIN', args: [a[0], 'TRUE', ...a.slice(1)] }), libre: (a) => ({ name: 'TEXTJOIN', args: [a[0], '1', ...a.slice(1)] }), sheets: true },
    FLATTEN: { excel: 'TOCOL', libre: { no: 'No equivalent — stack ranges manually' }, sheets: true },
    ARRAY_CONSTRAIN: { excel: 'TAKE', libre: { no: 'Use OFFSET(range,0,0,rows,cols)' }, sheets: true },
    COUNTUNIQUE: { excel: (a) => (a.length === 1 ? { name: 'ROWS', args: [`UNIQUE(TOCOL(${a[0]}))`], note: 'Excel 365; classic: SUMPRODUCT(1/COUNTIF(r,r))' } : { no: 'Multiple ranges — combine with VSTACK first' }), libre: (a) => (a.length === 1 ? { name: 'SUMPRODUCT', args: [`1/COUNTIF(${a[0]}\u0001${a[0]})`], note: 'Counts non-blank unique values' } : { no: 'Multiple ranges not supported' }), sheets: true },
    COUNTUNIQUEIFS: { excel: { no: 'ROWS(UNIQUE(FILTER(…)))' }, libre: { no: 'No equivalent' }, sheets: true },
    REGEXMATCH: { excel: (a) => ({ name: 'REGEXTEST', args: a, note: 'Excel 365 (2024+) only' }), libre: (a) => ({ name: 'NOT', args: [`ISNA(REGEX(${a[0]}\u0001${a[1]}))`], note: 'Calc REGEX returns #N/A when nothing matches' }), sheets: true },
    REGEXEXTRACT: { excel: (a) => ({ name: 'REGEXEXTRACT', args: a, note: 'Excel 365 (2024+) only' }), libre: 'REGEX', sheets: true },
    REGEXREPLACE: { excel: (a) => ({ name: 'REGEXREPLACE', args: a, note: 'Excel 365 (2024+) only' }), libre: (a) => ({ name: 'REGEX', args: [...a.slice(0, 3), '"g"'] }), sheets: true },
    TO_DATE: { excel: (a) => ({ unwrap: a[0], note: 'Format the cell as a date instead' }), libre: (a) => ({ unwrap: a[0], note: 'Format the cell as a date instead' }), sheets: true },
    TO_TEXT: { excel: (a) => ({ name: 'TEXT', args: [a[0], '"@"'] }), libre: (a) => ({ name: 'TEXT', args: [a[0], '"@"'] }), sheets: true },
    TO_PERCENT: { excel: (a) => ({ unwrap: a[0], note: 'Format the cell as a percentage' }), libre: (a) => ({ unwrap: a[0], note: 'Format the cell as a percentage' }), sheets: true },
    TO_DOLLARS: { excel: (a) => ({ unwrap: a[0], note: 'Format the cell as currency' }), libre: (a) => ({ unwrap: a[0], note: 'Format the cell as currency' }), sheets: true },
    TO_PURE_NUMBER: { excel: 'VALUE', libre: 'VALUE', sheets: true },
    ISURL: { excel: { no: 'No equivalent — ISNUMBER(SEARCH("http",x))' }, libre: { no: 'No equivalent' }, sheets: true },
    ISEMAIL: { excel: { no: 'No equivalent — use a regex' }, libre: { no: 'No equivalent' }, sheets: true },
    ISDATE: { excel: { no: 'No equivalent — ISNUMBER(x) on date-formatted cells' }, libre: { no: 'No equivalent' }, sheets: true },
    ISBETWEEN: { excel: (a) => ({ name: 'AND', args: [`${a[0]}>=${a[1]}`, `${a[0]}<=${a[2]}`], note: 'Inclusive bounds assumed' }), libre: (a) => ({ name: 'AND', args: [`${a[0]}>=${a[1]}`, `${a[0]}<=${a[2]}`] }), sheets: true },
    EPOCHTODATE: { excel: (a) => ({ expr: `(${a[0]}/86400+DATE(1970\u00011\u00011))`, note: 'Seconds assumed; format as date' }), libre: (a) => ({ expr: `(${a[0]}/86400+DATE(1970\u00011\u00011))` }), sheets: true },
    ADD: { excel: (a) => ({ expr: `(${a[0]}+${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}+${a[1]})` }), sheets: true },
    MINUS: { excel: (a) => ({ expr: `(${a[0]}-${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}-${a[1]})` }), sheets: true },
    MULTIPLY: { excel: (a) => ({ expr: `(${a[0]}*${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}*${a[1]})` }), sheets: true },
    DIVIDE: { excel: (a) => ({ expr: `(${a[0]}/${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}/${a[1]})` }), sheets: true },
    POW: { excel: 'POWER', libre: 'POWER', sheets: true },
    UMINUS: { excel: (a) => ({ expr: `(-${a[0]})` }), libre: (a) => ({ expr: `(-${a[0]})` }), sheets: true },
    EQ: { excel: (a) => ({ expr: `(${a[0]}=${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}=${a[1]})` }), sheets: true },
    NE: { excel: (a) => ({ expr: `(${a[0]}<>${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}<>${a[1]})` }), sheets: true },
    GT: { excel: (a) => ({ expr: `(${a[0]}>${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}>${a[1]})` }), sheets: true },
    GTE: { excel: (a) => ({ expr: `(${a[0]}>=${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}>=${a[1]})` }), sheets: true },
    LT: { excel: (a) => ({ expr: `(${a[0]}<${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}<${a[1]})` }), sheets: true },
    LTE: { excel: (a) => ({ expr: `(${a[0]}<=${a[1]})` }), libre: (a) => ({ expr: `(${a[0]}<=${a[1]})` }), sheets: true },
    IMAGE: { excel: true, libre: { no: 'Use Insert ▸ Image' }, sheets: true, ver: { excel: 'Excel 365' } },
    // Excel specials
    TEXTSPLIT: { sheets: (a) => ({ name: 'SPLIT', args: a.slice(0, 2), note: 'Row delimiter and extra options dropped' }), libre: { no: 'No equivalent — REGEX() can extract parts' }, excel: true, ver: { excel: 'Excel 365' } },
    TEXTBEFORE: { sheets: (a) => ({ name: 'REGEXEXTRACT', args: [a[0], `"^(.*?)"&${a[1]}`], note: 'Approximation via regex' }), libre: { no: 'LEFT(x;FIND(d;x)-1)' }, excel: true, ver: { excel: 'Excel 365' } },
    TEXTAFTER: { sheets: (a) => ({ name: 'REGEXEXTRACT', args: [a[0], `${a[1]}&"(.*)$"`], note: 'Approximation via regex' }), libre: { no: 'MID(x;FIND(d;x)+1;LEN(x))' }, excel: true, ver: { excel: 'Excel 365' } },
    TOCOL: { sheets: 'FLATTEN', libre: { no: 'No equivalent' }, excel: true, ver: { excel: 'Excel 365' } },
    TOROW: { sheets: (a) => ({ name: 'TRANSPOSE', args: [`FLATTEN(${a[0]})`] }), libre: { no: 'No equivalent' }, excel: true, ver: { excel: 'Excel 365' } },
    TAKE: { sheets: (a) => (a.length >= 2 && !/^-/.test(a[1]) ? { name: 'ARRAY_CONSTRAIN', args: [a[0], a[1], a[2] || `COLUMNS(${a[0]})`] } : { no: 'Negative TAKE has no Sheets equivalent — use INDEX/OFFSET' }), libre: { no: 'OFFSET(range;0;0;rows;cols)' }, excel: true, ver: { excel: 'Excel 365' } },
    DROP: { sheets: { no: 'Use OFFSET or INDEX ranges' }, libre: { no: 'Use OFFSET' }, excel: true, ver: { excel: 'Excel 365' } },
    EXPAND: { sheets: { no: 'No equivalent' }, libre: { no: 'No equivalent' }, excel: true, ver: { excel: 'Excel 365' } },
    REGEXTEST: { sheets: 'REGEXMATCH', libre: (a) => ({ name: 'NOT', args: [`ISNA(REGEX(${a[0]}\u0001${a[1]}))`] }), excel: true, ver: { excel: 'Excel 365 (2024+)' } },
    STOCKHISTORY: { sheets: (a) => ({ name: 'GOOGLEFINANCE', args: [a[0], '"close"', ...a.slice(1, 3)], note: 'Attributes and output shape differ' }), libre: { no: 'No equivalent' }, excel: true, ver: { excel: 'Excel 365' } },
    WEBSERVICE: { sheets: (a) => ({ name: 'IMPORTDATA', args: a, note: 'IMPORTDATA parses CSV/TSV; for raw text use IMPORTXML' }), libre: true, excel: true },
    FILTERXML: { sheets: { no: 'IMPORTXML(url, xpath) fetches and filters in one step' }, libre: true, excel: true },
    ENCODEURL: { sheets: 'ENCODEURL', libre: 'ENCODEURL', excel: true },
    PY: { sheets: { no: 'No Python in Sheets — use Apps Script' }, libre: { no: 'No equivalent' }, excel: true, ver: { excel: 'Excel 365 Insider' } },
    'ERROR.TYPE': { libre: 'ERRORTYPE', sheets: true, excel: true },
    'NORM.S.DIST': { libre: 'NORM.S.DIST', sheets: true, excel: true },
    GETPIVOTDATA: { sheets: true, libre: true, excel: true },
    CUBEVALUE: { sheets: { no: 'No OLAP cube functions' }, libre: { no: 'No OLAP cube functions' }, excel: true },
    CUBEMEMBER: { sheets: { no: 'No OLAP cube functions' }, libre: { no: 'No OLAP cube functions' }, excel: true },
    // LibreOffice specials
    REGEX: { sheets: (a) => (a.length >= 3 ? { name: 'REGEXREPLACE', args: a.slice(0, 3), note: a[3] ? '' : 'Calc REGEX replaces only the first match unless "g" is passed; REGEXREPLACE replaces all' } : { name: 'REGEXEXTRACT', args: a.slice(0, 2) }), excel: (a) => (a.length >= 3 ? { name: 'REGEXREPLACE', args: a.slice(0, 3), note: 'Excel 365 (2024+) only' } : { name: 'REGEXEXTRACT', args: a.slice(0, 2), note: 'Excel 365 (2024+) only' }), libre: true },
    ERRORTYPE: { sheets: 'ERROR.TYPE', excel: 'ERROR.TYPE', libre: true },
    ROT13: { sheets: { no: 'No equivalent' }, excel: { no: 'No equivalent' }, libre: true },
    CURRENT: { sheets: { no: 'No equivalent' }, excel: { no: 'No equivalent' }, libre: true },
    STYLE: { sheets: { no: 'Use conditional formatting' }, excel: { no: 'Use conditional formatting' }, libre: true },
    DAYSINMONTH: { sheets: (a) => ({ name: 'DAY', args: [`EOMONTH(${a[0]}\u00010)`] }), excel: (a) => ({ name: 'DAY', args: [`EOMONTH(${a[0]}\u00010)`] }), libre: true },
    ISLEAPYEAR: { sheets: (a) => ({ expr: `(DAY(DATE(YEAR(${a[0]})\u00012\u000129))=29)` }), excel: (a) => ({ expr: `(DAY(DATE(YEAR(${a[0]})\u00012\u000129))=29)` }), libre: true },
    WEEKSINYEAR: { sheets: { no: 'ISOWEEKNUM(DATE(y,12,28))' }, excel: { no: 'ISOWEEKNUM(DATE(y,12,28))' }, libre: true },
    COLOR: { sheets: { no: 'No equivalent' }, excel: { no: 'No equivalent' }, libre: true },
    'MULTIPLE.OPERATIONS': { sheets: { no: 'No equivalent' }, excel: { no: 'Use Data ▸ What-If ▸ Data Table' }, libre: true },
    FOURIER: { sheets: { no: 'No equivalent' }, excel: { no: 'Data Analysis ToolPak ▸ Fourier Analysis' }, libre: true }
  };
  // Version-gated functions that exist (by the same name) in some apps only from a certain version
  const VER = {
    XLOOKUP: { excel: 'Excel 365 / 2021+', sheets: '', libre: 'Calc 24.8+' }, XMATCH: { excel: 'Excel 365 / 2021+', sheets: '', libre: 'Calc 24.8+' },
    FILTER: { excel: 'Excel 365 / 2021+', sheets: '', libre: 'Calc 24.8+' }, SORT: { excel: 'Excel 365 / 2021+', sheets: '', libre: 'Calc 24.8+' }, SORTBY: { excel: 'Excel 365 / 2021+', sheets: { no: 'Use SORT(range, sort_col, asc)' }, libre: 'Calc 24.8+' },
    UNIQUE: { excel: 'Excel 365 / 2021+', sheets: '', libre: 'Calc 24.8+' }, SEQUENCE: { excel: 'Excel 365 / 2021+', sheets: '', libre: 'Calc 24.8+' }, RANDARRAY: { excel: 'Excel 365 / 2021+', sheets: '', libre: 'Calc 24.8+' },
    LET: { excel: 'Excel 365 / 2021+', sheets: '', libre: 'Calc 24.8+' }, LAMBDA: { excel: 'Excel 365', sheets: '', libre: { no: 'No LAMBDA in Calc' } },
    MAP: { excel: 'Excel 365', sheets: '', libre: { no: 'No LAMBDA helpers in Calc' } }, REDUCE: { excel: 'Excel 365', sheets: '', libre: { no: 'No LAMBDA helpers in Calc' } }, SCAN: { excel: 'Excel 365', sheets: '', libre: { no: 'No LAMBDA helpers in Calc' } },
    BYROW: { excel: 'Excel 365', sheets: '', libre: { no: 'No LAMBDA helpers in Calc' } }, BYCOL: { excel: 'Excel 365', sheets: '', libre: { no: 'No LAMBDA helpers in Calc' } }, MAKEARRAY: { excel: 'Excel 365', sheets: '', libre: { no: 'No LAMBDA helpers in Calc' } },
    VSTACK: { excel: 'Excel 365', sheets: '', libre: { no: 'No equivalent' } }, HSTACK: { excel: 'Excel 365', sheets: '', libre: { no: 'No equivalent' } },
    WRAPROWS: { excel: 'Excel 365', sheets: '', libre: { no: 'No equivalent' } }, WRAPCOLS: { excel: 'Excel 365', sheets: '', libre: { no: 'No equivalent' } },
    CHOOSECOLS: { excel: 'Excel 365', sheets: '', libre: { no: 'Use INDEX(range;0;n)' } }, CHOOSEROWS: { excel: 'Excel 365', sheets: '', libre: { no: 'Use INDEX(range;n;0)' } },
    TEXTJOIN: { excel: 'Excel 2019+', sheets: '', libre: '' }, CONCAT: { excel: 'Excel 2019+', sheets: '', libre: '' }, IFS: { excel: 'Excel 2019+', sheets: '', libre: '' }, SWITCH: { excel: 'Excel 2019+', sheets: '', libre: '' }, MAXIFS: { excel: 'Excel 2019+', sheets: '', libre: '' }, MINIFS: { excel: 'Excel 2019+', sheets: '', libre: '' },
    ISOMITTED: { excel: 'Excel 365', sheets: { no: 'No equivalent' }, libre: { no: 'No equivalent' } }
  };

  /* ── Tokeniser ── */
  const LIB_REF = /^\$?(?:'(?:[^']|'')+'|[A-Za-z_][\w]*)\.(?=\$?[A-Za-z]{1,3}\$?\d|\$?[A-Za-z]{1,3}:|\$?\d+:)/, XL_REF = /^(?:'(?:[^']|'')+'|[A-Za-z_][\w.]*)!/;
  const A1 = /^\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?|^\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3}(?![\w(])|^\$?\d+:\$?\d+/;
  const R1C1 = /^R(?:\[-?\d+\]|\d+)?C(?:\[-?\d+\]|\d+)?(?::R(?:\[-?\d+\]|\d+)?C(?:\[-?\d+\]|\d+)?)?(?![\w(])/;
  function tokenize(src, loc, from) {
    const toks = []; let i = 0; const dec = loc === 'eu' ? ',' : '.';
    const numRe = loc === 'eu' ? /^\d+(?:,\d+)?(?:[eE][+-]?\d+)?%?/ : /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?%?/;
    while (i < src.length) {
      const s = src.slice(i); let m;
      if ((m = s.match(/^\s+/))) { toks.push({ t: 'ws', v: m[0] }); }
      else if ((m = s.match(/^"(?:[^"]|"")*"/))) toks.push({ t: 'str', v: m[0] });
      else if (from === 'libre' && (m = s.match(LIB_REF))) { const sheet = m[0].replace(/^\$/, '').slice(0, -1); const r = s.slice(m[0].length).match(A1); if (r) { toks.push({ t: 'ref', sheet, v: r[0] }); m = { 0: m[0] + r[0] }; } else toks.push({ t: 'name', v: m[0] }); }
      else if (from !== 'libre' && (m = s.match(XL_REF))) { const sheet = m[0].slice(0, -1); const r = s.slice(m[0].length).match(A1) || s.slice(m[0].length).match(R1C1); if (r) { toks.push({ t: 'ref', sheet, v: r[0] }); m = { 0: m[0] + r[0] }; } else toks.push({ t: 'name', v: m[0] }); }
      else if ((m = s.match(/^[A-Za-z_][\w.]*(?=\s*\()/))) toks.push({ t: 'fn', v: m[0] });
      else if ((m = s.match(R1C1)) && /^R(\[|\d|C)/.test(m[0])) toks.push({ t: 'ref', sheet: '', v: m[0], r1c1: true });
      else if ((m = s.match(A1))) toks.push({ t: 'ref', sheet: '', v: m[0] });
      else if ((m = s.match(/^[A-Za-z_][\w.]*\[[^\]]*\]/))) toks.push({ t: 'struct', v: m[0] });
      else if ((m = s.match(numRe))) toks.push({ t: 'num', v: m[0].replace(dec, '.') });
      else if ((m = s.match(/^[A-Za-z_][\w.]*/))) toks.push({ t: 'name', v: m[0] });
      else if ((m = s.match(/^(?:<=|>=|<>|[-+*/^&=<>(){}:%@#\\|,;])/))) toks.push({ t: 'op', v: m[0] });
      else { m = { 0: s[0] }; toks.push({ t: 'op', v: s[0] }); }
      i += m[0].length;
    }
    return toks;
  }
  function detectLocale(src) {
    let depth = 0, inStr = false, semi = 0, commaOut = 0;
    for (let i = 0; i < src.length; i++) { const c = src[i]; if (c === '"') inStr = !inStr; if (inStr) continue; if (c === '(') depth++; else if (c === ')') depth--; else if (c === ';' && depth > 0) semi++; else if (c === ',' && depth > 0) commaOut++; }
    return semi > 0 && commaOut === 0 ? 'eu' : (/\d,\d/.test(src.replace(/"[^"]*"/g, '')) && semi > 0 ? 'eu' : 'en');
  }

  /* ── Parse into a tree of calls (just enough to rewrite arguments) ── */
  function parse(toks) {
    let p = 0;
    const node = () => { const out = []; while (p < toks.length) { const k = toks[p]; if (k.t === 'op' && (k.v === ')' || k.v === '}')) break; if (k.t === 'op' && (k.v === ',' || k.v === ';')) break; if (k.t === 'fn') { p++; while (toks[p] && toks[p].t === 'ws') p++; p++; /* ( */ const args = []; let cur = node(); args.push(cur); while (toks[p] && toks[p].t === 'op' && (toks[p].v === ',' || toks[p].v === ';')) { p++; args.push(node()); } if (toks[p] && toks[p].v === ')') p++; out.push({ t: 'call', name: k.v, args: args.length === 1 && !args[0].length ? [] : args }); } else if (k.t === 'op' && k.v === '(') { p++; const inner = [node()]; while (toks[p] && toks[p].t === 'op' && (toks[p].v === ',' || toks[p].v === ';')) { p++; inner.push(node()); } if (toks[p] && toks[p].v === ')') p++; out.push({ t: 'paren', items: inner }); } else if (k.t === 'op' && k.v === '{') { p++; const rows = [[]]; let cur = node(); rows[0].push(cur); while (toks[p] && toks[p].t === 'op' && /^[,;\\|]$/.test(toks[p].v)) { const sep = toks[p].v; p++; const n = node(); if (sep === SRC_ARR().row) rows.push([n]); else rows[rows.length - 1].push(n); } if (toks[p] && toks[p].v === '}') p++; out.push({ t: 'array', rows }); } else { out.push(k); p++; } } return out; };
    return node();
  }
  let srcLoc = 'en', srcApp = 'sheets';
  const SRC_ARR = () => (srcApp === 'libre' ? { col: ';', row: '|' } : srcLoc === 'eu' ? { col: '\\', row: ';' } : { col: ',', row: ';' });

  /* ── Emit ── */
  function convert(formula, o) {
    const report = new Map(), notes = new Set(); srcApp = o.from; srcLoc = o.srcLoc === 'auto' ? detectLocale(formula) : o.srcLoc;
    const body = formula.replace(/^\s*=/, ''), toks = tokenize(body, srcLoc, o.from), tree = parse(toks);
    const SEP = o.dstLoc === 'eu' ? ';' : ',', DEC = o.dstLoc === 'eu' ? ',' : '.';
    const ARR = o.to === 'libre' ? { col: ';', row: '|' } : o.dstLoc === 'eu' ? { col: '\\', row: ';' } : { col: ',', row: ';' };
    const mark = (name, status, note) => { const k = name.toUpperCase(); if (!report.has(k) || report.get(k).status === 'ok') report.set(k, { name: k, status, note: note || '' }); };
    const refOut = (k) => {
      let v = k.v, sheet = k.sheet;
      if (o.refs === 'r1c1' && !k.r1c1) v = a1ToR1C1(v, o.cell); else if (o.refs === 'a1' && k.r1c1) v = r1c1ToA1(v, o.cell); else if (o.refs === 'abs' && !k.r1c1) v = v.replace(/\$/g, '').replace(/([A-Za-z]+)(\d+)/g, '$$$1$$$2').replace(/^([A-Za-z]+):([A-Za-z]+)$/, '$$$1:$$$2'); else if (o.refs === 'rel' && !k.r1c1) v = v.replace(/\$/g, '');
      if (!sheet) return v;
      const bare = sheet.replace(/^'|'$/g, ''), needsQ = /[^\w]/.test(bare);
      if (o.to === 'libre') return `$${needsQ ? `'${bare}'` : bare}.${v}`;
      return `${needsQ ? `'${bare}'` : bare}!${v}`;
    };
    const emitList = (items) => items.map(emit).join('');
    function emit(n) {
      if (Array.isArray(n)) return emitList(n);
      if (n.t === 'ws') return n.v;
      if (n.t === 'str') return n.v;
      if (n.t === 'num') return n.v.replace('.', DEC);
      if (n.t === 'ref') return refOut(n);
      if (n.t === 'struct') { if (o.to !== 'excel') notes.add(`Structured reference ${n.v} exists only in Excel tables — replace with a plain range`); return n.v; }
      if (n.t === 'name') return n.v;
      if (n.t === 'op') { if (n.v === '@' && o.to !== 'excel') notes.add('Implicit-intersection @ is Excel-only — removed'); if (n.v === '@' && o.to !== 'excel') return ''; if (n.v === '#' && o.to !== 'excel') notes.add('Spill operator # is Excel-only — reference the range explicitly'); return n.v; }
      if (n.t === 'paren') return '(' + n.items.map(emit).join(SEP) + ')';
      if (n.t === 'array') return '{' + n.rows.map((r) => r.map(emit).join(ARR.col)).join(ARR.row) + '}';
      if (n.t === 'call') {
        const key = n.name.toUpperCase(), args = n.args.map((a) => emit(a).trim()), spec = T[key], ver = VER[key];
        let name = o.upper ? key : n.name, rule = spec ? spec[o.to] : undefined;
        if (ver && ver[o.to] && typeof ver[o.to] === 'object') rule = ver[o.to];
        if (rule === undefined || rule === true) { mark(key, 'ok', ver && ver[o.to] && typeof ver[o.to] === 'string' && ver[o.to] ? ver[o.to] + ' only' : (spec && spec.ver && spec.ver[o.to] ? spec.ver[o.to] + ' only' : '')); if (ver && ver[o.to]) report.get(key).status = 'ver'; else if (spec && spec.ver && spec.ver[o.to]) report.get(key).status = 'ver'; return `${name}(${args.join(SEP)})`; }
        if (typeof rule === 'string') { mark(key, 'renamed', `→ ${rule}`); return `${rule}(${args.join(SEP)})`; }
        if (typeof rule === 'function') {
          const r = rule(args); if (r && r.no) { mark(key, 'no', r.no); return `${name}(${args.join(SEP)})`; }
          if (r.unwrap !== undefined) { mark(key, 'renamed', r.note || 'Wrapper removed'); return r.unwrap; }
          if (r.expr) { const e = r.expr.replace(/\u0001/g, SEP); mark(key, 'renamed', `→ ${e.length > 40 ? 'operator form' : e}${r.note ? ' · ' + r.note : ''}`); return e; }
          mark(key, 'renamed', `→ ${r.name}${r.note ? ' · ' + r.note : ''}`); return `${r.name}(${r.args.join(SEP)})`.replace(/\u0001/g, SEP);
        }
        if (rule && rule.no) { mark(key, 'no', rule.no); return `${name}(${args.join(SEP)})`; }
        return `${name}(${args.join(SEP)})`;
      }
      return '';
    }
    let out = '=' + emit(tree).trim();
    if (srcLoc !== o.dstLoc) notes.add(`Separators changed: ${srcLoc === 'eu' ? '; → ,' : ', → ;'}${srcLoc === 'eu' ? ' and decimal , → .' : ' and decimal . → ,'}`);
    if (o.from === 'libre' && o.to !== 'libre' && /\$?\w+\.\$?[A-Z]/.test(body)) notes.add('Sheet references rewritten from $Sheet.A1 to Sheet!A1');
    if (o.to === 'libre' && o.from !== 'libre' && /!/.test(body)) notes.add('Sheet references rewritten from Sheet!A1 to $Sheet.A1');
    return { out, report: [...report.values()], notes: [...notes] };
  }

  /* ── A1 ↔ R1C1 ── */
  const colNum = (s) => s.toUpperCase().split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0);
  const colStr = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  function cellPos(c) { const m = String(c || 'A1').toUpperCase().match(/^([A-Z]{1,3})(\d+)$/); return m ? { c: colNum(m[1]), r: +m[2] } : { c: 1, r: 1 }; }
  function a1ToR1C1(ref, cell) {
    const base = cellPos(cell), part = (p) => {
      let m = p.match(/^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/);
      if (m) return (m[3] ? `R${m[4]}` : `R${+m[4] - base.r ? `[${+m[4] - base.r}]` : ''}`) + (m[1] ? `C${colNum(m[2])}` : `C${colNum(m[2]) - base.c ? `[${colNum(m[2]) - base.c}]` : ''}`);
      if ((m = p.match(/^(\$?)([A-Za-z]{1,3})$/))) return m[1] ? `C${colNum(m[2])}` : `C${colNum(m[2]) - base.c ? `[${colNum(m[2]) - base.c}]` : ''}`;
      if ((m = p.match(/^(\$?)(\d+)$/))) return m[1] ? `R${m[2]}` : `R${+m[2] - base.r ? `[${+m[2] - base.r}]` : ''}`;
      return p;
    };
    const parts = ref.split(':').map(part); return parts.length === 2 && parts[0] === parts[1] ? parts[0] : parts.join(':');
  }
  function r1c1ToA1(ref, cell) {
    const base = cellPos(cell), part = (p) => {
      const m = p.match(/^R(?:\[(-?\d+)\]|(\d+))?C(?:\[(-?\d+)\]|(\d+))?$/); if (!m) return p;
      const r = m[2] ? `$${m[2]}` : String(base.r + (+m[1] || 0)), c = m[4] ? `$${colStr(+m[4])}` : colStr(base.c + (+m[3] || 0));
      return c + r;
    };
    return ref.split(':').map(part).join(':');
  }

  /* ── UI ── */
  const opts = ({ val }) => ({ from: val('opt-from'), to: val('opt-to'), srcLoc: val('opt-src-locale'), dstLoc: val('opt-dst-locale'), refs: val('opt-refs'), cell: val('opt-cell'), upper: val('opt-upper') });
  let last = null;
  mount({
    slug: 'spreadsheet-formula-converter', debounce: 200,
    ready: ({ val }) => (val('text-input').trim() ? (val('opt-from') === val('opt-to') ? 'Pick two different apps' : true) : 'Paste a formula to convert'),
    summary: ({ val }) => `${val('opt-src-locale') === 'auto' ? 'Auto-detect' : val('opt-src-locale').toUpperCase()} → ${val('opt-dst-locale').toUpperCase()} separators · ${{ keep: 'keep references', r1c1: 'A1 → R1C1', a1: 'R1C1 → A1', abs: 'absolute refs', rel: 'relative refs' }[val('opt-refs')]}`,
    run(api) {
      const o = opts(api), lines = api.val('text-input').split('\n').filter((l) => l.trim()), results = lines.map((l) => convert(l, o));
      last = { o, lines, results };
      $('input-count').textContent = `${lines.length} formula${lines.length === 1 ? '' : 's'} · ${APP[o.from]} → ${APP[o.to]}`;
      $('output-text').textContent = results.map((r) => r.out).join('\n');
      const rep = new Map(); results.forEach((r) => r.report.forEach((x) => { if (!rep.has(x.name) || rep.get(x.name).status === 'ok') rep.set(x.name, x); }));
      const rows = [...rep.values()].sort((a, b) => ({ no: 0, renamed: 1, ver: 2, ok: 3 }[a.status] - { no: 0, renamed: 1, ver: 2, ok: 3 }[b.status]) || a.name.localeCompare(b.name));
      const ICON = { ok: '✅ same', renamed: '⚠ rewritten', ver: '🕒 version', no: '❌ none' };
      $('sf-report').querySelector('tbody').innerHTML = rows.map((x) => `<tr class="is-${x.status}"><td><code>${esc(x.name)}</code></td><td>${ICON[x.status]}</td><td>${esc(x.note) || (x.status === 'ok' ? 'Same name and arguments' : '')}</td></tr>`).join('') || '<tr><td colspan="3" class="is-empty">No functions found</td></tr>';
      const notes = [...new Set(results.flatMap((r) => r.notes))]; $('sf-tags').innerHTML = notes.map((n) => `<span class="web-tag warn">${esc(n)}</span>`).join('');
      const bad = rows.filter((x) => x.status === 'no').length, warn = rows.filter((x) => x.status !== 'ok' && x.status !== 'no').length;
      return { text: results.map((r) => r.out).join('\n'), ext: 'txt', badge: `${rows.length} function${rows.length === 1 ? '' : 's'} · ${bad} missing`, note: bad ? `❌ ${bad} function${bad === 1 ? ' has' : 's have'} no ${APP[o.to]} equivalent — see report` : warn ? `⚠ Converted — ${warn} rewritten or version-gated` : '✓ Converted — every function exists in ' + APP[o.to], ok: !bad, copyMsg: 'Converted formula copied' };
    },
    async download(fmt) { if (!last) return null; if (fmt === 'csv') { const rows = [...new Map(last.results.flatMap((r) => r.report).map((x) => [x.name, x])).values()]; return { text: 'function,status,note\n' + rows.map((x) => `${x.name},${x.status},"${x.note.replace(/"/g, '""')}"`).join('\n') + '\n', mime: 'text/csv', ext: 'csv' }; } return { text: last.results.map((r) => r.out).join('\n'), ext: 'txt' }; },
    filename: ({ val }) => `formulas-${val('opt-to')}`,
    onReset() { last = null; $('sf-report').querySelector('tbody').innerHTML = ''; $('sf-tags').innerHTML = ''; }
  });
  $('btn-swap').addEventListener('click', () => { const a = $('opt-from').value; $('opt-from').value = $('opt-to').value; $('opt-to').value = a; $('opt-to').dispatchEvent(new Event('change', { bubbles: true })); });
  $('btn-sample').addEventListener('click', () => { $('text-input').value = SAMPLE; $('text-input').dispatchEvent(new Event('input', { bubbles: true })); });
  window.__sf = { convert, tokenize, detectLocale, a1ToR1C1, r1c1ToA1, T, VER };
})();

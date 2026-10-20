/* Designed by Kapil Pidhwani: Code Formatter & Minifier. Beautify = Prettier (pinned ESM, only the plugins the language needs)
 * + sql-formatter; Minify = Terser (JS), CSSO (CSS), native JSON, and small in-house HTML / SQL / XML minifiers.
 * Formatting is async, but run() stays synchronous: it returns the cached result for the current input, or starts the job,
 * keeps the previous output on screen and re-runs when the job settles — so typing is never blocked by the busy overlay.
 * Ceilings: HTML minify only drops comments and whitespace around block-level tags (no attribute rewriting); SQL minify drops
 * all comments (incl. optimiser hints); XML beautify trims text in mixed content. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const CDN = 'https://cdn.jsdelivr.net/npm/';
  const PRETTIER = CDN + 'prettier@3.9.10/';
  const PLUGINS = { html: ['html', 'babel', 'estree', 'postcss'], css: ['postcss'], scss: ['postcss'], javascript: ['babel', 'estree'], typescript: ['typescript', 'estree'], markdown: ['markdown'], yaml: ['yaml'] };
  const PARSER = { html: 'html', css: 'css', scss: 'scss', javascript: 'babel', typescript: 'typescript', markdown: 'markdown', yaml: 'yaml' };
  const NAME = { html: 'HTML', css: 'CSS', scss: 'SCSS', javascript: 'JavaScript', typescript: 'TypeScript', json: 'JSON', sql: 'SQL', xml: 'XML', markdown: 'Markdown', yaml: 'YAML' };
  const EXT = { html: 'html', css: 'css', scss: 'scss', javascript: 'js', typescript: 'ts', json: 'json', sql: 'sql', xml: 'xml', markdown: 'md', yaml: 'yaml' };
  const MINIFIABLE = new Set(['html', 'css', 'javascript', 'json', 'sql', 'xml']);

  const mods = {};
  const esm = (url, what) => (mods[url] = mods[url] || import(url).catch(() => { delete mods[url]; throw new Error(`Couldn't load ${what} — check your connection and try again.`); }));
  let terserP = null;
  const terser = () => window.Terser ? Promise.resolve(window.Terser) : (terserP = terserP || new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = CDN + 'terser@5.51.2/dist/bundle.min.js';
    s.onload = () => (window.Terser ? res(window.Terser) : rej()); s.onerror = rej; document.head.append(s);
  }).catch(() => { terserP = null; throw new Error("Couldn't load Terser — check your connection and try again."); }));

  function detect(src) {
    const t = src.trim();
    if (/^[[{]/.test(t)) { try { JSON.parse(t); return 'json'; } catch (e) { /* not JSON */ } }
    if (/^<\?xml/i.test(t)) return 'xml';
    if (/^<(!doctype\s+html|html|head|body|div|span|p|a|ul|ol|li|section|main|header|footer|nav|article|script|style|meta|link|template|table|form|img|button|input|h[1-6]|!--)[\s>/]/i.test(t)) return 'html';
    if (/^</.test(t)) return /xmlns|<\/?[a-z][\w-]*:[a-z]/i.test(t) || !/<(div|span|p|a|img|br|b|i)[\s>/]/i.test(t) ? 'xml' : 'html';
    if (/^(select|insert\s+into|update\s+\w+\s+set|delete\s+from|create\s+(table|view|index|unique|or\s+replace)|alter\s+table|drop\s+(table|view)|with\s+\w+\s+as\s*\()\b/i.test(t)) return 'sql';
    if (/\binterface\s+\w+\s*\{|\btype\s+\w+\s*=|:\s*(string|number|boolean|void|unknown|any)\b|\bas\s+const\b|\benum\s+\w+\s*\{/.test(t)) return 'typescript';
    if (!/\b(function|const|let|var|return|import|export)\b|=>/.test(t) && /^(@[\w-]+|:root|[*.#\[\w-][^{};]*)\{/m.test(t) && /[\w-]+\s*:\s*[^;{}]+;?\s*}/.test(t)) return 'css';
    return 'javascript';
  }
  const lineCol = (src, pos) => { const before = src.slice(0, pos).split('\n'); return `line ${before.length}, column ${before[before.length - 1].length + 1}`; };

  /* ── in-house minifiers ── */
  const BLOCK = 'html|head|body|title|meta|link|base|script|style|noscript|div|p|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|td|th|caption|colgroup|col|form|fieldset|legend|select|option|optgroup|section|article|aside|header|footer|nav|main|figure|figcaption|h[1-6]|hr|br|blockquote|address|details|summary|dialog|template|svg|iframe|video|audio|source|picture|canvas|!doctype';
  function minifyHtml(src) {
    const keep = [];
    let s = src.replace(/<(pre|textarea|script|style)\b[\s\S]*?<\/\1\s*>/gi, (m) => `\u0000${keep.push(m) - 1}\u0000`);
    s = s.replace(/<!--(?!\[if|<!|>)[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
    s = s.replace(new RegExp(`\\s*(<\\/?(?:${BLOCK})\\b[^>]*>)\\s*`, 'gi'), '$1').replace(/\s*(\u0000\d+\u0000)\s*/g, '$1');
    return s.trim().replace(/\u0000(\d+)\u0000/g, (_, i) => keep[i]);
  }
  function minifySql(src) {
    const toks = src.match(/'(?:[^']|'')*'?|"(?:[^"]|"")*"?|`[^`]*`?|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|\s+|[\w$@#.]+|[\s\S]/g) || [];
    const word = /[\w$@#'"`\])]$/, start = /^[\w$@#'"`([]/;
    let out = '', gap = false;
    for (const t of toks) {
      if (/^\s/.test(t) || /^--|^\/\*/.test(t)) { gap = true; continue; }
      if (gap && word.test(out) && start.test(t)) out += ' ';
      out += t; gap = false;
    }
    return out;
  }
  function parseXml(src) {
    const doc = new DOMParser().parseFromString(src, 'application/xml'), err = doc.querySelector('parsererror');
    if (err) throw new Error('XML error: ' + (err.textContent.match(/(line \d+.*?)(\n|$)/i) || [, err.textContent.split('\n')[0]])[1].trim());
    return doc;
  }
  const xmlDecl = (src) => (src.trim().match(/^<\?xml[^?]*\?>/) || [''])[0];
  function minifyXml(src) {
    const doc = parseXml(src), walker = doc.createTreeWalker(doc, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT), drop = [];
    while (walker.nextNode()) { const n = walker.currentNode; if (n.nodeType === 8 || !n.nodeValue.trim()) drop.push(n); }
    drop.forEach((n) => n.remove());
    return xmlDecl(src) + new XMLSerializer().serializeToString(doc).replace(/^<\?xml[^?]*\?>/, '');
  }
  function beautifyXml(src, ind) {
    const doc = parseXml(src), ser = new XMLSerializer();
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const walk = (n, d) => {
      const pad = ind.repeat(d);
      if (n.nodeType === 3) return pad + esc(n.nodeValue.trim());
      if (n.nodeType !== 1) return pad + ser.serializeToString(n);
      const attrs = [...n.attributes].map((a) => ` ${a.name}="${esc(a.value).replace(/"/g, '&quot;')}"`).join('');
      const kids = [...n.childNodes].filter((c) => !(c.nodeType === 3 && !c.nodeValue.trim()));
      if (!kids.length) return `${pad}<${n.nodeName}${attrs}/>`;
      if (kids.length === 1 && kids[0].nodeType === 3) return `${pad}<${n.nodeName}${attrs}>${esc(kids[0].nodeValue.trim())}</${n.nodeName}>`;
      return `${pad}<${n.nodeName}${attrs}>\n${kids.map((k) => walk(k, d + 1)).join('\n')}\n${pad}</${n.nodeName}>`;
    };
    const decl = xmlDecl(src);
    return (decl ? decl + '\n' : '') + [...doc.childNodes].map((n) => walk(n, 0)).join('\n') + '\n';
  }

  async function format(j) {
    const lang = j.lang === 'auto' ? detect(j.code) : j.lang, ind = j.indent === 'tab' ? '\t' : ' '.repeat(+j.indent);
    const fail = (e) => {
      const at = e.loc && e.loc.start ? ` at line ${e.loc.start.line}, column ${e.loc.start.column}` : e.line ? ` at line ${e.line}, column ${e.col + 1}` : '';
      const msg = String(e.message || e).split('\n')[0].replace(/\s*\(\d+:\d+\)\s*$/, '');
      throw new Error(/^(Couldn't|XML error)/.test(msg) ? msg : `${NAME[lang]} error${at}: ${msg}`);
    };
    try {
      if (j.mode === 'minify') {
        if (!MINIFIABLE.has(lang)) throw new Error(`Couldn't minify ${NAME[lang]} — it's a source format. Minify the compiled ${lang === 'scss' ? 'CSS' : lang === 'typescript' ? 'JavaScript' : 'output'} instead, or switch to Beautify.`);
        if (lang === 'json') { try { return { lang, out: JSON.stringify(JSON.parse(j.code)) }; } catch (e) { const p = /position (\d+)/.exec(e.message); throw new Error(`JSON error${p ? ' at ' + lineCol(j.code, +p[1]) : ''}: ${e.message.replace(/ in JSON at position \d+.*$/, '')}`); } }
        if (lang === 'javascript') { const r = await (await terser()).minify(j.code, { compress: { drop_console: j.dropConsole }, mangle: j.mangle, format: { comments: false } }); return { lang, out: r.code }; }
        if (lang === 'css') return { lang, out: (await esm(CDN + 'csso@5.0.5/dist/csso.esm.js', 'CSSO')).minify(j.code).css };
        if (lang === 'html') return { lang, out: minifyHtml(j.code) };
        if (lang === 'sql') return { lang, out: minifySql(j.code) };
        return { lang, out: minifyXml(j.code) };
      }
      if (lang === 'json') { try { return { lang, out: JSON.stringify(JSON.parse(j.code), null, ind) + '\n' }; } catch (e) { const p = /position (\d+)/.exec(e.message); throw new Error(`JSON error${p ? ' at ' + lineCol(j.code, +p[1]) : ''}: ${e.message.replace(/ in JSON at position \d+.*$/, '')}`); } }
      if (lang === 'xml') return { lang, out: beautifyXml(j.code, ind) };
      if (lang === 'sql') { const m = await esm(CDN + 'sql-formatter@15.9.0/+esm', 'sql-formatter'); return { lang, out: m.format(j.code, { language: j.dialect, tabWidth: j.indent === 'tab' ? 2 : +j.indent, useTabs: j.indent === 'tab', keywordCase: j.keycase || 'upper', dataTypeCase: j.keycase || 'upper', functionCase: j.keycase || 'upper', expressionWidth: +j.width }) + '\n' }; }
      const [prettier, ...plugins] = await Promise.all([esm(PRETTIER + 'standalone.mjs', 'Prettier'), ...PLUGINS[lang].map((p) => esm(`${PRETTIER}plugins/${p}.mjs`, 'Prettier'))]);
      const out = await prettier.format(j.code, { parser: PARSER[lang], plugins: plugins.map((m) => m.default || m), tabWidth: j.indent === 'tab' ? 2 : +j.indent, useTabs: j.indent === 'tab', printWidth: +j.width, singleQuote: j.single, semi: j.semi });
      return { lang, out };
    } catch (e) { fail(e); }
  }

  const bytes = (s) => new TextEncoder().encode(s).length;
  const job = (val, pill) => ({ code: val('text-input'), lang: val('opt-lang'), mode: pill('seg-mode') || 'beautify', indent: val('opt-indent'), width: val('opt-width'), single: val('opt-single'), semi: val('opt-semi'), dialect: val('opt-dialect'), keycase: val('opt-keycase'), mangle: val('opt-mangle'), dropConsole: val('opt-console') });
  let cache = { key: null }, pending = null;

  mount({
    slug: 'code-formatter', idle: 'Paste code to begin', debounce: 350,
    ready: ({ val }) => (val('text-input').trim() ? true : 'Paste code to begin'),
    summary: ({ val }) => [val('opt-indent') === 'tab' ? 'Tabs' : `${val('opt-indent')} spaces`, `${val('opt-width')} cols`, val('opt-single') ? 'single quotes' : 'double quotes'].join(' · '),
    run: ({ val, pill, $, S, status }) => {
      const j = job(val, pill), key = JSON.stringify(j);
      const nl = j.code.split('\n').length;
      $('input-count').textContent = `${nl.toLocaleString()} line${nl === 1 ? '' : 's'} · ${window.Toolity.formatBytes(bytes(j.code))}`;
      if (cache.key === key) {
        if (cache.err) throw cache.err;
        const { lang, out } = cache.res, a = bytes(j.code), b = bytes(out), pct = a ? Math.round((1 - b / a) * 100) : 0;
        $('output-text').textContent = out;
        return { text: out, ext: EXT[lang], lang, badge: `${window.Toolity.formatBytes(a)} → ${window.Toolity.formatBytes(b)}${pct > 0 ? ` (−${pct}%)` : ''}`, note: `${j.lang === 'auto' ? 'Detected ' : ''}${NAME[lang]} · ${j.mode === 'minify' ? 'minified' : 'formatted'}`, copyMsg: 'Code copied' };
      }
      if (pending !== key) {
        pending = key;
        format(j).then((res) => { cache = { key, res }; }, (err) => { cache = { key, err }; })
          .finally(() => { if (pending === key) { pending = null; window.ToolityWebTool.run(); } });
      }
      const note = mods[PRETTIER + 'standalone.mjs'] || S.out ? 'Formatting…' : 'Loading formatter…';
      status(note);
      return S.out ? Object.assign({}, S.out, { note }) : null; // keep the previous result visible until the new one is ready
    },
    download: (fmt, { S }) => ({ text: S.out.text, ext: S.out.ext, mime: 'text/plain;charset=utf-8' }),
    filename: ({ pill }) => (pill('seg-mode') === 'minify' ? 'minified' : 'formatted'),
    onReset: ({ $ }) => { $('input-count').textContent = ''; $('output-text').textContent = ''; cache = { key: null }; pending = null; }
  });
  window.ToolityFormatter = { detect, minifyHtml, minifySql }; // exposed for the page test
})();

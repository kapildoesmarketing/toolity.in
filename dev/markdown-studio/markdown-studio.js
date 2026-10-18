/* Designed by Kapil Pidhwani: Markdown Studio. Markdown → HTML = marked (GFM) + DOMPurify; HTML → Markdown = Turndown (+ GFM
 * tables/strikethrough/task lists). Libraries are pinned ESM, imported on first use. run() stays synchronous: it returns
 * the cached result for the current input or starts the job and keeps the previous output on screen (same trick as
 * Code Formatter), so typing never hits the busy overlay. PDF = the full HTML document printed from a hidden iframe —
 * the browser's "Save as PDF" does the rest; page size/margins are whatever the print dialog says. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const CDN = 'https://cdn.jsdelivr.net/npm/';
  const mods = {};
  const esm = (url, what) => (mods[url] = mods[url] || import(url).catch(() => { delete mods[url]; throw new Error(`Couldn't load ${what} — check your connection and try again.`); }));
  const purify = () => esm(CDN + 'dompurify@3.2.6/dist/purify.es.mjs', 'DOMPurify').then((m) => m.default);
  const PRINT_CSS = 'body{max-width:72ch;margin:2rem auto;padding:0 1rem;font:16px/1.65 Inter,-apple-system,"Segoe UI",sans-serif;color:#17191c}h1,h2,h3,h4{line-height:1.25;margin:1.6em 0 .6em}h1{font-size:2rem}h2{font-size:1.5rem}h3{font-size:1.2rem}pre,code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}pre{padding:.85rem 1rem;background:#f4f4f2;border-radius:6px;overflow:auto;white-space:pre-wrap}code{background:#f4f4f2;padding:.1em .3em;border-radius:3px}pre code{padding:0;background:none}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #ddd;padding:.4rem .6rem;text-align:left}th{background:#f7f7f5}blockquote{margin:1em 0;padding:.2rem 1rem;border-left:3px solid #ddd;color:#555}img{max-width:100%}a{color:#d84315}hr{border:0;border-top:1px solid #ddd;margin:2em 0}@page{margin:18mm}';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const slugify = (s) => s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  const fullDoc = (body, title) => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title>\n<style>${PRINT_CSS}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

  function addIds(doc) {
    const seen = Object.create(null);
    doc.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => { let id = slugify(h.textContent) || 'section'; if (id in seen) id += '-' + (++seen[id]); else seen[id] = 0; h.id = id; });
  }
  async function convert(j) {
    if (j.mode === 'md2html') {
      const [{ marked }, DOMPurify] = await Promise.all([esm(CDN + 'marked@15.0.12/lib/marked.esm.js', 'marked'), purify()]);
      const doc = new DOMParser().parseFromString(DOMPurify.sanitize(marked.parse(j.src, { gfm: j.gfm, breaks: j.breaks, async: false })), 'text/html');
      if (j.ids) addIds(doc);
      const html = doc.body.innerHTML.trim() + '\n';
      return { html, code: html, md: j.src, ext: 'html' };
    }
    const [{ default: Turndown }, gfm, DOMPurify] = await Promise.all([esm(CDN + 'turndown@7.2.0/+esm', 'Turndown'), esm(CDN + 'turndown-plugin-gfm@1.0.2/+esm', 'Turndown'), purify()]);
    const td = new Turndown({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '_' });
    if (j.gfm) td.use(gfm.gfm);
    const html = DOMPurify.sanitize(j.src);
    const md = td.turndown(html).trim() + '\n';
    return { html, code: md, md, ext: 'md' };
  }
  const stats = (md, html) => {
    const words = (md.match(/\S+/g) || []).length, heads = (html.match(/<h[1-6][\s>]/g) || []).length;
    return `${words.toLocaleString()} word${words === 1 ? '' : 's'} · ${heads} heading${heads === 1 ? '' : 's'} · ${Math.max(1, Math.ceil(words / 200))} min read`;
  };
  const titleOf = (html) => { const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html); return m ? m[1].replace(/<[^>]+>/g, '').trim() || 'Document' : 'Document'; };
  function printDoc(doc) {
    const f = document.createElement('iframe'); f.className = 'md-print-frame'; f.setAttribute('aria-hidden', 'true'); f.srcdoc = doc;
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } finally { setTimeout(() => f.remove(), 60000); } };
    document.body.append(f);
  }

  const job = (val, pill) => ({ src: val('text-input'), mode: pill('seg-mode') || 'md2html', gfm: val('opt-gfm'), breaks: val('opt-breaks'), ids: val('opt-ids') });
  let cache = { key: null }, pending = null;
  const LABEL = { md2html: ['Markdown', 'Paste Markdown to begin', '# Title\n\nSome **bold** text, a [link](https://example.com) and a list:\n\n- item one\n- item two'], html2md: ['HTML', 'Paste HTML to begin', '<h1>Title</h1>\n<p>Some <strong>bold</strong> text and a <a href="https://example.com">link</a>.</p>\n<ul><li>item one</li><li>item two</li></ul>'] };

  mount({
    slug: 'markdown-studio', debounce: 250,
    ready: ({ val, pill }) => (val('text-input').trim() ? true : LABEL[pill('seg-mode') || 'md2html'][1]),
    summary: ({ val }) => [val('opt-gfm') ? 'GFM' : 'CommonMark', val('opt-breaks') ? 'hard breaks' : null, val('opt-ids') ? 'heading ids' : null, val('opt-fulldoc') ? 'full HTML page' : 'HTML fragment'].filter(Boolean).join(' · '),
    onPill: (g, { $, pill }) => { if (g.id !== 'seg-mode') return; const [label, , ph] = LABEL[pill('seg-mode')]; $('input-label').textContent = label; $('text-input').placeholder = ph; },
    run: ({ val, pill, $, S, status }) => {
      const j = job(val, pill), key = JSON.stringify(j), view = pill('seg-view') || 'preview';
      const nl = j.src.split('\n').length;
      $('input-count').textContent = `${nl.toLocaleString()} line${nl === 1 ? '' : 's'} · ${window.Toolity.formatBytes(new TextEncoder().encode(j.src).length)}`;
      $('output-preview').hidden = view !== 'preview'; $('output-text').hidden = view !== 'code';
      if (cache.key === key) {
        if (cache.err) throw cache.err;
        const r = cache.res;
        if ($('output-preview').dataset.key !== key) { $('output-preview').innerHTML = r.html; $('output-preview').dataset.key = key; $('output-text').textContent = r.code; }
        return { text: r.code, ext: r.ext, res: r, badge: stats(r.md, r.html), note: j.mode === 'md2html' ? 'Markdown → HTML' : 'HTML → Markdown', copyMsg: j.mode === 'md2html' ? 'HTML copied' : 'Markdown copied' };
      }
      if (pending !== key) {
        pending = key;
        convert(j).then((res) => { cache = { key, res }; }, (err) => { cache = { key, err }; })
          .finally(() => { if (pending === key) { pending = null; window.ToolityWebTool.run(); } });
      }
      const note = S.out ? 'Rendering…' : 'Loading renderer…';
      status(note);
      return S.out ? Object.assign({}, S.out, { note }) : null;
    },
    download: (fmt, { S, val }) => {
      const r = S.out.res, title = titleOf(r.html), name = slugify(title) || 'document';
      if (fmt === 'pdf') { printDoc(fullDoc(r.html, title)); return null; }
      if (fmt === 'md') return { text: r.md, name: `${name}.md`, mime: 'text/markdown;charset=utf-8' };
      return { text: val('opt-fulldoc') ? fullDoc(r.html, title) : r.html, name: `${name}.html`, mime: 'text/html;charset=utf-8' };
    },
    onReset: ({ $ }) => { $('input-count').textContent = ''; $('output-preview').innerHTML = ''; delete $('output-preview').dataset.key; $('output-text').textContent = ''; $('input-label').textContent = 'Markdown'; $('text-input').placeholder = LABEL.md2html[2]; cache = { key: null }; pending = null; }
  });
})();

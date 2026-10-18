/* Designed by Kapil Pidhwani: HTML / CSS / JS Playground. Three textareas → one composed document in a sandboxed iframe
 * (allow-scripts, no allow-same-origin: opaque origin, can't touch Toolity). A tiny console shim inside the sandbox forwards
 * console.* / errors / rejections via postMessage. Sharing = deflate-raw (native CompressionStream) + base64url in the URL
 * fragment; nothing is stored anywhere. Ceilings: plain textareas (no highlighting — CodeMirror is the upgrade path); the
 * fragment comfortably holds ~60 KB of code; error line numbers are mapped back to the JS editor only for the user script. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const CDN = 'https://cdn.jsdelivr.net/npm/';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const SHIM = (off) => `<script>(function(){var p=function(t,a){parent.postMessage({__pg:1,t:t,a:a},'*')};var f=function(v){try{if(v instanceof Element)return v.outerHTML;if(typeof v==='string')return v;if(v instanceof Error)return v.stack||String(v);if(typeof v==='function')return '[Function '+(v.name||'anonymous')+']';if(v===undefined)return 'undefined';var seen=new WeakSet();return JSON.stringify(v,function(k,x){if(typeof x==='object'&&x!==null){if(seen.has(x))return '[Circular]';seen.add(x)}if(typeof x==='function')return '[Function]';if(typeof x==='bigint')return x+'n';return x},2)}catch(e){return String(v)}};['log','info','warn','error','debug','table'].forEach(function(m){console[m]=function(){p(m==='table'||m==='debug'?'log':m,[].slice.call(arguments).map(f))}});window.onerror=function(m,s,l,c){p('error',[m+(l?' (line '+(l-${off})+(c?':'+c:'')+')':'')])};window.onunhandledrejection=function(e){p('error',['Unhandled rejection: '+f(e.reason)])}})()<\/script>`;
  function compose(v, withShim) {
    const head = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${v.normalize ? `<link rel="stylesheet" href="${CDN}normalize.css@8.0.1/normalize.css">\n` : ''}${v.tailwind ? '<script src="https://cdn.tailwindcss.com"><\/script>\n' : ''}<style>\n${v.css}\n</style>\n</head>\n<body>\n${v.html}\n`;
    const off = (head.match(/\n/g) || []).length + 2; // + shim line + <script> line → onerror line − off = line in the JS editor
    return head + (withShim ? SHIM(off) + '\n' : '') + `<script>\n${v.js}\n<\/script>\n</body>\n</html>\n`;
  }
  /* share codec: JSON → deflate-raw → base64url (and back) */
  const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const pipe = async (bytes, Stream) => new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'))).arrayBuffer();
  const encode = async (v) => b64u(await pipe(new TextEncoder().encode(JSON.stringify([v.html, v.css, v.js])), CompressionStream));
  const decode = async (s) => JSON.parse(new TextDecoder().decode(await pipe(unb64u(s), DecompressionStream)));

  const vals = (val) => ({ html: val('pg-html'), css: val('pg-css'), js: val('pg-js'), normalize: val('opt-normalize'), tailwind: val('opt-tailwind') });
  let lastDoc = '', linkSeq = 0;
  const api = mount({
    slug: 'html-css-js-playground', debounce: 600,
    ready: ({ val }) => (val('pg-html').trim() || val('pg-css').trim() || val('pg-js').trim() ? true : 'Write some HTML, CSS or JavaScript'),
    summary: ({ val }) => [val('opt-auto') ? 'Auto-run on' : 'Run manually', val('opt-normalize') ? 'normalize.css' : 'no CSS reset', val('opt-tailwind') ? 'Tailwind' : 'no Tailwind'].join(' · '),
    run: (a) => {
      const { $, val, S, status } = a, v = vals(val);
      ['html', 'css', 'js'].forEach((k) => { const n = v[k] ? v[k].split('\n').length : 0; $(`pg-${k}-count`).textContent = n ? `${n} line${n === 1 ? '' : 's'}` : ''; });
      $('pg-console').hidden = !val('opt-console');
      const doc = compose(v, true), plain = compose(v, false);
      if (!val('opt-auto') && !S.go && S.out) { status('Changed — press Run'); return Object.assign({}, S.out, { note: 'Changed — press Run', ok: false }); }
      if (doc !== lastDoc || S.go) { $('pg-console').innerHTML = ''; $('pg-frame').srcdoc = doc; lastDoc = doc; }
      const my = ++linkSeq; encode(v).then((h) => { if (my === linkSeq) { $('pg-link').value = `${location.origin}${location.pathname}#h=${h}`; S.out && (S.out.link = $('pg-link').value); } });
      const bytes = new TextEncoder().encode(plain).length;
      return { text: plain, ext: 'html', mime: 'text/html;charset=utf-8', v, badge: window.Toolity.formatBytes(bytes), note: 'Running', ok: true, copyMsg: 'HTML copied' };
    },
    onFiles: async (files, a) => { a.$('pg-html').value = await files[0].text(); a.$('pg-html').dispatchEvent(new Event('input', { bubbles: true })); },
    download: async (fmt, { S }) => {
      if (fmt === 'link') return { text: S.out.link || `${location.origin}${location.pathname}#h=${await encode(S.out.v)}`, name: 'playground-link.txt' };
      if (fmt === 'zip') {
        await new Promise((res, rej) => { if (window.JSZip) return res(); const s = document.createElement('script'); s.src = CDN + 'jszip@3.10.1/dist/jszip.min.js'; s.onload = res; s.onerror = rej; document.head.append(s); }).catch(() => { throw new Error("Couldn't load the ZIP library — check your connection."); });
        const v = S.out.v, z = new window.JSZip();
        z.file('index.html', compose(Object.assign({}, v, { css: '', js: '' }), false).replace('<style>\n\n</style>', '<link rel="stylesheet" href="style.css">').replace('<script>\n\n<\/script>', '<script src="script.js"><\/script>'));
        z.file('style.css', v.css + '\n'); z.file('script.js', v.js + '\n');
        return { blob: await z.generateAsync({ type: 'blob' }), name: 'playground.zip' };
      }
      return { text: S.out.text, name: 'playground.html', mime: 'text/html;charset=utf-8' };
    },
    onReset: ({ $ }) => { $('pg-frame').removeAttribute('srcdoc'); lastDoc = ''; $('pg-console').innerHTML = ''; $('pg-link').value = ''; ['html', 'css', 'js'].forEach((k) => { $(`pg-${k}-count`).textContent = ''; }); history.replaceState(null, '', location.pathname); }
  });
  /* console messages from the sandbox */
  window.addEventListener('message', (e) => {
    if (!e.data || !e.data.__pg || e.source !== api.$('pg-frame').contentWindow) return;
    const box = api.$('pg-console'); if (box.children.length > 500) box.firstElementChild.remove();
    box.insertAdjacentHTML('beforeend', `<div class="pg-log pg-${e.data.t}">${e.data.a.map((x) => `<span>${esc(x)}</span>`).join(' ')}</div>`); box.scrollTop = box.scrollHeight;
  });
  /* Tab inserts indentation; Shift+Tab outdents the line */
  api.card.querySelectorAll('.pg-code').forEach((ta) => ta.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return; e.preventDefault();
    const ind = api.val('opt-tab') === '\\t' ? '\t' : ' '.repeat(+api.val('opt-tab')), a = ta.selectionStart, z = ta.selectionEnd, v = ta.value;
    if (e.shiftKey) { const ls = v.lastIndexOf('\n', a - 1) + 1; if (v.startsWith(ind, ls)) { ta.value = v.slice(0, ls) + v.slice(ls + ind.length); ta.setSelectionRange(Math.max(ls, a - ind.length), Math.max(ls, z - ind.length)); } }
    else { ta.value = v.slice(0, a) + ind + v.slice(z); ta.setSelectionRange(a + ind.length, a + ind.length); }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  api.$('btn-link').addEventListener('click', () => { const l = api.$('pg-link').value; if (l) window.Toolity.copyText(l, 'Share link copied'); });
  window.ToolityPlayground = { encode, decode }; // exposed for the page test
  /* open a shared pen */
  const m = /[#&]h=([A-Za-z0-9_-]+)/.exec(location.hash);
  if (m) decode(m[1]).then(([h, c, j]) => { api.$('pg-html').value = h; api.$('pg-css').value = c; api.$('pg-js').value = j; api.S.go = true; api.run(); }).catch(() => api.showError('That share link is damaged — the code could not be decoded.'));
})();

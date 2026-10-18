/* Designed by Kapil Pidhwani: shared runtime for the Labs web-utility family (rule 46).
 * Pages come from gen_web_pages.js; a tool is T = {
 *   slug, live?(default true: re-run on every input, debounced), idle?, busyLabel?,
 *   ready(api)→true|string(reason), run(api)→{ text?, html?, blob?, mime?, ext?, url?, badge?, note?, ok? } | Promise,
 *   onInput(el, api)?, onPill(group, api)?, onReset(api)?, summary(api)?, filename(api)?, download(fmt, api)?→{ blob|text, name }
 * } — input → ready → run → present → copy/download/open → reset, shared errors handled once.
 * Also owns fetchPage(): direct CORS fetch first, then public read-only relays (see /privacy/). */
(function () {
  'use strict';
  const RELAYS = [
    { name: 'allorigins.win', url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, json: true },
    { name: 'codetabs.com', url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` }
  ];
  const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out')), ms))]);

  /* Accepts "example.com/x" or a full http(s) URL; returns a URL or null. */
  function normalizeUrl(s) {
    s = String(s || '').trim();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
    try { const u = new URL(s); return /^https?:$/.test(u.protocol) && /\.|^localhost$|^\[/.test(u.hostname) ? u : null; } catch (e) { return null; }
  }

  /* fetchPage(url) → { html, finalUrl, status, via }. Designed by Kapil Pidhwani: the ceiling is the relay —
   * allorigins follows redirects itself, so only the final URL/status is known, never the hop list. */
  async function fetchPage(url, ms = 12000) {
    try {
      const r = await timeout(fetch(url, { redirect: 'follow' }), ms);
      return { html: await r.text(), finalUrl: r.url || url, status: r.status, via: 'direct' };
    } catch (e) { /* CORS or network: fall through to a relay */ }
    for (const R of RELAYS) {
      try {
        const r = await timeout(fetch(R.url(url)), ms);
        if (!r.ok) continue;
        if (R.json) {
          const d = await r.json();
          if (!d || !d.contents) continue;
          return { html: d.contents, finalUrl: (d.status && d.status.url) || url, status: (d.status && d.status.http_code) || 200, via: R.name };
        }
        const html = await r.text();
        if (html) return { html, finalUrl: url, status: r.status, via: R.name };
      } catch (e) { /* next relay */ }
    }
    throw new Error("Couldn't reach that page — the site blocks fetching or the relays are busy. Paste its HTML instead.");
  }

  /* Parse <head> metadata from an HTML string. All values are strings; arrays for repeatable keys. */
  function parseMeta(html, baseUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const abs = (v) => { try { return v ? new URL(v, baseUrl || undefined).href : ''; } catch (e) { return v || ''; } };
    const metas = [...doc.querySelectorAll('meta')].map((m) => ({ key: m.getAttribute('property') || m.getAttribute('name') || m.getAttribute('http-equiv') || (m.hasAttribute('charset') ? 'charset' : ''), value: m.hasAttribute('charset') ? m.getAttribute('charset') : (m.getAttribute('content') || '') })).filter((m) => m.key);
    const links = [...doc.querySelectorAll('link[rel]')].map((l) => ({ rel: l.getAttribute('rel'), href: abs(l.getAttribute('href')), type: l.getAttribute('type') || '', sizes: l.getAttribute('sizes') || '', hreflang: l.getAttribute('hreflang') || '' }));
    const get = (k) => { const m = metas.find((x) => x.key.toLowerCase() === k); return m ? m.value.trim() : ''; };
    const link = (rel) => { const l = links.find((x) => x.rel.toLowerCase().split(/\s+/).includes(rel)); return l ? l.href : ''; };
    const html_ = doc.documentElement;
    return {
      title: (doc.querySelector('title') || {}).textContent ? doc.querySelector('title').textContent.trim() : '',
      description: get('description'), canonical: link('canonical'), robots: get('robots'), viewport: get('viewport'), charset: get('charset') || (doc.characterSet || ''), lang: html_ ? html_.getAttribute('lang') || '' : '',
      author: get('author'), themeColor: get('theme-color'), generator: get('generator'), keywords: get('keywords'),
      icon: link('icon') || link('shortcut') || abs('/favicon.ico'), appleIcon: link('apple-touch-icon'),
      og: Object.fromEntries(metas.filter((m) => /^og:/i.test(m.key)).map((m) => [m.key.toLowerCase(), m.value.trim()])),
      twitter: Object.fromEntries(metas.filter((m) => /^twitter:/i.test(m.key)).map((m) => [m.key.toLowerCase(), m.value.trim()])),
      metas, links, abs
    };
  }

  function mount(T) {
    const { copyText, downloadBlob, bindSegmented, bindShortcuts, bindDropdown, setBusy, toast } = window.Toolity;
    const $ = (id) => document.getElementById(id), card = $('tool-card');
    const S = { out: null, outUrl: '', go: false };
    const showError = (msg) => { const el = $('input-error'); if (!el) return; el.hidden = !msg; el.querySelector('span').textContent = msg || ''; };
    const status = (msg, ok) => { const sb = $('status-badge'); if (!sb) return; sb.textContent = msg; sb.classList.toggle('is-win', !!ok); };
    const val = (id) => { const el = $(id); return !el ? undefined : el.type === 'checkbox' ? el.checked : el.value; };
    const pill = (gid) => { const b = card.querySelector(`#${gid} .seg-pill.active`); return b ? b.dataset.value : undefined; };
    const api = { $, S, val, pill, card, showError, status, toast, normalizeUrl, fetchPage, parseMeta };
    const controls = () => [...card.querySelectorAll('.tool-settings-panel input, .tool-settings-panel select, .tool-settings-panel textarea, .pane-content input, .pane-content select, .pane-content textarea')].filter((el) => !el.readOnly && !el.closest('#output-content'));
    const paintRanges = () => controls().forEach((el) => { const b = $(`${el.id}-val`); if (b && el.type === 'range') b.textContent = el.value + (el.dataset.unit || ''); });
    const toBlob = (r) => r.blob || new Blob([r.text || ''], { type: r.mime || 'text/plain;charset=utf-8' });
    const setButtons = (on) => {
      const o = on && S.out;
      $('btn-copy').disabled = !(o && S.out.text);
      $('btn-download').disabled = !(o && (S.out.blob || S.out.text));
      if ($('btn-open')) $('btn-open').disabled = !(o && (S.out.url || S.out.blob || S.out.text));
    };
    function clear() {
      if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      S.out = null; S.outUrl = '';
      $('output-content').hidden = true; $('output-empty').hidden = false; $('output-badge').textContent = '—';
      setButtons(false);
    }
    function present(r) {
      if (!r) return clear();
      if (S.outUrl) URL.revokeObjectURL(S.outUrl);
      S.out = r; S.outUrl = '';
      $('output-empty').hidden = true; $('output-content').hidden = false;
      if (r.badge !== undefined) $('output-badge').textContent = r.badge;
      if (r.note !== undefined) status(r.note, r.ok !== false);
      setButtons(true);
    }
    let timer, seq = 0;
    async function run() {
      paintRanges();
      if (T.summary && $('settings-summary')) $('settings-summary').textContent = T.summary(api);
      const ready = T.ready ? T.ready(api) : true;
      showError('');
      if (ready !== true) { status(ready || T.idle || 'Waiting for input'); clear(); S.go = false; return; }
      const my = ++seq;
      let p;
      try {
        p = T.run(api);
        if (p && typeof p.then === 'function') { setBusy(card, true); if ($('btn-run')) $('btn-run').disabled = true; status(T.busyLabel || 'Working…'); p = await p; }
        if (my !== seq) return;
        present(p);
      } catch (e) {
        if (my !== seq) return;
        console.warn(e); showError(e.message || 'Something went wrong.'); clear(); status('Failed');
      } finally {
        if (my === seq) { setBusy(card, false); if ($('btn-run')) $('btn-run').disabled = false; S.go = false; }
      }
    }
    const schedule = () => { clearTimeout(timer); timer = setTimeout(run, T.debounce === undefined ? 120 : T.debounce); };
    const onChange = (e) => {
      if (!e.target.matches('input, select, textarea') || e.target.closest('#output-content')) return;
      if (T.onInput) T.onInput(e.target, api);
      schedule();
    };
    card.addEventListener('input', onChange);
    card.addEventListener('change', (e) => { if (e.target.matches('select, input[type=checkbox], input[type=radio]')) onChange(e); });
    card.querySelectorAll('.segmented-group').forEach((g) => bindSegmented(g, () => { if (T.onPill) T.onPill(g, api); run(); }));

    async function download(fmt) {
      if (!S.out) return;
      const r = T.download ? await T.download(fmt, api) : S.out;
      if (!r) return;
      downloadBlob(toBlob(r), r.name || `${T.filename ? T.filename(api) : T.slug}.${r.ext || 'txt'}`);
    }
    const dd = $('btn-download').closest('.dropdown-menu-wrapper');
    if (dd) { bindDropdown(dd); dd.querySelectorAll('.dropdown-item').forEach((b) => b.addEventListener('click', () => download(b.dataset.format))); }
    else $('btn-download').addEventListener('click', () => download());
    $('btn-copy').addEventListener('click', () => S.out && S.out.text && copyText(S.out.text, S.out.copyMsg || 'Copied to clipboard'));
    if ($('btn-open')) $('btn-open').addEventListener('click', () => {
      if (!S.out) return;
      if (S.out.url) return window.open(S.out.url, '_blank', 'noopener,noreferrer');
      if (!S.outUrl) S.outUrl = URL.createObjectURL(toBlob(S.out));
      window.open(S.outUrl, '_blank', 'noopener');
    });
    const press = () => { clearTimeout(timer); S.go = true; run(); };
    if ($('btn-run')) $('btn-run').addEventListener('click', press);

    function reset() {
      seq++; clearTimeout(timer);
      controls().forEach((el) => { if (el.type === 'checkbox' || el.type === 'radio') el.checked = el.defaultChecked; else if (el.tagName === 'SELECT') el.value = ([...el.options].find((o) => o.defaultSelected) || el.options[0]).value; else el.value = el.defaultValue; });
      card.querySelectorAll('.segmented-group').forEach((g) => g.querySelectorAll('.seg-pill').forEach((b, i) => b.classList.toggle('active', b.dataset.default !== undefined ? true : i === 0 && !g.querySelector('[data-default]'))));
      if (T.onReset) T.onReset(api);
      clear(); showError(''); setBusy(card, false); run(); toast('Reset');
    }
    $('btn-reset').addEventListener('click', reset);
    bindShortcuts({ primary: press, reset });

    /* Designed by Kapil Pidhwani: text-file input for tools generated with `file: {accept}` — Open file or drop on the input
     * pane; the text lands in [data-file-target] and the normal input pipeline runs. Ceiling: whole file read into memory
     * (50 MB cap) — fine for CSV/logs a browser tab can render anyway. */
    const fileIn = $('file-input'), fileName = $('file-name');
    if (fileIn) {
      const target = card.querySelector('[data-file-target]'), pane = fileIn.closest('.tool-pane'), idleName = fileName.textContent;
      const load = (files) => {
        files = [...(files || [])];
        if (!files.length) return;
        const big = files.find((f) => f.size > 50e6);
        if (big) return showError(`${big.name} is larger than 50 MB — split it first.`);
        if (T.onFiles) { fileName.textContent = files.length === 1 ? `${files[0].name} · ${window.Toolity.formatBytes(files[0].size)}` : `${files.length} files`; return T.onFiles(files, api); }
        const f = files[0];
        f.text().then((txt) => {
          target.value = txt; fileName.textContent = `${f.name} · ${window.Toolity.formatBytes(f.size)}`;
          if (T.onFile) T.onFile(f, api);
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }).catch(() => showError('Could not read that file.'));
      };
      $('btn-file').addEventListener('click', () => fileIn.click());
      fileIn.addEventListener('change', () => { load(fileIn.files); fileIn.value = ''; });
      const isFile = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
      ['dragenter', 'dragover'].forEach((ev) => pane.addEventListener(ev, (e) => { if (isFile(e)) { e.preventDefault(); pane.classList.add('dragover'); } }));
      pane.addEventListener('dragleave', (e) => { if (!pane.contains(e.relatedTarget)) pane.classList.remove('dragover'); });
      pane.addEventListener('drop', (e) => { if (!isFile(e)) return; e.preventDefault(); pane.classList.remove('dragover'); load(fileIn.multiple ? e.dataTransfer.files : [e.dataTransfer.files[0]]); });
      $('btn-reset').addEventListener('click', () => { fileName.textContent = idleName; });
    }
    run();
    window.ToolityWebTool = Object.assign(api, { run, reset, clear, present, T });
    return api;
  }

  /* Fetch-or-paste source shared by the page-inspection tools. #html-input (paste) wins over #url-input (fetch).
   * A fetch happens only after the primary button (S.go) and is cached per URL so pills re-render without refetching. */
  const pageSource = {
    ready(api, action) {
      if ((api.val('html-input') || '').trim()) return true;
      const raw = (api.val('url-input') || '').trim(), u = normalizeUrl(raw);
      if (!raw) return 'Enter a URL or paste HTML';
      if (!u) return 'That doesn’t look like a web address';
      return api.S.go || (api.S.page && api.S.page.key === u.href) ? true : `Press ${action}`;
    },
    async load(api) {
      const html = (api.val('html-input') || '').trim(), u = normalizeUrl(api.val('url-input'));
      if (html) return { html, baseUrl: u ? u.href : '', via: 'pasted', finalUrl: u ? u.href : '', status: 0 };
      if (api.S.page && api.S.page.key === u.href) return api.S.page;
      const r = await fetchPage(u.href);
      if (!/<\w+[\s>]/.test(r.html.slice(0, 5000))) throw new Error('That URL did not return HTML.');
      return (api.S.page = Object.assign({ key: u.href, baseUrl: r.finalUrl }, r));
    }
  };

  window.ToolityWeb = { mount, normalizeUrl, fetchPage, parseMeta, pageSource, RELAYS };
})();

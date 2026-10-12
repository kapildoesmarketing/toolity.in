/* Designed by Kapil Pidhwani: URL Encoder Decoder — encodeURIComponent / encodeURI / decode, line by line. */
(function () {
  'use strict';
  const { mount, normalizeUrl } = window.ToolityWeb;
  const strict = (s) => s.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

  function encode(s, mode, o) {
    let r = mode === 'uri' ? encodeURI(s) : encodeURIComponent(s);
    if (o.strict) r = strict(r);
    if (o.plus) r = r.replace(/%20/g, '+');
    return r;
  }
  /* Decodes what it can; a malformed %-sequence is kept verbatim and reported instead of failing the whole text. */
  function decode(s, o, bad) {
    if (o.plus) s = s.replace(/\+/g, ' ');
    return s.replace(/(?:%[0-9a-f]{2})+|%[^]{0,2}/gi, (m) => { try { return decodeURIComponent(m); } catch (e) { bad.push(m); return m; } });
  }

  mount({
    slug: 'url-encoder-decoder', idle: 'Type or paste to begin',
    ready: ({ val }) => (val('text-input') ? true : 'Type or paste to begin'),
    summary: ({ val }) => [val('opt-lines') ? 'line by line' : 'whole text', val('opt-plus') ? '+ for spaces' : '%20 for spaces', val('opt-strict') && 'strict'].filter(Boolean).join(' · '),
    run: ({ val, pill, $ }) => {
      const mode = pill('seg-mode'), o = { plus: val('opt-plus'), strict: val('opt-strict') }, src = val('text-input'), bad = [];
      const fn = (s) => (mode === 'decode' ? decode(s, o, bad) : encode(s, mode, o));
      const out = val('opt-lines') ? src.split(/\r?\n/).map(fn).join('\n') : fn(src);
      $('output-text').textContent = out;
      $('input-count').textContent = `${src.length} chars`;
      const u = normalizeUrl(out.split(/\r?\n/)[0]);
      const label = mode === 'decode' ? 'Decoded' : mode === 'uri' ? 'URL encoded' : 'Value encoded';
      return { text: out, ext: 'txt', url: u ? u.href : '', badge: `${out.length} chars`, note: bad.length ? `${label} · ${bad.length} malformed sequence${bad.length === 1 ? '' : 's'} kept as-is` : label, ok: !bad.length };
    },
    onReset: ({ $ }) => { $('input-count').textContent = ''; }
  });
})();

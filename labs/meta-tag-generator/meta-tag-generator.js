/* Designed by Kapil Pidhwani: Meta Tag Generator — builds the <head> block from the fields; empty fields produce no tag.
 * Title/description meters reuse the SERP tool's measure approach (12 lines duplicated on purpose; limits are desktop).
 * Ceiling: one language / one canonical; hreflang sets and JSON-LD are out of scope (Schema Markup Generator is a
 * separate backlog item). */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const LIM = { title: 600, desc: 920 };
  const ctx = document.createElement('canvas').getContext('2d');
  const width = (s, px) => { ctx.font = `${px}px Arial, Helvetica, sans-serif`; return ctx.measureText(s).width; };
  const meter = ($, id, s, px, max) => { const w = width(s, px), pct = Math.min(100, (w / max) * 100); $(id).style.width = pct + '%'; $(id).className = w > max ? 'is-over' : w > max * 0.9 ? 'is-near' : ''; $(id + '-val').textContent = `${Math.round(w)} / ${max} px`; return w; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const absUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };

  function build(v) {
    const L = [], meta = (n, c) => c && L.push(`<meta name="${n}" content="${esc(c)}">`), prop = (p, c) => c && L.push(`<meta property="${p}" content="${esc(c)}">`);
    const title = v.title.trim(), desc = v.desc.trim().replace(/\s+/g, ' '), canonical = absUrl(v.canonical.trim()), image = absUrl(v.image.trim());
    if (v.boiler) { L.push('<meta charset="UTF-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">'); }
    if (title) L.push(`<title>${esc(title)}</title>`);
    meta('description', desc);
    if (canonical) L.push(`<link rel="canonical" href="${esc(canonical)}">`);
    const robots = [v.index ? 'index' : 'noindex', v.follow ? 'follow' : 'nofollow']; if (v.maximage) robots.push('max-image-preview:large'); if (v.noarchive) robots.push('noarchive');
    if (!(v.index && v.follow && !v.maximage && !v.noarchive)) meta('robots', robots.join(', '));
    meta('author', v.author.trim()); meta('theme-color', /^#?[0-9a-f]{3,8}$/i.test(v.theme.trim()) ? (v.theme.trim().startsWith('#') ? '' : '#') + v.theme.trim() : '');
    if (v.favicons) L.push('<link rel="icon" href="/favicon.ico" sizes="any">', '<link rel="icon" href="/icon.svg" type="image/svg+xml">', '<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
    if (title || desc || image) {
      L.push('', '<!-- Open Graph -->');
      prop('og:type', v.ogtype); prop('og:title', title); prop('og:description', desc); if (v.ogurl) prop('og:url', canonical); prop('og:site_name', v.site.trim());
      if (image) { prop('og:image', image); prop('og:image:alt', v.imagealt.trim()); }
      if (v.locale) prop('og:locale', v.lang);
      if (v.twcard) {
        L.push('', '<!-- Twitter / X -->');
        meta('twitter:card', v.twcard); meta('twitter:site', v.twsite.trim()); meta('twitter:creator', v.twcreator.trim()); meta('twitter:title', title); meta('twitter:description', desc); if (image) meta('twitter:image', image);
      }
    }
    return L.join('\n').replace(/^\n+/, '') + '\n';
  }

  mount({
    slug: 'meta-tag-generator', debounce: 100,
    ready: ({ val }) => (val('f-title').trim() || val('f-desc').trim() ? true : 'Start with a title'),
    summary: ({ val }) => [val('opt-boiler') ? 'charset + viewport' : 'no boilerplate', val('opt-ogurl') ? 'og:url = canonical' : 'no og:url', val('opt-lang').split('_')[0]].join(' · '),
    run: ({ $, val }) => {
      const v = { title: val('f-title'), desc: val('f-desc'), canonical: val('f-canonical'), site: val('f-site'), author: val('f-author'), ogtype: val('f-ogtype'), twcard: val('f-twcard'), image: val('f-image'), imagealt: val('f-imagealt'), twsite: val('f-twsite'), twcreator: val('f-twcreator'), index: val('f-index'), follow: val('f-follow'), maximage: val('f-maximage'), noarchive: val('f-noarchive'), boiler: val('opt-boiler'), ogurl: val('opt-ogurl') && absUrl(val('f-canonical').trim()), locale: val('opt-locale'), favicons: val('opt-favicons'), lang: val('opt-lang'), theme: val('opt-theme') };
      const code = build(v), title = v.title.trim(), desc = v.desc.trim();
      $('output-text').textContent = code;
      const tw = meter($, 'm-title', title, 20, LIM.title), dw = meter($, 'm-desc', desc, 14, LIM.desc);
      $('f-title-count').textContent = `${title.length} chars · ${Math.round(tw)} px`; $('f-desc-count').textContent = `${desc.length} chars · ${Math.round(dw)} px`;
      const issues = [];
      if (!title) issues.push(['fail', 'No title']); else if (tw > LIM.title) issues.push(['warn', 'Title wider than 600 px — Google will truncate it']);
      if (!desc) issues.push(['warn', 'No description']); else if (dw > LIM.desc) issues.push(['warn', 'Description wider than 920 px — truncated on desktop']);
      if (v.canonical.trim() && !absUrl(v.canonical.trim())) issues.push(['fail', 'Canonical must be an absolute http(s) URL']);
      if (v.image.trim() && !absUrl(v.image.trim())) issues.push(['fail', 'Share image must be an absolute URL']);
      if (absUrl(v.image.trim()) && !v.imagealt.trim()) issues.push(['warn', 'Add alt text for the share image']);
      if (!absUrl(v.image.trim()) && v.twcard === 'summary_large_image') issues.push(['warn', 'Large-image card without an image — add one or switch to Summary']);
      if (!v.index) issues.push(['warn', 'noindex — this page will not appear in search results']);
      if (!issues.length) issues.push(['pass', 'All key tags present']);
      $('output-issues').innerHTML = issues.map(([k, s]) => `<span class="web-tag ${k}">${esc(s)}</span>`).join('');
      const h = new URLSearchParams(); if (title) h.set('t', title); if (desc) h.set('d', desc); if (absUrl(v.canonical.trim())) h.set('u', absUrl(v.canonical.trim()));
      $('serp-link').href = '/labs/serp-snippet-preview/#' + h.toString();
      const n = (code.match(/<(meta|link|title)\b/g) || []).length;
      return { text: code, ext: 'html', mime: 'text/html;charset=utf-8', badge: `${n} tag${n === 1 ? '' : 's'}`, note: issues.some((i) => i[0] === 'fail') ? 'Fix the issues' : 'Ready to paste', ok: !issues.some((i) => i[0] === 'fail'), copyMsg: 'Head block copied' };
    },
    download: (fmt, { S }) => ({ text: S.out.text, name: 'head.html', mime: 'text/html;charset=utf-8' }),
    onReset: ({ $ }) => { ['f-title-count', 'f-desc-count', 'output-issues', 'output-text'].forEach((id) => { $(id).textContent = ''; }); $('serp-link').href = '/labs/serp-snippet-preview/'; }
  });
})();

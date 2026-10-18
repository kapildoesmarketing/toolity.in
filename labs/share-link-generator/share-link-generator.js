/* Designed by Kapil Pidhwani: Share & Message Link Generator — one URL + message → each app's documented share-intent URL.
 * Pure string building (encodeURIComponent per parameter); no network. Apps that accept only a URL (Facebook, LinkedIn)
 * are skipped when no link is given rather than producing a broken link. */
(function () {
  'use strict';
  const { mount, normalizeUrl } = window.ToolityWeb;
  const e = encodeURIComponent;
  const join = (...parts) => parts.filter(Boolean).join(' ');
  /* [id, label, needsUrl, build(o)] — o = { url, text, title, tags, phone, sms } */
  const APPS = [
    ['whatsapp', 'WhatsApp', false, (o) => `https://wa.me/?text=${e(join(o.text, o.url))}`],
    ['telegram', 'Telegram', true, (o) => `https://t.me/share/url?url=${e(o.url)}${o.text ? `&text=${e(o.text)}` : ''}`],
    ['x', 'X (Twitter)', false, (o) => `https://twitter.com/intent/tweet?${[o.text && `text=${e(o.text)}`, o.url && `url=${e(o.url)}`, o.tags && `hashtags=${e(o.tags)}`].filter(Boolean).join('&')}`],
    ['facebook', 'Facebook', true, (o) => `https://www.facebook.com/sharer/sharer.php?u=${e(o.url)}`],
    ['linkedin', 'LinkedIn', true, (o) => `https://www.linkedin.com/sharing/share-offsite/?url=${e(o.url)}`],
    ['reddit', 'Reddit', true, (o) => `https://www.reddit.com/submit?url=${e(o.url)}${o.title || o.text ? `&title=${e(o.title || o.text)}` : ''}`],
    ['pinterest', 'Pinterest', true, (o) => `https://pinterest.com/pin/create/button/?url=${e(o.url)}${o.title || o.text ? `&description=${e(o.title || o.text)}` : ''}`],
    ['email', 'Email', false, (o) => `mailto:?${[o.title && `subject=${e(o.title)}`, `body=${e([o.text, o.url].filter(Boolean).join('\n\n'))}`].filter(Boolean).join('&')}`],
    ['sms', 'SMS', false, (o) => `sms:${o.phone}${{ universal: '?&', ios: '&', android: '?' }[o.sms] || '?&'}body=${e(join(o.text, o.url))}`]
  ];
  const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function row(label, link) {
    const g = document.createElement('div'); g.className = 'web-group';
    g.innerHTML = '<div class="web-group-head"><span></span><div class="toolbar-group"><button type="button" class="btn-toolbar-sm"><iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon><span>Copy</span></button><a class="btn-toolbar-sm" rel="noopener noreferrer"><iconify-icon icon="lucide:external-link" width="14" height="14"></iconify-icon><span>Open</span></a></div></div><pre class="web-code"></pre>';
    g.querySelector('.web-group-head > span').textContent = label;
    g.querySelector('pre').textContent = link;
    const b = g.querySelector('button'); b.setAttribute('aria-label', `Copy ${label} link`);
    b.addEventListener('click', () => window.Toolity.copyText(link, `${label} link copied`));
    const a = g.querySelector('a'); a.href = link; a.setAttribute('aria-label', `Open ${label} share link`);
    if (/^https:/.test(link)) a.target = '_blank';
    return g;
  }

  mount({
    slug: 'share-link-generator', idle: 'Add a link or a message to begin',
    ready: ({ val }) => {
      const u = val('url-input').trim();
      if (!u && !val('text-input').trim()) return 'Add a link or a message to begin';
      if (u && !normalizeUrl(u)) return 'That link doesn’t look like a web address';
      return APPS.some(([id]) => val('opt-' + id)) ? true : 'Tick at least one app in Settings';
    },
    summary: ({ val }) => { const n = APPS.filter(([id]) => val('opt-' + id)).length; return `${n === APPS.length ? 'All 9' : n} app${n === 1 ? '' : 's'} · ${{ universal: 'universal', ios: 'iPhone', android: 'Android' }[val('opt-smsstyle')]} SMS`; },
    run: ({ val, $ }) => {
      const raw = val('url-input').trim(), u = raw ? normalizeUrl(raw) : null;
      const o = {
        url: u ? u.href : '', text: val('text-input').trim(), title: val('title-input').trim(),
        tags: val('tags-input').split(/[\s,]+/).map((t) => t.replace(/^#/, '')).filter(Boolean).join(','),
        phone: val('phone-input').replace(/[^\d+]/g, ''), sms: val('opt-smsstyle')
      };
      $('input-count').textContent = o.text ? `${o.text.length} chars` : '';
      const picked = APPS.filter(([id]) => val('opt-' + id));
      const links = picked.filter(([, , needsUrl]) => o.url || !needsUrl).map(([id, label, , build]) => ({ id, label, link: build(o) }));
      const skipped = picked.length - links.length;
      $('output-rows').replaceChildren(...links.map((l) => row(l.label, l.link)));
      const html = `<!-- Share buttons — plain links, no scripts. Generated with toolity.in -->\n<div class="share-buttons">\n${links.map((l) => `  <a href="${escHtml(l.link)}"${/^https:/.test(l.link) ? ' target="_blank"' : ''} rel="noopener noreferrer">${l.id === 'email' || l.id === 'sms' ? `Send by ${l.label}` : `Share on ${l.label}`}</a>`).join('\n')}\n</div>\n`;
      return {
        text: links.map((l) => `${l.label}: ${l.link}`).join('\n'), html, copyMsg: `Copied ${links.length} links`,
        blob: new Blob([`<!doctype html><meta charset="utf-8"><title>Share buttons preview</title><body style="font-family:system-ui;padding:2rem;line-height:2">${html.replace('<div class="share-buttons">', '<div class="share-buttons" style="display:flex;flex-direction:column">')}</body>`], { type: 'text/html' }),
        badge: `${links.length} link${links.length === 1 ? '' : 's'}`,
        note: skipped ? `${links.length} links · ${skipped} need a link to share` : `${links.length} share links ready`
      };
    },
    download: (fmt, { S }) => (fmt === 'html' ? { text: S.out.html, ext: 'html', mime: 'text/html;charset=utf-8' } : { text: S.out.text, ext: 'txt' }),
    filename: () => 'share-links',
    onReset: ({ $ }) => { $('input-count').textContent = ''; $('output-rows').replaceChildren(); }
  });
})();

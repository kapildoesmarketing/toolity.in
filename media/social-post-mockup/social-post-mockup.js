/* Social Post Mockups — Toolity.in. One form → six templates (X · Instagram post · Instagram story · LinkedIn · Facebook · Threads),
 * light/dark, real brand marks from the Iconify `logos` set (inlined, exportable). Live preview + PNG via /scripts/mockup-common.js. */
(function () {
  'use strict';
  const M = window.ToolityMockup, $ = (id) => document.getElementById(id);
  const LOGO = { x: 'logos:x', instagram: 'logos:instagram-icon', story: 'logos:instagram-icon', linkedin: 'logos:linkedin-icon', facebook: 'logos:facebook', threads: 'logos:threads' };
  const v = (id) => $(id).value, on = (id) => $(id).checked, n = (id) => Number(v(id)) || 0;
  const ico = (d, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const I = { // lucide paths (MIT) — reply / repost / heart / share / bookmark / views / comment / send / more
    reply: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', repost: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
    heart: 'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z', share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
    views: 'M12 20V10M18 20V4M6 20v-4', comment: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z', more: 'M12 12h.01M19 12h.01M5 12h.01', bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z', globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z', thumb: 'M7 10v12M15 5.9L14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7a2 2 0 0 1-1.9 1.4H7V10l4-8a3 3 0 0 1 3 3z'
  };
  const heart = (liked, size = 20) => (liked ? `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="#f91880" d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>` : ico(I.heart, size));
  const img = (S, cls) => (S.images.post ? `<img class="${cls}" src="${S.images.post.url}" alt=""/>` : '');
  const text = (S, cls = 'sp-text') => (S.text ? `<div class="${cls}">${M.linkify(S.text)}</div>` : `<div class="${cls} mk-ph">Your post text…</div>`);
  const nm = (S) => S.name || 'Your Name', hd = (S) => (S.handle || '@handle').replace(/^(?!@)/, S.platform === 'linkedin' ? '' : '@').replace(/^@@/, '@');
  const MONO = { x: 1, threads: 1 }; // black marks → white on dark
  const logo = (S, ic, size) => { let svg = ic[LOGO[S.platform]]; if (!svg) return ''; if (S.theme === 'dark' && MONO[S.platform]) svg = svg.replace('<svg ', '<svg fill="#fff" ').replace(/#000000|#000\b|\bblack\b/gi, '#fff'); return `<span class="sp-logo" style="width:${size}px;height:${size}px">${svg}</span>`; };

  const T = {
    x: (S, ic) => `
      <div class="sp-head"><div class="sp-who">${M.avatar(S, 'avatar', nm(S), 44)}<div class="sp-names"><b>${M.esc(nm(S))}${S.verified ? M.check(true, '#1d9bf0') : ''}</b><span>${M.esc(hd(S))}</span></div></div>${logo(S, ic, 24)}</div>
      ${text(S)}${img(S, 'sp-img')}
      <div class="sp-time">${M.esc(S.time || '9:41 AM · Oct 20, 2026')}${S.views ? ` · <b>${M.fmtNum(S.views)}</b> Views` : ''}</div>
      ${S.actions ? `<div class="sp-actions sp-x"><span>${ico(I.reply)}${S.comments ? M.fmtNum(S.comments) : ''}</span><span>${ico(I.repost)}${S.reposts ? M.fmtNum(S.reposts) : ''}</span><span class="${S.liked ? 'is-liked' : ''}">${heart(S.liked)}${S.likes ? M.fmtNum(S.likes) : ''}</span><span>${ico(I.views)}${S.views ? M.fmtNum(S.views) : ''}</span><span>${ico(I.bookmark)}</span><span>${ico(I.share)}</span></div>` : ''}`,
    instagram: (S, ic) => `
      <div class="sp-head sp-ig-head"><div class="sp-who">${M.avatar(S, 'avatar', nm(S), 32, 'sp-ig-ring')}<div class="sp-names"><b>${M.esc((S.handle || nm(S)).replace(/^@/, ''))}${S.verified ? M.check(true, '#0095f6') : ''}</b>${S.sub ? `<span>${M.esc(S.sub)}</span>` : ''}</div></div>${ico(I.more, 20)}</div>
      ${S.images.post ? `<img class="sp-ig-img" src="${S.images.post.url}" alt=""/>` : `<div class="sp-ig-img sp-ig-empty">Upload an image</div>`}
      ${S.actions ? `<div class="sp-actions sp-ig"><span class="${S.liked ? 'is-liked' : ''}">${heart(S.liked, 24)}</span><span>${ico(I.comment, 24)}</span><span>${ico(I.send, 24)}</span><span class="sp-right">${ico(I.bookmark, 24)}</span></div>` : ''}
      <div class="sp-ig-likes"><b>${M.fmtNum(S.likes)} likes</b></div>
      <div class="sp-ig-cap"><b>${M.esc((S.handle || nm(S)).replace(/^@/, ''))}</b> ${S.text ? M.linkify(S.text) : '<span class="mk-ph">Caption…</span>'}</div>
      ${S.comments ? `<div class="sp-ig-more">View all ${M.fmtNum(S.comments)} comments</div>` : ''}<div class="sp-ig-time">${M.esc(S.time || '2 hours ago')}</div>`,
    story: (S, ic) => `
      <div class="sp-story">${S.images.post ? `<img class="sp-story-bg" src="${S.images.post.url}" alt=""/>` : ''}<div class="sp-story-top"><div class="sp-story-bar"><i></i></div><div class="sp-who">${M.avatar(S, 'avatar', nm(S), 32)}<b>${M.esc((S.handle || nm(S)).replace(/^@/, ''))}</b><span>${M.esc(S.time || '2h')}</span><span class="sp-right">${ico(I.more, 20)}</span></div></div>
      ${S.text ? `<div class="sp-story-text"><span>${M.linkify(S.text)}</span></div>` : ''}
      <div class="sp-story-bottom"><span class="sp-story-input">Send message</span>${heart(false, 26)}${ico(I.send, 26)}</div></div>`,
    linkedin: (S, ic) => `
      <div class="sp-head"><div class="sp-who">${M.avatar(S, 'avatar', nm(S), 48, 'sp-li-av')}<div class="sp-names"><b>${M.esc(nm(S))}${S.verified ? M.check(false, '#0a66c2') : ''} <small>· 1st</small></b><span>${M.esc(S.handle || 'Your headline')}</span><span>${M.esc(S.time || '2h')} · ${ico(I.globe, 12)}</span></div></div>${logo(S, ic, 22)}</div>
      ${text(S)}${img(S, 'sp-img sp-li-img')}
      <div class="sp-li-stats"><span class="sp-li-reacts"><i class="r1">👍</i><i class="r2">❤️</i><i class="r3">💡</i> ${M.fmtNum(S.likes)}</span><span>${S.comments ? `${M.fmtNum(S.comments)} comments` : ''}${S.comments && S.reposts ? ' · ' : ''}${S.reposts ? `${M.fmtNum(S.reposts)} reposts` : ''}</span></div>
      ${S.actions ? `<div class="sp-actions sp-li"><span>${ico(I.thumb)}Like</span><span>${ico(I.comment)}Comment</span><span>${ico(I.repost)}Repost</span><span>${ico(I.send)}Send</span></div>` : ''}`,
    facebook: (S, ic) => `
      <div class="sp-head"><div class="sp-who">${M.avatar(S, 'avatar', nm(S), 40)}<div class="sp-names"><b>${M.esc(nm(S))}${S.verified ? M.check(true, '#1877f2') : ''}</b><span>${M.esc(S.time || '2h')} · ${ico(I.globe, 12)}</span></div></div>${logo(S, ic, 22)}</div>
      ${text(S)}${img(S, 'sp-img sp-fb-img')}
      <div class="sp-fb-stats"><span><i class="sp-fb-like">👍</i><i class="sp-fb-love">❤️</i> ${M.fmtNum(S.likes)}</span><span>${S.comments ? `${M.fmtNum(S.comments)} comments` : ''}${S.comments && S.reposts ? ' · ' : ''}${S.reposts ? `${M.fmtNum(S.reposts)} shares` : ''}</span></div>
      ${S.actions ? `<div class="sp-actions sp-fb"><span class="${S.liked ? 'is-liked' : ''}">${ico(I.thumb)}Like</span><span>${ico(I.comment)}Comment</span><span>${ico(I.share)}Share</span></div>` : ''}`,
    threads: (S, ic) => `
      <div class="sp-th"><div class="sp-th-col">${M.avatar(S, 'avatar', nm(S), 36)}<i class="sp-th-line"></i></div><div class="sp-th-body">
      <div class="sp-head"><div class="sp-names sp-th-names"><b>${M.esc((S.handle || nm(S)).replace(/^@/, ''))}${S.verified ? M.check(true, '#0095f6') : ''}</b><span>${M.esc(S.time || '2h')}</span></div>${logo(S, ic, 20)}</div>
      ${text(S)}${img(S, 'sp-img')}
      ${S.actions ? `<div class="sp-actions sp-th-actions"><span class="${S.liked ? 'is-liked' : ''}">${heart(S.liked, 22)}</span><span>${ico(I.comment, 22)}</span><span>${ico(I.repost, 22)}</span><span>${ico(I.send, 22)}</span></div>` : ''}
      <div class="sp-th-stats">${S.comments ? `${M.fmtNum(S.comments)} replies` : ''}${S.comments && S.likes ? ' · ' : ''}${S.likes ? `${M.fmtNum(S.likes)} likes` : ''}</div></div></div>`
  };

  function state(S) {
    return { images: S.images, platform: v('opt-platform'), theme: v('opt-theme'), name: v('au-name').trim(), handle: v('au-handle').trim(), verified: on('au-verified'), time: v('po-time').trim(), text: v('po-text'), sub: v('po-sub').trim(),
      likes: n('m-likes'), comments: n('m-comments'), reposts: n('m-reposts'), views: n('m-views'), width: Number(v('opt-width')), frame: on('opt-frame'), actions: on('opt-actions'), liked: on('opt-liked'), credit: on('opt-credit') };
  }
  const render = (S, ic) => `<div class="mk mk-post sp-${S.platform} ${S.theme}${S.frame ? ' framed' : ''}">${T[S.platform](S, ic)}${M.credit(S.credit)}</div>`;
  const showSub = () => { const p = v('opt-platform'); $('po-sub').closest('.mk-field').hidden = !/instagram|story/.test(p); $('m-views').closest('.mk-field').hidden = p !== 'x'; $('opt-liked').closest('.control-item').hidden = p === 'story' || p === 'linkedin'; };
  showSub();
  M.mount({
    actionLabel: 'Export PNG', suffix: 'post', icons: Object.values(LOGO),
    width: (S) => (S.platform === 'story' ? 360 : S.width),
    state, render,
    summary: (S) => `${S.frame ? 'Card' : 'Flat'} · ${v('opt-scale')}×`,
    onReset: showSub,
    bind: (a) => { $('opt-platform').addEventListener('change', showSub); window.__sp = { api: a, state }; }
  });
})();

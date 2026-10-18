/* Designed by Kapil Pidhwani: YouTube Link & Embed Generator — parse any YouTube URL shape to the 11-char video ID, then
 * build share / watch / embed URLs from documented player parameters. Preview UX: the thumbnail (i.ytimg.com) shows as soon
 * as an ID is found so the user knows it's the right video; the real iframe loads only on click, with the current settings.
 * Ceiling: no video title lookup (that needs the YouTube API) — users can type one for the iframe title / Markdown alt. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const ID = /^[\w-]{11}$/;

  function parseVideo(s) {
    s = s.trim();
    if (ID.test(s)) return { id: s };
    let u; try { u = new URL(/^[a-z]+:\/\//i.test(s) ? s : 'https://' + s); } catch (e) { return null; }
    const h = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
    let id = '';
    if (h === 'youtu.be') id = u.pathname.split('/')[1] || '';
    else if (/^youtube(-nocookie)?\.com$/.test(h)) id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|live|embed|v|e)\/([\w-]{11})/) || [])[1] || '';
    return ID.test(id) ? { id, t: u.searchParams.get('t') || u.searchParams.get('start') || (u.hash.match(/t=(\w+)/) || [])[1] || '' } : null;
  }
  /* "83", "83s", "1:23", "1:02:03", "1m23s", "1h2m" → seconds; '' → null; anything else → NaN */
  function toSeconds(s) {
    s = String(s || '').trim().toLowerCase();
    if (!s) return null;
    if (/^\d+s?$/.test(s)) return parseInt(s, 10);
    let m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    if (m) return +m[3] < 60 && (!m[1] || +m[2] < 60) ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) : NaN;
    m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    return m && (m[1] || m[2] || m[3]) ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : NaN;
  }
  const clock = (n) => { const h = Math.floor(n / 3600), m = Math.floor(n / 60) % 60, s = n % 60; return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}`; };
  const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  function read(val) {
    const v = parseVideo(val('url-input'));
    if (!v) return { err: 'That isn’t a YouTube link or video ID' };
    const start = toSeconds(val('start-input') || v.t), end = toSeconds(val('end-input'));
    if (Number.isNaN(start)) return { err: 'Start time: use 1:23, 83 or 1m23s' };
    if (Number.isNaN(end)) return { err: 'End time: use 2:10, 130 or 2m10s' };
    if (end !== null && end <= (start || 0)) return { err: 'End time must be after the start time' };
    const o = { id: v.id, start, end, nocookie: val('opt-nocookie'), responsive: val('opt-responsive'), autoplay: val('opt-autoplay'), mute: val('opt-mute'), loop: val('opt-loop'), nocontrols: val('opt-nocontrols'), cc: val('opt-cc'), title: val('opt-title').trim() || 'YouTube video player' };
    const p = new URLSearchParams();
    if (o.start) p.set('start', o.start);
    if (o.end !== null) p.set('end', o.end);
    if (o.autoplay) p.set('autoplay', 1);
    if (o.mute) p.set('mute', 1);
    if (o.loop) { p.set('loop', 1); p.set('playlist', o.id); }
    if (o.nocontrols) p.set('controls', 0);
    if (o.cc) p.set('cc_load_policy', 1);
    o.embed = `https://www.${o.nocookie ? 'youtube-nocookie' : 'youtube'}.com/embed/${o.id}${p.toString() ? '?' + p : ''}`;
    o.short = `https://youtu.be/${o.id}${o.start ? `?t=${o.start}` : ''}`;
    o.watch = `https://www.youtube.com/watch?v=${o.id}${o.start ? `&t=${o.start}s` : ''}`;
    const allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    o.iframe = o.responsive
      ? `<iframe src="${escAttr(o.embed)}" title="${escAttr(o.title)}" style="width:100%;height:auto;aspect-ratio:16/9;border:0" allow="${allow}" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
      : `<iframe width="560" height="315" src="${escAttr(o.embed)}" title="${escAttr(o.title)}" frameborder="0" allow="${allow}" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    o.md = `[![${o.title.replace(/[[\]]/g, '')}](https://i.ytimg.com/vi/${o.id}/hqdefault.jpg)](${o.watch})`;
    return o;
  }

  function row(label, value) {
    const g = document.createElement('div'); g.className = 'web-group';
    g.innerHTML = '<div class="web-group-head"><span></span><button type="button" class="btn-toolbar-sm"><iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon><span>Copy</span></button></div><pre class="web-code"></pre>';
    g.querySelector('span').textContent = label; g.querySelector('pre').textContent = value;
    const b = g.querySelector('button'); b.setAttribute('aria-label', `Copy ${label.toLowerCase()}`);
    b.addEventListener('click', () => window.Toolity.copyText(value, `${label} copied`));
    return g;
  }

  let current = null; // last good result, used by the preview click
  const thumb = () => document.getElementById('btn-preview');
  function resetPreview(id) {
    const box = document.getElementById('yt-preview'), frame = box.querySelector('iframe');
    if (frame) { frame.replaceWith(thumbBtn); }
    box.hidden = !id;
    if (id) { const img = document.getElementById('yt-thumb-img'), src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; if (img.getAttribute('src') !== src) img.src = src; }
  }
  const thumbBtn = thumb();
  thumbBtn.addEventListener('click', () => {
    if (!current) return;
    const f = document.createElement('iframe');
    f.className = 'yt-frame'; f.title = current.title; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.referrerPolicy = 'strict-origin-when-cross-origin'; f.allowFullscreen = true;
    f.src = current.embed + (current.embed.includes('?') ? '&' : '?') + 'autoplay=1';
    thumbBtn.replaceWith(f);
  });

  mount({
    slug: 'youtube-link-generator', idle: 'Paste a YouTube link to begin',
    ready: ({ val }) => {
      if (val('url-input').trim()) return true;
      resetPreview(null); current = null;
      return 'Paste a YouTube link to begin';
    },
    summary: ({ val }) => [val('opt-nocookie') ? 'Privacy mode' : 'Standard domain', val('opt-responsive') ? 'responsive' : '560×315', val('opt-autoplay') && 'autoplay', val('opt-mute') && 'muted', val('opt-loop') && 'loop'].filter(Boolean).join(' · '),
    run: ({ val, $ }) => {
      const o = read(val);
      if (o.err) { resetPreview(null); current = null; throw new Error(o.err); }
      const changed = !current || current.embed !== o.embed;
      current = o;
      if (changed) resetPreview(o.id);
      $('output-rows').replaceChildren(row('Short link', o.short), row('Full link', o.watch), row('Embed code', o.iframe), row('Embed URL', o.embed), row('Markdown (thumbnail link)', o.md));
      const tip = o.autoplay && !o.mute ? 'Tip: browsers block autoplay with sound — tick “Start muted”' : '';
      return { text: o.short, url: o.watch, embedHtml: o.iframe, badge: o.id, copyMsg: 'Short link copied', note: tip || (o.start ? `Starts at ${clock(o.start)}${o.end !== null ? ` · embed ends at ${clock(o.end)}` : ''}` : 'Links ready'), ok: !tip };
    },
    download: (fmt, { S }) => ({ text: S.out.embedHtml + '\n', ext: 'html', mime: 'text/html;charset=utf-8' }),
    filename: ({ S }) => `youtube-embed-${S.out ? S.out.badge : 'video'}`,
    onReset: ({ $ }) => { $('output-rows').replaceChildren(); resetPreview(null); current = null; }
  });
  window.ToolityYouTube = { parseVideo, toSeconds }; // exposed for the page test
})();

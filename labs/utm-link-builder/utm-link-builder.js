/* Designed by Kapil Pidhwani: UTM Link Builder. URL + utm_* through the URL API (so encoding is always right), value
 * normalisation (lowercase, spaces), strip of old utm_* / click ids, platform presets, saved presets in localStorage
 * (source/medium/campaign/term/content only — never the URL), bulk mode with per-line utm_content, QR via /scripts/qr-engine.js.
 * Ceilings: QR engine tops out around version 10 (~270 chars at ECC L) — longer links simply show no QR; bulk capped at 500 lines. */
(function () {
  'use strict';
  const { mount, normalizeUrl } = window.ToolityWeb, { toast, copyText } = window.Toolity;
  const $ = (id) => document.getElementById(id), esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const LS = 'toolity_utm_presets', KEYS = ['source', 'medium', 'campaign', 'term', 'content'];
  const STRIP = /^(utm_\w+|gclid|gbraid|wbraid|fbclid|msclkid|ttclid|li_fat_id|mc_cid|mc_eid|_hsenc|_hsmi|igshid|yclid|dclid)$/i;
  const norm = (v, o) => { v = String(v || '').trim(); if (o.lower) v = v.toLowerCase(); v = v.replace(/\s+/g, ' '); return o.space === '%20' ? v : v.replace(/ /g, o.space); };
  const parseCustom = (txt) => (txt || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf('='); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, '']; }).filter(([k]) => k);

  function build(raw, p, o) {
    const u = normalizeUrl(raw); if (!u) return { error: 'Not a valid web address' };
    const flags = [], before = [...u.searchParams.keys()];
    if (o.strip) { for (const k of before) if (STRIP.test(k)) u.searchParams.delete(k); if (before.some((k) => STRIP.test(k))) flags.push(['', `Removed ${before.filter((k) => STRIP.test(k)).join(', ')} from the URL`]); }
    const params = [];
    for (const k of ['source', 'medium', 'campaign', 'id', 'term', 'content', 'source_platform']) { const v = norm(p[k], o); if (v) { u.searchParams.set('utm_' + k, v); params.push(['utm_' + k, v]); } }
    for (const [k, v] of p.custom || []) { u.searchParams.set(k, v); params.push([k, v]); }
    if (!o.fragment) u.hash = '';
    let href = u.href; if (o.space === '+') href = href.replace(/%2B/g, '+');
    if (!norm(p.source, o)) flags.push(['fail', 'utm_source is required']); if (!norm(p.medium, o)) flags.push(['fail', 'utm_medium is required']); if (!norm(p.campaign, o)) flags.push(['warn', 'utm_campaign missing — GA4 reports “(not set)”']);
    if (/[A-Z]/.test(params.map((x) => x[1]).join('')) ) flags.push(['warn', 'Mixed case values split reports — enable lowercase in Settings']);
    if (href.length > 2000) flags.push(['warn', `${href.length} characters — some platforms truncate links over 2,000`]);
    if (u.protocol === 'http:') flags.push(['', 'http:// — consider https://']);
    return { href, params, flags, host: u.hostname };
  }
  const opts = (val) => ({ lower: !!val('opt-lower'), space: val('opt-space'), strip: !!val('opt-strip'), fragment: !!val('opt-fragment') });
  const fields = (val) => ({ source: val('utm-source'), medium: val('utm-medium'), campaign: val('utm-campaign'), term: val('utm-term'), content: val('utm-content'), id: val('utm-id'), source_platform: val('utm-source-platform'), custom: parseCustom(val('utm-custom')) });

  /* QR (engine globals from qr-engine.js) */
  function drawQr(canvas, text) {
    try {
      const q = new QRCodeGenerator(0, QRErrorCorrectLevel.M); q.addData(text); q.make();
      const n = q.getModuleCount(), Q = 2, size = canvas.width, s = size / (n + Q * 2), x = canvas.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.fillStyle = '#000';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) { const x0 = Math.round((c + Q) * s), y0 = Math.round((r + Q) * s); x.fillRect(x0, y0, Math.round((c + Q + 1) * s) - x0, Math.round((r + Q + 1) * s) - y0); }
      return true;
    } catch (e) { return false; }
  }

  /* presets */
  const loadPresets = () => { try { const p = JSON.parse(localStorage.getItem(LS) || '{}'); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; } };
  const savePresets = (p) => { try { localStorage.setItem(LS, JSON.stringify(p)); } catch (e) { toast('Could not save — storage is full or blocked'); } };
  function paintPresets(sel) {
    const p = loadPresets(), cur = $('utm-saved').value; $('utm-saved').innerHTML = '<option value="">Load a saved preset…</option>' + Object.keys(p).sort((a, b) => a.localeCompare(b)).map((k) => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
    $('utm-saved').value = sel !== undefined ? sel : (p[cur] ? cur : ''); $('btn-del-preset').disabled = !$('utm-saved').value;
  }

  let qrOk = false;
  const api = mount({
    slug: 'utm-link-builder', debounce: 120,
    ready: ({ val, pill }) => ((pill('seg-mode') === 'bulk' ? val('utm-urls') : val('utm-url')).trim() ? true : 'Enter a URL'),
    summary: ({ val }) => `${val('opt-lower') ? 'lowercase' : 'keep case'} · spaces → ${{ _: '_', '-': '-', '%20': '%20', '+': '+' }[val('opt-space')]} · ${val('opt-fragment') ? 'keep' : 'drop'} #fragment${val('opt-qr') ? '' : ' · no QR'}`,
    onPill: (g, { pill, $: q }) => { if (g.id !== 'seg-mode') return; const b = pill('seg-mode') === 'bulk'; q('utm-url-group').hidden = b; q('utm-urls-group').hidden = !b; },
    onInput: (el) => {
      if (el.id === 'utm-saved') { const p = loadPresets()[el.value]; $('btn-del-preset').disabled = !el.value; if (p) KEYS.forEach((k) => { $('utm-' + k).value = p[k] || ''; }); }
    },
    run: ({ val, pill, $: q }) => {
      const o = opts(val), p = fields(val), bulk = pill('seg-mode') === 'bulk';
      q('output-bulk-wrap').hidden = !bulk; q('output-final').hidden = bulk; q('output-params').closest('.web-table-wrap').hidden = bulk;
      if (bulk) {
        const lines = val('utm-urls').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 500), rows = [];
        for (const line of lines) { const i = line.search(/[,\t]/), src = (i > 0 ? line.slice(0, i) : line).trim(), content = i > 0 ? line.slice(i + 1).trim() : ''; const r = build(src, Object.assign({}, p, content ? { content } : {}), o); rows.push(Object.assign({ src }, r)); }
        const ok = rows.filter((r) => r.href), bad = rows.length - ok.length, need = rows.find((r) => r.flags && r.flags.some((f) => f[0] === 'fail'));
        q('output-bulk').querySelector('tbody').innerHTML = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.href ? `<a href="${esc(r.href)}" target="_blank" rel="noopener">${esc(r.href)}</a>` : `<span class="web-tag fail">${esc(r.error)}</span> ${esc(r.src)}`}</td></tr>`).join('');
        q('output-flags').innerHTML = [bad ? ['fail', `${bad} line${bad === 1 ? '' : 's'} not a URL`] : null, need ? need.flags.find((f) => f[0] === 'fail') : null].filter(Boolean).map(([c, t]) => `<span class="web-tag ${c}">${esc(t)}</span>`).join('');
        q('output-qr').hidden = true;
        const csvRows = [['url', ...['source', 'medium', 'campaign', 'id', 'term', 'content', 'source_platform'].map((k) => 'utm_' + k), 'final_url'], ...ok.map((r) => { const get = (k) => (r.params.find((x) => x[0] === 'utm_' + k) || [, ''])[1]; return [r.src, ...['source', 'medium', 'campaign', 'id', 'term', 'content', 'source_platform'].map(get), r.href]; })];
        const csv = csvRows.map((r) => r.map((c) => /[",\n]/.test(c) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n');
        return { text: ok.map((r) => r.href).join('\n'), csv, ext: 'txt', badge: `${ok.length} link${ok.length === 1 ? '' : 's'}`, note: need ? 'Fill the required fields' : bad ? 'Some lines skipped' : 'Tagged', ok: !need && !bad, copyMsg: 'Links copied' };
      }
      const r = build(val('utm-url'), p, o); if (r.error) throw new Error(r.error);
      q('output-final').innerHTML = `<span class="utm-host">${esc(r.host)}</span><span class="utm-href">${esc(r.href)}</span>`;
      q('output-flags').innerHTML = r.flags.map(([c, t]) => `<span class="web-tag ${c}">${esc(t)}</span>`).join('');
      q('output-params').querySelector('tbody').innerHTML = r.params.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('') || '<tr><td class="is-empty" colspan="2">no parameters yet</td></tr>';
      qrOk = !!val('opt-qr') && drawQr(q('output-qr'), r.href); q('output-qr').hidden = !qrOk;
      const fail = r.flags.find((f) => f[0] === 'fail');
      const csv = ['parameter,value', ['url', r.href], ...r.params].map((x) => (Array.isArray(x) ? x.map((c) => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',') : x)).join('\n');
      return { text: r.href, csv, ext: 'txt', url: r.href, badge: `${r.href.length} chars`, note: fail ? fail[1] : 'Link ready', ok: !fail, copyMsg: 'Link copied', params: r.params };
    },
    download: (f, { S, $: q }) => {
      if (f === 'csv') return { text: S.out.csv, ext: 'csv', mime: 'text/csv' };
      if (f === 'png') { if (!qrOk) return toast('No QR for this link (too long or disabled)'), null; const c = document.createElement('canvas'); c.width = c.height = 1024; drawQr(c, S.out.text.split('\n')[0]); return new Promise((res) => c.toBlob((b) => res({ blob: b, ext: 'png' }), 'image/png')); }
      return { text: S.out.text, ext: 'txt' };
    },
    filename: ({ pill }) => (pill('seg-mode') === 'bulk' ? 'utm-links' : 'utm-link'),
    onReset: ({ $: q }) => { q('utm-url-group').hidden = false; q('utm-urls-group').hidden = true; q('output-final').innerHTML = ''; q('output-flags').innerHTML = ''; q('output-bulk').querySelector('tbody').innerHTML = ''; paintPresets(''); }
  });
  $('output-final').addEventListener('click', () => api.S.out && copyText(api.S.out.text, 'Link copied'));
  $('tool-card').addEventListener('click', (e) => { const b = e.target.closest('.utm-preset'); if (!b) return; $('utm-source').value = b.dataset.source; $('utm-medium').value = b.dataset.medium; $('utm-medium').dispatchEvent(new Event('input', { bubbles: true })); });
  $('btn-save-preset').addEventListener('click', () => {
    const vals = Object.fromEntries(KEYS.map((k) => [k, $('utm-' + k).value.trim()])); if (!vals.source && !vals.medium && !vals.campaign) return toast('Fill source, medium or campaign first');
    const name = prompt('Preset name', [vals.source, vals.medium, vals.campaign].filter(Boolean).join(' · ')); if (!name || !name.trim()) return;
    const p = loadPresets(); p[name.trim()] = vals; savePresets(p); paintPresets(name.trim()); toast('Preset saved on this device');
  });
  $('btn-del-preset').addEventListener('click', () => { const k = $('utm-saved').value; if (!k) return; const p = loadPresets(); delete p[k]; savePresets(p); paintPresets(''); toast('Preset deleted'); });
  paintPresets();
  window.ToolityUtm = { build, norm, parseCustom, loadPresets, api }; // for the page test
})();

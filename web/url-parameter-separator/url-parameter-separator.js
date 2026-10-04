/* Designed by Kapil Pidhwani: URL Parameter Separator & Cleaner */
(function () {
  'use strict';
  const { copyText, bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);

  const TRACKING_KEYS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_reader',
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'wbraid', 'gbraid', 'msclkid', 'twclid', 'ttclid',
    'igshid', '_ga', '_gl', 'mc_cid', 'mc_eid', 'yclid', 'zanpid', 'ref_src', 'ref_url', 'si',
    'spm', 's_kwcid', 'sc_cid', 'sc_source', 'ef_id', 'trk', 'tracking_code'
  ]);
  const SAMPLE = 'https://www.example.com/shop/products/wireless-headphones?utm_source=newsletter&utm_medium=email&utm_campaign=summer_sale_2026&item_id=89432&color=midnight_black&fbclid=IwAR2xK9L_0zJ18q&gclid=Cj0KCQjw&ref=hero_banner#specifications';

  const input = $('input-url');
  const list = $('params-list-box');
  const output = $('output-code');
  let parsed = null;      // URL object
  let params = [];        // [{ id, key, value, enabled }]
  let format = 'url';

  const esc = (s) => (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const domain = () => (parsed ? parsed.hostname.replace(/^www\./i, '') : '');

  function parse(raw) {
    raw = raw.trim();
    parsed = null; params = [];
    $('input-error').hidden = true;
    if (raw) {
      try {
        parsed = new URL(/^(https?:)?\/\//i.test(raw) ? raw : 'https://' + raw);
        if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') throw new Error('no tld');
        let i = 0;
        parsed.searchParams.forEach((value, key) => params.push({ id: i++, key, value, enabled: true }));
      } catch (e) {
        $('input-error').hidden = false;
      }
    }
    renderParams();
    renderOutput();
  }

  function renderParams() {
    const active = params.filter((p) => p.enabled).length;
    $('params-count-badge').textContent = params.length ? `${active} of ${params.length} active` : '0 parameters';
    $('url-meta-deck').hidden = !parsed;
    if (parsed) {
      $('meta-host').textContent = parsed.host;
      $('meta-path').textContent = parsed.pathname;
      $('meta-hash-row').hidden = !parsed.hash;
      $('meta-hash').textContent = parsed.hash;
    }
    if (!params.length) {
      list.innerHTML = `<div class="pane-empty"><iconify-icon icon="lucide:link-2"></iconify-icon><span>${parsed ? 'This URL has no query parameters' : 'Paste a URL above to inspect its parameters'}</span></div>`;
      return;
    }
    list.innerHTML = params.map((p) => `
      <div class="param-card-row${p.enabled ? '' : ' disabled'}" data-id="${p.id}">
        <div class="param-left-group">
          <input type="checkbox" class="param-checkbox" data-id="${p.id}" ${p.enabled ? 'checked' : ''} aria-label="Toggle ${esc(p.key)}">
          <div class="param-key-val-wrap">
            <span class="param-key" title="${esc(p.key)}">${esc(p.key)}</span>
            ${TRACKING_KEYS.has(p.key.toLowerCase()) ? '<span class="param-tracker-badge">Tracker</span>' : ''}
            <span class="param-equals">=</span>
            <span class="param-value" title="${esc(p.value)}">${esc(p.value || '""')}</span>
          </div>
        </div>
        <div class="param-actions-group">
          <button type="button" class="btn-param-help" data-key="${esc(p.key)}" title="Search what '${esc(p.key)}' means" aria-label="Look up ${esc(p.key)}">?</button>
          <button type="button" class="btn-param-delete" data-id="${p.id}" title="Remove this parameter" aria-label="Remove ${esc(p.key)}">
            <iconify-icon icon="lucide:trash-2" width="14" height="14"></iconify-icon>
          </button>
        </div>
      </div>`).join('');
  }

  function cleanUrl() {
    if (!parsed) return '';
    const u = new URL(parsed.origin + parsed.pathname);
    params.filter((p) => p.enabled).forEach((p) => u.searchParams.append(p.key, p.value));
    u.hash = parsed.hash;
    return u.toString();
  }

  function renderOutput() {
    if (!parsed) { output.textContent = 'Paste a URL on the left to see the cleaned result here…'; return; }
    const active = params.filter((p) => p.enabled);
    if (format === 'url') output.textContent = cleanUrl();
    else if (format === 'json') {
      const obj = {};
      active.forEach((p) => { obj[p.key] = p.key in obj ? [].concat(obj[p.key], p.value) : p.value; });
      output.textContent = JSON.stringify(obj, null, 2);
    } else output.textContent = active.length ? active.map((p) => `${p.key}: ${p.value}`).join('\n') : '# No active query parameters';
  }

  function setAll(enabled, msg) {
    if (!params.length) return;
    params.forEach((p) => { p.enabled = enabled; });
    renderParams(); renderOutput(); toast(msg);
  }

  function reset() { input.value = ''; parse(''); toast('Tool reset'); input.focus(); }

  function copy() {
    if (!parsed) return toast('Nothing to copy yet');
    copyText(output.textContent, 'Copied to clipboard');
  }

  // Event delegation for the dynamic parameter rows
  list.addEventListener('change', (e) => {
    const cb = e.target.closest('.param-checkbox');
    if (!cb) return;
    const p = params[cb.dataset.id];
    p.enabled = cb.checked;
    cb.closest('.param-card-row').classList.toggle('disabled', !p.enabled);
    $('params-count-badge').textContent = `${params.filter((x) => x.enabled).length} of ${params.length} active`;
    renderOutput();
  });
  list.addEventListener('click', (e) => {
    const del = e.target.closest('.btn-param-delete');
    const help = e.target.closest('.btn-param-help');
    if (del) { params = params.filter((p) => p.id !== Number(del.dataset.id)); renderParams(); renderOutput(); toast('Parameter removed'); }
    if (help) {
      const q = domain() ? `what does the "${help.dataset.key}" parameter do in ${domain()} url` : `what is the "${help.dataset.key}" query parameter in url`;
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener');
    }
  });

  input.addEventListener('input', () => parse(input.value));
  bindSegmented($('seg-format'), (v) => { format = v; renderOutput(); });
  $('btn-strip-tracking').addEventListener('click', () => {
    if (!params.length) return;
    let n = 0;
    params.forEach((p) => { if (TRACKING_KEYS.has(p.key.toLowerCase())) { p.enabled = false; n++; } });
    renderParams(); renderOutput();
    toast(n ? `Stripped ${n} tracking parameter${n > 1 ? 's' : ''}` : 'No tracking parameters found');
  });
  $('btn-select-all').addEventListener('click', () => setAll(true, 'All parameters enabled'));
  $('btn-clear-all').addEventListener('click', () => setAll(false, 'All parameters disabled'));
  $('btn-sample').addEventListener('click', () => { input.value = SAMPLE; parse(SAMPLE); toast('Sample URL loaded'); });
  $('btn-reset').addEventListener('click', reset);
  $('btn-copy').addEventListener('click', copy);
  $('btn-open').addEventListener('click', () => {
    const u = cleanUrl();
    if (!u) { toast('Enter a valid URL first'); input.focus(); return; }
    window.open(u, '_blank', 'noopener');
  });
  bindShortcuts({ primary: copy, reset });

  parse('');
})();

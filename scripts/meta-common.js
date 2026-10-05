/* Designed by Kapil Pidhwani: Shared core for the 8 metadata tools (viewer + remover × image/audio/video/PDF).
 * Pure helpers + the page "app" shell. Format parsers live in meta-image.js / meta-audio.js / meta-video.js / meta-pdf.js
 * and attach themselves to the same ToolityMeta namespace. Works in Node (tests) and the browser.
 */
(function (root) {
  'use strict';
  const M = {};

  /* ── Byte helpers ─────────────────────────────────────────── */
  const td = (enc) => new TextDecoder(enc, { fatal: false });
  M.ascii = (dv, off, len) => { let s = ''; for (let i = 0; i < len; i++) s += String.fromCharCode(dv.getUint8(off + i)); return s; };
  M.text = (bytes, enc = 'utf-8') => td(enc).decode(bytes).replace(/\0+$/, '');
  M.clean = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  M.fmtBytes = (b) => { if (!b) return '0 B'; const k = 1024, u = ['B', 'KB', 'MB', 'GB']; const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), 3); return parseFloat((b / k ** i).toFixed(2)) + ' ' + u[i]; };
  M.fmtDur = (s) => { if (!isFinite(s) || s <= 0) return null; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = (s % 60).toFixed(1); return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(x).padStart(4, '0'); };
  M.iso = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : null);
  M.concat = (parts) => { const n = parts.reduce((a, p) => a + p.byteLength, 0); const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p instanceof Uint8Array ? p : new Uint8Array(p), o); o += p.byteLength; } return out.buffer; };

  /* ── Result model ─────────────────────────────────────────── */
  // A parse result is { sections:[{title, rows:[[k,v]], removable}], flags:{gps,date,device,author,software}, note? }
  M.section = (title, removable = true) => ({ title, rows: [], removable });
  M.add = (sec, k, v) => { v = M.clean(v); if (v !== '' && v !== 'null' && v !== 'undefined') sec.rows.push([k, v]); return sec; };
  M.finish = (sections, extra = {}) => {
    const secs = sections.filter((s) => s.rows.length);
    const flags = { gps: false, date: false, device: false, author: false, software: false };
    for (const s of secs) {
      if (!s.removable) continue;
      for (const [k] of s.rows) {
        const key = k.toLowerCase();
        if (/gps|latitude|longitude|location/.test(key)) flags.gps = true;
        if (/date|time|created|modified|year/.test(key)) flags.date = true;
        if (/make|model|lens|camera|device|serial/.test(key)) flags.device = true;
        if (/artist|author|creator|owner|copyright|comment|title|description|composer|publisher/.test(key)) flags.author = true;
        if (/software|encoder|producer|writing|muxing|tool|application|library/.test(key)) flags.software = true;
      }
    }
    const removable = secs.filter((s) => s.removable).reduce((a, s) => a + s.rows.length, 0);
    return Object.assign({ sections: secs, flags, removable }, extra);
  };
  M.toText = (r) => r.sections.map((s) => `[${s.title}]\n` + s.rows.map(([k, v]) => `${k}: ${v}`).join('\n')).join('\n\n');
  M.toJSON = (r) => JSON.stringify(Object.fromEntries(r.sections.map((s) => [s.title, Object.fromEntries(s.rows)])), null, 2);

  /* ── XMP (shared by image / PDF / video) ──────────────────── */
  // Designed by Kapil Pidhwani: regex scrape, not an RDF parser — covers dc:/xmp:/photoshop:/tiff:/exif: attributes,
  // simple elements and the first <rdf:li> of bags/seqs/alts. Deeply nested structs are skipped.
  M.parseXmp = (xml) => {
    const sec = M.section('XMP');
    if (!xml || !/x:xmpmeta|rdf:RDF/.test(xml)) return sec;
    const seen = new Set(), put = (k, v) => { k = k.replace(/^(stEvt|stRef):/, ''); if (!seen.has(k) && sec.rows.length < 60) { seen.add(k); M.add(sec, k, v); } };
    const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    for (const m of xml.matchAll(/\s((?:dc|xmp|xmpMM|photoshop|tiff|exif|aux|Iptc4xmpCore|Iptc4xmpExt|pdf|pdfx|crs|GPano|xmpRights|plus|xmpDM|xapMM|xap):[\w-]+)="([^"]*)"/g)) {
      if (!/^(xmlns|rdf)/.test(m[1]) && !/InstanceID|DocumentID|OriginalDocumentID/.test(m[1])) put(m[1], dec(m[2]));
    }
    for (const m of xml.matchAll(/<((?:dc|xmp|xmpMM|photoshop|tiff|exif|aux|Iptc4xmpCore|Iptc4xmpExt|pdf|pdfx|crs|xmpRights|plus|xmpDM|xap):[\w-]+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
      const inner = m[2];
      const li = inner.match(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/);
      const v = li ? li[1] : inner;
      if (!/</.test(v) && !/InstanceID|DocumentID|OriginalDocumentID/.test(m[1])) put(m[1], dec(v));
    }
    return sec;
  };

  /* ── Renderer ─────────────────────────────────────────────── */
  const FLAG_DEFS = [['gps', 'lucide:map-pin', 'Location'], ['date', 'lucide:calendar', 'Dates'], ['device', 'lucide:camera', 'Device'], ['author', 'lucide:user', 'Author / Comments'], ['software', 'lucide:cpu', 'Software']];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  M.flagsHtml = (flags, cleared) => '<div class="meta-flags">' + FLAG_DEFS.map(([k, icon, label]) => `<span class="meta-flag${flags[k] ? (cleared ? ' is-clear' : ' is-hot') : ''}" title="${flags[k] ? (cleared ? label + ' removed' : label + ' present') : 'No ' + label.toLowerCase()}"><iconify-icon icon="${icon}" width="13" height="13"></iconify-icon>${label}</span>`).join('') + '</div>';
  M.sectionsHtml = (r, open = true) => r.sections.map((s) => `<details class="meta-section"${open ? ' open' : ''}><summary><span>${esc(s.title)}</span><span class="pane-badge">${s.rows.length}${s.removable ? '' : ' · info'}</span></summary><table class="meta-table"><tbody>${s.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${/^https?:\/\/\S+$/.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(v)}</a>` : esc(v)}</td></tr>`).join('')}</tbody></table></details>`).join('');

  /* ── Page app (viewer or remover) ─────────────────────────── */
  /** opts: { mode:'view'|'strip', parser:{parse(buf,file)->result|Promise, strip(buf,opts,file)->ArrayBuffer|Promise, kinds},
   *          accept:'image/', maxMB, preview(file,url,buf)->Promise|void, clear(), ext(file)->string, options()->{} , bake?(file,buf,result,opts)->Promise<ArrayBuffer|null> } */
  M.app = function (opts) {
    const $ = (id) => document.getElementById(id);
    const T = root.Toolity, toast = T.toast;
    const S = { file: null, buf: null, result: null, out: null, after: null };
    const card = $('tool-card'), out = $('meta-out');
    const showError = (msg) => { const e = $('input-error'); e.hidden = !msg; e.querySelector('span').textContent = msg || ''; };
    const base = () => S.file.name.replace(/\.[^.]+$/, '');

    async function load(file) {
      if (!file) return;
      if (file.size > opts.maxMB * 1024 * 1024) { showError(`File is larger than ${opts.maxMB} MB`); return; }
      reset(true);
      S.file = file;
      $('source-badge').textContent = `${file.name} · ${M.fmtBytes(file.size)}`;
      $('dropzone').hidden = true;
      T.setBusy(card, true);
      try {
        S.buf = await file.arrayBuffer();
        const url = URL.createObjectURL(file);
        await opts.preview(file, url, S.buf);
        S.result = await opts.parser.parse(S.buf, file);
        if (opts.mode === 'view') renderView(); else await runStrip();
      } catch (e) {
        console.warn('[meta]', e.message); // expected user-facing errors (unsupported/encrypted) — not console errors
        showError(e.message || 'Could not read this file');
        $('result-badge').textContent = 'Could not read file';
      } finally { T.setBusy(card, false); $('btn-reset').disabled = false; }
    }

    function renderView() {
      const r = S.result;
      out.innerHTML = M.flagsHtml(r.flags, false) + (r.sections.length ? M.sectionsHtml(r) : '<p class="meta-empty">No metadata found in this file.</p>');
      out.hidden = false; $('output-empty').hidden = true;
      $('output-badge').textContent = `${r.sections.reduce((a, s) => a + s.rows.length, 0)} fields`;
      $('result-badge').textContent = r.removable ? `${r.removable} removable field${r.removable === 1 ? '' : 's'} found` : 'No personal metadata found';
      $('result-badge').classList.toggle('meta-hot', r.removable > 0);
      $('btn-copy').disabled = false; $('btn-download').disabled = false;
    }

    async function runStrip() {
      const r = S.result, o = opts.options ? opts.options() : {};
      if (!opts.parser.strip) throw new Error('unsupported');
      let outBuf = null, baked = false;
      try { outBuf = await opts.parser.strip(S.buf, o, S.file); } catch (e) { outBuf = null; S.stripError = e.message; }
      if (outBuf && opts.bake) { try { const b = await opts.bake(S.file, outBuf, r, o); if (b) { outBuf = b; baked = true; } } catch (e) { console.warn('bake skipped:', e.message); } } // undecodable image → ship the raw strip
      S.out = outBuf ? new Blob([outBuf], { type: S.file.type || 'application/octet-stream' }) : null;
      S.after = outBuf ? await opts.parser.parse(outBuf, S.file) : null;
      const removed = S.after ? Math.max(0, r.removable - S.after.removable) : 0;
      let html = '';
      if (!outBuf) {
        html = `<div class="meta-summary is-warn"><iconify-icon icon="lucide:alert-triangle" width="18" height="18"></iconify-icon><div><strong>Can't clean this file losslessly</strong><p>${S.stripError || 'This format is view-only here.'}</p></div></div>` + M.flagsHtml(r.flags, false);
        $('result-badge').textContent = 'Format not supported for removal';
      } else {
        const saved = S.file.size - outBuf.byteLength;
        html = `<div class="meta-summary${removed || !r.removable ? ' is-ok' : ''}"><iconify-icon icon="${r.removable ? 'lucide:shield-check' : 'lucide:check-circle-2'}" width="18" height="18"></iconify-icon><div><strong>${r.removable ? `${removed} of ${r.removable} metadata field${r.removable === 1 ? '' : 's'} removed` : 'Already clean — nothing to remove'}</strong><p>${M.fmtBytes(S.file.size)} → ${M.fmtBytes(outBuf.byteLength)}${saved > 0 ? ` · ${M.fmtBytes(saved)} lighter` : ''}${baked ? ' · rotation baked in (re-encoded)' : ' · pixels/samples untouched'}</p></div></div>` + M.flagsHtml(r.flags, true);
        if (S.after && S.after.removable) html += `<p class="meta-note">${S.after.removable} field${S.after.removable === 1 ? '' : 's'} kept by your settings or not removable.</p>`;
        if (r.sections.length) html += `<p class="meta-note">What was inside:</p>` + M.sectionsHtml(r, false);
        $('result-badge').textContent = r.removable ? `${removed} field${removed === 1 ? '' : 's'} removed` : 'Already clean';
        $('btn-download').disabled = false;
      }
      out.innerHTML = html; out.hidden = false; $('output-empty').hidden = true;
      $('output-badge').textContent = outBuf ? M.fmtBytes(outBuf.byteLength) : 'Unsupported';
      $('btn-copy').disabled = false;
    }

    function reset(silent) {
      S.file = null; S.buf = null; S.result = null; S.out = null; S.after = null; S.stripError = '';
      opts.clear();
      out.hidden = true; out.innerHTML = ''; $('output-empty').hidden = false; $('dropzone').hidden = false;
      $('source-badge').textContent = 'No file loaded'; $('output-badge').textContent = 'Awaiting file';
      $('result-badge').textContent = 'Drop a file to begin'; $('result-badge').classList.remove('meta-hot');
      $('btn-copy').disabled = true; $('btn-download').disabled = true;
      showError('');
      if (!silent) toast('Reset');
    }

    T.bindDropzone($('dropzone'), $('file-input'), load, { accept: opts.accept });
    $('btn-reset').addEventListener('click', () => reset(false));
    $('btn-copy').addEventListener('click', () => {
      if (!S.result) return;
      const txt = opts.mode === 'view' ? M.toText(S.result) : $('result-badge').textContent + '\n' + M.toText(S.result);
      T.copyText(txt || 'No metadata found', 'Copied');
    });
    $('btn-download').addEventListener('click', () => {
      if (opts.mode === 'view') { if (S.result) T.downloadBlob(new Blob([M.toJSON(S.result)], { type: 'application/json' }), `${base()}-metadata.json`); }
      else if (S.out) T.downloadBlob(S.out, `${base()}-clean.${opts.ext(S.file)}`);
    });
    T.bindShortcuts({ primary: () => $('btn-download').click(), reset: () => reset(false) });
    if (opts.mode === 'strip') card.querySelectorAll('.tool-settings-panel input, .tool-settings-panel select').forEach((el) => el.addEventListener('change', () => { if (S.buf) { T.setBusy(card, true); runStrip().catch((e) => showError(e.message)).finally(() => T.setBusy(card, false)); } }));
    return (root.__meta = { S, load, reset });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  root.ToolityMeta = Object.assign(root.ToolityMeta || {}, M);
})(typeof window !== 'undefined' ? window : globalThis);

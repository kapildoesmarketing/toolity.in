/* ZIP Maker & Extractor — Toolity.in. Make: files + folders (webkitdirectory / dropped directory entries) → JSZip with DEFLATE level.
 * Extract: JSZip.loadAsync → entry list with filter, inline preview (text / image / audio / video / PDF), per-file download,
 * Extract-all via File System Access API (Chromium) with a sequential-download fallback. All on-device.
 * Designed by Kapil Pidhwani: ceilings — whole archive in memory (warns at 500 MB); encrypted entries are detected, not decrypted
 * (upgrade path: a WASM zip reader with ZipCrypto/AES, e.g. zip.js). */
(function () {
  'use strict';
  const { formatBytes, downloadBlob, toast } = window.Toolity, $ = (id) => document.getElementById(id);
  const MAX = 500e6, TEXT_RE = /\.(txt|md|csv|tsv|json|xml|html?|css|js|mjs|ts|jsx|tsx|yml|yaml|toml|ini|cfg|conf|log|sh|py|rb|go|rs|java|kt|c|h|cpp|hpp|cs|php|sql|svg|srt|vtt|env|gitignore|lock)$/i;
  const KIND = (n) => /\.(png|jpe?g|gif|webp|avif|bmp|ico)$/i.test(n) ? 'image' : /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(n) ? 'audio' : /\.(mp4|webm|mov|m4v)$/i.test(n) ? 'video' : /\.pdf$/i.test(n) ? 'pdf' : TEXT_RE.test(n) ? 'text' : 'other';
  const ICON = { image: 'lucide:image', audio: 'lucide:music', video: 'lucide:film', pdf: 'lucide:file-text', text: 'lucide:file-code', other: 'lucide:file' };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const base = (n) => n.split('/').pop();
  const M = { files: [], zip: null, entries: [], sel: -1, encrypted: 0, built: null, previewUrl: '' }; // files: [{path, file}]
  const rerun = () => window.ToolityWebTool.run();

  /* ── Make ── */
  function addFiles(list) {
    const seen = new Set(M.files.map((f) => f.path));
    for (const { path, file } of list) if (!seen.has(path)) { seen.add(path); M.files.push({ path, file }); }
    M.built = null; renderMake(); rerun();
  }
  const fromInput = (input, keepPath) => [...input.files].map((f) => ({ path: keepPath && f.webkitRelativePath ? f.webkitRelativePath : f.name, file: f }));
  // Dropped folders: walk directory entries so sub-folders survive (webkitGetAsEntry ships in every evergreen browser).
  async function fromDrop(dt) {
    const out = [], walk = (entry, dir) => new Promise((res) => {
      if (entry.isFile) return entry.file((f) => { out.push({ path: dir + f.name, file: f }); res(); }, res);
      const r = entry.createReader(), all = [], next = () => r.readEntries(async (es) => { if (!es.length) { for (const e of all) await walk(e, dir + entry.name + '/'); return res(); } all.push(...es); next(); }, res);
      next();
    });
    const entries = [...(dt.items || [])].map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
    if (entries.length) { for (const e of entries) await walk(e, ''); return out; }
    return [...dt.files].map((f) => ({ path: f.name, file: f }));
  }
  function renderMake() {
    const total = M.files.reduce((a, f) => a + f.file.size, 0);
    $('make-list').innerHTML = M.files.map((f, i) => `<div class="zip-row" role="listitem"><iconify-icon icon="${f.path.includes('/') ? 'lucide:folder' : ICON[KIND(f.path)]}" width="16" height="16"></iconify-icon><span class="zip-row-name" title="${esc(f.path)}">${esc(f.path)}</span><span class="zip-row-meta">${formatBytes(f.file.size)}</span><button type="button" class="web-row-btn" data-rm="${i}" aria-label="Remove ${esc(f.path)}" title="Remove"><iconify-icon icon="lucide:x" width="14" height="14"></iconify-icon></button></div>`).join('');
    $('make-hint').textContent = M.files.length ? `${M.files.length} item${M.files.length === 1 ? '' : 's'} · ${formatBytes(total)}` : 'or drop files & folders anywhere on this pane';
  }
  async function build(api) {
    const level = +api.val('opt-level'), zip = new JSZip(), total = M.files.reduce((a, f) => a + f.file.size, 0);
    if (total > MAX) throw new Error(`That is ${formatBytes(total)} — over the 500 MB in-browser limit. Zip it in smaller batches.`);
    const opt = { compression: level ? 'DEFLATE' : 'STORE', compressionOptions: { level } };
    for (const f of M.files) zip.file(f.path, f.file, { date: new Date(f.file.lastModified || Date.now()), ...opt });
    const blob = await zip.generateAsync({ type: 'blob', streamFiles: true, ...opt }, (m) => api.status(`Compressing… ${Math.round(m.percent)}%`));
    return { blob, total };
  }

  /* ── Extract ── */
  async function openZip(file, api) {
    api.showError(''); M.zip = null; M.entries = []; M.sel = -1; M.encrypted = 0; $('extract-actions').hidden = true; $('zip-tree').innerHTML = '';
    if (file.size > MAX) api.showError(`${formatBytes(file.size)} is large for an in-browser extractor — previews may be slow.`);
    try { M.zip = await JSZip.loadAsync(file); }
    catch (e) { throw new Error(/encrypt/i.test(e.message) ? 'This ZIP is password-protected. Decrypting archives in the browser isn’t supported yet — open it in your OS archiver.' : /end of central directory/i.test(e.message) ? 'That doesn’t look like a ZIP (no central directory). 7z, RAR and tar.gz are different formats.' : `Couldn’t read the archive: ${e.message}`); }
    M.entries = Object.values(M.zip.files).filter((e) => !e.dir).map((e) => { const d = e._data || {}; return { name: e.name, size: d.uncompressedSize || 0, packed: d.compressedSize || 0, date: e.date, enc: false, obj: e }; }).sort((a, b) => a.name.localeCompare(b.name));
    $('zip-name').textContent = `${file.name} · ${formatBytes(file.size)}`; $('extract-actions').hidden = false; $('zip-filter').value = '';
    renderTree();
  }
  function renderTree() {
    const q = $('zip-filter').value.trim().toLowerCase(), list = M.entries.map((e, i) => ({ e, i })).filter(({ e }) => !q || e.name.toLowerCase().includes(q));
    $('zip-tree').innerHTML = list.map(({ e, i }) => `<div class="zip-row${i === M.sel ? ' is-active' : ''}" role="listitem"><button type="button" class="zip-row-pick" data-pick="${i}" aria-label="Preview ${esc(e.name)}" aria-pressed="${i === M.sel}"><iconify-icon icon="${ICON[KIND(e.name)]}" width="16" height="16"></iconify-icon><span class="zip-row-name" title="${esc(e.name)}">${esc(e.name)}</span></button><span class="zip-row-meta">${formatBytes(e.size)}</span><button type="button" class="web-row-btn" data-dl="${i}" aria-label="Download ${esc(e.name)}" title="Download"><iconify-icon icon="lucide:download" width="14" height="14"></iconify-icon></button></div>`).join('') || '<p class="web-muted">No entries match.</p>';
    const total = M.entries.reduce((a, e) => a + e.size, 0);
    $('zip-count').textContent = `${list.length}${q ? ' of ' + M.entries.length : ''} file${M.entries.length === 1 ? '' : 's'} · ${formatBytes(total)} unpacked`;
  }
  const MIME = (n) => KIND(n) === 'pdf' ? 'application/pdf' : KIND(n) === 'image' ? `image/${n.split('.').pop().toLowerCase().replace('jpg', 'jpeg').replace('svg', 'svg+xml')}` : KIND(n) === 'audio' ? `audio/${n.split('.').pop().toLowerCase().replace('mp3', 'mpeg')}` : KIND(n) === 'video' ? `video/${n.split('.').pop().toLowerCase()}` : 'application/octet-stream';
  const entryBlob = async (e) => new Blob([await e.obj.async('uint8array')], { type: MIME(e.name) });
  async function extractAll(api) {
    const list = M.entries; if (!list.length) return;
    if (window.showDirectoryPicker) {
      let root; try { root = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' }); } catch (e) { return; } // user cancelled
      let n = 0;
      for (const e of list) {
        const parts = e.name.split('/').filter(Boolean), name = parts.pop(); let dir = root;
        for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true });
        const w = await (await dir.getFileHandle(name, { create: true })).createWritable(); await w.write(await e.obj.async('blob')); await w.close();
        api.status(`Extracting… ${++n}/${list.length}`);
      }
      api.status(`✓ Extracted ${n} files to “${root.name}”`, true); toast(`${n} files extracted`); return;
    }
    // Designed by Kapil Pidhwani: fallback = one download per file (Firefox/Safari cannot write folders); paths flatten to the basename.
    let n = 0; for (const e of list) { downloadBlob(await entryBlob(e), base(e.name)); api.status(`Downloading… ${++n}/${list.length}`); await new Promise((r) => setTimeout(r, 350)); }
    api.status(`✓ ${n} files downloaded`, true);
  }
  async function preview(e) {
    const box = $('zip-preview'), kind = KIND(e.name); if (M.previewUrl) URL.revokeObjectURL(M.previewUrl); M.previewUrl = ''; box.hidden = false;
    if (kind === 'text' && e.size <= 2e6) { box.innerHTML = `<pre class="web-code zip-code">${esc(await e.obj.async('string'))}</pre>`; return; }
    if (kind === 'other' || e.size > 80e6) { box.innerHTML = `<p class="web-muted">No preview for this file type${e.size > 80e6 ? ' at this size' : ''} — use the download button.</p>`; return; }
    M.previewUrl = URL.createObjectURL(await entryBlob(e));
    box.innerHTML = kind === 'image' ? `<img src="${M.previewUrl}" alt="${esc(e.name)}" class="zip-media">` : kind === 'audio' ? `<audio src="${M.previewUrl}" controls class="zip-media"></audio>` : kind === 'video' ? `<video src="${M.previewUrl}" controls class="zip-media"></video>` : `<iframe src="${M.previewUrl}" title="${esc(e.name)}" class="zip-pdf"></iframe>`;
  }
  const stat = (k, v) => `<div class="web-stat"><span class="web-muted">${k}</span><strong>${v}</strong></div>`;
  const sum = (arr, k) => arr.reduce((a, x) => a + x[k], 0);

  window.ToolityWeb.mount({
    slug: 'zip-maker-extractor', debounce: 60, busyLabel: 'Working…',
    summary: ({ val }) => `${['Store', 'Fast', 'Normal', 'Best'][['0', '3', '6', '9'].indexOf(val('opt-level'))] || 'Normal'} compression`,
    ready: ({ pill }) => (pill('seg-mode') === 'extract' ? (M.zip ? true : 'Open a ZIP to browse it') : (M.files.length ? true : 'Add files or folders')),
    onPill(g) { if (g.id !== 'seg-mode') return; const ex = g.querySelector('.active').dataset.value === 'extract'; $('panel-make').hidden = ex; $('panel-extract').hidden = !ex; $('btn-run').hidden = ex; },
    filename: ({ val }) => (val('opt-name').trim() || 'archive').replace(/[\\/:*?"<>|]+/g, '-'),
    async run(api) {
      const { pill, S, val } = api;
      if (pill('seg-mode') === 'extract') {
        const e = M.entries[M.sel], total = sum(M.entries, 'size'), packed = sum(M.entries, 'packed');
        $('zip-stats').innerHTML = stat('Files', M.entries.length) + stat('Unpacked', formatBytes(total)) + stat('Packed', `${formatBytes(packed)}${total ? ` (−${Math.max(0, Math.round((1 - packed / total) * 100))}%)` : ''}`) + stat('Folders', new Set(M.entries.map((x) => x.name.split('/').slice(0, -1).join('/')).filter(Boolean)).size);
        renderTree();
        if (!e) { $('zip-preview').hidden = true; return { badge: `${M.entries.length} files`, note: 'Click a file to preview it', text: M.entries.map((x) => x.name).join('\n'), ext: 'txt', copyMsg: 'File list copied' }; }
        await preview(e);
        const isText = KIND(e.name) === 'text' && e.size <= 2e6;
        return { blob: await entryBlob(e), name: base(e.name), badge: `${base(e.name)} · ${formatBytes(e.size)}`, note: `${e.date ? e.date.toLocaleString() : ''}${e.packed && e.size ? ` · stored at ${Math.round(e.packed / e.size * 100)}%` : ''}`, text: isText ? await e.obj.async('string') : undefined, copyMsg: 'File contents copied' };
      }
      $('zip-preview').hidden = true;
      const total = sum(M.files.map((f) => f.file), 'size');
      if (!S.go && !M.built) { $('zip-stats').innerHTML = stat('Items', M.files.length) + stat('Total', formatBytes(total)); return { badge: `${M.files.length} item${M.files.length === 1 ? '' : 's'}`, note: 'Press Build ZIP when ready' }; }
      if (S.go || M.built.level !== val('opt-level')) M.built = { ...(await build(api)), level: val('opt-level') };
      const { blob } = M.built, pct = total ? Math.round((1 - blob.size / total) * 100) : 0;
      $('zip-stats').innerHTML = stat('Items', M.files.length) + stat('Original', formatBytes(total)) + stat('ZIP', formatBytes(blob.size)) + stat('Saved', `${Math.max(0, pct)}%`);
      return { blob, ext: 'zip', mime: 'application/zip', badge: formatBytes(blob.size), note: `✓ ${M.files.length} item${M.files.length === 1 ? '' : 's'} zipped${pct > 0 ? ` · ${pct}% smaller` : ''} — press Download`, ok: true };
    },
    onReset() { M.files = []; M.zip = null; M.entries = []; M.sel = -1; M.built = null; renderMake(); $('zip-tree').innerHTML = ''; $('extract-actions').hidden = true; $('zip-name').textContent = 'or drop a .zip on this pane'; $('zip-preview').hidden = true; $('zip-stats').innerHTML = ''; $('panel-make').hidden = false; $('panel-extract').hidden = true; $('btn-run').hidden = false; }
  });

  /* wiring */
  const card = $('tool-card'), api = window.ToolityWebTool, mode = (v) => card.querySelector(`#seg-mode [data-value=${v}]`).click();
  const load = async (f) => { M.sel = -1; try { await openZip(f, api); rerun(); } catch (e) { api.showError(e.message); api.status('Failed'); } };
  $('btn-add-files').addEventListener('click', () => $('in-files').click());
  $('btn-add-folder').addEventListener('click', () => $('in-folder').click());
  $('btn-open-zip').addEventListener('click', () => $('in-zip').click());
  $('in-files').addEventListener('change', (ev) => { ev.stopPropagation(); addFiles(fromInput(ev.target, false)); ev.target.value = ''; });
  $('in-folder').addEventListener('change', (ev) => { ev.stopPropagation(); addFiles(fromInput(ev.target, true)); ev.target.value = ''; });
  $('in-zip').addEventListener('change', (ev) => { ev.stopPropagation(); const f = ev.target.files[0]; ev.target.value = ''; if (f) load(f); });
  $('make-list').addEventListener('click', (ev) => { const b = ev.target.closest('[data-rm]'); if (!b) return; M.files.splice(+b.dataset.rm, 1); M.built = null; renderMake(); rerun(); });
  $('zip-tree').addEventListener('click', async (ev) => {
    const p = ev.target.closest('[data-pick]'), d = ev.target.closest('[data-dl]');
    if (p) { M.sel = +p.dataset.pick; rerun(); }
    if (d) { const e = M.entries[+d.dataset.dl]; downloadBlob(await entryBlob(e), base(e.name)); }
  });
  $('zip-filter').addEventListener('input', (ev) => { ev.stopPropagation(); renderTree(); });
  $('btn-extract-all').addEventListener('click', () => extractAll(api).catch((e) => api.showError(e.message)));
  const pane = $('panel-make').closest('.tool-pane');
  ['dragenter', 'dragover'].forEach((t) => pane.addEventListener(t, (ev) => { ev.preventDefault(); pane.classList.add('dragover'); }));
  pane.addEventListener('dragleave', () => pane.classList.remove('dragover'));
  pane.addEventListener('drop', async (ev) => {
    ev.preventDefault(); pane.classList.remove('dragover');
    const files = [...ev.dataTransfer.files], oneZip = files.length === 1 && /\.zip$/i.test(files[0].name);
    if (oneZip && (api.pill('seg-mode') === 'extract' || !M.files.length)) { mode('extract'); return load(files[0]); }
    if (api.pill('seg-mode') === 'extract') mode('make');
    addFiles(await fromDrop(ev.dataTransfer));
  });
  window.__zip = { M, KIND, addFiles, openZip: load };
})();

/* Designed by Kapil Pidhwani: Shared helpers for every Toolity tool page.
 * Load after /scripts/main.js. Exposes window.Toolity.
 * Keep this file small: only things ≥2 tools need. Tool-specific logic stays in the tool.
 */
(function () {
  'use strict';

  const toast = (msg) => (typeof window.showToast === 'function' ? window.showToast(msg) : console.log('[toast]', msg));

  /** Copy plain text; falls back to execCommand for non-secure contexts. */
  async function copyText(text, successMsg = 'Copied to clipboard') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast(successMsg);
      return true;
    } catch (e) {
      toast('Copy failed — your browser blocked clipboard access');
      return false;
    }
  }

  /** Copy a Blob (image/png only is universally supported). */
  async function copyBlob(blob, successMsg = 'Image copied to clipboard') {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('unsupported');
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast(successMsg);
      return true;
    } catch (e) {
      toast('Clipboard does not support this file type — use Download instead');
      return false;
    }
  }

  /** Trigger a file download for a Blob or data/object URL. */
  function downloadBlob(blobOrUrl, filename) {
    const isBlob = blobOrUrl instanceof Blob;
    const url = isBlob ? URL.createObjectURL(blobOrUrl) : blobOrUrl;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (isBlob) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /**
   * Wire a dropzone + hidden file input.
   * bindDropzone(zoneEl, inputEl, onFile, { accept: 'image/' })
   * `accept` is a MIME prefix or exact type; rejects with a toast otherwise.
   */
  function bindDropzone(zone, input, onFile, opts = {}) {
    const accept = opts.accept || '';
    const take = (file) => {
      if (!file) return;
      if (accept && !file.type.startsWith(accept)) {
        toast(`Unsupported file type: ${file.type || 'unknown'}`);
        return;
      }
      onFile(file);
    };
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('dragover'); }));
    zone.addEventListener('drop', (e) => take(e.dataTransfer.files[0]));
    zone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { take(input.files[0]); input.value = ''; });
  }

  /** Disable toolbar actions while a tool is processing. */
  function setBusy(card, busy) {
    card.classList.toggle('is-busy', busy);
    card.querySelectorAll('.tool-actions-toolbar button').forEach((b) => { b.disabled = busy; });
  }

  /** Segmented pill group: click sets .active and calls onChange(value). */
  function bindSegmented(container, onChange) {
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-pill');
      if (!btn || btn.disabled) return;
      container.querySelectorAll('.seg-pill').forEach((b) => b.classList.toggle('active', b === btn));
      onChange(btn.dataset.value, btn);
    });
  }

  /** Top-right dropdown (.dropdown-menu-wrapper > button + .dropdown-popup). */
  function bindDropdown(wrapper) {
    if (!wrapper) return;
    const trigger = wrapper.querySelector(':scope > button');
    trigger.addEventListener('click', (e) => { e.stopPropagation(); wrapper.classList.toggle('open'); });
    document.addEventListener('click', () => wrapper.classList.remove('open'));
    wrapper.querySelectorAll('.dropdown-item').forEach((i) => i.addEventListener('click', () => wrapper.classList.remove('open')));
  }

  /** Global shortcuts: Ctrl/Cmd+Enter = primary, Esc = reset. */
  function bindShortcuts({ primary, reset }) {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && primary) { e.preventDefault(); primary(); }
      if (e.key === 'Escape' && reset && !document.querySelector('.dropdown-menu-wrapper.open')) reset();
    });
  }

  window.Toolity = { copyText, copyBlob, downloadBlob, formatBytes, formatTime, bindDropzone, setBusy, bindSegmented, bindDropdown, bindShortcuts, toast };
})();

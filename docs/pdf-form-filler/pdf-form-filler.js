/* PDF Form Filler — Toolity.in. pdf-lib AcroForm → generated inputs; values written back; optional flatten. All on-device. */
(function () {
  'use strict';
  const P = window.ToolityPDF, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s || '');

  function buildFields(doc, S) {
    const form = doc.getForm(), fields = form.getFields(), wrap = $('form-fields'); wrap.replaceChildren();
    S.fields = [];
    const L = window.PDFLib;
    const kind = (f) => (f instanceof L.PDFTextField ? 'PDFTextField' : f instanceof L.PDFCheckBox ? 'PDFCheckBox' : f instanceof L.PDFRadioGroup ? 'PDFRadioGroup' : f instanceof L.PDFDropdown ? 'PDFDropdown' : f instanceof L.PDFOptionList ? 'PDFOptionList' : 'other');
    fields.forEach((f, i) => {
      const name = f.getName(), type = kind(f), id = `fld-${i}`, g = document.createElement('div'); g.className = 'form-group';
      const lab = document.createElement('label'); lab.className = 'form-label'; lab.htmlFor = id; lab.innerHTML = `<span></span>`; lab.firstChild.textContent = name.split('.').pop() || name;
      let el;
      if (type === 'PDFTextField') {
        el = document.createElement(f.isMultiline() ? 'textarea' : 'input'); el.className = f.isMultiline() ? 'textarea-clean' : 'input-clean'; if (el.tagName === 'INPUT') el.type = 'text';
        el.value = esc(f.getText()); el.placeholder = 'Type here'; if (f.getMaxLength()) el.maxLength = f.getMaxLength();
      } else if (type === 'PDFCheckBox') {
        g.className = 'control-item'; el = document.createElement('input'); el.type = 'checkbox'; el.checked = f.isChecked(); lab.className = '';
      } else if (type === 'PDFRadioGroup') {
        el = document.createElement('select'); el.className = 'select-clean';
        [''].concat(f.getOptions()).forEach((o) => { const op = document.createElement('option'); op.value = o; op.textContent = o || '— none —'; el.append(op); }); el.value = f.getSelected() || '';
      } else if (type === 'PDFDropdown' || type === 'PDFOptionList') {
        el = document.createElement('select'); el.className = 'select-clean'; if (type === 'PDFOptionList') el.multiple = true;
        f.getOptions().forEach((o) => { const op = document.createElement('option'); op.value = o; op.textContent = o; el.append(op); });
        const sel = f.getSelected(); [...el.options].forEach((op) => { op.selected = sel.includes(op.value); });
      } else { return; } // signature/button fields: not fillable here (FAQ)
      el.id = id; el.dataset.idx = i;
      if (type === 'PDFCheckBox') g.append(el, lab); else g.append(lab, el);
      wrap.append(g); S.fields.push({ f, el, type });
    });
    wrap.hidden = !S.fields.length;
    return S.fields.length;
  }

  P.mount({
    actionLabel: 'Fill & Save', suffix: 'filled', source: 'custom',
    async onLoad(S) { const doc = await P.loadLib(S.bytes); S.count = buildFields(doc, S); $('source-badge').textContent += ` · ${S.count} field${S.count === 1 ? '' : 's'}`; },
    ready: (S) => (S.count ? true : 'This PDF has no form fields — it is not fillable'),
    summary: () => ($('opt-flatten').checked ? 'Flatten after filling' : 'Keep form editable'),
    onReset(S) { S.fields = []; S.count = 0; },
    copy(S) { window.Toolity.copyText(S.fields.map(({ f, el, type }) => `${f.getName()}: ${type === 'PDFCheckBox' ? (el.checked ? '☑' : '☐') : el.value}`).join('\n'), 'Field values copied'); },
    async run(S) {
      const doc = await P.loadLib(S.bytes), form = doc.getForm(), fields = form.getFields();
      let filled = 0;
      for (const { el, type } of S.fields) {
        const f = fields[Number(el.dataset.idx)];
        try {
          if (type === 'PDFTextField') { f.setText(el.value || ''); if (el.value) filled++; }
          else if (type === 'PDFCheckBox') { if (el.checked) { f.check(); filled++; } else f.uncheck(); }
          else if (type === 'PDFRadioGroup') { if (el.value) { f.select(el.value); filled++; } }
          else if (type === 'PDFDropdown') { if (el.value) { f.select(el.value); filled++; } }
          else if (type === 'PDFOptionList') { const v = [...el.selectedOptions].map((o) => o.value); if (v.length) { f.select(v); filled++; } }
        } catch (e) { console.warn('field', f.getName(), e); }
      }
      // Designed by Kapil Pidhwani: appearance streams are regenerated with Helvetica so every viewer shows the values; fonts the form embedded are not reused. Upgrade path: reuse /DA font when it is a standard 14 font.
      form.updateFieldAppearances(await doc.embedFont(window.PDFLib.StandardFonts.Helvetica));
      if ($('opt-flatten').checked) form.flatten();
      const blob = new Blob([await doc.save({ useObjectStreams: true })], { type: 'application/pdf' });
      return { blob, note: `${filled} of ${S.count} fields filled · ${$('opt-flatten').checked ? 'flattened' : 'still editable'} · ${window.Toolity.formatBytes(blob.size)}` };
    }
  });
})();

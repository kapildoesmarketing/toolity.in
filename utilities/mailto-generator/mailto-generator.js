/* Designed by Kapil Pidhwani: Mailto Link Creator */
(function () {
  'use strict';
  const { copyText, bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);

  const fields = { to: $('email-to'), cc: $('email-cc'), bcc: $('email-bcc'), subject: $('email-subject'), body: $('email-body') };
  const output = $('output-code');
  let format = 'raw';

  function buildMailto() {
    const v = Object.fromEntries(Object.entries(fields).map(([k, el]) => [k, k === 'body' ? el.value : el.value.trim()]));
    const params = ['cc', 'bcc', 'subject', 'body'].filter((k) => v[k]).map((k) => `${k}=${encodeURIComponent(v[k])}`);
    return 'mailto:' + encodeURI(v.to) + (params.length ? '?' + params.join('&') : '');
  }

  function render() {
    const url = buildMailto();
    const text = 'Send us an email';
    output.textContent = format === 'html' ? `<a href="${url}">${text}</a>` : format === 'md' ? `[${text}](${url})` : url;
    const total = Object.values(fields).reduce((n, el) => n + el.value.length, 0);
    $('input-badge').textContent = `${total} chars`;
    $('body-badge').textContent = `${fields.body.value.length} chars`;
  }

  function reset() {
    Object.values(fields).forEach((el) => { el.value = ''; });
    render();
    toast('Form reset');
  }

  function copy() {
    if (buildMailto() === 'mailto:') return toast('Nothing to copy yet');
    copyText(output.textContent, 'Copied to clipboard');
  }

  function open() {
    const url = buildMailto();
    if (url === 'mailto:') return toast('Enter an email address first');
    window.open(url, '_blank');
    toast('Opening your email client…');
  }

  Object.values(fields).forEach((el) => el.addEventListener('input', render));
  bindSegmented($('seg-format'), (v) => { format = v; render(); });
  $('btn-reset').addEventListener('click', reset);
  $('btn-copy').addEventListener('click', copy);
  $('btn-open').addEventListener('click', open);
  bindShortcuts({ primary: copy, reset });

  // Friendly defaults so the preview is never blank on first visit
  fields.to.value = 'support@toolity.in';
  fields.subject.value = 'Inquiry regarding Toolity';
  fields.body.value = 'Hi Toolity Team,\n\nI wanted to reach out regarding...';
  render();
})();

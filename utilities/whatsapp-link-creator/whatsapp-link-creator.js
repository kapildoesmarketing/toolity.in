/* Designed by Kapil Pidhwani: WhatsApp Link Creator */
(function () {
  'use strict';
  const { copyText, bindSegmented, bindShortcuts, toast } = window.Toolity;
  const $ = (id) => document.getElementById(id);

  const phone = $('wa-phone');
  const message = $('wa-message');
  const output = $('output-code');
  let format = 'raw';

  // wa.me accepts digits only; strip formatting and an international "00" prefix
  const cleanPhone = (v) => v.replace(/\D/g, '').replace(/^00/, '');

  function buildLink() {
    const num = cleanPhone(phone.value);
    const msg = message.value;
    return 'https://wa.me/' + num + (msg.trim() ? `?text=${encodeURIComponent(msg)}` : '');
  }

  function render() {
    $('message-badge').textContent = `${message.value.length} chars`;
    $('input-badge').textContent = `${phone.value.trim().length + message.value.length} chars`;
    const link = buildLink();
    if (link === 'https://wa.me/') {
      output.textContent = 'https://wa.me/15551234567?text=Hello%20there!';
      return;
    }
    output.textContent = format === 'html'
      ? `<a href="${link}" target="_blank" rel="noopener noreferrer">\n  Chat on WhatsApp\n</a>`
      : format === 'md' ? `[Chat on WhatsApp](${link})` : link;
  }

  function reset() {
    phone.value = '';
    message.value = '';
    render();
    toast('All fields cleared');
    phone.focus();
  }

  const copy = () => copyText(output.textContent, 'Copied to clipboard');

  function open() {
    const link = buildLink();
    if (link === 'https://wa.me/') { toast('Enter a phone number or message first'); phone.focus(); return; }
    window.open(link, '_blank', 'noopener,noreferrer');
    toast('Opening WhatsApp in a new tab…');
  }

  phone.addEventListener('input', render);
  message.addEventListener('input', render);
  bindSegmented($('seg-format'), (v) => { format = v; render(); });
  $('btn-reset').addEventListener('click', reset);
  $('btn-copy').addEventListener('click', copy);
  $('btn-open').addEventListener('click', open);
  bindShortcuts({ primary: copy, reset });
  render();
})();

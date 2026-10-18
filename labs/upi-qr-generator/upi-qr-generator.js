/* Designed by Kapil Pidhwani: UPI Payment QR Generator — builds the NPCI `upi://pay` deep link and renders it with the shared
 * QR engine (/scripts/qr-engine.js). PNG/preview use exact-size canvases (module edges rounded, so no seams); SVG is one path.
 * Ceiling: the shared engine stops at QR version 10 — plenty for a UPI link (~100–200 bytes); a very long note errors clearly. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const VPA = /^[a-z0-9][a-z0-9._-]{1,255}@[a-z][a-z0-9.-]{1,63}$/i;
  const QUIET = 4; // modules of white border required by the QR spec
  const enc = (v) => encodeURIComponent(v).replace(/%40/g, '@');
  const inr = (n) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function parseAmount(s) {
    s = String(s || '').replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
    if (!s) return null;
    if (!/^\d+(\.\d{1,2})?$/.test(s) || +s <= 0) return NaN;
    return +s;
  }
  function buildLink({ vpa, name, amount, note }) {
    return 'upi://pay?' + [['pa', vpa], ['pn', name], ['am', amount !== null ? amount.toFixed(2) : ''], ['cu', 'INR'], ['tn', note]]
      .filter(([, v]) => v).map(([k, v]) => `${k}=${enc(v)}`).join('&');
  }
  function makeQR(text, ecc) {
    try { const q = new QRCodeGenerator(0, QRErrorCorrectLevel[ecc] ?? QRErrorCorrectLevel.M); q.addData(text); q.make(); return q; }
    catch (e) { throw new Error('Too much text for one QR code — shorten the name or note, or lower the error correction.'); }
  }
  function drawQR(ctx, q, x, y, size) {
    const n = q.getModuleCount(), s = size / (n + QUIET * 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, size, size); ctx.fillStyle = '#000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) {
      const x0 = Math.round(x + (c + QUIET) * s), y0 = Math.round(y + (r + QUIET) * s);
      ctx.fillRect(x0, y0, Math.round(x + (c + QUIET + 1) * s) - x0, Math.round(y + (r + QUIET + 1) * s) - y0);
    }
  }
  function qrCanvas(q, size) { const c = document.createElement('canvas'); c.width = c.height = size; drawQR(c.getContext('2d'), q, 0, 0, size); return c; }
  function qrSvg(q) {
    const n = q.getModuleCount(), w = n + QUIET * 2; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) { let run = 1; while (c + run < n && q.isDark(r, c + run)) run++; d += `M${c + QUIET} ${r + QUIET}h${run}v1h-${run}z`; c += run - 1; }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" width="1024" height="1024" shape-rendering="crispEdges"><rect width="${w}" height="${w}" fill="#fff"/><path d="${d}" fill="#000"/></svg>\n`;
  }
  const blobOf = (canvas) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not create the image.'))), 'image/png'));

  function card(q, o, headline) {
    const W = 1200, H = 1800, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const fit = (text, weight, size, family, maxW) => { let s = size; do { x.font = `${weight} ${s}px ${family}`; s -= 2; } while (x.measureText(text).width > maxW && s > 18); };
    const line = (text, y, weight, size, color, family = 'Inter, system-ui, sans-serif') => { if (!text) return; fit(text, weight, size, family, W - 160); x.fillStyle = color; x.fillText(text, W / 2, y); };
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#e5e5e5'; x.lineWidth = 4; x.beginPath(); x.roundRect(30, 30, W - 60, H - 60, 48); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    line(headline, 190, 700, 64, '#111');
    drawQR(x, q, 150, 260, 900);
    line(o.name, 1290, 700, 64, '#111');
    line(o.vpa, 1365, 500, 42, '#444', 'ui-monospace, Menlo, Consolas, monospace');
    if (o.amount !== null) line(inr(o.amount), 1480, 800, 84, '#111');
    if (o.note) line(o.note, o.amount !== null ? 1560 : 1460, 500, 40, '#555');
    line('Google Pay · PhonePe · Paytm · BHIM · any UPI app', 1700, 500, 34, '#777');
    return c;
  }

  function read(val) {
    const vpa = val('upi-input').trim(), amount = parseAmount(val('amount-input'));
    if (!VPA.test(vpa)) throw new Error('UPI ID should look like name@bank — letters, numbers, dots or hyphens before the @.');
    if (Number.isNaN(amount)) throw new Error('Amount: use a number like 250 or 99.50 (up to 2 decimals).');
    return { vpa, amount, name: val('name-input').trim(), note: val('note-input').trim(), ecc: val('opt-ecc'), size: +val('opt-size') || 1024, headline: val('opt-card').trim() };
  }

  mount({
    slug: 'upi-qr-generator', idle: 'Enter a UPI ID to begin',
    ready: ({ val }) => (val('upi-input').trim() ? true : 'Enter a UPI ID to begin'),
    summary: ({ val }) => `ECC ${val('opt-ecc')} · ${val('opt-size')} px`,
    run: ({ val, $, S }) => {
      const o = read(val), link = buildLink(o), q = makeQR(link, o.ecc);
      $('upi-qr').src = qrCanvas(q, 560).toDataURL('image/png');
      $('upi-name').textContent = o.name || 'No payee name';
      $('upi-vpa').textContent = o.vpa;
      $('upi-amt').textContent = o.amount !== null ? inr(o.amount) : '';
      $('output-text').textContent = link;
      S.qr = q; S.upi = o;
      const warn = !o.name ? 'Add a payee name — some apps warn when it is missing' : o.amount > 100000 ? 'Above ₹1,00,000 — many UPI apps cap a single payment' : '';
      return { text: link, url: link, copyMsg: 'UPI link copied', badge: o.amount !== null ? inr(o.amount) : 'Any amount', note: warn || 'Ready · scan and pay ₹1 to test', ok: !warn };
    },
    download: async (fmt, { S }) => {
      if (fmt === 'svg') return { text: qrSvg(S.qr), ext: 'svg', mime: 'image/svg+xml' };
      if (fmt === 'card') return { blob: await blobOf(card(S.qr, S.upi, S.upi.headline)), name: `upi-card-${S.upi.vpa.split('@')[0]}.png` };
      return { blob: await blobOf(qrCanvas(S.qr, S.upi.size)), ext: 'png' };
    },
    filename: ({ S }) => `upi-qr-${S.upi ? S.upi.vpa.split('@')[0] : 'code'}`,
    onReset: ({ $, S }) => { $('upi-qr').removeAttribute('src'); S.qr = S.upi = null; }
  });
  window.ToolityUPI = { buildLink, parseAmount, VPA }; // exposed for the page test
})();

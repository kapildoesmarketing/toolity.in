/* Designed by Kapil Pidhwani: Hash & ID Generator. SHA-1/256/384/512 and HMAC come from Web Crypto; MD5 is a compact
 * in-house implementation (Web Crypto has none) with an HMAC built generically on top. Input is UTF-8 text or a dropped
 * file's bytes (kept in memory, 50 MB cap). IDs use crypto.getRandomValues with rejection sampling; UUID v7 / ULID embed
 * ms timestamps and can be decoded back. run() is synchronous with the cache trick so typing never flickers the overlay.
 * Ceilings: no CRC32 / xxHash / bcrypt; file hashing is single-shot (no streaming). */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const enc = new TextEncoder();
  /* ── MD5 (RFC 1321) ── */
  function md5(bytes) {
    const K = new Int32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    const n = bytes.length, len = ((n + 8 >> 6) + 1) << 4, M = new Int32Array(len);
    for (let i = 0; i < n; i++) M[i >> 2] |= bytes[i] << ((i % 4) * 8);
    M[n >> 2] |= 0x80 << ((n % 4) * 8); M[len - 2] = (n * 8) | 0; M[len - 1] = Math.floor(n / 536870912);
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    const rot = (x, s) => (x << s) | (x >>> (32 - s));
    for (let i = 0; i < len; i += 16) {
      const A = a, B = b, C = c, D = d;
      for (let j = 0; j < 64; j++) {
        let f, g;
        if (j < 16) { f = (b & c) | (~b & d); g = j; } else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16; } else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16; } else { f = c ^ (b | ~d); g = (7 * j) % 16; }
        const t = d; d = c; c = b; b = (b + rot((a + f + K[j] + M[i + g]) | 0, S[(j >> 4) * 4 + (j % 4)])) | 0; a = t;
      }
      a = (a + A) | 0; b = (b + B) | 0; c = (c + C) | 0; d = (d + D) | 0;
    }
    const out = new Uint8Array(16); [a, b, c, d].forEach((w, i) => { for (let k = 0; k < 4; k++) out[i * 4 + k] = (w >>> (k * 8)) & 255; });
    return out;
  }
  async function hmacMd5(key, data) {
    if (key.length > 64) key = md5(key);
    const k = new Uint8Array(64); k.set(key);
    const ipad = k.map((x) => x ^ 0x36), opad = k.map((x) => x ^ 0x5c), inner = md5(cat(ipad, data));
    return md5(cat(opad, inner));
  }
  const cat = (a, b) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };
  const ALGOS = [['MD5', null], ['SHA-1', 'SHA-1'], ['SHA-256', 'SHA-256'], ['SHA-384', 'SHA-384'], ['SHA-512', 'SHA-512']];
  async function digest(name, data, key) {
    if (!name) return key ? hmacMd5(key, data) : md5(data);
    if (!key) return new Uint8Array(await crypto.subtle.digest(name, data));
    const k = await crypto.subtle.importKey('raw', key.length ? key : new Uint8Array([0]), { name: 'HMAC', hash: name }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
  }
  const toHex = (u) => [...u].map((b) => b.toString(16).padStart(2, '0')).join('');
  const toB64 = (u, url) => { const s = btoa(String.fromCharCode(...u)); return url ? s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : s; };
  const fmt = (u, j) => (j.enc === 'hex' ? (j.upper ? toHex(u).toUpperCase() : toHex(u)) : toB64(u, j.enc === 'base64url'));
  const norm = (s) => s.trim().replace(/^(md5|sha1|sha256|sha384|sha512|sha-\d+)\s*[:=]\s*/i, '').replace(/[\s-]/g, '').replace(/_/g, '/').toLowerCase();

  /* ── IDs ── */
  const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
  const ALPHA = { url: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', lower: 'abcdefghijklmnopqrstuvwxyz0123456789', hex: '0123456789abcdef', nolook: 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789' };
  function pick(alpha, len) { // rejection sampling → uniform
    const mask = (2 << (31 - Math.clz32((alpha.length - 1) | 1))) - 1, step = Math.ceil(1.6 * mask * len / alpha.length); let id = '';
    while (id.length < len) for (const b of rnd(step)) { const x = b & mask; if (x < alpha.length) { id += alpha[x]; if (id.length === len) break; } }
    return id;
  }
  const uuid4 = () => crypto.randomUUID();
  function uuid7() {
    const b = rnd(16), t = Date.now();
    b[0] = t / 2 ** 40; b[1] = t / 2 ** 32; b[2] = t / 2 ** 24; b[3] = t / 2 ** 16; b[4] = t / 256; b[5] = t;
    b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
    const h = toHex(b); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function ulid() {
    let t = Date.now(), s = ''; for (let i = 0; i < 10; i++) { s = B32[t % 32] + s; t = Math.floor(t / 32); }
    return s + pick(B32, 16);
  }
  const decodeId = (s) => {
    s = s.trim();
    if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(s)) { let t = 0; for (const c of s.slice(0, 10).toUpperCase()) t = t * 32 + B32.indexOf(c); return { kind: 'ULID', ms: t }; }
    const u = s.replace(/[{}-]/g, '').toLowerCase();
    if (/^[0-9a-f]{32}$/.test(u)) { const ver = u[12]; if (ver === '7') return { kind: 'UUID v7', ms: parseInt(u.slice(0, 12), 16) }; if (ver === '1') { const t = (parseInt(u.slice(13, 16), 16) * 2 ** 48 + parseInt(u.slice(8, 12), 16) * 2 ** 32 + parseInt(u.slice(0, 8), 16)) / 10000 - 12219292800000; return { kind: 'UUID v1', ms: t }; } return { kind: `UUID v${ver}`, ms: null }; }
    return null;
  };
  function ids(j) {
    const out = [], len = Math.max(4, Math.min(64, j.len | 0)), n = Math.max(1, Math.min(1000, j.count | 0));
    for (let i = 0; i < n; i++) {
      let id = j.type === 'uuid4' ? uuid4() : j.type === 'uuid7' ? uuid7() : j.type === 'ulid' ? ulid() : j.type === 'nanoid' ? pick(ALPHA[j.alpha], len) : j.type === 'cuid' ? pick('abcdefghijklmnopqrstuvwxyz', 1) + pick('abcdefghijklmnopqrstuvwxyz0123456789', 23) : j.type === 'short' ? pick(ALPHA.alnum, len) : pick('0123456789', len);
      if (/^uuid/.test(j.type)) { if (j.format === 'upper') id = id.toUpperCase(); else if (j.format === 'nodash') id = id.replace(/-/g, ''); else if (j.format === 'braces') id = `{${id}}`; }
      out.push(id);
    }
    return out;
  }

  /* ── state ── */
  let fileBuf = null, fileName = '', cache = { key: null }, pending = null;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const api = mount({
    slug: 'hash-id-generator', debounce: 150,
    ready: ({ val, pill }) => (pill('seg-mode') === 'ids' ? true : fileBuf || val('text-input') ? true : 'Enter text or drop a file'),
    summary: ({ val }) => [{ hex: 'Hex', base64: 'Base64', base64url: 'Base64url' }[val('opt-enc')], val('opt-upper') && val('opt-enc') === 'hex' ? 'uppercase' : 'lowercase'].join(' · '),
    onPill: (g, { $, pill }) => { if (g.id !== 'seg-mode') return; const i = pill('seg-mode') === 'ids'; $('hash-pane').hidden = i; $('ids-pane').hidden = !i; },
    onInput: (el) => { if (el.id === 'text-input' && fileBuf) { fileBuf = null; fileName = ''; api.$('file-name').textContent = 'or drop a file here'; } },
    run: ({ val, pill, $, S, status }) => {
      const mode = pill('seg-mode') || 'hash';
      $('output-rows').hidden = mode !== 'hash'; $('output-text').hidden = mode !== 'ids';
      if (mode === 'ids') {
        const j = { type: val('id-type'), count: +val('id-count'), len: +val('id-len'), format: val('id-format'), alpha: val('opt-alpha') };
        const key = JSON.stringify(j) + '|' + val('id-decode');
        if (cache.key !== key || !cache.ids) cache = { key, ids: ids(j) };
        const list = cache.ids, dec = val('id-decode').trim() ? decodeId(val('id-decode')) : null;
        $('output-text').textContent = list.join('\n');
        $('output-rows').hidden = !dec; $('output-rows').innerHTML = dec ? `<div class="hash-row is-pass"><span class="hash-name">${dec.kind}</span><code>${dec.ms != null ? new Date(dec.ms).toISOString() + ' · ' + new Date(dec.ms).toLocaleString() : 'no timestamp inside'}</code></div>` : (val('id-decode').trim() ? '<div class="hash-row is-fail"><span class="hash-name">?</span><code>Not a UUID or ULID</code></div>' : '');
        if (val('id-decode').trim() && !dec) $('output-rows').hidden = false;
        return { text: list.join('\n'), ext: 'txt', list, badge: `${list.length.toLocaleString()} ${j.type === 'uuid4' ? 'UUID v4' : j.type === 'uuid7' ? 'UUID v7' : j.type === 'ulid' ? 'ULID' : j.type === 'nanoid' ? 'nanoid' : j.type === 'cuid' ? 'CUID' : j.type === 'short' ? 'short id' : 'code'}${list.length === 1 ? '' : 's'}`, note: 'Generated', ok: true, copyMsg: 'IDs copied' };
      }
      const j = { enc: val('opt-enc'), upper: val('opt-upper'), key: val('hash-key'), expect: val('hash-expect'), text: fileBuf ? null : val('text-input'), file: fileName, size: fileBuf ? fileBuf.length : 0 };
      const key = JSON.stringify(j) + (fileBuf ? '|file' : '');
      $('input-count').textContent = fileBuf ? `${fileName} · ${window.Toolity.formatBytes(fileBuf.length)}` : `${enc.encode(j.text).length.toLocaleString()} bytes`;
      if (cache.key === key && cache.res) {
        const r = cache.res, exp = norm(j.expect || ''), rows = r.map(([name, u]) => { const v = fmt(u, j), match = exp && (norm(v) === exp || toHex(u) === exp || norm(toB64(u)) === exp); return { name, v, match }; });
        const hit = rows.find((x) => x.match);
        $('output-rows').innerHTML = rows.map((x) => `<button type="button" class="hash-row${exp ? (x.match ? ' is-pass' : ' is-fail') : ''}" data-copy="${esc(x.v)}" title="Copy ${x.name}"><span class="hash-name">${j.key ? 'HMAC-' : ''}${x.name}</span><code>${esc(x.v)}</code>${exp ? `<iconify-icon icon="${x.match ? 'lucide:check-circle-2' : 'lucide:x-circle'}" width="16" height="16"></iconify-icon>` : ''}</button>`).join('');
        const text = rows.map((x) => `${j.key ? 'HMAC-' : ''}${x.name}  ${x.v}`).join('\n');
        return { text, ext: 'txt', rows, badge: exp ? (hit ? `Matches ${hit.name}` : 'No match') : `${rows.length} hashes`, note: exp ? (hit ? 'Checksum verified' : 'Checksum does not match') : (j.key ? 'HMAC' : 'Hashed'), ok: !exp || !!hit, copyMsg: 'Hashes copied' };
      }
      if (pending !== key) {
        pending = key; const data = fileBuf || enc.encode(j.text), k = j.key ? enc.encode(j.key) : null;
        Promise.all(ALGOS.map(async ([n, a]) => [n, await digest(a, data, k)])).then((res) => { cache = { key, res }; }, (e) => { cache = { key, res: null }; console.warn(e); }).finally(() => { if (pending === key) { pending = null; window.ToolityWebTool.run(); } });
      }
      status('Hashing…'); return S.out && S.out.rows ? Object.assign({}, S.out, { note: 'Hashing…' }) : null;
    },
    onFiles: async (files, a) => { const f = files[0]; fileBuf = new Uint8Array(await f.arrayBuffer()); fileName = f.name; a.$('text-input').value = ''; a.run(); },
    download: (fmt_, { S, pill }) => {
      if (pill('seg-mode') === 'ids') { const l = S.out.list; return fmt_ === 'json' ? { text: JSON.stringify(l, null, 2), ext: 'json', mime: 'application/json' } : fmt_ === 'csv' ? { text: 'id\n' + l.join('\n'), ext: 'csv', mime: 'text/csv' } : { text: l.join('\n'), ext: 'txt' }; }
      const r = S.out.rows; return fmt_ === 'json' ? { text: JSON.stringify(Object.fromEntries(r.map((x) => [x.name, x.v])), null, 2), ext: 'json', mime: 'application/json' } : fmt_ === 'csv' ? { text: 'algorithm,hash\n' + r.map((x) => `${x.name},${x.v}`).join('\n'), ext: 'csv', mime: 'text/csv' } : { text: S.out.text, ext: 'txt' };
    },
    filename: ({ pill }) => (pill('seg-mode') === 'ids' ? 'ids' : 'hashes'),
    onReset: ({ $ }) => { fileBuf = null; fileName = ''; cache = { key: null }; pending = null; $('output-rows').innerHTML = ''; $('output-text').textContent = ''; $('input-count').textContent = ''; $('hash-pane').hidden = false; $('ids-pane').hidden = true; }
  });
  api.$('output-rows').addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) window.Toolity.copyText(b.dataset.copy, `${b.querySelector('.hash-name').textContent} copied`); });
  window.ToolityHash = { md5: (s) => toHex(md5(enc.encode(s))), uuid7, ulid, decodeId }; // exposed for the page test
})();

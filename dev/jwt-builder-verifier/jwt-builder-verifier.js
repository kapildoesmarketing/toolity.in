/* Designed by Kapil Pidhwani: JWT Builder & Verifier on Web Crypto only. HS* = HMAC, RS* = RSASSA-PKCS1-v1_5, PS* = RSA-PSS
 * (salt = hash length), ES* = ECDSA P-256/384/521 (Web Crypto already emits the raw r||s JWS form). Keys: PKCS#8 / SPKI PEM,
 * JWK, JWKS (picked by kid, else first key with a matching alg/kty). Secrets and keys live only in DOM inputs — never stored.
 * Ceilings: no EdDSA (patchy browser support), no PKCS#1 / SEC1 PEM, no X.509, no JWE decryption. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { toast, copyText } = window.Toolity;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); const bin = atob(s); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); };
  const ALG = {
    HS256: { kind: 'HMAC', hash: 'SHA-256' }, HS384: { kind: 'HMAC', hash: 'SHA-384' }, HS512: { kind: 'HMAC', hash: 'SHA-512' },
    RS256: { kind: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, RS384: { kind: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' }, RS512: { kind: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    PS256: { kind: 'RSA-PSS', hash: 'SHA-256', salt: 32 }, PS384: { kind: 'RSA-PSS', hash: 'SHA-384', salt: 48 }, PS512: { kind: 'RSA-PSS', hash: 'SHA-512', salt: 64 },
    ES256: { kind: 'ECDSA', hash: 'SHA-256', curve: 'P-256' }, ES384: { kind: 'ECDSA', hash: 'SHA-384', curve: 'P-384' }, ES512: { kind: 'ECDSA', hash: 'SHA-512', curve: 'P-521' }
  };
  const importParams = (a) => (a.kind === 'HMAC' ? { name: 'HMAC', hash: a.hash } : a.kind === 'ECDSA' ? { name: 'ECDSA', namedCurve: a.curve } : { name: a.kind, hash: a.hash });
  const signParams = (a) => (a.kind === 'ECDSA' ? { name: 'ECDSA', hash: a.hash } : a.kind === 'RSA-PSS' ? { name: 'RSA-PSS', saltLength: a.salt } : { name: a.kind });
  const pemBody = (pem) => unb64u(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
  const toPem = (buf, label) => `-----BEGIN ${label}-----\n${btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/(.{64})/g, '$1\n').trim()}\n-----END ${label}-----`;
  const secretBytes = (s, mode) => { if (mode === 'base64') { try { return unb64u(s.trim()); } catch (e) { throw new Error('Secret is not valid base64'); } } return enc.encode(s); };

  async function importKey(material, algName, usage, secretMode, kid) {
    const a = ALG[algName]; if (!a) throw new Error(`Unsupported algorithm “${algName}”`);
    const m = material.trim();
    if (a.kind === 'HMAC') {
      if (m.startsWith('{')) { const jwk = pickJwk(JSON.parse(m), kid, algName); if (jwk.kty !== 'oct' || !jwk.k) throw new Error('HS* needs an oct JWK with “k”, or a plain secret'); return crypto.subtle.importKey('raw', unb64u(jwk.k), importParams(a), false, [usage]); }
      if (m.startsWith('-----')) throw new Error(`${algName} uses a shared secret, not a PEM key — change the algorithm or the key`);
      const bytes = secretBytes(material, secretMode); if (!bytes.length) throw new Error('Secret is empty');
      return crypto.subtle.importKey('raw', bytes, importParams(a), false, [usage]);
    }
    if (m.startsWith('{')) { const jwk = pickJwk(JSON.parse(m), kid, algName); const j = Object.assign({}, jwk); delete j.use; delete j.key_ops; delete j.alg; delete j.kid; if (usage === 'sign' && !j.d) throw new Error('This JWK is a public key — signing needs the private part (d)'); return crypto.subtle.importKey('jwk', j, importParams(a), false, [usage]).catch(() => { throw new Error(`JWK does not fit ${algName} (kty ${jwk.kty}${jwk.crv ? ', crv ' + jwk.crv : ''})`); }); }
    if (/BEGIN (RSA|EC) PRIVATE KEY/.test(m)) throw new Error('Legacy PKCS#1 / SEC1 key — convert to PKCS#8: openssl pkcs8 -topk8 -nocrypt -in key.pem');
    if (/BEGIN RSA PUBLIC KEY/.test(m)) throw new Error('PKCS#1 public key — convert to SPKI: openssl rsa -RSAPublicKey_in -in key.pem -pubout');
    if (/BEGIN CERTIFICATE/.test(m)) throw new Error('Certificates are not parsed — extract the key: openssl x509 -pubkey -noout -in cert.pem');
    if (!m.startsWith('-----')) throw new Error(usage === 'sign' ? `${algName} needs a PKCS#8 private key (-----BEGIN PRIVATE KEY-----)` : `${algName} needs a PEM public key or a JWK — a plain secret only works with HS*`);
    const isPriv = /PRIVATE KEY/.test(m);
    if (usage === 'sign' && !isPriv) throw new Error('Signing needs the private key, not the public key');
    if (usage === 'verify' && isPriv) { const k = await crypto.subtle.importKey('pkcs8', pemBody(m), importParams(a), true, ['sign']).catch(() => { throw new Error(`Private key does not fit ${algName}`); }); const jwk = await crypto.subtle.exportKey('jwk', k); delete jwk.d; delete jwk.p; delete jwk.q; delete jwk.dp; delete jwk.dq; delete jwk.qi; jwk.key_ops = ['verify']; return crypto.subtle.importKey('jwk', jwk, importParams(a), false, ['verify']); }
    return crypto.subtle.importKey(isPriv ? 'pkcs8' : 'spki', pemBody(m), importParams(a), false, [usage]).catch(() => { throw new Error(`Key does not fit ${algName} — ${a.kind === 'ECDSA' ? 'expected an EC key on ' + a.curve : 'expected an RSA key'}`); });
  }
  function pickJwk(doc, kid, algName) {
    const keys = Array.isArray(doc.keys) ? doc.keys : [doc];
    if (!keys.length) throw new Error('JWKS has no keys');
    const kty = algName.startsWith('HS') ? 'oct' : algName.startsWith('ES') ? 'EC' : 'RSA';
    const k = (kid && keys.find((x) => x.kid === kid)) || keys.find((x) => x.alg === algName) || keys.find((x) => x.kty === kty) || null;
    if (!k) throw new Error(kid ? `No key with kid “${kid}” in the JWKS` : `No ${kty} key in the JWKS`);
    return k;
  }
  async function sign(header, payload, material, secretMode) {
    const a = ALG[header.alg], key = await importKey(material, header.alg, 'sign', secretMode, header.kid);
    const input = `${b64u(enc.encode(JSON.stringify(header)))}.${b64u(enc.encode(JSON.stringify(payload)))}`;
    const sig = await crypto.subtle.sign(signParams(a), key, enc.encode(input));
    return `${input}.${b64u(sig)}`;
  }
  async function verify(token, material, secretMode) {
    const [h, p, s] = token.split('.'), header = JSON.parse(dec.decode(unb64u(h)));
    if (!ALG[header.alg]) throw new Error(header.alg === 'none' ? 'alg "none" — unsigned token' : `Unsupported alg “${header.alg}”`);
    const key = await importKey(material, header.alg, 'verify', secretMode, header.kid);
    return crypto.subtle.verify(signParams(ALG[header.alg]), key, unb64u(s), enc.encode(`${h}.${p}`));
  }
  async function generate(algName) {
    const a = ALG[algName];
    if (a.kind === 'HMAC') return { secret: b64u(crypto.getRandomValues(new Uint8Array(a.hash === 'SHA-256' ? 32 : a.hash === 'SHA-384' ? 48 : 64))) };
    const params = a.kind === 'ECDSA' ? { name: 'ECDSA', namedCurve: a.curve } : { name: a.kind, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: a.hash };
    const kp = await crypto.subtle.generateKey(params, true, ['sign', 'verify']);
    return { privatePem: toPem(await crypto.subtle.exportKey('pkcs8', kp.privateKey), 'PRIVATE KEY'), publicPem: toPem(await crypto.subtle.exportKey('spki', kp.publicKey), 'PUBLIC KEY') };
  }
  function decode(token) {
    const parts = token.trim().replace(/^Bearer\s+/i, '').split('.');
    if (parts.length === 5) { let header = null; try { header = JSON.parse(dec.decode(unb64u(parts[0]))); } catch (e) { /* noop */ } return { jwe: true, header, parts }; }
    if (parts.length !== 3) throw new Error(`A JWT has 3 dot-separated parts — found ${parts.length}`);
    let header, payload, payloadRaw;
    try { header = JSON.parse(dec.decode(unb64u(parts[0]))); } catch (e) { throw new Error('Header is not base64url JSON'); }
    try { payloadRaw = dec.decode(unb64u(parts[1])); payload = JSON.parse(payloadRaw); } catch (e) { payload = null; }
    return { header, payload, payloadRaw, parts };
  }

  /* ── rendering ── */
  const $ = (id) => document.getElementById(id), esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const TIME = { exp: 'expires', nbf: 'not before', iat: 'issued at', auth_time: 'auth time', updated_at: 'updated' };
  const rel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const relOf = (sec) => { const s = sec - Date.now() / 1000, a = Math.abs(s); return a < 90 ? rel.format(Math.round(s), 'second') : a < 5400 ? rel.format(Math.round(s / 60), 'minute') : a < 129600 ? rel.format(Math.round(s / 3600), 'hour') : a < 5184000 ? rel.format(Math.round(s / 86400), 'day') : rel.format(Math.round(s / 2592000), 'month'); };
  const cell = (k, v) => { if (TIME[k] && typeof v === 'number') return `<code>${v}</code> · ${esc(new Date(v * 1000).toLocaleString())} <span class="web-muted">(${esc(relOf(v))})</span>`; return esc(typeof v === 'string' ? v : JSON.stringify(v)); };
  const table = (id, obj) => { $(id).querySelector('tbody').innerHTML = obj && typeof obj === 'object' ? Object.entries(obj).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${cell(k, v)}</td></tr>`).join('') || '<tr><td class="is-empty" colspan="2">empty</td></tr>' : `<tr><td class="is-empty" colspan="2">${obj === null ? 'not JSON' : 'none'}</td></tr>`; };
  function render(d, flags, token) {
    $('output-token').innerHTML = d.jwe ? `<span class="jwt-h">${esc(d.parts[0])}</span>.<span class="web-muted">…encrypted (JWE)…</span>` : `<span class="jwt-h">${esc(d.parts[0])}</span>.<span class="jwt-p">${esc(d.parts[1])}</span>.<span class="jwt-s">${esc(d.parts[2])}</span>`;
    $('output-flags').innerHTML = flags.map(([c, t]) => `<span class="web-tag ${c}">${esc(t)}</span>`).join('');
    table('output-header', d.header); table('output-payload', d.jwe ? undefined : (d.payload === null ? null : d.payload));
    if (d.payload === null && d.payloadRaw) $('output-payload').querySelector('tbody').innerHTML = `<tr><th>raw</th><td>${esc(d.payloadRaw)}</td></tr>`;
  }
  function timeFlags(payload, skew) {
    const f = [], now = Date.now() / 1000; if (!payload || typeof payload !== 'object') return f;
    if (typeof payload.exp === 'number') f.push(now > payload.exp + skew ? ['fail', `Expired ${relOf(payload.exp)}`] : ['pass', `Expires ${relOf(payload.exp)}`]);
    if (typeof payload.nbf === 'number' && now < payload.nbf - skew) f.push(['warn', `Not valid until ${new Date(payload.nbf * 1000).toLocaleString()}`]);
    if (typeof payload.iat === 'number' && payload.iat > now + skew + 60) f.push(['warn', 'Issued in the future — check clocks']);
    return f;
  }

  /* ── page ── */
  let keys = { privatePem: '', publicPem: '' }, lastSig = { key: '', ok: null };
  const isHS = (alg) => alg.startsWith('HS');
  const syncAlg = () => { const hs = isHS($('jwt-alg').value); $('jwt-secret-group').hidden = !hs; $('jwt-privkey-group').hidden = hs; };
  const api = mount({
    slug: 'jwt-builder-verifier', debounce: 150, busyLabel: 'Signing…',
    ready: ({ pill, val }) => {
      if (pill('seg-mode') === 'verify') return val('jwt-token').trim() ? true : 'Paste a token';
      if (!val('jwt-payload').trim()) return 'Enter a payload';
      return (isHS(val('jwt-alg')) ? val('jwt-secret') : val('jwt-privkey').trim()) ? true : (isHS(val('jwt-alg')) ? 'Enter a secret' : 'Paste or generate a private key');
    },
    summary: ({ val }) => `${+val('opt-skew') ? val('opt-skew') + ' s' : 'No'} clock skew · ${val('opt-secret-enc') === 'base64' ? 'base64' : 'UTF-8'} secret`,
    onPill: (g, { $: q, pill }) => { if (g.id !== 'seg-mode') return; const v = pill('seg-mode') === 'verify'; q('pane-build').hidden = v; q('pane-verify').hidden = !v; },
    onInput: (el) => { if (el.id === 'jwt-alg') syncAlg(); if (el.id === 'jwt-privkey' && el.value.trim() !== keys.privatePem.trim()) keys = { privatePem: '', publicPem: '' }; },
    run: async ({ val, pill, $: q }) => {
      const skew = Math.max(0, +val('opt-skew') || 0), secMode = val('opt-secret-enc');
      if (pill('seg-mode') === 'verify') {
        const token = val('jwt-token').trim().replace(/^Bearer\s+/i, ''), d = decode(token), flags = [];
        q('output-keys').hidden = true;
        if (d.jwe) { flags.push(['warn', 'Encrypted token (JWE) — header only']); render(d, flags, token); return { text: JSON.stringify({ header: d.header }, null, 2), ext: 'txt', badge: 'JWE', note: 'Encrypted token', ok: true, decoded: { header: d.header } }; }
        if (d.header.alg === 'none') flags.push(['fail', 'alg: none — unsigned, never accept']);
        const km = val('jwt-verify-key').trim(); let sigOk = null, sigMsg = '';
        if (km && d.header.alg !== 'none') { try { sigOk = await verify(token, km, secMode); } catch (e) { sigOk = false; sigMsg = e.message; } }
        if (sigOk === true) flags.unshift(['pass', 'Signature valid']); else if (sigOk === false) flags.unshift(['fail', sigMsg ? `Cannot verify: ${sigMsg}` : 'Signature INVALID']); else if (d.header.alg !== 'none') flags.unshift(['', 'Signature unverified — add the key']);
        flags.push(...timeFlags(d.payload, skew));
        if (d.header.typ && !/^(JWT|at\+jwt|JOSE)$/i.test(d.header.typ)) flags.push(['', `typ ${d.header.typ}`]);
        if (d.header.kid) flags.push(['', `kid ${d.header.kid}`]);
        render(d, flags, token);
        const decoded = { header: d.header, payload: d.payload, signatureValid: sigOk, checks: flags.map((f) => f[1]) };
        q('jwt-token-hint').textContent = `${token.length} chars · ${d.header.alg || '?'}`;
        return { text: JSON.stringify(decoded, null, 2), ext: 'json', badge: `${d.header.alg || '?'}${sigOk === true ? ' · verified' : sigOk === false ? ' · invalid' : ''}`, note: sigOk === false ? 'Signature check failed' : flags.some((f) => f[0] === 'fail') ? flags.find((f) => f[0] === 'fail')[1] : sigOk ? 'Verified' : 'Decoded', ok: sigOk !== false && !flags.some((f) => f[0] === 'fail'), decoded, copyMsg: 'Decoded JSON copied' };
      }
      let payload; try { payload = JSON.parse(val('jwt-payload')); } catch (e) { throw new Error('Payload is not valid JSON: ' + e.message.replace(/^JSON\.parse: /, '')); }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Payload must be a JSON object');
      const alg = val('jwt-alg'), header = { alg, typ: 'JWT' }; if (val('jwt-kid').trim()) header.kid = val('jwt-kid').trim();
      const token = await sign(header, payload, isHS(alg) ? val('jwt-secret') : val('jwt-privkey'), secMode);
      const d = decode(token), flags = [['pass', `Signed with ${alg}`], ...timeFlags(payload, skew)];
      if (isHS(alg) && secretBytes(val('jwt-secret'), secMode).length < 32) flags.push(['warn', `Secret is ${secretBytes(val('jwt-secret'), secMode).length} bytes — HS256 should use ≥ 32`]);
      if (payload.exp === undefined) flags.push(['', 'No exp claim — token never expires']);
      render(d, flags, token);
      q('output-keys').hidden = !keys.publicPem; q('output-pubkey').textContent = keys.publicPem;
      return { text: token, ext: 'txt', badge: `${token.length} chars · ${alg}`, note: 'Token signed', ok: true, decoded: { header, payload }, copyMsg: 'Token copied' };
    },
    download: (f, { S, pill }) => {
      if (f === 'json') return { text: JSON.stringify(S.out.decoded, null, 2), ext: 'json', mime: 'application/json' };
      if (f === 'pem-private') { if (!keys.privatePem) return toast('Generate a key pair first'), null; return { text: keys.privatePem + '\n', name: 'private.pem' }; }
      if (f === 'pem-public') { if (!keys.publicPem) return toast('Generate a key pair first'), null; return { text: keys.publicPem + '\n', name: 'public.pem' }; }
      return { text: S.out.text, ext: pill('seg-mode') === 'verify' ? 'json' : 'txt' };
    },
    filename: ({ pill }) => (pill('seg-mode') === 'verify' ? 'jwt-decoded' : 'jwt-token'),
    onReset: ({ $: q }) => { keys = { privatePem: '', publicPem: '' }; q('pane-build').hidden = false; q('pane-verify').hidden = true; syncAlg(); q('output-keys').hidden = true; q('output-token').innerHTML = ''; q('output-flags').innerHTML = ''; q('jwt-token-hint').textContent = ''; }
  });
  syncAlg();
  /* claim chips */
  $('pane-build').addEventListener('click', (e) => {
    const b = e.target.closest('.jwt-claim'); if (!b) return;
    const ta = $('jwt-payload'); let obj = {}; try { obj = ta.value.trim() ? JSON.parse(ta.value) : {}; } catch (err) { return toast('Fix the JSON first'); }
    const now = Math.floor(Date.now() / 1000), k = b.dataset.claim;
    obj[k] = k === 'iat' || k === 'nbf' ? now : k === 'exp' ? now + 3600 : k === 'jti' ? crypto.randomUUID() : (obj[k] ?? '');
    ta.value = api.val('opt-pretty') ? JSON.stringify(obj, null, 2) : JSON.stringify(obj); ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
  });
  $('btn-gen-secret').addEventListener('click', async () => { const r = await generate($('jwt-alg').value); $('jwt-secret').value = r.secret; $('opt-secret-enc').value = 'base64'; $('jwt-secret').type = 'text'; $('jwt-secret').dispatchEvent(new Event('input', { bubbles: true })); toast('Random secret (base64url) — Settings switched to base64'); });
  $('btn-gen-keys').addEventListener('click', async () => {
    const b = $('btn-gen-keys'); b.disabled = true;
    try { keys = await generate($('jwt-alg').value); $('jwt-privkey').value = keys.privatePem; $('jwt-privkey').dispatchEvent(new Event('input', { bubbles: true })); toast('Key pair generated — public key shown in the result'); }
    catch (e) { toast('Could not generate keys: ' + e.message); } finally { b.disabled = false; }
  });
  $('output-pubkey').addEventListener('click', () => keys.publicPem && copyText(keys.publicPem, 'Public key copied'));
  window.ToolityJwt = { sign, verify, decode, generate, b64u, unb64u, api, keys: () => keys }; // for the page test
})();

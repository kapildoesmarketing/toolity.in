/* Designed by Kapil Pidhwani: Password Generator — crypto.getRandomValues with rejection sampling (no modulo bias), the
 * EFF long word list (7,776 words, fetched from this folder only when Passphrase is picked) and an entropy-based meter.
 * Ceiling: entropy is length × log2(pool) — "use every type" slightly lowers true entropy for very short passwords; the
 * upgrade is exact counting, not worth it at ≥ 8 chars. Nothing is stored anywhere. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const SETS = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', digits: '0123456789' };
  const SIMILAR = /[Il1O0o]/g;
  const GUESSES_PER_SEC = 1e10;

  const buf = new Uint32Array(64); let bi = 64;
  const rand32 = () => { if (bi >= buf.length) { crypto.getRandomValues(buf); bi = 0; } return buf[bi++]; };
  const randInt = (n) => { const lim = 2 ** 32 - (2 ** 32 % n); let x; do x = rand32(); while (x >= lim); return x % n; };
  const pick = (arr) => arr[randInt(arr.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let WORDS = null, wordsP = null;
  const loadWords = () => (wordsP = wordsP || fetch('/labs/password-generator/eff-large-wordlist.txt').then((r) => { if (!r.ok) throw new Error(); return r.text(); })
    .then((t) => { WORDS = t.split('\n').map((w) => w.trim()).filter((w) => w && w[0] !== '#'); if (WORDS.length !== 7776) throw new Error(); })
    .catch(() => { wordsP = null; WORDS = null; throw new Error('Couldn’t load the word list — check your connection and try again.'); }));

  function password(o) {
    const strip = (s) => (o.similar ? s.replace(SIMILAR, '') : s);
    const sets = [o.upper && SETS.upper, o.lower && SETS.lower, o.digits && SETS.digits, o.symbols && [...new Set(o.symset.replace(/\s/g, ''))].join('')]
      .filter(Boolean).map((s) => [...strip(s)]).filter((s) => s.length);
    if (!sets.length) throw new Error('Tick at least one character type (or add some symbols in Settings).');
    const pool = sets.flat();
    const gen = () => { const c = o.each && o.length >= sets.length ? sets.map(pick) : []; while (c.length < o.length) c.push(pick(pool)); return shuffle(c).join(''); };
    return { list: Array.from({ length: o.count }, gen), bits: o.length * Math.log2(pool.length) };
  }
  function passphrase(o) {
    const gen = () => {
      const w = Array.from({ length: o.words }, () => pick(WORDS)).map((x) => (o.cap ? x[0].toUpperCase() + x.slice(1) : x));
      if (o.num) { const i = randInt(w.length); w[i] += randInt(100); }
      return w.join(o.sep);
    };
    return { list: Array.from({ length: o.count }, gen), bits: o.words * Math.log2(WORDS.length) + (o.num ? Math.log2(100) + Math.log2(o.words) : 0) };
  }
  const pin = (o) => ({ list: Array.from({ length: o.count }, () => Array.from({ length: o.pin }, () => randInt(10)).join('')), bits: o.pin * Math.log2(10) });

  function crackTime(bits) {
    const s = 2 ** (bits - 1) / GUESSES_PER_SEC;
    if (s < 1) return 'instantly';
    const units = [['second', 60], ['minute', 60], ['hour', 24], ['day', 365], ['year', Infinity]];
    let v = s;
    for (const [u, k] of units) {
      if (v < k || u === 'year') {
        if (u === 'year' && v >= 1.4e10) return 'longer than the age of the universe';
        if (u === 'year' && v >= 1e6) return `${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 }).format(v)} years`;
        const n = Math.round(v); return `${n.toLocaleString('en')} ${u}${n === 1 ? '' : 's'}`;
      }
      v /= k;
    }
  }
  const level = (b) => (b < 40 ? ['weak', 'Weak'] : b < 60 ? ['fair', 'Fair'] : b < 80 ? ['strong', 'Strong'] : ['great', 'Very strong']);

  function opts(val, pill) {
    const n = (id, lo, hi, d) => { const x = parseInt(val(id), 10); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
    return {
      mode: pill('seg-mode') || 'password', count: n('opt-count', 1, 100, 1), length: n('opt-length', 4, 128, 20), words: n('opt-words', 3, 12, 5), pin: n('opt-pin', 4, 12, 6),
      upper: val('opt-upper'), lower: val('opt-lower'), digits: val('opt-digits'), symbols: val('opt-symbols'), symset: val('opt-symset') || '',
      similar: val('opt-similar'), each: val('opt-each'), sep: val('opt-sep'), cap: val('opt-cap'), num: val('opt-num')
    };
  }
  const showGroups = ($, mode) => ['password', 'passphrase', 'pin'].forEach((m) => { $('grp-' + m).hidden = m !== mode; });

  function present($, r) {
    const many = r.list.length > 1, list = $('output-list');
    list.classList.toggle('is-many', many);
    list.replaceChildren(...r.list.map((p, i) => {
      const d = document.createElement('div'); d.className = 'pw-item';
      d.innerHTML = '<span class="pw-text"></span><button type="button" class="web-row-btn"><iconify-icon icon="lucide:copy" width="16" height="16"></iconify-icon></button>';
      d.firstChild.textContent = p;
      const b = d.lastChild; b.title = 'Copy'; b.setAttribute('aria-label', many ? `Copy password ${i + 1}` : 'Copy password');
      b.addEventListener('click', () => window.Toolity.copyText(p, 'Copied'));
      return d;
    }));
    const bits = Math.round(r.bits), [lv, label] = level(r.bits);
    $('output-meter').dataset.level = lv;
    $('pw-bar-fill').style.width = Math.min(100, (r.bits / 128) * 100) + '%';
    $('pw-label').textContent = label;
    const t = crackTime(r.bits);
    $('pw-detail').textContent = `${bits} bits · ${t === 'instantly' ? 'cracked instantly' : t.startsWith('longer') ? `would take ${t} to crack` : `≈ ${t} to crack`} at 10 billion guesses/s`;
    return { text: r.list.join('\n'), badge: `${bits} bits`, note: `${label}${many ? ` · ${r.list.length} generated` : ''}`, ok: r.bits >= 60, copyMsg: many ? `Copied ${r.list.length} passwords` : 'Password copied' };
  }

  mount({
    slug: 'password-generator', idle: 'Generating…', busyLabel: 'Loading word list…', debounce: 60,
    summary: ({ val, pill }) => { const o = opts(val, pill); return [`${o.count} at a time`, o.mode === 'password' ? (o.similar ? 'no look-alikes' : 'all characters') : o.mode === 'passphrase' ? `${o.words} words` : `${o.pin} digits`].join(' · '); },
    onPill: (g, { $, pill }) => showGroups($, pill('seg-mode')),
    run: ({ val, pill, $ }) => {
      const o = opts(val, pill);
      showGroups($, o.mode);
      if (o.mode === 'passphrase' && !WORDS) return loadWords().then(() => present($, passphrase(o)));
      return present($, o.mode === 'password' ? password(o) : o.mode === 'passphrase' ? passphrase(o) : pin(o));
    },
    filename: () => 'passwords',
    onReset: ({ $ }) => showGroups($, 'password')
  });
  window.ToolityPassword = { randInt, crackTime }; // exposed for the page test
})();

/* Number Formats Converter — Toolity.in. Parse anything numeric (grouped digits, scientific, Roman, English words incl. lakh/crore)
 * → BigInt integer part + decimal string → every format: words in 7 languages, cheque amounts, Indian / international / European
 * grouping, compact, scientific, engineering, ordinal, Roman. Designed by Kapil Pidhwani: integers exact to 10^30 via BigInt;
 * words→number only for English (other languages are output-only); Roman numerals up to 3999 (no vinculum). */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { copyText } = window.Toolity, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ── English ── */
  const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const INTL = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion'];
  const INDIAN = [[1000n, 'thousand'], [100000n, 'lakh'], [10000000n, 'crore'], [1000000000n, 'arab'], [100000000000n, 'kharab'], [10000000000000n, 'neel'], [1000000000000000n, 'padma'], [100000000000000000n, 'shankh']];
  function en999(n, and) { n = Number(n); const h = Math.floor(n / 100), r = n % 100; let s = h ? ONES[h] + ' hundred' : ''; if (r) { if (h && and) s += ' and '; else if (h) s += ' '; s += r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : ''); } return s; }
  function enIntl(n, and) { if (n === 0n) return 'zero'; const parts = []; let i = 0; while (n > 0n) { const chunk = n % 1000n; if (chunk) parts.unshift(en999(chunk, and) + (INTL[i] ? ' ' + INTL[i] : '')); n /= 1000n; i++; } if (and && parts.length > 1) { const last = parts[parts.length - 1]; if (!/hundred|thousand|illion/.test(last)) parts[parts.length - 1] = 'and ' + last; } return parts.join(' '); }
  function enIndian(n, and) { if (n === 0n) return 'zero'; if (n >= 10n ** 19n) return enIntl(n, and); const parts = []; for (let i = INDIAN.length - 1; i >= 0; i--) { const [v, name] = INDIAN[i]; if (n >= v) { const q = n / v; parts.push(en999(q, and) + ' ' + name); n %= v; } } if (n > 0n) { const last = en999(n, and); parts.push(and && parts.length && n < 100n ? 'and ' + last : last); } return parts.join(' '); }
  /* ── Hindi ── */
  const HI = 'शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चौवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उनासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे'.split(' ');
  const HI_SCALE = [[1000n, 'हज़ार'], [100000n, 'लाख'], [10000000n, 'करोड़'], [1000000000n, 'अरब'], [100000000000n, 'खरब'], [10000000000000n, 'नील'], [1000000000000000n, 'पद्म'], [100000000000000000n, 'शंख']];
  const hi999 = (n) => { n = Number(n); const h = Math.floor(n / 100), r = n % 100; return (h ? HI[h] + ' सौ' : '') + (r ? (h ? ' ' : '') + HI[r] : ''); };
  function hindi(n) { if (n === 0n) return HI[0]; if (n >= 10n ** 19n) return enIntl(n, false); const parts = []; for (let i = HI_SCALE.length - 1; i >= 0; i--) { const [v, name] = HI_SCALE[i]; if (n >= v) { parts.push(hi999(n / v) + ' ' + name); n %= v; } } if (n > 0n) parts.push(hi999(n)); return parts.join(' '); }
  /* ── Spanish ── */
  const ES_U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const ES_T = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'], ES_H = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  function es999(n, apoc) { n = Number(n); if (n === 100) return 'cien'; const h = Math.floor(n / 100), r = n % 100; let s = ES_H[h]; let t = r < 30 ? ES_U[r] : ES_T[Math.floor(r / 10)] + (r % 10 ? ' y ' + ES_U[r % 10] : ''); if (apoc) t = t.replace(/uno$/, 'un'); return [s, t].filter(Boolean).join(' '); }
  function spanish(n) { if (n === 0n) return 'cero'; const groups = [[10n ** 12n, 'billón', 'billones'], [10n ** 6n, 'millón', 'millones']]; const parts = []; for (const [v, s1, sp] of groups) if (n >= v) { const q = n / v; parts.push(q === 1n ? 'un ' + s1 : thousandsEs(q, true) + ' ' + sp); n %= v; } if (n > 0n) parts.push(thousandsEs(n, false)); return parts.join(' '); function thousandsEs(m, apoc) { const th = m / 1000n, r = m % 1000n; let s = ''; if (th > 0n) s = (th === 1n ? '' : es999(th, true) + ' ') + 'mil'; if (r > 0n) s += (s ? ' ' : '') + es999(r, apoc); return s; } }
  /* ── French ── */
  const FR_U = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'], FR_T = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  function fr99(n) { if (n < 20) return FR_U[n]; let t = Math.floor(n / 10), u = n % 10; if (t === 7 || t === 9) { u += 10; } let s = FR_T[t]; if (t === 8 && u === 0) return 'quatre-vingts'; if (u === 0) return s; if ((u === 1 || u === 11) && t !== 8 && t !== 9) return s + ' et ' + FR_U[u]; return s + '-' + FR_U[u]; }
  function fr999(n) { n = Number(n); const h = Math.floor(n / 100), r = n % 100; let s = h ? (h === 1 ? 'cent' : FR_U[h] + ' cent') : ''; if (h > 1 && r === 0) s += 's'; return [s, r ? fr99(r) : ''].filter(Boolean).join(' '); }
  function french(n) { if (n === 0n) return 'zéro'; const groups = [[10n ** 12n, 'billion', 'billions'], [10n ** 9n, 'milliard', 'milliards'], [10n ** 6n, 'million', 'millions'], [1000n, 'mille', 'mille']]; const parts = []; for (const [v, s1, sp] of groups) if (n >= v) { const q = n / v; parts.push(v === 1000n && q === 1n ? 'mille' : fr999(q) + ' ' + (q > 1n ? sp : s1)); n %= v; } if (n > 0n) parts.push(fr999(n)); return parts.join(' '); }
  /* ── German ── */
  const DE_U = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'], DE_T = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
  function de999(n, final) { n = Number(n); const h = Math.floor(n / 100), r = n % 100; let s = h ? DE_U[h] + 'hundert' : ''; if (r) { if (r < 20) s += r === 1 && final ? 'eins' : DE_U[r]; else s += (r % 10 ? DE_U[r % 10] + 'und' : '') + DE_T[Math.floor(r / 10)]; } return s; }
  function german(n) { if (n === 0n) return 'null'; const groups = [[10n ** 12n, 'Billion', 'Billionen'], [10n ** 9n, 'Milliarde', 'Milliarden'], [10n ** 6n, 'Million', 'Millionen']]; const parts = []; for (const [v, s1, sp] of groups) if (n >= v) { const q = n / v; parts.push((q === 1n ? 'eine' : de999(q, false)) + ' ' + (q === 1n ? s1 : sp)); n %= v; } let tail = ''; if (n >= 1000n) { tail += (n / 1000n === 1n ? 'ein' : de999(n / 1000n, false)) + 'tausend'; n %= 1000n; } if (n > 0n) tail += de999(n, true); if (tail) parts.push(tail); return parts.join(' '); }
  /* ── Portuguese (BR) ── */
  const PT_U = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'], PT_T = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'], PT_H = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  function pt999(n) { n = Number(n); if (n === 100) return 'cem'; const h = Math.floor(n / 100), r = n % 100; const t = r < 20 ? PT_U[r] : PT_T[Math.floor(r / 10)] + (r % 10 ? ' e ' + PT_U[r % 10] : ''); return [PT_H[h], t].filter(Boolean).join(' e '); }
  function portuguese(n) { if (n === 0n) return 'zero'; const groups = [[10n ** 12n, 'trilhão', 'trilhões'], [10n ** 9n, 'bilhão', 'bilhões'], [10n ** 6n, 'milhão', 'milhões'], [1000n, 'mil', 'mil']]; const parts = []; for (const [v, s1, sp] of groups) if (n >= v) { const q = n / v; parts.push(v === 1000n && q === 1n ? 'mil' : pt999(q) + ' ' + (q > 1n ? sp : s1)); n %= v; } if (n > 0n) { const last = pt999(n); parts.push(parts.length && (n < 100n || n % 100n === 0n) ? 'e ' + last : last); } return parts.join(' '); }
  const WORDS = { en: (n, o) => enIntl(n, o.and), 'en-IN': (n, o) => enIndian(n, o.and), hi: (n) => hindi(n), es: (n) => spanish(n), fr: (n) => french(n), de: (n) => german(n), pt: (n) => portuguese(n) };
  const CUR = { INR: { en: ['rupee', 'rupees', 'paisa', 'paise'], hi: ['रुपया', 'रुपये', 'पैसा', 'पैसे'], es: ['rupia', 'rupias', 'paisa', 'paise'], fr: ['roupie', 'roupies', 'paisa', 'paise'], de: ['Rupie', 'Rupien', 'Paisa', 'Paise'], pt: ['rupia', 'rupias', 'paisa', 'paise'] }, USD: { en: ['dollar', 'dollars', 'cent', 'cents'], hi: ['डॉलर', 'डॉलर', 'सेंट', 'सेंट'], es: ['dólar', 'dólares', 'centavo', 'centavos'], fr: ['dollar', 'dollars', 'cent', 'cents'], de: ['Dollar', 'Dollar', 'Cent', 'Cent'], pt: ['dólar', 'dólares', 'centavo', 'centavos'] }, EUR: { en: ['euro', 'euros', 'cent', 'cents'], hi: ['यूरो', 'यूरो', 'सेंट', 'सेंट'], es: ['euro', 'euros', 'céntimo', 'céntimos'], fr: ['euro', 'euros', 'centime', 'centimes'], de: ['Euro', 'Euro', 'Cent', 'Cent'], pt: ['euro', 'euros', 'cêntimo', 'cêntimos'] }, GBP: { en: ['pound', 'pounds', 'penny', 'pence'], hi: ['पाउंड', 'पाउंड', 'पेनी', 'पेंस'], es: ['libra', 'libras', 'penique', 'peniques'], fr: ['livre', 'livres', 'penny', 'pence'], de: ['Pfund', 'Pfund', 'Penny', 'Pence'], pt: ['libra', 'libras', 'pêni', 'pence'] }, AED: { en: ['dirham', 'dirhams', 'fils', 'fils'], hi: ['दिरहम', 'दिरहम', 'फ़िल्स', 'फ़िल्स'], es: ['dírham', 'dírhams', 'fils', 'fils'], fr: ['dirham', 'dirhams', 'fils', 'fils'], de: ['Dirham', 'Dirham', 'Fils', 'Fils'], pt: ['dirham', 'dirhams', 'fils', 'fils'] } };

  /* ── Parsing ── */
  const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  const toRoman = (n) => { if (n <= 0n || n > 3999n) return ''; let x = Number(n), s = ''; for (const [v, r] of ROMAN) while (x >= v) { s += r; x -= v; } return s; };
  const fromRoman = (s) => { if (!/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(s) || !s) return null; const m = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let t = 0; const u = s.toUpperCase(); for (let i = 0; i < u.length; i++) t += m[u[i]] < (m[u[i + 1]] || 0) ? -m[u[i]] : m[u[i]]; return t; };
  const WORD_VAL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, a: 1, an: 1 };
  const SCALE_VAL = { hundred: 100n, thousand: 1000n, lakh: 100000n, lac: 100000n, lakhs: 100000n, crore: 10000000n, crores: 10000000n, arab: 1000000000n, kharab: 100000000000n, million: 1000000n, billion: 1000000000n, trillion: 1000000000000n, quadrillion: 10n ** 15n, quintillion: 10n ** 18n, k: 1000n, m: 1000000n, mn: 1000000n, bn: 1000000000n, b: 1000000000n, cr: 10000000n, l: 100000n };
  function fromWords(text) {
    const t = text.toLowerCase().replace(/-/g, ' ').replace(/\band\b|,|only|rupees?|dollars?|euros?|pounds?/g, ' ').trim(); if (!t) return null;
    const [ip, dp] = t.split(/\bpoint\b/); const toks = ip.trim().split(/\s+/).filter(Boolean); if (!toks.length) return null;
    let total = 0n, cur = 0n, seen = false, lead = null;
    for (const w of toks) {
      if (/^\d+(\.\d+)?$/.test(w)) { if (w.includes('.')) { lead = w; cur = 0n; } else cur += BigInt(w); seen = true; continue; }
      if (WORD_VAL[w] !== undefined) { cur += BigInt(WORD_VAL[w]); seen = true; continue; }
      if (SCALE_VAL[w]) { const v = SCALE_VAL[w]; if (lead) { const [a, b] = lead.split('.'); const frac = BigInt(b) * v / 10n ** BigInt(b.length); total += BigInt(a) * v + frac; lead = null; cur = 0n; seen = true; continue; } if (v === 100n) cur = (cur || 1n) * 100n; else { total += (cur || 1n) * v; cur = 0n; } seen = true; continue; }
      return null;
    }
    if (lead) return null;
    total += cur; if (!seen) return null;
    let dec = ''; if (dp) { for (const w of dp.trim().split(/\s+/)) { if (/^\d$/.test(w)) dec += w; else if (WORD_VAL[w] !== undefined && WORD_VAL[w] < 10) dec += WORD_VAL[w]; else return null; } }
    return { neg: false, int: total, dec };
  }
  function parse(raw) {
    let s = String(raw).trim(); if (!s) return null;
    const neg = /^[-−]/.test(s); s = s.replace(/^[-−+]\s*/, '');
    if (/^[ivxlcdm]+$/i.test(s)) { const r = fromRoman(s); return r !== null ? { neg, int: BigInt(r), dec: '', roman: true } : null; }
    let m = s.replace(/[₹$€£,\s_']/g, '').match(/^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/); // plain / grouped / scientific
    if (!m && /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) { const [i, d] = s.split(','); m = [null, i.replace(/\./g, ''), d || '']; } // European 1.234.567,89
    else if (!m && /^\d+,\d+$/.test(s.replace(/\s/g, ''))) { const [i, d] = s.replace(/\s/g, '').split(','); m = [null, i, d]; }
    if (m) { let int = m[1], dec = m[2] || '', e = m[3] ? +m[3] : 0; if (e > 0) { const move = dec.slice(0, e).padEnd(e, '0'); int = (int + move).replace(/^0+(?=\d)/, ''); dec = dec.slice(e); } else if (e < 0) { const k = -e; const all = int.padStart(k + 1, '0'); dec = all.slice(all.length - k) + dec; int = all.slice(0, all.length - k).replace(/^0+(?=\d)/, '') || '0'; } dec = dec.replace(/0+$/, ''); return { neg, int: BigInt(int), dec }; }
    const w = fromWords(s); return w ? { ...w, neg } : null;
  }

  /* ── Formatting ── */
  const groupIntl = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const groupIndian = (s) => { if (s.length <= 3) return s; const last = s.slice(-3), rest = s.slice(0, -3); return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last; };
  const decOut = (dec, opt) => (opt === 'auto' ? dec : (dec + '000').slice(0, +opt));
  const withDec = (intStr, dec, sep = '.') => (dec ? intStr + sep + dec : intStr);
  const compact = (n, dec, scales) => { const v = Number(n) + Number('0.' + (dec || '0')); for (const [k, u] of scales) if (v >= k) return (v / k).toLocaleString(undefined, { maximumFractionDigits: 2 }) + u; return v.toLocaleString(undefined, { maximumFractionDigits: 2 }); };
  const sci = (n, dec) => { const digits = (n.toString() + dec).replace(/^0+/, ''); if (!digits) return '0'; const exp = n > 0n ? n.toString().length - 1 : -(dec.length - dec.replace(/^0+/, '').length + 1); const mant = digits[0] + (digits.length > 1 ? '.' + digits.slice(1, 10).replace(/0+$/, '') : ''); return { mant: mant.replace(/\.$/, ''), exp }; };
  const ordinal = (n) => { const s = n.toString(), last2 = Number(s.slice(-2)), last = Number(s.slice(-1)); const suf = last2 >= 11 && last2 <= 13 ? 'th' : last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'; return groupIntl(s) + suf; };
  const ordinalWords = (w) => { const parts = w.split(' '); let last = parts.pop(); const irregular = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' }; const sub = last.split('-'); const tail = sub.pop(); const conv = irregular[tail] || (tail.endsWith('y') ? tail.slice(0, -1) + 'ieth' : tail + 'th'); sub.push(conv); parts.push(sub.join('-')); return parts.join(' '); };
  const caseIt = (s, mode) => (mode === 'upper' ? s.toUpperCase() : mode === 'lower' ? s.toLowerCase() : mode === 'sentence' ? s.charAt(0).toUpperCase() + s.slice(1) : s.replace(/(^|\s|-)(\p{L})/gu, (m, p, c) => p + c.toUpperCase()));
  function amountWords(p, lang, cur, o) {
    if (cur === 'none' || !CUR[cur]) return '';
    const names = CUR[cur][lang.startsWith('en') ? 'en' : lang], major = WORDS[lang](p.int, o), sub = Math.round(Number('0.' + (p.dec || '0')) * 100);
    const subW = sub ? WORDS[lang](BigInt(sub), o) : '';
    let s;
    if (lang === 'hi') s = `${major} ${p.int === 1n ? names[0] : names[1]}${sub ? ` और ${subW} ${names[3]}` : ''}${o.only ? ' मात्र' : ''}`;
    else if (lang === 'en-IN' || lang === 'en') s = `${names[1].charAt(0).toUpperCase() + names[1].slice(1)} ${major}${sub ? ` and ${subW} ${sub === 1 ? names[2] : names[3]}` : ''}${o.only ? ' only' : ''}`;
    else { const and = { es: 'con', fr: 'et', de: 'und', pt: 'e' }[lang]; s = `${major} ${p.int === 1n ? names[0] : names[1]}${sub ? ` ${and} ${subW} ${sub === 1 ? names[2] : names[3]}` : ''}`; }
    return s;
  }
  function formats(p, o) {
    const neg = p.neg ? '-' : '', negW = p.neg ? 'minus ' : '', intS = p.int.toString(), dec = decOut(p.dec, o.decOpt);
    const POINT = { hi: 'दशमलव', es: 'punto', fr: 'virgule', de: 'Komma', pt: 'vírgula' }[o.lang] || 'point';
    const wordsMain = (p.int >= 10n ** 31n) ? '' : WORDS[o.lang](p.int, o) + (p.dec ? ` ${POINT} ` + p.dec.split('').map((d) => (o.lang === 'hi' ? HI[+d] : o.lang === 'en' || o.lang === 'en-IN' ? (ONES[+d] || 'zero') : d)).join(' ') : '');
    const sc = sci(p.int, p.dec), e3 = Math.floor(sc.exp / 3) * 3, engM = (Number(sc.mant) * 10 ** (sc.exp - e3)).toPrecision(4).replace(/\.?0+$/, '');
    const rows = [
      ['Words', caseIt(negW + wordsMain, o.caseMode), `words-${o.lang}`],
      o.lang !== 'en-IN' ? ['Words · Indian English', caseIt(negW + enIndian(p.int, o.and) + (p.dec ? ' point ' + p.dec.split('').map((d) => ONES[+d] || 'zero').join(' ') : ''), o.caseMode), 'words-en-IN'] : null,
      o.lang !== 'en' ? ['Words · International English', caseIt(negW + enIntl(p.int, o.and) + (p.dec ? ' point ' + p.dec.split('').map((d) => ONES[+d] || 'zero').join(' ') : ''), o.caseMode), 'words-en'] : null,
      ['Amount in words', caseIt(amountWords(p, o.lang, o.cur, o), o.caseMode), 'amount'],
      ['Indian grouping', neg + withDec(groupIndian(intS), dec), 'indian'],
      ['International grouping', neg + withDec(groupIntl(intS), dec), 'intl'],
      ['European (1.234,56)', neg + withDec(groupIntl(intS).replace(/,/g, '.'), dec, ','), 'eu'],
      ['SI spacing', neg + withDec(groupIntl(intS).replace(/,/g, '\u202f'), dec), 'si'],
      ['Compact · Indian', neg + compact(p.int, p.dec, [[1e7, ' Cr'], [1e5, ' L'], [1e3, ' K']]), 'compact-in'],
      ['Compact · International', neg + compact(p.int, p.dec, [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]), 'compact'],
      ['Scientific', `${neg}${sc.mant}e${sc.exp >= 0 ? '+' : ''}${sc.exp}`, 'sci'],
      ['Engineering', `${neg}${engM} × 10^${e3}`, 'eng'],
      !p.dec && p.int > 0n ? ['Ordinal', `${ordinal(p.int)} · ${caseIt(ordinalWords(o.lang === 'en-IN' ? enIndian(p.int, o.and) : enIntl(p.int, o.and)), o.caseMode)}`, 'ordinal'] : null,
      !p.dec && !p.neg && p.int > 0n && p.int <= 3999n ? ['Roman numeral', toRoman(p.int), 'roman'] : null,
      !p.dec && !p.neg ? ['Binary · Hex', `${p.int.toString(2)} · 0x${p.int.toString(16).toUpperCase()}`, 'base'] : null
    ].filter(Boolean);
    return rows;
  }
  const opts = ({ val }) => ({ lang: val('opt-lang'), cur: val('opt-currency'), caseMode: val('opt-case'), only: val('opt-only'), and: val('opt-and'), decOpt: val('opt-dec') });
  let last = null;
  mount({
    slug: 'number-formats-converter', debounce: 120,
    ready: ({ val }) => (val('text-input').trim() ? true : 'Type a number to begin'),
    summary: ({ val }) => `${{ title: 'Title case', lower: 'lower case', upper: 'UPPER CASE', sentence: 'Sentence case' }[val('opt-case')]} · ${val('opt-only') ? '“only” suffix' : 'no suffix'} · ${val('opt-dec') === 'auto' ? 'decimals as typed' : val('opt-dec') + ' decimals'}`,
    run(api) {
      const o = opts(api), lines = api.val('text-input').split('\n').map((l) => l.trim()).filter(Boolean), parsed = lines.map((l) => [l, parse(l)]), bad = parsed.filter(([, p]) => !p);
      if (lines.length === 1 && !parsed[0][1]) throw new Error('Could not read that as a number. Try digits (12,34,567.89), 1.5e6, a Roman numeral or English words like “two lakh fifty thousand”.');
      $('input-count').textContent = `${lines.length} value${lines.length === 1 ? '' : 's'}${bad.length ? ` · ${bad.length} unreadable` : ''}`;
      const first = parsed.find(([, p]) => p), rows = first ? formats(first[1], o) : [];
      $('nf-table').querySelector('tbody').innerHTML = rows.map(([k, v, id]) => `<tr><th scope="row">${k}</th><td><span>${esc(v)}</span><button type="button" class="web-row-btn nf-copy" data-v="${esc(v)}" aria-label="Copy ${esc(k)}"><iconify-icon icon="lucide:copy" width="14" height="14"></iconify-icon></button></td></tr>`).join('');
      $('nf-note').textContent = lines.length > 1 ? `Showing formats for the first value (${first[0]}); Download → CSV has all ${lines.length}.` : first[1].roman ? 'Read as a Roman numeral.' : first[1].int >= 10n ** 31n ? 'Beyond 10³⁰ words are not produced; grouping and notation still are.' : '';
      last = { o, parsed, rows };
      const words = rows[0] ? rows[0][1] : '';
      return { text: words, ext: 'txt', badge: `${rows.length} formats`, note: `${first[1].neg ? 'Negative · ' : ''}${first[1].int.toString().length} digit${first[1].int.toString().length === 1 ? '' : 's'}${first[1].dec ? ` · ${first[1].dec.length} decimal${first[1].dec.length === 1 ? '' : 's'}` : ''} · Copy = words`, ok: true, copyMsg: 'Words copied' };
    },
    async download(fmt) { if (!last) return null; if (fmt === 'csv') { const heads = ['input', ...formats(last.parsed.find(([, p]) => p)[1], last.o).map((r) => r[2])]; const lines = last.parsed.map(([raw, p]) => [raw, ...(p ? formats(p, last.o).map((r) => r[1]) : [])].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')); return { text: heads.join(',') + '\n' + lines.join('\n') + '\n', mime: 'text/csv', ext: 'csv' }; } return { text: last.rows.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n', ext: 'txt' }; },
    filename: () => 'number-formats',
    onReset() { last = null; $('nf-table').querySelector('tbody').innerHTML = ''; $('nf-note').textContent = ''; }
  });
  $('nf-table').addEventListener('click', (e) => { const b = e.target.closest('.nf-copy'); if (b) copyText(b.dataset.v, 'Copied'); });
  window.__nf = { parse, formats, enIntl, enIndian, hindi, spanish, french, german, portuguese, toRoman, fromRoman, fromWords, groupIndian, ordinal };
})();

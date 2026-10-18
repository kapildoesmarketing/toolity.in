/* Designed by Kapil Pidhwani: Readability Scorer — pure JS, English heuristics. Sentences split on . ! ? and blank lines
 * (abbreviations like "e.g." and "Dr." are protected); syllables from a vowel-group counter with silent-e / -le / -ed
 * fixes (±1 on unusual words); passive voice = be-verb + participle (a heuristic, labelled "possible"). HTML and
 * Markdown are stripped to text first. Ceiling: English only; no proper-noun exclusion for complex words. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const ABBR = /\b(e\.g|i\.e|etc|vs|dr|mr|mrs|ms|prof|sr|jr|st|no|fig|inc|ltd|co|approx|dept|est|min|max|u\.s|u\.k)\./gi;
  const IRREGULAR = /^(been|born|brought|built|bought|caught|chosen|come|cut|done|drawn|driven|eaten|fallen|felt|found|forgotten|given|gone|grown|had|heard|held|hidden|hit|kept|known|laid|led|left|lent|let|lost|made|meant|met|paid|put|read|run|said|seen|sent|set|shown|shut|sold|sent|spent|spoken|stolen|struck|sung|taken|taught|thought|told|understood|worn|won|written)$/i;
  const NOT_ADVERB = new Set(['only', 'family', 'early', 'likely', 'reply', 'apply', 'supply', 'ally', 'fly', 'july', 'italy', 'belly', 'bully', 'holy', 'ugly', 'silly', 'rally', 'jelly', 'lonely', 'friendly', 'lovely', 'daily', 'weekly', 'monthly', 'yearly', 'lily', 'rely', 'imply', 'multiply', 'comply', 'bodily', 'elderly', 'costly', 'deadly', 'orderly', 'assembly', 'anomaly', 'butterfly', 'ply', 'sly', 'fully', 'oily', 'hilly', 'chilly', 'smelly', 'wobbly', 'bubbly', 'gully', 'melancholy', 'homily', 'tally', 'folly', 'dolly', 'jolly']);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function plain(src) {
    let t = src;
    if (/<\/?[a-z][\s\S]*>/i.test(t) && /<(p|div|h[1-6]|li|br|body|html|span|a)\b/i.test(t)) { const d = new DOMParser().parseFromString(t, 'text/html'); d.querySelectorAll('script,style,noscript').forEach((n) => n.remove()); d.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,br,tr').forEach((n) => n.append('\n')); t = d.body.textContent; }
    return t.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^\s{0,3}(#{1,6}|[-*+]|\d+\.|>)\s+/gm, '').replace(/[*_~]{1,3}([^*_~\n]+)[*_~]{1,3}/g, '$1').replace(/^\s*[-=*_]{3,}\s*$/gm, '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  }
  function sentences(t) {
    const guarded = t.replace(ABBR, (m) => m.replace('.', '\u0000')).replace(/(\d)\.(\d)/g, '$1\u0000$2');
    return guarded.split(/(?<=[.!?]["”’)\]]*)\s+(?=["“‘(\[]?[A-Z0-9])|\n+/).map((s) => s.replace(/\u0000/g, '.').trim()).filter((s) => /[a-z0-9]/i.test(s));
  }
  const words = (s) => s.match(/[A-Za-z0-9’'][A-Za-z0-9’'-]*/g) || [];
  function syllables(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|[^laeiouytd]ed|[^laeiouy]e)$/, '').replace(/^y/, ''); // silent endings; "-le" after a consonant keeps its syllable
    let n = (w.match(/[aeiouy]{1,2}/g) || []).length;
    n += (w.match(/(?:ia|io|ua|uo)/g) || []).length - (w.match(/tion|sion|cious|tious|geous|eau/g) || []).length; // pi-a-no, vi-o-lin vs na-tion, beau-ty
    return Math.max(1, n);
  }
  function passive(s) { // → html with <mark class="rd-passive"> around be + participle
    return s.replace(/\b((?:am|is|are|was|were|be|been|being|get|got|gets|getting)(?:\s+(?:not|also|often|always|never|still|being|already|just|only|usually|rarely|[a-z]+ly))?)\s+([A-Za-z]+(?:ed|en)|[A-Za-z]+)\b(?=\s*(?:by\b|[,.;:!?]|$|\s+[a-z]))/g, (m, be, verb) => (/ed$|en$/.test(verb) && !/^(?:even|open|often|been|seen|then|when|golden|wooden|sudden|hidden|children|women|men|garden|kitchen|seven|eleven|ten|green|between|broken)$/i.test(verb) && verb.length > 3) || IRREGULAR.test(verb) ? `<mark class="rd-passive" title="Possible passive voice">${m}</mark>` : m);
  }
  const adverbs = (html) => html.replace(/\b([A-Za-z]{4,}ly)\b/g, (m) => (NOT_ADVERB.has(m.toLowerCase()) ? m : `<mark class="rd-adverb" title="Adverb">${m}</mark>`));
  const grade = (g) => (g < 1 ? 'K' : g > 18 ? '18+' : String(Math.round(g)));
  const band = (f) => (f >= 90 ? ['Very easy', '5th grade'] : f >= 80 ? ['Easy', '6th grade'] : f >= 70 ? ['Fairly easy', '7th grade'] : f >= 60 ? ['Plain English', '8th–9th grade'] : f >= 50 ? ['Fairly hard', '10th–12th grade'] : f >= 30 ? ['Hard', 'College'] : ['Very hard', 'Graduate']);
  const fmtMin = (m) => (m < 1 ? '< 1 min' : m < 60 ? `${Math.ceil(m)} min` : `${Math.floor(m / 60)} h ${Math.round(m % 60)} min`);

  function analyse(text, j) {
    const S = sentences(text), W = S.flatMap(words), P = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const nW = W.length, nS = Math.max(1, S.length), syl = W.map(syllables), nSyl = syl.reduce((a, b) => a + b, 0), complex = syl.filter((n) => n >= 3).length;
    const letters = W.reduce((a, w) => a + w.replace(/[^A-Za-z0-9]/g, '').length, 0);
    const wps = nW / nS, spw = nW ? nSyl / nW : 0;
    const fre = 206.835 - 1.015 * wps - 84.6 * spw, fk = 0.39 * wps + 11.8 * spw - 15.59, fog = 0.4 * (wps + 100 * (nW ? complex / nW : 0));
    const smog = 1.043 * Math.sqrt(complex * (30 / nS)) + 3.1291, cli = nW ? 0.0588 * (letters / nW * 100) - 0.296 * (nS / nW * 100) - 15.8 : 0, ari = nW ? 4.71 * (letters / nW) + 0.5 * wps - 21.43 : 0;
    const grades = [fk, fog, smog, cli, ari].sort((a, b) => a - b), consensus = grades[2];
    const longS = S.filter((s) => words(s).length > 25).length, veryLong = S.filter((s) => words(s).length > 40).length;
    let passives = 0, advs = 0;
    const html = S.map((s) => {
      const n = words(s).length; let h = esc(s);
      if (j.passive) { const before = h; h = passive(h); if (h !== before) passives += (h.match(/rd-passive/g) || []).length; }
      if (j.adverb) { h = adverbs(h); advs += (h.match(/rd-adverb/g) || []).length; }
      const cls = j.long && n > 40 ? ' rd-vlong' : j.long && n > 25 ? ' rd-long' : '';
      return `<span class="rd-s${cls}"${cls ? ` title="${n} words"` : ''}>${h}</span>`;
    }).join(' ');
    return { nW, nS: S.length, P, nSyl, complex, letters, wps, spw, fre, fk, fog, smog, cli, ari, consensus, longS, veryLong, passives, advs, html, readMin: nW / j.wpm, speakMin: nW / 130 };
  }
  const card = (label, value, sub) => `<div class="web-stat"><span>${label}</span><strong>${value}</strong>${sub ? `<span class="web-muted">${sub}</span>` : ''}</div>`;
  const report = (r) => [`Readability report`, ``, `Flesch Reading Ease: ${r.fre.toFixed(1)} (${band(r.fre)[0]})`, `Flesch-Kincaid grade: ${r.fk.toFixed(1)}`, `Gunning Fog: ${r.fog.toFixed(1)}`, `SMOG: ${r.smog.toFixed(1)}`, `Coleman-Liau: ${r.cli.toFixed(1)}`, `ARI: ${r.ari.toFixed(1)}`, `Consensus grade: ${grade(r.consensus)}`, ``, `Words: ${r.nW}`, `Sentences: ${r.nS}`, `Paragraphs: ${r.P}`, `Syllables: ${r.nSyl}`, `Complex words (3+ syllables): ${r.complex} (${r.nW ? Math.round(r.complex / r.nW * 100) : 0}%)`, `Average words per sentence: ${r.wps.toFixed(1)}`, `Average syllables per word: ${r.spw.toFixed(2)}`, `Long sentences (>25 words): ${r.longS}`, `Possible passive voice: ${r.passives}`, `Adverbs: ${r.advs}`, `Reading time: ${fmtMin(r.readMin)} · Speaking time: ${fmtMin(r.speakMin)}`].join('\n');

  mount({
    slug: 'readability-scorer', debounce: 250,
    ready: ({ val }) => (val('text-input').trim() ? true : 'Paste text to score'),
    summary: ({ val }) => [val('opt-long') ? 'Long sentences' : null, val('opt-passive') ? 'passive' : null, val('opt-adverb') ? 'adverbs' : null, `${val('opt-wpm')} wpm`].filter(Boolean).join(' · '),
    run: ({ $, val }) => {
      const text = plain(val('text-input')), j = { long: val('opt-long'), passive: val('opt-passive'), adverb: val('opt-adverb'), wpm: +val('opt-wpm') };
      if (!text) throw new Error('No readable text found after stripping markup.');
      const r = analyse(text, j), [bandName, bandGrade] = band(r.fre);
      $('input-count').textContent = `${r.nW.toLocaleString()} words · ${r.nS.toLocaleString()} sentences`;
      $('output-fre').innerHTML = `<div class="rd-fre-score"><b>${Math.max(0, Math.min(100, r.fre)).toFixed(0)}</b><span>Flesch Reading Ease</span></div><div class="rd-fre-band"><strong>${bandName}</strong><span>${bandGrade} · consensus grade ${grade(r.consensus)}</span><span class="web-muted">${fmtMin(r.readMin)} read · ${fmtMin(r.speakMin)} spoken</span></div>`;
      $('output-fre').dataset.band = r.fre >= 60 ? 'good' : r.fre >= 30 ? 'mid' : 'bad';
      $('output-scores').innerHTML = [card('Flesch-Kincaid', grade(r.fk), 'grade'), card('Gunning Fog', grade(r.fog), 'grade'), card('SMOG', grade(r.smog), 'grade'), card('Coleman-Liau', grade(r.cli), 'grade'), card('ARI', grade(r.ari), 'grade'), card('Consensus', grade(r.consensus), 'US grade')].join('');
      $('output-counts').innerHTML = [card('Words', r.nW.toLocaleString()), card('Sentences', r.nS.toLocaleString(), `${r.wps.toFixed(1)} words avg`), card('Syllables', r.nSyl.toLocaleString(), `${r.spw.toFixed(2)} per word`), card('Complex words', `${r.nW ? Math.round(r.complex / r.nW * 100) : 0}%`, `${r.complex} with 3+ syllables`), card('Long sentences', r.longS, `${r.veryLong} over 40 words`), card('Passive · adverbs', `${r.passives} · ${r.advs}`, 'possible')].join('');
      $('rd-legend').innerHTML = [j.long && '<span class="rd-key rd-key-long">Long sentence</span>', j.passive && '<span class="rd-key rd-key-passive">Possible passive</span>', j.adverb && '<span class="rd-key rd-key-adverb">Adverb</span>'].filter(Boolean).join('');
      $('output-highlight').innerHTML = r.html;
      return { text: report(r), ext: 'txt', res: r, badge: `FRE ${r.fre.toFixed(0)} · grade ${grade(r.consensus)} · ${fmtMin(r.readMin)}`, note: `${bandName} to read`, ok: r.fre >= 60, copyMsg: 'Report copied' };
    },
    download: (fmt, { S }) => { const r = S.out.res; return fmt === 'json' ? { text: JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'html').map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(3) : v])), null, 2), ext: 'json', mime: 'application/json' } : { text: S.out.text, ext: 'txt' }; },
    filename: () => 'readability-report',
    onReset: ({ $ }) => { ['output-fre', 'output-scores', 'output-counts', 'rd-legend', 'output-highlight'].forEach((id) => { $(id).innerHTML = ''; }); $('input-count').textContent = ''; }
  });
})();

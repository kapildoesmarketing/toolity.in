/* Designed by Kapil Pidhwani: Typing Speed Test — 200-word curated English bank (no network dictionary; ceiling:
 * fixed vocabulary, shuffled per run). Net WPM = (correct chars / 5) / minutes. */
(function () {
  'use strict';
  const { mount } = window.ToolityGame;
  const WORDS = 'the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us find here thing give many well only those tell very her even back any good woman through us life child there work down may after should call world over school still try in as last ask need too feel three when state never become between high really something most another much family own out leave put old while mean on keep student why let great same big group begin seem country help talk where turn problem every start hand might show part about against place over such again few case most week company where system each right program hear so question during work play government run small number off always move like night live point today bring happen next without before large all million must home under water room write mother area national money story young fact month different lot right study book eye job word though business issue side kind four head far black long both little house yes since provide service around friend important father sit away until power hour game often yet line political end among ever stand bad lose however member pay law meet car city almost include continue set later community much name five once white least president learn real change team minute best several idea kid body information nothing ago right lead social understand whether back watch together follow around parent only stop face anything create public already speak others read level allow add office spend door health person art sure such war history party within grow result open change morning walk reason low win research girl guy early food moment himself air teacher force offer enough'.split(' ');
  const PUNCT = [',', '.', ';', '!', '?'];
  const S = { words: [], typed: [], idx: 0, started: 0, dur: 30, over: false, summaryText: '' };

  function makeWords(n, punct, nums) {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (nums && i % 9 === 4) { out.push(String(10 + Math.floor(Math.random() * 990))); continue; }
      let w = WORDS[Math.floor(Math.random() * WORDS.length)];
      if (punct && i % 7 === 0) w = w[0].toUpperCase() + w.slice(1);
      if (punct && i % 6 === 5) w += PUNCT[Math.floor(Math.random() * PUNCT.length)];
      out.push(w);
    }
    return out;
  }

  function stats(elapsedSec) {
    const mins = Math.max(elapsedSec, 1) / 60;
    let okChars = 0, allChars = 0;
    for (let i = 0; i <= S.idx && i < S.words.length; i++) {
      const target = S.words[i], got = S.typed[i] || '';
      if (!got.length && i === S.idx) continue;
      allChars += got.length + (i < S.idx ? 1 : 0);
      if (i < S.idx && got === target) okChars += target.length + 1;
      else {
        for (let c = 0; c < Math.min(target.length, got.length); c++) if (target[c] === got[c]) okChars++;
      }
    }
    const wpm = Math.round((okChars / 5) / mins);
    const raw = Math.round((allChars / 5) / mins);
    const acc = allChars ? Math.round((okChars / allChars) * 100) : 100;
    return { wpm, raw, acc, okChars, allChars };
  }

  function renderWords($) {
    const box = $('tst-words');
    box.replaceChildren(...S.words.map((w, wi) => {
      const span = document.createElement('span');
      const got = S.typed[wi] || '';
      span.className = 'tst-word' + (wi === S.idx ? ' is-current' : '') + (wi < S.idx && got !== w ? ' is-bad' : '');
      const len = Math.max(w.length, got.length);
      for (let i = 0; i < len; i++) {
        const ch = document.createElement('span');
        ch.className = 'tst-ch' + (i < got.length ? (got[i] === w[i] ? ' is-ok' : ' is-err') : '');
        ch.textContent = i < w.length ? w[i] : got[i];
        span.append(ch);
      }
      return span;
    }));
    const cur = box.children[S.idx];
    if (cur && cur.offsetTop > 56) box.scrollTop = cur.offsetTop - 28;
  }

  function updateHud(api, elapsed) {
    const { $, fmtClock, st } = api;
    const { wpm, acc } = stats(elapsed);
    $('wpm-val').textContent = S.started ? wpm : 0;
    $('acc-val').textContent = acc + '%';
    $('time-val').textContent = fmtClock(Math.max(0, S.dur - elapsed));
    $('best-val').textContent = st.get('best_' + S.dur, 0);
  }

  function finish(api) {
    const { st, status, overlay, setCopy, sfx } = api;
    S.over = true;
    const r = stats(S.dur);
    const prev = st.get('best_' + S.dur, 0);
    if (r.wpm > prev) st.set('best_' + S.dur, r.wpm);
    updateHud(api, S.dur);
    S.summaryText = `${r.wpm} WPM · ${r.acc}% accuracy (${S.dur}s, raw ${r.raw} WPM) — Toolity.in`;
    setCopy(true); sfx.win();
    status(`${r.wpm} WPM · ${r.acc}%`, true);
    overlay(`${r.wpm} WPM · ${r.acc}%`, `Raw ${r.raw} WPM · ${r.okChars}/${r.allChars} chars · Space or Restart to go again`);
  }

  mount({
    slug: 'typing-speed-test', defaultMode: '30',
    summary: ({ val, mode, sound }) => `${mode()}s · ${val('opt-punct') ? 'punctuation' : 'lowercase words'}${val('opt-nums') ? ' + numbers' : ''} · sound ${sound() ? 'on' : 'off'}`,
    newGame(api) {
      const { $, val, mode, timer, status, setCopy } = api;
      timer.stop();
      S.dur = parseInt(mode(), 10) || 30;
      S.words = makeWords(110, val('opt-punct'), val('opt-nums'));
      S.typed = ['']; S.idx = 0; S.started = 0; S.over = false; S.summaryText = '';
      const inp = $('typing-input'); inp.value = '';
      setCopy(false); status('Start typing to begin');
      renderWords($); updateHud(api, 0);
    },
    copy: ({ copyText }) => S.summaryText && copyText(S.summaryText, 'Result copied'),
    onMode: (_, api) => api.G.newGame(api),
    onSetting: (el, api) => { if (el.id !== 'opt-sound') api.G.newGame(api); },
    onKey(e, api) {
      if (e.key === 'Tab') { e.preventDefault(); api.play(); return; }
      if (!S.over && e.key.length === 1 && document.activeElement !== api.$('typing-input')) api.$('typing-input').focus();
    }
  });

  const api = window.__game, inp = api.$('typing-input');
  api.$('tst-box').addEventListener('click', () => inp.focus());

  inp.addEventListener('keydown', (e) => {
    if (S.over) { if (e.key === ' ' || e.key === 'Tab') { e.preventDefault(); api.play(); } return; }
    if (e.key === ' ') {
      e.preventDefault();
      if (!(S.typed[S.idx] || '').length) return;
      api.sfx.tap(S.typed[S.idx] === S.words[S.idx] ? 520 : 210);
      S.idx++; S.typed[S.idx] = ''; inp.value = '';
      if (S.idx > S.words.length - 30) S.words.push(...makeWords(50, api.val('opt-punct'), api.val('opt-nums')));
      renderWords(api.$); updateHud(api, S.started ? S.dur - api.timer.get() : 0);
    }
  });

  inp.addEventListener('input', () => {
    if (S.over) return;
    if (!S.started) {
      S.started = Date.now();
      api.status('Typing…');
      api.timer.countdown(S.dur, (left) => updateHud(api, S.dur - left), () => finish(api));
    }
    const v = inp.value.replace(/\s+/g, '');
    S.typed[S.idx] = v;
    const target = S.words[S.idx] || '';
    const ok = target.startsWith(v);
    api.sfx.tap(ok ? 500 : 190);
    renderWords(api.$);
    updateHud(api, S.dur - api.timer.get());
  });

  window.__tst = { S, stats, finish: () => finish(api) };
})();

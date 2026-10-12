/* Solitaire (Klondike) — Toolity.in.
 * 52-card Fisher-Yates deal, Draw 1 / Draw 3, one-click smart move + two-click manual move,
 * auto-finish once all tableau cards are face-up, unlimited undo, wins tally. */
(function () {
  'use strict';
  const { mount } = window.ToolityGame;
  const SUITS = ['♠', '♥', '♣', '♦'];
  const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const isRed = (s) => s === 1 || s === 3;

  const S = {
    drawCount: 1,
    stock: [],
    waste: [],
    found: [[], [], [], []],
    tab: [[], [], [], [], [], [], []],
    sel: null, // { zone: 'waste'|'found'|'tab', col, idx }
    hist: [],
    moves: 0,
    started: false,
    over: false
  };

  const cloneState = () => ({
    stock: S.stock.map((c) => ({ ...c })),
    waste: S.waste.map((c) => ({ ...c })),
    found: S.found.map((p) => p.map((c) => ({ ...c }))),
    tab: S.tab.map((col) => col.map((c) => ({ ...c }))),
    moves: S.moves
  });

  function pushHist() {
    S.hist.push(cloneState());
  }

  function ensureTimer(api) {
    if (S.started || S.over) return;
    S.started = true;
    api.timer.start(0, (s) => { api.$('time-val').textContent = api.fmtClock(s); });
  }

  const canOnFoundation = (card, fIdx) => {
    if (card.s !== fIdx) return false;
    const pile = S.found[fIdx];
    return pile.length === 0 ? card.r === 1 : pile[pile.length - 1].r === card.r - 1;
  };

  const canOnTableau = (card, colIdx) => {
    const col = S.tab[colIdx];
    if (col.length === 0) return card.r === 13;
    const top = col[col.length - 1];
    return top.up && isRed(top.s) !== isRed(card.s) && top.r === card.r + 1;
  };

  const allFaceUp = () => S.tab.every((col) => col.every((c) => c.up));
  const isWon = () => S.found.every((p) => p.length === 13);

  function flipTopIfNeeded(colIdx) {
    const col = S.tab[colIdx];
    if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
  }

  function checkWin(api) {
    if (!isWon()) return false;
    S.over = true;
    api.timer.stop();
    const wins = api.st.get('wins', 0) + 1;
    api.st.set('wins', wins);
    render(api);
    api.status('You won!', true);
    api.sfx.win();
    api.overlay('Solitaire won! 🎉', `${S.moves} moves in ${api.$('time-val').textContent} · Space for a new deal`);
    return true;
  }

  function recordMove(api) {
    ensureTimer(api);
    S.moves++;
    S.sel = null;
    api.sfx.move();
    render(api);
    checkWin(api);
  }

  function drawStock(api) {
    if (S.over) return;
    ensureTimer(api);
    S.sel = null;
    if (S.stock.length > 0) {
      pushHist();
      const n = Math.min(S.drawCount, S.stock.length);
      for (let i = 0; i < n; i++) {
        const c = S.stock.pop();
        c.up = true;
        S.waste.push(c);
      }
      recordMove(api);
    } else if (S.waste.length > 0) {
      if (api.val('opt-onepass')) { api.sfx.bad(); api.status('Single pass — no redeals'); return; }
      pushHist();
      while (S.waste.length) {
        const c = S.waste.pop();
        c.up = false;
        S.stock.push(c);
      }
      recordMove(api);
    }
  }

  // Try moving a card/run to a specific destination { zone: 'found'|'tab', col }
  function tryMoveTo(api, src, dest) {
    if (!src || S.over) return false;
    if (src.zone === 'waste') {
      const card = S.waste[S.waste.length - 1];
      if (!card) return false;
      if (dest.zone === 'found' && canOnFoundation(card, dest.col)) {
        pushHist(); S.found[dest.col].push(S.waste.pop()); recordMove(api); return true;
      }
      if (dest.zone === 'tab' && canOnTableau(card, dest.col)) {
        pushHist(); S.tab[dest.col].push(S.waste.pop()); recordMove(api); return true;
      }
    } else if (src.zone === 'found') {
      const pile = S.found[src.col], card = pile[pile.length - 1];
      if (!card) return false;
      if (dest.zone === 'tab' && canOnTableau(card, dest.col)) {
        pushHist(); S.tab[dest.col].push(pile.pop()); recordMove(api); return true;
      }
    } else if (src.zone === 'tab') {
      const col = S.tab[src.col];
      const run = col.slice(src.idx);
      if (!run.length || !run[0].up) return false;
      if (dest.zone === 'found' && run.length === 1 && canOnFoundation(run[0], dest.col)) {
        pushHist(); S.found[dest.col].push(col.pop()); flipTopIfNeeded(src.col); recordMove(api); return true;
      }
      if (dest.zone === 'tab' && dest.col !== src.col && canOnTableau(run[0], dest.col)) {
        pushHist();
        S.tab[dest.col].push(...col.splice(src.idx));
        flipTopIfNeeded(src.col);
        recordMove(api);
        return true;
      }
    }
    return false;
  }

  // Smart move: single card tries foundation first (if Ace/2 or safe), then non-empty tableau, then empty tableau;
  // multi-card run tries non-empty tableau first, then empty tableau (unless King already at bottom of column).
  function smartMove(api, src) {
    let card, isSingle = true;
    if (src.zone === 'waste') card = S.waste[S.waste.length - 1];
    else if (src.zone === 'found') card = S.found[src.col][S.found[src.col].length - 1];
    else if (src.zone === 'tab') {
      const col = S.tab[src.col];
      card = col[src.idx];
      isSingle = src.idx === col.length - 1;
    }
    if (!card || !card.up) return false;

    if (isSingle && src.zone !== 'found' && canOnFoundation(card, card.s)) {
      return tryMoveTo(api, src, { zone: 'found', col: card.s });
    }
    // Prefer non-empty tableau columns first
    for (let c = 0; c < 7; c++) {
      if (src.zone === 'tab' && src.col === c) continue;
      if (S.tab[c].length > 0 && canOnTableau(card, c)) return tryMoveTo(api, src, { zone: 'tab', col: c });
    }
    // Then empty tableau column for Kings (skip if King is already at index 0 of a tableau column)
    if (card.r === 13 && !(src.zone === 'tab' && src.idx === 0)) {
      for (let c = 0; c < 7; c++) {
        if (S.tab[c].length === 0) return tryMoveTo(api, src, { zone: 'tab', col: c });
      }
    }
    return false;
  }

  function handleZoneClick(api, target) {
    if (S.over) return;
    // If something is already selected, try moving it to `target`
    if (S.sel) {
      if (S.sel.zone === target.zone && S.sel.col === target.col && S.sel.idx === target.idx) {
        S.sel = null; render(api); return;
      }
      if (tryMoveTo(api, S.sel, target)) return;
    }
    if (api.val('opt-smart') && smartMove(api, target)) return;
    // Otherwise select if target has a face-up card
    if (target.zone === 'waste' && S.waste.length) S.sel = target;
    else if (target.zone === 'found' && S.found[target.col].length) S.sel = target;
    else if (target.zone === 'tab' && S.tab[target.col][target.idx]?.up) S.sel = target;
    else S.sel = null;
    api.sfx.tap(420);
    render(api);
  }

  function autoFinish(api) {
    if (S.over || !allFaceUp()) return;
    pushHist();
    ensureTimer(api);
    // First move any remaining stock/waste + tableau cards up to foundations in rank order
    let moved = true, guard = 0;
    while (!isWon() && moved && guard++ < 200) {
      moved = false;
      if (S.waste.length && canOnFoundation(S.waste[S.waste.length - 1], S.waste[S.waste.length - 1].s)) {
        const c = S.waste.pop(); S.found[c.s].push(c); S.moves++; moved = true; continue;
      }
      for (let col = 0; col < 7; col++) {
        const pile = S.tab[col];
        if (!pile.length) continue;
        const top = pile[pile.length - 1];
        if (canOnFoundation(top, top.s)) {
          S.found[top.s].push(pile.pop()); S.moves++; moved = true; break;
        }
      }
      if (!moved && (S.stock.length || S.waste.length)) {
        if (S.stock.length) { const c = S.stock.pop(); c.up = true; S.waste.push(c); moved = true; }
        else { while (S.waste.length) { const c = S.waste.pop(); c.up = false; S.stock.push(c); } moved = true; }
      }
    }
    render(api);
    checkWin(api);
  }

  function makeCardEl(card, isSel, onClick) {
    const d = document.createElement('div');
    d.className = 'sol-card' + (card.up ? (isRed(card.s) ? ' is-red' : '') : ' is-down') + (isSel ? ' is-sel' : '');
    if (card.up) {
      const label = RANKS[card.r] + SUITS[card.s];
      d.setAttribute('role', 'button');
      d.tabIndex = 0;
      d.setAttribute('aria-label', `${RANKS[card.r]} of ${['Spades', 'Hearts', 'Clubs', 'Diamonds'][card.s]}`);
      d.innerHTML = `<span class="sol-card-top">${label}</span><span class="sol-card-mid">${SUITS[card.s]}</span>`;
      d.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    }
    return d;
  }

  function render(api) {
    const { $, st, setUndo } = api;
    // Stock
    const stockEl = $('stock');
    stockEl.textContent = S.stock.length ? String(S.stock.length) : (S.waste.length ? '↻' : '∅');
    stockEl.classList.toggle('is-down', S.stock.length > 0);

    // Waste (show up to 3 fanned cards in Draw 3, or 1 in Draw 1)
    const wasteEl = $('waste');
    wasteEl.innerHTML = '';
    const visCount = S.drawCount === 3 ? Math.min(3, S.waste.length) : Math.min(1, S.waste.length);
    if (visCount > 0) {
      const fan = document.createElement('div');
      fan.className = 'sol-waste-fan';
      const start = S.waste.length - visCount;
      for (let i = start; i < S.waste.length; i++) {
        const isTop = i === S.waste.length - 1;
        const isSel = isTop && S.sel?.zone === 'waste';
        const el = makeCardEl(S.waste[i], isSel, () => {
          if (isTop) handleZoneClick(api, { zone: 'waste', col: 0, idx: i });
        });
        fan.append(el);
      }
      wasteEl.append(fan);
    }

    // Foundations
    const foundEl = $('foundations');
    foundEl.replaceChildren(...SUITS.map((suit, fIdx) => {
      const pile = S.found[fIdx];
      const slot = document.createElement('div');
      slot.className = 'sol-pile' + (S.sel?.zone === 'found' && S.sel.col === fIdx ? ' is-sel' : '');
      slot.setAttribute('role', 'button');
      slot.tabIndex = 0;
      slot.setAttribute('aria-label', `Foundation ${suit}`);
      if (pile.length) {
        const top = pile[pile.length - 1];
        slot.append(makeCardEl(top, S.sel?.zone === 'found' && S.sel.col === fIdx, () => handleZoneClick(api, { zone: 'found', col: fIdx, idx: pile.length - 1 })));
      } else {
        slot.textContent = suit;
        slot.addEventListener('click', () => handleZoneClick(api, { zone: 'found', col: fIdx, idx: 0 }));
      }
      return slot;
    }));

    // Tableau
    const tabEl = $('tableau');
    tabEl.replaceChildren(...S.tab.map((col, colIdx) => {
      const colEl = document.createElement('div');
      colEl.className = 'sol-col';
      if (!col.length) {
        const empty = document.createElement('div');
        empty.className = 'sol-col-empty';
        empty.textContent = 'K';
        empty.setAttribute('role', 'button');
        empty.tabIndex = 0;
        empty.setAttribute('aria-label', `Empty tableau column ${colIdx + 1}`);
        empty.addEventListener('click', () => handleZoneClick(api, { zone: 'tab', col: colIdx, idx: 0 }));
        colEl.append(empty);
      } else {
        col.forEach((card, idx) => {
          const isSel = S.sel?.zone === 'tab' && S.sel.col === colIdx && idx >= S.sel.idx;
          const cardEl = makeCardEl(card, isSel, () => handleZoneClick(api, { zone: 'tab', col: colIdx, idx }));
          if (!card.up && idx === col.length - 1) {
            cardEl.addEventListener('click', () => { card.up = true; render(api); });
          }
          colEl.append(cardEl);
        });
      }
      return colEl;
    }));

    $('moves-val').textContent = S.moves;
    $('wins-val').textContent = st.get('wins', 0);
    $('btn-auto').hidden = S.over || !allFaceUp() || isWon();
    setUndo(S.hist.length > 0 && !S.over);
  }

  const api = mount({
    slug: 'solitaire', defaultMode: '1',
    summary: ({ mode, val, sound }) => `Draw ${mode()} · ${val('opt-smart') ? 'smart click' : 'manual click'} · ${val('opt-onepass') ? 'single stock pass' : 'unlimited stock passes'} · sound ${sound() ? 'on' : 'off'}`,
    newGame(api) {
      api.timer.stop();
      S.drawCount = +api.mode() || 1;
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ s, r, up: false });
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      S.tab = Array.from({ length: 7 }, (_, c) => {
        const col = deck.splice(0, c + 1);
        col[col.length - 1].up = true;
        return col;
      });
      S.stock = deck;
      S.waste = [];
      S.found = [[], [], [], []];
      S.sel = null; S.hist = []; S.moves = 0; S.started = false; S.over = false;
      api.$('time-val').textContent = '0:00';
      api.status('Build A → K by suit');
      render(api);
    },
    undo(api) {
      if (!S.hist.length || S.over) return;
      const prev = S.hist.pop();
      S.stock = prev.stock; S.waste = prev.waste; S.found = prev.found; S.tab = prev.tab; S.moves = prev.moves;
      S.sel = null;
      api.sfx.tap(360);
      render(api);
    },
    onMode(_v, api) { this.newGame(api); },
    onKey(e, api) {
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); drawStock(api); }
      else if ((e.key === 'a' || e.key === 'A') && !api.$('btn-auto').hidden) { e.preventDefault(); autoFinish(api); }
      else if (e.key === 'Escape' && S.sel) { S.sel = null; render(api); }
    }
  });

  api.$('stock').addEventListener('click', () => drawStock(api));
  api.$('btn-auto').addEventListener('click', () => autoFinish(api));

  window.__sol = {
    S, drawStock: () => drawStock(api), autoFinish: () => autoFinish(api),
    smartMove: (src) => smartMove(api, src),
    setupAlmostWon() {
      S.stock = []; S.waste = [];
      S.found = [0, 1, 2, 3].map((s) => Array.from({ length: 12 }, (_, i) => ({ s, r: i + 1, up: true })));
      S.tab = [[{ s: 0, r: 13, up: true }], [{ s: 1, r: 13, up: true }], [{ s: 2, r: 13, up: true }], [{ s: 3, r: 13, up: true }], [], [], []];
      S.over = false; render(api);
    }
  };
})();

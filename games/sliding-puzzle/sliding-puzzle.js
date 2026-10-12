/* Sliding Puzzle (8 / 15 / 24 puzzle) — Toolity.in.
 * Solvable Fisher-Yates scramble (inversion parity + blank row check),
 * multi-tile row/column slide on click, arrow/WASD single-tile slide, undo. */
(function () {
  'use strict';
  const { mount } = window.ToolityGame;
  const S = { n: 4, tiles: [], hist: [], moves: 0, over: false, started: false };

  // Designed by Kapil Pidhwani: O(n^4) inversion count on at most 25 tiles (<300 comparisons).
  function isSolvable(arr, n) {
    let inv = 0;
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i]) continue;
      for (let j = i + 1; j < arr.length; j++) if (arr[j] && arr[i] > arr[j]) inv++;
    }
    if (n % 2 === 1) return inv % 2 === 0;
    const blankRowFromBottom = n - Math.floor(arr.indexOf(0) / n);
    return (inv + blankRowFromBottom) % 2 === 1;
  }

  const isSolved = (arr) => arr[arr.length - 1] === 0 && arr.slice(0, -1).every((v, i) => v === i + 1);

  function scramble(n) {
    const total = n * n, arr = Array.from({ length: total }, (_, i) => (i + 1) % total);
    for (let k = total - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [arr[k], arr[r]] = [arr[r], arr[k]];
    }
    if (!isSolvable(arr, n)) {
      const a = arr[0] === 0 ? 1 : 0, b = arr[a + 1] === 0 ? a + 2 : a + 1;
      [arr[a], arr[b]] = [arr[b], arr[a]];
    }
    if (isSolved(arr)) {
      const z = total - 1;
      [arr[z], arr[z - 1]] = [arr[z - 1], arr[z]];
      [arr[z - 1], arr[z - 1 - n]] = [arr[z - 1 - n], arr[z - 1]];
    }
    return arr;
  }

  function render(api) {
    const { $, st, val, setUndo } = api;
    const board = $('board');
    board.dataset.n = S.n;
    const showHome = val('opt-home');
    board.replaceChildren(...S.tiles.map((v, i) => {
      const d = document.createElement('div');
      d.setAttribute('role', 'gridcell');
      d.className = 'sp-tile' + (v === 0 ? ' is-gap' : '') + (showHome && v !== 0 && v === i + 1 ? ' is-home' : '');
      d.dataset.idx = i;
      if (v !== 0) {
        d.textContent = v;
        d.tabIndex = 0;
        d.setAttribute('aria-label', `Tile ${v} row ${Math.floor(i / S.n) + 1} col ${(i % S.n) + 1}`);
        d.addEventListener('click', () => slideAt(api, i));
      } else {
        d.setAttribute('aria-hidden', 'true');
      }
      return d;
    }));
    $('moves-val').textContent = S.moves;
    const best = st.get(S.n, 0);
    $('best-val').textContent = best || '—';
    setUndo(S.hist.length > 0 && !S.over);
  }

  function slideAt(api, idx) {
    if (S.over || idx < 0 || idx >= S.tiles.length) return false;
    const blank = S.tiles.indexOf(0);
    if (idx === blank) return false;
    const r1 = Math.floor(idx / S.n), c1 = idx % S.n;
    const r0 = Math.floor(blank / S.n), c0 = blank % S.n;
    if (r1 !== r0 && c1 !== c0) return false;

    if (!S.started) {
      S.started = true;
      api.timer.start(0, (s) => { api.$('time-val').textContent = api.fmtClock(s); });
    }
    S.hist.push({ tiles: S.tiles.slice(), moves: S.moves });

    const step = r1 === r0 ? (c1 < c0 ? -1 : 1) : (r1 < r0 ? -1 : 1) * S.n;
    const steps = r1 === r0 ? Math.abs(c1 - c0) : Math.abs(r1 - r0);
    let cur = blank;
    for (let s = 0; s < steps; s++) {
      const next = cur + step;
      S.tiles[cur] = S.tiles[next];
      cur = next;
    }
    S.tiles[idx] = 0;
    S.moves += steps;
    api.sfx.move();
    render(api);

    if (isSolved(S.tiles)) {
      S.over = true;
      api.timer.stop();
      const prev = api.st.get(S.n, 0);
      const isNew = !prev || S.moves < prev;
      if (isNew) api.st.set(S.n, S.moves);
      render(api);
      api.status(`Solved in ${S.moves}`, true);
      api.sfx.win();
      api.overlay('Puzzle solved! 🎉', `${S.moves} moves in ${api.$('time-val').textContent}${isNew ? ' · New best!' : ''} · Space to scramble again`);
    }
    return true;
  }

  function slideDir(api, dr, dc) {
    const blank = S.tiles.indexOf(0);
    const r0 = Math.floor(blank / S.n), c0 = blank % S.n;
    const tr = r0 - dr, tc = c0 - dc;
    if (tr < 0 || tr >= S.n || tc < 0 || tc >= S.n) return false;
    return slideAt(api, tr * S.n + tc);
  }

  const api = mount({
    slug: 'sliding-puzzle', defaultMode: '4',
    summary: ({ mode, val, sound }) => `${mode()}×${mode()} · ${val('opt-home') ? 'highlight home tiles' : 'no tint'} · sound ${sound() ? 'on' : 'off'}`,
    newGame(api) {
      api.timer.stop();
      S.n = +api.mode() || 4;
      S.tiles = scramble(S.n);
      S.hist = []; S.moves = 0; S.over = false; S.started = false;
      api.$('time-val').textContent = '0:00';
      api.status(`Order 1 → ${S.n * S.n - 1}`);
      render(api);
    },
    undo(api) {
      if (!S.hist.length || S.over) return;
      const prev = S.hist.pop();
      S.tiles = prev.tiles; S.moves = prev.moves;
      api.sfx.tap(360);
      render(api);
    },
    onMode(v, api) { this.newGame(api); },
    onSetting(_el, api) { render(api); },
    onKey(e, api) {
      const k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); slideDir(api, -1, 0); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); slideDir(api, 1, 0); }
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); slideDir(api, 0, -1); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); slideDir(api, 0, 1); }
    }
  });

  window.__sp = {
    S, isSolvable, scramble,
    slideAt: (i) => slideAt(api, i),
    setNearWin() {
      const total = S.n * S.n;
      S.tiles = Array.from({ length: total - 2 }, (_, i) => i + 1).concat([0, total - 1]);
      S.over = false; render(api);
    }
  };
})();

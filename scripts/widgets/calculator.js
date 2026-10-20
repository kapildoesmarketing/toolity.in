/* Designed by Kapil Pidhwani: Mini Calculator widget — standard pad with memory/percent/history, or a tip & bill splitter.
 * Arithmetic uses scaled integers (12 significant digits) so 0.1 + 0.2 shows 0.3. Keyboard: digits, + - * /, Enter, Backspace, Esc, %. */
(function () {
  'use strict';
  const SCHEMA = [
    { key: 'title', type: 'text', maxLength: 40, default: '', id: 'opt-title', label: 'Header' },
    { key: 'mode', type: 'enum', default: 'calc', options: ['calc', 'tip'], id: 'seg-mode', label: 'Mode' },
    { key: 'currency', type: 'text', maxLength: 4, default: '', id: 'opt-currency', label: 'Currency' },
    { key: 'decimals', type: 'number', default: 2, min: 0, max: 4, id: 'opt-decimals', label: 'Decimals' },
    { key: 'history', type: 'bool', default: true, id: 'opt-history', label: 'History line' }
  ];
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const round = (n, d) => Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d;
  const fmt = (n, d, cur) => (!isFinite(n) ? 'Error' : (cur ? cur + ' ' : '') + Number(round(n, d)).toLocaleString(undefined, { maximumFractionDigits: d }));
  const calc = (a, op, b) => { const k = 1e12, A = Math.round(a * k), B = Math.round(b * k); switch (op) { case '+': return (A + B) / k; case '−': return (A - B) / k; case '×': return (A * B) / k / k; case '÷': return B === 0 ? NaN : A / B; } return b; };

  function renderCalc(root, st) {
    const wrap = el('div', 'w-card-wrap w-calc-wrap'); if (st.title) wrap.appendChild(el('div', 'w-title', st.title));
    const card = el('div', 'w-calc'); card.tabIndex = 0; card.setAttribute('role', 'application'); card.setAttribute('aria-label', 'Calculator');
    const hist = el('div', 'w-calc-hist'), disp = el('output', 'w-calc-disp', '0'); disp.setAttribute('aria-live', 'polite');
    if (st.history) card.appendChild(hist); card.appendChild(disp);
    const S = { cur: '0', acc: null, op: null, fresh: true, mem: 0 };
    const show = () => { disp.textContent = S.cur.length > 14 ? Number(S.cur).toPrecision(10) : S.cur.replace(/^(-?)(\d+)(\.?\d*)$/, (m, s, i, f) => s + Number(i).toLocaleString() + f); disp.classList.toggle('is-long', S.cur.length > 9); };
    const input = (d) => { if (S.fresh) { S.cur = d === '.' ? '0.' : d; S.fresh = false; } else if (d === '.' && S.cur.includes('.')) return; else S.cur = S.cur === '0' && d !== '.' ? d : S.cur + d; show(); };
    const apply = () => { if (S.op && S.acc !== null) { const r = calc(S.acc, S.op, +S.cur); hist.textContent = `${fmt(S.acc, 10)} ${S.op} ${fmt(+S.cur, 10)} =`; S.cur = isFinite(r) ? String(round(r, 10)) : 'Error'; } };
    const setOp = (op) => { if (!S.fresh || S.acc === null) { apply(); S.acc = +S.cur; } S.op = op; S.fresh = true; hist.textContent = `${fmt(S.acc, 10)} ${op}`; show(); };
    const equals = () => { apply(); S.acc = null; S.op = null; S.fresh = true; show(); };
    const act = { 'AC': () => { Object.assign(S, { cur: '0', acc: null, op: null, fresh: true }); hist.textContent = ''; show(); }, '⌫': () => { if (S.fresh) return; S.cur = S.cur.length > 1 ? S.cur.slice(0, -1) : '0'; show(); }, '%': () => { S.cur = String(round(S.acc !== null && S.op ? S.acc * +S.cur / 100 : +S.cur / 100, 10)); show(); }, '±': () => { S.cur = S.cur.startsWith('-') ? S.cur.slice(1) : S.cur === '0' ? '0' : '-' + S.cur; show(); }, '=': equals, 'MC': () => { S.mem = 0; }, 'MR': () => { S.cur = String(S.mem); S.fresh = true; show(); }, 'M+': () => { S.mem = round(S.mem + +S.cur, 10); S.fresh = true; }, 'M−': () => { S.mem = round(S.mem - +S.cur, 10); S.fresh = true; } };
    const keys = ['MC', 'MR', 'M+', 'M−', 'AC', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='];
    const pad = el('div', 'w-calc-pad');
    keys.forEach((k) => { const b = el('button', `w-ckey${/^[÷×−+=]$/.test(k) ? ' is-op' : ''}${/^M/.test(k) ? ' is-mem' : ''}${k === 'AC' ? ' is-ac' : ''}`, k); b.type = 'button'; b.addEventListener('click', () => { press(k); card.focus(); }); pad.appendChild(b); });
    const press = (k) => { if (/^[0-9.]$/.test(k)) input(k); else if (/^[÷×−+]$/.test(k)) setOp(k); else if (act[k]) act[k](); };
    const onKey = (e) => { const map = { '/': '÷', '*': '×', '-': '−', '+': '+', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'AC', Delete: 'AC', '%': '%' }; const k = /^[0-9.]$/.test(e.key) ? e.key : map[e.key]; if (!k) return; e.preventDefault(); press(k); };
    card.addEventListener('keydown', onKey); card.appendChild(pad); wrap.appendChild(card); root.appendChild(wrap); show();
    return () => {};
  }
  function renderTip(root, st) {
    const wrap = el('div', 'w-card-wrap w-calc-wrap'); wrap.appendChild(el('div', 'w-title', st.title || 'Tip & split'));
    const card = el('div', 'w-tip'), cur = st.currency || '', d = st.decimals;
    const field = (label, value, attrs = {}) => { const l = el('label', 'w-tip-field'); l.appendChild(el('span', '', label)); const i = document.createElement('input'); i.type = 'number'; i.inputMode = 'decimal'; i.value = value; Object.assign(i, attrs); l.appendChild(i); return [l, i]; };
    const [fb, bill] = field(`Bill ${cur}`, '', { min: 0, step: '0.01', placeholder: '0.00' }), [fp, people] = field('People', '2', { min: 1, step: 1 });
    const tips = el('div', 'w-tip-pills'); let tip = 10; [5, 10, 15, 18, 20].forEach((p) => { const b = el('button', `w-tip-pill${p === tip ? ' is-on' : ''}`, `${p}%`); b.type = 'button'; b.addEventListener('click', () => { tip = p; tips.querySelectorAll('.w-tip-pill').forEach((x) => x.classList.toggle('is-on', x === b)); custom.value = ''; upd(); }); tips.appendChild(b); });
    const custom = document.createElement('input'); custom.type = 'number'; custom.placeholder = '%'; custom.min = 0; custom.max = 100; custom.className = 'w-tip-custom'; custom.setAttribute('aria-label', 'Custom tip percent'); custom.addEventListener('input', () => { if (custom.value !== '') { tip = +custom.value; tips.querySelectorAll('.w-tip-pill').forEach((x) => x.classList.remove('is-on')); } upd(); }); tips.appendChild(custom);
    const out = el('div', 'w-tip-out');
    const upd = () => { const b = +bill.value || 0, n = Math.max(1, Math.floor(+people.value || 1)), t = b * tip / 100, total = b + t; out.innerHTML = ''; [['Tip', t], ['Total', total], ['Per person', total / n]].forEach(([k, v], i) => { const r = el('div', `w-tip-row${i === 2 ? ' is-main' : ''}`); r.appendChild(el('span', '', k)); r.appendChild(el('b', '', fmt(v, d, cur))); out.appendChild(r); }); };
    [bill, people].forEach((i) => i.addEventListener('input', upd));
    const row = el('div', 'w-tip-inputs'); row.appendChild(fb); row.appendChild(fp); card.appendChild(row); card.appendChild(tips); card.appendChild(out); wrap.appendChild(card); root.appendChild(wrap); upd();
    return () => {};
  }
  function render(root, st) { root.innerHTML = ''; return st.mode === 'tip' ? renderTip(root, st) : renderCalc(root, st); }
  window.__calc = { calc, round, fmt };
  if (window.ToolityWidgets) window.ToolityWidgets.register({ slug: 'calculator', title: 'Calculator', height: 360, schema: SCHEMA, render });
})();

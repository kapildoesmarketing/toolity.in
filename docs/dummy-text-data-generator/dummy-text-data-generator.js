/* Designed by Kapil Pidhwani: Dummy Text & Data Generator. One seeded PRNG (xmur3 → mulberry32) feeds three generators:
 * text (5 word banks, sentence/paragraph shaping), people (two locales, fields toggled), dataset (schema rows → typed
 * columns). Same seed + same inputs = same output, in any browser. Emails only ever use reserved domains.
 * Ceilings: word banks are small inline arrays (~30 names per list) — variety is combinatorial, not encyclopaedic;
 * 10,000 rows max, preview 50. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb, { toast } = window.Toolity;
  const $ = (id) => document.getElementById(id), esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* ── PRNG ── */
  function xmur3(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }; }
  function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rng = (seed) => { const s = xmur3(String(seed)); const r = mulberry32(s()); return { f: r, int: (a, b) => a + Math.floor(r() * (b - a + 1)), pick: (arr) => arr[Math.floor(r() * arr.length)], chance: (p) => r() < p }; };

  /* ── word banks ── */
  const W = {
    lorem: 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum at vero eos accusamus iusto odio dignissimos ducimus blanditiis praesentium voluptatum deleniti atque corrupti quos dolores quas molestias'.split(' '),
    hipster: 'artisan kombucha vinyl succulents pour-over fixie tote bag kale chips cold brew banjo raw denim heirloom letterpress selvage chia pop-up cornhole hashtag mustache flannel bespoke taxidermy locavore farm-to-table gluten-free man bun cardigan vegan ethically sourced small batch brooklyn polaroid typewriter mixtape synth umami tofu kinfolk cronut normcore paleo sriracha biodiesel wayfarers lo-fi meggings roof party bitters cliche humblebrag pickled swag shabby chic skateboard sustainable tilde tumblr quinoa'.split(' '),
    corporate: 'synergy leverage bandwidth stakeholders deliverables roadmap alignment low-hanging fruit circle back deep dive move the needle paradigm scalable core competency value-add best practice touch base pivot ecosystem holistic actionable seamless mission-critical disrupt onboarding KPIs quarter runway north star win-win take offline ping thought leadership growth hacking ideate optimize streamline robust granular learnings at scale empower enablement cadence bleeding edge customer-centric frictionless next-gen visibility headcount buy-in ownership double-click parking lot table stakes unpack verticals iterate'.split(' '),
    tech: 'kubernetes microservice latency throughput idempotent webhook cache mutex race condition garbage collector lambda closure monorepo pipeline container rollback feature flag sharding replica consensus event loop backpressure observability tracing p99 refactor linter pull request merge conflict hotfix stack trace null pointer deadlock async promise schema migration index query planner load balancer TLS handshake token OAuth payload serialize protobuf gRPC REST GraphQL WebSocket edge CDN cold start autoscaling cron job regex bytecode compiler heap stack'.split(' ')
  };
  const PANGRAMS = ['The quick brown fox jumps over the lazy dog.', 'Pack my box with five dozen liquor jugs.', 'How vexingly quick daft zebras jump!', 'Sphinx of black quartz, judge my vow.', 'The five boxing wizards jump quickly.', 'Jackdaws love my big sphinx of quartz.', 'Crazy Frederick bought many very exquisite opal jewels.', 'We promptly judged antique ivory buckles for the next prize.', 'Amazingly few discotheques provide jukeboxes.', 'Waltz, bad nymph, for quick jigs vex.', 'Glib jocks quiz nymph to vex dwarf.', 'Bright vixens jump; dozy fowl quack.'];
  const LOREM_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
  const L = {
    intl: { first: 'James Mary Olivia Liam Noah Emma Ava Lucas Mia Ethan Sophia Mason Isabella Logan Amelia Elijah Harper Aiden Evelyn Daniel Chloe Henry Grace Leo Zoe Owen Lily Jack Nora Luke Maya Felix Ruby Oscar Elena Hugo Clara Theo Iris Arlo'.split(' '), last: 'Smith Johnson Williams Brown Jones Garcia Miller Davis Martinez Wilson Anderson Taylor Thomas Moore Martin Lee Walker Hall Young King Wright Scott Green Baker Adams Nelson Carter Mitchell Perez Roberts Turner Phillips Campbell Parker Evans Edwards Collins Stewart Morris Murphy'.split(' '),
      cities: [['Austin', 'TX', '737'], ['Seattle', 'WA', '981'], ['Denver', 'CO', '802'], ['Chicago', 'IL', '606'], ['Boston', 'MA', '021'], ['Miami', 'FL', '331'], ['Portland', 'OR', '972'], ['Atlanta', 'GA', '303'], ['Phoenix', 'AZ', '850'], ['Dallas', 'TX', '752'], ['San Diego', 'CA', '921'], ['Nashville', 'TN', '372'], ['Minneapolis', 'MN', '554'], ['Raleigh', 'NC', '276'], ['Columbus', 'OH', '432'], ['Salt Lake City', 'UT', '841']],
      streets: 'Maple St|Oak Ave|Cedar Ln|Pine Rd|Lake View Dr|Hill St|Park Ave|River Rd|Elm St|Sunset Blvd|Washington Ave|Birch Ct'.split('|'), country: 'United States', phone: (r) => `+1 (${r.int(201, 989)}) ${r.int(200, 999)}-${String(r.int(0, 9999)).padStart(4, '0')}`, pin: (r, p) => p + String(r.int(0, 99)).padStart(2, '0'), suffix: ['Inc.', 'LLC', 'Co.', 'Group', 'Labs', 'Studio'] },
    in: { first: 'Aarav Vivaan Aditya Diya Ananya Priya Rahul Neha Kabir Isha Rohan Sneha Arjun Meera Karan Pooja Siddharth Riya Aditi Nikhil Tanvi Manish Kavya Dev Shreya Aman Nandini Varun Ira Yash Anjali Harsh Kriti Vikram Sakshi Rajesh Divya Mohit Lakshmi Farhan'.split(' '), last: 'Sharma Verma Patel Reddy Nair Iyer Singh Gupta Mehta Joshi Kulkarni Das Banerjee Chopra Malhotra Rao Pillai Bhat Menon Kaur Desai Shah Mishra Pandey Chauhan Jain Agarwal Khan Sinha Yadav Naidu Thakur Ghosh Dutta Saxena Bose Reddy Chandra Hegde Trivedi'.split(' '),
      cities: [['Mumbai', 'Maharashtra', '400'], ['New Delhi', 'Delhi', '110'], ['Bengaluru', 'Karnataka', '560'], ['Hyderabad', 'Telangana', '500'], ['Chennai', 'Tamil Nadu', '600'], ['Kolkata', 'West Bengal', '700'], ['Pune', 'Maharashtra', '411'], ['Ahmedabad', 'Gujarat', '380'], ['Jaipur', 'Rajasthan', '302'], ['Lucknow', 'Uttar Pradesh', '226'], ['Kochi', 'Kerala', '682'], ['Chandigarh', 'Chandigarh', '160'], ['Indore', 'Madhya Pradesh', '452'], ['Surat', 'Gujarat', '395'], ['Nagpur', 'Maharashtra', '440'], ['Bhopal', 'Madhya Pradesh', '462']],
      streets: 'MG Road|Nehru Nagar|Link Road|Station Road|Gandhi Marg|Sector 21|Lajpat Nagar|Anna Salai|Jubilee Hills|Koramangala 4th Block|Salt Lake Sector V|Model Town'.split('|'), country: 'India', phone: (r) => `+91 ${r.int(6, 9)}${String(r.int(0, 9999)).padStart(4, '0')} ${String(r.int(0, 99999)).padStart(5, '0')}`, pin: (r, p) => p + String(r.int(0, 999)).padStart(3, '0'), suffix: ['Pvt Ltd', 'Industries', 'Enterprises', 'Technologies', 'Solutions', '& Sons'] }
  };
  const CO = 'Nimbus Vertex Lumen Harbor Quill Orbit Summit Pioneer Beacon Atlas Zephyr Cobalt Ember Meridian Kestrel Aurora Granite Sapphire Willow Falcon Horizon Mosaic Juniper Prism Saffron'.split(' '), CO2 = 'Labs Systems Technologies Ventures Studio Logistics Foods Textiles Analytics Health Media Energy Works Design Retail'.split(' ');
  const JOBS = 'Software Engineer|Product Manager|Data Analyst|UX Designer|Accountant|Marketing Lead|Sales Executive|Teacher|Nurse|Operations Manager|HR Partner|Customer Support|Architect|Pharmacist|Content Writer|Civil Engineer|Chef|Electrician|Photographer|Research Scientist'.split('|');
  const COUNTRIES = 'India|United States|United Kingdom|Canada|Australia|Germany|France|Japan|Brazil|Singapore|United Arab Emirates|South Africa|Netherlands|Spain|Mexico'.split('|');
  const pad = (n) => String(n).padStart(2, '0'), iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /* ── text ── */
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function sentence(r, bank) { const n = r.int(6, 14), w = []; for (let i = 0; i < n; i++) { w.push(r.pick(bank)); if (i > 2 && i < n - 2 && r.chance(0.12)) w[w.length - 1] += ','; } return cap(w.join(' ')) + r.pick(['.', '.', '.', '.', '!', '?']); }
  function genText(r, o) {
    const pang = o.flavour === 'pangram', bank = pang ? PANGRAMS.join(' ').toLowerCase().replace(/[.,!?;]/g, '').split(/\s+/) : W[o.flavour];
    const sent = () => (pang ? r.pick(PANGRAMS) : sentence(r, bank));
    const para = () => { const n = r.int(4, 8), s = []; for (let i = 0; i < n; i++) s.push(sent()); return s.join(' '); };
    let units = [];
    if (o.unit === 'words') { for (let i = 0; i < o.count; i++) units.push(r.pick(bank)); units = [cap(units.join(' ')) + '.']; }
    else if (o.unit === 'sentences') { for (let i = 0; i < o.count; i++) units.push(sent()); units = [units.join(' ')]; }
    else for (let i = 0; i < o.count; i++) units.push(para());
    if (o.flavour === 'lorem' && o.loremStart) units[0] = o.unit === 'words' ? cap(('lorem ipsum dolor sit amet consectetur adipiscing elit ' + units[0].toLowerCase().replace(/\.$/, '')).split(' ').slice(0, o.count).join(' ')) + '.' : o.unit === 'sentences' && o.count === 1 ? LOREM_START : LOREM_START + ' ' + units[0];
    return o.format === 'html' ? units.map((p) => `<p>${p}</p>`).join('\n') : units.join('\n\n');
  }

  /* ── people / dataset values ── */
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
  function person(r, loc, domain, i) {
    const l = L[loc], first = r.pick(l.first), last = r.pick(l.last), city = r.pick(l.cities), user = `${slug(first)}.${slug(last)}${r.chance(0.5) ? r.int(1, 99) : ''}`;
    const dob = new Date(Date.UTC(r.int(1960, 2005), r.int(0, 11), r.int(1, 28)));
    return { id: i + 1, first, last, name: `${first} ${last}`, email: `${user}@${domain === 'test' || domain === 'invalid' ? slug(last) + '.' + domain : domain}`, username: user, phone: l.phone(r), city: city[0], state: city[1], country: l.country, pincode: l.pin(r, city[2]), address: `${r.int(1, 299)}, ${r.pick(l.streets)}, ${city[0]}, ${city[1]} ${l.pin(r, city[2])}`, dob: iso(new Date(dob.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate())), company: `${r.pick(CO)} ${r.chance(0.5) ? r.pick(CO2) + ' ' : ''}${r.pick(l.suffix)}`, job: r.pick(JOBS) };
  }
  const TYPES = [['increment', 'Auto-increment id'], ['uuid', 'UUID'], ['first_name', 'First name'], ['last_name', 'Last name'], ['full_name', 'Full name'], ['email', 'Email'], ['username', 'Username'], ['phone', 'Phone'], ['city', 'City'], ['state', 'State'], ['country', 'Country'], ['pincode', 'PIN / ZIP'], ['address', 'Address'], ['company', 'Company'], ['job', 'Job title'], ['date_past', 'Date (past, opts: years)'], ['date_future', 'Date (future, opts: years)'], ['datetime', 'Date-time ISO (past)'], ['int', 'Integer (opts: min-max)'], ['float', 'Decimal (opts: min-max)'], ['price', 'Price (opts: min-max)'], ['bool', 'Boolean'], ['pick', 'Pick one (opts: a|b|c)'], ['sentence', 'Sentence'], ['paragraph', 'Paragraph'], ['color', 'Colour hex'], ['ip', 'IPv4'], ['url', 'URL']];
  const range = (opt, a, b) => { const m = /^\s*(-?[\d.]+)\s*[-–:,]\s*(-?[\d.]+)\s*$/.exec(opt || ''); return m ? [+m[1], +m[2]] : [a, b]; };
  function cell(r, type, opt, p, i, domain) {
    switch (type) {
      case 'increment': return i + 1; case 'uuid': { const b = new Uint8Array(16); for (let k = 0; k < 16; k++) b[k] = r.int(0, 255); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; }
      case 'first_name': return p.first; case 'last_name': return p.last; case 'full_name': return p.name; case 'email': return p.email; case 'username': return p.username; case 'phone': return p.phone; case 'city': return p.city; case 'state': return p.state; case 'country': return opt ? p.country : r.pick(COUNTRIES); case 'pincode': return p.pincode; case 'address': return p.address; case 'company': return p.company; case 'job': return p.job;
      case 'date_past': case 'datetime': { const y = +opt || 5, d = new Date(Date.now() - r.f() * y * 365.25 * 864e5); return type === 'datetime' ? d.toISOString().replace(/\.\d{3}Z$/, 'Z') : iso(d); }
      case 'date_future': { const y = +opt || 1; return iso(new Date(Date.now() + r.f() * y * 365.25 * 864e5)); }
      case 'int': { const [a, b] = range(opt, 1, 100); return r.int(Math.ceil(Math.min(a, b)), Math.floor(Math.max(a, b))); }
      case 'float': { const [a, b] = range(opt, 0, 1); return +(a + r.f() * (b - a)).toFixed(2); }
      case 'price': { const [a, b] = range(opt, 10, 1000); return +(a + r.f() * (b - a)).toFixed(2); }
      case 'bool': return r.chance(opt ? Math.min(1, Math.max(0, parseFloat(opt))) : 0.5);
      case 'pick': { const list = (opt || 'A|B|C').split('|').map((s) => s.trim()).filter(Boolean); return list.length ? r.pick(list) : ''; }
      case 'sentence': return sentence(r, W.lorem); case 'paragraph': { const s = []; for (let k = 0, n = r.int(3, 5); k < n; k++) s.push(sentence(r, W.lorem)); return s.join(' '); }
      case 'color': return '#' + r.int(0, 0xffffff).toString(16).padStart(6, '0'); case 'ip': return `${r.int(1, 223)}.${r.int(0, 255)}.${r.int(0, 255)}.${r.int(1, 254)}`;
      case 'url': return `https://${slug(p.company.split(' ')[0])}.${domain}/${r.pick(['about', 'pricing', 'blog', 'docs', 'careers', 'contact'])}`;
      default: return '';
    }
  }

  /* ── schema rows UI ── */
  const rows = $('ds-rows');
  const typeOpts = (sel) => TYPES.map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${l}</option>`).join('');
  const addRow = (type = 'full_name', name = '', opt = '') => { const d = document.createElement('div'); d.className = 'dd-row'; d.innerHTML = `<input type="text" class="input-clean dd-name" placeholder="${type}" value="${esc(name)}" aria-label="Column name" spellcheck="false" autocomplete="off"><select class="select-clean dd-type" aria-label="Column type">${typeOpts(type)}</select><input type="text" class="input-clean dd-opt" placeholder="options" value="${esc(opt)}" aria-label="Column options" spellcheck="false" autocomplete="off"><button type="button" class="web-row-btn dd-del" aria-label="Remove column"><iconify-icon icon="lucide:x" width="14" height="14"></iconify-icon></button>`; rows.appendChild(d); return d; };
  const defaultRows = () => { rows.innerHTML = ''; addRow('increment'); addRow('full_name'); addRow('email'); addRow('city'); addRow('int', '', '1-100'); };
  const schema = () => [...rows.querySelectorAll('.dd-row')].map((d) => { const type = d.querySelector('.dd-type').value; return { name: d.querySelector('.dd-name').value.trim() || type, type, opt: d.querySelector('.dd-opt').value.trim() }; });
  rows.addEventListener('click', (e) => { const b = e.target.closest('.dd-del'); if (!b) return; b.closest('.dd-row').remove(); api.run(); });
  rows.addEventListener('change', (e) => { if (e.target.classList.contains('dd-type')) e.target.closest('.dd-row').querySelector('.dd-name').placeholder = e.target.value; });
  $('btn-add-col').addEventListener('click', () => { addRow().querySelector('.dd-name').focus(); api.run(); });

  /* ── exports ── */
  const csvCell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const toCsv = (cols, data, header) => (header ? [cols.map(csvCell).join(',')] : []).concat(data.map((row) => cols.map((c) => csvCell(row[c])).join(','))).join('\n');
  const sqlVal = (v) => (v === '' || v === null || v === undefined ? 'NULL' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const toSql = (cols, data, table) => { const t = (table || 'data').replace(/[^\w]/g, '_'), out = []; for (let i = 0; i < data.length; i += 500) out.push(`INSERT INTO ${t} (${cols.map((c) => c.replace(/[^\w]/g, '_')).join(', ')}) VALUES\n${data.slice(i, i + 500).map((row) => `  (${cols.map((c) => sqlVal(row[c])).join(', ')})`).join(',\n')};`); return out.join('\n\n') + '\n'; };
  const toTxt = (cols, data) => { const w = cols.map((c) => Math.min(40, Math.max(c.length, ...data.slice(0, 200).map((r) => String(r[c] ?? '').length)))); const line = (vals) => vals.map((v, i) => String(v ?? '').slice(0, 40).padEnd(w[i])).join('  '); return [line(cols), line(w.map((x) => '-'.repeat(x))), ...data.map((r) => line(cols.map((c) => r[c])))].join('\n'); };

  let sessionSeed = Math.random().toString(36).slice(2, 10);
  const PANES = ['text', 'people', 'dataset'];
  const api = mount({
    slug: 'dummy-text-data-generator', debounce: 120,
    summary: ({ val }) => `${val('opt-seed').trim() ? 'Seed “' + val('opt-seed').trim() + '”' : 'Random seed'} · ${val('opt-domain')}`,
    onPill: (g, { pill, $: q }) => { if (g.id !== 'seg-mode') return; const m = pill('seg-mode'); PANES.forEach((k) => { q('pane-' + k).hidden = k !== m; }); },
    run: ({ val, pill, $: q }) => {
      const mode = pill('seg-mode') || 'text', seedStr = val('opt-seed').trim() || sessionSeed, r = rng(seedStr + '|' + mode), domain = val('opt-domain');
      q('output-text').hidden = mode !== 'text'; q('output-table-wrap').hidden = mode === 'text'; q('output-note').hidden = true;
      if (mode === 'text') {
        const count = Math.max(1, Math.min(500, Math.floor(+val('txt-count') || 1))), o = { flavour: val('txt-flavour'), unit: val('txt-unit'), count, format: val('txt-format'), loremStart: !!val('opt-lorem-start') };
        const text = genText(r, o), words = text.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
        q('output-text').textContent = text;
        return { text, ext: o.format === 'html' ? 'html' : o.format === 'md' ? 'md' : 'txt', badge: `${words.toLocaleString()} words · ${text.length.toLocaleString()} chars`, note: `${count} ${o.unit}`, ok: true, copyMsg: 'Text copied', cols: null };
      }
      let cols, data, table;
      if (mode === 'people') {
        const n = Math.max(1, Math.min(5000, Math.floor(+val('ppl-count') || 1))), loc = val('ppl-locale');
        const want = ['name', 'email', 'phone', 'city', 'address', 'dob', 'company', 'job', 'username'].filter((k) => val('ppl-' + k));
        if (!want.length) { q('output-note').hidden = false; q('output-note').textContent = 'Tick at least one field.'; return null; }
        cols = ['id', ...want]; data = []; for (let i = 0; i < n; i++) { const p = person(r, loc, domain, i); data.push(Object.fromEntries(cols.map((c) => [c, p[c]]))); } table = val('opt-table').trim() || 'people';
      } else {
        const n = Math.max(1, Math.min(10000, Math.floor(+val('ds-count') || 1))), loc = val('ds-locale'), sch = schema();
        if (!sch.length) { q('output-note').hidden = false; q('output-note').textContent = 'Add at least one column.'; return null; }
        cols = sch.map((c) => c.name); data = []; for (let i = 0; i < n; i++) { const p = person(r, loc, domain, i); data.push(Object.fromEntries(sch.map((c) => [c.name, cell(r, c.type, c.opt, p, i, domain)]))); } table = val('opt-table').trim() || 'data';
      }
      q('output-table').querySelector('thead').innerHTML = `<tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`;
      q('output-table').querySelector('tbody').innerHTML = data.slice(0, 50).map((row) => `<tr>${cols.map((c) => `<td>${esc(row[c] ?? '')}</td>`).join('')}</tr>`).join('');
      if (data.length > 50) { q('output-note').hidden = false; q('output-note').textContent = `Showing 50 of ${data.length.toLocaleString()} rows — downloads include all.`; }
      const csv = toCsv(cols, data, !!val('opt-header'));
      return { text: csv, ext: 'csv', mime: 'text/csv', badge: `${data.length.toLocaleString()} rows · ${cols.length} columns`, note: `Seed ${seedStr}`, ok: true, copyMsg: 'CSV copied', cols, data, table, csv };
    },
    download: (f, { S }) => {
      const o = S.out;
      if (!o.cols) return f === 'json' ? { text: JSON.stringify({ text: o.text }, null, 2), ext: 'json', mime: 'application/json' } : f === 'csv' || f === 'sql' ? (toast('Switch to People or Dataset for ' + f.toUpperCase()), null) : { text: o.text, ext: o.ext };
      if (f === 'json') return { text: JSON.stringify(o.data, null, 2), ext: 'json', mime: 'application/json' };
      if (f === 'sql') return { text: toSql(o.cols, o.data, o.table), ext: 'sql', mime: 'application/sql' };
      if (f === 'txt') return { text: toTxt(o.cols, o.data), ext: 'txt' };
      return { text: o.csv, ext: 'csv', mime: 'text/csv' };
    },
    filename: ({ pill }) => ({ text: 'dummy-text', people: 'people', dataset: 'dataset' }[pill('seg-mode') || 'text']),
    onReset: ({ $: q }) => { sessionSeed = Math.random().toString(36).slice(2, 10); PANES.forEach((k) => { q('pane-' + k).hidden = k !== 'text'; }); defaultRows(); q('output-text').textContent = ''; q('output-table').querySelector('tbody').innerHTML = ''; }
  });
  defaultRows();
  window.ToolityDummy = { rng, genText, person, cell, toSql, toCsv, api }; // for the page test
})();

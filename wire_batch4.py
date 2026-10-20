#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for batch 4 (rule 54): PDF Repair · Booklet & N-up Imposition · ZIP Maker & Extractor
(/docs/, new section "Files & Archives") · Chronometer & Lap Timer (/labs/ Experiments) · Chat Bubble (/widgets/, new section
"Notes & Messages"). SQL went inside Code Formatter (no new page). Cards A→Z per section (new section heads created) · home counts ·
REGISTRY in main.js · sitemap · llms.txt · cache bumps (pdf-common 1.1→1.2 lenient load, widget-common 1.2→1.3 multiline,
widget-embed.css 1.3→1.4 chat styles, main.js 4.9→5.0 REGISTRY) + generator constants.
Usage: python3 wire_batch4.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
DATE = '2026-10-20'
BUMPS = [('/scripts/pdf-common.js?v=1.1', '/scripts/pdf-common.js?v=1.2'), ('/scripts/widget-common.js?v=1.2', '/scripts/widget-common.js?v=1.3'),
         ('/styles/widget-embed.css?v=1.3', '/styles/widget-embed.css?v=1.4'), ('/styles/widget-embed.css?v=6.0', '/styles/widget-embed.css?v=1.4'),
         ('/scripts/main.js?v=4.9', '/scripts/main.js?v=5.0')]
node = lambda js: json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))
pick = "({slug,name,icon,cardDesc,tags,section,desc})=>({slug,name,icon,cardDesc,tags,section,desc})"
pdf = [dict(t, section=t.get('section') or 'PDF Tools') for t in node(f'console.log(JSON.stringify(require("./cfg_pdf_tools.js").filter(t=>["pdf-repair","pdf-booklet-nup"].includes(t.slug)).map({pick})))')]
docs = node(f'console.log(JSON.stringify(require("./cfg_docs_tools.js").filter(t=>t.slug==="zip-maker-extractor").map({pick})))')
labs = node(f'console.log(JSON.stringify(require("./cfg_web_tools.js").filter(t=>t.slug==="chronometer-lap-timer").map({pick})))')
wid = [dict(t, section='Notes & Messages') for t in node(f'console.log(JSON.stringify(require("./gen_widget_pages.js").filter(t=>t.slug==="chat-bubble").map({pick})))')]
assert len(pdf) == 2 and len(docs) == 1 and len(labs) == 1 and len(wid) == 1
BATCH = [('docs', 'Docs', pdf + docs, 'Open'), ('labs', 'Labs', labs, 'Open'), ('widgets', 'Widgets', wid, 'Customise')]
HOME = {'docs': 'Tools to compress, merge, convert and manage documents. ', 'labs': 'QR codes, link builders &amp; everyday utilities. '}
LLMS = {'docs': '## Docs — PDF and documents\n\n', 'labs': '## Labs — links, QR codes and everyday utilities\n\n', 'widgets': '## Widgets — embeddable widgets for Notion and websites\n\n'}

def rw(path, fn):
    p = ROOT / path; s = p.read_text(); n = fn(s)
    if n != s: p.write_text(n); print('updated', path)
    else: print('ok     ', path)

CARD = '''          <a href="{slug}/" class="category-glow-card">
            <div class="glow-card-content">
              <div class="tool-card-icon-badge">
                <iconify-icon icon="{icon}" width="20" height="20"></iconify-icon>
              </div>
              <div>
                <h3 class="tool-card-title">{name}</h3>
                <p class="tool-card-desc">{desc}</p>
              </div>
              <div class="tool-card-action">
                <span>{action}</span>
                <iconify-icon icon="lucide:arrow-right" width="15" height="15"></iconify-icon>
              </div>
            </div>
          </a>
'''
esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
totals = {}

# ── 1. category cards, per section, alphabetical; create missing section heads after the last grid ──
def cat_index(cfg, action, noun):
    def fn(s):
        for section in sorted({t['section'] for t in cfg}):
            head = f'<h2 class="tools-section-title">{esc(section)}</h2>\n        <div class="tools-grid">\n'
            if head not in s:
                last = [m.end() for m in re.finditer(r'\n {8}</div>\n', s)]  # end of the last tools-grid
                assert last, 'no grid to append after'
                s = s[:last[-1]] + '\n        ' + head + '        </div>\n' + s[last[-1]:]
            start = s.index(head) + len(head)
            m = re.search(r'(^|\n) {8}</div>', s[start:]); end = m.start() + start + len(m.group(1))
            existing = {m.group(1): m.group(0) for m in re.finditer(r'          <a href="([^"]+)/" class="category-glow-card">.*?</a>\n', s[start:end], flags=re.S)}
            for t in cfg:
                if t['section'] == section: existing[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'], desc=esc(t['cardDesc']), action=action)
            title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
            s = s[:start] + ''.join(sorted(existing.values(), key=title)) + s[end:]
        total = len(re.findall(r'class="category-glow-card"', s))
        s = re.sub(rf'<span>\d+ {noun}s? Available</span>', f'<span>{total} {noun}s Available</span>', s)
        assert all(f'href="{t["slug"]}/"' in s for t in cfg)
        return s
    return fn
for cat, label, cfg, action in BATCH:
    rw(f'{cat}/index.html', cat_index(cfg, action, 'Widget' if cat == 'widgets' else 'Tool'))
    totals[cat] = len(re.findall(r'class="category-glow-card"', (ROOT / f'{cat}/index.html').read_text()))

# ── 2. home counts ──
def home(s):
    for cat, text in HOME.items():
        s = re.sub(re.escape(text) + r'\d+ tools?\.', f'{text}{totals[cat]} tools.', s); assert f'{text}{totals[cat]} tools.' in s
    return s
rw('index.html', home)

# ── 3. REGISTRY in main.js (before cat-widgets; skip ones already present) ──
def registry(s):
    anchor = "      {\n        id: 'cat-widgets',"
    assert anchor in s
    q = lambda v: json.dumps(v, ensure_ascii=False) if isinstance(v, str) and "'" in v else json.dumps(v, ensure_ascii=False).replace('"', "'") if not isinstance(v, list) else '[' + ', '.join(q(x) for x in v) + ']'
    items = ''
    for cat, label, cfg, _ in BATCH:
        for t in cfg:
            if f"id: {q(t['slug'])}," in s: continue
            items += "      {\n        id: %s,\n        title: %s,\n        category: %s,\n        url: %s,\n        icon: %s,\n        tags: %s\n      },\n" % (q(t['slug']), q(t['name']), q(label), q(f"{cat}/{t['slug']}/"), q(t['icon']), q(t['tags']))
    return s.replace(anchor, items + anchor, 1)
rw('scripts/main.js', registry)

# ── 4. sitemap ──
def sitemap(s):
    add = ''.join(f'  <url>\n    <loc>https://toolity.in/{cat}/{t["slug"]}/</loc>\n    <lastmod>{DATE}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n' for cat, _, cfg, _ in BATCH for t in cfg if f'/{cat}/{t["slug"]}/' not in s)
    return s.replace('</urlset>', add + '</urlset>')
rw('sitemap.xml', sitemap)

# ── 5. llms.txt: per-category section, alphabetical ──
def llms(s):
    for cat, _, cfg, _ in BATCH:
        a = s.index(LLMS[cat]) + len(LLMS[cat]); b = s.index('\n## ', a)
        lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
        have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
        for t in cfg:
            if t['name'] not in have: lines.append(f"- [{t['name']}](https://toolity.in/{cat}/{t['slug']}/): {t['desc']}")
        lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
        s = s[:a] + '\n'.join(lines) + '\n' + s[b:]
    return s
rw('llms.txt', llms)

# ── 6. credits: JSZip (ZIP tool) and sql-formatter (SQL mode) are already credited — assert ──
cred = (ROOT / 'credits/index.html').read_text()
assert 'JSZip' in cred and 'sql-formatter' in cred, 'credits missing'

# ── 7. cache bumps site-wide + generator constants ──
for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'templates/tool-page.html', ROOT / 'templates/blog-post.html']:
    if '/.git/' in str(p) or '/scratch/' in str(p): continue
    s = p.read_text(); n = s
    for a, b in BUMPS: n = n.replace(a, b)
    if n != s: p.write_text(n)
for g in ['gen_pdf_pages.js', 'gen_web_pages.js', 'gen_media_pages.js', 'gen_widget_pages.js']:
    rw(g, lambda s: re.sub(r"const MAIN_V = '[\d.]+', CSS_V = '[\d.]+'", "const MAIN_V = '5.0', CSS_V = '6.4'", s))
rw('gen_pdf_pages.js', lambda s: s.replace('/scripts/pdf-common.js?v=1.1', '/scripts/pdf-common.js?v=1.2'))
rw('gen_widget_pages.js', lambda s: s.replace("WC_V = '1.2'", "WC_V = '1.3'").replace("EMBED_CSS_V = '6.0'", "EMBED_CSS_V = '1.4'").replace("EMBED_CSS_V = '5.9'", "EMBED_CSS_V = '1.4'"))
for a, _ in BUMPS:
    left = subprocess.run(['grep', '-rl', a, '--include=*.html', '--exclude-dir=.git', '--exclude-dir=scratch', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    assert not left, f'stale refs to {a}: ' + left
print('done ·', totals)

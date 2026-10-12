#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for the Labs web-utility batch (rule 54). Copy of wire_pdf.py with the
category literals parametrised. Cards on /labs/ (Web Utilities section re-sorted A→Z) · REGISTRY in main.js · sitemap ·
llms.txt · tools.txt backlog · counts · cache bumps (main.css 4.2→4.3 site-wide, main.js 3.3→3.4 site-wide).
Usage: python3 wire_web.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
CAT, CAT_LABEL, SECTION = 'labs', 'Labs', 'Web Utilities'
HOME_SENTENCE = 'QR codes, link builders &amp; everyday utilities. '
LLMS_HEAD = '## Labs — links, QR codes and everyday utilities\n\n'
BUMPS = [('/styles/main.css?v=4.2', '/styles/main.css?v=4.3'), ('/scripts/main.js?v=3.3', '/scripts/main.js?v=3.4')]
cfg = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require("./cfg_web_tools.js")))'], cwd=ROOT))
slugs = [t['slug'] for t in cfg]

def rw(path, fn):
    p = ROOT / path; s = p.read_text(); n = fn(s)
    if n != s: p.write_text(n); print('updated', path)
    else: print('ok     ', path)

# ── 1. category cards: rebuild the section grid alphabetically from existing cards + new ones ──
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
                <span>Open</span>
                <iconify-icon icon="lucide:arrow-right" width="15" height="15"></iconify-icon>
              </div>
            </div>
          </a>
'''
def cat_index(s):
    head = f'<h2 class="tools-section-title">{SECTION}</h2>\n        <div class="tools-grid">\n'
    start = s.index(head) + len(head)
    end = re.search(r'\n {8}</div>', s[start:]).start() + start + 1
    cards = re.findall(r'          <a href="([^"]+)/" class="category-glow-card">.*?</a>\n', s[start:end], flags=re.S)
    existing = {m: c for m, c in zip(cards, re.findall(r'(          <a href="[^"]+/" class="category-glow-card">.*?</a>\n)', s[start:end], flags=re.S))}
    for t in cfg: existing[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'], desc=t['cardDesc'])
    title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
    s = s[:start] + ''.join(sorted(existing.values(), key=title)) + s[end:]
    total = len(re.findall(r'class="category-glow-card"', s))
    s = re.sub(r'<span>\d+ Tools? Available</span>', f'<span>{total} Tools Available</span>', s)
    assert f'{total} Tools Available' in s and all(f'href="{x}/"' in s for x in slugs)
    return s
rw(f'{CAT}/index.html', cat_index)
cat_total = len(re.findall(r'class="category-glow-card"', (ROOT / f'{CAT}/index.html').read_text()))

# ── 2. home count ──
def home(s):
    n = re.sub(re.escape(HOME_SENTENCE) + r'\d+ tools?\.', f'{HOME_SENTENCE}{cat_total} tools.', s)
    assert f'{HOME_SENTENCE}{cat_total} tools.' in n; return n
rw('index.html', home)

# ── 3. REGISTRY in main.js (insert before cat-widgets; skip ones already present) ──
def registry(s):
    anchor = "      {\n        id: 'cat-widgets',"
    assert anchor in s
    q = lambda v: json.dumps(v).replace('"', "'")
    items = ''.join("      {\n        id: %s,\n        title: %s,\n        category: %s,\n        url: %s,\n        icon: %s,\n        tags: %s\n      },\n" % (q(t['slug']), q(t['name']), q(CAT_LABEL), q(f"{CAT}/{t['slug']}/"), q(t['icon']), q(t['tags'])) for t in cfg if f"id: '{t['slug']}'" not in s)
    return s.replace(anchor, items + anchor, 1)
rw('scripts/main.js', registry)

# ── 4. sitemap ──
def sitemap(s):
    add = ''.join(f'  <url>\n    <loc>https://toolity.in/{CAT}/{x}/</loc>\n    <lastmod>2026-10-12</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n' for x in slugs if f'/{CAT}/{x}/' not in s)
    return s.replace('</urlset>', add + '</urlset>')
rw('sitemap.xml', sitemap)

# ── 5. llms.txt: category section, alphabetical ──
def llms(s):
    a = s.index(LLMS_HEAD) + len(LLMS_HEAD); b = s.index('\n## ', a)
    lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
    have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
    for t in cfg:
        if t['name'] not in have: lines.append(f"- [{t['name']}](https://toolity.in/{CAT}/{t['slug']}/): {t['desc']}")
    lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
    return s[:a] + '\n'.join(lines) + '\n' + s[b:]
rw('llms.txt', llms)

# ── 6. tools.txt: the batch leaves the backlog (+ the Dev duplicate "Color Code Converter") ──
def backlog(s):
    names = {t['name'] for t in cfg} | {'Color Code Converter'}
    out = '\n'.join(l for l in s.split('\n') if not (l.startswith('- ') and l[2:] in names))
    assert 'Open Graph Preview' not in out and 'Color Code Converter' not in out; return out
rw('tools.txt', backlog)

# ── 7. cache bumps site-wide (main.css gained the .web-* block; main.js REGISTRY changed) ──
for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'gen_pdf_pages.js']:
    s = p.read_text(); n = s
    for a, b in BUMPS: n = n.replace(a, b)
    if n != s: p.write_text(n)
for a, _ in BUMPS:
    left = subprocess.run(['grep', '-rl', a, '--include=*.html', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    assert not left, f'stale refs to {a}: ' + left
print('done ·', CAT, 'total', cat_total)

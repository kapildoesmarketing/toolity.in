#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for the PDF batch (rule 54).
Cards on /docs/ (PDF Tools section re-sorted A→Z) · REGISTRY in main.js · sitemap · llms.txt · tools.txt backlog · counts · cache bumps.
Usage: python3 wire_pdf.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
cfg = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require("./cfg_pdf_tools.js")))'], cwd=ROOT))
slugs = [t['slug'] for t in cfg]

def rw(path, fn):
    p = ROOT / path; s = p.read_text(); n = fn(s)
    if n != s: p.write_text(n); print('updated', path)
    else: print('ok     ', path)

# ── 1. /docs/ cards: rebuild the PDF Tools grid alphabetically from existing cards + new ones ──
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
def docs_index(s):
    start = s.index('<h2 class="tools-section-title">PDF Tools</h2>\n        <div class="tools-grid">\n') + len('<h2 class="tools-section-title">PDF Tools</h2>\n        <div class="tools-grid">\n')
    end = re.search(r'\n {8}</div>', s[start:]).start() + start + 1  # exact 8-space closer of .tools-grid, not a deeper one inside a card
    cards = re.findall(r'          <a href="([^"]+)/" class="category-glow-card">.*?</a>\n', s[start:end], flags=re.S)
    existing = {m: c for m, c in zip(cards, re.findall(r'(          <a href="[^"]+/" class="category-glow-card">.*?</a>\n)', s[start:end], flags=re.S))}
    for t in cfg: existing[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'], desc=t['cardDesc'])
    title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
    body = ''.join(sorted(existing.values(), key=title))
    s = s[:start] + body + s[end:]
    total = len(re.findall(r'class="category-glow-card"', s))
    s = re.sub(r'<span>\d+ Tools Available</span>', f'<span>{total} Tools Available</span>', s)
    assert f'{total} Tools Available' in s and all(f'href="{x}/"' in s for x in slugs)
    return s
rw('docs/index.html', docs_index)
docs_total = len(re.findall(r'class="category-glow-card"', (ROOT / 'docs/index.html').read_text()))

# ── 2. home count ──
def home(s):
    n = re.sub(r'(Tools to compress, merge, convert and manage documents\. )\d+ tools\.', rf'\g<1>{docs_total} tools.', s)
    assert f'{docs_total} tools.' in n; return n
rw('index.html', home)

# ── 3. REGISTRY in main.js (insert before cat-widgets; skip ones already present) ──
def registry(s):
    anchor = "      {\n        id: 'cat-widgets',"
    assert anchor in s
    items = ''
    for t in cfg:
        if f"id: '{t['slug']}'" in s: continue
        items += "      {\n        id: %s,\n        title: %s,\n        category: 'Docs',\n        url: %s,\n        icon: %s,\n        tags: %s\n      },\n" % (
            json.dumps(t['slug']).replace('"', "'"), json.dumps(t['name']).replace('"', "'"), json.dumps('docs/' + t['slug'] + '/').replace('"', "'"), json.dumps(t['icon']).replace('"', "'"), json.dumps(t['tags']).replace('"', "'"))
    return s.replace(anchor, items + anchor, 1)
rw('scripts/main.js', registry)

# ── 4. sitemap ──
def sitemap(s):
    add = ''.join(f'  <url>\n    <loc>https://toolity.in/docs/{x}/</loc>\n    <lastmod>2026-10-12</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n' for x in slugs if f'/docs/{x}/' not in s)
    return s.replace('</urlset>', add + '</urlset>')
rw('sitemap.xml', sitemap)

# ── 5. llms.txt: Docs section, alphabetical ──
def llms(s):
    head = '## Docs — PDF and documents\n\n'; a = s.index(head) + len(head); b = s.index('\n## ', a)
    lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
    have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
    for t in cfg:
        if t['name'] not in have: lines.append(f"- [{t['name']}](https://toolity.in/docs/{t['slug']}/): {t['desc']}")
    lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
    return s[:a] + '\n'.join(lines) + '\n' + s[b:]
rw('llms.txt', llms)

# ── 6. tools.txt: the ten leave the backlog ──
def backlog(s):
    names = {t['name'] for t in cfg}
    out = '\n'.join(l for l in s.split('\n') if not (l.startswith('- ') and l[2:] in names))
    assert 'Images to PDF' not in out; return out
rw('tools.txt', backlog)

# ── 7. cache bumps: pdf-common 1.0→1.1 on existing PDF pages; main.js 3.2→3.3 site-wide (REGISTRY changed) ──
for p in ROOT.rglob('*/index.html'):
    if '.git' in p.parts or 'templates' in p.parts: continue
    s = p.read_text(); n = s.replace('/scripts/pdf-common.js?v=1.0', '/scripts/pdf-common.js?v=1.1').replace('/scripts/main.js?v=3.2', '/scripts/main.js?v=3.3')
    if n != s: p.write_text(n)
for p in [ROOT / 'index.html', ROOT / '404.html']:
    s = p.read_text(); n = s.replace('/scripts/main.js?v=3.2', '/scripts/main.js?v=3.3')
    if n != s: p.write_text(n)
left = subprocess.run(['grep', '-rl', 'main.js?v=3.2', '--include=*.html', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
assert not left, 'stale main.js refs: ' + left
print('done · docs total', docs_total)

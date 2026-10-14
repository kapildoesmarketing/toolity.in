#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for new widgets (rule 54). Reads gen_widget_pages.js exports.
/widgets/ Time & Focus cards (A→Z) + "N Widgets Available" · REGISTRY in main.js · sitemap · llms.txt · tools.txt backlog ·
cache bumps (widget-common 1.1→1.2, widget-embed.css 1.1→1.2, countdown.js 1.1→1.2 — they changed; main.js 3.6→3.7 site-wide).
Usage: python3 wire_widgets.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
SECTION = 'Time &amp; Focus'
BUMPS = [('/scripts/widget-common.js?v=1.1', '/scripts/widget-common.js?v=1.2'), ('/styles/widget-embed.css?v=1.1', '/styles/widget-embed.css?v=1.2'),
         ('/scripts/widgets/countdown.js?v=1.1', '/scripts/widgets/countdown.js?v=1.2'), ('/scripts/main.js?v=3.6', '/scripts/main.js?v=3.7')]
cfg = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require("./gen_widget_pages.js")))'], cwd=ROOT))
esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

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
                <span>Customise</span>
                <iconify-icon icon="lucide:arrow-right" width="15" height="15"></iconify-icon>
              </div>
            </div>
          </a>
'''
def cat_index(s):
    head = f'<h2 class="tools-section-title">{SECTION}</h2>\n        <div class="tools-grid">\n'
    assert head in s
    start = s.index(head) + len(head)
    end = re.search(r'\n {8}</div>', s[start:]).start() + start + 1
    existing = {m.group(1): m.group(0) for m in re.finditer(r'          <a href="([^"]+)/" class="category-glow-card">.*?</a>\n', s[start:end], flags=re.S)}
    for t in cfg: existing[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=esc(t['name']), desc=esc(t['cardDesc']))
    title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
    s = s[:start] + ''.join(sorted(existing.values(), key=title)) + s[end:]
    total = len(re.findall(r'class="category-glow-card"', s))
    s = re.sub(r'<span>\d+ Widgets? Available</span>', f'<span>{total} Widgets Available</span>', s)
    assert f'{total} Widgets Available' in s and all(f'href="{t["slug"]}/"' in s for t in cfg)
    return s
rw('widgets/index.html', cat_index)

def registry(s):
    anchor = "\n    ];\n\n    // Designed by Kapil Pidhwani: shared with /scripts/webmcp.js"
    assert anchor in s
    q = lambda v: json.dumps(v, ensure_ascii=False).replace('"', "'")
    items = ''.join(",\n      {\n        id: %s,\n        title: %s,\n        category: 'Widgets',\n        url: %s,\n        icon: %s,\n        tags: %s\n      }" % (q(t['slug']), q(t['name']), q(f"widgets/{t['slug']}/"), q(t['icon']), q(t['tags'])) for t in cfg if f"id: '{t['slug']}'" not in s)
    return s.replace(anchor, items + anchor, 1)
rw('scripts/main.js', registry)

def sitemap(s):
    add = ''.join(f'  <url>\n    <loc>https://toolity.in/widgets/{t["slug"]}/</loc>\n    <lastmod>2026-10-14</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n' for t in cfg if f'/widgets/{t["slug"]}/' not in s)
    return s.replace('</urlset>', add + '</urlset>')
rw('sitemap.xml', sitemap)

def llms(s):
    headline = '## Widgets — embeddable widgets for Notion and websites\n\n'
    a = s.index(headline) + len(headline); b = s.index('\n## ', a)
    lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
    have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
    for t in cfg:
        if t['name'] not in have: lines.append(f"- [{t['name']}](https://toolity.in/widgets/{t['slug']}/): {t['desc']}")
    lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
    return s[:a] + '\n'.join(lines) + '\n' + s[b:]
rw('llms.txt', llms)

def backlog(s):  # tools.txt entries are "- Name — what it covers"; match the part before " — "
    names = {t['name'] for t in cfg}
    return '\n'.join(l for l in s.split('\n') if not (l.startswith('- ') and l[2:].split(' — ')[0].strip() in names))
if (ROOT / 'tools.txt').exists(): rw('tools.txt', backlog)

for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'templates/tool-page.html']:
    s = p.read_text(); n = s
    for a, b in BUMPS: n = n.replace(a, b)
    if n != s: p.write_text(n)
for g in ['gen_pdf_pages.js', 'gen_web_pages.js', 'gen_media_pages.js']:
    rw(g, lambda s: re.sub(r"const MAIN_V = '[\d.]+'", "const MAIN_V = '3.7'", s))
for a, _ in BUMPS:
    left = subprocess.run(['grep', '-rl', a, '--include=*.html', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    assert not left, f'stale refs to {a}: ' + left
print('done')

#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for the Data batch (rule 54) — wire_web.py with sections per tool.
Cards on /data/ (Converters + Parsers sections, A→Z) · tool count · home Data count · REGISTRY in main.js (+ cat-data tags) ·
sitemap · llms.txt · tools.txt backlog · credits (js-yaml, smol-toml) · cache bumps for main.css / main.js.
Usage: python3 wire_data.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
CAT, CAT_LABEL = 'data', 'Data'
HOME_SENTENCE = 'Tools to parse and manipulate data. '
LLMS_HEAD = '## Data — parse and manipulate\n\n'
SECTIONS = ['Converters', 'Parsers']
EXISTING_SECTION = {'url-parameter-separator': 'Parsers'}
BUMPS = [('/styles/main.css?v=5.3', '/styles/main.css?v=5.4'), ('/scripts/main.js?v=4.0', '/scripts/main.js?v=4.1')]
cfg = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require("./cfg_data_tools.js")))'], cwd=ROOT))
slugs = [t['slug'] for t in cfg]

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
                <span>Open</span>
                <iconify-icon icon="lucide:arrow-right" width="15" height="15"></iconify-icon>
              </div>
            </div>
          </a>
'''
CARD_RE = r'          <a href="[^"]+/" class="category-glow-card">.*?</a>\n'

# ── 1. /data/ cards: collect every existing card, add/replace ours, rebuild the sections A→Z ──
def cat_index(s):
    a = s.index('    <section class="section-wrapper category-tools">\n      <div class="container">\n') + len('    <section class="section-wrapper category-tools">\n      <div class="container">\n')
    b = s.index('      </div>\n    </section>', a)
    cards = {re.search(r'href="([^"]+)/"', c).group(1): c for c in re.findall(CARD_RE, s[a:b], flags=re.S)}
    sec = dict(EXISTING_SECTION)
    for t in cfg:
        cards[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'].replace('&', '&amp;'), desc=t['cardDesc'].replace('&', '&amp;'))
        sec[t['slug']] = t['section']
    assert set(cards) <= set(sec), f'card without a section: {set(cards) - set(sec)}'
    title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
    body = ''
    for i, name in enumerate(SECTIONS):
        group = sorted((c for k, c in cards.items() if sec[k] == name), key=title)
        if not group: continue
        body += f'        <h2 class="tools-section-title">{name}</h2>\n        <div class="tools-grid">\n' + ''.join(group) + '        </div>\n'
    s = s[:a] + body + s[b:]
    total = len(cards)
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

# ── 3. REGISTRY (before cat-widgets) + richer cat-data tags ──
def registry(s):
    anchor = "      {\n        id: 'cat-widgets',"
    assert anchor in s
    q = lambda v: json.dumps(v, ensure_ascii=False).replace('"', "'")
    items = ''.join("      {\n        id: %s,\n        title: %s,\n        category: %s,\n        url: %s,\n        icon: %s,\n        tags: %s\n      },\n" % (q(t['slug']), q(t['name']), q(CAT_LABEL), q(f"{CAT}/{t['slug']}/"), q(t['icon']), q(t['tags'])) for t in cfg if f"id: '{t['slug']}'" not in s)
    s = s.replace(anchor, items + anchor, 1)
    old = "tags: ['data', 'parse', 'url', 'parameters', 'query', 'csv', 'table']"
    new = "tags: ['data', 'parse', 'url', 'parameters', 'query', 'csv', 'table', 'json', 'yaml', 'xml', 'convert', 'units', 'logs', 'extract']"
    if old in s: s = s.replace(old, new)
    assert new in s
    return s
rw('scripts/main.js', registry)

# ── 4. sitemap ──
def sitemap(s):
    add = ''.join(f'  <url>\n    <loc>https://toolity.in/{CAT}/{x}/</loc>\n    <lastmod>2026-10-17</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n' for x in slugs if f'/{CAT}/{x}/' not in s)
    return s.replace('</urlset>', add + '</urlset>')
rw('sitemap.xml', sitemap)

# ── 5. llms.txt: Data section, alphabetical ──
def llms(s):
    a = s.index(LLMS_HEAD) + len(LLMS_HEAD); b = s.index('\n## ', a)
    lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
    have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
    for t in cfg:
        if t['name'] not in have: lines.append(f"- [{t['name']}](https://toolity.in/{CAT}/{t['slug']}/): {t['desc']}")
    lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
    return s[:a] + '\n'.join(lines) + '\n' + s[b:]
rw('llms.txt', llms)

# ── 6. tools.txt backlog (local, gitignored) — match the name before " — " ──
def backlog(s):
    names = {'JSON Converter', 'Unit Converter', 'CSV Viewer & Editor', 'Text Extractor', 'Log Parser'}
    return '\n'.join(l for l in s.split('\n') if not (l.startswith('- ') and l[2:].split(' — ')[0] in names))
if (ROOT / 'tools.txt').exists(): rw('tools.txt', backlog)

# ── 7. credits: js-yaml + smol-toml cards after JSZip ──
CREDIT = '''            <!-- {name} -->
            <a href="{url}" target="_blank" rel="noopener noreferrer" class="credit-card">
              <div>
                <div class="credit-header">
                  <span class="credit-title">
                    <iconify-icon icon="{icon}" width="18" height="18"></iconify-icon>
                    {name}
                  </span>
                  <span class="credit-badge">{lic}</span>
                </div>
                <p class="credit-desc">
                  {desc}
                </p>
              </div>
              <span class="credit-link">
                {host}
                <iconify-icon icon="lucide:external-link" width="13" height="13"></iconify-icon>
              </span>
            </a>

'''
def credits(s):
    anchor = '            <!-- lamejs -->'
    assert anchor in s
    add = ''
    if '<!-- js-yaml -->' not in s: add += CREDIT.format(name='js-yaml', url='https://github.com/nodeca/js-yaml', icon='lucide:file-code', lic='MIT', host='github.com', desc='Reads and writes YAML in the JSON Converter, loaded only when YAML is chosen.')
    if '<!-- smol-toml -->' not in s: add += CREDIT.format(name='smol-toml', url='https://github.com/squirrelchat/smol-toml', icon='lucide:file-cog', lic='BSD-3-Clause', host='github.com', desc='Reads and writes TOML in the JSON Converter, loaded only when TOML is chosen.')
    return s.replace(anchor, add + anchor, 1)
rw('credits/index.html', credits)

# ── 8. cache bumps (main.css gained .web-convert-row etc.; main.js REGISTRY changed) ──
for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'templates/tool-page.html', ROOT / 'templates/blog-post.html']:
    s = p.read_text(); n = s
    for a, b in BUMPS: n = n.replace(a, b)
    if n != s: p.write_text(n)
for g in ROOT.glob('gen_*.js'):
    s = g.read_text(); n = re.sub(r"MAIN_V = '[\d.]+', CSS_V = '[\d.]+'", "MAIN_V = '4.1', CSS_V = '5.4'", s)
    if n != s: g.write_text(n)
for a, _ in BUMPS:
    left = subprocess.run(['grep', '-rl', a, '--include=*.html', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    assert not left, f'stale refs to {a}: ' + left
print('done ·', CAT, 'total', cat_total)

#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for the Generators batch (rule 54) — 5 Labs tools + 1 Dev tool.
Per category: cards rebuilt per section A→Z (existing cards keep the section they already sit in) · "N Tools Available" ·
home count · REGISTRY in main.js · sitemap · llms.txt. Then: tools.txt backlog · credits · main.js cache bump.
Usage: python3 wire_labs_dev.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib, html

ROOT = pathlib.Path(__file__).parent
MAIN_FROM, MAIN_TO = '/scripts/main.js?v=4.1', '/scripts/main.js?v=4.2'
CATS = [  # (slug, label, cfg file, home sentence, llms heading, slugs from that cfg to wire)
    ('labs', 'Labs', 'cfg_web_tools.js', 'QR codes, link builders &amp; everyday utilities. ', '## Labs — links, QR codes and everyday utilities\n\n',
     ['share-link-generator', 'youtube-link-generator', 'password-generator', 'upi-qr-generator', 'barcode-generator']),
    ('dev', 'Dev', 'cfg_dev_tools.js', 'Tools for software engineers to format, minify, inspect and validate. ', '## Dev — format, inspect, validate\n\n',
     ['code-formatter']),
]

def load(cfg): return json.loads(subprocess.check_output(['node', '-e', f'console.log(JSON.stringify(require("./{cfg}")))'], cwd=ROOT))

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
OPEN = '    <section class="section-wrapper category-tools">\n      <div class="container">\n'
H2_RE = r'        <h2 class="tools-section-title">(.*?)</h2>\n'

def cat_index(tools):
    def fn(s):
        a = s.index(OPEN) + len(OPEN); b = s.index('      </div>\n    </section>', a)
        order, cards, sec = [], {}, {}
        parts = re.split(H2_RE, s[a:b])  # ['', name1, body1, name2, body2…]
        for name, body in zip(parts[1::2], parts[2::2]):
            name = html.unescape(name); order.append(name)
            for c in re.findall(CARD_RE, body, flags=re.S):
                k = re.search(r'href="([^"]+)/"', c).group(1); cards[k] = c; sec[k] = name
        for t in tools:
            assert t['section'] in order, f"unknown section {t['section']}"
            cards[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'].replace('&', '&amp;'), desc=t['cardDesc'].replace('&', '&amp;'))
            sec[t['slug']] = t['section']
        title = lambda c: html.unescape(re.search(r'tool-card-title">([^<]+)<', c).group(1)).lower()
        body = ''
        for name in order:
            group = sorted((c for k, c in cards.items() if sec[k] == name), key=title)
            if group: body += f'        <h2 class="tools-section-title">{html.escape(name, quote=False)}</h2>\n        <div class="tools-grid">\n' + ''.join(group) + '        </div>\n'
        s = s[:a] + body + s[b:]
        n = len(cards)
        s = re.sub(r'<span>\d+ Tools? Available</span>', f'<span>{n} Tool{"" if n == 1 else "s"} Available</span>', s)
        assert f'{n} Tools Available' in s and all(f'href="{t["slug"]}/"' in s for t in tools)
        return s
    return fn

for cat, label, cfg_file, sentence, llms_head, wanted in CATS:
    tools = [t for t in load(cfg_file) if t['slug'] in wanted]
    assert len(tools) == len(wanted), f'{cat}: missing cfg entries'
    rw(f'{cat}/index.html', cat_index(tools))
    total = len(re.findall(r'class="category-glow-card"', (ROOT / f'{cat}/index.html').read_text()))

    def home(s, sentence=sentence, total=total):
        n = re.sub(re.escape(sentence) + r'\d+ tools?\.', f'{sentence}{total} tools.', s)
        assert f'{sentence}{total} tools.' in n, sentence; return n
    rw('index.html', home)

    def registry(s, tools=tools, cat=cat, label=label):
        anchor = "      {\n        id: 'cat-widgets',"
        assert anchor in s
        q = lambda v: json.dumps(v, ensure_ascii=False).replace('"', "'")
        items = ''.join("      {\n        id: %s,\n        title: %s,\n        category: %s,\n        url: %s,\n        icon: %s,\n        tags: %s\n      },\n" % (q(t['slug']), q(t['name']), q(label), q(f"{cat}/{t['slug']}/"), q(t['icon']), q(t['tags'])) for t in tools if f"id: '{t['slug']}'" not in s)
        return s.replace(anchor, items + anchor, 1)
    rw('scripts/main.js', registry)

    def sitemap(s, tools=tools, cat=cat):
        add = ''.join(f'  <url>\n    <loc>https://toolity.in/{cat}/{t["slug"]}/</loc>\n    <lastmod>2026-10-18</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n' for t in tools if f'/{cat}/{t["slug"]}/' not in s)
        return s.replace('</urlset>', add + '</urlset>')
    rw('sitemap.xml', sitemap)

    def llms(s, tools=tools, cat=cat, head=llms_head):
        a = s.index(head) + len(head); b = s.index('\n## ', a)
        lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
        have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
        lines += [f"- [{t['name']}](https://toolity.in/{cat}/{t['slug']}/): {t['desc']}" for t in tools if t['name'] not in have]
        lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
        return s[:a] + '\n'.join(lines) + '\n' + s[b:]
    rw('llms.txt', llms)
    print('·', cat, 'total', total)

# ── tools.txt backlog (local, gitignored) — match the name before " — " ──
NAMES = {'Share & Message Link Generator', 'YouTube Link & Embed Generator', 'Password Generator', 'UPI Payment QR Generator', 'Barcode Generator', 'Code Formatter & Minifier'}
def backlog(s):
    return '\n'.join(l for l in s.split('\n') if not (l.startswith('- ') and re.sub(r' \[NEW2?\]$', '', l[2:].split(' — ')[0]) in NAMES))
if (ROOT / 'tools.txt').exists(): rw('tools.txt', backlog)

# ── credits: one card per new library, before lamejs ──
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
LIBS = [
    ('Prettier', 'https://prettier.io', 'lucide:wand-sparkles', 'MIT', 'prettier.io', 'Beautifies HTML, CSS, SCSS, JavaScript, TypeScript, Markdown and YAML in the Code Formatter, loaded per language.'),
    ('Terser', 'https://terser.org', 'lucide:minimize-2', 'BSD-2-Clause', 'terser.org', 'Minifies JavaScript in the Code Formatter, loaded only when JS minify is used.'),
    ('CSSO', 'https://github.com/css/csso', 'lucide:paintbrush', 'MIT', 'github.com', 'Minifies CSS in the Code Formatter, loaded only when CSS minify is used.'),
    ('sql-formatter', 'https://github.com/sql-formatter-org/sql-formatter', 'lucide:database', 'MIT', 'github.com', 'Formats SQL in 8 dialects in the Code Formatter, loaded only when SQL is formatted.'),
    ('JsBarcode', 'https://github.com/lindell/JsBarcode', 'lucide:barcode', 'MIT', 'github.com', 'Draws Code 128, EAN, UPC, Code 39, ITF-14 and Codabar barcodes in the Barcode Generator.'),
    ('EFF Long Wordlist', 'https://www.eff.org/dice', 'lucide:dices', 'CC BY 3.0 US', 'eff.org', 'The 7,776 words behind passphrases in the Password Generator — by the Electronic Frontier Foundation.'),
]
def credits(s):
    anchor = '            <!-- lamejs -->'
    assert anchor in s
    add = ''.join(CREDIT.format(name=n, url=u, icon=i, lic=l, host=h, desc=d) for n, u, i, l, h, d in LIBS if f'<!-- {n} -->' not in s)
    return s.replace(anchor, add + anchor, 1)
rw('credits/index.html', credits)

# ── cache bump: main.js REGISTRY changed (main.css untouched this batch) ──
for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'templates/tool-page.html', ROOT / 'templates/blog-post.html']:
    s = p.read_text(); n = s.replace(MAIN_FROM, MAIN_TO)
    if n != s: p.write_text(n)
for g in ROOT.glob('gen_*.js'):
    s = g.read_text(); n = re.sub(r"MAIN_V = '[\d.]+'", "MAIN_V = '4.2'", s)
    if n != s: g.write_text(n)
left = subprocess.run(['grep', '-rl', MAIN_FROM, '--include=*.html', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
assert not left, 'stale main.js refs: ' + left
print('done')

#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for batch 7 (rule 54) — the rough.txt site-file checkers:
Cookie Header Decoder (/dev/ Encoders & Inspectors) · Robots.txt Tester · Sitemap Health Checker · ads.txt Validator
(/labs/ SEO & Site Helpers) · security.txt Validator (/labs/ Web Utilities).
Cards A→Z · home counts · REGISTRY · sitemap · llms.txt · `.td-more` details rule moved from 4 tool CSS files into main.css ·
bumps (main.css 6.5→6.6, main.js 5.2→5.3) + generator constants.  Usage: python3 wire_batch7.py  (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
DATE = '2026-10-20'
BUMPS = [('/styles/main.css?v=6.5', '/styles/main.css?v=6.6'), ('/scripts/main.js?v=5.2', '/scripts/main.js?v=5.3')]
node = lambda js: json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))
pick = "({slug,name,icon,cardDesc,tags,section,desc})=>({slug,name,icon,cardDesc,tags,section,desc})"
dev = node(f'console.log(JSON.stringify(require("./cfg_dev_tools.js").filter(t=>t.slug==="cookie-header-decoder").map({pick})))')
labs = node(f'console.log(JSON.stringify(require("./cfg_web_tools.js").filter(t=>["robots-txt-tester","sitemap-health-checker","ads-txt-validator","security-txt-validator"].includes(t.slug)).map({pick})))')
assert len(dev) == 1 and len(labs) == 4
BATCH = [('dev', 'Dev', dev, 'Open', 'Tool'), ('labs', 'Labs', labs, 'Open', 'Tool')]
HOME = {'labs': 'QR codes, link builders &amp; everyday utilities. ', 'dev': 'Tools for software engineers to format, minify, inspect and validate. '}
LLMS = {'dev': '## Dev — format, inspect, validate\n\n', 'labs': '## Labs — links, QR codes and everyday utilities\n\n'}

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

def cat_index(cfg, action, noun):
    def fn(s):
        for section in sorted({t['section'] for t in cfg}):
            head = f'<h2 class="tools-section-title">{esc(section)}</h2>\n        <div class="tools-grid">\n'
            assert head in s, f'missing section {section}'
            start = s.index(head) + len(head)
            m = re.search(r'(^|\n) {8}</div>', s[start:]); end = m.start() + start + len(m.group(1))
            existing = {m.group(1): m.group(0) for m in re.finditer(r'          <a href="([^"]+)/" class="category-glow-card">.*?</a>\n', s[start:end], flags=re.S)}
            for t in cfg:
                if t['section'] == section:
                    existing[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'], desc=esc(t['cardDesc']), action=action)
            title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
            s = s[:start] + ''.join(sorted(existing.values(), key=title)) + s[end:]
        total = len(re.findall(r'class="category-glow-card"', s))
        s = re.sub(rf'<span>\d+ {noun}s? Available</span>', f'<span>{total} {noun}s Available</span>', s)
        assert all(f'href="{t["slug"]}/"' in s for t in cfg)
        return s
    return fn
for cat, label, cfg, action, noun in BATCH:
    rw(f'{cat}/index.html', cat_index(cfg, action, noun))
    totals[cat] = len(re.findall(r'class="category-glow-card"', (ROOT / f'{cat}/index.html').read_text()))

def home(s):
    for cat, text in HOME.items():
        s = re.sub(re.escape(text) + r'\d+ tools?\.', f'{text}{totals[cat]} tools.', s); assert f'{text}{totals[cat]} tools.' in s
    return s
rw('index.html', home)

def registry(s):
    anchor = "      {\n        id: 'cat-widgets',"; assert anchor in s
    def q(v):
        if isinstance(v, list): return '[' + ', '.join(q(x) for x in v) + ']'
        return json.dumps(v, ensure_ascii=False) if "'" in v else json.dumps(v, ensure_ascii=False).replace('"', "'")
    items = ''
    for cat, label, cfg, _, _ in BATCH:
        for t in cfg:
            if f"id: {q(t['slug'])}," in s: continue
            items += "      {\n        id: %s,\n        title: %s,\n        category: %s,\n        url: %s,\n        icon: %s,\n        tags: %s\n      },\n" % (q(t['slug']), q(t['name']), q(label), q(f"{cat}/{t['slug']}/"), q(t['icon']), q(t['tags']))
    return s.replace(anchor, items + anchor, 1)
rw('scripts/main.js', registry)

def sitemap(s):
    add = ''.join(f'  <url>\n    <loc>https://toolity.in/{cat}/{t["slug"]}/</loc>\n    <lastmod>{DATE}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n' for cat, _, cfg, _, _ in BATCH for t in cfg if f'/{cat}/{t["slug"]}/' not in s)
    return s.replace('</urlset>', add + '</urlset>')
rw('sitemap.xml', sitemap)

def llms(s):
    for cat, _, cfg, _, _ in BATCH:
        a = s.index(LLMS[cat]) + len(LLMS[cat]); b = s.index('\n## ', a)
        lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
        have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
        for t in cfg:
            if t['name'] not in have: lines.append(f"- [{t['name']}](https://toolity.in/{cat}/{t['slug']}/): {t['desc']}")
        lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
        s = s[:a] + '\n'.join(lines) + '\n' + s[b:]
    return s
rw('llms.txt', llms)

# .td-more (collapsible "more" details under a tool output) → one shared rule in main.css; the 4 batch-7 copies go.
# tag-detector / consent-mode-checker keep their boxed variant (tool CSS loads after main.css, same specificity → it wins).
TD = '''/* Collapsible "more" sections under a tool output (robots / sitemap / ads.txt / security.txt checkers; tag tools override the box). */
.td-more { border-top: 1px solid var(--border); padding-top: 0.6rem; }
.td-more summary { cursor: pointer; font-size: 0.86rem; font-weight: 600; color: var(--text-secondary); min-height: 32px; display: flex; align-items: center; }
.td-more > :not(summary) { margin-top: 0.6rem; }
.td-more .web-code { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 0.78rem; max-height: 360px; overflow: auto; }
'''
def main_css(s):
    if '.td-more {' in s: return s
    anchor = '.web-checks { display: flex;'; assert anchor in s
    return s.replace(anchor, TD + anchor, 1)
rw('styles/main.css', main_css)
for slug in ['robots-txt-tester', 'sitemap-health-checker', 'ads-txt-validator', 'security-txt-validator']:
    rw(f'styles/tools/{slug}.css', lambda s: re.sub(r'\n\.td-more[^\n]*', '', s).rstrip('\n') + '\n')
    assert '.td-more' not in (ROOT / f'styles/tools/{slug}.css').read_text()

for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'templates/tool-page.html', ROOT / 'templates/blog-post.html']:
    if '/.git/' in str(p) or '/scratch/' in str(p) or '/node_modules/' in str(p): continue
    s = p.read_text(); n = s
    for a, b in BUMPS: n = n.replace(a, b)
    if n != s: p.write_text(n)
for g in ['gen_pdf_pages.js', 'gen_web_pages.js', 'gen_media_pages.js', 'gen_widget_pages.js', 'gen_game_pages.js']:
    rw(g, lambda s: re.sub(r"const MAIN_V = '[\d.]+', CSS_V = '[\d.]+'", "const MAIN_V = '5.3', CSS_V = '6.6'", s))
for a, _ in BUMPS:
    left = subprocess.run(['grep', '-rl', a, '--include=*.html', '--include=*.js', '--exclude-dir=.git', '--exclude-dir=scratch', '--exclude-dir=node_modules', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    assert not left, f'stale refs to {a}: ' + left
print('done ·', totals)

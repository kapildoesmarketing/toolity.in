#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for batch 5 (rule 54): Keyboard Shortcut Cheat-Sheet Maker · Accessibility Contrast
Matrix · Responsive Breakpoint Previewer (/labs/ Web Utilities) · Spreadsheet Formula Converter (/data/ Converters) + blog post #1
(/blog/are-free-online-file-converters-safe/) with the upgraded template. Cards A→Z · home counts · REGISTRY · sitemap (tools + post) ·
llms.txt · blog index card · cache bumps (main.css 6.4→6.5 blog components, main.js 5.0→5.1 TOC builder + REGISTRY) + generator constants.
Usage: python3 wire_batch5.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
DATE = '2026-10-20'
POST = {'slug': 'are-free-online-file-converters-safe', 'title': 'Are Free Online File Converters Safe? Why Client-Side Processing Is the Future of Web Privacy', 'date': '2026-10-20', 'human': '20 October 2026', 'summary': 'What happens to a file after you click Upload, how in-browser processing removes the risk, and a 7-point checklist to test any tool yourself.'}
BUMPS = [('/styles/main.css?v=6.4', '/styles/main.css?v=6.5'), ('/scripts/main.js?v=5.0', '/scripts/main.js?v=5.1')]
node = lambda js: json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))
pick = "({slug,name,icon,cardDesc,tags,section,desc})=>({slug,name,icon,cardDesc,tags,section,desc})"
labs = node(f'console.log(JSON.stringify(require("./cfg_web_tools.js").filter(t=>["keyboard-shortcut-cheat-sheet-maker","accessibility-contrast-matrix","responsive-breakpoint-previewer"].includes(t.slug)).map({pick})))')
data = node(f'console.log(JSON.stringify(require("./cfg_data_tools.js").filter(t=>t.slug==="spreadsheet-formula-converter").map({pick})))')
assert len(labs) == 3 and len(data) == 1
BATCH = [('labs', 'Labs', labs), ('data', 'Data', data)]
HOME = {'labs': 'QR codes, link builders &amp; everyday utilities. ', 'data': 'Tools to parse and manipulate data. '}
LLMS = {'labs': '## Labs — links, QR codes and everyday utilities\n\n', 'data': '## Data — parse and manipulate\n\n'}

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
esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
totals = {}

# ── 1. category cards, per section, alphabetical ──
def cat_index(cfg):
    def fn(s):
        for section in sorted({t['section'] for t in cfg}):
            head = f'<h2 class="tools-section-title">{esc(section)}</h2>\n        <div class="tools-grid">\n'
            assert head in s, section
            start = s.index(head) + len(head)
            m = re.search(r'(^|\n) {8}</div>', s[start:]); end = m.start() + start + len(m.group(1))
            existing = {m.group(1): m.group(0) for m in re.finditer(r'          <a href="([^"]+)/" class="category-glow-card">.*?</a>\n', s[start:end], flags=re.S)}
            for t in cfg:
                if t['section'] == section: existing[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'], desc=esc(t['cardDesc']))
            title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
            s = s[:start] + ''.join(sorted(existing.values(), key=title)) + s[end:]
        total = len(re.findall(r'class="category-glow-card"', s))
        s = re.sub(r'<span>\d+ Tools? Available</span>', f'<span>{total} Tools Available</span>', s)
        assert all(f'href="{t["slug"]}/"' in s for t in cfg)
        return s
    return fn
for cat, label, cfg in BATCH:
    rw(f'{cat}/index.html', cat_index(cfg))
    totals[cat] = len(re.findall(r'class="category-glow-card"', (ROOT / f'{cat}/index.html').read_text()))

# ── 2. home counts ──
def home(s):
    for cat, text in HOME.items():
        s = re.sub(re.escape(text) + r'\d+ tools?\.', f'{text}{totals[cat]} tools.', s); assert f'{text}{totals[cat]} tools.' in s
    return s
rw('index.html', home)

# ── 3. REGISTRY in main.js ──
def registry(s):
    anchor = "      {\n        id: 'cat-widgets',"
    assert anchor in s
    def q(v):
        if isinstance(v, list): return '[' + ', '.join(q(x) for x in v) + ']'
        return json.dumps(v, ensure_ascii=False) if "'" in v else json.dumps(v, ensure_ascii=False).replace('"', "'")
    items = ''
    for cat, label, cfg in BATCH:
        for t in cfg:
            if f"id: {q(t['slug'])}," in s: continue
            items += "      {\n        id: %s,\n        title: %s,\n        category: %s,\n        url: %s,\n        icon: %s,\n        tags: %s\n      },\n" % (q(t['slug']), q(t['name']), q(label), q(f"{cat}/{t['slug']}/"), q(t['icon']), q(t['tags']))
    return s.replace(anchor, items + anchor, 1)
rw('scripts/main.js', registry)

# ── 4. sitemap: tools + blog post ──
def sitemap(s):
    add = ''.join(f'  <url>\n    <loc>https://toolity.in/{cat}/{t["slug"]}/</loc>\n    <lastmod>{DATE}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n' for cat, _, cfg in BATCH for t in cfg if f'/{cat}/{t["slug"]}/' not in s)
    post = f'https://toolity.in/blog/{POST["slug"]}/'
    if post not in s:
        anchor = '    <loc>https://toolity.in/blog/</loc>'; assert anchor in s
        i = s.index('</url>', s.index(anchor)) + len('</url>\n')
        s = s[:i] + f'  <url>\n    <loc>{post}</loc>\n    <lastmod>{POST["date"]}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n' + s[i:]
    return s.replace('</urlset>', add + '</urlset>')
rw('sitemap.xml', sitemap)

# ── 5. llms.txt ──
def llms(s):
    for cat, _, cfg in BATCH:
        a = s.index(LLMS[cat]) + len(LLMS[cat]); b = s.index('\n## ', a)
        lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
        have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
        for t in cfg:
            if t['name'] not in have: lines.append(f"- [{t['name']}](https://toolity.in/{cat}/{t['slug']}/): {t['desc']}")
        lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
        s = s[:a] + '\n'.join(lines) + '\n' + s[b:]
    line = f"- [{POST['title']}](https://toolity.in/blog/{POST['slug']}/): {POST['summary']}"
    if POST['slug'] not in s:
        anchor = '- [Blog](https://toolity.in/blog/)'; assert anchor in s
        s = s.replace(anchor, anchor + '\n' + line, 1)
    return s
rw('llms.txt', llms)

# ── 6. blog index card (newest first) ──
def blog_index(s):
    if f'/blog/{POST["slug"]}/' in s: return s
    anchor = '<ul class="blog-list">'; assert anchor in s
    card = f'\n          <li><a class="blog-card" href="/blog/{POST["slug"]}/"><time datetime="{POST["date"]}">{POST["human"]}</time><h2>{esc(POST["title"])}</h2><p>{esc(POST["summary"])}</p></a></li>'
    return s.replace(anchor, anchor + card, 1).replace('</li>\n        </ul>', '</li>\n        </ul>')
rw('blog/index.html', blog_index)
assert (ROOT / f'blog/{POST["slug"]}/og.png').exists(), 'run gen_og_image.js first'

# ── 7. cache bumps site-wide + generator constants ──
for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'templates/tool-page.html', ROOT / 'templates/blog-post.html']:
    if '/.git/' in str(p) or '/scratch/' in str(p): continue
    s = p.read_text(); n = s
    for a, b in BUMPS: n = n.replace(a, b)
    if n != s: p.write_text(n)
for g in ['gen_pdf_pages.js', 'gen_web_pages.js', 'gen_media_pages.js', 'gen_widget_pages.js']:
    rw(g, lambda s: re.sub(r"const MAIN_V = '[\d.]+', CSS_V = '[\d.]+'", "const MAIN_V = '5.1', CSS_V = '6.5'", s))
for a, _ in BUMPS:
    left = subprocess.run(['grep', '-rl', a, '--include=*.html', '--exclude-dir=.git', '--exclude-dir=scratch', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    assert not left, f'stale refs to {a}: ' + left
print('done ·', totals)

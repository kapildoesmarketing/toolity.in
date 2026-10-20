#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for batch 3 (rule 54): Shape Crop · Video to Sticker · Chat Mockup · Social Post
Mockups · Audio Visualizer · Audio to Text — all /media/. Cards re-sorted A→Z inside each section · home count · REGISTRY in main.js ·
sitemap · llms.txt · tools.txt backlog · credits check (Whisper, added by hand) · cache bumps (main.css 6.3→6.4 [mockup editor rules],
main.js 4.8→4.9 [REGISTRY], video-common 1.0→1.1 [mime override · R.set · renderLive]) + generator constants.
Usage: python3 wire_batch3.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
CAT, LABEL = 'media', 'Media'
HOME = 'Image, video, GIF &amp; audio — compress, convert, tweak. '
LLMS_HEAD = '## Media — image, video, GIF and audio\n\n'
BUMPS = [('/styles/main.css?v=6.3', '/styles/main.css?v=6.4'), ('/scripts/main.js?v=4.8', '/scripts/main.js?v=4.9'), ('/scripts/video-common.js?v=1.0', '/scripts/video-common.js?v=1.1')]
cfg = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require("./cfg_batch3_tools.js").map(({slug,name,icon,cardDesc,tags,section,desc})=>({slug,name,icon,cardDesc,tags,section,desc}))))'], cwd=ROOT))
assert len(cfg) == 6, cfg

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

# ── 1. category cards, per section, alphabetical ──
def cat_index(s):
    for section in sorted({t['section'] for t in cfg}):
        head = f'<h2 class="tools-section-title">{esc(section)}</h2>\n        <div class="tools-grid">\n'
        assert head in s, section
        start = s.index(head) + len(head)
        end = re.search(r'\n {8}</div>', s[start:]).start() + start + 1
        existing = {m.group(1): m.group(0) for m in re.finditer(r'          <a href="([^"]+)/" class="category-glow-card">.*?</a>\n', s[start:end], flags=re.S)}
        for t in cfg:
            if t['section'] == section: existing[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'], desc=esc(t['cardDesc']))
        title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
        s = s[:start] + ''.join(sorted(existing.values(), key=title)) + s[end:]
    total = len(re.findall(r'class="category-glow-card"', s))
    s = re.sub(r'<span>\d+ Tools? Available</span>', f'<span>{total} Tools Available</span>', s)
    assert all(f'href="{t["slug"]}/"' in s for t in cfg)
    return s
rw(f'{CAT}/index.html', cat_index)
total = len(re.findall(r'class="category-glow-card"', (ROOT / f'{CAT}/index.html').read_text()))

# ── 2. home count ──
def home(s):
    n = re.sub(re.escape(HOME) + r'\d+ tools?\.', f'{HOME}{total} tools.', s)
    assert f'{HOME}{total} tools.' in n; return n
rw('index.html', home)

# ── 3. REGISTRY in main.js (before cat-widgets; skip ones already present) ──
def registry(s):
    anchor = "      {\n        id: 'cat-widgets',"
    assert anchor in s
    q = lambda v: json.dumps(v, ensure_ascii=False).replace('"', "'")
    items = ''.join("      {\n        id: %s,\n        title: %s,\n        category: %s,\n        url: %s,\n        icon: %s,\n        tags: %s\n      },\n" % (q(t['slug']), q(t['name']), q(LABEL), q(f"{CAT}/{t['slug']}/"), q(t['icon']), q(t['tags'])) for t in cfg if f"id: '{t['slug']}'" not in s)
    return s.replace(anchor, items + anchor, 1)
rw('scripts/main.js', registry)

# ── 4. sitemap ──
def sitemap(s):
    add = ''.join(f'  <url>\n    <loc>https://toolity.in/{CAT}/{t["slug"]}/</loc>\n    <lastmod>2026-10-20</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n' for t in cfg if f'/{CAT}/{t["slug"]}/' not in s)
    return s.replace('</urlset>', add + '</urlset>')
rw('sitemap.xml', sitemap)

# ── 5. llms.txt: media section, alphabetical ──
def llms(s):
    a = s.index(LLMS_HEAD) + len(LLMS_HEAD); b = s.index('\n## ', a)
    lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
    have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
    for t in cfg:
        if t['name'] not in have: lines.append(f"- [{t['name']}](https://toolity.in/{CAT}/{t['slug']}/): {t['desc']}")
    lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
    return s[:a] + '\n'.join(lines) + '\n' + s[b:]
rw('llms.txt', llms)

# ── 6. tools.txt backlog: drop the shipped ideas (names carry a [NEW4] tag there) ──
SHIPPED = {'Shape Crop', 'Social Post Mockups', 'Video to WhatsApp / Telegram Sticker', 'Audio Visualizer Video', 'Audio to Text', 'Instagram / WhatsApp Chat Mockup'}
def backlog(s):
    keep = lambda l: not (l.startswith('- ') and re.sub(r'\s*\[NEW\d*\]', '', l[2:].split(' — ')[0]).strip() in SHIPPED)
    out = '\n'.join(l for l in s.split('\n') if keep(l))
    assert 'Shape Crop [NEW4]' not in out and 'Audio to Text [NEW4]' not in out; return out
if (ROOT / 'tools.txt').exists(): rw('tools.txt', backlog)

# ── 7. credits: Whisper card was added by hand with the tool — assert it is there ──
assert 'Whisper (tiny · base · small)' in (ROOT / 'credits/index.html').read_text(), 'credits: Whisper card missing'

# ── 8. cache bumps site-wide + generator constants ──
for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'templates/tool-page.html', ROOT / 'templates/blog-post.html']:
    if '/.git/' in str(p) or '/scratch/' in str(p): continue
    s = p.read_text(); n = s
    for a, b in BUMPS: n = n.replace(a, b)
    if n != s: p.write_text(n)
for g in ['gen_pdf_pages.js', 'gen_web_pages.js', 'gen_media_pages.js', 'gen_widget_pages.js']:
    if (ROOT / g).exists(): rw(g, lambda s: re.sub(r"const MAIN_V = '[\d.]+', CSS_V = '[\d.]+';", "const MAIN_V = '4.9', CSS_V = '6.4';", s))
rw('gen_media_pages.js', lambda s: s.replace("/scripts/video-common.js?v=1.0", "/scripts/video-common.js?v=1.1"))
for a, _ in BUMPS:
    left = subprocess.run(['grep', '-rl', a, '--include=*.html', '--exclude-dir=.git', '--exclude-dir=scratch', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    assert not left, f'stale refs to {a}: ' + left
print('done ·', CAT, 'total', total)

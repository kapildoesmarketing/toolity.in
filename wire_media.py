#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for media batch 2 + Labs Camera (rule 54). Generalises wire_web.py to several
category sections: cards re-sorted A→Z inside each tool's section · home counts · REGISTRY in main.js · sitemap · llms.txt ·
tools.txt backlog · credits (Kokoro) · cache bumps (main.css 4.4→4.5, main.js 3.5→3.6 site-wide; audio-common 1.0→1.1 on audio pages).
Usage: python3 wire_media.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
CAT_LABEL = {'media': 'Media', 'labs': 'Labs'}
HOME = {'media': 'Image, video, GIF &amp; audio — compress, convert, tweak. ', 'labs': 'QR codes, link builders &amp; everyday utilities. '}
LLMS_HEAD = {'media': '## Media — image, video, GIF and audio\n\n', 'labs': '## Labs — links, QR codes and everyday utilities\n\n'}
BUMPS = [('/styles/main.css?v=4.4', '/styles/main.css?v=4.5'), ('/scripts/main.js?v=3.5', '/scripts/main.js?v=3.6'), ('/scripts/audio-common.js?v=1.0', '/scripts/audio-common.js?v=1.1')]
cfg = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require("./cfg_media_tools.js").map(({slug,cat,name,icon,cardDesc,tags,section,desc})=>({slug,cat:cat||"media",name,icon,cardDesc,tags,section,desc}))))'], cwd=ROOT))

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
def cat_index(cat):
    def fn(s):
        for section in sorted({t['section'] for t in cfg if t['cat'] == cat}):
            head = f'<h2 class="tools-section-title">{esc(section)}</h2>\n        <div class="tools-grid">\n'
            assert head in s, (cat, section)
            start = s.index(head) + len(head)
            end = re.search(r'\n {8}</div>', s[start:]).start() + start + 1
            existing = {m.group(1): m.group(0) for m in re.finditer(r'          <a href="([^"]+)/" class="category-glow-card">.*?</a>\n', s[start:end], flags=re.S)}
            for t in cfg:
                if t['cat'] == cat and t['section'] == section: existing[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'], desc=esc(t['cardDesc']))
            title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
            s = s[:start] + ''.join(sorted(existing.values(), key=title)) + s[end:]
        total = len(re.findall(r'class="category-glow-card"', s))
        s = re.sub(r'<span>\d+ Tools? Available</span>', f'<span>{total} Tools Available</span>', s)
        assert all(f'href="{t["slug"]}/"' in s for t in cfg if t['cat'] == cat)
        return s
    return fn
totals = {}
for cat in CAT_LABEL:
    rw(f'{cat}/index.html', cat_index(cat))
    totals[cat] = len(re.findall(r'class="category-glow-card"', (ROOT / f'{cat}/index.html').read_text()))

# ── 2. home counts ──
def home(s):
    for cat, sent in HOME.items():
        s = re.sub(re.escape(sent) + r'\d+ tools?\.', f'{sent}{totals[cat]} tools.', s)
        assert f'{sent}{totals[cat]} tools.' in s, cat
    return s
rw('index.html', home)

# ── 3. REGISTRY in main.js (before cat-widgets; skip ones already present) ──
def registry(s):
    anchor = "      {\n        id: 'cat-widgets',"
    assert anchor in s
    q = lambda v: json.dumps(v, ensure_ascii=False).replace('"', "'")
    items = ''.join("      {\n        id: %s,\n        title: %s,\n        category: %s,\n        url: %s,\n        icon: %s,\n        tags: %s\n      },\n" % (q(t['slug']), q(t['name']), q(CAT_LABEL[t['cat']]), q(f"{t['cat']}/{t['slug']}/"), q(t['icon']), q(t['tags'])) for t in cfg if f"id: '{t['slug']}'" not in s)
    return s.replace(anchor, items + anchor, 1)
rw('scripts/main.js', registry)

# ── 4. sitemap ──
def sitemap(s):
    add = ''.join(f'  <url>\n    <loc>https://toolity.in/{t["cat"]}/{t["slug"]}/</loc>\n    <lastmod>2026-10-13</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n' for t in cfg if f'/{t["cat"]}/{t["slug"]}/' not in s)
    return s.replace('</urlset>', add + '</urlset>')
rw('sitemap.xml', sitemap)

# ── 5. llms.txt: category sections, alphabetical ──
def llms(s):
    for cat, headline in LLMS_HEAD.items():
        a = s.index(headline) + len(headline); b = s.index('\n## ', a)
        lines = [l for l in s[a:b].strip().split('\n') if l.strip()]
        have = {re.search(r'\[([^\]]+)\]', l).group(1) for l in lines}
        for t in cfg:
            if t['cat'] == cat and t['name'] not in have: lines.append(f"- [{t['name']}](https://toolity.in/{cat}/{t['slug']}/): {t['desc']}")
        lines.sort(key=lambda l: re.search(r'\[([^\]]+)\]', l).group(1).lower())
        s = s[:a] + '\n'.join(lines) + '\n' + s[b:]
    return s
rw('llms.txt', llms)

# ── 6. tools.txt backlog (local only, gitignored) ──
def backlog(s):
    names = {t['name'] for t in cfg} | {'Image Resizer', 'Image Cropper', 'Beat / BPM Detector', 'Audio Normalizer (LUFS)'}
    return '\n'.join(l for l in s.split('\n') if not (l.startswith('- ') and l[2:].strip() in names))
if (ROOT / 'tools.txt').exists(): rw('tools.txt', backlog)

# ── 7. credits: Kokoro (kokoro-js + model) ──
KOKORO = '''            <!-- Kokoro TTS -->
            <a href="https://github.com/hexgrad/kokoro" target="_blank" rel="noopener noreferrer" class="credit-card">
              <div>
                <div class="credit-header">
                  <span class="credit-title">
                    <iconify-icon icon="lucide:speech" width="18" height="18"></iconify-icon>
                    Kokoro-82M &amp; kokoro-js
                  </span>
                  <span class="credit-badge">Apache-2.0</span>
                </div>
                <p class="credit-desc">
                  Open-weight 82M-parameter text-to-speech model, run in the browser by kokoro-js on Transformers.js — powers the AI voice in Text to Speech.
                </p>
              </div>
              <span class="credit-link">
                github.com
                <iconify-icon icon="lucide:external-link" width="13" height="13"></iconify-icon>
              </span>
            </a>

            <!-- MODNet -->'''
def credits(s):
    if 'Kokoro TTS' in s: return s
    assert s.count('            <!-- MODNet -->') == 1
    return s.replace('            <!-- MODNet -->', KOKORO, 1)
rw('credits/index.html', credits)

# ── 8. cache bumps site-wide + generator constants ──
for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'templates/tool-page.html']:
    s = p.read_text(); n = s
    for a, b in BUMPS: n = n.replace(a, b)
    if n != s: p.write_text(n)
for g in ['gen_pdf_pages.js', 'gen_web_pages.js']:
    rw(g, lambda s: re.sub(r"const MAIN_V = '[\d.]+', CSS_V = '[\d.]+';", "const MAIN_V = '3.6', CSS_V = '4.5';", s))
for a, _ in BUMPS:
    left = subprocess.run(['grep', '-rl', a, '--include=*.html', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    assert not left, f'stale refs to {a}: ' + left
print('done ·', totals)

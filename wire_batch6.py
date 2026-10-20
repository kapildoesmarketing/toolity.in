#!/usr/bin/env python3
"""Designed by Kapil Pidhwani: idempotent wiring for batch 6 (rule 54): Button Grid · Calculator · Weather (/widgets/ new section
"Dashboard Blocks") · World Clocks (/widgets/ Time & Focus) · Nonogram (/games/ Puzzle & Board) · Number Formats Converter (/data/
Converters) · Ambient Focus Room (/labs/ Experiments) · Tag Detector · Consent Mode Checker (/labs/ SEO & Site Helpers).
Cards A→Z (new widget section created) · home counts · REGISTRY · sitemap · llms.txt · privacy + credits (Open-Meteo) · bumps
(widget-embed.css 1.4→1.5 new widgets, main.js 5.1→5.2 REGISTRY) + generator constants.
Usage: python3 wire_batch6.py   (asserts on every anchor; safe to re-run)"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).parent
DATE = '2026-10-20'
BUMPS = [('/styles/widget-embed.css?v=1.4', '/styles/widget-embed.css?v=1.5'), ('/scripts/main.js?v=5.1', '/scripts/main.js?v=5.2')]
node = lambda js: json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))
pick = "({slug,name,icon,cardDesc,tags,section,desc})=>({slug,name,icon,cardDesc,tags,section,desc})"
wid = node(f'console.log(JSON.stringify(require("./gen_widget_pages.js").filter(t=>["button-grid","calculator","world-clocks","weather"].includes(t.slug)).map({pick})))')
for w in wid: w['section'] = 'Time & Focus' if w['slug'] == 'world-clocks' else 'Dashboard Blocks'
games = node(f'console.log(JSON.stringify(require("./cfg_game_tools.js").filter(t=>t.slug==="nonogram").map({pick})))')
data = node(f'console.log(JSON.stringify(require("./cfg_data_tools.js").filter(t=>t.slug==="number-formats-converter").map({pick})))')
labs = node(f'console.log(JSON.stringify(require("./cfg_web_tools.js").filter(t=>["ambient-focus-room","tag-detector","consent-mode-checker"].includes(t.slug)).map({pick})))')
assert len(wid) == 4 and len(games) == 1 and len(data) == 1 and len(labs) == 3
BATCH = [('widgets', 'Widgets', wid, 'Customise', 'Widget'), ('games', 'Games', games, 'Play', 'Tool'), ('data', 'Data', data, 'Open', 'Tool'), ('labs', 'Labs', labs, 'Open', 'Tool')]
HOME = {'labs': 'QR codes, link builders &amp; everyday utilities. ', 'data': 'Tools to parse and manipulate data. ', 'games': 'Quick browser games that run instantly — no download, no account. '}
LLMS = {'widgets': '## Widgets — embeddable widgets for Notion and websites\n\n', 'games': '## Games\n\n', 'data': '## Data — parse and manipulate\n\n', 'labs': '## Labs — links, QR codes and everyday utilities\n\n'}

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
            if head not in s:
                last = [m.end() for m in re.finditer(r'\n {8}</div>\n', s)]; assert last
                s = s[:last[-1]] + '\n        ' + head + '        </div>\n' + s[last[-1]:]
            start = s.index(head) + len(head)
            m = re.search(r'(^|\n) {8}</div>', s[start:]); end = m.start() + start + len(m.group(1))
            existing = {m.group(1): m.group(0) for m in re.finditer(r'          <a href="([^"]+)/" class="category-glow-card">.*?</a>\n', s[start:end], flags=re.S)}
            for t in cfg:
                if t['section'] == section:
                    old_action = re.search(r'tool-card-action">\s*<span>([^<]+)<', existing.get(t['slug'], '')) if t['slug'] in existing else None
                    existing[t['slug']] = CARD.format(slug=t['slug'], icon=t['icon'], name=t['name'], desc=esc(t['cardDesc']), action=action)
            title = lambda c: re.search(r'tool-card-title">([^<]+)<', c).group(1).lower()
            s = s[:start] + ''.join(sorted(existing.values(), key=title)) + s[end:]
        total = len(re.findall(r'class="category-glow-card"', s))
        s = re.sub(rf'<span>\d+ {noun}s? Available</span>', f'<span>{total} {noun}s Available</span>', s)
        assert all(f'href="{t["slug"]}/"' in s for t in cfg)
        return s
    return fn
# games cards use whichever action label existing cards use
games_action = re.search(r'tool-card-action">\s*<span>([^<]+)<', (ROOT / 'games/index.html').read_text()).group(1)
for cat, label, cfg, action, noun in BATCH:
    rw(f'{cat}/index.html', cat_index(cfg, games_action if cat == 'games' else action, noun))
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

# privacy + credits: Open-Meteo (Weather widget embeds fetch it from the visitor's browser)
def privacy(s):
    if 'open-meteo' in s.lower(): return s
    anchor = '<strong>Read-only fetch relays (a few Labs tools only):</strong>'; assert anchor in s
    i = s.index('</li>', s.index(anchor)) + len('</li>')
    return s[:i] + '\n          <li>\n            <strong>Weather data (Weather widget only):</strong> the embeddable Weather widget asks <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a> for a forecast directly from the viewer’s browser. The request contains only the coordinates you chose when building the widget — no cookies, no account, nothing passes through Toolity. Open-Meteo’s own <a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener">terms</a> apply to that request.\n          </li>' + s[i:]
rw('privacy/index.html', privacy)
def credits(s):
    if 'Open-Meteo' in s: return s
    anchor = '            <!-- @cantoo/pdf-lib -->'; assert anchor in s
    card = '''            <!-- Open-Meteo -->
            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" class="credit-card">
              <div>
                <div class="credit-header">
                  <span class="credit-title">
                    <iconify-icon icon="lucide:cloud-sun" width="18" height="18"></iconify-icon>
                    Open-Meteo
                  </span>
                  <span class="credit-badge">CC BY 4.0</span>
                </div>
                <p class="credit-desc">
                  Open-source weather API behind the Weather widget. Forecasts are fetched by the viewer’s browser with just the coordinates — no key, no account.
                </p>
              </div>
              <span class="credit-link">
                open-meteo.com
                <iconify-icon icon="lucide:external-link" width="13" height="13"></iconify-icon>
              </span>
            </a>

'''
    return s.replace(anchor, card + anchor, 1)
rw('credits/index.html', credits)

for p in list(ROOT.rglob('*/index.html')) + [ROOT / 'index.html', ROOT / '404.html', ROOT / 'templates/tool-page.html', ROOT / 'templates/blog-post.html']:
    if '/.git/' in str(p) or '/scratch/' in str(p): continue
    s = p.read_text(); n = s
    for a, b in BUMPS: n = n.replace(a, b)
    if n != s: p.write_text(n)
for g in ['gen_pdf_pages.js', 'gen_web_pages.js', 'gen_media_pages.js', 'gen_widget_pages.js', 'gen_game_pages.js']:
    rw(g, lambda s: re.sub(r"const MAIN_V = '[\d.]+', CSS_V = '[\d.]+'", "const MAIN_V = '5.2', CSS_V = '6.5'", s))
rw('gen_widget_pages.js', lambda s: s.replace("EMBED_CSS_V = '1.4'", "EMBED_CSS_V = '1.5'"))
for a, _ in BUMPS:
    left = subprocess.run(['grep', '-rl', a, '--include=*.html', '--exclude-dir=.git', '--exclude-dir=scratch', '.'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    assert not left, f'stale refs to {a}: ' + left
print('done ·', totals)

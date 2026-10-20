#!/usr/bin/env bash
# Designed by Kapil Pidhwani: accessibility sweep with axe-core in headless Chrome (a11y audit, 20 Oct 2026).
# Usage: bash scripts/a11y-check.sh [url-path ...]   → prints violations per page, exit 1 if any serious/critical.
# Default sample = one page of every type. Needs: google-chrome, python3, curl (first run downloads axe to .a11y/).
# Ceiling: light theme only unless A11Y_DARK=1; runs serially (~4 s/page). Upgrade path: puppeteer + axe-puppeteer.
set -u
cd "$(dirname "$0")/.." || exit 1
PAGES=("$@"); [ ${#PAGES[@]} -eq 0 ] && PAGES=(/ /tools/ /media/ /media/image-compressor/ /docs/images-to-pdf/ /labs/qr-code-generator/ /dev/code-formatter/ /data/csv-viewer-editor/ /games/2048/ /widgets/countdown/ /widgets/countdown/embed/ /blog/ /404.html /accessibility/ /contact/)
PORT=${PORT:-8771}; AXE=https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js
mkdir -p .a11y; [ -s .a11y/axe.min.js ] || curl -sSL -o .a11y/axe.min.js "$AXE" || { echo "axe download failed"; exit 1; }
DARK=""; [ "${A11Y_DARK:-0}" = "1" ] && DARK="localStorage.setItem('toolity_theme','dark');"
cat > .a11y/harness.html <<EOF
<!doctype html><html lang="en"><head><meta charset="utf-8"><title>axe</title></head><body>
<iframe id="f" style="width:1280px;height:900px;border:0"></iframe><pre id="out"></pre>
<script>
${DARK}
const url = new URLSearchParams(location.search).get('u') || '/';
const f = document.getElementById('f'); f.src = url;
f.onload = () => setTimeout(() => {
  const d = f.contentDocument, w = f.contentWindow, s = d.createElement('script'); s.src = '/.a11y/axe.min.js';
  s.onload = async () => {
    try {
      const r = await w.axe.run(d, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] } });
      document.getElementById('out').textContent = JSON.stringify({ url, violations: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length,
        samples: v.nodes.slice(0, 3).map(n => ({ t: n.target.join(' '), why: (n.any[0] || n.all[0] || n.none[0] || {}).message })) })) });
    } catch (e) { document.getElementById('out').textContent = JSON.stringify({ url, error: String(e) }); }
  };
  d.head.appendChild(s);
}, 2500);
</script></body></html>
EOF
python3 -m http.server "$PORT" >/dev/null 2>&1 & SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT; sleep 1
fail=0; total=0
for u in "${PAGES[@]}"; do
  json=$(google-chrome --headless=new --no-sandbox --window-size=1280,900 --virtual-time-budget=12000 --dump-dom "http://localhost:$PORT/.a11y/harness.html?u=$u" 2>/dev/null \
    | sed -n 's|.*<pre id="out">\(.*\)</pre>.*|\1|p' | python3 -c 'import sys,html;print(html.unescape(sys.stdin.read()))')
  echo "$json" | python3 -c '
import sys,json
r=json.load(sys.stdin); v=r.get("violations",[]); n=sum(x["n"] for x in v); bad=sum(x["n"] for x in v if x["impact"] in ("serious","critical"))
err=("  ERROR "+r["error"]) if "error" in r else ""
u=r["url"]
print(f"{u:32s} nodes={n:3d} serious/critical={bad:3d}{err}")
for x in v:
    s=x["samples"][0]; why=(s["why"] or "")[:110]; t=s["t"][:60]; imp=x["impact"]; i=x["id"]; k=x["n"]
    print(f"   [{imp}] {i} x{k} :: {t} -> {why}")
sys.exit(1 if bad else 0)' || fail=1
done
[ $fail -eq 0 ] && echo "✓ a11y: no serious/critical violations" || { echo "✗ a11y: serious/critical violations above"; exit 1; }

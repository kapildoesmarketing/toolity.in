#!/usr/bin/env bash
# Designed by Kapil Pidhwani: Tool page standard linter.
# Usage: bash scripts/lint-tools.sh   → exit 1 if any tool page breaks the contract.
# Contract lives in /templates/tool-page.html.
set -u
cd "$(dirname "$0")/.." || exit 1

fail=0
report() { echo "  ✗ $1"; fail=1; }

for f in $(find . -mindepth 3 -maxdepth 3 -name index.html -not -path './.git/*' -not -path './templates/*' | sort); do
  echo "$f"
  grep -q '<style' "$f"                               && report "has <style> block (move to /styles/tools/)"
  grep -q ' style="' "$f"                             && report "has inline style=\"\" ($(grep -c ' style="' "$f")x)"
  grep -q 'id="tool-toast"' "$f"                      && report "defines #tool-toast (footer owns it; use window.showToast)"
  grep -q 'function showToast' "$f"                   && report "defines local showToast()"
  grep -q '\.\./\.\./scripts/\|\.\./\.\./styles/' "$f" && report "relative asset path (use root-absolute /scripts/, /styles/)"
  grep -q 'data-layout="' "$f"                        || report "missing data-layout on .tool-workspace-card"
  grep -q 'class="faq-section"' "$f"                  || report "missing .faq-section"
  grep -q 'application/ld+json' "$f"                  || report "missing JSON-LD"
  grep -q 'property="og:title"' "$f"                  || report "missing Open Graph tags"
  grep -q 'components/tool-cta.html' "$f"             || report "not using tool-cta.html partial"
  grep -q 'tool-settings-accordion" open\|tool-settings-accordion open' "$f" && report "settings accordion is open by default"
  [ "$(grep -c 'googletagmanager.com/gtm.js' "$f")" -gt 1 ] && report "GTM included more than once"
  resets=$(grep -ciE '<button[^>]*>[^<]*(<[^>]*>[^<]*)*Reset</span>' "$f")
  [ "$resets" -gt 1 ] && report "more than one Reset button ($resets)"
  [ "$(grep -c 'class="guide-step-card"' "$f")" -ne 3 ] && report "guide must have exactly 3 steps"
done

# Per-tool CSS must stay small; otherwise it belongs in main.css
for c in styles/tools/*.css; do
  [ -f "$c" ] || continue
  n=$(wc -l < "$c")
  [ "$n" -gt 120 ] && { echo "$c"; report "$n lines — over 120, promote shared rules to main.css"; }
done

if [ $fail -eq 0 ]; then echo; echo "✓ 0 violations"; else echo; echo "✗ violations found"; fi
exit $fail

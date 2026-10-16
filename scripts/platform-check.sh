#!/usr/bin/env bash
# Designed by Kapil Pidhwani: smoke check for the Platform pages' JS (tools A–Z index, blog empty state).
# Usage: python3 -m http.server 3011 &  then  bash scripts/platform-check.sh   → exit 1 on failure.
set -u
B=http://localhost:3011
dom() { google-chrome --headless=new --disable-gpu --virtual-time-budget=4000 --dump-dom "$B$1" 2>/dev/null; }
fail=0; ok() { echo "  ✓ $1"; }; bad() { echo "  ✗ $1"; fail=1; }

t=$(dom /tools/)
n=$(grep -o '<li><a href="/[a-z0-9-]*/[a-z0-9-]*/"' <<<"$t" | wc -l)
[ "$n" -ge 100 ] && ok "/tools/ lists $n tools" || bad "/tools/ lists only $n tools"
grep -q 'data-cat="Category"' <<<"$t" && bad "/tools/ shows a 'Category' chip" || ok "/tools/ hides category hubs"
grep -q 'id="letter-A"' <<<"$t" && ok "/tools/ has A–Z groups" || bad "/tools/ missing letter groups"

b=$(dom /blog/)
grep -q '<ul class="blog-list"></ul>' <<<"$b" && grep -q 'class="blog-empty"' <<<"$b" && ok "/blog/ empty state present" || bad "/blog/ empty state broken"

for p in contact blog careers faq tools accessibility cookies disclaimer press security; do
  grep -q 'hello@toolity.in' <<<"$(dom /$p/)" && ok "/$p/ renders with footer" || bad "/$p/ missing footer/contact"
done
exit $fail

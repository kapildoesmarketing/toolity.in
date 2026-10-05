# Toolity.in Rules

Non-negotiable. If you (human or AI) touch this repo, these hold. Verify with `bash scripts/lint-tools.sh` before committing — it must print `✓ 0 violations` — and `node scripts/responsive-check.js` before every push — it must print `✓ … passing`.

## Process
1. **Never push to GitHub without Kapil's explicit permission.** When Kapil says "push to GitHub", it means: commit all local changes and push **directly to `main`**, which deploys to production immediately. The approval is the gate; no PR or feature branch is expected.
2. **Never start implementing a plan without Kapil's approval.** Plan → approval → code, every time.
3. **Never guess — check, verify, then implement.** Read the file, run the command, confirm the API exists.
4. **Test-driven: no tool ships broken.** New tool → automated browser test before hand-off. Fixing an existing tool → hand it to Kapil for manual testing.
5. **Work on `main`, one commit per tool/page.** Run `bash scripts/lint-tools.sh` before every push; a feature branch is only for work Kapil explicitly wants kept off production.
6. **No secrets in the repo.** No API keys, tokens or credentials in any file, ever — not even in comments or examples.

## Product
7. **Minimalism first, features second — but still the best features possible.** Every element must earn its place by lowering, not adding, visual cognitive load.
8. **Design consistency and brand integrity always.** Same colours, spacing, components and tone on every page.
9. **No component that adds no value** (e.g. a chip repeating what the text beside it already says).
10. **No redundant or duplicate controls.** One way to do each thing.
11. **No sample data pre-filled.** Inputs start empty with a helpful placeholder.
12. **Homepage and category pages are ad-free.** Ads appear only on tool pages.
13. **Category pages list tools alphabetically.**

## Privacy
14. **Everything runs in the browser.** No tool may upload, proxy, or log user files or text. If a feature needs a server, it doesn't ship.
15. **Never claim "no tracking".** We run GTM/analytics and ads; the footer and `/privacy/` must stay truthful about that.

## Every tool page
16. **Start from `templates/tool-page.html`.** Same block order on every page: hero → workspace card → one ad → 3-step guide → (optional reference) → FAQ → category CTA.
17. **One workspace card** (`.tool-workspace-card[data-layout="split|stacked|single"]`). Pick the layout the tool needs; don't invent a new shell.
18. **Toolbar right side is always Reset · Copy · Download(▾) · Open**, in that order, one of each. "Reset" means *all* inputs and settings, and the tooltip says so.
19. **Settings live in `<details class="tool-settings-accordion">`, inside the card, closed by default.** Control is given to the user only when they ask for it.
20. **Exactly 3 guide steps and 4–6 FAQ items**, written from the tool's real behaviour (what it can't do counts too).
21. **Head has OG/Twitter tags and one JSON-LD `@graph`** (WebApplication + BreadcrumbList + FAQPage).

## Code
22. **Static HTML only — no dynamic page generation.** Every page is a real file crawlers can read; SEO beats cleverness.
23. **Modular by default.** Shared markup in `/components/`, shared logic in `scripts/tool-common.js`, shared styles in `styles/main.css`. Duplicate nothing you could include.
24. **Prefer modern web APIs** (Canvas, Web Crypto, FileReader, Blob, Intl, MediaRecorder…). Third-party libraries only when reliable, genuinely value-adding, or critical for the tool to work.
25. **No `<style>` blocks and no `style=""` attributes in HTML.** Shared rules go in `styles/main.css`; true one-offs in `styles/tools/<slug>.css` (≤120 lines). JS may set inline styles only for live values (progress width, colour previews).
26. **No inline `<script>` tool logic.** Each tool ships `<cat>/<slug>/<slug>.js`; the toast is global (`window.showToast`) — never add a local one.
27. **Root-absolute paths only** (`/scripts/…`, `/styles/…`, `/components/…`). No `../../`.
28. **No ads, no "Sponsored" blocks, no third-party ad scripts on any page — for now.** Tool pages have 6 blocks (hero → card → guide → optional reference → FAQ → CTA). `ads.txt` stays at the root for a future AdSense application; when monetisation returns it is a planned change (one shared partial, one loader), never a snippet pasted into a page.
29. **Images are cached effectively.** Long `Cache-Control` for `/assets/` images; bust with a filename or `?v=` change, never by shortening the cache.
30. **Dynamic preview `<img>`/`<video>` elements never use `loading="lazy"`** (hidden lazy images never load — this has bitten us).
31. **Third-party scripts: one pinned CDN URL each, and it must actually resolve.** Prefer a lazy `import()` for fallbacks over a blocking tag.
32. **Don't break what works.** Existing functionality survives every refactor.
33. **Lazy senior dev.** Native first, no new dependencies, no abstractions nobody asked for. Mark deliberate shortcuts with a `Designed by Kapil Pidhwani:` comment that names the ceiling.

## Responsive (every page, every build)
34. **One breakpoint system, defined once in `styles/main.css`:** phone ≤639 · tablet 640–1023 · laptop 1024–1439 · wide ≥1440 · ultrawide ≥1920. Never invent a new number; if a component needs to adapt, it adapts to its **container** (`@container`), not the viewport.
35. **Tool CSS (`styles/tools/*.css`) never contains `@media`.** The workspace card is a `container-type: inline-size` container — use `@container` there. Viewport rules live only in `main.css` (lint enforces this).
36. **Touch comes first on touch devices:** under `(pointer: coarse)` every control is ≥44px tall and every text input is ≥16px (prevents iOS focus-zoom). Don't shrink controls to fit — scroll or wrap them.
37. **Nothing overflows its card.** Horizontal groups (segmented pills, toolbars, rows) must shrink (`min-width: 0; max-width: 100%`) and scroll or wrap. The page never scrolls horizontally.
38. **Tool above the fold on phones.** Compact hero on tool pages; the workspace card starts within the first screen at 360×780.
39. **Fluid, not fixed, on wide screens.** Container and root font scale with `clamp()`; prose caps at `--content-max` (72ch); grids use `auto-fill` capped at 4 columns.
40. **Gate: `node scripts/responsive-check.js` must pass (8 viewports × representative pages) before any push; run `ALL=1 node scripts/responsive-check.js` when touching `main.css`, header/footer or nav JS.** A new tool page is added to the check's `PAGES` list if it introduces a new layout pattern.

## Input & testing (learned from Pong)
41. **Keyboard-driven tools never rely on a key staying "held" between frames.** Remote-desktop / VNC / repeat-emulation setups deliver every press as an instant `keydown`+`keyup` pair. Pattern: act immediately on a fresh `keydown`, debounce `keyup` (~90 ms) so auto-repeat ticks chain into continuous movement, and release the opposite direction instantly. Accept `e.key` when `e.code` is blank.
42. **Keyboard beats pointer.** If a tool steers by both, ignore pointer steering while any key is held, release pointers on `window` `pointerup`/`pointercancel` and on `blur`, and drop mouse pointers whose `buttons` is 0 — a stale pointer silently pins the control and looks like "keys don't work".
43. **Automated input tests use three shapes, not one:** synthetic DOM events (logic), trusted CDP `Input.dispatch*Event` (real focus/bubbling), and **tap-pairs** (`keydown` immediately followed by `keyup`, no frame between). Only the third caught the Pong bug; the first two passed.
44. **"Cannot reproduce" is a diagnosis step, not a stop.** Ask for one console probe that captures the raw event (`e.code, e.key, e.target.tagName, state`) before changing code; the probe pinpointed the cause in one round where three blind fixes had not. Rule 4's bug count still applies — on the third report, simplify the model instead of patching it.

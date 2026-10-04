# Toolity.in Rules

Non-negotiable. If you (human or AI) touch this repo, these hold. Verify with `bash scripts/lint-tools.sh` before committing — it must print `✓ 0 violations`.

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
28. **Ads go through `/components/ad-slot.html` + `scripts/ads.js` only.** One slot per page. Changing ad network means editing `NETWORKS` in `ads.js`, not pages.
29. **Images are cached effectively.** Long `Cache-Control` for `/assets/` images; bust with a filename or `?v=` change, never by shortening the cache.
30. **Dynamic preview `<img>`/`<video>` elements never use `loading="lazy"`** (hidden lazy images never load — this has bitten us).
31. **Third-party scripts: one pinned CDN URL each, and it must actually resolve.** Prefer a lazy `import()` for fallbacks over a blocking tag.
32. **Don't break what works.** Existing functionality survives every refactor.
33. **Lazy senior dev.** Native first, no new dependencies, no abstractions nobody asked for. Mark deliberate shortcuts with a `Designed by Kapil Pidhwani:` comment that names the ceiling.

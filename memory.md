# Toolity.in — Project Memory & Knowledge Base

> Persistent memory of project context, architectural decisions, domain configurations, and preferences for Toolity.in.

---

## 1. Project Overview

- **Brand Name**: Toolity.in
- **Domain**: `https://toolity.in`
- **Hosting / Deployment**: GitHub Pages from `main` branch root (via `kapildoesmarketing/toolity.in`).
- **Owner**: Kapil Pidhwani (`kapildoesmarketing@gmail.com`).
- **Core Purpose**: A collection of blazing-fast, privacy-first web utilities and micro-tools executing 100% client-side without server telemetry or dynamic bloat.

---

## 2. Key Architectural Decisions

1. **Static Multi-Page Architecture**:
   - Each tool category has its own dedicated folder (e.g. `pdf-tools/`, `text-tools/`, `dev-tools/`).
   - Every individual tool is its own static `.html` file.
   - No single-page app (SPA) frameworks or runtime client-side page generation.
2. **Production Root Homepage**:
   - Root [`index.html`](index.html) is the official live homepage styled according to [`design.md`](design.md).
   - Temporary `pre-launch/` directory has been removed completely.
3. **Design & Icon Standard**:
   - Strictly guided by editorial warm minimalist aesthetic with Fox-inspired warm accents (`#F4511E`, `#FF6A2A`).
   - Frosted glass capsules, ambient multi-harmonic organic wave canvas in hero section, and 4x2 spotlight category cards.
   - **Iconify (`iconify-icon`) with Lucide vector icons** used everywhere instead of emojis.
4. **Hero Search & Tool Registry**:
   - The homepage hero section features an instant client-side search bar with fuzzy autocomplete dropdown and keyboard shortcuts (`⌘K`, `/`, `ArrowUp`, `ArrowDown`, `Enter`).
   - Tools are indexed in a centralized registry in `scripts/main.js` with direct routing to tool pages (e.g. `utility/qr-code-generator/`).
5. **Monetization Architecture**:
   - **Homepage is 100% Ad-Free**: The homepage never contains any ad units.
   - **Ads on Tool Pages Only**: Adsterra banners are placed exclusively at the bottom of dedicated tool pages (`[category-name]/[tool-name]/index.html`).
   - **Polite Label**: Styled as `<span class="ad-label"><iconify-icon icon="lucide:heart"></iconify-icon> Sponsored • Supporting Toolity's Free Tools</span>`.
   - **Local Development Policy**: Local page copies strictly maintain clean dashed placeholder frames (`.ad-placeholder-frame`) without running live ad scripts to prevent unintended impressions or console clutter during development.
   - **Live Production Adsterra Snippets (Saved in Memory)**:
     - **Desktop Banner (728×90)**:
       ```html
       <script>
         atOptions = {
           'key' : '173f3c31e644a6feb61843877787aa01',
           'format' : 'iframe',
           'height' : 90,
           'width' : 728,
           'params' : {}
         };
       </script>
       <script src="https://www.highrevenueformat.com/173f3c31e644a6feb61843877787aa01/invoke.js"></script>
       ```
     - **Mobile Banner (320×50)**:
       ```html
       <script>
         atOptions = {
           'key' : 'd494b0cbcfa90ae4f358b33b28092221',
           'format' : 'iframe',
           'height' : 50,
           'width' : 320,
           'params' : {}
         };
       </script>
       <script src="https://www.highrevenueformat.com/d494b0cbcfa90ae4f358b33b28092221/invoke.js"></script>
       ```
   - [`ads.txt`](ads.txt) is configured at the root with standard verification lines ready.
6. **Analytics & Tag Management (Google Tag Manager)**:
   - **GTM Container ID**: `GTM-W5SC3TGR`
   - **Head Placement**: Injected as high in `<head>` as possible across all pages.
   - **Body Placement**: `<noscript>` fallback iframe injected immediately after opening `<body>` across all pages.
7. **Platform, Legal & Supporting Pages**:
   - [`404.html`](404.html): Custom GitHub Pages 404 error fallback with mascot and navigation.
   - [`about/`](about/index.html): Mission, client-side zero-telemetry philosophy, and creator details.
   - [`privacy/`](privacy/index.html): Privacy Policy detailing client-side sandbox execution, local storage, and ad disclosures.
   - [`terms/`](terms/index.html): Terms of Service with full user ownership of tool outputs.
   - [`credits/`](credits/index.html): Attributions for Lucide Icons, Inter Font, Iconify, and Web APIs.
   - **Harmonized Multi-Column Footer**: Consistent across all pages linking Workspaces, Platform, Legal, and Creator.

---

## 3. Security, Git, Planning & Execution Rules

- **Strict Plan Approval Gate**: NEVER proceed to write or modify code after generating an Implementation Plan without the user's explicit review and permission. Always present the plan and wait for the user's go-ahead.
- **Strict Git Push Policy**: Never push any changes to GitHub without the user's explicit request. Always test and verify locally first.
- **No Secrets in Repo**: API keys, private tokens, passwords, and sensitive credentials must never be committed to code or written into markdown memory files.
- **Privacy Assurance**: All tools are built for client-side local execution (Web APIs) so user data never touches external servers.

---

## 4. Design Psychology & UI/UX Principles (Toolity Design System)

1. **Cognitive Load & Visual Calmness (Avoiding Box-in-a-Box Fatigue)**:
   - **No Heavy Nested Cards**: Avoid placing boxed sub-cards inside other boxes or panes. Use clean whitespace and minimal borders instead of stacking multiple background containers.
   - **No Redundant Duplicate Controls**: If an interactive dropzone is clickable and drag-and-drop enabled, never add a duplicate "Choose File" button below it. One clear affordance is superior to multiple competing buttons.
   - **No Heavy Empty-State Clutter**: Do not display chunky multi-cell metric grids with dashes (`—`) before a tool is used. Display output specs cleanly in header badges or quiet single-line summaries upon completion.

2. **Predictable Spatial Consistency (Zero Layout Shifts)**:
   - **Symmetrical Dual-Pane Balance**: Left (Source / Input) and Right (Output / Result) panes must maintain matching height bounds and visual weight across all lifecycle states (empty, active, processing, and complete).
   - **No Surprise Element Pop-Ins**: Avoid elements that suddenly appear and expand pane heights or push page content downward. Controls should be integrated seamlessly or smoothly transition without jarring layout jumps.

3. **Progressive Disclosure & Settings Placement**:
   - **Settings Always Below Input/Output Panes**: When a tool requires secondary options (framerate, scale, indentation), the `<details class="tool-settings-accordion">` must be positioned **below** the main dual-pane workspace window (never between the toolbar and workspace), allowing users to focus on inputs immediately.
   - **Strictly Closed / Collapsed by Default**: Secondary options must **ALWAYS** be closed by default (never include the `open` attribute on `<details class="tool-settings-accordion">`). It should display an informative summary pill (e.g., `(10 FPS • 480px • 1.0x Speed)`). If a tool has no meaningful secondary settings, omit the accordion entirely.

4. **Ruthless Minimalism & Single Action Placement (No Fluff)**:
   - **No Unnecessary Overhead**: Build tools that are minimalist, intuitive, and focused purely on core utility. Avoid speculative presets or esoteric encoding/protocol toggles that everyday users do not need unless explicitly requested.
   - **No Duplicate Pane Buttons**: Universal actions (`Reset`, `Copy`, `Download`, `Test Link`) belong strictly on the top-right toolbar (`.tool-actions-toolbar`). Do not duplicate matching buttons at the bottom of the input or output panes.

5. **Non-Disruptive Floating Toast Feedback**:
   - Status updates, file load notices, conversion progress, completion alerts, and clipboard copies should be delivered via floating toast notifications (`#tool-toast`) rather than inline alert banners that disrupt the workspace layout.

6. **Quiet Trust over Repetitive Badges**:
   - Avoid repetitive "100% Client-Side Private" badges in individual tool toolbars. Privacy and performance are established globally in the footer, about page, and architecture; individual tool headers must remain uncluttered and focused purely on functionality.

7. **Client-Side Media & Video Transcoding Architecture**:
   - High-performance video format transcoding (MP4, WebM, MOV, MKV) executes entirely client-side using HTML5 Canvas capture streams combined with the Web Audio API and `MediaRecorder` encoders.
   - **Strict Even Dimensions**: Video encoders (H.264 and VP9) require even width and height values (`if (w % 2 !== 0) w--; if (h % 2 !== 0) h--;`) to avoid encoding crashes.
   - **Tool Family**: Includes Video Format Converter (`convertors/video-converter/`), Video to GIF Converter (`convertors/video-to-gif/`), and GIF to Video Converter (`convertors/gif-to-video/`).

8. **Client-Side Image Transcoding Architecture**:
   - High-speed image transcoding (PNG, JPG, WebP, AVIF, BMP, ICO) executes 100% in-browser via HTML5 Canvas `toBlob()`.
   - **Intelligent Target Auto-Selection**: Uploading PNG auto-defaults target to WebP, JPG auto-defaults to PNG, WebP auto-defaults to JPG.

9. **Minimalist Orange Accent Bar Navigation Indicators**:
   - Navigation links in `.nav-glass-capsule` avoid nested glass-on-glass containers and box-in-a-box fatigue.
   - Active state uses pure typographic hierarchy in brand warm orange (`#F4511E` in Light Mode, `#FF7A3D` in Dark Mode) anchored by a sleek 2.5px rounded bottom gradient indicator bar (`::after`), keeping the navigation bar weightless and modern.

10. **Unified 4-Column Card Grids & Clean UX Tool Cards**:
    - **Homepage Category Grid (`#category-cards`)**: 4-column responsive layout (`grid-template-columns: repeat(4, 1fr); gap: 12px;`) featuring spotlight glow, 250px height, upper watermark ghost icon (`5rem`), bottom info deck with mini-icon pill (`32px`), title, and count pill.
    - **Category Hub Tool Cards (`.tools-grid`)**: Identical 4-column grid and `.category-glow-card` container with cursor spotlight tracking, with a standard **235px height** (preventing bottom "Open →" action cutoffs when titles wrap to 2 lines) and a clean 4-element UX hierarchy (no ghost icons, no clutter):
      1. 40×40px Icon Badge (`.tool-card-icon-badge` with `margin-bottom: 0.75rem`)
      2. High-contrast Title (`.tool-card-title`)
      3. 2-line functional Description (`.tool-card-desc` with `-webkit-line-clamp: 2`)
      4. Bottom Action link with animated hover arrow (`.tool-card-action`)
    - **Footer Creator Link (`.footer-creator`)**: Must always style the author link with `color: var(--text-primary)` and hover `color: var(--brand)` instead of relying on default browser link styling.

11. **Client-Side Mailto Link Creator & URL Encoder**:
    - Streamlined, minimalist email link builder (`utility/mailto-generator/`) creating standard RFC 3986 URL-encoded links, HTML `<a href="mailto:...">` tags, and Markdown links directly in-browser.
    - Features clean dual-pane layout: inputs on the left (To, CC, BCC, Subject, Body) and export format tabs with instant code output on the right, plus one-click "Test Link" on the top toolbar.

12. **Client-Side GIF Speed Changer Engine**:
    - Multi-API in-browser speed adjustment engine (`utility/gif-speed-changer/`) supporting acceleration and deceleration via quick presets (`0.25×`, `0.5×`, `0.75×`, `1.25×`, `1.5×`, `2.0×`, `3.0×`, `4.0×`).
    - Leverages modern WebCodecs `ImageDecoder` for C++ native frame decoding with transparent fallback to `gifuct-js`, and multi-worker `gifshot` re-encoding with adjusted frame duration intervals.
    - Adheres to standard symmetrical dual-pane workspace, top-right action buttons (Reset, Change Speed, Copy, Download), and strictly closed-by-default collapsible settings accordion placed below the workspace.

13. **Alphabetical Sorting in Category Workspaces**:
    - All category hub pages (`[category]/index.html`) must strictly sort tool cards in ascending **alphabetical order (A–Z)** by tool title.
    - Whenever a new tool is introduced to a category, it must be inserted into its proper alphabetical position in `.tools-grid`.

14. **Strict Modular Code Separation (Lightweight Core CSS & JS)**:
    - `styles/main.css` and `scripts/main.js` must remain strictly scoped to global site foundations: design tokens, typography, header, navigation, footer, hero section, shared card shells, and site-wide utilities (search launcher, theme toggle, mobile drawer).
    - All tool-specific CSS widgets, layout overrides, video viewports, trimmers, and JavaScript processing algorithms must remain 100% self-contained inside that specific tool's file (`[category]/[tool-name]/index.html`). No tool-specific logic or styling is permitted in global assets.

15. **Client-Side WhatsApp Link Creator & Click-to-Chat Engine**:
    - Streamlined, minimalist WhatsApp chat link builder (`utility/whatsapp-link-creator/`) producing clean `https://wa.me/<number>?text=<msg>` direct URLs, ready-to-paste HTML chat buttons, and Markdown snippets.
    - Automatically cleanses international phone number formatting (stripping spaces, symbols, and leading zeroes), live-encodes custom pre-filled message text, and provides one-click "Test Link" execution opening WhatsApp Web or App in a new browser tab.

16. **Web Category & Client-Side URL Parameter Separator / Cleaner**:
    - **Web Category Hub (`web/index.html`)**: Replaces old Math category across all header navigation capsules, mobile navigation drawers, footer workspace links, homepage category grid, and sitemap.
    - **URL Parameter Separator & Cleaner (`web/url-parameter-separator/index.html`)**:
      - Real-time reactive query string parser using native browser `URL` and `URLSearchParams` APIs.
      - **Parameter Inspection & Management**: Displays each key-value parameter in an interactive card list with real-time toggle switches, inline value editing, individual parameter removal (`Trash` button), and a parameter meaning discovery button (`?` icon).
      - **Domain-Aware Meaning Lookup (`?` Button)**: Clicking the `?` button opens a Google search in a new tab with an optimized investigative query: `what does the "<key>" parameter do in <domain> url` (e.g. `what does the "gclid" parameter do in google.com url`), enabling users to understand obscure tracking or routing parameters before stripping or keeping them.
      - **1-Click Smart Cleaner Action**: Quick chip button to automatically strip all known tracking/ad identifiers (`utm_*`, `gclid`, `fbclid`, `msclkid`, `twclid`, `ttclid`, `igshid`, `_ga`, `_gl`, `mc_cid`, etc.) with one click.
      - **Multi-Format Export Tabs**: Live output views for Clean URL (`https://...`), Formatted JSON (`{ "key": "value" }`), and Clean Key-Value List (`key = value`).
      - Symmetrical dual-pane layout with top action buttons (Reset, Open Link, Copy Output).

17. **Client-Side YouTube Thumbnail Downloader Engine**:
    - **YouTube Thumbnail Downloader (`web/youtube-thumbnail-downloader/index.html`)**:
      - Real-time client-side URL & video ID parser supporting standard watch (`youtube.com/watch?v=`), shortened (`youtu.be/`), YouTube Shorts (`youtube.com/shorts/`), embed (`youtube.com/embed/`), and raw 11-character video IDs.
      - **Multi-Resolution CDN Extraction**: Direct access to Maxres HD (1080p/720p - `maxresdefault.jpg`), High Quality (480p - `hqdefault.jpg`), Standard Def (SD 640p - `sddefault.jpg`), and Medium Quality (MQ 360p - `mqdefault.jpg`).
      - **Smart Quality Fallback**: Automatic natural dimension verification (`Image.naturalWidth <= 120`) to gracefully detect unavailable `maxres` artwork on older videos and fallback to `hqdefault` with toast notification.
      - **Zero-Relay Blob & Canvas Download**: 100% client-side Blob download mechanism (`fetch(url).then(r => r.blob())`) with canvas fallback, preventing server proxies or third-party tracking.
      - **Minimalist Workspace**: Top action toolbar (`Reset`, `Copy Link`, `Download Image`), video ID badge deck, resolution selector cards, and live preview with resolution overlay.

18. **Strict Standard Design System Hierarchy & Class Nomenclature**:
    - Every newly created tool page must strictly adhere to the unified layout components defined in [`styles/main.css`](styles/main.css) and demonstrated in [`sample.html`](sample.html):
      1. **Hero**: `<section class="page-hero">` with `.container`, `.breadcrumbs`, `.page-title-row`, `.page-header-content`, `.section-eyebrow`, `.page-title`, `.page-desc`.
      2. **Main Workspace**: `<section class="section-wrapper" style="border-top: none; padding-top: 3.5rem;">` with `.container`, `.tool-workspace-card`, `.tool-actions-toolbar` (`.toolbar-group`, `.btn-toolbar-sm`, `.btn-brand-sm`), and `.split-pane-grid` (`.tool-pane`, `.pane-header`, `.pane-badge`, `.pane-content`).
      3. **Bottom Ad Slot**: `<section class="ad-slot-wrapper">` with `.ad-slot-container`, `.ad-label`, `.ad-banner-frame`, `.ad-slot-desktop`, `.ad-slot-mobile`, `.ad-placeholder-frame`.
      4. **3-Step Instruction Guide**: `<section class="guide-section">` with `.section-header-compact`, `.section-eyebrow`, `.section-heading-sm`, `.guide-steps-grid`, `.guide-step-card` (`.step-num-badge`, `.step-title`, `.step-desc`).
      5. **Category Cross-Promotion CTA**: `<section class="category-workspace-cta">` with `.category-workspace-cta-left`, `.category-workspace-cta-title`, `.category-workspace-cta-desc`, and `.category-workspace-cta-right` (`.btn-pill.btn-primary-signal`).
      6. **Design Variables**: Strictly use `var(--brand)`, `var(--brand-soft)`, `var(--surface)`, `var(--surface-elevated)`, `var(--border)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`. Never create or reference non-existent variables like `--primary`.

19. **Client-Side Website Favicon Extractor Engine**:
    - **Website Favicon Extractor (`web/favicon-extractor/index.html`)**:
      - Real-time client-side domain & URL sanitizer extracting clean hostnames from full links (`https://github.com/profile`), subdomains (`sub.example.co.uk`), or bare domain strings.
      - **Google Shared Favicon CDN Integration**: Fetches high-resolution favicons via `https://www.google.com/s2/favicons?domain=<DOMAIN>&sz=<SIZE>` across standard sizes: **256px** (Ultra HD / App Icon), **128px** (Touch Icon), **64px** (Retina), and **32px** (Standard Browser Tab).
      - **Instant Client-Side Downloads**: Generates transparent PNG blob downloads and ready-to-use HTML `<link rel="icon">` code snippets.
      - Adheres strictly to canonical Rule 18 design system with symmetrical dual-pane workspace, top actions, 3-step guide, and responsive Adsterra banner frame.

20. **Client-Side Smart Multi-Token & Synonym Search Engine**:
    - **Search Engine Architecture (`scripts/main.js`)**:
      - **Multi-Token Tokenizer**: Splits user search input into space-delimited tokens, eliminating strict word-order dependencies.
      - **Stemming & Synonym Normalization**: Automatically unifies root word variants and spelling differences (`convertor` ⇄ `converter` ⇄ `convert`, `downloader` ⇄ `download`, `extractor` ⇄ `extract`, `generator` ⇄ `generate`, `creator` ⇄ `create`, `separator` ⇄ `separate`, `changer` ⇄ `change`, `formatter` ⇄ `format`).
      - **Acronym & Shorthand Expansions**: Maps colloquial abbreviations (`yt` → `youtube`, `wa` → `whatsapp`, `qr` → `qr code`, `pic`/`photo` → `image`, `vid` → `video`, `icon`/`ico` → `favicon`, `utm`/`params` → `parameter`).
      - **Relevance Scoring & Levenshtein Typo Tolerance**: Calculates weighted relevance scores across titles (2.5×), tags (1.8×), and categories (1.2×) with exact match boosts (+1000/800), multi-word conjunction bonuses (+200), single-character edit distance tolerance for words ≥4 chars, and prioritization of specific micro-tools over general workspace categories.
      - **Zero Layout Shifts**: Preserves 100% of the minimal underline search bar, background-free top-3 results display, keyboard arrow navigation, and instant launcher performance without external search libraries.

21. **Card Sizing, Search Robustness & Universal Link Styling Standards**:
    - **Category & Grid Tool Cards (`.category-glow-card`)**: Standardized to `height: 250px` matching homepage card metrics, with `padding: 1.15rem 1.15rem 1rem;`, `font-size: 0.98rem; line-height: 1.25;` on `.glow-card-title`, and constrained description margins (`margin: 0 0 0.5rem 0;`). This ensures tools with multi-line titles (such as "YouTube Thumbnail Downloader" or "URL Parameter Separator") never overflow or clip the bottom "Open →" button.
    - **Search Ranking & Cache-Busting**: Search scoring prioritizes exact and prefix phrase queries with dominant base bonuses (`+2500` exact, `+1800` prefix, `+1400` substring), outranking scattered partial token sums. Search dropdown reopens smoothly on input focus/click. All HTML asset links use versioned query strings (e.g., `?v=2.2`) to prevent stale browser caching on live deployments.
    - **Universal Link Reset & Footer Author Theme Inheritance**: Global `a, a:visited { color: inherit; text-decoration: none; }` prevents default browser blue (`#0000ee`) and purple (`#551a8b`) hyperlinks. Footer creator links explicitly enforce `.footer-creator a, .footer-creator a:visited { color: var(--text-primary) !important; }` with hover transitioning to `var(--brand)`.
22. **HTML Partial Include System (Modular Components)**:
    - **Implemented**: 2026-10-04. All 24 pages migrated.
    - **Why**: Changing nav/footer/ads previously required editing all 24 HTML files. Now it is 1 file.
    - **How It Works**: scripts/main.js fetches /components/*.html partials via fetch() on DOMContentLoaded and injects them into [data-include] placeholder divs before running initSite().
    - **Partial Files** (edit these instead of individual pages):
      - /components/header.html — Full header nav + GTM noscript. Update nav links, logo here.
      - /components/footer.html — Full footer + toast div. Update footer links, copyright here.
      - /components/ad-slot.html — Adsterra banner section (desktop 728x90 + mobile 320x50). Update ad keys here.
    - **Root-Relative Paths**: All hrefs in partials use root-relative paths (/web/, /dev/, /assets/), not ../../. Works at any directory depth.
    - **Active Nav Link**: setActiveNav() in main.js reads location.pathname, extracts the first URL segment (e.g. web), and sets .active on the matching a[data-nav=web] after header injection.
    - **Per-Page HTML (stays inline in each file)**: title, meta description, Open Graph tags, h1, GTM script in head (must fire early), tool-specific style and script blocks.
    - **WARNING - Local Development**: fetch() requires HTTPS or a local server. Opening HTML via file:// will fail to load partials. Always use: npx serve . when developing locally.
    - **Shared Tool CSS in main.css**: Common UI component classes are now at the bottom of styles/main.css (section: SHARED TOOL WORKSPACE COMPONENTS): .url-input-container, .btn-input-clear, .sample-chips-row, .btn-sample-chip, .quality-grid, .quality-card-btn, .quality-top-row, .quality-title, .quality-tag-badge, .quality-dimensions, .preview-viewport-box, .empty-preview-content, .empty-preview-icon, .preview-floating-pill, .formats-table-card, .formats-table.
    - **Adding a New Tool Page**: Use the three div[data-include] placeholders for header/footer/ads. Add only tool-specific CSS/JS inline.
    - **CSS/JS Version**: Currently v=2.3. Bump this on all main.css and main.js script/link tags in all HTML files when deploying breaking style/JS changes to bust browser cache.
23. **Core Web Vitals, SEO, Polish & Mobile Bottom Pill Nav Enhancements**:
    - **Implemented**: 2026-10-04.
    - **Canonical URLs**: Added `<link rel="canonical" href="https://toolity.in/...">` to `<head>` on all 24 production pages + templates to eliminate duplicate indexing penalties.
    - **Zero-Flash Dark Mode Initialization**: Synchronous inline `<script>` in `<head>` immediately sets `data-theme` attribute on `<html>` from `localStorage` or `prefers-color-scheme` before HTML renders, eliminating FOUC / white flashes completely.
    - **Critical Asset Preloads**: `<link rel="preload" href="/styles/main.css?v=2.3" as="style">` and `<link rel="preload" href="/assets/Toolity.in%20Logo.webp" as="image" type="image/webp">` added to `<head>` on all pages for faster LCP.
    - **Script Deferral**: Iconify CDN scripts now use `defer` to unblock initial render pipeline.
    - **Zero-CLS Image Dimensions**: Explicit `width`, `height`, and `loading="lazy"` (with `fetchpriority="high"` on header brand logo) enforced on all `<img>` tags across static templates and dynamic workspace previews.
    - **Sitemap Indexing**: Updated `sitemap.xml` with current timestamps (`2026-10-04`) and all 24 URLs.
    - **Empty State Breathing Animation**: Added `@keyframes breatheState` in `styles/main.css` to give idle tool empty states a subtle pulse, with `@media (prefers-reduced-motion: reduce)` support.
    - **Page Load Fade-In**: Smooth `@keyframes fadeInPage` on `body` for seamless page loading transitions.
    - **Mobile Bottom Pill Navigation Bar (Non-Home Pages)**:
      - Automatically injected on mobile devices (`max-width: 768px`) on all non-home pages.
      - Glassmorphism floating pill at screen bottom with 4 thumb-friendly actions:
        1. **Home** (`/`)
        2. **Tools** (triggers mobile drawer)
        3. **Share** (native `navigator.share` fallback to copy URL + toast)
        4. **Top** (smooth scroll to top, resolving back-to-top feature)
      - Integrated with safe-area insets (`env(safe-area-inset-bottom)`).
    - **Multi-Device Favicon Suite**: Standardized `/assets/favicons/` across all pages with 32x32 PNG, 16x16 PNG, 180x180 Apple Touch Icon, and root `/favicon.ico` for complete cross-browser and iOS/Android compatibility.
24. **Image to Favicon Converter (`convertors/image-to-favicon/index.html`)**:
    - **Implemented**: 2026-10-04.
    - **Features**:
      - Converts PNG, JPG, WebP, SVG, GIF, AVIF, BMP into multi-resolution `favicon.ico`, Apple Touch Icons, and Android PWA icons.
      - Fit options: `Contain` (Pad), `Cover` (Center Crop), `Stretch`.
      - Background color: Transparent (checkerboard), White, Dark, Brand Orange, Cobalt, Emerald, or Custom Hex color picker.
      - Quiet zone padding slider: `0%` to `30%`.
      - Corner radius presets: `Square (0%)`, `Squircle (22%)`, `Circle (50%)`.
      - Real-Time Live Multi-Context Previews: Interactive Chrome Browser Tab with custom editable title, iOS/Android Home Screen icon frame, Google Search result snippet (SERP), and All-Sizes Matrix Grid (16, 32, 48, 64, 128, 180, 192, 512).
      - Multi-Format Client-Side Binary Generator: Constructs real Windows `.ico` binary files containing 16x16, 32x32, 48x48 PNG frames via JavaScript `DataView` & `Uint8Array`.
      - Complete ZIP Package Exporter: Bundles `favicon.ico`, all PNG sizes, `site.webmanifest`, and an HTML instruction snippet in PKZIP store format.
      - 1-Click Copyable `<link>` Embed Tags snippet.
      - 100% Client-Side with zero server uploads (privacy-first).




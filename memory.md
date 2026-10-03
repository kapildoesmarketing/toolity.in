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
   - **Local Development Policy**: In local copies, live ad scripts are commented out and displayed as clean dashed placeholder frames (`.ad-placeholder-frame`) to avoid accidental ad triggers on live dev servers. Live ad tags are strictly enabled before production pushes.
   - [`ads.txt`](ads.txt) is set up at the root with standard instructions ready for the publisher account ID.
6. **Platform, Legal & Supporting Pages**:
   - [`404.html`](404.html): Custom GitHub Pages 404 error fallback with mascot and navigation.
   - [`about/`](about/index.html): Mission, client-side zero-telemetry philosophy, and creator details.
   - [`privacy/`](privacy/index.html): Privacy Policy detailing client-side sandbox execution, local storage, and ad disclosures.
   - [`terms/`](terms/index.html): Terms of Service with full user ownership of tool outputs.
   - [`credits/`](credits/index.html): Attributions for Lucide Icons, Inter Font, Iconify, and Web APIs.
   - **Harmonized Multi-Column Footer**: Consistent across all pages linking Workspaces, Platform, Legal, and Creator.

---

## 3. Security, Git & Deployment Rules

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

3. **Progressive Disclosure**:
   - **Collapsed Settings by Default**: Secondary options (framerate, scale, speed, color quality, indentation) belong inside a clean `<details class="tool-settings-accordion">` that is collapsed by default with an informative summary pill (e.g., `(10 FPS • 480px • 1.0x Speed • Balanced)`).

4. **Non-Disruptive Floating Toast Feedback**:
   - Status updates, file load notices, conversion progress, completion alerts, and clipboard copies should be delivered via floating toast notifications (`#tool-toast`) rather than inline alert banners that disrupt the workspace layout.

5. **Quiet Trust over Repetitive Badges**:
   - Avoid repetitive "100% Client-Side Private" badges in individual tool toolbars. Privacy and performance are established globally in the footer, about page, and architecture; individual tool headers must remain uncluttered and focused purely on functionality.

6. **Client-Side Media & Video Transcoding Architecture**:
   - High-performance video format transcoding (MP4, WebM, MOV, MKV) executes entirely client-side using HTML5 Canvas capture streams combined with the Web Audio API and `MediaRecorder` encoders.
   - **Strict Even Dimensions**: Video encoders (H.264 and VP9) require even width and height values (`if (w % 2 !== 0) w--; if (h % 2 !== 0) h--;`) to avoid encoding crashes.
   - **Tool Family**: Includes Video Format Converter (`convertors/video-converter/`), Video to GIF Converter (`convertors/video-to-gif/`), and GIF to Video Converter (`convertors/gif-to-video/`).

7. **Client-Side Image Transcoding Architecture**:
   - High-speed image transcoding (PNG, JPG, WebP, AVIF, BMP, ICO) executes 100% in-browser via HTML5 Canvas `toBlob()`.
   - **Intelligent Target Auto-Selection**: Uploading PNG auto-defaults target to WebP, JPG auto-defaults to PNG, WebP auto-defaults to JPG.
8. **Minimalist Orange Accent Bar Navigation Indicators**:
   - Navigation links in `.nav-glass-capsule` avoid nested glass-on-glass containers and box-in-a-box fatigue.
   - Active state uses pure typographic hierarchy in brand warm orange (`#F4511E` in Light Mode, `#FF7A3D` in Dark Mode) anchored by a sleek 2.5px rounded bottom gradient indicator bar (`::after`), keeping the navigation bar weightless and modern.

9. **Unified 4-Column Card Grids & Clean UX Tool Cards**:
   - **Homepage Category Grid (`#category-cards`)**: 4-column responsive layout (`grid-template-columns: repeat(4, 1fr); gap: 12px;`) featuring spotlight glow, 250px height, upper watermark ghost icon (`5rem`), bottom info deck with mini-icon pill (`32px`), title, and count pill.
   - **Category Hub Tool Cards (`.tools-grid`)**: Identical 4-column grid and `.category-glow-card` container with cursor spotlight tracking, but tailored for tool discovery with a clean 4-element UX hierarchy (no ghost icons, no clutter):
     1. 40×40px Icon Badge (`.tool-card-icon-badge`)
     2. High-contrast Title (`.tool-card-title`)
     3. 2-to-3 line functional Description (`.tool-card-desc`)
     4. Bottom Action link with animated hover arrow (`.tool-card-action`)








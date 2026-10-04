# Toolity.in — Project Rules & Guidelines

> Single source of truth for all AI pair programmers and developers working on Toolity.in.

---

## 1. Core Architecture & Philosophy

- **Multi-Page Static Structure**: Every tool category has its own dedicated folder (e.g. `pdf-tools/`, `text-tools/`, `dev-tools/`, `image-tools/`), and every individual tool lives in its own standalone `.html` file (e.g. `pdf-tools/merge-pdf.html`).
- **No Dynamic Page Generation**: Avoid heavy SPA frameworks and runtime client-side rendering bottlenecks. Every tool must be a standalone, self-contained, statically indexed page for maximum performance and SEO.
- **100% Client-Side Privacy**: All utility operations (parsing, formatting, conversion, compression, hashing) must execute purely in the browser. Zero user input data leaves the user's browser.
- **Zero Bloat & Dependency Minimalism**: Prefer native Modern Web APIs (e.g. `Canvas`, `Web Crypto API`, `FileReader`, `Blob`, `Intl`). Never add third-party dependencies unless strictly necessary for complex local operations (e.g. `pdf-lib`).

---

## 2. Design & Aesthetics

- **Visual Style**: Editorial warm minimalist aesthetic with Fox-inspired warm accents (`#F4511E`, `#FF6A2A`).
- **Canvas & Colors**: Light mode near-white canvas (`#ffffff`, `#f5f5f5`, `#f5f2ef`), warm stone undertones, warm-tinted shadows, and sleek dark mode (`#0D0D0D`, `#141414`).
- **Design Tokens**: Strictly use standard CSS variables (`var(--brand)`, `var(--brand-soft)`, `var(--surface)`, `var(--surface-elevated)`, `var(--border)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`). Never use ad-hoc non-existent variables.
- **Typography Hierarchy**:
  - Display headings: `Waldenburg` (weight 300, light/whisper-thin) or lightweight sans fallback.
  - Body & UI: `Inter` with clean positive letter-spacing (`+0.14px` to `+0.18px`).
  - Monospace: `Geist Mono` or system monospace for code/editor panes.
- **Icons**: Use **Iconify** with Lucide vector icons (`<iconify-icon icon="lucide:..." ...></iconify-icon>`). Never use raw emojis in production UI.
- **Buttons & Elevation**:
  - Pill radius (`9999px` / `var(--radius-pill)`) for buttons.
  - Multi-layered sub-0.1 opacity shadows (inset + outline + gentle elevation).
  - Warm stone CTA pills (`rgba(245, 242, 239, 0.8)`).
- **Layout Flow & Workspace Hierarchy**:
  - Symmetrical dual-pane workspace (Left = Input/Source, Right = Output/Simulation).
  - Top Actions toolbar (Left = Presets/Modes, Right = Universal actions: Reset, Copy, Single Download dropdown).
  - Progressive disclosure settings accordion (`<details class="tool-settings-accordion">`) positioned **below** the dual-pane workspace, closed by default with an informative live summary badge.
  - 3-Step visual instruction guide (`<section class="guide-section">`), Format reference table, FAQ card, and Category Workspace CTA (`<section class="category-workspace-cta">`) on every tool page.

---

## 3. Monetization & Ad Placement Rules

- **Homepage is 100% Ad-Free**: The homepage (`index.html`) will NEVER display any advertisements.
- **Ads Exclusively on Tool Pages**: Adsterra and other ad network banners must ONLY be placed on dedicated individual tool pages (`[category-name]/[tool-name].html`).

---

## 4. Development & Execution Rules

1. **Explore Before Executing**: Check the codebase structure and existing files before writing or modifying code. Never guess directory structures.
2. **Plan First**: For any task taking more than 2 steps, create an Implementation Plan artifact, outline changes clearly, and confirm requirements with the user before editing code.
3. **Non-Destructive Execution**: Ensure existing features and configurations remain functional unless an explicit refactor is requested.
4. **Security & Privacy Safeguard**: Never store sensitive information (API keys, private tokens, passwords, secrets) in repository files, markdown memory, or logs.
5. **No Unrequested Browser Testing**: Do not execute automated browser testing subagents unless explicitly instructed by the user. Request manual testing by the user.
6. **Intentional Craftsmanship**: Mark intentional simplifications or custom solutions with:
   `/* Designed by Kapil Pidhwani */` (or HTML/markdown equivalent).
7. **No Git Push Without Explicit User Request**: Never execute `git push` autonomously or automatically upon finishing a task. All code changes and feature additions must remain local for the user to manually inspect and test. Only push to GitHub / remote repositories when the user explicitly commands to push.


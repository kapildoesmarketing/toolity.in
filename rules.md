# Toolity.in — Project Rules & Guidelines

> Single source of truth for all AI pair programmers and developers working on Toolity.in.

---

## 1. Core Architecture & Philosophy

- **Multi-Page Static Structure**: Every tool category has its own dedicated folder (e.g. `pdf-tools/`, `text-tools/`, `dev-tools/`, `image-tools/`), and every individual tool lives in its own standalone `.html` file (e.g. `pdf-tools/merge-pdf.html`).
- **No Dynamic Page Generation**: Avoid heavy SPA frameworks and runtime client-side rendering bottlenecks. Every tool must be a standalone, self-contained, statically indexed page for maximum performance and SEO.
- **100% Client-Side Privacy**: All utility operations (parsing, formatting, conversion, compression, hashing) must execute purely in the browser. Zero user input data leaves the user's browser.
- **Zero Bloat & Dependency Minimalism**: Prefer native Modern Web APIs (e.g. `Canvas`, `Web Crypto API`, `FileReader`, `Blob`, `Intl`). Never add third-party dependencies unless strictly necessary for complex local operations (e.g. `pdf-lib`).

---

## 2. Design & Aesthetics (Follow `design.md`)

- **Visual Inspiration**: ElevenLabs-inspired warm minimalist aesthetic documented in [`design.md`](design.md).
- **Canvas & Colors**: Near-white canvas (`#ffffff`, `#f5f5f5`, `#f5f2ef`), warm stone undertones, and warm-tinted shadows (`rgba(78, 50, 23, 0.04)`).
- **Typography Hierarchy**:
  - Display headings: `Waldenburg` (weight 300, light/whisper-thin) or elegant lightweight sans fallback.
  - Body & UI: `Inter` with positive letter-spacing (`+0.14px` to `+0.18px`).
  - Monospace: `Geist Mono` or system monospace for code/editor panes.
- **Icons**: Use **Iconify** with Lucide vector icons (`<iconify-icon icon="lucide:..." ...></iconify-icon>`). Never use raw emojis in production UI.
- **Buttons & Elevation**:
  - Pill radius (`9999px`) for buttons.
  - Multi-layered sub-0.1 opacity shadows (inset + outline + gentle elevation).
  - Warm stone CTA pills (`rgba(245, 242, 239, 0.8)`).

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

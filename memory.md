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
   - **Ads on Tool Pages Only**: Adsterra and other ad networks are placed exclusively on individual tool pages (`[category-name]/[tool-name]/index.html`).
   - [`ads.txt`](ads.txt) is set up at the root with standard instructions ready for the publisher account ID.
6. **Platform, Legal & Supporting Pages**:
   - [`404.html`](404.html): Custom GitHub Pages 404 error fallback with mascot and navigation.
   - [`about/`](about/index.html): Mission, client-side zero-telemetry philosophy, and creator details.
   - [`privacy/`](privacy/index.html): Privacy Policy detailing client-side sandbox execution, local storage, and ad disclosures.
   - [`terms/`](terms/index.html): Terms of Service with full user ownership of tool outputs.
   - [`credits/`](credits/index.html): Attributions for Lucide Icons, Inter Font, Iconify, and Web APIs.
   - **Harmonized Multi-Column Footer**: Consistent across all pages linking Workspaces, Platform, Legal, and Creator.

---

## 3. Security & Information Boundary

- **No Secrets in Repo**: API keys, private tokens, passwords, and sensitive credentials must never be committed to code or written into markdown memory files.
- **Privacy Assurance**: All tools are built for client-side local execution (Web APIs) so user data never touches external servers.

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
2. **Current Root Routing**:
   - Root [`index.html`](index.html) currently redirects to [`pre-launch/`](pre-launch/) using meta-refresh + JavaScript replacement.
   - This keeps the live placeholder with the active Adsterra ad visible to domain visitors while the main platform is being built.
3. **Design Standard**:
   - Strictly guided by [`design.md`](design.md) (ElevenLabs-inspired warm minimalist aesthetic).
   - Near-white canvas (`#ffffff`, `#f5f5f5`), warm stone accents (`#f5f2ef`), weight 300 display typography, and multi-layered sub-0.1 opacity shadows.
4. **Ad Monetization**:
   - Adsterra `300x250` banner ad active on the pre-launch page.
   - [`ads.txt`](ads.txt) is set up at the root with standard instructions ready for the publisher account ID.

---

## 3. Security & Information Boundary

- **No Secrets in Repo**: API keys, private tokens, passwords, and sensitive credentials must never be committed to code or written into markdown memory files.
- **Privacy Assurance**: All tools are built for client-side local execution (Web APIs) so user data never touches external servers.

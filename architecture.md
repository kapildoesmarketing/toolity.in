# Toolity.in — Technical Architecture

> Technical architecture and system structure for Toolity.in.

---

## 1. High-Level Architecture

Toolity.in is a **100% static, multi-page web application** deployed via GitHub Pages and served over a custom domain (`toolity.in`).

```
                                  +-------------------+
                                  |   Browser Client  |
                                  +---------+---------+
                                            |
                       +--------------------+--------------------+
                       |                                         |
             [Category Multi-Page]                       [Shared Assets]
                       |                                         |
     +-----------------+-----------------+             +---------+---------+
     |                 |                 |             |         |         |
pdf-tools/         dev-tools/       text-tools/     styles/   scripts/  assets/
  ├── merge.html     ├── json.html    ├── words.html   main.css  main.js   icons/
  └── split.html     └── base64.html  └── diff.html
```

---

## 2. Directory Layout & Roles

| Directory / File | Purpose |
| :--- | :--- |
| `[category-folder]/` | Category-specific folders (e.g. `pdf-tools/`, `dev-tools/`, `text-tools/`). |
| `[category-folder]/[tool].html` | Individual standalone static tool page with self-contained UI and execution. |
| `styles/main.css` | Global design system based on `design.md` (ElevenLabs warm minimalist tokens). |
| `scripts/main.js` | Global baseline script for shared site-wide interactions. |
| `assets/` | Placeholder and production SVG icons, logo, and OpenGraph social share cards. |
| `pre-launch/` | Preserved standalone coming soon landing page with Adsterra banner ad. |
| `ads.txt` | Advertising authorization file for Adsterra and ad networks. |
| `robots.txt` & `sitemap.xml` | Search engine crawler rules and URL index. |
| `CNAME` | Custom domain configuration for GitHub Pages (`toolity.in`). |
| `rules.md` | Core engineering rules, design principles, and guidelines. |
| `tasks.md` | Active tasks, progress log, and development roadmap. |
| `memory.md` | Persistent project context, domain details, and design standards. |
| `design.md` | Comprehensive ElevenLabs design system reference. |

---

## 3. Tool Development Standards

1. **Self-Contained Logic**: Each tool page handles its own inputs, processing, and outputs using native Web APIs.
2. **Shared Styling**: Link to `/styles/main.css` for typography, color palette, pill buttons, and soft shadow elevation.
3. **No External Telemetry**: Zero user inputs are transmitted over the network.
4. **Performance Target**: <100ms first contentful paint, zero build steps, and instant client-side execution.

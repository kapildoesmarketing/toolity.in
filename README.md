# Toolity.in ⚡

> Modern, blazing-fast, and privacy-first web utilities suite.

**[Toolity.in](https://toolity.in)** is a static, multi-page utility platform built with modern Web APIs, zero framework bloat, and individual standalone HTML tool pages.

---

## 📁 Repository Structure

```
Toolity.in/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages automated deployment
├── assets/
│   ├── icons/
│   │   ├── favicon.svg         # Brand Favicon placeholder (ready to replace)
│   │   └── logo.svg            # Brand Vector Logo placeholder (ready to replace)
│   └── og-image.svg            # OpenGraph card placeholder (ready to replace)
├── styles/
│   └── main.css                # ElevenLabs-inspired design system tokens & foundations
├── scripts/
│   └── main.js                 # Global baseline script (clean for step-by-step building)
├── ads.txt                     # Adsterra / publisher monetization authorization
├── robots.txt                  # Search engine crawler instructions
├── sitemap.xml                 # SEO sitemap index
├── CNAME                       # Custom domain binding (toolity.in)
├── .gitignore                  # Developer & system exclusions
└── index.html                  # Official Toolity.in production homepage
```

---

## 🛠️ Multi-Page Static Architecture
Each tool category will reside in its own dedicated folder, and every individual tool will have its own static `.html` file:
```
[category-name]/
└── [tool-name].html
```
- **Zero Dynamic Generation**: No runtime client-side rendering bottlenecks or heavy SPAs.
- **Dedicated SEO**: Every tool has its own dedicated URL, metadata, and fast static delivery.
- **100% Client-Side Privacy**: Utilities execute locally inside the browser.

---

Designed and crafted with care by **Kapil Pidhwani**.

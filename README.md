# Toolity.in ⚡

> Modern, blazing-fast, and privacy-first web utilities suite.

**[Toolity.in](https://toolity.in)** is an open, client-side utility platform built with modern Web APIs, zero framework bloat, and pure responsive vanilla architecture.

---

## 📁 Repository Structure

```
Toolity.in/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages automated deployment
├── assets/
│   └── icons/
│       ├── favicon.svg         # SVG Brand Favicon
│       └── logo.svg            # SVG Brand Vector Logo
├── styles/
│   ├── main.css                # Design system variables, dark mode theme & reset
│   ├── components.css          # Search bar, category chips, tool cards & toasts
│   └── tools.css               # Tool workbench, editor panes & split-view panels
├── scripts/
│   ├── app.js                  # App bootstrap, search indexing & category filtering
│   ├── utils.js                # Core helpers (clipboard, download, debounce, toast)
│   └── tools/
│       └── tool-registry.js    # Declarative catalog metadata for all tools
├── pre-launch/                 # Standalone Coming Soon placeholder & Adsterra unit
│   ├── index.html
│   ├── style.css
│   └── script.js
├── ads.txt                     # Adsterra / publisher monetization authorization
├── robots.txt                  # Search engine crawler instructions
├── sitemap.xml                 # SEO sitemap index
├── CNAME                       # Custom domain binding (toolity.in)
├── .gitignore                  # Developer & system exclusions
└── index.html                  # Root entry point (redirects to /pre-launch/ during dev)
```

---

## 🛠️ How to Add a New Tool in 3 Steps

1. **Register the Tool Metadata** in [`scripts/tools/tool-registry.js`](scripts/tools/tool-registry.js):
   ```javascript
   {
     id: 'my-new-tool',
     title: 'Tool Name',
     description: 'Short summary of what this tool does.',
     category: 'formatters', // formatters | converters | generators | crypto | text
     icon: '⚡',
     tags: ['keyword1', 'keyword2']
   }
   ```
2. **Create the Tool View**:
   Add a template in `tools/my-new-tool.html` utilizing classes from `styles/main.css` and `styles/tools.css`.
3. **Connect Tool Logic**:
   Write the processing logic using `scripts/utils.js` helpers.

---

## 🔒 Privacy & Performance Guarantees
- **100% Client-Side**: No user inputs are sent to remote servers. All operations execute inside the browser sandbox.
- **Zero Heavy Dependencies**: Native Web APIs and Vanilla CSS ensure sub-100ms load times and high Core Web Vitals.

---

Designed and crafted with precision by **Kapil Pidhwani**.

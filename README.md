# Toolity.in ⚡

> Simple, powerful, and privacy-first web utilities — running 100% in your browser.

[![Website](https://img.shields.io/badge/Live-toolity.in-F4511E?style=flat-square)](https://toolity.in)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side-green?style=flat-square)](https://toolity.in/privacy/)
[![Stack](https://img.shields.io/badge/Stack-Vanilla%20HTML%2FCSS%2FJS-black?style=flat-square)](https://toolity.in)
[![Architecture](https://img.shields.io/badge/Architecture-Static%20Multi--Page-orange?style=flat-square)](https://toolity.in)

**[Toolity.in](https://toolity.in)** is a curated suite of fast, lightweight, and privacy-focused micro-utilities designed to eliminate everyday digital friction. Every tool runs completely client-side in your browser using modern Web APIs — no server uploads, no telemetry, and zero tracking.

---

## ✨ Key Features & Architecture

- **🔒 100% Client-Side Privacy**: Files, documents, inputs, and media never touch a remote server. Conversions and parsing execute entirely inside the local browser sandbox.
- **⚡ Zero Framework Bloat**: Crafted with pure Vanilla HTML5, modern CSS, and lightweight ES6+ JavaScript for sub-100ms first contentful paint.
- **🧩 Modular HTML Component Partials**: Dynamic client-side include system (`components/header.html`, `components/footer.html`, `components/tool-cta.html`) enabling single-source-of-truth updates across all pages.
- **🌓 Zero-Flash Dual Theme System**: Instantaneous dark/light theme initialization in `<head>` to prevent flash-of-unstyled-content (FOUC).
- **🔍 Smart Multi-Token Search**: Typo-tolerant Levenshtein scoring, root-word stemming (`convert` ↔ `converter`), shorthand expansion (`wa` → `whatsapp`), and keyboard navigation.
- **📱 Ergonomic Mobile UX**: Responsive navigation drawer and an ambient bottom pill floating action bar on mobile devices.

---

## 📁 9 Workspaces & Production Tools

```
Toolity.in/
├── convertors/             # Media & format converters
│   ├── image-converter/
│   ├── video-converter/
│   ├── gif-to-video/
│   ├── video-to-gif/
│   └── image-to-favicon/
├── visuals/                # Color & image tools (palette extractor…)
├── productivity/           # Workflow boosters & focus planners
├── web/                    # URL, metadata & link utilities
│   ├── url-parameter-separator/
│   ├── youtube-thumbnail-downloader/
│   └── favicon-extractor/
├── fun/                    # Playful web toys & interactive visualizers
├── development/            # Encoders, validators & dev utilities
├── utilities/              # Everyday micro-utilities
│   ├── qr-code-generator/
│   ├── whatsapp-link-creator/
│   ├── mailto-generator/
│   └── gif-speed-changer/
├── experiments/            # Web API labs & prototype demos
├── components/             # Reusable modular HTML partials
│   ├── header.html
│   ├── footer.html
├── assets/                 # Brand assets, logos & favicon suite
├── styles/
│   └── main.css            # Fox-inspired warm minimalist design system
├── scripts/
│   └── main.js             # Shared partial injector & search engine
├── index.html              # Homepage
├── sitemap.xml             # XML sitemap index
└── robots.txt              # Crawler instructions
```

---

## 🛠️ Tool Suite Highlights

| Tool | Workspace | Description |
| :--- | :--- | :--- |
| **[Image to Favicon](https://toolity.in/convertors/image-to-favicon/)** | Convertors | Converts images to Windows `.ico`, Apple Touch Icons, and web manifests with real-time multi-context previews. |
| **[Image Converter](https://toolity.in/convertors/image-converter/)** | Convertors | Instant client-side conversions between PNG, JPG, WebP, and AVIF formats. |
| **[Video Converter](https://toolity.in/convertors/video-converter/)** | Convertors | Fast in-browser media transcoding and format adjustments. |
| **[GIF to Video](https://toolity.in/convertors/gif-to-video/)** | Convertors | Converts heavy animated GIFs into lightweight MP4/WebM videos. |
| **[Video to GIF](https://toolity.in/convertors/video-to-gif/)** | Convertors | Captures video clips into smooth animated GIFs with custom FPS and quality. |
| **[URL Parameter Separator](https://toolity.in/web/url-parameter-separator/)** | Web | Parses, inspects, and cleans URL query strings and UTM parameters into structured tables. |
| **[YouTube Thumbnail Downloader](https://toolity.in/web/youtube-thumbnail-downloader/)** | Web | Fetches HD, SD, and max-resolution video covers from any YouTube link. |
| **[Favicon Extractor](https://toolity.in/web/favicon-extractor/)** | Web | Extracts high-res website icons and Apple touch icons from any domain. |
| **[QR Code Generator](https://toolity.in/utilities/qr-code-generator/)** | Utilities | Generates custom vector and raster QR codes for URLs, text, and WiFi. |
| **[WhatsApp Link Creator](https://toolity.in/utilities/whatsapp-link-creator/)** | Utilities | Generates instant `wa.me` click-to-chat links with pre-filled messages. |
| **[Mailto Link Generator](https://toolity.in/utilities/mailto-generator/)** | Utilities | Builds URL-encoded `mailto:` HTML links with subject, CC, BCC, and body. |
| **[GIF Speed Changer](https://toolity.in/utilities/gif-speed-changer/)** | Utilities | Speeds up or slows down animated GIFs without quality loss. |

---

## 💻 Local Development

Because Toolity.in uses `fetch()` to dynamically inject HTML partials (`components/*.html`), running pages directly via the `file://` protocol in a browser will be blocked by CORS policy.

Start a local static development server:

```bash
# Using npx serve (recommended)
npx serve .

# Or using Python 3
python3 -m http.server 8000

# Or using Node http-server
npx http-server .
```

Then open `http://localhost:3000` (or the printed port) in your browser.

---

## 📜 Principles & Standards

1. **Self-Contained Pages**: Each tool is a standalone static HTML document with its own dedicated URL and SEO metadata.
2. **Minimalist Dependencies**: Native browser APIs are always preferred over heavy external libraries.
3. **Warm Minimalist Aesthetic**: Curated warm palette (`#F4511E`, `#FF6A2A`), soft elevation, and crisp typography (`Inter`).

---

Designed and crafted with care by **[Kapil Pidhwani](https://github.com/kapildoesmarketing)**.

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
├── media/                  # Image, video, GIF & audio tools
│   ├── image-converter/
│   ├── video-converter/
│   ├── gif-to-video/
│   ├── video-to-gif/
│   └── image-to-favicon/
├── docs/                   # PDF & document tools
├── labs/                   # Everyday utilities, links, QR, experiments
│   ├── url-parameter-separator/
│   ├── youtube-thumbnail-downloader/
│   └── favicon-extractor/
├── games/                  # Browser games
├── dev/                    # Developer tools
├── data/                   # Data parsing & manipulation
│   ├── qr-code-generator/
│   ├── whatsapp-link-creator/
│   ├── mailto-generator/
│   └── gif-speed-changer/
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
| **[Image to Favicon](https://toolity.in/media/image-to-favicon/)** | Media | Converts images to Windows `.ico`, Apple Touch Icons, and web manifests with real-time multi-context previews. |
| **[Image Converter](https://toolity.in/media/image-converter/)** | Media | Instant client-side conversions between PNG, JPG, WebP, and AVIF formats. |
| **[Video Converter](https://toolity.in/media/video-converter/)** | Media | Fast in-browser media transcoding and format adjustments. |
| **[GIF to Video](https://toolity.in/media/gif-to-video/)** | Media | Converts heavy animated GIFs into lightweight MP4/WebM videos. |
| **[Video to GIF](https://toolity.in/media/video-to-gif/)** | Media | Captures video clips into smooth animated GIFs with custom FPS and quality. |
| **[URL Parameter Separator](https://toolity.in/data/url-parameter-separator/)** | Data | Parses, inspects, and cleans URL query strings and UTM parameters into structured tables. |
| **[YouTube Thumbnail Downloader](https://toolity.in/media/youtube-thumbnail-downloader/)** | Media | Fetches HD, SD, and max-resolution video covers from any YouTube link. |
| **[Favicon Extractor](https://toolity.in/labs/favicon-extractor/)** | Labs | Extracts high-res website icons and Apple touch icons from any domain. |
| **[QR Code Generator](https://toolity.in/labs/qr-code-generator/)** | Labs | Generates custom vector and raster QR codes for URLs, text, and WiFi. |
| **[WhatsApp Link Creator](https://toolity.in/labs/whatsapp-link-creator/)** | Labs | Generates instant `wa.me` click-to-chat links with pre-filled messages. |
| **[Mailto Link Generator](https://toolity.in/labs/mailto-generator/)** | Labs | Builds URL-encoded `mailto:` HTML links with subject, CC, BCC, and body. |
| **[GIF Speed Changer](https://toolity.in/media/gif-speed-changer/)** | Media | Speeds up or slows down animated GIFs without quality loss. |

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

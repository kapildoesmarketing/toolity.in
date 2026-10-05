# Toolity.in

> Free, privacy-first online tools that run 100% in your browser.

[![Live](https://img.shields.io/badge/Use%20it%20at-toolity.in-F4511E?style=flat-square)](https://toolity.in)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20client--side-2E7D32?style=flat-square)](https://toolity.in/privacy/)
[![Stack](https://img.shields.io/badge/Stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-111?style=flat-square)](#how-it-works)

**[Toolity.in](https://toolity.in)** is a growing collection of small, fast, single-purpose tools — compress a video, merge PDFs, generate a QR code, format JSON — with nothing to install and nothing uploaded. Open a tool, use it, close the tab.

**→ [toolity.in](https://toolity.in)**

## Categories

| Category | What you'll find |
| :--- | :--- |
| **[Media](https://toolity.in/media/)** | Compress, convert and tweak images, video, GIFs and audio |
| **[Docs](https://toolity.in/docs/)** | Merge, split, protect, sign, redact and compress PDFs; notes |
| **[Labs](https://toolity.in/labs/)** | Everyday utilities — QR codes, share links, favicon grabbers |
| **[Dev](https://toolity.in/dev/)** | Format, minify, inspect and validate for engineers |
| **[Data](https://toolity.in/data/)** | Parse and manipulate structured data |
| **[Games](https://toolity.in/games/)** | Classic browser games for a quick break |

New tools ship regularly — the live category pages are always the source of truth.

## Why Toolity

- **Private by design.** Files and text never leave your device. Processing happens in the browser sandbox using Web APIs (Canvas, WebCodecs, Web Audio, File System).
- **Fast.** Static HTML, hand-written CSS, vanilla JavaScript. No frameworks, no build step, no cookie banners.
- **Free.** No accounts, no limits, no watermarks.

## How it works

Every tool is a standalone static page at its own URL (`/category/tool-name/`) with shared header, footer and search injected client-side from `components/`. Styling comes from one design system (`styles/main.css`) plus a small per-tool stylesheet; heavy lifting such as PDF editing and GIF encoding uses a handful of open-source libraries loaded on demand — all credited on the **[Credits](https://toolity.in/credits/)** page.

The site is deployed from this repository to GitHub Pages.

## Feedback & requests

Found a bug or want a tool that doesn't exist yet? **[Open an issue](https://github.com/kapildoesmarketing/toolity.in/issues)**.

## Legal

[Privacy](https://toolity.in/privacy/) · [Terms](https://toolity.in/terms/) · [Credits](https://toolity.in/credits/)

---

Made by **[Kapil Pidhwani](https://github.com/kapildoesmarketing)**.

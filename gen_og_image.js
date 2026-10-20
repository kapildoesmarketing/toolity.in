#!/usr/bin/env node
/* Designed by Kapil Pidhwani: per-post Open Graph card → /blog/<slug>/og.png (1200×630). Renders a small HTML card with
 * headless Chrome so the fox, Inter and the brand gradient match the site; PNG because X/LinkedIn/WhatsApp ignore SVG og:image.
 * Usage: node gen_og_image.js <slug> "<title>" ["<kicker>"]   — idempotent, overwrites og.png. Needs google-chrome on PATH. */
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const [slug, title, kicker = 'Toolity Blog'] = process.argv.slice(2);
if (!slug || !title) { console.error('usage: node gen_og_image.js <slug> "<title>" ["<kicker>"]'); process.exit(1); }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fox = 'data:image/webp;base64,' + fs.readFileSync(path.join(__dirname, 'assets/Toolity.in Happy.webp')).toString('base64');
const size = title.length > 70 ? 54 : title.length > 48 ? 62 : 72;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap');
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
.card{position:relative;width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;background:#fff;font-family:Inter,-apple-system,Segoe UI,sans-serif;color:#17191C;display:flex;flex-direction:column;justify-content:space-between}
.card::before{content:"";position:absolute;inset:0;background:radial-gradient(900px 500px at 100% 0%,#FFE4D6 0%,rgba(255,228,214,0) 60%),radial-gradient(700px 400px at 0% 100%,#FFF1EB 0%,rgba(255,241,235,0) 60%)}
.card::after{content:"";position:absolute;left:0;right:0;bottom:0;height:14px;background:linear-gradient(90deg,#F4511E,#FF8A50)}
.k{position:relative;font-size:22px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#F4511E}
h1{position:relative;margin:0;font-size:${size}px;line-height:1.12;letter-spacing:-.025em;font-weight:700;max-width:860px}
.b{position:relative;display:flex;align-items:center;gap:16px;font-size:26px;font-weight:600;color:#62666B}
.b b{color:#17191C}.b i{font-style:normal;color:#F4511E}
.fox{position:absolute;right:72px;bottom:60px;width:220px;height:220px}
.pill{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border:1.5px solid #E6E7EA;border-radius:999px;font-size:20px;color:#62666B;background:rgba(255,255,255,.7)}
</style></head><body><div class="card"><div class="k">${esc(kicker)}</div><h1>${esc(title)}</h1><div class="b"><b>Toolity<i>.in</i></b><span class="pill">Runs in your browser · nothing uploaded</span></div><img class="fox" src="${fox}" alt=""></div></body></html>`;
const dir = path.join(__dirname, 'blog', slug); fs.mkdirSync(dir, { recursive: true });
const tmp = path.join(dir, '.og.html'); fs.writeFileSync(tmp, html);
execSync(`google-chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --force-device-scale-factor=1 --virtual-time-budget=6000 --screenshot="${path.join(dir, 'og.png')}" "file://${tmp}"`, { stdio: 'ignore' });
fs.unlinkSync(tmp);
console.log('wrote', path.relative(__dirname, path.join(dir, 'og.png')), fs.statSync(path.join(dir, 'og.png')).size, 'bytes');

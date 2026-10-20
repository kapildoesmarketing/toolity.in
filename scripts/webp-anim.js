/* Toolity.in — animated WebP muxer (window.ToolityWebP). Wraps per-frame WebP blobs from canvas.toBlob('image/webp') into one
 * animated file: RIFF/WEBP · VP8X (animation + alpha flags) · ANIM · ANMF×n. Each ANMF carries the frame's ALPH (if any) + VP8/VP8L
 * bitstream; ICCP/EXIF/XMP from the frames are dropped. Pure JS, no encoder — the browser does the pixel work.
 * Designed by Kapil Pidhwani: ceiling = no inter-frame compression (every frame is a keyframe, like Chrome's own encoder output); fine
 * for stickers (≤ 10 s · 512 px). Upgrade path: libwebp wasm with frame diffing if we ever need long animations. */
(function () {
  'use strict';
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const u24 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
  const tag = (s) => [...s].map((c) => c.charCodeAt(0));
  const rd32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const id = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

  /* chunks(bytes) → [{ id, data }] for a single-image WebP (RIFF header skipped) */
  function chunks(b) {
    if (id(b, 0) !== 'RIFF' || id(b, 8) !== 'WEBP') throw new Error('not a WebP');
    const out = []; let o = 12;
    while (o + 8 <= b.length) { const n = rd32(b, o + 4); out.push({ id: id(b, o), data: b.subarray(o + 8, o + 8 + n) }); o += 8 + n + (n & 1); }
    return out;
  }
  const chunk = (name, data) => { const n = data.length, out = new Uint8Array(8 + n + (n & 1)); out.set(tag(name), 0); out.set(u32(n), 4); out.set(data, 8); return out; };
  const concat = (parts) => { const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

  /* encode(frames: [{ blob (image/webp), ms }], { width, height, loop = 0 (forever), bg = [r,g,b,a] }) → Blob (image/webp) */
  async function encode(frames, o) {
    if (!frames.length) throw new Error('no frames');
    const W = o.width, H = o.height; let hasAlpha = false;
    const anmf = [];
    for (const f of frames) {
      const cs = chunks(new Uint8Array(await f.blob.arrayBuffer()));
      const alph = cs.find((c) => c.id === 'ALPH'), bits = cs.find((c) => c.id === 'VP8 ' || c.id === 'VP8L');
      if (!bits) throw new Error('frame has no VP8 bitstream');
      if (alph || bits.id === 'VP8L') hasAlpha = true;
      // ANMF payload: X/2, Y/2 (24-bit each), W-1, H-1 (24-bit), duration (24-bit), flags (blend=0 → alpha-blend, dispose=1 → to background), then frame data
      const head = new Uint8Array([...u24(0), ...u24(0), ...u24(W - 1), ...u24(H - 1), ...u24(Math.max(1, Math.round(f.ms))), 0b00000001]);
      const body = concat([head, ...(alph ? [chunk('ALPH', alph.data)] : []), chunk(bits.id, bits.data)]);
      anmf.push(chunk('ANMF', body));
    }
    const vp8x = chunk('VP8X', new Uint8Array([(hasAlpha ? 0x10 : 0) | 0x02, 0, 0, 0, ...u24(W - 1), ...u24(H - 1)])); // flags: ICC=0x20 ALPHA=0x10 EXIF=0x08 XMP=0x04 ANIM=0x02
    const bg = o.bg || [0, 0, 0, 0];
    const anim = chunk('ANIM', new Uint8Array([bg[2], bg[1], bg[0], bg[3], ...[o.loop || 0, 0].slice(0, 2)])); // BGRA background + 16-bit loop count (0 = forever)
    const body = concat([tag('WEBP'), vp8x, anim, ...anmf].map((p) => (p instanceof Uint8Array ? p : new Uint8Array(p))));
    const riff = concat([new Uint8Array(tag('RIFF')), new Uint8Array(u32(body.length)), body]);
    return new Blob([riff], { type: 'image/webp' });
  }

  /* frameBlob(canvas, quality 0–1) → Promise<Blob> — lossy WebP from a canvas (alpha preserved when present) */
  const frameBlob = (canvas, q = 0.8) => new Promise((res, rej) => canvas.toBlob((b) => (b && b.type === 'image/webp' ? res(b) : rej(new Error('This browser cannot encode WebP — try Chrome, Edge or Firefox.'))), 'image/webp', q));

  /* info(blob) → { animated, frames, width, height } — cheap header read, used by tests and badges */
  async function info(blob) {
    const b = new Uint8Array(await blob.arrayBuffer()), cs = chunks(b), x = cs.find((c) => c.id === 'VP8X');
    return { animated: !!(x && (x.data[0] & 0x02)), frames: cs.filter((c) => c.id === 'ANMF').length, width: x ? 1 + (x.data[4] | (x.data[5] << 8) | (x.data[6] << 16)) : 0, height: x ? 1 + (x.data[7] | (x.data[8] << 8) | (x.data[9] << 16)) : 0 };
  }

  window.ToolityWebP = { encode, frameBlob, info, chunks };
})();

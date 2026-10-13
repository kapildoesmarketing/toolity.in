/* Video Muter — Toolity.in. MP4/MOV/M4V: lossless — the audio trak is renamed to `free` and its sample bytes are zeroed in place
 * (byte length unchanged, so every chunk offset stays valid). WebM & others: silent real-time re-encode via /scripts/video-common.js. */
(function () {
  'use strict';
  const V = window.ToolityVideo, { formatBytes } = window.Toolity, $ = (id) => document.getElementById(id);
  const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const four = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  function* atoms(b, start, end) {
    for (let p = start; p + 8 <= end;) {
      let size = u32(b, p), hdr = 8; const type = four(b, p + 4);
      if (size === 1) { size = u32(b, p + 8) * 4294967296 + u32(b, p + 12); hdr = 16; } else if (size === 0) size = end - p;
      if (size < hdr || p + size > end) return;
      yield { type, start: p, body: p + hdr, end: p + size }; p += size;
    }
  }
  const child = (b, a, ...path) => { let cur = a; for (const t of path) { cur = [...atoms(b, cur.body, cur.end)].find((x) => x.type === t); if (!cur) return null; } return cur; };
  const isIso = (b) => ['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip'].includes(four(b, 4));
  // Designed by Kapil Pidhwani: zeroing instead of cutting keeps the file layout, so it is instant and lossless for the picture.
  // Ceiling: the file size barely shrinks, and fragmented MP4 (moof) is re-encoded instead. Upgrade path: a real remux (mp4box.js).
  function muteIso(buf) {
    const b = new Uint8Array(buf.slice(0)), top = [...atoms(b, 0, b.length)];
    if (top.some((a) => a.type === 'moof')) return null;
    const moov = top.find((a) => a.type === 'moov'); if (!moov) return null;
    let n = 0;
    for (const trak of [...atoms(b, moov.body, moov.end)].filter((a) => a.type === 'trak')) {
      const hdlr = child(b, trak, 'mdia', 'hdlr'); if (!hdlr || four(b, hdlr.body + 8) !== 'soun') continue;
      const stbl = child(b, trak, 'mdia', 'minf', 'stbl');
      if (stbl) {
        const stsz = child(b, stbl, 'stsz'), stsc = child(b, stbl, 'stsc'), stco = child(b, stbl, 'stco'), co64 = child(b, stbl, 'co64');
        if (stsz && stsc && (stco || co64)) {
          const fixed = u32(b, stsz.body + 4), count = u32(b, stsz.body + 8), size = (i) => (fixed || u32(b, stsz.body + 12 + i * 4));
          const co = stco || co64, chunks = u32(b, co.body + 4), off = (i) => (stco ? u32(b, co.body + 8 + i * 4) : u32(b, co.body + 8 + i * 8) * 4294967296 + u32(b, co.body + 12 + i * 8));
          const runs = Array.from({ length: u32(b, stsc.body + 4) }, (_, i) => [u32(b, stsc.body + 8 + i * 12), u32(b, stsc.body + 12 + i * 12)]);
          for (let c = 0, s = 0, r = 0; c < chunks && s < count; c++) {
            while (r + 1 < runs.length && runs[r + 1][0] <= c + 1) r++;
            let len = 0; for (let k = 0; k < runs[r][1] && s < count; k++, s++) len += size(s);
            const o = off(c); if (o + len <= b.length) b.fill(0, o, o + len);
          }
        }
      }
      b.set([0x66, 0x72, 0x65, 0x65], trak.start + 4); n++; // 'trak' → 'free'
    }
    return { buf: b.buffer, removed: n };
  }
  const T = V.mount({
    actionLabel: 'Mute video', verb: 'Re-encoding', suffix: 'muted',
    run: async (S, api) => {
      const head = new Uint8Array(await S.file.slice(0, 16).arrayBuffer());
      if (isIso(head)) {
        api.progress(0.3, 'Removing audio…');
        const r = muteIso(await S.file.arrayBuffer());
        if (r && !r.removed) throw new Error('This video has no audio track — it is already silent.');
        if (r) return { blob: new Blob([r.buf], { type: S.file.type || 'video/mp4' }), lossless: true, w: S.w, h: S.h };
      }
      return { ...(await V.render({ w: S.w, h: S.h, segments: [{ video: api.src, from: 0, to: S.dur }], audio: false, onProgress: api.onProgress, stop: api.stop })), lossless: false };
    },
    present: (r, S, setOutput) => {
      S.lossless = r.lossless;
      setOutput(r.blob, r.w, r.h, `${r.lossless ? 'Lossless · audio removed' : `Re-encoded · ${V.ext(r.blob.type).toUpperCase()}`} · ${formatBytes(r.blob.size)}`);
      T.outV.src = S.outUrl; T.outV.classList.add('is-shown');
    },
    outExt: (S) => (S.lossless ? (S.file.name.match(/\.([a-z0-9]+)$/i) || [0, 'mp4'])[1].toLowerCase() : V.ext(S.mime)),
    onReset: () => { T.outV.classList.remove('is-shown'); }
  });
  window.__vm = { T, muteIso };
})();

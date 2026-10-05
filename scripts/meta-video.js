/* Designed by Kapil Pidhwani: Video (and M4A) metadata parser + lossless stripper.
 * ISOBMFF (MP4 · MOV · M4V · M4A · 3GP): reads mvhd/tkhd/mdhd dates, dimensions, codecs, udta (©xyz GPS, ©nam …),
 * meta/ilst (iTunes-style + mdta keys) and top-level XMP uuid. Strips by renaming udta/meta/uuid atoms to `free` in place
 * and zeroing the timestamps — byte length never changes, so stco/co64 chunk offsets stay valid.
 * Matroska/WebM: reads Segment Info, Tracks, Tags, Attachments; strips by overwriting Title/DateUTC/Tags/Attachments
 * with EBML Void elements of identical length. MuxingApp/WritingApp are mandatory per spec and left alone.
 * Ceilings: fragmented MP4 (moof) metadata is not walked; EBML elements with "unknown size" stop the walk.
 */
(function (root) {
  'use strict';
  const M = typeof module !== 'undefined' && module.exports ? require('./meta-common.js') : root.ToolityMeta;

  const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const u64 = (b, o) => u32(b, o) * 4294967296 + u32(b, o + 4);
  const four = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]).replace(/\u00a9/g, '©');
  const sig = (b, s, o = 0) => s.split('').every((c, i) => b[o + i] === c.charCodeAt(0));
  const macDate = (s) => (s ? M.iso(new Date((s - 2082844800) * 1000)) : null);
  const ILST = { '©nam': 'Title', '©ART': 'Artist', aART: 'Album Artist', '©alb': 'Album', '©gen': 'Genre', gnre: 'Genre', '©day': 'Date', '©too': 'Encoder', '©cmt': 'Comment', '©wrt': 'Composer', '©lyr': 'Lyrics', desc: 'Description', ldes: 'Long Description', cprt: 'Copyright', trkn: 'Track', disk: 'Disc', covr: 'Cover Art', '©xyz': 'GPS Location', '©mak': 'Make', '©mod': 'Model', '©swr': 'Software', '©enc': 'Encoded By', tvsh: 'TV Show', purd: 'Purchase Date', apID: 'Apple ID', ownr: 'Owner', '©grp': 'Grouping', keyw: 'Keywords', '©st3': 'Subtitle', tmpo: 'BPM', cpil: 'Compilation', soal: 'Album Sort', soar: 'Artist Sort', sonm: 'Title Sort', '©dir': 'Director', '©prd': 'Producer', '©cam': 'Camera', '©loc': 'Location', '©aut': 'Author', '©req': 'Requirements', '©inf': 'Information', '©des': 'Description', '©fmt': 'Format', '©src': 'Source', '©cpy': 'Copyright', '©dat': 'Date', albm: 'Album', auth: 'Author', titl: 'Title', dscp: 'Description', yrrc: 'Year', loci: 'Location', perf: 'Performer', Xtra: 'Windows Media Tags' };

  /* ── ISOBMFF ─────────────────────────────────────────────── */
  function* atoms(b, start, end) {
    let p = start;
    while (p + 8 <= end) {
      let size = u32(b, p), hdr = 8; const type = four(b, p + 4);
      if (size === 1) { size = u64(b, p + 8); hdr = 16; } else if (size === 0) size = end - p;
      if (size < hdr || p + size > end) return;
      yield { type, start: p, size, hdr, body: p + hdr, end: p + size };
      p += size;
    }
  }
  const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'ilst', 'edts', 'dinf', 'mvex', 'meta']);
  const metaBody = (b, a) => (a.type === 'meta' && four(b, a.body + 4) !== 'hdlr' && four(b, a.body + 8) === 'hdlr' ? a.body + 4 : a.body); // ISO meta has version/flags, QuickTime meta doesn't
  function walk(b, start, end, path, fn) {
    for (const a of atoms(b, start, end)) {
      const p = path + '/' + a.type;
      if (fn(a, p) === false) continue;
      if (CONTAINERS.has(a.type) || (path.endsWith('/ilst'))) walk(b, metaBody(b, a), a.end, p, fn);
    }
  }
  const gpsRows = (s, sec) => { const m = String(s).match(/([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)(?:([+-]\d+(?:\.\d+)?))?/); if (!m) { M.add(sec, 'GPS Location', s); return; } const lat = +m[1], lon = +m[2]; M.add(sec, 'Latitude', lat.toFixed(6)); M.add(sec, 'Longitude', lon.toFixed(6)); if (m[3]) M.add(sec, 'Altitude', `${+m[3]} m`); M.add(sec, 'Map', `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=15/${lat.toFixed(5)}/${lon.toFixed(5)}`); };
  function readData(b, a) { // 'data' atom inside an ilst item → string
    const t = u32(b, a.body) & 0xffffff, d = b.subarray(a.body + 8, a.end);
    if (t === 1 || t === 2) return M.text(d, t === 2 ? 'utf-16be' : 'utf-8');
    if (t === 13) return `image/jpeg · ${M.fmtBytes(d.length)}`; if (t === 14) return `image/png · ${M.fmtBytes(d.length)}`;
    if (t === 21 || t === 22 || t === 0) { if (d.length === 8 || d.length === 6) return `${(d[2] << 8) | d[3]}${d[5] ? ' of ' + ((d[4] << 8) | d[5]) : ''}`; if (d.length <= 4) { let v = 0; for (const x of d) v = (v << 8) | x; return String(v); } }
    return `${d.length} bytes`;
  }
  function parseIso(b, buf, file) {
    const info = M.section('File', false), dates = M.section('Dates'), gps = M.section('GPS Location'), tags = M.section('Tags'), tracks = M.section('Tracks', false), xmp = [];
    let timescale = 1, duration = 0, brand = '', keys = [];
    for (const a of atoms(b, 0, b.length)) {
      if (a.type === 'ftyp') brand = four(b, a.body);
      if (a.type === 'uuid' && b[a.body] === 0xbe && b[a.body + 1] === 0x7a) xmp.push(M.parseXmp(M.text(b.subarray(a.body + 16, a.end))));
      if (a.type === 'moof') M.add(info, 'Fragmented', 'Yes (streaming MP4)');
    }
    walk(b, 0, b.length, '', (a, p) => {
      if (p === '/moov/mvhd') { const v = b[a.body]; const o = a.body + 4; if (v === 1) { M.add(dates, 'Created', macDate(u64(b, o))); M.add(dates, 'Modified', macDate(u64(b, o + 8))); timescale = u32(b, o + 16); duration = u64(b, o + 20); } else { M.add(dates, 'Created', macDate(u32(b, o))); M.add(dates, 'Modified', macDate(u32(b, o + 4))); timescale = u32(b, o + 8); duration = u32(b, o + 12); } }
      else if (p.endsWith('/meta/keys')) { keys = []; for (const k of atoms(b, a.body + 8, a.end)) keys.push(M.text(b.subarray(k.body + 4, k.end))); }
      else if (/\/udta\/[^/]+$/.test(p) && a.type !== 'meta') { // QuickTime-style udta entries (©xyz, ©nam, ©swr …)
        const d = b.subarray(a.body, a.end); let val;
        if (a.type === 'loci' && d.length > 16) { let q = 6; while (q < d.length && d[q]) q++; q += 2; const dv = new DataView(d.buffer, d.byteOffset + q, 12); const lon = dv.getInt32(0) / 65536, lat = dv.getInt32(4) / 65536; gpsRows(`${lat >= 0 ? '+' : ''}${lat}${lon >= 0 ? '+' : ''}${lon}`, gps); return false; }
        if (d.length > 4 && d[0] === 0 && d[1] <= d.length - 4 && (d[2] === 0x15 || d[2] === 0x55 || d[2] === 0 || d[2] === 0x09)) val = M.text(d.subarray(4, 4 + ((d[0] << 8) | d[1]))); else val = M.text(d);
        const name = ILST[a.type] || `udta/${a.type}`;
        if (a.type === '©xyz') gpsRows(val, gps); else if (a.type === 'Xtra') M.add(tags, name, `${d.length} bytes`); else if (/^[\x20-\x7e©\s]+$/.test(val) || val.length > 0) M.add(tags, name, val.length > 300 ? val.slice(0, 300) + '…' : val);
        return false;
      }
      else if (/\/ilst\/[^/]+$/.test(p)) {
        const data = [...atoms(b, a.body, a.end)].find((x) => x.type === 'data'); if (!data) return false;
        let name = a.type;
        if (a.type === '----') { const nm = [...atoms(b, a.body, a.end)].find((x) => x.type === 'name'); name = nm ? M.text(b.subarray(nm.body + 4, nm.end)) : '----'; }
        else if (keys.length) { const idx = u32(b, a.start + 4); if (idx >= 1 && idx <= keys.length && !/^[\x20-\x7e©]{4}$/.test(a.type)) name = keys[idx - 1]; }
        const val = readData(b, data); const label = ILST[name] || name.replace(/^com\.(apple\.quicktime|android)\./, '');
        if (name === '©xyz' || /location\.ISO6709/.test(name)) gpsRows(val, gps); else M.add(tags, label, val.length > 300 ? val.slice(0, 300) + '…' : val);
        return false;
      }
    });
    const trs = []; let t = null;
    walk(b, 0, b.length, '', (a, p) => { if (p === '/moov/trak') { t = {}; trs.push(t); } else if (t) { if (p === '/moov/trak/mdia/hdlr') t.type = { vide: 'Video', soun: 'Audio', text: 'Text', sbtl: 'Subtitles', meta: 'Metadata', tmcd: 'Timecode' }[four(b, a.body + 8)] || four(b, a.body + 8); else if (p === '/moov/trak/mdia/minf/stbl/stsd') { const e = [...atoms(b, a.body + 8, a.end)][0]; t.codec = e ? e.type : ''; if (e && t.type === 'Audio') { const ch = (b[e.body + 16] << 8) | b[e.body + 17], sr = u32(b, e.body + 24) >>> 16; if (sr) t.extra = `${sr} Hz · ${ch === 1 ? 'mono' : ch === 2 ? 'stereo' : ch + ' ch'}`; } } else if (p === '/moov/trak/tkhd') { const v = b[a.body]; const o = a.body + (v === 1 ? 88 : 76); const w = u32(b, o) / 65536, h = u32(b, o + 4) / 65536; if (w && h) t.dims = `${Math.round(w)} × ${Math.round(h)}`; } } });
    trs.forEach((x, i) => M.add(tracks, `Track ${i + 1}`, [x.type || 'Unknown', x.codec, x.dims, x.extra].filter(Boolean).join(' · ')));
    M.add(info, 'Format', { isom: 'MP4', mp41: 'MP4', mp42: 'MP4', M4A: 'M4A (AAC)', M4V: 'M4V', qt: 'QuickTime MOV', '3gp': '3GP', avc1: 'MP4', heic: 'HEIC', mif1: 'HEIF' }[brand.trim()] || `ISO media (${brand.trim()})`);
    M.add(info, 'Size', M.fmtBytes(buf.byteLength));
    if (timescale && duration) M.add(info, 'Duration', M.fmtDur(duration / timescale));
    const vid = trs.find((x) => x.type === 'Video' && x.dims); if (vid) M.add(info, 'Dimensions', vid.dims + ' px');
    return M.finish([gps, dates, tags, ...xmp, tracks, info], { kind: 'mp4' });
  }
  function stripIso(buf) {
    const out = buf.slice(0), b = new Uint8Array(out);
    const rename = (a) => { b[a.start + 4] = 0x66; b[a.start + 5] = 0x72; b[a.start + 6] = 0x65; b[a.start + 7] = 0x65; }; // 'free'
    for (const a of atoms(b, 0, b.length)) if (a.type === 'uuid' && b[a.body] === 0xbe && b[a.body + 1] === 0x7a) rename(a);
    walk(b, 0, b.length, '', (a, p) => {
      if (/^\/moov(\/trak)?\/(udta|meta)$/.test(p)) { rename(a); return false; }
      if (p === '/moov/mvhd' || p === '/moov/trak/tkhd' || p === '/moov/trak/mdia/mdhd') { const n = b[a.body] === 1 ? 16 : 8; b.fill(0, a.body + 4, a.body + 4 + n); }
    });
    return out;
  }

  /* ── EBML (Matroska / WebM) ──────────────────────────────── */
  function vint(b, p, keepMarker) { const f = b[p]; if (f === undefined) return null; let len = 1; while (len <= 8 && !(f & (0x80 >> (len - 1)))) len++; if (len > 8) return null; let v = keepMarker ? f : f & (0xff >> len); for (let i = 1; i < len; i++) v = v * 256 + b[p + i]; const unknown = !keepMarker && v === 2 ** (7 * len) - 1; return { v, len, unknown }; }
  function* ebml(b, start, end) { let p = start; while (p < end) { const id = vint(b, p, true); if (!id) return; const sz = vint(b, p + id.len, false); if (!sz) return; const body = p + id.len + sz.len; const e = sz.unknown ? end : Math.min(end, body + sz.v); yield { id: id.v, start: p, body, end: e, size: sz.v }; if (sz.unknown) return; p = e; } }
  const E = { EBML: 0x1a45dfa3, Segment: 0x18538067, Info: 0x1549a966, Title: 0x7ba9, MuxingApp: 0x4d80, WritingApp: 0x5741, DateUTC: 0x4461, Duration: 0x4489, TimecodeScale: 0x2ad7b1, Tracks: 0x1654ae6b, TrackEntry: 0xae, TrackType: 0x83, CodecID: 0x86, Name: 0x536e, Language: 0x22b59c, Video: 0xe0, PixelWidth: 0xb0, PixelHeight: 0xba, Audio: 0xe1, SamplingFrequency: 0xb5, Channels: 0x9f, Tags: 0x1254c367, Tag: 0x7373, SimpleTag: 0x67c8, TagName: 0x45a3, TagString: 0x4487, Attachments: 0x1941a469, AttachedFile: 0x61a7, FileName: 0x466e, FileData: 0x465c, Cluster: 0x1f43b675, DocType: 0x4282 };
  const uintAt = (b, e) => { let v = 0; for (let i = e.body; i < e.end; i++) v = v * 256 + b[i]; return v; };
  const floatAt = (b, e) => { const dv = new DataView(b.buffer, b.byteOffset + e.body, e.end - e.body); return e.end - e.body === 4 ? dv.getFloat32(0) : dv.getFloat64(0); };
  const strAt = (b, e) => M.text(b.subarray(e.body, e.end));
  function parseEbml(b, buf) {
    const info = M.section('File', false), dates = M.section('Dates'), tags = M.section('Tags'), tracks = M.section('Tracks', false), extra = M.section('Other Metadata');
    let docType = 'matroska', tcs = 1e6, dur = 0;
    for (const top of ebml(b, 0, b.length)) {
      if (top.id === E.EBML) { for (const e of ebml(b, top.body, top.end)) if (e.id === E.DocType) docType = strAt(b, e); }
      if (top.id !== E.Segment) continue;
      for (const seg of ebml(b, top.body, top.end)) {
        if (seg.id === E.Cluster) break;
        if (seg.id === E.Info) for (const e of ebml(b, seg.body, seg.end)) { if (e.id === E.Title) M.add(tags, 'Title', strAt(b, e)); else if (e.id === E.MuxingApp) M.add(extra, 'Muxing App', strAt(b, e)); else if (e.id === E.WritingApp) M.add(extra, 'Writing App', strAt(b, e)); else if (e.id === E.DateUTC) { let v = uintAt(b, e); if (e.end - e.body === 8 && b[e.body] & 0x80) v -= 2 ** 64; M.add(dates, 'Created', M.iso(new Date(978307200000 + v / 1e6))); } else if (e.id === E.TimecodeScale) tcs = uintAt(b, e); else if (e.id === E.Duration) dur = floatAt(b, e); }
        else if (seg.id === E.Tracks) { let n = 0; for (const te of ebml(b, seg.body, seg.end)) { if (te.id !== E.TrackEntry) continue; n++; const t = {}; for (const e of ebml(b, te.body, te.end)) { if (e.id === E.TrackType) t.type = { 1: 'Video', 2: 'Audio', 17: 'Subtitles' }[uintAt(b, e)] || 'Other'; else if (e.id === E.CodecID) t.codec = strAt(b, e); else if (e.id === E.Name) t.name = strAt(b, e); else if (e.id === E.Language) t.lang = strAt(b, e); else if (e.id === E.Video) { let w, h; for (const v of ebml(b, e.body, e.end)) { if (v.id === E.PixelWidth) w = uintAt(b, v); if (v.id === E.PixelHeight) h = uintAt(b, v); } if (w && h) t.dims = `${w} × ${h}`; } else if (e.id === E.Audio) { let sr, ch; for (const v of ebml(b, e.body, e.end)) { if (v.id === E.SamplingFrequency) sr = floatAt(b, v); if (v.id === E.Channels) ch = uintAt(b, v); } t.extra = `${Math.round(sr || 0)} Hz · ${ch === 1 ? 'mono' : ch === 2 ? 'stereo' : (ch || '?') + ' ch'}`; } } M.add(tracks, `Track ${n}`, [t.type, t.codec, t.dims, t.extra, t.lang && t.lang !== 'und' ? t.lang : '', t.name ? `"${t.name}"` : ''].filter(Boolean).join(' · ')); } }
        else if (seg.id === E.Tags) { const rec = (start, end, prefix) => { for (const st of ebml(b, start, end)) { if (st.id !== E.SimpleTag) continue; let name = '', val = ''; for (const e of ebml(b, st.body, st.end)) { if (e.id === E.TagName) name = strAt(b, e); else if (e.id === E.TagString) val = strAt(b, e); } if (name) M.add(tags, prefix + name.charAt(0) + name.slice(1).toLowerCase().replace(/_/g, ' '), val); rec(st.body, st.end, prefix + name + ' / '); } }; for (const tag of ebml(b, seg.body, seg.end)) if (tag.id === E.Tag) rec(tag.body, tag.end, ''); }
        else if (seg.id === E.Attachments) for (const af of ebml(b, seg.body, seg.end)) { let name = '', size = 0; for (const e of ebml(b, af.body, af.end)) { if (e.id === E.FileName) name = strAt(b, e); if (e.id === E.FileData) size = e.end - e.body; } M.add(tags, 'Attachment', `${name} · ${M.fmtBytes(size)}`); }
      }
    }
    M.add(info, 'Format', docType === 'webm' ? 'WebM' : 'Matroska (MKV)');
    M.add(info, 'Size', M.fmtBytes(buf.byteLength));
    if (dur) M.add(info, 'Duration', M.fmtDur((dur * tcs) / 1e9));
    const vid = tracks.rows.find((r) => /Video/.test(r[1]) && /×/.test(r[1])); if (vid) M.add(info, 'Dimensions', vid[1].match(/(\d+ × \d+)/)[1] + ' px');
    return M.finish([dates, tags, extra, tracks, info], { kind: docType === 'webm' ? 'webm' : 'mkv' });
  }
  function voidOut(b, e) { // overwrite element [start,end) with an EBML Void of identical total length
    const L = e.end - e.start; if (L < 2) return;
    b[e.start] = 0xec;
    if (L - 2 < 127) { b[e.start + 1] = 0x80 | (L - 2); b.fill(0, e.start + 2, e.end); }
    else { const n = L - 9; b[e.start + 1] = 0x01; for (let i = 0; i < 7; i++) b[e.start + 2 + i] = Math.floor(n / 2 ** (8 * (6 - i))) & 0xff; b.fill(0, e.start + 9, e.end); }
  }
  function stripEbml(buf) {
    const out = buf.slice(0), b = new Uint8Array(out);
    for (const top of ebml(b, 0, b.length)) {
      if (top.id !== E.Segment) continue;
      for (const seg of ebml(b, top.body, top.end)) {
        if (seg.id === E.Cluster) break;
        if (seg.id === E.Tags || seg.id === E.Attachments) voidOut(b, seg);
        else if (seg.id === E.Info) { for (const e of ebml(b, seg.body, seg.end)) if (e.id === E.Title || e.id === E.DateUTC) voidOut(b, e); }
        else if (seg.id === E.Tracks) { for (const te of ebml(b, seg.body, seg.end)) if (te.id === E.TrackEntry) for (const e of ebml(b, te.body, te.end)) if (e.id === E.Name) voidOut(b, e); }
      }
    }
    return out;
  }

  M.videoKind = (b) => (sig(b, 'ftyp', 4) || sig(b, 'moov', 4) || sig(b, 'mdat', 4) || sig(b, 'wide', 4) || sig(b, 'free', 4) ? 'mp4' : u32(b, 0) === E.EBML ? 'ebml' : 'other');
  M.video = {
    parse(buf, file) {
      const b = new Uint8Array(buf), kind = M.videoKind(b);
      if (kind === 'mp4') return parseIso(b, buf, file);
      if (kind === 'ebml') return parseEbml(b, buf);
      const info = M.section('File', false); M.add(info, 'Format', (file && file.type) || 'Unknown'); M.add(info, 'Size', M.fmtBytes(buf.byteLength));
      const r = M.finish([info], { kind: 'other' }); r.note = 'Only MP4/MOV/M4V and WebM/MKV containers are parsed.'; return r;
    },
    strip(buf) {
      const b = new Uint8Array(buf), kind = M.videoKind(b);
      if (kind === 'mp4') return stripIso(buf);
      if (kind === 'ebml') return stripEbml(buf);
      throw new Error('Unsupported container. Use MP4, MOV, M4V, WebM or MKV — convert AVI/WMV/FLV first with the Video Converter.');
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);

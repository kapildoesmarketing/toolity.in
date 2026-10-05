/* Designed by Kapil Pidhwani: Audio metadata parser + lossless stripper.
 * MP3 (ID3v1 · ID3v2.2/2.3/2.4 · APEv2) · FLAC (Vorbis comments, pictures) · WAV (LIST/INFO, bext, iXML, id3) are
 * read and cleaned losslessly. M4A/AAC are delegated to the ISOBMFF walker in meta-video.js (udta/ilst → free).
 * OGG/Opus comments are read only — rewriting them means re-CRC-ing every page, which is not worth it today.
 * Duration/bitrate for MP3 is estimated from the first frame header (CBR assumption; VBR files show "~").
 */
(function (root) {
  'use strict';
  const M = typeof module !== 'undefined' && module.exports ? require('./meta-common.js') : root.ToolityMeta;
  if (typeof module !== 'undefined' && module.exports) require('./meta-video.js');

  const FRAMES = { TIT2: 'Title', TT2: 'Title', TPE1: 'Artist', TP1: 'Artist', TALB: 'Album', TAL: 'Album', TYER: 'Year', TYE: 'Year', TDRC: 'Recording Date', TDRL: 'Release Date', TDAT: 'Date', TRCK: 'Track', TRK: 'Track', TPOS: 'Disc', TCON: 'Genre', TCO: 'Genre', TCOM: 'Composer', TCM: 'Composer', TPE2: 'Album Artist', TP2: 'Album Artist', TPE3: 'Conductor', TENC: 'Encoded By', TEN: 'Encoded By', TSSE: 'Encoder Settings', TSS: 'Encoder Settings', TPUB: 'Publisher', TPB: 'Publisher', TCOP: 'Copyright', TCR: 'Copyright', TBPM: 'BPM', TBP: 'BPM', TLEN: 'Length (ms)', TLE: 'Length (ms)', TLAN: 'Language', TLA: 'Language', TIT1: 'Grouping', TIT3: 'Subtitle', TOPE: 'Original Artist', TOAL: 'Original Album', TEXT: 'Lyricist', TSRC: 'ISRC', TSOP: 'Artist Sort', TSOT: 'Title Sort', TSOA: 'Album Sort', TCMP: 'Compilation', TMED: 'Media Type', TOFN: 'Original Filename', TOWN: 'File Owner', TRSN: 'Station', TKEY: 'Key', TDEN: 'Encoding Time', TDTG: 'Tagging Time', TOLY: 'Original Lyricist', TIPL: 'Involved People', TMCL: 'Musician Credits', COMM: 'Comment', COM: 'Comment', USLT: 'Lyrics', ULT: 'Lyrics', TXXX: 'User Text', TXX: 'User Text', WXXX: 'User URL', WXX: 'User URL', WOAR: 'Artist URL', WOAF: 'File URL', WCOM: 'Commercial URL', WCOP: 'Copyright URL', WPUB: 'Publisher URL', APIC: 'Cover Art', PIC: 'Cover Art', PRIV: 'Private Frame', UFID: 'Unique File ID', POPM: 'Popularimeter', GEOB: 'Embedded Object', PCNT: 'Play Count', MCDI: 'CD Identifier' };
  const GENRES = ['Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise', 'Alt. Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta Rap', 'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave', 'Psychedelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock'];
  const ENC = ['latin1', 'utf-16', 'utf-16be', 'utf-8'];
  const sig = (b, s, o = 0) => s.split('').every((c, i) => b[o + i] === c.charCodeAt(0));
  const ss = (b, o) => ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);
  const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const le32 = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;
  const str = (b, enc) => M.text(b, ENC[enc] || 'latin1');
  const splitZ = (b, enc) => { const wide = enc === 1 || enc === 2; let i = 0; for (; i < b.length; i += wide ? 2 : 1) if (b[i] === 0 && (!wide || b[i + 1] === 0)) break; return [b.subarray(0, i), b.subarray(i + (wide ? 2 : 1))]; };

  /* ── ID3v2 ───────────────────────────────────────────────── */
  // Returns { end, frames:[{id, raw(Uint8Array of full frame), name, value, isPic}] , version } or null.
  function readId3v2(b, at = 0) {
    if (!sig(b, 'ID3', at) || b[at + 3] > 4) return null;
    const ver = b[at + 3], flags = b[at + 5], size = ss(b, at + 6);
    let p = at + 10; const end = at + 10 + size + (flags & 0x10 ? 10 : 0);
    if (ver >= 3 && flags & 0x40) p += ver === 4 ? ss(b, p) : u32(b, p); // extended header
    const frames = [], idLen = ver === 2 ? 3 : 4, hdr = ver === 2 ? 6 : 10;
    while (p + hdr <= Math.min(end, b.length)) {
      const id = String.fromCharCode(...b.subarray(p, p + idLen));
      if (!/^[A-Z0-9]{3,4}$/.test(id)) break;
      const fsz = ver === 2 ? (b[p + 3] << 16 | b[p + 4] << 8 | b[p + 5]) : ver === 4 ? ss(b, p + 4) : u32(b, p + 4);
      if (fsz <= 0 || p + hdr + fsz > b.length) break;
      let d = b.subarray(p + hdr, p + hdr + fsz);
      if (ver === 4 && b[p + 9] & 0x01) d = d.subarray(4); // data-length indicator
      const f = { id, raw: b.subarray(p, p + hdr + fsz), name: FRAMES[id] || `Frame ${id}`, value: '', isPic: id === 'APIC' || id === 'PIC' };
      try {
        if (id[0] === 'T' && id !== 'TXXX' && id !== 'TXX') { f.value = str(d.subarray(1), d[0]).replace(/\0/g, ' / ').trim(); if ((id === 'TCON' || id === 'TCO') && /^\(?\d+\)?$/.test(f.value)) f.value = GENRES[parseInt(f.value.replace(/\D/g, ''), 10)] || f.value; }
        else if (id === 'TXXX' || id === 'TXX' || id === 'WXXX' || id === 'WXX') { const [k, v] = splitZ(d.subarray(1), d[0]); f.name = str(k, d[0]) || f.name; f.value = id[0] === 'W' ? M.text(v, 'latin1') : str(v, d[0]); }
        else if (id[0] === 'W') f.value = M.text(d, 'latin1');
        else if (id === 'COMM' || id === 'COM' || id === 'USLT' || id === 'ULT') { const [k, v] = splitZ(d.subarray(4), d[0]); const desc = str(k, d[0]); f.value = (desc && desc !== 'ID3v1 Comment' ? desc + ': ' : '') + str(v, d[0]); }
        else if (f.isPic) { let mime, rest; if (id === 'PIC') { mime = 'image/' + M.text(d.subarray(1, 4), 'latin1').toLowerCase(); rest = d.subarray(4); } else { [mime, rest] = splitZ(d.subarray(1), 0); mime = M.text(mime, 'latin1'); } const [, img] = splitZ(rest.subarray(1), d[0]); f.value = `${mime || 'image'} · ${M.fmtBytes(img.length)}`; f.mime = mime; f.img = img; }
        else if (id === 'PRIV') { const [k] = splitZ(d, 0); f.value = M.text(k, 'latin1') + ` (${d.length} bytes)`; }
        else if (id === 'UFID') { const [k, v] = splitZ(d, 0); f.value = M.text(k, 'latin1') + ': ' + M.text(v, 'latin1').slice(0, 64); }
        else if (id === 'POPM') { const [k, v] = splitZ(d, 0); f.value = `${M.text(k, 'latin1')} · rating ${v[0]}/255`; }
        else f.value = `${d.length} bytes`;
      } catch (e) { f.value = `${d.length} bytes`; }
      frames.push(f); p += hdr + fsz;
    }
    return { end: Math.min(end, b.length), frames, version: `ID3v2.${ver}` };
  }
  function readId3v1(b) {
    if (b.length < 128 || !sig(b, 'TAG', b.length - 128)) return null;
    const t = b.subarray(b.length - 128), s = (a, n) => M.clean(M.text(t.subarray(a, a + n), 'latin1'));
    return { title: s(3, 30), artist: s(33, 30), album: s(63, 30), year: s(93, 4), comment: s(97, 30), track: t[125] === 0 && t[126] ? t[126] : 0, genre: GENRES[t[127]] || '' };
  }
  function apeTail(b, end) { // returns start offset of an APEv2 tag ending at `end`, or -1
    if (end < 32 || !sig(b, 'APETAGEX', end - 32)) return -1;
    const size = le32(b, end - 32 + 12), flags = le32(b, end - 32 + 20);
    return Math.max(0, end - size - (flags & 0x80000000 ? 32 : 0));
  }
  const BITRATES = [[0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]];
  function mp3Frame(b, from, to) {
    for (let p = from; p < Math.min(to, from + 65536) - 4; p++) {
      if (b[p] !== 0xff || (b[p + 1] & 0xe0) !== 0xe0) continue;
      const v = (b[p + 1] >> 3) & 3, l = (b[p + 1] >> 1) & 3, bi = b[p + 2] >> 4, si = (b[p + 2] >> 2) & 3, mode = b[p + 3] >> 6;
      if (v === 1 || l === 0 || bi === 0 || bi === 15 || si === 3) continue;
      const mpeg = v === 3 ? 1 : 2, layer = 4 - l;
      const row = mpeg === 1 ? layer - 1 : layer === 1 ? 3 : 4;
      const sr = [[44100, 48000, 32000], [22050, 24000, 16000], [11025, 12000, 8000]][v === 3 ? 0 : v === 2 ? 1 : 2][si];
      let xing = false; const xo = p + 4 + (mpeg === 1 ? (mode === 3 ? 17 : 32) : (mode === 3 ? 9 : 17));
      if (sig(b, 'Xing', xo) || sig(b, 'Info', xo)) xing = true;
      return { mpeg: v === 0 ? 2.5 : mpeg, layer, bitrate: BITRATES[row][bi], sampleRate: sr, mode: ['Stereo', 'Joint stereo', 'Dual channel', 'Mono'][mode], vbr: xing };
    }
    return null;
  }

  /* ── FLAC / WAV / OGG helpers ────────────────────────────── */
  function* flacBlocks(b) { let p = 4; while (p + 4 <= b.length) { const last = b[p] & 0x80, type = b[p] & 0x7f, len = (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]; yield { type, last, start: p, len: len + 4, data: b.subarray(p + 4, p + 4 + len) }; p += 4 + len; if (last) return; } }
  function vorbisComments(d, sec) { let p = 0; const vl = le32(d, p); p += 4; const vendor = M.text(d.subarray(p, p + vl)); p += vl; const n = le32(d, p); p += 4; for (let i = 0; i < n && p + 4 <= d.length; i++) { const l = le32(d, p); p += 4; const kv = M.text(d.subarray(p, p + l)); p += l; const eq = kv.indexOf('='); const k = kv.slice(0, eq), v = kv.slice(eq + 1); if (/^METADATA_BLOCK_PICTURE$/i.test(k)) M.add(sec, 'Cover Art', `embedded (${M.fmtBytes(Math.floor(v.length * 0.75))})`); else M.add(sec, k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, ' '), v); } return vendor; }
  function* riffChunks(b) { let p = 12; while (p + 8 <= b.length) { const type = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]); const len = le32(b, p + 4); yield { type, start: p, len: 8 + len + (len & 1), data: b.subarray(p + 8, p + 8 + len) }; p += 8 + len + (len & 1); } }
  const INFO = { INAM: 'Title', IART: 'Artist', IPRD: 'Album', ICMT: 'Comment', ICRD: 'Date', IGNR: 'Genre', ISFT: 'Software', ITRK: 'Track', ICOP: 'Copyright', IENG: 'Engineer', ITCH: 'Technician', ISBJ: 'Subject', IKEY: 'Keywords', ISRC: 'Source', IARL: 'Archival Location', ICMS: 'Commissioned', IMED: 'Medium', ILNG: 'Language' };
  function oggPayload(b, maxPages = 12) { // concatenates payloads of the first pages of the first logical stream
    const parts = []; let p = 0, n = 0, serial = null;
    while (sig(b, 'OggS', p) && n++ < maxPages) { const segs = b[p + 26]; const s = le32(b, p + 14); if (serial === null) serial = s; let len = 0; for (let i = 0; i < segs; i++) len += b[p + 27 + i]; if (s === serial) parts.push(b.subarray(p + 27 + segs, p + 27 + segs + len)); p += 27 + segs + len; }
    return new Uint8Array(M.concat(parts));
  }

  M.audioKind = (b) => (sig(b, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) ? 'mp3' : sig(b, 'fLaC') ? 'flac' : sig(b, 'RIFF') && sig(b, 'WAVE', 8) ? 'wav' : sig(b, 'OggS') ? 'ogg' : sig(b, 'ftyp', 4) ? 'm4a' : 'other');

  M.audio = {
    parse(buf, file) {
      const b = new Uint8Array(buf), kind = M.audioKind(b);
      if (kind === 'm4a' && M.video) { const r = M.video.parse(buf, file); r.kind = 'm4a'; return r; }
      const info = M.section('File', false), tags = M.section('Tags'), extra = M.section('Other Metadata');
      M.add(info, 'Format', { mp3: 'MP3', flac: 'FLAC', wav: 'WAV', ogg: 'OGG' }[kind] || (file && file.type) || 'Unknown');
      M.add(info, 'Size', M.fmtBytes(buf.byteLength));
      let coverCount = 0;
      if (kind === 'mp3') {
        const v2 = readId3v2(b, 0); let start = v2 ? v2.end : 0;
        if (v2) { M.add(info, 'Tag Version', v2.version); for (const f of v2.frames) { if (f.isPic) coverCount++; M.add(tags, f.name, f.value); } }
        let end = b.length; const v1 = readId3v1(b); if (v1) { end -= 128; M.add(info, 'Legacy Tag', 'ID3v1'); for (const [k, v] of Object.entries(v1)) if (v) M.add(tags, k.charAt(0).toUpperCase() + k.slice(1) + ' (v1)', v); }
        const ape = apeTail(b, end); if (ape >= 0) { M.add(extra, 'APEv2 Tag', `${M.fmtBytes(end - ape)}`); end = ape; }
        const fr = mp3Frame(b, start, end);
        if (fr) { M.add(info, 'Codec', `MPEG-${fr.mpeg} Layer ${['', 'I', 'II', 'III'][fr.layer]}`); M.add(info, 'Bitrate', `${fr.vbr ? '~' : ''}${fr.bitrate} kbps${fr.vbr ? ' (VBR)' : ''}`); M.add(info, 'Sample Rate', `${fr.sampleRate} Hz`); M.add(info, 'Channels', fr.mode); const dur = M.fmtDur(((end - start) * 8) / (fr.bitrate * 1000)); if (dur) M.add(info, 'Duration', (fr.vbr ? '~' : '') + dur); }
      } else if (kind === 'flac') {
        for (const blk of flacBlocks(b)) {
          if (blk.type === 0) { const d = blk.data; const sr = (d[10] << 12) | (d[11] << 4) | (d[12] >> 4), ch = ((d[12] >> 1) & 7) + 1, bps = (((d[12] & 1) << 4) | (d[13] >> 4)) + 1, total = ((d[13] & 0x0f) * 2 ** 32) + u32(d, 14); M.add(info, 'Codec', 'FLAC (lossless)'); M.add(info, 'Sample Rate', `${sr} Hz`); M.add(info, 'Channels', ch); M.add(info, 'Bit Depth', `${bps}-bit`); M.add(info, 'Duration', M.fmtDur(total / sr)); }
          else if (blk.type === 4) M.add(extra, 'Encoder (vendor)', vorbisComments(blk.data, tags));
          else if (blk.type === 6) { coverCount++; const d = blk.data; const ml = u32(d, 4); M.add(tags, 'Cover Art', `${M.text(d.subarray(8, 8 + ml))} · ${M.fmtBytes(blk.len)}`); }
        }
      } else if (kind === 'wav') {
        for (const c of riffChunks(b)) {
          const d = c.data;
          if (c.type === 'fmt ') { const fmt = d[0] | d[1] << 8, ch = d[2] | d[3] << 8, sr = le32(d, 4), bits = d[14] | d[15] << 8; M.add(info, 'Codec', { 1: 'PCM', 3: 'IEEE float', 6: 'A-law', 7: 'µ-law', 65534: 'Extensible' }[fmt] || `Format ${fmt}`); M.add(info, 'Sample Rate', `${sr} Hz`); M.add(info, 'Channels', ch); M.add(info, 'Bit Depth', `${bits}-bit`); info._bps = le32(d, 8); }
          else if (c.type === 'data' && info._bps) M.add(info, 'Duration', M.fmtDur(d.length / info._bps));
          else if (c.type === 'LIST' && sig(d, 'INFO')) { let p = 4; while (p + 8 <= d.length) { const id = String.fromCharCode(d[p], d[p + 1], d[p + 2], d[p + 3]); const l = le32(d, p + 4); M.add(tags, INFO[id] || id, M.text(d.subarray(p + 8, p + 8 + l), 'latin1')); p += 8 + l + (l & 1); } }
          else if (c.type === 'bext') { M.add(extra, 'BWF Description', M.text(d.subarray(0, 256), 'latin1')); M.add(extra, 'BWF Originator', M.text(d.subarray(256, 288), 'latin1')); M.add(extra, 'BWF Originator Ref', M.text(d.subarray(288, 320), 'latin1')); M.add(extra, 'BWF Date', M.text(d.subarray(320, 330), 'latin1') + ' ' + M.text(d.subarray(330, 338), 'latin1')); }
          else if (c.type === 'iXML') M.add(extra, 'iXML', `${M.fmtBytes(d.length)} production metadata`);
          else if (c.type === 'id3 ' || c.type === 'ID3 ') { const v2 = readId3v2(d, 0); if (v2) for (const f of v2.frames) M.add(tags, f.name, f.value); }
          else if (c.type === '_PMX' || c.type === 'XMP ') M.add(extra, 'XMP', `${M.fmtBytes(d.length)}`);
        }
        delete info._bps;
      } else if (kind === 'ogg') {
        const pl = oggPayload(b); const asText = M.text(pl.subarray(0, Math.min(pl.length, 262144)), 'latin1');
        let at = asText.indexOf('\x03vorbis'), skip = 7, codec = 'Vorbis';
        if (at < 0) { at = asText.indexOf('OpusTags'); skip = 8; codec = 'Opus'; }
        if (at < 0) { at = asText.indexOf('\x81theora'); skip = 7; codec = 'Theora'; }
        M.add(info, 'Codec', at >= 0 ? codec : 'Unknown');
        if (at >= 0) M.add(extra, 'Encoder (vendor)', vorbisComments(pl.subarray(at + skip), tags));
        if (codec === 'Opus' && sig(pl, 'OpusHead')) { M.add(info, 'Channels', pl[9]); M.add(info, 'Sample Rate', `${le32(pl, 12)} Hz (input)`); }
        if (codec === 'Vorbis' && sig(pl, '\x01vorbis')) { M.add(info, 'Channels', pl[11]); M.add(info, 'Sample Rate', `${le32(pl, 12)} Hz`); M.add(info, 'Bitrate', `~${Math.round(le32(pl, 20) / 1000)} kbps`); }
      }
      return M.finish([tags, extra, info], { kind, coverCount });
    },

    strip(buf, o = {}) {
      const b = new Uint8Array(buf), kind = M.audioKind(b);
      if (kind === 'm4a' && M.video) return M.video.strip(buf, o);
      if (kind === 'mp3') {
        const v2 = readId3v2(b, 0); let start = v2 ? v2.end : 0, end = b.length;
        if (readId3v1(b)) end -= 128;
        const ape = apeTail(b, end); if (ape >= 0) end = ape;
        const parts = [];
        if (o.keepCover && v2 && v2.frames.some((f) => f.isPic && f.id === 'APIC')) { // rebuild a minimal ID3v2.3 tag holding only the cover
          const pics = v2.frames.filter((f) => f.id === 'APIC').map((f) => { const r = f.raw.slice(); const sz = r.length - 10; r[4] = sz >>> 24; r[5] = (sz >>> 16) & 255; r[6] = (sz >>> 8) & 255; r[7] = sz & 255; r[8] = 0; r[9] = 0; return r; });
          const body = new Uint8Array(M.concat(pics)), n = body.length, h = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, (n >>> 21) & 0x7f, (n >>> 14) & 0x7f, (n >>> 7) & 0x7f, n & 0x7f]);
          parts.push(h, body);
        }
        parts.push(b.subarray(start, end));
        return M.concat(parts);
      }
      if (kind === 'flac') {
        const blocks = [...flacBlocks(b)]; const audioStart = blocks.length ? blocks[blocks.length - 1].start + blocks[blocks.length - 1].len : 4;
        const keep = blocks.filter((k) => k.type !== 4 && (k.type !== 6 || o.keepCover)).map((k) => b.slice(k.start, k.start + k.len));
        keep.forEach((k, i) => { k[0] = (k[0] & 0x7f) | (i === keep.length - 1 ? 0x80 : 0); });
        return M.concat([b.subarray(0, 4), ...keep, b.subarray(audioStart)]);
      }
      if (kind === 'wav') {
        const DROP = new Set(['LIST', 'bext', 'iXML', 'id3 ', 'ID3 ', '_PMX', 'XMP ', 'DISP', 'CSET']);
        const parts = [];
        for (const c of riffChunks(b)) if (!(DROP.has(c.type) && (c.type !== 'LIST' || sig(c.data, 'INFO')))) parts.push(b.subarray(c.start, c.start + c.len));
        const body = M.concat(parts), head = new Uint8Array(12); head.set([0x52, 0x49, 0x46, 0x46]); new DataView(head.buffer).setUint32(4, 4 + body.byteLength, true); head.set([0x57, 0x41, 0x56, 0x45], 8);
        return M.concat([head, body]);
      }
      throw new Error(kind === 'ogg' ? 'OGG/Opus tags are read-only here — re-encoding is needed to drop them. Convert to MP3 with the Audio Converter, then clean.' : 'Unsupported audio format. Use MP3, FLAC, WAV or M4A.');
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);

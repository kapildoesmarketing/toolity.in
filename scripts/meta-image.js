/* Designed by Kapil Pidhwani: Image metadata parser + lossless stripper (JPEG · PNG · WebP; GIF/BMP/AVIF/HEIC info-only).
 * EXIF is read by numeric tag from a ~80-entry table; unknown tags appear as "Tag 0x9c9b". Fragmented/Multi-picture
 * (MPF) extras and trailing data after EOI (Samsung motion photos) are copied through untouched — ceiling noted.
 */
(function (root) {
  'use strict';
  const M = typeof module !== 'undefined' && module.exports ? require('./meta-common.js') : root.ToolityMeta;

  /* ── EXIF tag table ──────────────────────────────────────── */
  const TAGS = {
    0x010e: 'Image Description', 0x010f: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x011a: 'X Resolution', 0x011b: 'Y Resolution', 0x0128: 'Resolution Unit', 0x0131: 'Software', 0x0132: 'Date/Time', 0x013b: 'Artist', 0x013e: 'White Point', 0x8298: 'Copyright', 0x0100: 'Image Width', 0x0101: 'Image Height', 0x0102: 'Bits Per Sample', 0x0115: 'Samples Per Pixel', 0x013c: 'Host Computer', 0x9c9b: 'XP Title', 0x9c9c: 'XP Comment', 0x9c9d: 'XP Author', 0x9c9e: 'XP Keywords', 0x9c9f: 'XP Subject', 0xc4a5: 'Print IM', 0xa430: 'Camera Owner', 0xa431: 'Body Serial Number', 0xa432: 'Lens Specification', 0xa433: 'Lens Make', 0xa434: 'Lens Model', 0xa435: 'Lens Serial Number',
    0x829a: 'Exposure Time', 0x829d: 'F Number', 0x8822: 'Exposure Program', 0x8827: 'ISO', 0x9000: 'Exif Version', 0x9003: 'Date/Time Original', 0x9004: 'Date/Time Digitized', 0x9010: 'Offset Time', 0x9011: 'Offset Time Original', 0x9201: 'Shutter Speed', 0x9202: 'Aperture', 0x9203: 'Brightness', 0x9204: 'Exposure Bias', 0x9205: 'Max Aperture', 0x9206: 'Subject Distance', 0x9207: 'Metering Mode', 0x9208: 'Light Source', 0x9209: 'Flash', 0x920a: 'Focal Length', 0x927c: 'Maker Note', 0x9286: 'User Comment', 0x9290: 'Subsec Time', 0x9291: 'Subsec Time Original', 0xa001: 'Color Space', 0xa002: 'Pixel X Dimension', 0xa003: 'Pixel Y Dimension', 0xa402: 'Exposure Mode', 0xa403: 'White Balance', 0xa404: 'Digital Zoom Ratio', 0xa405: 'Focal Length (35mm)', 0xa406: 'Scene Capture Type', 0xa408: 'Contrast', 0xa409: 'Saturation', 0xa40a: 'Sharpness', 0xa420: 'Image Unique ID', 0xa500: 'Gamma',
  };
  const GPS = { 0: 'GPS Version', 1: 'Latitude Ref', 2: 'Latitude', 3: 'Longitude Ref', 4: 'Longitude', 5: 'Altitude Ref', 6: 'Altitude', 7: 'GPS Time', 8: 'Satellites', 9: 'GPS Status', 12: 'Speed', 16: 'Image Direction Ref', 17: 'Image Direction', 18: 'Map Datum', 23: 'Dest Bearing Ref', 24: 'Dest Bearing', 27: 'Processing Method', 29: 'GPS Date', 31: 'Horizontal Error' };
  const ENUM = {
    0x0112: { 1: 'Normal', 2: 'Mirror horizontal', 3: 'Rotate 180°', 4: 'Mirror vertical', 5: 'Mirror horizontal + rotate 270°', 6: 'Rotate 90° CW', 7: 'Mirror horizontal + rotate 90°', 8: 'Rotate 270° CW' },
    0x8822: { 0: 'Not defined', 1: 'Manual', 2: 'Program', 3: 'Aperture priority', 4: 'Shutter priority', 5: 'Creative', 6: 'Action', 7: 'Portrait', 8: 'Landscape' },
    0x9207: { 0: 'Unknown', 1: 'Average', 2: 'Center-weighted', 3: 'Spot', 4: 'Multi-spot', 5: 'Pattern', 6: 'Partial' },
    0xa402: { 0: 'Auto', 1: 'Manual', 2: 'Auto bracket' }, 0xa403: { 0: 'Auto', 1: 'Manual' }, 0xa001: { 1: 'sRGB', 65535: 'Uncalibrated' }, 0x0128: { 2: 'inch', 3: 'cm' },
    0xa406: { 0: 'Standard', 1: 'Landscape', 2: 'Portrait', 3: 'Night' },
  };
  const SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

  function readValues(dv, type, count, off, le) {
    const out = [];
    for (let i = 0; i < Math.min(count, 64); i++) {
      const p = off + i * SIZES[type];
      if (p + SIZES[type] > dv.byteLength) break;
      switch (type) {
        case 1: case 7: out.push(dv.getUint8(p)); break;
        case 3: out.push(dv.getUint16(p, le)); break;
        case 4: out.push(dv.getUint32(p, le)); break;
        case 5: out.push([dv.getUint32(p, le), dv.getUint32(p + 4, le)]); break;
        case 6: out.push(dv.getInt8(p)); break;
        case 8: out.push(dv.getInt16(p, le)); break;
        case 9: out.push(dv.getInt32(p, le)); break;
        case 10: out.push([dv.getInt32(p, le), dv.getInt32(p + 4, le)]); break;
        case 11: out.push(dv.getFloat32(p, le)); break;
        case 12: out.push(dv.getFloat64(p, le)); break;
        default: out.push(dv.getUint8(p));
      }
    }
    return out;
  }
  const rat = (r) => (Array.isArray(r) ? (r[1] ? r[0] / r[1] : 0) : r);
  const dms = (v, ref) => { const d = rat(v[0]) + rat(v[1] || 0) / 60 + rat(v[2] || 0) / 3600; return (/[SW]/.test(ref) ? -d : d); };

  function fmt(tag, type, vals, dv, off, count, le) {
    if (type === 2) return M.text(new Uint8Array(dv.buffer, dv.byteOffset + off, Math.min(count, 512)).slice(), 'latin1');
    if (tag === 0x9286 || tag === 0x927c) { // UserComment / MakerNote
      if (tag === 0x927c) return `${count} bytes (manufacturer blob)`;
      const b = new Uint8Array(dv.buffer, dv.byteOffset + off, Math.min(count, 512));
      const head = String.fromCharCode(...b.slice(0, 8)).replace(/\0/g, '');
      return head === 'UNICODE' ? M.text(b.slice(8), le ? 'utf-16le' : 'utf-16be') : M.text(b.slice(head === 'ASCII' ? 8 : 0), 'latin1');
    }
    if (tag >= 0x9c9b && tag <= 0x9c9f) return M.text(new Uint8Array(dv.buffer, dv.byteOffset + off, Math.min(count, 512)).slice(), 'utf-16le');
    if (ENUM[tag]) return ENUM[tag][vals[0]] ?? String(vals[0]);
    if (tag === 0x829a) { const v = rat(vals[0]); return v >= 1 ? `${+v.toFixed(2)} s` : `1/${Math.round(1 / v)} s`; }
    if (tag === 0x829d || tag === 0x9202 || tag === 0x9205) return `f/${+rat(vals[0]).toFixed(1)}`;
    if (tag === 0x920a) return `${+rat(vals[0]).toFixed(1)} mm`;
    if (tag === 0xa405) return `${vals[0]} mm`;
    if (tag === 0x9204) return `${rat(vals[0]) >= 0 ? '+' : ''}${+rat(vals[0]).toFixed(2)} EV`;
    if (tag === 0x9209) return (vals[0] & 1 ? 'Fired' : 'Did not fire') + (vals[0] & 0x18 ? ', auto' : '');
    if (tag === 0x9000 || tag === 0xa000) return String.fromCharCode(...vals).replace(/^0/, '').replace(/(\d)(\d{2})$/, '$1.$2');
    if (tag === 0xa432) return vals.map((v) => +rat(v).toFixed(1)).join(' / ');
    if (type === 5 || type === 10) return vals.map((v) => +rat(v).toFixed(4)).join(', ');
    return vals.join(', ');
  }

  // Parses a TIFF/EXIF block (as found in JPEG APP1 after "Exif\0\0", PNG eXIf, WebP EXIF). Returns {sections, orientation}.
  M.parseExif = function (bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const camera = M.section('Camera / EXIF'), gps = M.section('GPS Location'), image = M.section('Image Info');
    let orientation = 1;
    if (dv.byteLength < 8) return { sections: [], orientation };
    const bom = dv.getUint16(0);
    const le = bom === 0x4949; if (!le && bom !== 0x4d4d) return { sections: [], orientation };
    const walk = (ifdOff, dict, sec, depth) => {
      if (depth > 3 || ifdOff + 2 > dv.byteLength) return;
      const n = dv.getUint16(ifdOff, le);
      for (let i = 0; i < Math.min(n, 200); i++) {
        const e = ifdOff + 2 + i * 12; if (e + 12 > dv.byteLength) break;
        const tag = dv.getUint16(e, le), type = dv.getUint16(e + 2, le), count = dv.getUint32(e + 4, le);
        const size = (SIZES[type] || 1) * count;
        const off = size > 4 ? dv.getUint32(e + 8, le) : e + 8;
        if (off + size > dv.byteLength) continue;
        if (tag === 0x8769) { walk(dv.getUint32(e + 8, le), TAGS, camera, depth + 1); continue; }
        if (tag === 0x8825) { walk(dv.getUint32(e + 8, le), GPS, gps, depth + 1); continue; }
        if (tag === 0xa005) continue; // Interop IFD — nothing user-facing
        const vals = readValues(dv, type, count, off, le);
        if (dict === GPS) {
          if (tag === 2 || tag === 4) { sec._raw = sec._raw || {}; sec._raw[tag] = vals; continue; }
          if (tag === 1 || tag === 3) { sec._raw = sec._raw || {}; sec._raw[tag] = fmt(tag, type, vals, dv, off, count, le); continue; }
          if (tag === 7) { M.add(sec, 'GPS Time', vals.map((v) => String(Math.round(rat(v))).padStart(2, '0')).join(':') + ' UTC'); continue; }
          if (tag === 6) { M.add(sec, 'Altitude', `${+rat(vals[0]).toFixed(1)} m`); continue; }
          if (tag === 0) continue;
        }
        if (tag === 0x0112) orientation = vals[0] || 1;
        const name = dict[tag] || `Tag 0x${tag.toString(16).padStart(4, '0')}`;
        const target = dict === TAGS && (tag === 0x0100 || tag === 0x0101 || tag === 0x0102 || tag === 0xa002 || tag === 0xa003 || tag === 0x011a || tag === 0x011b || tag === 0x0128 || tag === 0xa001) ? image : sec;
        M.add(target, name, fmt(tag, type, vals, dv, off, count, le));
      }
    };
    walk(dv.getUint32(4, le), TAGS, camera, 0);
    if (gps._raw && gps._raw[2] && gps._raw[4]) {
      const lat = dms(gps._raw[2], gps._raw[1] || 'N'), lon = dms(gps._raw[4], gps._raw[3] || 'E');
      gps.rows.unshift(['Latitude', lat.toFixed(6)], ['Longitude', lon.toFixed(6)], ['Map', `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=15/${lat.toFixed(5)}/${lon.toFixed(5)}`]);
    }
    delete gps._raw;
    return { sections: [camera, gps, image], orientation };
  };

  /* ── Container walkers ───────────────────────────────────── */
  const sig = (b, s, o = 0) => s.split('').every((c, i) => b[o + i] === c.charCodeAt(0));
  M.imageKind = (b) => (b[0] === 0xff && b[1] === 0xd8 ? 'jpeg' : sig(b, '\x89PNG') ? 'png' : sig(b, 'RIFF') && sig(b, 'WEBP', 8) ? 'webp' : sig(b, 'GIF8') ? 'gif' : sig(b, 'BM') ? 'bmp' : sig(b, 'ftyp', 4) ? 'heif' : 'other');

  function* jpegSegments(b) { // yields {marker, start, len(total incl. marker), data:Uint8Array} until SOS
    let p = 2;
    while (p + 4 <= b.length && b[p] === 0xff) {
      const marker = b[p + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { p += 2; continue; }
      const len = (b[p + 2] << 8) | b[p + 3];
      yield { marker, start: p, len: len + 2, data: b.subarray(p + 4, p + 2 + len) };
      if (marker === 0xda) return;
      p += len + 2;
    }
  }
  function* pngChunks(b) { let p = 8; while (p + 8 <= b.length) { const len = (b[p] << 24 | b[p + 1] << 16 | b[p + 2] << 8 | b[p + 3]) >>> 0; const type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]); yield { type, start: p, len: len + 12, data: b.subarray(p + 8, p + 8 + len) }; if (type === 'IEND') return; p += len + 12; } }
  function* riffChunks(b) { let p = 12; while (p + 8 <= b.length) { const type = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]); const len = (b[p + 4] | b[p + 5] << 8 | b[p + 6] << 16 | b[p + 7] << 24) >>> 0; yield { type, start: p, len: 8 + len + (len & 1), data: b.subarray(p + 8, p + 8 + len) }; p += 8 + len + (len & 1); } }

  /* ── parse ───────────────────────────────────────────────── */
  M.image = {
    parse(buf, file) {
      const b = new Uint8Array(buf), kind = M.imageKind(b);
      const info = M.section('File', false), xmpSec = [], other = M.section('Other Metadata');
      let exif = { sections: [], orientation: 1 }, iptc = 0, icc = false, w = 0, h = 0;
      M.add(info, 'Format', { jpeg: 'JPEG', png: 'PNG', webp: 'WebP', gif: 'GIF', bmp: 'BMP', heif: 'HEIF / HEIC / AVIF' }[kind] || (file && file.type) || 'Unknown');
      M.add(info, 'Size', M.fmtBytes(buf.byteLength));
      if (kind === 'jpeg') {
        for (const s of jpegSegments(b)) {
          if (s.marker === 0xe1 && sig(s.data, 'Exif\0\0')) exif = M.parseExif(s.data.subarray(6));
          else if (s.marker === 0xe1 && sig(s.data, 'http://ns.adobe.com/xap/1.0/')) xmpSec.push(M.parseXmp(M.text(s.data.subarray(29))));
          else if (s.marker === 0xed && sig(s.data, 'Photoshop 3.0')) iptc++;
          else if (s.marker === 0xe2 && sig(s.data, 'ICC_PROFILE')) icc = true;
          else if (s.marker === 0xfe) M.add(other, 'JPEG Comment', M.text(s.data, 'latin1'));
          else if (s.marker >= 0xc0 && s.marker <= 0xcf && s.marker !== 0xc4 && s.marker !== 0xc8 && s.marker !== 0xcc) { h = (s.data[1] << 8) | s.data[2]; w = (s.data[3] << 8) | s.data[4]; M.add(info, 'Progressive', s.marker === 0xc2 ? 'Yes' : 'No'); }
        }
      } else if (kind === 'png') {
        for (const c of pngChunks(b)) {
          const d = c.data;
          if (c.type === 'IHDR') { w = (d[0] << 24 | d[1] << 16 | d[2] << 8 | d[3]) >>> 0; h = (d[4] << 24 | d[5] << 16 | d[6] << 8 | d[7]) >>> 0; M.add(info, 'Bit Depth', d[8]); M.add(info, 'Color Type', { 0: 'Grayscale', 2: 'RGB', 3: 'Indexed', 4: 'Grayscale + alpha', 6: 'RGBA' }[d[9]]); }
          else if (c.type === 'tEXt') { const z = d.indexOf(0); M.add(other, M.text(d.subarray(0, z), 'latin1'), M.text(d.subarray(z + 1), 'latin1')); }
          else if (c.type === 'iTXt') { const z = d.indexOf(0); const key = M.text(d.subarray(0, z), 'latin1'); const comp = d[z + 1]; let p = z + 3; p = d.indexOf(0, p) + 1; p = d.indexOf(0, p) + 1; const txt = comp ? '(compressed text)' : M.text(d.subarray(p)); if (key === 'XML:com.adobe.xmp') xmpSec.push(M.parseXmp(txt)); else M.add(other, key, txt); }
          else if (c.type === 'zTXt') { const z = d.indexOf(0); M.add(other, M.text(d.subarray(0, z), 'latin1'), `(compressed, ${d.length - z - 2} bytes)`); }
          else if (c.type === 'eXIf') exif = M.parseExif(d);
          else if (c.type === 'tIME') M.add(other, 'Last Modified', `${(d[0] << 8 | d[1])}-${String(d[2]).padStart(2, '0')}-${String(d[3]).padStart(2, '0')} ${String(d[4]).padStart(2, '0')}:${String(d[5]).padStart(2, '0')}:${String(d[6]).padStart(2, '0')} UTC`);
          else if (c.type === 'pHYs' && d[8] === 1) M.add(info, 'DPI', Math.round(((d[0] << 24 | d[1] << 16 | d[2] << 8 | d[3]) >>> 0) * 0.0254));
          else if (c.type === 'iCCP') icc = true;
        }
      } else if (kind === 'webp') {
        for (const c of riffChunks(b)) {
          const d = c.data;
          if (c.type === 'VP8X') { w = 1 + (d[4] | d[5] << 8 | d[6] << 16); h = 1 + (d[7] | d[8] << 8 | d[9] << 16); if (d[0] & 0x20) icc = true; if (d[0] & 0x02) M.add(info, 'Animated', 'Yes'); }
          else if (c.type === 'VP8 ' && !w) { w = (d[6] | d[7] << 8) & 0x3fff; h = (d[8] | d[9] << 8) & 0x3fff; }
          else if (c.type === 'VP8L' && !w) { const bits = d[1] | d[2] << 8 | d[3] << 16 | d[4] << 24; w = (bits & 0x3fff) + 1; h = ((bits >> 14) & 0x3fff) + 1; }
          else if (c.type === 'EXIF') exif = M.parseExif(sig(d, 'Exif\0\0') ? d.subarray(6) : d);
          else if (c.type === 'XMP ') xmpSec.push(M.parseXmp(M.text(d)));
        }
      } else if (kind === 'gif') { w = b[6] | b[7] << 8; h = b[8] | b[9] << 8; M.add(info, 'Version', String.fromCharCode(...b.subarray(3, 6))); }
      else if (kind === 'bmp') { const dv = new DataView(buf); w = dv.getInt32(18, true); h = Math.abs(dv.getInt32(22, true)); }
      if (w && h) info.rows.splice(1, 0, ['Dimensions', `${w} × ${h} px`]);
      if (icc) M.add(info, 'Color Profile', 'Embedded ICC (kept by the remover)');
      if (iptc) M.add(other, 'IPTC / Photoshop', `${iptc} block${iptc > 1 ? 's' : ''} (captions, keywords, credits)`);
      const r = M.finish([...exif.sections, ...xmpSec, other, info], { kind, orientation: exif.orientation, width: w, height: h });
      if (kind === 'heif') r.note = 'HEIC/HEIF/AVIF containers are shown as basic info only.';
      return r;
    },

    // Lossless strip: returns a new ArrayBuffer, or throws if the format can't be cleaned.
    strip(buf, o = {}) {
      const b = new Uint8Array(buf), kind = M.imageKind(b), keepIcc = o.keepIcc !== false;
      if (kind === 'jpeg') {
        const parts = [b.subarray(0, 2)]; let last = 2;
        for (const s of jpegSegments(b)) {
          const drop = s.marker === 0xe1 || s.marker === 0xed || s.marker === 0xfe || (s.marker === 0xe2 && !keepIcc && sig(s.data, 'ICC_PROFILE')) || (s.marker >= 0xe3 && s.marker <= 0xef && s.marker !== 0xee);
          if (!drop) parts.push(b.subarray(s.start, s.start + s.len));
          last = s.start + s.len;
          if (s.marker === 0xda) break;
        }
        parts.push(b.subarray(last)); // entropy-coded data to EOI (and any trailer, copied as-is)
        return M.concat(parts);
      }
      if (kind === 'png') {
        const DROP = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME', ...(keepIcc ? [] : ['iCCP'])]);
        const parts = [b.subarray(0, 8)];
        for (const c of pngChunks(b)) if (!DROP.has(c.type)) parts.push(b.subarray(c.start, c.start + c.len));
        return M.concat(parts);
      }
      if (kind === 'webp') {
        const parts = []; let vp8x = null;
        for (const c of riffChunks(b)) {
          if (c.type === 'EXIF' || c.type === 'XMP ' || (c.type === 'ICCP' && !keepIcc)) continue;
          const chunk = b.slice(c.start, c.start + c.len);
          if (c.type === 'VP8X') { vp8x = chunk; chunk[8] &= ~0x0c; if (!keepIcc) chunk[8] &= ~0x20; }
          parts.push(chunk);
        }
        const body = M.concat(parts), total = 4 + body.byteLength;
        const head = new Uint8Array(12); head.set([0x52, 0x49, 0x46, 0x46]); new DataView(head.buffer).setUint32(4, total, true); head.set([0x57, 0x45, 0x42, 0x50], 8);
        void vp8x;
        return M.concat([head, body]);
      }
      throw new Error({ gif: 'GIF files carry no EXIF/XMP — nothing to remove.', bmp: 'BMP files carry no metadata — nothing to remove.', heif: 'HEIC/HEIF/AVIF cannot be rewritten losslessly in the browser yet. Convert to JPEG first with the Image Converter.' }[kind] || 'Unsupported image format. Use JPEG, PNG or WebP.');
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);

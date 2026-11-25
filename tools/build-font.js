// @ts-check
// Builds fonts/kontorpiksel.ttf from the glyph data in js/pixelfont.js.
// Run again if you change or add characters:  node tools/build-font.js
//
// The font is an ordinary TrueType font where each pixel is a square.
// It is used in the menus (HTML), while the game draws text directly from the same glyphs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glyph, allChars, OVER, UNDER } from '../js/pixelfont.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = 125; // font units per pixel
const EM = 1000; // 8 pixels per em → sharp at 8, 16, 24, 32 … px
const ASC = OVER * P;
const DESC = UNDER * P;

/** Glyphs: 0 = .notdef, 1 = space, then all characters. */
const chars = [' ', ...allChars()];
const glyphs = [{ code: -1, b: 5, rect: notdefRect() }];
for (const t of chars) {
  const g = glyph(t);
  glyphs.push({ code: /** @type {number} */ (t.codePointAt(0)), b: g.b, rect: rects(g) });
}

function notdefRect() {
  // hollow square
  return [[0, 0, 5, 1], [0, 6, 5, 1], [0, 1, 1, 5], [4, 1, 1, 5]].map(([x, y, w, h]) => [x, y + 2, w, h]);
}

/** Merges pixels in each row into rectangles, and identical rectangles stacked on top of each other. [x, row, w, h] */
function rects(g) {
  /** @type {number[][]} */
  const out = [];
  g.rows.forEach((row, ry) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== '#') { x++; continue; }
      const start = x;
      while (x < row.length && row[x] === '#') x++;
      const r = g.top + ry;
      const over = out.find((q) => q[0] === start && q[2] === x - start && q[1] + q[3] === r);
      if (over) over[3]++;
      else out.push([start, r, x - start, 1]);
    }
  });
  return out;
}

// ---------- Binary writing ----------
class Buf {
  constructor() { this.b = []; }
  u8(v) { this.b.push(v & 255); }
  u16(v) { this.u8(v >> 8); this.u8(v); }
  i16(v) { this.u16(v < 0 ? v + 65536 : v); }
  u32(v) { this.u16((v >>> 16) & 0xffff); this.u16(v & 0xffff); }
  tag(s) { for (const c of s) this.u8(c.charCodeAt(0)); }
  pad4() { while (this.b.length % 4) this.u8(0); }
  get len() { return this.b.length; }
}

// glyf + loca
const glyph_ = new Buf();
const loca = [];
let maxPoints = 0, maxOutlines = 0;
let xMin = 0, yMin = 0, xMax = 0, yMax = 0;
for (const g of glyphs) {
  loca.push(glyph_.len);
  if (g.rect.length === 0) continue;
  // TrueType has y pointing up; row 0 is at the top. The baseline is below row OVER-1.
  const kont = g.rect.map(([x, r, w, h]) => {
    const x0 = x * P, x1 = (x + w) * P;
    const y1 = (OVER - r) * P, y0 = (OVER - r - h) * P;
    return [[x0, y0], [x0, y1], [x1, y1], [x1, y0]]; // clockwise
  });
  const pts = kont.flat();
  const gx0 = Math.min(...pts.map((p) => p[0])), gx1 = Math.max(...pts.map((p) => p[0]));
  const gy0 = Math.min(...pts.map((p) => p[1])), gy1 = Math.max(...pts.map((p) => p[1]));
  xMin = Math.min(xMin, gx0); yMin = Math.min(yMin, gy0); xMax = Math.max(xMax, gx1); yMax = Math.max(yMax, gy1);
  maxPoints = Math.max(maxPoints, pts.length);
  maxOutlines = Math.max(maxOutlines, kont.length);
  glyph_.i16(kont.length);
  glyph_.i16(gx0); glyph_.i16(gy0); glyph_.i16(gx1); glyph_.i16(gy1);
  let n = -1;
  for (const k of kont) { n += k.length; glyph_.u16(n); }
  glyph_.u16(0); // no instructions
  for (let i = 0; i < pts.length; i++) glyph_.u8(1); // on the curve, 16-bit coordinates
  let px = 0;
  for (const p of pts) { glyph_.i16(p[0] - px); px = p[0]; }
  let py = 0;
  for (const p of pts) { glyph_.i16(p[1] - py); py = p[1]; }
  glyph_.pad4();
}
loca.push(glyph_.len);
const locaB = new Buf();
for (const o of loca) locaB.u32(o);

// hmtx
const hmtx = new Buf();
let maxWidth = 0;
for (const g of glyphs) {
  const adv = (g.b + 1) * P;
  maxWidth = Math.max(maxWidth, adv);
  hmtx.u16(adv);
  hmtx.i16(g.rect.length ? Math.min(...g.rect.map((r) => r[0])) * P : 0);
}

// cmap (format 4, one segment per character)
const codes = glyphs.map((g, i) => [g.code, i]).filter(([k]) => k >= 0).sort((a, b) => a[0] - b[0]);
const seg = [...codes.map(([k, give]) => ({ s: k, e: k, d: (give - k + 65536) % 65536 })), { s: 0xffff, e: 0xffff, d: 1 }];
const segX2 = seg.length * 2;
const sr = 2 * 2 ** Math.floor(Math.log2(seg.length));
const sub = new Buf();
sub.u16(4); sub.u16(16 + seg.length * 8); sub.u16(0);
sub.u16(segX2); sub.u16(sr); sub.u16(Math.log2(sr / 2)); sub.u16(segX2 - sr);
for (const s of seg) sub.u16(s.e);
sub.u16(0);
for (const s of seg) sub.u16(s.s);
for (const s of seg) sub.u16(s.d);
for (const s of seg) sub.u16(0);
const cmap = new Buf();
cmap.u16(0); cmap.u16(1); cmap.u16(3); cmap.u16(1); cmap.u32(12);
cmap.b.push(...sub.b);

// head
const head = new Buf();
head.u32(0x00010000); head.u32(0x00010000); head.u32(0); head.u32(0x5f0f3cf5);
head.u16(0x000b); head.u16(EM);
head.u32(0); head.u32(0xe3000000); head.u32(0); head.u32(0xe3000000); // dates
head.i16(xMin); head.i16(yMin); head.i16(xMax); head.i16(yMax);
head.u16(0); head.u16(8); head.i16(2); head.i16(1); head.i16(0);

// hhea
const hhea = new Buf();
hhea.u32(0x00010000); hhea.i16(ASC); hhea.i16(-DESC); hhea.i16(0);
hhea.u16(maxWidth); hhea.i16(0); hhea.i16(0); hhea.i16(xMax);
hhea.i16(1); hhea.i16(0); hhea.i16(0);
for (let i = 0; i < 4; i++) hhea.i16(0);
hhea.i16(0); hhea.u16(glyphs.length);

// maxp
const maxp = new Buf();
maxp.u32(0x00010000); maxp.u16(glyphs.length); maxp.u16(maxPoints); maxp.u16(maxOutlines);
maxp.u16(0); maxp.u16(0); maxp.u16(2);
for (let i = 0; i < 7; i++) maxp.u16(0);
maxp.u16(0); maxp.u16(0);

// OS/2 (version 4)
const os2 = new Buf();
os2.u16(4); os2.i16(6 * P); os2.u16(400); os2.u16(5); os2.u16(0);
for (const v of [650, 700, 0, 140, 650, 700, 0, 480, 125, 375]) os2.i16(v);
os2.i16(0);
for (let i = 0; i < 10; i++) os2.u8(0);
os2.u32(3); os2.u32(0); os2.u32(0); os2.u32(0); // Basic Latin + Latin-1
os2.tag('HDSF');
os2.u16(0x0040); os2.u16(32); os2.u16(Math.min(0xffff, codes[codes.length - 1][0]));
os2.i16(ASC); os2.i16(-DESC); os2.i16(0); os2.u16(ASC); os2.u16(DESC);
os2.u32(1); os2.u32(0);
os2.i16(5 * P); os2.i16(7 * P); os2.u16(0); os2.u16(32); os2.u16(1);

// name
const name = {
  0: 'Laget for Help Desk Survivors. Fri bruk (CC0 1.0).',
  1: 'KontorPiksel',
  2: 'Regular',
  3: 'KontorPiksel-Regular-1.0',
  4: 'KontorPiksel Regular',
  5: 'Version 1.0',
  6: 'KontorPiksel-Regular',
  13: 'CC0 1.0 Universal (Public Domain Dedication). Fri til all bruk.',
};
const nameB = new Buf();
const records = Object.entries(name);
nameB.u16(0); nameB.u16(records.length); nameB.u16(6 + records.length * 12);
const strings = new Buf();
for (const [id, text] of records) {
  const utf16 = [];
  for (const c of text) { const k = /** @type {number} */ (c.codePointAt(0)); utf16.push(k >> 8, k & 255); }
  nameB.u16(3); nameB.u16(1); nameB.u16(0x409); nameB.u16(Number(id)); nameB.u16(utf16.length); nameB.u16(strings.len);
  strings.b.push(...utf16);
}
nameB.b.push(...strings.b);

// post (version 3)
const post = new Buf();
post.u32(0x00030000); post.u32(0); post.i16(-P); post.i16(P); post.u32(0); post.u32(0); post.u32(0); post.u32(0); post.u32(0);

// Assemble the file
// Keys are the TrueType table tags (fixed by the file format), e.g. 'glyf' must stay 'glyf'.
const tables = { 'OS/2': os2, cmap, glyf: glyph_, head, hhea, hmtx, loca: locaB, maxp, name: nameB, post };
const tags = Object.keys(tables).sort();
const file = new Buf();
const n = tags.length;
const sr2 = 16 * 2 ** Math.floor(Math.log2(n));
file.u32(0x00010000); file.u16(n); file.u16(sr2); file.u16(Math.log2(sr2 / 16)); file.u16(n * 16 - sr2);
const checksum = (bytes) => {
  let s = 0;
  for (let i = 0; i < bytes.length; i += 4) s = (s + (((bytes[i] << 24) | ((bytes[i + 1] ?? 0) << 16) | ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0)) >>> 0)) >>> 0;
  return s;
};
let offset = 12 + n * 16;
const placement = [];
for (const t of tags) {
  const b = tables[t];
  placement.push({ t, offset, len: b.len, sum: checksum(b.b) });
  offset += Math.ceil(b.len / 4) * 4;
}
for (const p of placement) { file.tag(p.t); file.u32(p.sum); file.u32(p.offset); file.u32(p.len); }
let headOffset = 0;
for (const t of tags) {
  if (t === 'head') headOffset = file.len;
  file.b.push(...tables[t].b);
  file.pad4();
}
const adjustment = (0xb1b0afba - checksum(file.b)) >>> 0;
file.b[headOffset + 8] = adjustment >>> 24; file.b[headOffset + 9] = (adjustment >>> 16) & 255;
file.b[headOffset + 10] = (adjustment >>> 8) & 255; file.b[headOffset + 11] = adjustment & 255;

fs.mkdirSync(path.join(ROOT, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'fonts', 'kontorpiksel.ttf'), Buffer.from(file.b));
console.log(`fonts/kontorpiksel.ttf: ${glyphs.length} glyfer, ${file.len} byte`);

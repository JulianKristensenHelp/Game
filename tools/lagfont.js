// @ts-check
// Lager fonts/kontorpiksel.ttf fra glyfdataene i js/pikselfont.js.
// Kjør på nytt hvis du endrer eller legger til tegn:  node tools/lagfont.js
//
// Fonten er en vanlig TrueType-font der hver piksel er en firkant.
// Den brukes i menyene (HTML), mens spillet tegner tekst direkte fra de samme glyfene.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glyf, alleTegn, OVER, UNDER } from '../js/pikselfont.js';

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = 125; // fontenheter per piksel
const EM = 1000; // 8 piksler per em → skarp ved 8, 16, 24, 32 … px
const ASC = OVER * P;
const DESC = UNDER * P;

/** Glyfer: 0 = .notdef, 1 = mellomrom, så alle tegn. */
const tegnListe = [' ', ...alleTegn()];
const glyfer = [{ kode: -1, b: 5, rekt: notdefRekt() }];
for (const t of tegnListe) {
  const g = glyf(t);
  glyfer.push({ kode: /** @type {number} */ (t.codePointAt(0)), b: g.b, rekt: rektangler(g) });
}

function notdefRekt() {
  // hul firkant
  return [[0, 0, 5, 1], [0, 6, 5, 1], [0, 1, 1, 5], [4, 1, 1, 5]].map(([x, y, w, h]) => [x, y + 2, w, h]);
}

/** Slår sammen piksler i hver rad til rektangler, og like rektangler over hverandre. [x, rad, b, h] */
function rektangler(g) {
  /** @type {number[][]} */
  const ut = [];
  g.rader.forEach((rad, ry) => {
    let x = 0;
    while (x < rad.length) {
      if (rad[x] !== '#') { x++; continue; }
      const start = x;
      while (x < rad.length && rad[x] === '#') x++;
      const r = g.topp + ry;
      const over = ut.find((q) => q[0] === start && q[2] === x - start && q[1] + q[3] === r);
      if (over) over[3]++;
      else ut.push([start, r, x - start, 1]);
    }
  });
  return ut;
}

// ---------- Binærskriving ----------
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
const glyf_ = new Buf();
const loca = [];
let maksPunkter = 0, maksKonturer = 0;
let xMin = 0, yMin = 0, xMax = 0, yMax = 0;
for (const g of glyfer) {
  loca.push(glyf_.len);
  if (g.rekt.length === 0) continue;
  // TrueType har y oppover; rad 0 er øverst. Grunnlinjen ligger under rad OVER-1.
  const kont = g.rekt.map(([x, r, w, h]) => {
    const x0 = x * P, x1 = (x + w) * P;
    const y1 = (OVER - r) * P, y0 = (OVER - r - h) * P;
    return [[x0, y0], [x0, y1], [x1, y1], [x1, y0]]; // med klokka
  });
  const pts = kont.flat();
  const gx0 = Math.min(...pts.map((p) => p[0])), gx1 = Math.max(...pts.map((p) => p[0]));
  const gy0 = Math.min(...pts.map((p) => p[1])), gy1 = Math.max(...pts.map((p) => p[1]));
  xMin = Math.min(xMin, gx0); yMin = Math.min(yMin, gy0); xMax = Math.max(xMax, gx1); yMax = Math.max(yMax, gy1);
  maksPunkter = Math.max(maksPunkter, pts.length);
  maksKonturer = Math.max(maksKonturer, kont.length);
  glyf_.i16(kont.length);
  glyf_.i16(gx0); glyf_.i16(gy0); glyf_.i16(gx1); glyf_.i16(gy1);
  let n = -1;
  for (const k of kont) { n += k.length; glyf_.u16(n); }
  glyf_.u16(0); // ingen instruksjoner
  for (let i = 0; i < pts.length; i++) glyf_.u8(1); // på kurven, 16-bits koordinater
  let px = 0;
  for (const p of pts) { glyf_.i16(p[0] - px); px = p[0]; }
  let py = 0;
  for (const p of pts) { glyf_.i16(p[1] - py); py = p[1]; }
  glyf_.pad4();
}
loca.push(glyf_.len);
const locaB = new Buf();
for (const o of loca) locaB.u32(o);

// hmtx
const hmtx = new Buf();
let maksBredde = 0;
for (const g of glyfer) {
  const adv = (g.b + 1) * P;
  maksBredde = Math.max(maksBredde, adv);
  hmtx.u16(adv);
  hmtx.i16(g.rekt.length ? Math.min(...g.rekt.map((r) => r[0])) * P : 0);
}

// cmap (format 4, ett segment per tegn)
const koder = glyfer.map((g, i) => [g.kode, i]).filter(([k]) => k >= 0).sort((a, b) => a[0] - b[0]);
const seg = [...koder.map(([k, gi]) => ({ s: k, e: k, d: (gi - k + 65536) % 65536 })), { s: 0xffff, e: 0xffff, d: 1 }];
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
head.u32(0); head.u32(0xe3000000); head.u32(0); head.u32(0xe3000000); // datoer
head.i16(xMin); head.i16(yMin); head.i16(xMax); head.i16(yMax);
head.u16(0); head.u16(8); head.i16(2); head.i16(1); head.i16(0);

// hhea
const hhea = new Buf();
hhea.u32(0x00010000); hhea.i16(ASC); hhea.i16(-DESC); hhea.i16(0);
hhea.u16(maksBredde); hhea.i16(0); hhea.i16(0); hhea.i16(xMax);
hhea.i16(1); hhea.i16(0); hhea.i16(0);
for (let i = 0; i < 4; i++) hhea.i16(0);
hhea.i16(0); hhea.u16(glyfer.length);

// maxp
const maxp = new Buf();
maxp.u32(0x00010000); maxp.u16(glyfer.length); maxp.u16(maksPunkter); maxp.u16(maksKonturer);
maxp.u16(0); maxp.u16(0); maxp.u16(2);
for (let i = 0; i < 7; i++) maxp.u16(0);
maxp.u16(0); maxp.u16(0);

// OS/2 (versjon 4)
const os2 = new Buf();
os2.u16(4); os2.i16(6 * P); os2.u16(400); os2.u16(5); os2.u16(0);
for (const v of [650, 700, 0, 140, 650, 700, 0, 480, 125, 375]) os2.i16(v);
os2.i16(0);
for (let i = 0; i < 10; i++) os2.u8(0);
os2.u32(3); os2.u32(0); os2.u32(0); os2.u32(0); // Basic Latin + Latin-1
os2.tag('HDSF');
os2.u16(0x0040); os2.u16(32); os2.u16(Math.min(0xffff, koder[koder.length - 1][0]));
os2.i16(ASC); os2.i16(-DESC); os2.i16(0); os2.u16(ASC); os2.u16(DESC);
os2.u32(1); os2.u32(0);
os2.i16(5 * P); os2.i16(7 * P); os2.u16(0); os2.u16(32); os2.u16(1);

// name
const navn = {
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
const poster = Object.entries(navn);
nameB.u16(0); nameB.u16(poster.length); nameB.u16(6 + poster.length * 12);
const strenger = new Buf();
for (const [id, tekst] of poster) {
  const utf16 = [];
  for (const c of tekst) { const k = /** @type {number} */ (c.codePointAt(0)); utf16.push(k >> 8, k & 255); }
  nameB.u16(3); nameB.u16(1); nameB.u16(0x409); nameB.u16(Number(id)); nameB.u16(utf16.length); nameB.u16(strenger.len);
  strenger.b.push(...utf16);
}
nameB.b.push(...strenger.b);

// post (versjon 3)
const post = new Buf();
post.u32(0x00030000); post.u32(0); post.i16(-P); post.i16(P); post.u32(0); post.u32(0); post.u32(0); post.u32(0); post.u32(0);

// Sett sammen fila
const tabeller = { 'OS/2': os2, cmap, glyf: glyf_, head, hhea, hmtx, loca: locaB, maxp, name: nameB, post };
const tags = Object.keys(tabeller).sort();
const fil = new Buf();
const n = tags.length;
const sr2 = 16 * 2 ** Math.floor(Math.log2(n));
fil.u32(0x00010000); fil.u16(n); fil.u16(sr2); fil.u16(Math.log2(sr2 / 16)); fil.u16(n * 16 - sr2);
const sjekksum = (bytes) => {
  let s = 0;
  for (let i = 0; i < bytes.length; i += 4) s = (s + (((bytes[i] << 24) | ((bytes[i + 1] ?? 0) << 16) | ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0)) >>> 0)) >>> 0;
  return s;
};
let offset = 12 + n * 16;
const plassering = [];
for (const t of tags) {
  const b = tabeller[t];
  plassering.push({ t, offset, len: b.len, sum: sjekksum(b.b) });
  offset += Math.ceil(b.len / 4) * 4;
}
for (const p of plassering) { fil.tag(p.t); fil.u32(p.sum); fil.u32(p.offset); fil.u32(p.len); }
let headOffset = 0;
for (const t of tags) {
  if (t === 'head') headOffset = fil.len;
  fil.b.push(...tabeller[t].b);
  fil.pad4();
}
const justering = (0xb1b0afba - sjekksum(fil.b)) >>> 0;
fil.b[headOffset + 8] = justering >>> 24; fil.b[headOffset + 9] = (justering >>> 16) & 255;
fil.b[headOffset + 10] = (justering >>> 8) & 255; fil.b[headOffset + 11] = justering & 255;

fs.mkdirSync(path.join(ROT, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(ROT, 'fonts', 'kontorpiksel.ttf'), Buffer.from(fil.b));
console.log(`fonts/kontorpiksel.ttf: ${glyfer.length} glyfer, ${fil.len} byte`);

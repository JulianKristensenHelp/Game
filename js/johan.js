// @ts-check
// Johan, the final boss – drawn from a photo of him, in the same style as the client's own pixel art of the four
// playable characters (assets/karakterer/): 1 pixel detail (the same pixel density), chibi proportions (the head is
// about half the height), coloured outlines (a dark shade of each material instead of black), soft three-tone shading
// with the light from the left, and eyes with white, iris and a dark lid line.
// He is a boss, so the figure is twice the size of the playable characters (64 × 64), but with the same 1 px detail.
// The photo itself is only used as a reference: it is not stored anywhere in the project.
import { Raster, hex } from './pixel.js';
import { POSE } from './figures.js';

/** Materials: [light, base, shadow, outline]. */
const MAT = {
  skin: ['#f8d2b0', '#eab690', '#cd926c', '#7e4a34'],
  hair: ['#b88e62', '#97714d', '#6f5136', '#331e12'],
  shirt: ['#5c7ee0', '#3557bc', '#24408d', '#0c1838'],
  jacket: ['#71757e', '#51555d', '#3d4047', '#141418'],
  pants: ['#5b5e65', '#46484e', '#34363b', '#0e0e12'],
  shoes: ['#3b3b41', '#232327', '#161619', '#060608'],
  belt: ['#4a3c2e', '#2a2018', '#1a140f', '#060608'],
  white: ['#ffffff', '#f4f0ec', '#d6d0ca', '#6a6a70'],
  iris: ['#6a8ab0', '#41618a', '#2a3f5e', '#1d1626'],
  lid: ['#3a2418', '#2a1810', '#1e110b', '#1e110b'],
  mouth: ['#c07070', '#9a4c44', '#7a3434', '#5a2424'],
  blush: ['#f0a090', '#e8907e', '#d07a6a', '#a05a4a'],
  gold: ['#ffe9a0', '#f5cf3a', '#c9941a', '#6a4a00'],
};
const NAMES = Object.keys(MAT);
/** The palette for Johan's grids (index → [r, g, b]). */
export const JOHAN_PALETTE = [null, ...NAMES.flatMap((n) => MAT[n].map((c) => hex(c)))];
/** Colour index for a material and tone (0 light, 1 base, 2 shadow, 3 outline). */
const C = (m, tone = 1) => NAMES.indexOf(m) * 4 + tone + 1;
const matOf = (c) => (c ? Math.floor((c - 1) / 4) : -1);

/** Fills an ellipse with three-tone shading (light top left, shadow right and bottom). */
function shadedEllipse(r, cx, cy, rx, ry, m, pred = null) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    if (nx * nx + ny * ny > 1 || (pred && !pred(x, y))) continue;
    const s = nx * 0.75 + ny * 0.55;
    r.px(x, y, C(m, s > 0.55 ? 2 : s < -0.55 ? 0 : 1));
  }
}

/** Rectangle with a light left edge and a shadowed right edge. */
function shadedRect(r, x, y, w, h, m) {
  r.rect(x, y, w, h, C(m, 1));
  r.rect(x, y, 1, h, C(m, 0));
  r.rect(x + w - 2, y, 2, h, C(m, 2));
}

/**
 * Johan's short, light-brown hair, combed up and back: a cap over the head (centre cx, cy, radii rx, ry) down to the
 * hairline line(dx), which is highest over the forehead and comes down toward the temples.
 * Shading as in the client's pictures: a light band at the top left, soft darker strands, shadow on the right.
 */
function hairCap(r, cx, cy, rx, ry, line) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    if (nx * nx + ny * ny > 1) continue;
    if (y >= line(Math.abs(x + 0.5 - cx))) continue;
    let tone = 1;
    if (nx > 0.45 || y >= line(Math.abs(x + 0.5 - cx)) - 1.5) tone = 2;
    else if (nx < -0.1 && ny < -0.55) tone = 0;
    // soft strands combed up and back
    if (tone !== 2 && (x + Math.floor(y * 0.55)) % 6 === 0) tone = tone === 0 ? 1 : 2;
    r.px(x, y, C('hair', tone));
  }
}

/** The outline: every pixel on the edge of the figure gets the outline tone of its own material. */
function outline(r) {
  const d = r.d.slice();
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const c = d[y * r.w + x];
    if (!c) continue;
    const empty = (xx, yy) => xx < 0 || yy < 0 || xx >= r.w || yy >= r.h || !d[yy * r.w + xx];
    if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) r.px(x, y, C(NAMES[matOf(c)], 3));
  }
}

/** Dark line where one material sits in front of another (e.g. the hair over the forehead, a sleeve against the body). */
function edgeBetween(r, front, back) {
  const d = r.d.slice();
  const f = NAMES.indexOf(front), b = NAMES.indexOf(back);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (matOf(d[y * r.w + x]) !== f) continue;
    const n = (xx, yy) => matOf(xx >= 0 && yy >= 0 && xx < r.w && yy < r.h ? d[yy * r.w + xx] : 0) === b;
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) r.px(x, y, C(front, 3));
  }
}

// ---------- The figure (64 × 64) ----------

/**
 * One frame of Johan.
 * @param {number} frame 0–3 walk, 4 happy (thumbs up), 5 + POSE.x = a pose
 * @param {number} variant 0 = with the suit jacket, 1 = jacket off (second phase)
 */
export function drawJohan(frame, variant) {
  const r = new Raster(64, 64);
  const happy = frame === 4;
  const pose = frame >= 5 ? frame - 5 : -1;
  const walk = frame < 4 ? frame : 0;
  // Walk cycle like the playable characters: frames 1 and 3 dip one pixel and lift one foot
  const dip = walk === 1 || walk === 3 ? 1 : 0;
  const liftL = walk === 1, liftR = walk === 3;
  const coat = variant === 0 ? 'jacket' : 'shirt';
  const Y = (y) => y + dip;

  // Legs and shoes
  for (const [lx, lift] of /** @type {[number, boolean][]} */ ([[24, liftL], [35, liftR]])) {
    const top = Y(54), foot = lift ? Y(57) : Y(58);
    shadedRect(r, lx, top, 6, foot - top + 1, 'pants');
    r.rect(lx - (lx < 32 ? 2 : 0), foot + 1, 8, 3, C('shoes', 1));
    r.rect(lx - (lx < 32 ? 2 : 0), foot + 1, 8, 1, C('shoes', 0));
  }
  // Trousers top and belt
  shadedRect(r, 22, Y(51), 21, 4, 'pants');
  r.rect(22, Y(51), 21, 1, C('belt', 1));
  r.rect(31, Y(51), 3, 1, C('gold', 1));

  // The body: jacket (or shirt) with rounded shoulders
  for (let y = Y(33); y <= Y(51); y++) {
    const inset = y === Y(33) ? 2 : y === Y(34) ? 1 : 0;
    for (let x = 19 + inset; x <= 45 - inset; x++) r.px(x, y, C(coat, x < 22 ? 0 : x > 41 ? 2 : 1));
  }
  if (variant === 0) {
    // the royal-blue shirt in a V between the lapels, open collar
    for (let y = Y(33); y <= Y(46); y++) {
      const half = Math.max(1, 6 - Math.floor((y - Y(33)) / 2));
      for (let x = 32 - half; x < 32 + half; x++) r.px(x, y, C('shirt', x < 30 ? 0 : 1));
      r.px(32 - half - 1, y, C('jacket', 0));
      r.px(32 + half, y, C('jacket', 2));
    }
    // buttons and pockets
    r.rect(34, Y(47), 2, 2, C('jacket', 3));
    r.rect(22, Y(45), 6, 1, C('jacket', 2));
    r.rect(37, Y(45), 6, 1, C('jacket', 2));
    r.rect(23, Y(38), 5, 1, C('jacket', 2));
  } else {
    // the shirt: button placket and creases
    for (let y = Y(36); y < Y(50); y += 3) r.px(32, y, C('white', 1));
    r.rect(33, Y(35), 1, 15, C('shirt', 2));
  }
  // collar points and the neck in the open collar
  r.rect(26, Y(32), 4, 3, C('shirt', 0));
  r.rect(34, Y(32), 4, 3, C('shirt', 1));
  r.rect(30, Y(32), 4, 3, C('skin', 1));
  r.px(31, Y(35), C('skin', 2));
  r.px(32, Y(35), C('skin', 2));

  // Arms (the sleeves have the jacket's colour, or the shirt's in the second phase)
  const sleeve = (x, y, w, h) => {
    r.rect(x, y, w, h, C(coat, 1));
    r.rect(x, y, 1, h, C(coat, 0));
    r.rect(x + w - 1, y, 1, h, C(coat, 2));
  };
  const hand = (x, y, w = 5, h = 4) => {
    r.rect(x, y, w, h, C('skin', 1));
    r.rect(x, y, w, 1, C('skin', 0));
    r.rect(x + w - 1, y, 1, h, C('skin', 2));
  };
  const swing = walk === 0 || walk === 2 ? 0 : walk === 1 ? 1 : -1;
  if (pose === POSE.crossed || pose === POSE.sad) {
    sleeve(15, Y(34), 5, 10);
    sleeve(45, Y(34), 5, 10);
    sleeve(17, Y(41), 31, 4);
    sleeve(19, Y(38), 27, 4);
    hand(42, Y(37), 4, 4);
    hand(19, Y(42), 4, 4);
  } else if (pose === POSE.clap) {
    sleeve(15, Y(34), 5, 9);
    sleeve(45, Y(34), 5, 9);
    sleeve(18, Y(41), 11, 4);
    sleeve(36, Y(41), 11, 4);
    hand(29, Y(38), 7, 7);
  } else if (pose === POSE.point) {
    sleeve(15, Y(34), 5, 14);
    hand(15, Y(47));
    sleeve(45, Y(35), 13, 5);
    hand(57, Y(35), 4, 5);
    r.rect(61, Y(36), 2, 2, C('skin', 1));
  } else if (pose === POSE.raise || happy) {
    // one arm raised: right arm (calendar), or the left arm for the thumbs up
    const up = happy ? 15 : 45;
    const down = happy ? 45 : 15;
    sleeve(down, Y(34), 5, 14);
    hand(down, Y(47));
    sleeve(up, Y(14), 5, 21);
    hand(up, Y(9), 5, 5);
    if (happy) {
      // thumb up
      r.rect(up + 1, Y(5), 2, 4, C('skin', 1));
      r.px(up + 1, Y(5), C('skin', 0));
    }
  } else {
    sleeve(15, Y(34 + swing), 5, 14);
    hand(15, Y(47 + swing));
    sleeve(45, Y(34 - swing), 5, 14);
    hand(45, Y(47 - swing));
  }

  // Head
  const hx = 32, hy = Y(18);
  // ears (small)
  shadedEllipse(r, 18.5, hy + 3, 1.8, 2.8, 'skin');
  shadedEllipse(r, 45.5, hy + 3, 1.8, 2.8, 'skin');
  // the face: light from the left, a shadow band down the right side
  for (let y = hy - 15; y <= hy + 14; y++) for (let x = hx - 15; x <= hx + 15; x++) {
    const ny = (y + 0.5 - hy) / 13.5;
    const narrow = ny > 0 ? 1 - 0.18 * ny * ny : 1;
    const nx = (x + 0.5 - hx) / (13.5 * narrow);
    if (nx * nx + ny * ny > 1) continue;
    const s = nx * 0.85 + ny * 0.35;
    r.px(x, y, C('skin', s > 0.45 ? 2 : s < -0.5 ? 0 : 1));
  }
  // hair: short, light brown, combed up and back with some volume on top, short sides above the ears
  hairCap(r, hx, hy - 3, 14.8, 16, (dx) => hy - 6 + (dx > 8 ? (dx - 8) * 1.1 : 0));

  // Face (light from the left)
  const sad = pose === POSE.sad;
  for (const ex of [hx - 9, hx + 4]) {
    // brows (sad: raised in the middle)
    if (sad) {
      r.rect(ex, hy - 4 + (ex < hx ? 1 : 0), 3, 1, C('hair', 2));
      r.rect(ex + 3, hy - 4 + (ex < hx ? 0 : 1), 2, 1, C('hair', 2));
    } else r.rect(ex, hy - 4, 5, 1, C('hair', 2));
    if (happy) {
      // closed, smiling eyes
      r.rect(ex, hy - 1, 5, 1, C('lid', 1));
      r.px(ex - 1, hy, C('lid', 1));
      r.px(ex + 5, hy, C('lid', 1));
    } else {
      r.rect(ex, hy - 2, 5, 1, C('lid', 1));
      r.rect(ex, hy - 1, 5, 2, C('white', 1));
      const ix = ex + (ex < hx ? 2 : 1);
      r.rect(ix, hy - 1, 2, 2, C('iris', 1));
      r.px(ix, hy - 1, C('white', 0));
    }
  }
  // nose
  r.rect(hx + 1, hy + 2, 1, 3, C('skin', 2));
  r.rect(hx - 1, hy + 5, 3, 1, C('skin', 2));
  // mouth: a warm closed smile (open with teeth when happy, turned down when disappointed)
  if (happy) {
    r.rect(hx - 4, hy + 8, 9, 1, C('mouth', 2));
    r.rect(hx - 3, hy + 9, 7, 1, C('white', 1));
    r.rect(hx - 2, hy + 10, 5, 1, C('mouth', 1));
    r.rect(hx - 9, hy + 6, 3, 2, C('blush', 1));
    r.rect(hx + 7, hy + 6, 3, 2, C('blush', 1));
  } else if (sad) {
    r.rect(hx - 2, hy + 8, 5, 1, C('mouth', 1));
    r.px(hx - 3, hy + 9, C('mouth', 1));
    r.px(hx + 3, hy + 9, C('mouth', 1));
  } else {
    r.px(hx - 4, hy + 7, C('mouth', 1));
    r.rect(hx - 3, hy + 8, 7, 1, C('mouth', 1));
    r.px(hx + 4, hy + 7, C('mouth', 1));
    r.rect(hx - 2, hy + 9, 5, 1, C('skin', 2));
    // smile lines
    r.px(hx - 6, hy + 6, C('skin', 2));
    r.px(hx + 6, hy + 6, C('skin', 2));
  }

  edgeBetween(r, 'hair', 'skin');
  edgeBetween(r, coat, variant === 0 ? 'shirt' : 'skin');
  outline(r);
  return r;
}

// ---------- The portrait (64 × 64) ----------

/** Johan's portrait in the same layout as the playable characters' portraits: head and shoulders. */
export function drawJohanPortrait() {
  const r = new Raster(64, 64);
  const hx = 32, hy = 31;
  // shoulders: charcoal jacket over the royal-blue open-collar shirt
  for (let y = 47; y < 64; y++) for (let x = 0; x < 64; x++) {
    const nx = (x + 0.5 - 32) / 33, ny = (y + 0.5 - 70) / 23;
    if (nx * nx + ny * ny > 1) continue;
    r.px(x, y, C('jacket', x < 14 ? 0 : x > 50 ? 2 : 1));
  }
  for (let y = 46; y < 64; y++) {
    const half = Math.max(2, 10 - Math.floor((y - 46) * 0.55));
    for (let x = 32 - half; x < 32 + half; x++) r.px(x, y, C('shirt', x < 30 ? 0 : x > 34 ? 2 : 1));
    r.px(32 - half - 1, y, C('jacket', 0));
    r.px(32 - half - 2, y, C('jacket', 0));
    r.px(32 + half, y, C('jacket', 2));
    r.px(32 + half + 1, y, C('jacket', 2));
  }
  // neck and the open collar
  shadedRect(r, 26, 42, 13, 8, 'skin');
  r.rect(26, 42, 13, 2, C('skin', 2));
  for (let i = 0; i < 6; i++) r.rect(30 - Math.floor(i / 2), 50 + i, 6 - (i % 2) + Math.floor(i / 2) * 0, 1, C('skin', i > 3 ? 2 : 1));
  for (let i = 0; i < 4; i++) {
    r.rect(22 + i, 47 + i, 4, 1, C('shirt', 0));
    r.rect(38 - i, 47 + i, 4, 1, C('shirt', 1));
  }
  // ears (small, like the playable characters')
  shadedEllipse(r, 18.5, hy + 2, 2, 3.6, 'skin');
  shadedEllipse(r, 45.5, hy + 2, 2, 3.6, 'skin');
  r.rect(18, hy + 1, 1, 3, C('skin', 2));
  r.rect(45, hy + 1, 1, 3, C('skin', 2));
  // the face: broad, with a gently squared jaw; light from the left, a shadow band down the right side
  for (let y = hy - 18; y <= hy + 15; y++) for (let x = hx - 16; x <= hx + 16; x++) {
    const ny = (y + 0.5 - hy) / 16;
    const narrow = ny > 0 ? 1 - 0.22 * ny * ny : 1;
    const nx = (x + 0.5 - hx) / (13.6 * narrow);
    if (nx * nx + ny * ny > 1) continue;
    const s = nx * 0.85 + ny * 0.35;
    r.px(x, y, C('skin', s > 0.45 ? 2 : s < -0.5 ? 0 : 1));
  }
  // hair: short, light brown, combed up and back with some volume on top, sitting close to the head,
  // short sides above the ears; strands drawn as darker and lighter streaks
  hairCap(r, hx, hy - 5, 15.2, 19.5, (dx) => hy - 11.5 + (dx > 9 ? (dx - 9) * 1.25 : 0));
  // brows
  for (const ex of [hx - 11, hx + 4]) {
    r.rect(ex, hy - 4, 7, 1, C('hair', 2));
    r.rect(ex + (ex < hx ? 0 : 1), hy - 3, 6, 1, C('hair', 3));
  }
  // eyes: dark lid line, white, blue-grey iris with a highlight, a friendly squint
  for (const ex of [hx - 10, hx + 4]) {
    r.rect(ex, hy - 1, 6, 1, C('lid', 1));
    r.rect(ex, hy, 6, 2, C('white', 1));
    const ix = ex + (ex < hx ? 2 : 1);
    r.rect(ix, hy, 3, 2, C('iris', 1));
    r.px(ix + 1, hy + 1, C('iris', 3));
    r.px(ix, hy, C('white', 0));
    r.rect(ex, hy + 2, 6, 1, C('skin', 2));
    // smile lines at the eyes
    r.px(ex < hx ? ex - 2 : ex + 7, hy + 1, C('skin', 2));
    r.px(ex < hx ? ex - 2 : ex + 7, hy + 3, C('skin', 2));
  }
  // nose
  r.rect(hx + 1, hy + 3, 1, 5, C('skin', 2));
  r.rect(hx - 1, hy + 8, 4, 1, C('skin', 2));
  r.px(hx - 2, hy + 7, C('skin', 2));
  // a warm, closed smile with smile lines
  r.px(hx - 6, hy + 10, C('mouth', 1));
  r.px(hx + 6, hy + 10, C('mouth', 1));
  r.rect(hx - 5, hy + 11, 11, 1, C('mouth', 1));
  r.rect(hx - 3, hy + 12, 7, 1, C('skin', 2));
  r.px(hx - 8, hy + 8, C('skin', 2));
  r.px(hx - 8, hy + 9, C('skin', 2));
  r.px(hx + 8, hy + 8, C('skin', 2));
  r.px(hx + 8, hy + 9, C('skin', 2));

  edgeBetween(r, 'hair', 'skin');
  edgeBetween(r, 'shirt', 'skin');
  outline(r);
  return r;
}

// @ts-check
// Fiske-Frida and her two friends (boss 3, Endringsprompt 4), drawn in the same style as Johan and the client's own
// pixel art: 1 pixel detail, coloured outlines (a dark shade of each material), three-tone shading with the light from
// the left. Frida is a warm, charming grandmother: grey hair in a bun, glasses on a chain, a knitted cardigan, a handbag
// and a fishing rod. She has been fooled by her email – she is not stupid – so she is drawn kind and dignified.
import { Raster, hex } from './pixel.js';
import { POSE } from './figures.js';

/** Materials: [light, base, shadow, outline]. */
const MAT = {
  skin: ['#f8d8c0', '#ecbfa0', '#d39d7e', '#7e4e3a'],
  hair: ['#f0f0f4', '#c9c9d2', '#9c9cab', '#55556a'],
  knit: ['#d77a8a', '#b8566a', '#8e3a50', '#3e1222'],
  blouse: ['#e6e0f8', '#c8bdea', '#a294cc', '#4a3d70'],
  skirt: ['#5c6c96', '#3e4c74', '#2c3756', '#10152a'],
  shoes: ['#7a5a40', '#5a3e28', '#3e2a1a', '#160d06'],
  bag: ['#e0a050', '#b8782e', '#8a5420', '#3a2208'],
  rod: ['#c89a64', '#8a6038', '#5e3e22', '#24160a'],
  line: ['#ffffff', '#e8eef4', '#c0ccd8', '#8090a0'],
  white: ['#ffffff', '#f4f0ec', '#d6d0ca', '#6a6a70'],
  iris: ['#8aa880', '#5f7f56', '#405a3a', '#1d1626'],
  lid: ['#5a3a30', '#3e2620', '#2a1812', '#2a1812'],
  mouth: ['#d07a78', '#b0545a', '#8a3a40', '#5a2228'],
  blush: ['#f4a8a0', '#ec9488', '#d07a70', '#a05a4a'],
  gold: ['#ffe9a0', '#f5cf3a', '#c9941a', '#6a4a00'],
  // the friends
  green: ['#8fc890', '#5fa05f', '#3f7a44', '#132a16'],
  mustard: ['#f0cc6a', '#d4a63a', '#a67c22', '#3e2a06'],
  skin2: ['#c88a64', '#a86a48', '#865032', '#3a1e10'],
  hair2: ['#5a5a66', '#34343e', '#22222a', '#08080c'],
  phone: ['#5a6a80', '#2a3240', '#1a1f28', '#06080c'],
  screen: ['#c8ecff', '#8fd3ff', '#5aa8d8', '#1f4a6a'],
};
const NAMES = Object.keys(MAT);
/** The palette for Frida's and the friends' grids (index → [r, g, b]). */
export const FRIDA_PALETTE = [null, ...NAMES.flatMap((n) => MAT[n].map((c) => hex(c)))];
const C = (m, tone = 1) => NAMES.indexOf(m) * 4 + tone + 1;
const matOf = (c) => (c ? Math.floor((c - 1) / 4) : -1);

function shadedEllipse(r, cx, cy, rx, ry, m) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    if (nx * nx + ny * ny > 1) continue;
    const s = nx * 0.75 + ny * 0.55;
    r.px(x, y, C(m, s > 0.55 ? 2 : s < -0.55 ? 0 : 1));
  }
}

function shadedRect(r, x, y, w, h, m) {
  r.rect(x, y, w, h, C(m, 1));
  r.rect(x, y, 1, h, C(m, 0));
  r.rect(x + w - 2, y, 2, h, C(m, 2));
}

/** Every pixel on the edge of the figure gets the outline tone of its own material. */
function outline(r) {
  const d = r.d.slice();
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const c = d[y * r.w + x];
    if (!c || NAMES[matOf(c)] === 'line') continue;
    const empty = (xx, yy) => xx < 0 || yy < 0 || xx >= r.w || yy >= r.h || !d[yy * r.w + xx];
    if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) r.px(x, y, C(NAMES[matOf(c)], 3));
  }
}

function edgeBetween(r, front, back) {
  const d = r.d.slice();
  const f = NAMES.indexOf(front), b = NAMES.indexOf(back);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (matOf(d[y * r.w + x]) !== f) continue;
    const n = (xx, yy) => matOf(xx >= 0 && yy >= 0 && xx < r.w && yy < r.h ? d[yy * r.w + xx] : 0) === b;
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) r.px(x, y, C(front, 3));
  }
}

/** A thin line (the fishing rod or the fishing line) from (x0, y0) to (x1, y1). */
function line(r, x0, y0, x1, y1, m, tone = 1, w = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
    r.rect(x, y, w, w, C(m, tone));
  }
}

// ---------- Fiske-Frida (64 × 64) ----------

/**
 * One frame of Fiske-Frida.
 * @param {number} frame 0–3 walk, 4 happy (thumbs up), 5 + POSE.x = a pose
 *   (raise = the rod swung over her head, point = pointing at the sky, sad = disappointed, crossed/clap = hands together)
 */
export function drawFrida(frame) {
  const r = new Raster(64, 64);
  const happy = frame === 4;
  const pose = frame >= 5 ? frame - 5 : -1;
  const walk = frame < 4 ? frame : 0;
  // She walks with a gentle sway: frames 1 and 3 dip one pixel
  const dip = walk === 1 || walk === 3 ? 1 : 0;
  const Y = (y) => y + dip;

  // Legs (stockings) and sensible shoes under the long skirt
  for (const [lx, lift] of /** @type {[number, boolean][]} */ ([[25, walk === 1], [34, walk === 3]])) {
    const foot = lift ? Y(57) : Y(58);
    shadedRect(r, lx, Y(53), 5, foot - Y(53) + 1, 'skin');
    r.rect(lx - 1, foot + 1, 7, 3, C('shoes', 1));
    r.rect(lx - 1, foot + 1, 7, 1, C('shoes', 0));
  }
  // The long skirt
  for (let y = Y(42); y <= Y(54); y++) {
    const half = 12 + Math.floor((y - Y(42)) / 3);
    for (let x = 32 - half; x < 32 + half; x++) r.px(x, y, C('skirt', x < 32 - half + 2 ? 0 : x > 32 + half - 4 ? 2 : 1));
  }
  // The knitted cardigan: a round, soft body with cable-knit stripes, buttons, and the blouse at the neck
  for (let y = Y(30); y <= Y(46); y++) {
    const inset = y === Y(30) ? 3 : y === Y(31) ? 1 : 0;
    for (let x = 17 + inset; x <= 47 - inset; x++) {
      let tone = x < 21 ? 0 : x > 43 ? 2 : 1;
      if (tone === 1 && (x === 24 || x === 40) && (y & 1)) tone = 0;
      if (tone === 1 && (x === 27 || x === 37) && !(y & 1)) tone = 2;
      r.px(x, y, C('knit', tone));
    }
  }
  // ribbed hem
  for (let x = 17; x <= 47; x += 2) r.px(x, Y(46), C('knit', 2));
  // the blouse in a V and the cardigan's buttons
  for (let y = Y(30); y <= Y(37); y++) {
    const half = Math.max(1, 4 - Math.floor((y - Y(30)) / 2));
    for (let x = 32 - half; x < 32 + half; x++) r.px(x, y, C('blouse', x < 31 ? 0 : 1));
  }
  for (const by of [39, 42, 45]) r.px(32, Y(by), C('gold', 1));

  const sleeve = (x, y, w, h) => {
    r.rect(x, y, w, h, C('knit', 1));
    r.rect(x, y, 1, h, C('knit', 0));
    r.rect(x + w - 1, y, 1, h, C('knit', 2));
  };
  const hand = (x, y, w = 5, h = 4) => {
    r.rect(x, y, w, h, C('skin', 1));
    r.rect(x, y, w, 1, C('skin', 0));
    r.rect(x + w - 1, y, 1, h, C('skin', 2));
  };
  /** The handbag on her left arm. */
  const bag = (x, y) => {
    r.rect(x + 1, y - 3, 6, 1, C('bag', 2));
    r.px(x + 1, y - 2, C('bag', 2));
    r.px(x + 6, y - 2, C('bag', 2));
    shadedRect(r, x, y, 8, 7, 'bag');
    r.rect(x, y, 8, 1, C('bag', 0));
    r.rect(x + 3, y + 1, 2, 2, C('gold', 1));
  };

  const swing = walk === 0 || walk === 2 ? 0 : walk === 1 ? 1 : -1;
  if (pose === POSE.raise) {
    // «Klikk på lenken!»: the rod swung up over her head, the line hanging with the hook
    sleeve(13, Y(31), 5, 12);
    hand(13, Y(43));
    bag(10, Y(45));
    sleeve(46, Y(14), 5, 18);
    hand(46, Y(10), 5, 5);
    line(r, 48, Y(10), 8, Y(2), 'rod', 1, 2);
    line(r, 8, Y(2), 6, Y(14), 'line', 2);
    r.rect(5, Y(14), 2, 2, C('line', 3));
  } else if (pose === POSE.point) {
    // pointing up at the sky (the herring rain), the rod resting against her shoulder
    sleeve(46, Y(12), 5, 20);
    hand(46, Y(8), 5, 5);
    r.rect(48, Y(4), 2, 5, C('skin', 1));
    sleeve(13, Y(31), 5, 12);
    hand(13, Y(43));
    bag(10, Y(45));
    line(r, 15, Y(44), 4, Y(10), 'rod', 1, 2);
  } else if (pose === POSE.sad || pose === POSE.crossed || pose === POSE.clap) {
    // hands together in front (disappointed, or waiting)
    sleeve(15, Y(31), 5, 10);
    sleeve(44, Y(31), 5, 10);
    sleeve(18, Y(38), 11, 4);
    sleeve(35, Y(38), 11, 4);
    hand(29, Y(37), 7, 6);
    bag(41, Y(42));
  } else if (happy) {
    // thumbs up, the rod in the other hand
    sleeve(13, Y(12), 5, 20);
    hand(13, Y(8), 5, 5);
    r.rect(14, Y(4), 2, 4, C('skin', 1));
    sleeve(46, Y(31), 5, 12);
    hand(46, Y(43));
    line(r, 49, Y(44), 60, Y(14), 'rod', 1, 2);
    bag(48, Y(45));
  } else {
    sleeve(13, Y(31 + swing), 5, 12);
    hand(13, Y(43 + swing));
    bag(10, Y(45 + swing));
    sleeve(46, Y(31 - swing), 5, 12);
    hand(46, Y(43 - swing));
    // the fishing rod in her right hand, pointing up and out, with the line and a little float
    line(r, 49, Y(44 - swing), 60, Y(12 - swing), 'rod', 1, 2);
    line(r, 61, Y(12 - swing), 61, Y(22 - swing), 'line', 2);
    r.rect(60, Y(22 - swing), 3, 3, C('knit', 0));
  }

  // Head
  const hx = 32, hy = Y(17);
  shadedEllipse(r, 19, hy + 2, 1.8, 2.8, 'skin');
  shadedEllipse(r, 45, hy + 2, 1.8, 2.8, 'skin');
  for (let y = hy - 13; y <= hy + 13; y++) for (let x = hx - 14; x <= hx + 14; x++) {
    const ny = (y + 0.5 - hy) / 12.5;
    const narrow = ny > 0 ? 1 - 0.12 * ny * ny : 1;
    const nx = (x + 0.5 - hx) / (13 * narrow);
    if (nx * nx + ny * ny > 1) continue;
    const s = nx * 0.85 + ny * 0.35;
    r.px(x, y, C('skin', s > 0.45 ? 2 : s < -0.5 ? 0 : 1));
  }
  // Grey hair, softly waved, pulled back into a bun on top
  for (let y = hy - 15; y <= hy - 3; y++) for (let x = hx - 15; x <= hx + 15; x++) {
    const nx = (x + 0.5 - hx) / 14.6, ny = (y + 0.5 - (hy - 3)) / 12.5;
    if (nx * nx + ny * ny > 1) continue;
    const dx = Math.abs(x + 0.5 - hx);
    if (y >= hy - 7 + (dx > 7 ? Math.min(6, (dx - 7) * 0.9) : 0)) continue;
    let tone = nx > 0.45 ? 2 : nx < -0.15 && ny < -0.4 ? 0 : 1;
    if (tone === 1 && (x + y * 2) % 7 === 0) tone = 2;
    r.px(x, y, C('hair', tone));
  }
  // the hair continues down beside the face to the ears
  for (const sx of [-1, 1]) for (let y = hy - 8; y <= hy + 1; y++) r.rect(hx + sx * 13 - (sx < 0 ? 1 : 0), y, 2, 1, C('hair', sx < 0 ? 1 : 2));
  shadedEllipse(r, hx, hy - 17, 6, 4.5, 'hair');
  r.rect(hx - 4, hy - 14, 8, 1, C('hair', 2));

  const sad = pose === POSE.sad;
  // Glasses with thin gold frames, and the chain hanging down to her shoulders
  for (const ex of [hx - 10, hx + 3]) {
    r.rect(ex, hy - 2, 7, 1, C('gold', 2));
    r.rect(ex, hy + 3, 7, 1, C('gold', 2));
    r.rect(ex, hy - 2, 1, 6, C('gold', 2));
    r.rect(ex + 6, hy - 2, 1, 6, C('gold', 2));
    if (happy) {
      r.rect(ex + 1, hy + 1, 5, 1, C('lid', 1));
    } else {
      r.rect(ex + 1, hy, 5, 1, C('lid', 1));
      r.rect(ex + 1, hy + 1, 5, 2, C('white', 1));
      const ix = ex + (ex < hx ? 3 : 2);
      r.rect(ix, hy + 1, 2, 2, C('iris', 1));
      r.px(ix, hy + 1, C('white', 0));
    }
    // brows (raised in the middle when disappointed)
    r.rect(ex + 1, hy - 4 + (sad && ex > hx ? 1 : 0), 3, 1, C('hair', 2));
    r.rect(ex + 4, hy - 4 + (sad && ex < hx ? 1 : 0), 2, 1, C('hair', 2));
  }
  r.rect(hx - 3, hy - 1, 6, 1, C('gold', 2));
  for (let i = 0; i < 9; i++) {
    r.px(hx - 11 - (i > 4 ? 1 : 0), hy + 4 + i, C('gold', i & 1 ? 1 : 2));
    r.px(hx + 10 + (i > 4 ? 1 : 0), hy + 4 + i, C('gold', i & 1 ? 1 : 2));
  }
  // nose, smile lines and rosy cheeks
  r.rect(hx, hy + 3, 1, 3, C('skin', 2));
  r.rect(hx - 1, hy + 6, 3, 1, C('skin', 2));
  r.rect(hx - 9, hy + 6, 3, 2, C('blush', 1));
  r.rect(hx + 7, hy + 6, 3, 2, C('blush', 1));
  if (happy) {
    r.rect(hx - 4, hy + 8, 9, 1, C('mouth', 2));
    r.rect(hx - 3, hy + 9, 7, 1, C('white', 1));
    r.rect(hx - 2, hy + 10, 5, 1, C('mouth', 1));
  } else if (sad) {
    r.rect(hx - 2, hy + 9, 5, 1, C('mouth', 1));
    r.px(hx - 3, hy + 10, C('mouth', 1));
    r.px(hx + 3, hy + 10, C('mouth', 1));
  } else {
    // a warm, slightly excited smile (she has won an iPhone, after all)
    r.px(hx - 4, hy + 8, C('mouth', 1));
    r.rect(hx - 3, hy + 9, 7, 1, C('mouth', 1));
    r.px(hx + 4, hy + 8, C('mouth', 1));
    r.px(hx - 6, hy + 7, C('skin', 2));
    r.px(hx + 6, hy + 7, C('skin', 2));
  }

  edgeBetween(r, 'hair', 'skin');
  edgeBetween(r, 'knit', 'blouse');
  edgeBetween(r, 'knit', 'skirt');
  outline(r);
  return r;
}

// ---------- The friends (32 × 40) ----------

/** The two friends' looks: hair, skin, cardigan and whether she wears glasses. */
const FRIEND_LOOKS = [
  { skin: 'skin', hair: 'hair', knit: 'green', glasses: true, curls: true },
  { skin: 'skin2', hair: 'hair2', knit: 'mustard', glasses: false, curls: false },
];

/**
 * One frame of a friend: smaller than Frida, in her own knitwear, with a mobile phone.
 * @param {number} frame 0–3 walk, 4 happy (thumbs up), 5 + POSE.x = a pose (raise = the phone held up)
 * @param {number} variant 0 or 1
 */
export function drawFriend(frame, variant) {
  const L = FRIEND_LOOKS[variant % FRIEND_LOOKS.length];
  const r = new Raster(32, 40);
  const happy = frame === 4;
  const pose = frame >= 5 ? frame - 5 : -1;
  const walk = frame < 4 ? frame : 0;
  const dip = walk === 1 || walk === 3 ? 1 : 0;
  const Y = (y) => y + dip;
  // legs and shoes
  for (const [lx, lift] of /** @type {[number, boolean][]} */ ([[12, walk === 1], [17, walk === 3]])) {
    const foot = lift ? Y(34) : Y(35);
    r.rect(lx, Y(31), 3, foot - Y(31) + 1, C(L.skin, 1));
    r.rect(lx - 1, foot + 1, 5, 2, C('shoes', 1));
  }
  // skirt
  for (let y = Y(25); y <= Y(31); y++) {
    const half = 7 + Math.floor((y - Y(25)) / 3);
    for (let x = 16 - half; x < 16 + half; x++) r.px(x, y, C('skirt', x < 16 - half + 1 ? 0 : x > 16 + half - 3 ? 2 : 1));
  }
  // knitted cardigan
  for (let y = Y(17); y <= Y(27); y++) {
    const inset = y === Y(17) ? 2 : 0;
    for (let x = 8 + inset; x <= 23 - inset; x++) {
      let tone = x < 10 ? 0 : x > 21 ? 2 : 1;
      if (tone === 1 && (x === 12 || x === 19) && (y & 1)) tone = 0;
      r.px(x, y, C(L.knit, tone));
    }
  }
  r.rect(15, Y(17), 2, 4, C('blouse', 1));
  const sleeve = (x, y, w, h) => {
    r.rect(x, y, w, h, C(L.knit, 1));
    r.rect(x, y, 1, h, C(L.knit, 0));
  };
  const hand = (x, y) => r.rect(x, y, 3, 3, C(L.skin, 1));
  const phone = (x, y) => {
    r.rect(x, y, 4, 6, C('phone', 1));
    r.rect(x + 1, y + 1, 2, 3, C('screen', 1));
  };
  const swing = walk === 1 ? 1 : walk === 3 ? -1 : 0;
  if (pose === POSE.raise) {
    // the phone held up high («Videresendt!»)
    sleeve(5, Y(18), 3, 9);
    hand(5, Y(27));
    sleeve(24, Y(7), 3, 12);
    hand(24, Y(5));
    phone(24, Y(0));
  } else if (happy) {
    sleeve(5, Y(7), 3, 12);
    hand(5, Y(4));
    r.rect(6, Y(2), 1, 2, C(L.skin, 1));
    sleeve(24, Y(18), 3, 9);
    hand(24, Y(27));
  } else if (pose === POSE.sad) {
    sleeve(6, Y(18), 3, 7);
    sleeve(23, Y(18), 3, 7);
    r.rect(9, Y(23), 14, 3, C(L.knit, 1));
    hand(14, Y(22));
  } else {
    sleeve(5, Y(18 + swing), 3, 9);
    hand(5, Y(27 + swing));
    sleeve(24, Y(18 - swing), 3, 8);
    hand(24, Y(25 - swing));
    phone(24, Y(22 - swing));
  }
  // head
  const hx = 16, hy = Y(10);
  for (let y = hy - 7; y <= hy + 7; y++) for (let x = hx - 8; x <= hx + 8; x++) {
    const nx = (x + 0.5 - hx) / 7.2, ny = (y + 0.5 - hy) / 7;
    if (nx * nx + ny * ny > 1) continue;
    const s = nx * 0.85 + ny * 0.35;
    r.px(x, y, C(L.skin, s > 0.45 ? 2 : s < -0.5 ? 0 : 1));
  }
  if (L.curls) {
    // short silver curls all over
    for (let y = hy - 9; y <= hy - 2; y++) for (let x = hx - 9; x <= hx + 9; x++) {
      const nx = (x + 0.5 - hx) / 8.6, ny = (y + 0.5 - (hy - 2)) / 7.5;
      if (nx * nx + ny * ny > 1) continue;
      if (y > hy - 4 && Math.abs(x + 0.5 - hx) < 6) continue;
      r.px(x, y, C(L.hair, (x + y) % 3 === 0 ? 2 : nx < -0.2 ? 0 : 1));
    }
  } else {
    // dark hair with a grey streak, in a low bun at the back
    for (let y = hy - 8; y <= hy - 2; y++) for (let x = hx - 8; x <= hx + 8; x++) {
      const nx = (x + 0.5 - hx) / 8, ny = (y + 0.5 - (hy - 2)) / 6.5;
      if (nx * nx + ny * ny > 1) continue;
      if (y > hy - 4 && Math.abs(x + 0.5 - hx) < 5) continue;
      r.px(x, y, C(L.hair, x === hx - 2 ? 0 : nx > 0.4 ? 2 : 1));
    }
    r.rect(hx - 2, hy - 8, 1, 5, C('hair', 0));
    shadedEllipse(r, hx + 7, hy + 2, 2.5, 2.5, L.hair);
  }
  // eyes (glasses for the first friend), smile
  for (const ex of [hx - 5, hx + 2]) {
    if (happy) r.rect(ex, hy + 1, 3, 1, C('lid', 1));
    else {
      r.rect(ex, hy, 3, 2, C('white', 1));
      r.px(ex + (ex < hx ? 2 : 1), hy + 1, C('iris', 3));
    }
    if (L.glasses) {
      r.rect(ex - 1, hy - 1, 5, 1, C('gold', 2));
      r.rect(ex - 1, hy + 2, 5, 1, C('gold', 2));
    }
  }
  r.rect(hx - 6, hy + 3, 2, 1, C('blush', 1));
  r.rect(hx + 4, hy + 3, 2, 1, C('blush', 1));
  if (pose === POSE.sad) r.rect(hx - 1, hy + 5, 3, 1, C('mouth', 1));
  else {
    r.rect(hx - 2, hy + 5, 5, 1, C('mouth', 1));
    if (happy) r.rect(hx - 1, hy + 6, 3, 1, C('mouth', 2));
  }
  edgeBetween(r, L.hair, L.skin);
  outline(r);
  return r;
}

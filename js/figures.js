// @ts-check
// Figure generator: draws the player and all the lawyers as color-indexed pixel grids.
// Each lawyer is assembled from layers (skin, hair, hairstyle, age, body, clothes and accessories) with palette swaps,
// so two lawyers rarely look alike. The looks are purely cosmetic and never affect gameplay.
import { CONFIG } from './config.js';
import { Raster, ramp, hex, toCanvas } from './pixel.js';
import { Rng } from './utils.js';

/** Color indices. Numbers with _S/_L are the shadow (+1) and light (+2) of the same color. */
const I = {
  OUT: 1, SKIN: 2, HAIR: 5, KL: 8, SHIRT: 11, ACC: 14, BELLY: 17, SHOES: 20, ITEM: 23, HIJ: 26,
  EYE: 29, MOUTH: 30, WHITE: 31, GLASSES: 32, GOLD: 33, BLUSH: 34, SWEAT: 35, OUT_LIGHT: 36, GRAY: 37, GREEN: 38,
  BELT: 39, SCREEN: 42, PURPLE: 43, BLUE: 44,
};

// ---------- Colors ----------

/** Skin colors from very light to very dark. */
const SKIN_COLORS = ['#f8dfcd', '#f0c6a4', '#dea47c', '#c68a5c', '#a06a43', '#774a2c', '#52321e'];
/** Hair colors: black, brown, blond, red, gray, white. */
const HAIR_COLORS = { black: '#2a2220', brown: '#6b4429', blond: '#e0bd68', red: '#b5502a', gray: '#9c9ca3', white: '#e9e9ec' };

const CLOTHES = {
  /** Junior associate: light shirt without a jacket */
  junior: ['#f3f5f8', '#cfe3f7', '#f6d6dc', '#dfe8d2', '#f3e7c9', '#dcd6f0', '#cfeae4'],
  /** Printer enthusiast: cardigan in medium colors */
  printer: ['#3f8f5f', '#8a3b4a', '#c99a2e', '#2f7f86', '#6a4a8c', '#b5633a'],
  /** Senior partner: dark suit or pantsuit */
  senior: ['#1f2a44', '#2e3138', '#1a1a20', '#3b2c26', '#26343a', '#2c2442'],
  urgent: ['#e2ad2e', '#d99f1f', '#e8b840'],
  boss: ['#7a1f2b', '#5c1a2a', '#6a2234'],
  /** The «Haster!» ("Urgent!") sender: purple sweater and always an open laptop */
  sender: ['#7b4fb8', '#6a3fa3', '#8e5cc9', '#5f3f9a'],
};
const PANTS = ['#2e3a59', '#4a4f57', '#6b5a43', '#1f2024', '#3d4a3a', '#5a3d3d'];
const SHIRTS = ['#f4f6f8', '#d6e6f7', '#f5dde2', '#efe9dc'];
const ACCENTS = ['#c0392b', '#2e86c1', '#8e44ad', '#16a085', '#d35400', '#d4ac0d', '#c2447a', '#34495e'];
const HIJAB_COLORS = ['#2c3e66', '#7a2e3a', '#2f7f6e', '#c9b38a', '#5b5f66', '#26262b', '#6b6b2e'];

/** Hairstyles. Distributed evenly. */
const STYLES = ['short', 'long', 'ponytail', 'curly', 'afro', 'braids', 'bun', 'bald', 'hijab', 'bob'];
/** Hairstyles that can be combined with a beard/moustache. */
const BEARD_OK = ['short', 'curly', 'afro', 'bald', 'bob'];

/**
 * Dimensions for each figure type (in logical pixels).
 * kb/kh = body width/height, bein = leg length, k = size of facial features (2 = double).
 */
export const TYPES = {
  junior: { w: 24, h: 32, rx: 6, ry: 6, kb: 10, kh: 8, legs: 5, shoes: 2, arm: 3, k: 1, item: 'laptop', clothes: 'shirt', margin: 2 },
  printer: { w: 28, h: 32, rx: 6, ry: 6, kb: 12, kh: 8, legs: 5, shoes: 2, arm: 3, k: 1, item: 'paper', clothes: 'cardigan', margin: 2 },
  senior: { w: 32, h: 40, rx: 7, ry: 7, kb: 14, kh: 11, legs: 7, shoes: 2, arm: 4, k: 1, item: 'folder', clothes: 'dress', margin: 2 },
  urgent: { w: 32, h: 40, rx: 7, ry: 7, kb: 12, kh: 10, legs: 7, shoes: 2, arm: 3, k: 1, item: 'folder', clothes: 'dress', margin: 2 },
  boss: { w: 64, h: 64, rx: 12, ry: 12, kb: 30, kh: 18, legs: 11, shoes: 3, arm: 7, k: 2, item: 'folder', clothes: 'dress', margin: 2 },
  sender: { w: 26, h: 32, rx: 6, ry: 6, kb: 10, kh: 8, legs: 5, shoes: 2, arm: 3, k: 1, item: 'openLaptop', clothes: 'sweater', margin: 2 },
  player: { w: 32, h: 32, rx: 6, ry: 6, kb: 12, kh: 8, legs: 5, shoes: 2, arm: 3, k: 1, item: 'can', clothes: 'hoodie', margin: 3 },
  /** The final boss: the playable characters' proportions at double size (and a little broader). */
  johan: { w: 64, h: 64, rx: 12, ry: 12, kb: 26, kh: 16, legs: 10, shoes: 4, arm: 6, k: 2, item: 'none', clothes: 'blazer', margin: 4 },
  /** Boss 1: the Nørdic consultant – big, friendly, with headset, laptop and a polo shirt with the logo. */
  nordic: { w: 64, h: 64, rx: 12, ry: 12, kb: 30, kh: 17, legs: 10, shoes: 4, arm: 7, k: 2, item: 'laptop', clothes: 'polo', margin: 3 },
  /** Boss 2: Multifunksjonsmonsteret (the multifunction monster) – a big printer on small legs (drawn separately). */
  printerBoss: { w: 64, h: 64, rx: 0, ry: 0, kb: 52, kh: 34, legs: 7, shoes: 3, arm: 0, k: 2, item: 'none', clothes: 'none', margin: 3 },
};

/** Extra frames for the bosses (after the normal walk/flash/happy frames): attack poses and the disappointed look. */
export const POSE = { point: 0, clap: 1, raise: 2, sad: 3, crossed: 4, count: 5 };

/** The order of the frames in each sprite sheet. */
export const TILE = { walk: 0, blink: 4, happy: 8, left: 9, count: 18 };

/** Anchor point (middle of the body) for each type. */
export function anchor(type) {
  const T = TYPES[type];
  const bottom = T.h - T.margin;
  const legsTop = bottom - T.shoes - T.legs + 1;
  return { ax: T.w / 2, ay: legsTop - Math.floor(T.kh / 2) };
}

// ---------- Variants ----------

/**
 * @typedef {Object} Variant
 * @property {number} skin 0–6
 * @property {string} age 'young' | 'medium' | 'older'
 * @property {string} style hairstyle
 * @property {string} hair hair color
 * @property {number} height −1, 0, 1
 * @property {number} width −1, 0, 1
 * @property {boolean} glasses
 * @property {string} beard 'none' | 'beard' | 'moustache'
 * @property {boolean} earrings
 * @property {boolean} skirt
 * @property {string} neck 'none' | 'tie' | 'scarf'
 * @property {string} clothes
 * @property {string} pants
 * @property {string} shirt
 * @property {string} accent
 * @property {string} hijab
 * @property {boolean} sweat
 */

/** Original type names, used only in the appearance seed. */
const LEGACY_SEED_NAMES = { urgent: 'hastesak', sender: 'avsender', player: 'spiller' };

/** Makes a fixed table of variants for a type. All properties are distributed evenly and shuffled. */
function makeVariants(type, n) {
  // The seed keeps the original (Norwegian) type names so every lawyer looks exactly as before.
  const rng = new Rng('figurer|' + (LEGACY_SEED_NAMES[type] ?? type));
  /** @template T @param {T[]} values @returns {T[]} */
  const evenly = (values) => {
    const a = [];
    for (let i = 0; i < n; i++) a.push(values[i % values.length]);
    for (let i = a.length - 1; i > 0; i--) {
      const j = rng.integer(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const skin = evenly([0, 1, 2, 3, 4, 5, 6]);
  const age = evenly(['young', 'medium', 'older']);
  const style = evenly(STYLES);
  const youngHair = evenly(['black', 'brown', 'blond', 'red', 'black', 'brown']);
  const oldHair = evenly(['gray', 'white']);
  const height = evenly([-1, 0, 1]);
  const width = evenly([-1, 0, 1]);
  const glasses = evenly([true, false, false]);
  const beard = evenly(['beard', 'moustache', 'none', 'none']);
  const earrings = evenly([true, false, false]);
  const skirt = evenly([true, false, false]);
  const neck = type === 'sender' ? evenly(['none', 'none', 'scarf']) : type === 'junior' ? evenly(['tie', 'scarf', 'none', 'none']) : type === 'printer' ? evenly(['scarf', 'none', 'none']) : evenly(['tie', 'tie', 'scarf']);
  const clothes = evenly(CLOTHES[type] ?? CLOTHES.senior);
  const pants = evenly(PANTS);
  const shirt = evenly(SHIRTS);
  const accent = evenly(ACCENTS);
  const hijab = evenly(HIJAB_COLORS);
  const sweat = evenly([true, false]);
  /** @type {Variant[]} */
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = style[i];
    const ok = BEARD_OK.includes(s);
    out.push({
      skin: skin[i], age: age[i], style: s,
      hair: age[i] === 'older' ? oldHair[i] : youngHair[i],
      height: height[i], width: width[i], glasses: glasses[i],
      beard: ok ? beard[i] : 'none',
      earrings: s !== 'hijab' && earrings[i],
      skirt: !(ok && beard[i] !== 'none') && skirt[i] && type !== 'boss',
      neck: neck[i], clothes: clothes[i], pants: type === 'senior' || type === 'boss' || type === 'urgent' ? clothes[i] : pants[i],
      shirt: shirt[i], accent: accent[i], hijab: hijab[i],
      sweat: type === 'boss' || type === 'urgent' || sweat[i],
    });
  }
  return out;
}

/**
 * The four playable characters (the IT department), drawn from photos of real colleagues.
 * Only the looks are here – name, title, starting weapon and bonus are in config.js (CONFIG.characters).
 * The order is the same as in config.js.
 * skinHex/hair can be custom colors to match the person as closely as possible.
 */
const COMMON = { age: 'young', height: 0, width: 0, glasses: false, beard: 'none', earrings: false, skirt: false, hijab: '#000000', sweat: false, accent: '#1b1b1f' };
export const PLAYERS = /** @type {(Variant & {clothesStyle: string, skinHex: string, belt: string, shoes: string, pink?: boolean})[]} */ ([
  // 1: brown, tousled hair with a fringe, dark navy shirt, black tie, black belt, dark pants, watch
  { ...COMMON, skin: 1, skinHex: '#f2cdb0', style: 'fringe', hair: '#6e4a2e', neck: 'tie', clothesStyle: 'shirt', clothes: '#1f2a4a', shirt: '#1f2a4a', pants: '#1c1d24', belt: '#141416', shoes: '#141416' },
  // 2: light, slicked-back hair, gray-green pinstripe jacket over white shirt without a tie, brown belt
  { ...COMMON, skin: 0, skinHex: '#f3d0b8', style: 'slickedBack', hair: '#c9a15a', neck: 'none', clothesStyle: 'openSuit', clothes: '#8a9283', shirt: '#f6f6f4', pants: '#8a9283', belt: '#6e3b24', shoes: '#4a2e1e' },
  // 3: black hair with a middle part, brown cable-knit sweater, dark jeans, rings
  { ...COMMON, skin: 1, skinHex: '#efc9a6', style: 'middlePart', hair: '#1c1a1b', neck: 'none', clothesStyle: 'sweater', clothes: '#4a3326', shirt: '#4a3326', pants: '#2a2d35', belt: '#2a2d35', shoes: '#1d1d22' },
  // 4: auburn, wavy hair, white shirt over white t-shirt, gold chain, bracelet, pink cheeks
  { ...COMMON, skin: 0, skinHex: '#f6d2bf', style: 'waves', hair: '#8e5638', neck: 'none', clothesStyle: 'openShirt', clothes: '#f4f4f1', shirt: '#ffffff', pants: '#1c1d24', belt: '#1c1d24', shoes: '#1d1d22', pink: true },
]);

/**
 * The final boss Johan, drawn from a photo in the same style as the playable characters:
 * short light-brown hair combed up and back, fair skin, no glasses or beard, charcoal suit jacket
 * over a royal-blue shirt with an open collar, dark gray trousers. Variant 1 = jacket off (second phase).
 */
const JOHAN_BASE = { ...COMMON, age: 'medium', skin: 1, skinHex: '#efc4a5', style: 'johan', hair: '#7d5c40', neck: 'none', shirt: '#2f50b0', pants: '#45474d', belt: '#141418', shoes: '#18181c' };
export const JOHAN = /** @type {(Variant & {clothesStyle: string, skinHex: string, belt: string, shoes: string})[]} */ ([
  { ...JOHAN_BASE, clothesStyle: 'blazer', clothes: '#4b4e55' },
  { ...JOHAN_BASE, clothesStyle: 'blueShirt', clothes: '#2f50b0' },
]);

/**
 * Boss 1, the Nørdic consultant: an invented IT supplier («Nørdic», a pun on «nørd», nerd) with its own simple logo
 * – a pair of curly brackets around an «N» – in forest green and lime. Short dark hair, stubble, headset.
 */
export const NORDIC = /** @type {(Variant & {skinHex: string, belt: string, shoes: string})[]} */ ([
  { ...COMMON, skin: 2, skinHex: '#e3b08c', style: 'short', hair: '#3a2a20', beard: 'beard', neck: 'none', clothes: '#24573f', shirt: '#24573f', accent: '#b7e34a', pants: '#3a3d44', belt: '#1d1d22', shoes: '#25252b' },
]);

/** Boss 2 has no person to vary – one look. */
const PRINTER_BOSS = /** @type {any[]} */ ([{ ...COMMON, skin: 0, style: 'bald', hair: 'black', neck: 'none', clothes: '#d9dde3', shirt: '#93d6a4', accent: '#3a4350', pants: '#2b2f38' }]);

/** Tiny 3 × 5 letters for logos and the printer display. */
const TINY = {
  N: '#.# ### ### ### #.#', Ø: '.## #.# ### #.# ##.', R: '##. #.# ##. #.# #.#', D: '##. #.# #.# #.# ##.', I: '### .#. .#. .#. ###',
  C: '.## #.. #.. #.. .##', S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.', O: '.#. #.# #.# #.# .#.', P: '##. #.# ##. #.. #..',
  '{': '.## .#. #.. .#. .##', '}': '##. .#. ..# .#. ##.', '!': '.#. .#. .#. ... .#.', ':': '... .#. ... .#. ...', '(': '..# .#. .#. .#. ..#', ')': '#.. .#. .#. .#. #..',
};
function tinyText(r, text, x, y, c) {
  for (const ch of text) {
    const g = TINY[ch];
    if (g) r.stamp(g, x, y, { '#': c });
    x += 4;
  }
}

function palette(v, type) {
  /** @type {(number[] | null)[]} */
  const p = new Array(48).fill(null);
  const set = (i, color) => {
    const r = ramp(color);
    p[i] = r[0];
    p[i + 1] = r[1];
    p[i + 2] = r[2];
  };
  set(I.SKIN, v.skinHex ?? SKIN_COLORS[v.skin]);
  set(I.HAIR, HAIR_COLORS[v.hair] ?? v.hair);
  set(I.KL, v.clothes);
  set(I.SHIRT, v.shirt);
  set(I.ACC, v.accent);
  set(I.BELLY, v.pants);
  set(I.SHOES, v.shoes ?? '#2b2220');
  set(I.BELT, v.belt ?? '#2b2220');
  if (type === 'junior' || type === 'sender') set(I.ITEM, '#c3c9d2');
  else if (type === 'printer') set(I.ITEM, '#ffffff');
  else if (type === 'player') set(I.ITEM, '#cfd5dc');
  else if (type === 'printerBoss') set(I.ITEM, '#f6f6f0');
  else if (type === 'nordic') set(I.ITEM, '#b58a57');
  else set(I.ITEM, type === 'urgent' ? '#5a3a1e' : '#6e4325');
  set(I.HIJ, v.hijab);
  p[I.OUT] = hex(type === 'urgent' ? '#5a3a00' : '#1d1626');
  p[I.EYE] = hex('#1d1626');
  p[I.MOUTH] = hex('#7a2430');
  p[I.WHITE] = hex('#ffffff');
  p[I.GLASSES] = hex(v.skin >= 5 ? '#d9c27a' : '#2a2a35');
  p[I.GOLD] = hex('#f5cf3a');
  p[I.BLUSH] = hex('#ef7f8e');
  p[I.SWEAT] = hex('#8fd3ff');
  p[I.OUT_LIGHT] = hex('#f2fffb');
  p[I.GRAY] = hex('#9aa3ad');
  p[I.GREEN] = hex('#2fd06a');
  p[I.SCREEN] = hex('#8fd3ff');
  p[I.PURPLE] = hex('#c06bd8');
  p[I.BLUE] = hex('#3aa0ff');
  if (type === 'printerBoss') {
    // the cartridge lamps: cyan, magenta, yellow, black
    p[I.BLUE] = hex('#19b5c9');
    p[I.PURPLE] = hex('#e0409a');
    p[I.MOUTH] = hex('#e5484d');
  }
  return p;
}

// ---------- Drawing a single figure ----------

const inE = (x, y, cx, cy, rx, ry) => {
  const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
  return nx * nx + ny * ny <= 1;
};

/**
 * Draws one figure in one frame.
 * @param {keyof typeof TYPES} type
 * @param {Variant} v
 * @param {number} frame 0–3 walk cycle, 4 = happy (thumbs up), 5 + POSE.x = a boss pose (standing still)
 * @param {boolean} [mirror] facing left – the figure is mirrored, but text (logos) is still drawn the right way round
 */
function drawFigure(type, v, frame, mirror = false) {
  const T = TYPES[type];
  const r = new Raster(T.w, T.h);
  /** Text that is stamped on after an eventual mirroring. @type {[string, number, number, number][]} */
  const texts = [];
  const k = T.k;
  const happy = frame === 4;
  const pose = frame >= 5 ? frame - 5 : -1;
  const still = happy || pose >= 0;
  const older = v.age === 'older';
  const legOff = still ? 0 : [0, 1, 0, -1][frame];
  const bob = still || older ? 0 : [0, -1, 0, -1][frame] * (k > 1 ? 2 : 1);
  const arm = still ? 0 : [0, -1, 0, 1][frame] * k;
  /** Friendly face (the playable characters and Johan) instead of a frustrated lawyer. */
  const friendly = (type === 'player' || type === 'johan' || type === 'nordic') && pose !== POSE.sad;

  const bottom = T.h - T.margin;
  const legs = T.legs + v.height;
  const legsTop = bottom - T.shoes - legs + 1;
  const kb = T.kb + v.width * 2;
  const kTop = legsTop - T.kh + bob;
  const kV = T.w / 2 - kb / 2, kH = T.w / 2 + kb / 2; // body from kV to kH-1
  const cx = T.w / 2, cy = kTop - T.ry + 2 + (older ? 1 : 0);
  const rx = T.rx, ry = T.ry;
  const H = I.HAIR;

  /** Hair with simple shading. */
  const hairPx = (x, y) => {
    const rightSide = x + 0.5 > cx + rx * 0.35;
    const top = y + 0.5 < cy - ry * 0.75 && x + 0.5 < cx - rx * 0.05 && x + 0.5 > cx - rx * 0.7;
    r.px(x, y, top ? H + 2 : rightSide ? H + 1 : H);
  };
  const hairArea = (pred, x0, y0, x1, y1) => {
    for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) if (pred(x, y)) hairPx(x, y);
  };
  /** Lock of hair at the top of the head (cut = how far down the fringe goes), with sides down to «sides». */
  const cap = (cut, sides, extra = 1) => {
    hairArea((x, y) => {
      if (!inE(x, y, cx, cy, rx + extra, ry + extra)) return false;
      if (y + 0.5 <= cy - ry * cut) return true;
      return Math.abs(x + 0.5 - cx) >= rx - 1.2 * k && y + 0.5 <= cy + sides;
    }, cx - rx - 2, cy - ry - 2, cx + rx + 2, cy + ry);
  };
  /** Face pixel in «face units» (scaled by k). */
  const f = (x, y, c) => r.rect(cx + x * k, cy + y * k, k, k, c);

  // 1. Hair behind the head
  if (v.style === 'long') {
    hairArea((x, y) => x >= cx - rx - 1 && x < cx + rx + 1 && y >= cy - 1 && y <= cy + ry + Math.round(ry * 0.9), cx - rx - 1, cy - 1, cx + rx + 1, cy + 2 * ry);
  } else if (v.style === 'afro') {
    hairArea((x, y) => inE(x, y, cx, cy - ry * 0.3, rx + 3 * k, ry + 2 * k), cx - rx - 4 * k, cy - 2 * ry, cx + rx + 4 * k, cy + ry);
  } else if (v.style === 'ponytail') {
    hairArea((x, y) => inE(x, y, cx + rx + 1 * k, cy + 1 * k, 2 * k, 4 * k), cx + rx - 2 * k, cy - 4 * k, cx + rx + 4 * k, cy + 6 * k);
    r.rect(cx + rx - 1 * k, cy - 3 * k, 2 * k, k, I.ACC);
  } else if (v.style === 'bun') {
    hairArea((x, y) => inE(x, y, cx, cy - ry - 0.5 * k, 3 * k, 2.5 * k), cx - 4 * k, cy - ry - 4 * k, cx + 4 * k, cy - ry + 2 * k);
  }

  // 2. Legs and shoes (or skirt)
  const bb = Math.max(2, Math.floor(kb * 0.3));
  const lLeg = Math.floor(kV + 1), rLeg = Math.ceil(kH - 1 - bb);
  const drawLegs = (x, off) => {
    const lengthPx = legs + off;
    const color = v.skirt ? I.BELLY + 1 : I.BELLY;
    r.rect(x, legsTop, bb, lengthPx - (off < 0 ? 0 : 0), color);
    r.rect(x + bb - 1, legsTop, 1, lengthPx, color + (v.skirt ? 0 : 1));
    const shoesY = legsTop + lengthPx;
    r.rect(x - (x < cx ? 1 : 0), shoesY, bb + 1, T.shoes, I.SHOES);
    r.rect(x - (x < cx ? 1 : 0), shoesY, bb + 1, 1, I.SHOES + 2);
  };
  drawLegs(lLeg, Math.min(0, legOff) === legOff ? legOff : legOff);
  drawLegs(rLeg, -legOff);
  if (v.skirt) {
    const sh = Math.round(legs * 0.55);
    for (let y = 0; y < sh; y++) r.rect(kV - Math.floor(y / 2), legsTop + y, kb + Math.floor(y / 2) * 2, 1, y === sh - 1 ? I.BELLY + 1 : I.BELLY);
  } else {
    r.rect(kV + 1, legsTop, kb - 2, 1, I.BELLY);
  }

  // 3. Body and clothes
  const body = type === 'junior' ? I.SHIRT : I.KL;
  const bodyColor = type === 'junior' ? (x) => (x === Math.floor(kH - 1) ? I.KL + 1 : x === Math.floor(kV) ? I.KL + 2 : I.KL) : (x) => (x >= kH - 2 ? I.KL + 1 : x === Math.floor(kV) ? I.KL + 2 : I.KL);
  for (let y = kTop; y < legsTop + 1; y++) {
    for (let x = Math.floor(kV); x < kH; x++) {
      const corner = y === kTop && (x === Math.floor(kV) || x === Math.floor(kH - 1));
      if (corner) continue;
      r.px(x, y, y === legsTop ? I.KL + 1 : bodyColor(x));
    }
  }
  void body;
  if (T.clothes === 'dress') {
    // jacket lapels (V) with shirt
    const vh = Math.round(T.kh * 0.5);
    for (let y = 0; y < vh; y++) {
      const b = Math.max(0, Math.round((vh - y) * (k > 1 ? 1.6 : 1)));
      if (b > 0) r.rect(cx - b / 2, kTop + y, b, 1, I.SHIRT);
    }
    r.px(cx - 1, kTop + vh + 1, I.KL + 1);
    r.px(cx - 1, kTop + vh + 3, I.KL + 1);
    if (k > 1) {
      r.rect(cx - 1, kTop + vh + 2, 2, 2, I.KL + 1);
      r.rect(cx - 1, kTop + vh + 6, 2, 2, I.KL + 1);
    }
  } else if (T.clothes === 'cardigan') {
    r.rect(cx - 1, kTop, 2, T.kh, I.SHIRT);
    r.px(cx + 1, kTop + 3, I.KL + 1);
    r.px(cx + 1, kTop + 6, I.KL + 1);
  } else if (T.clothes === 'shirt') {
    // shirt (uses the clothes color) with collar and button row
    r.px(cx - 2, kTop, I.SHIRT + 2);
    r.px(cx + 1, kTop, I.SHIRT + 2);
    r.px(cx - 1, kTop, I.SKIN);
    r.px(cx, kTop, I.SKIN);
    r.px(cx - 1, kTop + 3, I.KL + 1);
    r.px(cx - 1, kTop + 5, I.KL + 1);
  } else if (T.clothes === 'sweater') {
    // sweater with round neck
    r.rect(cx - 2, kTop, 4, 1, I.KL + 1);
  } else if (T.clothes === 'hoodie') {
    // The playable characters: the clothes follow the photos
    const style = /** @type {any} */ (v).clothesStyle;
    const beltY = legsTop - 1;
    if (style === 'shirt') {
      // dark shirt with collar and button row
      r.px(cx - 2, kTop, I.KL + 2);
      r.px(cx + 1, kTop, I.KL + 2);
      for (let y = kTop + 3; y < beltY; y += 2) r.px(cx + 1, y, I.KL + 2);
    } else if (style === 'openSuit') {
      // open jacket over white shirt without a tie
      for (let y = kTop; y < beltY; y++) {
        const b = y - kTop < 4 ? 4 - Math.floor((y - kTop) / 2) : 2;
        r.rect(cx - b / 2 - 1, y, b + 2, 1, I.SHIRT);
      }
      r.px(cx - 3, kTop, I.SHIRT + 2);
      r.px(cx + 2, kTop, I.SHIRT + 2);
      r.rect(cx - 3, kTop + 1, 1, 4, I.KL + 2);
      r.rect(cx + 2, kTop + 1, 1, 4, I.KL + 1);
      r.px(cx - 4, kTop + T.kh - 3, I.KL + 1);
    } else if (style === 'sweater') {
      // cable-knit sweater: round neck and braids
      r.rect(cx - 2, kTop, 4, 1, I.KL + 1);
      for (let y = kTop + 1; y < beltY + 1; y++) {
        for (const x of [Math.floor(kV) + 2, cx - 1, Math.ceil(kH) - 3]) r.px(x + ((y >> 1) & 1), y, I.KL + 2);
      }
      r.rect(kV, beltY, kb, 2, I.KL + 1);
    } else if (style === 'openShirt') {
      // white shirt open over white t-shirt, gold chain
      r.rect(cx - 2, kTop, 4, T.kh - 1, I.SHIRT);
      r.rect(cx - 3, kTop, 1, 3, I.KL + 1);
      r.rect(cx + 2, kTop, 1, 3, I.KL + 1);
      r.px(cx - 2, kTop + 1, I.GOLD);
      r.px(cx - 1, kTop + 2, I.GOLD);
      r.px(cx, kTop + 2, I.GOLD);
      r.px(cx + 1, kTop + 1, I.GOLD);
    }
    // belt
    if (style !== 'sweater') {
      r.rect(kV, beltY, kb, 1, I.BELT);
      r.px(cx - 1, beltY, I.GRAY);
    }
  } else if (T.clothes === 'polo') {
    // The Nørdic consultant's polo shirt: collar, button placket, own logo «{N}» and the name across the chest
    r.rect(cx - 6, kTop, 4, 2, I.KL + 2);
    r.rect(cx + 2, kTop, 4, 2, I.KL + 1);
    r.rect(cx - 2, kTop, 4, 1, I.SKIN);
    r.rect(cx - 1, kTop + 1, 2, 5, I.KL + 1);
    r.px(cx - 1, kTop + 2, I.ACC);
    r.px(cx - 1, kTop + 4, I.ACC);
    texts.push(['{N}', kV + 3, kTop + 2, I.ACC], ['NØRDIC', cx - 12, kTop + 9, I.ACC]);
    r.rect(kV, legsTop - 1, kb, 2, I.KL + 1);
  } else if (T.clothes === 'blazer') {
    // Johan: open charcoal jacket over a royal-blue shirt with an open collar (or the shirt alone in phase 2)
    const style = /** @type {any} */ (v).clothesStyle;
    const beltY = legsTop - 2;
    if (style === 'blazer') {
      // the shirt shows in a V between the lapels
      for (let y = kTop; y < beltY; y++) {
        const d = y - kTop;
        const b = d < 10 ? 10 - Math.floor(d / 2) * 2 + 2 : 4;
        r.rect(cx - b / 2, y, b, 1, d < 2 ? I.SHIRT + 2 : I.SHIRT);
      }
      // lapels (lighter edge) and the shadowed inside of the jacket
      for (let i = 0; i < 10; i++) {
        r.px(cx - 7 + Math.floor(i / 2), kTop + i, I.KL + 2);
        r.px(cx + 6 - Math.floor(i / 2), kTop + i, I.KL + 1);
      }
      // jacket buttons and a breast pocket
      r.rect(cx + 2, kTop + 11, 2, 2, I.OUT);
      r.rect(cx + 2, kTop + 14, 2, 1, I.OUT);
      r.rect(kV + 3, kTop + 7, 5, 1, I.KL + 1);
      // pocket flaps at the hips
      r.rect(kV + 2, beltY - 3, 6, 1, I.KL + 1);
      r.rect(kH - 8, beltY - 3, 6, 1, I.KL + 1);
    } else {
      // shirt with collar, buttons and a darker crease
      for (let y = kTop + 3; y < beltY; y += 3) r.px(cx, y, I.KL + 2);
      r.rect(cx + 1, kTop + 2, 1, beltY - kTop - 2, I.KL + 1);
      r.rect(kV + 1, beltY, kb - 2, 2, I.BELLY);
      r.rect(kV + 1, beltY, kb - 2, 1, I.BELT);
      r.rect(cx - 1, beltY, 2, 1, I.GRAY);
    }
    // open collar: shirt collar points and a bit of neck
    r.rect(cx - 5, kTop, 3, 2, I.SHIRT + 2);
    r.rect(cx + 2, kTop, 3, 2, I.SHIRT + 2);
    r.rect(cx - 2, kTop, 4, 2, I.SKIN);
    r.rect(cx - 1, kTop + 2, 2, 1, I.SKIN + 1);
  }
  // Tie or scarf
  if (v.neck === 'tie') {
    const lengthPx = Math.round(T.kh * 0.6);
    r.rect(cx - k, kTop, 2 * k, k, I.ACC + 1);
    r.rect(cx - k, kTop + k, 2 * k, lengthPx - k, I.ACC);
    r.rect(cx, kTop + k, k, lengthPx - k, I.ACC + 1);
  } else if (v.neck === 'scarf') {
    r.rect(kV + 1, kTop, kb - 2, 2 * k, I.ACC);
    r.rect(kV + 1, kTop + k, kb - 2, k, I.ACC + 1);
    r.rect(kV + 2 * k, kTop + 2 * k, 2 * k, 3 * k, I.ACC);
    r.rect(kV + 3 * k, kTop + 2 * k, k, 3 * k, I.ACC + 1);
  }

  // 4. Arms and things in the hands
  const ab = T.arm;
  const armLength = T.kh - 1;
  const hand = 2 * k;
  const sleeveColor = I.KL;
  const drawArm = (x, dy) => {
    const y0 = kTop + 1;
    r.rect(x, y0, ab, armLength - hand + dy, sleeveColor);
    r.rect(x + ab - 1, y0, 1, armLength - hand + dy, sleeveColor + 1);
    r.rect(x, y0 + armLength - hand + dy, ab, hand, I.SKIN);
    r.rect(x + ab - 1, y0 + armLength - hand + dy, 1, hand, I.SKIN + 1);
    return y0 + armLength + dy;
  };
  const lArmX = Math.floor(kV) - ab, rArmX = Math.ceil(kH);
  if (T.item === 'laptop' && pose < 0) {
    // laptop under right arm
    const ly = kTop + 3 * k;
    r.rect(rArmX - 3 * k, ly, ab + 6 * k, 2 * k, I.ITEM);
    r.rect(rArmX - 3 * k, ly, ab + 6 * k, k, I.ITEM + 2);
    r.rect(rArmX - 3 * k, ly + 2 * k, ab + 6 * k, 1, I.ITEM + 1);
  }
  /** Sleeve (with shadow on the right edge) and a hand at the end. */
  const sleeve = (x, y, w, h) => {
    r.rect(x, y, w, h, sleeveColor);
    r.rect(x + w - 1, y, 1, h, sleeveColor + 1);
  };
  const handAt = (x, y) => {
    r.rect(x, y, hand, hand, I.SKIN);
    r.rect(x + hand - 1, y, 1, hand, I.SKIN + 1);
  };
  let rHandBottom = 0;
  if (type === 'nordic' && pose === POSE.raise) {
    // hand on the headset («Du er nummer 47 i køen»)
    drawArm(lArmX, 0);
    sleeve(rArmX, cy + 4, ab, kTop - cy - 3);
    handAt(rArmX - 2, cy - 1);
    rHandBottom = kTop;
  } else if (type === 'nordic' && pose === POSE.point) {
    // lifts the ticket box up to the chin («Saken er sendt videre»)
    const by = kTop - 3;
    sleeve(lArmX, kTop + 1, ab, 6);
    sleeve(rArmX, kTop + 1, ab, 6);
    r.rect(cx - 12, by, 24, 11, I.ITEM);
    r.rect(cx - 12, by, 24, 2, I.ITEM + 2);
    r.rect(cx + 10, by, 2, 11, I.ITEM + 1);
    r.rect(cx - 7, by + 4, 14, 4, I.GOLD);
    r.rect(cx - 5, by + 5, 10, 1, I.OUT);
    handAt(cx - 14, by + 4);
    handAt(cx + 10, by + 4);
    rHandBottom = by + 11;
  } else if (type === 'nordic' && pose === POSE.clap) {
    // takes the headset off and holds it out («Vi ringer deg tilbake»)
    drawArm(lArmX, 0);
    sleeve(rArmX, kTop + 2, 12, ab - 1);
    handAt(rArmX + 12, kTop + 2);
    r.rect(rArmX + 11, kTop - 8, 2, 10, I.GRAY);
    r.rect(rArmX + 18, kTop - 8, 2, 10, I.GRAY);
    r.rect(rArmX + 11, kTop - 9, 9, 2, I.GRAY);
    r.rect(rArmX + 9, kTop - 2, 4, 5, I.EYE);
    r.rect(rArmX + 18, kTop - 2, 4, 5, I.EYE);
    rHandBottom = kTop + 2 + ab;
  } else if (pose === POSE.crossed || pose === POSE.sad) {
    // arms crossed over the chest: upper arms down the sides, forearms across
    const by = kTop + Math.round(T.kh * 0.4);
    sleeve(lArmX, kTop + 1, ab, by - kTop + ab - 1);
    sleeve(rArmX, kTop + 1, ab, by - kTop + ab - 1);
    sleeve(lArmX + 1, by + 2, rArmX - lArmX + ab - 2, ab - 1);
    sleeve(lArmX + 2, by, rArmX - lArmX - 4, ab - 2);
    r.rect(lArmX + 2, by + ab - 2, rArmX - lArmX - 4, 1, sleeveColor + 1);
    handAt(lArmX + ab, by - 1);
    handAt(rArmX - hand, by + 2);
    rHandBottom = by + ab;
  } else if (pose === POSE.clap) {
    // hands together in front of the chest
    const hy = kTop + Math.round(T.kh * 0.45);
    sleeve(lArmX, kTop + 1, ab, hy - kTop);
    sleeve(rArmX, kTop + 1, ab, hy - kTop);
    sleeve(lArmX + ab - 1, hy - 1, cx - lArmX - ab, ab - 2);
    sleeve(cx + 1, hy - 1, rArmX - cx, ab - 2);
    r.rect(cx - hand, hy - hand, 2 * hand, hand + 2, I.SKIN);
    r.rect(cx, hy - hand, 1, hand + 2, I.SKIN + 1);
    rHandBottom = hy + 2;
  } else if (pose === POSE.point) {
    // left arm down, right arm straight out with a pointing finger
    drawArm(lArmX, 0);
    const py = kTop + 2;
    sleeve(rArmX, py, 14, ab - 1);
    handAt(rArmX + 14, py);
    r.rect(rArmX + 14 + hand, py, 2 * k, k, I.SKIN);
    rHandBottom = py + ab;
  } else if (pose === POSE.raise) {
    // right arm raised above the head (holding up the calendar)
    drawArm(lArmX, 0);
    const top = kTop - 18;
    sleeve(rArmX, top + hand, ab, kTop - top);
    handAt(rArmX + 1, top);
    rHandBottom = top + hand;
  } else {
    if (!happy) drawArm(lArmX, arm);
    rHandBottom = drawArm(rArmX, -arm);
  }
  if (T.item === 'folder') {
    const mb = 6 * k, mh = 5 * k;
    const mx = rArmX + Math.floor(ab / 2) - Math.floor(mb / 2), my = rHandBottom + k;
    r.rect(mx + 2 * k, my - k, mb - 4 * k, k, I.ITEM + 1);
    r.rect(mx, my, mb, mh, I.ITEM);
    r.rect(mx, my, mb, k, I.ITEM + 2);
    r.rect(mx, my + mh - k, mb, k, I.ITEM + 1);
    r.rect(mx + mb / 2 - k / 2, my + k, k, k, I.GOLD);
  } else if (T.item === 'paper') {
    // stack of papers in front of the body, held with both hands
    const py = kTop + T.kh - 6;
    for (let i = 0; i < 3; i++) r.rect(kV + 1 + (i % 2), py + i, kb - 3, 1, I.ITEM);
    r.rect(kV + 1, py + 3, kb - 2, 3, I.ITEM);
    r.rect(kV + 2, py + 4, kb - 5, 1, I.GRAY);
    r.rect(kV + 1, py + 6, kb - 2, 1, I.ITEM + 1);
    r.rect(kV, py + 3, 2, 2, I.SKIN);
    r.rect(kH - 2, py + 3, 2, 2, I.SKIN);
  } else if (T.item === 'can') {
    // energy drink in right hand
    const bx = rArmX, by = rHandBottom - 4;
    r.rect(bx, by, 3, 6, I.GREEN);
    r.rect(bx, by, 3, 1, I.ITEM);
    r.rect(bx + 2, by + 1, 1, 5, I.ITEM + 1);
    r.px(bx + 1, by + 3, I.GOLD);
    const style = /** @type {any} */ (v).clothesStyle;
    // watch, rings and bracelet on left hand
    const vh = kTop + 1 + armLength - hand + arm;
    if (style === 'shirt' || style === 'openShirt') r.rect(lArmX, vh - 1, ab, 1, I.GOLD);
    if (style === 'openShirt') {
      r.px(lArmX, vh - 2, I.BLUSH);
      r.px(lArmX + 1, vh - 2, I.BLUE);
      r.px(lArmX + 2, vh - 2, I.ACC);
    }
    if (style === 'sweater') {
      r.px(lArmX + 1, vh + 1, I.GOLD);
      r.px(rArmX + 1, rHandBottom - 1, I.GOLD);
    }
  } else if (T.item === 'openLaptop') {
    // open laptop held in front of the chest (the lid faces us)
    const ly = kTop + 1;
    r.rect(cx - 6, ly, 12, 7, I.ITEM);
    r.rect(cx - 6, ly, 12, 1, I.ITEM + 2);
    r.rect(cx + 5, ly + 1, 1, 6, I.ITEM + 1);
    r.rect(cx - 6, ly + 7, 12, 1, I.ITEM + 1);
    r.rect(cx - 1, ly + 3, 2, 2, I.PURPLE);
    r.rect(cx - 7, ly + 5, 2, 2, I.SKIN);
    r.rect(cx + 5, ly + 5, 2, 2, I.SKIN);
  }

  // 5. Head (Johan: softer shading, since the head is drawn at double size)
  if (type === 'johan') r.ellipse(cx, cy, rx, ry, I.SKIN, (nx, ny) => (nx * 0.6 + ny * 0.8 > 0.78 ? I.SKIN + 1 : nx * 0.6 + ny * 0.8 < -0.7 ? I.SKIN + 2 : I.SKIN));
  else r.ball(cx, cy, rx, ry, I.SKIN, I.SKIN + 1, I.SKIN + 2);
  if (v.style === 'hijab') {
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++) {
      for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
        if (!inE(x, y, cx, cy + 0.5 * k, rx + 1.5, ry + 1.5)) continue;
        const opening = inE(x, y, cx, cy + 1 * k, rx - 1.3 * k, ry - 0.6 * k) && y + 0.5 >= cy - ry * 0.45;
        if (!opening) r.px(x, y, x + 0.5 > cx + rx * 0.4 ? I.HIJ + 1 : y + 0.5 < cy - ry * 0.6 && x + 0.5 < cx ? I.HIJ + 2 : I.HIJ);
      }
    }
    r.rect(kV - 1, kTop, kb + 2, 3 * k, I.HIJ);
    r.rect(kH - 1, kTop, 2, 3 * k, I.HIJ + 1);
  }

  // 6. Beard
  if (v.beard === 'beard') {
    for (let y = cy; y <= cy + ry + 1; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      if (inE(x, y, cx, cy, rx, ry + 0.8 * k) && y + 0.5 >= cy + ry * 0.25 && Math.abs(x + 0.5 - cx) <= rx - 0.5) hairPx(x, y);
    }
  }

  // 7. Face
  const ex = Math.round((rx / k) * 0.45);
  const eyeL = -ex, eyeR = ex - 1;
  if (type === 'player' || !happy) {
    f(eyeL, 0, I.EYE);
    f(eyeL, 1, I.EYE);
    f(eyeR, 0, I.EYE);
    f(eyeR, 1, I.EYE);
    if (k > 1) {
      r.px(cx + eyeL * k, cy, I.WHITE);
      r.px(cx + eyeR * k, cy, I.WHITE);
    }
  }
  if (type === 'player' && /** @type {any} */ (v).portrait?.smile === 'grin') {
    // broad smile with teeth
    f(-2, 3, I.MOUTH);
    f(-1, 3, I.WHITE);
    f(0, 3, I.WHITE);
    f(1, 3, I.MOUTH);
    f(-1, 4, I.MOUTH);
    f(0, 4, I.MOUTH);
  } else if ((type === 'johan' || type === 'nordic') && friendly && !happy) {
    // Johan: brows, a warm closed smile (thin line) and smile lines
    for (const ox of [eyeL, eyeR]) r.rect(cx + (ox - 1) * k + 1, cy - 2 * k, 3 * k - 1, 1, H + 1);
    r.px(cx - 4, cy + 5, I.MOUTH);
    r.rect(cx - 3, cy + 6, 6, 1, I.MOUTH);
    r.px(cx + 3, cy + 5, I.MOUTH);
    r.px(cx - 6, cy + 4, I.SKIN + 1);
    r.px(cx + 5, cy + 4, I.SKIN + 1);
  } else if (type === 'player' || (friendly && !happy)) {
    // friendly smile
    f(-2, 3, I.MOUTH);
    f(1, 3, I.MOUTH);
    f(-1, 4, I.MOUTH);
    f(0, 4, I.MOUTH);
  } else if (pose === POSE.sad) {
    // disappointed: brows raised in the middle, mouth turned down
    f(eyeL - 1, -2, I.EYE);
    f(eyeL, -3, I.EYE);
    f(eyeR + 1, -2, I.EYE);
    f(eyeR, -3, I.EYE);
    f(-1, 3, I.MOUTH);
    f(0, 3, I.MOUTH);
    f(-2, 4, I.MOUTH);
    f(1, 4, I.MOUTH);
  } else if (!happy) {
    // stressed and frustrated: furrowed brows and mouth corners down
    f(eyeL - 1, -3, I.EYE);
    f(eyeL, -2, I.EYE);
    f(eyeR + 1, -3, I.EYE);
    f(eyeR, -2, I.EYE);
    f(-1, 3, I.MOUTH);
    f(0, 3, I.MOUTH);
    f(-2, 4, I.MOUTH);
    f(1, 4, I.MOUTH);
    if (v.sweat) {
      r.rect(cx + rx - 1, cy - ry + 3 * k, k, 2 * k, I.SWEAT);
      r.rect(cx + rx - 1, cy - ry + 2 * k, k, k, I.WHITE);
    }
  } else {
    // happy: closed, smiling eyes, big smile and red cheeks
    f(eyeL, 0, I.EYE);
    f(eyeL - 1, 1, I.EYE);
    f(eyeL + 1, 1, I.EYE);
    f(eyeR, 0, I.EYE);
    f(eyeR - 1, 1, I.EYE);
    f(eyeR + 1, 1, I.EYE);
    f(-2, 3, I.MOUTH);
    f(-1, 3, I.WHITE);
    f(0, 3, I.WHITE);
    f(1, 3, I.MOUTH);
    f(-1, 4, I.MOUTH);
    f(0, 4, I.MOUTH);
    f(eyeL - 2, 2, I.BLUSH);
    f(eyeR + 2, 2, I.BLUSH);
  }
  if (v.beard === 'moustache') {
    f(-2, 2, H);
    f(-1, 2, H + 1);
    f(0, 2, H + 1);
    f(1, 2, H);
  }

  // 8. Hair in front
  switch (v.style) {
    case 'short': cap(0.35, -1); break;
    case 'bob': cap(0.3, ry * 0.6); break;
    case 'long': cap(0.3, ry); break;
    case 'ponytail': cap(0.35, -1); break;
    case 'bun': cap(0.4, -2); break;
    case 'curly':
      hairArea((x, y) => {
        const inside = inE(x, y, cx, cy, rx + 1.4, ry + 1.4) || (inE(x, y, cx, cy, rx + 2.4, ry + 2.4) && (x + y) % 3 === 0);
        if (!inside) return false;
        return y + 0.5 <= cy - ry * 0.2 || (Math.abs(x + 0.5 - cx) >= rx - 1.2 * k && y + 0.5 <= cy + 1);
      }, cx - rx - 3, cy - ry - 3, cx + rx + 3, cy + 2);
      for (let y = cy - ry - 2; y < cy; y += 2) for (let x = cx - rx; x < cx + rx; x += 3) if (r.get(x + (y % 4 === 0 ? 1 : 0), y) === H) r.px(x + (y % 4 === 0 ? 1 : 0), y, H + 1);
      break;
    case 'afro':
      cap(0.45, -1, 1.5);
      for (let y = cy - 2 * ry; y < cy + ry; y += 2) for (let x = cx - rx - 4 * k; x < cx + rx + 4 * k; x += 3) if (r.get(x + (y % 4 === 0 ? 1 : 0), y) === H) r.px(x + (y % 4 === 0 ? 1 : 0), y, H + 1);
      break;
    case 'braids': {
      cap(0.35, -1);
      r.rect(cx - 1, cy - ry - 1, 1, Math.round(ry * 0.5), H + 1);
      const top = cy - 1, lengthPx = ry + 3 * k;
      for (const x of [cx - rx - 1, cx + rx - 2 * k + 1]) {
        for (let y = 0; y < lengthPx; y++) r.rect(x, top + y, 2 * k, 1, Math.floor(y / (2 * k)) % 2 ? H + 1 : H);
        r.rect(x, top + lengthPx, 2 * k, k, I.ACC);
      }
      break;
    }
    case 'fringe':
      // tousled hair with a fringe down toward the brows
      cap(0.18, -1, 1.2);
      for (const [dx, dy] of [[-4, -1], [-1, -2], [2, -1], [4, 0]]) r.px(cx + dx, cy - ry - 1 + dy + 1, H);
      r.px(cx - 3, cy - 2, H + 1);
      r.px(cx + 1, cy - 2, H + 1);
      break;
    case 'slickedBack':
      // light hair with volume, swept back, short sides
      cap(0.5, -2, 1);
      hairArea((x, y) => inE(x, y, cx - 0.5, cy - ry + 0.5, rx * 0.85, 2.6), cx - rx, cy - ry - 3, cx + rx, cy - ry + 3);
      for (let x = cx - rx + 2; x < cx + rx - 2; x += 3) r.px(x, cy - ry, H + 2);
      break;
    case 'middlePart':
      // black hair with a middle part and a fringe falling to the sides
      cap(0.25, 0, 1.1);
      r.rect(cx - 1, cy - ry, 1, Math.round(ry * 0.6), I.SKIN + 1);
      r.px(cx, cy - ry + 1, H + 2);
      r.px(cx - 2, cy - ry + 1, H + 2);
      break;
    case 'waves':
      // auburn, wavy hair
      hairArea((x, y) => {
        const inside = inE(x, y, cx, cy, rx + 1.6, ry + 1.6) || (inE(x, y, cx, cy, rx + 2.3, ry + 2.3) && (x * 3 + y) % 4 === 0);
        if (!inside) return false;
        return y + 0.5 <= cy - ry * 0.3 || (Math.abs(x + 0.5 - cx) >= rx - 1.3 && y + 0.5 <= cy);
      }, cx - rx - 3, cy - ry - 3, cx + rx + 3, cy + 1);
      for (let y = cy - ry - 1; y < cy - 1; y += 2) for (let x = cx - rx; x < cx + rx; x += 3) if (r.get(x + ((y >> 1) & 1), y) === H) r.px(x + ((y >> 1) & 1), y, H + 2);
      break;
    case 'johan': {
      // short light-brown hair combed up and back, a little volume on top, slightly higher temples, short sides
      cap(0.45, -2 * k, 1);
      hairArea((x, y) => inE(x, y, cx - 0.5, cy - ry + 1.5, rx * 0.82, 3.2), cx - rx, cy - ry - 4, cx + rx, cy - ry + 4);
      // combed strands
      for (let i = 0; i < 6; i++) r.px(cx - rx + 5 + i * 3, cy - ry - 1 + (i % 2), H + 2);
      break;
    }
    case 'bald':
      for (let y = cy - 2 * k; y <= cy + 1; y++) for (let x = cx - rx; x < cx + rx; x++) {
        if (inE(x, y, cx, cy, rx + 0.6, ry) && Math.abs(x + 0.5 - cx) >= rx - 1.2 * k) hairPx(x, y);
      }
      r.rect(cx - Math.round(rx * 0.5), cy - ry + 1 * k, 2 * k, k, I.SKIN + 2);
      break;
    default:
      break;
  }

  // 9. Glasses and earrings
  if (v.glasses) {
    // Thin frame (1 pixel) around each eye, and a bridge between
    let lEdge = 0, rEdge = 0;
    for (const ox of [eyeL, eyeR]) {
      const x0 = cx + (ox - 1) * k, x1 = cx + (ox + 2) * k - 1;
      const y0 = cy - k, y1 = cy + 3 * k - 1;
      r.rect(x0, y0, x1 - x0 + 1, 1, I.GLASSES);
      r.rect(x0, y1, x1 - x0 + 1, 1, I.GLASSES);
      r.rect(x0, y0, 1, y1 - y0 + 1, I.GLASSES);
      r.rect(x1, y0, 1, y1 - y0 + 1, I.GLASSES);
      if (ox === eyeL) lEdge = x1;
      else rEdge = x0;
    }
    r.rect(lEdge, cy - k, rEdge - lEdge, 1, I.GLASSES);
  }
  if (v.earrings) {
    r.rect(cx - rx - (k > 1 ? 1 : 0), cy + 2 * k, k, k, I.GOLD);
    r.rect(cx + rx - 1, cy + 2 * k, k, k, I.GOLD);
  }
  // The Nørdic consultant's headset: band over the head, ear cups and a microphone toward the mouth
  if (type === 'nordic' && pose !== POSE.clap) {
    for (let x = cx - rx; x < cx + rx; x++) {
      const nx = (x + 0.5 - cx) / (rx + 0.5);
      r.px(x, Math.round(cy - Math.sqrt(Math.max(0, 1 - nx * nx)) * (ry + 1)), I.GRAY);
    }
    r.rect(cx - rx - 2, cy - 2, 4, 7, I.EYE);
    r.rect(cx - rx - 1, cy - 1, 2, 5, I.GRAY);
    r.rect(cx + rx - 2, cy - 2, 4, 7, I.EYE);
    r.rect(cx + rx - 1, cy - 1, 2, 5, I.GRAY);
    r.rect(cx - rx + 1, cy + 6, 8, 1, I.EYE);
    r.rect(cx - rx + 8, cy + 5, 3, 3, I.GRAY);
  }

  // 10. Happy: thumbs up with left arm
  if (happy) {
    const ax = lArmX;
    const topY = cy - ry + 1;
    const bottomY = kTop + 3;
    r.rect(ax, topY + 3 * k, ab, bottomY - topY - 3 * k, sleeveColor);
    r.rect(ax + ab - 1, topY + 3 * k, 1, bottomY - topY - 3 * k, sleeveColor + 1);
    // fist and thumb
    r.rect(ax - k, topY, ab + k, 3 * k, I.SKIN);
    r.rect(ax + ab - 1, topY, 1, 3 * k, I.SKIN + 1);
    r.rect(ax, topY - 2 * k, k, 2 * k, I.SKIN);
    r.rect(ax, topY - 2 * k, k, k, I.SKIN + 2);
  }

  // 11. Pink cheeks on the character who has them in the photo
  if (type === 'player' && /** @type {any} */ (v).pink) {
    f(eyeL - 1, 2, I.BLUSH);
    f(eyeR + 1, 2, I.BLUSH);
  }

  finishText(r, texts, mirror);
  r.outline(I.OUT);
  if (type === 'player') r.outline(I.OUT_LIGHT);
  return r;
}

/**
 * Boss 2, Multifunksjonsmonsteret (the multifunction monster): a big office printer (about 64 × 64) on small legs,
 * with an angry face on its display, paper trays that clatter when it walks, and blinking warning lamps.
 * frame: 0–3 walk, 4 happy (smiley, green lamps, waves a sheet of paper as a thumbs up), 5 + POSE.x = poses:
 * point = the lamps light up in CMYK (cartridges coming), raise = shakes and «warms up» (print job),
 * clap = paper jam («STOPP» on the display), sad = disappointed, crossed = idle.
 */
function drawPrinterBoss(frame, mirror = false) {
  const r = new Raster(64, 64);
  /** @type {[string, number, number, number][]} */
  const texts = [];
  const happy = frame === 4;
  const pose = frame >= 5 ? frame - 5 : -1;
  const walk = frame < 4 ? frame : 0;
  const bob = walk === 1 || walk === 3 ? -1 : 0;
  const x0 = 6, w = 52, top = 16 + bob, h = 33;
  // small legs (the front pair, alternating)
  const legY = top + h;
  const lo = frame < 4 ? [0, 2, 0, -2][walk] : 0;
  for (const [lx, off] of [[13, lo], [44, -lo]]) {
    r.rect(lx, legY, 5, 8 + Math.min(0, off), I.BELLY);
    r.rect(lx + 4, legY, 1, 8 + Math.min(0, off), I.BELLY + 1);
    r.rect(lx - 1, legY + 8 + Math.min(0, off), 7, 3, I.SHOES);
  }
  // the body
  r.rect(x0, top, w, h, I.KL);
  r.rect(x0 + w - 4, top, 4, h, I.KL + 1);
  r.rect(x0, top, w, 2, I.KL + 2);
  r.rect(x0, top + h - 2, w, 2, I.KL + 1);
  // the lid with sheets sticking out of the output tray
  r.rect(x0 + 3, top - 4, w - 6, 4, I.KL + 1);
  r.rect(x0 + 3, top - 4, w - 6, 1, I.KL + 2);
  r.rect(x0 + 12, top - 9, 22, 6, I.ITEM);
  r.rect(x0 + 14, top - 11, 18, 3, I.ITEM);
  r.rect(x0 + 15, top - 8, 14, 1, I.GRAY);
  r.rect(x0 + 15, top - 6, 10, 1, I.GRAY);
  // the display (green LCD) with the face
  const dx = x0 + 5, dy = top + 4, dw = 28, dh = 14;
  r.rect(dx - 1, dy - 1, dw + 2, dh + 2, I.EYE);
  r.rect(dx, dy, dw, dh, I.SHIRT);
  r.rect(dx, dy, dw, 1, I.SHIRT + 2);
  const ink = I.EYE;
  if (pose === POSE.clap) {
    // paper jam
    texts.push(['STOPP', dx + 4, dy + 2, ink], ['!!!', dx + 8, dy + 8, I.MOUTH]);
  } else if (happy) {
    // smiley
    r.rect(dx + 8, dy + 3, 2, 3, ink);
    r.rect(dx + 18, dy + 3, 2, 3, ink);
    r.rect(dx + 7, dy + 9, 2, 1, ink);
    r.rect(dx + 9, dy + 10, 10, 1, ink);
    r.rect(dx + 19, dy + 9, 2, 1, ink);
  } else if (pose === POSE.sad) {
    // disappointed
    r.rect(dx + 7, dy + 4, 4, 1, ink);
    r.rect(dx + 17, dy + 4, 4, 1, ink);
    r.rect(dx + 9, dy + 10, 10, 1, ink);
    r.rect(dx + 8, dy + 11, 1, 1, ink);
    r.rect(dx + 19, dy + 11, 1, 1, ink);
  } else {
    // angry: slanted brows, narrow eyes, frown
    r.px(dx + 6, dy + 2, ink);
    r.rect(dx + 7, dy + 3, 2, 1, ink);
    r.rect(dx + 9, dy + 4, 2, 1, ink);
    r.px(dx + 21, dy + 2, ink);
    r.rect(dx + 19, dy + 3, 2, 1, ink);
    r.rect(dx + 17, dy + 4, 2, 1, ink);
    r.rect(dx + 8, dy + 6, 3, 2, ink);
    r.rect(dx + 17, dy + 6, 3, 2, ink);
    r.rect(dx + 9, dy + 11, 10, 1, ink);
    r.px(dx + 8, dy + 12, ink);
    r.px(dx + 19, dy + 12, ink);
  }
  // the warning lamps (C, M, Y, K when the cartridges are coming)
  const lampColors = happy ? [I.GREEN, I.GREEN, I.GREEN, I.GREEN]
    : pose === POSE.point ? [I.BLUE, I.PURPLE, I.GOLD, I.EYE]
      : pose === POSE.raise ? [I.GOLD, I.MOUTH, I.GOLD, I.MOUTH]
        : pose === POSE.clap || pose === POSE.sad ? [I.MOUTH, I.MOUTH, I.MOUTH, I.MOUTH]
          : [I.GRAY, I.GRAY, I.MOUTH, I.GRAY];
  for (let i = 0; i < 4; i++) {
    const lx = x0 + 37 + (i % 2) * 6, ly = top + 5 + Math.floor(i / 2) * 6;
    r.rect(lx, ly, 4, 4, lampColors[i]);
    r.px(lx, ly, I.WHITE);
  }
  // the output slot and two paper trays (they clatter when it walks)
  r.rect(x0 + 4, top + 20, w - 8, 2, I.EYE);
  for (let t = 0; t < 2; t++) {
    const off = frame < 4 && (walk + t) % 2 === 1 ? 1 : 0;
    const ty = top + 23 + t * 5;
    r.rect(x0 + 3 + off, ty, w - 7, 4, I.KL + 1);
    r.rect(x0 + 3 + off, ty, w - 7, 1, I.KL + 2);
    r.rect(x0 + w / 2 - 4 + off, ty + 2, 8, 1, I.ACC);
  }
  // happy: waves a sheet of paper like a thumbs up
  if (happy) {
    r.rect(x0 - 3, 11, 3, top + 8 - 11, I.KL + 1);
    r.rect(1, 1, 9, 11, I.ITEM);
    r.rect(2, 4, 6, 1, I.GRAY);
    r.rect(2, 7, 6, 1, I.GRAY);
  }
  finishText(r, texts, mirror);
  r.outline(I.OUT);
  return r;
}

/** Mirrors the grid if the figure faces left, then stamps on the text so it can still be read. */
function finishText(r, texts, mirror) {
  if (mirror) r.d.set(r.mirrored().d);
  for (const [t, x, y, c] of texts) {
    const w = [...t].length * 4 - 1;
    tinyText(r, t, mirror ? r.w - x - w : x, y, c);
  }
}

/** Draws one frame of any figure type. */
function drawAny(type, v, frame, mirror = false) {
  return type === 'printerBoss' ? drawPrinterBoss(frame, mirror) : drawFigure(/** @type {any} */ (type), v, frame, mirror);
}

/** Figures with text on them are drawn again for the left-facing frames (instead of being mirrored). */
const HAS_TEXT = ['nordic', 'printerBoss'];
const leftFacing = (type, v, frame, r) => (HAS_TEXT.includes(type) ? drawAny(type, v, frame, true) : r.mirrored());

/**
 * Larger portrait (64 × 64) of a playable character: head and shoulders, friendly expression.
 * Each character has their own face shape, smile, hairstyle and clothes (see PORTRAIT below).
 * @param {any} v one of PLAYERS
 */
function drawPortrait(v) {
  const r = new Raster(64, 64);
  const H = I.HAIR;
  const P = v.portrait;
  const cx = 32, cy = 28, rx = P.rx, ry = P.ry;

  /** Inside the face: ellipse that narrows toward the chin (jaw 0 = round, 0.3 = narrow chin). */
  const inFace = (x, y) => {
    const ny = (y + 0.5 - cy) / ry;
    const narrow = ny > 0 ? 1 - P.jaw * ny * ny : 1;
    const nx = (x + 0.5 - cx) / (rx * narrow);
    return nx * nx + ny * ny <= 1;
  };
  /** Hair pixel with shadow on the right, a light stripe and strand texture. */
  const hair = (x, y) => {
    const dx = x + 0.5 - cx;
    let c = H;
    if (dx > rx * 0.55) c = H + 1;
    if (P.strands(x, y)) c = H + 2;
    else if (P.shadow(x, y)) c = H + 1;
    r.px(x, y, c);
  };
  const fillHair = (pred, x0 = 8, y0 = 2, x1 = 56, y1 = 44) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (pred(x, y)) hair(x, y);
  };

  // 1. Hair behind the head (volume sticking out at the sides)
  fillHair((x, y) => P.backHair(x, y));

  // 2. Shoulders and clothes
  for (let y = 47; y < 64; y++) for (let x = 4; x < 60; x++) {
    if (!inE(x, y, 32, 66, P.shoulders, 19)) continue;
    r.px(x, y, x > 46 ? I.KL + 1 : x < 13 ? I.KL + 2 : I.KL);
  }
  // Neck (with shadow under the chin)
  const neckBottom = 50;
  r.rect(cx - 5, cy + ry - 4, 10, neckBottom - (cy + ry - 4), I.SKIN);
  r.rect(cx + 2, cy + ry - 4, 3, neckBottom - (cy + ry - 4), I.SKIN + 1);
  r.rect(cx - 5, cy + ry - 3, 10, 2, I.SKIN + 1);
  P.clothes(r, cx);

  // 3. Ears and face
  r.ellipse(cx - rx + 0.5, cy + 2, 2.6, 3.6, I.SKIN + 1);
  r.ellipse(cx + rx - 0.5, cy + 2, 2.6, 3.6, I.SKIN + 1);
  r.px(cx - rx, cy + 2, I.SKIN);
  for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
    if (!inFace(x, y)) continue;
    const edge = !inFace(x + 2, y) || !inFace(x, y + 2);
    const light = x < cx - rx * 0.35 && y < cy - ry * 0.2 && inFace(x - 2, y - 2) && (x + y) % 2 === 0;
    r.px(x, y, edge && x > cx - 2 ? I.SKIN + 1 : light ? I.SKIN + 2 : I.SKIN);
  }

  // 4. Facial features: brows, eyes (small and friendly), nose and smile
  const oy = cy + 1;
  for (const ex of [cx - 7, cx + 4]) {
    // brows
    r.rect(ex - 1, oy - 4 + P.brows, 5, 1, H + 1);
    r.px(ex + (ex < cx ? -1 : 3), oy - 3 + P.brows, H + 1);
    // eye: dark pupil with a light dot and a small lid
    r.rect(ex, oy - 1, 3, 1, I.SKIN + 1);
    r.rect(ex, oy, 3, P.eyeH, I.WHITE);
    r.rect(ex + (ex < cx ? 1 : 0), oy, 2, P.eyeH, I.EYE);
    r.px(ex + (ex < cx ? 1 : 0), oy, I.WHITE);
  }
  // nose
  r.px(cx, oy + 3, I.SKIN + 1);
  r.px(cx, oy + 4, I.SKIN + 1);
  r.rect(cx - 1, oy + 5, 3, 1, I.SKIN + 1);
  // mouth
  const my = oy + 9;
  if (P.smile === 'grin') {
    r.rect(cx - 4, my, 9, 1, I.MOUTH);
    r.rect(cx - 4, my + 1, 1, 1, I.MOUTH);
    r.rect(cx + 4, my + 1, 1, 1, I.MOUTH);
    r.rect(cx - 3, my + 1, 7, 1, I.WHITE);
    r.rect(cx - 2, my + 2, 5, 1, I.MOUTH);
    r.px(cx - 5, my - 1, I.MOUTH);
    r.px(cx + 5, my - 1, I.MOUTH);
  } else {
    r.px(cx - 4, my - 1, I.MOUTH);
    r.px(cx + 4, my - 1, I.MOUTH);
    r.rect(cx - 3, my, 7, 1, I.MOUTH);
    r.rect(cx - 2, my + 1, 5, 1, P.lip === false ? I.SKIN + 1 : I.BLUSH);
  }
  if (v.pink) {
    r.rect(cx - 10, oy + 4, 3, 2, I.BLUSH);
    r.rect(cx + 8, oy + 4, 3, 2, I.BLUSH);
  }

  // 5. Hair in front (fringe, sides)
  fillHair((x, y) => P.frontHair(x, y, inFace));
  if (P.after) P.after(r, cx, cy);

  r.outline(I.OUT);
  return r;
}

/** Helpers for the hair in the portraits. */
const circle = (x, y, mx, my, rr) => (x + 0.5 - mx) ** 2 + (y + 0.5 - my) ** 2 <= rr * rr;

/** Personal features in the portraits (face shape, eyes, smile, hair and clothes), in the same order as PLAYERS. */
const PORTRAIT = [
  {
    // 1: narrow, long face, brown hair with volume and a fringe swept to the side, dark shirt with button-down collar and narrow black tie
    rx: 11.5, ry: 15, jaw: 0.32, shoulders: 25, eyeH: 2, brows: 0, smile: 'smile',
    backHair: (x, y) => circle(x, y, 32, 19, 14.5) && y < 30,
    frontHair: (x, y, iA) => {
      if (!(circle(x, y, 32, 19, 14.5) || circle(x, y, 24, 12, 7) || circle(x, y, 38, 11, 8))) return false;
      // the fringe slants from left (high) to right (low), with a few tufts
      const fringe = 19 + (x - 20) * 0.28 + ((x * 7) % 5 === 0 ? 1.5 : 0);
      if (y < fringe) return true;
      return !iA(x, y) && y < 30;
    },
    strands: (x, y) => y < 19 && (x + Math.floor(y * 0.6)) % 6 === 0,
    shadow: (x, y) => y < 21 && (x + Math.floor(y * 0.6)) % 6 === 3,
    clothes: (r, cx) => {
      // collar (button-down) in lighter navy, the buttons in the tips
      for (let i = 0; i < 6; i++) {
        r.rect(cx - 7 + i, 47 + i, 2, 1, I.KL + 2);
        r.rect(cx + 5 - i, 47 + i, 2, 1, I.KL + 2);
      }
      r.px(cx - 6, 50, I.WHITE);
      r.px(cx + 5, 50, I.WHITE);
      // narrow black tie
      r.rect(cx - 2, 48, 4, 3, I.ACC + 1);
      for (let y = 51; y < 64; y++) r.rect(cx - 1 - (y > 54 ? 1 : 0), y, 3 + (y > 54 ? 1 : 0), 1, I.ACC);
      r.rect(cx + 1, 51, 1, 13, I.ACC + 1);
    },
  },
  {
    // 2: broad face, light hair with volume swept back and short sides, gray-green pinstripe jacket over white shirt
    rx: 13, ry: 14, jaw: 0.18, shoulders: 27, eyeH: 2, brows: 0, smile: 'smile',
    backHair: () => false,
    frontHair: (x, y, iA) => {
      // volume on top, high forehead, short sides
      const edge = 16 + Math.sin((x + 0.5) * 0.45) * 1.2 - (x < 26 ? 1 : 0);
      const top = circle(x, y, 32, 16, 13.5) && y < edge;
      const quiff = (circle(x, y, 30, 11, 10.5) || circle(x, y, 37, 12, 8)) && y < edge;
      const side = !iA(x, y) && Math.abs(x + 0.5 - 32) > 11 && y < 26 && y > 14 && circle(x, y, 32, 26, 15);
      return top || quiff || side;
    },
    strands: (x, y) => y < 15 && (x - Math.floor(y * 0.8)) % 5 === 0,
    shadow: (x, y) => y > 15 || (x === 26 && y > 3 && y < 15) || (x - Math.floor(y * 0.8)) % 5 === 2,
    clothes: (r, cx) => {
      // white shirt with open collar
      for (let y = 47; y < 64; y++) {
        const b = Math.max(8, 18 - (y - 47));
        r.rect(cx - b / 2, y, b, 1, I.SHIRT);
      }
      r.rect(cx - 3, 47, 6, 4, I.SKIN);
      r.rect(cx - 2, 51, 4, 2, I.SKIN + 1);
      r.rect(cx - 8, 47, 4, 3, I.SHIRT + 2);
      r.rect(cx + 4, 47, 4, 3, I.SHIRT + 2);
      // lapels
      for (let i = 0; i < 9; i++) {
        r.px(cx - 10 + Math.floor(i / 2), 48 + i * 2, I.KL + 1);
        r.px(cx + 9 - Math.floor(i / 2), 48 + i * 2, I.KL + 1);
      }
      for (let y = 49; y < 64; y += 3) for (let x = 8; x < 56; x += 4) if (r.get(x, y) === I.KL) r.px(x + (y & 1), y, I.KL + 2);
    },
  },
  {
    // 3: oval face, straight black hair with a middle part and curtain bangs, brown cable-knit sweater
    rx: 12.5, ry: 14.5, jaw: 0.25, shoulders: 28, eyeH: 2, brows: 1, smile: 'smile',
    backHair: (x, y) => circle(x, y, 32, 20, 14) && y < 26,
    frontHair: (x, y, iA) => {
      if (!circle(x, y, 32, 20, 14.2)) return false;
      // curtain bangs: parted in the middle, the fringe hangs lower toward the sides
      const dx = Math.abs(x + 0.5 - 32);
      const fringe = 14 + Math.min(8, dx * 0.8) + (x % 3 === 0 ? 1.5 : 0);
      if (y < fringe) return true;
      return !iA(x, y) && y < 23;
    },
    strands: (x, y) => y > 8 && y < 13 && (x === 25 || x === 28 || x === 36 || x === 39),
    shadow: (x, y) => y > 14 && x % 3 === 1,
    clothes: (r, cx) => {
      // round ribbed neck and braids
      r.rect(cx - 7, 47, 14, 2, I.KL + 1);
      for (let x = cx - 7; x < cx + 7; x += 2) r.px(x, 47, I.KL + 2);
      for (let y = 50; y < 64; y++) for (const x of [10, 19, 28, 37, 46]) {
        r.px(x + ((y >> 1) & 1), y, I.KL + 2);
        r.px(x + 3 - ((y >> 1) & 1), y, I.KL + 2);
      }
    },
    after: (r, cx) => {
      // the part
      r.rect(cx - 1, 8, 1, 7, I.SKIN + 1);
      r.px(cx - 1, 15, I.SKIN);
    },
  },
  {
    // 4: round face, big smile and pink cheeks, copper-brown wavy and full hair, white shirt over t-shirt and gold chain
    rx: 12.5, ry: 13.5, jaw: 0.12, shoulders: 27, eyeH: 2, brows: -1, smile: 'grin',
    backHair: (x, y) => {
      if (y > 30) return false;
      if (circle(x, y, 32, 19, 15.5)) return true;
      // curls around the edge
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.95 + i * 0.14);
        if (circle(x, y, 32 + Math.cos(a) * 15, 20 + Math.sin(a) * 14, 4.2)) return true;
      }
      return false;
    },
    frontHair: (x, y, iA) => {
      if (!circle(x, y, 32, 19, 15.5)) return false;
      // curly fringe in arcs over the forehead
      const fringe = 17 + (Math.abs(Math.sin((x + 0.5) * 0.55)) * 3);
      if (y < fringe) return true;
      return !iA(x, y) && y < 26;
    },
    strands: (x, y) => ((x * 5 + y * 3) % 9 === 0 || (x * 3 + y * 7) % 13 === 0) && y < 26,
    shadow: (x, y) => (x * 7 + y * 5) % 8 === 0,
    clothes: (r, cx) => {
      // white t-shirt, open white shirt, thin gold chain
      r.rect(cx - 6, 47, 12, 17, I.SHIRT);
      r.rect(cx - 5, 47, 10, 1, I.SHIRT + 1);
      for (let i = 0; i < 8; i++) {
        r.px(cx - 7 - i, 47 + i, I.KL + 1);
        r.px(cx + 6 + i, 47 + i, I.KL + 1);
      }
      for (let i = 0; i <= 5; i++) {
        r.px(cx - 5 + i, 47 + i, I.GOLD);
        r.px(cx + 4 - i, 47 + i, I.GOLD);
      }
    },
  },
];
PLAYERS.forEach((v, i) => {
  /** @type {any} */ (v).portrait = PORTRAIT[i];
});

/**
 * Johan's portrait: broad face with a gently squared jaw and a warm, closed smile with smile lines,
 * short light-brown hair combed up and back with higher temples, charcoal jacket over a royal-blue open-collar shirt.
 */
const JOHAN_PORTRAIT = {
  rx: 13, ry: 15, jaw: 0.22, shoulders: 29, eyeH: 2, brows: 0, smile: 'smile', lip: false,
  backHair: () => false,
  frontHair: (x, y, iA) => {
    const dx = Math.abs(x + 0.5 - 32);
    // a fairly straight hairline that sits a little higher at the temples
    const edge = 19.5 - Math.max(0, dx - 6) * 0.35;
    // The hair hugs the skull: a shape only slightly larger than the head (3–4 px of volume on top, 1–2 px at the sides)
    const nx = (x + 0.5 - 32) / 14.8, ny = (y + 0.5 - 26) / 16.6;
    if (nx * nx + ny * ny > 1) return false;
    // over the face the hairline follows «edge»; at the sides it stops above the ears
    return y < edge || (!iA(x, y) && y < 23);
  },
  strands: (x, y) => y < 12 && y > 6 && (x * 2 + y * 3) % 9 === 0,
  shadow: (x, y) => y >= 12 || (x * 2 + y * 3) % 9 === 4,
  clothes: (r, cx) => {
    // royal-blue shirt with an open collar between the jacket lapels
    for (let y = 47; y < 64; y++) {
      const b = Math.max(6, 20 - (y - 47) * 1.1);
      r.rect(cx - b / 2, y, b, 1, I.SHIRT);
    }
    r.rect(cx - 3, 47, 6, 4, I.SKIN);
    r.rect(cx - 2, 51, 4, 2, I.SKIN + 1);
    // collar points
    for (let i = 0; i < 4; i++) {
      r.rect(cx - 9 + i, 47 + i, 3, 1, I.SHIRT + 2);
      r.rect(cx + 6 - i, 47 + i, 3, 1, I.SHIRT + 2);
    }
    // jacket lapels
    for (let i = 0; i < 9; i++) {
      r.px(cx - 11 + Math.floor(i / 2), 48 + i * 2, I.KL + 2);
      r.px(cx - 11 + Math.floor(i / 2), 49 + i * 2, I.KL + 2);
      r.px(cx + 10 - Math.floor(i / 2), 48 + i * 2, I.KL + 1);
      r.px(cx + 10 - Math.floor(i / 2), 49 + i * 2, I.KL + 1);
    }
  },
  after: (r, cx, cy) => {
    // smile lines at the eyes and next to the mouth
    r.px(cx - 10, cy, I.SKIN + 1);
    r.px(cx - 10, cy + 2, I.SKIN + 1);
    r.px(cx + 9, cy, I.SKIN + 1);
    r.px(cx + 9, cy + 2, I.SKIN + 1);
    r.px(cx - 6, cy + 8, I.SKIN + 1);
    r.px(cx + 6, cy + 8, I.SKIN + 1);
  },
};
/** @type {any} */ (JOHAN[0]).portrait = JOHAN_PORTRAIT;
/** @type {any} */ (JOHAN[1]).portrait = JOHAN_PORTRAIT;

/** White silhouette (flash when a lawyer gets help, or when the player is hit). */
function whiteCopy(r) {
  const h = new Raster(r.w, r.h);
  for (let i = 0; i < r.d.length; i++) {
    const c = r.d[i];
    if (c) h.d[i] = c === I.OUT || c === I.OUT_LIGHT ? I.GRAY : I.WHITE;
  }
  return h;
}

// ---------- Sprite sheets with cache ----------

/**
 * @typedef {Object} Sheet
 * @property {HTMLCanvasElement} canvas the atlas for the type
 * @property {number} sy the y position of the variant's row in the atlas
 * @property {number} w
 * @property {number} h
 * @property {number} ax
 * @property {number} ay
 */

export class Figures {
  constructor() {
    /** @type {Record<string, Variant[]>} */
    this.variants = {};
    for (const [type, n] of Object.entries(CONFIG.figureVariants)) this.variants[type] = makeVariants(type, n);
    this.variants.player = PLAYERS;
    this.variants.johan = JOHAN;
    this.variants.nordic = NORDIC;
    this.variants.printerBoss = PRINTER_BOSS;
    /** @type {Map<number | string, HTMLCanvasElement>} */
    this.portraits = new Map();
    /** Pose frames for the bosses. @type {Map<string, Sheet>} */
    this.poseCache = new Map();
    /** @type {Map<string, Sheet>} */
    this.cache = new Map();
    /**
     * One atlas (large canvas) per type with all the variants stacked below each other.
     * Drawing from one shared canvas is much faster than from many small ones (especially without a graphics card).
     * @type {Map<string, {canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}>}
     */
    this.atlas = new Map();
    /** Reused scratch canvas for one strip. */
    this.scratchCanvas = document.createElement('canvas');
    /** Figures that have not been made yet. @type {[string, number][] | null} */
    this.queue = null;
  }

  /**
   * The sprite sheet for one figure (made the first time it is needed).
   * The frames are in a row: walk 0–3, flash 4–7, happy 8 – and the same mirrored (left) from 9.
   * The row is in a shared atlas for the type, from y = sy.
   */
  sheet(type, variant) {
    const key = type + variant;
    let a = this.cache.get(key);
    if (a) return a;
    const list = this.variants[type];
    const vi = variant % list.length;
    const v = list[vi];
    const T = TYPES[type];
    const strip = new Raster(T.w * TILE.count, T.h);
    /** The flash frames are drawn with a lighter palette (not fully white), so the figure is still recognizable. */
    const blinkStrip = new Raster(T.w * TILE.count, T.h);
    for (let b = 0; b < 5; b++) {
      const r = drawAny(type, v, b);
      const s = leftFacing(type, v, b, r);
      const col = b < 4 ? b : TILE.happy;
      strip.lim(r, col * T.w, 0);
      strip.lim(s, (col + TILE.left) * T.w, 0);
      if (b < 4) {
        const blink = type === 'player' ? whiteCopy(r) : r;
        blinkStrip.lim(blink, (TILE.blink + b) * T.w, 0);
        blinkStrip.lim(type === 'player' ? whiteCopy(s) : s, (TILE.blink + b + TILE.left) * T.w, 0);
      }
    }
    const { ax, ay } = anchor(type);
    const pal = palette(v, type);
    const lightPal = pal.map((f, i) => (f && i !== I.OUT ? f.map((c) => Math.round(c + (255 - c) * 0.6)) : f));
    // Merge normal and flash into one strip (the flash columns use the light palette)
    const W = T.w * TILE.count;
    for (let i = 0; i < blinkStrip.d.length; i++) if (blinkStrip.d[i]) strip.d[i] = 0;
    const scratchCanvas = this.scratchCanvas;
    if (scratchCanvas.width < W || scratchCanvas.height < T.h) {
      scratchCanvas.width = Math.max(scratchCanvas.width, W);
      scratchCanvas.height = Math.max(scratchCanvas.height, T.h);
    }
    const mctx = /** @type {CanvasRenderingContext2D} */ (scratchCanvas.getContext('2d'));
    const frame = mctx.createImageData(W, T.h);
    for (let i = 0; i < strip.d.length; i++) {
      const c = strip.d[i] || blinkStrip.d[i];
      if (!c) continue;
      const f = strip.d[i] ? pal[c] : lightPal[c];
      if (!f) continue;
      frame.data[i * 4] = f[0];
      frame.data[i * 4 + 1] = f[1];
      frame.data[i * 4 + 2] = f[2];
      frame.data[i * 4 + 3] = 255;
    }
    mctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    mctx.putImageData(frame, 0, 0);
    let at = this.atlas.get(type);
    if (!at) {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = T.h * list.length;
      at = { canvas, ctx: /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d')) };
      this.atlas.set(type, at);
    }
    at.ctx.drawImage(scratchCanvas, 0, 0, W, T.h, 0, vi * T.h, W, T.h);
    a = { canvas: at.canvas, sy: vi * T.h, w: T.w, h: T.h, ax, ay };
    this.cache.set(key, a);
    return a;
  }

  /** Portrait (64 × 64) of character no. i (0–3). */
  portrait(i) {
    let c = this.portraits.get(i);
    if (c) return c;
    const v = PLAYERS[i % PLAYERS.length];
    c = toCanvas(drawPortrait(v), palette(v, 'player'));
    this.portraits.set(i, c);
    return c;
  }

  /** Johan's portrait (64 × 64), for the boss introduction, the end screen and the preview. */
  johanPortrait() {
    let c = this.portraits.get('johan');
    if (c) return c;
    c = toCanvas(drawPortrait(JOHAN[0]), palette(JOHAN[0], 'player'));
    this.portraits.set('johan', c);
    return c;
  }

  /**
   * The boss poses (POSE) for one figure, in a row: the poses, then the same mirrored (left) from POSE.count.
   * Each pose also has a light flash copy below (row 2), used while the boss is being helped.
   */
  poses(type, variant) {
    const key = type + variant;
    let a = this.poseCache.get(key);
    if (a) return a;
    const list = this.variants[type];
    const v = list[variant % list.length];
    const T = TYPES[type];
    const strip = new Raster(T.w * POSE.count * 2, T.h);
    for (let p = 0; p < POSE.count; p++) {
      const r = drawAny(type, v, 5 + p);
      strip.lim(r, p * T.w, 0);
      strip.lim(leftFacing(type, v, 5 + p, r), (p + POSE.count) * T.w, 0);
    }
    const pal = palette(v, type);
    const lightPal = pal.map((f, i) => (f && i !== I.OUT ? f.map((c) => Math.round(c + (255 - c) * 0.6)) : f));
    const canvas = document.createElement('canvas');
    canvas.width = strip.w;
    canvas.height = T.h * 2;
    toCanvas(strip, pal, canvas, 0, 0);
    const light = document.createElement('canvas');
    light.width = strip.w;
    light.height = T.h;
    toCanvas(strip, lightPal, light, 0, 0);
    /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d')).drawImage(light, 0, T.h);
    const { ax, ay } = anchor(type);
    a = { canvas, sy: 0, w: T.w, h: T.h, ax, ay };
    this.poseCache.set(key, a);
    return a;
  }

  /**
   * Makes some of the figures that have not been made yet. Called in idle moments at startup.
   * @param {number} count max number of variants this time
   * @returns {boolean} true when all are done
   */
  makeSome(count) {
    if (!this.queue) {
      this.queue = [];
      for (const type of Object.keys(this.variants)) for (let v = 0; v < this.variants[type].length; v++) this.queue.push([type, v]);
      // The bosses' poses too
      for (const type of ['nordic', 'printerBoss', 'boss', 'johan']) for (let v = 0; v < this.variants[type].length; v++) this.queue.push(['pose:' + type, v]);
    }
    while (count-- > 0 && this.queue.length) {
      const [type, v] = /** @type {[string, number]} */ (this.queue.shift());
      if (type.startsWith('pose:')) this.poses(type.slice(5), v);
      else this.sheet(type, v);
    }
    return this.queue.length === 0;
  }
}

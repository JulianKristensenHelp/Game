// @ts-check
// All sprites except the figures: objects, office decor, floors, effects and arrows.
// Drawn once as color-indexed grids and cached as canvases. No external images.
import { Raster, hex, toCanvas, makeCanvas, ctx2d } from './pixel.js';

/** Common palette for decor and effects. */
const COLORS = [
  null, '#1d1626', '#ffffff', '#d7dde4', '#9aa3ad', '#5d6b7a', '#3a4350', '#ffe066', '#c79a00', '#8a6d00',
  '#2fd06a', '#1e9a4c', '#9ff0bd', '#3aa0ff', '#1f6fbf', '#a8dcff', '#e5484d', '#a32f33', '#ff9f43', '#e3cfa8',
  '#c2a57b', '#8a6f4c', '#6b4a2f', '#4c9a5a', '#7cc47f', '#2f6b3a', '#c0703f', '#8a4a2a', '#19b5c9', '#e0409a',
  '#14b8a6', '#0f766e', '#f5cf3a', '#c9941a', '#fff6c8', '#7a5cc9', '#efe9dc', '#c9bfa8', '#2b2f38', '#5a6b7d',
  '#6b7a8a', '#4a5562', '#eef1f5', '#b9c3cd', '#9b2d3a', '#d65f6a', '#3d4a5c', '#f6f0e2', '#8fd3ff', '#ffd1dc',
];
const PAL = COLORS.map((f) => (f ? hex(f) : null));
/** Names of color indexes (for readable code). */
const C = {
  OUT: 1, WHITE: 2, LIGHT_GRAY: 3, GRAY: 4, DARK_GRAY: 5, DARKER: 6, YELLOW: 7, DARK_YELLOW: 8, OCHRE: 9,
  GREEN: 10, DARK_GREEN: 11, LIGHT_GREEN: 12, BLUE: 13, DARK_BLUE: 14, LIGHT_BLUE: 15, RED: 16, DARK_RED: 17, ORANGE: 18,
  WOOD_L: 19, WOOD: 20, WOOD_M: 21, BROWN: 22, LEAF: 23, LEAF_L: 24, LEAF_M: 25, POT: 26, POT_M: 27,
  CYAN: 28, MAGENTA: 29, TEAL: 30, TEAL_M: 31, GOLD: 32, GOLD_M: 33, GOLD_L: 34, PURPLE: 35, CREAM: 36, BEIGE: 37,
  NEAR_BLACK: 38, SLATE: 39, CHAIR: 40, CHAIR_M: 41, NEAR_WHITE: 42, LIGHT_GRAY2: 43, WINE: 44, WINE_L: 45, DARK_SLATE: 46,
  PAPER: 47, ICE_BLUE: 48, PINK: 49,
};

/**
 * @typedef {Object} Sprite
 * @property {HTMLCanvasElement} canvas
 * @property {number} w
 * @property {number} h
 * @property {number} ax anchor point x
 * @property {number} ay anchor point y
 */

/** Makes a sprite from a drawing function. @returns {Sprite} */
function make(w, h, ax, ay, draw, outline = true) {
  const r = new Raster(w, h);
  draw(r);
  if (outline) r.outline(C.OUT);
  return { canvas: toCanvas(r, PAL), w, h, ax, ay };
}

/** Rotates a grid (nearest neighbor, so the pixels stay sharp). */
function rotate(r, angle) {
  const s = Math.ceil(Math.hypot(r.w, r.h)) + 2;
  const out = new Raster(s, s);
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = x + 0.5 - s / 2, dy = y + 0.5 - s / 2;
    const sx = Math.floor(dx * cos - dy * sin + r.w / 2), sy = Math.floor(dx * sin + dy * cos + r.h / 2);
    const c = r.get(sx, sy);
    if (c) out.px(x, y, c);
  }
  return out;
}

/** Makes N rotated variants of a sprite (for keys, mice and toner cartridges). */
function rotations(w, h, draw, n) {
  const base = new Raster(w, h);
  draw(base);
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = rotate(base, (i / n) * Math.PI * 2);
    r.outline(C.OUT);
    out.push({ canvas: toCanvas(r, PAL), w: r.w, h: r.h, ax: r.w / 2, ay: r.h / 2 });
  }
  return out;
}

/** Soft, «dithered» glow (pre-drawn only – never shadowBlur during play). */
function glow(radius, color, strength = 0.75) {
  const s = radius * 2;
  const c = makeCanvas(s, s);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const frame = ctx.createImageData(s, s);
  const [r, g, b] = hex(color);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x + 0.5 - radius, y + 0.5 - radius) / radius;
    if (d >= 1) continue;
    const v = (1 - d) * strength;
    const threshold = bayer[(y % 4) * 4 + (x % 4)] / 16;
    const a = v > threshold ? Math.min(1, 0.35 + v * 0.55) : v * 0.3;
    const i = (y * s + x) * 4;
    frame.data[i] = r;
    frame.data[i + 1] = g;
    frame.data[i + 2] = b;
    frame.data[i + 3] = Math.round(a * 255);
  }
  ctx.putImageData(frame, 0, 0);
  return { canvas: c, w: s, h: s, ax: radius, ay: radius };
}

/** A copy of a sprite with every opaque pixel tinted (the red blink on enemy projectiles). Made once, never per frame. */
function tinted(sp, color) {
  const c = makeCanvas(sp.w, sp.h);
  const ctx = ctx2d(c);
  ctx.drawImage(sp.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, sp.w, sp.h);
  return { canvas: c, w: sp.w, h: sp.h, ax: sp.ax, ay: sp.ay };
}

/** Semi-transparent ellipse shadow under figures. */
function shadow(w, h) {
  const c = makeCanvas(w, h);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const frame = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2);
    if (nx * nx + ny * ny > 1) continue;
    frame.data[(y * w + x) * 4 + 3] = 70;
  }
  ctx.putImageData(frame, 0, 0);
  return { canvas: c, w, h, ax: w / 2, ay: h / 2 };
}

// ---------- Objects ----------

function makeObjects() {
  const ticket = make(12, 12, 6, 6, (r) => {
    r.rect(1, 2, 10, 9, C.DARK_YELLOW);
    r.rect(1, 1, 10, 9, C.YELLOW);
    r.rect(1, 1, 10, 2, C.GOLD_L);
    r.rect(3, 4, 6, 1, C.OCHRE);
    r.rect(3, 6, 6, 1, C.OCHRE);
    r.rect(3, 8, 4, 1, C.OCHRE);
    r.rect(8, 8, 2, 2, C.RED);
  });
  const ticketLarge = make(16, 16, 8, 8, (r) => {
    r.rect(3, 1, 11, 10, C.DARK_YELLOW);
    r.rect(2, 3, 11, 10, C.GOLD);
    r.rect(1, 5, 11, 10, C.YELLOW);
    r.rect(1, 5, 11, 2, C.GOLD_L);
    r.rect(3, 8, 7, 1, C.OCHRE);
    r.rect(3, 10, 7, 1, C.OCHRE);
    r.rect(3, 12, 5, 1, C.OCHRE);
  });
  const drink = make(12, 18, 6, 10, (r) => {
    r.rect(3, 1, 6, 1, C.GRAY);
    r.rect(2, 2, 8, 2, C.LIGHT_GRAY);
    r.px(5, 1, C.DARK_GRAY);
    r.rect(2, 4, 8, 11, C.GREEN);
    r.rect(8, 4, 2, 11, C.DARK_GREEN);
    r.rect(2, 4, 1, 11, C.LIGHT_GREEN);
    r.rect(2, 15, 8, 2, C.LIGHT_GRAY);
    r.rect(8, 15, 2, 2, C.GRAY);
    // lightning bolt
    r.stamp('..#. .##. ##.. .### ..#. .#..', 4, 6, { '#': C.YELLOW });
  });
  const pc = make(18, 16, 9, 9, (r) => {
    r.rect(1, 1, 16, 11, C.DARKER);
    r.rect(2, 2, 14, 9, C.LIGHT_BLUE);
    r.rect(2, 2, 14, 2, C.WHITE);
    r.rect(12, 6, 4, 5, C.BLUE);
    r.stamp('..#.. .###. ##### .###. ..#..', 4, 4, { '#': C.WHITE });
    r.rect(7, 12, 4, 2, C.DARK_GRAY);
    r.rect(4, 14, 10, 1, C.DARKER);
  });
  const paper = make(28, 20, 14, 10, (r) => {
    const sheet = [[2, 6], [11, 3], [7, 10], [16, 8], [4, 12], [13, 12]];
    for (const [x, y] of sheet) {
      r.rect(x, y, 10, 7, C.PAPER);
      r.rect(x, y + 6, 10, 1, C.LIGHT_GRAY);
      r.rect(x + 2, y + 2, 6, 1, C.LIGHT_GRAY2);
      r.rect(x + 2, y + 4, 5, 1, C.LIGHT_GRAY2);
    }
  });
  const tonerDraw = (evo) => (r) => {
    r.rect(1, 2, 10, 5, evo ? C.DARK_RED : C.NEAR_BLACK);
    r.rect(1, 2, 10, 1, evo ? C.ORANGE : C.DARKER);
    r.rect(3, 2, 2, 5, evo ? C.ORANGE : C.CYAN);
    r.rect(6, 2, 2, 5, evo ? C.YELLOW : C.MAGENTA);
    r.rect(9, 2, 2, 5, evo ? C.RED : C.YELLOW);
  };
  const keyDraw = (evo) => (r) => {
    const g = evo ? C.LIGHT_BLUE : C.YELLOW, m = evo ? C.DARK_BLUE : C.DARK_YELLOW;
    r.rect(1, 1, 5, 5, g);
    r.rect(2, 2, 3, 3, m);
    r.px(3, 3, C.WHITE);
    r.rect(6, 3, 7, 2, g);
    r.rect(6, 4, 7, 1, m);
    r.rect(10, 5, 1, 2, g);
    r.rect(12, 5, 1, 2, g);
  };
  const mouseDraw = (evo) => (r) => {
    r.rect(2, 1, 6, 9, evo ? C.LIGHT_BLUE : C.NEAR_WHITE);
    r.rect(1, 2, 8, 7, evo ? C.LIGHT_BLUE : C.NEAR_WHITE);
    r.rect(7, 2, 1, 7, evo ? C.BLUE : C.LIGHT_GRAY2);
    r.rect(4, 1, 1, 4, C.GRAY);
    r.rect(1, 4, 8, 1, C.GRAY);
    r.rect(4, 2, 1, 2, evo ? C.WHITE : C.TEAL);
  };
  // ----- New in version 3 -----
  const keyChar = (letter, color) => (r) => {
    r.rect(1, 2, 12, 10, C.DARK_GRAY);
    r.rect(1, 1, 12, 9, color);
    r.rect(2, 2, 10, 7, C.NEAR_WHITE);
    r.stamp(letter, 4, 3, { '#': C.NEAR_BLACK });
  };
  const Z = '#### ...# ..#. .#.. ####';
  const email = make(14, 11, 7, 5, (r) => {
    // envelope with a red exclamation mark – clearly different from the player's own effects
    r.rect(1, 1, 12, 9, C.WHITE);
    r.rect(1, 8, 12, 1, C.LIGHT_GRAY);
    for (let i = 0; i < 6; i++) {
      r.px(1 + i, 1 + Math.floor(i * 0.7), C.LIGHT_GRAY2);
      r.px(12 - i, 1 + Math.floor(i * 0.7), C.LIGHT_GRAY2);
    }
    r.rect(6, 3, 2, 3, C.RED);
    r.rect(6, 7, 2, 1, C.RED);
  });
  // ----- New in version 4: the bosses' projectiles, Skytsengelen (the guardian angel) and the mini printers -----
  const note = make(10, 12, 5, 6, (r) => {
    // hold music: a light-blue eighth note
    r.rect(5, 1, 2, 8, C.LIGHT_BLUE);
    r.rect(7, 1, 2, 2, C.LIGHT_BLUE);
    r.rect(8, 3, 1, 2, C.LIGHT_BLUE);
    r.ellipse(3.5, 9, 3, 2.2, C.LIGHT_BLUE);
    r.px(2, 8, C.WHITE);
  });
  const ticketShot = (w, h) => make(w + 2, h + 2, (w + 2) / 2, (h + 2) / 2, (r) => {
    r.rect(1, 1, w, h, C.YELLOW);
    r.rect(1, 1, w, 2, C.GOLD_L);
    r.rect(3, 4, w - 4, 1, C.OCHRE);
    if (h > 6) r.rect(3, 6, w - 6, 1, C.OCHRE);
    r.rect(w - 2, h - 2, 2, 2, C.RED);
  });
  const cartridge = [C.CYAN, C.MAGENTA, C.YELLOW, C.NEAR_BLACK].map((col) => make(9, 11, 4, 5, (r) => {
    r.rect(1, 1, 7, 9, C.DARK_GRAY);
    r.rect(2, 2, 5, 7, col);
    r.rect(2, 2, 5, 1, C.WHITE);
    r.rect(3, 9, 3, 1, C.GRAY);
  }));
  /** Ink puddles in the four colours (semi-transparent, dithered edge). */
  const puddle = ['#19b5c9', '#e0409a', '#f5cf3a', '#2b2f38'].map((col) => {
    const w = 36, h = 22;
    const c = makeCanvas(w, h);
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    const frame = ctx.createImageData(w, h);
    const [cr, cg, cb] = hex(col);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2);
      const d = nx * nx + ny * ny + Math.sin(x * 0.9) * 0.06 + Math.cos(y * 1.3) * 0.06;
      if (d > 1) continue;
      const i = (y * w + x) * 4;
      frame.data[i] = cr;
      frame.data[i + 1] = cg;
      frame.data[i + 2] = cb;
      frame.data[i + 3] = d > 0.8 ? ((x + y) % 2 ? 150 : 0) : 165;
    }
    ctx.putImageData(frame, 0, 0);
    return { canvas: c, w, h, ax: w / 2, ay: h / 2 };
  });
  const sheet = make(9, 11, 4, 5, (r) => {
    r.rect(1, 1, 7, 9, C.PAPER);
    r.rect(2, 3, 5, 1, C.LIGHT_GRAY2);
    r.rect(2, 5, 5, 1, C.LIGHT_GRAY2);
    r.rect(2, 7, 3, 1, C.LIGHT_GRAY2);
  });
  const calendar = make(13, 13, 6, 6, (r) => {
    // calendar invitation: page with a red top bar and a grid of days
    r.rect(1, 2, 11, 10, C.WHITE);
    r.rect(1, 2, 11, 3, C.RED);
    r.rect(3, 1, 1, 2, C.DARK_GRAY);
    r.rect(9, 1, 1, 2, C.DARK_GRAY);
    for (let y = 6; y < 11; y += 2) for (let x = 2; x < 11; x += 2) r.px(x, y, C.GRAY);
    r.rect(6, 8, 2, 2, C.RED);
  });
  /** Skytsengelen: a small, old, bald man with glasses, a cardigan, white wings and a halo. 4 wing frames (+ evo). */
  const angelDraw = (flap, evo, matrix = false) => (r) => {
    const wy = [0, -1, -2, -1][flap];
    // wings (bigger as a combination)
    const ws = evo ? 7 : 5;
    for (const side of [-1, 1]) {
      const wx = side < 0 ? 10 - 4 - ws : 10 + 4;
      r.ellipse(wx + ws / 2, 9 + wy, ws / 2 + 0.5, 3.5 - Math.abs(wy) * 0.5, C.WHITE);
      r.rect(side < 0 ? wx : wx + ws - 2, 10 + wy, 2, 1, C.LIGHT_GRAY);
    }
    // halo
    r.ellipse(10, 2.5, evo ? 5 : 4, 1.3, evo ? C.GOLD_L : C.GOLD);
    r.ellipse(10, 2.5, evo ? 3 : 2.4, 0.5, 0);
    // body: brown cardigan over a light shirt, tiny hands
    r.rect(7, 11, 7, 6, C.WOOD_M);
    r.rect(10, 11, 1, 6, C.CREAM);
    r.rect(6, 13, 1, 2, C.WOOD_L);
    r.rect(14, 13, 1, 2, C.WOOD_L);
    r.rect(8, 17, 2, 2, C.DARK_GRAY);
    r.rect(11, 17, 2, 2, C.DARK_GRAY);
    // head: bald, a little white hair at the sides, round glasses, kind smile
    r.ellipse(10.5, 8, 3.6, 3.4, C.WOOD_L);
    r.px(7, 8, C.LIGHT_GRAY);
    r.px(14, 8, C.LIGHT_GRAY);
    r.px(9, 5, C.WHITE);
    r.rect(8, 7, 2, 2, C.DARKER);
    r.rect(11, 7, 2, 2, C.DARKER);
    r.px(8, 7, C.LIGHT_BLUE);
    r.px(11, 7, C.LIGHT_BLUE);
    r.px(10, 7, C.DARKER);
    r.rect(9, 10, 3, 1, C.WOOD);
    if (matrix) {
      // The Matrix: a black coat and black sunglasses, and a green halo
      r.ellipse(10, 2.5, 4, 1.3, C.GREEN);
      r.ellipse(10, 2.5, 2.4, 0.5, 0);
      r.rect(7, 11, 7, 8, C.NEAR_BLACK);
      r.rect(10, 11, 1, 3, C.DARKER);
      r.rect(8, 7, 5, 2, C.NEAR_BLACK);
      r.px(8, 7, C.GREEN);
      r.px(11, 7, C.GREEN);
    }
  };
  const angel = [0, 1, 2, 3].map((f) => make(22, 21, 11, 11, angelDraw(f, false)));
  const angelEvo = [0, 1, 2, 3].map((f) => make(22, 21, 11, 11, angelDraw(f, true)));
  const angelMatrix = [0, 1, 2, 3].map((f) => make(22, 21, 11, 11, angelDraw(f, false, true)));
  /** Mini printer on small legs, standing still. Frame 1: printing (the lamp is green and the paper tray is pushed up). */
  const miniDraw = (feed, evo) => (r) => {
    r.rect(2, 3, 11, 7, evo ? C.GOLD_L : C.NEAR_WHITE);
    r.rect(11, 3, 2, 7, evo ? C.GOLD : C.LIGHT_GRAY2);
    r.rect(4, feed ? 0 : 1, 7, feed ? 4 : 3, C.PAPER);
    r.rect(4, 5, 5, 2, C.TEAL);
    r.px(10, 5, feed ? C.GREEN : C.RED);
    r.rect(3, 8, 9, 1, C.DARK_GRAY);
    r.rect(4, 10, 2, 3, C.DARK_GRAY);
    r.rect(9, 10, 2, 3, C.DARK_GRAY);
  };
  const mini = [0, 1].map((f) => make(15, 14, 7, 9, miniDraw(f, false)));
  const miniEvo = [0, 1].map((f) => make(15, 14, 7, 9, miniDraw(f, true)));
  const sheetSmall = make(7, 8, 3, 4, (r) => {
    r.rect(1, 1, 5, 6, C.PAPER);
    r.rect(2, 3, 3, 1, C.LIGHT_GRAY2);
    r.rect(2, 5, 2, 1, C.LIGHT_GRAY2);
  });

  // ----- Endringsprompt 4 -----
  /** The Matrix's mini printer: black with green lamps and a green paper tray. */
  const miniMatrix = [0, 1].map((feed) => make(15, 14, 7, 9, (r) => {
    r.rect(2, 3, 11, 7, C.NEAR_BLACK);
    r.rect(11, 3, 2, 7, C.DARKER);
    r.rect(4, feed ? 0 : 1, 7, feed ? 4 : 3, C.LIGHT_GREEN);
    r.rect(4, 5, 5, 2, C.GREEN);
    r.px(10, 5, C.LIGHT_GREEN);
    r.rect(3, 8, 9, 1, C.DARK_GREEN);
    r.rect(4, 10, 2, 3, C.DARK_GRAY);
    r.rect(9, 10, 2, 3, C.DARK_GRAY);
  }));
  const sheetMatrix = make(7, 8, 3, 4, (r) => {
    r.rect(1, 1, 5, 6, C.LIGHT_GREEN);
    r.rect(2, 2, 1, 1, C.DARK_GREEN);
    r.rect(4, 3, 1, 2, C.DARK_GREEN);
    r.rect(2, 5, 1, 1, C.DARK_GREEN);
  });
  /** Ping-pong ball: white with an orange stripe, 4 spin frames; Ping of Death: red-hot. */
  const ballDraw = (spin, evo) => (r) => {
    r.ball(4, 4, 3.5, 3.5, evo ? C.RED : C.NEAR_WHITE, evo ? C.DARK_RED : C.LIGHT_GRAY2, evo ? C.ORANGE : C.WHITE);
    const sx = [2, 3, 4, 5][spin];
    r.rect(sx, 2, 1, 4, evo ? C.YELLOW : C.ORANGE);
  };
  const ball = [0, 1, 2, 3].map((f) => make(9, 9, 4, 4, ballDraw(f, false)));
  const ballEvo = [0, 1, 2, 3].map((f) => make(9, 9, 4, 4, ballDraw(f, true)));
  /** Firewall flames: 3 frames, orange (Livvakten) and green (The Matrix). No outline – they glow. */
  const flameDraw = (f, green) => (r) => {
    const h = [8, 10, 9][f], o = [0, 1, -1][f];
    const outer = green ? C.GREEN : C.ORANGE, mid = green ? C.LIGHT_GREEN : C.YELLOW, core = green ? C.WHITE : C.GOLD_L;
    for (let y = 0; y < h; y++) {
      const w = Math.max(1, Math.round(3.2 * Math.sin(((y + 1) / (h + 1)) * Math.PI * 0.9)));
      const x0 = 4 - w + (y < h / 2 ? o : 0);
      r.rect(x0, 11 - y, w * 2, 1, outer);
      if (w > 1 && y > 0) r.rect(x0 + 1, 11 - y, w * 2 - 2, 1, mid);
      if (w > 2 && y > 1 && y < h - 2) r.rect(x0 + 2, 11 - y, w * 2 - 4, 1, core);
    }
  };
  const flame = [0, 1, 2].map((f) => make(9, 12, 4, 11, flameDraw(f, false), false));
  const flameGreen = [0, 1, 2].map((f) => make(9, 12, 4, 11, flameDraw(f, true), false));
  /** Small glyphs that drift up from the firewall: a padlock, a one and a zero. */
  const lockSmall = make(5, 6, 2, 3, (r) => r.stamp('.###. .#.#. ##### ##.## #####', 0, 1, { '#': C.GOLD_L }), false);
  const one = make(3, 5, 1, 2, (r) => r.stamp('.#. ##. .#. .#. ###', 0, 0, { '#': C.GOLD_L }), false);
  const zero = make(3, 5, 1, 2, (r) => r.stamp('### #.# #.# #.# ###', 0, 0, { '#': C.GOLD_L }), false);
  const oneGreen = make(3, 5, 1, 2, (r) => r.stamp('.#. ##. .#. .#. ###', 0, 0, { '#': C.LIGHT_GREEN }), false);
  const zeroGreen = make(3, 5, 1, 2, (r) => r.stamp('### #.# #.# #.# ###', 0, 0, { '#': C.LIGHT_GREEN }), false);

  /**
   * Livvakten: a big, calm bodyguard (about 24 × 28) in a black suit, white shirt, sunglasses and an earpiece with a
   * spiral cord. Kind face (a small smile). frame: 0/1 = walk bob, matrix = a long black coat instead of the jacket.
   */
  const guardDraw = (bob, matrix) => (r) => {
    const y = bob;
    // legs and shoes
    r.rect(8, 22 + y, 3, 4 - y, C.NEAR_BLACK);
    r.rect(13, 22 + y, 3, 4 - y, C.NEAR_BLACK);
    r.rect(7, 26, 4, 2, C.DARKER);
    r.rect(13, 26, 4, 2, C.DARKER);
    // body: broad shoulders, black suit (or the long coat), white shirt, black tie
    r.rect(5, 12 + y, 14, 11, C.NEAR_BLACK);
    r.rect(4, 13 + y, 16, 9, C.NEAR_BLACK);
    r.rect(5, 12 + y, 1, 10, C.DARKER);
    if (matrix) {
      r.rect(4, 21 + y, 16, 5 - y, C.NEAR_BLACK);
      r.rect(11, 21 + y, 2, 5 - y, C.DARKER);
    }
    r.rect(10, 12 + y, 4, 6, C.WHITE);
    r.rect(11, 13 + y, 2, 5, C.NEAR_BLACK);
    // hands
    r.rect(3, 20 + y, 2, 2, C.POT_M);
    r.rect(19, 20 + y, 2, 2, C.POT_M);
    // head: short dark hair, sunglasses, a calm small smile
    r.ellipse(12, 7 + y, 5, 5.2, C.POT_M);
    r.rect(7, 2 + y, 10, 3, C.NEAR_BLACK);
    r.rect(7, 4 + y, 1, 2, C.NEAR_BLACK);
    r.rect(16, 4 + y, 1, 2, C.NEAR_BLACK);
    r.rect(8, 6 + y, 8, 2, C.NEAR_BLACK);
    r.rect(8, 6 + y, 3, 1, matrix ? C.GREEN : C.DARK_GRAY);
    r.rect(13, 6 + y, 3, 1, matrix ? C.GREEN : C.DARK_GRAY);
    r.rect(10, 10 + y, 4, 1, C.POT);
    // earpiece and the spiral cord down to the collar
    r.px(16, 8 + y, C.LIGHT_GRAY);
    for (let k = 0; k < 4; k++) r.px(17 - (k & 1), 9 + y + k, C.LIGHT_GRAY);
  };
  const guard = [0, 1].map((f) => make(24, 30, 12, 22, guardDraw(f, false)));
  const guardMatrix = [0, 1].map((f) => make(24, 30, 12, 22, guardDraw(f, true)));

  /**
   * Shopkeeperen: a friendly shop assistant (about 20 × 24) in a black sweater with a big white «A» on the chest.
   * matrix = a black coat and sunglasses.
   */
  const shopDraw = (bob, matrix) => (r) => {
    const y = bob;
    r.rect(6, 19 + y, 3, 3 - y, C.DARK_SLATE);
    r.rect(11, 19 + y, 3, 3 - y, C.DARK_SLATE);
    r.rect(5, 22, 4, 1, C.DARKER);
    r.rect(11, 22, 4, 1, C.DARKER);
    // the black sweater (a coat in The Matrix) with the big white «A»
    r.rect(4, 11 + y, 12, 9, C.NEAR_BLACK);
    r.rect(3, 12 + y, 14, 6, C.NEAR_BLACK);
    if (matrix) r.rect(3, 18 + y, 14, 4 - y, C.NEAR_BLACK);
    r.stamp('.##. #..# #..# #### #..#', 8, 12 + y, { '#': C.WHITE });
    r.rect(2, 16 + y, 2, 2, C.WOOD_L);
    r.rect(16, 16 + y, 2, 2, C.WOOD_L);
    // head: curly auburn hair, a big smile
    r.ellipse(10, 6 + y, 4.6, 4.8, C.WOOD_L);
    r.ellipse(10, 2.5 + y, 5, 2.6, C.POT);
    r.px(5, 5 + y, C.POT);
    r.px(15, 5 + y, C.POT);
    if (matrix) {
      r.rect(6, 5 + y, 8, 2, C.NEAR_BLACK);
      r.rect(7, 5 + y, 2, 1, C.GREEN);
      r.rect(11, 5 + y, 2, 1, C.GREEN);
    } else {
      r.px(8, 6 + y, C.NEAR_BLACK);
      r.px(12, 6 + y, C.NEAR_BLACK);
    }
    r.rect(8, 9 + y, 5, 1, C.DARK_RED);
    r.px(7, 8 + y, C.DARK_RED);
    r.px(13, 8 + y, C.DARK_RED);
  };
  const shop = [0, 1].map((f) => make(20, 24, 10, 17, shopDraw(f, false)));
  const shopMatrix = [0, 1].map((f) => make(20, 24, 10, 17, shopDraw(f, true)));

  /** Helsekjeks: a small round cookie (10 × 10) with chocolate chips. */
  const cookie = make(12, 12, 6, 6, (r) => {
    r.ball(6, 6, 4.6, 4.6, C.WOOD, C.WOOD_M, C.WOOD_L);
    for (const [x, y] of [[4, 4], [7, 3], [8, 7], [4, 8], [6, 6]]) r.px(x, y, C.BROWN);
    r.px(5, 4, C.BROWN);
  });

  /** A tiny fish hook (part of Frida's bait and her cast). */
  const hookDraw = (r, x, y, c) => {
    r.rect(x + 2, y, 1, 4, c);
    r.px(x + 1, y + 4, c);
    r.px(x, y + 3, c);
    r.px(x, y + 2, c);
  };
  /** Frida's bait: the energy drink in a slightly wrong (yellower) green, with a fish hook hanging off it. */
  const fakeDrink = make(14, 18, 6, 10, (r) => {
    r.rect(3, 1, 6, 1, C.GRAY);
    r.rect(2, 2, 8, 2, C.LIGHT_GRAY);
    r.rect(2, 4, 8, 11, C.LEAF_L);
    r.rect(8, 4, 2, 11, C.LEAF);
    r.rect(2, 4, 1, 11, C.LIGHT_GREEN);
    r.rect(2, 15, 8, 2, C.LIGHT_GRAY);
    r.stamp('..#. .##. ##.. .### ..#. .#..', 4, 6, { '#': C.GOLD_L });
    hookDraw(r, 10, 9, C.GRAY);
  });
  /** Frida's bait: a «Ny PC» with a slightly wrong (purple-tinted) screen and a fish hook. */
  const fakePc = make(20, 16, 9, 9, (r) => {
    r.rect(1, 1, 16, 11, C.DARKER);
    r.rect(2, 2, 14, 9, C.ICE_BLUE);
    r.rect(2, 2, 14, 2, C.PINK);
    r.rect(12, 6, 4, 5, C.PURPLE);
    r.stamp('..#.. .###. ##### .###. ..#..', 4, 4, { '#': C.WHITE });
    r.rect(7, 12, 4, 2, C.DARK_GRAY);
    r.rect(4, 14, 10, 1, C.DARKER);
    hookDraw(r, 16, 8, C.GRAY);
  });

  // Fiske-Frida's projectiles
  /** The fish hook she casts (the line is drawn by the renderer). */
  const fishHook = make(8, 9, 4, 4, (r) => {
    r.rect(4, 0, 1, 6, C.LIGHT_GRAY);
    r.rect(1, 6, 4, 1, C.LIGHT_GRAY);
    r.rect(1, 4, 1, 2, C.LIGHT_GRAY);
    r.px(2, 3, C.LIGHT_GRAY);
    r.rect(4, 0, 2, 1, C.RED);
  });
  /** A herring (silver with a blue back), falling head first. */
  const herring = make(7, 14, 3, 7, (r) => {
    r.ellipse(3.5, 7, 2.2, 5.2, C.LIGHT_GRAY);
    r.rect(2, 3, 1, 8, C.SLATE);
    r.px(3, 10, C.NEAR_BLACK);
    r.stamp('#.# .#.', 2, 0, { '#': C.SLATE });
  });
  /** A fish-shaped email: an envelope body with a tail and an eye, swimming. */
  const fishMail = make(16, 10, 8, 5, (r) => {
    r.ellipse(7, 5, 5.5, 3.5, C.WHITE);
    r.stamp('#.. ##. ### ##. #..', 12, 3, { '#': C.LIGHT_BLUE });
    for (let i = 0; i < 4; i++) r.px(3 + i, 3 + Math.floor(i * 0.6), C.LIGHT_GRAY2);
    r.px(3, 4, C.NEAR_BLACK);
    r.rect(6, 5, 3, 2, C.RED);
  });

  /** «Pakke fra leverandøren»: a cardboard box with tape, a label and a gold sticker. */
  const pkg = make(16, 14, 8, 8, (r) => {
    r.rect(1, 3, 14, 10, C.WOOD);
    r.rect(1, 3, 14, 3, C.WOOD_L);
    r.rect(1, 12, 14, 1, C.WOOD_M);
    r.rect(7, 3, 2, 10, C.BEIGE);
    r.rect(2, 8, 4, 3, C.WHITE);
    r.rect(3, 9, 2, 1, C.GRAY);
    r.stamp('.#. ### .#.', 10, 8, { '#': C.GOLD });
  });
  const items = {
    package: pkg,
    packageGlow: glow(18, '#ff9f43', 0.75),
    note, ticketShot: ticketShot(11, 8), ticketSmall: ticketShot(7, 5), cartridge, puddle, sheet, calendar,
    angel, angelEvo, mini, miniEvo, sheetSmall,
    angelGlow: glow(14, '#fff2a8', 0.55),
    // Endringsprompt 4
    angelMatrix, miniMatrix, sheetMatrix, ball, ballEvo, flame, flameGreen, lockSmall, one, zero, oneGreen, zeroGreen,
    guard, guardMatrix, shop, shopMatrix, cookie, fakeDrink, fakePc, fishHook, herring, fishMail,
    cookieGlow: glow(10, '#ffd59a', 0.55),
    fakeGlow: glow(15, '#c8f05c', 0.5),
    matrixGlow: glow(14, '#2fd06a', 0.5),
    ballGlow: glow(8, '#ff6a3a', 0.6),
    email,
    emailGlow: glow(10, '#ff4d5a', 0.7),
    exclaim: make(7, 11, 3, 10, (r) => {
      r.rect(1, 0, 5, 10, C.RED);
      r.rect(2, 1, 3, 5, C.WHITE);
      r.rect(2, 7, 3, 2, C.WHITE);
    }),
    laptopGlow: glow(9, '#8fd3ff', 0.9),
    ctrlz: rotations(14, 13, keyChar(Z, C.LIGHT_GRAY), 8),
    spiralKeys: [
      make(14, 13, 7, 6, keyChar('### #.. #.. ###', C.LIGHT_GRAY)),
      make(14, 13, 7, 6, keyChar('.#. #.# ### #.#', C.LIGHT_BLUE)),
      make(14, 13, 7, 6, keyChar('##. #.# #.# ##.', C.PINK)),
    ],
    teams: make(12, 12, 6, 6, (r) => {
      r.rect(1, 2, 9, 9, C.PURPLE);
      r.rect(1, 2, 9, 1, C.LIGHT_BLUE);
      r.rect(3, 4, 5, 1, C.WHITE);
      r.rect(5, 5, 1, 4, C.WHITE);
      r.ellipse(9.5, 2.5, 2, 2, C.RED);
    }),
    ticket, ticketLarge, drink, pc, paper,
    drinkGlow: glow(16, '#5cf08a', 0.6),
    pcGlow: glow(18, '#8fd3ff', 0.7),
    urgentGlow: glow(28, '#ffd240', 0.9),
    toner: rotations(12, 9, tonerDraw(false), 8),
    tonerEvo: rotations(12, 9, tonerDraw(true), 8),
    key: rotations(14, 8, keyDraw(false), 16),
    keyEvo: rotations(14, 8, keyDraw(true), 16),
    mouse: rotations(10, 11, mouseDraw(false), 16),
    mouseEvo: rotations(10, 11, mouseDraw(true), 16),
    glitter: [
      make(7, 7, 3, 3, (r) => r.stamp('...#... ...#... ..###.. ####### ..###.. ...#... ...#...', 0, 0, { '#': C.GOLD_L }), false),
      make(5, 5, 2, 2, (r) => r.stamp('..#.. .###. ##### .###. ..#..', 0, 0, { '#': C.WHITE }), false),
      make(3, 3, 1, 1, (r) => r.stamp('.#. ### .#.', 0, 0, { '#': C.YELLOW }), false),
    ],
    poof: [0, 1, 2, 3].map((b) => make(20, 20, 10, 10, (r) => {
      const rad = 3 + b * 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + b * 0.4;
        const d = 2 + b * 2.2;
        r.ball(10 + Math.cos(a) * d, 10 + Math.sin(a) * d, rad - b, rad - b, b < 2 ? C.WHITE : C.LIGHT_GRAY, C.LIGHT_GRAY2, C.WHITE);
      }
    }, false)),
    power: make(9, 9, 4, 4, (r) => r.stamp('...#... .#.#.#. #..#..# #..#..# #.....# .#...#. ..###..', 1, 1, { '#': C.WHITE })),
    /** Small gold crown over the elites («Partnere»). */
    crown: make(11, 8, 5, 8, (r) => r.stamp('#...#...# #...#...# ##.###.## ######### ooooooooo #########', 1, 1, { '#': C.GOLD, o: C.GOLD_M })),
    shadows: { small: shadow(14, 5), medium: shadow(18, 6), large: shadow(22, 7), boss: shadow(44, 12), player: shadow(18, 6) },
  };
  // Red-tinted copies of every enemy projectile that can hurt: they blink between the two, so they are easy to spot.
  const RED = 'rgba(255, 48, 48, 0.8)';
  items.red = {
    email: tinted(items.email, RED), ticket: tinted(items.ticketShot, RED), ticketSmall: tinted(items.ticketSmall, RED),
    paper: tinted(items.sheet, RED), calendar: tinted(items.calendar, RED), cartridge: items.cartridge.map((c) => tinted(c, RED)),
    fishHook: tinted(items.fishHook, RED), herring: tinted(items.herring, RED), fishMail: tinted(items.fishMail, RED),
  };
  return items;
}

// ---------- Office decor ----------

function makeDecor() {
  /** @type {Record<string, Sprite>} */
  const p = {};
  const desk = (up) => (r) => {
    r.rect(1, 6, 38, 14, C.WOOD);
    r.rect(1, 6, 38, 2, C.WOOD_L);
    r.rect(1, 18, 38, 2, C.WOOD_M);
    r.rect(2, 20, 2, 3, C.DARK_GRAY);
    r.rect(36, 20, 2, 3, C.DARK_GRAY);
    if (!up) {
      r.rect(12, 0, 16, 10, C.DARKER);
      r.rect(13, 1, 14, 7, C.DARK_SLATE);
      r.rect(13, 1, 14, 2, C.BLUE);
      r.rect(18, 10, 4, 2, C.DARK_GRAY);
      r.rect(11, 13, 18, 4, C.LIGHT_GRAY);
      r.rect(12, 14, 16, 1, C.GRAY);
      r.rect(32, 12, 4, 5, C.WHITE);
      r.rect(33, 13, 2, 2, C.BROWN);
      r.rect(3, 9, 6, 8, C.PAPER);
    } else {
      r.rect(12, 8, 16, 6, C.DARKER);
      r.rect(18, 13, 4, 3, C.DARK_GRAY);
      r.rect(4, 10, 5, 5, C.YELLOW);
    }
  };
  p.desk = make(40, 24, 20, 12, desk(false));
  p.deskUp = make(40, 24, 20, 12, desk(true));
  p.chair = make(14, 14, 7, 7, (r) => {
    r.rect(2, 1, 10, 4, C.CHAIR_M);
    r.ball(7, 8, 5, 4, C.CHAIR, C.CHAIR_M, C.LIGHT_GRAY2);
    r.rect(6, 12, 2, 2, C.DARKER);
  });
  p.chairUp = make(14, 14, 7, 7, (r) => {
    r.ball(7, 6, 5, 4, C.CHAIR, C.CHAIR_M, C.LIGHT_GRAY2);
    r.rect(2, 9, 10, 4, C.CHAIR_M);
  });
  p.chairSide = make(12, 14, 6, 7, (r) => {
    r.ball(6, 7, 4, 5, C.CHAIR, C.CHAIR_M, C.LIGHT_GRAY2);
    r.rect(1, 2, 3, 10, C.CHAIR_M);
  });
  p.plant = make(20, 26, 10, 18, (r) => {
    r.rect(5, 17, 10, 8, C.POT);
    r.rect(5, 17, 10, 2, C.POT_M);
    r.rect(13, 19, 2, 6, C.POT_M);
    r.rect(4, 16, 12, 2, C.POT);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      r.ellipse(10 + Math.cos(a) * 5, 9 + Math.sin(a) * 5, 4, 2.5, i % 3 === 0 ? C.LEAF_L : C.LEAF);
    }
    r.ellipse(10, 9, 3, 3, C.LEAF_M);
    r.px(9, 7, C.LEAF_L);
  });
  p.waterCooler = make(14, 26, 7, 16, (r) => {
    r.ball(7, 6, 5, 5, C.ICE_BLUE, C.BLUE, C.WHITE);
    r.rect(2, 11, 10, 14, C.NEAR_WHITE);
    r.rect(10, 11, 2, 14, C.LIGHT_GRAY2);
    r.rect(4, 14, 2, 2, C.BLUE);
    r.rect(8, 14, 2, 2, C.RED);
  });
  p.whiteboard = make(52, 22, 26, 11, (r) => {
    r.rect(1, 1, 50, 16, C.LIGHT_GRAY);
    r.rect(2, 2, 48, 14, C.WHITE);
    r.rect(5, 5, 18, 1, C.BLUE);
    r.rect(5, 8, 24, 1, C.RED);
    r.rect(5, 11, 12, 1, C.BLUE);
    r.ellipse(38, 9, 6, 4, C.GREEN);
    r.ellipse(38, 9, 5, 3, C.WHITE);
    r.rect(6, 17, 2, 4, C.GRAY);
    r.rect(44, 17, 2, 4, C.GRAY);
  });
  p.table = make(30, 22, 15, 11, (r) => {
    r.ellipse(15, 12, 13, 8, C.WOOD_M);
    r.ellipse(15, 10, 13, 8, C.WOOD_L);
    r.ellipse(11, 8, 4, 2, C.CREAM);
    r.rect(18, 9, 3, 3, C.WHITE);
  });
  p.bench = make(170, 26, 85, 13, (r) => {
    r.rect(1, 6, 168, 18, C.BEIGE);
    r.rect(1, 4, 168, 4, C.NEAR_WHITE);
    r.rect(1, 22, 168, 2, C.WOOD_M);
    for (let x = 6; x < 160; x += 28) r.rect(x, 10, 22, 10, C.CREAM);
  });
  p.benchLong = make(70, 14, 35, 7, (r) => {
    r.rect(1, 3, 68, 8, C.WOOD);
    r.rect(1, 3, 68, 2, C.WOOD_L);
    r.rect(4, 11, 2, 2, C.DARK_GRAY);
    r.rect(64, 11, 2, 2, C.DARK_GRAY);
  });
  p.coffeeMachine = make(18, 26, 9, 13, (r) => {
    r.rect(1, 2, 16, 22, C.NEAR_BLACK);
    r.rect(1, 2, 16, 3, C.DARKER);
    r.rect(3, 6, 12, 5, C.DARK_GRAY);
    r.rect(4, 7, 4, 2, C.GREEN);
    r.rect(6, 15, 6, 4, C.DARKER);
    r.rect(7, 17, 4, 3, C.WHITE);
  });
  p.fridge = make(22, 38, 11, 20, (r) => {
    r.rect(1, 1, 20, 36, C.NEAR_WHITE);
    r.rect(19, 1, 2, 36, C.LIGHT_GRAY2);
    r.rect(1, 13, 20, 1, C.GRAY);
    r.rect(16, 5, 2, 5, C.GRAY);
    r.rect(16, 17, 2, 8, C.GRAY);
    r.rect(4, 4, 4, 3, C.YELLOW);
  });
  p.vendingMachine = make(24, 38, 12, 20, (r) => {
    r.rect(1, 1, 22, 36, C.RED);
    r.rect(20, 1, 3, 36, C.DARK_RED);
    r.rect(3, 4, 14, 22, C.DARK_BLUE);
    for (let y = 6; y < 24; y += 5) for (let x = 4; x < 16; x += 4) r.rect(x, y, 3, 3, [C.YELLOW, C.GREEN, C.ORANGE, C.LIGHT_BLUE][(x + y) % 4]);
    r.rect(4, 29, 12, 4, C.NEAR_BLACK);
  });
  p.meetingTable = make(150, 40, 75, 20, (r) => {
    r.rect(1, 5, 148, 30, C.WOOD_M);
    r.rect(1, 3, 148, 30, C.WOOD);
    r.rect(1, 3, 148, 3, C.WOOD_L);
    for (const x of [20, 60, 100]) r.rect(x, 12, 14, 9, C.PAPER);
    r.rect(126, 14, 10, 6, C.DARKER);
  });
  p.screen = make(44, 28, 22, 14, (r) => {
    r.rect(1, 1, 42, 24, C.NEAR_BLACK);
    r.rect(3, 3, 38, 20, C.DARK_BLUE);
    r.rect(3, 3, 38, 4, C.BLUE);
    r.rect(8, 10, 12, 8, C.LIGHT_BLUE);
    r.rect(24, 10, 12, 3, C.WHITE);
    r.rect(24, 15, 9, 3, C.WHITE);
  });
  p.printer = make(30, 28, 15, 14, (r) => {
    r.rect(1, 6, 28, 18, C.NEAR_WHITE);
    r.rect(1, 6, 28, 3, C.WHITE);
    r.rect(26, 6, 3, 18, C.LIGHT_GRAY2);
    r.rect(5, 2, 20, 6, C.PAPER);
    r.rect(4, 14, 22, 3, C.DARKER);
    r.rect(5, 17, 20, 4, C.PAPER);
    r.rect(22, 9, 3, 2, C.GREEN);
    r.rect(1, 24, 28, 3, C.DARK_GRAY);
  });
  p.copier = make(38, 34, 19, 17, (r) => {
    r.rect(1, 4, 36, 28, C.LIGHT_GRAY);
    r.rect(1, 4, 36, 4, C.NEAR_WHITE);
    r.rect(33, 4, 4, 28, C.GRAY);
    r.rect(4, 10, 24, 6, C.DARKER);
    r.rect(29, 10, 5, 4, C.DARK_SLATE);
    r.rect(30, 11, 3, 2, C.LIGHT_BLUE);
    for (let i = 0; i < 3; i++) r.rect(4, 19 + i * 4, 28, 3, C.GRAY);
  });
  p.paperBoxes = make(22, 20, 11, 10, (r) => {
    r.rect(1, 6, 20, 12, C.WOOD);
    r.rect(1, 6, 20, 2, C.WOOD_L);
    r.rect(8, 9, 6, 4, C.PAPER);
    r.rect(3, 1, 16, 6, C.WOOD_L);
    r.rect(3, 1, 16, 1, C.CREAM);
  });
  p.shelf = make(44, 24, 22, 12, (r) => {
    r.rect(1, 1, 42, 22, C.WOOD_M);
    r.rect(2, 2, 40, 9, C.WOOD);
    r.rect(2, 12, 40, 9, C.WOOD);
    const colors = [C.RED, C.BLUE, C.GREEN, C.YELLOW, C.PURPLE, C.ORANGE];
    for (let i = 0; i < 9; i++) {
      r.rect(3 + i * 4, 3, 3, 8, colors[i % 6]);
      r.rect(3 + i * 4, 13, 3, 8, colors[(i + 3) % 6]);
    }
  });
  p.receptionDesk = make(150, 44, 75, 22, (r) => {
    r.ellipse(75, 30, 74, 14, C.DARK_SLATE);
    r.ellipse(75, 28, 74, 14, C.SLATE);
    r.ellipse(75, 26, 70, 11, C.NEAR_WHITE);
    r.ellipse(75, 26, 60, 7, C.SLATE);
    r.rect(60, 12, 16, 9, C.DARKER);
    r.rect(61, 13, 14, 6, C.BLUE);
    r.rect(88, 16, 6, 6, C.LEAF);
  });
  p.carpetLogo = make(126, 62, 63, 31, (r) => {
    r.ellipse(63, 31, 62, 30, C.DARK_BLUE);
    r.ellipse(63, 31, 58, 27, C.BLUE);
    r.ellipse(63, 31, 20, 14, C.WHITE);
    r.ellipse(63, 31, 15, 10, C.TEAL);
    // power symbol (the game's own logo)
    r.ellipse(63, 32, 7, 6, C.WHITE);
    r.ellipse(63, 32, 5, 4, C.TEAL);
    r.rect(60, 23, 7, 5, C.TEAL);
    r.rect(62, 22, 3, 9, C.WHITE);
  }, false);
  p.sofa = make(60, 28, 30, 14, (r) => {
    r.rect(1, 2, 58, 10, C.WINE);
    r.rect(1, 2, 58, 2, C.WINE_L);
    r.rect(1, 10, 58, 14, C.WINE);
    r.rect(4, 12, 25, 9, C.WINE_L);
    r.rect(31, 12, 25, 9, C.WINE_L);
    r.rect(1, 8, 4, 18, C.DARK_RED);
    r.rect(55, 8, 4, 18, C.DARK_RED);
  });
  p.armchair = make(24, 24, 12, 12, (r) => {
    r.rect(2, 2, 20, 8, C.TEAL_M);
    r.rect(2, 8, 20, 13, C.TEAL);
    r.rect(5, 10, 14, 8, C.TEAL_M);
    r.rect(2, 6, 3, 15, C.TEAL_M);
    r.rect(19, 6, 3, 15, C.TEAL_M);
  });
  p.coffeeTable = make(34, 20, 17, 10, (r) => {
    r.rect(1, 4, 32, 12, C.WOOD_M);
    r.rect(1, 2, 32, 12, C.WOOD);
    r.rect(1, 2, 32, 2, C.WOOD_L);
    r.rect(6, 6, 8, 5, C.PAPER);
    r.rect(20, 5, 4, 4, C.WHITE);
  });
  p.carpetRound = make(130, 84, 65, 42, (r) => {
    r.ellipse(65, 42, 64, 41, C.BEIGE);
    r.ellipse(65, 42, 58, 36, C.CREAM);
    r.ellipse(65, 42, 50, 30, C.BEIGE);
  }, false);
  return p;
}

// ---------- Floor tiles (32 × 32, repeated) ----------

function makeFloors() {
  /** @type {Record<string, HTMLCanvasElement>} */
  const g = {};
  const tiles = (draw) => {
    const r = new Raster(32, 32);
    draw(r);
    return toCanvas(r, GPAL);
  };
  // own palette for floors: muted, calm colors
  const GF = [null, '#a9b8c8', '#9cadbf', '#b5c3d1', '#8e9fb2', // carpet
    '#efe6d4', '#ddd0b6', '#cdbd9e', // vinyl
    '#b98a5a', '#a87a4c', '#c99a68', '#93683f', // parquet
    '#b8bec6', '#a9b0b9', '#c8cdd3', // linoleum
    '#e8e4dc', '#d9d3c8', '#f3f0ea', '#c9c1b3', // marble
    '#8a8f9a', '#7c818c', '#989da8', // tiles
    '#8bbf8f', '#7cae80', '#9bcd9e']; // green carpet
  const GPAL = GF.map((f) => (f ? hex(f) : null));
  let seedValue = 7;
  const rnd = () => {
    seedValue = (seedValue * 1103515245 + 12345) & 0x7fffffff;
    return seedValue / 0x7fffffff;
  };
  g.carpet = tiles((r) => {
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      const base = (tx + ty) % 2 === 0 ? 1 : 2;
      r.rect(tx * 16, ty * 16, 16, 16, base);
      for (let i = 0; i < 16; i++) r.px(tx * 16 + Math.floor(rnd() * 16), ty * 16 + Math.floor(rnd() * 16), rnd() < 0.5 ? 3 : 4);
      r.rect(tx * 16, ty * 16, 16, 1, 3);
    }
  });
  g.vinyl = tiles((r) => {
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) r.rect(tx * 16, ty * 16, 16, 16, (tx + ty) % 2 === 0 ? 5 : 6);
    for (let i = 0; i < 10; i++) r.px(Math.floor(rnd() * 32), Math.floor(rnd() * 32), 7);
  });
  g.parquet = tiles((r) => {
    for (let y = 0; y < 32; y += 4) {
      const off = (y / 4) % 2 === 0 ? 0 : 10;
      for (let x = -off; x < 32; x += 20) {
        const c = [8, 9, 10][Math.floor(rnd() * 3)];
        r.rect(x, y, 20, 4, c);
        r.rect(x, y + 3, 20, 1, 11);
        r.rect(x + 19, y, 1, 4, 11);
      }
    }
  });
  g.linoleum = tiles((r) => {
    r.rect(0, 0, 32, 32, 12);
    for (let i = 0; i < 40; i++) r.px(Math.floor(rnd() * 32), Math.floor(rnd() * 32), rnd() < 0.5 ? 13 : 14);
    r.rect(0, 0, 32, 1, 13);
    r.rect(0, 0, 1, 32, 13);
  });
  g.marble = tiles((r) => {
    r.rect(0, 0, 32, 32, 15);
    r.rect(16, 0, 16, 16, 17);
    r.rect(0, 16, 16, 16, 17);
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(rnd() * 32), y = Math.floor(rnd() * 32);
      r.px(x, y, 16);
      r.px(x + 1, y + 1, 16);
    }
    r.rect(0, 0, 32, 1, 18);
    r.rect(0, 0, 1, 32, 18);
  });
  g.tiles = tiles((r) => {
    r.rect(0, 0, 32, 32, 19);
    r.rect(0, 0, 16, 16, 21);
    r.rect(16, 16, 16, 16, 21);
    r.rect(0, 0, 32, 1, 20);
    r.rect(0, 16, 32, 1, 20);
    r.rect(0, 0, 1, 32, 20);
    r.rect(16, 0, 1, 32, 20);
  });
  g.green = tiles((r) => {
    r.rect(0, 0, 32, 32, 22);
    for (let i = 0; i < 30; i++) r.px(Math.floor(rnd() * 32), Math.floor(rnd() * 32), rnd() < 0.5 ? 23 : 24);
  });
  return g;
}

// ---------- Rings, splashes and other effects (cached per size) ----------

/** @type {Map<string, Sprite>} */
const ringCache = new Map();

/**
 * Pixel ring with optional transparent fill (made once per radius and color).
 * @param {number} radius
 * @param {string} color "#rrggbb"
 * @param {number} thickness
 * @param {number} fill alpha 0–1 for the inside (0 = none)
 * @param {number} dot 0 = full ring, otherwise dotted
 */
export function ring(radius, color, thickness = 1, fill = 0, dot = 0) {
  radius = Math.max(2, Math.round(radius));
  const key = `${radius}|${color}|${thickness}|${fill}|${dot}`;
  let s = ringCache.get(key);
  if (s) return s;
  const d = radius * 2 + 2;
  const c = makeCanvas(d, d);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const frame = ctx.createImageData(d, d);
  const [r, g, b] = hex(color);
  const center = d / 2;
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) {
    const dist = Math.hypot(x + 0.5 - center, y + 0.5 - center);
    let a = 0;
    if (dist <= radius && dist > radius - thickness) {
      a = 255;
      if (dot && Math.floor((Math.atan2(y - center, x - center) + Math.PI) * radius / dot) % 2) a = 0;
    } else if (dist <= radius - thickness && fill > 0) a = Math.round(fill * 255);
    if (!a) continue;
    const i = (y * d + x) * 4;
    frame.data[i] = r;
    frame.data[i + 1] = g;
    frame.data[i + 2] = b;
    frame.data[i + 3] = a;
  }
  ctx.putImageData(frame, 0, 0);
  s = { canvas: c, w: d, h: d, ax: d / 2, ay: d / 2 };
  if (ringCache.size > 800) ringCache.clear();
  ringCache.set(key, s);
  return s;
}

/** @type {Map<string, Sprite>} */
const splashCache = new Map();

/** Toner splash: dots in CMYK colors (or fire for the combination). frame 0–3. */
export function splash(radius, frame, evo) {
  radius = Math.max(4, Math.round(radius / 3) * 3);
  const key = `${radius}|${frame}|${evo}`;
  let s = splashCache.get(key);
  if (s) return s;
  const d = radius * 2 + 4;
  const r = new Raster(d, d);
  let seedValue = radius * 31 + 7;
  const rnd = () => {
    seedValue = (seedValue * 1103515245 + 12345) & 0x7fffffff;
    return seedValue / 0x7fffffff;
  };
  const colors = evo ? [C.ORANGE, C.RED, C.YELLOW, C.DARK_RED] : [C.CYAN, C.MAGENTA, C.YELLOW, C.NEAR_BLACK];
  const fraction = 0.35 + frame * 0.22;
  const count = Math.round(radius * 1.6);
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2, dd = Math.sqrt(rnd()) * radius * fraction * 1.3;
    const st = 1 + Math.floor(rnd() * (frame < 2 ? 3 : 2));
    r.rect(d / 2 + Math.cos(a) * dd, d / 2 + Math.sin(a) * dd, st, st, colors[i % 4]);
  }
  if (frame < 2) r.ellipse(d / 2, d / 2, radius * fraction * 0.25, radius * fraction * 0.25, evo ? C.ORANGE : C.NEAR_BLACK);
  s = { canvas: toCanvas(r, PAL), w: d, h: d, ax: d / 2, ay: d / 2 };
  if (splashCache.size > 300) splashCache.clear();
  splashCache.set(key, s);
  return s;
}

/** Arrow to the screen edge (16 directions). */
function makeArrows(fill, dark) {
  const base = new Raster(14, 14);
  base.stamp(['......##......', '......###.....', '......####....', '##########....', '###########...', '############..', '#############.', '#############.', '############..', '###########...', '##########....', '......####....', '......###.....', '......##......'], 0, 0, { '#': fill });
  base.rect(0, 5, 10, 1, dark);
  base.rect(0, 9, 10, 1, dark);
  const out = [];
  for (let i = 0; i < 16; i++) {
    const r = rotate(base, (i / 16) * Math.PI * 2);
    r.outline(C.OUT);
    out.push({ canvas: toCanvas(r, PAL), w: r.w, h: r.h, ax: r.w / 2, ay: r.h / 2 });
  }
  return out;
}

/** Pre-drawn countdown clock above the boss (40 steps). */
function makeClocks() {
  const out = [];
  for (let tier = 0; tier <= 40; tier++) {
    const r = new Raster(24, 24);
    r.ellipse(12, 12, 11, 11, C.WHITE);
    const fraction = tier / 40;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const dx = x + 0.5 - 12, dy = y + 0.5 - 12;
      if (dx * dx + dy * dy > 8.5 * 8.5) continue;
      let v = Math.atan2(dx, -dy);
      if (v < 0) v += Math.PI * 2;
      if (v / (Math.PI * 2) < fraction) r.px(x, y, fraction < 0.25 ? C.RED : C.GOLD);
    }
    r.rect(11, 4, 2, 9, C.NEAR_BLACK);
    r.rect(11, 11, 6, 2, C.NEAR_BLACK);
    r.rect(10, 0, 4, 2, C.DARKER);
    r.outline(C.OUT);
    out.push({ canvas: toCanvas(r, PAL), w: 24, h: 24, ax: 12, ay: 12 });
  }
  return out;
}

/** Makes everything (called once at startup). */
export function makeSprites() {
  return {
    item: makeObjects(),
    decor: makeDecor(),
    floor: makeFloors(),
    arrows: { boss: makeArrows(C.RED, C.DARK_RED), urgentSprite: makeArrows(C.GOLD, C.GOLD_M), drink: makeArrows(C.GREEN, C.DARK_GREEN) },
    clocks: makeClocks(),
  };
}

/** Number of effect sprites in the cache (shown in debug mode). */
export function cacheSize() {
  return { rings: ringCache.size, splash: splashCache.size };
}

/** Draws a sprite with the anchor point at (x, y) – always on whole pixels. */
export function drawSprite(ctx, s, x, y) {
  ctx.drawImage(s.canvas, Math.round(x - s.ax), Math.round(y - s.ay));
}

export { C as COLOR_INDEX, PAL as PALETTE, ctx2d };

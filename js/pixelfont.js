// @ts-check
// «KontorPiksel» – a home-made pixel font for the game (5×7 pixels, with æ, ø and å).
// The same glyph data is used for two things:
//   1. text on the canvas (BitmapFont below), and
//   2. fonts/kontorpiksel.ttf, which is made by tools/build-font.js and used in the menus.
// License: see fonts/LISENS.txt (CC0 – free to use).

/** Rows above the baseline (accents + capitals). The baseline is below row 8. */
export const OVER = 9;
/** Rows below the baseline (g, j, p, q, y …). */
export const UNDER = 2;
/** Total height of a line of text in pixels. */
export const HEIGHT = OVER + UNDER;

/**
 * Each glyph is rows separated by spaces. '#' = pixel, '.' = empty.
 * The first row is row 2 (the top of a capital) unless the glyph starts with «n:»,
 * which means it starts n rows higher (for Å, É …).
 * @type {Record<string, string>}
 */
const G = {
  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '### .#. .#. .#. .#. .#. ###',
  J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# ##..# #.#.# #..## #...# #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.###. #...# #.... .###. ....# #...# .###.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# ##.## #...#',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  Æ: '.#### #.#.. #.#.. ##### #.#.. #.#.. #.###',
  Ø: '.###. #..## #.#.# #.#.# #.#.# ##..# .###.',
  Å: '2:..#.. .#.#. .###. #...# #...# ##### #...# #...# #...#',
  É: '2:...#. ..#.. ##### #.... ####. #.... #.... #.... #####',
  Ü: '1:.#.#. ..... #...# #...# #...# #...# #...# .###.',
  Ö: '1:.#.#. ..... .###. #...# #...# #...# .###.',
  Ä: '1:.#.#. ..... .###. #...# ##### #...# #...#',
  a: '..... ..... .###. ....# .#### #...# .####',
  b: '#.... #.... ####. #...# #...# #...# ####.',
  c: '.... .... .### #... #... #... .###',
  d: '....# ....# .#### #...# #...# #...# .####',
  e: '..... ..... .###. #...# ##### #.... .###.',
  f: '..## .#.. #### .#.. .#.. .#.. .#..',
  g: '..... ..... .#### #...# #...# #...# .#### ....# .###.',
  h: '#.... #.... ####. #...# #...# #...# #...#',
  i: '.#. ... ##. .#. .#. .#. ###',
  j: '...# .... ..## ...# ...# ...# ...# #..# .##.',
  k: '#... #... #..# #.#. ##.. #.#. #..#',
  l: '##. .#. .#. .#. .#. .#. ###',
  m: '..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#',
  n: '..... ..... ####. #...# #...# #...# #...#',
  o: '..... ..... .###. #...# #...# #...# .###.',
  p: '..... ..... ####. #...# #...# #...# ####. #.... #....',
  q: '..... ..... .#### #...# #...# #...# .#### ....# ....#',
  r: '.... .... #.## ##.. #... #... #...',
  s: '..... ..... .#### #.... .###. ....# ####.',
  t: '.#.. .#.. #### .#.. .#.. .#.. ..##',
  u: '..... ..... #...# #...# #...# #...# .####',
  v: '..... ..... #...# #...# #...# .#.#. ..#..',
  w: '..... ..... #...# #...# #.#.# #.#.# .#.#.',
  x: '..... ..... #...# .#.#. ..#.. .#.#. #...#',
  y: '..... ..... #...# #...# #...# #...# .#### ....# .###.',
  z: '..... ..... ##### ...#. ..#.. .#... #####',
  æ: '....... ....... .##.##. ...#..# .###### #..#... .##.###',
  ø: '..... ..... .###. #..## #.#.# ##..# .###.',
  å: '1:..#.. .#.#. ..#.. .###. ....# .#### #...# .####',
  é: '...#. ..#.. .###. #...# ##### #.... .###.',
  ü: '..... .#.#. ..... #...# #...# #...# .####',
  ö: '..... .#.#. ..... .###. #...# #...# .###.',
  ä: '..... .#.#. ..... .###. .#### #...# .####',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.',
  1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  2: '.###. #...# ....# ...#. ..#.. .#... #####',
  3: '####. ....# ....# .###. ....# ....# ####.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  5: '##### #.... ####. ....# ....# #...# .###.',
  6: '.###. #.... #.... ####. #...# #...# .###.',
  7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.',
  9: '.###. #...# #...# .#### ....# ....# .###.',
  '.': '. . . . . . #',
  ',': '.. .. .. .. .. .# .# #.',
  ':': '. . # . . # .',
  ';': '.. .. .# .. .. .# #.',
  '!': '# # # # # . #',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  "'": '# # . . . . .',
  '’': '# # . . . . .',
  '"': '#.# #.# ... ... ... ... ...',
  '-': '... ... ... ### ... ... ...',
  '–': '..... ..... ..... ##### ..... ..... .....',
  '−': '..... ..... ..... ##### ..... ..... .....',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  '×': '..... #...# .#.#. ..#.. .#.#. #...# .....',
  '=': '..... ..... ##### ..... ##### ..... .....',
  '/': '....# ...#. ...#. ..#.. .#... .#... #....',
  '(': '.# #. #. #. #. #. .#',
  ')': '#. .# .# .# .# .# #.',
  '[': '## #. #. #. #. #. ##',
  ']': '## .# .# .# .# .# ##',
  '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
  '#': '.#.#. ##### .#.#. .#.#. .#.#. ##### .#.#.',
  '*': '..... #.#.# .###. ##### .###. #.#.# .....',
  '«': '...... ..#..# .#..#. #..#.. .#..#. ..#..# ......',
  '»': '...... #..#.. .#..#. ..#..# .#..#. #..#.. ......',
  '·': '. . . # . . .',
  '…': '..... ..... ..... ..... ..... ..... #.#.#',
  '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#',
  '_': '..... ..... ..... ..... ..... ..... ..... #####',
  '<': '...#. ..#.. .#... #.... .#... ..#.. ...#.',
  '>': '.#... ..#.. ...#. ....# ...#. ..#.. .#...',
  '@': '.###. #...# #.### #.#.# #.### #.... .####',
  '★': '..#.. ..#.. ##### .###. .#.#. #...# .....',
  '♥': '..... .#.#. ##### ##### .###. ..#.. .....',
  '→': '..... ..#.. ...#. ##### ...#. ..#.. .....',
  '←': '..... ..#.. .#... ##### .#... ..#.. .....',
  '↑': '..#.. .###. #.#.# ..#.. ..#.. ..#.. .....',
  '↓': '..#.. ..#.. ..#.. #.#.# .###. ..#.. .....',
  '✓': '..... ....# ...## #.##. ###.. .#... .....',
  '?missing': '##### #...# #...# #...# #...# #...# #####',
};

/**
 * @typedef {Object} Glyph
 * @property {number} b width in pixels
 * @property {number} top first row (0 = very top, 2 = the top of a capital)
 * @property {string[]} rows
 */

/** @type {Map<string, Glyph>} */
const parsed = new Map();

/** Gets (and parses) the glyph for a character. Unknown characters become a square. */
export function glyph(ch) {
  let g = parsed.get(ch);
  if (g) return g;
  if (ch === ' ' || ch === ' ') {
    g = { b: 3, top: 2, rows: [] };
  } else {
    let source = G[ch] ?? G['?missing'];
    let top = 2;
    const m = /^(\d):/.exec(source);
    if (m) {
      top = 2 - Number(m[1]);
      source = source.slice(2);
    }
    const rows = source.split(' ');
    g = { b: rows[0].length, top, rows };
  }
  parsed.set(ch, g);
  return g;
}

/** All the characters the font has (used by the font generator). */
export function allChars() {
  return Object.keys(G).filter((t) => t.length === 1);
}

/** Width in pixels (unscaled) of a text. 1 pixel of spacing between characters. */
export function textWidth(text) {
  let b = 0;
  for (const t of text) b += glyph(t).b + 1;
  return Math.max(0, b - 1);
}

/**
 * Draws text on a canvas by copying prepared glyphs (fast, sharp and without junk).
 * Each color gets its own glyph sheet, which is made the first time the color is used.
 */
export class BitmapFont {
  constructor() {
    /** @type {Map<string, {canvas: HTMLCanvasElement, pos: Map<string, number>}>} */
    this.sheet = new Map();
  }

  /** Makes (or gets) a glyph sheet in one color. */
  getSheet(color) {
    let a = this.sheet.get(color);
    if (a) return a;
    const chars = [' ', ...allChars(), '?missing'];
    let x = 0;
    const pos = new Map();
    for (const t of chars) {
      pos.set(t, x);
      x += glyph(t).b + 1;
    }
    const canvas = document.createElement('canvas');
    canvas.width = x;
    canvas.height = HEIGHT;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    ctx.fillStyle = color;
    for (const t of chars) {
      const g = glyph(t);
      const x0 = /** @type {number} */ (pos.get(t));
      g.rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') ctx.fillRect(x0 + rx, g.top + ry, 1, 1);
      });
    }
    a = { canvas, pos };
    this.sheet.set(color, a);
    return a;
  }

  /**
   * Draws text with the upper left corner at (x, y). Returns the width in screen pixels.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {string} color CSS color
   * @param {number} [scale] integer
   * @param {string | null} [shadow] color of shadow/outline (null = none)
   * @param {'left'|'center'|'right'} [align]
   */
  draw(ctx, text, x, y, color, scale = 1, shadow = null, align = 'left') {
    const b = textWidth(text) * scale;
    if (align === 'center') x -= Math.floor(b / 2);
    else if (align === 'right') x -= b;
    x = Math.round(x);
    y = Math.round(y);
    if (shadow) {
      // Outline around the text (readable on all backgrounds)
      const s = Math.max(1, Math.round(scale / 2));
      this.drawRaw(ctx, text, x - s, y, shadow, scale);
      this.drawRaw(ctx, text, x + s, y, shadow, scale);
      this.drawRaw(ctx, text, x, y - s, shadow, scale);
      this.drawRaw(ctx, text, x, y + s, shadow, scale);
      this.drawRaw(ctx, text, x + s, y + s, shadow, scale);
    }
    this.drawRaw(ctx, text, x, y, color, scale);
    return b;
  }

  drawRaw(ctx, text, x, y, color, scale) {
    const a = this.getSheet(color);
    for (const t of text) {
      const g = glyph(t);
      const sx = a.pos.get(t) ?? a.pos.get('?missing');
      ctx.drawImage(a.canvas, /** @type {number} */ (sx), 0, g.b, HEIGHT, x, y, g.b * scale, HEIGHT * scale);
      x += (g.b + 1) * scale;
    }
  }
}

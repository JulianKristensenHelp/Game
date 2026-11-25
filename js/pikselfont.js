// @ts-check
// «KontorPiksel» – en egenprodusert pikselfont for spillet (5×7 piksler, med æ, ø og å).
// Samme glyfdata brukes til to ting:
//   1. tekst på lerretet (BitmapFont under), og
//   2. fonts/kontorpiksel.ttf, som lages av tools/lagfont.js og brukes i menyene.
// Lisens: se fonts/LISENS.txt (CC0 – fri bruk).

/** Rader over grunnlinjen (aksenter + versaler). Grunnlinjen ligger under rad 8. */
export const OVER = 9;
/** Rader under grunnlinjen (g, j, p, q, y …). */
export const UNDER = 2;
/** Total høyde på en tekstlinje i piksler. */
export const HOEYDE = OVER + UNDER;

/**
 * Hver glyf er rader adskilt med mellomrom. '#' = piksel, '.' = tom.
 * Første rad er rad 2 (toppen av en versal) med mindre glyfen starter med «n:»,
 * som betyr at den starter n rader høyere (for Å, É …).
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
 * @typedef {Object} Glyf
 * @property {number} b bredde i piksler
 * @property {number} topp første rad (0 = helt øverst, 2 = toppen av en versal)
 * @property {string[]} rader
 */

/** @type {Map<string, Glyf>} */
const tolket = new Map();

/** Henter (og tolker) glyfen for et tegn. Ukjente tegn blir en firkant. */
export function glyf(tegn) {
  let g = tolket.get(tegn);
  if (g) return g;
  if (tegn === ' ' || tegn === ' ') {
    g = { b: 3, topp: 2, rader: [] };
  } else {
    let kilde = G[tegn] ?? G['?missing'];
    let topp = 2;
    const m = /^(\d):/.exec(kilde);
    if (m) {
      topp = 2 - Number(m[1]);
      kilde = kilde.slice(2);
    }
    const rader = kilde.split(' ');
    g = { b: rader[0].length, topp, rader };
  }
  tolket.set(tegn, g);
  return g;
}

/** Alle tegn fonten har (brukes av font-generatoren). */
export function alleTegn() {
  return Object.keys(G).filter((t) => t.length === 1);
}

/** Bredde i piksler (uskalert) for en tekst. 1 piksel mellomrom mellom tegn. */
export function tekstBredde(tekst) {
  let b = 0;
  for (const t of tekst) b += glyf(t).b + 1;
  return Math.max(0, b - 1);
}

/**
 * Tegner tekst på et lerret ved å kopiere ferdige glyfer (raskt, skarpt og uten søppel).
 * Hver farge får sitt eget glyfark som lages første gang fargen brukes.
 */
export class BitmapFont {
  constructor() {
    /** @type {Map<string, {lerret: HTMLCanvasElement, pos: Map<string, number>}>} */
    this.ark = new Map();
  }

  /** Lager (eller henter) et glyfark i én farge. */
  hentArk(farge) {
    let a = this.ark.get(farge);
    if (a) return a;
    const tegn = [' ', ...alleTegn(), '?missing'];
    let x = 0;
    const pos = new Map();
    for (const t of tegn) {
      pos.set(t, x);
      x += glyf(t).b + 1;
    }
    const lerret = document.createElement('canvas');
    lerret.width = x;
    lerret.height = HOEYDE;
    const ctx = /** @type {CanvasRenderingContext2D} */ (lerret.getContext('2d'));
    ctx.fillStyle = farge;
    for (const t of tegn) {
      const g = glyf(t);
      const x0 = /** @type {number} */ (pos.get(t));
      g.rader.forEach((rad, ry) => {
        for (let rx = 0; rx < rad.length; rx++) if (rad[rx] === '#') ctx.fillRect(x0 + rx, g.topp + ry, 1, 1);
      });
    }
    a = { lerret, pos };
    this.ark.set(farge, a);
    return a;
  }

  /**
   * Tegner tekst med øvre venstre hjørne i (x, y). Returnerer bredden i skjermpiksler.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} tekst
   * @param {number} x
   * @param {number} y
   * @param {string} farge CSS-farge
   * @param {number} [skala] heltall
   * @param {string | null} [skygge] farge på skygge/kontur (null = ingen)
   * @param {'venstre'|'midt'|'hoeyre'} [juster]
   */
  tegn(ctx, tekst, x, y, farge, skala = 1, skygge = null, juster = 'venstre') {
    const b = tekstBredde(tekst) * skala;
    if (juster === 'midt') x -= Math.floor(b / 2);
    else if (juster === 'hoeyre') x -= b;
    x = Math.round(x);
    y = Math.round(y);
    if (skygge) {
      // Kontur rundt teksten (lesbar på alle bakgrunner)
      const s = Math.max(1, Math.round(skala / 2));
      this.tegnRaa(ctx, tekst, x - s, y, skygge, skala);
      this.tegnRaa(ctx, tekst, x + s, y, skygge, skala);
      this.tegnRaa(ctx, tekst, x, y - s, skygge, skala);
      this.tegnRaa(ctx, tekst, x, y + s, skygge, skala);
      this.tegnRaa(ctx, tekst, x + s, y + s, skygge, skala);
    }
    this.tegnRaa(ctx, tekst, x, y, farge, skala);
    return b;
  }

  tegnRaa(ctx, tekst, x, y, farge, skala) {
    const a = this.hentArk(farge);
    for (const t of tekst) {
      const g = glyf(t);
      const sx = a.pos.get(t) ?? a.pos.get('?missing');
      ctx.drawImage(a.lerret, /** @type {number} */ (sx), 0, g.b, HOEYDE, x, y, g.b * skala, HOEYDE * skala);
      x += (g.b + 1) * skala;
    }
  }
}

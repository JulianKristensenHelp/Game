// @ts-check
// Alle sprites utenom figurene: gjenstander, kontorpynt, gulv, effekter og piler.
// Tegnes én gang som fargeindekserte rutenett og caches som lerreter. Ingen eksterne bilder.
import { Raster, hex, tilLerret, lagLerret, ctx2d } from './piksel.js';

/** Felles palett for pynt og effekter. */
const FARGER = [
  null, '#1d1626', '#ffffff', '#d7dde4', '#9aa3ad', '#5d6b7a', '#3a4350', '#ffe066', '#c79a00', '#8a6d00',
  '#2fd06a', '#1e9a4c', '#9ff0bd', '#3aa0ff', '#1f6fbf', '#a8dcff', '#e5484d', '#a32f33', '#ff9f43', '#e3cfa8',
  '#c2a57b', '#8a6f4c', '#6b4a2f', '#4c9a5a', '#7cc47f', '#2f6b3a', '#c0703f', '#8a4a2a', '#19b5c9', '#e0409a',
  '#14b8a6', '#0f766e', '#f5cf3a', '#c9941a', '#fff6c8', '#7a5cc9', '#efe9dc', '#c9bfa8', '#2b2f38', '#5a6b7d',
  '#6b7a8a', '#4a5562', '#eef1f5', '#b9c3cd', '#9b2d3a', '#d65f6a', '#3d4a5c', '#f6f0e2', '#8fd3ff', '#ffd1dc',
];
const PAL = FARGER.map((f) => (f ? hex(f) : null));
/** Navn på fargeindekser (for lesbar kode). */
const C = {
  UT: 1, HVIT: 2, LYSGRAA: 3, GRAA: 4, MORKGRAA: 5, MORKERE: 6, GUL: 7, MORKGUL: 8, BRUNGUL: 9,
  GROENN: 10, MORKGROENN: 11, LYSGROENN: 12, BLAA: 13, MORKBLAA: 14, LYSBLAA: 15, ROED: 16, MORKROED: 17, ORANSJE: 18,
  TRE_L: 19, TRE: 20, TRE_M: 21, BRUN: 22, BLAD: 23, BLAD_L: 24, BLAD_M: 25, POTTE: 26, POTTE_M: 27,
  CYAN: 28, MAGENTA: 29, TURKIS: 30, TURKIS_M: 31, GULL: 32, GULL_M: 33, GULL_L: 34, LILLA: 35, KREM: 36, BEIGE: 37,
  NESTENSVART: 38, SKIFER: 39, STOL: 40, STOL_M: 41, NESTENHVIT: 42, LYSGRAA2: 43, VIN: 44, VIN_L: 45, MORKSKIFER: 46,
  PAPIR: 47, ISBLAA: 48, ROSA: 49,
};

/**
 * @typedef {Object} Sprite
 * @property {HTMLCanvasElement} lerret
 * @property {number} w
 * @property {number} h
 * @property {number} ax ankerpunkt x
 * @property {number} ay ankerpunkt y
 */

/** Lager en sprite fra en tegnefunksjon. @returns {Sprite} */
function lag(w, h, ax, ay, tegn, kontur = true) {
  const r = new Raster(w, h);
  tegn(r);
  if (kontur) r.kontur(C.UT);
  return { lerret: tilLerret(r, PAL), w, h, ax, ay };
}

/** Roterer et rutenett (nærmeste nabo, så pikslene forblir skarpe). */
function roter(r, vinkel) {
  const s = Math.ceil(Math.hypot(r.w, r.h)) + 2;
  const ut = new Raster(s, s);
  const cos = Math.cos(-vinkel), sin = Math.sin(-vinkel);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = x + 0.5 - s / 2, dy = y + 0.5 - s / 2;
    const sx = Math.floor(dx * cos - dy * sin + r.w / 2), sy = Math.floor(dx * sin + dy * cos + r.h / 2);
    const c = r.get(sx, sy);
    if (c) ut.px(x, y, c);
  }
  return ut;
}

/** Lager N roterte varianter av en sprite (for nøkler, mus og tonerkassetter). */
function rotasjoner(w, h, tegn, n) {
  const base = new Raster(w, h);
  tegn(base);
  const ut = [];
  for (let i = 0; i < n; i++) {
    const r = roter(base, (i / n) * Math.PI * 2);
    r.kontur(C.UT);
    ut.push({ lerret: tilLerret(r, PAL), w: r.w, h: r.h, ax: r.w / 2, ay: r.h / 2 });
  }
  return ut;
}

/** Myk, «dithret» glød (bare ferdigtegnet – aldri shadowBlur under spill). */
function glod(radius, farge, styrke = 0.75) {
  const s = radius * 2;
  const c = lagLerret(s, s);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const bilde = ctx.createImageData(s, s);
  const [r, g, b] = hex(farge);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x + 0.5 - radius, y + 0.5 - radius) / radius;
    if (d >= 1) continue;
    const v = (1 - d) * styrke;
    const terskel = bayer[(y % 4) * 4 + (x % 4)] / 16;
    const a = v > terskel ? Math.min(1, 0.35 + v * 0.55) : v * 0.3;
    const i = (y * s + x) * 4;
    bilde.data[i] = r;
    bilde.data[i + 1] = g;
    bilde.data[i + 2] = b;
    bilde.data[i + 3] = Math.round(a * 255);
  }
  ctx.putImageData(bilde, 0, 0);
  return { lerret: c, w: s, h: s, ax: radius, ay: radius };
}

/** Halvgjennomsiktig ellipse-skygge under figurer. */
function skygge(w, h) {
  const c = lagLerret(w, h);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const bilde = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2);
    if (nx * nx + ny * ny > 1) continue;
    bilde.data[(y * w + x) * 4 + 3] = 70;
  }
  ctx.putImageData(bilde, 0, 0);
  return { lerret: c, w, h, ax: w / 2, ay: h / 2 };
}

// ---------- Gjenstander ----------

function lagGjenstander() {
  const lapp = lag(12, 12, 6, 6, (r) => {
    r.rect(1, 2, 10, 9, C.MORKGUL);
    r.rect(1, 1, 10, 9, C.GUL);
    r.rect(1, 1, 10, 2, C.GULL_L);
    r.rect(3, 4, 6, 1, C.BRUNGUL);
    r.rect(3, 6, 6, 1, C.BRUNGUL);
    r.rect(3, 8, 4, 1, C.BRUNGUL);
    r.rect(8, 8, 2, 2, C.ROED);
  });
  const lappStor = lag(16, 16, 8, 8, (r) => {
    r.rect(3, 1, 11, 10, C.MORKGUL);
    r.rect(2, 3, 11, 10, C.GULL);
    r.rect(1, 5, 11, 10, C.GUL);
    r.rect(1, 5, 11, 2, C.GULL_L);
    r.rect(3, 8, 7, 1, C.BRUNGUL);
    r.rect(3, 10, 7, 1, C.BRUNGUL);
    r.rect(3, 12, 5, 1, C.BRUNGUL);
  });
  const drikk = lag(12, 18, 6, 10, (r) => {
    r.rect(3, 1, 6, 1, C.GRAA);
    r.rect(2, 2, 8, 2, C.LYSGRAA);
    r.px(5, 1, C.MORKGRAA);
    r.rect(2, 4, 8, 11, C.GROENN);
    r.rect(8, 4, 2, 11, C.MORKGROENN);
    r.rect(2, 4, 1, 11, C.LYSGROENN);
    r.rect(2, 15, 8, 2, C.LYSGRAA);
    r.rect(8, 15, 2, 2, C.GRAA);
    // lyn
    r.stempel('..#. .##. ##.. .### ..#. .#..', 4, 6, { '#': C.GUL });
  });
  const pc = lag(18, 16, 9, 9, (r) => {
    r.rect(1, 1, 16, 11, C.MORKERE);
    r.rect(2, 2, 14, 9, C.LYSBLAA);
    r.rect(2, 2, 14, 2, C.HVIT);
    r.rect(12, 6, 4, 5, C.BLAA);
    r.stempel('..#.. .###. ##### .###. ..#..', 4, 4, { '#': C.HVIT });
    r.rect(7, 12, 4, 2, C.MORKGRAA);
    r.rect(4, 14, 10, 1, C.MORKERE);
  });
  const papir = lag(28, 20, 14, 10, (r) => {
    const ark = [[2, 6], [11, 3], [7, 10], [16, 8], [4, 12], [13, 12]];
    for (const [x, y] of ark) {
      r.rect(x, y, 10, 7, C.PAPIR);
      r.rect(x, y + 6, 10, 1, C.LYSGRAA);
      r.rect(x + 2, y + 2, 6, 1, C.LYSGRAA2);
      r.rect(x + 2, y + 4, 5, 1, C.LYSGRAA2);
    }
  });
  const tonerTegn = (evo) => (r) => {
    r.rect(1, 2, 10, 5, evo ? C.MORKROED : C.NESTENSVART);
    r.rect(1, 2, 10, 1, evo ? C.ORANSJE : C.MORKERE);
    r.rect(3, 2, 2, 5, evo ? C.ORANSJE : C.CYAN);
    r.rect(6, 2, 2, 5, evo ? C.GUL : C.MAGENTA);
    r.rect(9, 2, 2, 5, evo ? C.ROED : C.GUL);
  };
  const noekkelTegn = (evo) => (r) => {
    const g = evo ? C.LYSBLAA : C.GUL, m = evo ? C.MORKBLAA : C.MORKGUL;
    r.rect(1, 1, 5, 5, g);
    r.rect(2, 2, 3, 3, m);
    r.px(3, 3, C.HVIT);
    r.rect(6, 3, 7, 2, g);
    r.rect(6, 4, 7, 1, m);
    r.rect(10, 5, 1, 2, g);
    r.rect(12, 5, 1, 2, g);
  };
  const musTegn = (evo) => (r) => {
    r.rect(2, 1, 6, 9, evo ? C.LYSBLAA : C.NESTENHVIT);
    r.rect(1, 2, 8, 7, evo ? C.LYSBLAA : C.NESTENHVIT);
    r.rect(7, 2, 1, 7, evo ? C.BLAA : C.LYSGRAA2);
    r.rect(4, 1, 1, 4, C.GRAA);
    r.rect(1, 4, 8, 1, C.GRAA);
    r.rect(4, 2, 1, 2, evo ? C.HVIT : C.TURKIS);
  };
  // ----- Nytt i versjon 3 -----
  const tastTegn = (bokstav, farge) => (r) => {
    r.rect(1, 2, 12, 10, C.MORKGRAA);
    r.rect(1, 1, 12, 9, farge);
    r.rect(2, 2, 10, 7, C.NESTENHVIT);
    r.stempel(bokstav, 4, 3, { '#': C.NESTENSVART });
  };
  const Z = '#### ...# ..#. .#.. ####';
  const epost = lag(14, 11, 7, 5, (r) => {
    // konvolutt med rødt utropstegn – tydelig annerledes enn spillerens egne effekter
    r.rect(1, 1, 12, 9, C.HVIT);
    r.rect(1, 8, 12, 1, C.LYSGRAA);
    for (let i = 0; i < 6; i++) {
      r.px(1 + i, 1 + Math.floor(i * 0.7), C.LYSGRAA2);
      r.px(12 - i, 1 + Math.floor(i * 0.7), C.LYSGRAA2);
    }
    r.rect(6, 3, 2, 3, C.ROED);
    r.rect(6, 7, 2, 1, C.ROED);
  });
  return {
    epost,
    epostGlod: glod(10, '#ff4d5a', 0.7),
    utrop: lag(7, 11, 3, 10, (r) => {
      r.rect(1, 0, 5, 10, C.ROED);
      r.rect(2, 1, 3, 5, C.HVIT);
      r.rect(2, 7, 3, 2, C.HVIT);
    }),
    laptopGlod: glod(9, '#8fd3ff', 0.9),
    ctrlz: rotasjoner(14, 13, tastTegn(Z, C.LYSGRAA), 8),
    spiralTaster: [
      lag(14, 13, 7, 6, tastTegn('### #.. #.. ###', C.LYSGRAA)),
      lag(14, 13, 7, 6, tastTegn('.#. #.# ### #.#', C.LYSBLAA)),
      lag(14, 13, 7, 6, tastTegn('##. #.# #.# ##.', C.ROSA)),
    ],
    teams: lag(12, 12, 6, 6, (r) => {
      r.rect(1, 2, 9, 9, C.LILLA);
      r.rect(1, 2, 9, 1, C.LYSBLAA);
      r.rect(3, 4, 5, 1, C.HVIT);
      r.rect(5, 5, 1, 4, C.HVIT);
      r.ellipse(9.5, 2.5, 2, 2, C.ROED);
    }),
    lapp, lappStor, drikk, pc, papir,
    drikkGlod: glod(16, '#5cf08a', 0.6),
    pcGlod: glod(18, '#8fd3ff', 0.7),
    hasteGlod: glod(28, '#ffd240', 0.9),
    toner: rotasjoner(12, 9, tonerTegn(false), 8),
    tonerEvo: rotasjoner(12, 9, tonerTegn(true), 8),
    noekkel: rotasjoner(14, 8, noekkelTegn(false), 16),
    noekkelEvo: rotasjoner(14, 8, noekkelTegn(true), 16),
    mus: rotasjoner(10, 11, musTegn(false), 16),
    musEvo: rotasjoner(10, 11, musTegn(true), 16),
    glitter: [
      lag(7, 7, 3, 3, (r) => r.stempel('...#... ...#... ..###.. ####### ..###.. ...#... ...#...', 0, 0, { '#': C.GULL_L }), false),
      lag(5, 5, 2, 2, (r) => r.stempel('..#.. .###. ##### .###. ..#..', 0, 0, { '#': C.HVIT }), false),
      lag(3, 3, 1, 1, (r) => r.stempel('.#. ### .#.', 0, 0, { '#': C.GUL }), false),
    ],
    poff: [0, 1, 2, 3].map((b) => lag(20, 20, 10, 10, (r) => {
      const rad = 3 + b * 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + b * 0.4;
        const d = 2 + b * 2.2;
        r.kule(10 + Math.cos(a) * d, 10 + Math.sin(a) * d, rad - b, rad - b, b < 2 ? C.HVIT : C.LYSGRAA, C.LYSGRAA2, C.HVIT);
      }
    }, false)),
    stroem: lag(9, 9, 4, 4, (r) => r.stempel('...#... .#.#.#. #..#..# #..#..# #.....# .#...#. ..###..', 1, 1, { '#': C.HVIT })),
    skygger: { liten: skygge(14, 5), middels: skygge(18, 6), stor: skygge(22, 7), boss: skygge(44, 12), spiller: skygge(18, 6) },
  };
}

// ---------- Kontorpynt ----------

function lagPynt() {
  /** @type {Record<string, Sprite>} */
  const p = {};
  const pult = (opp) => (r) => {
    r.rect(1, 6, 38, 14, C.TRE);
    r.rect(1, 6, 38, 2, C.TRE_L);
    r.rect(1, 18, 38, 2, C.TRE_M);
    r.rect(2, 20, 2, 3, C.MORKGRAA);
    r.rect(36, 20, 2, 3, C.MORKGRAA);
    if (!opp) {
      r.rect(12, 0, 16, 10, C.MORKERE);
      r.rect(13, 1, 14, 7, C.MORKSKIFER);
      r.rect(13, 1, 14, 2, C.BLAA);
      r.rect(18, 10, 4, 2, C.MORKGRAA);
      r.rect(11, 13, 18, 4, C.LYSGRAA);
      r.rect(12, 14, 16, 1, C.GRAA);
      r.rect(32, 12, 4, 5, C.HVIT);
      r.rect(33, 13, 2, 2, C.BRUN);
      r.rect(3, 9, 6, 8, C.PAPIR);
    } else {
      r.rect(12, 8, 16, 6, C.MORKERE);
      r.rect(18, 13, 4, 3, C.MORKGRAA);
      r.rect(4, 10, 5, 5, C.GUL);
    }
  };
  p.pult = lag(40, 24, 20, 12, pult(false));
  p.pultOpp = lag(40, 24, 20, 12, pult(true));
  p.stol = lag(14, 14, 7, 7, (r) => {
    r.rect(2, 1, 10, 4, C.STOL_M);
    r.kule(7, 8, 5, 4, C.STOL, C.STOL_M, C.LYSGRAA2);
    r.rect(6, 12, 2, 2, C.MORKERE);
  });
  p.stolOpp = lag(14, 14, 7, 7, (r) => {
    r.kule(7, 6, 5, 4, C.STOL, C.STOL_M, C.LYSGRAA2);
    r.rect(2, 9, 10, 4, C.STOL_M);
  });
  p.stolSide = lag(12, 14, 6, 7, (r) => {
    r.kule(6, 7, 4, 5, C.STOL, C.STOL_M, C.LYSGRAA2);
    r.rect(1, 2, 3, 10, C.STOL_M);
  });
  p.plante = lag(20, 26, 10, 18, (r) => {
    r.rect(5, 17, 10, 8, C.POTTE);
    r.rect(5, 17, 10, 2, C.POTTE_M);
    r.rect(13, 19, 2, 6, C.POTTE_M);
    r.rect(4, 16, 12, 2, C.POTTE);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      r.ellipse(10 + Math.cos(a) * 5, 9 + Math.sin(a) * 5, 4, 2.5, i % 3 === 0 ? C.BLAD_L : C.BLAD);
    }
    r.ellipse(10, 9, 3, 3, C.BLAD_M);
    r.px(9, 7, C.BLAD_L);
  });
  p.vannkjoler = lag(14, 26, 7, 16, (r) => {
    r.kule(7, 6, 5, 5, C.ISBLAA, C.BLAA, C.HVIT);
    r.rect(2, 11, 10, 14, C.NESTENHVIT);
    r.rect(10, 11, 2, 14, C.LYSGRAA2);
    r.rect(4, 14, 2, 2, C.BLAA);
    r.rect(8, 14, 2, 2, C.ROED);
  });
  p.tavle = lag(52, 22, 26, 11, (r) => {
    r.rect(1, 1, 50, 16, C.LYSGRAA);
    r.rect(2, 2, 48, 14, C.HVIT);
    r.rect(5, 5, 18, 1, C.BLAA);
    r.rect(5, 8, 24, 1, C.ROED);
    r.rect(5, 11, 12, 1, C.BLAA);
    r.ellipse(38, 9, 6, 4, C.GROENN);
    r.ellipse(38, 9, 5, 3, C.HVIT);
    r.rect(6, 17, 2, 4, C.GRAA);
    r.rect(44, 17, 2, 4, C.GRAA);
  });
  p.bord = lag(30, 22, 15, 11, (r) => {
    r.ellipse(15, 12, 13, 8, C.TRE_M);
    r.ellipse(15, 10, 13, 8, C.TRE_L);
    r.ellipse(11, 8, 4, 2, C.KREM);
    r.rect(18, 9, 3, 3, C.HVIT);
  });
  p.benk = lag(170, 26, 85, 13, (r) => {
    r.rect(1, 6, 168, 18, C.BEIGE);
    r.rect(1, 4, 168, 4, C.NESTENHVIT);
    r.rect(1, 22, 168, 2, C.TRE_M);
    for (let x = 6; x < 160; x += 28) r.rect(x, 10, 22, 10, C.KREM);
  });
  p.benkLang = lag(70, 14, 35, 7, (r) => {
    r.rect(1, 3, 68, 8, C.TRE);
    r.rect(1, 3, 68, 2, C.TRE_L);
    r.rect(4, 11, 2, 2, C.MORKGRAA);
    r.rect(64, 11, 2, 2, C.MORKGRAA);
  });
  p.kaffemaskin = lag(18, 26, 9, 13, (r) => {
    r.rect(1, 2, 16, 22, C.NESTENSVART);
    r.rect(1, 2, 16, 3, C.MORKERE);
    r.rect(3, 6, 12, 5, C.MORKGRAA);
    r.rect(4, 7, 4, 2, C.GROENN);
    r.rect(6, 15, 6, 4, C.MORKERE);
    r.rect(7, 17, 4, 3, C.HVIT);
  });
  p.kjoleskap = lag(22, 38, 11, 20, (r) => {
    r.rect(1, 1, 20, 36, C.NESTENHVIT);
    r.rect(19, 1, 2, 36, C.LYSGRAA2);
    r.rect(1, 13, 20, 1, C.GRAA);
    r.rect(16, 5, 2, 5, C.GRAA);
    r.rect(16, 17, 2, 8, C.GRAA);
    r.rect(4, 4, 4, 3, C.GUL);
  });
  p.automat = lag(24, 38, 12, 20, (r) => {
    r.rect(1, 1, 22, 36, C.ROED);
    r.rect(20, 1, 3, 36, C.MORKROED);
    r.rect(3, 4, 14, 22, C.MORKBLAA);
    for (let y = 6; y < 24; y += 5) for (let x = 4; x < 16; x += 4) r.rect(x, y, 3, 3, [C.GUL, C.GROENN, C.ORANSJE, C.LYSBLAA][(x + y) % 4]);
    r.rect(4, 29, 12, 4, C.NESTENSVART);
  });
  p.motebord = lag(150, 40, 75, 20, (r) => {
    r.rect(1, 5, 148, 30, C.TRE_M);
    r.rect(1, 3, 148, 30, C.TRE);
    r.rect(1, 3, 148, 3, C.TRE_L);
    for (const x of [20, 60, 100]) r.rect(x, 12, 14, 9, C.PAPIR);
    r.rect(126, 14, 10, 6, C.MORKERE);
  });
  p.skjerm = lag(44, 28, 22, 14, (r) => {
    r.rect(1, 1, 42, 24, C.NESTENSVART);
    r.rect(3, 3, 38, 20, C.MORKBLAA);
    r.rect(3, 3, 38, 4, C.BLAA);
    r.rect(8, 10, 12, 8, C.LYSBLAA);
    r.rect(24, 10, 12, 3, C.HVIT);
    r.rect(24, 15, 9, 3, C.HVIT);
  });
  p.printer = lag(30, 28, 15, 14, (r) => {
    r.rect(1, 6, 28, 18, C.NESTENHVIT);
    r.rect(1, 6, 28, 3, C.HVIT);
    r.rect(26, 6, 3, 18, C.LYSGRAA2);
    r.rect(5, 2, 20, 6, C.PAPIR);
    r.rect(4, 14, 22, 3, C.MORKERE);
    r.rect(5, 17, 20, 4, C.PAPIR);
    r.rect(22, 9, 3, 2, C.GROENN);
    r.rect(1, 24, 28, 3, C.MORKGRAA);
  });
  p.kopimaskin = lag(38, 34, 19, 17, (r) => {
    r.rect(1, 4, 36, 28, C.LYSGRAA);
    r.rect(1, 4, 36, 4, C.NESTENHVIT);
    r.rect(33, 4, 4, 28, C.GRAA);
    r.rect(4, 10, 24, 6, C.MORKERE);
    r.rect(29, 10, 5, 4, C.MORKSKIFER);
    r.rect(30, 11, 3, 2, C.LYSBLAA);
    for (let i = 0; i < 3; i++) r.rect(4, 19 + i * 4, 28, 3, C.GRAA);
  });
  p.papiresker = lag(22, 20, 11, 10, (r) => {
    r.rect(1, 6, 20, 12, C.TRE);
    r.rect(1, 6, 20, 2, C.TRE_L);
    r.rect(8, 9, 6, 4, C.PAPIR);
    r.rect(3, 1, 16, 6, C.TRE_L);
    r.rect(3, 1, 16, 1, C.KREM);
  });
  p.hylle = lag(44, 24, 22, 12, (r) => {
    r.rect(1, 1, 42, 22, C.TRE_M);
    r.rect(2, 2, 40, 9, C.TRE);
    r.rect(2, 12, 40, 9, C.TRE);
    const farger = [C.ROED, C.BLAA, C.GROENN, C.GUL, C.LILLA, C.ORANSJE];
    for (let i = 0; i < 9; i++) {
      r.rect(3 + i * 4, 3, 3, 8, farger[i % 6]);
      r.rect(3 + i * 4, 13, 3, 8, farger[(i + 3) % 6]);
    }
  });
  p.resepsjonsdisk = lag(150, 44, 75, 22, (r) => {
    r.ellipse(75, 30, 74, 14, C.MORKSKIFER);
    r.ellipse(75, 28, 74, 14, C.SKIFER);
    r.ellipse(75, 26, 70, 11, C.NESTENHVIT);
    r.ellipse(75, 26, 60, 7, C.SKIFER);
    r.rect(60, 12, 16, 9, C.MORKERE);
    r.rect(61, 13, 14, 6, C.BLAA);
    r.rect(88, 16, 6, 6, C.BLAD);
  });
  p.teppeLogo = lag(126, 62, 63, 31, (r) => {
    r.ellipse(63, 31, 62, 30, C.MORKBLAA);
    r.ellipse(63, 31, 58, 27, C.BLAA);
    r.ellipse(63, 31, 20, 14, C.HVIT);
    r.ellipse(63, 31, 15, 10, C.TURKIS);
    // strømsymbol (spillets eget merke)
    r.ellipse(63, 32, 7, 6, C.HVIT);
    r.ellipse(63, 32, 5, 4, C.TURKIS);
    r.rect(60, 23, 7, 5, C.TURKIS);
    r.rect(62, 22, 3, 9, C.HVIT);
  }, false);
  p.sofa = lag(60, 28, 30, 14, (r) => {
    r.rect(1, 2, 58, 10, C.VIN);
    r.rect(1, 2, 58, 2, C.VIN_L);
    r.rect(1, 10, 58, 14, C.VIN);
    r.rect(4, 12, 25, 9, C.VIN_L);
    r.rect(31, 12, 25, 9, C.VIN_L);
    r.rect(1, 8, 4, 18, C.MORKROED);
    r.rect(55, 8, 4, 18, C.MORKROED);
  });
  p.lenestol = lag(24, 24, 12, 12, (r) => {
    r.rect(2, 2, 20, 8, C.TURKIS_M);
    r.rect(2, 8, 20, 13, C.TURKIS);
    r.rect(5, 10, 14, 8, C.TURKIS_M);
    r.rect(2, 6, 3, 15, C.TURKIS_M);
    r.rect(19, 6, 3, 15, C.TURKIS_M);
  });
  p.salongbord = lag(34, 20, 17, 10, (r) => {
    r.rect(1, 4, 32, 12, C.TRE_M);
    r.rect(1, 2, 32, 12, C.TRE);
    r.rect(1, 2, 32, 2, C.TRE_L);
    r.rect(6, 6, 8, 5, C.PAPIR);
    r.rect(20, 5, 4, 4, C.HVIT);
  });
  p.teppeRundt = lag(130, 84, 65, 42, (r) => {
    r.ellipse(65, 42, 64, 41, C.BEIGE);
    r.ellipse(65, 42, 58, 36, C.KREM);
    r.ellipse(65, 42, 50, 30, C.BEIGE);
  }, false);
  return p;
}

// ---------- Gulvfliser (32 × 32, gjentas) ----------

function lagGulv() {
  /** @type {Record<string, HTMLCanvasElement>} */
  const g = {};
  const flis = (tegn) => {
    const r = new Raster(32, 32);
    tegn(r);
    return tilLerret(r, GPAL);
  };
  // egen palett for gulv: dempede, rolige farger
  const GF = [null, '#a9b8c8', '#9cadbf', '#b5c3d1', '#8e9fb2', // teppe
    '#efe6d4', '#ddd0b6', '#cdbd9e', // vinyl
    '#b98a5a', '#a87a4c', '#c99a68', '#93683f', // parkett
    '#b8bec6', '#a9b0b9', '#c8cdd3', // linoleum
    '#e8e4dc', '#d9d3c8', '#f3f0ea', '#c9c1b3', // marmor
    '#8a8f9a', '#7c818c', '#989da8', // fliser
    '#8bbf8f', '#7cae80', '#9bcd9e']; // grønt teppe
  const GPAL = GF.map((f) => (f ? hex(f) : null));
  let frø = 7;
  const tilf = () => {
    frø = (frø * 1103515245 + 12345) & 0x7fffffff;
    return frø / 0x7fffffff;
  };
  g.teppe = flis((r) => {
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      const base = (tx + ty) % 2 === 0 ? 1 : 2;
      r.rect(tx * 16, ty * 16, 16, 16, base);
      for (let i = 0; i < 16; i++) r.px(tx * 16 + Math.floor(tilf() * 16), ty * 16 + Math.floor(tilf() * 16), tilf() < 0.5 ? 3 : 4);
      r.rect(tx * 16, ty * 16, 16, 1, 3);
    }
  });
  g.vinyl = flis((r) => {
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) r.rect(tx * 16, ty * 16, 16, 16, (tx + ty) % 2 === 0 ? 5 : 6);
    for (let i = 0; i < 10; i++) r.px(Math.floor(tilf() * 32), Math.floor(tilf() * 32), 7);
  });
  g.parkett = flis((r) => {
    for (let y = 0; y < 32; y += 4) {
      const off = (y / 4) % 2 === 0 ? 0 : 10;
      for (let x = -off; x < 32; x += 20) {
        const c = [8, 9, 10][Math.floor(tilf() * 3)];
        r.rect(x, y, 20, 4, c);
        r.rect(x, y + 3, 20, 1, 11);
        r.rect(x + 19, y, 1, 4, 11);
      }
    }
  });
  g.linoleum = flis((r) => {
    r.rect(0, 0, 32, 32, 12);
    for (let i = 0; i < 40; i++) r.px(Math.floor(tilf() * 32), Math.floor(tilf() * 32), tilf() < 0.5 ? 13 : 14);
    r.rect(0, 0, 32, 1, 13);
    r.rect(0, 0, 1, 32, 13);
  });
  g.marmor = flis((r) => {
    r.rect(0, 0, 32, 32, 15);
    r.rect(16, 0, 16, 16, 17);
    r.rect(0, 16, 16, 16, 17);
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(tilf() * 32), y = Math.floor(tilf() * 32);
      r.px(x, y, 16);
      r.px(x + 1, y + 1, 16);
    }
    r.rect(0, 0, 32, 1, 18);
    r.rect(0, 0, 1, 32, 18);
  });
  g.flis = flis((r) => {
    r.rect(0, 0, 32, 32, 19);
    r.rect(0, 0, 16, 16, 21);
    r.rect(16, 16, 16, 16, 21);
    r.rect(0, 0, 32, 1, 20);
    r.rect(0, 16, 32, 1, 20);
    r.rect(0, 0, 1, 32, 20);
    r.rect(16, 0, 1, 32, 20);
  });
  g.groenn = flis((r) => {
    r.rect(0, 0, 32, 32, 22);
    for (let i = 0; i < 30; i++) r.px(Math.floor(tilf() * 32), Math.floor(tilf() * 32), tilf() < 0.5 ? 23 : 24);
  });
  return g;
}

// ---------- Ringer, sprut og andre effekter (caches per størrelse) ----------

/** @type {Map<string, Sprite>} */
const ringCache = new Map();

/**
 * Pikselring med valgfri gjennomsiktig fyll (lages én gang per radius og farge).
 * @param {number} radius
 * @param {string} farge "#rrggbb"
 * @param {number} tykkelse
 * @param {number} fyll alfa 0–1 for innsiden (0 = ingen)
 * @param {number} prikk 0 = hel ring, ellers stiplet
 */
export function ring(radius, farge, tykkelse = 1, fyll = 0, prikk = 0) {
  radius = Math.max(2, Math.round(radius));
  const noekkel = `${radius}|${farge}|${tykkelse}|${fyll}|${prikk}`;
  let s = ringCache.get(noekkel);
  if (s) return s;
  const d = radius * 2 + 2;
  const c = lagLerret(d, d);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const bilde = ctx.createImageData(d, d);
  const [r, g, b] = hex(farge);
  const sentrum = d / 2;
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) {
    const avst = Math.hypot(x + 0.5 - sentrum, y + 0.5 - sentrum);
    let a = 0;
    if (avst <= radius && avst > radius - tykkelse) {
      a = 255;
      if (prikk && Math.floor((Math.atan2(y - sentrum, x - sentrum) + Math.PI) * radius / prikk) % 2) a = 0;
    } else if (avst <= radius - tykkelse && fyll > 0) a = Math.round(fyll * 255);
    if (!a) continue;
    const i = (y * d + x) * 4;
    bilde.data[i] = r;
    bilde.data[i + 1] = g;
    bilde.data[i + 2] = b;
    bilde.data[i + 3] = a;
  }
  ctx.putImageData(bilde, 0, 0);
  s = { lerret: c, w: d, h: d, ax: d / 2, ay: d / 2 };
  if (ringCache.size > 800) ringCache.clear();
  ringCache.set(noekkel, s);
  return s;
}

/** @type {Map<string, Sprite>} */
const sprutCache = new Map();

/** Tonersprut: prikker i CMYK-farger (eller ild for kombinasjonen). bilde 0–3. */
export function sprut(radius, bilde, evo) {
  radius = Math.max(4, Math.round(radius / 3) * 3);
  const noekkel = `${radius}|${bilde}|${evo}`;
  let s = sprutCache.get(noekkel);
  if (s) return s;
  const d = radius * 2 + 4;
  const r = new Raster(d, d);
  let frø = radius * 31 + 7;
  const tilf = () => {
    frø = (frø * 1103515245 + 12345) & 0x7fffffff;
    return frø / 0x7fffffff;
  };
  const farger = evo ? [C.ORANSJE, C.ROED, C.GUL, C.MORKROED] : [C.CYAN, C.MAGENTA, C.GUL, C.NESTENSVART];
  const andel = 0.35 + bilde * 0.22;
  const antall = Math.round(radius * 1.6);
  for (let i = 0; i < antall; i++) {
    const a = tilf() * Math.PI * 2, dd = Math.sqrt(tilf()) * radius * andel * 1.3;
    const st = 1 + Math.floor(tilf() * (bilde < 2 ? 3 : 2));
    r.rect(d / 2 + Math.cos(a) * dd, d / 2 + Math.sin(a) * dd, st, st, farger[i % 4]);
  }
  if (bilde < 2) r.ellipse(d / 2, d / 2, radius * andel * 0.25, radius * andel * 0.25, evo ? C.ORANSJE : C.NESTENSVART);
  s = { lerret: tilLerret(r, PAL), w: d, h: d, ax: d / 2, ay: d / 2 };
  if (sprutCache.size > 300) sprutCache.clear();
  sprutCache.set(noekkel, s);
  return s;
}

/** Pil til skjermkanten (16 retninger). */
function lagPiler(fyll, mork) {
  const base = new Raster(14, 14);
  base.stempel(['......##......', '......###.....', '......####....', '##########....', '###########...', '############..', '#############.', '#############.', '############..', '###########...', '##########....', '......####....', '......###.....', '......##......'], 0, 0, { '#': fyll });
  base.rect(0, 5, 10, 1, mork);
  base.rect(0, 9, 10, 1, mork);
  const ut = [];
  for (let i = 0; i < 16; i++) {
    const r = roter(base, (i / 16) * Math.PI * 2);
    r.kontur(C.UT);
    ut.push({ lerret: tilLerret(r, PAL), w: r.w, h: r.h, ax: r.w / 2, ay: r.h / 2 });
  }
  return ut;
}

/** Ferdig tegnet nedtellingsklokke over bossen (40 trinn). */
function lagKlokker() {
  const ut = [];
  for (let trinn = 0; trinn <= 40; trinn++) {
    const r = new Raster(24, 24);
    r.ellipse(12, 12, 11, 11, C.HVIT);
    const andel = trinn / 40;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const dx = x + 0.5 - 12, dy = y + 0.5 - 12;
      if (dx * dx + dy * dy > 8.5 * 8.5) continue;
      let v = Math.atan2(dx, -dy);
      if (v < 0) v += Math.PI * 2;
      if (v / (Math.PI * 2) < andel) r.px(x, y, andel < 0.25 ? C.ROED : C.GULL);
    }
    r.rect(11, 4, 2, 9, C.NESTENSVART);
    r.rect(11, 11, 6, 2, C.NESTENSVART);
    r.rect(10, 0, 4, 2, C.MORKERE);
    r.kontur(C.UT);
    ut.push({ lerret: tilLerret(r, PAL), w: 24, h: 24, ax: 12, ay: 12 });
  }
  return ut;
}

/** Lager alt sammen (kalles én gang ved oppstart). */
export function lagSprites() {
  return {
    ting: lagGjenstander(),
    pynt: lagPynt(),
    gulv: lagGulv(),
    piler: { boss: lagPiler(C.ROED, C.MORKROED), haste: lagPiler(C.GULL, C.GULL_M), drikk: lagPiler(C.GROENN, C.MORKGROENN) },
    klokker: lagKlokker(),
  };
}

/** Antall effekt-sprites i cachen (vises i debug-modus). */
export function cacheStoerrelse() {
  return { ringer: ringCache.size, sprut: sprutCache.size };
}

/** Tegner en sprite med ankerpunktet i (x, y) – alltid på hele piksler. */
export function tegnSprite(ctx, s, x, y) {
  ctx.drawImage(s.lerret, Math.round(x - s.ax), Math.round(y - s.ay));
}

export { C as FARGEINDEKS, PAL as PALETT, ctx2d };

// @ts-check
// Figurgeneratoren: tegner spilleren og alle advokatene som fargeindekserte pikselrutenett.
// Hver advokat settes sammen av lag (hud, hår, frisyre, alder, kropp, klær og tilbehør) med palettbytte,
// så to advokater sjelden ser like ut. Utseendet er bare kosmetisk og påvirker aldri spillet.
import { CONFIG } from './config.js';
import { Raster, rampe, hex, tilLerret } from './piksel.js';
import { Rng } from './verktoy.js';

/** Fargeindekser. Tall med _S/_L er skygge (+1) og lys (+2) av samme farge. */
const I = {
  UT: 1, HUD: 2, HAAR: 5, KL: 8, SKJ: 11, AKS: 14, BUK: 17, SKO: 20, TING: 23, HIJ: 26,
  OYE: 29, MUNN: 30, HVIT: 31, BRILLE: 32, GULL: 33, ROD: 34, SVETTE: 35, UT_LYS: 36, GRAA: 37, GROENN: 38,
  BELTE: 39, SKJERM: 42, LILLA: 43, BLAA: 44,
};

// ---------- Farger ----------

/** Hudfarger fra veldig lys til veldig mørk. */
const HUDFARGER = ['#f8dfcd', '#f0c6a4', '#dea47c', '#c68a5c', '#a06a43', '#774a2c', '#52321e'];
/** Hårfarger: svart, brun, blond, rød, grå, hvit. */
const HAARFARGER = { svart: '#2a2220', brun: '#6b4429', blond: '#e0bd68', roed: '#b5502a', graa: '#9c9ca3', hvit: '#e9e9ec' };

const KLAER = {
  /** Juniorfullmektig: lys skjorte uten jakke */
  junior: ['#f3f5f8', '#cfe3f7', '#f6d6dc', '#dfe8d2', '#f3e7c9', '#dcd6f0', '#cfeae4'],
  /** Printerentusiast: strikkejakke i middels farger */
  printer: ['#3f8f5f', '#8a3b4a', '#c99a2e', '#2f7f86', '#6a4a8c', '#b5633a'],
  /** Seniorpartner: mørk dress eller drakt */
  senior: ['#1f2a44', '#2e3138', '#1a1a20', '#3b2c26', '#26343a', '#2c2442'],
  hastesak: ['#e2ad2e', '#d99f1f', '#e8b840'],
  boss: ['#7a1f2b', '#5c1a2a', '#6a2234'],
  /** «Haster!»-avsenderen: lilla genser og alltid en åpen laptop */
  avsender: ['#7b4fb8', '#6a3fa3', '#8e5cc9', '#5f3f9a'],
};
const BUKSER = ['#2e3a59', '#4a4f57', '#6b5a43', '#1f2024', '#3d4a3a', '#5a3d3d'];
const SKJORTER = ['#f4f6f8', '#d6e6f7', '#f5dde2', '#efe9dc'];
const AKSENT = ['#c0392b', '#2e86c1', '#8e44ad', '#16a085', '#d35400', '#d4ac0d', '#c2447a', '#34495e'];
const HIJABFARGER = ['#2c3e66', '#7a2e3a', '#2f7f6e', '#c9b38a', '#5b5f66', '#26262b', '#6b6b2e'];

/** Frisyrer. Fordeles jevnt. */
const STILER = ['kort', 'langt', 'hestehale', 'krollete', 'afro', 'fletter', 'knute', 'skallet', 'hijab', 'bob'];
/** Frisyrer som kan kombineres med skjegg/bart. */
const SKJEGG_OK = ['kort', 'krollete', 'afro', 'skallet', 'bob'];

/**
 * Mål for hver figurtype (i logiske piksler).
 * kb/kh = kroppens bredde/høyde, bein = beinlengde, k = størrelse på ansiktstrekk (2 = dobbel).
 */
export const TYPER = {
  junior: { w: 24, h: 32, rx: 6, ry: 6, kb: 10, kh: 8, bein: 5, sko: 2, arm: 3, k: 1, ting: 'laptop', klaer: 'skjorte', marg: 2 },
  printer: { w: 28, h: 32, rx: 6, ry: 6, kb: 12, kh: 8, bein: 5, sko: 2, arm: 3, k: 1, ting: 'papir', klaer: 'cardigan', marg: 2 },
  senior: { w: 32, h: 40, rx: 7, ry: 7, kb: 14, kh: 11, bein: 7, sko: 2, arm: 4, k: 1, ting: 'mappe', klaer: 'dress', marg: 2 },
  hastesak: { w: 32, h: 40, rx: 7, ry: 7, kb: 12, kh: 10, bein: 7, sko: 2, arm: 3, k: 1, ting: 'mappe', klaer: 'dress', marg: 2 },
  boss: { w: 64, h: 64, rx: 12, ry: 12, kb: 30, kh: 18, bein: 11, sko: 3, arm: 7, k: 2, ting: 'mappe', klaer: 'dress', marg: 2 },
  avsender: { w: 26, h: 32, rx: 6, ry: 6, kb: 10, kh: 8, bein: 5, sko: 2, arm: 3, k: 1, ting: 'aapenLaptop', klaer: 'genser', marg: 2 },
  spiller: { w: 32, h: 32, rx: 6, ry: 6, kb: 12, kh: 8, bein: 5, sko: 2, arm: 3, k: 1, ting: 'boks', klaer: 'hettegenser', marg: 3 },
};

/** Rekkefølgen på bildene i hvert spriteark. */
export const RUTE = { gange: 0, blink: 4, glad: 8, venstre: 9, antall: 18 };

/** Ankerpunkt (midt på kroppen) for hver type. */
export function anker(type) {
  const T = TYPER[type];
  const bunn = T.h - T.marg;
  const beinTopp = bunn - T.sko - T.bein + 1;
  return { ax: T.w / 2, ay: beinTopp - Math.floor(T.kh / 2) };
}

// ---------- Varianter ----------

/**
 * @typedef {Object} Variant
 * @property {number} hud 0–6
 * @property {string} alder 'ung' | 'middels' | 'eldre'
 * @property {string} stil frisyre
 * @property {string} haar hårfarge
 * @property {number} hoeyde −1, 0, 1
 * @property {number} bredde −1, 0, 1
 * @property {boolean} briller
 * @property {string} skjegg 'ingen' | 'skjegg' | 'bart'
 * @property {boolean} oreringer
 * @property {boolean} skjoert
 * @property {string} hals 'ingen' | 'slips' | 'skjerf'
 * @property {string} klaer
 * @property {string} bukse
 * @property {string} skjorte
 * @property {string} aksent
 * @property {string} hijab
 * @property {boolean} svette
 */

/** Lager en fast tabell med varianter for en type. Alle egenskaper fordeles jevnt og stokkes. */
function lagVarianter(type, n) {
  const rng = new Rng('figurer|' + type);
  /** @template T @param {T[]} verdier @returns {T[]} */
  const jevnt = (verdier) => {
    const a = [];
    for (let i = 0; i < n; i++) a.push(verdier[i % verdier.length]);
    for (let i = a.length - 1; i > 0; i--) {
      const j = rng.heltall(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const hud = jevnt([0, 1, 2, 3, 4, 5, 6]);
  const alder = jevnt(['ung', 'middels', 'eldre']);
  const stil = jevnt(STILER);
  const ungHaar = jevnt(['svart', 'brun', 'blond', 'roed', 'svart', 'brun']);
  const gammelHaar = jevnt(['graa', 'hvit']);
  const hoeyde = jevnt([-1, 0, 1]);
  const bredde = jevnt([-1, 0, 1]);
  const briller = jevnt([true, false, false]);
  const skjegg = jevnt(['skjegg', 'bart', 'ingen', 'ingen']);
  const oreringer = jevnt([true, false, false]);
  const skjoert = jevnt([true, false, false]);
  const hals = type === 'avsender' ? jevnt(['ingen', 'ingen', 'skjerf']) : type === 'junior' ? jevnt(['slips', 'skjerf', 'ingen', 'ingen']) : type === 'printer' ? jevnt(['skjerf', 'ingen', 'ingen']) : jevnt(['slips', 'slips', 'skjerf']);
  const klaer = jevnt(KLAER[type] ?? KLAER.senior);
  const bukse = jevnt(BUKSER);
  const skjorte = jevnt(SKJORTER);
  const aksent = jevnt(AKSENT);
  const hijab = jevnt(HIJABFARGER);
  const svette = jevnt([true, false]);
  /** @type {Variant[]} */
  const ut = [];
  for (let i = 0; i < n; i++) {
    const s = stil[i];
    const ok = SKJEGG_OK.includes(s);
    ut.push({
      hud: hud[i], alder: alder[i], stil: s,
      haar: alder[i] === 'eldre' ? gammelHaar[i] : ungHaar[i],
      hoeyde: hoeyde[i], bredde: bredde[i], briller: briller[i],
      skjegg: ok ? skjegg[i] : 'ingen',
      oreringer: s !== 'hijab' && oreringer[i],
      skjoert: !(ok && skjegg[i] !== 'ingen') && skjoert[i] && type !== 'boss',
      hals: hals[i], klaer: klaer[i], bukse: type === 'senior' || type === 'boss' || type === 'hastesak' ? klaer[i] : bukse[i],
      skjorte: skjorte[i], aksent: aksent[i], hijab: hijab[i],
      svette: type === 'boss' || type === 'hastesak' || svette[i],
    });
  }
  return ut;
}

/**
 * De fire spillbare karakterene (IT-avdelingen), tegnet etter bilder av ekte kolleger.
 * Bare utseendet står her – navn, tittel, startvåpen og bonus står i config.js (CONFIG.karakterer).
 * Rekkefølgen er den samme som i config.js.
 * hudHex/haar kan være egne farger for å treffe personen best mulig.
 */
const FELLES = { alder: 'ung', hoeyde: 0, bredde: 0, briller: false, skjegg: 'ingen', oreringer: false, skjoert: false, hijab: '#000000', svette: false, aksent: '#1b1b1f' };
export const SPILLERE = /** @type {(Variant & {klaerStil: string, hudHex: string, belte: string, sko: string, rosa?: boolean})[]} */ ([
  // 1: brunt, bustete hår med lugg, mørk marineblå skjorte, svart slips, svart belte, mørke bukser, klokke
  { ...FELLES, hud: 1, hudHex: '#f2cdb0', stil: 'lugg', haar: '#6e4a2e', hals: 'slips', klaerStil: 'skjorte', klaer: '#1f2a4a', skjorte: '#1f2a4a', bukse: '#1c1d24', belte: '#141416', sko: '#141416' },
  // 2: lyst, bakoverstrøket hår, grågrønn linjakke over hvit skjorte uten slips, brunt belte
  { ...FELLES, hud: 0, hudHex: '#f3d0b8', stil: 'bakover', haar: '#c9a15a', hals: 'ingen', klaerStil: 'dressApen', klaer: '#8a9283', skjorte: '#f6f6f4', bukse: '#8a9283', belte: '#6e3b24', sko: '#4a2e1e' },
  // 3: svart hår med midtskill, brun flettegenser, mørke jeans, ringer
  { ...FELLES, hud: 1, hudHex: '#efc9a6', stil: 'midtskill', haar: '#1c1a1b', hals: 'ingen', klaerStil: 'genser', klaer: '#4a3326', skjorte: '#4a3326', bukse: '#2a2d35', belte: '#2a2d35', sko: '#1d1d22' },
  // 4: rødbrunt, bølgete hår, hvit skjorte over hvit t-skjorte, gullkjede, armbånd, rosa kinn
  { ...FELLES, hud: 0, hudHex: '#f6d2bf', stil: 'boelger', haar: '#8e5638', hals: 'ingen', klaerStil: 'skjorteApen', klaer: '#f4f4f1', skjorte: '#ffffff', bukse: '#1c1d24', belte: '#1c1d24', sko: '#1d1d22', rosa: true },
]);

function palett(v, type) {
  /** @type {(number[] | null)[]} */
  const p = new Array(48).fill(null);
  const sett = (i, farge) => {
    const r = rampe(farge);
    p[i] = r[0];
    p[i + 1] = r[1];
    p[i + 2] = r[2];
  };
  sett(I.HUD, v.hudHex ?? HUDFARGER[v.hud]);
  sett(I.HAAR, HAARFARGER[v.haar] ?? v.haar);
  sett(I.KL, v.klaer);
  sett(I.SKJ, v.skjorte);
  sett(I.AKS, v.aksent);
  sett(I.BUK, v.bukse);
  sett(I.SKO, v.sko ?? '#2b2220');
  sett(I.BELTE, v.belte ?? '#2b2220');
  if (type === 'junior' || type === 'avsender') sett(I.TING, '#c3c9d2');
  else if (type === 'printer') sett(I.TING, '#ffffff');
  else if (type === 'spiller') sett(I.TING, '#cfd5dc');
  else sett(I.TING, type === 'hastesak' ? '#5a3a1e' : '#6e4325');
  sett(I.HIJ, v.hijab);
  p[I.UT] = hex(type === 'hastesak' ? '#5a3a00' : '#1d1626');
  p[I.OYE] = hex('#1d1626');
  p[I.MUNN] = hex('#7a2430');
  p[I.HVIT] = hex('#ffffff');
  p[I.BRILLE] = hex(v.hud >= 5 ? '#d9c27a' : '#2a2a35');
  p[I.GULL] = hex('#f5cf3a');
  p[I.ROD] = hex('#ef7f8e');
  p[I.SVETTE] = hex('#8fd3ff');
  p[I.UT_LYS] = hex('#f2fffb');
  p[I.GRAA] = hex('#9aa3ad');
  p[I.GROENN] = hex('#2fd06a');
  p[I.SKJERM] = hex('#8fd3ff');
  p[I.LILLA] = hex('#c06bd8');
  p[I.BLAA] = hex('#3aa0ff');
  return p;
}

// ---------- Tegning av én figur ----------

const inE = (x, y, cx, cy, rx, ry) => {
  const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
  return nx * nx + ny * ny <= 1;
};

/**
 * Tegner én figur i ett bilde.
 * @param {keyof typeof TYPER} type
 * @param {Variant} v
 * @param {number} bilde 0–3 gangsyklus, 4 = glad (tommel opp)
 */
function tegnFigur(type, v, bilde) {
  const T = TYPER[type];
  const r = new Raster(T.w, T.h);
  const k = T.k;
  const glad = bilde === 4;
  const eldre = v.alder === 'eldre';
  const benOff = glad ? 0 : [0, 1, 0, -1][bilde];
  const bob = glad || eldre ? 0 : [0, -1, 0, -1][bilde] * (k > 1 ? 2 : 1);
  const arm = glad ? 0 : [0, -1, 0, 1][bilde] * k;

  const bunn = T.h - T.marg;
  const bein = T.bein + v.hoeyde;
  const beinTopp = bunn - T.sko - bein + 1;
  const kb = T.kb + v.bredde * 2;
  const kTopp = beinTopp - T.kh + bob;
  const kV = T.w / 2 - kb / 2, kH = T.w / 2 + kb / 2; // kropp fra kV til kH-1
  const cx = T.w / 2, cy = kTopp - T.ry + 2 + (eldre ? 1 : 0);
  const rx = T.rx, ry = T.ry;
  const H = I.HAAR;

  /** Hår med enkel skyggelegging. */
  const haarPx = (x, y) => {
    const høyre = x + 0.5 > cx + rx * 0.35;
    const topp = y + 0.5 < cy - ry * 0.75 && x + 0.5 < cx - rx * 0.05 && x + 0.5 > cx - rx * 0.7;
    r.px(x, y, topp ? H + 2 : høyre ? H + 1 : H);
  };
  const haarOmraade = (pred, x0, y0, x1, y1) => {
    for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) if (pred(x, y)) haarPx(x, y);
  };
  /** Hårlokk øverst på hodet (kutt = hvor langt ned luggen går), med sider ned til «sider». */
  const lokk = (kutt, sider, ekstra = 1) => {
    haarOmraade((x, y) => {
      if (!inE(x, y, cx, cy, rx + ekstra, ry + ekstra)) return false;
      if (y + 0.5 <= cy - ry * kutt) return true;
      return Math.abs(x + 0.5 - cx) >= rx - 1.2 * k && y + 0.5 <= cy + sider;
    }, cx - rx - 2, cy - ry - 2, cx + rx + 2, cy + ry);
  };
  /** Ansiktspiksel i «ansiktsenheter» (skaleres med k). */
  const f = (x, y, c) => r.rect(cx + x * k, cy + y * k, k, k, c);

  // 1. Hår bak hodet
  if (v.stil === 'langt') {
    haarOmraade((x, y) => x >= cx - rx - 1 && x < cx + rx + 1 && y >= cy - 1 && y <= cy + ry + Math.round(ry * 0.9), cx - rx - 1, cy - 1, cx + rx + 1, cy + 2 * ry);
  } else if (v.stil === 'afro') {
    haarOmraade((x, y) => inE(x, y, cx, cy - ry * 0.3, rx + 3 * k, ry + 2 * k), cx - rx - 4 * k, cy - 2 * ry, cx + rx + 4 * k, cy + ry);
  } else if (v.stil === 'hestehale') {
    haarOmraade((x, y) => inE(x, y, cx + rx + 1 * k, cy + 1 * k, 2 * k, 4 * k), cx + rx - 2 * k, cy - 4 * k, cx + rx + 4 * k, cy + 6 * k);
    r.rect(cx + rx - 1 * k, cy - 3 * k, 2 * k, k, I.AKS);
  } else if (v.stil === 'knute') {
    haarOmraade((x, y) => inE(x, y, cx, cy - ry - 0.5 * k, 3 * k, 2.5 * k), cx - 4 * k, cy - ry - 4 * k, cx + 4 * k, cy - ry + 2 * k);
  }

  // 2. Bein og sko (eller skjørt)
  const bb = Math.max(2, Math.floor(kb * 0.3));
  const vBein = Math.floor(kV + 1), hBein = Math.ceil(kH - 1 - bb);
  const tegnBein = (x, off) => {
    const lengde = bein + off;
    const farge = v.skjoert ? I.BUK + 1 : I.BUK;
    r.rect(x, beinTopp, bb, lengde - (off < 0 ? 0 : 0), farge);
    r.rect(x + bb - 1, beinTopp, 1, lengde, farge + (v.skjoert ? 0 : 1));
    const skoY = beinTopp + lengde;
    r.rect(x - (x < cx ? 1 : 0), skoY, bb + 1, T.sko, I.SKO);
    r.rect(x - (x < cx ? 1 : 0), skoY, bb + 1, 1, I.SKO + 2);
  };
  tegnBein(vBein, Math.min(0, benOff) === benOff ? benOff : benOff);
  tegnBein(hBein, -benOff);
  if (v.skjoert) {
    const sh = Math.round(bein * 0.55);
    for (let y = 0; y < sh; y++) r.rect(kV - Math.floor(y / 2), beinTopp + y, kb + Math.floor(y / 2) * 2, 1, y === sh - 1 ? I.BUK + 1 : I.BUK);
  } else {
    r.rect(kV + 1, beinTopp, kb - 2, 1, I.BUK);
  }

  // 3. Kropp og klær
  const kropp = type === 'junior' ? I.SKJ : I.KL;
  const kroppFarge = type === 'junior' ? (x) => (x === Math.floor(kH - 1) ? I.KL + 1 : x === Math.floor(kV) ? I.KL + 2 : I.KL) : (x) => (x >= kH - 2 ? I.KL + 1 : x === Math.floor(kV) ? I.KL + 2 : I.KL);
  for (let y = kTopp; y < beinTopp + 1; y++) {
    for (let x = Math.floor(kV); x < kH; x++) {
      const hjoerne = y === kTopp && (x === Math.floor(kV) || x === Math.floor(kH - 1));
      if (hjoerne) continue;
      r.px(x, y, y === beinTopp ? I.KL + 1 : kroppFarge(x));
    }
  }
  void kropp;
  if (T.klaer === 'dress') {
    // jakkeslag (V) med skjorte
    const vh = Math.round(T.kh * 0.5);
    for (let y = 0; y < vh; y++) {
      const b = Math.max(0, Math.round((vh - y) * (k > 1 ? 1.6 : 1)));
      if (b > 0) r.rect(cx - b / 2, kTopp + y, b, 1, I.SKJ);
    }
    r.px(cx - 1, kTopp + vh + 1, I.KL + 1);
    r.px(cx - 1, kTopp + vh + 3, I.KL + 1);
    if (k > 1) {
      r.rect(cx - 1, kTopp + vh + 2, 2, 2, I.KL + 1);
      r.rect(cx - 1, kTopp + vh + 6, 2, 2, I.KL + 1);
    }
  } else if (T.klaer === 'cardigan') {
    r.rect(cx - 1, kTopp, 2, T.kh, I.SKJ);
    r.px(cx + 1, kTopp + 3, I.KL + 1);
    r.px(cx + 1, kTopp + 6, I.KL + 1);
  } else if (T.klaer === 'skjorte') {
    // skjorte (bruker klesfargen) med krage og knapperad
    r.px(cx - 2, kTopp, I.SKJ + 2);
    r.px(cx + 1, kTopp, I.SKJ + 2);
    r.px(cx - 1, kTopp, I.HUD);
    r.px(cx, kTopp, I.HUD);
    r.px(cx - 1, kTopp + 3, I.KL + 1);
    r.px(cx - 1, kTopp + 5, I.KL + 1);
  } else if (T.klaer === 'genser') {
    // genser med rund hals
    r.rect(cx - 2, kTopp, 4, 1, I.KL + 1);
  } else if (T.klaer === 'hettegenser') {
    // De spillbare karakterene: klærne følger bildene
    const stil = /** @type {any} */ (v).klaerStil;
    const belteY = beinTopp - 1;
    if (stil === 'skjorte') {
      // mørk skjorte med krage og knapperad
      r.px(cx - 2, kTopp, I.KL + 2);
      r.px(cx + 1, kTopp, I.KL + 2);
      for (let y = kTopp + 3; y < belteY; y += 2) r.px(cx + 1, y, I.KL + 2);
    } else if (stil === 'dressApen') {
      // åpen jakke over hvit skjorte uten slips
      for (let y = kTopp; y < belteY; y++) {
        const b = y - kTopp < 4 ? 4 - Math.floor((y - kTopp) / 2) : 2;
        r.rect(cx - b / 2 - 1, y, b + 2, 1, I.SKJ);
      }
      r.px(cx - 3, kTopp, I.SKJ + 2);
      r.px(cx + 2, kTopp, I.SKJ + 2);
      r.rect(cx - 3, kTopp + 1, 1, 4, I.KL + 2);
      r.rect(cx + 2, kTopp + 1, 1, 4, I.KL + 1);
      r.px(cx - 4, kTopp + T.kh - 3, I.KL + 1);
    } else if (stil === 'genser') {
      // flettegenser: rund hals og fletter
      r.rect(cx - 2, kTopp, 4, 1, I.KL + 1);
      for (let y = kTopp + 1; y < belteY + 1; y++) {
        for (const x of [Math.floor(kV) + 2, cx - 1, Math.ceil(kH) - 3]) r.px(x + ((y >> 1) & 1), y, I.KL + 2);
      }
      r.rect(kV, belteY, kb, 2, I.KL + 1);
    } else if (stil === 'skjorteApen') {
      // hvit skjorte åpen over hvit t-skjorte, gullkjede
      r.rect(cx - 2, kTopp, 4, T.kh - 1, I.SKJ);
      r.rect(cx - 3, kTopp, 1, 3, I.KL + 1);
      r.rect(cx + 2, kTopp, 1, 3, I.KL + 1);
      r.px(cx - 2, kTopp + 1, I.GULL);
      r.px(cx - 1, kTopp + 2, I.GULL);
      r.px(cx, kTopp + 2, I.GULL);
      r.px(cx + 1, kTopp + 1, I.GULL);
    }
    // belte
    if (stil !== 'genser') {
      r.rect(kV, belteY, kb, 1, I.BELTE);
      r.px(cx - 1, belteY, I.GRAA);
    }
  }
  // Slips eller skjerf
  if (v.hals === 'slips') {
    const lengde = Math.round(T.kh * 0.6);
    r.rect(cx - k, kTopp, 2 * k, k, I.AKS + 1);
    r.rect(cx - k, kTopp + k, 2 * k, lengde - k, I.AKS);
    r.rect(cx, kTopp + k, k, lengde - k, I.AKS + 1);
  } else if (v.hals === 'skjerf') {
    r.rect(kV + 1, kTopp, kb - 2, 2 * k, I.AKS);
    r.rect(kV + 1, kTopp + k, kb - 2, k, I.AKS + 1);
    r.rect(kV + 2 * k, kTopp + 2 * k, 2 * k, 3 * k, I.AKS);
    r.rect(kV + 3 * k, kTopp + 2 * k, k, 3 * k, I.AKS + 1);
  }

  // 4. Armer og ting i hendene
  const ab = T.arm;
  const armLengde = T.kh - 1;
  const haand = 2 * k;
  const ermFarge = I.KL;
  const tegnArm = (x, dy) => {
    const y0 = kTopp + 1;
    r.rect(x, y0, ab, armLengde - haand + dy, ermFarge);
    r.rect(x + ab - 1, y0, 1, armLengde - haand + dy, ermFarge + 1);
    r.rect(x, y0 + armLengde - haand + dy, ab, haand, I.HUD);
    r.rect(x + ab - 1, y0 + armLengde - haand + dy, 1, haand, I.HUD + 1);
    return y0 + armLengde + dy;
  };
  const vArmX = Math.floor(kV) - ab, hArmX = Math.ceil(kH);
  if (T.ting === 'laptop') {
    // laptop under høyre arm
    const ly = kTopp + 3;
    r.rect(hArmX - 3, ly, ab + 6, 2, I.TING);
    r.rect(hArmX - 3, ly, ab + 6, 1, I.TING + 2);
    r.rect(hArmX - 3, ly + 2, ab + 6, 1, I.TING + 1);
  }
  if (!glad) tegnArm(vArmX, arm);
  const hHaandBunn = tegnArm(hArmX, -arm);
  if (T.ting === 'mappe') {
    const mb = 6 * k, mh = 5 * k;
    const mx = hArmX + Math.floor(ab / 2) - Math.floor(mb / 2), my = hHaandBunn + k;
    r.rect(mx + 2 * k, my - k, mb - 4 * k, k, I.TING + 1);
    r.rect(mx, my, mb, mh, I.TING);
    r.rect(mx, my, mb, k, I.TING + 2);
    r.rect(mx, my + mh - k, mb, k, I.TING + 1);
    r.rect(mx + mb / 2 - k / 2, my + k, k, k, I.GULL);
  } else if (T.ting === 'papir') {
    // papirbunke foran kroppen, holdt med begge hender
    const py = kTopp + T.kh - 6;
    for (let i = 0; i < 3; i++) r.rect(kV + 1 + (i % 2), py + i, kb - 3, 1, I.TING);
    r.rect(kV + 1, py + 3, kb - 2, 3, I.TING);
    r.rect(kV + 2, py + 4, kb - 5, 1, I.GRAA);
    r.rect(kV + 1, py + 6, kb - 2, 1, I.TING + 1);
    r.rect(kV, py + 3, 2, 2, I.HUD);
    r.rect(kH - 2, py + 3, 2, 2, I.HUD);
  } else if (T.ting === 'boks') {
    // energidrikk i høyre hånd
    const bx = hArmX, by = hHaandBunn - 4;
    r.rect(bx, by, 3, 6, I.GROENN);
    r.rect(bx, by, 3, 1, I.TING);
    r.rect(bx + 2, by + 1, 1, 5, I.TING + 1);
    r.px(bx + 1, by + 3, I.GULL);
    const stil = /** @type {any} */ (v).klaerStil;
    // klokke, ringer og armbånd på venstre hånd
    const vh = kTopp + 1 + armLengde - haand + arm;
    if (stil === 'skjorte' || stil === 'skjorteApen') r.rect(vArmX, vh - 1, ab, 1, I.GULL);
    if (stil === 'skjorteApen') {
      r.px(vArmX, vh - 2, I.ROD);
      r.px(vArmX + 1, vh - 2, I.BLAA);
      r.px(vArmX + 2, vh - 2, I.AKS);
    }
    if (stil === 'genser') {
      r.px(vArmX + 1, vh + 1, I.GULL);
      r.px(hArmX + 1, hHaandBunn - 1, I.GULL);
    }
  } else if (T.ting === 'aapenLaptop') {
    // åpen laptop holdt foran brystet (lokket vender mot oss)
    const ly = kTopp + 1;
    r.rect(cx - 6, ly, 12, 7, I.TING);
    r.rect(cx - 6, ly, 12, 1, I.TING + 2);
    r.rect(cx + 5, ly + 1, 1, 6, I.TING + 1);
    r.rect(cx - 6, ly + 7, 12, 1, I.TING + 1);
    r.rect(cx - 1, ly + 3, 2, 2, I.LILLA);
    r.rect(cx - 7, ly + 5, 2, 2, I.HUD);
    r.rect(cx + 5, ly + 5, 2, 2, I.HUD);
  }

  // 5. Hode
  r.kule(cx, cy, rx, ry, I.HUD, I.HUD + 1, I.HUD + 2);
  if (v.stil === 'hijab') {
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++) {
      for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
        if (!inE(x, y, cx, cy + 0.5 * k, rx + 1.5, ry + 1.5)) continue;
        const aapning = inE(x, y, cx, cy + 1 * k, rx - 1.3 * k, ry - 0.6 * k) && y + 0.5 >= cy - ry * 0.45;
        if (!aapning) r.px(x, y, x + 0.5 > cx + rx * 0.4 ? I.HIJ + 1 : y + 0.5 < cy - ry * 0.6 && x + 0.5 < cx ? I.HIJ + 2 : I.HIJ);
      }
    }
    r.rect(kV - 1, kTopp, kb + 2, 3 * k, I.HIJ);
    r.rect(kH - 1, kTopp, 2, 3 * k, I.HIJ + 1);
  }

  // 6. Skjegg
  if (v.skjegg === 'skjegg') {
    for (let y = cy; y <= cy + ry + 1; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      if (inE(x, y, cx, cy, rx, ry + 0.8 * k) && y + 0.5 >= cy + ry * 0.25 && Math.abs(x + 0.5 - cx) <= rx - 0.5) haarPx(x, y);
    }
  }

  // 7. Ansikt
  const ex = Math.round((rx / k) * 0.45);
  const oeyeV = -ex, oeyeH = ex - 1;
  if (type === 'spiller' || !glad) {
    f(oeyeV, 0, I.OYE);
    f(oeyeV, 1, I.OYE);
    f(oeyeH, 0, I.OYE);
    f(oeyeH, 1, I.OYE);
    if (k > 1) {
      r.px(cx + oeyeV * k, cy, I.HVIT);
      r.px(cx + oeyeH * k, cy, I.HVIT);
    }
  }
  if (type === 'spiller' && /** @type {any} */ (v).portrett?.smil === 'glis') {
    // bredt smil med tenner
    f(-2, 3, I.MUNN);
    f(-1, 3, I.HVIT);
    f(0, 3, I.HVIT);
    f(1, 3, I.MUNN);
    f(-1, 4, I.MUNN);
    f(0, 4, I.MUNN);
  } else if (type === 'spiller') {
    // vennlig smil
    f(-2, 3, I.MUNN);
    f(1, 3, I.MUNN);
    f(-1, 4, I.MUNN);
    f(0, 4, I.MUNN);
  } else if (!glad) {
    // stresset og frustrert: rynkede bryn og munnviker ned
    f(oeyeV - 1, -3, I.OYE);
    f(oeyeV, -2, I.OYE);
    f(oeyeH + 1, -3, I.OYE);
    f(oeyeH, -2, I.OYE);
    f(-1, 3, I.MUNN);
    f(0, 3, I.MUNN);
    f(-2, 4, I.MUNN);
    f(1, 4, I.MUNN);
    if (v.svette) {
      r.rect(cx + rx - 1, cy - ry + 3 * k, k, 2 * k, I.SVETTE);
      r.rect(cx + rx - 1, cy - ry + 2 * k, k, k, I.HVIT);
    }
  } else {
    // glad: lukkede, smilende øyne, stort smil og røde kinn
    f(oeyeV, 0, I.OYE);
    f(oeyeV - 1, 1, I.OYE);
    f(oeyeV + 1, 1, I.OYE);
    f(oeyeH, 0, I.OYE);
    f(oeyeH - 1, 1, I.OYE);
    f(oeyeH + 1, 1, I.OYE);
    f(-2, 3, I.MUNN);
    f(-1, 3, I.HVIT);
    f(0, 3, I.HVIT);
    f(1, 3, I.MUNN);
    f(-1, 4, I.MUNN);
    f(0, 4, I.MUNN);
    f(oeyeV - 2, 2, I.ROD);
    f(oeyeH + 2, 2, I.ROD);
  }
  if (v.skjegg === 'bart') {
    f(-2, 2, H);
    f(-1, 2, H + 1);
    f(0, 2, H + 1);
    f(1, 2, H);
  }

  // 8. Hår foran
  switch (v.stil) {
    case 'kort': lokk(0.35, -1); break;
    case 'bob': lokk(0.3, ry * 0.6); break;
    case 'langt': lokk(0.3, ry); break;
    case 'hestehale': lokk(0.35, -1); break;
    case 'knute': lokk(0.4, -2); break;
    case 'krollete':
      haarOmraade((x, y) => {
        const inne = inE(x, y, cx, cy, rx + 1.4, ry + 1.4) || (inE(x, y, cx, cy, rx + 2.4, ry + 2.4) && (x + y) % 3 === 0);
        if (!inne) return false;
        return y + 0.5 <= cy - ry * 0.2 || (Math.abs(x + 0.5 - cx) >= rx - 1.2 * k && y + 0.5 <= cy + 1);
      }, cx - rx - 3, cy - ry - 3, cx + rx + 3, cy + 2);
      for (let y = cy - ry - 2; y < cy; y += 2) for (let x = cx - rx; x < cx + rx; x += 3) if (r.get(x + (y % 4 === 0 ? 1 : 0), y) === H) r.px(x + (y % 4 === 0 ? 1 : 0), y, H + 1);
      break;
    case 'afro':
      lokk(0.45, -1, 1.5);
      for (let y = cy - 2 * ry; y < cy + ry; y += 2) for (let x = cx - rx - 4 * k; x < cx + rx + 4 * k; x += 3) if (r.get(x + (y % 4 === 0 ? 1 : 0), y) === H) r.px(x + (y % 4 === 0 ? 1 : 0), y, H + 1);
      break;
    case 'fletter': {
      lokk(0.35, -1);
      r.rect(cx - 1, cy - ry - 1, 1, Math.round(ry * 0.5), H + 1);
      const topp = cy - 1, lengde = ry + 3 * k;
      for (const x of [cx - rx - 1, cx + rx - 2 * k + 1]) {
        for (let y = 0; y < lengde; y++) r.rect(x, topp + y, 2 * k, 1, Math.floor(y / (2 * k)) % 2 ? H + 1 : H);
        r.rect(x, topp + lengde, 2 * k, k, I.AKS);
      }
      break;
    }
    case 'lugg':
      // bustete hår med lugg ned mot brynene
      lokk(0.18, -1, 1.2);
      for (const [dx, dy] of [[-4, -1], [-1, -2], [2, -1], [4, 0]]) r.px(cx + dx, cy - ry - 1 + dy + 1, H);
      r.px(cx - 3, cy - 2, H + 1);
      r.px(cx + 1, cy - 2, H + 1);
      break;
    case 'bakover':
      // lyst hår med volum, strøket bakover, korte sider
      lokk(0.5, -2, 1);
      haarOmraade((x, y) => inE(x, y, cx - 0.5, cy - ry + 0.5, rx * 0.85, 2.6), cx - rx, cy - ry - 3, cx + rx, cy - ry + 3);
      for (let x = cx - rx + 2; x < cx + rx - 2; x += 3) r.px(x, cy - ry, H + 2);
      break;
    case 'midtskill':
      // svart hår med midtskill og lugg som faller til sidene
      lokk(0.25, 0, 1.1);
      r.rect(cx - 1, cy - ry, 1, Math.round(ry * 0.6), I.HUD + 1);
      r.px(cx, cy - ry + 1, H + 2);
      r.px(cx - 2, cy - ry + 1, H + 2);
      break;
    case 'boelger':
      // rødbrunt, bølgete hår
      haarOmraade((x, y) => {
        const inne = inE(x, y, cx, cy, rx + 1.6, ry + 1.6) || (inE(x, y, cx, cy, rx + 2.3, ry + 2.3) && (x * 3 + y) % 4 === 0);
        if (!inne) return false;
        return y + 0.5 <= cy - ry * 0.3 || (Math.abs(x + 0.5 - cx) >= rx - 1.3 && y + 0.5 <= cy);
      }, cx - rx - 3, cy - ry - 3, cx + rx + 3, cy + 1);
      for (let y = cy - ry - 1; y < cy - 1; y += 2) for (let x = cx - rx; x < cx + rx; x += 3) if (r.get(x + ((y >> 1) & 1), y) === H) r.px(x + ((y >> 1) & 1), y, H + 2);
      break;
    case 'skallet':
      for (let y = cy - 2 * k; y <= cy + 1; y++) for (let x = cx - rx; x < cx + rx; x++) {
        if (inE(x, y, cx, cy, rx + 0.6, ry) && Math.abs(x + 0.5 - cx) >= rx - 1.2 * k) haarPx(x, y);
      }
      r.rect(cx - Math.round(rx * 0.5), cy - ry + 1 * k, 2 * k, k, I.HUD + 2);
      break;
    default:
      break;
  }

  // 9. Briller og øreringer
  if (v.briller) {
    // Tynn innfatning (1 piksel) rundt hvert øye, og en bro mellom
    let vKant = 0, hKant = 0;
    for (const ox of [oeyeV, oeyeH]) {
      const x0 = cx + (ox - 1) * k, x1 = cx + (ox + 2) * k - 1;
      const y0 = cy - k, y1 = cy + 3 * k - 1;
      r.rect(x0, y0, x1 - x0 + 1, 1, I.BRILLE);
      r.rect(x0, y1, x1 - x0 + 1, 1, I.BRILLE);
      r.rect(x0, y0, 1, y1 - y0 + 1, I.BRILLE);
      r.rect(x1, y0, 1, y1 - y0 + 1, I.BRILLE);
      if (ox === oeyeV) vKant = x1;
      else hKant = x0;
    }
    r.rect(vKant, cy - k, hKant - vKant, 1, I.BRILLE);
  }
  if (v.oreringer) {
    r.rect(cx - rx - (k > 1 ? 1 : 0), cy + 2 * k, k, k, I.GULL);
    r.rect(cx + rx - 1, cy + 2 * k, k, k, I.GULL);
  }

  // 10. Glad: tommel opp med venstre arm
  if (glad) {
    const ax = vArmX;
    const toppY = cy - ry + 1;
    const bunnY = kTopp + 3;
    r.rect(ax, toppY + 3 * k, ab, bunnY - toppY - 3 * k, ermFarge);
    r.rect(ax + ab - 1, toppY + 3 * k, 1, bunnY - toppY - 3 * k, ermFarge + 1);
    // knyttneve og tommel
    r.rect(ax - k, toppY, ab + k, 3 * k, I.HUD);
    r.rect(ax + ab - 1, toppY, 1, 3 * k, I.HUD + 1);
    r.rect(ax, toppY - 2 * k, k, 2 * k, I.HUD);
    r.rect(ax, toppY - 2 * k, k, k, I.HUD + 2);
  }

  // 11. Rosa kinn på karakteren som har det på bildet
  if (type === 'spiller' && /** @type {any} */ (v).rosa) {
    f(oeyeV - 1, 2, I.ROD);
    f(oeyeH + 1, 2, I.ROD);
  }

  r.kontur(I.UT);
  if (type === 'spiller') r.kontur(I.UT_LYS);
  return r;
}

/**
 * Større portrett (64 × 64) av en spillbar karakter: hode og skuldre, vennlig uttrykk.
 * Hver karakter har egen ansiktsform, eget smil, egen frisyre og egne klær (se PORTRETT under).
 * @param {any} v en av SPILLERE
 */
function tegnPortrett(v) {
  const r = new Raster(64, 64);
  const H = I.HAAR;
  const P = v.portrett;
  const cx = 32, cy = 28, rx = P.rx, ry = P.ry;

  /** Innenfor ansiktet: ellipse som smalner mot haken (kjeve 0 = rund, 0.3 = smal hake). */
  const iAnsikt = (x, y) => {
    const ny = (y + 0.5 - cy) / ry;
    const smal = ny > 0 ? 1 - P.kjeve * ny * ny : 1;
    const nx = (x + 0.5 - cx) / (rx * smal);
    return nx * nx + ny * ny <= 1;
  };
  /** Hårpiksel med skygge til høyre, lys stripe og strå-tekstur. */
  const haar = (x, y) => {
    const dx = x + 0.5 - cx;
    let c = H;
    if (dx > rx * 0.55) c = H + 1;
    if (P.straa(x, y)) c = H + 2;
    else if (P.skygge(x, y)) c = H + 1;
    r.px(x, y, c);
  };
  const fyllHaar = (pred, x0 = 8, y0 = 2, x1 = 56, y1 = 44) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (pred(x, y)) haar(x, y);
  };

  // 1. Hår bak hodet (volum som stikker ut på sidene)
  fyllHaar((x, y) => P.bakhaar(x, y));

  // 2. Skuldre og klær
  for (let y = 47; y < 64; y++) for (let x = 4; x < 60; x++) {
    if (!inE(x, y, 32, 66, P.skuldre, 19)) continue;
    r.px(x, y, x > 46 ? I.KL + 1 : x < 13 ? I.KL + 2 : I.KL);
  }
  // Hals (med skygge under haken)
  const halsBunn = 50;
  r.rect(cx - 5, cy + ry - 4, 10, halsBunn - (cy + ry - 4), I.HUD);
  r.rect(cx + 2, cy + ry - 4, 3, halsBunn - (cy + ry - 4), I.HUD + 1);
  r.rect(cx - 5, cy + ry - 3, 10, 2, I.HUD + 1);
  P.klaer(r, cx);

  // 3. Ører og ansikt
  r.ellipse(cx - rx + 0.5, cy + 2, 2.6, 3.6, I.HUD + 1);
  r.ellipse(cx + rx - 0.5, cy + 2, 2.6, 3.6, I.HUD + 1);
  r.px(cx - rx, cy + 2, I.HUD);
  for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
    if (!iAnsikt(x, y)) continue;
    const kant = !iAnsikt(x + 2, y) || !iAnsikt(x, y + 2);
    const lys = x < cx - rx * 0.35 && y < cy - ry * 0.2 && iAnsikt(x - 2, y - 2) && (x + y) % 2 === 0;
    r.px(x, y, kant && x > cx - 2 ? I.HUD + 1 : lys ? I.HUD + 2 : I.HUD);
  }

  // 4. Ansiktstrekk: bryn, øyne (små og vennlige), nese og smil
  const oy = cy + 1;
  for (const ex of [cx - 7, cx + 4]) {
    // bryn
    r.rect(ex - 1, oy - 4 + P.bryn, 5, 1, H + 1);
    r.px(ex + (ex < cx ? -1 : 3), oy - 3 + P.bryn, H + 1);
    // øye: mørk pupill med lys prikk og et lite lokk
    r.rect(ex, oy - 1, 3, 1, I.HUD + 1);
    r.rect(ex, oy, 3, P.oyeH, I.HVIT);
    r.rect(ex + (ex < cx ? 1 : 0), oy, 2, P.oyeH, I.OYE);
    r.px(ex + (ex < cx ? 1 : 0), oy, I.HVIT);
  }
  // nese
  r.px(cx, oy + 3, I.HUD + 1);
  r.px(cx, oy + 4, I.HUD + 1);
  r.rect(cx - 1, oy + 5, 3, 1, I.HUD + 1);
  // munn
  const my = oy + 9;
  if (P.smil === 'glis') {
    r.rect(cx - 4, my, 9, 1, I.MUNN);
    r.rect(cx - 4, my + 1, 1, 1, I.MUNN);
    r.rect(cx + 4, my + 1, 1, 1, I.MUNN);
    r.rect(cx - 3, my + 1, 7, 1, I.HVIT);
    r.rect(cx - 2, my + 2, 5, 1, I.MUNN);
    r.px(cx - 5, my - 1, I.MUNN);
    r.px(cx + 5, my - 1, I.MUNN);
  } else {
    r.px(cx - 4, my - 1, I.MUNN);
    r.px(cx + 4, my - 1, I.MUNN);
    r.rect(cx - 3, my, 7, 1, I.MUNN);
    r.rect(cx - 2, my + 1, 5, 1, I.ROD);
  }
  if (v.rosa) {
    r.rect(cx - 10, oy + 4, 3, 2, I.ROD);
    r.rect(cx + 8, oy + 4, 3, 2, I.ROD);
  }

  // 5. Hår foran (lugg, sider)
  fyllHaar((x, y) => P.forhaar(x, y, iAnsikt));
  if (P.etter) P.etter(r, cx, cy);

  r.kontur(I.UT);
  return r;
}

/** Hjelpere for håret i portrettene. */
const sirkel = (x, y, mx, my, rr) => (x + 0.5 - mx) ** 2 + (y + 0.5 - my) ** 2 <= rr * rr;

/** Personlige trekk i portrettene (ansiktsform, øyne, smil, hår og klær), i samme rekkefølge som SPILLERE. */
const PORTRETT = [
  {
    // 1: smalt, langt ansikt, brunt hår med volum og lugg strøket til siden, mørk skjorte med button-down-krage og smalt svart slips
    rx: 11.5, ry: 15, kjeve: 0.32, skuldre: 25, oyeH: 2, bryn: 0, smil: 'smil',
    bakhaar: (x, y) => sirkel(x, y, 32, 19, 14.5) && y < 30,
    forhaar: (x, y, iA) => {
      if (!(sirkel(x, y, 32, 19, 14.5) || sirkel(x, y, 24, 12, 7) || sirkel(x, y, 38, 11, 8))) return false;
      // luggen går på skrå fra venstre (høyt) til høyre (lavt), med noen tjafser
      const lugg = 19 + (x - 20) * 0.28 + ((x * 7) % 5 === 0 ? 1.5 : 0);
      if (y < lugg) return true;
      return !iA(x, y) && y < 30;
    },
    straa: (x, y) => y < 19 && (x + Math.floor(y * 0.6)) % 6 === 0,
    skygge: (x, y) => y < 21 && (x + Math.floor(y * 0.6)) % 6 === 3,
    klaer: (r, cx) => {
      // krage (button-down) i lysere marineblå, knappene i snippene
      for (let i = 0; i < 6; i++) {
        r.rect(cx - 7 + i, 47 + i, 2, 1, I.KL + 2);
        r.rect(cx + 5 - i, 47 + i, 2, 1, I.KL + 2);
      }
      r.px(cx - 6, 50, I.HVIT);
      r.px(cx + 5, 50, I.HVIT);
      // smalt svart slips
      r.rect(cx - 2, 48, 4, 3, I.AKS + 1);
      for (let y = 51; y < 64; y++) r.rect(cx - 1 - (y > 54 ? 1 : 0), y, 3 + (y > 54 ? 1 : 0), 1, I.AKS);
      r.rect(cx + 1, 51, 1, 13, I.AKS + 1);
    },
  },
  {
    // 2: bredt ansikt, lyst hår med volum strøket bakover og korte sider, grågrønn linjakke over hvit skjorte
    rx: 13, ry: 14, kjeve: 0.18, skuldre: 27, oyeH: 2, bryn: 0, smil: 'smil',
    bakhaar: () => false,
    forhaar: (x, y, iA) => {
      // volum på toppen, høy panne, korte sider
      const kant = 16 + Math.sin((x + 0.5) * 0.45) * 1.2 - (x < 26 ? 1 : 0);
      const topp = sirkel(x, y, 32, 16, 13.5) && y < kant;
      const quiff = (sirkel(x, y, 30, 11, 10.5) || sirkel(x, y, 37, 12, 8)) && y < kant;
      const side = !iA(x, y) && Math.abs(x + 0.5 - 32) > 11 && y < 26 && y > 14 && sirkel(x, y, 32, 26, 15);
      return topp || quiff || side;
    },
    straa: (x, y) => y < 15 && (x - Math.floor(y * 0.8)) % 5 === 0,
    skygge: (x, y) => y > 15 || (x === 26 && y > 3 && y < 15) || (x - Math.floor(y * 0.8)) % 5 === 2,
    klaer: (r, cx) => {
      // hvit skjorte med åpen krage
      for (let y = 47; y < 64; y++) {
        const b = Math.max(8, 18 - (y - 47));
        r.rect(cx - b / 2, y, b, 1, I.SKJ);
      }
      r.rect(cx - 3, 47, 6, 4, I.HUD);
      r.rect(cx - 2, 51, 4, 2, I.HUD + 1);
      r.rect(cx - 8, 47, 4, 3, I.SKJ + 2);
      r.rect(cx + 4, 47, 4, 3, I.SKJ + 2);
      // jakkeslag
      for (let i = 0; i < 9; i++) {
        r.px(cx - 10 + Math.floor(i / 2), 48 + i * 2, I.KL + 1);
        r.px(cx + 9 - Math.floor(i / 2), 48 + i * 2, I.KL + 1);
      }
      for (let y = 49; y < 64; y += 3) for (let x = 8; x < 56; x += 4) if (r.get(x, y) === I.KL) r.px(x + (y & 1), y, I.KL + 2);
    },
  },
  {
    // 3: ovalt ansikt, svart rett hår med midtskill og gardinlugg, brun flettegenser
    rx: 12.5, ry: 14.5, kjeve: 0.25, skuldre: 28, oyeH: 2, bryn: 1, smil: 'smil',
    bakhaar: (x, y) => sirkel(x, y, 32, 20, 14) && y < 26,
    forhaar: (x, y, iA) => {
      if (!sirkel(x, y, 32, 20, 14.2)) return false;
      // gardinlugg: skillet i midten, luggen henger lavere ut mot sidene
      const dx = Math.abs(x + 0.5 - 32);
      const lugg = 14 + Math.min(8, dx * 0.8) + (x % 3 === 0 ? 1.5 : 0);
      if (y < lugg) return true;
      return !iA(x, y) && y < 23;
    },
    straa: (x, y) => y > 8 && y < 13 && (x === 25 || x === 28 || x === 36 || x === 39),
    skygge: (x, y) => y > 14 && x % 3 === 1,
    klaer: (r, cx) => {
      // rund ribbestrikket hals og fletter
      r.rect(cx - 7, 47, 14, 2, I.KL + 1);
      for (let x = cx - 7; x < cx + 7; x += 2) r.px(x, 47, I.KL + 2);
      for (let y = 50; y < 64; y++) for (const x of [10, 19, 28, 37, 46]) {
        r.px(x + ((y >> 1) & 1), y, I.KL + 2);
        r.px(x + 3 - ((y >> 1) & 1), y, I.KL + 2);
      }
    },
    etter: (r, cx) => {
      // skillet
      r.rect(cx - 1, 8, 1, 7, I.HUD + 1);
      r.px(cx - 1, 15, I.HUD);
    },
  },
  {
    // 4: rundt ansikt, stort smil og rosa kinn, kobberbrunt bølgete og fyldig hår, hvit skjorte over t-skjorte og gullkjede
    rx: 12.5, ry: 13.5, kjeve: 0.12, skuldre: 27, oyeH: 2, bryn: -1, smil: 'glis',
    bakhaar: (x, y) => {
      if (y > 30) return false;
      if (sirkel(x, y, 32, 19, 15.5)) return true;
      // krøller rundt kanten
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.95 + i * 0.14);
        if (sirkel(x, y, 32 + Math.cos(a) * 15, 20 + Math.sin(a) * 14, 4.2)) return true;
      }
      return false;
    },
    forhaar: (x, y, iA) => {
      if (!sirkel(x, y, 32, 19, 15.5)) return false;
      // krøllete lugg i buer over pannen
      const lugg = 17 + (Math.abs(Math.sin((x + 0.5) * 0.55)) * 3);
      if (y < lugg) return true;
      return !iA(x, y) && y < 26;
    },
    straa: (x, y) => ((x * 5 + y * 3) % 9 === 0 || (x * 3 + y * 7) % 13 === 0) && y < 26,
    skygge: (x, y) => (x * 7 + y * 5) % 8 === 0,
    klaer: (r, cx) => {
      // hvit t-skjorte, åpen hvit skjorte, tynn gullkjede
      r.rect(cx - 6, 47, 12, 17, I.SKJ);
      r.rect(cx - 5, 47, 10, 1, I.SKJ + 1);
      for (let i = 0; i < 8; i++) {
        r.px(cx - 7 - i, 47 + i, I.KL + 1);
        r.px(cx + 6 + i, 47 + i, I.KL + 1);
      }
      for (let i = 0; i <= 5; i++) {
        r.px(cx - 5 + i, 47 + i, I.GULL);
        r.px(cx + 4 - i, 47 + i, I.GULL);
      }
    },
  },
];
SPILLERE.forEach((v, i) => {
  /** @type {any} */ (v).portrett = PORTRETT[i];
});

/** Hvit silhuett (blink når en advokat får hjelp, eller når spilleren blir truffet). */
function hvitKopi(r) {
  const h = new Raster(r.w, r.h);
  for (let i = 0; i < r.d.length; i++) {
    const c = r.d[i];
    if (c) h.d[i] = c === I.UT || c === I.UT_LYS ? I.GRAA : I.HVIT;
  }
  return h;
}

// ---------- Spriteark med cache ----------

/**
 * @typedef {Object} Ark
 * @property {HTMLCanvasElement} lerret atlaset for typen
 * @property {number} sy y-posisjonen til variantens rad i atlaset
 * @property {number} w
 * @property {number} h
 * @property {number} ax
 * @property {number} ay
 */

export class Figurer {
  constructor() {
    /** @type {Record<string, Variant[]>} */
    this.varianter = {};
    for (const [type, n] of Object.entries(CONFIG.figurVarianter)) this.varianter[type] = lagVarianter(type, n);
    this.varianter.spiller = SPILLERE;
    /** @type {Map<number, HTMLCanvasElement>} */
    this.portretter = new Map();
    /** @type {Map<string, Ark>} */
    this.cache = new Map();
    /**
     * Ett atlas (stort lerret) per type med alle variantene under hverandre.
     * Å tegne fra ett felles lerret er mye raskere enn fra mange små (særlig uten grafikkort).
     * @type {Map<string, {lerret: HTMLCanvasElement, ctx: CanvasRenderingContext2D}>}
     */
    this.atlas = new Map();
    /** Gjenbrukt mellomlerret for én stripe. */
    this.mellom = document.createElement('canvas');
    /** Figurer som ikke er laget ennå. @type {[string, number][] | null} */
    this.koe = null;
  }

  /**
   * Spritearket for én figur (lages første gang det trengs).
   * Bildene ligger på rad: gange 0–3, blink 4–7, glad 8 – og det samme speilvendt (venstre) fra 9.
   * Raden ligger i et felles atlas for typen, fra y = sy.
   */
  ark(type, variant) {
    const noekkel = type + variant;
    let a = this.cache.get(noekkel);
    if (a) return a;
    const liste = this.varianter[type];
    const vi = variant % liste.length;
    const v = liste[vi];
    const T = TYPER[type];
    const strip = new Raster(T.w * RUTE.antall, T.h);
    /** Blinkbildene tegnes med en lysere palett (ikke helt hvit), så figuren fortsatt er gjenkjennelig. */
    const blinkStrip = new Raster(T.w * RUTE.antall, T.h);
    for (let b = 0; b < 5; b++) {
      const r = tegnFigur(/** @type {any} */ (type), v, b);
      const s = r.speilet();
      const kol = b < 4 ? b : RUTE.glad;
      strip.lim(r, kol * T.w, 0);
      strip.lim(s, (kol + RUTE.venstre) * T.w, 0);
      if (b < 4) {
        const blink = type === 'spiller' ? hvitKopi(r) : r;
        blinkStrip.lim(blink, (RUTE.blink + b) * T.w, 0);
        blinkStrip.lim(blink.speilet(), (RUTE.blink + b + RUTE.venstre) * T.w, 0);
      }
    }
    const { ax, ay } = anker(type);
    const pal = palett(v, type);
    const lysPal = pal.map((f, i) => (f && i !== I.UT ? f.map((c) => Math.round(c + (255 - c) * 0.6)) : f));
    // Slå sammen vanlig og blink til én stripe (blinkkolonnene bruker den lyse paletten)
    const W = T.w * RUTE.antall;
    for (let i = 0; i < blinkStrip.d.length; i++) if (blinkStrip.d[i]) strip.d[i] = 0;
    const mellom = this.mellom;
    if (mellom.width < W || mellom.height < T.h) {
      mellom.width = Math.max(mellom.width, W);
      mellom.height = Math.max(mellom.height, T.h);
    }
    const mctx = /** @type {CanvasRenderingContext2D} */ (mellom.getContext('2d'));
    const bilde = mctx.createImageData(W, T.h);
    for (let i = 0; i < strip.d.length; i++) {
      const c = strip.d[i] || blinkStrip.d[i];
      if (!c) continue;
      const f = strip.d[i] ? pal[c] : lysPal[c];
      if (!f) continue;
      bilde.data[i * 4] = f[0];
      bilde.data[i * 4 + 1] = f[1];
      bilde.data[i * 4 + 2] = f[2];
      bilde.data[i * 4 + 3] = 255;
    }
    mctx.clearRect(0, 0, mellom.width, mellom.height);
    mctx.putImageData(bilde, 0, 0);
    let at = this.atlas.get(type);
    if (!at) {
      const lerret = document.createElement('canvas');
      lerret.width = W;
      lerret.height = T.h * liste.length;
      at = { lerret, ctx: /** @type {CanvasRenderingContext2D} */ (lerret.getContext('2d')) };
      this.atlas.set(type, at);
    }
    at.ctx.drawImage(mellom, 0, 0, W, T.h, 0, vi * T.h, W, T.h);
    a = { lerret: at.lerret, sy: vi * T.h, w: T.w, h: T.h, ax, ay };
    this.cache.set(noekkel, a);
    return a;
  }

  /** Portrett (64 × 64) av karakter nr. i (0–3). */
  portrett(i) {
    let c = this.portretter.get(i);
    if (c) return c;
    const v = SPILLERE[i % SPILLERE.length];
    c = tilLerret(tegnPortrett(v), palett(v, 'spiller'));
    this.portretter.set(i, c);
    return c;
  }

  /**
   * Lager noen av figurene som ikke er laget ennå. Kalles i ledige stunder ved oppstart.
   * @param {number} antall maks antall varianter denne gangen
   * @returns {boolean} true når alle er ferdige
   */
  lagNoen(antall) {
    if (!this.koe) {
      this.koe = [];
      for (const type of Object.keys(this.varianter)) for (let v = 0; v < this.varianter[type].length; v++) this.koe.push([type, v]);
    }
    while (antall-- > 0 && this.koe.length) {
      const [type, v] = /** @type {[string, number]} */ (this.koe.shift());
      this.ark(type, v);
    }
    return this.koe.length === 0;
  }
}

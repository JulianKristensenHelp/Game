// @ts-check
// Kartet: én kontoretasje med yttervegger og soner. Oppsettet er fast og likt for alle.
//
// Slik endrer du kartet:
//  • Sonene (gulv og navn) står i SONER. Rekkefølgen betyr noe: senere soner tegnes over tidligere.
//  • Pynten (pulter, planter, printere …) står i lagPynt(). Pynt blokkerer aldri bevegelse.
//  • DOERER er heiser og dører langs veggene der advokater kan komme inn når det er trangt.
// Kartets størrelse og veggtykkelse står i config.js (CONFIG.kart).
import { CONFIG } from './config.js';

const K = CONFIG.kart;
const V = K.vegg;

/** Innsiden av kartet (der man kan gå). */
export const INNE = { x0: V.venstre, y0: V.topp, x1: K.bredde - V.hoeyre, y1: K.hoeyde - V.bunn };

/**
 * @typedef {Object} Sone
 * @property {string} id
 * @property {string} navn
 * @property {string} gulv gulvtype (se tegning av kartet i tegning.js)
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {string} minikart farge på minikartet
 */

/** @type {Sone[]} */
export const SONER = [
  { id: 'landskap', navn: 'Kontorlandskapet', gulv: 'teppe', x: INNE.x0, y: INNE.y0, w: INNE.x1 - INNE.x0, h: INNE.y1 - INNE.y0, minikart: '#5f7d9c' },
  { id: 'kantine', navn: 'Kantina', gulv: 'vinyl', x: 16, y: 40, w: 704, h: 520, minikart: '#c9a66b' },
  { id: 'heiser', navn: 'Heisene', gulv: 'flis', x: 1056, y: 40, w: 448, h: 184, minikart: '#7c7f8a' },
  { id: 'moterom', navn: 'Møterommene', gulv: 'parkett', x: 1824, y: 40, w: 720, h: 520, minikart: '#a87a4f' },
  { id: 'printer', navn: 'Printerrommet', gulv: 'linoleum', x: 16, y: 960, w: 544, h: 464, minikart: '#8d96a3' },
  { id: 'resepsjon', navn: 'Resepsjonen', gulv: 'marmor', x: 1040, y: 1120, w: 480, h: 304, minikart: '#d8d3c8' },
  { id: 'sofa', navn: 'Sofakroken', gulv: 'groenn', x: 1920, y: 1040, w: 624, h: 384, minikart: '#5f9a6a' },
];

/** Heiser og dører langs veggene. Brukes når det ikke er plass til å slippe inn advokater utenfor synsfeltet. */
export const DOERER = [
  { x: 1150, y: 58 }, { x: 1280, y: 58 }, { x: 1410, y: 58 }, // heisene
  { x: 1280, y: 1410 }, // hovedinngangen
  { x: 30, y: 760 }, { x: 2530, y: 760 }, // nødutganger
  { x: 600, y: 1410 }, { x: 2000, y: 58 }, { x: 30, y: 300 }, { x: 2530, y: 1250 }, // trapper
];

/** Holder et punkt innenfor ytterveggene. */
export function klemInn(x, y, r, ut) {
  ut.x = Math.min(INNE.x1 - r, Math.max(INNE.x0 + r, x));
  ut.y = Math.min(INNE.y1 - r, Math.max(INNE.y0 + r, y));
  return ut;
}

/** Hvilken sone et punkt ligger i (den siste som passer). */
export function soneVed(x, y) {
  for (let i = SONER.length - 1; i >= 0; i--) {
    const s = SONER[i];
    if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return s;
  }
  return SONER[0];
}

/**
 * @typedef {{t: string, x: number, y: number}} Pynt
 * t er navnet på pynt-spriten (se sprites.js), (x, y) er senteret.
 */

/** Lager den faste listen over pynt. Pynt blokkerer aldri bevegelse. */
export function lagPynt() {
  /** @type {Pynt[]} */
  const p = [];
  const leggTil = (t, x, y) => p.push({ t, x, y });

  // Kontorlandskapet: pultøyer (to pulter med stoler, rygg mot rygg)
  const oey = (x, y) => {
    leggTil('pult', x, y);
    leggTil('pult', x + 44, y);
    leggTil('stol', x, y + 22);
    leggTil('stol', x + 44, y + 22);
    leggTil('pultOpp', x, y - 30);
    leggTil('pultOpp', x + 44, y - 30);
    leggTil('stolOpp', x, y - 52);
    leggTil('stolOpp', x + 44, y - 52);
  };
  for (const x of [860, 1100, 1340, 1580]) for (const y of [380, 600, 820, 1020]) oey(x, y);
  for (const x of [110, 330, 550]) oey(x, 760);
  for (const x of [1990, 2260]) for (const y of [700, 900]) oey(x, y);
  for (const x of [660, 880]) for (const y of [1130, 1330]) oey(x, y);
  for (const [x, y] of [[760, 300], [1760, 300], [760, 1060], [1000, 1060], [1800, 1080], [1800, 640], [1820, 1300], [600, 900], [2440, 600]]) leggTil('plante', x, y);
  for (const [x, y] of [[1000, 520], [1700, 900], [480, 640], [1460, 1080], [2120, 1000]]) leggTil('vannkjoler', x, y);
  leggTil('tavle', 1220, 250);

  // Kantina
  for (const x of [120, 280, 440, 600]) for (const y of [200, 340, 480]) {
    leggTil('bord', x, y);
    leggTil('stolOpp', x, y - 22);
    leggTil('stol', x, y + 20);
    leggTil('stolSide', x - 24, y);
    leggTil('stolSide', x + 24, y);
  }
  leggTil('benk', 250, 68);
  leggTil('kaffemaskin', 120, 62);
  leggTil('kaffemaskin', 160, 62);
  leggTil('kjoleskap', 400, 58);
  leggTil('automat', 460, 58);
  leggTil('automat', 520, 58);
  leggTil('vannkjoler', 680, 70);
  leggTil('plante', 690, 520);

  // Heisene
  leggTil('benkLang', 1280, 170);
  leggTil('plante', 1080, 70);
  leggTil('plante', 1480, 70);

  // Møterommene (glassvegger tegnes for seg)
  for (const x of [2004, 2364]) {
    leggTil('motebord', x, 260);
    for (const dx of [-60, -20, 20, 60]) {
      leggTil('stolOpp', x + dx, 232);
      leggTil('stol', x + dx, 292);
    }
    leggTil('tavle', x, 52);
    leggTil('plante', x - 150, 480);
    leggTil('skjerm', x + 120, 60);
  }

  // Printerrommet
  for (const y of [1040, 1130, 1220, 1310]) leggTil('printer', 56, y);
  leggTil('kopimaskin', 300, 1040);
  leggTil('kopimaskin', 420, 1040);
  for (const x of [200, 260, 320, 380, 440]) leggTil('papiresker', x, 1390);
  leggTil('hylle', 500, 1250);
  leggTil('hylle', 500, 1320);
  leggTil('papiresker', 300, 1200);
  leggTil('papiresker', 330, 1210);

  // Resepsjonen
  leggTil('resepsjonsdisk', 1280, 1210);
  leggTil('teppeLogo', 1280, 1320);
  leggTil('sofa', 1110, 1380);
  leggTil('sofa', 1450, 1380);
  leggTil('plante', 1060, 1150);
  leggTil('plante', 1500, 1150);

  // Sofakroken
  for (const [x, y] of [[2050, 1150], [2300, 1150], [2050, 1330], [2300, 1330]]) {
    leggTil('teppeRundt', x, y);
    leggTil('sofa', x, y - 30);
    leggTil('lenestol', x - 50, y + 10);
    leggTil('lenestol', x + 50, y + 10);
    leggTil('salongbord', x, y + 10);
  }
  for (const x of [1980, 2140, 2300, 2460]) leggTil('hylle', x, 1060);
  leggTil('plante', 2510, 1400);
  leggTil('plante', 1950, 1400);

  // Langs veggene
  for (const x of [800, 900, 1600, 1700]) leggTil('plante', x, 62);
  for (const y of [620, 880]) {
    leggTil('plante', 34, y);
    leggTil('plante', 2526, y);
  }
  return p;
}

/** Glassvegger (bare pynt): [x0, y0, x1, y1] – loddrette eller vannrette linjer. */
export const GLASS = [
  [1824, 560, 1960, 560], [2040, 560, 2320, 560], [2400, 560, 2544, 560], // møterom, nede (med dører)
  [2184, 40, 2184, 560], [1824, 40, 1824, 480], // mellom møterommene og mot landskapet
  [16, 960, 160, 960], [240, 960, 560, 960], [560, 960, 560, 1300], // printerrommet
];

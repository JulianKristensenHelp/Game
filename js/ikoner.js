// @ts-check
// Ikoner i pixel art (16 × 16) for våpen, kombinasjoner, passive og knapper.
// Alle har mørkt omriss og egen form, så de kan skilles fra hverandre også uten farger.
import { Raster, tilLerret } from './piksel.js';
import { PALETT, FARGEINDEKS as C } from './sprites.js';

/** @type {Record<string, (r: Raster) => void>} */
const TEGN = {
  // ----- Våpen -----
  avpaa: (r) => {
    // strømsymbol
    r.ellipse(8, 8.5, 6.5, 6.5, C.TURKIS);
    r.ellipse(8, 8.5, 4.5, 4.5, 0);
    r.rect(6, 1, 4, 4, 0);
    r.rect(7, 1, 2, 8, C.HVIT);
    r.rect(7, 1, 1, 8, C.LYSGRAA);
  },
  toner: (r) => {
    r.rect(1, 5, 14, 7, C.NESTENSVART);
    r.rect(1, 5, 14, 2, C.MORKERE);
    r.rect(3, 5, 3, 7, C.CYAN);
    r.rect(7, 5, 3, 7, C.MAGENTA);
    r.rect(11, 5, 3, 7, C.GUL);
    r.rect(2, 12, 12, 2, C.MORKGRAA);
  },
  passord: (r) => {
    r.ellipse(4.5, 8, 3.5, 3.5, C.GUL);
    r.ellipse(4.5, 8, 1.5, 1.5, 0);
    r.rect(8, 7, 7, 2, C.GUL);
    r.rect(8, 8, 7, 1, C.MORKGUL);
    r.rect(11, 9, 1, 3, C.GUL);
    r.rect(14, 9, 1, 3, C.GUL);
  },
  hdmi: (r) => {
    // plugg med kabel
    r.rect(4, 1, 8, 7, C.NESTENSVART);
    r.rect(5, 2, 6, 3, C.GULL);
    r.rect(4, 8, 8, 2, C.MORKGRAA);
    r.rect(7, 10, 2, 3, C.NESTENSVART);
    r.rect(3, 12, 5, 2, C.NESTENSVART);
    r.rect(2, 13, 2, 2, C.NESTENSVART);
  },
  fjern: (r) => {
    // parabol med signal
    r.ellipse(6, 9, 5, 5, C.LYSGRAA);
    r.ellipse(7, 8, 3, 3, C.HVIT);
    r.rect(5, 13, 4, 2, C.MORKGRAA);
    r.px(12, 3, C.BLAA);
    r.px(13, 4, C.BLAA);
    r.px(10, 1, C.BLAA);
    r.px(11, 1, C.BLAA);
    r.px(13, 1, C.BLAA);
    r.px(14, 2, C.BLAA);
    r.px(14, 3, C.BLAA);
    r.px(9, 6, C.ROED);
  },
  mus: (r) => {
    r.ellipse(8, 9, 5, 6.5, C.NESTENHVIT);
    r.rect(8, 3, 1, 5, C.GRAA);
    r.rect(3, 7, 11, 1, C.GRAA);
    r.rect(7, 4, 3, 2, C.TURKIS);
    r.px(12, 1, C.BLAA);
    r.px(13, 2, C.BLAA);
  },
  // ----- Kombinasjoner -----
  'evo:avpaa': (r) => {
    // to piler i sirkel (omstart)
    r.ellipse(8, 8, 7, 7, C.TURKIS);
    r.ellipse(8, 8, 4.5, 4.5, 0);
    r.rect(0, 6, 5, 4, 0);
    r.rect(11, 6, 5, 4, 0);
    r.stempel('#### .##. ..#.', 0, 6, { '#': C.GULL_L });
    r.stempel('.#.. .##. ####', 12, 6, { '#': C.GULL_L });
    r.rect(7, 4, 2, 5, C.HVIT);
  },
  'evo:toner': (r) => {
    // printer med flammer
    r.stempel('..#...#...#.... .###.###.###... ###############', 0, 0, { '#': C.ORANSJE });
    r.rect(1, 2, 14, 1, C.GUL);
    r.rect(1, 4, 14, 8, C.MORKROED);
    r.rect(1, 4, 14, 2, C.ROED);
    r.rect(3, 8, 10, 2, C.NESTENSVART);
    r.rect(4, 10, 8, 4, C.PAPIR);
  },
  'evo:passord': (r) => {
    // hengelås + nøkkel
    r.rect(3, 1, 6, 6, C.LYSGRAA);
    r.rect(5, 3, 2, 4, 0);
    r.rect(1, 6, 10, 8, C.LYSBLAA);
    r.rect(1, 6, 10, 2, C.HVIT);
    r.rect(5, 9, 2, 3, C.MORKBLAA);
    r.rect(11, 10, 4, 2, C.GUL);
    r.rect(13, 12, 1, 2, C.GUL);
  },
  'evo:hdmi': (r) => {
    // floke av kabel
    r.ellipse(8, 8, 7, 7, C.NESTENSVART);
    r.ellipse(8, 8, 5.5, 5.5, 0);
    r.ellipse(8, 8, 3.5, 3.5, C.MORKERE);
    r.ellipse(8, 8, 2, 2, 0);
    r.rect(1, 7, 4, 2, C.NESTENSVART);
    r.rect(12, 3, 3, 3, C.GULL);
    r.rect(1, 11, 3, 3, C.GULL);
  },
  'evo:fjern': (r) => {
    // krone
    r.stempel('#..#..#..#..#.. #..#..#..#..#.. ##.##.##.##.##. ###############', 1, 3, { '#': C.GULL });
    r.rect(1, 7, 14, 5, C.GULL);
    r.rect(1, 11, 14, 2, C.GULL_M);
    r.rect(4, 8, 2, 2, C.ROED);
    r.rect(10, 8, 2, 2, C.BLAA);
    r.rect(7, 8, 2, 2, C.GROENN);
  },
  'evo:mus': (r) => {
    // musematte med virvel
    r.rect(1, 3, 14, 11, C.LILLA);
    r.rect(1, 3, 14, 2, C.LYSBLAA);
    r.ellipse(8, 9, 4, 3, C.LYSBLAA);
    r.ellipse(8, 9, 2, 1.5, C.LILLA);
    r.ellipse(12, 6, 2, 2.5, C.HVIT);
  },
  // ----- Passive -----
  ram: (r) => {
    r.rect(1, 4, 14, 7, C.GROENN);
    r.rect(1, 4, 14, 1, C.LYSGROENN);
    for (const x of [3, 7, 11]) r.rect(x, 6, 2, 3, C.NESTENSVART);
    for (let x = 2; x < 14; x += 2) r.rect(x, 11, 1, 2, C.GULL);
  },
  papir: (r) => {
    // papirskuff
    r.rect(3, 1, 10, 7, C.PAPIR);
    r.rect(5, 3, 6, 1, C.LYSGRAA);
    r.rect(5, 5, 6, 1, C.LYSGRAA);
    r.rect(1, 8, 14, 6, C.MORKGRAA);
    r.rect(1, 8, 14, 2, C.GRAA);
    r.rect(6, 11, 4, 1, C.NESTENSVART);
  },
  batteri: (r) => {
    r.rect(6, 1, 4, 2, C.LYSGRAA);
    r.rect(4, 3, 8, 12, C.NESTENSVART);
    r.rect(5, 4, 6, 10, C.GROENN);
    r.rect(5, 4, 6, 3, C.LYSGROENN);
    r.stempel('.#. ### .#.', 6, 7, { '#': C.HVIT });
  },
  ssd: (r) => {
    r.rect(1, 3, 14, 10, C.MORKERE);
    r.rect(2, 4, 12, 8, C.MORKSKIFER);
    r.stempel('...##. ..##.. .####. ..##.. .##... ##....', 5, 5, { '#': C.GUL });
    r.rect(13, 6, 2, 4, C.GULL);
  },
  joggesko: (r) => {
    r.rect(2, 5, 6, 6, C.ROED);
    r.rect(2, 9, 13, 3, C.ROED);
    r.rect(9, 8, 5, 2, C.ROED);
    r.rect(1, 12, 15, 2, C.HVIT);
    r.px(4, 6, C.HVIT);
    r.px(6, 7, C.HVIT);
    r.rect(11, 9, 2, 1, C.HVIT);
  },
  boks: (r) => {
    // stor energidrikkboks med pluss
    r.rect(3, 1, 10, 2, C.LYSGRAA);
    r.rect(3, 3, 10, 11, C.GROENN);
    r.rect(11, 3, 2, 11, C.MORKGROENN);
    r.rect(3, 14, 10, 1, C.LYSGRAA);
    r.rect(7, 5, 2, 7, C.HVIT);
    r.rect(5, 7, 6, 2, C.HVIT);
  },
  skjote: (r) => {
    // skjøteledning (stikkontakt med kabel)
    r.rect(1, 8, 10, 6, C.NESTENHVIT);
    r.rect(1, 12, 10, 2, C.LYSGRAA);
    r.rect(3, 10, 2, 2, C.NESTENSVART);
    r.rect(7, 10, 2, 2, C.NESTENSVART);
    r.rect(11, 10, 2, 2, C.NESTENHVIT);
    r.rect(12, 3, 2, 8, C.NESTENHVIT);
    r.rect(10, 1, 5, 3, C.ORANSJE);
  },
  admin: (r) => {
    // skjold med stjerne
    r.stempel('############## ############## ############## ############## ############## .############. .############. ..##########.. ...########... ....######.... .....####..... ......##......', 1, 2, { '#': C.MORKBLAA });
    r.stempel('......#...... .....###..... ..#########.. ....#####.... ...##...##...', 1, 4, { '#': C.GULL });
  },
  // ----- Annet -----
  kaffe: (r) => {
    r.rect(2, 6, 10, 8, C.HVIT);
    r.rect(3, 7, 8, 2, C.BRUN);
    r.ellipse(13, 10, 2.5, 2.5, C.HVIT);
    r.ellipse(13, 10, 1, 1, 0);
    r.rect(4, 1, 1, 3, C.LYSGRAA);
    r.rect(7, 2, 1, 3, C.LYSGRAA);
    r.rect(1, 14, 13, 1, C.LYSGRAA);
  },
  lydPaa: (r) => {
    r.rect(1, 6, 4, 5, C.HVIT);
    r.stempel('...#. ..##. .###. ####. ####. ####. ####. .###. ..##. ...#.', 3, 3, { '#': C.HVIT });
    r.rect(10, 6, 1, 5, C.HVIT);
    r.rect(12, 4, 1, 9, C.HVIT);
    r.rect(14, 2, 1, 13, C.HVIT);
  },
  lydAv: (r) => {
    r.rect(1, 6, 4, 5, C.HVIT);
    r.stempel('...#. ..##. .###. ####. ####. ####. ####. .###. ..##. ...#.', 3, 3, { '#': C.HVIT });
    r.stempel('#...# .#.#. ..#.. .#.#. #...#', 10, 6, { '#': C.ROED });
  },
  pause: (r) => {
    r.rect(3, 2, 4, 12, C.HVIT);
    r.rect(9, 2, 4, 12, C.HVIT);
  },
  // ----- Nye våpen (versjon 3) -----
  ctrlz: (r) => {
    // tastaturtast med «Z» og pil tilbake
    r.rect(1, 2, 14, 12, C.MORKGRAA);
    r.rect(1, 2, 14, 10, C.LYSGRAA);
    r.rect(2, 3, 12, 8, C.NESTENHVIT);
    r.stempel('#### ...# ..#. .#.. ####', 7, 4, { '#': C.NESTENSVART });
    r.stempel('.#.. ##.. .#..', 2, 6, { '#': C.BLAA });
    r.rect(3, 7, 3, 1, C.BLAA);
  },
  straale: (r) => {
    // fremdriftsindikator
    r.rect(0, 5, 16, 7, C.NESTENSVART);
    r.rect(1, 6, 14, 5, C.MORKERE);
    for (let x = 1; x < 11; x += 2) r.rect(x, 6, 1, 5, C.GROENN);
    for (let x = 2; x < 11; x += 2) r.rect(x, 6, 1, 5, C.LYSGROENN);
    r.rect(1, 13, 9, 1, C.LYSGROENN);
  },
  teams: (r) => {
    // lilla varselikon med «T» og rød prikk
    r.rect(1, 3, 12, 12, C.LILLA);
    r.rect(1, 3, 12, 2, C.LYSBLAA);
    r.rect(4, 6, 6, 2, C.HVIT);
    r.rect(6, 8, 2, 5, C.HVIT);
    r.ellipse(13, 3, 2.6, 2.6, C.ROED);
  },
  headset: (r) => {
    r.ellipse(8, 8, 7, 7, C.MORKERE);
    r.ellipse(8, 8, 5, 5, 0);
    r.rect(0, 8, 16, 8, 0);
    r.rect(1, 7, 4, 7, C.TURKIS);
    r.rect(11, 7, 4, 7, C.TURKIS);
    r.rect(2, 8, 2, 5, C.TURKIS_M);
    r.rect(12, 8, 2, 5, C.TURKIS_M);
  },
  'evo:ctrlz': (r) => {
    // Ctrl, Alt og Del
    for (const [x, y, c] of [[0, 1, C.LYSGRAA], [5, 6, C.LYSGRAA], [10, 11, C.ROSA]]) {
      r.rect(x, y, 6, 5, C.MORKGRAA);
      r.rect(x, y, 6, 4, c);
    }
    r.rect(1, 3, 3, 1, C.NESTENSVART);
    r.rect(6, 8, 3, 1, C.NESTENSVART);
    r.rect(11, 13, 3, 1, C.MORKROED);
  },
  'evo:straale': (r) => {
    // to stråler i kryss
    for (let i = 0; i < 14; i++) {
      r.rect(1 + i, 1 + i, 2, 2, C.GROENN);
      r.rect(13 - i, 1 + i, 2, 2, C.LYSGROENN);
    }
    r.ellipse(8, 8, 2.5, 2.5, C.HVIT);
  },
  'evo:teams': (r) => {
    // allmøte: tre personer
    for (const [x, c] of [[1, C.LILLA], [6, C.BLAA], [11, C.LILLA]]) {
      r.ellipse(x + 2, 5, 2, 2, c);
      r.rect(x, 8, 5, 6, c);
    }
    r.rect(0, 14, 16, 1, C.MORKERE);
  },
  'evo:headset': (r) => {
    // hjemmekontor: hus med hjerte
    r.stempel('.......##....... ......####...... .....######..... ....########.... ...##########... ..############.. .##############.', 0, 0, { '#': C.ROED });
    r.rect(3, 7, 10, 8, C.KREM);
    r.rect(7, 10, 3, 5, C.TRE);
    r.rect(4, 9, 2, 2, C.LYSBLAA);
  },
  dobbelSkjerm: (r) => {
    for (const x of [0, 8]) {
      r.rect(x, 3, 8, 7, C.MORKERE);
      r.rect(x + 1, 4, 6, 5, C.LYSBLAA);
    }
    r.rect(3, 10, 2, 3, C.MORKGRAA);
    r.rect(11, 10, 2, 3, C.MORKGRAA);
    r.rect(1, 13, 14, 1, C.MORKGRAA);
  },
  hurtigtaster: (r) => {
    r.rect(0, 6, 16, 8, C.MORKGRAA);
    for (let y = 7; y < 13; y += 3) for (let x = 1; x < 15; x += 3) r.rect(x, y, 2, 2, C.LYSGRAA);
    r.stempel('...##. ..##.. .####. ..##.. .##...', 9, 0, { '#': C.GUL });
  },
  ergonomisk: (r) => {
    // kontorstol
    r.rect(4, 1, 8, 7, C.STOL);
    r.rect(5, 2, 6, 5, C.LYSGRAA2);
    r.rect(3, 8, 10, 2, C.STOL_M);
    r.rect(7, 10, 2, 3, C.MORKERE);
    r.rect(3, 13, 10, 1, C.MORKERE);
    r.px(3, 14, C.NESTENSVART);
    r.px(12, 14, C.NESTENSVART);
  },
  sertifisering: (r) => {
    // diplom med rosett
    r.rect(1, 2, 12, 10, C.PAPIR);
    r.rect(3, 4, 8, 1, C.GRAA);
    r.rect(3, 6, 6, 1, C.GRAA);
    r.rect(3, 8, 7, 1, C.GRAA);
    r.ellipse(12, 11, 3, 3, C.GULL);
    r.rect(10, 13, 2, 3, C.ROED);
    r.rect(13, 13, 2, 3, C.ROED);
  },
  laas: (r) => {
    r.rect(4, 1, 8, 7, C.GRAA);
    r.rect(6, 3, 4, 5, 0);
    r.rect(2, 7, 12, 8, C.MORKGRAA);
    r.rect(2, 7, 12, 2, C.GRAA);
    r.rect(7, 10, 2, 3, C.NESTENSVART);
  },
  tom: () => {},
};

/** @type {Map<string, HTMLCanvasElement>} */
const cache = new Map();

/** Henter et ikon (16 × 16 lerret). Ukjente id-er gir et tomt ikon. */
export function ikon(id) {
  let c = cache.get(id);
  if (c) return c;
  const r = new Raster(16, 16);
  (TEGN[id] ?? TEGN.tom)(r);
  r.kontur(C.UT);
  c = tilLerret(r, PALETT);
  cache.set(id, c);
  return c;
}

/** Ikon-id for et våpen spilleren har (kombinasjoner har egne ikoner). */
export function vaapenIkonId(w) {
  return w.evo ? 'evo:' + w.id : w.id;
}

/** Et ikon som et lite lerret-element i HTML (skalert med skarpe piksler via CSS). */
export function ikonElement(id, klasse = 'ikon') {
  const kilde = ikon(id);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  c.className = klasse;
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  ctx.drawImage(kilde, 0, 0);
  return c;
}

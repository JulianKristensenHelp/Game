// @ts-check
// Felles verktøy: seedet tilfeldighet, dato i norsk tid, objektpool og romlig rutenett.

export const TAU = Math.PI * 2;

/** Lager et 32-bits tall fra en tekst (xmur3-hash). */
function hashTekst(tekst) {
  let h = 1779033703 ^ tekst.length;
  for (let i = 0; i < tekst.length; i++) {
    h = Math.imul(h ^ tekst.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Deterministisk tilfeldighetsgenerator (mulberry32).
 * Samme seed-tekst gir alltid samme tallrekke. Spillet bruker aldri Math.random().
 */
export class Rng {
  /** @param {string} seedTekst f.eks. "2026-11-25|spawn" */
  constructor(seedTekst) {
    this.a = hashTekst(seedTekst);
  }
  /** @returns {number} tall i [0, 1) */
  neste() {
    let t = (this.a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Tall mellom a og b. */
  mellom(a, b) {
    return a + (b - a) * this.neste();
  }
  /** Heltall i [0, n). */
  heltall(n) {
    return Math.floor(this.neste() * n);
  }
}

/** Dagens dato i norsk tid som "ÅÅÅÅ-MM-DD". Brukes som seed og som nøkkel i topplisten. */
export function datoOslo(naa = new Date()) {
  const deler = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(naa);
  const hent = (t) => deler.find((d) => d.type === t)?.value ?? '';
  return `${hent('year')}-${hent('month')}-${hent('day')}`;
}

/** "2026-11-25" → "25. november 2026" */
export function penDato(iso) {
  const mnd = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  const [aar, m, d] = iso.split('-').map(Number);
  return `${d}. ${mnd[m - 1]} ${aar}`;
}

/** Sekunder → "mm:ss" */
export function mmss(sek) {
  const s = Math.max(0, Math.floor(sek));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Tall med norsk tusenskille. */
export function tall(n) {
  return Math.round(n).toLocaleString('nb-NO');
}

/**
 * Objektpool: gjenbruker objekter i stedet for å lage nye (unngår hakking fra søppeltømming).
 * De aktive objektene ligger i items[0 .. n-1].
 * @template T
 */
export class Pool {
  /** @param {() => T} lag */
  constructor(lag) {
    /** @type {T[]} */
    this.items = [];
    this.n = 0;
    this.lag = lag;
  }
  /** Henter et ledig objekt. Feltene må settes av den som kaller. */
  ny() {
    if (this.n === this.items.length) this.items.push(this.lag());
    return this.items[this.n++];
  }
  /** Fjerner objekt nr. i ved å bytte plass med det siste. */
  fjern(i) {
    const it = this.items[i];
    this.n--;
    this.items[i] = this.items[this.n];
    this.items[this.n] = it;
  }
  toem() {
    this.n = 0;
  }
}

const CELLE = 32;
const BOETTER = 4096;
/** Største fienderadius (bossen) – brukes for å søke i nok ruter. */
const MAKS_RADIUS = 22;

/**
 * Romlig hashing: fiender sorteres i ruter slik at våpen bare trenger å sjekke de nærmeste.
 */
export class Rutenett {
  constructor() {
    this.hode = new Int32Array(BOETTER);
    this.neste = new Int32Array(1024);
    /** @type {any[]} */
    this.items = [];
  }
  /** Bygger rutenettet på nytt fra de aktive fiendene. */
  bygg(items, n) {
    this.hode.fill(-1);
    if (this.neste.length < n) this.neste = new Int32Array(n * 2);
    this.items = items;
    for (let i = 0; i < n; i++) {
      const e = items[i];
      if (!e.aktiv || e.gaar) continue;
      const cx = Math.floor(e.x / CELLE);
      const cy = Math.floor(e.y / CELLE);
      e.cx = cx;
      e.cy = cy;
      const h = ((cx * 73856093) ^ (cy * 19349663)) & (BOETTER - 1);
      this.neste[i] = this.hode[h];
      this.hode[h] = i;
    }
  }
  /**
   * Finner alle aktive fiender som overlapper sirkelen (x, y, r).
   * @param {number[]} ut indeksene skrives hit
   * @param {number} [maks] stopp etter så mange treff (brukes der det holder med noen få)
   * @returns {number} antall funnet
   */
  finn(x, y, r, ut, maks = 1e9) {
    let n = 0;
    const R = r + MAKS_RADIUS;
    const cx0 = Math.floor((x - R) / CELLE), cx1 = Math.floor((x + R) / CELLE);
    const cy0 = Math.floor((y - R) / CELLE), cy1 = Math.floor((y + R) / CELLE);
    const items = this.items;
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const h = ((cx * 73856093) ^ (cy * 19349663)) & (BOETTER - 1);
        for (let i = this.hode[h]; i !== -1; i = this.neste[i]) {
          const e = items[i];
          if (e.cx !== cx || e.cy !== cy || !e.aktiv) continue;
          const dx = e.x - x, dy = e.y - y, rr = r + e.r;
          if (dx * dx + dy * dy <= rr * rr) {
            ut[n++] = i;
            if (n >= maks) return n;
          }
        }
      }
    }
    return n;
  }
}

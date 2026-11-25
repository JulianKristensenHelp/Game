// @ts-check
// Shared utilities: seeded randomness, date in Norwegian time, object pool and spatial grid.

export const TAU = Math.PI * 2;

/** Makes a 32-bit number from a text (xmur3 hash). */
function hashText(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Deterministic random number generator (mulberry32).
 * The same seed text always gives the same sequence of numbers. The game never uses Math.random().
 */
export class Rng {
  /** @param {string} seedText e.g. "2026-11-25|spawn" */
  constructor(seedText) {
    this.a = hashText(seedText);
  }
  /** @returns {number} number in [0, 1) */
  next() {
    let t = (this.a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Number between a and b. */
  between(a, b) {
    return a + (b - a) * this.next();
  }
  /** Integer in [0, n). */
  integer(n) {
    return Math.floor(this.next() * n);
  }
}

/** Today's date in Norwegian time as "YYYY-MM-DD". Used as the seed and as the key in the leaderboard. */
export function dateOslo(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const load = (t) => parts.find((d) => d.type === t)?.value ?? '';
  return `${load('year')}-${load('month')}-${load('day')}`;
}

/** "2026-11-25" → "25. november 2026" */
export function prettyDate(iso) {
  const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  const [year, m, d] = iso.split('-').map(Number);
  return `${d}. ${months[m - 1]} ${year}`;
}

/** Seconds → "mm:ss" */
export function mmss(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Number with Norwegian thousands separator. */
export function formatNumber(n) {
  return Math.round(n).toLocaleString('nb-NO');
}

/**
 * Object pool: reuses objects instead of creating new ones (avoids stutter from garbage collection).
 * The active objects are in items[0 .. n-1].
 * @template T
 */
export class Pool {
  /** @param {() => T} make */
  constructor(make) {
    /** @type {T[]} */
    this.items = [];
    this.n = 0;
    this.make = make;
  }
  /** Gets a free object. The fields must be set by the caller. */
  acquire() {
    if (this.n === this.items.length) this.items.push(this.make());
    return this.items[this.n++];
  }
  /** Removes object no. i by swapping places with the last one. */
  removeAt(i) {
    const it = this.items[i];
    this.n--;
    this.items[i] = this.items[this.n];
    this.items[this.n] = it;
  }
  clear() {
    this.n = 0;
  }
}

const CELL = 32;
const BUCKETS = 4096;
/** The largest enemy radius (the boss) – used to search enough cells. */
const MAX_RADIUS = 22;

/**
 * Spatial hashing: enemies are sorted into cells so weapons only need to check the nearest ones.
 */
export class Grid {
  constructor() {
    this.head = new Int32Array(BUCKETS);
    this.next = new Int32Array(1024);
    /** @type {any[]} */
    this.items = [];
  }
  /** Rebuilds the grid from the active enemies. */
  build(items, n) {
    this.head.fill(-1);
    if (this.next.length < n) this.next = new Int32Array(n * 2);
    this.items = items;
    for (let i = 0; i < n; i++) {
      const e = items[i];
      if (!e.active || e.leaving) continue;
      const cx = Math.floor(e.x / CELL);
      const cy = Math.floor(e.y / CELL);
      e.cx = cx;
      e.cy = cy;
      const h = ((cx * 73856093) ^ (cy * 19349663)) & (BUCKETS - 1);
      this.next[i] = this.head[h];
      this.head[h] = i;
    }
  }
  /**
   * Finds all active enemies that overlap the circle (x, y, r).
   * @param {number[]} out the indices are written here
   * @param {number} [max] stop after this many hits (used where a few are enough)
   * @returns {number} number found
   */
  find(x, y, r, out, max = 1e9) {
    let n = 0;
    const R = r + MAX_RADIUS;
    const cx0 = Math.floor((x - R) / CELL), cx1 = Math.floor((x + R) / CELL);
    const cy0 = Math.floor((y - R) / CELL), cy1 = Math.floor((y + R) / CELL);
    const items = this.items;
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const h = ((cx * 73856093) ^ (cy * 19349663)) & (BUCKETS - 1);
        for (let i = this.head[h]; i !== -1; i = this.next[i]) {
          const e = items[i];
          if (e.cx !== cx || e.cy !== cy || !e.active) continue;
          const dx = e.x - x, dy = e.y - y, rr = r + e.r;
          if (dx * dx + dy * dy <= rr * rr) {
            out[n++] = i;
            if (n >= max) return n;
          }
        }
      }
    }
    return n;
  }
}

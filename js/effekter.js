// @ts-check
// Visuelle effekter (glade advokater, puls, tonersprut …). Påvirker aldri spillogikken:
// ingen treff, skade, poeng eller tilfeldighet avhenger av dem.

/** Maks antall effekter samtidig. */
const MAKS = 900;

/** Lager et tomt effektobjekt til poolen. */
export function lagEffekt() {
  return { type: '', x: 0, y: 0, t: 0, dur: 1, r: 0, a: 0, b: 0, c: 0, folg: false, tekst: '' };
}

/**
 * Starter en effekt.
 * @param {string} type 'glad' | 'puls' | 'sprut' | 'sving' | 'glimt' | 'poff' | 'tekst' | 'nypc' | 'drikk'
 * @param {number} dur varighet i sekunder
 * @param {number} [r] størrelse
 * @param {number} [a] vinkel eller annet tall
 * @param {number} [b] ekstra tall
 * @param {boolean} [folg] om effekten følger spilleren
 */
export function effekt(s, type, x, y, dur, r = 0, a = 0, b = 0, folg = false, tekst = '', c = 0) {
  if (s.effekter.n >= MAKS) return null;
  const e = s.effekter.ny();
  e.type = type;
  e.x = x;
  e.y = y;
  e.t = 0;
  e.dur = dur;
  e.r = r;
  e.a = a;
  e.b = b;
  e.c = c;
  e.folg = folg;
  e.tekst = tekst;
  return e;
}

export function oppdaterEffekter(s, dt) {
  const f = s.effekter;
  for (let i = f.n - 1; i >= 0; i--) {
    const e = f.items[i];
    e.t += dt;
    if (e.t >= e.dur) f.fjern(i);
  }
}

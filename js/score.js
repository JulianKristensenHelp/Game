// @ts-check
// Poeng og multiplikator (streak).
import { CONFIG } from './config.js';

const M = CONFIG.multiplikator;
/** Høyeste antall steg over startverdien. */
const MAKS_STEG = Math.round((M.maks - M.start) / M.steg);

/** Gjeldende multiplikator som tall, f.eks. 1.4. Internt lagres den som antall steg (heltall). */
export function multiplikator(s) {
  return M.start + s.multSteg * M.steg;
}

/** "x1,4" */
export function multTekst(verdi) {
  return 'x' + verdi.toFixed(1).replace('.', ',');
}

/**
 * Gir poeng ganget med multiplikatoren akkurat nå.
 * @returns {number} poengene som ble gitt
 */
export function giPoeng(s, basis) {
  const p = Math.round(basis * multiplikator(s));
  s.score += p;
  return p;
}

/** Kalles for hver advokat som blir glad. Øker multiplikatoren for hver 25. */
export function registrerHjulpet(s) {
  if (s.multSteg >= MAKS_STEG) {
    s.multTeller = 0;
    return;
  }
  s.multTeller++;
  if (s.multTeller >= M.perHjulpne) {
    s.multTeller = 0;
    s.multSteg++;
    if (s.multSteg > s.stat.maksMultSteg) s.stat.maksMultSteg = s.multSteg;
    s.hendelser.push('multOpp');
  }
}

/**
 * Kalles når spilleren blir truffet: halvparten av det som er bygget opp over start mistes.
 * Halve steg rundes ned (x1,5 → x1,2), slik at et treff alltid koster noe.
 */
export function multTreff(s) {
  const ny = Math.floor(s.multSteg / 2);
  if (ny < s.multSteg) {
    s.multSteg = ny;
    s.hendelser.push('multNed');
  }
  s.multTeller = 0;
}

/** Erfaring som kreves for å gå opp fra dette nivået. */
export function xpBehov(nivaa) {
  const n = CONFIG.nivaa;
  return Math.round(n.base + n.perNivaa * nivaa + n.kvadrat * nivaa * nivaa);
}

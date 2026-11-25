// @ts-check
// Innstillinger for lyd og skjerm. Lagres lokalt i nettleseren og trer i kraft med en gang.
// Påvirker bare lyd og utseende – aldri spillogikken.

const NOEKKEL = 'hds_innstillinger';

/**
 * @typedef {Object} Valg
 * @property {number} volum hovedvolum 0–1
 * @property {number} effekter lydeffekter 0–1
 * @property {boolean} demp lyden er av (standard: av – det er et kontor)
 * @property {'tilpass'|'2'|'3'|'4'} spillStoerrelse
 * @property {'auto'|'liten'|'middels'|'stor'|'ekstraStor'} ui
 * @property {'av'|'liten'|'stor'} minikart
 * @property {boolean} rist skjermristing
 * @property {boolean} faerreBlink reduserte blinkeffekter
 */

const reduserBevegelse = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** @returns {Valg} */
export function standardValg() {
  return {
    volum: 0.5,
    effekter: 1,
    demp: true,
    spillStoerrelse: 'tilpass',
    ui: 'auto',
    minikart: 'liten',
    rist: !reduserBevegelse(),
    faerreBlink: reduserBevegelse(),
  };
}

export class Innstillinger {
  constructor() {
    /** @type {Valg} */
    this.v = standardValg();
    try {
      const lagret = JSON.parse(localStorage.getItem(NOEKKEL) || 'null');
      if (lagret && typeof lagret === 'object') {
        for (const k of Object.keys(this.v)) if (typeof lagret[k] === typeof this.v[k]) this.v[k] = lagret[k];
      }
    } catch {
      /* ingen lagring tilgjengelig – standardvalg brukes */
    }
    /** @type {((v: Valg, endret: string) => void)[]} */
    this.lyttere = [];
  }

  /** Endrer ett valg, lagrer og varsler. */
  sett(nøkkel, verdi) {
    this.v[nøkkel] = verdi;
    this.lagre();
    for (const f of this.lyttere) f(this.v, nøkkel);
  }

  tilbakestill() {
    this.v = standardValg();
    this.lagre();
    for (const f of this.lyttere) f(this.v, '*');
  }

  lagre() {
    try {
      localStorage.setItem(NOEKKEL, JSON.stringify(this.v));
    } catch {
      /* ignorer */
    }
  }

  /** @param {(v: Valg, endret: string) => void} f */
  vedEndring(f) {
    this.lyttere.push(f);
  }

  // Snarveier som tegnekoden bruker
  get rist() {
    return this.v.rist;
  }
  get faerreBlink() {
    return this.v.faerreBlink;
  }
}

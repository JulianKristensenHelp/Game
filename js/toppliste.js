// @ts-check
// Toppliste-klienten. All lagring går gjennom de to funksjonene under,
// så det er lett å bytte til en annen lagring (f.eks. plattformens egen) uten å røre resten av spillet.

/** Adressen til toppliste-API-et (relativ, så spillet kan ligge i en undermappe). */
const API = 'api';
const TIDSAVBRUDD_MS = 5000;

/**
 * @typedef {Object} Innslag
 * @property {string} navn maks 20 tegn
 * @property {number} score
 * @property {number} tid overlevd tid i sekunder
 * @property {number} hjulpne antall hjulpne advokater
 * @property {number} maksMult høyeste multiplikator
 * @property {string} [dato] "ÅÅÅÅ-MM-DD" (norsk tid)
 * @property {number} [plass]
 */

/**
 * @typedef {Object} Toppliste
 * @property {string} dato
 * @property {Innslag[]} topp de beste (ett innslag per navn)
 * @property {Innslag | null} egen spillerens eget innslag med plassering (også utenfor topp 20)
 * @property {number} antall antall deltakere i dag
 */

async function hent(url, valg) {
  const avbryt = new AbortController();
  const timer = setTimeout(() => avbryt.abort(), TIDSAVBRUDD_MS);
  try {
    const svar = await fetch(url, { ...valg, signal: avbryt.signal, cache: 'no-store' });
    const data = await svar.json().catch(() => null);
    if (!svar.ok) throw new Error(data?.feil || 'Topplisten svarte med feil ' + svar.status);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Henter dagens toppliste.
 * @param {string} dato "ÅÅÅÅ-MM-DD"
 * @param {string} [navn] spillerens navn, for å få egen plassering
 * @returns {Promise<Toppliste>}
 */
export function hentToppliste(dato, navn = '') {
  const q = new URLSearchParams({ dato });
  if (navn) q.set('navn', navn);
  return hent(`${API}/toppliste?${q}`);
}

/**
 * Sender inn en runde. Serveren beholder hver persons beste runde den dagen.
 * @param {Innslag} innslag
 * @returns {Promise<{ok: boolean, forbedret: boolean, plass: number}>}
 */
export function sendInnScore(innslag) {
  return hent(`${API}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(innslag),
  });
}

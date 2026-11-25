// @ts-check
// Oppgraderingskortene ved nivåopp: nye våpen, våpennivåer, passive og kombinasjoner.
import { CONFIG } from './config.js';
import { giPoeng } from './score.js';

const V = CONFIG.vaapen;
const P = CONFIG.passiver;
const G = CONFIG.grenser;

/**
 * @typedef {Object} Kort
 * @property {'vaapen'|'passiv'|'kombinasjon'|'kaffe'} slag
 * @property {string} id våpen- eller passiv-id (ikonet hentes fra ikoner.js)
 * @property {string} ikon ikon-id (for kombinasjoner: 'evo:' + våpen-id)
 * @property {string} navn
 * @property {string} nivaaTekst f.eks. "Nytt våpen (2 av 4 plasser brukt)" eller "Nivå 3"
 * @property {string} tekst én kort setning om hva kortet gjør
 * @property {boolean} fremhevet kombinasjonskort
 */

const finnVaapen = (s, id) => s.spiller.vaapen.find((w) => w.id === id);
const finnPassiv = (s, id) => s.spiller.passiver.find((p) => p.id === id);
const passivNivaa = (s, id) => finnPassiv(s, id)?.nivaa ?? 0;

/** Regner ut de samlede bonusene fra passive. Kalles hver gang noe endres. */
export function regnUtBonuser(s) {
  const m = s.spiller.mod;
  const papir = passivNivaa(s, 'papir');
  let ekstra = 0, papirHjelp = 0;
  for (let n = 1; n <= papir; n++) {
    if (P.papir.prosjektilNivaaer.includes(n)) ekstra++;
    else papirHjelp += P.papir.verdi;
  }
  // Karakterens bonus (se CONFIG.karakterer)
  const kb = s.karakterBonus ?? { hjelp: 0, fart: 0, plukk: 0 };
  m.omraade = 1 + P.ram.verdi * passivNivaa(s, 'ram');
  m.hjelp = (1 + P.admin.verdi * passivNivaa(s, 'admin')) * (1 + papirHjelp) * (1 + (kb.hjelp ?? 0));
  m.ekstraProsj = ekstra;
  m.varighet = 1 + P.batteri.verdi * passivNivaa(s, 'batteri');
  m.cd = Math.max(0.2, 1 - P.ssd.verdi * passivNivaa(s, 'ssd'));
  m.fart = 1 + P.joggesko.verdi * passivNivaa(s, 'joggesko') + (kb.fart ?? 0);
  m.plukk = 1 + P.skjote.verdi * passivNivaa(s, 'skjote') + (kb.plukk ?? 0);
  // De nye passivene
  m.dobbel = Math.min(0.25, P.dobbelSkjerm.verdi * passivNivaa(s, 'dobbelSkjerm'));
  m.prosjFart = 1 + P.hurtigtaster.verdi * passivNivaa(s, 'hurtigtaster');
  m.skadeRed = Math.min(0.3, P.ergonomisk.verdi * passivNivaa(s, 'ergonomisk'));
  m.xp = 1 + P.sertifisering.verdi * passivNivaa(s, 'sertifisering');
}

/** Gir spilleren et nytt våpen, eller ett nivå opp på et våpen spilleren har. */
export function giVaapen(s, id) {
  const w = finnVaapen(s, id);
  if (w) {
    if (w.nivaa < G.vaapenNivaa) w.nivaa++;
  } else {
    if (s.spiller.vaapen.length >= G.vaapen) return;
    s.spiller.vaapen.push({ id, nivaa: 1, evo: false, cd: 0.3, vinkel: 0, fase: 0, aktiv: 0, tikk: 0, ladninger: 1 });
  }
  s.hendelser.push('oppgradert');
}

/** Gir en ny passiv, eller ett nivå opp. */
export function giPassiv(s, id) {
  const p = finnPassiv(s, id);
  if (p) {
    if (p.nivaa >= G.passivNivaa) return;
    p.nivaa++;
  } else {
    if (s.spiller.passiver.length >= G.passiver) return;
    s.spiller.passiver.push({ id, nivaa: 1 });
  }
  if (id === 'boks') {
    s.spiller.maksEnergi += P.boks.verdi;
    s.spiller.energi = Math.min(s.spiller.maksEnergi, s.spiller.energi + P.boks.verdi);
  }
  regnUtBonuser(s);
  s.hendelser.push('oppgradert');
}

/** Bytter et våpen på nivå 8 ut med kombinasjonen. Den tar samme plass som våpenet. */
export function giKombinasjon(s, id) {
  const w = finnVaapen(s, id);
  if (!w || w.evo) return;
  w.evo = true;
  w.cd = 0.2;
  if (id === 'headset') w.ladninger = V.headset.kombinasjon.tall.ladninger;
  s.stat.kombinasjoner.push(id);
  s.hendelser.push('kombinasjon:' + id);
  s.hendelser.push('oppgradert');
}

/** Kombinasjoner som kan velges nå: våpen på nivå 8 + tilhørende passiv (uansett nivå). */
export function ledigeKombinasjoner(s) {
  return s.spiller.vaapen.filter((w) => !w.evo && w.nivaa >= G.vaapenNivaa && passivNivaa(s, V[w.id].kombinasjon.passiv) > 0);
}

/**
 * Lager kortene ved nivåopp (vanligvis tre). Bruker sin egen tilfeldighetsstrøm,
 * så samme valg gir samme tilbud for alle samme dag.
 * @returns {Kort[]}
 */
export function lagKort(s) {
  const sp = s.spiller;
  const rng = s.rng.kort;
  /** @type {Kort[]} */
  const kandidater = [];
  const brukt = sp.vaapen.length;

  for (const id of Object.keys(V)) {
    const w = finnVaapen(s, id);
    if (w) {
      if (!w.evo && w.nivaa < G.vaapenNivaa) {
        kandidater.push({ slag: 'vaapen', id, ikon: id, navn: V[id].navn, nivaaTekst: 'Nivå ' + (w.nivaa + 1), tekst: V[id].nivaaer[w.nivaa].tekst, fremhevet: false });
      }
    } else if (brukt < G.vaapen) {
      // Bare når det er ledig plass – så man må bestemme seg for et bygg.
      kandidater.push({ slag: 'vaapen', id, ikon: id, navn: V[id].navn, nivaaTekst: `Nytt våpen (${brukt} av ${G.vaapen} plasser brukt)`, tekst: V[id].beskrivelse, fremhevet: false });
    }
  }
  for (const id of Object.keys(P)) {
    const p = finnPassiv(s, id);
    const nivaa = p ? p.nivaa : 0;
    if (p ? nivaa < G.passivNivaa : sp.passiver.length < G.passiver) {
      const tekst = P[id].nivaaTekst ? P[id].nivaaTekst[nivaa] : P[id].tekst;
      kandidater.push({ slag: 'passiv', id, ikon: id, navn: P[id].navn, nivaaTekst: p ? 'Nivå ' + (nivaa + 1) : `Ny passiv (${sp.passiver.length} av ${G.passiver} brukt)`, tekst, fremhevet: false });
    }
  }

  /** @type {Kort[]} */
  const kort = [];
  // En tilgjengelig kombinasjon vises alltid som et eget, fremhevet kort.
  const evo = ledigeKombinasjoner(s);
  if (evo.length > 0) {
    const w = evo[rng.heltall(evo.length)];
    const k = V[w.id].kombinasjon;
    kort.push({ slag: 'kombinasjon', id: w.id, ikon: 'evo:' + w.id, navn: k.navn, nivaaTekst: 'Kombinasjon!', tekst: k.tekst, fremhevet: true });
  }
  while (kort.length < 3 && kandidater.length > 0) {
    kort.push(kandidater.splice(rng.heltall(kandidater.length), 1)[0]);
  }
  // Alt maksert: bare «Kaffepause-bonus» tilbys (ikke energidrikk – den må hentes på kartet).
  if (kort.length === 0 || (kort.length < 3 && kandidater.length === 0 && !kort.some((k) => k.slag === 'kaffe'))) {
    kort.push({ slag: 'kaffe', id: 'kaffe', ikon: 'kaffe', navn: 'Kaffepause-bonus', nivaaTekst: 'Bonus', tekst: `${CONFIG.kaffepauseBonus} poeng ganget med multiplikatoren.`, fremhevet: false });
  }
  return kort;
}

/** Utfører kortet spilleren valgte. */
export function brukKort(s, kort) {
  if (kort.slag === 'vaapen') giVaapen(s, kort.id);
  else if (kort.slag === 'passiv') giPassiv(s, kort.id);
  else if (kort.slag === 'kombinasjon') giKombinasjon(s, kort.id);
  else if (kort.slag === 'kaffe') giPoeng(s, CONFIG.kaffepauseBonus);
}

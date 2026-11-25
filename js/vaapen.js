// @ts-check
// IT-løsningene (våpnene). Alle aktiveres automatisk – spilleren styrer bare bevegelsen.
import { CONFIG } from './config.js';
import { TAU } from './verktoy.js';
import { effekt } from './effekter.js';
import { hjelp, iSynsfelt } from './fiender.js';

const V = CONFIG.vaapen;
const MAKS_PROSJ = CONFIG.maksProsjektilerPerVaapen;

/** Tomt prosjektil til poolen. */
export function lagProsjektil() {
  return {
    type: 'toner', x: 0, y: 0, vx: 0, vy: 0, liv: 0, hjelp: 0, sprut: 0, gjennom: 0, vinkel: 0, evo: false,
    /** uid-ene til advokater nøkkelen allerede har truffet (gjenbrukt liste). */
    truffet: /** @type {number[]} */ ([]), nTruffet: 0,
    /** Ctrl+Z: på vei ut eller tilbake, og hvor langt den har flydd. Teams: mål, sprett igjen og «budsjett». */
    tilbake: false, strekning: 0, rekkevidde: 0, maalUid: 0, sprett: 0, budsjett: 0, fart: 0,
  };
}

/** Tallene som gjelder for et våpen akkurat nå (nivået, eller kombinasjonen). */
export function vaapenTall(w) {
  return w.evo ? V[w.id].kombinasjon.tall : V[w.id].nivaaer[w.nivaa - 1];
}

/** Navnet som vises (kombinasjonens navn hvis våpenet er kombinert). */
export function vaapenNavn(w) {
  return w.evo ? V[w.id].kombinasjon.navn : V[w.id].navn;
}

/** Skru av og på: puls rundt spilleren. */
function aktiverAvPaa(s, w, t) {
  const p = s.spiller, ut = s.treffListe, f = s.fiender.items;
  const R = t.radius * p.mod.omraade;
  const n = s.rutenett.finn(p.x, p.y, R, ut);
  for (let i = 0; i < n; i++) {
    const e = f[ut[i]];
    hjelp(s, e, t.hjelp, 'avpaa');
    if (t.dytt && e.aktiv && e.type !== 'boss') {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * t.dytt;
      e.y += (dy / d) * t.dytt;
    }
  }
  effekt(s, 'puls', p.x, p.y, 0.35, R, 0, w.evo ? 1 : 0, true);
}

/** Toner-kast: kassetter i vifteform dit spilleren går (alle retninger som kombinasjon). */
function aktiverToner(s, w, t) {
  const p = s.spiller;
  const n = t.antall + p.mod.ekstraProsj;
  const base = Math.atan2(p.retY, p.retX);
  const fart = t.fart * p.mod.varighet * p.mod.prosjFart;
  for (let i = 0; i < n; i++) {
    if (s.prosjTeller.toner >= MAKS_PROSJ) break;
    const a = w.evo ? base + (i * TAU) / n : base + (i - (n - 1) / 2) * t.spredning;
    const pr = s.prosjektiler.ny();
    s.prosjTeller.toner++;
    pr.type = 'toner';
    pr.x = p.x;
    pr.y = p.y;
    pr.vx = Math.cos(a) * fart;
    pr.vy = Math.sin(a) * fart;
    pr.liv = t.rekkevidde / t.fart;
    pr.hjelp = t.hjelp;
    pr.sprut = t.sprut * p.mod.omraade;
    pr.vinkel = a;
    pr.evo = w.evo;
    pr.nTruffet = 0;
  }
}

/** Passord-reset: nøkler rett fram som går gjennom flere advokater. */
function aktiverPassord(s, w, t) {
  const p = s.spiller;
  const n = t.antall + p.mod.ekstraProsj * (w.evo ? 2 : 1);
  const fart = t.fart * p.mod.varighet * p.mod.prosjFart;
  for (let i = 0; i < n; i++) {
    if (s.prosjTeller.noekkel >= MAKS_PROSJ) break;
    const side = (i - (n - 1) / 2) * 8;
    const bak = -Math.abs(side) * 0.7;
    const pr = s.prosjektiler.ny();
    s.prosjTeller.noekkel++;
    pr.type = 'noekkel';
    pr.x = p.x - p.retY * side + p.retX * bak;
    pr.y = p.y + p.retX * side + p.retY * bak;
    pr.vx = p.retX * fart;
    pr.vy = p.retY * fart;
    pr.liv = t.rekkevidde / t.fart;
    pr.hjelp = t.hjelp;
    pr.sprut = 0;
    pr.gjennom = t.gjennom;
    pr.vinkel = Math.atan2(p.retY, p.retX);
    pr.evo = w.evo;
    pr.nTruffet = 0;
  }
}

/** HDMI-kabelen: bue foran (og bak fra nivå 4, full sirkel som kombinasjon). */
function aktiverHdmi(s, w, t) {
  const p = s.spiller, ut = s.treffListe, f = s.fiender.items;
  const R = t.lengde * p.mod.omraade;
  const base = Math.atan2(p.retY, p.retX);
  const n = s.rutenett.finn(p.x, p.y, R, ut);
  for (let i = 0; i < n; i++) {
    const e = f[ut[i]];
    if (!w.evo) {
      let diff = Math.abs(Math.atan2(e.y - p.y, e.x - p.x) - base);
      if (diff > Math.PI) diff = TAU - diff;
      const foran = diff <= t.bue / 2;
      const bak = t.bak && diff >= Math.PI - t.bue / 2;
      if (!foran && !bak) continue;
    }
    hjelp(s, e, t.hjelp, 'hdmi');
  }
  effekt(s, 'sving', p.x, p.y, 0.24, R, base, w.evo ? 2 : t.bak ? 1 : 0, true);
}

/** Fjernstyring: tilfeldige advokater på skjermen får hjelp. */
function aktiverFjern(s, w, t) {
  const f = s.fiender, kand = s.kandidater;
  let k = 0;
  for (let i = 0; i < f.n; i++) {
    const e = f.items[i];
    if (!e.aktiv || e.gaar || !iSynsfelt(s, e.x, e.y, 0)) continue;
    kand[k++] = i;
  }
  const antall = Math.min(t.treff, k);
  for (let j = 0; j < antall; j++) {
    const r = j + s.rng.vaapen.heltall(k - j);
    const tmp = kand[j];
    kand[j] = kand[r];
    kand[r] = tmp;
    const e = f.items[kand[j]];
    effekt(s, 'glimt', e.x, e.y, 0.3, e.r, 0, w.evo ? 1 : 0);
    hjelp(s, e, t.hjelp, 'fjern');
  }
}

/** Trådløse mus: kretser i en bane. Treffer i en ring, ikke rett rundt spilleren. */
function oppdaterMus(s, w, t, dt) {
  const p = s.spiller, ut = s.treffListe, f = s.fiender.items;
  w.vinkel = (w.vinkel + t.rotasjon * p.mod.varighet * dt) % TAU;
  const R = t.bane * p.mod.omraade;
  for (let i = 0; i < t.antall; i++) {
    const a = w.vinkel + (i * TAU) / t.antall;
    const n = s.rutenett.finn(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, 6, ut);
    for (let j = 0; j < n; j++) {
      const e = f[ut[j]];
      if (e.musCd <= 0) {
        e.musCd = t.treffPause;
        hjelp(s, e, t.hjelp, 'mus');
      }
    }
  }
}


// ---------- De fire nye våpnene ----------

/** Nærmeste aktive advokat innenfor radius R fra (x, y), som ikke er i «unntatt»-lista. */
function naermeste(s, x, y, R, unntatt = null, nUnntatt = 0, hopp = null) {
  const ut = s.treffListe2, f = s.fiender.items;
  const n = s.rutenett.finn(x, y, R, ut);
  let best = null, bestD = 1e12;
  for (let i = 0; i < n; i++) {
    const e = f[ut[i]];
    if (!e.aktiv || e.gaar || e === hopp) continue;
    let sett = false;
    for (let k = 0; k < nUnntatt; k++) if (unntatt[k] === e.uid) { sett = true; break; }
    if (sett) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/** Ctrl+Z: en stor tast kastes mot nærmeste advokat, snur og kommer tilbake (bumerang). */
function aktiverCtrlz(s, w, t) {
  const p = s.spiller;
  const maal = naermeste(s, p.x, p.y, 260);
  const base = maal ? Math.atan2(maal.y - p.y, maal.x - p.x) : Math.atan2(p.retY, p.retX);
  const fart = t.fart * p.mod.prosjFart * p.mod.varighet;
  for (let i = 0; i < t.antall; i++) {
    if (s.prosjTeller.ctrlz >= MAKS_PROSJ) break;
    const a = base + (i - (t.antall - 1) / 2) * 0.45;
    const pr = s.prosjektiler.ny();
    s.prosjTeller.ctrlz++;
    pr.type = 'ctrlz';
    pr.x = p.x;
    pr.y = p.y;
    pr.vx = Math.cos(a) * fart;
    pr.vy = Math.sin(a) * fart;
    pr.fart = fart;
    pr.liv = 6;
    pr.hjelp = t.hjelp;
    pr.tilbake = false;
    pr.strekning = 0;
    pr.rekkevidde = t.rekkevidde * p.mod.omraade;
    pr.vinkel = a;
    pr.evo = false;
    pr.nTruffet = 0;
  }
}

/** Teams-varsel: flyr til nærmeste advokat og spretter videre (deler seg som kombinasjon). */
function aktiverTeams(s, w, t) {
  const p = s.spiller;
  if (s.prosjTeller.teams >= MAKS_PROSJ) return;
  const maal = naermeste(s, p.x, p.y, 240);
  if (!maal) return;
  const pr = s.prosjektiler.ny();
  s.prosjTeller.teams++;
  pr.type = 'teams';
  pr.x = p.x;
  pr.y = p.y - 6;
  pr.fart = t.fart * p.mod.prosjFart;
  pr.vx = 0;
  pr.vy = 0;
  pr.liv = 4;
  pr.hjelp = t.hjelp;
  pr.maalUid = maal.uid;
  pr.sprett = t.sprett;
  pr.budsjett = w.evo ? t.maksTreff : t.sprett;
  pr.rekkevidde = t.rekkevidde * p.mod.omraade;
  pr.evo = w.evo;
  pr.nTruffet = 0;
  s.teamsMaal.set(pr, maal);
}

/** Oppdateringsstrålen: én stråle i bevegelsesretningen en stund, så pause. Kombinasjon: to stråler som sveiper rundt. */
function oppdaterStraale(s, w, t, dt) {
  const p = s.spiller;
  if (w.evo) {
    w.vinkel = (w.vinkel + t.rotasjon * p.mod.varighet * dt) % TAU;
    w.aktiv = 1;
    w.tikk -= dt;
    if (w.tikk <= 0) {
      w.tikk += t.tikk;
      straaleTreff(s, w.vinkel, t);
      straaleTreff(s, w.vinkel + Math.PI, t);
    }
    return;
  }
  if (w.aktiv > 0) {
    w.aktiv -= dt;
    w.vinkel = Math.atan2(p.retY, p.retX);
    w.tikk -= dt;
    if (w.tikk <= 0) {
      w.tikk += t.tikk;
      straaleTreff(s, w.vinkel, t);
    }
    if (w.aktiv <= 0) {
      w.aktiv = 0;
      // «Dobbel skjerm»: en ny stråle med en gang
      w.cd = dobbelSkjerm(s) ? 0.12 : t.pause * p.mod.cd;
    }
    return;
  }
  w.cd -= dt;
  if (w.cd <= 0) {
    w.aktiv = t.varighet * p.mod.varighet;
    w.fase = w.aktiv;
    w.tikk = 0;
    w.vinkel = Math.atan2(p.retY, p.retX);
  }
}

/** Hjelper alle advokater som ligger i strålen (et smalt rektangel ut fra spilleren). */
function straaleTreff(s, vinkel, t) {
  const p = s.spiller, ut = s.treffListe, f = s.fiender.items;
  const L = t.lengde * p.mod.omraade, B = t.bredde * p.mod.omraade;
  const cos = Math.cos(vinkel), sin = Math.sin(vinkel);
  const n = s.rutenett.finn(p.x + (cos * L) / 2, p.y + (sin * L) / 2, L / 2 + B, ut);
  for (let i = 0; i < n; i++) {
    const e = f[ut[i]];
    const dx = e.x - p.x, dy = e.y - p.y;
    const langs = dx * cos + dy * sin, tvers = Math.abs(-dx * sin + dy * cos);
    if (langs >= -e.r && langs <= L + e.r && tvers <= B / 2 + e.r) hjelp(s, e, t.hjelp, 'straale');
  }
}

/** Støydempende headset: lader opp skjoldet. Selve blokkeringen skjer i proevBlokk(). */
function oppdaterHeadset(s, w, t, dt) {
  const maks = t.ladninger;
  if (w.ladninger < maks) {
    w.cd -= dt;
    if (w.cd <= 0) {
      w.ladninger++;
      w.cd = t.lading * s.spiller.mod.cd;
    }
  } else w.cd = t.lading * s.spiller.mod.cd;
}

/**
 * Kalles når spilleren blir truffet. Har headsetet en ladning, blokkeres treffet: ingen energi går tapt,
 * multiplikatoren påvirkes ikke, og en puls hjelper advokatene rundt.
 * @returns {boolean} true hvis treffet ble blokkert
 */
export function proevBlokk(s) {
  const p = s.spiller;
  for (let i = 0; i < p.vaapen.length; i++) {
    const w = p.vaapen[i];
    if (w.id !== 'headset' || w.ladninger <= 0) continue;
    const t = vaapenTall(w);
    w.ladninger--;
    const R = t.pulsRadius * p.mod.omraade;
    const ut = s.treffListe, f = s.fiender.items;
    const n = s.rutenett.finn(p.x, p.y, R, ut);
    for (let j = 0; j < n; j++) hjelp(s, f[ut[j]], t.hjelp, 'headset');
    effekt(s, 'blokk', p.x, p.y, 0.4, R, 0, w.evo ? 1 : 0, true);
    s.stat.blokkert++;
    s.hendelser.push('blokk');
    return true;
  }
  return false;
}

/** Ctrl+Alt+Del: taster i en spiral ut og inn rundt spilleren. */
function oppdaterSpiral(s, w, t, dt) {
  const p = s.spiller, ut = s.treffListe, f = s.fiender.items;
  w.vinkel = (w.vinkel + t.rotasjon * p.mod.prosjFart * dt) % TAU;
  w.fase = (w.fase + dt) % t.periode;
  const R = t.radius * p.mod.omraade;
  for (let i = 0; i < t.antall; i++) {
    const [x, y] = spiralPos(w, t, i, R, p);
    const n = s.rutenett.finn(x, y, 7, ut);
    for (let j = 0; j < n; j++) {
      const e = f[ut[j]];
      if (e.ctrlCd <= 0) {
        e.ctrlCd = t.treffPause;
        hjelp(s, e, t.hjelp, 'ctrlz');
      }
    }
  }
}

const SPIRAL = [0, 0];
/** Posisjonen til tast nr. i i spiralen (brukes både av logikk og tegning). */
export function spiralPos(w, t, i, R, p) {
  const a = w.vinkel + (i * TAU) / t.antall;
  const f = Math.abs(Math.sin(Math.PI * (w.fase / t.periode) + i * 0.7));
  const rr = R * (0.2 + 0.8 * f);
  SPIRAL[0] = p.x + Math.cos(a) * rr;
  SPIRAL[1] = p.y + Math.sin(a) * rr;
  return SPIRAL;
}

/** «Dobbel skjerm»: sjanse for at våpenet aktiveres én gang til. Egen tilfeldighetsstrøm (Dagens vakt). */
function dobbelSkjerm(s) {
  const sjanse = s.spiller.mod.dobbel;
  return sjanse > 0 && s.rng.dobbel.neste() < sjanse;
}

const AKTIVER = {
  avpaa: aktiverAvPaa, toner: aktiverToner, passord: aktiverPassord, hdmi: aktiverHdmi, fjern: aktiverFjern,
  ctrlz: aktiverCtrlz, teams: aktiverTeams,
};

/** Teller ned og aktiverer alle våpen spilleren har. */
export function oppdaterVaapen(s, dt) {
  const p = s.spiller;
  for (let i = 0; i < p.vaapen.length; i++) {
    const w = p.vaapen[i];
    const t = vaapenTall(w);
    if (w.id === 'mus') {
      oppdaterMus(s, w, t, dt);
      continue;
    }
    if (w.id === 'straale') {
      oppdaterStraale(s, w, t, dt);
      continue;
    }
    if (w.id === 'headset') {
      oppdaterHeadset(s, w, t, dt);
      continue;
    }
    if (w.id === 'ctrlz' && w.evo) {
      oppdaterSpiral(s, w, t, dt);
      continue;
    }
    w.cd -= dt;
    if (w.cd <= 0) {
      AKTIVER[w.id](s, w, t);
      // «Dobbel skjerm»: av og til aktiveres våpenet én gang til like etter
      w.cd = dobbelSkjerm(s) ? 0.12 : w.cd + t.intervall * p.mod.cd;
      if (w.cd < 0.05) w.cd = 0.05;
    }
  }
}

/** Fjerner prosjektil nr. i og teller ned riktig teller. */
function fjernProsjektil(s, i) {
  const pr = s.prosjektiler.items[i];
  if (pr.type === 'toner') s.prosjTeller.toner--;
  else if (pr.type === 'noekkel') s.prosjTeller.noekkel--;
  else if (pr.type === 'ctrlz') s.prosjTeller.ctrlz--;
  else if (pr.type === 'teams') {
    s.prosjTeller.teams--;
    s.teamsMaal.delete(pr);
  }
  s.prosjektiler.fjern(i);
}

/** Har prosjektilet allerede truffet denne advokaten? Hvis ikke, merkes den som truffet. */
function nyttTreff(pr, uid) {
  const nSjekk = pr.nTruffet < 64 ? pr.nTruffet : 64;
  for (let k = 0; k < nSjekk; k++) if (pr.truffet[k] === uid) return false;
  pr.truffet[pr.nTruffet % 64] = uid;
  pr.nTruffet++;
  return true;
}

/** Flytter alle prosjektiler og sjekker treff. Alt som forlater kartet eller skjermen fjernes. */
export function oppdaterProsjektiler(s, dt) {
  const pool = s.prosjektiler, ut = s.treffListe, f = s.fiender.items, p = s.spiller;
  for (let i = pool.n - 1; i >= 0; i--) {
    const pr = pool.items[i];
    pr.liv -= dt;

    if (pr.type === 'ctrlz') {
      // Bumerang: ut til rekkevidden, så tilbake til spilleren
      if (pr.tilbake) {
        const dx = p.x - pr.x, dy = p.y - pr.y, d = Math.hypot(dx, dy) || 1;
        pr.vx = (dx / d) * pr.fart;
        pr.vy = (dy / d) * pr.fart;
        if (d < 10) {
          fjernProsjektil(s, i);
          continue;
        }
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.strekning += pr.fart * dt;
      if (!pr.tilbake && pr.strekning >= pr.rekkevidde) {
        pr.tilbake = true;
        pr.nTruffet = 0; // treffer på nytt på vei tilbake
      }
      const n = s.rutenett.finn(pr.x, pr.y, 7, ut);
      for (let j = 0; j < n; j++) {
        const e = f[ut[j]];
        if (nyttTreff(pr, e.uid)) hjelp(s, e, pr.hjelp, 'ctrlz');
      }
      if (pr.liv <= 0) fjernProsjektil(s, i);
      continue;
    }

    if (pr.type === 'teams') {
      // Kjede: fly til målet, hjelp, sprett videre til neste nærmeste som ikke er truffet
      let maal = s.teamsMaal.get(pr);
      if (!maal || !maal.aktiv || maal.uid !== pr.maalUid) {
        maal = naermeste(s, pr.x, pr.y, pr.rekkevidde, pr.truffet, Math.min(pr.nTruffet, 64));
        if (!maal) {
          fjernProsjektil(s, i);
          continue;
        }
        pr.maalUid = maal.uid;
        s.teamsMaal.set(pr, maal);
      }
      const dx = maal.x - pr.x, dy = maal.y - pr.y, d = Math.hypot(dx, dy) || 1;
      const steg = pr.fart * dt;
      if (d <= steg + maal.r) {
        pr.x = maal.x;
        pr.y = maal.y;
        nyttTreff(pr, maal.uid);
        hjelp(s, maal, pr.hjelp, 'teams');
        effekt(s, 'glimt', maal.x, maal.y, 0.2, maal.r, 0, 2);
        pr.sprett--;
        pr.budsjett--;
        const neste = pr.sprett > 0 && pr.budsjett > 0 ? naermeste(s, pr.x, pr.y, pr.rekkevidde, pr.truffet, Math.min(pr.nTruffet, 64)) : null;
        if (!neste) {
          fjernProsjektil(s, i);
          continue;
        }
        pr.maalUid = neste.uid;
        s.teamsMaal.set(pr, neste);
        // Allmøte på Teams: varselet deler seg i to ved hvert sprett
        if (pr.evo && pr.budsjett >= 2 && s.prosjTeller.teams < MAKS_PROSJ) {
          const andre = naermeste(s, pr.x, pr.y, pr.rekkevidde, pr.truffet, Math.min(pr.nTruffet, 64), neste);
          if (andre) {
            const ny = pool.ny();
            s.prosjTeller.teams++;
            ny.type = 'teams';
            ny.x = pr.x;
            ny.y = pr.y;
            ny.fart = pr.fart;
            ny.liv = pr.liv;
            ny.hjelp = pr.hjelp;
            ny.sprett = pr.sprett;
            ny.rekkevidde = pr.rekkevidde;
            ny.evo = true;
            const halv = Math.floor(pr.budsjett / 2);
            ny.budsjett = halv;
            pr.budsjett -= halv;
            ny.nTruffet = Math.min(pr.nTruffet, 64);
            for (let k = 0; k < ny.nTruffet; k++) ny.truffet[k] = pr.truffet[k];
            ny.maalUid = andre.uid;
            s.teamsMaal.set(ny, andre);
          }
        }
      } else {
        pr.vx = (dx / d) * pr.fart;
        pr.vy = (dy / d) * pr.fart;
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
      }
      if (pr.liv <= 0) fjernProsjektil(s, i);
      continue;
    }

    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    let ferdig = pr.liv <= 0 || !iSynsfelt(s, pr.x, pr.y, 24);
    if (pr.type === 'toner') {
      // Sprekker ved første treff (eller når den lander) og hjelper alle i spruten.
      if (ferdig || s.rutenett.finn(pr.x, pr.y, 4, ut, 1) > 0) {
        const n = s.rutenett.finn(pr.x, pr.y, pr.sprut, ut);
        for (let j = 0; j < n; j++) hjelp(s, f[ut[j]], pr.hjelp, 'toner');
        effekt(s, 'sprut', pr.x, pr.y, 0.4, pr.sprut, pr.vinkel, pr.evo ? 1 : 0);
        ferdig = true;
      }
    } else if (!ferdig) {
      const n = s.rutenett.finn(pr.x, pr.y, 4, ut);
      for (let j = 0; j < n && !ferdig; j++) {
        const e = f[ut[j]];
        if (!nyttTreff(pr, e.uid)) continue;
        hjelp(s, e, pr.hjelp, 'passord');
        if (--pr.gjennom <= 0) ferdig = true;
      }
    }
    if (ferdig) fjernProsjektil(s, i);
  }
}

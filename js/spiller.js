// @ts-check
// Spilleren: bevegelse, energi, usårbarhet og sukkerkick.
import { CONFIG } from './config.js';
import { multTreff } from './score.js';
import { INNE } from './kart.js';
import { proevBlokk } from './vaapen.js';

/** Lager spilleren slik den er ved start av en vakt (midt i kontorlandskapet). */
export function lagSpiller() {
  const k = CONFIG.spiller;
  return {
    x: 1280, y: 760, r: k.radius,
    energi: k.startEnergi, maksEnergi: k.startEnergi,
    /** Sekunder igjen av usårbarhet etter treff. */
    usaarbar: 0,
    /** Sekunder igjen av sukkerkick. */
    kick: 0,
    /** Retningen spilleren går (eller sist gikk). Våpnene sikter hit. */
    retX: 1, retY: 0,
    beveger: false,
    iPapir: false,
    /** @type {{id:string, nivaa:number, evo:boolean, cd:number, vinkel:number}[]} */
    vaapen: [],
    /** @type {{id:string, nivaa:number}[]} */
    passiver: [],
    /** Samlede bonuser fra passive – regnes ut i oppgraderinger.js. */
    mod: { omraade: 1, hjelp: 1, ekstraProsj: 0, varighet: 1, cd: 1, fart: 1, plukk: 1, dobbel: 0, prosjFart: 1, skadeRed: 0, xp: 1 },
  };
}

/**
 * Flytter spilleren. (ix, iy) er ønsket retning fra tastatur/joystick, lengde 0–1.
 * Diagonal bevegelse normaliseres så man ikke går raskere på skrå. Ytterveggene stopper spilleren.
 */
export function oppdaterSpiller(s, dt, ix, iy) {
  const p = s.spiller;
  let l = Math.hypot(ix, iy);
  if (l > 1) {
    ix /= l;
    iy /= l;
    l = 1;
  }
  p.beveger = l > 0.05;
  if (p.beveger) {
    p.retX = ix / l;
    p.retY = iy / l;
  } else {
    ix = 0;
    iy = 0;
  }
  if (p.usaarbar > 0) p.usaarbar -= dt;
  if (p.kick > 0) p.kick -= dt;

  // Papirhauger fra printerentusiaster sinker spilleren.
  const pk = CONFIG.fiender.printer;
  p.iPapir = false;
  const hauger = s.papir;
  for (let i = hauger.n - 1; i >= 0; i--) {
    const h = hauger.items[i];
    h.liv -= dt;
    if (h.liv <= 0) {
      hauger.fjern(i);
      continue;
    }
    const dx = h.x - p.x, dy = h.y - p.y, rr = pk.papirRadius + p.r * 0.5;
    if (dx * dx + dy * dy < rr * rr) p.iPapir = true;
  }

  let fart = CONFIG.spiller.fart * p.mod.fart;
  if (p.kick > 0) fart *= 1 + CONFIG.energidrikk.kickFart;
  if (p.iPapir) fart *= 1 - pk.papirSinking;
  p.x = Math.min(INNE.x1 - p.r, Math.max(INNE.x0 + p.r, p.x + ix * fart * dt));
  p.y = Math.min(INNE.y1 - p.r, Math.max(INNE.y0 + p.r, p.y + iy * fart * dt));
}

/** En advokat berører spilleren. Gjør ingenting mens spilleren er usårbar. */
export function skadSpiller(s, mengde) {
  const p = s.spiller;
  if (p.usaarbar > 0 || mengde <= 0 || s.status !== 'spiller') return;
  p.usaarbar = CONFIG.spiller.usaarbarTid;
  // Støydempende headset: et blokkert treff koster ikke energi og påvirker ikke multiplikatoren.
  if (proevBlokk(s)) return;
  mengde *= 1 - p.mod.skadeRed;
  s.stat.treff++;
  multTreff(s);
  s.hendelser.push('treff');
  if (s.debug.udoedelig) return;
  p.energi -= mengde;
  if (p.energi <= 0) {
    p.energi = 0;
    s.status = 'ferdig';
    s.hendelser.push('ferdig');
  }
}

/** Energidrikk: fyller energi og gir sukkerkick. */
export function drikk(s) {
  const p = s.spiller;
  p.energi = Math.min(p.maksEnergi, p.energi + CONFIG.energidrikk.fyll);
  p.kick = CONFIG.energidrikk.kickTid;
  s.stat.drikker++;
  s.hendelser.push('drikk');
}

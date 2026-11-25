// @ts-check
// Ticket-lapper (poeng + erfaring) og pickups (energidrikk på kartet, Ny PC).
import { CONFIG } from './config.js';
import { giPoeng } from './score.js';
import { drikk } from './spiller.js';
import { nyPc } from './fiender.js';
import { INNE } from './kart.js';

const L = CONFIG.lapper;
const ED = CONFIG.energidrikk;

export function lagLapp() {
  return { x: 0, y: 0, verdi: 0, alder: 0, dratt: false };
}

export function lagPickup() {
  return { x: 0, y: 0, type: 'drikk', alder: 0 };
}

/** Legger en ticket-lapp der advokaten stod. */
export function leggLapp(s, x, y, verdi) {
  const l = s.lapper.ny();
  l.x = x;
  l.y = y;
  l.verdi = verdi;
  l.alder = 0;
  l.dratt = false;
  if (s.lapper.n > L.maks) slaaSammen(s);
}

/** @param {'drikk'|'pc'} type */
export function leggPickup(s, type, x, y) {
  const k = s.pickups.ny();
  k.x = Math.min(INNE.x1 - 10, Math.max(INNE.x0 + 10, x));
  k.y = Math.min(INNE.y1 - 10, Math.max(INNE.y0 + 10, y));
  k.type = type;
  k.alder = 0;
}

/** Gjenbrukt oppslag til sammenslåing (unngår nye objekter). */
const rute = new Map();

/** For mange lapper: slå sammen nærliggende lapper til én større med samlet verdi. */
function slaaSammen(s) {
  const f = s.lapper;
  let celle = L.slaaSammenCelle;
  while (f.n > L.maks * 0.75 && celle < 3000) {
    rute.clear();
    for (let i = f.n - 1; i >= 0; i--) {
      const l = f.items[i];
      const noekkel = Math.floor(l.x / celle) * 100003 + Math.floor(l.y / celle);
      const m = rute.get(noekkel);
      if (m) {
        m.verdi += l.verdi;
        m.alder = Math.min(m.alder, l.alder);
        m.dratt = m.dratt || l.dratt;
        f.fjern(i);
      } else {
        rute.set(noekkel, l);
      }
    }
    celle *= 2;
  }
  rute.clear();
}

/**
 * Energidrikk dukker opp på kartet med faste mellomrom (like for alle samme dag).
 * For hver boks trekkes alltid like mange kandidatplasser fra sin egen strøm; den første som er langt nok
 * unna spilleren og de andre boksene velges.
 */
export function oppdaterDrikker(s) {
  if (s.tid < s.nesteDrikk) return;
  s.nesteDrikk += ED.intervall;
  const rng = s.rng.drikk;
  const kx = s.drikkKand, ky = s.drikkKandY;
  for (let i = 0; i < ED.kandidater; i++) {
    kx[i] = INNE.x0 + ED.veggMarg + rng.neste() * (INNE.x1 - INNE.x0 - 2 * ED.veggMarg);
    ky[i] = INNE.y0 + ED.veggMarg + rng.neste() * (INNE.y1 - INNE.y0 - 2 * ED.veggMarg);
  }
  let antall = 0;
  for (let i = 0; i < s.pickups.n; i++) if (s.pickups.items[i].type === 'drikk') antall++;
  if (antall >= ED.maks) return;
  const p = s.spiller;
  let valgt = -1, lengst = -1, lengstI = 0;
  for (let i = 0; i < ED.kandidater; i++) {
    const d2 = (kx[i] - p.x) ** 2 + (ky[i] - p.y) ** 2;
    let naboOk = true;
    for (let j = 0; j < s.pickups.n; j++) {
      const q = s.pickups.items[j];
      if ((q.x - kx[i]) ** 2 + (q.y - ky[i]) ** 2 < 200 * 200) naboOk = false;
    }
    if (d2 >= ED.minAvstand ** 2 && naboOk) {
      valgt = i;
      break;
    }
    if (d2 > lengst) {
      lengst = d2;
      lengstI = i;
    }
  }
  if (valgt < 0) valgt = lengstI;
  leggPickup(s, 'drikk', kx[valgt], ky[valgt]);
  s.hendelser.push('drikkKom');
}

/** Lapper eldes og forsvinner, eller dras mot spilleren og plukkes opp. */
export function oppdaterLapper(s, dt) {
  const p = s.spiller;
  const f = s.lapper;
  const R = CONFIG.spiller.plukkRadius * p.mod.plukk;
  const R2 = R * R;
  for (let i = f.n - 1; i >= 0; i--) {
    const l = f.items[i];
    const dx = p.x - l.x, dy = p.y - l.y;
    const d2 = dx * dx + dy * dy;
    if (!l.dratt) {
      if (d2 < R2) {
        l.dratt = true;
      } else {
        l.alder += dt;
        if (l.alder >= L.levetid) {
          s.stat.lapperTapt++;
          f.fjern(i);
        }
        continue;
      }
    }
    const d = Math.sqrt(d2) || 1;
    const steg = CONFIG.spiller.lappFart * dt;
    if (d <= steg + p.r) {
      // Poeng gis i det lappen plukkes opp, med multiplikatoren som gjelder akkurat nå.
      giPoeng(s, l.verdi);
      s.xp += l.verdi * p.mod.xp;
      s.stat.lapperPlukket++;
      s.hendelser.push('lapp');
      f.fjern(i);
    } else {
      l.x += (dx / d) * steg;
      l.y += (dy / d) * steg;
    }
  }

  const k = s.pickups;
  for (let i = k.n - 1; i >= 0; i--) {
    const pk = k.items[i];
    pk.alder += dt;
    const dx = p.x - pk.x, dy = p.y - pk.y, rr = p.r + 10;
    if (dx * dx + dy * dy < rr * rr) {
      const type = pk.type;
      k.fjern(i);
      if (type === 'drikk') drikk(s);
      else nyPc(s);
    }
  }
}

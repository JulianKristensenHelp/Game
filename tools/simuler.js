// @ts-check
// Balansetest uten skjerm: lar enkle «roboter» spille hele runder på noen sekunder.
// Kjør:  node tools/simuler.js [dato] [maks minutter]
//   (eller på Windows uten Node:  powershell -File tools/node.ps1 tools/simuler.js)
// Robotene er ikke mennesker, men viser om kurven er omtrent riktig etter at du har endret config.js.
import { Spill } from '../js/spill.js';
import { CONFIG } from '../js/config.js';
import { Rng, mmss } from '../js/verktoy.js';
import { multiplikator } from '../js/score.js';
import { vaapenNavn, vaapenTall } from '../js/vaapen.js';
import { INNE } from '../js/kart.js';

const dato = process.argv[2] || '2026-11-25';
const maksMin = Number(process.argv[3] || 25);

/**
 * Robot som styrer unna advokater og vegger, går mot lapper og henter energidrikk ved behov.
 * @param {number} dyktighet 0–1: hvor ofte roboten «følger med» (lav = nybegynner)
 * @param {boolean} smartBygg velger kort etter en plan (ellers tilfeldig)
 * @param {string[]} [plan] våpnene den bygger mot
 */
function lagRobot(dyktighet, smartBygg, seed, plan = ['avpaa', 'mus', 'toner', 'fjern']) {
  const rng = new Rng('robot' + seed);
  let ix = 0, iy = 0, vent = 0;
  const passivPlan = plan.map((id) => CONFIG.vaapen[id].kombinasjon.passiv).concat(['ergonomisk', 'boks', 'joggesko']);
  return {
    styr(s) {
      if (--vent > 0) return [ix, iy];
      vent = dyktighet > 0.8 ? 2 : Math.round(4 + (1 - dyktighet) * 26);
      const p = s.spiller;
      let fx = 0, fy = 0, naermest = 1e9;
      const f = s.fiender;
      for (let i = 0; i < f.n; i++) {
        const e = f.items[i];
        if (!e.aktiv || e.gaar || e.type === 'hastesak') continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.max(1, Math.hypot(dx, dy) - e.r - p.r);
        if (d > 150) continue;
        if (d < naermest) naermest = d;
        const v = 1 / (d * d);
        fx += (dx / (d + 1)) * v;
        fy += (dy / (d + 1)) * v;
      }
      // E-poster skal unngås
      for (let i = 0; i < s.fiendeSkudd.n; i++) {
        const q = s.fiendeSkudd.items[i];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.max(1, Math.hypot(dx, dy) - p.r);
        if (d > 70) continue;
        if (d < naermest) naermest = d;
        const v = 1.5 / (d * d);
        fx += (dx / (d + 1)) * v;
        fy += (dy / (d + 1)) * v;
      }
      // Vegger skyver også (ellers blir roboten fanget i et hjørne).
      const vm = 70;
      const vv = 1 / (vm * vm);
      if (p.x - INNE.x0 < vm) fx += vv * (1 - (p.x - INNE.x0) / vm) * 4;
      if (INNE.x1 - p.x < vm) fx -= vv * (1 - (INNE.x1 - p.x) / vm) * 4;
      if (p.y - INNE.y0 < vm) fy += vv * (1 - (p.y - INNE.y0) / vm) * 4;
      if (INNE.y1 - p.y < vm) fy -= vv * (1 - (INNE.y1 - p.y) / vm) * 4;
      // Mål: energidrikk hvis lite energi, ellers lapper og pickups.
      let tx = 0, ty = 0, best = 1e9;
      const trengerDrikk = p.energi < p.maksEnergi * (dyktighet > 0.8 ? 0.7 : 0.5);
      for (let i = 0; i < s.pickups.n; i++) {
        const k = s.pickups.items[i];
        const d = Math.hypot(k.x - p.x, k.y - p.y) * (k.type === 'drikk' ? (trengerDrikk ? 0.05 : 2) : 0.3);
        if (d < best) { best = d; tx = k.x - p.x; ty = k.y - p.y; }
      }
      const l = s.lapper;
      for (let i = 0; i < l.n; i++) {
        const d = Math.hypot(l.items[i].x - p.x, l.items[i].y - p.y) / Math.sqrt(l.items[i].verdi / 10);
        if (d < best) { best = d; tx = l.items[i].x - p.x; ty = l.items[i].y - p.y; }
      }
      if (best === 1e9) { tx = 1280 - p.x; ty = 740 - p.y; }
      // Som et menneske: når det er trygt, gå mot nærmeste advokat, så våpen som peker fram (toner, kabel,
      // stråle) og musebanen faktisk treffer. Mest når det ikke ligger lapper rett i nærheten.
      // Ønsket avstand: rekkevidden til de korteste våpnene roboten har (puls, kabel, mus), ellers ca. 110 px.
      let onsket = 110;
      for (const w of s.spiller.vaapen) {
        const t = vaapenTall(w);
        if (w.id === 'avpaa') onsket = Math.min(onsket, t.radius * s.spiller.mod.omraade);
        else if (w.id === 'hdmi') onsket = Math.min(onsket, t.lengde * s.spiller.mod.omraade);
        else if (w.id === 'mus' || (w.id === 'ctrlz' && w.evo)) onsket = Math.min(onsket, (t.bane ?? t.radius) * s.spiller.mod.omraade);
      }
      if (naermest > onsket * 0.9 + 8 && naermest < 220) {
        let ex = 0, ey = 0, ed = 1e9;
        for (let i = 0; i < f.n; i++) {
          const e = f.items[i];
          if (!e.aktiv || e.gaar || e.type === 'hastesak') continue;
          const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
          if (d < ed) { ed = d; ex = e.x - p.x; ey = e.y - p.y; }
        }
        const el = Math.hypot(ex, ey) || 1, tl0 = Math.hypot(tx, ty) || 1;
        const vekt = best < 40 ? 0.2 : 0.5;
        tx = (tx / tl0) * (1 - vekt) + (ex / el) * vekt;
        ty = (ty / tl0) * (1 - vekt) + (ey / el) * vekt;
      }
      const tl = Math.hypot(tx, ty) || 1;
      const fl = Math.hypot(fx, fy) || 1;
      const m = (dyktighet > 0.8 ? 0.45 : 1) * Math.min(1, onsket / 80);
      const frykt = naermest < 20 * m ? 1 : naermest < 55 * m ? 0.75 : naermest < 100 * m ? 0.35 : 0.08;
      ix = (fx / fl) * frykt + (tx / tl) * (1 - frykt);
      iy = (fy / fl) * frykt + (ty / tl) * (1 - frykt);
      if (rng.neste() > dyktighet) {
        const a = rng.neste() * 6.283;
        ix = Math.cos(a); iy = Math.sin(a);
      }
      return [ix, iy];
    },
    velg(s) {
      const kort = s.kort;
      if (!smartBygg) return rng.heltall(kort.length);
      let best = 0, bestV = -1;
      kort.forEach((k, i) => {
        let v = 1;
        if (k.slag === 'kombinasjon') v = 100;
        else if (k.slag === 'vaapen') v = plan.includes(k.id) ? 50 - plan.indexOf(k.id) + (s.spiller.vaapen.some((w) => w.id === k.id) ? 5 : 0) : 2;
        else if (k.slag === 'passiv') v = passivPlan.includes(k.id) ? 40 - passivPlan.indexOf(k.id) : 3;
        if (v > bestV) { bestV = v; best = i; }
      });
      return best;
    },
  };
}

/** Planene robotene bygger mot, én per karakter (startvåpenet først). */
const PLANER = [['avpaa', 'mus', 'toner', 'fjern'], ['toner', 'avpaa', 'hdmi', 'fjern'], ['hdmi', 'avpaa', 'mus', 'teams'], ['mus', 'avpaa', 'ctrlz', 'straale']];

function spillRunde(navn, dyktighet, smart, seed, logg = false, plan = undefined, annetUtseende = false, karakter = seed % 4) {
  const s = new Spill(dato, karakter);
  if (!plan) plan = PLANER[karakter];
  // Test: et helt annet utseende på advokatene skal gi nøyaktig samme runde.
  if (annetUtseende) s.rng.utseende = new Rng('noe helt annet');
  const robot = lagRobot(dyktighet, smart, seed, plan);
  const maksTikk = maksMin * 60 * CONFIG.tikkPerSekund;
  let maksFiender = 0, forsteEvo = 0;
  const start = Date.now();
  for (let t = 0; t < maksTikk && s.status !== 'ferdig'; t++) {
    const [ix, iy] = robot.styr(s);
    s.tikk(ix, iy);
    s.hendelser.length = 0;
    if (s.status === 'nivaaopp') s.velgKort(robot.velg(s));
    if (!forsteEvo && s.stat.kombinasjoner.length) forsteEvo = s.tid;
    if (s.fiender.n > maksFiender) maksFiender = s.fiender.n;
    if (logg && t > 0 && t % (120 * CONFIG.tikkPerSekund) === 0) {
      console.log(`     ${mmss(s.tid)}: nivå ${s.nivaa}, score ${s.score}, fiender ${s.fiender.n}, energi ${Math.round(s.spiller.energi)}/${s.spiller.maksEnergi}, treff ${s.stat.treff}, drikker ${s.stat.drikker}, spart ${s.spart}`);
    }
  }
  const bygg = s.spiller.vaapen.map((w) => `${vaapenNavn(w)}${w.evo ? '' : ' ' + w.nivaa}`).join(', ');
  console.log(
    `${navn.padEnd(24)} tid ${mmss(s.tid)}${s.status === 'ferdig' ? ' ' : '+'} | score ${String(s.score).padStart(8)} | nivå ${String(s.nivaa).padStart(3)} | hjulpne ${String(s.hjulpne).padStart(5)} | ` +
    `maks x${(CONFIG.multiplikator.start + s.stat.maksMultSteg * CONFIG.multiplikator.steg).toFixed(1)} | treff ${s.stat.treff} | drikker ${s.stat.drikker} | bosser ${s.stat.bosserHjulpet}/${s.stat.bosserTotalt} | første komb. ${forsteEvo ? mmss(forsteEvo) : '-'} | maks fiender ${maksFiender} | ${Date.now() - start} ms`
  );
  console.log(`   bygg: ${bygg}`);
  return s;
}

console.log(`Dagens vakt: ${dato} (maks ${maksMin} min)\n`);
spillRunde('Står helt stille', 0, false, 0);
for (let i = 1; i <= 3; i++) spillRunde('Nybegynner ' + i, 0.45, false, i);
for (let i = 1; i <= 3; i++) spillRunde('Gjennomsnittlig ' + i, 0.7, false, 10 + i);
for (let i = 1; i <= 3; i++) spillRunde('God, tilfeldig bygg ' + i, 0.95, false, 40 + i);
for (let i = 1; i <= 4; i++) spillRunde('God, planlagt bygg ' + i, 0.9, true, 20 + i);
for (let k = 0; k < 4; k++) spillRunde('Ekspert, karakter ' + (k + 1), 1, true, 31 + k, false, undefined, false, k);
const a = spillRunde('Ekspert', 1, true, 30, true, undefined, false, 0);
const b = spillRunde('Ekspert (på nytt)', 1, true, 30, false, undefined, false, 0);
const c = spillRunde('Ekspert (annet utseende)', 1, true, 30, false, undefined, true, 0);
console.log(`\nDeterministisk: ${a.score === b.score && a.tid === b.tid ? 'JA – to like runder ga nøyaktig samme resultat' : 'NEI – noe bruker ukontrollert tilfeldighet!'}`);
// «Dobbel skjerm» er tilfeldig: samme valg skal likevel gi samme runde (egen strøm i Dagens vakt).
const plan = ['teams', 'ctrlz', 'straale', 'avpaa'];
const d1 = spillRunde('Med Dobbel skjerm', 1, true, 50, false, plan, false, 2);
const d2 = spillRunde('Med Dobbel skjerm (på nytt)', 1, true, 50, false, plan, false, 2);
const harDobbel = d1.spiller.passiver.some((p) => p.id === 'dobbelSkjerm');
console.log(`Dobbel skjerm deterministisk: ${d1.score === d2.score && d1.tid === d2.tid ? 'JA' : 'NEI'} (passiven ble ${harDobbel ? '' : 'ikke '}valgt i runden)`);
console.log(`Utseendet påvirker ikke spillet: ${a.score === c.score && a.tid === c.tid && a.hjulpne === c.hjulpne ? 'JA – annet utseende ga nøyaktig samme runde' : 'NEI – utseendet lekker inn i spillogikken!'}`);
void multiplikator;

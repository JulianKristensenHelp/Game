// @ts-check
// Headless balance test: lets simple "bots" play whole rounds in a few seconds.
// Run:  node tools/simulate.js [date] [max minutes]
//   (or on Windows without Node:  powershell -File tools/node.ps1 tools/simulate.js)
// The bots are not humans, but they show whether the curve is roughly right after you have changed config.js.
import { Game } from '../js/game.js';
import { CONFIG } from '../js/config.js';
import { Rng, mmss } from '../js/utils.js';
import { multiplier } from '../js/score.js';
import { weaponName, weaponStats } from '../js/weapons.js';
import { INSIDE } from '../js/map.js';

const date = process.argv[2] || '2026-11-25';
const maxMin = Number(process.argv[3] || 25);

/**
 * Bot that steers away from lawyers and walls, walks toward tickets and fetches an energy drink when needed.
 * @param {number} skill 0–1: how often the bot "pays attention" (low = beginner)
 * @param {boolean} smartBuild picks cards according to a plan (otherwise random)
 * @param {string[]} [plan] the weapons it builds toward
 */
function makeRobot(skill, smartBuild, seed, plan = ['powerCycle', 'mouse', 'toner', 'remote']) {
  const rng = new Rng('robot' + seed);
  let ix = 0, iy = 0, wait = 0;
  const passivePlan = plan.map((id) => CONFIG.weapons[id].combination.passive).concat(['ergonomicChair', 'biggerCan', 'sneakers']);
  return {
    steer(s) {
      if (--wait > 0) return [ix, iy];
      wait = skill > 0.8 ? 2 : Math.round(4 + (1 - skill) * 26);
      const p = s.player;
      let fx = 0, fy = 0, nearest = 1e9;
      const f = s.enemies;
      for (let i = 0; i < f.n; i++) {
        const e = f.items[i];
        if (!e.active || e.leaving || e.type === 'urgent') continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.max(1, Math.hypot(dx, dy) - e.r - p.r);
        if (d > 150) continue;
        if (d < nearest) nearest = d;
        const v = 1 / (d * d);
        fx += (dx / (d + 1)) * v;
        fy += (dy / (d + 1)) * v;
      }
      // Emails should be avoided
      for (let i = 0; i < s.enemyShots.n; i++) {
        const q = s.enemyShots.items[i];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.max(1, Math.hypot(dx, dy) - p.r);
        if (d > 70) continue;
        if (d < nearest) nearest = d;
        const v = 1.5 / (d * d);
        fx += (dx / (d + 1)) * v;
        fy += (dy / (d + 1)) * v;
      }
      // Walls push too (otherwise the bot gets stuck in a corner).
      const vm = 70;
      const vv = 1 / (vm * vm);
      if (p.x - INSIDE.x0 < vm) fx += vv * (1 - (p.x - INSIDE.x0) / vm) * 4;
      if (INSIDE.x1 - p.x < vm) fx -= vv * (1 - (INSIDE.x1 - p.x) / vm) * 4;
      if (p.y - INSIDE.y0 < vm) fy += vv * (1 - (p.y - INSIDE.y0) / vm) * 4;
      if (INSIDE.y1 - p.y < vm) fy -= vv * (1 - (INSIDE.y1 - p.y) / vm) * 4;
      // Goal: energy drink if low on energy, otherwise tickets and pickups.
      let tx = 0, ty = 0, best = 1e9;
      const needsDrink = p.energy < p.maxEnergy * (skill > 0.8 ? 0.7 : 0.5);
      for (let i = 0; i < s.pickups.n; i++) {
        const k = s.pickups.items[i];
        const d = Math.hypot(k.x - p.x, k.y - p.y) * (k.type === 'drink' ? (needsDrink ? 0.05 : 2) : 0.3);
        if (d < best) { best = d; tx = k.x - p.x; ty = k.y - p.y; }
      }
      const l = s.tickets;
      for (let i = 0; i < l.n; i++) {
        const d = Math.hypot(l.items[i].x - p.x, l.items[i].y - p.y) / Math.sqrt(l.items[i].value / 10);
        if (d < best) { best = d; tx = l.items[i].x - p.x; ty = l.items[i].y - p.y; }
      }
      if (best === 1e9) { tx = 1280 - p.x; ty = 740 - p.y; }
      // Like a human: when it is safe, walk toward the nearest lawyer, so that forward-pointing weapons (toner, cable,
      // beam) and the mouse orbit actually hit. Mostly when there are no tickets right nearby.
      // Desired distance: the range of the shortest weapons the bot has (pulse, cable, mouse), otherwise about 110 px.
      let wanted = 110;
      for (const w of s.player.weapons) {
        const t = weaponStats(w);
        if (w.id === 'powerCycle') wanted = Math.min(wanted, t.radius * s.player.mod.area);
        else if (w.id === 'hdmi') wanted = Math.min(wanted, t.lengthPx * s.player.mod.area);
        else if (w.id === 'mouse' || (w.id === 'ctrlz' && w.evo)) wanted = Math.min(wanted, (t.track ?? t.radius) * s.player.mod.area);
      }
      if (nearest > wanted * 0.9 + 8 && nearest < 220) {
        let ex = 0, ey = 0, ed = 1e9;
        for (let i = 0; i < f.n; i++) {
          const e = f.items[i];
          if (!e.active || e.leaving || e.type === 'urgent') continue;
          const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
          if (d < ed) { ed = d; ex = e.x - p.x; ey = e.y - p.y; }
        }
        const el = Math.hypot(ex, ey) || 1, tl0 = Math.hypot(tx, ty) || 1;
        const weight = best < 40 ? 0.2 : 0.5;
        tx = (tx / tl0) * (1 - weight) + (ex / el) * weight;
        ty = (ty / tl0) * (1 - weight) + (ey / el) * weight;
      }
      const tl = Math.hypot(tx, ty) || 1;
      const fl = Math.hypot(fx, fy) || 1;
      const m = (skill > 0.8 ? 0.45 : 1) * Math.min(1, wanted / 80);
      const fear = nearest < 20 * m ? 1 : nearest < 55 * m ? 0.75 : nearest < 100 * m ? 0.35 : 0.08;
      ix = (fx / fl) * fear + (tx / tl) * (1 - fear);
      iy = (fy / fl) * fear + (ty / tl) * (1 - fear);
      if (rng.next() > skill) {
        const a = rng.next() * 6.283;
        ix = Math.cos(a); iy = Math.sin(a);
      }
      return [ix, iy];
    },
    choose(s) {
      const cards = s.cards;
      if (!smartBuild) return rng.integer(cards.length);
      let best = 0, bestV = -1;
      cards.forEach((k, i) => {
        let v = 1;
        if (k.kind === 'combination') v = 100;
        else if (k.kind === 'weapon') v = plan.includes(k.id) ? 50 - plan.indexOf(k.id) + (s.player.weapons.some((w) => w.id === k.id) ? 5 : 0) : 2;
        else if (k.kind === 'passive') v = passivePlan.includes(k.id) ? 40 - passivePlan.indexOf(k.id) : 3;
        if (v > bestV) { bestV = v; best = i; }
      });
      return best;
    },
  };
}

/** The plans the bots build toward, one per character (starting weapon first). */
const PLANS = [['powerCycle', 'mouse', 'toner', 'remote'], ['toner', 'powerCycle', 'hdmi', 'remote'], ['hdmi', 'powerCycle', 'mouse', 'teams'], ['mouse', 'powerCycle', 'ctrlz', 'beam']];

function playRound(name, skill, smart, seed, log = false, plan = undefined, otherLooks = false, character = seed % 4) {
  const s = new Game(date, character);
  if (!plan) plan = PLANS[character];
  // Test: a completely different look for the lawyers must give exactly the same round.
  if (otherLooks) s.rng.looks = new Rng('noe helt annet');
  const robot = makeRobot(skill, smart, seed, plan);
  const maxTicks = maxMin * 60 * CONFIG.ticksPerSecond;
  let maxEnemies = 0, firstEvo = 0;
  const start = Date.now();
  for (let t = 0; t < maxTicks && s.status !== 'done'; t++) {
    const [ix, iy] = robot.steer(s);
    s.tick(ix, iy);
    s.events.length = 0;
    if (s.status === 'levelUp') s.chooseCard(robot.choose(s));
    if (!firstEvo && s.stat.combinations.length) firstEvo = s.time;
    if (s.enemies.n > maxEnemies) maxEnemies = s.enemies.n;
    if (log && t > 0 && t % (120 * CONFIG.ticksPerSecond) === 0) {
      console.log(`     ${mmss(s.time)}: nivå ${s.level}, score ${s.score}, fiender ${s.enemies.n}, energi ${Math.round(s.player.energy)}/${s.player.maxEnergy}, treff ${s.stat.hits}, drikker ${s.stat.drinks}, spart ${s.spared}`);
    }
  }
  const build = s.player.weapons.map((w) => `${weaponName(w)}${w.evo ? '' : ' ' + w.level}`).join(', ');
  console.log(
    `${name.padEnd(24)} tid ${mmss(s.time)}${s.status === 'done' ? ' ' : '+'} | score ${String(s.score).padStart(8)} | nivå ${String(s.level).padStart(3)} | hjulpne ${String(s.helped).padStart(5)} | ` +
    `maks x${(CONFIG.multiplier.start + s.stat.maxMultStep * CONFIG.multiplier.step).toFixed(1)} | treff ${s.stat.hits} | drikker ${s.stat.drinks} | bosser ${s.stat.bossesHelped}/${s.stat.bossesTotal} | første komb. ${firstEvo ? mmss(firstEvo) : '-'} | maks fiender ${maxEnemies} | ${Date.now() - start} ms`
  );
  console.log(`   bygg: ${build}`);
  return s;
}

console.log(`Dagens vakt: ${date} (maks ${maxMin} min)\n`);
playRound('Står helt stille', 0, false, 0);
for (let i = 1; i <= 3; i++) playRound('Nybegynner ' + i, 0.45, false, i);
for (let i = 1; i <= 3; i++) playRound('Gjennomsnittlig ' + i, 0.7, false, 10 + i);
for (let i = 1; i <= 3; i++) playRound('God, tilfeldig bygg ' + i, 0.95, false, 40 + i);
for (let i = 1; i <= 4; i++) playRound('God, planlagt bygg ' + i, 0.9, true, 20 + i);
for (let k = 0; k < 4; k++) playRound('Ekspert, karakter ' + (k + 1), 1, true, 31 + k, false, undefined, false, k);
const a = playRound('Ekspert', 1, true, 30, true, undefined, false, 0);
const b = playRound('Ekspert (på nytt)', 1, true, 30, false, undefined, false, 0);
const c = playRound('Ekspert (annet utseende)', 1, true, 30, false, undefined, true, 0);
console.log(`\nDeterministisk: ${a.score === b.score && a.time === b.time ? 'JA – to like runder ga nøyaktig samme resultat' : 'NEI – noe bruker ukontrollert tilfeldighet!'}`);
// «Dobbel skjerm» ("Dual monitor") is random: the same choices must still give the same round (own stream in «Dagens vakt», today's shift).
const plan = ['teams', 'ctrlz', 'beam', 'powerCycle'];
const d1 = playRound('Med Dobbel skjerm', 1, true, 50, false, plan, false, 2);
const d2 = playRound('Med Dobbel skjerm (på nytt)', 1, true, 50, false, plan, false, 2);
const hasDual = d1.player.passives.some((p) => p.id === 'dualMonitor');
console.log(`Dobbel skjerm deterministisk: ${d1.score === d2.score && d1.time === d2.time ? 'JA' : 'NEI'} (passiven ble ${hasDual ? '' : 'ikke '}valgt i runden)`);
console.log(`Utseendet påvirker ikke spillet: ${a.score === c.score && a.time === c.time && a.helped === c.helped ? 'JA – annet utseende ga nøyaktig samme runde' : 'NEI – utseendet lekker inn i spillogikken!'}`);
void multiplier;

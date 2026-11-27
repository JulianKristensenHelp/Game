// @ts-check
// Measures how much help per second each weapon gives at max level (9) and as its combination (level 10), under
// equal conditions, plus The Matrix.
// Run:  node tools/measure-weapons.js [weapons,…]   (or: powershell -File tools/node.ps1 tools/measure-weapons.js)
//
// Setup: the player walks through the open office in a big, slow loop. 150 "dummy" lawyers with infinite
// frustration are spread evenly 40–300 pixels around the player (those that end up too close or too far away are moved).
// Level 9 = the weapon with its 8 cards spread evenly over its growth rules (help, interval, count …), no effects.
// Level 10 = its combination (Endringsprompt 6: the combination is final, it takes no more cards).
// The same numbers are also shown in debug mode in the game (help per second per weapon, last 10 seconds).
import { Game } from '../js/game.js';
import { CONFIG } from '../js/config.js';
import { Rng } from '../js/utils.js';
import { spawnEnemy } from '../js/enemies.js';
import { giveWeapon, givePassive, giveCombination, giveEvenUpgrades, giveMatrix } from '../js/upgrades.js';

const SEC = 60;

/** @param {string} id @param {'max'|'evo'|'matrix'} what */
function target(id, what) {
  const s = new Game('2026-11-25');
  s.debug.immortal = true;
  s.time = 600;
  s.nextBoss = s.nextUrgent = s.nextWave = s.nextDrink = s.nextRareCheck = 1e9;
  s.eventTimes.fill(1e9);
  s.nextCloud = s.capture.next = 1e9;
  // No level-ups during the measurement (the build must stay exactly as set up)
  s.xpNeeded = 1e12;
  s.player.weapons.length = 0;
  if (what === 'matrix') {
    // The Matrix: Skytsengelen and Livvakten at level 9 and Shopkeeperen, merged (it takes no cards either)
    for (const w of ['angel', 'bodyguard']) {
      giveWeapon(s, w);
      giveEvenUpgrades(s, w, CONFIG.upgrades.combinationAfter);
    }
    givePassive(s, 'certification');
    giveMatrix(s);
  } else {
    giveWeapon(s, id);
    giveEvenUpgrades(s, id, CONFIG.upgrades.combinationAfter);
  }
  if (what === 'evo') {
    givePassive(s, CONFIG.weapons[id].combination.passive);
    giveCombination(s, id);
  }
  const rng = new Rng('maal');
  const p = s.player;
  const place = () => {
    const a = rng.next() * Math.PI * 2, d = 40 + rng.next() * 260;
    return [p.x + Math.cos(a) * d, p.y + Math.sin(a) * d];
  };
  for (let i = 0; i < 150; i++) {
    const [x, y] = place();
    const e = spawnEnemy(s, 'junior', x, y);
    e.hp = e.maxHp = 1e9;
    e.speed = 0;
    e.damage = 0;
  }
  // No new lawyers from the director during the measurement
  s.spawnAcc = -1e9;
  for (let t = 0; t < SEC * 60; t++) {
    const a = t / 300;
    s.tick(Math.cos(a), Math.sin(a * 2) * 0.8);
    s.events.length = 0;
    for (let i = 0; i < s.enemies.n; i++) {
      const e = s.enemies.items[i];
      const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d2 < 15 * 15 || d2 > 320 * 320) {
        const [x, y] = place();
        e.x = x;
        e.y = y;
      }
    }
  }
  const total = Object.values(s.stat.helpPerWeapon).reduce((a, b) => a + b, 0);
  return { hps: total / SEC, block: s.stat.blocked };
}

const rows = [];
const only = process.argv[2];
for (const id of Object.keys(CONFIG.weapons)) {
  if (only && !only.split(',').includes(id)) continue;
  const def = /** @type {any} */ (CONFIG.weapons[id]);
  if (def.hidden) continue;
  rows.push({ id, name: def.name, max: target(id, 'max').hps, evoName: def.combination.name, evo: target(id, 'evo').hps });
}
if (!only || only.includes('matrix')) rows.push({ id: 'matrix', name: '(Engel + Livvakt)', max: 0, evoName: 'The Matrix', evo: target('angel', 'matrix').hps });
// The average is over the regular weapons and combinations (not the defensive headset, and not The Matrix, which is
// two weapons in one slot and is shown against the same average)
const counted = rows.filter((r) => r.id !== 'headset' && r.id !== 'matrix');
const avgMax = counted.reduce((a, r) => a + r.max, 0) / Math.max(1, counted.length);
const avgEvo = counted.reduce((a, r) => a + r.evo, 0) / Math.max(1, counted.length);
console.log('Hjelp per sekund (60 s, 150 advokater jevnt spredt 40–300 px rundt spilleren):\n');
console.log('Våpen'.padEnd(22) + 'Nivå 9'.padStart(8) + '  snitt'.padStart(7) + '   ' + 'Kombinasjon (nivå 10)'.padEnd(30) + 'Hjelp/s'.padStart(9) + '  i forhold til snitt');
for (const r of rows) {
  const tail = r.id === 'headset' ? '(forsvar – blokkerer treff)' : ((r.evo / avgEvo) * 100).toFixed(0) + ' %';
  const maxRel = r.id === 'headset' ? '' : ((r.max / avgMax) * 100).toFixed(0) + ' %';
  console.log(r.name.padEnd(22) + r.max.toFixed(0).padStart(8) + maxRel.padStart(7) + '   ' + r.evoName.padEnd(30) + r.evo.toFixed(0).padStart(9) + '  ' + tail);
}

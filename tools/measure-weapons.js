// @ts-check
// Measures how much help per second each weapon gives at max level and as a combination, under equal conditions.
// Run:  node tools/measure-weapons.js   (or: powershell -File tools/node.ps1 tools/measure-weapons.js)
//
// Setup: the player walks through the open office in a big, slow loop. 150 "dummy" lawyers with infinite
// frustration are spread evenly 40–300 pixels around the player (those that end up too close or too far away are moved).
// The combination is measured with its matching passive at level 1 (the minimum needed to unlock it).
// The same numbers are also shown in debug mode in the game (help per second per weapon, last 10 seconds).
import { Game } from '../js/game.js';
import { CONFIG } from '../js/config.js';
import { Rng } from '../js/utils.js';
import { spawnEnemy } from '../js/enemies.js';
import { giveWeapon, givePassive, giveCombination } from '../js/upgrades.js';

const SEC = 60;

function target(id, evo) {
  const s = new Game('2026-11-25');
  s.debug.immortal = true;
  s.time = 600;
  s.nextBoss = s.nextUrgent = s.nextWave = s.nextDrink = 1e9;
  s.player.weapons.length = 0;
  for (let i = 0; i < CONFIG.limits.weaponLevel; i++) giveWeapon(s, id);
  if (evo) {
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
for (const id of Object.keys(CONFIG.weapons)) {
  const n8 = target(id, false), evo = target(id, true);
  rows.push({ id, name: CONFIG.weapons[id].name, n8: n8.hps, evoName: CONFIG.weapons[id].combination.name, evo: evo.hps });
}
const avgEvo = rows.filter((r) => r.id !== 'headset').reduce((a, r) => a + r.evo, 0) / (rows.length - 1);
console.log('Hjelp per sekund (60 s, 150 advokater jevnt spredt 40–300 px rundt spilleren):\n');
console.log('Våpen'.padEnd(22) + ('Nivå ' + CONFIG.limits.weaponLevel).padStart(9) + '   ' + 'Kombinasjon'.padEnd(30) + 'Hjelp/s'.padStart(9) + '  i forhold til snitt');
for (const r of rows) {
  console.log(r.name.padEnd(22) + r.n8.toFixed(0).padStart(9) + '   ' + r.evoName.padEnd(30) + r.evo.toFixed(0).padStart(9) + '  ' + (r.id === 'headset' ? '(forsvar – blokkerer treff)' : ((r.evo / avgEvo) * 100).toFixed(0) + ' %'));
}

// @ts-check
// The player: movement, energy, invulnerability and sugar kick.
import { CONFIG } from './config.js';
import { multHits } from './score.js';
import { INSIDE } from './map.js';
import { tryBlock } from './weapons.js';
import { effect } from './effects.js';

/** Makes the player as it is at the start of a shift (in the middle of the open-plan office). */
export function makePlayer() {
  const k = CONFIG.player;
  return {
    x: 1280, y: 760, r: k.radius,
    energy: k.startEnergy, maxEnergy: k.startEnergy,
    /** Seconds left of invulnerability after a hit. */
    invulnerable: 0,
    /** Seconds left of sugar kick. */
    kick: 0,
    /** The direction the player walks (or last walked). Weapons aim here. */
    dirX: 1, dirY: 0,
    moving: false,
    inPaper: false,
    /** Ink puddle from the printer boss (slows down). */
    inInk: false,
    /** Hold music from the Nørdic consultant: seconds left of slowdown, and how much (0.4 = 40 %). */
    slow: 0, slowBy: 0,
    /** Fiske-Frida's hook: seconds left of being pulled toward her, and the pull velocity. */
    pullT: 0, pullVx: 0, pullVy: 0,
    /** @type {any[]} the weapons (see giveWeapon() in upgrades.js: id, picks, up, fx, stats, evo …) */
    weapons: [],
    /** @type {{id:string, level:number}[]} */
    passives: [],
    /** Total bonuses from passives – computed in upgrades.js. All of them are shown on the stat sheet at level-up. */
    mod: {
      area: 1, help: 1, extraProj: 0, duration: 1, cd: 1, speed: 1, pick: 1, dual: 0, projSpeed: 1, damageRed: 0, xp: 1,
      /** Version 5: critical chance and multiplier, energy regeneration per second, dodge chance. */
      crit: 0, critMult: CONFIG.critMult, regen: 0, dodge: 0,
      /** Version 6: luck («Hesteskoen»: rarer cards), chance of a fourth card, and help per weapon class (tag passives). */
      luck: 0, fourthCard: 0, tag: { projectile: 1, chain: 1, area: 1, helper: 1 },
      /** Version 6.1 items: revives per shift, energy per helped lawyer, extra ticket seconds, points factor, drink bonus, slow resistance. */
      revives: 0, lifesteal: 0, ticketLife: 0, points: 1, drinkFill: 0, kickTime: 0, slowRes: 0,
    },
    /** «Sikkerhetskopi»: how many lethal hits have been survived this shift. */
    revivesUsed: 0,
  };
}

/**
 * Moves the player. (ix, iy) is the desired direction from keyboard/joystick, length 0–1.
 * Diagonal movement is normalized so you don't move faster diagonally. The outer walls stop the player.
 */
export function updatePlayer(s, dt, ix, iy) {
  const p = s.player;
  let l = Math.hypot(ix, iy);
  if (l > 1) {
    ix /= l;
    iy /= l;
    l = 1;
  }
  p.moving = l > 0.05;
  if (p.moving) {
    p.dirX = ix / l;
    p.dirY = iy / l;
  } else {
    ix = 0;
    iy = 0;
  }
  if (p.invulnerable > 0) p.invulnerable -= dt;
  if (p.kick > 0) p.kick -= dt;
  // «Hev-senk-pult»: energy regeneration
  if (p.mod.regen > 0 && p.energy < p.maxEnergy) p.energy = Math.min(p.maxEnergy, p.energy + p.mod.regen * dt);

  // Piles of paper from printer enthusiasts slow the player down.
  const pk = CONFIG.enemies.printer;
  p.inPaper = false;
  const piles = s.paper;
  for (let i = piles.n - 1; i >= 0; i--) {
    const h = piles.items[i];
    h.life -= dt;
    if (h.life <= 0) {
      piles.removeAt(i);
      continue;
    }
    const dx = h.x - p.x, dy = h.y - p.y, rr = pk.paperRadius + p.r * 0.5;
    if (dx * dx + dy * dy < rr * rr) p.inPaper = true;
  }

  // Ink puddles from the printer boss's cartridges slow the player down too.
  const ink = CONFIG.bosses.printerBoss.cmyk;
  p.inInk = false;
  for (let i = 0; i < s.puddles.n; i++) {
    const h = s.puddles.items[i];
    const dx = h.x - p.x, dy = h.y - p.y, rr = ink.puddleRadius + p.r * 0.5;
    if (dx * dx + dy * dy < rr * rr) p.inInk = true;
  }
  if (p.slow > 0) p.slow -= dt;

  let speed = CONFIG.player.speed * p.mod.speed;
  if (p.kick > 0) speed *= 1 + CONFIG.energyDrink.kickSpeed;
  // «Vaktmester»: less slowdown from paper piles, ink and hold music
  const res = 1 - p.mod.slowRes;
  if (p.inPaper) speed *= 1 - pk.paperSlow * res;
  if (p.inInk) speed *= 1 - ink.puddleSlow * res;
  if (p.slow > 0) speed *= 1 - p.slowBy * res;
  let px = p.x + ix * speed * dt, py = p.y + iy * speed * dt;
  // Fiske-Frida's hook pulls the player a short way toward her
  if (p.pullT > 0) {
    p.pullT -= dt;
    px += p.pullVx * dt;
    py += p.pullVy * dt;
  }
  p.x = Math.min(INSIDE.x1 - p.r, Math.max(INSIDE.x0 + p.r, px));
  p.y = Math.min(INSIDE.y1 - p.r, Math.max(INSIDE.y0 + p.r, py));
}

/** A lawyer touches the player. Does nothing while the player is invulnerable. */
export function damagePlayer(s, amount) {
  const p = s.player;
  if (p.invulnerable > 0 || amount <= 0 || s.status !== 'running') return;
  p.invulnerable = CONFIG.player.invulnerableTime;
  // Noise-cancelling headset: a blocked hit costs no energy and does not affect the multiplier.
  if (tryBlock(s)) return;
  // «Brannmur»: the hit misses completely (own random stream, same for everyone on the same day).
  if (p.mod.dodge > 0 && s.rng.luck.next() < p.mod.dodge) {
    s.stat.dodged++;
    effect(s, 'text', p.x, p.y - 26, 0.8, 0, 0, 0, false, 'Unngikk!');
    s.events.push('dodge');
    return;
  }
  amount *= 1 - p.mod.damageRed;
  s.stat.hits++;
  multHits(s);
  s.events.push('hit');
  if (s.debug.immortal) return;
  p.energy -= amount;
  if (p.energy <= 0) {
    // «Sikkerhetskopi»: a lethal hit is survived (once per level of the passive), with half the energy back
    if (p.revivesUsed < p.mod.revives) {
      const B = CONFIG.itemPassives.backup;
      p.revivesUsed++;
      s.stat.revives++;
      p.energy = Math.max(1, Math.round(p.maxEnergy * B.restore));
      p.invulnerable = B.grace;
      effect(s, 'text', p.x, p.y - 30, 1.4, 0, 0, 0, false, 'Sikkerhetskopi!');
      s.events.push('revive');
      return;
    }
    p.energy = 0;
    s.status = 'done';
    s.events.push('done');
  }
}

/** Energy drink: refills energy and gives a sugar kick. */
export function drink(s) {
  const p = s.player;
  p.energy = Math.min(p.maxEnergy, p.energy + CONFIG.energyDrink.fill + p.mod.drinkFill);
  p.kick = CONFIG.energyDrink.kickTime + p.mod.kickTime;
  s.stat.drinks++;
  s.events.push('drink');
}

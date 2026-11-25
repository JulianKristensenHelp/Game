// @ts-check
// The player: movement, energy, invulnerability and sugar kick.
import { CONFIG } from './config.js';
import { multHits } from './score.js';
import { INSIDE } from './map.js';
import { tryBlock } from './weapons.js';

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
    /** @type {{id:string, level:number, evo:boolean, cd:number, angle:number}[]} */
    weapons: [],
    /** @type {{id:string, level:number}[]} */
    passives: [],
    /** Total bonuses from passives – computed in upgrades.js. */
    mod: { area: 1, help: 1, extraProj: 0, duration: 1, cd: 1, speed: 1, pick: 1, dual: 0, projSpeed: 1, damageRed: 0, xp: 1 },
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

  let speed = CONFIG.player.speed * p.mod.speed;
  if (p.kick > 0) speed *= 1 + CONFIG.energyDrink.kickSpeed;
  if (p.inPaper) speed *= 1 - pk.paperSlow;
  p.x = Math.min(INSIDE.x1 - p.r, Math.max(INSIDE.x0 + p.r, p.x + ix * speed * dt));
  p.y = Math.min(INSIDE.y1 - p.r, Math.max(INSIDE.y0 + p.r, p.y + iy * speed * dt));
}

/** A lawyer touches the player. Does nothing while the player is invulnerable. */
export function damagePlayer(s, amount) {
  const p = s.player;
  if (p.invulnerable > 0 || amount <= 0 || s.status !== 'running') return;
  p.invulnerable = CONFIG.player.invulnerableTime;
  // Noise-cancelling headset: a blocked hit costs no energy and does not affect the multiplier.
  if (tryBlock(s)) return;
  amount *= 1 - p.mod.damageRed;
  s.stat.hits++;
  multHits(s);
  s.events.push('hit');
  if (s.debug.immortal) return;
  p.energy -= amount;
  if (p.energy <= 0) {
    p.energy = 0;
    s.status = 'done';
    s.events.push('done');
  }
}

/** Energy drink: refills energy and gives a sugar kick. */
export function drink(s) {
  const p = s.player;
  p.energy = Math.min(p.maxEnergy, p.energy + CONFIG.energyDrink.fill);
  p.kick = CONFIG.energyDrink.kickTime;
  s.stat.drinks++;
  s.events.push('drink');
}

// @ts-check
// The IT solutions (the weapons). All activate automatically – the player only controls movement.
import { CONFIG } from './config.js';
import { TAU } from './utils.js';
import { effect } from './effects.js';
import { help, inView } from './enemies.js';

const V = CONFIG.weapons;
const MAX_PROJ = CONFIG.maxProjectilesPerWeapon;
/** Reused list of the lawyers already picked as targets in one volley. */
const PICKED = /** @type {number[]} */ ([]);

/** Empty projectile for the pool. */
export function makeProjectile() {
  return {
    type: 'toner', x: 0, y: 0, vx: 0, vy: 0, life: 0, help: 0, splash: 0, through: 0, angle: 0, evo: false,
    /** The effect modifiers of the weapon that fired it (a reference to the weapon's own object, never copied). @type {any} */
    fx: null,
    /** The uids of lawyers the key has already hit (reused list). */
    struck: /** @type {number[]} */ ([]), nHit: 0,
    /** Ctrl+Z: on its way out or back, and how far it has flown. Chains: target and hops left. */
    goBack: false, stretch: 0, range: 0, targetUid: 0, bounces: 0, budget: 0, speed: 0,
    /** Teams alert: steering (radians per second) and how many new alerts it splits into on a hit. */
    turn: 0, split: 0,
    /** Mini printer: thrown from (sx, sy) to (tx, ty); t = time since the throw, burst = time to the next paper burst. */
    sx: 0, sy: 0, tx: 0, ty: 0, t: 0, burst: 0, every: 0, radius: 0, confetti: 0, confettiRadius: 0,
  };
}

/** The numbers that apply to a weapon right now (computed from base/combination + the increments it has taken). */
export function weaponStats(w) {
  return w.stats;
}

/**
 * Recomputes a weapon's numbers from its base (or the combination's stats) and the increments it has taken
 * (w.up = steps per stat, w.fx = effect levels). Called when the weapon changes, never per frame.
 * Growth rules: add = +n per step, pct = +f × base per step, mul = × f per step (with min/max), set/once = one-time.
 */
export function refreshWeapon(w) {
  const def = V[w.id];
  const base = w.evo ? def.combination.stats : def.base;
  const t = { ...base, fx: w.fx };
  for (const stat of Object.keys(def.growth)) {
    const n = w.up[stat] || 0;
    if (!n || base[stat] === undefined) continue;
    const rule = def.growth[stat];
    if (rule.set !== undefined) {
      t[stat] = rule.set;
      continue;
    }
    let v = base[stat];
    if (rule.add) v += rule.add * n;
    // pct steps are a share of the base (the combination's own base after combining), never compounding
    if (rule.pct) v += rule.pct * base[stat] * n;
    if (rule.mul) v *= Math.pow(rule.mul, n);
    if (rule.min !== undefined) v = Math.max(rule.min, v);
    if (rule.max !== undefined) v = Math.min(rule.max, v);
    t[stat] = Math.round(v * 1000) / 1000;
  }
  w.stats = t;
  return t;
}

/** The name shown (the combination's name if the weapon is combined). */
export function weaponName(w) {
  return w.evo ? V[w.id].combination.name : V[w.id].name;
}

/** Skru av og på (turn it off and on): pulse around the player. */
function activatePowerCycle(s, w, t) {
  const p = s.player, out = s.hitList, f = s.enemies.items;
  const R = t.radius * p.mod.area;
  const n = s.grid.find(p.x, p.y, R, out);
  for (let i = 0; i < n; i++) {
    const e = f[out[i]];
    help(s, e, t.help, 'powerCycle', t.fx);
    if (t.nudge && e.active && e.type !== 'boss') {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * t.nudge;
      e.y += (dy / d) * t.nudge;
    }
  }
  effect(s, 'pulse', p.x, p.y, 0.35, R, 0, w.evo ? 1 : 0, true);
}

/** Toner-kast (toner throw): cartridges in a fan toward the nearest lawyer (all directions as a combination). */
function activateToner(s, w, t) {
  const p = s.player;
  const n = t.count + p.mod.extraProj;
  const base = w.evo ? Math.atan2(p.dirY, p.dirX) : aimAngle(s, t.range + t.splash);
  const speed = t.speed * p.mod.duration * p.mod.projSpeed;
  for (let i = 0; i < n; i++) {
    if (s.projCounter.toner >= MAX_PROJ) break;
    const a = w.evo ? base + (i * TAU) / n : base + (i - (n - 1) / 2) * t.spread;
    const pr = s.projectiles.acquire();
    s.projCounter.toner++;
    pr.type = 'toner';
    pr.x = p.x;
    pr.y = p.y;
    pr.vx = Math.cos(a) * speed;
    pr.vy = Math.sin(a) * speed;
    pr.life = t.range / t.speed;
    pr.help = t.help;
    pr.splash = t.splash * p.mod.area;
    pr.angle = a;
    pr.evo = w.evo;
    pr.nHit = 0;
    pr.fx = t.fx;
    pr.through = t.fx.pierce || 0;
  }
}

/**
 * Passord-reset (password reset): a chain like chain lightning. A key flies to the nearest lawyer, helps it, and hops on
 * to the nearest lawyer within range that this chain has not hit yet. Tofaktor: two chains at once, in different directions.
 */
function activatePassword(s, w, t) {
  const p = s.player;
  const chains = (t.chains ?? 1) + p.mod.extraProj;
  const reach = t.reach * p.mod.area;
  /** @type {any} */
  let first = null;
  for (let i = 0; i < chains; i++) {
    if (s.projCounter.key >= MAX_PROJ) break;
    let target = closest(s, p.x, p.y, reach, null, 0, first);
    // The second chain (Tofaktor) starts in the opposite direction if there is a lawyer there
    if (first && i === 1) {
      const out = s.hitList2, f = s.enemies.items;
      const n = s.grid.find(p.x, p.y, reach, out);
      const fx = first.x - p.x, fy = first.y - p.y;
      let best = null, bestD = 1e12;
      for (let j = 0; j < n; j++) {
        const e = f[out[j]];
        if (!e.active || e.leaving || e === first || (e.x - p.x) * fx + (e.y - p.y) * fy > 0) continue;
        const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (best) target = best;
    }
    if (!target) break;
    if (!first) first = target;
    const pr = s.projectiles.acquire();
    s.projCounter.key++;
    pr.type = 'key';
    pr.x = p.x;
    pr.y = p.y - 4;
    pr.speed = (t.range / t.hopTime) * p.mod.projSpeed;
    pr.vx = 0;
    pr.vy = 0;
    pr.life = 4;
    pr.help = t.help;
    pr.bounces = t.hops;
    pr.range = t.range * p.mod.area;
    pr.angle = Math.atan2(target.y - pr.y, target.x - pr.x);
    pr.evo = w.evo;
    pr.nHit = 0;
    pr.targetUid = target.uid;
    pr.fx = t.fx;
    s.teamsTargets.set(pr, target);
  }
}

/** HDMI-kabelen (the HDMI cable): arc toward the nearest lawyer (and behind from level 4, full circle as a combination). */
function activateHdmi(s, w, t) {
  const p = s.player, out = s.hitList, f = s.enemies.items;
  const R = t.lengthPx * p.mod.area;
  const base = w.evo ? Math.atan2(p.dirY, p.dirX) : aimAngle(s, R + 12);
  const n = s.grid.find(p.x, p.y, R, out);
  for (let i = 0; i < n; i++) {
    const e = f[out[i]];
    if (!w.evo) {
      let diff = Math.abs(Math.atan2(e.y - p.y, e.x - p.x) - base);
      if (diff > Math.PI) diff = TAU - diff;
      const front = diff <= t.arc / 2;
      const back = t.back && diff >= Math.PI - t.arc / 2;
      if (!front && !back) continue;
    }
    help(s, e, t.help, 'hdmi', t.fx);
  }
  effect(s, 'swing', p.x, p.y, 0.24, R, base, w.evo ? 2 : t.back ? 1 : 0, true);
}

/** Fjernstyring (remote control): the nearest lawyers get help via a flash from above. */
function activateRemote(s, w, t) {
  const p = s.player;
  let picked = 0;
  const reach = t.reach * p.mod.area;
  for (let j = 0; j < t.hits; j++) {
    const e = closest(s, p.x, p.y, reach, PICKED, picked);
    if (!e) break;
    PICKED[picked++] = e.uid;
    effect(s, 'flash', e.x, e.y, 0.3, e.r, 0, w.evo ? 1 : 0);
    help(s, e, t.help, 'remote', t.fx);
  }
}

/** Trådløse mus (wireless mice): orbit along a track. Hits in a ring, not right around the player. */
function updateMouse(s, w, t, dt) {
  const p = s.player, out = s.hitList, f = s.enemies.items;
  w.angle = (w.angle + t.rotation * p.mod.duration * dt) % TAU;
  const R = t.track * p.mod.area;
  for (let i = 0; i < t.count; i++) {
    const a = w.angle + (i * TAU) / t.count;
    const n = s.grid.find(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, 6, out);
    for (let j = 0; j < n; j++) {
      const e = f[out[j]];
      if (e.mouseCd <= 0) {
        e.mouseCd = t.hitPause;
        help(s, e, t.help, 'mouse', t.fx);
      }
    }
  }
}


// ---------- The four new weapons ----------

/** Exclusion state for closest() – module level so the filter never allocates a closure per call. */
let EXCL = /** @type {number[] | null} */ (null), N_EXCL = 0, BOUNCE = /** @type {any} */ (null);
const notExcluded = (e) => {
  if (e === BOUNCE) return false;
  for (let k = 0; k < N_EXCL; k++) if (/** @type {number[]} */ (EXCL)[k] === e.uid) return false;
  return true;
};

/**
 * The nearest active lawyer within radius R of (x, y) that is not in the `excluded` list.
 * Every weapon aims with this: it walks the spatial grid in rings from the point and stops early,
 * so it costs a few cells even with 400 lawyers on the map.
 */
export function closest(s, x, y, R, excluded = null, nExcluded = 0, bounce = null) {
  if (!bounce && nExcluded === 0) return s.grid.nearest(x, y, R);
  EXCL = excluded;
  N_EXCL = nExcluded;
  BOUNCE = bounce;
  return s.grid.nearest(x, y, R, notExcluded);
}

/** The direction from the player toward the nearest lawyer within R, or the walking direction if there is none. */
function aimAngle(s, R) {
  const p = s.player;
  const target = s.grid.nearest(p.x, p.y, R);
  return target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.dirY, p.dirX);
}

/** Ctrl+Z: a big key is thrown at the nearest lawyer, turns around and comes back (boomerang). */
function activateCtrlz(s, w, t) {
  const p = s.player;
  const target = closest(s, p.x, p.y, 260);
  const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.dirY, p.dirX);
  const speed = t.speed * p.mod.projSpeed * p.mod.duration;
  for (let i = 0; i < t.count; i++) {
    if (s.projCounter.ctrlz >= MAX_PROJ) break;
    const a = base + (i - (t.count - 1) / 2) * 0.45;
    const pr = s.projectiles.acquire();
    s.projCounter.ctrlz++;
    pr.type = 'ctrlz';
    pr.x = p.x;
    pr.y = p.y;
    pr.vx = Math.cos(a) * speed;
    pr.vy = Math.sin(a) * speed;
    pr.speed = speed;
    pr.life = 6;
    pr.help = t.help;
    pr.goBack = false;
    pr.stretch = 0;
    pr.range = t.range * p.mod.area;
    pr.angle = a;
    pr.evo = false;
    pr.nHit = 0;
    pr.fx = t.fx;
  }
}

/**
 * Teams-varsel (Teams alert): homing alerts. Each alert is shot out in a fan and steers toward its own lawyer.
 * Allmøte på Teams (town hall): each alert splits into three new homing alerts when it hits.
 */
function activateTeams(s, w, t) {
  const p = s.player;
  const reach = t.reach * p.mod.area;
  let picked = 0;
  const base = Math.atan2(p.dirY, p.dirX);
  for (let i = 0; i < t.count; i++) {
    if (s.projCounter.teams >= MAX_PROJ) break;
    const target = closest(s, p.x, p.y, reach, PICKED, picked) ?? closest(s, p.x, p.y, reach);
    if (!target) break;
    PICKED[picked++] = target.uid;
    launchAlert(s, p.x, p.y - 6, base + (i - (t.count - 1) / 2) * 0.7, t, target, w.evo ? t.split : 0, w.evo);
  }
}

function launchAlert(s, x, y, angle, t, target, split, evo) {
  const p = s.player;
  const pr = s.projectiles.acquire();
  s.projCounter.teams++;
  pr.type = 'teams';
  pr.x = x;
  pr.y = y;
  pr.speed = t.speed * p.mod.projSpeed;
  pr.vx = Math.cos(angle) * pr.speed;
  pr.vy = Math.sin(angle) * pr.speed;
  pr.turn = t.turn;
  pr.life = 3;
  pr.help = t.help;
  pr.split = split;
  pr.range = t.reach * p.mod.area;
  pr.evo = evo;
  pr.nHit = 0;
  pr.fx = t.fx ?? null;
  pr.through = t.fx ? t.fx.pierce || 0 : 0;
  pr.targetUid = target.uid;
  s.teamsTargets.set(pr, target);
}

/** Where the guardian angel hovers right now (follows the player, bobs gently up and down). */
export function angelPos(w, p) {
  ANGEL[0] = p.x + Math.cos(w.angle) * 24;
  ANGEL[1] = p.y - 18 + Math.sin(w.angle * 2) * 4;
  return ANGEL;
}
const ANGEL = [0, 0];

/**
 * Skytsengelen (the guardian angel): hovers around the player and now and then throws mini printers in an arc
 * toward the nearest lawyers. The number of mini printers at once is fixed and the same for everyone.
 */
function updateAngel(s, w, t, dt) {
  const p = s.player;
  w.angle = (w.angle + 1.3 * dt) % TAU;
  w.cd -= dt;
  if (w.cd > 0) return;
  w.cd = dualMonitor(s) ? 0.25 : t.interval * p.mod.cd;
  const [ax, ay] = angelPos(w, p);
  let picked = 0;
  for (let i = 0; i < t.perThrow && s.projCounter.mini < t.max; i++) {
    const target = closest(s, p.x, p.y, 240, PICKED, picked) ?? closest(s, p.x, p.y, 240);
    let tx = p.x + p.dirX * 70 + (i - (t.perThrow - 1) / 2) * 18, ty = p.y + p.dirY * 70;
    if (target) {
      // lands where the lawyer stood when the throw started (like a molotov in survivors games)
      PICKED[picked++] = target.uid;
      tx = target.x;
      ty = target.y;
    }
    const pr = s.projectiles.acquire();
    s.projCounter.mini++;
    pr.type = 'mini';
    pr.sx = ax;
    pr.sy = ay;
    pr.tx = tx;
    pr.ty = ty;
    pr.x = ax;
    pr.y = ay;
    pr.t = 0;
    pr.range = 0.6;
    pr.goBack = false;
    pr.life = 0.6 + t.life * p.mod.duration;
    pr.help = t.help;
    pr.burst = 0.1;
    pr.every = t.burst;
    pr.radius = t.range * p.mod.area;
    pr.confetti = t.confetti ?? 0;
    pr.confettiRadius = (t.confettiRadius ?? 0) * p.mod.area;
    pr.evo = w.evo;
    pr.angle = 0;
    pr.nHit = 0;
    pr.fx = t.fx;
  }
}

/** Oppdateringsstrålen (update beam): one beam in the direction of movement for a while, then a pause. Combination: two beams sweeping around. */
function updateBeam(s, w, t, dt) {
  const p = s.player;
  if (w.evo) {
    w.angle = (w.angle + t.rotation * p.mod.duration * dt) % TAU;
    w.active = 1;
    w.tick -= dt;
    if (w.tick <= 0) {
      w.tick += t.tick;
      beamHits(s, w.angle, t);
      beamHits(s, w.angle + Math.PI, t);
    }
    return;
  }
  if (w.active > 0) {
    w.active -= dt;
    w.angle = aimAngle(s, t.lengthPx * p.mod.area);
    w.tick -= dt;
    if (w.tick <= 0) {
      w.tick += t.tick;
      beamHits(s, w.angle, t);
    }
    if (w.active <= 0) {
      w.active = 0;
      // «Dobbel skjerm» ("Dual monitor"): a new beam right away
      w.cd = dualMonitor(s) ? 0.12 : t.pause * p.mod.cd;
    }
    return;
  }
  w.cd -= dt;
  if (w.cd <= 0) {
    w.active = t.duration * p.mod.duration;
    w.phase = w.active;
    w.tick = 0;
    w.angle = aimAngle(s, t.lengthPx * p.mod.area);
  }
}

/** Helps all lawyers inside the beam (a narrow rectangle out from the player). */
function beamHits(s, angle, t) {
  const p = s.player, out = s.hitList, f = s.enemies.items;
  const L = t.lengthPx * p.mod.area, B = t.width * p.mod.area;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const n = s.grid.find(p.x + (cos * L) / 2, p.y + (sin * L) / 2, L / 2 + B, out);
  for (let i = 0; i < n; i++) {
    const e = f[out[i]];
    const dx = e.x - p.x, dy = e.y - p.y;
    const along = dx * cos + dy * sin, across = Math.abs(-dx * sin + dy * cos);
    if (along >= -e.r && along <= L + e.r && across <= B / 2 + e.r) help(s, e, t.help, 'beam', t.fx);
  }
}

/** Støydempende headset (noise-cancelling headset): charges up the shield. The actual blocking happens in tryBlock(). */
function updateHeadset(s, w, t, dt) {
  const max = t.charges;
  if (w.charges < max) {
    w.cd -= dt;
    if (w.cd <= 0) {
      w.charges++;
      w.cd = t.charge * s.player.mod.cd;
    }
  } else w.cd = t.charge * s.player.mod.cd;
}

/**
 * Called when the player is hit. If the headset has a charge, the hit is blocked: no energy is lost,
 * the multiplier is not affected, and a pulse helps the lawyers around.
 * @returns {boolean} true if the hit was blocked
 */
export function tryBlock(s) {
  const p = s.player;
  for (let i = 0; i < p.weapons.length; i++) {
    const w = p.weapons[i];
    if (w.id !== 'headset' || w.charges <= 0) continue;
    const t = weaponStats(w);
    w.charges--;
    const R = t.pulseRadius * p.mod.area;
    const out = s.hitList, f = s.enemies.items;
    const n = s.grid.find(p.x, p.y, R, out);
    for (let j = 0; j < n; j++) help(s, f[out[j]], t.help, 'headset', t.fx);
    effect(s, 'block', p.x, p.y, 0.4, R, 0, w.evo ? 1 : 0, true);
    s.stat.blocked++;
    s.events.push('block');
    return true;
  }
  return false;
}

/** Ctrl+Alt+Del: keys in a spiral out and in around the player. */
function updateSpiral(s, w, t, dt) {
  const p = s.player, out = s.hitList, f = s.enemies.items;
  w.angle = (w.angle + t.rotation * p.mod.projSpeed * dt) % TAU;
  w.phase = (w.phase + dt) % t.period;
  const R = t.radius * p.mod.area;
  for (let i = 0; i < t.count; i++) {
    const [x, y] = spiralPos(w, t, i, R, p);
    const n = s.grid.find(x, y, 7, out);
    for (let j = 0; j < n; j++) {
      const e = f[out[j]];
      if (e.ctrlCd <= 0) {
        e.ctrlCd = t.hitPause;
        help(s, e, t.help, 'ctrlz', t.fx);
      }
    }
  }
}

const SPIRAL = [0, 0];
/** The position of key no. i in the spiral (used by both logic and drawing). */
export function spiralPos(w, t, i, R, p) {
  const a = w.angle + (i * TAU) / t.count;
  const f = Math.abs(Math.sin(Math.PI * (w.phase / t.period) + i * 0.7));
  const rr = R * (0.2 + 0.8 * f);
  SPIRAL[0] = p.x + Math.cos(a) * rr;
  SPIRAL[1] = p.y + Math.sin(a) * rr;
  return SPIRAL;
}

/** «Dobbel skjerm» ("Dual monitor"): chance that the weapon activates one more time. Own random stream («Dagens vakt», today's shift). */
function dualMonitor(s) {
  const chance = s.player.mod.dual;
  return chance > 0 && s.rng.dual.next() < chance;
}

const ACTIVATORS = {
  powerCycle: activatePowerCycle, toner: activateToner, password: activatePassword, hdmi: activateHdmi, remote: activateRemote,
  ctrlz: activateCtrlz, teams: activateTeams,
};

/** Counts down and activates all weapons the player has. */
export function updateWeapons(s, dt) {
  const p = s.player;
  for (let i = 0; i < p.weapons.length; i++) {
    const w = p.weapons[i];
    const t = weaponStats(w);
    if (w.id === 'mouse') {
      updateMouse(s, w, t, dt);
      continue;
    }
    if (w.id === 'beam') {
      updateBeam(s, w, t, dt);
      continue;
    }
    if (w.id === 'headset') {
      updateHeadset(s, w, t, dt);
      continue;
    }
    if (w.id === 'ctrlz' && w.evo) {
      updateSpiral(s, w, t, dt);
      continue;
    }
    if (w.id === 'angel') {
      updateAngel(s, w, t, dt);
      continue;
    }
    w.cd -= dt;
    if (w.cd <= 0) {
      ACTIVATORS[w.id](s, w, t);
      // «Dobbel skjerm» ("Dual monitor"): now and then the weapon activates one more time right after
      w.cd = dualMonitor(s) ? 0.12 : w.cd + t.interval * p.mod.cd;
      if (w.cd < 0.05) w.cd = 0.05;
    }
  }
}

/** Removes projectile no. i and decrements the right counter. */
function removeProjectile(s, i) {
  const pr = s.projectiles.items[i];
  if (pr.type === 'toner') s.projCounter.toner--;
  else if (pr.type === 'key') {
    s.projCounter.key--;
    s.teamsTargets.delete(pr);
  } else if (pr.type === 'ctrlz') s.projCounter.ctrlz--;
  else if (pr.type === 'mini') s.projCounter.mini--;
  else if (pr.type === 'sheet') {
    s.projCounter.sheet--;
    s.teamsTargets.delete(pr);
  }
  else if (pr.type === 'teams') {
    s.projCounter.teams--;
    s.teamsTargets.delete(pr);
  }
  s.projectiles.removeAt(i);
}

/** Has the projectile already hit this lawyer? If not, it is marked as hit. */
function newHit(pr, uid) {
  const nCheck = pr.nHit < 64 ? pr.nHit : 64;
  for (let k = 0; k < nCheck; k++) if (pr.struck[k] === uid) return false;
  pr.struck[pr.nHit % 64] = uid;
  pr.nHit++;
  return true;
}

/** Moves all projectiles and checks hits. Anything that leaves the map or the screen is removed. */
export function updateProjectiles(s, dt) {
  const pool = s.projectiles, out = s.hitList, f = s.enemies.items, p = s.player;
  for (let i = pool.n - 1; i >= 0; i--) {
    const pr = pool.items[i];
    pr.life -= dt;

    if (pr.type === 'ctrlz') {
      // Boomerang: out to the range, then back to the player
      if (pr.goBack) {
        const dx = p.x - pr.x, dy = p.y - pr.y, d = Math.hypot(dx, dy) || 1;
        pr.vx = (dx / d) * pr.speed;
        pr.vy = (dy / d) * pr.speed;
        if (d < 10) {
          removeProjectile(s, i);
          continue;
        }
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.stretch += pr.speed * dt;
      if (!pr.goBack && pr.stretch >= pr.range) {
        pr.goBack = true;
        pr.nHit = 0; // hits again on the way back
      }
      const n = s.grid.find(pr.x, pr.y, 7, out);
      for (let j = 0; j < n; j++) {
        const e = f[out[j]];
        if (newHit(pr, e.uid)) help(s, e, pr.help, 'ctrlz', pr.fx);
      }
      if (pr.life <= 0) removeProjectile(s, i);
      continue;
    }

    if (pr.type === 'key') {
      // Chain: fly fast to the target, help, hop on to the nearest lawyer this chain has not hit yet
      let target = s.teamsTargets.get(pr);
      if (!target || !target.active || target.uid !== pr.targetUid) {
        target = closest(s, pr.x, pr.y, pr.range, pr.struck, Math.min(pr.nHit, 64));
        if (!target) {
          removeProjectile(s, i);
          continue;
        }
        pr.targetUid = target.uid;
        s.teamsTargets.set(pr, target);
      }
      const dx = target.x - pr.x, dy = target.y - pr.y, d = Math.hypot(dx, dy) || 1;
      const step = pr.speed * dt;
      pr.angle = Math.atan2(dy, dx);
      if (d <= step + target.r) {
        pr.x = target.x;
        pr.y = target.y;
        newHit(pr, target.uid);
        help(s, target, pr.help, 'password', pr.fx);
        effect(s, 'flash', target.x, target.y, 0.18, target.r, 0, 3);
        pr.bounces--;
        const next = pr.bounces > 0 ? closest(s, pr.x, pr.y, pr.range, pr.struck, Math.min(pr.nHit, 64)) : null;
        if (!next) {
          removeProjectile(s, i);
          continue;
        }
        pr.targetUid = next.uid;
        s.teamsTargets.set(pr, next);
      } else {
        pr.vx = (dx / d) * pr.speed;
        pr.vy = (dy / d) * pr.speed;
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
      }
      if (pr.life <= 0) removeProjectile(s, i);
      continue;
    }

    if (pr.type === 'teams') {
      // Homing alert: steers toward its target (or a new one if the target is gone) and helps on contact
      let target = s.teamsTargets.get(pr);
      if (!target || !target.active || target.uid !== pr.targetUid) {
        target = closest(s, pr.x, pr.y, pr.range);
        if (target) {
          pr.targetUid = target.uid;
          s.teamsTargets.set(pr, target);
        }
      }
      if (target) {
        const want = Math.atan2(target.y - pr.y, target.x - pr.x);
        let a = Math.atan2(pr.vy, pr.vx);
        let diff = want - a;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        const max = pr.turn * dt;
        a += Math.max(-max, Math.min(max, diff));
        pr.vx = Math.cos(a) * pr.speed;
        pr.vy = Math.sin(a) * pr.speed;
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.angle = Math.atan2(pr.vy, pr.vx);
      if (target && (target.x - pr.x) ** 2 + (target.y - pr.y) ** 2 <= (target.r + 4) ** 2) {
        newHit(pr, target.uid);
        help(s, target, pr.help, 'teams', pr.fx);
        effect(s, 'flash', target.x, target.y, 0.2, target.r, 0, 2);
        // Allmøte på Teams (town hall): splits into new homing alerts (which do not split again)
        if (pr.split > 0) {
          let picked = 0;
          PICKED[picked++] = target.uid;
          const t = V.teams.combination.stats;
          for (let k = 0; k < pr.split && s.projCounter.teams < MAX_PROJ; k++) {
            const next = closest(s, pr.x, pr.y, pr.range, PICKED, picked);
            if (!next) break;
            PICKED[picked++] = next.uid;
            launchAlert(s, pr.x, pr.y, pr.angle + (k - 1) * 1.2, t, next, 0, true);
          }
        }
        // «Gjennomtrengende»: the alert goes on to the next lawyer it has not hit yet
        if (pr.through > 0) {
          const next = closest(s, pr.x, pr.y, pr.range, pr.struck, Math.min(pr.nHit, 64));
          if (next) {
            pr.through--;
            pr.targetUid = next.uid;
            s.teamsTargets.set(pr, next);
            continue;
          }
        }
        removeProjectile(s, i);
        continue;
      }
      if (pr.life <= 0 || !inView(s, pr.x, pr.y, 40)) removeProjectile(s, i);
      continue;
    }

    if (pr.type === 'sheet') {
      // A sheet of paper from a mini printer: flies to its lawyer and helps on arrival
      const target = s.teamsTargets.get(pr);
      if (!target || !target.active || target.uid !== pr.targetUid) {
        removeProjectile(s, i);
        continue;
      }
      const dx = target.x - pr.x, dy = target.y - pr.y, d = Math.hypot(dx, dy) || 1;
      if (d <= pr.speed * dt + target.r) {
        help(s, target, pr.help, 'angel', pr.fx);
        removeProjectile(s, i);
        continue;
      }
      pr.vx = (dx / d) * pr.speed;
      pr.vy = (dy / d) * pr.speed;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.angle = Math.atan2(dy, dx);
      if (pr.life <= 0) removeProjectile(s, i);
      continue;
    }

    if (pr.type === 'mini') {
      pr.t += dt;
      if (!pr.goBack) {
        // In the air: an arc from the angel to the landing spot
        const fr = Math.min(1, pr.t / pr.range);
        pr.x = pr.sx + (pr.tx - pr.sx) * fr;
        pr.y = pr.sy + (pr.ty - pr.sy) * fr - Math.sin(fr * Math.PI) * 26;
        if (fr >= 1) {
          // Lands with a little hop and a puff of dust, and stays exactly here
          pr.goBack = true;
          pr.x = pr.tx;
          pr.y = pr.ty;
          pr.t = 0;
          effect(s, 'dust', pr.x, pr.y + 5, 0.35, 10);
        }
      } else {
        // Standing still: feeds out a sheet of paper toward the nearest lawyer within range every «every» seconds
        pr.burst -= dt;
        if (pr.burst <= 0) {
          pr.burst += pr.every;
          const target = closest(s, pr.x, pr.y, pr.radius);
          if (target && s.projCounter.sheet < MAX_PROJ) {
            const sh = pool.acquire();
            s.projCounter.sheet++;
            sh.type = 'sheet';
            sh.x = pr.x;
            sh.y = pr.y - 6;
            sh.speed = 260;
            sh.vx = 0;
            sh.vy = 0;
            sh.life = 0.8;
            sh.help = pr.help;
            sh.evo = pr.evo;
            sh.nHit = 0;
            sh.fx = pr.fx;
            sh.targetUid = target.uid;
            sh.angle = Math.atan2(target.y - sh.y, target.x - sh.x);
            s.teamsTargets.set(sh, target);
            pr.angle = target.x < pr.x ? -1 : 1;
          }
        }
      }
      if (pr.life <= 0) {
        if (pr.confetti > 0) {
          // Himmelsk serviceavtale (heavenly service agreement): a final burst of paper confetti
          const n = s.grid.find(pr.x, pr.y, pr.confettiRadius, out);
          for (let j = 0; j < n; j++) help(s, f[out[j]], pr.confetti, 'angel', pr.fx);
          effect(s, 'confetti', pr.x, pr.y, 0.6, pr.confettiRadius);
        }
        effect(s, 'poof', pr.x, pr.y, 0.4, 8);
        removeProjectile(s, i);
      }
      continue;
    }

    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    let done = pr.life <= 0 || !inView(s, pr.x, pr.y, 24);
    if (pr.type === 'toner') {
      // Bursts on the first hit (or when it lands) and helps everyone in the splash.
      // «Gjennomtrengende»: bursts, then flies on and bursts again on the next lawyer it has not hit.
      let hit = done;
      if (!hit && s.grid.find(pr.x, pr.y, 4, out, 1) > 0) hit = newHit(pr, f[out[0]].uid);
      if (hit) {
        const n = s.grid.find(pr.x, pr.y, pr.splash, out);
        for (let j = 0; j < n; j++) help(s, f[out[j]], pr.help, 'toner', pr.fx);
        effect(s, 'splash', pr.x, pr.y, 0.4, pr.splash, pr.angle, pr.evo ? 1 : 0);
        if (pr.through > 0 && !done) pr.through--;
        else done = true;
      }
    }
    if (done) removeProjectile(s, i);
  }
}

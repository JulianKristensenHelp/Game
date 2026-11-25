// @ts-check
// The IT solutions (the weapons). All activate automatically – the player only controls movement.
import { CONFIG } from './config.js';
import { TAU } from './utils.js';
import { effect } from './effects.js';
import { help, inView } from './enemies.js';

const V = CONFIG.weapons;
const MAX_PROJ = CONFIG.maxProjectilesPerWeapon;

/** Empty projectile for the pool. */
export function makeProjectile() {
  return {
    type: 'toner', x: 0, y: 0, vx: 0, vy: 0, life: 0, help: 0, splash: 0, through: 0, angle: 0, evo: false,
    /** The uids of lawyers the key has already hit (reused list). */
    struck: /** @type {number[]} */ ([]), nHit: 0,
    /** Ctrl+Z: on its way out or back, and how far it has flown. Teams: target, bounce again and «budget». */
    goBack: false, stretch: 0, range: 0, targetUid: 0, bounces: 0, budget: 0, speed: 0,
  };
}

/** The numbers that apply to a weapon right now (the level, or the combination). */
export function weaponStats(w) {
  return w.evo ? V[w.id].combination.stats : V[w.id].levels[w.level - 1];
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
    help(s, e, t.help, 'powerCycle');
    if (t.nudge && e.active && e.type !== 'boss') {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * t.nudge;
      e.y += (dy / d) * t.nudge;
    }
  }
  effect(s, 'pulse', p.x, p.y, 0.35, R, 0, w.evo ? 1 : 0, true);
}

/** Toner-kast (toner throw): cartridges in a fan shape where the player is heading (all directions as a combination). */
function activateToner(s, w, t) {
  const p = s.player;
  const n = t.count + p.mod.extraProj;
  const base = Math.atan2(p.dirY, p.dirX);
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
  }
}

/** Passord-reset (password reset): keys straight ahead that pass through several lawyers. */
function activatePassword(s, w, t) {
  const p = s.player;
  const n = t.count + p.mod.extraProj * (w.evo ? 2 : 1);
  const speed = t.speed * p.mod.duration * p.mod.projSpeed;
  for (let i = 0; i < n; i++) {
    if (s.projCounter.key >= MAX_PROJ) break;
    const side = (i - (n - 1) / 2) * 8;
    const back = -Math.abs(side) * 0.7;
    const pr = s.projectiles.acquire();
    s.projCounter.key++;
    pr.type = 'key';
    pr.x = p.x - p.dirY * side + p.dirX * back;
    pr.y = p.y + p.dirX * side + p.dirY * back;
    pr.vx = p.dirX * speed;
    pr.vy = p.dirY * speed;
    pr.life = t.range / t.speed;
    pr.help = t.help;
    pr.splash = 0;
    pr.through = t.through;
    pr.angle = Math.atan2(p.dirY, p.dirX);
    pr.evo = w.evo;
    pr.nHit = 0;
  }
}

/** HDMI-kabelen (the HDMI cable): arc in front (and behind from level 4, full circle as a combination). */
function activateHdmi(s, w, t) {
  const p = s.player, out = s.hitList, f = s.enemies.items;
  const R = t.lengthPx * p.mod.area;
  const base = Math.atan2(p.dirY, p.dirX);
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
    help(s, e, t.help, 'hdmi');
  }
  effect(s, 'swing', p.x, p.y, 0.24, R, base, w.evo ? 2 : t.back ? 1 : 0, true);
}

/** Fjernstyring (remote control): random lawyers on screen get help. */
function activateRemote(s, w, t) {
  const f = s.enemies, cand = s.candidates;
  let k = 0;
  for (let i = 0; i < f.n; i++) {
    const e = f.items[i];
    if (!e.active || e.leaving || !inView(s, e.x, e.y, 0)) continue;
    cand[k++] = i;
  }
  const count = Math.min(t.hits, k);
  for (let j = 0; j < count; j++) {
    const r = j + s.rng.weapons.integer(k - j);
    const tmp = cand[j];
    cand[j] = cand[r];
    cand[r] = tmp;
    const e = f.items[cand[j]];
    effect(s, 'flash', e.x, e.y, 0.3, e.r, 0, w.evo ? 1 : 0);
    help(s, e, t.help, 'remote');
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
        help(s, e, t.help, 'mouse');
      }
    }
  }
}


// ---------- The four new weapons ----------

/** The nearest active lawyer within radius R of (x, y) that is not in the `excluded` list. */
function closest(s, x, y, R, excluded = null, nExcluded = 0, bounce = null) {
  const out = s.hitList2, f = s.enemies.items;
  const n = s.grid.find(x, y, R, out);
  let best = null, bestD = 1e12;
  for (let i = 0; i < n; i++) {
    const e = f[out[i]];
    if (!e.active || e.leaving || e === bounce) continue;
    let set = false;
    for (let k = 0; k < nExcluded; k++) if (excluded[k] === e.uid) { set = true; break; }
    if (set) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
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
  }
}

/** Teams-varsel (Teams alert): flies to the nearest lawyer and bounces on (splits as a combination). */
function activateTeams(s, w, t) {
  const p = s.player;
  if (s.projCounter.teams >= MAX_PROJ) return;
  const target = closest(s, p.x, p.y, 240);
  if (!target) return;
  const pr = s.projectiles.acquire();
  s.projCounter.teams++;
  pr.type = 'teams';
  pr.x = p.x;
  pr.y = p.y - 6;
  pr.speed = t.speed * p.mod.projSpeed;
  pr.vx = 0;
  pr.vy = 0;
  pr.life = 4;
  pr.help = t.help;
  pr.targetUid = target.uid;
  pr.bounces = t.bounces;
  pr.budget = w.evo ? t.maxHits : t.bounces;
  pr.range = t.range * p.mod.area;
  pr.evo = w.evo;
  pr.nHit = 0;
  s.teamsTargets.set(pr, target);
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
    w.angle = Math.atan2(p.dirY, p.dirX);
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
    w.angle = Math.atan2(p.dirY, p.dirX);
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
    if (along >= -e.r && along <= L + e.r && across <= B / 2 + e.r) help(s, e, t.help, 'beam');
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
    for (let j = 0; j < n; j++) help(s, f[out[j]], t.help, 'headset');
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
        help(s, e, t.help, 'ctrlz');
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
  else if (pr.type === 'key') s.projCounter.key--;
  else if (pr.type === 'ctrlz') s.projCounter.ctrlz--;
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
        if (newHit(pr, e.uid)) help(s, e, pr.help, 'ctrlz');
      }
      if (pr.life <= 0) removeProjectile(s, i);
      continue;
    }

    if (pr.type === 'teams') {
      // Chain: fly to the target, help, bounce on to the next nearest that has not been hit
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
      if (d <= step + target.r) {
        pr.x = target.x;
        pr.y = target.y;
        newHit(pr, target.uid);
        help(s, target, pr.help, 'teams');
        effect(s, 'flash', target.x, target.y, 0.2, target.r, 0, 2);
        pr.bounces--;
        pr.budget--;
        const next = pr.bounces > 0 && pr.budget > 0 ? closest(s, pr.x, pr.y, pr.range, pr.struck, Math.min(pr.nHit, 64)) : null;
        if (!next) {
          removeProjectile(s, i);
          continue;
        }
        pr.targetUid = next.uid;
        s.teamsTargets.set(pr, next);
        // Town hall on Teams: the alert splits in two at each bounce
        if (pr.evo && pr.budget >= 2 && s.projCounter.teams < MAX_PROJ) {
          const others = closest(s, pr.x, pr.y, pr.range, pr.struck, Math.min(pr.nHit, 64), next);
          if (others) {
            const newBranch = pool.acquire();
            s.projCounter.teams++;
            newBranch.type = 'teams';
            newBranch.x = pr.x;
            newBranch.y = pr.y;
            newBranch.speed = pr.speed;
            newBranch.life = pr.life;
            newBranch.help = pr.help;
            newBranch.bounces = pr.bounces;
            newBranch.range = pr.range;
            newBranch.evo = true;
            const half = Math.floor(pr.budget / 2);
            newBranch.budget = half;
            pr.budget -= half;
            newBranch.nHit = Math.min(pr.nHit, 64);
            for (let k = 0; k < newBranch.nHit; k++) newBranch.struck[k] = pr.struck[k];
            newBranch.targetUid = others.uid;
            s.teamsTargets.set(newBranch, others);
          }
        }
      } else {
        pr.vx = (dx / d) * pr.speed;
        pr.vy = (dy / d) * pr.speed;
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
      }
      if (pr.life <= 0) removeProjectile(s, i);
      continue;
    }

    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    let done = pr.life <= 0 || !inView(s, pr.x, pr.y, 24);
    if (pr.type === 'toner') {
      // Bursts on the first hit (or when it lands) and helps everyone in the splash.
      if (done || s.grid.find(pr.x, pr.y, 4, out, 1) > 0) {
        const n = s.grid.find(pr.x, pr.y, pr.splash, out);
        for (let j = 0; j < n; j++) help(s, f[out[j]], pr.help, 'toner');
        effect(s, 'splash', pr.x, pr.y, 0.4, pr.splash, pr.angle, pr.evo ? 1 : 0);
        done = true;
      }
    } else if (!done) {
      const n = s.grid.find(pr.x, pr.y, 4, out);
      for (let j = 0; j < n && !done; j++) {
        const e = f[out[j]];
        if (!newHit(pr, e.uid)) continue;
        help(s, e, pr.help, 'password');
        if (--pr.through <= 0) done = true;
      }
    }
    if (done) removeProjectile(s, i);
  }
}

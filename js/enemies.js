// @ts-check
// The lawyers: who shows up when and where, how they move, and what happens when they become happy.
import { CONFIG } from './config.js';
import { TAU } from './utils.js';
import { effect } from './effects.js';
import { givePoints, registerHelped } from './score.js';
import { damagePlayer } from './player.js';
import { dropTicket, dropPickup } from './tickets.js';
import { INSIDE, DOORS } from './map.js';
import { updateBoss, updateBossSchedule, bossContactDamage, bossHelpFactor, checkBossPhase, bossHelped, shoot } from './bosses.js';

const F = CONFIG.enemies;
const SP = CONFIG.spawn;
const VB = CONFIG.view.width, VH = CONFIG.view.height;

/** Type codes used by the happy animation (effects store numbers, not text). */
export const TYPE_CODE = { junior: 0, printer: 1, senior: 2, urgent: 3, boss: 4, sender: 5, nordic: 6, printerBoss: 7, johan: 8 };
export const TYPE_NAMES = ['junior', 'printer', 'senior', 'urgent', 'boss', 'sender', 'nordic', 'printerBoss', 'johan'];

/** The figure type used to draw an enemy (the bosses have their own figures; «deadline» is the classic lawyer boss). */
export function figureType(e) {
  return e.type === 'boss' && e.bossType !== 'deadline' ? e.bossType : e.type;
}

/** Empty enemy object for the pool. */
export function makeEnemy() {
  return {
    active: false, type: 'junior', x: 0, y: 0, r: 7,
    /** hp = remaining frustration. */
    hp: 0, maxHp: 0, speed: 0, damage: 0, points: 0,
    blink: 0, mouseCd: 0, ctrlCd: 0, uid: 0, cx: 0, cy: 0,
    /** Sender and boss: time until the next email, and whether the alert («!») is shown now. */
    shots: 0, alert: false, bossIndex: 0,
    /** Boss: countdown. Urgent case: lifetime. Printer: time until the next paper pile. */
    timer: 0,
    /** Boss that has given up and is leaving. */
    leaving: false,
    phase: 0,
    /** Looks only: which variant (from a separate random stream) and which way the figure faces. */
    variant: 0, direction: 1,
    /** Bosses (see bosses.js): which boss, the current attack, warning, pose and cooldowns. */
    bossType: '', attack: '', tell: false, attackT: 0, pose: -1, cds: [0, 0, 0, 0, 0], fightT: 0, deadline: 0,
    invuln: 0, jam: 0, jamCd: 0, phase2: false, alt: 0, aimX: 0, aimY: 0, vx: 0, vy: 0, streamT: 0, streamA: 0, returnNo: 0,
  };
}

export function makePaper() {
  return { x: 0, y: 0, life: 0 };
}

function overtime(min) {
  const sk = CONFIG.scaling;
  return min > sk.overtimeFromMin ? Math.pow(sk.overtimeGrowthPerMin, min - sk.overtimeFromMin) : 1;
}
/** Frustration: grows by a fixed percentage per minute after the calm start. */
export function frustrationFactor(t) {
  const sk = CONFIG.scaling;
  const min = t / 60;
  return Math.pow(sk.frustrationGrowthPerMin, Math.max(0, min - sk.startAfterMin)) * overtime(min);
}
/** Damage: increases steadily per minute. */
export function damageFactor(t) {
  const min = t / 60;
  return (1 + CONFIG.scaling.damagePerMin * min) * overtime(min);
}
/** Speed increase over time (capped). */
export const speedFactor = (t) => {
  const sk = CONFIG.scaling;
  const min = t / 60;
  // In overtime they additionally get faster, with no cap – so nobody can just run away forever.
  return Math.min(sk.speedMax, 1 + sk.speedPerMin * min) + Math.max(0, min - sk.overtimeFromMin) * sk.overtimeSpeedPerMin;
};

/** Lawyers per second at time t (glides smoothly between the points in CONFIG.spawn.rate). */
export function spawnRate(t) {
  const pkt = SP.rate;
  for (let i = 1; i < pkt.length; i++) {
    if (t < pkt[i][0]) {
      const [t0, r0] = pkt[i - 1], [t1, r1] = pkt[i];
      return r0 + ((r1 - r0) * (t - t0)) / (t1 - t0);
    }
  }
  const last = pkt[pkt.length - 1];
  return last[1] + (SP.overtimePerMin * (t - last[0])) / 60;
}

/** Is the point within what the player sees (with a little extra margin)? */
export function inView(s, x, y, margin = 0) {
  const k = s.camera;
  return x > k.x - margin && x < k.x + VB + margin && y > k.y - margin && y < k.y + VH + margin;
}

/** Puts a lawyer out on the map. */
export function spawnEnemy(s, type, x, y) {
  const k = F[type];
  const e = s.enemies.acquire();
  e.active = true;
  e.type = type;
  e.x = Math.min(INSIDE.x1 - k.radius, Math.max(INSIDE.x0 + k.radius, x));
  e.y = Math.min(INSIDE.y1 - k.radius, Math.max(INSIDE.y0 + k.radius, y));
  e.r = k.radius;
  e.speed = k.speed;
  e.blink = 0;
  e.mouseCd = 0;
  e.uid = ++s.nextUid;
  e.leaving = false;
  e.phase = (e.uid * 2.399) % TAU;
  e.timer = 0;
  e.shots = CONFIG.sender.shotInterval;
  e.alert = false;
  e.ctrlCd = 0;
  // The looks are drawn from a separate stream, so they never affect «Dagens vakt» (today's shift).
  e.variant = s.rng.looks.integer(CONFIG.figureVariants[type]);
  e.direction = x > s.player.x ? -1 : 1;
  if (type === 'sender') s.senderCount++;
  e.bossType = '';
  e.attack = '';
  e.tell = false;
  e.pose = -1;
  e.invuln = 0;
  e.jam = 0;
  e.phase2 = false;
  if (type === 'boss') {
    // The real values are set by spawnBoss() in bosses.js
    e.hp = k.frustration;
    e.points = k.points;
    e.damage = k.damage;
  } else {
    e.hp = k.frustration * frustrationFactor(s.time);
    if (type !== 'urgent') e.speed = k.speed * speedFactor(s.time);
    e.points = k.points;
    e.damage = k.damage * damageFactor(s.time);
    if (type === 'urgent') e.timer = k.lifetime;
    if (type === 'printer') e.timer = k.paperInterval;
    // The cap on the number of lawyers is reached: the next ones become stronger instead of more numerous.
    if (s.spared > 0 && type !== 'urgent') {
      const u = Math.min(s.spared, SP.maxSaved);
      s.spared -= u;
      e.hp *= 1 + SP.strengthPerSaved * u;
      e.damage *= 1 + SP.damagePerSaved * u;
    }
  }
  e.maxHp = e.hp;
  return e;
}

const spot = { x: 0, y: 0 };

/**
 * Finds a place to let a lawyer in: inside the map, outside the field of view and a good distance away.
 * If space is tight (the player is standing in a corner), the elevators and doors along the walls are used.
 */
function findSpawnSpot(s, minDist = SP.minDistance, maxDist = SP.maxDistance) {
  const p = s.player, rng = s.rng.spot;
  for (let i = 0; i < SP.attempt; i++) {
    const a = rng.next() * TAU, d = minDist + rng.next() * (maxDist - minDist);
    const x = Math.min(INSIDE.x1 - 12, Math.max(INSIDE.x0 + 12, p.x + Math.cos(a) * d));
    const y = Math.min(INSIDE.y1 - 12, Math.max(INSIDE.y0 + 12, p.y + Math.sin(a) * d));
    if (inView(s, x, y, 20)) continue;
    if ((x - p.x) ** 2 + (y - p.y) ** 2 < SP.absoluteMin ** 2) continue;
    spot.x = x;
    spot.y = y;
    return spot;
  }
  return doorSpot(s);
}

/** Picks a door or elevator that is not in view and not too close (otherwise the one farthest away). */
function doorSpot(s) {
  const p = s.player;
  let count = 0;
  for (const d of DOORS) if (!inView(s, d.x, d.y, 20) && (d.x - p.x) ** 2 + (d.y - p.y) ** 2 >= SP.absoluteMin ** 2) count++;
  if (count > 0) {
    let n = s.rng.spot.integer(count);
    for (const d of DOORS) {
      if (!inView(s, d.x, d.y, 20) && (d.x - p.x) ** 2 + (d.y - p.y) ** 2 >= SP.absoluteMin ** 2 && n-- === 0) {
        spot.x = d.x;
        spot.y = d.y;
        return spot;
      }
    }
  }
  let best = DOORS[0], bestD = -1;
  for (const d of DOORS) {
    const dd = (d.x - p.x) ** 2 + (d.y - p.y) ** 2;
    if (dd > bestD) {
      bestD = dd;
      best = d;
    }
  }
  spot.x = best.x;
  spot.y = best.y;
  return spot;
}

/** Lets a lawyer in if there is room under the cap, otherwise it is saved up (and the next ones become stronger). */
export function trySpawn(s, type, x, y) {
  if (s.enemies.n >= SP.maxConcurrent) {
    s.spared = Math.min(200, s.spared + 1);
    return;
  }
  spawnEnemy(s, type, x, y);
}

/**
 * The director: decides when and where lawyers appear.
 * Timing and types come from the spawn stream and are the same for everyone on the same day.
 */
export function updateDirector(s, dt) {
  const p = s.player;
  const rng = s.rng.spawn;
  const t = s.time;

  // Steady stream of lawyers.
  // While a boss is out, fewer ordinary lawyers come in (the boss is the main threat)
  const bossOut = s.boss && s.boss.active;
  s.spawnAcc += spawnRate(t) * (bossOut ? CONFIG.bosses.spawnFactor : 1) * dt;
  while (s.spawnAcc >= 1) {
    s.spawnAcc -= 1;
    const typeNum = rng.next();
    let type = 'junior';
    const vS = t >= F.senior.from ? F.senior.weight : 0;
    const vP = t >= F.printer.from ? F.printer.weight : 0;
    const A = CONFIG.sender;
    const vA = t >= A.from ? A.weight : 0;
    const x = typeNum * (F.junior.weight + vS + vP + vA);
    if (x < vS) type = 'senior';
    else if (x < vS + vP) type = 'printer';
    else if (x < vS + vP + vA) {
      // Cap: max 15 % of the active ones and max 30 at a time (otherwise it becomes a junior associate)
      const cap = Math.min(A.maxCount, Math.floor(Math.max(s.enemies.n, 20) * A.maxFraction));
      type = s.senderCount < cap ? 'sender' : 'junior';
    }
    const pl = findSpawnSpot(s);
    trySpawn(s, type, pl.x, pl.y);
  }

  // Wave events: a flock from one direction, or a ring with an opening. Adapted to the walls.
  const B = CONFIG.waves;
  if (t >= s.nextWave) {
    const kind = rng.next();
    const angle = rng.next() * TAU;
    s.nextWave = t + rng.between(B.intervalMin, B.intervalMax);
    const min = t / 60;
    if (t >= B.ringFrom && kind < B.ringChance) {
      const n = Math.min(B.ringMax, Math.round(B.ringStart + B.ringPerMin * min));
      const arc = TAU - B.ringGap;
      for (let i = 0; i < n; i++) {
        const a = angle + B.ringGap / 2 + (arc * (i + 0.5)) / n;
        const x = Math.min(INSIDE.x1 - 12, Math.max(INSIDE.x0 + 12, p.x + Math.cos(a) * B.ringRadius));
        const y = Math.min(INSIDE.y1 - 12, Math.max(INSIDE.y0 + 12, p.y + Math.sin(a) * B.ringRadius));
        // Points that end up right next to the player because the wall is near are skipped.
        if ((x - p.x) ** 2 + (y - p.y) ** 2 < 200 * 200) continue;
        trySpawn(s, 'junior', x, y);
      }
      s.events.push('ring');
    } else {
      const n = Math.min(B.flockMax, Math.round(B.flockStart + B.flockPerMin * min));
      const d = (SP.minDistance + SP.maxDistance) / 2;
      let mx = 0, my = 0, found = false;
      for (const a of [angle, angle + Math.PI, angle + Math.PI / 2, angle - Math.PI / 2]) {
        mx = Math.min(INSIDE.x1 - 40, Math.max(INSIDE.x0 + 40, p.x + Math.cos(a) * d));
        my = Math.min(INSIDE.y1 - 40, Math.max(INSIDE.y0 + 40, p.y + Math.sin(a) * d));
        if (!inView(s, mx, my, 20) && (mx - p.x) ** 2 + (my - p.y) ** 2 >= SP.absoluteMin ** 2) {
          found = true;
          break;
        }
      }
      if (!found) {
        const pl = doorSpot(s);
        mx = pl.x;
        my = pl.y;
      }
      for (let i = 0; i < n; i++) {
        // Tight spiral around the center point.
        const rr = 10 * Math.sqrt(i), aa = i * 2.4;
        trySpawn(s, 'junior', mx + Math.cos(aa) * rr, my + Math.sin(aa) * rr);
      }
    }
  }

  // Urgent case and boss use a separate stream.
  const rs = s.rng.special;
  const H = F.urgent;
  if (t >= s.nextUrgent) {
    s.nextUrgent = t + rs.between(H.intervalMin, H.intervalMax);
    const a = rs.next() * TAU;
    // Never more than one urgent case at a time.
    let exists = false;
    for (let i = 0; i < s.enemies.n; i++) if (s.enemies.items[i].active && s.enemies.items[i].type === 'urgent') exists = true;
    if (!exists) {
      let x = p.x + Math.cos(a) * H.startDistance, y = p.y + Math.sin(a) * H.startDistance;
      if (x < INSIDE.x0 + 60 || x > INSIDE.x1 - 60) x = p.x - Math.cos(a) * H.startDistance;
      if (y < INSIDE.y0 + 60 || y > INSIDE.y1 - 60) y = p.y - Math.sin(a) * H.startDistance;
      spawnEnemy(s, 'urgent', x, y);
      s.events.push('urgentSpawned');
    }
  }
  // The bosses come in a fixed order (see bosses.js)
  updateBossSchedule(s);
}

/** Drops a paper pile. If there are too many, the oldest is removed. */
function dropPaper(s, x, y) {
  const k = F.printer;
  const piles = s.paper;
  if (piles.n >= k.paperMax) {
    let oldest = 0;
    for (let i = 1; i < piles.n; i++) if (piles.items[i].life < piles.items[oldest].life) oldest = i;
    piles.removeAt(oldest);
  }
  const h = piles.acquire();
  h.x = x;
  h.y = y;
  h.life = k.paperLifetime;
}

/** Sends an email in a straight line toward where the player is standing now (not homing). */
function sendEmail(s, x, y, angle, damage) {
  const FS = CONFIG.enemyShots;
  shoot(s, 'email', x, y, angle, FS.speed, damage, FS.lifetime);
}

/** Moves all lawyers, keeps them slightly apart and checks contact with the player. */
export function updateEnemies(s, dt) {
  const p = s.player;
  const f = s.enemies;
  const out = s.hitList;
  s.senderCount = 0;
  for (let i = 0; i < f.n; i++) {
    const e = f.items[i];
    if (!e.active) continue;
    if (e.blink > 0) e.blink -= dt;
    if (e.mouseCd > 0) e.mouseCd -= dt;
    if (e.ctrlCd > 0) e.ctrlCd -= dt;
    let dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;

    if (e.type === 'urgent') {
      // Runs away from the player in a zigzag, away from the walls, and does no damage.
      e.timer -= dt;
      if (e.timer <= 0) {
        e.active = false;
        effect(s, 'poof', e.x, e.y, 0.4, e.r);
        continue;
      }
      const speed = e.speed * (d > F.urgent.slowDistance ? F.urgent.slowFactor : 1);
      e.phase += dt * 3;
      const swing = Math.sin(e.phase) * 0.6;
      let vx = -dx - dy * swing, vy = -dy + dx * swing;
      const margin = 90;
      if (e.x < INSIDE.x0 + margin) vx += (INSIDE.x0 + margin - e.x) / margin * 2;
      if (e.x > INSIDE.x1 - margin) vx -= (e.x - (INSIDE.x1 - margin)) / margin * 2;
      if (e.y < INSIDE.y0 + margin) vy += (INSIDE.y0 + margin - e.y) / margin * 2;
      if (e.y > INSIDE.y1 - margin) vy -= (e.y - (INSIDE.y1 - margin)) / margin * 2;
      const vl = Math.hypot(vx, vy) || 1;
      e.x += (vx / vl) * speed * dt;
      e.y += (vy / vl) * speed * dt;
      if (Math.abs(vx) > 0.2) e.direction = vx < 0 ? -1 : 1;
    } else if (e.type === 'sender') {
      // Keeps its distance: moves closer if too far away, backs off if too close, otherwise sideways.
      const A = CONFIG.sender;
      let vx = 0, vy = 0;
      if (d > A.distMax) {
        vx = dx;
        vy = dy;
      } else if (d < A.distMin) {
        vx = -dx;
        vy = -dy;
      } else {
        const side = (e.uid & 1) ? 1 : -1;
        vx = -dy * side * 0.5;
        vy = dx * side * 0.5;
      }
      e.x += vx * e.speed * dt;
      e.y += vy * e.speed * dt;
      e.direction = dx < 0 ? -1 : 1;
      s.senderCount++;
      // Email: only when the sender is on screen, so the alert can always be seen.
      if (inView(s, e.x, e.y, -8)) {
        e.shots -= dt;
        e.alert = e.shots <= A.alert;
        if (e.shots <= 0) {
          if (s.enemyShots.n < CONFIG.enemyShots.max) {
            sendEmail(s, e.x, e.y - 4, Math.atan2(p.y - e.y, p.x - e.x), e.damage);
            e.shots = Math.max(A.shotIntervalMin, A.shotInterval / (1 + A.shotFasterPerMin * (s.time / 60)));
            e.alert = false;
          } else e.shots = 0; // waits until there is room
        }
      } else {
        e.shots = Math.max(e.shots, A.alert + 0.3);
        e.alert = false;
      }
      // Soft pushing so they don't stand on top of each other
      const n = s.grid.find(e.x, e.y, e.r * 0.8, out, 6);
      for (let j = 0; j < n; j++) {
        const o = f.items[out[j]];
        if (o === e) continue;
        const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy), min = (e.r + o.r) * 0.8;
        if (od < min && od > 0.01) {
          e.x += (ox / od) * (min - od) * 0.25;
          e.y += (oy / od) * (min - od) * 0.25;
        }
      }
    } else if (e.type === 'boss') {
      // The bosses move and attack on their own (bosses.js)
      updateBoss(s, e, dt, dx, dy);
      if (s.status !== 'running') return;
    } else {
      if (e.type === 'printer') {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = F.printer.paperInterval;
          if (inView(s, e.x, e.y, 40)) dropPaper(s, e.x, e.y);
        }
      }
      e.x += dx * e.speed * dt;
      e.y += dy * e.speed * dt;
      if (Math.abs(dx) > 0.15) e.direction = dx < 0 ? -1 : 1;

      // Soft pushing so the lawyers don't stand on top of each other (max 6 neighbors, so it never gets slow).
      const n = s.grid.find(e.x, e.y, e.r * 0.8, out, 6);
      for (let j = 0; j < n; j++) {
        const o = f.items[out[j]];
        if (o === e) continue;
        const ox = e.x - o.x, oy = e.y - o.y;
        const od = Math.hypot(ox, oy);
        const min = (e.r + o.r) * 0.8;
        if (od < min && od > 0.01) {
          const shove = (min - od) * 0.25;
          e.x += (ox / od) * shove;
          e.y += (oy / od) * shove;
        }
      }
    }

    // The outer walls stop the lawyers too.
    if (e.x < INSIDE.x0 + e.r) e.x = INSIDE.x0 + e.r;
    else if (e.x > INSIDE.x1 - e.r) e.x = INSIDE.x1 - e.r;
    if (e.y < INSIDE.y0 + e.r) e.y = INSIDE.y0 + e.r;
    else if (e.y > INSIDE.y1 - e.r) e.y = INSIDE.y1 - e.r;

    // Contact with the player.
    if (e.active && !e.leaving && e.damage > 0) {
      const bx = p.x - e.x, by = p.y - e.y, rr = e.r + p.r - 2;
      if (bx * bx + by * by < rr * rr) damagePlayer(s, e.type === 'boss' ? bossContactDamage(e) : e.damage);
    }
  }
}

/**
 * Gives a lawyer help (lowers the frustration). When it reaches zero, the lawyer becomes happy.
 * @param {string} source which weapon the help came from (for the statistics)
 */
export function help(s, e, amount, source) {
  if (!e.active || e.leaving) return;
  let m = amount * s.player.mod.help;
  if (e.type === 'boss') {
    // «Vi ringer deg tilbake» ("We'll call you back"): no help gets through. Paper jam: double help.
    m *= bossHelpFactor(e);
    if (m <= 0) return;
  }
  s.stat.helpPerWeapon[source] = (s.stat.helpPerWeapon[source] || 0) + Math.min(e.hp, m);
  e.hp -= m;
  e.blink = 0.09;
  if (e.hp <= 0) becomesHappy(s, e);
  else if (e.type === 'boss') checkBossPhase(s, e);
}

/**
 * The lawyer is satisfied. From this moment it can neither do damage, be hit, nor count as an enemy.
 * What is shown (smile, thumbs up, pixel cloud) is a pure effect. Only the ticket is left behind.
 */
export function becomesHappy(s, e) {
  if (!e.active) return;
  e.active = false;
  e.hp = 0;
  const G = CONFIG.happy;
  s.happyNow++;
  const shortened = s.happyNow > G.manyAtOnce;
  // Bosses get a longer happy animation in the same style as the lawyers
  const boss = e.type === 'boss';
  effect(s, 'happy', e.x, e.y, boss ? 1.6 : shortened ? G.shortDuration : G.duration, boss ? 1.2 : shortened ? G.shortSmile : G.smile, TYPE_CODE[figureType(e)], e.variant, false, '', e.direction);
  s.helped++;
  s.stat.perType[e.type] = (s.stat.perType[e.type] || 0) + 1;
  s.events.push('happy');

  if (e.type === 'urgent') {
    const points = givePoints(s, e.points);
    effect(s, 'text', e.x, e.y - 20, 1.2, 0, 0, 0, false, '+' + points);
    s.events.push('urgentHappy');
  } else if (e.type === 'boss') {
    const points = givePoints(s, e.points);
    effect(s, 'text', e.x, e.y - 40, 1.6, 0, 0, 0, false, '+' + points);
    s.stat.bossesHelped++;
    // The boss gives a points bonus and a guaranteed «Ny PC» ("New PC"; not an energy drink).
    dropPickup(s, 'pc', e.x, e.y + 10);
    bossHelped(s, e);
  } else {
    dropTicket(s, e.x, e.y, e.points);
    if (s.rng.drops.next() < CONFIG.newPc.dropChance) dropPickup(s, 'pc', e.x, e.y);
  }
  registerHelped(s);
}

/** «Ny PC» ("New PC"): all ordinary lawyers on screen become happy. Bosses and urgent cases get a lot of help. */
export function newPc(s) {
  const f = s.enemies;
  const n = f.n;
  for (let i = 0; i < n; i++) {
    const e = f.items[i];
    if (!e.active || e.leaving || !inView(s, e.x, e.y, 0)) continue;
    if (e.type === 'boss' || e.type === 'urgent') help(s, e, CONFIG.newPc.helpToSpecial, 'newPcFx');
    else becomesHappy(s, e);
  }
  const p = s.player;
  effect(s, 'newPcFx', p.x, p.y, 0.5, 400, 0, 0, true);
  s.events.push('newPcFx');
}

/** Clears away lawyers that are no longer active. */
export function pruneEnemies(s) {
  const f = s.enemies;
  for (let i = f.n - 1; i >= 0; i--) if (!f.items[i].active) f.removeAt(i);
}

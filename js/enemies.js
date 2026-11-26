// @ts-check
// The lawyers: who shows up when and where, how they move, and what happens when they become happy.
import { CONFIG, WEAPON_TAG } from './config.js';
import { TAU } from './utils.js';
import { effect } from './effects.js';
import { givePoints, registerHelped } from './score.js';
import { damagePlayer } from './player.js';
import { dropTicket, dropPickup } from './tickets.js';
import { INSIDE, DOORS } from './map.js';
import { updateBoss, updateBossSchedule, bossContactDamage, bossHelpFactor, checkBossPhase, bossHelped, shoot, updateFriend } from './bosses.js';

const F = CONFIG.enemies;
const SP = CONFIG.spawn;
const EL = CONFIG.elites;
const FX = CONFIG.upgrades.effects;
const EV = CONFIG.events;
const VB = CONFIG.view.width, VH = CONFIG.view.height;

/** Elite trait codes stored on the enemy (numbers, never text, so effects and the grid stay allocation-free). */
export const ELITE = { none: 0, aura: 1, split: 2, rush: 3 };
export const ELITE_TRAIT = ['', 'aura', 'split', 'rush'];
/** Max hit numbers on screen at once (performance). */
export const MAX_HITS = 120;
/** Hits on the same lawyer within this many seconds are merged into one growing number. */
const HIT_MERGE = 0.25;

/** Type codes used by the happy animation (effects store numbers, not text). */
export const TYPE_CODE = { junior: 0, printer: 1, senior: 2, urgent: 3, boss: 4, sender: 5, nordic: 6, printerBoss: 7, johan: 8, frida: 9, friend: 10 };
export const TYPE_NAMES = ['junior', 'printer', 'senior', 'urgent', 'boss', 'sender', 'nordic', 'printerBoss', 'johan', 'frida', 'friend'];

/** The figure type used to draw an enemy (the bosses have their own figures). */
export function figureType(e) {
  return e.type === 'boss' ? e.bossType : e.type;
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
    /** Elite («Partner»): which trait (see ELITE), the rush timer and the dash time left. */
    elite: 0, rushT: 0, dashT: 0,
    /** When the lawyer was last helped (game time) – the frustration bar is shown for a moment after. */
    lastHit: -9,
    /** The hit number that is still growing for this lawyer (visual only). @type {any} */
    hitFx: null,
    /** Effect modifiers (version 6): seconds left of «Venter på IT» and how much slower; help still «in the queue». */
    slowT: 0, slowBy: 0, lingerT: 0, linger: 0, lingerSrc: '',
    /** «Purring»: seconds left of taking more help, and how much more. */
    markT: 0, markBy: 0,
    /** Fiske-Frida's friends: the uid of the boss they follow, and which side they walk on (0 or 1). */
    bossUid: 0, slot: 0,
  };
}

/** Chance that an ordinary lawyer spawns as an elite at time t. */
export function eliteChance(t) {
  if (t < EL.from) return 0;
  return Math.min(EL.chanceMax, EL.chanceStart + EL.chancePerMin * ((t - EL.from) / 60));
}

export function makePaper() {
  return { x: 0, y: 0, life: 0 };
}

function overtime(min) {
  const sk = CONFIG.scaling;
  return min > sk.overtimeFromMin ? Math.pow(sk.overtimeGrowthPerMin, min - sk.overtimeFromMin) : 1;
}
/** Frustration: grows linearly per minute after the calm start (version 6), then steeply in overtime. */
export function frustrationFactor(t) {
  const sk = CONFIG.scaling;
  const min = t / 60;
  return (1 + sk.frustrationPerMin * Math.max(0, min - sk.startAfterMin)) * overtime(min);
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

/**
 * Puts a lawyer out on the map.
 * @param {number} [elite] 0 = ordinary, otherwise an elite trait (see ELITE): much tougher, with a visible bar.
 */
export function spawnEnemy(s, type, x, y, elite = 0) {
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
  e.elite = elite;
  e.rushT = EL.traits.rush.every;
  e.dashT = 0;
  e.lastHit = -9;
  e.hitFx = null;
  e.slowT = 0;
  e.slowBy = 0;
  e.lingerT = 0;
  e.linger = 0;
  e.markT = 0;
  e.markBy = 0;
  e.bossUid = 0;
  e.slot = 0;
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
    if (s.spared > 0 && type !== 'urgent' && type !== 'friend') {
      const u = Math.min(s.spared, SP.maxSaved);
      s.spared -= u;
      e.hp *= 1 + SP.strengthPerSaved * u;
      e.damage *= 1 + SP.damagePerSaved * u;
    }
    if (elite) {
      e.hp *= EL.frustration;
      e.damage *= EL.damage;
      e.speed *= EL.speed;
      e.points = Math.round(e.points * EL.points);
      e.r += EL.radiusAdd;
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
export function trySpawn(s, type, x, y, elite = 0) {
  if (s.enemies.n >= SP.maxConcurrent) {
    s.spared = Math.min(200, s.spared + 1);
    return;
  }
  spawnEnemy(s, type, x, y, elite);
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
    // Elites («Partnere»): rare and tough, never a sender (they keep their distance anyway)
    let elite = 0;
    if (type !== 'sender' && t >= EL.from && s.eliteCount < EL.maxConcurrent && rng.next() < eliteChance(t)) {
      elite = 1 + rng.integer(3);
      s.eliteCount++;
    }
    const pl = findSpawnSpot(s);
    trySpawn(s, type, pl.x, pl.y, elite);
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
      spawnFlock(s, 'junior', Math.min(B.flockMax, Math.round(B.flockStart + B.flockPerMin * min)), angle);
    }
  }
  updateEvents(s);

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

/** A flock of lawyers of one type from one direction (outside the view), in a tight spiral around a centre point. */
function spawnFlock(s, type, n, angle, elite = 0) {
  const p = s.player;
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
    trySpawn(s, type, mx + Math.cos(aa) * rr, my + Math.sin(aa) * rr, elite);
  }
}

/**
 * EVENTS (version 6): the scheduled ones fire at fixed times on every shift, the rare ones are rolled once a minute
 * from the events stream. Each event is a flock, a few partners, a mood (speed/damage factor for a while) or tickets.
 */
function updateEvents(s) {
  const t = s.time;
  // A timed mood («Kaffepause», «Serverkrasj») ends
  if (s.mood.until > 0 && t >= s.mood.until) {
    s.mood.speed = 1;
    s.mood.damage = 1;
    s.mood.until = 0;
  }
  const bossOut = !!(s.boss && s.boss.active);
  const gapOk = t - s.lastEvent >= EV.minGap;
  for (let i = 0; i < EV.scheduled.length; i++) {
    const sc = EV.scheduled[i];
    if (t < s.eventTimes[i]) continue;
    if (!gapOk || (EV.waitForBoss && bossOut)) {
      s.eventTimes[i] = t + 5;
      continue;
    }
    s.eventTimes[i] = sc.repeat > 0 ? s.eventTimes[i] + sc.repeat : 1e9;
    fireEvent(s, sc.id);
    return;
  }
  if (t >= s.nextRareCheck) {
    s.nextRareCheck += 60;
    const rng = s.rng.events;
    // The same number of rolls every minute, so the stream stays in step no matter what happens
    let chosen = '';
    for (const r of EV.rare) if (rng.next() < r.chance && t >= r.from && !chosen) chosen = r.id;
    if (chosen && gapOk && !(EV.waitForBoss && bossOut && chosen === 'partnerMeeting')) fireEvent(s, chosen);
  }
}

/** Carries out one event. The direction comes from the events stream. */
export function fireEvent(s, id) {
  const k = EV.defs[id];
  const rng = s.rng.events;
  const p = s.player;
  const min = s.time / 60;
  s.lastEvent = s.time;
  if (id === 'lunchRush' || id === 'printerQueue') {
    spawnFlock(s, k.type, Math.min(k.max, Math.round(k.count + k.perMin * min)), rng.next() * TAU);
  } else if (id === 'partnerMeeting') {
    const n = Math.min(k.count, EL.maxConcurrent - s.eliteCount);
    const angle = rng.next() * TAU;
    for (let i = 0; i < n; i++) {
      const trait = 1 + rng.integer(3);
      spawnFlock(s, 'senior', 1, angle + i * 0.3, trait);
      s.eliteCount++;
    }
  } else if (id === 'coffeeBreak' || id === 'serverCrash') {
    s.mood.speed = k.speed;
    s.mood.damage = k.damage;
    s.mood.until = s.time + k.duration;
  } else if (id === 'freeLunch') {
    for (let i = 0; i < k.tickets; i++) {
      const a = rng.next() * TAU, d = 30 + rng.next() * k.radius;
      dropTicket(s, Math.min(INSIDE.x1 - 10, Math.max(INSIDE.x0 + 10, p.x + Math.cos(a) * d)), Math.min(INSIDE.y1 - 10, Math.max(INSIDE.y0 + 10, p.y + Math.sin(a) * d)), k.value);
    }
  }
  s.stat.events++;
  s.events.push('event:' + id);
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
  // «Bullet time» from The Matrix's code rain: everything hostile moves slower (1 = normal)
  const ts = s.timeScale;
  s.senderCount = 0;
  s.eliteCount = 0;
  s.elites.length = 0;
  for (let i = 0; i < f.n; i++) {
    const e = f.items[i];
    if (!e.active) continue;
    if (e.elite) {
      s.eliteCount++;
      if (e.elite === ELITE.aura) s.elites.push(e);
    }
    if (e.blink > 0) e.blink -= dt;
    if (e.mouseCd > 0) e.mouseCd -= dt;
    if (e.ctrlCd > 0) e.ctrlCd -= dt;
    if (e.markT > 0) e.markT -= dt;
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
      const speed = e.speed * ts * (d > F.urgent.slowDistance ? F.urgent.slowFactor : 1);
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
      e.x += vx * e.speed * ts * dt;
      e.y += vy * e.speed * ts * dt;
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
    } else if (e.type === 'friend') {
      // Fiske-Frida's friends walk close behind her, one on each side (bosses.js decides when they send emails)
      updateFriend(s, e, dt, dx, dy);
    } else {
      if (e.type === 'printer') {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = F.printer.paperInterval;
          if (inView(s, e.x, e.y, 40)) dropPaper(s, e.x, e.y);
        }
      }
      // «Venter på IT» (slowed by an effect modifier), «Kaffepause» / «Serverkrasj» (the mood of the office), bullet time
      let speed = e.speed * s.mood.speed * ts;
      if (e.slowT > 0) {
        e.slowT -= dt;
        speed *= 1 - e.slowBy;
      }
      // «Saken ligger i køen»: part of the help comes once more a moment later
      if (e.lingerT > 0) {
        e.lingerT -= dt;
        if (e.lingerT <= 0 && e.linger > 0) {
          const amount = e.linger;
          e.linger = 0;
          help(s, e, amount, e.lingerSrc, null, true);
          if (!e.active) continue;
        }
      }
      if (e.elite === ELITE.rush) {
        // «Har hastverk»: a warning («!»), then a short dash straight at where the player stood.
        const R = EL.traits.rush;
        if (e.dashT > 0) {
          e.dashT -= dt;
          e.x += e.vx * ts * dt;
          e.y += e.vy * ts * dt;
        } else {
          e.rushT -= dt;
          e.alert = e.rushT <= R.tell;
          if (e.rushT <= 0) {
            e.rushT = R.every;
            e.alert = false;
            e.dashT = R.duration;
            e.vx = dx * speed * R.speed;
            e.vy = dy * speed * R.speed;
          }
          e.x += dx * speed * dt;
          e.y += dy * speed * dt;
        }
      } else {
        e.x += dx * speed * dt;
        e.y += dy * speed * dt;
      }
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
      if (bx * bx + by * by < rr * rr) damagePlayer(s, e.type === 'boss' ? bossContactDamage(e) : e.damage * s.mood.damage);
    }
  }
}

/** Reused list for the «Sprut» effect, and a guard so splash never splashes again. */
const SPLASH_LIST = /** @type {number[]} */ ([]);
let splashing = false;

/**
 * Gives a lawyer help (lowers the frustration). When it reaches zero, the lawyer becomes happy.
 * @param {string} source which weapon the help came from (for the statistics and the tag passives)
 * @param {any} [fx] the weapon's effect modifiers (levels per effect), or null
 * @param {boolean} [plain] true for help that must not trigger effects again (linger, splash)
 */
export function help(s, e, amount, source, fx = null, plain = false) {
  if (!e.active || e.leaving) return;
  const mod = s.player.mod;
  let m = amount * mod.help;
  // The tag passives («Kastekurs» …): +help for every weapon of that class
  const tag = WEAPON_TAG[source];
  if (tag) m *= mod.tag[tag];
  // Critical hit («Kaffemaskin», «Ekstra kaffe»): own random stream, so it is the same for everyone on the same day.
  let crit = false;
  const critChance = mod.crit + (fx && fx.crit ? FX.crit.value * fx.crit : 0);
  if (critChance > 0 && s.rng.crit.next() < critChance) {
    m *= mod.critMult;
    crit = true;
  }
  if (e.type === 'boss') {
    // «Vi ringer deg tilbake» ("We'll call you back"): no help gets through. Paper jam: double help.
    m *= bossHelpFactor(e);
    if (m <= 0) return;
  }
  // «Purring»: the lawyer takes more help from everything for a while. «Eskalering»: more help to partners and bosses.
  if (e.markT > 0) m *= 1 + e.markBy;
  if (fx && fx.escalation && (e.elite || e.type === 'boss')) m *= 1 + FX.escalation.value * fx.escalation;
  // Partner aura: other lawyers near an aura partner take only part of the help.
  const A = s.elites;
  for (let i = 0; i < A.length; i++) {
    const a = A[i];
    if (a === e) continue;
    const R = EL.traits.aura.radius;
    if ((a.x - e.x) ** 2 + (a.y - e.y) ** 2 < R * R) {
      m *= EL.traits.aura.helpFactor;
      break;
    }
  }
  // «dealt» is what the lawyer actually needed (statistics, linger, splash); the hit number shows the full hit,
  // overkill included, so a big weapon looks big even on a junior associate.
  const dealt = Math.min(e.hp, m);
  s.stat.helpPerWeapon[source] = (s.stat.helpPerWeapon[source] || 0) + dealt;
  e.hp -= m;
  e.blink = 0.09;
  e.lastHit = s.time;
  hitNumber(s, e, m, crit, source);
  if (fx && !plain) applyEffects(s, e, dealt, source, fx);
  if (e.hp <= 0) becomesHappy(s, e);
  else if (e.type === 'boss') checkBossPhase(s, e);
}

/**
 * The effect modifiers of a weapon, after a hit: slow, knockback, linger and splash. Bosses are only slowed and
 * pushed by nothing. Splash helps a few neighbours with plain help (no effects, no recursion).
 */
function applyEffects(s, e, dealt, source, fx) {
  const boss = e.type === 'boss';
  if (fx.slow && !boss) {
    e.slowT = FX.slow.time;
    e.slowBy = Math.min(FX.slow.maxSlow, FX.slow.value * fx.slow);
  }
  if (fx.knockback && !boss && e.type !== 'urgent') {
    const p = s.player;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    const push = FX.knockback.px * fx.knockback;
    e.x += (dx / d) * push;
    e.y += (dy / d) * push;
  }
  if (fx.pull && !boss && e.type !== 'urgent') {
    const p = s.player;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    const pull = Math.min(Math.max(0, d - p.r - e.r), FX.pull.px * fx.pull);
    e.x += (dx / d) * pull;
    e.y += (dy / d) * pull;
  }
  if (fx.mark && e.hp > 0) {
    if (e.markT <= 0) e.markBy = 0;
    e.markT = FX.mark.time;
    e.markBy = Math.max(e.markBy, FX.mark.value * fx.mark);
  }
  if (fx.linger && e.hp > 0) {
    e.linger += dealt * FX.linger.fraction * fx.linger;
    e.lingerT = FX.linger.delay;
    e.lingerSrc = source;
  }
  if (fx.splash && !splashing) {
    splashing = true;
    const R = FX.splash.radius + 4 * fx.splash;
    const n = s.grid.find(e.x, e.y, R, SPLASH_LIST, FX.splash.maxNeighbors);
    const amount = dealt * FX.splash.fraction;
    for (let i = 0; i < n; i++) {
      const o = s.enemies.items[SPLASH_LIST[i]];
      if (o !== e) help(s, o, amount, source, null, true);
    }
    splashing = false;
  }
}

/** Weapon id → small number, so the hit number can carry which icon to show without storing text. */
const SOURCE_INDEX = new Map(Object.keys(CONFIG.weapons).map((id, i) => [id, i]));

/**
 * A floating hit number («47», gold when critical) over the lawyer. Visual only. Hits on the same lawyer
 * within a short window are merged into one growing number, and there is a hard cap on how many exist.
 */
function hitNumber(s, e, amount, crit, source) {
  let fx = e.hitFx;
  if (fx && fx.type === 'hit' && fx.b === e.uid && fx.t < HIT_MERGE) {
    fx.r += amount;
    fx.x = e.x;
    fx.y = e.y - e.r * 2 - 6;
    if (crit) fx.c = 1;
    return;
  }
  if (s.hitCount >= MAX_HITS) return;
  fx = effect(s, 'hit', e.x, e.y - e.r * 2 - 6, 0.75, amount, SOURCE_INDEX.get(source) ?? -1, e.uid, false, '', crit ? 1 : 0);
  if (!fx) return;
  s.hitCount++;
  e.hitFx = fx;
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
  // «Takknemlige advokater»: a little energy for every lawyer helped
  const sp = s.player;
  if (sp.mod.lifesteal > 0 && sp.energy < sp.maxEnergy) sp.energy = Math.min(sp.maxEnergy, sp.energy + sp.mod.lifesteal);
  s.stat.perType[e.type] = (s.stat.perType[e.type] || 0) + 1;
  if (e.elite) s.stat.elitesHelped++;
  s.events.push('happy');

  if (e.type === 'urgent') {
    const points = givePoints(s, e.points);
    effect(s, 'text', e.x, e.y - 20, 1.2, 0, 0, 0, false, '+' + points);
    s.events.push('urgentHappy');
  } else if (e.type === 'boss') {
    const points = givePoints(s, e.points);
    effect(s, 'text', e.x, e.y - 40, 1.6, 0, 0, 0, false, '+' + points);
    s.stat.bossesHelped++;
    // The boss gives a points bonus, a guaranteed «Ny PC» ("New PC"; not an energy drink) and a supplier package.
    dropPickup(s, 'pc', e.x - 14, e.y + 10);
    dropPickup(s, 'package', e.x + 16, e.y + 12, e.bossType === 'johan' ? CONFIG.package.johanCount : CONFIG.package.bossCount);
    bossHelped(s, e);
  } else if (e.type === 'friend') {
    // One of Fiske-Frida's friends: extra points if she is helped on her own (none when Frida is helped first)
    if (e.points > 0) {
      const points = givePoints(s, e.points);
      effect(s, 'text', e.x, e.y - 26, 1.2, 0, 0, 0, false, '+' + points);
    }
    s.events.push('friendHappy');
  } else if (e.elite) {
    // A partner drops 1–5 tickets (drops stream) and now and then a supplier package
    const D = CONFIG.eliteDrops;
    const n = D.ticketsMin + s.rng.drops.integer(D.ticketsMax - D.ticketsMin + 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + e.phase;
      dropTicket(s, e.x + (n > 1 ? Math.cos(a) * 10 : 0), e.y + (n > 1 ? Math.sin(a) * 8 : 0), Math.max(1, Math.round(e.points * D.ticketFraction)));
    }
    if (s.rng.drops.next() < CONFIG.package.eliteChance) dropPickup(s, 'package', e.x, e.y + 6, CONFIG.package.eliteCount);
    if (e.elite === ELITE.split) splitPartner(s, e);
  } else {
    dropTicket(s, e.x, e.y, e.points);
    if (s.rng.drops.next() < CONFIG.newPc.dropChance) dropPickup(s, 'pc', e.x, e.y);
    // «Helsekjeks»: now and then a small cookie with a little energy (drops stream, capped on the map)
    if (s.rng.drops.next() < CONFIG.cookie.chance && countPickups(s, 'cookie') < CONFIG.cookie.max) dropPickup(s, 'cookie', e.x + 5, e.y + 4);
  }
  registerHelped(s);
}

/** How many pickups of one type are on the map. */
export function countPickups(s, type) {
  let n = 0;
  for (let i = 0; i < s.pickups.n; i++) if (s.pickups.items[i].type === type) n++;
  return n;
}

/** «Delegerer»: the partner hands the problem to a few junior associates. */
function splitPartner(s, e) {
  const n = EL.traits.split.count;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + e.phase;
    trySpawn(s, 'junior', e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14);
  }
  effect(s, 'poof', e.x, e.y, 0.4, 10);
}

/** «Ny PC» ("New PC"): all ordinary lawyers on screen become happy. Bosses and urgent cases get a lot of help. */
export function newPc(s) {
  const f = s.enemies;
  const n = f.n;
  for (let i = 0; i < n; i++) {
    const e = f.items[i];
    if (!e.active || e.leaving || !inView(s, e.x, e.y, 0)) continue;
    if (e.type === 'boss' || e.type === 'urgent' || e.type === 'friend') help(s, e, CONFIG.newPc.helpToSpecial, 'newPcFx');
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

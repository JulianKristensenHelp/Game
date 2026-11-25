// @ts-check
// The bosses (version 4): a fixed order with Johan last, a countdown that gets you fired («Du har fått sparken!»),
// and each boss's own attacks. Every attack is warned before it comes (a pose, a light or a «!»), so it can be avoided.
// All boss projectiles live in the same pool as the emails and count toward the cap of CONFIG.enemyShots.max.
// Like the rest of the game logic, this uses no screen, sound or Math.random(): «Dagens vakt» (today's shift) stays the same for everyone.
import { CONFIG } from './config.js';
import { TAU } from './utils.js';
import { effect } from './effects.js';
import { damagePlayer } from './player.js';
import { spawnEnemy, inView, trySpawn } from './enemies.js';
import { INSIDE } from './map.js';
import { POSE } from './figures.js';

const B = CONFIG.bosses;
const SHOTS = CONFIG.enemyShots;

/** The attacks each boss can choose from, in priority order. Each has its own cooldown slot (e.cds[i]). */
const ATTACKS = {
  nordic: ['queue', 'forward', 'callBack'],
  printerBoss: ['cmyk', 'printJob'],
  deadline: ['emails'],
  johan: ['sprint', 'calendar', 'meeting', 'forwarded'],
};

/** Cooldown (seconds) for an attack. */
function cooldown(type, id) {
  const k = B[type];
  if (id === 'forwarded') return k.forwarded.cooldown;
  return k[id].cooldown;
}

/** The pose a boss holds while warning about (and doing) an attack. */
function poseFor(type, id) {
  if (type === 'nordic') return id === 'queue' ? POSE.raise : id === 'forward' ? POSE.point : POSE.clap;
  if (type === 'printerBoss') return id === 'cmyk' ? POSE.point : POSE.raise;
  if (type === 'johan') return id === 'sprint' ? POSE.point : id === 'calendar' ? POSE.raise : id === 'meeting' ? POSE.clap : POSE.raise;
  return -1;
}

// ---------- The order ----------

/** The boss that is out right now (or null). There is never more than one at a time. */
export function activeBoss(s) {
  const e = s.boss;
  return e && e.active && e.type === 'boss' ? e : null;
}

/** Which boss comes as number n (0 = the first). After the schedule, Johan comes back. */
export function bossTypeAt(n) {
  return n < B.schedule.length ? B.schedule[n].type : 'johan';
}

/** When boss number n arrives (seconds). */
export function bossTimeAt(n) {
  const sc = B.schedule;
  return n < sc.length ? sc[n].at : sc[sc.length - 1].at + B.repeatEvery * (n - sc.length + 1);
}

/** Lets the next boss in when it is time (waits if one is still out, which only happens in debug mode). */
export function updateBossSchedule(s) {
  if (s.time < s.nextBoss || activeBoss(s)) return;
  spawnBoss(s, bossTypeAt(s.bossNo));
}

/** Puts boss number s.bossNo out on the map, a good distance from the player. */
export function spawnBoss(s, type) {
  const p = s.player, rs = s.rng.special;
  const a = rs.next() * TAU, D = B.spawnDistance;
  let x = p.x + Math.cos(a) * D, y = p.y + Math.sin(a) * D;
  if (x < INSIDE.x0 + 40 || x > INSIDE.x1 - 40) x = p.x - Math.cos(a) * D;
  if (y < INSIDE.y0 + 40 || y > INSIDE.y1 - 40) y = p.y - Math.sin(a) * D;
  const e = spawnEnemy(s, 'boss', x, y);
  const k = B[type];
  // Johan comes back every 3 minutes after the first time, stronger each time.
  let returnNo = 0;
  for (const b of s.stat.bossLog) if (b.type === 'johan') returnNo++;
  const R = type === 'johan' ? k.returns : { frustration: 1, damage: 1, points: 1 };
  e.bossType = type;
  e.returnNo = returnNo;
  e.r = k.radius;
  e.speed = k.speed;
  e.hp = e.maxHp = k.frustration * Math.pow(R.frustration, returnNo);
  // The bosses' damage grows a little with time, but not with the steep overtime curve (they are fair fights).
  e.damage = k.damage * Math.pow(R.damage, returnNo) * (1 + CONFIG.scaling.damagePerMin * (s.time / 60));
  e.points = Math.round(k.points * Math.pow(R.points, returnNo));
  e.timer = k.deadline;
  e.deadline = k.deadline;
  e.fightT = 0;
  e.attack = '';
  e.tell = false;
  e.attackT = 0;
  e.pose = -1;
  e.invuln = 0;
  e.jam = 0;
  e.jamCd = type === 'printerBoss' ? k.jam.every : 0;
  e.phase2 = false;
  e.alt = 0;
  e.vx = 0;
  e.vy = 0;
  const list = ATTACKS[type];
  for (let i = 0; i < e.cds.length; i++) e.cds[i] = i < list.length ? cooldown(type, list[i]) * (0.25 + 0.3 * i) : 0;
  if (type !== 'deadline') e.variant = 0;
  s.boss = e;
  s.bossNo++;
  s.nextBoss = bossTimeAt(s.bossNo);
  s.stat.bossesTotal++;
  s.stat.bossLog.push({ type, helped: false, time: s.time, helpedAt: 0, returnNo });
  s.events.push('boss:' + type);
  return e;
}

// ---------- One boss, one update ----------

/** Contact damage right now (Johan's sprint hits harder). */
export function bossContactDamage(e) {
  return e.attack === 'sprint' && !e.tell ? e.damage * B.johan.sprint.damage : e.damage;
}

/**
 * Moves the boss, counts down and runs its attacks.
 * (dx, dy) is the direction to the player (length 1), d the distance.
 */
export function updateBoss(s, e, dt, dx, dy) {
  const k = B[e.bossType];
  const p = s.player;
  e.fightT += dt;

  // The countdown. When it runs out the player is fired – unless debug immortality is on.
  e.timer -= dt;
  if (e.timer <= 0) {
    if (s.debug.immortal) e.timer = e.deadline;
    else {
      fired(s, e);
      return;
    }
  }
  if (e.invuln > 0) e.invuln -= dt;

  // «Papirstopp!» (paper jam): stuck for a while, takes double help
  if (e.bossType === 'printerBoss') {
    if (e.jam > 0) {
      e.jam -= dt;
      e.pose = e.jam > 0 ? POSE.clap : -1;
      return;
    }
    if (!e.attack) {
      e.jamCd -= dt;
      if (e.jamCd <= 0) {
        e.jamCd = k.jam.every;
        e.jam = k.jam.duration;
        e.pose = POSE.clap;
        s.events.push('jam');
        return;
      }
    }
  }

  // Movement: toward the player, except while warning, sprinting or on «Vi ringer deg tilbake» ("We'll call you back").
  const fast = e.phase2 ? B.johan.phase2.speed : 1;
  if (e.attack === 'sprint' && !e.tell) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  } else if (!e.attack || (e.attack === 'printJob' && !e.tell) || (e.attack === 'emails' && !e.tell)) {
    // Far away, the boss jogs to catch up (so the fight actually happens, even if the player keeps running)
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    const jog = d > B.catchUpFrom ? B.catchUpSpeed : 1;
    e.x += dx * e.speed * fast * jog * dt;
    e.y += dy * e.speed * fast * jog * dt;
  }
  if (Math.abs(e.attack === 'sprint' ? e.vx : dx) > 0.15) e.direction = (e.attack === 'sprint' ? e.vx : dx) < 0 ? -1 : 1;

  // Attacks
  if (e.attack) {
    e.attackT -= dt;
    if (e.tell) {
      if (e.attackT <= 0) {
        e.tell = false;
        e.alert = false;
        startAttack(s, e);
      }
    } else {
      continueAttack(s, e, dt);
      if (e.attackT <= 0) {
        e.attack = '';
        e.pose = -1;
      }
    }
    return;
  }
  const list = ATTACKS[e.bossType];
  const faster = e.phase2 ? B.johan.phase2.cooldowns : 1;
  for (let i = 0; i < list.length; i++) if (e.cds[i] > 0) e.cds[i] -= dt;
  if (e.fightT < B.calmStart || !inView(s, e.x, e.y, -8)) return;
  for (let i = 0; i < list.length; i++) {
    const id = list[i];
    if (e.cds[i] > 0) continue;
    if (id === 'forwarded' && !e.phase2) continue;
    if (id === 'meeting' && s.enemies.n > CONFIG.spawn.maxConcurrent - 10) continue;
    // Wait for room under the cap on enemy projectiles
    if (id !== 'callBack' && id !== 'sprint' && id !== 'meeting' && s.enemyShots.n > SHOTS.max - 6) continue;
    e.cds[i] = cooldown(e.bossType, id) * faster;
    e.attack = id;
    e.pose = poseFor(e.bossType, id);
    e.aimX = p.x;
    e.aimY = p.y;
    if (id === 'forwarded') {
      // Johan alternates between the Nørdic consultant's ticket and the printer's cartridges
      e.attack = e.alt++ % 2 === 0 ? 'forward' : 'cmyk';
    }
    if (id === 'callBack') {
      // Not dangerous, so no warning: the headset comes off, and he cannot be helped for a while
      e.tell = false;
      e.attackT = k.callBack.duration;
      e.invuln = k.callBack.duration;
    } else {
      e.tell = true;
      e.alert = true;
      e.attackT = B.tell;
    }
    s.events.push('tell');
    return;
  }
}

/** The warning is over: the attack starts now. */
function startAttack(s, e) {
  const a = Math.atan2(e.aimY - e.y, e.aimX - e.x);
  const N = B.nordic, P = B.printerBoss, J = B.johan;
  switch (e.attack) {
    case 'queue': {
      // «Du er nummer 47 i køen» ("You are number 47 in the queue"): hold-music notes in a ring, spreading slowly
      const n = Math.min(N.queue.notes, SHOTS.max - s.enemyShots.n);
      for (let i = 0; i < n; i++) shoot(s, 'note', e.x, e.y - 8, a + (i * TAU) / n, N.queue.speed, 0, N.queue.lifetime);
      e.attackT = 0.4;
      break;
    }
    case 'forward':
      // «Saken er sendt videre» ("The case has been forwarded"): one ticket that splits into three
      shoot(s, 'ticket', e.x, e.y - 10, a, N.forward.speed, N.forward.damage * damageScale(e), 6);
      e.attackT = 0.35;
      break;
    case 'cmyk': {
      // Four cartridges in a fan: cyan, magenta, yellow, black. They land and leave ink puddles.
      const dist = Math.min(Math.hypot(e.aimX - e.x, e.aimY - e.y), P.cmyk.speed * P.cmyk.flight);
      for (let i = 0; i < 4; i++) {
        const v = a + (i - 1.5) * P.cmyk.spread;
        const q = shoot(s, 'cartridge', e.x, e.y - 12, v, P.cmyk.speed, P.cmyk.damage * damageScale(e), Math.max(0.35, dist / P.cmyk.speed));
        if (q) q.color = i;
      }
      e.attackT = 0.35;
      break;
    }
    case 'printJob':
      // «Utskriftsjobb på 400 sider» ("A 400-page print job"): a stream of sheets in a sweeping arc
      e.attackT = P.printJob.duration;
      e.streamT = 0;
      e.streamA = a - P.printJob.arc / 2;
      break;
    case 'emails': {
      const D = B.deadline.emails;
      for (let j = 0; j < D.count; j++) shoot(s, 'email', e.x, e.y - 10, a + (j - (D.count - 1) / 2) * D.spread, SHOTS.speed, e.damage * D.damage, SHOTS.lifetime);
      e.attackT = 0.2;
      break;
    }
    case 'sprint': {
      // «Har du et lite minutt?» ("Got a minute?"): sprint in a straight line toward where the player stood
      const d = Math.hypot(e.aimX - e.x, e.aimY - e.y) || 1;
      e.vx = ((e.aimX - e.x) / d) * J.sprint.speed;
      e.vy = ((e.aimY - e.y) / d) * J.sprint.speed;
      e.attackT = Math.min(J.sprint.maxTime, d / J.sprint.speed + 0.08);
      break;
    }
    case 'calendar':
      for (let j = 0; j < J.calendar.count; j++) shoot(s, 'calendar', e.x, e.y - 16, a + (j - (J.calendar.count - 1) / 2) * J.calendar.spread, J.calendar.speed, J.calendar.damage * damageScale(e), 6);
      e.attackT = 0.35;
      break;
    case 'meeting': {
      // «Alle på møte!» ("Everyone to the meeting!"): a ring of junior associates around the player, with a clear opening
      const M = J.meeting, p = s.player;
      const gapAt = s.rng.special.next() * TAU;
      const arc = TAU - M.gap;
      for (let i = 0; i < M.count; i++) {
        const v = gapAt + M.gap / 2 + (arc * (i + 0.5)) / M.count;
        const x = Math.min(INSIDE.x1 - 12, Math.max(INSIDE.x0 + 12, p.x + Math.cos(v) * M.radius));
        const y = Math.min(INSIDE.y1 - 12, Math.max(INSIDE.y0 + 12, p.y + Math.sin(v) * M.radius));
        if ((x - p.x) ** 2 + (y - p.y) ** 2 < 90 * 90) continue;
        trySpawn(s, 'junior', x, y);
      }
      s.events.push('ring');
      e.attackT = 0.5;
      break;
    }
    default:
      e.attackT = 0;
  }
}

/** Attacks that last a while (the print job's stream of sheets). */
function continueAttack(s, e, dt) {
  if (e.attack !== 'printJob') return;
  const J = B.printerBoss.printJob;
  e.streamT -= dt;
  e.streamA += (J.arc / J.duration) * dt;
  while (e.streamT <= 0) {
    e.streamT += J.rate;
    shoot(s, 'paper', e.x, e.y - 14, e.streamA, J.speed, J.damage * damageScale(e), 4);
  }
}

/** The bosses' projectile damage follows the boss's own damage growth. */
function damageScale(e) {
  return B[e.bossType].damage > 0 ? e.damage / B[e.bossType].damage : 0;
}

/** The countdown ran out: the player is fired. The game stops, the boss looks disappointed. */
function fired(s, e) {
  e.timer = 0;
  e.attack = '';
  e.tell = false;
  e.alert = false;
  e.pose = POSE.sad;
  s.fired = { type: e.bossType, name: B[e.bossType].name, time: s.time };
  s.status = 'done';
  s.events.push('fired');
}

/** Help to a boss: nothing during «Vi ringer deg tilbake», double during a paper jam. Returns the factor. */
export function bossHelpFactor(e) {
  if (e.invuln > 0) return 0;
  if (e.jam > 0) return B.printerBoss.jam.helpFactor;
  return 1;
}

/** Called after a boss has been helped: Johan takes off his jacket at half frustration. */
export function checkBossPhase(s, e) {
  if (e.bossType === 'johan' && !e.phase2 && e.hp > 0 && e.hp <= e.maxHp * B.johan.phase2.at) {
    e.phase2 = true;
    e.variant = 1;
    s.events.push('johanPhase2');
  }
}

/** A boss became happy: points, «Ny PC», statistics and its own speech bubble. */
export function bossHelped(s, e) {
  const k = B[e.bossType];
  for (let i = s.stat.bossLog.length - 1; i >= 0; i--) {
    if (s.stat.bossLog[i].type === e.bossType && !s.stat.bossLog[i].helped) {
      s.stat.bossLog[i].helped = true;
      s.stat.bossLog[i].helpedAt = s.time;
      break;
    }
  }
  effect(s, 'bubble', e.x, e.y - 44, 2.2, 0, 0, 0, false, k.happyText);
  if (s.boss === e) s.boss = null;
  s.events.push('bossHappy:' + e.bossType);
}

// ---------- Enemy projectiles (emails and the bosses' attacks) ----------

/** Empty enemy projectile for the pool. */
export function makeShot() {
  return { kind: 'email', x: 0, y: 0, vx: 0, vy: 0, life: 0, t: 0, damage: 0, angle: 0, r: 4, color: 0, flight: 0 };
}

const RADIUS = { email: 4, note: 4, ticket: 6, ticketSmall: 4, cartridge: 4, paper: 4, calendar: 5 };

/**
 * Sends a projectile in a straight line (not homing). Returns it, or null if the cap is reached.
 * For cartridges, «life» is the flight time before they land.
 */
export function shoot(s, kind, x, y, angle, speed, damage, life) {
  if (s.enemyShots.n >= SHOTS.max) return null;
  const q = s.enemyShots.acquire();
  q.kind = kind;
  q.x = x;
  q.y = y;
  q.vx = Math.cos(angle) * speed;
  q.vy = Math.sin(angle) * speed;
  q.life = life;
  q.flight = life;
  q.t = 0;
  q.damage = damage;
  q.angle = angle;
  q.r = RADIUS[kind] ?? 4;
  q.color = 0;
  if (kind === 'email') s.events.push('email');
  return q;
}

/** Empty ink puddle for the pool. */
export function makePuddle() {
  return { x: 0, y: 0, life: 0, color: 0 };
}

function addPuddle(s, x, y, color) {
  const P = B.printerBoss.cmyk;
  const pool = s.puddles;
  if (pool.n >= P.maxPuddles) {
    let oldest = 0;
    for (let i = 1; i < pool.n; i++) if (pool.items[i].life < pool.items[oldest].life) oldest = i;
    pool.removeAt(oldest);
  }
  const h = pool.acquire();
  h.x = x;
  h.y = y;
  h.life = P.puddleTime;
  h.color = color;
}

/** Moves all enemy projectiles. They disappear after their lifetime, at the outer wall, or when they hit the player. */
export function updateEnemyShots(s, dt) {
  const pool = s.enemyShots, p = s.player;
  const N = B.nordic;
  for (let i = pool.n - 1; i >= 0; i--) {
    const q = pool.items[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.t += dt;
    q.life -= dt;
    if (q.kind === 'cartridge' && q.life <= 0) {
      // The cartridge lands and bursts into an ink puddle in its own colour
      addPuddle(s, q.x, q.y, q.color);
      pool.removeAt(i);
      continue;
    }
    if (q.kind === 'ticket' && q.t >= N.forward.splitAfter) {
      // The forwarded case splits into three smaller ones that fly on in a fan
      const { x, y, angle } = q;
      const speed = Math.hypot(q.vx, q.vy), damage = q.damage;
      pool.removeAt(i);
      for (let j = 0; j < N.forward.count; j++) shoot(s, 'ticketSmall', x, y, angle + (j - (N.forward.count - 1) / 2) * N.forward.spread, speed * 1.15, damage * 0.8, 3.5);
      continue;
    }
    if (q.life <= 0 || q.x < INSIDE.x0 || q.x > INSIDE.x1 || q.y < INSIDE.y0 || q.y > INSIDE.y1) {
      pool.removeAt(i);
      continue;
    }
    const rr = q.r + p.r;
    if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 < rr * rr) {
      if (q.kind === 'note') {
        // Hold music: no damage, but the player is slowed down for a while
        p.slow = N.queue.slowTime;
        p.slowBy = N.queue.slow;
        s.events.push('slowed');
      } else if (p.invulnerable <= 0) damagePlayer(s, q.damage);
      pool.removeAt(i);
    }
  }
  // Ink puddles dry up
  const puddles = s.puddles;
  for (let i = puddles.n - 1; i >= 0; i--) {
    puddles.items[i].life -= dt;
    if (puddles.items[i].life <= 0) puddles.removeAt(i);
  }
}

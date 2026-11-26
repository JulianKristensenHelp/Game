// @ts-check
// The bosses (version 4): a fixed order with Johan last, a countdown that gets you fired («Du har fått sparken!»),
// and each boss's own attacks. Every attack is warned before it comes (a pose, a light or a «!»), so it can be avoided.
// All boss projectiles live in the same pool as the emails and count toward the cap of CONFIG.enemyShots.max.
// Like the rest of the game logic, this uses no screen, sound or Math.random(): «Dagens vakt» (today's shift) stays the same for everyone.
import { CONFIG } from './config.js';
import { TAU } from './utils.js';
import { effect } from './effects.js';
import { damagePlayer } from './player.js';
import { spawnEnemy, inView, trySpawn, becomesHappy, countPickups } from './enemies.js';
import { dropPickup } from './tickets.js';
import { INSIDE } from './map.js';
import { POSE } from './figures.js';

const B = CONFIG.bosses;
const SHOTS = CONFIG.enemyShots;

/** The attacks each boss can choose from, in priority order. Each has its own cooldown slot (e.cds[i]). */
const ATTACKS = {
  nordic: ['queue', 'forward', 'callBack'],
  printerBoss: ['cmyk', 'printJob'],
  frida: ['hook', 'herring', 'phish', 'bait'],
  johan: ['sprint', 'calendar', 'meeting', 'forwarded'],
};

/** Fiske-Frida's fake pickups («Lokkemat»). @type {('fakeDrink'|'fakePc')[]} */
export const BAIT_TYPES = ['fakeDrink', 'fakePc'];

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
  // Frida swings the rod over her head before the hook, and points up at the sky before the herring rain.
  // The forwarded emails are warned by the friends (they raise their phones), and the bait has no warning at all.
  if (type === 'frida') return id === 'hook' ? POSE.raise : id === 'herring' ? POSE.point : -1;
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
  // A banner a few seconds before the boss arrives, so nobody is surprised
  if (!s.bossWarned && s.nextBoss < 1e8 && s.time >= s.nextBoss - B.warnBefore) {
    s.bossWarned = true;
    s.events.push('bossSoon:' + bossTypeAt(s.bossNo));
  }
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
  e.variant = 0;
  s.boss = e;
  if (type === 'frida') spawnFriends(s, e);
  s.bossNo++;
  s.nextBoss = bossTimeAt(s.bossNo);
  s.bossWarned = false;
  s.stat.bossesTotal++;
  s.stat.bossLog.push({ type, helped: false, time: s.time, helpedAt: 0, returnNo });
  s.events.push('boss:' + type);
  return e;
}

/** Fiske-Frida's two friends: smaller, each with her own frustration (a share of Frida's), following close behind her. */
function spawnFriends(s, e) {
  const F = B.frida.friends;
  for (let i = 0; i < F.count; i++) {
    const f = spawnEnemy(s, 'friend', e.x + (i ? 1 : -1) * F.follow, e.y + 14);
    f.hp = f.maxHp = e.maxHp * F.frustration;
    f.points = Math.round(e.points * F.points);
    f.damage = F.damage * damageScale(e);
    f.speed = B.frida.speed * F.speed;
    f.bossUid = e.uid;
    f.slot = i;
    // each friend has her own look (looks only)
    f.variant = i;
  }
}

/**
 * One of Frida's friends: walks to a spot behind Frida (seen from the player), one on each side. While Frida warns
 * about the forwarded emails, the friends stand still and raise their phones.
 */
export function updateFriend(s, e, dt, dx, dy) {
  const b = s.boss;
  if (!b || !b.active || b.uid !== e.bossUid) {
    // Frida is gone (only in debug mode): they simply walk toward the player like everyone else
    e.x += dx * e.speed * s.timeScale * dt;
    e.y += dy * e.speed * s.timeScale * dt;
    e.pose = -1;
    return;
  }
  const F = B.frida.friends;
  const warning = b.attack === 'phish' && b.tell;
  e.pose = warning ? POSE.raise : -1;
  e.alert = warning;
  if (warning) return;
  // behind Frida (away from the player) and to the side
  const bx = s.player.x - b.x, by = s.player.y - b.y, bd = Math.hypot(bx, by) || 1;
  const ux = bx / bd, uy = by / bd, side = e.slot ? 1 : -1;
  const tx = b.x - ux * F.follow * 0.6 - uy * side * F.follow, ty = b.y - uy * F.follow * 0.6 + ux * side * F.follow + 6;
  const mx = tx - e.x, my = ty - e.y, md = Math.hypot(mx, my);
  if (md > 2) {
    const step = Math.min(md, e.speed * s.timeScale * (md > 80 ? 2.5 : 1) * dt);
    e.x += (mx / md) * step;
    e.y += (my / md) * step;
  }
  if (Math.abs(dx) > 0.15) e.direction = dx < 0 ? -1 : 1;
}

/** Frida is helped (or the shift is over): the friends become happy too, and the fake pickups disappear. */
function fridaDone(s, e, happy) {
  const f = s.enemies;
  for (let i = 0; i < f.n; i++) {
    const o = f.items[i];
    if (!o.active || o.type !== 'friend' || o.bossUid !== e.uid) continue;
    if (happy) {
      // no extra points: the friends' bonus is for helping them on their own
      o.points = 0;
      becomesHappy(s, o);
    } else o.pose = POSE.sad;
  }
  const k = s.pickups;
  for (let i = k.n - 1; i >= 0; i--) {
    if (BAIT_TYPES.includes(k.items[i].type)) {
      effect(s, 'poof', k.items[i].x, k.items[i].y, 0.4, 8);
      k.removeAt(i);
    }
  }
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
  // Bullet time (The Matrix's code rain) slows the movement and the attack cooldowns, never the countdown.
  const ts = s.timeScale;
  const fast = e.phase2 ? B.johan.phase2.speed : 1;
  if (e.attack === 'sprint' && !e.tell) {
    e.x += e.vx * ts * dt;
    e.y += e.vy * ts * dt;
  } else if (!e.attack || (e.attack === 'printJob' && !e.tell) || (e.attack === 'herring' && !e.tell) || e.attack === 'phish') {
    // Far away, the boss jogs to catch up (so the fight actually happens, even if the player keeps running)
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    const jog = d > B.catchUpFrom ? B.catchUpSpeed : 1;
    e.x += dx * e.speed * fast * jog * ts * dt;
    e.y += dy * e.speed * fast * jog * ts * dt;
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
  for (let i = 0; i < list.length; i++) if (e.cds[i] > 0) e.cds[i] -= dt * ts;
  if (e.fightT < B.calmStart || !inView(s, e.x, e.y, -8)) return;
  for (let i = 0; i < list.length; i++) {
    const id = list[i];
    if (e.cds[i] > 0) continue;
    if (id === 'forwarded' && !e.phase2) continue;
    if (id === 'meeting' && s.enemies.n > CONFIG.spawn.maxConcurrent - 10) continue;
    if (id === 'phish' && !hasFriends(s, e)) continue;
    if (id === 'bait' && baitCount(s) >= B.frida.bait.max) continue;
    // Wait for room under the cap on enemy projectiles
    if (id !== 'callBack' && id !== 'sprint' && id !== 'meeting' && id !== 'bait' && s.enemyShots.n > SHOTS.max - 8) continue;
    e.cds[i] = cooldown(e.bossType, id) * faster;
    e.attack = id;
    e.pose = poseFor(e.bossType, id);
    e.aimX = p.x;
    e.aimY = p.y;
    if (id === 'forwarded') {
      // Johan alternates between the Nørdic consultant's ticket and the printer's cartridges
      e.attack = e.alt++ % 2 === 0 ? 'forward' : 'cmyk';
    }
    if (id === 'bait') {
      // «Lokkemat»: deliberately no warning – the fake pickups simply appear (they can be told apart by looking closely)
      spawnBait(s);
      e.attack = '';
      e.pose = -1;
      return;
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
    case 'hook': {
      // «Klikk på lenken!»: the hook flies in a straight line toward where the player stood (the dashed line)
      const H = B.frida.hook;
      shoot(s, 'hook', e.x + e.direction * 14, e.y - 26, a, H.speed, e.damage * H.damage, H.range / H.speed);
      e.attackT = H.range / H.speed;
      break;
    }
    case 'herring': {
      // «Silderegn»: shadows on the floor – one where the player stands, the rest around – and herring land on them
      const H = B.frida.herring, rs = s.rng.special;
      for (let j = 0; j < H.count; j++) {
        const v = rs.next() * TAU, d = j === 0 ? 0 : 18 + rs.next() * H.spread;
        const x = Math.min(INSIDE.x1 - 8, Math.max(INSIDE.x0 + 8, e.aimX + Math.cos(v) * d));
        const y = Math.min(INSIDE.y1 - 8, Math.max(INSIDE.y0 + 8, e.aimY + Math.sin(v) * d));
        const q = shoot(s, 'herring', x, y, 0, 0, H.damage * damageScale(e), H.fall);
        if (q) q.r = H.radius;
      }
      e.attackT = 0.3;
      break;
    }
    case 'phish': {
      // «Videresendt svindel-e-post»: each friend sends fish-shaped emails that swim in a wavy line toward the player
      const P = B.frida.phish, p = s.player, f = s.enemies;
      for (let i = 0; i < f.n; i++) {
        const o = f.items[i];
        if (!o.active || o.type !== 'friend' || o.bossUid !== e.uid) continue;
        const base = Math.atan2(p.y - o.y, p.x - o.x);
        for (let j = 0; j < P.perFriend; j++) {
          const q = shoot(s, 'fishMail', o.x, o.y - 12, base + (j - (P.perFriend - 1) / 2) * P.spread, P.speed, P.damage * damageScale(e), P.lifetime);
          if (q) {
            q.speed = P.speed;
            q.color = j;
          }
        }
      }
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

/** Does Frida still have a friend who can send emails? */
function hasFriends(s, e) {
  const f = s.enemies;
  for (let i = 0; i < f.n; i++) if (f.items[i].active && f.items[i].type === 'friend' && f.items[i].bossUid === e.uid) return true;
  return false;
}

function baitCount(s) {
  return countPickups(s, BAIT_TYPES[0]) + countPickups(s, BAIT_TYPES[1]);
}

/**
 * «Lokkemat»: fake pickups appear a little away from the player (special stream, so they are the same for everyone).
 * A fake energy drink or a fake «Ny PC», each with a small fish hook. Never on the minimap.
 */
function spawnBait(s) {
  const K = B.frida.bait, p = s.player, rs = s.rng.special;
  const n = K.max - baitCount(s);
  for (let i = 0; i < Math.min(2, n); i++) {
    const v = rs.next() * TAU, d = K.minDistance + rs.next() * (K.maxDistance - K.minDistance);
    const type = BAIT_TYPES[rs.integer(2)];
    dropPickup(s, type, p.x + Math.cos(v) * d, p.y + Math.sin(v) * d);
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
  if (e.bossType === 'frida') fridaDone(s, e, false);
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
  if (e.bossType === 'frida') fridaDone(s, e, true);
  // Every helped boss gives one more reroll and one more banish for the level-up cards
  s.rerolls += CONFIG.upgrades.perBoss;
  s.banishes += CONFIG.upgrades.perBoss;
  if (s.boss === e) s.boss = null;
  s.events.push('bossHappy:' + e.bossType);
}

// ---------- Enemy projectiles (emails and the bosses' attacks) ----------

/** Empty enemy projectile for the pool. */
export function makeShot() {
  return { kind: 'email', x: 0, y: 0, vx: 0, vy: 0, life: 0, t: 0, damage: 0, angle: 0, r: 4, color: 0, flight: 0, speed: 0 };
}

const RADIUS = { email: 4, note: 4, ticket: 6, ticketSmall: 4, cartridge: 4, paper: 4, calendar: 5, hook: 6, herring: 11, fishMail: 5 };

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
  q.speed = speed;
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
  // Bullet time (The Matrix): the projectiles fly slower but just as far
  const sdt = dt * s.timeScale;
  for (let i = pool.n - 1; i >= 0; i--) {
    const q = pool.items[i];
    if (q.kind === 'fishMail') {
      // swims toward the player in a wavy line (the wave is across the direction it was sent)
      const P = B.frida.phish;
      const w = Math.cos(q.t * P.waveSpeed + q.color * 1.6) * P.wave * P.waveSpeed;
      const c = Math.cos(q.angle), sn = Math.sin(q.angle);
      q.x += (c * q.speed - sn * w) * sdt;
      q.y += (sn * q.speed + c * w) * sdt;
    } else {
      q.x += q.vx * sdt;
      q.y += q.vy * sdt;
    }
    q.t += sdt;
    q.life -= sdt;
    if (q.kind === 'herring') {
      // The herring lands on its shadow: it only hurts right then, and only if the player stands on the shadow
      if (q.life <= 0) {
        const rr = q.r + p.r * 0.5;
        if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 < rr * rr && p.invulnerable <= 0) damagePlayer(s, q.damage);
        effect(s, 'fishSplash', q.x, q.y, 0.35, q.r);
        pool.removeAt(i);
      }
      continue;
    }
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
      } else if (q.kind === 'hook') {
        // «Klikk på lenken!»: normal damage, and the player is pulled a short way toward Frida
        if (p.invulnerable <= 0) {
          damagePlayer(s, q.damage);
          const b = s.boss, H = B.frida.hook;
          if (b && b.active) {
            const bx = b.x - p.x, by = b.y - p.y, bd = Math.hypot(bx, by) || 1;
            const pull = Math.min(H.pull, Math.max(0, bd - b.r - p.r - 4));
            p.pullT = H.pullTime;
            p.pullVx = (bx / bd) * (pull / H.pullTime);
            p.pullVy = (by / bd) * (pull / H.pullTime);
          }
          s.events.push('hooked');
        }
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

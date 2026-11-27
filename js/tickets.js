// @ts-check
// Tickets (points + experience), case piles, and pickups (energy drink and «Sky-synk» on the map, Ny PC, packages …).
import { CONFIG } from './config.js';
import { givePoints } from './score.js';
import { drink, damagePlayer } from './player.js';
import { newPc, countPickups } from './enemies.js';
import { effect } from './effects.js';
import { INSIDE } from './map.js';

const L = CONFIG.tickets;
const ED = CONFIG.energyDrink;
const CS = CONFIG.cloudSync;

/**
 * A ticket on the floor, or a case pile («saksbunke») of several stale ones.
 * xp = full experience (a stale ticket or a pile pays CONFIG.tickets.staleXp of it), pts = the point base that the age factor is applied to,
 * age = seconds since it was dropped (for a pile: its point-weighted age), count = tickets in it (1 = a single ticket).
 * dragged = flying toward the player. sync = pulled in by «Sky-synk» (arrives within its pull time).
 */
export function makeTicket() {
  return { x: 0, y: 0, xp: 0, pts: 0, age: 0, count: 1, dragged: false, sync: false };
}

export function makePickup() {
  return { x: 0, y: 0, type: 'drink', age: 0, count: 0 };
}

/** Seconds a ticket is fresh (full points and full experience): the base plus «Post-it-blokk». Read live, so tickets already out get it too. */
export function freshTime(s) {
  return L.freshTime + s.player.mod.ticketFresh;
}

/** The point factor for a ticket of a given age: 1 while fresh, then evenly down to minValue over decayTime. */
export function pointFactor(age, fresh) {
  if (age <= fresh) return 1;
  return Math.max(L.minValue, 1 - ((1 - L.minValue) * (age - fresh)) / L.decayTime);
}

/** Drops a ticket where the lawyer stood. At the cap it goes into the nearest pile instead. */
export function dropTicket(s, x, y, value) {
  const f = s.tickets;
  if (f.n >= L.max) {
    // The nearest pile or stale ticket within «capJoinRadius», otherwise simply the nearest ticket
    const fresh = freshTime(s);
    let best = -1, bestD = L.capJoinRadius ** 2, bestAny = -1, bestAnyD = Infinity;
    for (let i = 0; i < f.n; i++) {
      const l = f.items[i];
      if (l.dragged) continue;
      const d = (l.x - x) ** 2 + (l.y - y) ** 2;
      if (d < bestAnyD) { bestAnyD = d; bestAny = i; }
      if ((l.age > fresh || l.count > 1) && d < bestD) { bestD = d; best = i; }
    }
    const into = best >= 0 ? best : bestAny;
    if (into >= 0) {
      absorb(f.items[into], value, value, 0, 1, fresh);
      return;
    }
  }
  const l = f.acquire();
  l.x = x;
  l.y = y;
  l.xp = value;
  l.pts = value;
  l.age = 0;
  l.count = 1;
  l.dragged = false;
  l.sync = false;
}

/**
 * Puts tickets into a pile. The experience is added as it is. The points left right now are kept exactly: the pile
 * gets the point-weighted age (never younger than the fresh period, so a pile always looks and acts stale) and a
 * point base that gives the combined remaining points at that age.
 */
function absorb(m, xp, pts, age, count, fresh) {
  const left = m.pts * pointFactor(m.age, fresh) + pts * pointFactor(age, fresh);
  const total = m.pts + pts;
  const newAge = Math.max(fresh, total > 0 ? (m.age * m.pts + age * pts) / total : m.age);
  m.age = newAge;
  m.pts = left / pointFactor(newAge, fresh);
  m.xp += xp;
  m.count += count;
}

/** Reused lookup for merging (avoids new objects). */
const cellMap = new Map();

/**
 * Merges stale tickets that lie close together into case piles. Runs at a fixed interval of game time (not every
 * frame), and in the pool's order, so it is the same for everyone.
 */
function mergeStale(s) {
  const f = s.tickets;
  const fresh = freshTime(s);
  const cell = L.mergeCell;
  cellMap.clear();
  for (let i = f.n - 1; i >= 0; i--) {
    const l = f.items[i];
    if (l.dragged || l.age <= fresh) continue;
    const key = Math.floor(l.x / cell) * 100003 + Math.floor(l.y / cell);
    const m = cellMap.get(key);
    if (m) {
      absorb(m, l.xp, l.pts, l.age, l.count, fresh);
      f.removeAt(i);
    } else {
      cellMap.set(key, l);
    }
  }
  cellMap.clear();
}

/**
 * Picks spots far from the player for a map pickup (energy drink, «Sky-synk»): the same number of candidate spots
 * is always drawn from the given stream; the first that is far enough from the player and the other pickups wins,
 * otherwise the one farthest away. Returns the index into s.drinkCand / s.drinkCandY.
 */
function drawSpots(s, rng, k) {
  const kx = s.drinkCand, ky = s.drinkCandY;
  for (let i = 0; i < k.candidates; i++) {
    kx[i] = INSIDE.x0 + k.wallMargin + rng.next() * (INSIDE.x1 - INSIDE.x0 - 2 * k.wallMargin);
    ky[i] = INSIDE.y0 + k.wallMargin + rng.next() * (INSIDE.y1 - INSIDE.y0 - 2 * k.wallMargin);
  }
}

/**
 * Energy drinks appear on the map at fixed intervals (the same for everyone on the same day).
 * «Sky-synk» works the same way from its own stream, from CONFIG.cloudSync.first.
 */
export function updateDrinks(s) {
  if (s.time >= s.nextDrink) {
    s.nextDrink += ED.interval;
    // The candidates are always drawn (so the stream stays in step), even when the map is full
    drawSpots(s, s.rng.drink, ED);
    if (countPickups(s, 'drink') < ED.max) {
      const i = pickDrawn(s, ED);
      dropPickup(s, 'drink', s.drinkCand[i], s.drinkCandY[i]);
      s.events.push('drinkSpawned');
    }
  }
  if (s.time >= s.nextCloud) {
    s.nextCloud += CS.interval;
    drawSpots(s, s.rng.cloud, CS);
    if (countPickups(s, 'cloud') < CS.max) {
      const i = pickDrawn(s, CS);
      dropPickup(s, 'cloud', s.drinkCand[i], s.drinkCandY[i]);
      s.events.push('cloudSpawned');
    }
  }
}

/** Chooses among candidate spots that are already drawn (the energy drink's original order of work). */
function pickDrawn(s, k) {
  const kx = s.drinkCand, ky = s.drinkCandY, p = s.player;
  let longest = -1, longestI = 0;
  for (let i = 0; i < k.candidates; i++) {
    const d2 = (kx[i] - p.x) ** 2 + (ky[i] - p.y) ** 2;
    let neighborOk = true;
    for (let j = 0; j < s.pickups.n; j++) {
      const q = s.pickups.items[j];
      if ((q.x - kx[i]) ** 2 + (q.y - ky[i]) ** 2 < 200 * 200) neighborOk = false;
    }
    if (d2 >= k.minDistance ** 2 && neighborOk) return i;
    if (d2 > longest) {
      longest = d2;
      longestI = i;
    }
  }
  return longestI;
}

/**
 * @param {'drink'|'pc'|'package'|'cookie'|'fakeDrink'|'fakePc'|'cloud'} type cookie = «Helsekjeks», fake… = the bait
 *   of boss 3 (Anonymous), cloud = «Sky-synk»
 * @param {number} [count] for a package: how many weapon increments it holds
 */
export function dropPickup(s, type, x, y, count = 0) {
  const k = s.pickups.acquire();
  k.x = Math.min(INSIDE.x1 - 10, Math.max(INSIDE.x0 + 10, x));
  k.y = Math.min(INSIDE.y1 - 10, Math.max(INSIDE.y0 + 10, y));
  k.type = type;
  k.age = 0;
  k.count = count;
  if (type === 'package') s.events.push('packageDropped');
}

/** «Sky-synk»: every ticket and pile on the map flies to the player and arrives within CONFIG.cloudSync.pullTime. */
function cloudSync(s, x, y) {
  const f = s.tickets;
  for (let i = 0; i < f.n; i++) {
    f.items[i].dragged = true;
    f.items[i].sync = true;
  }
  s.syncLeft = CS.pullTime;
  s.stat.cloudSyncs++;
  effect(s, 'text', x, y - 12, 1.1, 0, 0, 0, false, 'Synkroniserer …');
  s.events.push('cloudSync');
}

/** Tickets age (they never disappear), stale ones are merged into piles now and then, and they fly to the player. */
export function updateTickets(s, dt) {
  const p = s.player;
  const f = s.tickets;
  const R = CONFIG.player.pickRadius * p.mod.pick;
  const R2 = R * R;
  const fresh = freshTime(s);
  // «Sky-synk»: the time left until every pulled ticket must have arrived
  const syncLeft = s.syncLeft;
  if (s.syncLeft > 0) s.syncLeft = Math.max(0, s.syncLeft - dt);
  s.mergeT -= dt;
  if (s.mergeT <= 0) {
    s.mergeT += L.mergeInterval;
    mergeStale(s);
  }
  for (let i = f.n - 1; i >= 0; i--) {
    const l = f.items[i];
    l.age += dt;
    const dx = p.x - l.x, dy = p.y - l.y;
    const d2 = dx * dx + dy * dy;
    if (!l.dragged) {
      if (d2 < R2) l.dragged = true;
      else continue;
    }
    const d = Math.sqrt(d2) || 1;
    let step = CONFIG.player.ticketSpeed * dt;
    // Pulled by «Sky-synk»: fast enough to arrive before the pull time is up, wherever it lies on the map
    if (l.sync) step = Math.max(step, syncLeft > dt ? (d * dt) / syncLeft : d);
    if (d <= step + p.r) {
      // Points are given the moment the ticket is picked up, with its age factor and the multiplier right now.
      // Experience (Endringsprompt 6): full while the ticket is fresh, a fixed «staleXp» share once it is stale – and
      // always for a pile, which only ever holds stale tickets. Judged when it reaches the player (also with Sky-synk).
      const factor = pointFactor(l.age, fresh);
      givePoints(s, l.pts * factor);
      const stale = l.count > 1 || l.age > fresh;
      s.xp += l.xp * (stale ? L.staleXp : 1) * p.mod.xp;
      s.stat.ticketsPicked += l.count;
      if (l.count === 1 && l.age <= fresh) s.stat.ticketsFresh++;
      s.events.push('ticket');
      f.removeAt(i);
    } else {
      l.x += (dx / d) * step;
      l.y += (dy / d) * step;
    }
  }

  const k = s.pickups;
  const CK = CONFIG.cookie;
  for (let i = k.n - 1; i >= 0; i--) {
    const pk = k.items[i];
    pk.age += dt;
    // The cookie only lies for a while
    if (pk.type === 'cookie' && pk.age >= CK.lifetime) {
      k.removeAt(i);
      continue;
    }
    // The cookie is picked up with the same radius as the tickets, everything else when the player walks over it
    const rr = pk.type === 'cookie' ? R : p.r + 10;
    const dx = p.x - pk.x, dy = p.y - pk.y;
    if (dx * dx + dy * dy < rr * rr) {
      const type = pk.type, count = pk.count;
      k.removeAt(i);
      if (type === 'drink') drink(s);
      else if (type === 'package') s.openPackage(count);
      else if (type === 'cookie') eatCookie(s, pk.x, pk.y);
      else if (type === 'cloud') cloudSync(s, pk.x, pk.y);
      else if (type === 'fakeDrink' || type === 'fakePc') baited(s, pk.x, pk.y);
      else newPc(s);
    }
  }
}

/** «Helsekjeks»: a little energy, no sugar rush. */
function eatCookie(s, x, y) {
  const p = s.player;
  p.energy = Math.min(p.maxEnergy, p.energy + CONFIG.cookie.fill);
  s.stat.cookies++;
  effect(s, 'text', x, y - 12, 0.9, 0, 0, 0, false, '+' + CONFIG.cookie.fill);
  s.events.push('cookie');
}

/** The bait of boss 3 (Anonymous): the player took it – a little damage and slowed for a while. */
function baited(s, x, y) {
  const K = CONFIG.bosses.frida.bait, p = s.player;
  p.invulnerable = 0;
  damagePlayer(s, K.damage * (1 + CONFIG.scaling.damagePerMin * (s.time / 60)));
  p.slow = K.slowTime;
  p.slowBy = K.slow;
  s.stat.baited++;
  effect(s, 'text', x, y - 14, 1.1, 0, 0, 0, false, 'Svindel!');
  s.events.push('baited');
}

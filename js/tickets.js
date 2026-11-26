// @ts-check
// Tickets (points + experience) and pickups (energy drink on the map, Ny PC).
import { CONFIG } from './config.js';
import { givePoints } from './score.js';
import { drink, damagePlayer } from './player.js';
import { newPc } from './enemies.js';
import { effect } from './effects.js';
import { INSIDE } from './map.js';

const L = CONFIG.tickets;
const ED = CONFIG.energyDrink;

export function makeTicket() {
  return { x: 0, y: 0, value: 0, age: 0, dragged: false };
}

export function makePickup() {
  return { x: 0, y: 0, type: 'drink', age: 0, count: 0 };
}

/** Drops a ticket where the lawyer stood. */
export function dropTicket(s, x, y, value) {
  const l = s.tickets.acquire();
  l.x = x;
  l.y = y;
  l.value = value;
  l.age = 0;
  l.dragged = false;
  if (s.tickets.n > L.max) merge(s);
}

/**
 * @param {'drink'|'pc'|'package'|'cookie'|'fakeDrink'|'fakePc'} type cookie = «Helsekjeks», fake… = Fiske-Frida's bait
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

/** Reused lookup for merging (avoids new objects). */
const cellMap = new Map();

/** Too many tickets: merge nearby tickets into one larger one with the combined value. */
function merge(s) {
  const f = s.tickets;
  let cell = L.mergeCell;
  while (f.n > L.max * 0.75 && cell < 3000) {
    cellMap.clear();
    for (let i = f.n - 1; i >= 0; i--) {
      const l = f.items[i];
      const key = Math.floor(l.x / cell) * 100003 + Math.floor(l.y / cell);
      const m = cellMap.get(key);
      if (m) {
        m.value += l.value;
        m.age = Math.min(m.age, l.age);
        m.dragged = m.dragged || l.dragged;
        f.removeAt(i);
      } else {
        cellMap.set(key, l);
      }
    }
    cell *= 2;
  }
  cellMap.clear();
}

/**
 * Energy drinks appear on the map at fixed intervals (the same for everyone on the same day).
 * For each can, the same number of candidate spots is always drawn from its own stream; the first one that is far enough
 * away from the player and the other cans is chosen.
 */
export function updateDrinks(s) {
  if (s.time < s.nextDrink) return;
  s.nextDrink += ED.interval;
  const rng = s.rng.drink;
  const kx = s.drinkCand, ky = s.drinkCandY;
  for (let i = 0; i < ED.candidates; i++) {
    kx[i] = INSIDE.x0 + ED.wallMargin + rng.next() * (INSIDE.x1 - INSIDE.x0 - 2 * ED.wallMargin);
    ky[i] = INSIDE.y0 + ED.wallMargin + rng.next() * (INSIDE.y1 - INSIDE.y0 - 2 * ED.wallMargin);
  }
  let count = 0;
  for (let i = 0; i < s.pickups.n; i++) if (s.pickups.items[i].type === 'drink') count++;
  if (count >= ED.max) return;
  const p = s.player;
  let selected = -1, longest = -1, longestI = 0;
  for (let i = 0; i < ED.candidates; i++) {
    const d2 = (kx[i] - p.x) ** 2 + (ky[i] - p.y) ** 2;
    let neighborOk = true;
    for (let j = 0; j < s.pickups.n; j++) {
      const q = s.pickups.items[j];
      if ((q.x - kx[i]) ** 2 + (q.y - ky[i]) ** 2 < 200 * 200) neighborOk = false;
    }
    if (d2 >= ED.minDistance ** 2 && neighborOk) {
      selected = i;
      break;
    }
    if (d2 > longest) {
      longest = d2;
      longestI = i;
    }
  }
  if (selected < 0) selected = longestI;
  dropPickup(s, 'drink', kx[selected], ky[selected]);
  s.events.push('drinkSpawned');
}

/** Tickets age and disappear, or are pulled toward the player and picked up. */
export function updateTickets(s, dt) {
  const p = s.player;
  const f = s.tickets;
  const R = CONFIG.player.pickRadius * p.mod.pick;
  const R2 = R * R;
  for (let i = f.n - 1; i >= 0; i--) {
    const l = f.items[i];
    const dx = p.x - l.x, dy = p.y - l.y;
    const d2 = dx * dx + dy * dy;
    if (!l.dragged) {
      if (d2 < R2) {
        l.dragged = true;
      } else {
        l.age += dt;
        // «Post-it-blokk»: the tickets stay longer
        if (l.age >= L.lifetime + p.mod.ticketLife) {
          s.stat.ticketsLost++;
          f.removeAt(i);
        }
        continue;
      }
    }
    const d = Math.sqrt(d2) || 1;
    const step = CONFIG.player.ticketSpeed * dt;
    if (d <= step + p.r) {
      // Points are awarded the moment the ticket is picked up, with the multiplier that applies right now.
      givePoints(s, l.value);
      s.xp += l.value * p.mod.xp;
      s.stat.ticketsPicked++;
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
    // The cookie only lies for a while (like the tickets)
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

/** Fiske-Frida's «Lokkemat»: the player took the bait – a little damage and slowed for a while. */
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

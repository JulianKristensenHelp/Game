// @ts-check
// Capture-point events (Endringsprompt 5): «Snacks på Jacobs», «Spille pingpong» and «Møterommet».
// Now and then the player is called to a fixed spot on the map and has to stand in the circle there for a while
// (only the player counts, Endringsprompt 6). Taking it gives a permanent bonus for the rest of the shift and one free level.
// When the events come and which one it is come from their own stream («Dagens vakt»), so everyone gets the same
// events at the same time for the same choices. All numbers are in CONFIG.capture, the spots in js/map.js (HOTSPOTS).
import { CONFIG } from './config.js';
import { HOTSPOTS, INSIDE } from './map.js';
import { trySpawn } from './enemies.js';
import { effect } from './effects.js';
import { computeBonuses } from './upgrades.js';

const C = CONFIG.capture;
const TAU = Math.PI * 2;
/** The event ids in a fixed order (the order of CONFIG.capture.defs). */
export const CAPTURE_IDS = Object.keys(C.defs);

/**
 * @typedef {Object} ActiveCapture
 * @property {string} id
 * @property {number} x centre of the circle
 * @property {number} y
 * @property {number} left seconds left to take the point
 * @property {number} progress seconds held (0 … CONFIG.capture.holdTime)
 * @property {boolean} started the player has stepped in at least once (the extra flock has been sent)
 * @property {boolean} inside the player stands in the circle right now
 * @property {number} angle the direction of the extra flock (drawn when the event starts, so the stream stays in step)
 * @property {number} outside seconds in a row the player has been outside (after stepping in); resets the progress at CONFIG.capture.resetAfter
 * @property {number} ringT seconds inside since the last closing ring (Endringsprompt 7)
 * @property {boolean} draining the progress is sinking right now (drawn in red/orange)
 */

/**
 * The circle's radius right now (Endringsprompt 7): from CONFIG.capture.radius at no progress, shrinking evenly to
 * radiusEnd at full. Used by the game, the drawing and the bot, so they always agree.
 * @param {ActiveCapture} a
 */
export function captureRadius(a) {
  const f = Math.min(1, a.progress / C.holdTime);
  return C.radius + (C.radiusEnd - C.radius) * f;
}

/** @param {import('./utils.js').Rng} rng the capture stream */
export function makeCaptureState(rng) {
  /** @type {Record<string, number>} */
  const counts = {}, bonus = {};
  for (const id of CAPTURE_IDS) {
    counts[id] = 0;
    bonus[id] = 0;
  }
  return {
    /** When the next event is due (it waits if a boss is out or close). */
    next: C.first + rng.between(-C.jitter, C.jitter),
    /** @type {ActiveCapture | null} */
    active: null,
    /** How many times each event has happened, and how many times it was taken (the bonus stacks). */
    counts, bonus,
  };
}

/** Starts an event right away (used by the schedule and by the debug shortcut). */
export function startCapture(s, id) {
  const st = s.capture;
  const spot = HOTSPOTS[id];
  st.counts[id]++;
  st.active = { id, x: spot.x, y: spot.y, left: C.deadline, progress: 0, started: false, inside: false, angle: s.rng.capture.next() * TAU, outside: 0, ringT: 0, draining: false };
  s.stat.captureEvents++;
  s.events.push('captureStart:' + id);
}

/** One update: start a due event when allowed, or run the one in progress. */
export function updateCapture(s, dt) {
  const st = s.capture;
  if (st.active) {
    runCapture(s, st.active, dt);
    return;
  }
  if (s.time < st.next) return;
  // Never while a boss is out, and never just before one: the event waits until the boss is done
  if ((s.boss && s.boss.active) || s.nextBoss - s.time < C.bossMargin) return;
  const rng = s.rng.capture;
  // Always the same draws, so the stream stays in step whichever events are left
  const pick = rng.next();
  st.next = s.time + C.interval + rng.between(-C.jitter, C.jitter);
  let left = 0;
  for (const id of CAPTURE_IDS) if (st.counts[id] < C.maxPerEvent) left++;
  if (left === 0) {
    st.next = 1e9;
    return;
  }
  let k = Math.floor(pick * left);
  for (const id of CAPTURE_IDS) {
    if (st.counts[id] >= C.maxPerEvent) continue;
    if (k-- === 0) {
      startCapture(s, id);
      return;
    }
  }
}

/** @param {ActiveCapture} a */
function runCapture(s, a, dt) {
  const p = s.player;
  const R = captureRadius(a);
  a.left -= dt;
  // Endringsprompt 6: only the player counts – lawyers in the circle do not stop the progress
  a.inside = (p.x - a.x) ** 2 + (p.y - a.y) ** 2 < R * R;
  if (a.inside) {
    if (!a.started) {
      a.started = true;
      sendFlock(s, a);
      sendSenders(s, a);
    }
    a.progress += dt;
    a.outside = 0;
    a.draining = false;
    // Endringsprompt 7: a closing ring around the point every few seconds while the player holds it
    a.ringT += dt;
    if (a.ringT >= C.ring.interval) {
      a.ringT -= C.ring.interval;
      sendRing(s, a);
    }
  } else {
    // Endringsprompt 7: the progress sinks twice as fast as it fills, and is lost after «resetAfter» seconds outside
    a.draining = a.progress > 0;
    if (a.started) a.outside += dt;
    a.progress = a.outside >= C.resetAfter ? 0 : Math.max(0, a.progress - C.drain * dt);
  }
  if (a.progress >= C.holdTime) {
    complete(s, a);
    return;
  }
  if (a.left <= 0) {
    s.capture.active = null;
    s.events.push('captureMissed:' + a.id);
  }
}

/** The extra flock: lawyers head for the spot from several directions when the player first steps in. */
function sendFlock(s, a) {
  const K = C.flock;
  const n = Math.min(K.max, Math.round(K.count + K.perMin * (s.time / 60)));
  for (let i = 0; i < n; i++) {
    const dir = i % K.directions;
    const g = Math.floor(i / K.directions);
    const ang = a.angle + (dir * TAU) / K.directions;
    const rr = 10 * Math.sqrt(g), aa = g * 2.4;
    const x = a.x + Math.cos(ang) * K.distance + Math.cos(aa) * rr;
    const y = a.y + Math.sin(ang) * K.distance + Math.sin(aa) * rr;
    trySpawn(s, 'junior', Math.min(INSIDE.x1 - 12, Math.max(INSIDE.x0 + 12, x)), Math.min(INSIDE.y1 - 12, Math.max(INSIDE.y0 + 12, y)));
  }
}

/** Keeps a spawn spot inside the walls. */
const clampX = (x) => Math.min(INSIDE.x1 - 12, Math.max(INSIDE.x0 + 12, x));
const clampY = (y) => Math.min(INSIDE.y1 - 12, Math.max(INSIDE.y0 + 12, y));

/**
 * Endringsprompt 7: a ring of junior associates around the point with a clear opening; they walk in toward the
 * player. The opening's direction comes from the run's event-details stream (never the day's capture stream, whose
 * draws must not depend on how the player plays).
 */
function sendRing(s, a) {
  const K = C.ring, p = s.player;
  const n = Math.min(K.max, Math.round(K.count + K.perMin * (s.time / 60)));
  const start = s.rng.eventDetails.next() * TAU;
  const arc = TAU - K.gap;
  for (let i = 0; i < n; i++) {
    const ang = start + K.gap / 2 + (arc * (i + 0.5)) / n;
    const x = clampX(a.x + Math.cos(ang) * K.distance), y = clampY(a.y + Math.sin(ang) * K.distance);
    if ((x - p.x) ** 2 + (y - p.y) ** 2 < K.minFromPlayer ** 2) continue;
    trySpawn(s, 'junior', x, y);
  }
  // (no banner: it would come every few seconds – the ring itself is visible on its way in)
  s.events.push('captureRing');
}

/** Endringsprompt 7: from 5:00, a few «Haster!» senders around the point when the player first steps in. */
function sendSenders(s, a) {
  const K = C.senders;
  if (s.time < K.from) return;
  const n = s.time >= K.lateFrom ? K.lateCount : K.count;
  for (let i = 0; i < n; i++) {
    const ang = a.angle + Math.PI / n + (i * TAU) / n;
    trySpawn(s, 'sender', clampX(a.x + Math.cos(ang) * K.distance), clampY(a.y + Math.sin(ang) * K.distance));
  }
}

/** The point is taken: the permanent bonus, one free level and a short effect. */
function complete(s, a) {
  const st = s.capture, p = s.player;
  const def = /** @type {any} */ (C.defs[a.id]);
  st.bonus[a.id]++;
  st.active = null;
  s.stat.captures++;
  s.stat.capturedBy[a.id] = (s.stat.capturedBy[a.id] || 0) + 1;
  if (def.maxEnergy) {
    p.maxEnergy += def.maxEnergy;
    p.energy = Math.min(p.maxEnergy, p.energy + def.fill);
  }
  // Help and speed are added on top of the passives in computeBonuses()
  computeBonuses(s);
  s.freeLevels++;
  effect(s, 'text', a.x, a.y - 30, 1.4, 0, 0, 0, false, def.reward);
  s.events.push('captureDone:' + a.id);
  s.events.push('upgraded');
}

/** The help and speed bonus from the events taken so far (read by computeBonuses). */
export function captureBonus(s) {
  const b = s.capture?.bonus;
  if (!b) return { help: 0, speed: 0 };
  let help = 0, speed = 0;
  for (const id of CAPTURE_IDS) {
    const def = /** @type {any} */ (C.defs[id]);
    help += (def.help ?? 0) * b[id];
    speed += (def.speed ?? 0) * b[id];
  }
  return { help, speed };
}

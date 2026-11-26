// @ts-check
// Points and multiplier (streak).
import { CONFIG } from './config.js';

const M = CONFIG.multiplier;
/** Highest number of steps above the starting value. */
const MAX_STEPS = Math.round((M.max - M.start) / M.step);

/** Current multiplier as a number, e.g. 1.4. Internally it is stored as a number of steps (integer). */
export function multiplier(s) {
  return M.start + s.multStep * M.step;
}

/** "x1,4" */
export function multText(value) {
  return 'x' + value.toFixed(1).replace('.', ',');
}

/**
 * Gives points multiplied by the multiplier right now.
 * @returns {number} the points that were given
 */
export function givePoints(s, basis) {
  // «Bonusordning»: more points from everything
  const p = Math.round(basis * multiplier(s) * s.player.mod.points);
  s.score += p;
  return p;
}

/** Called for every lawyer who becomes happy. Raises the multiplier for every 25th. */
export function registerHelped(s) {
  if (s.multStep >= MAX_STEPS) {
    s.multCounter = 0;
    return;
  }
  s.multCounter++;
  if (s.multCounter >= M.perHelped) {
    s.multCounter = 0;
    s.multStep++;
    if (s.multStep > s.stat.maxMultStep) s.stat.maxMultStep = s.multStep;
    s.events.push('multUp');
  }
}

/**
 * Called when the player is hit: half of what has been built up above the start is lost.
 * Half steps are rounded down (x1,5 → x1,2), so that a hit always costs something.
 */
export function multHits(s) {
  const newStep = Math.floor(s.multStep / 2);
  if (newStep < s.multStep) {
    s.multStep = newStep;
    s.events.push('multDown');
  }
  s.multCounter = 0;
}

/** Experience required to go up from this level. */
export function xpNeeded(level) {
  const n = CONFIG.level;
  return Math.round(n.base + n.perLevel * level + n.square * level * level);
}

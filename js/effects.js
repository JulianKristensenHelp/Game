// @ts-check
// Visual effects (happy lawyers, pulse, toner splash …). Never affects the game logic:
// no hits, damage, points or randomness depend on them.

/** Max number of effects at the same time. */
const MAX = 900;

/** Makes an empty effect object for the pool. */
export function makeEffect() {
  return { type: '', x: 0, y: 0, t: 0, dur: 1, r: 0, a: 0, b: 0, c: 0, follow: false, text: '' };
}

/**
 * Starts an effect.
 * @param {string} type 'happy' | 'pulse' | 'splash' | 'swing' | 'flash' | 'poof' | 'text' | 'newPcFx' | 'hit' …
 * @param {number} dur duration in seconds
 * @param {number} [r] size
 * @param {number} [a] angle or other number
 * @param {number} [b] extra number
 * @param {boolean} [follow] whether the effect follows the player
 */
export function effect(s, type, x, y, dur, r = 0, a = 0, b = 0, follow = false, text = '', c = 0) {
  if (s.effects.n >= MAX) return null;
  const e = s.effects.acquire();
  e.type = type;
  e.x = x;
  e.y = y;
  e.t = 0;
  e.dur = dur;
  e.r = r;
  e.a = a;
  e.b = b;
  e.c = c;
  e.follow = follow;
  e.text = text;
  return e;
}

export function updateEffects(s, dt) {
  const f = s.effects;
  for (let i = f.n - 1; i >= 0; i--) {
    const e = f.items[i];
    e.t += dt;
    if (e.t >= e.dur) {
      if (e.type === 'hit') s.hitCount--;
      f.removeAt(i);
    }
  }
}

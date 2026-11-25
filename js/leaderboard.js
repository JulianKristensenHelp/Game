// @ts-check
// Leaderboard client. All storage goes through the two functions below,
// so it is easy to switch to another storage (e.g. the platform's own) without touching the rest of the game.

/** The address of the leaderboard API (relative, so the game can live in a subfolder). */
const API = 'api';
const TIMEOUT_MS = 5000;

/**
 * @typedef {Object} Entry
 * @property {string} name max 20 characters
 * @property {number} score
 * @property {number} time time survived in seconds
 * @property {number} helped number of lawyers helped
 * @property {number} maxMult highest multiplier
 * @property {string} [date] "YYYY-MM-DD" (Norwegian time)
 * @property {string} [character] id of the character (k1–k4)
 * @property {boolean} [fired] the round ended with «Du har fått sparken!» (a boss's countdown ran out)
 * @property {number} [spot]
 */

/**
 * @typedef {Object} Leaderboard
 * @property {string} date
 * @property {Entry[]} top the best (one entry per name)
 * @property {Entry | null} own the player's own entry with ranking (also outside the top 20)
 * @property {number} count number of participants today
 */

async function request(url, options) {
  const cancel = new AbortController();
  const timer = setTimeout(() => cancel.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: cancel.signal, cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || 'Topplisten svarte med feil ' + response.status);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches today's leaderboard.
 * @param {string} date "YYYY-MM-DD"
 * @param {string} [name] the player's name, to get their own ranking
 * @returns {Promise<Leaderboard>}
 */
export function fetchLeaderboard(date, name = '') {
  const q = new URLSearchParams({ date });
  if (name) q.set('name', name);
  return request(`${API}/leaderboard?${q}`);
}

/**
 * Submits a round. The server keeps each person's best round that day.
 * @param {Entry} entry
 * @returns {Promise<{ok: boolean, improved: boolean, spot: number}>}
 */
export function submitScore(entry) {
  return request(`${API}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
}

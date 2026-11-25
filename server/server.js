// @ts-check
// Small server for «Help Desk Survivors»: serves the game files and the shared leaderboard.
// No npm packages needed – just Node.js 22.5 or newer (uses built-in SQLite).
//
//   node server/server.js            → http://localhost:3000
//   PORT=8080 node server/server.js  → different port
//
// API:
//   GET  /api/leaderboard?date=YYYY-MM-DD&name=Kari  → { date, top: [...], own, count }
//   POST /api/score  { name, score, time, helped, maxMult, date } → { ok, improved, spot }
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../js/config.js';

const FOLDER = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(FOLDER, '..');
const PORT = Number(process.env.PORT || 3000);
const DATA_FOLDER = process.env.DATA_DIR || path.join(FOLDER, 'data');
const T = CONFIG.leaderboard;

/** Today's date in Norwegian time – the leaderboard resets at midnight in Norway. */
function dateOslo(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (t) => parts.find((d) => d.type === t)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// ---------- Storage ----------
// The storage sits behind two functions (getDay, save), so it is easy to replace.

/**
 * @typedef {{name:string, score:number, time:number, helped:number, maxMult:number, character:string}} Row
 * @typedef {{getDay:(date:string)=>Row[], save:(date:string, key:string, row:Row)=>boolean, deleteOlder:(date:string)=>void, type:string}} Store
 */

/** Data files from older versions get the new file name (the content is migrated when it is opened). */
function renameOldDataFile(oldName, newName) {
  const from = path.join(DATA_FOLDER, oldName), to = path.join(DATA_FOLDER, newName);
  if (fs.existsSync(from) && !fs.existsSync(to)) {
    try {
      fs.renameSync(from, to);
    } catch {
      return from; // the file is in use (e.g. by another server): keep using it under the old name
    }
  }
  return to;
}

/** SQLite store (built into Node 22.5+). @returns {Promise<Store>} */
async function makeSqliteStore() {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(DATA_FOLDER, { recursive: true });
  const db = new DatabaseSync(renameOldDataFile('toppliste.db', 'leaderboard.db'));
  db.exec(`CREATE TABLE IF NOT EXISTS entries (
    date TEXT NOT NULL, name_key TEXT NOT NULL, name TEXT NOT NULL,
    score INTEGER NOT NULL, time INTEGER NOT NULL, helped INTEGER NOT NULL, max_mult REAL NOT NULL,
    character TEXT NOT NULL DEFAULT '',
    updated TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (date, name_key))`);
  // Databases from older versions used Norwegian table and column names: copy the rows over once.
  const oldTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'innslag'").get();
  if (oldTable) {
    const columns = /** @type {any[]} */ (db.prepare('PRAGMA table_info(innslag)').all()).map((c) => c.name);
    const character = columns.includes('karakter') ? 'karakter' : "''";
    db.exec(`BEGIN;
      INSERT OR IGNORE INTO entries (date, name_key, name, score, time, helped, max_mult, character, updated)
        SELECT dato, noekkel, navn, score, tid, hjulpne, maks_mult, ${character}, oppdatert FROM innslag;
      DROP TABLE innslag;
      COMMIT;`);
  }
  const load = db.prepare('SELECT name, score, time, helped, max_mult AS maxMult, character FROM entries WHERE date = ? ORDER BY score DESC, time DESC, updated ASC');
  const getOne = db.prepare('SELECT score FROM entries WHERE date = ? AND name_key = ?');
  const upsert = db.prepare(`INSERT INTO entries (date, name_key, name, score, time, helped, max_mult, character) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (date, name_key) DO UPDATE SET name = excluded.name, score = excluded.score, time = excluded.time,
      helped = excluded.helped, max_mult = excluded.max_mult, character = excluded.character, updated = datetime('now')`);
  const erase = db.prepare('DELETE FROM entries WHERE date < ?');
  return {
    type: 'SQLite',
    getDay: (date) => /** @type {any} */ (load.all(date)),
    save(date, key, row) {
      const old = /** @type {any} */ (getOne.get(date, key));
      if (old && old.score >= row.score) return false;
      upsert.run(date, key, row.name, row.score, row.time, row.helped, row.maxMult, row.character);
      return true;
    },
    deleteOlder: (date) => void erase.run(date),
  };
}

/** Field names used by the JSON file in older versions. */
const OLD_FIELDS = { navn: 'name', tid: 'time', hjulpne: 'helped', maksMult: 'maxMult', karakter: 'character' };

/** Fallback: simple JSON file, if SQLite is not available in this Node version. @returns {Store} */
function makeFileStore() {
  fs.mkdirSync(DATA_FOLDER, { recursive: true });
  const file = renameOldDataFile('toppliste.json', 'leaderboard.json');
  /** @type {Record<string, Record<string, Row>>} */
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const day of Object.values(data)) for (const row of Object.values(day)) for (const [old, now] of Object.entries(OLD_FIELDS)) if (old in row) { row[now] = row[old]; delete row[old]; }
  } catch {
    /* new file */
  }
  const write = () => fs.writeFileSync(file, JSON.stringify(data));
  return {
    type: 'JSON-fil',
    getDay: (date) => Object.values(data[date] || {}).sort((a, b) => b.score - a.score || b.time - a.time),
    save(date, key, row) {
      const day = (data[date] ||= {});
      if (day[key] && day[key].score >= row.score) return false;
      day[key] = row;
      write();
      return true;
    },
    deleteOlder(date) {
      for (const d of Object.keys(data)) if (d < date) delete data[d];
      write();
    },
  };
}

/** @type {Store} */
let store;
try {
  store = await makeSqliteStore();
} catch (error) {
  console.warn('SQLite er ikke tilgjengelig, bruker JSON-fil i stedet:', /** @type {any} */ (error)?.message);
  store = makeFileStore();
}

// ---------- Validation (simple protection against cheating) ----------

/** The highest score that is realistic for a round of `time` seconds. */
function maxRealisticScore(time) {
  const maxMult = CONFIG.multiplier.max;
  const B = CONFIG.enemies.boss;
  let max = 5000 + time * T.maxPointsPerSecond;
  // Bosses (the points increase with each boss) and urgent cases come in addition.
  const bosses = time >= B.first ? Math.floor((time - B.first) / B.interval) + 1 : 0;
  for (let i = 0; i < bosses; i++) max += B.points * Math.pow(B.pointsPerBoss, i) * maxMult;
  max += Math.ceil(time / CONFIG.enemies.urgent.intervalMin) * CONFIG.enemies.urgent.points * maxMult;
  return max;
}

/** @returns {{error: string} | {row: Row, key: string, date: string}} */
function validate(body) {
  if (!body || typeof body !== 'object') return { error: 'Ugyldig innsending.' };
  const name = typeof body.name === 'string' ? body.name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim() : '';
  if (!name) return { error: 'Navnet kan ikke være tomt.' };
  if ([...name].length > T.maxName) return { error: `Navnet kan være maks ${T.maxName} tegn.` };
  const { score, time, helped, maxMult } = body;
  for (const v of [score, time, helped, maxMult]) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return { error: 'Ugyldige tall i innsendingen.' };
  }
  if (!Number.isInteger(score) || !Number.isInteger(helped)) return { error: 'Ugyldige tall i innsendingen.' };
  const date = dateOslo();
  // The round must have been played on today's shift (some leeway right after midnight is handled by accepting yesterday's seed).
  if (body.date !== date && body.date !== dateOslo(new Date(Date.now() - 3 * 3600 * 1000))) return { error: 'Runden gjelder ikke dagens vakt.' };
  if (time < 3 || time > 6 * 3600) return { error: 'Urealistisk tid.' };
  if (score > maxRealisticScore(time)) return { error: 'Urealistisk poengsum.' };
  if (helped > 50 + time * T.maxHelpedPerSecond) return { error: 'Urealistisk antall hjulpne.' };
  if (maxMult < CONFIG.multiplier.start - 1e-6 || maxMult > CONFIG.multiplier.max + 1e-6) return { error: 'Ugyldig multiplikator.' };
  const character = typeof body.character === 'string' && CONFIG.characters.some((k) => k.id === body.character) ? body.character : '';
  return {
    date,
    key: name.toLocaleLowerCase('nb'),
    row: { name, score, time: Math.round(time), helped, maxMult: Math.round(maxMult * 10) / 10, character },
  };
}

/** Limits the number of submissions per minute per address. */
const submissions = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (submissions.get(ip) || []).filter((t) => now - t < 60_000);
  if (list.length >= T.maxSubmissionsPerMinute) {
    submissions.set(ip, list);
    return true;
  }
  list.push(now);
  submissions.set(ip, list);
  if (submissions.size > 5000) submissions.clear();
  return false;
}

// ---------- HTTP ----------

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
/** Only these are served openly on the web (not the server folder or the database). */
const OPEN = ['/index.html', '/css/', '/js/', '/fonts/'];

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function leaderboard(date, name) {
  const all = store.getDay(date).map((r, i) => ({ spot: i + 1, ...r }));
  const key = name.trim().toLocaleLowerCase('nb');
  const own = key ? all.find((r) => r.name.toLocaleLowerCase('nb') === key) || null : null;
  return { date, top: all.slice(0, T.show), own, count: all.length };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let text = '';
    req.on('data', (bit) => {
      text += bit;
      if (text.length > 2000) {
        reject(new Error('for stor'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(text));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://x');
    const urlPath = decodeURIComponent(url.pathname);

    if (urlPath === '/api/leaderboard' && req.method === 'GET') {
      // Only today's list is shown; earlier days are not needed.
      return json(res, 200, leaderboard(dateOslo(), url.searchParams.get('name') || ''));
    }
    if (urlPath === '/api/score' && req.method === 'POST') {
      const ip = req.socket.remoteAddress || '?';
      if (tooMany(ip)) return json(res, 429, { error: 'For mange innsendinger. Vent et minutt og prøv igjen.' });
      let body;
      try {
        body = JSON.parse(String(await readBody(req)));
      } catch {
        return json(res, 400, { error: 'Ugyldig innsending.' });
      }
      const v = validate(body);
      if ('error' in v) return json(res, 400, { error: v.error });
      store.deleteOlder(v.date);
      const improved = store.save(v.date, v.key, v.row);
      const list = leaderboard(v.date, v.row.name);
      return json(res, 200, { ok: true, improved, spot: list.own?.spot ?? 0 });
    }
    if (urlPath.startsWith('/api/')) return json(res, 404, { error: 'Fant ikke.' });

    // Static files
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    const rel = urlPath === '/' ? '/index.html' : urlPath;
    const file = path.join(ROOT, path.normalize(rel));
    if (!file.startsWith(ROOT + path.sep) || !OPEN.some((a) => rel === a || (a.endsWith('/') && rel.startsWith(a)))) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Fant ikke siden.');
    }
    fs.readFile(file, (error, content) => {
      if (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Fant ikke siden.');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    });
  } catch (error) {
    console.error(error);
    json(res, 500, { error: 'Noe gikk galt på serveren.' });
  }
});

server.listen(PORT, () => {
  console.log(`«Har du prøvd å skru den av og på?» kjører på http://localhost:${PORT}`);
  console.log(`Toppliste-lagring: ${store.type} (${DATA_FOLDER})`);
});

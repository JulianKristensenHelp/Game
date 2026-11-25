// @ts-check
// Liten server for «Help Desk Survivors»: leverer spillfilene og den felles topplisten.
// Ingen npm-pakker trengs – bare Node.js 22.5 eller nyere (bruker innebygd SQLite).
//
//   node server/server.js            → http://localhost:3000
//   PORT=8080 node server/server.js  → annen port
//
// API:
//   GET  /api/toppliste?dato=ÅÅÅÅ-MM-DD&navn=Kari  → { dato, topp: [...], egen, antall }
//   POST /api/score  { navn, score, tid, hjulpne, maksMult, dato } → { ok, forbedret, plass }
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../js/config.js';

const MAPPE = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(MAPPE, '..');
const PORT = Number(process.env.PORT || 3000);
const DATAMAPPE = process.env.DATA_DIR || path.join(MAPPE, 'data');
const T = CONFIG.toppliste;

/** Dagens dato i norsk tid – topplisten nullstilles ved midnatt i Norge. */
function datoOslo(naa = new Date()) {
  const deler = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(naa);
  const hent = (t) => deler.find((d) => d.type === t)?.value ?? '';
  return `${hent('year')}-${hent('month')}-${hent('day')}`;
}

// ---------- Lagring ----------
// Lagringen ligger bak to funksjoner (hentDag, lagre), så den er lett å bytte ut.

/**
 * @typedef {{navn:string, score:number, tid:number, hjulpne:number, maksMult:number, karakter:string}} Rad
 * @typedef {{hentDag:(dato:string)=>Rad[], lagre:(dato:string, noekkel:string, rad:Rad)=>boolean, slettEldre:(dato:string)=>void, type:string}} Lager
 */

/** SQLite-lager (innebygd i Node 22.5+). @returns {Promise<Lager>} */
async function lagSqliteLager() {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(DATAMAPPE, { recursive: true });
  const db = new DatabaseSync(path.join(DATAMAPPE, 'toppliste.db'));
  db.exec(`CREATE TABLE IF NOT EXISTS innslag (
    dato TEXT NOT NULL, noekkel TEXT NOT NULL, navn TEXT NOT NULL,
    score INTEGER NOT NULL, tid INTEGER NOT NULL, hjulpne INTEGER NOT NULL, maks_mult REAL NOT NULL,
    karakter TEXT NOT NULL DEFAULT '',
    oppdatert TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (dato, noekkel))`);
  // Eldre databaser (før karakterene kom) får den nye kolonnen her.
  try {
    db.exec("ALTER TABLE innslag ADD COLUMN karakter TEXT NOT NULL DEFAULT ''");
  } catch {
    /* kolonnen finnes allerede */
  }
  const hent = db.prepare('SELECT navn, score, tid, hjulpne, maks_mult AS maksMult, karakter FROM innslag WHERE dato = ? ORDER BY score DESC, tid DESC, oppdatert ASC');
  const hentEn = db.prepare('SELECT score FROM innslag WHERE dato = ? AND noekkel = ?');
  const sett = db.prepare(`INSERT INTO innslag (dato, noekkel, navn, score, tid, hjulpne, maks_mult, karakter) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (dato, noekkel) DO UPDATE SET navn = excluded.navn, score = excluded.score, tid = excluded.tid,
      hjulpne = excluded.hjulpne, maks_mult = excluded.maks_mult, karakter = excluded.karakter, oppdatert = datetime('now')`);
  const slett = db.prepare('DELETE FROM innslag WHERE dato < ?');
  return {
    type: 'SQLite',
    hentDag: (dato) => /** @type {any} */ (hent.all(dato)),
    lagre(dato, noekkel, rad) {
      const gammel = /** @type {any} */ (hentEn.get(dato, noekkel));
      if (gammel && gammel.score >= rad.score) return false;
      sett.run(dato, noekkel, rad.navn, rad.score, rad.tid, rad.hjulpne, rad.maksMult, rad.karakter);
      return true;
    },
    slettEldre: (dato) => void slett.run(dato),
  };
}

/** Reserve: enkel JSON-fil, hvis SQLite ikke finnes i denne Node-versjonen. @returns {Lager} */
function lagFilLager() {
  fs.mkdirSync(DATAMAPPE, { recursive: true });
  const fil = path.join(DATAMAPPE, 'toppliste.json');
  /** @type {Record<string, Record<string, Rad>>} */
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(fil, 'utf8'));
  } catch {
    /* ny fil */
  }
  const skriv = () => fs.writeFileSync(fil, JSON.stringify(data));
  return {
    type: 'JSON-fil',
    hentDag: (dato) => Object.values(data[dato] || {}).sort((a, b) => b.score - a.score || b.tid - a.tid),
    lagre(dato, noekkel, rad) {
      const dag = (data[dato] ||= {});
      if (dag[noekkel] && dag[noekkel].score >= rad.score) return false;
      dag[noekkel] = rad;
      skriv();
      return true;
    },
    slettEldre(dato) {
      for (const d of Object.keys(data)) if (d < dato) delete data[d];
      skriv();
    },
  };
}

/** @type {Lager} */
let lager;
try {
  lager = await lagSqliteLager();
} catch (feil) {
  console.warn('SQLite er ikke tilgjengelig, bruker JSON-fil i stedet:', /** @type {any} */ (feil)?.message);
  lager = lagFilLager();
}

// ---------- Validering (enkel beskyttelse mot juks) ----------

/** Høyeste poengsum som er realistisk for en runde på «tid» sekunder. */
function maksRealistiskScore(tid) {
  const maksMult = CONFIG.multiplikator.maks;
  const B = CONFIG.fiender.boss;
  let maks = 5000 + tid * T.maksPoengPerSekund;
  // Bosser (poengene øker for hver boss) og hastesaker kommer i tillegg.
  const bosser = tid >= B.forste ? Math.floor((tid - B.forste) / B.intervall) + 1 : 0;
  for (let i = 0; i < bosser; i++) maks += B.poeng * Math.pow(B.poengPerBoss, i) * maksMult;
  maks += Math.ceil(tid / CONFIG.fiender.hastesak.intervallMin) * CONFIG.fiender.hastesak.poeng * maksMult;
  return maks;
}

/** @returns {{feil: string} | {rad: Rad, noekkel: string, dato: string}} */
function valider(inn) {
  if (!inn || typeof inn !== 'object') return { feil: 'Ugyldig innsending.' };
  const navn = typeof inn.navn === 'string' ? inn.navn.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim() : '';
  if (!navn) return { feil: 'Navnet kan ikke være tomt.' };
  if ([...navn].length > T.maksNavn) return { feil: `Navnet kan være maks ${T.maksNavn} tegn.` };
  const { score, tid, hjulpne, maksMult } = inn;
  for (const v of [score, tid, hjulpne, maksMult]) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return { feil: 'Ugyldige tall i innsendingen.' };
  }
  if (!Number.isInteger(score) || !Number.isInteger(hjulpne)) return { feil: 'Ugyldige tall i innsendingen.' };
  const dato = datoOslo();
  // Runden må være spilt på dagens vakt (litt slingringsmonn rett etter midnatt håndteres ved å godta gårsdagens seed).
  if (inn.dato !== dato && inn.dato !== datoOslo(new Date(Date.now() - 3 * 3600 * 1000))) return { feil: 'Runden gjelder ikke dagens vakt.' };
  if (tid < 3 || tid > 6 * 3600) return { feil: 'Urealistisk tid.' };
  if (score > maksRealistiskScore(tid)) return { feil: 'Urealistisk poengsum.' };
  if (hjulpne > 50 + tid * T.maksHjulpnePerSekund) return { feil: 'Urealistisk antall hjulpne.' };
  if (maksMult < CONFIG.multiplikator.start - 1e-6 || maksMult > CONFIG.multiplikator.maks + 1e-6) return { feil: 'Ugyldig multiplikator.' };
  const karakter = typeof inn.karakter === 'string' && CONFIG.karakterer.some((k) => k.id === inn.karakter) ? inn.karakter : '';
  return {
    dato,
    noekkel: navn.toLocaleLowerCase('nb'),
    rad: { navn, score, tid: Math.round(tid), hjulpne, maksMult: Math.round(maksMult * 10) / 10, karakter },
  };
}

/** Begrenser antall innsendinger per minutt per adresse. */
const innsendinger = new Map();
function forMange(ip) {
  const naa = Date.now();
  const liste = (innsendinger.get(ip) || []).filter((t) => naa - t < 60_000);
  if (liste.length >= T.maksInnsendingerPerMinutt) {
    innsendinger.set(ip, liste);
    return true;
  }
  liste.push(naa);
  innsendinger.set(ip, liste);
  if (innsendinger.size > 5000) innsendinger.clear();
  return false;
}

// ---------- HTTP ----------

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
/** Bare disse ligger åpent på nett (ikke server-mappen eller databasen). */
const AAPNE = ['/index.html', '/css/', '/js/', '/fonts/'];

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function toppliste(dato, navn) {
  const alle = lager.hentDag(dato).map((r, i) => ({ plass: i + 1, ...r }));
  const noekkel = navn.trim().toLocaleLowerCase('nb');
  const egen = noekkel ? alle.find((r) => r.navn.toLocaleLowerCase('nb') === noekkel) || null : null;
  return { dato, topp: alle.slice(0, T.vis), egen, antall: alle.length };
}

function lesKropp(req) {
  return new Promise((resolve, reject) => {
    let tekst = '';
    req.on('data', (bit) => {
      tekst += bit;
      if (tekst.length > 2000) {
        reject(new Error('for stor'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(tekst));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://x');
    const sti = decodeURIComponent(url.pathname);

    if (sti === '/api/toppliste' && req.method === 'GET') {
      // Bare dagens liste vises; tidligere dager trengs ikke.
      return json(res, 200, toppliste(datoOslo(), url.searchParams.get('navn') || ''));
    }
    if (sti === '/api/score' && req.method === 'POST') {
      const ip = req.socket.remoteAddress || '?';
      if (forMange(ip)) return json(res, 429, { feil: 'For mange innsendinger. Vent et minutt og prøv igjen.' });
      let inn;
      try {
        inn = JSON.parse(String(await lesKropp(req)));
      } catch {
        return json(res, 400, { feil: 'Ugyldig innsending.' });
      }
      const v = valider(inn);
      if ('feil' in v) return json(res, 400, { feil: v.feil });
      lager.slettEldre(v.dato);
      const forbedret = lager.lagre(v.dato, v.noekkel, v.rad);
      const liste = toppliste(v.dato, v.rad.navn);
      return json(res, 200, { ok: true, forbedret, plass: liste.egen?.plass ?? 0 });
    }
    if (sti.startsWith('/api/')) return json(res, 404, { feil: 'Fant ikke.' });

    // Statiske filer
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    const rel = sti === '/' ? '/index.html' : sti;
    const fil = path.join(ROT, path.normalize(rel));
    if (!fil.startsWith(ROT + path.sep) || !AAPNE.some((a) => rel === a || (a.endsWith('/') && rel.startsWith(a)))) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Fant ikke siden.');
    }
    fs.readFile(fil, (feil, innhold) => {
      if (feil) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Fant ikke siden.');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fil)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : innhold);
    });
  } catch (feil) {
    console.error(feil);
    json(res, 500, { feil: 'Noe gikk galt på serveren.' });
  }
});

server.listen(PORT, () => {
  console.log(`«Har du prøvd å skru den av og på?» kjører på http://localhost:${PORT}`);
  console.log(`Toppliste-lagring: ${lager.type} (${DATAMAPPE})`);
});

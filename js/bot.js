// @ts-check
// The automatic test player (Endringsprompt 6, section 7): plays whole rounds on its own at full speed with no drawing,
// for balance tests. Used by tools/bot-test.js (Node) and by the «Bot-test» button in ?debug (in the browser).
// It only reads the game state and sends the same input a player would (a direction, and a card choice) – it never
// changes the game in any other way, so a round it plays is a normal round.
import { Game } from './game.js';
import { CONFIG } from './config.js';
import { Rng } from './utils.js';
import { INSIDE } from './map.js';
import { weaponStats } from './weapons.js';
import { weaponMaxed } from './upgrades.js';
import { captureRadius } from './capture.js';

const B = CONFIG.botTest;

/**
 * A bot: steers away from the flock and walls, fetches energy drinks when low, collects tickets, takes the capture
 * points and goes for the bosses. Picks cards with a simple strategy: combinations first, then weapons until the
 * slots are full, upgrades to its weapons, the passives its combinations need, and useful passives.
 * @param {number} skill 0–1: how often it «pays attention» (1 = reacts every other tick, never wanders off)
 * @param {string} seed its own randomness (never the game's streams)
 * @param {boolean} [focus] Endringsprompt 7: put every card into the starting weapon and its combination passive, to
 *   find the earliest a combination can come (otherwise the balanced build of a sensible player)
 */
export function makeBot(skill, seed, focus = false) {
  const rng = new Rng('bot|' + seed);
  let ix = 0, iy = 0, wait = 0;
  const useful = B.usefulPassives;
  return {
    /** @returns {[number, number]} */
    steer(s) {
      if (--wait > 0) return [ix, iy];
      wait = skill > 0.8 ? 2 : Math.round(4 + (1 - skill) * 26);
      const p = s.player;
      let fx = 0, fy = 0, nearest = 1e9;
      const f = s.enemies;
      for (let i = 0; i < f.n; i++) {
        const e = f.items[i];
        if (!e.active || e.leaving || e.type === 'urgent') continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.max(1, Math.hypot(dx, dy) - e.r - p.r);
        if (d > 150) continue;
        if (d < nearest) nearest = d;
        const v = 1 / (d * d);
        fx += (dx / (d + 1)) * v;
        fy += (dy / (d + 1)) * v;
      }
      for (let i = 0; i < s.enemyShots.n; i++) {
        const q = s.enemyShots.items[i];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.max(1, Math.hypot(dx, dy) - p.r);
        if (d > 70) continue;
        if (d < nearest) nearest = d;
        const v = 1.5 / (d * d);
        fx += (dx / (d + 1)) * v;
        fy += (dy / (d + 1)) * v;
      }
      const vm = 70, vv = 1 / (vm * vm);
      if (p.x - INSIDE.x0 < vm) fx += vv * (1 - (p.x - INSIDE.x0) / vm) * 4;
      if (INSIDE.x1 - p.x < vm) fx -= vv * (1 - (INSIDE.x1 - p.x) / vm) * 4;
      if (p.y - INSIDE.y0 < vm) fy += vv * (1 - (p.y - INSIDE.y0) / vm) * 4;
      if (INSIDE.y1 - p.y < vm) fy -= vv * (1 - (INSIDE.y1 - p.y) / vm) * 4;
      // Goal: an energy drink when low, otherwise pickups and tickets
      let tx = 0, ty = 0, best = 1e9;
      const needsDrink = p.energy < p.maxEnergy * (skill > 0.8 ? 0.7 : 0.5);
      for (let i = 0; i < s.pickups.n; i++) {
        const k = s.pickups.items[i];
        if ((k.type === 'fakeDrink' || k.type === 'fakePc') && skill >= 0.8) continue;
        const d = Math.hypot(k.x - p.x, k.y - p.y) * (k.type === 'drink' || k.type === 'fakeDrink' ? (needsDrink ? 0.05 : 2) : k.type === 'cloud' ? (s.tickets.n > 60 ? 0.3 : 3) : 0.3);
        if (d < best) { best = d; tx = k.x - p.x; ty = k.y - p.y; }
      }
      const l = s.tickets;
      for (let i = 0; i < l.n; i++) {
        const d = Math.hypot(l.items[i].x - p.x, l.items[i].y - p.y) / Math.sqrt(l.items[i].xp / 10);
        if (d < best) { best = d; tx = l.items[i].x - p.x; ty = l.items[i].y - p.y; }
      }
      const cap = s.capture.active;
      if (cap && skill >= 0.5 && !needsDrink) {
        // into the circle, and then keep moving inside it (it shrinks as the progress grows, Endringsprompt 7)
        const cx = cap.x - p.x, cy = cap.y - p.y;
        if (Math.hypot(cx, cy) > captureRadius(cap) * 0.5) { tx = cx; ty = cy; best = 0; }
      }
      if (best === 1e9) { tx = 1280 - p.x; ty = 740 - p.y; }
      // Like a human: when it is safe, close in on the nearest lawyer so the short weapons hit
      let wanted = 110;
      for (const w of p.weapons) {
        const t = weaponStats(w);
        if (w.id === 'powerCycle') wanted = Math.min(wanted, t.radius * p.mod.area);
        else if (w.id === 'hdmi') wanted = Math.min(wanted, t.lengthPx * p.mod.area);
        else if (w.id === 'mouse' || (w.id === 'ctrlz' && w.evo)) wanted = Math.min(wanted, (t.track ?? t.radius) * p.mod.area);
      }
      if (nearest > wanted * 0.9 + 8 && nearest < 220) {
        let ex = 0, ey = 0, ed = 1e9;
        for (let i = 0; i < f.n; i++) {
          const e = f.items[i];
          if (!e.active || e.leaving || e.type === 'urgent') continue;
          const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
          if (d < ed) { ed = d; ex = e.x - p.x; ey = e.y - p.y; }
        }
        const el = Math.hypot(ex, ey) || 1, tl0 = Math.hypot(tx, ty) || 1;
        const weight = best < 40 ? 0.2 : 0.5;
        tx = (tx / tl0) * (1 - weight) + (ex / el) * weight;
        ty = (ty / tl0) * (1 - weight) + (ey / el) * weight;
      }
      // The bosses are mandatory: go for them and stay within reach of the shortest weapon
      const boss = s.boss && s.boss.active ? s.boss : null;
      if (boss && !needsDrink && skill >= 0.6) {
        const bx = boss.x - p.x, by = boss.y - p.y, bd = Math.hypot(bx, by) || 1;
        const reach = Math.max(40, wanted * 0.8) + boss.r;
        const toward = bd > reach ? 1 : 0.2;
        tx = (bx / bd) * toward;
        ty = (by / bd) * toward;
      }
      const tl = Math.hypot(tx, ty) || 1, fl = Math.hypot(fx, fy) || 1;
      const m = (skill > 0.8 ? 0.45 : 1) * Math.min(1, wanted / 80);
      let fear = nearest < 20 * m ? 1 : nearest < 55 * m ? 0.75 : nearest < 100 * m ? 0.35 : 0.08;
      if (boss && !needsDrink && skill >= 0.6 && boss.timer < 70) fear *= 0.5;
      ix = (fx / fl) * fear + (tx / tl) * (1 - fear);
      iy = (fy / fl) * fear + (ty / tl) * (1 - fear);
      if (rng.next() > skill) {
        const a = rng.next() * 6.283;
        ix = Math.cos(a);
        iy = Math.sin(a);
      }
      return [ix, iy];
    },
    /** The card it picks (index). */
    choose(s) {
      const sp = s.player;
      const needed = new Set();
      for (const w of sp.weapons) {
        const k = /** @type {any} */ (CONFIG.weapons[w.id]).combination;
        if (k && !w.evo) needed.add(k.passive);
      }
      let pick = 0, bestV = -1;
      const main = sp.weapons[0];
      const mainPassive = main ? /** @type {any} */ (CONFIG.weapons[main.id]).combination?.passive : '';
      s.cards.forEach((c, i) => {
        let v = 1;
        if (c.kind === 'combination' || c.kind === 'matrix') v = 100;
        // The focused bot: only the starting weapon and the passive its combination needs, then whatever is useful
        else if (focus && c.kind === 'upgrade' && main && c.id === main.id && !weaponMaxed(main)) v = 90;
        else if (focus && c.kind === 'passive' && c.id === mainPassive && !sp.passives.some((p) => p.id === c.id)) v = 85;
        else if (focus && c.kind === 'weapon') v = sp.weapons.length < 1 ? 50 : 2;
        // A balanced build, like a sensible player: fill the weapon slots, and level the weapons evenly (the lowest first)
        else if (c.kind === 'weapon') v = sp.weapons.length < CONFIG.limits.weapons ? 55 : 0;
        else if (c.kind === 'upgrade') {
          const w = sp.weapons.find((x) => x.id === c.id);
          v = 40 + c.tier * 4 - (w ? w.picks * B.spreadUpgrades : 0) + (w && !weaponMaxed(w) ? 0 : -30);
        } else if (c.kind === 'passive') {
          const have = sp.passives.find((p) => p.id === c.id);
          v = needed.has(c.id) && !have ? 70 : needed.has(c.id) ? 18 : useful.includes(c.id) ? 30 - useful.indexOf(c.id) : 8;
        } else if (c.kind === 'coffee') v = 0;
        v += rng.next() * 3;
        if (v > bestV) { bestV = v; pick = i; }
      });
      // Like a good player (Endringsprompt 7): nothing for the build on the table → use a reroll («Nytt utvalg») if
      // there is one, and look again. Only through the game's own reroll, as a player would press it.
      if (bestV < B.rerollBelow && !s.cards.some((c) => c.highlighted) && s.reroll()) return this.choose(s);
      return pick;
    },
  };
}

/** A run seed for test round no. i (fixed, so a test can be repeated; hex like the game's). */
export function testSeed(i) {
  const r = new Rng('bottest|' + i);
  return Math.floor(r.next() * 0xffffffff).toString(16).padStart(8, '0') + Math.floor(r.next() * 0xffffffff).toString(16).padStart(8, '0');
}

/**
 * Plays one round to the end (or maxMin minutes) and measures it.
 * @param {{date: string, character: number, runSeed: string, skill: number, maxMin?: number, focus?: boolean}} o
 */
export function playBotRound(o) {
  const s = new Game(o.date, o.character, o.runSeed);
  s.offerLog = {};
  const bot = makeBot(o.skill, o.runSeed, !!o.focus);
  /** Endringsprompt 7: the player's level at the end of every whole minute. */
  const levelAt = /** @type {number[]} */ ([]);
  const maxTicks = (o.maxMin ?? B.maxMinutes) * 60 * CONFIG.ticksPerSecond;
  /** Help given per weapon (as a combination: «evo:<id>») and the seconds it was held, sampled every second. */
  const help = /** @type {Record<string, number>} */ ({}), held = /** @type {Record<string, number>} */ ({});
  const last = /** @type {Record<string, number>} */ ({});
  const combos = /** @type {number[]} */ ([]);
  let combosSeen = 0;
  for (let t = 0; t < maxTicks && s.status !== 'done'; t++) {
    const [ix, iy] = bot.steer(s);
    s.tick(ix, iy);
    s.events.length = 0;
    if (s.status === 'package') s.closePackage();
    while (s.status === 'levelUp') s.chooseCard(bot.choose(s));
    while (combosSeen < s.stat.combinations.length) {
      combos.push(s.time);
      combosSeen++;
    }
    if (t % CONFIG.ticksPerSecond === 0) {
      if (t > 0 && t % (60 * CONFIG.ticksPerSecond) === 0) levelAt.push(s.level);
      for (const w of s.player.weapons) {
        const src = w.id;
        const total = s.stat.helpPerWeapon[src] || 0;
        const key = w.evo ? 'evo:' + w.id : w.id;
        help[key] = (help[key] || 0) + Math.max(0, total - (last[src] ?? total));
        held[key] = (held[key] || 0) + 1;
        last[src] = total;
      }
    }
  }
  /** Bosses met and fired by, per type. */
  const met = /** @type {Record<string, number>} */ ({});
  for (const b of s.stat.bossLog) met[b.type] = (met[b.type] || 0) + 1;
  return {
    time: s.time, level: s.level, score: s.score, fired: s.fired ? s.fired.type : '', met, combos,
    levelLog: s.levelLog.slice(), captures: s.stat.captures, captureEvents: s.stat.captureEvents,
    help, held, offers: s.offerLog, character: s.character,
    build: s.player.weapons.map((w) => (w.evo ? 'evo:' : '') + w.id),
    levelAt, xpLog: { ...s.xpLog }, levelsBy: { ...s.levelsBy }, upgradesBy: { ...s.upgradesBy },
  };
}

/** The median, mean and best-10 % of a list of numbers. */
export function spread(list) {
  const a = [...list].sort((x, y) => x - y);
  const q = (f) => a[Math.min(a.length - 1, Math.floor(f * a.length))];
  return { mean: a.reduce((x, y) => x + y, 0) / (a.length || 1), median: q(0.5), p10: q(0.1), p90: q(0.9), max: a[a.length - 1] ?? 0 };
}

/**
 * Sums up many rounds into a report (plain text, Norwegian, for the console and the debug overlay).
 * @param {ReturnType<typeof playBotRound>[]} rounds
 */
export function botReport(rounds, title = 'Bot-test') {
  const out = [];
  const min = (v) => (v / 60).toFixed(1).replace('.', ',');
  const n = rounds.length;
  const t = spread(rounds.map((r) => r.time));
  out.push(`${title}: ${n} runder`);
  out.push(`Varighet (min): snitt ${min(t.mean)} · median ${min(t.median)} · beste 10 % fra ${min(t.p90)} · lengste ${min(t.max)}`);
  const c1 = rounds.filter((r) => r.combos.length >= 1).map((r) => r.combos[0]);
  const c2 = rounds.filter((r) => r.combos.length >= 2).map((r) => r.combos[1]);
  out.push(`Første kombinasjon: ${c1.length} av ${n} runder, tidligst ${c1.length ? min(Math.min(...c1)) : '-'} · snitt ${c1.length ? min(spread(c1).mean) : '-'} · median ${c1.length ? min(spread(c1).median) : '-'} min · andre: ${c2.length} runder, median ${c2.length ? min(spread(c2).median) : '-'} min`);
  // Endringsprompt 7: the player's level at the end of each minute (mean of the rounds still going)
  const lv = [];
  for (let m = 1; m <= 16; m++) {
    const alive = rounds.filter((r) => (r.levelAt ?? []).length >= m);
    if (alive.length < Math.max(3, n * 0.1)) break;
    lv.push(`${m}:${(alive.reduce((x, r) => x + r.levelAt[m - 1], 0) / alive.length).toFixed(1).replace('.', ',')}`);
  }
  out.push(`Spillernivå ved hvert minutt (minutt:nivå): ${lv.join(' ')}`);
  // Endringsprompt 7: where the experience and the levels came from, summed over all rounds
  const xs = /** @type {Record<string, number>} */ ({});
  let byXp = 0, byCap = 0, byCard = 0, byPack = 0;
  for (const r of rounds) {
    for (const [k, v] of Object.entries(r.xpLog ?? {})) xs[k] = (xs[k] || 0) + v;
    byXp += r.levelsBy?.xp ?? 0; byCap += r.levelsBy?.capture ?? 0;
    byCard += r.upgradesBy?.card ?? 0; byPack += r.upgradesBy?.package ?? 0;
  }
  const xt = Object.values(xs).reduce((a, b) => a + b, 0) || 1;
  out.push('Erfaring fra (andel): ' + Object.keys(xs).filter((k) => xs[k] > 0).map((k) => `${k} ${Math.round((xs[k] / xt) * 100)} %`).join(' · ') +
    ` | nivåopp per runde: ${(byXp / n).toFixed(1)} fra erfaring, ${(byCap / n).toFixed(1)} fra punkt | oppgraderinger per runde: ${(byCard / n).toFixed(1)} kort, ${(byPack / n).toFixed(1)} fra pakker`);
  // Endringsprompt 7: the characters side by side (median duration and median first combination)
  out.push('Per karakter (median varighet / median første kombinasjon): ' + CONFIG.characters.map((k, i) => {
    const mine = rounds.filter((r) => r.character === i);
    const fc = mine.filter((r) => r.combos.length).map((r) => r.combos[0]);
    return `${k.name} ${mine.length ? min(spread(mine.map((r) => r.time)).median) : '-'} / ${fc.length ? min(spread(fc).median) : '-'}`;
  }).join(' · '));
  // Level-ups per minute, minute by minute (only the rounds still going)
  const per = [];
  for (let m = 0; m < 16; m++) {
    const alive = rounds.filter((r) => r.time >= (m + 1) * 60);
    if (alive.length < Math.max(3, n * 0.1)) break;
    const ups = alive.reduce((x, r) => x + r.levelLog.filter((v) => v >= m * 60 && v < (m + 1) * 60).length, 0);
    per.push(`${m + 1}:${(ups / alive.length).toFixed(1).replace('.', ',')}`);
  }
  out.push(`Nivåopp per minutt (minutt:antall): ${per.join(' ')}`);
  // Bosses: how often each one fires the player, of the times it was met
  const met = /** @type {Record<string, number>} */ ({}), fired = /** @type {Record<string, number>} */ ({});
  for (const r of rounds) {
    for (const [k, v] of Object.entries(r.met)) met[k] = (met[k] || 0) + v;
    if (r.fired) fired[r.fired] = (fired[r.fired] || 0) + 1;
  }
  out.push('Sparket av boss (av gangene bossen ble møtt): ' + Object.keys(met).map((k) => `${CONFIG.bosses[k]?.short ?? k} ${fired[k] || 0}/${met[k]}`).join(' · '));
  const caps = rounds.reduce((x, r) => x + r.captures, 0), capEv = rounds.reduce((x, r) => x + r.captureEvents, 0);
  out.push(`Punkt-hendelser tatt: ${caps} av ${capEv} (${capEv ? Math.round((caps / capEv) * 100) : 0} %)`);
  // Help per second per weapon and combination, while held
  const help = /** @type {Record<string, number>} */ ({}), held = /** @type {Record<string, number>} */ ({});
  for (const r of rounds) for (const k of Object.keys(r.help)) {
    help[k] = (help[k] || 0) + r.help[k];
    held[k] = (held[k] || 0) + r.held[k];
  }
  const rows = Object.keys(help).filter((k) => held[k] >= 30).map((k) => [k, help[k] / held[k], held[k]]).sort((a, b) => /** @type {number} */ (b[1]) - /** @type {number} */ (a[1]));
  out.push('Hjelp per sekund i rundene (mens våpenet var i bruk): ' + rows.map(([k, v]) => `${name(k)} ${Math.round(/** @type {number} */ (v))}`).join(' · '));
  // How often each card was offered
  const offers = /** @type {Record<string, number>} */ ({});
  for (const r of rounds) for (const [k, v] of Object.entries(r.offers ?? {})) offers[k] = (offers[k] || 0) + v;
  const weaponsNever = Object.keys(CONFIG.weapons).filter((id) => !CONFIG.weapons[id].hidden && !offers['weapon:' + id]);
  const passivesNever = Object.keys(CONFIG.passives).filter((id) => !offers['passive:' + id]);
  out.push(`Kort tilbudt: ${Object.values(offers).reduce((x, y) => x + y, 0)} i alt. Våpen aldri tilbudt: ${weaponsNever.join(', ') || 'ingen'}. Passive aldri tilbudt: ${passivesNever.join(', ') || 'ingen'}.`);
  out.push('  nye våpen: ' + Object.keys(CONFIG.weapons).filter((id) => !CONFIG.weapons[id].hidden).map((id) => `${id} ${offers['weapon:' + id] || 0}`).join(' · '));
  out.push('  passive: ' + Object.keys(CONFIG.passives).map((id) => `${id} ${offers['passive:' + id] || 0}`).join(' · '));
  out.push('  kombinasjoner: ' + Object.keys(offers).filter((k) => k.startsWith('combination:') || k.startsWith('matrix')).map((k) => `${k.split(':')[1]} ${offers[k]}`).join(' · '));
  return out.join('\n');
}

function name(k) {
  const id = k.replace('evo:', '');
  const w = /** @type {any} */ (CONFIG.weapons[id]);
  if (!w) return k;
  return k.startsWith('evo:') ? w.combination?.name ?? k : w.name;
}

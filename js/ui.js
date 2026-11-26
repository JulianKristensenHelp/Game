// @ts-check
// The menus (HTML): start, level-up cards, pause, settings, leaderboard, statistics and notice board.
import { CONFIG, STAT_LABEL } from './config.js';
import { mmss, formatNumber } from './utils.js';
import { multText } from './score.js';
import { weaponName, weaponStats } from './weapons.js';
import { iconElement, weaponIconId } from './icons.js';
import { statValue } from './upgrades.js';

/** @returns {HTMLElement} */
export const el = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

const SCREENS = ['start', 'characterSelect', 'levelUp', 'package', 'pause', 'settings', 'gameOver'];

/** Where the portraits come from (set by main.js). @type {(i: number) => CanvasImageSource} */
let portraitSource = () => document.createElement('canvas');
export function setPortraitSource(f) {
  portraitSource = f;
}
/** Where the 32 × 32 figures come from (the sprite sheet; frame 0 is the image exactly as it is). @type {(i: number) => any} */
let figureSource = () => null;
export function setFigureSource(f) {
  figureSource = f;
}

/**
 * Gives a pixel-art canvas a size on screen that is a whole multiple of its own size in real (device) pixels,
 * as close as possible to «cssPx». Never smoothed, never scaled by a non-integer factor.
 */
export function crisp(c, cssPx) {
  const dpr = window.devicePixelRatio || 1;
  const n = Math.max(1, Math.round((cssPx * dpr) / c.width));
  c.style.width = (c.width * n) / dpr + 'px';
  c.style.height = (c.height * n) / dpr + 'px';
  c.style.imageRendering = 'pixelated';
  return c;
}

/** A canvas element with the portrait (64 × 64) of character no. i, shown at about «cssPx» CSS pixels. */
export function portraitElement(i, cssPx = 128) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  c.className = 'portrait';
  /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(portraitSource(i), 0, 0);
  return crisp(c, cssPx);
}

/** A canvas element with the 32 × 32 figure of character no. i (for small places like the leaderboard). */
export function figureElement(i, cssPx = 32) {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  c.className = 'figure';
  const sheet = figureSource(i);
  /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(sheet.canvas, 0, sheet.sy, 32, 32, 0, 0, 32, 32);
  return crisp(c, cssPx);
}

/** Character no. from the id stored in the leaderboard ('k1'–'k4'). */
export function characterIndex(id) {
  const i = CONFIG.characters.findIndex((k) => k.id === id);
  return i;
}

/** Shows one of the screens (or none). */
export function showScreen(name) {
  for (const s of SCREENS) el(s).hidden = s !== name;
}

/** Creates an element with text (avoids innerHTML with user data, e.g. names in the leaderboard). */
function make(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = String(text);
  return e;
}

// ---------- Level-up ----------

const TIERS = CONFIG.upgrades.tiers;

/**
 * One card as a button: key hint, icon, name, tier line, text. The tier sets the colour (grey, green, blue, orange).
 * @param {import('./upgrades.js').Card} k
 */
function cardElement(k, i, choose, banish) {
  const b = make('button', `card tier${k.tier}` + (k.highlighted ? ' highlighted' : '') + (k.kind === 'matrix' ? ' matrix' : ''));
  if (i >= 0) b.append(make('kbd', 'keyHint', i + 1));
  b.append(iconElement(k.icon), make('span', 'name', k.name), make('span', 'level', k.levelText), make('span', 'text', k.text));
  if (choose) b.addEventListener('click', () => choose(i));
  if (banish && k.kind !== 'coffee') {
    // «Fjern kortet»: never offered again this shift (a new card takes its place)
    const x = make('span', 'banish', '✕');
    x.title = 'Fjern dette kortet for resten av vakta';
    x.setAttribute('role', 'button');
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      banish(i);
    });
    b.append(x);
  }
  return b;
}

/**
 * Shows the upgrade cards with large icons and large text, the reroll button and the banish count.
 * @param {{reroll: () => void, banish: (i: number) => void}} actions
 */
export function showCards(s, choose, actions) {
  el('newLevel').textContent = String(s.level);
  // Several level-ups at once (packages, free lunch): say how many more are coming
  const queued = s.queuedLevels;
  el('levelQueue').textContent = queued > 0 ? ` (${queued} ${queued === 1 ? 'nivå' : 'nivåer'} til etter dette)` : '';
  const holder = el('cards');
  holder.replaceChildren();
  holder.className = s.cards.length === 1 ? 'one' : s.cards.length === 2 ? 'two' : s.cards.length === 4 ? 'four' : '';
  s.cards.forEach((k, i) => holder.append(cardElement(k, i, choose, s.banishes > 0 ? actions.banish : null)));
  const rerollButton = /** @type {HTMLButtonElement} */ (el('rerollButton'));
  rerollButton.textContent = `Nytt utvalg (R) · ${s.rerolls} igjen`;
  rerollButton.disabled = s.rerolls <= 0;
  rerollButton.onclick = () => actions.reroll();
  el('banishHint').textContent = s.banishes > 0 ? `✕ på et kort (eller B og tallet) fjerner det for resten av vakta · ${s.banishes} igjen` : 'Ingen flere kort kan fjernes (hver hjulpet boss gir ett nytt)';
  setBanishMode(false);
  drawStatSheet(s);
}

/** Highlights the cards while «B» is held down: the next number banishes instead of choosing. */
export function setBanishMode(on) {
  el('cards').classList.toggle('banishMode', on);
}

/** The supplier package: what it contained (the increments are already applied). */
export function showPackage(s, close) {
  const holder = el('packageCards');
  holder.replaceChildren();
  const cards = s.packageCards ?? [];
  holder.className = cards.length === 1 ? 'one' : cards.length === 2 ? 'two' : cards.length >= 4 ? 'four' : '';
  for (const k of cards) holder.append(cardElement(k, -1, null, null));
  el('packageText').textContent = cards.length === 1 ? 'Én oppgradering fulgte med.' : `${cards.length} oppgraderinger fulgte med.`;
  const button = /** @type {HTMLButtonElement} */ (el('packageContinue'));
  button.onclick = () => close();
  button.focus();
}

/** "+12 %" / "−8 %" */
const pct = (v) => `${v < 0 ? '−' : '+'}${Math.round(Math.abs(v) * 100)} %`;
const dec = (v, n = 2) => v.toFixed(n).replace('.', ',');

/**
 * The stat sheet under the cards: every number the passives and the character change, and the build so far.
 * Everything a player needs to decide which card to take.
 */
export function drawStatSheet(s, holderId = 'levelStats') {
  const holder = el(holderId);
  holder.replaceChildren();
  const p = s.player, m = p.mod;
  const rows = [
    ['Hjelp (skade)', pct(m.help - 1)],
    ['Prosjektilvåpen', pct(m.tag.projectile - 1)],
    ['Kjedevåpen', pct(m.tag.chain - 1)],
    ['Områdevåpen', pct(m.tag.area - 1)],
    ['Hjelpere', pct(m.tag.helper - 1)],
    ['Kritisk sjanse', `${Math.round(m.crit * 100)} %`],
    ['Kritisk hjelp', `× ${dec(m.critMult)}`],
    ['Tid mellom aktiveringer', pct(m.cd - 1)],
    ['Område og rekkevidde', pct(m.area - 1)],
    ['Prosjektilfart', pct(m.projSpeed - 1)],
    ['Varighet', pct(m.duration - 1)],
    ['Ekstra prosjektiler', `+${m.extraProj}`],
    ['Dobbel aktivering', `${Math.round(m.dual * 100)} %`],
    ['Maks energi', `${p.maxEnergy}`],
    ['Regenerering', `${dec(m.regen)} /s`],
    ['Skadereduksjon', `${Math.round(m.damageRed * 100)} %`],
    ['Unnvikelse', `${Math.round(m.dodge * 100)} %`],
    ['Bevegelse', pct(m.speed - 1)],
    ['Plukkradius', pct(m.pick - 1)],
    ['Erfaring', pct(m.xp - 1)],
    ['Flaks (sjeldnere kort)', pct(m.luck)],
    ['Sjanse for fjerde kort', `${Math.round(m.fourthCard * 100)} %`],
    ['Nytt utvalg igjen', `${s.rerolls}`],
    ['Kort som kan fjernes', `${s.banishes}`],
    ['Sikkerhetskopier igjen', `${Math.max(0, m.revives - p.revivesUsed)}`],
    ['Energi per hjulpet', dec(m.lifesteal)],
    ['Poeng', pct(m.points - 1)],
    ['Lappene ligger', `+${m.ticketLife} s`],
    ['Mindre treghet', `${Math.round(m.slowRes * 100)} %`],
  ];
  const grid = make('div', 'statGrid');
  for (const [name, value] of rows) {
    const row = make('div', 'stat' + (value.startsWith('+0 %') || value === '0 %' || value === '+0' || value === '0,00 /s' ? ' zero' : ''));
    row.append(make('span', 'statName', name), make('span', 'statValue', value));
    grid.append(row);
  }
  // The weapons: every number that matters for each one, with the increments taken and the effects
  const weapons = make('div', 'weaponSheet');
  const G = CONFIG.limits;
  const FX = CONFIG.upgrades.effects;
  const after = CONFIG.upgrades.combinationAfter;
  for (const w of p.weapons) {
    const box = make('div', 'weaponBox' + (w.evo ? ' evo' : ''));
    const head = make('div', 'weaponHead');
    const k = CONFIG.weapons[w.id].combination;
    const combo = w.id === 'matrix' ? 'spesialkombinasjon' : w.evo ? 'kombinasjon' : !k ? (w.picks >= after ? 'klar for The Matrix' : `${after - w.picks} igjen til The Matrix`) : w.picks >= after ? `klar for kombinasjon med ${CONFIG.passives[k.passive].name}` : `${after - w.picks} igjen til kombinasjon`;
    head.append(iconElement(weaponIconId(w)), make('span', 'name', weaponName(w)), make('span', 'muted', `+${w.picks} · ${combo}`));
    box.append(head);
    const t = weaponStats(w);
    const tag = m.tag[CONFIG.weapons[w.id].tag] ?? 1;
    const list = make('div', 'weaponStats');
    const add = (label, value) => {
      const row = make('span', 'wstat');
      row.append(make('span', 'statName', label), make('span', 'statValue', value));
      list.append(row);
    };
    add('hjelp per treff', statValue('help', t.help * m.help * tag));
    for (const stat of Object.keys(t)) {
      if (stat === 'help' || stat === 'fx' || stat === 'back' || stat === 'spread' || stat === 'hopTime' || stat === 'tick' || stat === 'period' || stat === 'nudge' || stat === 'split' || stat === 'confetti' || stat === 'confettiRadius' || stat === 'burst' || stat === 'rainTick' || stat === 'slowMo') continue;
      const label = STAT_LABEL[stat]?.[0] ?? stat;
      let v = t[stat];
      if (stat === 'interval' || stat === 'pause' || stat === 'charge') v *= m.cd;
      else if (['radius', 'splash', 'track', 'range', 'reach', 'lengthPx', 'width', 'pulseRadius'].includes(stat)) v *= m.area;
      else if (stat === 'duration' || stat === 'life') v *= m.duration;
      add(stat === 'count' || stat === 'perThrow' ? CONFIG.weapons[w.id].countName ?? label : label, statValue(stat, v));
    }
    if (t.back) add('bakover', 'ja');
    box.append(list);
    const fx = Object.entries(w.fx).filter(([, n]) => n > 0);
    if (fx.length > 0) {
      const effects = make('div', 'weaponFx');
      for (const [id, n] of fx) effects.append(make('span', 'chip', `${FX[id].name} ${n}`));
      box.append(effects);
    }
    weapons.append(box);
  }
  holder.append(make('h3', '', 'Dine tall'), grid, weapons, drawBuild(s));
}

/** The build as chips: every weapon with its increments and effects, and every passive with its level. */
export function drawBuild(s) {
  const p = s.player, G = CONFIG.limits, FX = CONFIG.upgrades.effects;
  const build = make('div', 'build');
  for (const w of p.weapons) {
    const chip = make('span', 'chip' + (w.evo ? ' evo' : ''));
    const fx = Object.entries(w.fx).filter(([, n]) => n > 0).map(([id, n]) => `${FX[id].name} ${n}`).join(', ');
    chip.append(iconElement(weaponIconId(w)), make('span', '', `${weaponName(w)} +${w.picks}${fx ? ' · ' + fx : ''}`));
    build.append(chip);
  }
  for (const pa of p.passives) {
    const chip = make('span', 'chip');
    chip.append(iconElement(pa.id), make('span', '', `${CONFIG.passives[pa.id].name} ${pa.level}/${G.passiveLevel}`));
    build.append(chip);
  }
  build.append(make('span', 'muted small', `${p.weapons.length}/${G.weapons} våpen · ${p.passives.length}/${G.passives} passive`));
  return build;
}

// ---------- Leaderboard ----------

/**
 * Draws the leaderboard. The player's own row is highlighted, also outside the top 20.
 * @param {HTMLElement} holder
 * @param {import('./leaderboard.js').Leaderboard | null} data null = unavailable
 * @param {string} ownName
 */
export function drawLeaderboard(holder, data, ownName) {
  holder.replaceChildren();
  if (!data) {
    holder.append(make('p', 'muted', 'Topplisten er utilgjengelig akkurat nå. Du kan fortsatt spille – prøv igjen litt senere.'));
    return;
  }
  if (data.top.length === 0) {
    holder.append(make('p', 'muted', 'Ingen har spilt i dag ennå. Bli den første på lista!'));
    return;
  }
  const tbl = make('table');
  const head = make('tr');
  head.append(make('th', '', '#'), make('th', '', 'Navn'), make('th', 'right', 'Poeng'), make('th', 'right', 'Tid'));
  tbl.append(head);
  const me = ownName.trim().toLowerCase();
  const makeRow = (r) => {
    const tr = make('tr', me && r.name.toLowerCase() === me ? 'me' : '');
    const name = make('td', 'name');
    const ki = characterIndex(r.character);
    if (ki >= 0) name.append(figureElement(ki, 32));
    name.append(document.createTextNode(r.name));
    if (r.fired) {
      // a small moving box: this round ended with the sack
      const ic = iconElement('fired', 'icon firedIcon');
      ic.title = 'Fikk sparken';
      name.append(ic);
    }
    tr.append(make('td', '', r.spot + '.'), name, make('td', 'right', formatNumber(r.score)), make('td', 'right', mmss(r.time)));
    tr.title = `${r.helped} hjulpne advokater · høyeste multiplikator ${multText(r.maxMult)}`;
    return tr;
  };
  for (const r of data.top) tbl.append(makeRow(r));
  if (data.own && data.own.spot > data.top.length) {
    const divider = make('tr', 'divider');
    const td = make('td', '', '…');
    td.colSpan = 4;
    divider.append(td);
    tbl.append(divider, makeRow(data.own));
  }
  holder.append(tbl);
  if (data.count > data.top.length) holder.append(make('p', 'muted small', `${data.count} har spilt i dag.`));
}

// ---------- Notice board ----------

const BOARD_KEY = 'hds_kombinasjoner';
/** Weapon ids saved by older versions, before the code was translated to English. */
const LEGACY_WEAPON_IDS = { avpaa: 'powerCycle', passord: 'password', fjern: 'remote', mus: 'mouse', straale: 'beam' };

/** @returns {string[]} the weapon ids of the combinations the player has unlocked */
export function loadCombinations() {
  try {
    const v = JSON.parse(localStorage.getItem(BOARD_KEY) || '[]');
    return Array.isArray(v) ? [...new Set(v.map((id) => LEGACY_WEAPON_IDS[id] ?? id))] : [];
  } catch {
    return [];
  }
}

/** Saves new combinations (called when the round is over – never during play). */
export function saveCombinations(ids) {
  const list = loadCombinations();
  let changed = false;
  for (const id of ids) if (!list.includes(id)) {
    list.push(id);
    changed = true;
  }
  if (!changed) return;
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** The name of a combination the player unlocked (The Matrix is not tied to one weapon). */
export function combinationName(id) {
  return id === 'matrix' ? CONFIG.weapons.matrix.name : CONFIG.weapons[id]?.combination?.name ?? id;
}

export function drawNoticeBoard() {
  const holder = el('noticeBoard');
  holder.replaceChildren();
  const found = loadCombinations();
  for (const [id, v] of Object.entries(CONFIG.weapons)) {
    const k = /** @type {any} */ (v).combination;
    if (!k) continue;
    if (found.includes(id)) {
      const li = make('li');
      const text = make('div');
      text.append(make('span', '', k.name), make('small', '', `${v.name} (${CONFIG.upgrades.combinationAfter} oppgraderinger) + ${CONFIG.passives[k.passive].name}`));
      li.append(iconElement('evo:' + id), text);
      holder.append(li);
    } else {
      const li = make('li', 'locked');
      li.append(iconElement('lock'), make('span', '', 'Ikke oppdaget ennå'));
      holder.append(li);
    }
  }
  // The Matrix: the rarest one, with its own frame when it is unlocked
  if (found.includes('matrix')) {
    const R = CONFIG.weapons.matrix.requires, after = CONFIG.upgrades.combinationAfter;
    const li = make('li', 'matrix');
    const text = make('div');
    text.append(make('span', '', CONFIG.weapons.matrix.name), make('small', '', `${CONFIG.weapons[R.angel].name} (${after} oppgraderinger eller kombinert) + ${CONFIG.weapons[R.bodyguard].name} (${after}) + ${CONFIG.passives[R.passive].name}`));
    li.append(iconElement('matrix'), text);
    holder.append(li);
  } else {
    const li = make('li', 'locked');
    li.append(iconElement('lock'), make('span', '', 'Spesialkombinasjon: ikke oppdaget ennå'));
    holder.append(li);
  }
}

// ---------- End screen ----------

/** Fun statistics from the round. */
export function drawStats(s) {
  const list = el('stats');
  list.replaceChildren();
  const line = (t) => list.append(make('li', '', t));
  const st = s.stat;
  line(`Du hjalp ${formatNumber(s.helped)} advokater`);
  const printer = st.perType.printer || 0;
  if (printer > 0) line(`${formatNumber(printer)} av dem hadde printerproblemer`);
  const senior = st.perType.senior || 0;
  if (senior > 0) line(`${formatNumber(senior)} seniorpartnere fikk omsider logget inn`);
  if (st.bossesTotal > 0) line(`Du hjalp ${st.bossesHelped} av ${st.bossesTotal} bosser før fristen`);
  const urgentSprite = st.perType.urgent || 0;
  if (urgentSprite > 0) line(`Du rakk ${urgentSprite} ${urgentSprite === 1 ? 'hastesak' : 'hastesaker'}`);
  if (st.blocked > 0) line(`Headsetet blokkerte ${st.blocked} treff`);
  if (st.dodged > 0) line(`Brannmuren avviste ${st.dodged} treff`);
  if (st.elitesHelped > 0) line(`${st.elitesHelped} ${st.elitesHelped === 1 ? 'partner' : 'partnere'} fikk omsider IT-hjelp`);
  if (st.packages > 0) line(`Du åpnet ${st.packages} ${st.packages === 1 ? 'pakke' : 'pakker'} fra leverandøren`);
  if (st.revives > 0) line(`Sikkerhetskopien reddet deg ${st.revives} ${st.revives === 1 ? 'gang' : 'ganger'}`);
  line(`${st.upgrades} oppgraderinger på våpnene${st.rerolls + st.banishes > 0 ? ` (${st.rerolls} nye utvalg, ${st.banishes} kort fjernet)` : ''}`);
  if (st.events > 0) line(`${st.events} ${st.events === 1 ? 'hendelse' : 'hendelser'} på kontoret`);
  if (st.drinks > 0) line(`Du fant ${st.drinks} ${st.drinks === 1 ? 'energidrikk' : 'energidrikker'} på kartet`);
  if (st.cookies > 0) line(`Du spiste ${st.cookies} ${st.cookies === 1 ? 'helsekjeks' : 'helsekjeks'} fra glade advokater`);
  if (st.baited > 0) line(`Du gikk på Fiske-Fridas lokkemat ${st.baited} ${st.baited === 1 ? 'gang' : 'ganger'}`);
  if (st.combinations.includes('matrix')) line('Du låste opp The Matrix!');
  line(`Høyeste multiplikator: ${multText(CONFIG.multiplier.start + st.maxMultStep * CONFIG.multiplier.step)}`);
  let best = '', bestHelp = 0;
  for (const [id, h] of Object.entries(st.helpPerWeapon)) {
    if (h > bestHelp && CONFIG.weapons[id]) {
      bestHelp = h;
      best = id;
    }
  }
  if (best) {
    const w = s.player.weapons.find((x) => x.id === best);
    line(`Mest effektive våpen: ${w ? weaponName(w) : CONFIG.weapons[best].name} (${formatNumber(bestHelp)} hjelp gitt)`);
  }
  if (st.combinations.length > 0) {
    line(`Kombinasjoner låst opp: ${st.combinations.map((id) => combinationName(id)).join(', ')}`);
  } else {
    line(`Ingen kombinasjoner denne vakta – ${CONFIG.upgrades.combinationAfter} oppgraderinger på et våpen + riktig passiv gir én`);
  }
  const total = st.ticketsPicked + st.ticketsLost;
  if (total > 0) line(`Du rakk ${Math.round((st.ticketsPicked / total) * 100)} % av ticket-lappene (nivå ${s.level})`);
  // The build, as chips under the statistics
  const holder = el('endBuild');
  holder.replaceChildren(drawBuild(s));
}

/**
 * The bosses the player met this shift, with small portraits: helped (happy), or the one that got the player fired.
 * @param {import('./game.js').Game} s
 * @param {import('./figures.js').Figures} fig
 */
export function drawBosses(s, fig) {
  const holder = el('endBosses');
  holder.replaceChildren();
  const log = s.stat.bossLog;
  holder.hidden = log.length === 0;
  for (const b of log) {
    const k = CONFIG.bosses[b.type];
    const firedBy = !b.helped && s.fired && s.fired.type === b.type && b === log[log.length - 1];
    const card = make('div', 'boss' + (b.helped ? ' helped' : firedBy ? ' fired' : ''));
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    c.className = 'portrait';
    crisp(c, 64);
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    if (b.type === 'johan' && b.helped) ctx.drawImage(fig.johanPortrait(), 0, 0);
    else {
      const type = b.type;
      if (b.helped) {
        const sheet = fig.sheet(type, 0);
        ctx.drawImage(sheet.canvas, 8 * sheet.w, sheet.sy, sheet.w, sheet.h, 0, 0, 64, 64);
      } else {
        const ps = fig.poses(type, 0);
        ctx.drawImage(ps.canvas, 3 * ps.w, 0, ps.w, ps.h, 0, 0, 64, 64);
      }
    }
    const name = b.type === 'johan' && b.returnNo > 0 ? `${k.name} (runde ${b.returnNo + 1})` : k.name;
    card.append(c, make('span', 'name', name), make('small', '', b.helped ? 'Hjulpet ✓' : firedBy ? 'Fikk deg sparket' : 'Ikke hjulpet'));
    holder.append(card);
  }
}

// ---------- Character select ----------

/**
 * Shows the four characters side by side: portrait, name, title, starting weapon and bonus.
 * @param {number} selected preselected character
 * @param {(i: number, start: boolean) => void} choose called on selection (start = true means «start vakta nå», "start the shift now")
 */
export function showCharacterSelect(selected, choose) {
  const holder = el('characters');
  holder.replaceChildren();
  CONFIG.characters.forEach((k, i) => {
    const b = make('button', 'character' + (i === selected ? ' selected' : ''));
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(i === selected));
    const weapons = make('span', 'weapon');
    weapons.append(iconElement(k.startWeapon), make('span', '', CONFIG.weapons[k.startWeapon].name));
    b.append(make('kbd', '', i + 1), portraitElement(i, 128), make('span', 'name', k.name), make('span', 'title', k.title), weapons, make('span', 'bonus', k.bonusText));
    b.addEventListener('click', () => choose(i, true));
    b.addEventListener('focus', () => choose(i, false));
    holder.append(b);
  });
}

/** Marks the selected character without rebuilding the cards. */
export function markCharacter(selected) {
  el('characters').querySelectorAll('.character').forEach((b, i) => {
    b.classList.toggle('selected', i === selected);
    b.setAttribute('aria-checked', String(i === selected));
  });
}

// ---------- Character preview (?debug=characters) ----------

/**
 * Shows the four playable characters large, for approval: portrait, walk cycle (animated), happy frame,
 * and name, title, starting weapon and bonus from config.js.
 * @param {import('./figures.js').Figures} fig
 */
export function showCharacterPreview(fig) {
  const make2 = (tag, style, text) => {
    const e = document.createElement(tag);
    if (style) e.style.cssText = style;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const root = make2('div', 'position:fixed;inset:0;z-index:50;overflow:auto;background:#16202b;color:#fff;padding:24px;font-family:var(--font)');
  root.append(make2('h1', 'margin:0 0 4px;font-size:2em', 'Forhåndsvisning: de fire spillbare karakterene'));
  root.append(make2('p', 'margin:0 0 20px;color:#c8d6e5', 'Bildene er oppdragsgivers egne (assets/karakterer/), brukt piksel for piksel. Gangsyklusen endrer bare beina og føttene. Navn og tittel står i js/config.js (CONFIG.characters).'));
  const grid = make2('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px');
  /** @type {{c: HTMLCanvasElement, i: number, type?: string, variant?: number}[]} */
  const animated = [];
  CONFIG.characters.forEach((k, i) => {
    const cardEl = make2('div', 'background:#f4f1ea;color:#1d1626;padding:16px;box-shadow:0 0 0 4px #1d1626');
    const p = document.createElement('canvas');
    p.width = 64;
    p.height = 64;
    p.style.cssText = 'display:block;margin:0 auto 8px;background:#a9b8c8';
    crisp(p, 256);
    /** @type {CanvasRenderingContext2D} */ (p.getContext('2d')).drawImage(fig.portrait(i), 0, 0);
    cardEl.append(p);
    const figRow = make2('div', 'display:flex;gap:8px;justify-content:center;margin-bottom:8px');
    const sheet = fig.sheet('player', i);
    for (const frame of [8, -1, 1, 3]) {
      const c = document.createElement('canvas');
      c.width = sheet.w;
      c.height = sheet.h;
      c.style.background = '#a9b8c8';
      crisp(c, 64);
      if (frame >= 0) /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(sheet.canvas, frame * sheet.w, sheet.sy, sheet.w, sheet.h, 0, 0, sheet.w, sheet.h);
      else animated.push({ c, i });
      figRow.append(c);
    }
    cardEl.append(figRow);
    cardEl.append(make2('p', 'margin:0;font-size:0.8em;color:#5d6b7a;text-align:center', 'Stående (originalbildet) · Gange (animert) · Gangbilde 2 og 4'));
    cardEl.append(make2('h2', 'margin:12px 0 2px', `${i + 1}. ${k.name}`));
    cardEl.append(make2('p', 'margin:0 0 6px;color:#5d6b7a', k.title));
    cardEl.append(make2('p', 'margin:0', `Startvåpen: ${CONFIG.weapons[k.startWeapon].name}`));
    cardEl.append(make2('p', 'margin:0', `Bonus: ${k.bonusText}`));
    grid.append(cardEl);
  });
  root.append(grid);

  // The final boss Johan, for approval
  root.append(make2('h1', 'margin:32px 0 4px;font-size:2em', 'Siste boss: Johan'));
  root.append(make2('p', 'margin:0 0 20px;color:#c8d6e5', 'Laget fra fotoet av Johan i samme stil som de fire karakterene over: samme pikseltetthet (1 piksel detalj), fargede omriss og myk skyggelegging. Som boss er figuren dobbelt så stor (64 × 64). Utseendet justeres i js/johan.js.'));
  const johanCard = make2('div', 'background:#f4f1ea;color:#1d1626;padding:16px;box-shadow:0 0 0 4px #1d1626;display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start');
  const jp = document.createElement('canvas');
  jp.width = 64;
  jp.height = 64;
  jp.style.background = '#a9b8c8';
  crisp(jp, 256);
  /** @type {CanvasRenderingContext2D} */ (jp.getContext('2d')).drawImage(fig.johanPortrait(), 0, 0);
  const jpBox = make2('div', 'text-align:center');
  jpBox.append(jp, make2('p', 'margin:4px 0 0;font-size:0.8em;color:#5d6b7a', 'Portrett (bossintro og slutt-skjerm)'));
  johanCard.append(jpBox);
  const frames = make2('div', 'display:grid;grid-template-columns:repeat(4,auto);gap:12px;align-content:start');
  /** Adds one frame (from a sheet or the pose sheet) with a caption. frame = -1 animates the walk cycle. */
  const addFrame = (caption, draw) => {
    const box = make2('div', 'text-align:center');
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    c.style.background = '#a9b8c8';
    crisp(c, 128);
    draw(c);
    box.append(c, make2('p', 'margin:2px 0 0;font-size:0.75em;color:#5d6b7a', caption));
    frames.append(box);
  };
  const fromSheet = (variant, frame) => (c) => {
    const sh = fig.sheet('johan', variant);
    /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(sh.canvas, frame * sh.w, sh.sy, sh.w, sh.h, 0, 0, sh.w, sh.h);
  };
  const fromPose = (variant, p) => (c) => {
    const sh = fig.poses('johan', variant);
    /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(sh.canvas, p * sh.w, 0, sh.w, sh.h, 0, 0, sh.w, sh.h);
  };
  addFrame('Gange (animert)', (c) => animated.push({ c, i: -1 }));
  addFrame('Glad: tommel opp', fromSheet(0, 8));
  addFrame('Blink når han får hjelp', fromSheet(0, 4));
  addFrame('Armene i kors', fromPose(0, 4));
  addFrame('«Har du et lite minutt?» (peker)', fromPose(0, 0));
  addFrame('Kalenderinvitasjoner', fromPose(0, 2));
  addFrame('«Alle på møte!» (klapper)', fromPose(0, 1));
  addFrame('Skuffet (sparken)', fromPose(0, 3));
  addFrame('Uten dressjakke (gange)', (c) => animated.push({ c, i: -2 }));
  addFrame('Uten dressjakke: glad', fromSheet(1, 8));
  johanCard.append(frames);
  root.append(johanCard);

  // Boss 3, Fiske-Frida and her friends (Endringsprompt 4), in the same style
  root.append(make2('h1', 'margin:32px 0 4px;font-size:2em', 'Boss 3: Fiske-Frida og venninnene'));
  root.append(make2('p', 'margin:0 0 20px;color:#c8d6e5', 'Samme stil som Johan og de fire karakterene. Frida er 64 × 64, venninnene 32 × 40. Utseendet justeres i js/frida.js.'));
  const fridaCard = make2('div', 'background:#f4f1ea;color:#1d1626;padding:16px;box-shadow:0 0 0 4px #1d1626');
  const fridaFrames = make2('div', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px');
  const addTo = (type, variant, caption, frame, pose) => {
    const box = make2('div', 'text-align:center');
    const sh = fig.sheet(type, variant);
    const c = document.createElement('canvas');
    c.width = sh.w;
    c.height = sh.h;
    c.style.background = '#a9b8c8';
    crisp(c, type === 'frida' ? 128 : 80);
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    if (frame < 0) animated.push({ c, i: -9, type, variant });
    else if (pose >= 0) {
      const ps = fig.poses(type, variant);
      ctx.drawImage(ps.canvas, pose * ps.w, 0, ps.w, ps.h, 0, 0, ps.w, ps.h);
    } else ctx.drawImage(sh.canvas, frame * sh.w, sh.sy, sh.w, sh.h, 0, 0, sh.w, sh.h);
    box.append(c, make2('p', 'margin:2px 0 0;font-size:0.75em;color:#5d6b7a', caption));
    fridaFrames.append(box);
  };
  addTo('frida', 0, 'Gange (animert)', -1, -1);
  addTo('frida', 0, '«Klikk på lenken!» (stanga over hodet)', 0, 2);
  addTo('frida', 0, 'Silderegn (peker opp)', 0, 0);
  addTo('frida', 0, 'Glad: tommel opp', 8, -1);
  addTo('frida', 0, 'Skuffet (sparken)', 0, 3);
  addTo('friend', 0, 'Venninne 1 (animert)', -1, -1);
  addTo('friend', 0, 'Venninne 1: løfter mobilen', 0, 2);
  addTo('friend', 1, 'Venninne 2 (animert)', -1, -1);
  addTo('friend', 1, 'Venninne 2: løfter mobilen', 0, 2);
  addTo('friend', 1, 'Venninne 2: glad', 8, -1);
  fridaCard.append(fridaFrames);
  root.append(fridaCard);

  const close = make2('button', 'margin-top:20px', 'Lukk forhåndsvisningen');
  close.addEventListener('click', () => root.remove());
  root.append(close);
  document.body.append(root);
  let frame = 0;
  const tick = () => {
    if (!root.isConnected) return;
    frame = (frame + 1) & 3;
    for (const { c, i, type, variant } of animated) {
      const sheet = type ? fig.sheet(type, variant ?? 0) : i >= 0 ? fig.sheet('player', i) : fig.sheet('johan', -1 - i);
      const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(sheet.canvas, frame * sheet.w, sheet.sy, sheet.w, sheet.h, 0, 0, sheet.w, sheet.h);
    }
    setTimeout(tick, 140);
  };
  tick();
}

// ---------- Settings ----------

/**
 * Connects the settings menu to the settings.
 * @param {import('./settings.js').Settings} settings
 * @param {{testSound: () => void, fullscreen: (on: boolean) => void, isFullscreen: () => boolean}} help
 */
export function bindSettings(settings, help) {
  const mute = /** @type {HTMLInputElement} */ (el('i-mute'));
  const volume = /** @type {HTMLInputElement} */ (el('i-volume'));
  const effects = /** @type {HTMLInputElement} */ (el('i-effects'));
  const full = /** @type {HTMLInputElement} */ (el('i-fullscreen'));
  const shake = /** @type {HTMLInputElement} */ (el('i-shake'));
  const blink = /** @type {HTMLInputElement} */ (el('i-blink'));
  const hitNumbers = /** @type {HTMLInputElement} */ (el('i-hitNumbers'));
  const bars = /** @type {HTMLInputElement} */ (el('i-bars'));

  const show = () => {
    const v = settings.v;
    mute.checked = v.mute;
    volume.value = String(Math.round(v.volume * 100));
    effects.value = String(Math.round(v.effects * 100));
    el('o-volume').textContent = volume.value + ' %';
    el('o-effects').textContent = effects.value + ' %';
    full.checked = help.isFullscreen();
    shake.checked = v.shake;
    blink.checked = v.fewerFlashes;
    hitNumbers.checked = v.hitNumbers;
    bars.checked = v.bars;
    for (const group of document.querySelectorAll('.options')) {
      const name = /** @type {HTMLElement} */ (group).dataset.name ?? '';
      for (const inp of group.querySelectorAll('input')) /** @type {HTMLInputElement} */ (inp).checked = /** @type {HTMLInputElement} */ (inp).value === String(v[name]);
    }
  };

  mute.addEventListener('change', () => {
    settings.set('mute', mute.checked);
    if (!mute.checked) help.testSound();
  });
  for (const [field, name] of [[volume, 'volume'], [effects, 'effects']]) {
    const f = /** @type {HTMLInputElement} */ (field);
    f.addEventListener('input', () => {
      settings.set(name, Number(f.value) / 100);
      el('o-' + name).textContent = f.value + ' %';
    });
    // Test sound when the slider is released
    f.addEventListener('change', () => help.testSound());
  }
  full.addEventListener('change', () => help.fullscreen(full.checked));
  shake.addEventListener('change', () => settings.set('shake', shake.checked));
  blink.addEventListener('change', () => settings.set('fewerFlashes', blink.checked));
  hitNumbers.addEventListener('change', () => settings.set('hitNumbers', hitNumbers.checked));
  bars.addEventListener('change', () => settings.set('bars', bars.checked));
  for (const group of document.querySelectorAll('.options')) {
    const name = /** @type {HTMLElement} */ (group).dataset.name ?? '';
    group.addEventListener('change', (e) => settings.set(name, /** @type {HTMLInputElement} */ (e.target).value));
  }
  el('settingsReset').addEventListener('click', () => {
    settings.restoreDefaults();
    show();
  });
  document.addEventListener('fullscreenchange', () => {
    full.checked = help.isFullscreen();
  });
  return show;
}

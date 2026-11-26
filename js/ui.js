// @ts-check
// The menus (HTML): start, level-up cards, pause, settings, leaderboard, statistics and notice board.
import { CONFIG } from './config.js';
import { mmss, formatNumber } from './utils.js';
import { multText } from './score.js';
import { weaponName } from './weapons.js';
import { iconElement, weaponIconId } from './icons.js';

/** @returns {HTMLElement} */
export const el = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

const SCREENS = ['start', 'characterSelect', 'levelUp', 'pause', 'settings', 'gameOver'];

/** Where the portraits come from (set by main.js). @type {(i: number) => HTMLCanvasElement} */
let portraitSource = () => document.createElement('canvas');
export function setPortraitSource(f) {
  portraitSource = f;
}

/** A small canvas element with the portrait of character no. i. */
export function portraitElement(i) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  c.className = 'portrait';
  /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(portraitSource(i), 0, 0);
  return c;
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

/** Shows the upgrade cards with large icons and large text. */
export function showCards(s, choose) {
  el('newLevel').textContent = String(s.level);
  const holder = el('cards');
  holder.replaceChildren();
  holder.className = s.cards.length === 1 ? 'one' : s.cards.length === 2 ? 'two' : s.cards.length === 4 ? 'four' : '';
  s.cards.forEach((k, i) => {
    const b = make('button', 'card' + (k.highlighted ? ' highlighted' : ''));
    b.append(make('kbd', 'keyHint', i + 1), iconElement(k.icon), make('span', 'name', k.name), make('span', 'level', k.levelText), make('span', 'text', k.text));
    b.addEventListener('click', () => choose(i));
    holder.append(b);
  });
  drawStatSheet(s);
}

/** "+12 %" / "−8 %" */
const pct = (v) => `${v < 0 ? '−' : '+'}${Math.round(Math.abs(v) * 100)} %`;
const dec = (v, n = 2) => v.toFixed(n).replace('.', ',');

/**
 * The stat sheet under the cards: every number the passives and the character change, and the build so far.
 * Everything a player needs to decide which card to take.
 */
export function drawStatSheet(s) {
  const holder = el('levelStats');
  holder.replaceChildren();
  const p = s.player, m = p.mod;
  const rows = [
    ['Hjelp (skade)', pct(m.help - 1)],
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
    ['Sjanse for fjerde kort', `${Math.round(m.luck * 100)} %`],
  ];
  const grid = make('div', 'statGrid');
  for (const [name, value] of rows) {
    const row = make('div', 'stat' + (value.startsWith('+0 %') || value === '0 %' || value === '+0' || value === '0,00 /s' ? ' zero' : ''));
    row.append(make('span', 'statName', name), make('span', 'statValue', value));
    grid.append(row);
  }
  const build = make('div', 'build');
  const G = CONFIG.limits;
  for (const w of p.weapons) {
    const chip = make('span', 'chip' + (w.evo ? ' evo' : ''));
    chip.append(iconElement(weaponIconId(w)), make('span', '', w.evo ? weaponName(w) : `${weaponName(w)} ${w.level}/${G.weaponLevel}`));
    build.append(chip);
  }
  for (const pa of p.passives) {
    const chip = make('span', 'chip');
    chip.append(iconElement(pa.id), make('span', '', `${CONFIG.passives[pa.id].name} ${pa.level}/${G.passiveLevel}`));
    build.append(chip);
  }
  build.append(make('span', 'muted small', `${p.weapons.length}/${G.weapons} våpen · ${p.passives.length}/${G.passives} passive`));
  holder.append(make('h3', '', 'Dine tall'), grid, build);
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
    if (ki >= 0) name.append(portraitElement(ki));
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

export function drawNoticeBoard() {
  const holder = el('noticeBoard');
  holder.replaceChildren();
  const found = loadCombinations();
  for (const [id, v] of Object.entries(CONFIG.weapons)) {
    const k = v.combination;
    if (found.includes(id)) {
      const li = make('li');
      const text = make('div');
      text.append(make('span', '', k.name), make('small', '', `${v.name} (nivå ${CONFIG.limits.weaponLevel}) + ${CONFIG.passives[k.passive].name}`));
      li.append(iconElement('evo:' + id), text);
      holder.append(li);
    } else {
      const li = make('li', 'locked');
      li.append(iconElement('lock'), make('span', '', 'Ikke oppdaget ennå'));
      holder.append(li);
    }
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
  if (st.drinks > 0) line(`Du fant ${st.drinks} ${st.drinks === 1 ? 'energidrikk' : 'energidrikker'} på kartet`);
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
    line(`Kombinasjoner låst opp: ${st.combinations.map((id) => CONFIG.weapons[id].combination.name).join(', ')}`);
  } else {
    line(`Ingen kombinasjoner denne vakta – våpen på nivå ${CONFIG.limits.weaponLevel} + riktig passiv gir én`);
  }
  const total = st.ticketsPicked + st.ticketsLost;
  if (total > 0) line(`Du rakk ${Math.round((st.ticketsPicked / total) * 100)} % av ticket-lappene (nivå ${s.level})`);
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
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    if (b.type === 'johan' && b.helped) ctx.drawImage(fig.johanPortrait(), 0, 0);
    else {
      const type = b.type === 'deadline' ? 'boss' : b.type;
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
    b.append(make('kbd', '', i + 1), portraitElement(i), make('span', 'name', k.name), make('span', 'title', k.title), weapons, make('span', 'bonus', k.bonusText));
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
  root.append(make2('p', 'margin:0 0 20px;color:#c8d6e5', 'Til godkjenning. Navn og tittel fylles inn i js/config.js (CONFIG.karakterer). Utseendet justeres i js/figures.js (SPILLERE).'));
  const grid = make2('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px');
  /** @type {{c: HTMLCanvasElement, i: number}[]} */
  const animated = [];
  CONFIG.characters.forEach((k, i) => {
    const cardEl = make2('div', 'background:#f4f1ea;color:#1d1626;padding:16px;box-shadow:0 0 0 4px #1d1626');
    const p = document.createElement('canvas');
    p.width = 64;
    p.height = 64;
    p.style.cssText = 'width:256px;height:256px;image-rendering:pixelated;display:block;margin:0 auto 8px;background:#a9b8c8';
    /** @type {CanvasRenderingContext2D} */ (p.getContext('2d')).drawImage(fig.portrait(i), 0, 0);
    cardEl.append(p);
    const figRow = make2('div', 'display:flex;gap:8px;justify-content:center;margin-bottom:8px');
    const sheet = fig.sheet('player', i);
    for (const frame of [-1, 8, 4]) {
      const c = document.createElement('canvas');
      c.width = sheet.w;
      c.height = sheet.h;
      c.style.cssText = 'width:96px;height:96px;image-rendering:pixelated;background:#a9b8c8';
      if (frame >= 0) /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(sheet.canvas, frame * sheet.w, sheet.sy, sheet.w, sheet.h, 0, 0, sheet.w, sheet.h);
      else animated.push({ c, i });
      figRow.append(c);
    }
    cardEl.append(figRow);
    cardEl.append(make2('p', 'margin:0;font-size:0.8em;color:#5d6b7a;text-align:center', 'Gange (animert) · Glad · Blink ved treff'));
    cardEl.append(make2('h2', 'margin:12px 0 2px', `${i + 1}. ${k.name}`));
    cardEl.append(make2('p', 'margin:0 0 6px;color:#5d6b7a', k.title));
    cardEl.append(make2('p', 'margin:0', `Startvåpen: ${CONFIG.weapons[k.startWeapon].name}`));
    cardEl.append(make2('p', 'margin:0', `Bonus: ${k.bonusText}`));
    grid.append(cardEl);
  });
  root.append(grid);

  // The final boss Johan, for approval
  root.append(make2('h1', 'margin:32px 0 4px;font-size:2em', 'Siste boss: Johan'));
  root.append(make2('p', 'margin:0 0 20px;color:#c8d6e5', 'Til godkjenning. Laget i samme stil som de spillbare karakterene, i dobbel størrelse (64 × 64). Utseendet justeres i js/figures.js (JOHAN).'));
  const johanCard = make2('div', 'background:#f4f1ea;color:#1d1626;padding:16px;box-shadow:0 0 0 4px #1d1626;display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start');
  const jp = document.createElement('canvas');
  jp.width = 64;
  jp.height = 64;
  jp.style.cssText = 'width:256px;height:256px;image-rendering:pixelated;background:#a9b8c8';
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
    c.style.cssText = 'width:128px;height:128px;image-rendering:pixelated;background:#a9b8c8';
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

  const close = make2('button', 'margin-top:20px', 'Lukk forhåndsvisningen');
  close.addEventListener('click', () => root.remove());
  root.append(close);
  document.body.append(root);
  let frame = 0;
  const tick = () => {
    if (!root.isConnected) return;
    frame = (frame + 1) & 3;
    for (const { c, i } of animated) {
      const sheet = i >= 0 ? fig.sheet('player', i) : fig.sheet('johan', -1 - i);
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

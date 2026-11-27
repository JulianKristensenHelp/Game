// @ts-check
// The upgrade cards at level-up (version 6): new weapons, weapon increments, effect modifiers, passives and combinations.
// A weapon has no levels. Every card gives one specific increment, and the weapon's numbers are computed from
// its base plus the increments it has taken (see weaponStats() in weapons.js). Cards have a tier (rarity) that
// scales the increment. Rerolls, banishes and the supplier packages also live here.
import { CONFIG, STAT_LABEL, WEAPON_TAG } from './config.js';
import { givePoints } from './score.js';
import { refreshWeapon, weaponName } from './weapons.js';
import { captureBonus } from './capture.js';

const V = CONFIG.weapons;
const P = CONFIG.passives;
const G = CONFIG.limits;
const U = CONFIG.upgrades;
const FX = U.effects;
const WEIGHT = U.weight;

/**
 * @typedef {Object} Grant one increment on a card: a numeric stat for «steps» growth steps, or an effect for «levels»
 * @property {string} [stat]
 * @property {number} [steps]
 * @property {string} [fx]
 * @property {number} [levels]
 */

/**
 * @typedef {Object} Card
 * @property {'weapon'|'upgrade'|'passive'|'combination'|'matrix'|'coffee'} kind
 * @property {string} id weapon or passive id (the icon is fetched from icons.js)
 * @property {string} icon icon id (for combinations: 'evo:' + weapon id)
 * @property {string} name
 * @property {string} levelText e.g. "Nytt våpen (2 av 4 plasser brukt)" or "Oppgradering 7"
 * @property {string} text one short sentence about what the card does
 * @property {number} tier 0 = common, 1 = uncommon, 2 = rare, 3 = legendary (sets the card's colour)
 * @property {boolean} highlighted combination card
 * @property {string} key what the card is (for banishing)
 * @property {Grant[]} [grants] the increments an 'upgrade' card gives
 * @property {number} [weight] how likely the card is to be offered
 */

/** Stats that are counts (projectiles, hits, hops …): they grow by whole numbers and need a max. */
const COUNT_LIKE = new Set(['count', 'perThrow', 'hits', 'hops', 'chains', 'charges', 'max', 'bounces', 'walls']);

const findWeapon = (s, id) => s.player.weapons.find((w) => w.id === id);
const findPassive = (s, id) => s.player.passives.find((p) => p.id === id);
const passiveLevel = (s, id) => findPassive(s, id)?.level ?? 0;

/** Computes the total bonuses from passives. Called every time something changes. */
export function computeBonuses(s) {
  const m = s.player.mod;
  const paper = passiveLevel(s, 'paperTray');
  let extra = 0, paperHelp = 0;
  for (let n = 1; n <= paper; n++) {
    if (P.paperTray.projectileLevels.includes(n)) extra++;
    else paperHelp += P.paperTray.value;
  }
  // The character's bonus (see CONFIG.characters)
  const kb = s.characterBonus ?? { help: 0, speed: 0, pick: 0 };
  m.area = 1 + P.ram.value * passiveLevel(s, 'ram');
  m.help = (1 + P.admin.value * passiveLevel(s, 'admin')) * (1 + paperHelp) * (1 + (kb.help ?? 0));
  m.extraProj = extra;
  m.duration = 1 + P.batteries.value * passiveLevel(s, 'batteries');
  m.cd = Math.max(0.2, 1 - P.ssd.value * passiveLevel(s, 'ssd'));
  m.speed = 1 + P.sneakers.value * passiveLevel(s, 'sneakers') + (kb.speed ?? 0);
  m.pick = 1 + P.extensionCord.value * passiveLevel(s, 'extensionCord') + (kb.pick ?? 0);
  // The new passives
  m.dual = Math.min(0.25, P.dualMonitor.value * passiveLevel(s, 'dualMonitor'));
  m.projSpeed = 1 + P.shortcuts.value * passiveLevel(s, 'shortcuts');
  m.damageRed = Math.min(0.3, P.ergonomicChair.value * passiveLevel(s, 'ergonomicChair'));
  m.xp = 1 + P.certification.value * passiveLevel(s, 'certification');
  // Version 5: the stat passives
  const overtime = passiveLevel(s, 'overtime');
  m.help *= 1 + P.overtime.value * overtime;
  m.speed -= P.overtime.speedCost * overtime;
  m.crit = P.coffeeMachine.value * passiveLevel(s, 'coffeeMachine');
  m.critMult = CONFIG.critMult + P.mechKeyboard.value * passiveLevel(s, 'mechKeyboard');
  m.regen = P.standingDesk.value * passiveLevel(s, 'standingDesk');
  m.dodge = Math.min(P.firewall.max, P.firewall.value * passiveLevel(s, 'firewall'));
  // Version 6: luck («Hesteskoen») and the tag passives
  const horseshoe = passiveLevel(s, 'horseshoe');
  m.luck = P.horseshoe.value * horseshoe;
  m.fourthCard = Math.min(1, P.horseshoe.fourthCard * horseshoe);
  for (const id of Object.keys(CONFIG.tagPassives)) {
    const k = CONFIG.tagPassives[id];
    m.tag[k.tag] = 1 + k.value * passiveLevel(s, id);
  }
  // Version 6.1: the items
  const I = CONFIG.itemPassives;
  m.revives = Math.min(I.backup.max, I.backup.value * passiveLevel(s, 'backup'));
  m.lifesteal = I.grateful.value * passiveLevel(s, 'grateful');
  // «Post-it-blokk» (Endringsprompt 5): the same seconds per level, now added to the tickets' fresh period
  m.ticketFresh = I.postIt.value * passiveLevel(s, 'postIt');
  m.points = 1 + I.bonusScheme.value * passiveLevel(s, 'bonusScheme');
  m.drinkFill = I.thermos.fill * passiveLevel(s, 'thermos');
  m.kickTime = I.thermos.kick * passiveLevel(s, 'thermos');
  m.slowRes = Math.min(I.janitor.max, I.janitor.value * passiveLevel(s, 'janitor'));
  // Endringsprompt 5: the permanent bonuses from the capture-point events, on top of the passives
  const cb = captureBonus(s);
  m.help *= 1 + cb.help;
  m.speed += cb.speed;
}

/** Gives the player a new weapon (does nothing if the player already has it or the slots are full). */
export function giveWeapon(s, id) {
  if (findWeapon(s, id)) return;
  if (s.player.weapons.length >= G.weapons) return;
  const w = { id, picks: 0, up: /** @type {Record<string, number>} */ ({}), fx: /** @type {Record<string, number>} */ ({}), stats: /** @type {any} */ (null), evo: false, cd: 0.3, angle: 0, phase: 0, active: 0, tick: 0, charges: 1, gx: 0, gy: 0, pose: 0, aim: 0 };
  refreshWeapon(w);
  s.player.weapons.push(w);
  s.events.push('upgraded');
}

/**
 * Gives a weapon the player has one increment: «steps» growth steps on a stat, or «levels» of an effect.
 * Increments past a cap are turned into help, so a card never gives nothing.
 */
export function giveUpgrade(s, id, grant) {
  const w = findWeapon(s, id);
  if (!w) return;
  const def = V[id];
  if (grant.fx) {
    const k = FX[grant.fx];
    const have = w.fx[grant.fx] || 0;
    const give = Math.min(grant.levels ?? 1, k.max - have);
    w.fx[grant.fx] = have + give;
    if (give < (grant.levels ?? 1)) w.up.help = (w.up.help || 0) + ((grant.levels ?? 1) - give);
  } else if (grant.stat) {
    const rule = def.growth[grant.stat];
    const room = rule ? stepsLeft(w, grant.stat, rule) : 0;
    const give = Math.min(grant.steps ?? 1, room);
    if (give > 0) w.up[grant.stat] = (w.up[grant.stat] || 0) + give;
    if (give < (grant.steps ?? 1) && grant.stat !== 'help') w.up.help = (w.up.help || 0) + ((grant.steps ?? 1) - give);
  }
  w.picks++;
  refreshWeapon(w);
  s.events.push('upgraded');
}

/** How many more steps a stat can take before its cap (Infinity when it has none). */
function stepsLeft(w, stat, rule) {
  const base = currentBase(w);
  if (base[stat] === undefined) return 0;
  const n = w.up[stat] || 0;
  if (rule.once) return n >= 1 ? 0 : 1;
  if (rule.max === undefined && rule.min === undefined) return Infinity;
  let left = 0;
  for (let k = 1; k <= 64; k++) {
    const v = applyRule(base[stat], rule, n + k), prev = applyRule(base[stat], rule, n + k - 1);
    if (v === prev) break;
    left = k;
  }
  return left;
}

/** The numbers a weapon starts from right now (base, or the combination's stats). */
export function currentBase(w) {
  return w.evo ? V[w.id].combination.stats : V[w.id].base;
}

/** The value of a stat after n steps of a growth rule (pct steps are a share of the base, never compounding). */
export function applyRule(base, rule, n) {
  if (rule.set !== undefined) return n >= 1 ? rule.set : base;
  let v = base;
  if (rule.add) v += rule.add * n;
  if (rule.pct) v += rule.pct * base * n;
  if (rule.mul) v *= Math.pow(rule.mul, n);
  if (rule.min !== undefined) v = Math.max(rule.min, v);
  if (rule.max !== undefined) v = Math.min(rule.max, v);
  return Math.round(v * 1000) / 1000;
}

/** Gives a new passive, or one level up. */
export function givePassive(s, id) {
  const p = findPassive(s, id);
  if (p) {
    if (p.level >= G.passiveLevel) return;
    p.level++;
  } else {
    if (s.player.passives.length >= G.passives) return;
    s.player.passives.push({ id, level: 1 });
  }
  if (id === 'biggerCan') {
    s.player.maxEnergy += P.biggerCan.value;
    s.player.energy = Math.min(s.player.maxEnergy, s.player.energy + P.biggerCan.value);
  }
  computeBonuses(s);
  s.events.push('upgraded');
}

/**
 * Swaps a weapon for its combination. It takes the same slot. The combination's stats are a new starting point
 * (tuned to be clearly stronger than a weapon with the increments needed to unlock it), and the increments the
 * player takes from now on grow from there. The effect modifiers are kept.
 */
export function giveCombination(s, id) {
  const w = findWeapon(s, id);
  if (!w || w.evo) return;
  w.evo = true;
  w.cd = 0.2;
  w.up = {};
  refreshWeapon(w);
  if (id === 'headset') w.charges = w.stats.charges;
  s.stat.combinations.push(id);
  s.events.push('combination:' + id);
  s.events.push('upgraded');
}

/** Combinations that can be chosen now: enough increments + the matching passive (at any level). */
export function availableCombinations(s) {
  return s.player.weapons.filter((w) => !w.evo && V[w.id].combination && w.picks >= U.combinationAfter && passiveLevel(s, V[w.id].combination.passive) > 0);
}

/**
 * The Matrix (Endringsprompt 4): Skytsengelen with enough increments (or as Himmelsk serviceavtale), Livvakten with
 * enough increments, and Shopkeeperen at any level. «Enough» is the same as for the combinations (version 6 has no levels).
 */
export function matrixReady(s) {
  const R = V.matrix.requires;
  if (findWeapon(s, 'matrix')) return false;
  const a = findWeapon(s, R.angel), g = findWeapon(s, R.bodyguard);
  return !!a && (a.evo || a.picks >= U.combinationAfter) && !!g && g.picks >= U.combinationAfter && passiveLevel(s, R.passive) > 0;
}

/**
 * Merges Skytsengelen and Livvakten into The Matrix: it takes the angel's slot, and the bodyguard's slot is freed.
 * The effect modifiers of both are kept (the highest level of each). Shopkeeperen stays as a passive.
 */
export function giveMatrix(s) {
  if (!matrixReady(s)) return;
  const R = V.matrix.requires;
  const list = s.player.weapons;
  const a = /** @type {any} */ (findWeapon(s, R.angel)), g = /** @type {any} */ (findWeapon(s, R.bodyguard));
  /** @type {Record<string, number>} */
  const fx = {};
  for (const w of [a, g]) for (const [k, n] of Object.entries(w.fx)) if (V.matrix.effects.includes(k)) fx[k] = Math.max(fx[k] || 0, n);
  const m = { id: 'matrix', picks: 0, up: /** @type {Record<string, number>} */ ({}), fx, stats: /** @type {any} */ (null), evo: false, cd: 0.4, angle: a.angle, phase: V.matrix.base.rainEvery, active: 0, tick: 1, charges: 1, gx: g.gx, gy: g.gy, pose: 0, aim: 0 };
  refreshWeapon(m);
  list.splice(list.indexOf(a), 1, m);
  list.splice(list.indexOf(g), 1);
  s.stat.combinations.push('matrix');
  s.events.push('matrix');
  s.events.push('upgraded');
}

// ---------- Card text ----------

const dec = (v, n) => v.toFixed(n).replace('.', ',');
/** Formats a stat value for a card («1,2 s», «44 px», «7»). */
export function statValue(stat, v) {
  const unit = STAT_LABEL[stat]?.[1] ?? '';
  if (typeof v === 'boolean') return v ? 'ja' : 'nei';
  if (unit === 's') return dec(v, 2).replace(/,?0+$/, '') + ' s';
  if (unit === 'rad') return dec(v, 1) + '/s';
  if (unit === 'n') return String(Math.round(v));
  if (unit === 'px') return Math.round(v) + ' px';
  return v >= 100 ? String(Math.round(v)) : dec(v, 1).replace(/,0$/, '');
}
const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);
/** «mus» → «mus», «tonerkassett» → «tonerkassetter» (plural in Norwegian). */
function plural(name, n) {
  if (n === 1 || name === 'mus' || name === 'hopp' || name === 'treff') return name;
  return name.endsWith('er') ? name : name + 'er';
}

/** One sentence per grant, with the values before and after. */
export function describeGrant(w, grant) {
  const def = V[w.id];
  if (grant.fx) {
    const k = FX[grant.fx];
    const have = w.fx[grant.fx] || 0;
    return `${k.name} ${have + (grant.levels ?? 1)}${have ? ` (fra ${have})` : ''}: ${k.text}`;
  }
  const stat = /** @type {string} */ (grant.stat);
  const rule = def.growth[stat];
  const base = currentBase(w)[stat];
  const n = w.up[stat] || 0;
  const before = applyRule(base, rule, n), after = applyRule(base, rule, n + (grant.steps ?? 1));
  if (rule.set !== undefined) return capital(STAT_LABEL[stat]?.[0] ?? stat) + '.';
  if (COUNT_LIKE.has(stat)) {
    const d = Math.round(after - before);
    const name = stat === 'count' || stat === 'perThrow' ? def.countName ?? 'prosjektil' : STAT_LABEL[stat]?.[0] ?? stat;
    return `+${d} ${plural(name, d)} (${Math.round(before)} → ${Math.round(after)})`;
  }
  if (stat === 'help') return `+${statValue(stat, after - before)} hjelp per treff (${statValue(stat, before)} → ${statValue(stat, after)})`;
  if (stat === 'arc') return `Bredere bue (${Math.round((before / Math.PI) * 180)}° → ${Math.round((after / Math.PI) * 180)}°)`;
  const label = STAT_LABEL[stat]?.[0] ?? stat;
  const less = after < before;
  return `${capital(less ? 'kortere ' + label : 'mer ' + label)} (${statValue(stat, before)} → ${statValue(stat, after)})`;
}

/** The card's one-line text: all the grants joined. */
function grantsText(w, grants) {
  return grants.map((g) => describeGrant(w, g)).join(' · ');
}

// ---------- Making the cards ----------

/** The banish key of a card. */
export function cardKey(c) {
  return c.key;
}

/**
 * Rolls a tier (0–3) with the tier odds, scaled by luck: everything above common is «1 + luck» times as likely.
 * @param {import('./utils.js').Rng} rng
 */
export function rollTier(rng, luck, minTier = 0) {
  const odds = U.tierOdds;
  let total = 0;
  for (let i = minTier; i < odds.length; i++) total += odds[i] * (i > 0 ? 1 + luck : 1);
  let r = rng.next() * total;
  for (let i = minTier; i < odds.length; i++) {
    r -= odds[i] * (i > 0 ? 1 + luck : 1);
    if (r <= 0) return i;
  }
  return odds.length - 1;
}

/** The grants a numeric or count stat gives at a tier. */
function grantsFor(w, stat, tier) {
  const steps = U.tiers[tier].steps;
  if (!COUNT_LIKE.has(stat)) return [{ stat, steps }];
  // Count-like: +1 (uncommon, rare), +2 (legendary); rare and legendary add help steps on top
  const rule = V[w.id].growth[stat];
  if (rule.once) return [{ stat, steps: 1 }];
  if (tier <= 1) return [{ stat, steps: 1 }];
  if (tier === 2) return [{ stat, steps: 1 }, { stat: 'help', steps: 1 }];
  return [{ stat, steps: Math.min(2, stepsLeft(w, stat, rule)) }, { stat: 'help', steps: 2 }];
}

/** The grants an effect gives at a tier (rare: +1 level, legendary: +2 or +1 and help). */
function effectGrants(w, fx, tier) {
  const room = FX[fx].max - (w.fx[fx] || 0);
  if (tier >= 3) return room >= 2 ? [{ fx, levels: 2 }] : [{ fx, levels: 1 }, { stat: 'help', steps: 2 }];
  return [{ fx, levels: 1 }];
}

/**
 * The lowest tier a candidate can be offered at: numeric stats at any tier, count-like stats and new weapons from
 * uncommon, effects from rare. Passives are always common.
 */
function minTierOf(c) {
  if (c.kind === 'passive' || c.kind === 'coffee') return 0;
  if (c.kind === 'weapon') return 1;
  if (c.fx) return 2;
  return COUNT_LIKE.has(c.stat) && !V[c.id].growth[c.stat].once ? 1 : 0;
}
/** The highest tier: passives and new weapons never go higher than their minimum. */
function maxTierOf(c) {
  if (c.kind === 'passive' || c.kind === 'coffee') return 0;
  if (c.kind === 'weapon') return 1;
  return 3;
}

/**
 * All the things that could be offered right now, before the tier is known. Each is a small candidate record.
 * @param {Set<string>} exclude banished keys and the keys of the cards already shown
 * @param {boolean} onlyWeapons packages only give weapon increments and effects
 */
function candidates(s, exclude, onlyWeapons) {
  const sp = s.player;
  const used = sp.weapons.length;
  /** @type {any[]} */
  const list = [];
  for (const w of sp.weapons) {
    const def = V[w.id];
    const base = currentBase(w);
    const rules = Object.keys(def.growth).filter((stat) => base[stat] !== undefined && stepsLeft(w, stat, def.growth[stat]) > 0);
    let total = 0;
    for (const stat of rules) total += ruleWeight(stat);
    for (const stat of rules) {
      const key = w.id + ':' + stat;
      if (!exclude.has(key)) list.push({ kind: 'upgrade', id: w.id, stat, key, weight: (WEIGHT.ownedWeapon * ruleWeight(stat)) / total });
    }
    const fxList = (def.effects ?? []).filter((fx) => (w.fx[fx] || 0) < FX[fx].max);
    for (const fx of fxList) {
      const key = w.id + ':fx:' + fx;
      if (!exclude.has(key)) list.push({ kind: 'upgrade', id: w.id, fx, key, weight: WEIGHT.effect / fxList.length });
    }
  }
  if (onlyWeapons) return list;
  const hasMatrix = !!findWeapon(s, 'matrix');
  for (const id of Object.keys(V)) {
    if (findWeapon(s, id) || used >= G.weapons || exclude.has(id)) continue;
    // The Matrix is never offered as a new weapon, and the two weapons it is made of are not offered again after it
    if (V[id].hidden || (hasMatrix && (id === V.matrix.requires.angel || id === V.matrix.requires.bodyguard))) continue;
    // Only when there is free space – so you have to commit to a build. More often while the first slots are empty.
    list.push({ kind: 'weapon', id, key: id, weight: WEIGHT.fresh * (used < U.earlySlots ? U.earlyWeaponBoost : 1) });
  }
  for (const id of Object.keys(P)) {
    const p = findPassive(s, id);
    const level = p ? p.level : 0;
    if (exclude.has(id)) continue;
    if (p ? level < G.passiveLevel : sp.passives.length < G.passives) list.push({ kind: 'passive', id, key: id, weight: p ? WEIGHT.ownedPassive : WEIGHT.freshPassive });
  }
  return list;
}

/** Help and count cards come up more often than the other rules of a weapon (they are what a build is made of). */
function ruleWeight(stat) {
  return stat === 'help' ? WEIGHT.helpRule : COUNT_LIKE.has(stat) ? WEIGHT.countRule : 1;
}

/** Turns a candidate at a tier into a finished card. @returns {Card} */
function makeCard(s, c, tier) {
  const sp = s.player;
  const tierName = U.tiers[tier].name;
  if (c.kind === 'weapon') {
    return { kind: 'weapon', id: c.id, icon: c.id, name: V[c.id].name, levelText: `${tierName} · Nytt våpen (${sp.weapons.length} av ${G.weapons} plasser brukt)`, text: V[c.id].description, tier, highlighted: false, key: c.key, weight: c.weight };
  }
  if (c.kind === 'passive') {
    const p = findPassive(s, c.id);
    const level = p ? p.level : 0;
    const text = P[c.id].levelText ? P[c.id].levelText[level] : P[c.id].text;
    return { kind: 'passive', id: c.id, icon: c.id, name: P[c.id].name, levelText: p ? `Passiv · Nivå ${level + 1} av ${G.passiveLevel}` : `Passiv · Ny (${sp.passives.length} av ${G.passives} brukt)`, text, tier, highlighted: false, key: c.key, weight: c.weight };
  }
  const w = /** @type {any} */ (findWeapon(s, c.id));
  const grants = c.fx ? effectGrants(w, c.fx, tier) : grantsFor(w, c.stat, tier);
  const left = Math.max(0, U.combinationAfter - w.picks - 1);
  const combo = w.evo || !V[c.id].combination ? '' : left === 0 ? ' · klar for kombinasjon' : ` · ${left} igjen til kombinasjon`;
  return { kind: 'upgrade', id: c.id, icon: w.evo ? 'evo:' + c.id : c.id, name: weaponName(w), levelText: `${tierName} · Oppgradering ${w.picks + 1}${combo}`, text: grantsText(w, grants), tier, highlighted: false, key: c.key, grants, weight: c.weight };
}

/** Weighted draw without replacement from a list of candidates. */
function draw(rng, list) {
  let total = 0;
  for (const c of list) total += c.weight ?? 1;
  let r = rng.next() * total, pick = list.length - 1;
  for (let i = 0; i < list.length; i++) {
    r -= list[i].weight ?? 1;
    if (r <= 0) {
      pick = i;
      break;
    }
  }
  return list.splice(pick, 1)[0];
}

/**
 * Makes the cards at level-up (usually three, four with luck). Uses its own random stream, so the same choices
 * give the same offer for everyone on the same day. The tier is rolled first for each card, then a candidate
 * that can be offered at that tier is drawn (falling back to a lower tier when nothing fits).
 * @param {number} [count] how many cards (default: 3, or 4 with luck)
 * @param {Set<string>} [exclude] keys not to offer (banished, or already on the table)
 * @param {import('./utils.js').Rng} [rng] the stream to use (the package uses its own)
 * @param {{onlyWeapons?: boolean, minTier?: number, combination?: boolean}} [opt]
 * @returns {Card[]}
 */
export function makeCards(s, count = 0, exclude = s.banished, rng = s.rng.cards, opt = {}) {
  const sp = s.player;
  /** @type {Card[]} */
  const cards = [];
  // An available combination is always shown as its own highlighted card.
  if (opt.combination !== false) {
    const evo = availableCombinations(s).filter((w) => !exclude.has('evo:' + w.id));
    if (evo.length > 0) {
      const w = evo[rng.integer(evo.length)];
      const k = V[w.id].combination;
      cards.push({ kind: 'combination', id: w.id, icon: 'evo:' + w.id, name: k.name, levelText: 'Kombinasjon!', text: k.text, tier: 3, highlighted: true, key: 'evo:' + w.id });
    }
    // The Matrix is always shown as its own extra card when the requirements are met, also next to a combination
    if (matrixReady(s)) {
      cards.push({ kind: 'matrix', id: 'matrix', icon: 'matrix', name: V.matrix.name, levelText: 'Spesialkombinasjon!', text: V.matrix.cardText, tier: 3, highlighted: true, key: 'matrix' });
    }
  }
  // «Hesteskoen»: a chance of a fourth card (the roll only happens when the player has the passive).
  if (!count) count = 3 + (sp.mod.fourthCard > 0 && rng.next() < sp.mod.fourthCard ? 1 : 0);
  const pool = candidates(s, exclude, !!opt.onlyWeapons);
  while (cards.length < count && pool.length > 0) {
    let tier = rollTier(rng, sp.mod.luck, opt.minTier ?? 0);
    let fits = pool.filter((c) => minTierOf(c) <= tier);
    while (fits.length === 0 && tier > 0) {
      tier--;
      fits = pool.filter((c) => minTierOf(c) <= tier);
    }
    if (fits.length === 0) break;
    const c = draw(rng, fits);
    pool.splice(pool.indexOf(c), 1);
    cards.push(makeCard(s, c, Math.max(minTierOf(c), Math.min(tier, maxTierOf(c)))));
  }
  // All maxed out: only «Kaffepause-bonus» ("Coffee break bonus") is offered (not the energy drink – it has to be picked up on the map).
  if (!opt.onlyWeapons && (cards.length === 0 || (cards.length < 3 && pool.length === 0 && !cards.some((k) => k.kind === 'coffee')))) {
    cards.push({ kind: 'coffee', id: 'coffee', icon: 'coffee', name: 'Kaffepause-bonus', levelText: 'Bonus', text: `${CONFIG.coffeeBreakBonus} poeng ganget med multiplikatoren.`, tier: 0, highlighted: false, key: 'coffee' });
  }
  return cards;
}

/** Carries out the card the player chose. */
export function useCard(s, card) {
  if (card.kind === 'weapon') giveWeapon(s, card.id);
  else if (card.kind === 'upgrade') for (const g of card.grants ?? []) giveUpgrade(s, card.id, g);
  else if (card.kind === 'passive') givePassive(s, card.id);
  else if (card.kind === 'combination') giveCombination(s, card.id);
  else if (card.kind === 'matrix') giveMatrix(s);
  else if (card.kind === 'coffee') givePoints(s, CONFIG.coffeeBreakBonus);
}

/**
 * A supplier package: «count» weapon increments at once, from the package stream, applied right away.
 * Returns the cards so the UI can show what was in it. Nothing happens if the player has no weapon.
 * @returns {Card[]}
 */
export function openPackage(s, count) {
  const cards = makeCards(s, count, s.banished, s.rng.package, { onlyWeapons: true, minTier: CONFIG.package.minTier, combination: false });
  for (const c of cards) useCard(s, c);
  return cards;
}

/**
 * Gives a weapon n increments spread over its numeric growth rules in the same proportions the cards come up
 * (help and counts more often than the rest). Used by debug builds and the tools.
 */
export function giveEvenUpgrades(s, id, n) {
  const w = findWeapon(s, id);
  if (!w) return;
  const def = V[id];
  for (let i = 0, given = 0; given < n && i < n * 8; i++) {
    const stats = Object.keys(def.growth).filter((st) => currentBase(w)[st] !== undefined && stepsLeft(w, st, def.growth[st]) > 0);
    if (stats.length === 0) break;
    /** @type {string[]} */
    const cycle = [];
    for (const st of stats) for (let k = 0; k < Math.round(ruleWeight(st) * 2); k++) cycle.push(st);
    giveUpgrade(s, id, { stat: cycle[i % cycle.length], steps: 1 });
    given++;
  }
}

export { WEAPON_TAG };

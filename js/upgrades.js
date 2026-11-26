// @ts-check
// The upgrade cards at level-up: new weapons, weapon levels, passives and combinations.
import { CONFIG } from './config.js';
import { givePoints } from './score.js';

const V = CONFIG.weapons;
const P = CONFIG.passives;
const G = CONFIG.limits;

/**
 * @typedef {Object} Card
 * @property {'weapon'|'passive'|'combination'|'coffee'} kind
 * @property {string} id weapon or passive id (the icon is fetched from icons.js)
 * @property {string} icon icon id (for combinations: 'evo:' + weapon id)
 * @property {string} name
 * @property {string} levelText e.g. "Nytt våpen (2 av 4 plasser brukt)" or "Nivå 3" (new weapon, 2 of 4 slots used / level 3)
 * @property {string} text one short sentence about what the card does
 * @property {boolean} highlighted combination card
 * @property {number} [weight] how likely the card is to be offered (owned weapons and passives are weighted up)
 */

/** Card weights: upgrades to what the player already has show up more often than new things. */
const WEIGHT = { ownedWeapon: 2.5, ownedPassive: 1.5, fresh: 1 };

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
  m.luck = Math.min(1, P.lottery.value * passiveLevel(s, 'lottery'));
}

/** Gives the player a new weapon, or one level up on a weapon the player has. */
export function giveWeapon(s, id) {
  const w = findWeapon(s, id);
  if (w) {
    if (w.level < G.weaponLevel) w.level++;
  } else {
    if (s.player.weapons.length >= G.weapons) return;
    s.player.weapons.push({ id, level: 1, evo: false, cd: 0.3, angle: 0, phase: 0, active: 0, tick: 0, charges: 1 });
  }
  s.events.push('upgraded');
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

/** Swaps a max-level weapon for the combination. It takes the same slot as the weapon. */
export function giveCombination(s, id) {
  const w = findWeapon(s, id);
  if (!w || w.evo) return;
  w.evo = true;
  w.cd = 0.2;
  if (id === 'headset') w.charges = V.headset.combination.stats.charges;
  s.stat.combinations.push(id);
  s.events.push('combination:' + id);
  s.events.push('upgraded');
}

/** Combinations that can be chosen now: max-level weapon + the matching passive (at any level). */
export function availableCombinations(s) {
  return s.player.weapons.filter((w) => !w.evo && w.level >= G.weaponLevel && passiveLevel(s, V[w.id].combination.passive) > 0);
}

/**
 * Makes the cards at level-up (usually three). Uses its own random stream,
 * so the same choices give the same offer for everyone on the same day.
 * @returns {Card[]}
 */
export function makeCards(s) {
  const sp = s.player;
  const rng = s.rng.cards;
  /** @type {Card[]} */
  const candidates = [];
  const used = sp.weapons.length;

  for (const id of Object.keys(V)) {
    const w = findWeapon(s, id);
    if (w) {
      if (!w.evo && w.level < G.weaponLevel) {
        candidates.push({ kind: 'weapon', id, icon: id, name: V[id].name, levelText: 'Nivå ' + (w.level + 1), text: V[id].levels[w.level].text, highlighted: false, weight: WEIGHT.ownedWeapon });
      }
    } else if (used < G.weapons) {
      // Only when there is free space – so you have to commit to a build.
      candidates.push({ kind: 'weapon', id, icon: id, name: V[id].name, levelText: `Nytt våpen (${used} av ${G.weapons} plasser brukt)`, text: V[id].description, highlighted: false, weight: WEIGHT.fresh });
    }
  }
  for (const id of Object.keys(P)) {
    const p = findPassive(s, id);
    const level = p ? p.level : 0;
    if (p ? level < G.passiveLevel : sp.passives.length < G.passives) {
      const text = P[id].levelText ? P[id].levelText[level] : P[id].text;
      candidates.push({ kind: 'passive', id, icon: id, name: P[id].name, levelText: p ? 'Nivå ' + (level + 1) : `Ny passiv (${sp.passives.length} av ${G.passives} brukt)`, text, highlighted: false, weight: p ? WEIGHT.ownedPassive : WEIGHT.fresh });
    }
  }

  /** @type {Card[]} */
  const cards = [];
  // An available combination is always shown as its own highlighted card.
  const evo = availableCombinations(s);
  if (evo.length > 0) {
    const w = evo[rng.integer(evo.length)];
    const k = V[w.id].combination;
    cards.push({ kind: 'combination', id: w.id, icon: 'evo:' + w.id, name: k.name, levelText: 'Kombinasjon!', text: k.text, highlighted: true });
  }
  // «Kontorlotteriet»: a chance of a fourth card (the roll only happens when the player has the passive).
  const count = 3 + (sp.mod.luck > 0 && rng.next() < sp.mod.luck ? 1 : 0);
  while (cards.length < count && candidates.length > 0) {
    // Weighted draw without replacement
    let total = 0;
    for (const c of candidates) total += c.weight ?? 1;
    let r = rng.next() * total, pick = candidates.length - 1;
    for (let i = 0; i < candidates.length; i++) {
      r -= candidates[i].weight ?? 1;
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    cards.push(candidates.splice(pick, 1)[0]);
  }
  // All maxed out: only «Kaffepause-bonus» ("Coffee break bonus") is offered (not the energy drink – it has to be picked up on the map).
  if (cards.length === 0 || (cards.length < 3 && candidates.length === 0 && !cards.some((k) => k.kind === 'coffee'))) {
    cards.push({ kind: 'coffee', id: 'coffee', icon: 'coffee', name: 'Kaffepause-bonus', levelText: 'Bonus', text: `${CONFIG.coffeeBreakBonus} poeng ganget med multiplikatoren.`, highlighted: false });
  }
  return cards;
}

/** Carries out the card the player chose. */
export function useCard(s, cards) {
  if (cards.kind === 'weapon') giveWeapon(s, cards.id);
  else if (cards.kind === 'passive') givePassive(s, cards.id);
  else if (cards.kind === 'combination') giveCombination(s, cards.id);
  else if (cards.kind === 'coffee') givePoints(s, CONFIG.coffeeBreakBonus);
}

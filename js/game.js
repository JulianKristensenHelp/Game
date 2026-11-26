// @ts-check
// The game itself: all state and one update per fixed time step.
// This file (and everything it imports) uses neither screen, sound nor Math.random(),
// so the same date + the same key presses give exactly the same round on all machines.
// Graphics settings and automatic quality live in the rendering code and can never affect anything here.
import { CONFIG, DT } from './config.js';
import { Rng, Pool, Grid } from './utils.js';
import { makePlayer, updatePlayer } from './player.js';
import { makeEnemy, makePaper, updateDirector, updateEnemies, pruneEnemies, spawnEnemy } from './enemies.js';
import { makeShot, makePuddle, updateEnemyShots, spawnBoss, bossTypeAt, bossTimeAt } from './bosses.js';
import { makeProjectile, updateWeapons, updateProjectiles } from './weapons.js';
import { makeTicket, makePickup, updateTickets, dropPickup, updateDrinks } from './tickets.js';
import { makeEffect, updateEffects } from './effects.js';
import { giveWeapon, givePassive, giveCombination, giveEvenUpgrades, makeCards, useCard, computeBonuses, openPackage, giveMatrix } from './upgrades.js';
import { xpNeeded } from './score.js';

const VB = CONFIG.view.width, VH = CONFIG.view.height;
const KB = CONFIG.map.width, KH = CONFIG.map.height;

export class Game {
  /**
   * @param {string} date today's date ("ÅÅÅÅ-MM-DD") (year-month-day) – used as the seed for «Dagens vakt» ("Today's shift")
   * @param {number} [character] which playable character (0–3), see CONFIG.characters
   */
  constructor(date, character = 0) {
    this.date = date;
    this.character = Math.max(0, Math.min(CONFIG.characters.length - 1, character | 0));
    /** Separate random streams, so one does not affect another. */
    this.rng = {
      /** when the lawyers arrive, and which type */
      spawn: new Rng(date + '|spawn'),
      /** where they enter (depends on where the player is standing) */
      spot: new Rng(date + '|plass'),
      /** urgent case and boss */
      special: new Rng(date + '|spesial'),
      /** upgrade cards */
      cards: new Rng(date + '|kort'),
      /** New PC drops */
      drops: new Rng(date + '|drops'),
      /** where the energy drink appears */
      drink: new Rng(date + '|drikk'),
      /** Remote control */
      weapons: new Rng(date + '|vaapen'),
      /** «Dobbel skjerm» ("Dual monitor"): whether a weapon is activated twice in a row */
      dual: new Rng(date + '|dobbel'),
      /** critical hits («Kaffemaskin») */
      crit: new Rng(date + '|krit'),
      /** dodge («Brannmur») */
      luck: new Rng(date + '|flaks'),
      /** what is in a supplier package */
      package: new Rng(date + '|pakke'),
      /** the rare events and which direction the scheduled ones come from */
      events: new Rng(date + '|hendelser'),
      /** the direction of each new ping-pong ball (Endringsprompt 4) */
      pingpong: new Rng(date + '|pingpong'),
      /** looks only – never affects anything else */
      looks: new Rng(date + '|utseende'),
    };
    /** 'running' | 'levelUp' | 'package' | 'done' */
    this.status = 'running';
    this.time = 0;
    this.player = makePlayer();
    /** What the player sees (640 × 360), follows the player but stops at the map edge. */
    this.camera = { x: 0, y: 0 };

    this.enemies = new Pool(makeEnemy);
    this.projectiles = new Pool(makeProjectile);
    this.projCounter = { toner: 0, key: 0, ctrlz: 0, teams: 0, mini: 0, sheet: 0, ball: 0, wall: 0 };
    /**
     * The Matrix's code rain (Endringsprompt 4): seconds left of it, time to the next help tick, and the «bullet time»
     * factor on everything hostile (1 = normal speed). The player is never slowed.
     */
    this.rain = 0;
    this.rainTick = 0;
    this.timeScale = 1;
    this.tickets = new Pool(makeTicket);
    this.pickups = new Pool(makePickup);
    this.paper = new Pool(makePaper);
    /** Emails from «Haster!» ("Urgent!") senders and bosses. */
    this.enemyShots = new Pool(makeShot);
    /** Ink puddles from the printer boss's cartridges. */
    this.puddles = new Pool(makePuddle);
    this.senderCount = 0;
    /** Elites («Partnere») out right now, and the ones with an aura (rebuilt every update). @type {any[]} */
    this.elites = [];
    this.eliteCount = 0;
    /** Hit numbers alive right now (capped, see enemies.js). */
    this.hitCount = 0;
    this.effects = new Pool(makeEffect);
    this.grid = new Grid();
    /** Reused lists (avoids new objects in every update). */
    this.hitList = /** @type {number[]} */ ([]);
    this.candidates = /** @type {number[]} */ ([]);
    this.hitList2 = /** @type {number[]} */ ([]);
    /** Teams alert: which target each alert flies toward. @type {Map<any, any>} */
    this.teamsTargets = new Map();
    this.drinkCand = new Float64Array(CONFIG.energyDrink.candidates);
    this.drinkCandY = new Float64Array(CONFIG.energyDrink.candidates);
    this.nextUid = 0;

    // The director
    this.spawnAcc = 0;
    /** Lawyers who did not fit under the cap – makes the next ones stronger. */
    this.spared = 0;
    this.nextWave = CONFIG.waves.first;
    this.nextUrgent = CONFIG.enemies.urgent.from;
    this.nextBoss = bossTimeAt(0);
    /** The «… kommer om 10 sekunder» banner has been shown for the next boss. */
    this.bossWarned = false;
    /** The boss that is out right now (see bosses.js). @type {any} */
    this.boss = null;
    /** Set when the player got fired (a boss's countdown ran out). @type {null | {type: string, name: string, time: number}} */
    this.fired = null;
    this.nextDrink = CONFIG.energyDrink.first;
    /** Events (version 6): when each scheduled event fires next, the last event, and the mood they set. */
    this.eventTimes = CONFIG.events.scheduled.map((e) => e.at);
    this.lastEvent = -1e9;
    this.nextRareCheck = 60;
    this.mood = { speed: 1, damage: 1, until: 0 };
    this.bossNo = 0;
    this.phaseIndex = -1;
    /** Number who became happy in this update (to shorten the animation when there are many). */
    this.happyNow = 0;

    // Points and level
    this.score = 0;
    this.helped = 0;
    this.multStep = 0;
    this.multCounter = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeeded = xpNeeded(1);
    /** The cards shown at level-up. @type {import('./upgrades.js').Card[] | null} */
    this.cards = null;
    /** Rerolls and banishes left, and the banished card keys (never offered again this shift). */
    this.rerolls = CONFIG.upgrades.rerolls;
    this.banishes = CONFIG.upgrades.banishes;
    this.banished = new Set();
    /** What the last supplier package contained (shown while status is 'package'). @type {import('./upgrades.js').Card[] | null} */
    this.packageCards = null;

    this.stat = {
      perType: /** @type {Record<string, number>} */ ({}),
      helpPerWeapon: /** @type {Record<string, number>} */ ({}),
      bossesTotal: 0, bossesHelped: 0, maxMultStep: 0, hits: 0,
      ticketsPicked: 0, ticketsLost: 0, drinks: 0, blocked: 0, dodged: 0, elitesHelped: 0, emails: 0,
      packages: 0, rerolls: 0, banishes: 0, events: 0, upgrades: 0, revives: 0,
      /** Endringsprompt 4: cookies eaten, and how many times the player took Fiske-Frida's bait. */
      cookies: 0, baited: 0,
      combinations: /** @type {string[]} */ ([]),
      /** Every boss the player met, and whether it was helped. @type {{type: string, helped: boolean, time: number, helpedAt: number, returnNo: number}[]} */
      bossLog: [],
    };
    /** Events since last time – read by UI and sound, and cleared there. @type {string[]} */
    this.events = [];
    this.debug = { immortal: false, used: false };

    // The character's bonus and starting weapon
    const k = CONFIG.characters[this.character];
    this.characterBonus = { help: 0, speed: 0, pick: 0, ...k.bonus };
    if (k.bonus.maxEnergy) {
      this.player.maxEnergy += k.bonus.maxEnergy;
      this.player.energy = this.player.maxEnergy;
    }
    computeBonuses(this);
    giveWeapon(this, k.startWeapon);
    this.updateCamera();
  }

  /** The camera follows the player, but stops at the map edge so you never see outside the map. */
  updateCamera() {
    const p = this.player;
    this.camera.x = Math.min(KB - VB, Math.max(0, p.x - VB / 2));
    this.camera.y = Math.min(KH - VH, Math.max(0, p.y - VH / 2));
  }

  /**
   * One update on a fixed time step (1/60 second).
   * @param {number} ix desired horizontal direction (−1 to 1)
   * @param {number} iy desired vertical direction (−1 to 1)
   */
  tick(ix, iy) {
    if (this.status !== 'running') return;
    this.time += DT;
    this.happyNow = 0;

    // Phase change («Morgenkaffe» ("Morning coffee"), «Formiddagen» ("Late morning") …)
    const phases = CONFIG.phases;
    while (this.phaseIndex + 1 < phases.length && this.time >= phases[this.phaseIndex + 1].from) {
      this.phaseIndex++;
      this.events.push('phase');
    }

    // Bullet time only lasts while the code rain falls (set again by The Matrix every update while it does)
    if (this.rain <= 0) this.timeScale = 1;
    updatePlayer(this, DT, ix, iy);
    this.updateCamera();
    updateDirector(this, DT);
    updateDrinks(this);
    this.grid.build(this.enemies.items, this.enemies.n);
    updateEnemies(this, DT);
    this.grid.build(this.enemies.items, this.enemies.n);
    if (this.status === 'running') {
      updateWeapons(this, DT);
      updateProjectiles(this, DT);
      updateEnemyShots(this, DT);
      updateTickets(this, DT);
    }
    pruneEnemies(this);
    updateEffects(this, DT);
    this.checkLevel();
  }

  /** Enough experience? Then the game pauses and the cards are shown. */
  checkLevel() {
    if (this.status !== 'running' || this.xp < this.xpNeeded) return;
    this.xp -= this.xpNeeded;
    this.level++;
    this.xpNeeded = xpNeeded(this.level);
    this.cards = makeCards(this);
    this.status = 'levelUp';
    this.magnet();
    this.events.push('level');
  }

  /** Tickets near the player fly in (used at level-up and when a package is opened, so the pause never costs them). */
  magnet() {
    const p = this.player, R = CONFIG.levelMagnet;
    for (let i = 0; i < this.tickets.n; i++) {
      const l = this.tickets.items[i];
      if ((l.x - p.x) ** 2 + (l.y - p.y) ** 2 < R * R) l.dragged = true;
    }
  }

  /** How many more level-ups are already paid for by the experience collected (shown on the level-up screen). */
  get queuedLevels() {
    let x = this.xp, lvl = this.level, n = 0;
    while (x >= xpNeeded(lvl) && n < 99) {
      x -= xpNeeded(lvl);
      lvl++;
      n++;
    }
    return n;
  }

  /** The player chooses card no. i. */
  chooseCard(i) {
    if (this.status !== 'levelUp' || !this.cards || !this.cards[i]) return;
    const selectedCard = this.cards[i];
    this.cards = null;
    this.status = 'running';
    useCard(this, selectedCard);
    if (selectedCard.kind === 'upgrade') this.stat.upgrades++;
    this.checkLevel();
  }

  /** «Nytt utvalg»: a new set of cards (costs one reroll). */
  reroll() {
    if (this.status !== 'levelUp' || this.rerolls <= 0) return false;
    this.rerolls--;
    this.stat.rerolls++;
    this.cards = makeCards(this);
    this.events.push('reroll');
    return true;
  }

  /** «Fjern kortet»: card no. i is never offered again this shift, and a new card takes its place (costs one banish). */
  banish(i) {
    if (this.status !== 'levelUp' || !this.cards || !this.cards[i] || this.banishes <= 0) return false;
    const card = this.cards[i];
    if (card.kind === 'coffee') return false;
    this.banishes--;
    this.stat.banishes++;
    this.banished.add(card.key);
    const shown = new Set(this.banished);
    for (const c of this.cards) shown.add(c.key);
    const replacement = makeCards(this, 1, shown, this.rng.cards, { combination: false })[0];
    if (replacement) this.cards[i] = replacement;
    else this.cards.splice(i, 1);
    this.events.push('banish');
    return true;
  }

  /** A supplier package was picked up: «count» weapon increments at once, shown until the player continues. */
  openPackage(count) {
    if (this.status !== 'running') return;
    this.stat.packages++;
    this.packageCards = openPackage(this, count);
    this.stat.upgrades += this.packageCards.length;
    if (this.packageCards.length > 0) {
      this.status = 'package';
      this.magnet();
    }
    this.events.push('package');
  }

  /** The player has seen what was in the package. */
  closePackage() {
    if (this.status !== 'package') return;
    this.packageCards = null;
    this.status = 'running';
    this.checkLevel();
  }

  /** The name of the phase we are in now. */
  get phaseName() {
    return CONFIG.phases[Math.max(0, this.phaseIndex)].name;
  }

  // ---------- Debug helpers (only used with ?debug) ----------

  /** Jumps forward in time without triggering all the bosses on the way. */
  debugSkip(sec) {
    this.debug.used = true;
    this.time += sec;
    while (bossTimeAt(this.bossNo) <= this.time) this.bossNo++;
    this.nextBoss = bossTimeAt(this.bossNo);
    this.bossWarned = false;
    while (this.nextDrink <= this.time - CONFIG.energyDrink.interval) this.nextDrink += CONFIG.energyDrink.interval;
    if (this.nextWave < this.time) this.nextWave = this.time + 10;
    if (this.nextUrgent < this.time) this.nextUrgent = this.time + 5;
    CONFIG.events.scheduled.forEach((e, i) => {
      while (this.eventTimes[i] < this.time && e.repeat > 0) this.eventTimes[i] += e.repeat;
      if (this.eventTimes[i] < this.time) this.eventTimes[i] = 1e9;
    });
    while (this.nextRareCheck <= this.time) this.nextRareCheck += 60;
  }

  debugLevelUp() {
    this.debug.used = true;
    this.xp = this.xpNeeded;
    this.checkLevel();
  }

  /**
   * Four weapons with enough increments for their combinations (plus a few more), and the passives that go with them.
   * @param {string[]} [weapons] which four (default: Skru av og på, Trådløse mus, Toner-kast, Fjernstyring)
   * @param {boolean} [combine] turn them into combinations right away
   * @param {number} [picks] increments per weapon
   */
  debugMaxBuild(weapons = ['powerCycle', 'mouse', 'toner', 'remote'], combine = false, picks = CONFIG.upgrades.combinationAfter + 6) {
    this.debug.used = true;
    this.player.weapons.length = 0;
    for (const id of weapons.slice(0, CONFIG.limits.weapons)) {
      giveWeapon(this, id);
      giveEvenUpgrades(this, id, CONFIG.upgrades.combinationAfter);
      // Livvakten has no regular combination (he is part of The Matrix)
      const k = /** @type {any} */ (CONFIG.weapons[id]).combination;
      if (k) for (let i = 0; i < CONFIG.limits.passiveLevel; i++) givePassive(this, k.passive);
      if (combine && k) giveCombination(this, id);
      giveEvenUpgrades(this, id, picks - CONFIG.upgrades.combinationAfter);
    }
    for (const id of ['sneakers', 'biggerCan']) for (let i = 0; i < CONFIG.limits.passiveLevel; i++) givePassive(this, id);
  }

  /**
   * The Matrix right away: Skytsengelen and Livvakten with the increments needed, Shopkeeperen, and the merge.
   * The other weapons the player has are kept (as many as there is room for).
   */
  debugMatrixBuild() {
    this.debug.used = true;
    const keep = this.player.weapons.splice(0);
    const after = CONFIG.upgrades.combinationAfter;
    for (const id of ['angel', 'bodyguard']) {
      giveWeapon(this, id);
      giveEvenUpgrades(this, id, after);
    }
    givePassive(this, 'certification');
    giveMatrix(this);
    for (const w of keep) if (this.player.weapons.length < CONFIG.limits.weapons && w.id !== 'angel' && w.id !== 'bodyguard' && w.id !== 'matrix') this.player.weapons.push(w);
  }

  /** Gives one level of a passive (debug builds). */
  debugGivePassive(id) {
    this.debug.used = true;
    givePassive(this, id);
  }

  debugSpawn(type) {
    this.debug.used = true;
    const p = this.player;
    if (type === 'pc' || type === 'drink') dropPickup(this, type, p.x + 40, p.y);
    else if (type === 'boss') {
      if (!this.boss || !this.boss.active) spawnBoss(this, bossTypeAt(this.bossNo));
    } else if (type === 'elite') spawnEnemy(this, 'senior', p.x + 190, p.y - 50, 1 + (this.eliteCount % 3));
    else if (type === 'package') dropPickup(this, 'package', p.x + 40, p.y + 20, CONFIG.package.bossCount);
    else if (type === 'cookie') dropPickup(this, 'cookie', p.x + 40, p.y - 10);
    else if (type === 'frida') {
      if (!this.boss || !this.boss.active) spawnBoss(this, 'frida');
    }
    else spawnEnemy(this, type, p.x + 190, p.y - 50);
  }

  /**
   * Jumps straight to boss no. n (1–4) with a reasonable build for that time, so the bosses can be tested
   * without playing for 12 minutes (?debug=boss1 … ?debug=boss4).
   * @param {number} n
   * @param {string[]} plan the weapons to build (the character's starting weapon first)
   */
  debugBossTest(n, plan) {
    this.debug.used = true;
    const at = bossTimeAt(n - 1);
    this.time = at - 3;
    this.bossNo = n - 1;
    this.nextBoss = at;
    this.phaseIndex = -1;
    while (this.phaseIndex + 1 < CONFIG.phases.length && this.time >= CONFIG.phases[this.phaseIndex + 1].from) this.phaseIndex++;
    while (this.nextDrink <= this.time - CONFIG.energyDrink.interval) this.nextDrink += CONFIG.energyDrink.interval;
    this.nextWave = this.time + 15;
    this.nextUrgent = this.time + 20;
    // A build that is typical for the time: more weapons and increments the later it is
    const min = at / 60;
    const weapons = Math.min(CONFIG.limits.weapons, 1 + Math.floor(min / 3));
    const level = 1 + Math.floor(min * 0.9);
    this.player.weapons.length = 0;
    plan.slice(0, weapons).forEach((id, i) => {
      const lv = Math.max(1, level - 2 * i);
      giveWeapon(this, id);
      giveEvenUpgrades(this, id, lv);
      for (let j = 0; j < Math.min(CONFIG.limits.passiveLevel, Math.ceil(lv / 3)); j++) givePassive(this, CONFIG.weapons[id].combination.passive);
      if (min >= 10 && i === 0 && lv >= CONFIG.upgrades.combinationAfter) giveCombination(this, id);
    });
    // Enough experience for the levels a player would normally have by now
    this.level = Math.max(this.level, 3 + Math.floor(min * 2.2));
    this.xpNeeded = xpNeeded(this.level);
    this.updateCamera();
  }
}

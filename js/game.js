// @ts-check
// The game itself: all state and one update per fixed time step.
// This file (and everything it imports) uses neither screen, sound nor Math.random(),
// so the same date + the same key presses give exactly the same round on all machines.
// Graphics settings and automatic quality live in the rendering code and can never affect anything here.
import { CONFIG, DT } from './config.js';
import { Rng, Pool, Grid } from './utils.js';
import { makePlayer, updatePlayer } from './player.js';
import { makeEnemy, makePaper, makeEmail, updateDirector, updateEnemies, updateEmails, pruneEnemies, spawnEnemy } from './enemies.js';
import { makeProjectile, updateWeapons, updateProjectiles } from './weapons.js';
import { makeTicket, makePickup, updateTickets, dropPickup, updateDrinks } from './tickets.js';
import { makeEffect, updateEffects } from './effects.js';
import { giveWeapon, givePassive, giveCombination, makeCards, useCard, computeBonuses } from './upgrades.js';
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
      /** looks only – never affects anything else */
      looks: new Rng(date + '|utseende'),
    };
    /** 'running' | 'levelUp' | 'done' */
    this.status = 'running';
    this.time = 0;
    this.player = makePlayer();
    /** What the player sees (640 × 360), follows the player but stops at the map edge. */
    this.camera = { x: 0, y: 0 };

    this.enemies = new Pool(makeEnemy);
    this.projectiles = new Pool(makeProjectile);
    this.projCounter = { toner: 0, key: 0, ctrlz: 0, teams: 0 };
    this.tickets = new Pool(makeTicket);
    this.pickups = new Pool(makePickup);
    this.paper = new Pool(makePaper);
    /** Emails from «Haster!» ("Urgent!") senders and bosses. */
    this.enemyShots = new Pool(makeEmail);
    this.senderCount = 0;
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
    this.nextBoss = CONFIG.enemies.boss.first;
    this.nextDrink = CONFIG.energyDrink.first;
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

    this.stat = {
      perType: /** @type {Record<string, number>} */ ({}),
      helpPerWeapon: /** @type {Record<string, number>} */ ({}),
      bossesTotal: 0, bossesHelped: 0, maxMultStep: 0, hits: 0,
      ticketsPicked: 0, ticketsLost: 0, drinks: 0, blocked: 0, emails: 0,
      combinations: /** @type {string[]} */ ([]),
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
      updateEmails(this, DT);
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
    this.events.push('level');
  }

  /** The player chooses card no. i. */
  chooseCard(i) {
    if (this.status !== 'levelUp' || !this.cards || !this.cards[i]) return;
    const selectedCard = this.cards[i];
    this.cards = null;
    this.status = 'running';
    useCard(this, selectedCard);
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
    const B = CONFIG.enemies.boss;
    while (this.nextBoss <= this.time) {
      this.nextBoss += B.interval;
      this.bossNo++;
    }
    while (this.nextDrink <= this.time - CONFIG.energyDrink.interval) this.nextDrink += CONFIG.energyDrink.interval;
    if (this.nextWave < this.time) this.nextWave = this.time + 10;
    if (this.nextUrgent < this.time) this.nextUrgent = this.time + 5;
  }

  debugLevelUp() {
    this.debug.used = true;
    this.xp = this.xpNeeded;
    this.checkLevel();
  }

  /**
   * Four weapons at max level with combinations, and the passives that go with them.
   * @param {string[]} [weapons] which four (default: Skru av og på, Trådløse mus, Toner-kast, Fjernstyring)
   * @param {boolean} [combine] turn them into combinations right away
   */
  debugMaxBuild(weapons = ['powerCycle', 'mouse', 'toner', 'remote'], combine = false) {
    this.debug.used = true;
    this.player.weapons.length = 0;
    for (const id of weapons.slice(0, CONFIG.limits.weapons)) {
      for (let i = 0; i < CONFIG.limits.weaponLevel; i++) giveWeapon(this, id);
      const passive = CONFIG.weapons[id].combination.passive;
      for (let i = 0; i < CONFIG.limits.passiveLevel; i++) givePassive(this, passive);
      if (combine) giveCombination(this, id);
    }
    for (const id of ['sneakers', 'biggerCan']) for (let i = 0; i < CONFIG.limits.passiveLevel; i++) givePassive(this, id);
  }

  debugSpawn(type) {
    this.debug.used = true;
    const p = this.player;
    if (type === 'pc' || type === 'drink') dropPickup(this, type, p.x + 40, p.y);
    else {
      spawnEnemy(this, type, p.x + 190, p.y - 50);
      if (type === 'boss') {
        this.bossNo++;
        this.stat.bossesTotal++;
        this.events.push('boss');
      }
    }
  }
}

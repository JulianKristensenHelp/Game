// @ts-check
/**
 * CONFIGURATION â€“ all balance numbers in the game live here.
 *
 * You don't need to be able to program to tweak the balance:
 * change a number, save the file and reload the page.
 * Distances are in logical pixels (the screen shows 640 Ã— 360, the player is about 32 pixels tall),
 * times are in seconds, and speed is in pixels per second.
 */
export const CONFIG = {
  /** Number of logic updates per second (fixed time step). Should not be changed. */
  ticksPerSecond: 60,
  /** Max logic updates per frame. Prevents a slow machine from falling further and further behind. */
  maxTicksPerFrame: 4,

  /** How much of the map everyone sees. The same on all screens (the rest is filled with a frame). */
  view: { width: 640, height: 360 },

  /** The map: one office floor with outer walls. The zones are described in js/map.js. */
  map: {
    width: 2560,
    height: 1440,
    /** Thickness of the outer walls (the top wall is taller because we see the wall surface). */
    wall: { left: 16, right: 16, top: 40, bottom: 16 },
  },

  player: {
    /** Movement speed. */
    speed: 95,
    /** Collision radius. */
    radius: 7,
    /** Energy at the start. */
    startEnergy: 100,
    /** Seconds of invulnerability after a hit. */
    invulnerableTime: 0.5,
    /** Radius for picking up tickets. */
    pickRadius: 30,
    /** How fast tickets fly toward the player when they are within the radius. */
    ticketSpeed: 280,
  },

  /** The energy drink sits on the map and has to be fetched. It never drops from lawyers or bosses. */
  energyDrink: {
    /** Energy that is restored. */
    fill: 30,
    /** Sugar rush: extra speed (0.30 = +30 %). */
    kickSpeed: 0.3,
    /** Sugar rush: duration in seconds. */
    kickTime: 5,
    /** When the first can appears, and the time between each new can. Does not increase in later phases. */
    first: 30,
    interval: 35,
    /** Max number of cans on the map at the same time. */
    max: 3,
    /** A new can appears at least this far from the player (960 = 1.5 screen widths). */
    minDistance: 960,
    /** How many fixed candidate spots are drawn for each can (the first one far enough away is chosen). */
    candidates: 12,
    /** Distance from the walls. */
    wallMargin: 48,
  },

  newPc: {
    /** Chance of a drop per happy lawyer (bosses always give one). */
    dropChance: 1 / 1500,
    /** Help given to bosses and urgent cases instead of making them happy outright. */
    helpToSpecial: 700,
  },

  /**
   * Lawyer types. frustration = "life", damage = energy the player loses on contact,
   * points = value of the ticket (and experience), weight = how often the type is chosen, from = seconds.
   */
  enemies: {
    junior: { name: 'Juniorfullmektig', from: 0, frustration: 18, speed: 48, radius: 7, damage: 8, points: 10, weight: 1 },
    senior: { name: 'Seniorpartner', from: 90, frustration: 140, speed: 30, radius: 10, damage: 14, points: 50, weight: 0.2 },
    printer: {
      name: 'Printerentusiast', from: 180, frustration: 60, speed: 44, radius: 8, damage: 10, points: 30, weight: 0.14,
      /** Seconds between each paper pile. */
      paperInterval: 2.6,
      /** How long a paper pile stays on the floor. */
      paperLifetime: 8,
      /** Max number of paper piles at the same time. */
      paperMax: 15,
      /** Radius of the paper pile. */
      paperRadius: 13,
      /** How much the pile slows the player (0.4 = 40 %). */
      paperSlow: 0.4,
    },
    urgent: {
      name: 'Hastesak', from: 60, frustration: 220, speed: 80, radius: 9, damage: 0, points: 1000,
      /** Seconds between each urgent case (random between min and max). */
      intervalMin: 45, intervalMax: 60,
      /** Seconds before it disappears on its own. */
      lifetime: 20,
      /** How far from the player it appears. */
      startDistance: 215,
      /** If it is farther away than this, it runs slower so it can be caught. */
      slowDistance: 260, slowFactor: 0.35,
    },
    /** Shared base values for all bosses. Each boss has its own numbers in CONFIG.bosses below. */
    boss: { name: 'Boss', frustration: 1500, speed: 26, radius: 20, damage: 20, points: 2500 },
  },

  /**
   * ELITES (Â«PartnereÂ», version 5): rare, much tougher lawyers with a visible frustration bar, a crown and one
   * trait each. They are where the extra difficulty lives in the late game. chance = per ordinary lawyer that
   * spawns (grows per minute, capped). The multipliers apply to the type they are based on.
   */
  elites: {
    from: 300,
    chanceStart: 0.01, chancePerMin: 0.006, chanceMax: 0.08,
    maxConcurrent: 4,
    frustration: 6, damage: 1.6, speed: 0.85, points: 12, radiusAdd: 2,
    /** The three traits (chosen with the spawn stream). */
    traits: {
      /** Other lawyers within Â«radiusÂ» of the partner take only Â«helpFactorÂ» of the help. */
      aura: { name: 'Partner-aura', radius: 70, helpFactor: 0.5 },
      /** When helped, delegates: Â«countÂ» junior associates appear around it. */
      split: { name: 'Delegerer', count: 3 },
      /** Every Â«everyÂ» seconds: a Â«tellÂ»-second warning (Â«!Â»), then a Â«durationÂ»-second dash at Â«speedÂ» Ã— speed. */
      rush: { name: 'Har hastverk', every: 4, tell: 0.5, duration: 0.6, speed: 3.2 },
    },
  },

  /**
   * BOSSES (version 4). They come in a fixed order, and they are mandatory: if the countdown runs out,
   * the player is fired (Â«Du har fÃ¥tt sparken!Â») and the round ends. The score can still be submitted.
   * Every attack is warned (pose, light or Â«!Â») for Â«tellÂ» seconds before it comes.
   */
  bosses: {
    /** When each boss arrives (seconds) and which one. */
    schedule: [
      { at: 180, type: 'nordic' },
      { at: 360, type: 'printerBoss' },
      { at: 540, type: 'deadline' },
      { at: 720, type: 'johan' },
    ],
    /** After the last one, Johan comes back this often (seconds), stronger each time. */
    repeatEvery: 180,
    /** The big clock turns yellow at 30 seconds left, and red (blinking and ticking) at 10. */
    warnYellow: 30, warnRed: 10,
    /** Seconds the game stays frozen with Â«DU HAR FÃ…TT SPARKEN!Â» before the end screen. */
    firedPause: 2.8,
    /** Warning time before an attack (seconds). */
    tell: 0.65,
    /** A banner this many seconds before each boss arrives (Â«â€¦ kommer om 10 sekunderÂ»). */
    warnBefore: 10,
    /** Distance from the player where the boss appears. */
    spawnDistance: 330,
    /** Boss attacks only start when the boss is this many seconds into the fight (time to see it coming). */
    calmStart: 2.5,
    /** While a boss is out, fewer ordinary lawyers stream in (0.55 = 55 % of normal). The waves are not affected. */
    spawnFactor: 0.55,
    /** A boss farther away than this jogs Â«catchUpSpeedÂ» times faster, so the player cannot just run away from it. */
    catchUpFrom: 230, catchUpSpeed: 2.4,

    nordic: {
      name: 'NÃ¸rdic-konsulenten', short: 'NÃ˜RDIC',
      intro: 'NÃ¸rdic-konsulenten har ankommet!', line: 'Saken er registrert. Forventet svartid: 3â€“5 virkedager.',
      happyText: 'Sak lukket!',
      frustration: 1300, speed: 28, radius: 20, damage: 8, points: 2500, deadline: 120,
      /** Â«Du er nummer 47 i kÃ¸enÂ»: hold music in a ring. The notes only slow the player down. */
      queue: { cooldown: 10, notes: 10, speed: 40, lifetime: 5.5, slow: 0.4, slowTime: 2 },
      /** Â«Saken er sendt videreÂ»: a ticket that splits into three smaller ones in a fan. */
      forward: { cooldown: 5.5, speed: 95, splitAfter: 0.9, count: 3, spread: 0.45, damage: 6 },
      /** Â«Vi ringer deg tilbakeÂ»: stands still and cannot be helped. Max once per Â«cooldownÂ» seconds. */
      callBack: { cooldown: 20, duration: 3 },
    },
    printerBoss: {
      name: 'Multifunksjonsmonsteret', short: 'PRINTER',
      intro: 'Multifunksjonsmonsteret har vÃ¥knet!', line: 'PAPIRSTOPP I SKUFF 2',
      happyText: 'Utskrift fullfÃ¸rt',
      frustration: 3400, speed: 24, radius: 22, damage: 9, points: 4000, deadline: 120,
      /** Four colour cartridges (CMYK) in a fan. They land after Â«flightÂ» seconds and leave an ink puddle. */
      cmyk: { cooldown: 8, speed: 125, flight: 1.3, spread: 0.32, damage: 6, puddleTime: 4, puddleRadius: 16, puddleSlow: 0.3, maxPuddles: 8 },
      /** Â«Utskriftsjobb pÃ¥ 400 siderÂ»: a fast stream of sheets in a sweeping arc. */
      printJob: { cooldown: 13, duration: 2, rate: 0.09, arc: 1.7, speed: 115, damage: 3 },
      /** Â«Papirstopp!Â»: now and then the printer gets stuck â€“ no movement, no attacks, and it takes double help. */
      jam: { every: 15, duration: 3, helpFactor: 2 },
    },
    deadline: {
      name: 'Fristen er om 2 minutter!', short: 'FRIST',
      intro: 'Fristen er om 2 minutter!', line: 'Kan du se pÃ¥ dette fÃ¸r lunsj?',
      happyText: 'Fristen ble holdt!',
      frustration: 6600, speed: 27, radius: 20, damage: 11, points: 6000, deadline: 120,
      /** A fan of emails (the same as from version 3). */
      emails: { cooldown: 4, count: 3, spread: 0.3, damage: 0.5 },
    },
    johan: {
      name: 'Johan', short: 'JOHAN', title: 'SISTE BOSS: JOHAN',
      intro: 'SISTE BOSS: JOHAN', line: 'Har du et lite minutt?',
      phaseText: 'Johan tar av seg dressjakka', happyText: 'Bra jobba!',
      frustration: 9800, speed: 30, radius: 20, damage: 12, points: 15000, deadline: 150,
      /** Second phase from half frustration: faster and attacks more often (cooldown Ã— Â«cooldownsÂ»). */
      phase2: { at: 0.5, speed: 1.25, cooldowns: 0.75 },
      /** Â«Har du et lite minutt?Â»: points at the player, then sprints in a straight line. damage = Ã— his damage. */
      sprint: { cooldown: 6.5, speed: 330, maxTime: 0.9, damage: 1.6 },
      /** A fan of five calendar invitations. */
      calendar: { cooldown: 7, count: 5, spread: 0.28, speed: 72, damage: 6 },
      /** Â«Alle pÃ¥ mÃ¸te!Â»: a ring of junior associates around the player, with an opening. */
      meeting: { cooldown: 30, count: 18, radius: 150, gap: 1.1 },
      /** From the second phase he also forwards the earlier bosses' attacks (more rarely than they did). */
      forwarded: { cooldown: 12 },
      /** He comes back every 3 minutes; each time with more frustration, damage and points. */
      returns: { frustration: 1.5, damage: 1.2, points: 1.4 },
    },
  },

  /**
   * The four playable characters (the IT department). Name and title are filled in by the client.
   * startWeapon = the weapon the character starts with (counts as one of four slots).
   * bonus: maxEnergy (+energy), help (+fraction), speed (+fraction), pick (+fraction of the pickup radius for tickets).
   * sprite/portrait = the client's own pixel art (32 Ã— 32 figure, 64 Ã— 64 portrait), used exactly as it is.
   * The files are matched to the characters by their looks (person4 = Odyssefs, person3 = Johannes, person1 = Jin, person2 = Julian).
   */
  characters: [
    { id: 'k1', name: 'Odyssefs', title: 'IT-avdelingen', sprite: 'assets/karakterer/figur_person4.png', portrait: 'assets/karakterer/portrett_person4.png', startWeapon: 'powerCycle', bonus: { maxEnergy: 20 }, bonusText: '+20 maks energi' },
    { id: 'k2', name: 'Johannes', title: 'IT-avdelingen', sprite: 'assets/karakterer/figur_person3.png', portrait: 'assets/karakterer/portrett_person3.png', startWeapon: 'toner', bonus: { help: 0.10 }, bonusText: '+10 % hjelp' },
    { id: 'k3', name: 'Jin', title: 'IT-avdelingen', sprite: 'assets/karakterer/figur_person1.png', portrait: 'assets/karakterer/portrett_person1.png', startWeapon: 'hdmi', bonus: { speed: 0.10 }, bonusText: '+10 % bevegelseshastighet' },
    { id: 'k4', name: 'Julian', title: 'IT-avdelingen', sprite: 'assets/karakterer/figur_person2.png', portrait: 'assets/karakterer/portrett_person2.png', startWeapon: 'mouse', bonus: { pick: 0.25 }, bonusText: '+25 % radius for Ã¥ plukke opp ticket-lapper' },
  ],

  /** The Â«Haster!Â» ("Urgent!") sender: keeps its distance and sends emails (Â«Haster!!!Â») at the player. */
  sender: {
    name: 'Â«Haster!Â»-avsender', from: 150, frustration: 50, speed: 40, radius: 7, damage: 9, points: 40,
    /** How often the type is chosen (fraction of the weight of a junior associate). */
    weight: 0.25,
    /** Cap: max fraction of the active lawyers, and max number at the same time. */
    maxFraction: 0.15, maxCount: 30,
    /** Tries to stay between these distances from the player. */
    distMin: 150, distMax: 200,
    /** Seconds between each email (gets a bit faster over time, but never below the minimum). */
    shotInterval: 3, shotFasterPerMin: 0.04, shotIntervalMin: 1.8,
    /** Seconds of warning (the laptop lights up and a Â«!Â» over the head) before each email. */
    alert: 0.5,
  },

  /** The emails (enemy shots) from senders and bosses. */
  enemyShots: {
    /** Speed (about 60 % of the player's speed, so you can walk away). */
    speed: 57,
    /** Seconds before an email disappears on its own. */
    lifetime: 4,
    /** Hit radius. */
    radius: 4,
    /** Max number on the map at the same time. When the cap is reached, the senders wait. */
    max: 60,
  },

  /** How many different looks each type has (purely cosmetic). */
  figureVariants: { junior: 42, printer: 42, senior: 42, urgent: 21, boss: 12, sender: 42 },

  /**
   * How ordinary lawyers get tougher over time (version 6: linear, not compounding). The weapons grow without a
   * cap now, so the curve is a straight line until overtime: frustration = 1 + frustrationPerMin Ã— (minutes âˆ’ startAfterMin).
   */
  scaling: {
    /** Extra frustration per minute after the calm start (0.2 = +20 percentage points per minute, linear). */
    frustrationPerMin: 0.15,
    /** The increase in frustration starts after this many minutes (calm start). */
    startAfterMin: 3,
    /** Increased damage per minute (0.06 = +6 %, linear). */
    damagePerMin: 0.06,
    /** Increased speed per minute (0.025 = +2.5 %), so you can't outrun everything forever. */
    speedPerMin: 0.03,
    /** Highest speed increase (1.55 = +55 %). The juniors never get faster than the player. */
    speedMax: 1.55,
    /** After this minute (Â«OvertidÂ», "Overtime") everything rises steeply, with no cap. */
    overtimeFromMin: 12.5,
    /** In overtime, frustration and damage are additionally multiplied by this every minute. */
    overtimeGrowthPerMin: 1.8,
    /** In overtime the lawyers additionally get this much faster per minute (0.15 = +15 %), with no cap. */
    overtimeSpeedPerMin: 0.22,
  },

  spawn: {
    /** Lawyers per second as [time in seconds, count per second]. Between the points the value glides smoothly. */
    rate: [[0, 0.5], [30, 0.8], [90, 1.7], [300, 5], [600, 13], [900, 22]],
    /** Increase in lawyers per second for each minute after the last point. */
    overtimePerMin: 4,
    /** Max number of active lawyers (fixed and the same for everyone). */
    maxConcurrent: 400,
    /**
     * When the cap is reached, the lawyers that should have come are "saved up", and the next ones become stronger instead.
     * strengthPerSaved = extra frustration per saved lawyer, maxSaved = cap per lawyer.
     */
    strengthPerSaved: 0.5, damagePerSaved: 0.2, maxSaved: 4,
    /** Lawyers appear outside the field of view, between these distances from the player. */
    minDistance: 380, maxDistance: 560,
    /** Never closer to the player than this (also applies to doors and elevators). */
    absoluteMin: 260,
    /** Number of attempts to find a free spot before doors/elevators are used. */
    attempt: 8,
  },

  /** Wave events: a flock from one direction or a ring around the player. */
  waves: {
    first: 45,
    intervalMin: 25, intervalMax: 40,
    /** Flock: count = start + perMin Ã— minutes (capped at max). */
    flockStart: 10, flockPerMin: 4, flockMax: 60,
    /** Ring: from this second at the earliest, and the chance that a wave becomes a ring. */
    ringFrom: 120, ringChance: 0.4,
    ringStart: 20, ringPerMin: 3, ringMax: 60,
    ringRadius: 370,
    /** The opening in the ring, in radians (0.9 â‰ˆ 50 degrees). */
    ringGap: 0.9,
  },

  /**
   * EVENTS (version 6). Scheduled events happen at the same time on every shift (at = seconds, repeat = seconds between
   * repeats, 0 = once). Rare events are rolled once a minute from Â«fromÂ» with their own random stream (Â«Dagens vaktÂ»),
   * so they are the same for everyone on the same day but differ from day to day. Timed events set a mood
   * (speed and damage factors on the ordinary lawyers) for Â«durationÂ» seconds.
   */
  events: {
    scheduled: [
      { id: 'lunchRush', at: 150, repeat: 300 },
      { id: 'printerQueue', at: 270, repeat: 300 },
      { id: 'partnerMeeting', at: 450, repeat: 360 },
    ],
    rare: [
      { id: 'coffeeBreak', from: 120, chance: 0.06 },
      { id: 'freeLunch', from: 180, chance: 0.05 },
      { id: 'serverCrash', from: 300, chance: 0.05 },
    ],
    /** Seconds between any two events (a scheduled event waits, a rare one is skipped). */
    minGap: 25,
    /** Scheduled events wait while a boss is out. */
    waitForBoss: true,
    defs: {
      /** A flock of junior associates from one direction: count + perMin Ã— minutes. */
      lunchRush: { name: 'Lunsjrush!', text: 'Hele kantina kommer samtidig', type: 'junior', count: 24, perMin: 3, max: 70 },
      /** A flock of printer enthusiasts. */
      printerQueue: { name: 'PrinterkÃ¸!', text: 'Printerentusiastene har funnet en ny printer', type: 'printer', count: 8, perMin: 1, max: 24 },
      /** A few partners (elites) at once, straight from the meeting room. */
      partnerMeeting: { name: 'PartnermÃ¸te!', text: 'Partnerne kommer rett fra mÃ¸tet', count: 3 },
      /** The lawyers walk slowly for a while. */
      coffeeBreak: { name: 'Kaffepause', text: 'Advokatene gÃ¥r saktere en stund', duration: 12, speed: 0.5, damage: 1 },
      /** Tickets all over the floor around the player. */
      freeLunch: { name: 'Gratis lunsj!', text: 'Ticket-lapper over hele gulvet', tickets: 30, value: 20, radius: 170 },
      /** Everyone is faster and angrier for a while. */
      serverCrash: { name: 'Serverkrasj!', text: 'Alle er raskere og sintere en stund', duration: 15, speed: 1.35, damage: 1.5 },
    },
  },

  /** The phases are shown as text when they change. */
  phases: [
    { from: 0, name: 'Morgenkaffe' },
    { from: 90, name: 'Formiddagen' },
    { from: 300, name: 'Etter lunsj' },
    { from: 600, name: 'Fredag ettermiddag' },
    { from: 780, name: 'Overtid' },
  ],

  tickets: {
    /** Seconds a ticket stays on the floor. */
    lifetime: 10,
    /** The ticket blinks during the last seconds. */
    blinkTime: 3,
    /** Above this count, nearby tickets are merged. */
    max: 400,
    /** Grid cell size when merging. */
    mergeCell: 35,
  },

  /** Experience required for the next level = base + perLevel Ã— level + square Ã— levelÂ². */
  level: { base: 20, perLevel: 10, square: 1.2 },
  /** At every level-up (and package), tickets within this radius fly to the player, so the pause never costs them. */
  levelMagnet: 140,

  multiplier: {
    start: 1.0,
    /** Increase per step. */
    step: 0.1,
    /** Number of lawyers helped without being hit for each step. */
    perHelped: 25,
    max: 5.0,
  },

  /** Points for the Â«Kaffepause-bonusÂ» ("Coffee break bonus") when everything is maxed out. */
  coffeeBreakBonus: 500,

  /** Max number of weapons and passives, and max passive level. Weapons have no level cap (see CONFIG.upgrades). */
  limits: { weapons: 4, passives: 8, passiveLevel: 5 },

  /**
   * UPGRADES (version 6). A weapon has no levels: every card at level-up gives one specific increment
   * (more help, shorter interval, one more projectile, an effect â€¦) and a weapon can take any number of them.
   * Cards have a tier (rarity) that scales the increment: steps = how many growth steps a numeric card gives.
   * tierOdds = chance per tier; Â«HesteskoenÂ» (luck) multiplies the odds of everything above common.
   */
  upgrades: {
    tiers: [
      { id: 'common', name: 'Vanlig', color: '#8a94a0', steps: 1 },
      { id: 'uncommon', name: 'Uvanlig', color: '#2fd06a', steps: 2 },
      { id: 'rare', name: 'Sjelden', color: '#3aa0ff', steps: 3 },
      { id: 'legendary', name: 'Legendarisk', color: '#ff9f43', steps: 5 },
    ],
    tierOdds: [0.68, 0.23, 0.07, 0.02],
    /** How many increments a weapon needs before its combination can be chosen (plus the matching passive). */
    combinationAfter: 10,
    /** Rerolls (Â«Nytt utvalgÂ») and banishes (Â«Fjern kortetÂ») per shift, and how many more each helped boss gives. */
    rerolls: 1, banishes: 1, perBoss: 1,
    /**
     * Effect modifiers: rare cards that change how a weapon behaves. Each has a max level per weapon.
     * pierce = the projectile continues to one more lawyer per level. splash = hits also help the lawyers right next
     * to the target. slow = hit lawyers walk slower for a while. linger = part of the help is given once more a
     * moment later. knockback = hits push the lawyer back. crit = extra critical chance for that weapon only.
     */
    effects: {
      pierce: { name: 'Gjennomtrengende', text: 'Prosjektilet gÃ¥r videre til Ã©n advokat til.', max: 3 },
      splash: { name: 'Sprut', text: 'Hvert treff gir ogsÃ¥ 35 % hjelp til advokatene rett ved.', max: 3, radius: 16, fraction: 0.35, maxNeighbors: 6 },
      slow: { name: 'Venter pÃ¥ IT', text: 'Advokater som treffes gÃ¥r 20 % saktere i 2 sekunder.', max: 3, value: 0.2, time: 2, maxSlow: 0.6 },
      linger: { name: 'Saken ligger i kÃ¸en', text: '30 % av hjelpen gis Ã©n gang til etter et sekund.', max: 3, fraction: 0.3, delay: 1 },
      knockback: { name: 'Avvist', text: 'Treff skyver advokaten 5 piksler bakover.', max: 3, px: 5 },
      crit: { name: 'Ekstra kaffe', text: '+8 % kritisk sjanse for dette vÃ¥penet.', max: 5, value: 0.08 },
      /** Version 6.1: mark = hit lawyers take more help from everything for a while, escalation = more help to
       *  partners and bosses, pull = hits drag the lawyer toward the player (groups them for area weapons). */
      mark: { name: 'Purring', text: 'Advokater som treffes tar 10 % mer hjelp fra alt i 3 sekunder.', max: 3, value: 0.1, time: 3 },
      escalation: { name: 'Eskalering', text: '+15 % hjelp mot partnere og bosser.', max: 3, value: 0.15 },
      pull: { name: 'Innkalling', text: 'Treff drar advokaten 3 piksler mot deg (bare vÃ¥pen med rekkevidde).', max: 3, px: 3 },
    },
    /**
     * Card weights at level-up: increments to a weapon you have (shared by its growth rules, weighted: help counts
     * Â«helpRuleÂ» times, counts Â«countRuleÂ» times, other rules once), its effects (shared), a passive you have, a new
     * weapon and a new passive. Owned things come up far more often, so you can build.
     */
    weight: { ownedWeapon: 6, effect: 1.5, ownedPassive: 2, fresh: 1.2, freshPassive: 0.6, helpRule: 2.5, countRule: 1.5 },
    /** New weapons are offered this many times as often while the player has fewer than Â«earlySlotsÂ» weapons. */
    earlyWeaponBoost: 2.5, earlySlots: 2,
  },

  /**
   * Â«Pakke fra leverandÃ¸renÂ» (version 6): a package that gives several weapon increments at once, always from a
   * helped boss and now and then from a helped partner (elite). Package cards are at least Â«minTierÂ».
   */
  package: {
    name: 'Pakke fra leverandÃ¸ren',
    bossCount: 3, johanCount: 5, eliteCount: 1,
    /** Chance that a helped partner drops a package (drops stream). */
    eliteChance: 0.025,
    minTier: 1,
    /** Seconds the package stays on the floor (it never disappears, this only drives the glow). */
    lifetime: 1e9,
  },

  /** Partners (elites) drop between ticketsMin and ticketsMax tickets, each worth ticketFraction of their points. */
  eliteDrops: { ticketsMin: 1, ticketsMax: 5, ticketFraction: 0.5 },

  /** Max number of projectiles in the air per weapon (performance). */
  maxProjectilesPerWeapon: 60,

  /** Happy lawyers: smile and thumbs up, then a small pixel cloud. */
  happy: {
    /** Seconds of smile and thumbs up. */
    smile: 0.3,
    /** Total time before the figure is completely gone. */
    duration: 0.5,
    /** If more than this many become happy at once (e.g. Â«Ny PCÂ»), the animation is shortened. */
    manyAtOnce: 60,
    /** Shortened: smile and total time. */
    shortSmile: 0.15, shortDuration: 0.25,
  },

  /**
   * WEAPONS (version 6). Each weapon has a "base" (its numbers before any upgrade) and "growth": the increments a
   * level-up card can give. There are no levels: a weapon can take any number of increments, and the stats are
   * computed from base + the increments taken (weaponStats() in js/weapons.js).
   *
   * Growth rules per stat:  { add: n }   = +n per step,
   *                         { pct: f }   = +f Ã— base per step (linear, never capped â€“ this is how help grows),
   *                         { mul: f }   = Ã— f per step (compounding; use min/max as a floor or cap),
   *                         { set: v, once: true } = a one-time change (e.g. back: true).
   *                         max/min = cap (the card is not offered past it). Count-like stats (count, hits, hops â€¦)
   *                         must have a max: that cap is what keeps the game fast on an office PC.
   * The combination (max increments + its passive) swaps "base" for "combination.stats"; the increments keep
   * applying on top, and rules for stats the combination does not have are turned into help increments.
   * tag = the weapon's class (projectile, chain, area, helper), used by the tag passives.
   * effects = which effect modifiers the weapon can take (see CONFIG.upgrades.effects).
   * countName = what "count" is called on the card (Â«+1 musÂ»).
   */
  weapons: {
    powerCycle: {
      name: 'Skru av og pÃ¥', tag: 'area',
      description: 'En puls rundt deg hjelper alle i nÃ¦rheten.',
      base: { radius: 44, help: 11, interval: 1.0 },
      growth: { help: { pct: 0.35 }, radius: { add: 6, max: 120 }, interval: { mul: 0.9, min: 0.4 }, nudge: { add: 1, max: 10 } },
      effects: ['slow', 'knockback', 'crit', 'linger', 'mark', 'escalation'],
      combination: {
        passive: 'ram', name: 'Full omstart',
        text: 'Mye stÃ¸rre puls som gÃ¥r raskere og skyver advokatene tilbake.',
        /** nudge = how far the lawyers are pushed per pulse. */
        stats: { radius: 72, help: 30, interval: 0.62, nudge: 4 },
      },
    },
    toner: {
      name: 'Toner-kast', tag: 'projectile',
      description: 'Kaster tonerkassetter i en vifte mot nÃ¦rmeste advokat. De sprekker og hjelper alle rundt.',
      countName: 'tonerkassett',
      base: { count: 2, splash: 28, help: 15, interval: 1.2, speed: 190, range: 190, spread: 0.35 },
      growth: { help: { pct: 0.3 }, count: { add: 1, max: 10 }, splash: { add: 4, max: 70 }, interval: { mul: 0.9, min: 0.45 }, range: { add: 15, max: 320 } },
      effects: ['pierce', 'slow', 'crit', 'linger', 'knockback', 'mark', 'escalation', 'pull'],
      combination: {
        passive: 'paperTray', name: 'Kontorprinteren fra helvete',
        text: 'Kaster tonerkassetter i alle retninger samtidig, med stor sprut.',
        stats: { count: 8, splash: 40, help: 26, interval: 1.2, speed: 200, range: 210, spread: 0 },
      },
    },
    password: {
      name: 'Passord-reset', tag: 'chain',
      description: 'En nÃ¸kkel hopper fra advokat til advokat, som et kjedelyn.',
      countName: 'hopp',
      /**
       * hops = how many lawyers the chain hits, range = max distance per hop, hopTime = seconds per hop,
       * reach = how far away the first lawyer can be, chains = chains at the same time (the combination).
       */
      base: { hops: 3, help: 24, interval: 1.05, range: 80, hopTime: 0.07, reach: 200 },
      growth: { help: { pct: 0.5 }, hops: { add: 1, max: 24 }, interval: { mul: 0.9, min: 0.4 }, range: { add: 6, max: 140 }, hopTime: { mul: 0.88, min: 0.03 }, chains: { add: 1, max: 4 } },
      effects: ['slow', 'crit', 'linger', 'splash', 'mark', 'escalation', 'pull'],
      combination: {
        passive: 'ssd', name: 'Tofaktor',
        text: 'To kjeder samtidig i hver sin retning, med flere hopp og kortere intervall.',
        stats: { hops: 8, chains: 2, help: 34, interval: 0.8, range: 96, hopTime: 0.06, reach: 230 },
      },
    },
    hdmi: {
      name: 'HDMI-kabelen', tag: 'area',
      description: 'En kabel svinges i en bue mot nÃ¦rmeste advokat og hjelper alle den treffer.',
      /** arc = width of the arc in radians (2.4 â‰ˆ 140 degrees). back = also swings backward. */
      base: { lengthPx: 52, help: 18, interval: 1.0, arc: 2.4, back: false },
      growth: { help: { pct: 0.25 }, lengthPx: { add: 7, max: 130 }, interval: { mul: 0.9, min: 0.4 }, arc: { add: 0.35, max: 4.6 }, back: { set: true, once: true } },
      effects: ['knockback', 'slow', 'crit', 'linger', 'mark', 'escalation'],
      combination: {
        passive: 'extensionCord', name: 'Kabelkaos',
        text: 'Kabelen svinges i en full sirkel rundt deg.',
        stats: { lengthPx: 80, help: 34, interval: 0.8, arc: 6.2832, back: true },
      },
    },
    remote: {
      name: 'Fjernstyring', tag: 'chain',
      description: 'De nÃ¦rmeste advokatene fÃ¥r hjelp via et glimt ovenfra.',
      countName: 'treff',
      /** reach = how far away a lawyer can be picked. */
      base: { hits: 1, help: 20, interval: 1.6, reach: 330 },
      growth: { help: { pct: 0.5 }, hits: { add: 1, max: 16 }, interval: { mul: 0.9, min: 0.4 }, reach: { add: 25, max: 520 } },
      effects: ['crit', 'linger', 'splash', 'slow', 'mark', 'escalation', 'pull'],
      combination: {
        passive: 'admin', name: 'Domene-admin',
        text: 'Treffer mange advokater samtidig, med kort intervall.',
        stats: { hits: 7, help: 60, interval: 0.8, reach: 360 },
      },
    },
    mouse: {
      name: 'TrÃ¥dlÃ¸se mus', tag: 'area',
      description: 'Mus kretser i en bane rundt deg og hjelper alle de treffer.',
      countName: 'mus',
      /** track = distance from the player, rotation = radians per second, hitPause = seconds before the same lawyer can be hit again. */
      base: { count: 3, track: 40, rotation: 3.0, help: 12, hitPause: 0.45 },
      growth: { help: { pct: 0.45 }, count: { add: 1, max: 16 }, track: { add: 4, max: 90 }, rotation: { add: 0.6, max: 9 }, hitPause: { mul: 0.88, min: 0.15 } },
      effects: ['slow', 'knockback', 'crit', 'linger', 'mark', 'escalation'],
      combination: {
        passive: 'batteries', name: 'Musematta',
        text: 'Ã…tte mus suser rundt deg i en bredere og raskere ring.',
        stats: { count: 8, track: 60, rotation: 5.5, help: 30, hitPause: 0.35 },
      },
    },
    ctrlz: {
      name: 'Ctrl+Z', tag: 'projectile',
      description: 'En stor Ctrl+Z-tast kastes mot nÃ¦rmeste advokat og kommer tilbake.',
      countName: 'tast',
      /** range = how far the key flies before it turns around. The combination has radius/period/rotation instead. */
      base: { count: 1, range: 110, help: 14, interval: 1.6, speed: 220 },
      growth: { help: { pct: 0.35 }, count: { add: 1, max: 8 }, range: { add: 12, max: 260 }, interval: { mul: 0.9, min: 0.5 }, speed: { add: 20, max: 400 }, radius: { add: 8, max: 170 }, rotation: { add: 0.3, max: 7 }, hitPause: { mul: 0.88, min: 0.15 } },
      effects: ['slow', 'knockback', 'crit', 'linger', 'mark', 'escalation', 'pull'],
      combination: {
        passive: 'shortcuts', name: 'Ctrl+Alt+Del',
        text: 'Flere taster gÃ¥r i en spiral ut og inn rundt deg.',
        /** radius = how far out the spiral goes, period = seconds out and in, rotation = radians per second. */
        stats: { count: 5, radius: 90, period: 2.4, rotation: 3.0, help: 30, hitPause: 0.45 },
      },
    },
    beam: {
      name: 'OppdateringsstrÃ¥len', tag: 'area',
      description: 'En lang fremdriftsindikator skyter ut som en strÃ¥le mot nÃ¦rmeste advokat.',
      /** help is given every "tick" seconds while the beam lasts. pause = time between each beam. */
      base: { lengthPx: 130, width: 10, duration: 1.0, pause: 2.6, help: 10, tick: 0.2 },
      growth: { help: { pct: 0.6 }, lengthPx: { add: 18, max: 320 }, width: { add: 2.5, max: 30 }, duration: { add: 0.2, max: 3 }, pause: { mul: 0.82, min: 0.6 }, tick: { mul: 0.9, min: 0.08 }, rotation: { add: 0.2, max: 3 } },
      effects: ['slow', 'crit', 'linger', 'mark', 'escalation', 'pull'],
      combination: {
        passive: 'certification', name: 'Tvungen oppdatering',
        text: 'To strÃ¥ler sveiper sakte rundt deg hele tiden.',
        stats: { lengthPx: 180, width: 16, rotation: 0.8, help: 18, tick: 0.45 },
      },
    },
    teams: {
      name: 'Teams-varsel', tag: 'projectile',
      description: 'Teams-varsler skytes ut og svinger seg mot hver sin advokat, nÃ¦rmeste fÃ¸rst.',
      countName: 'varsel',
      /** count = alerts per volley (each picks its own lawyer), turn = how sharply they steer (radians per second). */
      base: { count: 1, help: 26, interval: 1.4, speed: 200, turn: 7, reach: 240 },
      growth: { help: { pct: 0.65 }, count: { add: 1, max: 10 }, interval: { mul: 0.9, min: 0.45 }, reach: { add: 12, max: 360 }, turn: { add: 0.6, max: 12 } },
      effects: ['pierce', 'crit', 'linger', 'splash', 'slow', 'mark', 'escalation'],
      combination: {
        passive: 'dualMonitor', name: 'AllmÃ¸te pÃ¥ Teams',
        text: 'Hvert varsel deler seg i to nye mÃ¥lsÃ¸kende varsler nÃ¥r det treffer.',
        /** split = new alerts on each hit (they do not split again). */
        stats: { count: 4, help: 50, interval: 0.9, speed: 240, turn: 8, reach: 280, split: 2 },
      },
    },
    angel: {
      name: 'Skytsengelen', tag: 'helper',
      description: 'En liten skytsengel svever rundt deg og kaster mini-printere som hjelper advokatene.',
      countName: 'mini-printer',
      /**
       * The mini printers work like a molotov (Endringsprompt 4): they land where the lawyer stood, stand completely
       * still, and shoot a sheet of paper at the nearest lawyer within Â«rangeÂ» every Â«burstÂ» seconds.
       * perThrow = mini printers per throw, max = max at the same time (fixed and the same for everyone),
       * life = seconds a mini printer stands and shoots, help = help per sheet, burst = seconds between sheets,
       * range = how far from the printer a lawyer can be shot at.
       */
      base: { perThrow: 1, max: 2, interval: 2.6, life: 4, help: 41, burst: 0.3, range: 60 },
      growth: { help: { pct: 0.3 }, perThrow: { add: 1, max: 6 }, max: { add: 1, max: 12 }, interval: { mul: 0.9, min: 0.8 }, life: { add: 0.5, max: 8 }, range: { add: 9, max: 130 }, burst: { mul: 0.9, min: 0.15 } },
      effects: ['slow', 'crit', 'linger', 'mark', 'escalation'],
      combination: {
        passive: 'biggerCan', name: 'Himmelsk serviceavtale',
        text: 'Lysende glorie og stÃ¸rre vinger: flere mini-printere, som avslutter med papirkonfetti.',
        /** confetti = help in the final burst of paper confetti, confettiRadius = its radius. */
        stats: { perThrow: 4, max: 6, interval: 1.9, life: 5, help: 56, burst: 0.3, range: 69, confetti: 50, confettiRadius: 50 },
      },
    },
    headset: {
      name: 'StÃ¸ydempende headset', tag: 'helper',
      description: 'Et skjold som blokkerer ett treff og sender ut en puls. Lades opp igjen.',
      countName: 'ladning',
      /** charge = seconds before the shield is ready again, charges = hits it can take before recharging. */
      base: { charge: 20, pulseRadius: 50, help: 26, charges: 1 },
      growth: { help: { pct: 0.3 }, charge: { mul: 0.88, min: 4 }, pulseRadius: { add: 8, max: 160 }, charges: { add: 1, max: 4 } },
      effects: ['knockback', 'slow', 'crit', 'mark', 'escalation'],
      combination: {
        passive: 'ergonomicChair', name: 'Hjemmekontor',
        text: 'Skjoldet blokkerer tre treff fÃ¸r det mÃ¥ lades, og pulsen blir mye stÃ¸rre.',
        stats: { charge: 9, pulseRadius: 100, help: 70, charges: 3 },
      },
    },
  },

  /** Kept for older tools: all weapons now live in CONFIG.weapons. */
  newWeapons: {},

  /** The passives added in version 3. */
  newPassives: {
    dualMonitor: { name: 'Dobbel skjerm', value: 0.05, text: '+5 % sjanse for at et vÃ¥pen aktiveres to ganger pÃ¥ rad.' },
    shortcuts: { name: 'Hurtigtaster', value: 0.12, text: '+12 % fart pÃ¥ prosjektiler, bumeranger og kjeder.' },
    ergonomicChair: { name: 'Ergonomisk stol', value: 0.06, text: 'âˆ’6 % skade fra treff.' },
    certification: { name: 'Sertifisering', value: 0.08, text: '+8 % erfaring fra ticket-lapper.' },
  },

  /**
   * The passives added in version 5 and 6 (Brotato-style stats). All of them are shown on the stat sheet at level-up.
   * crit = chance that a hit gives critMult Ã— help. regen = energy per second. dodge = chance that a hit misses.
   * luck = Â«HesteskoenÂ», see CONFIG.upgrades.
   */
  statPassives: {
    coffeeMachine: { name: 'Kaffemaskin', value: 0.05, text: '+5 % kritisk sjanse (kritiske treff gir ekstra hjelp).' },
    mechKeyboard: { name: 'Mekanisk tastatur', value: 0.25, text: '+25 % hjelp fra kritiske treff.' },
    overtime: { name: 'Overtid', value: 0.15, speedCost: 0.04, text: '+15 % hjelp pÃ¥ alle vÃ¥pen, men âˆ’4 % bevegelseshastighet.' },
    standingDesk: { name: 'Hev-senk-pult', value: 0.35, text: '+0,35 energi per sekund i regenerering.' },
    firewall: { name: 'Brannmur', value: 0.06, max: 0.3, text: '+6 % sjanse for Ã¥ unngÃ¥ et treff helt.' },
    /** Â«HesteskoenÂ» (luck, version 6): rarer cards are more likely, and a chance of a fourth card. */
    horseshoe: { name: 'Hesteskoen', value: 0.25, fourthCard: 0.12, text: '+25 % flaks: sjeldnere kort oftere, og +12 % sjanse for et fjerde kort.' },
  },

  /**
   * The passives added in version 6.1 (items, Brotato-style). revives = lethal hits survived per shift,
   * lifesteal = energy per helped lawyer, ticketLife = extra seconds a ticket stays, points = more points from
   * everything, drinkFill/kickTime = bigger energy drinks, slowRes = less slowdown from paper piles, ink and hold music.
   */
  itemPassives: {
    backup: { name: 'Sikkerhetskopi', value: 1, max: 3, restore: 0.5, grace: 2, text: 'Overlever ett dÃ¸delig treff per vakt (maks 3) og fÃ¥r halv energi tilbake.' },
    grateful: { name: 'Takknemlige advokater', value: 0.04, text: '+0,04 energi for hver advokat du hjelper.' },
    postIt: { name: 'Post-it-blokk', value: 2, text: 'Ticket-lappene ligger 2 sekunder lenger pÃ¥ gulvet.' },
    bonusScheme: { name: 'Bonusordning', value: 0.1, text: '+10 % poeng fra lapper, hastesaker og bosser.' },
    thermos: { name: 'Termos', fill: 10, kick: 2, text: 'Energidrikken gir +10 energi og sukkerkicket varer 2 sekunder lenger.' },
    janitor: { name: 'Vaktmester', value: 0.15, max: 0.75, text: 'âˆ’15 % treghet fra papirbunker, blekk og ventemusikk.' },
  },

  /**
   * Tag passives (version 6): +value help for every weapon with that tag (see "tag" on each weapon).
   * Commit to a class and the passive pays for all the weapons in it.
   */
  tagPassives: {
    throwingCourse: { name: 'Kastekurs', tag: 'projectile', value: 0.15, text: '+15 % hjelp fra prosjektilvÃ¥pen: Toner-kast, Ctrl+Z og Teams-varsel.' },
    networkCert: { name: 'Nettverkssertifisering', tag: 'chain', value: 0.15, text: '+15 % hjelp fra kjedevÃ¥pen: Passord-reset og Fjernstyring.' },
    openPlan: { name: 'Ã…pent landskap', tag: 'area', value: 0.15, text: '+15 % hjelp fra omrÃ¥devÃ¥pen: Skru av og pÃ¥, TrÃ¥dlÃ¸se mus, HDMI-kabelen og OppdateringsstrÃ¥len.' },
    summerIntern: { name: 'Sommervikar', tag: 'helper', value: 0.15, text: '+15 % hjelp fra hjelperne: Skytsengelen og StÃ¸ydempende headset.' },
  },

  /** Base critical hit multiplier (before Â«Mekanisk tastaturÂ»). */
  critMult: 1.5,

  /**
   * PASSIVES. "value" is the effect per level (0.10 = 10 %).
   * levelText (optional) gives a separate card text per level.
   */
  passives: {
    ram: { name: 'Ekstra RAM', value: 0.10, text: '+10 % stÃ¸rre omrÃ¥de pÃ¥ alle vÃ¥pen.' },
    paperTray: {
      name: 'Papirskuff', value: 0.05, text: '+5 % hjelp pÃ¥ alle vÃ¥pen.',
      /** The levels that give +1 projectile (Toner-kast and Passord-reset). The others give +value help. */
      projectileLevels: [2, 4],
      levelText: ['+5 % hjelp pÃ¥ alle vÃ¥pen.', '+1 prosjektil (Toner-kast og Passord-reset).', '+5 % hjelp pÃ¥ alle vÃ¥pen.', '+1 prosjektil (Toner-kast og Passord-reset).', '+5 % hjelp pÃ¥ alle vÃ¥pen.'],
    },
    batteries: { name: 'Nye batterier', value: 0.10, text: '+10 % varighet og hastighet pÃ¥ vÃ¥pen.' },
    ssd: { name: 'Raskere SSD', value: 0.08, text: 'âˆ’8 % tid mellom hver aktivering av vÃ¥pen.' },
    sneakers: { name: 'Joggesko', value: 0.08, text: '+8 % bevegelseshastighet.' },
    biggerCan: { name: 'StÃ¸rre boks', value: 20, text: '+20 maks energi og fyller opp 20 energi.' },
    extensionCord: { name: 'Lang skjÃ¸teledning', value: 0.25, text: '+25 % stÃ¸rre radius for Ã¥ plukke opp ticket-lapper.' },
    admin: { name: 'Admin-rettigheter', value: 0.10, text: '+10 % hjelp pÃ¥ alle vÃ¥pen.' },
  },

  /** Speech bubbles (max 3 at a time). */
  bubbles: [
    'Hvor er Teams-lenka?', 'Skjermen er svart!', 'Printeren virker ikke!', 'Jeg har glemt passordet',
    'Det funket i gÃ¥r!', 'Jeg rÃ¸rte ingenting!', 'Har du to minutter?', 'Musa har hengt seg!',
    'Hvor ble filen av?', 'Jeg har mÃ¸te nÃ¥!', 'Wi-Fi-en er treg!', 'Den bare piper!',
  ],

  /** Screen and HUD (looks only â€“ never affects the game). */
  display: {
    /** Factor for each UI size in the settings. */
    uiSizes: { small: 0.8, medium: 1, large: 1.25, extraLarge: 1.5 },
    /** Width of the minimap as a fraction of the screen width. */
    minimap: { small: 0.14, large: 0.22, updatesPerSecond: 10 },
    /** The energy bar should be at least this large a fraction of the screen width. */
    energyWidth: 0.25,
    /** The energy bar flashes red below this fraction. */
    energyLow: 0.25,
  },

  /** Automatic quality: turns down purely visual effects when the machine is struggling. Never affects the game logic. */
  quality: {
    /** Average time per frame (ms) that counts as "too slow". */
    limitMs: 16.5,
    /** Seconds of too-slow time before the quality is lowered, and seconds of good time before it is raised again. */
    downAfter: 1.5, upAfter: 8,
  },

  /** Limits the leaderboard server uses to reject unrealistic submissions. */
  leaderboard: {
    maxName: 20,
    /** Max points per second survived (generous). */
    maxPointsPerSecond: 9000,
    /** Max lawyers helped per second survived. */
    maxHelpedPerSecond: 50,
    /** Max submissions per minute from the same address (generous, in case a whole household shares an address behind a proxy). */
    maxSubmissionsPerMinute: 30,
    /** Number shown. */
    show: 20,
  },
};

// The passives from version 3, 5, 6 and 6.1 are merged with the original ones, so the rest of the game sees 28 passives.
Object.assign(CONFIG.weapons, CONFIG.newWeapons);
Object.assign(CONFIG.passives, CONFIG.newPassives, CONFIG.statPassives, CONFIG.tagPassives, CONFIG.itemPassives);

/** The tag of each weapon id (for the tag passives). */
export const WEAPON_TAG = /** @type {Record<string, string>} */ ({});
for (const [id, w] of Object.entries(CONFIG.weapons)) WEAPON_TAG[id] = /** @type {any} */ (w).tag ?? 'area';

/**
 * How each stat is named on the upgrade cards and the stat sheet, and how its value is shown.
 * unit: 's' = seconds, 'px' = pixels, 'n' = a count, '' = plain number, 'rad' = radians per second.
 */
export const STAT_LABEL = {
  help: ['hjelp per treff', ''], interval: ['tid mellom aktiveringer', 's'], radius: ['puls', 'px'], splash: ['tonersprut', 'px'],
  track: ['bane', 'px'], rotation: ['rotasjon', 'rad'], range: ['rekkevidde', 'px'], reach: ['rekkevidde', 'px'], lengthPx: ['lengde', 'px'],
  width: ['bredde', 'px'], duration: ['varighet', 's'], pause: ['pause', 's'], speed: ['fart', 'px'], turn: ['styring', 'rad'],
  hops: ['hopp', 'n'], hits: ['treff', 'n'], chains: ['kjeder', 'n'], charge: ['oppladning', 's'], pulseRadius: ['puls', 'px'], arc: ['bue', 'rad'],
  nudge: ['dytt', 'px'], hitPause: ['pause per advokat', 's'], burst: ['tid mellom papirark', 's'],
  charges: ['ladninger', 'n'], life: ['levetid', 's'], max: ['samtidig', 'n'], back: ['svinges ogsÃ¥ bakover', ''], count: ['antall', 'n'],
  perThrow: ['per kast', 'n'], hopTime: ['tid per hopp', 's'], tick: ['takt', 's'], period: ['periode', 's'], spread: ['spredning', ''],
};

// The sender uses the same fields as the other lawyer types.
/** @type {any} */ (CONFIG.enemies).sender = CONFIG.sender;

/** Speech bubbles for the Â«Haster!Â» ("Urgent!") sender. */
export const SENDER_BUBBLES = ['Sendte deg en mail!', 'Svarte du pÃ¥ mailen min?', 'HASTER!!!', 'SÃ¥ du mailen?'];

/** Fixed time step in seconds. */
export const DT = 1 / CONFIG.ticksPerSecond;

// @ts-check
/**
 * CONFIGURATION – all balance numbers in the game live here.
 *
 * You don't need to be able to program to tweak the balance:
 * change a number, save the file and reload the page.
 * Distances are in logical pixels (the screen shows 640 × 360, the player is about 32 pixels tall),
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

  /**
   * «Helsekjeks» (Endringsprompt 4, section 9): an ordinary happy lawyer now and then leaves a small cookie with a
   * little energy. Rolled on the drops stream («Dagens vakt»). Bosses, Frida's friends, partners and urgent cases never drop one.
   */
  cookie: {
    /** Chance per happy ordinary lawyer. */
    chance: 0.01,
    /** Energy restored (no sugar rush). */
    fill: 5,
    /** Seconds it stays on the floor, and it blinks the last «blinkTime» seconds (like the tickets). */
    lifetime: 10, blinkTime: 3,
    /** Max cookies on the map at the same time. */
    max: 6,
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
    /** Fiske-Frida's two friends: the real numbers come from CONFIG.bosses.frida.friends when they are spawned. */
    friend: { name: 'Venninne', from: 1e9, frustration: 100, speed: 30, radius: 9, damage: 6, points: 0, weight: 0 },
  },

  /**
   * ELITES («Partnere», version 5): rare, much tougher lawyers with a visible frustration bar, a crown and one
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
      /** Other lawyers within «radius» of the partner take only «helpFactor» of the help. */
      aura: { name: 'Partner-aura', radius: 70, helpFactor: 0.5 },
      /** When helped, delegates: «count» junior associates appear around it. */
      split: { name: 'Delegerer', count: 3 },
      /** Every «every» seconds: a «tell»-second warning («!»), then a «duration»-second dash at «speed» × speed. */
      rush: { name: 'Har hastverk', every: 4, tell: 0.5, duration: 0.6, speed: 3.2 },
    },
  },

  /**
   * BOSSES (version 4). They come in a fixed order, and they are mandatory: if the countdown runs out,
   * the player is fired («Du har fått sparken!») and the round ends. The score can still be submitted.
   * Every attack is warned (pose, light or «!») for «tell» seconds before it comes.
   */
  bosses: {
    /** When each boss arrives (seconds) and which one. */
    schedule: [
      { at: 180, type: 'nordic' },
      { at: 360, type: 'printerBoss' },
      { at: 540, type: 'frida' },
      { at: 720, type: 'johan' },
    ],
    /** After the last one, Johan comes back this often (seconds), stronger each time. */
    repeatEvery: 180,
    /** The big clock turns yellow at 30 seconds left, and red (blinking and ticking) at 10. */
    warnYellow: 30, warnRed: 10,
    /** Seconds the game stays frozen with «DU HAR FÅTT SPARKEN!» before the end screen. */
    firedPause: 2.8,
    /** Warning time before an attack (seconds). */
    tell: 0.65,
    /** A banner this many seconds before each boss arrives («… kommer om 10 sekunder»). */
    warnBefore: 10,
    /** Distance from the player where the boss appears. */
    spawnDistance: 330,
    /** Boss attacks only start when the boss is this many seconds into the fight (time to see it coming). */
    calmStart: 2.5,
    /** While a boss is out, fewer ordinary lawyers stream in (0.55 = 55 % of normal). The waves are not affected. */
    spawnFactor: 0.55,
    /** A boss farther away than this jogs «catchUpSpeed» times faster, so the player cannot just run away from it. */
    catchUpFrom: 230, catchUpSpeed: 2.4,

    nordic: {
      name: 'Nørdic-konsulenten', short: 'NØRDIC',
      intro: 'Nørdic-konsulenten har ankommet!', line: 'Saken er registrert. Forventet svartid: 3–5 virkedager.',
      happyText: 'Sak lukket!',
      frustration: 1300, speed: 28, radius: 20, damage: 8, points: 2500, deadline: 120,
      /** «Du er nummer 47 i køen»: hold music in a ring. The notes only slow the player down. */
      queue: { cooldown: 10, notes: 10, speed: 40, lifetime: 5.5, slow: 0.4, slowTime: 2 },
      /** «Saken er sendt videre»: a ticket that splits into three smaller ones in a fan. */
      forward: { cooldown: 5.5, speed: 95, splitAfter: 0.9, count: 3, spread: 0.45, damage: 6 },
      /** «Vi ringer deg tilbake»: stands still and cannot be helped. Max once per «cooldown» seconds. */
      callBack: { cooldown: 20, duration: 3 },
    },
    printerBoss: {
      name: 'Multifunksjonsmonsteret', short: 'PRINTER',
      intro: 'Multifunksjonsmonsteret har våknet!', line: 'PAPIRSTOPP I SKUFF 2',
      happyText: 'Utskrift fullført',
      frustration: 3400, speed: 24, radius: 22, damage: 9, points: 4000, deadline: 120,
      /** Four colour cartridges (CMYK) in a fan. They land after «flight» seconds and leave an ink puddle. */
      cmyk: { cooldown: 8, speed: 125, flight: 1.3, spread: 0.32, damage: 6, puddleTime: 4, puddleRadius: 16, puddleSlow: 0.3, maxPuddles: 8 },
      /** «Utskriftsjobb på 400 sider»: a fast stream of sheets in a sweeping arc. */
      printJob: { cooldown: 13, duration: 2, rate: 0.09, arc: 1.7, speed: 115, damage: 3 },
      /** «Papirstopp!»: now and then the printer gets stuck – no movement, no attacks, and it takes double help. */
      jam: { every: 15, duration: 3, helpFactor: 2 },
    },
    /**
     * Boss 3 (Endringsprompt 4): Fiske-Frida and her two friends. A warm grandmother who believes every email she gets
     * and forwards it to everyone she knows – she has been fooled, she is not stupid. All attacks are fish («phishing»).
     * Frida is the one who must be helped; the friends can be helped separately for extra points.
     */
    frida: {
      // shown to the player as «Anonymous» (the code still calls her «frida»)
      name: 'Anonymous og venninnene', short: 'ANONYMOUS',
      intro: 'Anonymous og venninnene har ankommet!', line: 'Jeg har vunnet en iPhone! Bare klikk på lenken, vennen!',
      happyText: 'Oi, var det svindel? Takk, vennen!',
      frustration: 6600, speed: 26, radius: 20, damage: 11, points: 6000, deadline: 120,
      /** The friends: frustration and points as a fraction of Frida's, contact damage, speed factor and follow distance. */
      friends: { count: 2, frustration: 0.15, points: 0.15, damage: 6, speed: 1.5, follow: 28 },
      /**
       * «Klikk på lenken!»: swings the rod over her head (a dashed line shows the direction), then casts the hook in a
       * straight line. A hit gives normal damage (× damage) and pulls the player «pull» pixels toward Frida over «pullTime» s.
       */
      hook: { cooldown: 7, speed: 230, range: 280, damage: 1, pull: 48, pullTime: 0.22 },
      /** «Silderegn»: shadows on the floor, herring land on them «fall» seconds later. One shadow is where the player stands. */
      herring: { cooldown: 9, count: 7, spread: 80, fall: 1, radius: 11, damage: 5 },
      /** «Videresendt svindel-e-post»: the friends raise their phones, then each sends fish-shaped emails in a wavy line. */
      phish: { cooldown: 6, perFriend: 2, spread: 0.35, speed: 62, wave: 14, waveSpeed: 6, damage: 5, lifetime: 5 },
      /**
       * «Lokkemat»: fake pickups (an energy drink or a «Ny PC» with a small fish hook). No warning – that is the point.
       * Picking one up gives «damage» and slows the player by «slow» for «slowTime» seconds. Max «max» at the same time.
       * They are never on the minimap and disappear when Frida is helped.
       */
      bait: { cooldown: 11, max: 3, minDistance: 90, maxDistance: 190, damage: 6, slow: 0.45, slowTime: 2 },
    },
    johan: {
      name: 'Johan', short: 'JOHAN', title: 'SISTE BOSS: JOHAN',
      intro: 'SISTE BOSS: JOHAN', line: 'Har du et lite minutt?',
      phaseText: 'Johan tar av seg dressjakka', happyText: 'Bra jobba!',
      frustration: 9800, speed: 30, radius: 20, damage: 12, points: 15000, deadline: 150,
      /** Second phase from half frustration: faster and attacks more often (cooldown × «cooldowns»). */
      phase2: { at: 0.5, speed: 1.25, cooldowns: 0.75 },
      /** «Har du et lite minutt?»: points at the player, then sprints in a straight line. damage = × his damage. */
      sprint: { cooldown: 6.5, speed: 330, maxTime: 0.9, damage: 1.6 },
      /** A fan of five calendar invitations. */
      calendar: { cooldown: 7, count: 5, spread: 0.28, speed: 72, damage: 6 },
      /** «Alle på møte!»: a ring of junior associates around the player, with an opening. */
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
   * sprite/portrait = the client's own pixel art (32 × 32 figure, 64 × 64 portrait), used exactly as it is.
   * The files are matched to the characters by their looks (person4 = Odyssefs, person3 = Johannes, person1 = Jin, person2 = Julian).
   */
  characters: [
    { id: 'k1', name: 'Odyssefs', title: 'IT-avdelingen', sprite: 'assets/karakterer/figur_person4.png', portrait: 'assets/karakterer/portrett_person4.png', startWeapon: 'powerCycle', bonus: { maxEnergy: 20 }, bonusText: '+20 maks energi' },
    { id: 'k2', name: 'Johannes', title: 'IT-avdelingen', sprite: 'assets/karakterer/figur_person3.png', portrait: 'assets/karakterer/portrett_person3.png', startWeapon: 'toner', bonus: { help: 0.10 }, bonusText: '+10 % hjelp' },
    { id: 'k3', name: 'Jin', title: 'IT-avdelingen', sprite: 'assets/karakterer/figur_person1.png', portrait: 'assets/karakterer/portrett_person1.png', startWeapon: 'hdmi', bonus: { speed: 0.10 }, bonusText: '+10 % bevegelseshastighet' },
    { id: 'k4', name: 'Julian', title: 'IT-avdelingen', sprite: 'assets/karakterer/figur_person2.png', portrait: 'assets/karakterer/portrett_person2.png', startWeapon: 'mouse', bonus: { pick: 0.25 }, bonusText: '+25 % radius for å plukke opp ticket-lapper' },
  ],

  /** The «Haster!» ("Urgent!") sender: keeps its distance and sends emails («Haster!!!») at the player. */
  sender: {
    name: '«Haster!»-avsender', from: 150, frustration: 50, speed: 40, radius: 7, damage: 9, points: 40,
    /** How often the type is chosen (fraction of the weight of a junior associate). */
    weight: 0.25,
    /** Cap: max fraction of the active lawyers, and max number at the same time. */
    maxFraction: 0.15, maxCount: 30,
    /** Tries to stay between these distances from the player. */
    distMin: 150, distMax: 200,
    /** Seconds between each email (gets a bit faster over time, but never below the minimum). */
    shotInterval: 3, shotFasterPerMin: 0.04, shotIntervalMin: 1.8,
    /** Seconds of warning (the laptop lights up and a «!» over the head) before each email. */
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
  figureVariants: { junior: 42, printer: 42, senior: 42, urgent: 21, boss: 12, sender: 42, friend: 2 },

  /**
   * How ordinary lawyers get tougher over time (version 6: linear, not compounding). The weapons grow without a
   * cap now, so the curve is a straight line until overtime: frustration = 1 + frustrationPerMin × (minutes − startAfterMin).
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
    /** After this minute («Overtid», "Overtime") everything rises steeply, with no cap. */
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
    /** Flock: count = start + perMin × minutes (capped at max). */
    flockStart: 10, flockPerMin: 4, flockMax: 60,
    /** Ring: from this second at the earliest, and the chance that a wave becomes a ring. */
    ringFrom: 120, ringChance: 0.4,
    ringStart: 20, ringPerMin: 3, ringMax: 60,
    ringRadius: 370,
    /** The opening in the ring, in radians (0.9 ≈ 50 degrees). */
    ringGap: 0.9,
  },

  /**
   * EVENTS (version 6). Scheduled events happen at the same time on every shift (at = seconds, repeat = seconds between
   * repeats, 0 = once). Rare events are rolled once a minute from «from» with their own random stream («Dagens vakt»),
   * so they are the same for everyone on the same day but differ from day to day. Timed events set a mood
   * (speed and damage factors on the ordinary lawyers) for «duration» seconds.
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
      /** A flock of junior associates from one direction: count + perMin × minutes. */
      lunchRush: { name: 'Lunsjrush!', text: 'Hele kantina kommer samtidig', type: 'junior', count: 24, perMin: 3, max: 70 },
      /** A flock of printer enthusiasts. */
      printerQueue: { name: 'Printerkø!', text: 'Printerentusiastene har funnet en ny printer', type: 'printer', count: 8, perMin: 1, max: 24 },
      /** A few partners (elites) at once, straight from the meeting room. */
      partnerMeeting: { name: 'Partnermøte!', text: 'Partnerne kommer rett fra møtet', count: 3 },
      /** The lawyers walk slowly for a while. */
      coffeeBreak: { name: 'Kaffepause', text: 'Advokatene går saktere en stund', duration: 12, speed: 0.5, damage: 1 },
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

  /** Experience required for the next level = base + perLevel × level + square × level². */
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

  /** Points for the «Kaffepause-bonus» ("Coffee break bonus") when everything is maxed out. */
  coffeeBreakBonus: 500,

  /** Max number of weapons and passives, and max passive level. Weapons have no level cap (see CONFIG.upgrades). */
  limits: { weapons: 4, passives: 8, passiveLevel: 5 },

  /**
   * UPGRADES (version 6). A weapon has no levels: every card at level-up gives one specific increment
   * (more help, shorter interval, one more projectile, an effect …) and a weapon can take any number of them.
   * Cards have a tier (rarity) that scales the increment: steps = how many growth steps a numeric card gives.
   * tierOdds = chance per tier; «Hesteskoen» (luck) multiplies the odds of everything above common.
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
    /** Rerolls («Nytt utvalg») and banishes («Fjern kortet») per shift, and how many more each helped boss gives. */
    rerolls: 1, banishes: 1, perBoss: 1,
    /**
     * Effect modifiers: rare cards that change how a weapon behaves. Each has a max level per weapon.
     * pierce = the projectile continues to one more lawyer per level. splash = hits also help the lawyers right next
     * to the target. slow = hit lawyers walk slower for a while. linger = part of the help is given once more a
     * moment later. knockback = hits push the lawyer back. crit = extra critical chance for that weapon only.
     */
    effects: {
      pierce: { name: 'Gjennomtrengende', text: 'Prosjektilet går videre til én advokat til.', max: 3 },
      splash: { name: 'Sprut', text: 'Hvert treff gir også 35 % hjelp til advokatene rett ved.', max: 3, radius: 16, fraction: 0.35, maxNeighbors: 6 },
      slow: { name: 'Venter på IT', text: 'Advokater som treffes går 20 % saktere i 2 sekunder.', max: 3, value: 0.2, time: 2, maxSlow: 0.6 },
      linger: { name: 'Saken ligger i køen', text: '30 % av hjelpen gis én gang til etter et sekund.', max: 3, fraction: 0.3, delay: 1 },
      knockback: { name: 'Avvist', text: 'Treff skyver advokaten 5 piksler bakover.', max: 3, px: 5 },
      crit: { name: 'Ekstra kaffe', text: '+8 % kritisk sjanse for dette våpenet.', max: 5, value: 0.08 },
      /** Version 6.1: mark = hit lawyers take more help from everything for a while, escalation = more help to
       *  partners and bosses, pull = hits drag the lawyer toward the player (groups them for area weapons). */
      mark: { name: 'Purring', text: 'Advokater som treffes tar 10 % mer hjelp fra alt i 3 sekunder.', max: 3, value: 0.1, time: 3 },
      escalation: { name: 'Eskalering', text: '+15 % hjelp mot partnere og bosser.', max: 3, value: 0.15 },
      pull: { name: 'Innkalling', text: 'Treff drar advokaten 3 piksler mot deg (bare våpen med rekkevidde).', max: 3, px: 3 },
    },
    /**
     * Card weights at level-up: increments to a weapon you have (shared by its growth rules, weighted: help counts
     * «helpRule» times, counts «countRule» times, other rules once), its effects (shared), a passive you have, a new
     * weapon and a new passive. Owned things come up far more often, so you can build.
     */
    weight: { ownedWeapon: 6, effect: 1.5, ownedPassive: 2, fresh: 1.2, freshPassive: 0.6, helpRule: 2.5, countRule: 1.5 },
    /** New weapons are offered this many times as often while the player has fewer than «earlySlots» weapons. */
    earlyWeaponBoost: 2.5, earlySlots: 2,
  },

  /**
   * «Pakke fra leverandøren» (version 6): a package that gives several weapon increments at once, always from a
   * helped boss and now and then from a helped partner (elite). Package cards are at least «minTier».
   */
  package: {
    name: 'Pakke fra leverandøren',
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
    /** If more than this many become happy at once (e.g. «Ny PC»), the animation is shortened. */
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
   *                         { pct: f }   = +f × base per step (linear, never capped – this is how help grows),
   *                         { mul: f }   = × f per step (compounding; use min/max as a floor or cap),
   *                         { set: v, once: true } = a one-time change (e.g. back: true).
   *                         max/min = cap (the card is not offered past it). Count-like stats (count, hits, hops …)
   *                         must have a max: that cap is what keeps the game fast on an office PC.
   * The combination (max increments + its passive) swaps "base" for "combination.stats"; the increments keep
   * applying on top, and rules for stats the combination does not have are turned into help increments.
   * tag = the weapon's class (projectile, chain, area, helper), used by the tag passives.
   * effects = which effect modifiers the weapon can take (see CONFIG.upgrades.effects).
   * countName = what "count" is called on the card («+1 mus»).
   */
  weapons: {
    powerCycle: {
      name: 'Skru av og på', tag: 'area',
      description: 'En puls rundt deg hjelper alle i nærheten.',
      base: { radius: 44, help: 11, interval: 1.0 },
      growth: { help: { pct: 0.35 }, radius: { add: 6, max: 120 }, interval: { mul: 0.9, min: 0.4 }, nudge: { add: 1, max: 10 } },
      effects: ['slow', 'knockback', 'crit', 'linger', 'mark', 'escalation'],
      combination: {
        passive: 'ram', name: 'Full omstart',
        text: 'Mye større puls som går raskere og skyver advokatene tilbake.',
        /** nudge = how far the lawyers are pushed per pulse. */
        stats: { radius: 72, help: 30, interval: 0.62, nudge: 4 },
      },
    },
    toner: {
      name: 'Toner-kast', tag: 'projectile',
      description: 'Kaster tonerkassetter i en vifte mot nærmeste advokat. De sprekker og hjelper alle rundt.',
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
      description: 'En nøkkel hopper fra advokat til advokat, som et kjedelyn.',
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
      description: 'En kabel svinges i en bue mot nærmeste advokat og hjelper alle den treffer.',
      /** arc = width of the arc in radians (2.4 ≈ 140 degrees). back = also swings backward. */
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
      description: 'De nærmeste advokatene får hjelp via et glimt ovenfra.',
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
      name: 'Trådløse mus', tag: 'area',
      description: 'Mus kretser i en bane rundt deg og hjelper alle de treffer.',
      countName: 'mus',
      /** track = distance from the player, rotation = radians per second, hitPause = seconds before the same lawyer can be hit again. */
      base: { count: 3, track: 40, rotation: 3.0, help: 12, hitPause: 0.45 },
      growth: { help: { pct: 0.45 }, count: { add: 1, max: 16 }, track: { add: 4, max: 90 }, rotation: { add: 0.6, max: 9 }, hitPause: { mul: 0.88, min: 0.15 } },
      effects: ['slow', 'knockback', 'crit', 'linger', 'mark', 'escalation'],
      combination: {
        passive: 'batteries', name: 'Musematta',
        text: 'Åtte mus suser rundt deg i en bredere og raskere ring.',
        stats: { count: 8, track: 60, rotation: 5.5, help: 30, hitPause: 0.35 },
      },
    },
    ctrlz: {
      name: 'Ctrl+Z', tag: 'projectile',
      description: 'En stor Ctrl+Z-tast kastes mot nærmeste advokat og kommer tilbake.',
      countName: 'tast',
      /** range = how far the key flies before it turns around. The combination has radius/period/rotation instead. */
      base: { count: 1, range: 110, help: 14, interval: 1.6, speed: 220 },
      growth: { help: { pct: 0.35 }, count: { add: 1, max: 8 }, range: { add: 12, max: 260 }, interval: { mul: 0.9, min: 0.5 }, speed: { add: 20, max: 400 }, radius: { add: 8, max: 170 }, rotation: { add: 0.3, max: 7 }, hitPause: { mul: 0.88, min: 0.15 } },
      effects: ['slow', 'knockback', 'crit', 'linger', 'mark', 'escalation', 'pull'],
      combination: {
        passive: 'shortcuts', name: 'Ctrl+Alt+Del',
        text: 'Flere taster går i en spiral ut og inn rundt deg.',
        /** radius = how far out the spiral goes, period = seconds out and in, rotation = radians per second. */
        stats: { count: 5, radius: 90, period: 2.4, rotation: 3.0, help: 30, hitPause: 0.45 },
      },
    },
    beam: {
      name: 'Oppdateringsstrålen', tag: 'area',
      description: 'En lang fremdriftsindikator skyter ut som en stråle mot nærmeste advokat.',
      /** help is given every "tick" seconds while the beam lasts. pause = time between each beam. */
      base: { lengthPx: 130, width: 10, duration: 1.0, pause: 2.6, help: 10, tick: 0.2 },
      growth: { help: { pct: 0.6 }, lengthPx: { add: 18, max: 320 }, width: { add: 2.5, max: 30 }, duration: { add: 0.2, max: 3 }, pause: { mul: 0.82, min: 0.6 }, tick: { mul: 0.9, min: 0.08 }, rotation: { add: 0.2, max: 3 } },
      effects: ['slow', 'crit', 'linger', 'mark', 'escalation', 'pull'],
      combination: {
        passive: 'certification', name: 'Tvungen oppdatering',
        text: 'To stråler sveiper sakte rundt deg hele tiden.',
        stats: { lengthPx: 180, width: 16, rotation: 0.8, help: 18, tick: 0.45 },
      },
    },
    teams: {
      name: 'Teams-varsel', tag: 'projectile',
      description: 'Teams-varsler skytes ut og svinger seg mot hver sin advokat, nærmeste først.',
      countName: 'varsel',
      /** count = alerts per volley (each picks its own lawyer), turn = how sharply they steer (radians per second). */
      base: { count: 1, help: 26, interval: 1.4, speed: 200, turn: 7, reach: 240 },
      growth: { help: { pct: 0.65 }, count: { add: 1, max: 10 }, interval: { mul: 0.9, min: 0.45 }, reach: { add: 12, max: 360 }, turn: { add: 0.6, max: 12 } },
      effects: ['pierce', 'crit', 'linger', 'splash', 'slow', 'mark', 'escalation'],
      combination: {
        passive: 'dualMonitor', name: 'Allmøte på Teams',
        text: 'Hvert varsel deler seg i to nye målsøkende varsler når det treffer.',
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
       * still, and shoot a sheet of paper at the nearest lawyer within «range» every «burst» seconds.
       * perThrow = mini printers per throw, max = max at the same time (fixed and the same for everyone),
       * life = seconds a mini printer stands and shoots, help = help per sheet, burst = seconds between sheets,
       * range = how far from the printer a lawyer can be shot at.
       */
      base: { perThrow: 1, max: 2, interval: 2.6, life: 4, help: 41, burst: 0.3, range: 60 },
      growth: { help: { pct: 0.3 }, perThrow: { add: 1, max: 6 }, max: { add: 1, max: 12 }, interval: { mul: 0.9, min: 0.8 }, life: { add: 0.5, max: 8 }, range: { add: 9, max: 130 }, burst: { mul: 0.9, min: 0.15 } },
      effects: ['slow', 'crit', 'linger', 'mark', 'escalation'],
      combination: {
        passive: 'biggerCan', name: 'Himmelsk serviceavtale',
        text: 'Lysende glorie og større vinger: flere mini-printere, som avslutter med papirkonfetti.',
        /** confetti = help in the final burst of paper confetti, confettiRadius = its radius. */
        stats: { perThrow: 4, max: 6, interval: 1.9, life: 5, help: 56, burst: 0.3, range: 69, confetti: 50, confettiRadius: 50 },
      },
    },
    headset: {
      name: 'Støydempende headset', tag: 'helper',
      description: 'Et skjold som blokkerer ett treff og sender ut en puls. Lades opp igjen.',
      countName: 'ladning',
      /** charge = seconds before the shield is ready again, charges = hits it can take before recharging. */
      base: { charge: 20, pulseRadius: 50, help: 26, charges: 1 },
      growth: { help: { pct: 0.3 }, charge: { mul: 0.88, min: 4 }, pulseRadius: { add: 8, max: 160 }, charges: { add: 1, max: 4 } },
      effects: ['knockback', 'slow', 'crit', 'mark', 'escalation'],
      combination: {
        passive: 'ergonomicChair', name: 'Hjemmekontor',
        text: 'Skjoldet blokkerer tre treff før det må lades, og pulsen blir mye større.',
        stats: { charge: 9, pulseRadius: 100, help: 70, charges: 3 },
      },
    },
    /**
     * Ping-pong (Endringsprompt 4): the only weapon that bounces off the edges of the screen (and the outer walls) and
     * gets stronger with every bounce. The balls go through the lawyers; a lawyer can be hit by the same ball at most
     * once per «hitPause» seconds. The launch direction is a random diagonal from the ping-pong stream («Dagens vakt»).
     * count = balls at the same time, bounces = bounces before a ball is gone, speed = start speed,
     * boost = how much each bounce adds (speed × (1 + speedUp), help + helpUp of the start help), boostMax = the cap on
     * the extra help (0.6 = +60 %), interval = seconds between launching new balls while there is room.
     * The weapon has no level cap like the others (version 6); the growth rules follow the client's level table:
     * +help, +2 bounces, +1 ball, faster balls and a higher cap on the help increase.
     */
    pingpong: {
      name: 'Ping-pong', tag: 'projectile',
      description: 'En pingpongball spretter mellom skjermkantene og blir sterkere for hvert sprett.',
      countName: 'ball',
      base: { count: 1, bounces: 4, help: 30, speed: 150, boostMax: 0.6, interval: 1.6 },
      growth: { help: { pct: 0.15 }, bounces: { add: 2, max: 16 }, count: { add: 1, max: 4 }, speed: { add: 12, max: 240 }, boostMax: { add: 0.2, max: 1.4 }, interval: { mul: 0.9, min: 0.6 } },
      effects: ['crit', 'linger', 'slow', 'knockback', 'mark', 'escalation'],
      /** Fixed for everyone: the extra speed and help per bounce, the top speed and the hit pause per lawyer. */
      speedUp: 0.06, helpUp: 0.1, maxSpeed: 320, hitPause: 0.5, radius: 5,
      /** The «PING»/«PONG» text is only shown while there are at most this many balls. */
      textMaxBalls: 4,
      combination: {
        passive: 'sneakers', name: 'Ping of Death',
        text: 'Hver gang en ball spretter, deler den seg i to (maks 12 baller), og ballene etterlater et glødende spor.',
        /** maxBalls = fixed cap on balls at the same time (also for splits). */
        stats: { count: 4, bounces: 8, help: 22, speed: 170, boostMax: 1.0, interval: 1.2, maxBalls: 12 },
      },
    },
    /**
     * Livvakten (the bodyguard, Endringsprompt 4): a helper like Skytsengelen. He walks beside the player and now and
     * then lays a «brannmur» (firewall) – a line of flames «distance» pixels from the player, across the direction where
     * most lawyers are, so it stands between the player and the flock. Lawyers in it get help every «tick» seconds and
     * walk «slow» slower. It never blocks movement and never hurts the player.
     * walls = firewalls per activation (toward the densest flocks), lengthPx = length, duration = seconds it stands,
     * interval = seconds between each time. No regular combination: he is part of The Matrix.
     */
    bodyguard: {
      name: 'Livvakten', tag: 'helper',
      description: 'En rolig livvakt følger deg og lager en brannmur av flammer mellom deg og flokken.',
      countName: 'brannmur',
      base: { walls: 1, lengthPx: 60, help: 26, interval: 5.5, duration: 3, slow: 0.3 },
      growth: { help: { pct: 0.15 }, lengthPx: { add: 12, max: 150 }, interval: { mul: 0.88, min: 2.5 }, duration: { add: 1, max: 6 }, walls: { add: 1, max: 3 }, slow: { add: 0.05, max: 0.5 } },
      effects: ['crit', 'linger', 'mark', 'escalation'],
      /** Fixed for everyone: distance from the player, flame band width, help tick, max firewalls at the same time. */
      distance: 30, width: 10, tick: 0.25, maxWalls: 3,
    },
    /**
     * THE MATRIX (Endringsprompt 4, section 7): the rarest combination. Skytsengelen (10 increments or combined) +
     * Livvakten (10 increments) + Shopkeeperen merge into one weapon (one weapon slot is freed). The angel still throws
     * mini printers and the bodyguard still lays firewalls, in green «code» style and stronger. Every «rainEvery»
     * seconds green characters rain over the screen for «rainTime» seconds: every «rainTick» seconds all lawyers on
     * screen get «rainHelp», and everything hostile (lawyers, bosses and their projectiles) moves «slowMo» as fast
     * («bullet time»). The player moves as normal. Never offered as a new weapon – only as the special card.
     * Angel stats: perThrow, max, interval, life, help (per sheet), burst, range. Firewall stats: walls, lengthPx,
     * wallHelp, wallInterval, duration, slow.
     */
    matrix: {
      name: 'The Matrix', tag: 'helper', hidden: true,
      description: 'Skytsengelen og Livvakten i grønn kode, med kode-regn og bullet time.',
      countName: 'mini-printer',
      base: {
        perThrow: 3, max: 7, interval: 1.7, life: 5, help: 40, burst: 0.25, range: 75,
        walls: 2, lengthPx: 100, wallHelp: 11, wallInterval: 4, duration: 4, slow: 0.4,
        rainEvery: 12, rainTime: 3, rainTick: 0.5, rainHelp: 20, slowMo: 0.5,
      },
      growth: {
        help: { pct: 0.12 }, wallHelp: { pct: 0.12 }, rainHelp: { pct: 0.15 }, perThrow: { add: 1, max: 6 }, max: { add: 1, max: 12 },
        walls: { add: 1, max: 3 }, lengthPx: { add: 12, max: 160 }, interval: { mul: 0.92, min: 0.8 }, wallInterval: { mul: 0.9, min: 2.5 },
      },
      effects: ['slow', 'crit', 'linger', 'mark', 'escalation'],
      /** What it takes: the angel (increments or combined), the bodyguard's increments, and Shopkeeperen (any level). */
      requires: { angel: 'angel', bodyguard: 'bodyguard', passive: 'certification' },
      cardText: 'Skytsengelen og Livvakten slås sammen til ett våpen i grønn kode. Kode-regn og bullet time hvert 12. sekund. Frigjør én våpenplass.',
    },
  },

  /** Kept for older tools: all weapons now live in CONFIG.weapons. */
  newWeapons: {},

  /** The passives added in version 3. */
  newPassives: {
    dualMonitor: { name: 'Dobbel skjerm', value: 0.05, text: '+5 % sjanse for at et våpen aktiveres to ganger på rad.' },
    shortcuts: { name: 'Hurtigtaster', value: 0.12, text: '+12 % fart på prosjektiler, bumeranger og kjeder.' },
    ergonomicChair: { name: 'Ergonomisk stol', value: 0.06, text: '−6 % skade fra treff.' },
    /** «Shopkeeperen» (Endringsprompt 4, was «Sertifisering»): same effect; also stands next to the player as a small figure. */
    certification: { name: 'Shopkeeperen', value: 0.08, text: '+8 % erfaring fra ticket-lapper.' },
  },

  /**
   * The passives added in version 5 and 6 (Brotato-style stats). All of them are shown on the stat sheet at level-up.
   * crit = chance that a hit gives critMult × help. regen = energy per second. dodge = chance that a hit misses.
   * luck = «Hesteskoen», see CONFIG.upgrades.
   */
  statPassives: {
    coffeeMachine: { name: 'Kaffemaskin', value: 0.05, text: '+5 % kritisk sjanse (kritiske treff gir ekstra hjelp).' },
    mechKeyboard: { name: 'Mekanisk tastatur', value: 0.25, text: '+25 % hjelp fra kritiske treff.' },
    overtime: { name: 'Overtid', value: 0.15, speedCost: 0.04, text: '+15 % hjelp på alle våpen, men −4 % bevegelseshastighet.' },
    standingDesk: { name: 'Hev-senk-pult', value: 0.35, text: '+0,35 energi per sekund i regenerering.' },
    firewall: { name: 'Brannmur', value: 0.06, max: 0.3, text: '+6 % sjanse for å unngå et treff helt.' },
    /** «Hesteskoen» (luck, version 6): rarer cards are more likely, and a chance of a fourth card. */
    horseshoe: { name: 'Hesteskoen', value: 0.25, fourthCard: 0.12, text: '+25 % flaks: sjeldnere kort oftere, og +12 % sjanse for et fjerde kort.' },
  },

  /**
   * The passives added in version 6.1 (items, Brotato-style). revives = lethal hits survived per shift,
   * lifesteal = energy per helped lawyer, ticketLife = extra seconds a ticket stays, points = more points from
   * everything, drinkFill/kickTime = bigger energy drinks, slowRes = less slowdown from paper piles, ink and hold music.
   */
  itemPassives: {
    backup: { name: 'Sikkerhetskopi', value: 1, max: 3, restore: 0.5, grace: 2, text: 'Overlever ett dødelig treff per vakt (maks 3) og får halv energi tilbake.' },
    grateful: { name: 'Takknemlige advokater', value: 0.04, text: '+0,04 energi for hver advokat du hjelper.' },
    postIt: { name: 'Post-it-blokk', value: 2, text: 'Ticket-lappene ligger 2 sekunder lenger på gulvet.' },
    bonusScheme: { name: 'Bonusordning', value: 0.1, text: '+10 % poeng fra lapper, hastesaker og bosser.' },
    thermos: { name: 'Termos', fill: 10, kick: 2, text: 'Energidrikken gir +10 energi og sukkerkicket varer 2 sekunder lenger.' },
    janitor: { name: 'Vaktmester', value: 0.15, max: 0.75, text: '−15 % treghet fra papirbunker, blekk og ventemusikk.' },
  },

  /**
   * Tag passives (version 6): +value help for every weapon with that tag (see "tag" on each weapon).
   * Commit to a class and the passive pays for all the weapons in it.
   */
  tagPassives: {
    throwingCourse: { name: 'Kastekurs', tag: 'projectile', value: 0.15, text: '+15 % hjelp fra prosjektilvåpen: Toner-kast, Ctrl+Z, Teams-varsel og Ping-pong.' },
    networkCert: { name: 'Nettverkssertifisering', tag: 'chain', value: 0.15, text: '+15 % hjelp fra kjedevåpen: Passord-reset og Fjernstyring.' },
    openPlan: { name: 'Åpent landskap', tag: 'area', value: 0.15, text: '+15 % hjelp fra områdevåpen: Skru av og på, Trådløse mus, HDMI-kabelen og Oppdateringsstrålen.' },
    summerIntern: { name: 'Sommervikar', tag: 'helper', value: 0.15, text: '+15 % hjelp fra hjelperne: Skytsengelen, Livvakten og Støydempende headset.' },
  },

  /** Base critical hit multiplier (before «Mekanisk tastatur»). */
  critMult: 1.5,

  /**
   * PASSIVES. "value" is the effect per level (0.10 = 10 %).
   * levelText (optional) gives a separate card text per level.
   */
  passives: {
    ram: { name: 'Ekstra RAM', value: 0.10, text: '+10 % større område på alle våpen.' },
    paperTray: {
      name: 'Papirskuff', value: 0.05, text: '+5 % hjelp på alle våpen.',
      /** The levels that give +1 projectile (Toner-kast and Passord-reset). The others give +value help. */
      projectileLevels: [2, 4],
      levelText: ['+5 % hjelp på alle våpen.', '+1 prosjektil (Toner-kast og Passord-reset).', '+5 % hjelp på alle våpen.', '+1 prosjektil (Toner-kast og Passord-reset).', '+5 % hjelp på alle våpen.'],
    },
    batteries: { name: 'Nye batterier', value: 0.10, text: '+10 % varighet og hastighet på våpen.' },
    ssd: { name: 'Raskere SSD', value: 0.08, text: '−8 % tid mellom hver aktivering av våpen.' },
    sneakers: { name: 'Joggesko', value: 0.08, text: '+8 % bevegelseshastighet.' },
    biggerCan: { name: 'Større boks', value: 20, text: '+20 maks energi og fyller opp 20 energi.' },
    extensionCord: { name: 'Lang skjøteledning', value: 0.25, text: '+25 % større radius for å plukke opp ticket-lapper.' },
    admin: { name: 'Admin-rettigheter', value: 0.10, text: '+10 % hjelp på alle våpen.' },
  },

  /** Speech bubbles (max 3 at a time). */
  bubbles: [
    'Hvor er Teams-lenka?', 'Skjermen er svart!', 'Printeren virker ikke!', 'Jeg har glemt passordet',
    'Det funket i går!', 'Jeg rørte ingenting!', 'Har du to minutter?', 'Musa har hengt seg!',
    'Hvor ble filen av?', 'Jeg har møte nå!', 'Wi-Fi-en er treg!', 'Den bare piper!',
  ],

  /** Screen and HUD (looks only – never affects the game). */
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
  charges: ['ladninger', 'n'], life: ['levetid', 's'], max: ['samtidig', 'n'], back: ['svinges også bakover', ''], count: ['antall', 'n'],
  perThrow: ['per kast', 'n'], hopTime: ['tid per hopp', 's'], tick: ['takt', 's'], period: ['periode', 's'], spread: ['spredning', ''],
  // Endringsprompt 4: Ping-pong, Livvakten and The Matrix
  bounces: ['sprett', 'n'], boostMax: ['tak på hjelpeøkning', ''], walls: ['brannmurer', 'n'], slow: ['sinking', ''],
  wallHelp: ['hjelp fra brannmuren', ''], wallInterval: ['tid mellom brannmurer', 's'], rainHelp: ['hjelp fra kode-regnet', ''],
  maxBalls: ['maks baller', 'n'], rainEvery: ['kode-regn hvert', 's'], rainTime: ['kode-regnet varer', 's'], rainTick: ['kode-regn takt', 's'],
  slowMo: ['bullet time', ''],
};

// The sender uses the same fields as the other lawyer types.
/** @type {any} */ (CONFIG.enemies).sender = CONFIG.sender;

/** Speech bubbles for the «Haster!» ("Urgent!") sender. */
export const SENDER_BUBBLES = ['Sendte deg en mail!', 'Svarte du på mailen min?', 'HASTER!!!', 'Så du mailen?'];

/** Fixed time step in seconds. */
export const DT = 1 / CONFIG.ticksPerSecond;

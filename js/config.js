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
      { at: 540, type: 'deadline' },
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
    deadline: {
      name: 'Fristen er om 2 minutter!', short: 'FRIST',
      intro: 'Fristen er om 2 minutter!', line: 'Kan du se på dette før lunsj?',
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
   * The looks are in js/figures.js (PLAYERS), in the same order.
   */
  characters: [
    { id: 'k1', name: 'Odyssefs', title: 'IT-avdelingen', startWeapon: 'powerCycle', bonus: { maxEnergy: 20 }, bonusText: '+20 maks energi' },
    { id: 'k2', name: 'Johannes', title: 'IT-avdelingen', startWeapon: 'toner', bonus: { help: 0.10 }, bonusText: '+10 % hjelp' },
    { id: 'k3', name: 'Jin', title: 'IT-avdelingen', startWeapon: 'hdmi', bonus: { speed: 0.10 }, bonusText: '+10 % bevegelseshastighet' },
    { id: 'k4', name: 'Julian', title: 'IT-avdelingen', startWeapon: 'mouse', bonus: { pick: 0.25 }, bonusText: '+25 % radius for å plukke opp ticket-lapper' },
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
  figureVariants: { junior: 42, printer: 42, senior: 42, urgent: 21, boss: 12, sender: 42 },

  /** How ordinary lawyers get tougher over time. */
  scaling: {
    /** Frustration is multiplied by this every minute (1.08 = +8 %, compounding). */
    frustrationGrowthPerMin: 1.09,
    /** The increase in frustration starts after this many minutes (calm start). */
    startAfterMin: 3,
    /** Increased damage per minute (0.06 = +6 %). */
    damagePerMin: 0.07,
    /** Increased speed per minute (0.025 = +2.5 %), so you can't outrun everything forever. */
    speedPerMin: 0.03,
    /** Highest speed increase (1.55 = +55 %). The juniors never get faster than the player. */
    speedMax: 1.55,
    /** After this minute («Overtid», "Overtime") everything rises steeply, with no cap. */
    overtimeFromMin: 13,
    /** In overtime, frustration and damage are additionally multiplied by this every minute. */
    overtimeGrowthPerMin: 1.6,
    /** In overtime the lawyers additionally get this much faster per minute (0.15 = +15 %), with no cap. */
    overtimeSpeedPerMin: 0.15,
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

  /** Max number of weapons and passives, and max level. */
  limits: { weapons: 4, passives: 8, weaponLevel: 12, passiveLevel: 5 },

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
   * WEAPONS (version 5). Each weapon has a "base" (the numbers at level 1) and "growth" rules that
   * generate every level up to CONFIG.limits.weaponLevel, so a weapon grows visibly on every level
   * (more mice in the ring, more cartridges per throw, longer chains …). buildLevels() at the bottom of
   * this file turns base + growth into the "levels" list the rest of the game reads.
   *
   * Growth rules per stat:  { add: n }  = +n per level,  { mul: f } = × f per level,
   *                         { at: [levels], add: n } = +n at exactly those levels,
   *                         { set: value, at: [level] } = set to a value at a level (e.g. back: true),
   *                         min/max = clamp.
   * help = how much frustration is removed per hit, interval = seconds between activations.
   * countName = what "count" is called on the upgrade card («+1 mus»).
   */
  weapons: {
    powerCycle: {
      name: 'Skru av og på',
      description: 'En puls rundt deg hjelper alle i nærheten.',
      base: { radius: 44, help: 11, interval: 1.0 },
      growth: { radius: { add: 3 }, help: { mul: 1.13 }, interval: { at: [3, 6, 9, 12], mul: 0.9, min: 0.6 } },
      combination: {
        passive: 'ram', name: 'Full omstart',
        text: 'Mye større puls som går raskere og skyver advokatene tilbake.',
        /** nudge = how far the lawyers are pushed per pulse. */
        stats: { radius: 95, help: 27, interval: 0.6, nudge: 4 },
      },
    },
    toner: {
      name: 'Toner-kast',
      description: 'Kaster tonerkassetter i en vifte mot nærmeste advokat. De sprekker og hjelper alle rundt.',
      countName: 'tonerkassett',
      base: { count: 2, splash: 28, help: 15, interval: 1.2, speed: 190, range: 190, spread: 0.35 },
      growth: { count: { at: [3, 6, 9, 12], add: 1 }, splash: { add: 1.5 }, help: { mul: 1.065 }, interval: { mul: 0.97 } },
      combination: {
        passive: 'paperTray', name: 'Kontorprinteren fra helvete',
        text: 'Kaster tonerkassetter i alle retninger samtidig, med stor sprut.',
        stats: { count: 10, splash: 42, help: 26, interval: 1.3, speed: 200, range: 210, spread: 0 },
      },
    },
    password: {
      name: 'Passord-reset',
      description: 'En nøkkel hopper fra advokat til advokat, som et kjedelyn.',
      /**
       * hops = how many lawyers the chain hits, range = max distance per hop, hopTime = seconds per hop,
       * reach = how far away the first lawyer can be.
       */
      base: { hops: 3, help: 24, interval: 1.05, range: 80, hopTime: 0.07, reach: 200 },
      growth: { hops: { add: 1 }, help: { mul: 1.07 }, range: { add: 1.5 } },
      combination: {
        passive: 'ssd', name: 'Tofaktor',
        text: 'To kjeder samtidig i hver sin retning, og hver kan hoppe til 20 advokater.',
        /** chains = number of chains at the same time. */
        stats: { hops: 20, chains: 2, help: 31, interval: 1.05, range: 92, hopTime: 0.06, reach: 230 },
      },
    },
    hdmi: {
      name: 'HDMI-kabelen',
      description: 'En kabel svinges i en bue mot nærmeste advokat og hjelper alle den treffer.',
      /** arc = width of the arc in radians (2.4 ≈ 140 degrees). back = also swings backward. */
      base: { lengthPx: 52, help: 18, interval: 1.0, arc: 2.4, back: false },
      growth: { lengthPx: { add: 3 }, help: { mul: 1.10 }, interval: { mul: 0.98 }, back: { set: true, at: [4] } },
      combination: {
        passive: 'extensionCord', name: 'Kabelkaos',
        text: 'Kabelen svinges i en full sirkel rundt deg.',
        stats: { lengthPx: 96, help: 41, interval: 0.85, arc: 6.2832, back: true },
      },
    },
    remote: {
      name: 'Fjernstyring',
      description: 'De nærmeste advokatene får hjelp via et glimt ovenfra.',
      base: { hits: 1, help: 20, interval: 1.6 },
      growth: { hits: { at: [2, 4, 6, 8, 10, 12], add: 1 }, help: { mul: 1.14 }, interval: { mul: 0.97 } },
      combination: {
        passive: 'admin', name: 'Domene-admin',
        text: 'Treffer mange advokater samtidig, med kort intervall.',
        stats: { hits: 12, help: 84, interval: 0.9 },
      },
    },
    mouse: {
      name: 'Trådløse mus',
      description: 'Mus kretser i en bane rundt deg og hjelper alle de treffer. Flere mus for hvert nivå.',
      countName: 'mus',
      /** track = distance from the player, rotation = radians per second, hitPause = seconds before the same lawyer can be hit again. */
      base: { count: 2, track: 40, rotation: 3.0, help: 12, hitPause: 0.45 },
      growth: { count: { at: [2, 4, 6, 8, 10, 12], add: 1 }, track: { add: 2 }, rotation: { add: 0.1 }, help: { mul: 1.12 } },
      combination: {
        passive: 'batteries', name: 'Musematta',
        text: 'Tolv mus suser så fort at de danner en nesten sammenhengende ring.',
        stats: { count: 12, track: 68, rotation: 6.5, help: 38, hitPause: 0.3 },
      },
    },
    ctrlz: {
      name: 'Ctrl+Z',
      description: 'En stor Ctrl+Z-tast kastes mot nærmeste advokat og kommer tilbake.',
      countName: 'tast',
      /** range = how far the key flies before it turns around. */
      base: { count: 1, range: 110, help: 14, interval: 1.6, speed: 220 },
      growth: { count: { at: [3, 6, 9, 12], add: 1 }, range: { add: 6 }, help: { mul: 1.07 }, interval: { mul: 0.97 }, speed: { add: 4 } },
      combination: {
        passive: 'shortcuts', name: 'Ctrl+Alt+Del',
        text: 'Flere taster går i en spiral ut og inn rundt deg.',
        /** radius = how far out the spiral goes, period = seconds out and in, rotation = radians per second. */
        stats: { count: 7, radius: 105, period: 2.4, rotation: 3.2, help: 37, hitPause: 0.4 },
      },
    },
    beam: {
      name: 'Oppdateringsstrålen',
      description: 'En lang fremdriftsindikator skyter ut som en stråle mot nærmeste advokat.',
      /** help is given every "tick" seconds while the beam lasts. pause = time between each beam. */
      base: { lengthPx: 130, width: 10, duration: 1.0, pause: 2.6, help: 10, tick: 0.2 },
      growth: { lengthPx: { add: 9 }, width: { add: 0.8 }, duration: { add: 0.05 }, pause: { mul: 0.95 }, help: { mul: 1.11 } },
      combination: {
        passive: 'certification', name: 'Tvungen oppdatering',
        text: 'To stråler sveiper sakte rundt deg hele tiden.',
        stats: { lengthPx: 215, width: 19, rotation: 0.9, help: 27, tick: 0.2 },
      },
    },
    teams: {
      name: 'Teams-varsel',
      description: 'Teams-varsler skytes ut og svinger seg mot hver sin advokat, nærmeste først.',
      countName: 'varsel',
      /** count = alerts per volley (each picks its own lawyer), turn = how sharply they steer (radians per second). */
      base: { count: 1, help: 26, interval: 1.4, speed: 200, turn: 7, reach: 240 },
      growth: { count: { at: [2, 4, 6, 8, 10, 12], add: 1 }, help: { mul: 1.12 }, interval: { mul: 0.975 }, speed: { add: 4 }, turn: { add: 0.1 }, reach: { add: 3 } },
      combination: {
        passive: 'dualMonitor', name: 'Allmøte på Teams',
        text: 'Hvert varsel deler seg i tre nye målsøkende varsler når det treffer.',
        /** split = new alerts on each hit (they do not split again). */
        stats: { count: 6, help: 76, interval: 0.95, speed: 240, turn: 8, reach: 280, split: 3 },
      },
    },
    angel: {
      name: 'Skytsengelen',
      description: 'En liten skytsengel svever rundt deg og kaster mini-printere som hjelper advokatene.',
      countName: 'mini-printer',
      /**
       * perThrow = mini printers per throw, max = max at the same time (fixed and the same for everyone),
       * life = seconds a mini printer lasts, help = help per paper burst, burst = seconds between bursts, radius = burst radius.
       */
      base: { perThrow: 1, max: 2, interval: 2.6, life: 4, help: 13, burst: 0.5, radius: 28 },
      growth: { perThrow: { at: [6, 12], add: 1 }, max: { at: [4, 8, 12], add: 1 }, interval: { mul: 0.96 }, help: { mul: 1.05 }, life: { add: 0.1 }, radius: { add: 1 } },
      combination: {
        passive: 'biggerCan', name: 'Himmelsk serviceavtale',
        text: 'Lysende glorie og større vinger: dobbelt så mange mini-printere, som avslutter med papirkonfetti.',
        /** confetti = help in the final burst of paper confetti, confettiRadius = its radius. */
        stats: { perThrow: 6, max: 10, interval: 1.6, life: 5, help: 12, burst: 0.5, radius: 34, confetti: 60, confettiRadius: 55 },
      },
    },
    headset: {
      name: 'Støydempende headset',
      description: 'Et skjold som blokkerer ett treff og sender ut en puls. Lades opp igjen.',
      /** charge = seconds before the shield is ready again, charges = hits it can take before recharging. */
      base: { charge: 20, pulseRadius: 50, help: 26, charges: 1 },
      growth: { charge: { mul: 0.92 }, pulseRadius: { add: 4 }, help: { mul: 1.1 }, charges: { at: [7], add: 1 } },
      combination: {
        passive: 'ergonomicChair', name: 'Hjemmekontor',
        text: 'Skjoldet blokkerer tre treff før det må lades, og pulsen blir mye større.',
        stats: { charge: 7, pulseRadius: 130, help: 96, charges: 3 },
      },
    },
  },

  /** Kept for older tools: all weapons now live in CONFIG.weapons. */
  newWeapons: {},

  /** The passives added in version 3. */
  newPassives: {
    dualMonitor: { name: 'Dobbel skjerm', value: 0.05, text: '+5 % sjanse for at et våpen aktiveres to ganger på rad.' },
    shortcuts: { name: 'Hurtigtaster', value: 0.12, text: '+12 % fart på prosjektiler, bumeranger og kjeder.' },
    ergonomicChair: { name: 'Ergonomisk stol', value: 0.06, text: '−6 % skade fra treff.' },
    certification: { name: 'Sertifisering', value: 0.08, text: '+8 % erfaring fra ticket-lapper.' },
  },

  /**
   * The passives added in version 5 (Brotato-style stats). All of them are shown on the stat sheet at level-up.
   * crit = chance that a hit gives critMult × help. regen = energy per second. dodge = chance that a hit misses.
   * luck = chance of a fourth card at level-up.
   */
  statPassives: {
    coffeeMachine: { name: 'Kaffemaskin', value: 0.05, text: '+5 % kritisk sjanse (kritiske treff gir ekstra hjelp).' },
    mechKeyboard: { name: 'Mekanisk tastatur', value: 0.25, text: '+25 % hjelp fra kritiske treff.' },
    overtime: { name: 'Overtid', value: 0.15, speedCost: 0.04, text: '+15 % hjelp på alle våpen, men −4 % bevegelseshastighet.' },
    standingDesk: { name: 'Hev-senk-pult', value: 0.35, text: '+0,35 energi per sekund i regenerering.' },
    firewall: { name: 'Brannmur', value: 0.06, max: 0.3, text: '+6 % sjanse for å unngå et treff helt.' },
    lottery: { name: 'Kontorlotteriet', value: 0.2, text: '+20 % sjanse for et fjerde kort ved hvert nivå.' },
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

// The passives from version 3 and 5 are merged with the original ones, so the rest of the game sees 18 passives.
Object.assign(CONFIG.weapons, CONFIG.newWeapons);
Object.assign(CONFIG.passives, CONFIG.newPassives, CONFIG.statPassives);

/** How each stat is described on the upgrade card when it grows. */
const STAT_TEXT = {
  help: (d) => `+${Math.round(d * 100)} % hjelp`,
  interval: () => 'kortere tid mellom hver aktivering',
  radius: () => 'større puls',
  splash: () => 'større tonersprut',
  track: () => 'større bane',
  rotation: () => 'raskere rotasjon',
  range: () => 'lengre rekkevidde',
  reach: () => 'lengre rekkevidde',
  lengthPx: () => 'lengre',
  width: () => 'bredere stråle',
  duration: () => 'varer lenger',
  pause: () => 'kortere pause',
  speed: () => 'raskere',
  turn: () => 'svinger skarpere',
  hops: (d) => `+${d} hopp`,
  hits: (d) => `+${d} treff`,
  chains: (d) => `+${d} kjede`,
  charge: () => 'raskere oppladning',
  pulseRadius: () => 'større puls',
  charges: (d) => `+${d} ladning`,
  life: () => 'mini-printerne varer lenger',
  max: (d) => `+${d} samtidig`,
  back: () => 'svinges både foran og bak',
};

/**
 * Builds the "levels" list for a weapon from base + growth. Level 1 = base. Each later level applies every
 * growth rule once (or only at the listed levels), and gets a card text that names what changed.
 */
function buildLevels(w) {
  const max = CONFIG.limits.weaponLevel;
  const levels = [];
  let prev = { ...w.base, text: w.description };
  levels.push(prev);
  for (let L = 2; L <= max; L++) {
    const cur = { ...prev };
    const changes = [];
    for (const [stat, rule] of Object.entries(w.growth)) {
      if (rule.at && !rule.at.includes(L)) continue;
      const before = cur[stat];
      if (rule.set !== undefined) cur[stat] = rule.set;
      else {
        let v = before;
        if (rule.add) v += rule.add;
        if (rule.mul) v *= rule.mul;
        if (rule.min !== undefined) v = Math.max(rule.min, v);
        if (rule.max !== undefined) v = Math.min(rule.max, v);
        cur[stat] = Math.round(v * 1000) / 1000;
      }
      if (cur[stat] !== before) {
        const d = typeof before === 'number' ? Math.round((cur[stat] - before) * 100) / 100 : 0;
        if (stat === 'count' || stat === 'perThrow') changes.push(`+${d} ${w.countName ?? 'prosjektil'}${d > 1 && w.countName !== 'mus' ? 'er' : ''}`);
        else if (stat === 'help') changes.push(STAT_TEXT.help(cur[stat] / before - 1));
        else if (STAT_TEXT[stat]) changes.push(STAT_TEXT[stat](d));
      }
    }
    const text = changes.length ? changes.join(', ') : 'litt bedre';
    cur.text = text.charAt(0).toUpperCase() + text.slice(1) + '.';
    levels.push(cur);
    prev = cur;
  }
  w.levels = levels;
}
for (const w of Object.values(CONFIG.weapons)) buildLevels(w);
// The sender uses the same fields as the other lawyer types.
/** @type {any} */ (CONFIG.enemies).sender = CONFIG.sender;

/** Speech bubbles for the «Haster!» ("Urgent!") sender. */
export const SENDER_BUBBLES = ['Sendte deg en mail!', 'Svarte du på mailen min?', 'HASTER!!!', 'Så du mailen?'];

/** Fixed time step in seconds. */
export const DT = 1 / CONFIG.ticksPerSecond;

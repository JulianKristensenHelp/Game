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
    junior: { name: 'Juniorfullmektig', from: 0, frustration: 10, speed: 48, radius: 7, damage: 8, points: 10, weight: 1 },
    senior: { name: 'Seniorpartner', from: 90, frustration: 80, speed: 30, radius: 10, damage: 14, points: 50, weight: 0.2 },
    printer: {
      name: 'Printerentusiast', from: 180, frustration: 35, speed: 44, radius: 8, damage: 10, points: 30, weight: 0.14,
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
      name: 'Hastesak', from: 60, frustration: 150, speed: 80, radius: 9, damage: 0, points: 1000,
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
      frustration: 850, speed: 28, radius: 20, damage: 8, points: 2500, deadline: 120,
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
      frustration: 2200, speed: 24, radius: 22, damage: 9, points: 4000, deadline: 120,
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
      frustration: 4400, speed: 27, radius: 20, damage: 11, points: 6000, deadline: 120,
      /** A fan of emails (the same as from version 3). */
      emails: { cooldown: 4, count: 3, spread: 0.3, damage: 0.5 },
    },
    johan: {
      name: 'Johan', short: 'JOHAN', title: 'SISTE BOSS: JOHAN',
      intro: 'SISTE BOSS: JOHAN', line: 'Har du et lite minutt?',
      phaseText: 'Johan tar av seg dressjakka', happyText: 'Bra jobba!',
      frustration: 6500, speed: 30, radius: 20, damage: 12, points: 15000, deadline: 150,
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
    name: '«Haster!»-avsender', from: 150, frustration: 30, speed: 40, radius: 7, damage: 9, points: 40,
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
    frustrationGrowthPerMin: 1.08,
    /** The increase in frustration starts after this many minutes (calm start). */
    startAfterMin: 3,
    /** Increased damage per minute (0.06 = +6 %). */
    damagePerMin: 0.06,
    /** Increased speed per minute (0.025 = +2.5 %), so you can't outrun everything forever. */
    speedPerMin: 0.025,
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
  level: { base: 20, perLevel: 13, square: 1.5 },

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
  limits: { weapons: 4, passives: 6, weaponLevel: 8, passiveLevel: 5 },

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
   * WEAPONS. Each line in "levels" holds the full numbers for that level (level 1 at the top).
   * help = how much frustration is removed per hit, interval = seconds between activations,
   * text = what is shown on the upgrade card.
   */
  weapons: {
    powerCycle: {
      name: 'Skru av og på',
      description: 'En puls rundt deg hjelper alle i nærheten.',
      levels: [
        { radius: 48, help: 12, interval: 1.0, text: 'En puls rundt deg hjelper alle i nærheten.' },
        { radius: 55, help: 12, interval: 1.0, text: 'Større radius på pulsen.' },
        { radius: 55, help: 17, interval: 1.0, text: 'Mer hjelp per puls.' },
        { radius: 55, help: 17, interval: 0.85, text: 'Kortere tid mellom hver puls.' },
        { radius: 63, help: 17, interval: 0.85, text: 'Større radius på pulsen.' },
        { radius: 63, help: 24, interval: 0.85, text: 'Mer hjelp per puls.' },
        { radius: 63, help: 24, interval: 0.7, text: 'Kortere tid mellom hver puls.' },
        { radius: 72, help: 32, interval: 0.7, text: 'Større radius og mer hjelp.' },
      ],
      combination: {
        passive: 'ram', name: 'Full omstart',
        text: 'Mye større puls som går raskere og skyver advokatene tilbake.',
        /** nudge = how far the lawyers are pushed per pulse. */
        stats: { radius: 85, help: 20, interval: 0.65, nudge: 4 },
      },
    },
    toner: {
      name: 'Toner-kast',
      description: 'Kaster tonerkassetter i en vifte dit du går. De sprekker og hjelper alle rundt.',
      levels: [
        { count: 3, splash: 30, help: 18, interval: 1.2, speed: 190, range: 190, spread: 0.35, text: 'Kaster tonerkassetter i en vifte dit du går. De sprekker og hjelper alle rundt.' },
        { count: 3, splash: 30, help: 18, interval: 1.1, speed: 190, range: 190, spread: 0.35, text: 'Kortere tid mellom hvert kast.' },
        { count: 3, splash: 34, help: 18, interval: 1.1, speed: 190, range: 190, spread: 0.35, text: 'Større tonersprut.' },
        { count: 3, splash: 34, help: 24, interval: 1.1, speed: 190, range: 190, spread: 0.35, text: 'Mer hjelp per kassett.' },
        { count: 4, splash: 34, help: 24, interval: 1.05, speed: 190, range: 190, spread: 0.35, text: '+1 tonerkassett per kast.' },
        { count: 4, splash: 39, help: 24, interval: 1.05, speed: 190, range: 190, spread: 0.35, text: 'Større tonersprut.' },
        { count: 4, splash: 39, help: 32, interval: 1.0, speed: 190, range: 190, spread: 0.35, text: 'Mer hjelp per kassett.' },
        { count: 5, splash: 39, help: 36, interval: 1.0, speed: 190, range: 190, spread: 0.35, text: '+1 tonerkassett og mer hjelp.' },
      ],
      combination: {
        passive: 'paperTray', name: 'Kontorprinteren fra helvete',
        text: 'Kaster tonerkassetter i alle retninger samtidig, med stor sprut.',
        stats: { count: 8, splash: 38, help: 24, interval: 1.4, speed: 200, range: 210, spread: 0 },
      },
    },
    password: {
      name: 'Passord-reset',
      description: 'En nøkkel hopper fra advokat til advokat, som et kjedelyn.',
      levels: [
        /**
         * hops = how many lawyers the chain hits, range = max distance per hop, hopTime = seconds per hop,
         * reach = how far away the first lawyer can be.
         */
        { hops: 3, help: 30, interval: 1.05, range: 80, hopTime: 0.07, reach: 200, text: 'En nøkkel hopper fra advokat til advokat, som et kjedelyn.' },
        { hops: 4, help: 30, interval: 1.05, range: 80, hopTime: 0.07, reach: 200, text: '+1 hopp.' },
        { hops: 5, help: 30, interval: 1.05, range: 80, hopTime: 0.07, reach: 200, text: '+1 hopp.' },
        { hops: 6, help: 33, interval: 1.05, range: 80, hopTime: 0.07, reach: 200, text: '+1 hopp og +10 % hjelp.' },
        { hops: 7, help: 33, interval: 1.05, range: 80, hopTime: 0.07, reach: 200, text: '+1 hopp.' },
        { hops: 8, help: 33, interval: 1.05, range: 80, hopTime: 0.07, reach: 200, text: '+1 hopp.' },
        { hops: 9, help: 33, interval: 1.05, range: 80, hopTime: 0.07, reach: 200, text: '+1 hopp.' },
        { hops: 10, help: 36, interval: 1.05, range: 80, hopTime: 0.07, reach: 200, text: '+1 hopp og +10 % hjelp.' },
      ],
      combination: {
        passive: 'ssd', name: 'Tofaktor',
        text: 'To kjeder samtidig i hver sin retning, og hver kan hoppe til 16 advokater.',
        /** chains = number of chains at the same time. */
        stats: { hops: 16, chains: 2, help: 22, interval: 1.05, range: 85, hopTime: 0.06, reach: 220 },
      },
    },
    hdmi: {
      name: 'HDMI-kabelen',
      description: 'En kabel svinges i en bue foran deg og hjelper alle den treffer.',
      levels: [
        /** arc = width of the arc in radians (2.1 ≈ 120 degrees). back = also swings backward. */
        { lengthPx: 54, help: 22, interval: 1.0, arc: 2.4, back: false, text: 'En kabel svinges i en bue foran deg og hjelper alle den treffer.' },
        { lengthPx: 58, help: 22, interval: 1.0, arc: 2.4, back: false, text: 'Lengre kabel.' },
        { lengthPx: 58, help: 26, interval: 1.25, arc: 2.1, back: false, text: 'Mer hjelp per sving.' },
        { lengthPx: 58, help: 26, interval: 1.25, arc: 2.1, back: true, text: 'Kabelen svinges både foran og bak.' },
        { lengthPx: 58, help: 26, interval: 1.05, arc: 2.1, back: true, text: 'Kortere tid mellom hver sving.' },
        { lengthPx: 68, help: 26, interval: 1.05, arc: 2.1, back: true, text: 'Lengre kabel.' },
        { lengthPx: 68, help: 38, interval: 1.05, arc: 2.1, back: true, text: 'Mer hjelp per sving.' },
        { lengthPx: 78, help: 48, interval: 0.9, arc: 2.1, back: true, text: 'Lengre kabel, mer hjelp og raskere sving.' },
      ],
      combination: {
        passive: 'extensionCord', name: 'Kabelkaos',
        text: 'Kabelen svinges i en full sirkel rundt deg.',
        stats: { lengthPx: 88, help: 30, interval: 0.9, arc: 6.2832, back: true },
      },
    },
    remote: {
      name: 'Fjernstyring',
      description: 'Tilfeldige advokater på skjermen får hjelp via et glimt ovenfra.',
      levels: [
        { hits: 1, help: 24, interval: 1.6, text: 'Tilfeldige advokater på skjermen får hjelp via et glimt ovenfra.' },
        { hits: 2, help: 24, interval: 1.6, text: '+1 treff per gang.' },
        { hits: 2, help: 34, interval: 1.6, text: 'Mer hjelp per treff.' },
        { hits: 2, help: 34, interval: 1.35, text: 'Kortere tid mellom hver gang.' },
        { hits: 3, help: 34, interval: 1.35, text: '+1 treff per gang.' },
        { hits: 3, help: 46, interval: 1.35, text: 'Mer hjelp per treff.' },
        { hits: 4, help: 46, interval: 1.15, text: '+1 treff og kortere intervall.' },
        { hits: 6, help: 60, interval: 1.15, text: '+2 treff og mer hjelp.' },
      ],
      combination: {
        passive: 'admin', name: 'Domene-admin',
        text: 'Treffer mange advokater samtidig, med kort intervall.',
        stats: { hits: 9, help: 60, interval: 0.9 },
      },
    },
    mouse: {
      name: 'Trådløse mus',
      description: 'Mus kretser i en bane rundt deg og hjelper alle de treffer.',
      levels: [
        /** track = distance from the player, rotation = radians per second, hitPause = seconds before the same lawyer can be hit again. */
        { count: 3, track: 40, rotation: 3.0, help: 13, hitPause: 0.45, text: 'Mus kretser i en bane rundt deg og hjelper alle de treffer.' },
        { count: 3, track: 48, rotation: 3.0, help: 13, hitPause: 0.45, text: 'Større bane.' },
        { count: 3, track: 55, rotation: 2.6, help: 9, hitPause: 0.45, text: 'Større bane.' },
        { count: 3, track: 55, rotation: 3.3, help: 9, hitPause: 0.45, text: 'Raskere rotasjon.' },
        { count: 4, track: 55, rotation: 3.3, help: 12, hitPause: 0.45, text: '+1 mus og mer hjelp.' },
        { count: 4, track: 62, rotation: 3.3, help: 12, hitPause: 0.45, text: 'Større bane.' },
        { count: 4, track: 62, rotation: 4.0, help: 15, hitPause: 0.45, text: 'Raskere rotasjon og mer hjelp.' },
        { count: 6, track: 62, rotation: 4.0, help: 19, hitPause: 0.45, text: '+2 mus og mer hjelp.' },
      ],
      combination: {
        passive: 'batteries', name: 'Musematta',
        text: 'Musene suser så fort at de danner en nesten sammenhengende ring.',
        stats: { count: 10, track: 66, rotation: 6.5, help: 21, hitPause: 0.3 },
      },
    },
  },

  /** The four new IT solutions (added in version 3). Same structure as the weapons above. */
  newWeapons: {
    ctrlz: {
      name: 'Ctrl+Z',
      description: 'En stor Ctrl+Z-tast kastes mot nærmeste advokat og kommer tilbake.',
      levels: [
        /** range = how far the key flies before it turns around. */
        { count: 1, range: 110, help: 16, interval: 1.6, speed: 220, text: 'En stor Ctrl+Z-tast kastes mot nærmeste advokat og kommer tilbake.' },
        { count: 1, range: 125, help: 16, interval: 1.5, speed: 220, text: 'Lengre rekkevidde.' },
        { count: 2, range: 125, help: 16, interval: 1.5, speed: 220, text: '+1 tast.' },
        { count: 2, range: 140, help: 22, interval: 1.4, speed: 220, text: 'Lengre rekkevidde og mer hjelp.' },
        { count: 2, range: 140, help: 22, interval: 1.3, speed: 230, text: 'Kortere tid mellom hvert kast.' },
        { count: 3, range: 150, help: 22, interval: 1.3, speed: 230, text: '+1 tast.' },
        { count: 3, range: 160, help: 24, interval: 1.2, speed: 240, text: 'Mer hjelp og lengre rekkevidde.' },
        { count: 3, range: 170, help: 28, interval: 1.1, speed: 250, text: 'Mer hjelp, raskere kast.' },
      ],
      combination: {
        passive: 'shortcuts', name: 'Ctrl+Alt+Del',
        text: 'Flere taster går i en spiral ut og inn rundt deg.',
        /** radius = how far out the spiral goes, period = seconds out and in, rotation = radians per second. */
        stats: { count: 5, radius: 100, period: 2.4, rotation: 3, help: 30, hitPause: 0.4 },
      },
    },
    beam: {
      name: 'Oppdateringsstrålen',
      description: 'En lang fremdriftsindikator skyter ut som en stråle dit du går.',
      levels: [
        /** help is given every "tick" seconds while the beam lasts. pause = time between each beam. */
        { lengthPx: 140, width: 10, duration: 1.0, pause: 2.6, help: 11, tick: 0.2, text: 'En lang fremdriftsindikator skyter ut som en stråle dit du går.' },
        { lengthPx: 155, width: 10, duration: 1.0, pause: 2.5, help: 12, tick: 0.2, text: 'Lengre stråle.' },
        { lengthPx: 155, width: 12, duration: 1.1, pause: 2.4, help: 12, tick: 0.2, text: 'Bredere stråle som varer lenger.' },
        { lengthPx: 170, width: 12, duration: 1.1, pause: 2.2, help: 15, tick: 0.2, text: 'Lengre stråle og mer hjelp.' },
        { lengthPx: 170, width: 14, duration: 1.2, pause: 2.0, help: 16, tick: 0.2, text: 'Bredere stråle, kortere pause.' },
        { lengthPx: 190, width: 14, duration: 1.3, pause: 1.8, help: 18, tick: 0.2, text: 'Lengre stråle som varer lenger.' },
        { lengthPx: 200, width: 16, duration: 1.4, pause: 1.6, help: 21, tick: 0.2, text: 'Bredere stråle og mer hjelp.' },
        { lengthPx: 220, width: 18, duration: 1.5, pause: 1.4, help: 24, tick: 0.2, text: 'Lengst og bredest, kortest pause.' },
      ],
      combination: {
        passive: 'certification', name: 'Tvungen oppdatering',
        text: 'To stråler sveiper sakte rundt deg hele tiden.',
        stats: { lengthPx: 200, width: 18, rotation: 0.9, help: 14, tick: 0.2 },
      },
    },
    teams: {
      name: 'Teams-varsel',
      description: 'Teams-varsler skytes ut og svinger seg mot hver sin advokat.',
      levels: [
        /** count = alerts per volley (each picks its own lawyer), turn = how sharply they steer (radians per second). */
        { count: 1, help: 32, interval: 1.4, speed: 200, turn: 7, reach: 240, text: 'Teams-varsler skytes ut og svinger seg mot hver sin advokat.' },
        { count: 2, help: 32, interval: 1.4, speed: 200, turn: 7, reach: 240, text: '+1 varsel.' },
        { count: 2, help: 40, interval: 1.3, speed: 210, turn: 7, reach: 240, text: 'Mer hjelp og kortere intervall.' },
        { count: 3, help: 40, interval: 1.3, speed: 210, turn: 7.5, reach: 250, text: '+1 varsel.' },
        { count: 3, help: 48, interval: 1.2, speed: 220, turn: 7.5, reach: 250, text: 'Mer hjelp og kortere intervall.' },
        { count: 4, help: 48, interval: 1.15, speed: 220, turn: 8, reach: 260, text: '+1 varsel.' },
        { count: 4, help: 56, interval: 1.05, speed: 230, turn: 8, reach: 260, text: 'Mer hjelp og kortere intervall.' },
        { count: 5, help: 62, interval: 1.0, speed: 240, turn: 8, reach: 270, text: '+1 varsel og mer hjelp.' },
      ],
      combination: {
        passive: 'dualMonitor', name: 'Allmøte på Teams',
        text: 'Hvert varsel deler seg i tre nye målsøkende varsler når det treffer.',
        /** split = new alerts on each hit (they do not split again). */
        stats: { count: 4, help: 70, interval: 0.95, speed: 240, turn: 8, reach: 270, split: 3 },
      },
    },
    angel: {
      name: 'Skytsengelen',
      description: 'En liten skytsengel svever rundt deg og kaster mini-printere som hjelper advokatene.',
      levels: [
        /**
         * perThrow = mini printers per throw, max = max at the same time (fixed and the same for everyone),
         * life = seconds a mini printer lasts, help = help per paper burst, burst = seconds between bursts, radius = burst radius.
         */
        { perThrow: 1, max: 2, interval: 2.6, life: 4, help: 15, burst: 0.5, radius: 30, text: 'En liten skytsengel svever rundt deg og kaster mini-printere som hjelper advokatene.' },
        { perThrow: 1, max: 2, interval: 2.6, life: 4, help: 17.25, burst: 0.5, radius: 30, text: '+15 % hjelp.' },
        { perThrow: 1, max: 2, interval: 2.1, life: 4, help: 17.25, burst: 0.5, radius: 30, text: 'Kaster oftere.' },
        { perThrow: 2, max: 4, interval: 2.1, life: 4, help: 17.25, burst: 0.5, radius: 30, text: '2 mini-printere per kast, maks 4 samtidig.' },
        { perThrow: 2, max: 4, interval: 2.1, life: 5, help: 17.25, burst: 0.5, radius: 30, text: 'Mini-printerne varer 1 sekund lenger.' },
        { perThrow: 2, max: 4, interval: 2.1, life: 5, help: 19.84, burst: 0.5, radius: 30, text: '+15 % hjelp.' },
        { perThrow: 2, max: 4, interval: 1.7, life: 5, help: 19.84, burst: 0.5, radius: 30, text: 'Kaster oftere.' },
        { perThrow: 3, max: 6, interval: 1.7, life: 5, help: 19.84, burst: 0.5, radius: 30, text: '3 mini-printere per kast, maks 6 samtidig.' },
      ],
      combination: {
        passive: 'biggerCan', name: 'Himmelsk serviceavtale',
        text: 'Lysende glorie og større vinger: dobbelt så mange mini-printere, som avslutter med papirkonfetti.',
        /** confetti = help in the final burst of paper confetti, confettiRadius = its radius. */
        stats: { perThrow: 6, max: 10, interval: 1.7, life: 5, help: 10, burst: 0.5, radius: 30, confetti: 40, confettiRadius: 50 },
      },
    },
    headset: {
      name: 'Støydempende headset',
      description: 'Et skjold som blokkerer ett treff og sender ut en puls. Lades opp igjen.',
      levels: [
        /** charge = seconds before the shield is ready again, charges = hits it can take before recharging. */
        { charge: 20, pulseRadius: 50, help: 30, charges: 1, text: 'Et skjold som blokkerer ett treff og sender ut en puls. Lades opp igjen.' },
        { charge: 18.5, pulseRadius: 55, help: 35, charges: 1, text: 'Raskere oppladning, større puls.' },
        { charge: 17, pulseRadius: 60, help: 40, charges: 1, text: 'Raskere oppladning, mer hjelp.' },
        { charge: 15, pulseRadius: 65, help: 45, charges: 1, text: 'Raskere oppladning.' },
        { charge: 13.5, pulseRadius: 70, help: 52, charges: 1, text: 'Større puls og mer hjelp.' },
        { charge: 12, pulseRadius: 75, help: 60, charges: 1, text: 'Raskere oppladning.' },
        { charge: 10, pulseRadius: 82, help: 70, charges: 1, text: 'Raskere oppladning, større puls.' },
        { charge: 8, pulseRadius: 90, help: 80, charges: 1, text: 'Lades på 8 sekunder.' },
      ],
      combination: {
        passive: 'ergonomicChair', name: 'Hjemmekontor',
        text: 'Skjoldet blokkerer to treff før det må lades, og pulsen blir mye større.',
        stats: { charge: 9, pulseRadius: 130, help: 80, charges: 2 },
      },
    },
  },

  /** The four new passives (added in version 3). */
  newPassives: {
    dualMonitor: { name: 'Dobbel skjerm', value: 0.05, text: '+5 % sjanse for at et våpen aktiveres to ganger på rad.' },
    shortcuts: { name: 'Hurtigtaster', value: 0.12, text: '+12 % fart på prosjektiler, bumeranger og kjeder.' },
    ergonomicChair: { name: 'Ergonomisk stol', value: 0.06, text: '−6 % skade fra treff.' },
    certification: { name: 'Sertifisering', value: 0.08, text: '+8 % erfaring fra ticket-lapper.' },
  },

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
    maxPointsPerSecond: 5000,
    /** Max lawyers helped per second survived. */
    maxHelpedPerSecond: 50,
    /** Max submissions per minute from the same address (generous, in case a whole household shares an address behind a proxy). */
    maxSubmissionsPerMinute: 30,
    /** Number shown. */
    show: 20,
  },
};

// The new weapons and passives are merged with the old ones, so the rest of the game sees 10 weapons and 12 passives.
Object.assign(CONFIG.weapons, CONFIG.newWeapons);
Object.assign(CONFIG.passives, CONFIG.newPassives);
// The sender uses the same fields as the other lawyer types.
/** @type {any} */ (CONFIG.enemies).sender = CONFIG.sender;

/** Speech bubbles for the «Haster!» ("Urgent!") sender. */
export const SENDER_BUBBLES = ['Sendte deg en mail!', 'Svarte du på mailen min?', 'HASTER!!!', 'Så du mailen?'];

/** Fixed time step in seconds. */
export const DT = 1 / CONFIG.ticksPerSecond;

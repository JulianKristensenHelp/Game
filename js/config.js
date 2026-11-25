// @ts-check
/**
 * KONFIGURASJON – alle balansetall i spillet ligger her.
 *
 * Du trenger ikke kunne programmere for å justere balansen:
 * endre et tall, lagre filen og last siden på nytt.
 * Avstander er i logiske piksler (skjermen viser 640 × 360, spilleren er ca. 32 piksler høy),
 * tider er i sekunder, og fart er piksler per sekund.
 */
export const CONFIG = {
  /** Antall logikk-oppdateringer per sekund (fast tidssteg). Bør ikke endres. */
  tikkPerSekund: 60,
  /** Maks logikk-oppdateringer per bilde. Hindrer at en treg maskin henger seg opp mer og mer. */
  maksTikkPerBilde: 4,

  /** Hvor mye av kartet alle ser. Likt for alle skjermer (resten fylles med ramme). */
  visning: { bredde: 640, hoeyde: 360 },

  /** Kartet: én kontoretasje med yttervegger. Sonene er beskrevet i js/kart.js. */
  kart: {
    bredde: 2560,
    hoeyde: 1440,
    /** Tykkelse på ytterveggene (toppveggen er høyere fordi vi ser veggflaten). */
    vegg: { venstre: 16, hoeyre: 16, topp: 40, bunn: 16 },
  },

  spiller: {
    /** Bevegelseshastighet. */
    fart: 95,
    /** Kollisjonsradius. */
    radius: 7,
    /** Energi ved start. */
    startEnergi: 100,
    /** Sekunder usårbar etter et treff. */
    usaarbarTid: 0.5,
    /** Radius for å plukke opp ticket-lapper. */
    plukkRadius: 30,
    /** Hvor fort lapper flyr mot spilleren når de er innenfor radiusen. */
    lappFart: 280,
  },

  /** Energidrikk ligger på kartet og må hentes. Den dropper aldri fra advokater eller bosser. */
  energidrikk: {
    /** Energi som fylles opp. */
    fyll: 30,
    /** Sukkerkick: ekstra fart (0.30 = +30 %). */
    kickFart: 0.3,
    /** Sukkerkick: varighet i sekunder. */
    kickTid: 5,
    /** Når den første boksen dukker opp, og tiden mellom hver ny boks. Øker ikke i senere faser. */
    forste: 30,
    intervall: 35,
    /** Maks antall bokser på kartet samtidig. */
    maks: 3,
    /** En ny boks dukker opp minst så langt unna spilleren (960 = 1,5 skjermbredder). */
    minAvstand: 960,
    /** Hvor mange faste kandidatplasser som trekkes for hver boks (den første som er langt nok unna velges). */
    kandidater: 12,
    /** Avstand fra veggene. */
    veggMarg: 48,
  },

  nyPc: {
    /** Sjanse for drop per fornøyd advokat (bosser gir alltid én). */
    dropSjanse: 1 / 1500,
    /** Hjelp som gis til bosser og hastesaker i stedet for å gjøre dem glade direkte. */
    hjelpTilSpesielle: 700,
  },

  /**
   * Advokattyper. frustrasjon = «liv», skade = energi spilleren mister ved berøring,
   * poeng = verdi på ticket-lappen (og erfaring), vekt = hvor ofte typen velges, fra = sekunder.
   */
  fiender: {
    junior: { navn: 'Juniorfullmektig', fra: 0, frustrasjon: 10, fart: 48, radius: 7, skade: 8, poeng: 10, vekt: 1 },
    senior: { navn: 'Seniorpartner', fra: 90, frustrasjon: 80, fart: 30, radius: 10, skade: 14, poeng: 50, vekt: 0.2 },
    printer: {
      navn: 'Printerentusiast', fra: 180, frustrasjon: 35, fart: 44, radius: 8, skade: 10, poeng: 30, vekt: 0.14,
      /** Sekunder mellom hver papirhaug. */
      papirIntervall: 2.6,
      /** Hvor lenge en papirhaug blir liggende. */
      papirLevetid: 8,
      /** Maks antall papirhauger samtidig. */
      papirMaks: 15,
      /** Radius på papirhaugen. */
      papirRadius: 13,
      /** Hvor mye haugen sinker spilleren (0.4 = 40 %). */
      papirSinking: 0.4,
    },
    hastesak: {
      navn: 'Hastesak', fra: 60, frustrasjon: 150, fart: 80, radius: 9, skade: 0, poeng: 1000,
      /** Sekunder mellom hver hastesak (tilfeldig mellom min og maks). */
      intervallMin: 45, intervallMaks: 60,
      /** Sekunder før den forsvinner av seg selv. */
      levetid: 20,
      /** Hvor langt unna spilleren den dukker opp. */
      startAvstand: 215,
      /** Er den lenger unna enn dette, løper den saktere så den kan tas igjen. */
      saktAvstand: 260, saktFaktor: 0.35,
    },
    boss: {
      navn: 'Fristen er om 2 minutter!', frustrasjon: 1500, fart: 26, radius: 20, skade: 20, poeng: 2500,
      /** Første boss og tid mellom hver boss. */
      forste: 180, intervall: 180,
      /** Nedtelling i sekunder. */
      frist: 90,
      /** Økning per boss. */
      frustrasjonPerBoss: 1.6, poengPerBoss: 1.5,
      /** Fart når bossen går sint ut av skjermen. */
      gaarFart: 85,
    },
  },

  /**
   * De fire spillbare karakterene (IT-avdelingen). Navn og tittel fylles inn av oppdragsgiver.
   * startVaapen = våpenet karakteren starter med (teller som én av fire plasser).
   * bonus: maksEnergi (+energi), hjelp (+andel), fart (+andel), plukk (+andel radius for lapper).
   * Utseendet står i js/figurer.js (SPILLERE), i samme rekkefølge.
   */
  karakterer: [
    { id: 'k1', navn: 'Odyssefs', tittel: 'IT-avdelingen', startVaapen: 'avpaa', bonus: { maksEnergi: 20 }, bonusTekst: '+20 maks energi' },
    { id: 'k2', navn: 'Johannes', tittel: 'IT-avdelingen', startVaapen: 'toner', bonus: { hjelp: 0.10 }, bonusTekst: '+10 % hjelp' },
    { id: 'k3', navn: 'Jin', tittel: 'IT-avdelingen', startVaapen: 'hdmi', bonus: { fart: 0.10 }, bonusTekst: '+10 % bevegelseshastighet' },
    { id: 'k4', navn: 'Julian', tittel: 'IT-avdelingen', startVaapen: 'mus', bonus: { plukk: 0.25 }, bonusTekst: '+25 % radius for å plukke opp ticket-lapper' },
  ],

  /** «Haster!»-avsenderen: holder avstand og sender e-poster («Haster!!!») mot spilleren. */
  avsender: {
    navn: '«Haster!»-avsender', fra: 150, frustrasjon: 30, fart: 40, radius: 7, skade: 9, poeng: 40,
    /** Hvor ofte typen velges (andel av vekten til en juniorfullmektig). */
    vekt: 0.25,
    /** Tak: maks andel av de aktive advokatene, og maks antall samtidig. */
    maksAndel: 0.15, maksAntall: 30,
    /** Prøver å holde seg mellom disse avstandene fra spilleren. */
    avstandMin: 150, avstandMaks: 200,
    /** Sekunder mellom hver e-post (blir litt raskere med tiden, men aldri under minimum). */
    skuddIntervall: 3, skuddRaskerePerMin: 0.04, skuddIntervallMin: 1.8,
    /** Sekunder med varsel (laptopen lyser og «!» over hodet) før hver e-post. */
    varsel: 0.5,
  },

  /** E-postene («fiendeskudd») fra avsendere og bosser. */
  fiendeSkudd: {
    /** Fart (ca. 60 % av spillerens fart, så man kan gå unna). */
    fart: 57,
    /** Sekunder før en e-post forsvinner av seg selv. */
    levetid: 4,
    /** Treffradius. */
    radius: 4,
    /** Maks antall på kartet samtidig. Når taket er nådd, venter avsenderne. */
    maks: 60,
  },

  /** Bossen sender en vifte med e-poster fra og med denne bossen (3 = den tredje). */
  bossSkudd: { fraBoss: 3, intervall: 4, antall: 3, spredning: 0.3 },

  /** Hvor mange forskjellige utseender hver type har (bare kosmetisk). */
  figurVarianter: { junior: 42, printer: 42, senior: 42, hastesak: 21, boss: 12, avsender: 42 },

  /** Hvordan vanlige advokater blir tøffere med tiden. */
  skalering: {
    /** Frustrasjonen ganges med dette for hvert minutt (1.08 = +8 % oppå hverandre). */
    frustrasjonVekstPerMin: 1.08,
    /** Økningen i frustrasjon starter etter så mange minutter (rolig start). */
    startEtterMin: 3,
    /** Økt skade per minutt (0.06 = +6 %). */
    skadePerMin: 0.06,
    /** Økt fart per minutt (0.025 = +2,5 %), så man ikke kan løpe fra alt for alltid. */
    fartPerMin: 0.025,
    /** Høyeste fartsøkning (1.55 = +55 %). Juniorene blir aldri raskere enn spilleren. */
    fartMaks: 1.55,
    /** Etter dette minuttet («Overtid») øker alt bratt, uten tak. */
    overtidFraMin: 13,
    /** I overtid ganges frustrasjon og skade i tillegg med dette for hvert minutt. */
    overtidVekstPerMin: 1.6,
    /** I overtid blir advokatene i tillegg så mye raskere per minutt (0.15 = +15 %), uten tak. */
    overtidFartPerMin: 0.15,
  },

  spawn: {
    /** Advokater per sekund som [tid i sekunder, antall per sekund]. Mellom punktene glir verdien jevnt. */
    rate: [[0, 0.5], [30, 0.8], [90, 1.7], [300, 5], [600, 13], [900, 22]],
    /** Økning i advokater per sekund for hvert minutt etter siste punkt. */
    overtidPerMin: 4,
    /** Maks antall aktive advokater (fast og likt for alle). */
    maksSamtidige: 400,
    /**
     * Når taket er nådd, «spares» advokatene som skulle kommet, og de neste blir sterkere i stedet.
     * styrkePerSpart = ekstra frustrasjon per sparte advokat, maksSpart = tak per advokat.
     */
    styrkePerSpart: 0.5, skadePerSpart: 0.2, maksSpart: 4,
    /** Advokater dukker opp utenfor synsfeltet, mellom disse avstandene fra spilleren. */
    minAvstand: 380, maksAvstand: 560,
    /** Aldri nærmere spilleren enn dette (gjelder også dører og heiser). */
    absoluttMin: 260,
    /** Antall forsøk på å finne en ledig plass før dører/heiser brukes. */
    forsoek: 8,
  },

  /** Bølgehendelser: flokk fra én retning eller ring rundt spilleren. */
  boelger: {
    forste: 45,
    intervallMin: 25, intervallMaks: 40,
    /** Flokk: antall = start + perMin × minutter (maks «maks»). */
    flokkStart: 10, flokkPerMin: 4, flokkMaks: 60,
    /** Ring: tidligst fra dette sekundet, og sjansen for at en bølge blir en ring. */
    ringFra: 120, ringSjanse: 0.4,
    ringStart: 20, ringPerMin: 3, ringMaks: 60,
    ringRadius: 370,
    /** Åpningen i ringen, i radianer (0.9 ≈ 50 grader). */
    ringAapning: 0.9,
  },

  /** Fasene vises som tekst ved bytte. */
  faser: [
    { fra: 0, navn: 'Morgenkaffe' },
    { fra: 90, navn: 'Formiddagen' },
    { fra: 300, navn: 'Etter lunsj' },
    { fra: 600, navn: 'Fredag ettermiddag' },
    { fra: 780, navn: 'Overtid' },
  ],

  lapper: {
    /** Sekunder en ticket-lapp ligger. */
    levetid: 10,
    /** De siste sekundene blinker lappen. */
    blinkTid: 3,
    /** Over dette antallet slås nærliggende lapper sammen. */
    maks: 400,
    /** Rutestørrelse ved sammenslåing. */
    slaaSammenCelle: 35,
  },

  /** Erfaring som kreves for neste nivå = base + perNivaa × nivå + kvadrat × nivå². */
  nivaa: { base: 20, perNivaa: 13, kvadrat: 1.5 },

  multiplikator: {
    start: 1.0,
    /** Økning per steg. */
    steg: 0.1,
    /** Antall hjulpne advokater uten å bli truffet for hvert steg. */
    perHjulpne: 25,
    maks: 5.0,
  },

  /** Poeng for «Kaffepause-bonus» når alt er maksert. */
  kaffepauseBonus: 500,

  /** Maks antall våpen og passive, og maksnivå. */
  grenser: { vaapen: 4, passiver: 6, vaapenNivaa: 8, passivNivaa: 5 },

  /** Maks antall prosjektiler i lufta per våpen (ytelse). */
  maksProsjektilerPerVaapen: 60,

  /** Glade advokater: smil og tommel opp, så en liten piksel-sky. */
  glad: {
    /** Sekunder med smil og tommel opp. */
    smil: 0.3,
    /** Total tid før figuren er helt borte. */
    varighet: 0.5,
    /** Blir flere enn dette glade samtidig (f.eks. Ny PC), forkortes animasjonen. */
    mangeSamtidig: 60,
    /** Forkortet: smil og total tid. */
    kortSmil: 0.15, kortVarighet: 0.25,
  },

  /**
   * VÅPEN. Hver linje i «nivaaer» er de fulle tallene for det nivået (nivå 1 øverst).
   * hjelp = hvor mye frustrasjon som fjernes per treff, intervall = sekunder mellom aktiveringer,
   * tekst = det som står på oppgraderingskortet.
   */
  vaapen: {
    avpaa: {
      navn: 'Skru av og på',
      beskrivelse: 'En puls rundt deg hjelper alle i nærheten.',
      nivaaer: [
        { radius: 48, hjelp: 12, intervall: 1.0, tekst: 'En puls rundt deg hjelper alle i nærheten.' },
        { radius: 55, hjelp: 12, intervall: 1.0, tekst: 'Større radius på pulsen.' },
        { radius: 55, hjelp: 17, intervall: 1.0, tekst: 'Mer hjelp per puls.' },
        { radius: 55, hjelp: 17, intervall: 0.85, tekst: 'Kortere tid mellom hver puls.' },
        { radius: 63, hjelp: 17, intervall: 0.85, tekst: 'Større radius på pulsen.' },
        { radius: 63, hjelp: 24, intervall: 0.85, tekst: 'Mer hjelp per puls.' },
        { radius: 63, hjelp: 24, intervall: 0.7, tekst: 'Kortere tid mellom hver puls.' },
        { radius: 72, hjelp: 32, intervall: 0.7, tekst: 'Større radius og mer hjelp.' },
      ],
      kombinasjon: {
        passiv: 'ram', navn: 'Full omstart',
        tekst: 'Mye større puls som går raskere og skyver advokatene tilbake.',
        /** dytt = hvor langt advokatene skyves per puls. */
        tall: { radius: 85, hjelp: 20, intervall: 0.65, dytt: 4 },
      },
    },
    toner: {
      navn: 'Toner-kast',
      beskrivelse: 'Kaster tonerkassetter i en vifte dit du går. De sprekker og hjelper alle rundt.',
      nivaaer: [
        { antall: 3, sprut: 30, hjelp: 18, intervall: 1.2, fart: 190, rekkevidde: 190, spredning: 0.35, tekst: 'Kaster tonerkassetter i en vifte dit du går. De sprekker og hjelper alle rundt.' },
        { antall: 3, sprut: 30, hjelp: 18, intervall: 1.1, fart: 190, rekkevidde: 190, spredning: 0.35, tekst: 'Kortere tid mellom hvert kast.' },
        { antall: 3, sprut: 34, hjelp: 18, intervall: 1.1, fart: 190, rekkevidde: 190, spredning: 0.35, tekst: 'Større tonersprut.' },
        { antall: 3, sprut: 34, hjelp: 24, intervall: 1.1, fart: 190, rekkevidde: 190, spredning: 0.35, tekst: 'Mer hjelp per kassett.' },
        { antall: 4, sprut: 34, hjelp: 24, intervall: 1.05, fart: 190, rekkevidde: 190, spredning: 0.35, tekst: '+1 tonerkassett per kast.' },
        { antall: 4, sprut: 39, hjelp: 24, intervall: 1.05, fart: 190, rekkevidde: 190, spredning: 0.35, tekst: 'Større tonersprut.' },
        { antall: 4, sprut: 39, hjelp: 32, intervall: 1.0, fart: 190, rekkevidde: 190, spredning: 0.35, tekst: 'Mer hjelp per kassett.' },
        { antall: 5, sprut: 39, hjelp: 36, intervall: 1.0, fart: 190, rekkevidde: 190, spredning: 0.35, tekst: '+1 tonerkassett og mer hjelp.' },
      ],
      kombinasjon: {
        passiv: 'papir', navn: 'Kontorprinteren fra helvete',
        tekst: 'Kaster tonerkassetter i alle retninger samtidig, med stor sprut.',
        tall: { antall: 8, sprut: 38, hjelp: 24, intervall: 1.4, fart: 200, rekkevidde: 210, spredning: 0 },
      },
    },
    passord: {
      navn: 'Passord-reset',
      beskrivelse: 'Nøkler flyr rett fram dit du går, gjennom flere advokater.',
      nivaaer: [
        { antall: 1, gjennom: 3, hjelp: 11, intervall: 1.0, fart: 280, rekkevidde: 310, tekst: 'Nøkler flyr rett fram dit du går, gjennom flere advokater.' },
        { antall: 2, gjennom: 3, hjelp: 11, intervall: 1.0, fart: 280, rekkevidde: 310, tekst: '+1 nøkkel.' },
        { antall: 2, gjennom: 5, hjelp: 11, intervall: 1.0, fart: 280, rekkevidde: 310, tekst: 'Nøklene går gjennom 2 flere advokater.' },
        { antall: 2, gjennom: 5, hjelp: 15, intervall: 1.0, fart: 340, rekkevidde: 330, tekst: 'Raskere nøkler og mer hjelp.' },
        { antall: 3, gjennom: 5, hjelp: 15, intervall: 0.95, fart: 340, rekkevidde: 330, tekst: '+1 nøkkel.' },
        { antall: 3, gjennom: 8, hjelp: 15, intervall: 0.95, fart: 340, rekkevidde: 330, tekst: 'Nøklene går gjennom 3 flere advokater.' },
        { antall: 3, gjennom: 8, hjelp: 21, intervall: 0.9, fart: 390, rekkevidde: 350, tekst: 'Raskere nøkler og mer hjelp.' },
        { antall: 4, gjennom: 10, hjelp: 26, intervall: 0.85, fart: 390, rekkevidde: 350, tekst: '+1 nøkkel og mer hjelp.' },
      ],
      kombinasjon: {
        passiv: 'ssd', navn: 'Tofaktor',
        tekst: 'Dobbelt så mange nøkler, og de stopper aldri før de forlater skjermen.',
        /** gjennom: 99999 = stopper aldri. antall er allerede doblet. */
        tall: { antall: 6, gjennom: 99999, hjelp: 30, intervall: 0.9, fart: 410, rekkevidde: 9999 },
      },
    },
    hdmi: {
      navn: 'HDMI-kabelen',
      beskrivelse: 'En kabel svinges i en bue foran deg og hjelper alle den treffer.',
      nivaaer: [
        /** bue = buens bredde i radianer (2.1 ≈ 120 grader). bak = svinges også bak. */
        { lengde: 54, hjelp: 22, intervall: 1.0, bue: 2.4, bak: false, tekst: 'En kabel svinges i en bue foran deg og hjelper alle den treffer.' },
        { lengde: 58, hjelp: 22, intervall: 1.0, bue: 2.4, bak: false, tekst: 'Lengre kabel.' },
        { lengde: 58, hjelp: 26, intervall: 1.25, bue: 2.1, bak: false, tekst: 'Mer hjelp per sving.' },
        { lengde: 58, hjelp: 26, intervall: 1.25, bue: 2.1, bak: true, tekst: 'Kabelen svinges både foran og bak.' },
        { lengde: 58, hjelp: 26, intervall: 1.05, bue: 2.1, bak: true, tekst: 'Kortere tid mellom hver sving.' },
        { lengde: 68, hjelp: 26, intervall: 1.05, bue: 2.1, bak: true, tekst: 'Lengre kabel.' },
        { lengde: 68, hjelp: 38, intervall: 1.05, bue: 2.1, bak: true, tekst: 'Mer hjelp per sving.' },
        { lengde: 78, hjelp: 48, intervall: 0.9, bue: 2.1, bak: true, tekst: 'Lengre kabel, mer hjelp og raskere sving.' },
      ],
      kombinasjon: {
        passiv: 'skjote', navn: 'Kabelkaos',
        tekst: 'Kabelen svinges i en full sirkel rundt deg.',
        tall: { lengde: 88, hjelp: 30, intervall: 0.9, bue: 6.2832, bak: true },
      },
    },
    fjern: {
      navn: 'Fjernstyring',
      beskrivelse: 'Tilfeldige advokater på skjermen får hjelp via et glimt ovenfra.',
      nivaaer: [
        { treff: 1, hjelp: 24, intervall: 1.6, tekst: 'Tilfeldige advokater på skjermen får hjelp via et glimt ovenfra.' },
        { treff: 2, hjelp: 24, intervall: 1.6, tekst: '+1 treff per gang.' },
        { treff: 2, hjelp: 34, intervall: 1.6, tekst: 'Mer hjelp per treff.' },
        { treff: 2, hjelp: 34, intervall: 1.35, tekst: 'Kortere tid mellom hver gang.' },
        { treff: 3, hjelp: 34, intervall: 1.35, tekst: '+1 treff per gang.' },
        { treff: 3, hjelp: 46, intervall: 1.35, tekst: 'Mer hjelp per treff.' },
        { treff: 4, hjelp: 46, intervall: 1.15, tekst: '+1 treff og kortere intervall.' },
        { treff: 6, hjelp: 60, intervall: 1.15, tekst: '+2 treff og mer hjelp.' },
      ],
      kombinasjon: {
        passiv: 'admin', navn: 'Domene-admin',
        tekst: 'Treffer mange advokater samtidig, med kort intervall.',
        tall: { treff: 9, hjelp: 60, intervall: 0.9 },
      },
    },
    mus: {
      navn: 'Trådløse mus',
      beskrivelse: 'Mus kretser i en bane rundt deg og hjelper alle de treffer.',
      nivaaer: [
        /** bane = avstand fra spilleren, rotasjon = radianer per sekund, treffPause = sek før samme advokat kan treffes igjen. */
        { antall: 3, bane: 40, rotasjon: 3.0, hjelp: 13, treffPause: 0.45, tekst: 'Mus kretser i en bane rundt deg og hjelper alle de treffer.' },
        { antall: 3, bane: 48, rotasjon: 3.0, hjelp: 13, treffPause: 0.45, tekst: 'Større bane.' },
        { antall: 3, bane: 55, rotasjon: 2.6, hjelp: 9, treffPause: 0.45, tekst: 'Større bane.' },
        { antall: 3, bane: 55, rotasjon: 3.3, hjelp: 9, treffPause: 0.45, tekst: 'Raskere rotasjon.' },
        { antall: 4, bane: 55, rotasjon: 3.3, hjelp: 12, treffPause: 0.45, tekst: '+1 mus og mer hjelp.' },
        { antall: 4, bane: 62, rotasjon: 3.3, hjelp: 12, treffPause: 0.45, tekst: 'Større bane.' },
        { antall: 4, bane: 62, rotasjon: 4.0, hjelp: 15, treffPause: 0.45, tekst: 'Raskere rotasjon og mer hjelp.' },
        { antall: 6, bane: 62, rotasjon: 4.0, hjelp: 19, treffPause: 0.45, tekst: '+2 mus og mer hjelp.' },
      ],
      kombinasjon: {
        passiv: 'batteri', navn: 'Musematta',
        tekst: 'Musene suser så fort at de danner en nesten sammenhengende ring.',
        tall: { antall: 10, bane: 66, rotasjon: 6.5, hjelp: 21, treffPause: 0.3 },
      },
    },
  },

  /** De fire nye IT-løsningene (lagt til i versjon 3). Samme oppbygning som våpnene over. */
  nyeVaapen: {
    ctrlz: {
      navn: 'Ctrl+Z',
      beskrivelse: 'En stor Ctrl+Z-tast kastes mot nærmeste advokat og kommer tilbake.',
      nivaaer: [
        /** rekkevidde = hvor langt tasten flyr før den snur. */
        { antall: 1, rekkevidde: 110, hjelp: 16, intervall: 1.6, fart: 220, tekst: 'En stor Ctrl+Z-tast kastes mot nærmeste advokat og kommer tilbake.' },
        { antall: 1, rekkevidde: 125, hjelp: 16, intervall: 1.5, fart: 220, tekst: 'Lengre rekkevidde.' },
        { antall: 2, rekkevidde: 125, hjelp: 16, intervall: 1.5, fart: 220, tekst: '+1 tast.' },
        { antall: 2, rekkevidde: 140, hjelp: 22, intervall: 1.4, fart: 220, tekst: 'Lengre rekkevidde og mer hjelp.' },
        { antall: 2, rekkevidde: 140, hjelp: 22, intervall: 1.3, fart: 230, tekst: 'Kortere tid mellom hvert kast.' },
        { antall: 3, rekkevidde: 150, hjelp: 22, intervall: 1.3, fart: 230, tekst: '+1 tast.' },
        { antall: 3, rekkevidde: 160, hjelp: 24, intervall: 1.2, fart: 240, tekst: 'Mer hjelp og lengre rekkevidde.' },
        { antall: 3, rekkevidde: 170, hjelp: 28, intervall: 1.1, fart: 250, tekst: 'Mer hjelp, raskere kast.' },
      ],
      kombinasjon: {
        passiv: 'hurtigtaster', navn: 'Ctrl+Alt+Del',
        tekst: 'Flere taster går i en spiral ut og inn rundt deg.',
        /** radius = hvor langt ut spiralen går, periode = sekunder ut og inn, rotasjon = radianer per sekund. */
        tall: { antall: 5, radius: 100, periode: 2.4, rotasjon: 3, hjelp: 30, treffPause: 0.4 },
      },
    },
    straale: {
      navn: 'Oppdateringsstrålen',
      beskrivelse: 'En lang fremdriftsindikator skyter ut som en stråle dit du går.',
      nivaaer: [
        /** hjelp gis hvert «tikk» sekund mens strålen varer. pause = tid mellom hver stråle. */
        { lengde: 140, bredde: 10, varighet: 1.0, pause: 2.6, hjelp: 11, tikk: 0.2, tekst: 'En lang fremdriftsindikator skyter ut som en stråle dit du går.' },
        { lengde: 155, bredde: 10, varighet: 1.0, pause: 2.5, hjelp: 12, tikk: 0.2, tekst: 'Lengre stråle.' },
        { lengde: 155, bredde: 12, varighet: 1.1, pause: 2.4, hjelp: 12, tikk: 0.2, tekst: 'Bredere stråle som varer lenger.' },
        { lengde: 170, bredde: 12, varighet: 1.1, pause: 2.2, hjelp: 15, tikk: 0.2, tekst: 'Lengre stråle og mer hjelp.' },
        { lengde: 170, bredde: 14, varighet: 1.2, pause: 2.0, hjelp: 16, tikk: 0.2, tekst: 'Bredere stråle, kortere pause.' },
        { lengde: 190, bredde: 14, varighet: 1.3, pause: 1.8, hjelp: 18, tikk: 0.2, tekst: 'Lengre stråle som varer lenger.' },
        { lengde: 200, bredde: 16, varighet: 1.4, pause: 1.6, hjelp: 21, tikk: 0.2, tekst: 'Bredere stråle og mer hjelp.' },
        { lengde: 220, bredde: 18, varighet: 1.5, pause: 1.4, hjelp: 24, tikk: 0.2, tekst: 'Lengst og bredest, kortest pause.' },
      ],
      kombinasjon: {
        passiv: 'sertifisering', navn: 'Tvungen oppdatering',
        tekst: 'To stråler sveiper sakte rundt deg hele tiden.',
        tall: { lengde: 200, bredde: 18, rotasjon: 0.9, hjelp: 14, tikk: 0.2 },
      },
    },
    teams: {
      navn: 'Teams-varsel',
      beskrivelse: 'Et Teams-varsel flyr til nærmeste advokat og spretter videre.',
      nivaaer: [
        /** sprett = hvor mange advokater varselet treffer, rekkevidde = maks avstand mellom hvert sprett. */
        { sprett: 2, hjelp: 18, intervall: 1.5, rekkevidde: 90, fart: 260, tekst: 'Et Teams-varsel flyr til nærmeste advokat og spretter videre.' },
        { sprett: 3, hjelp: 18, intervall: 1.5, rekkevidde: 90, fart: 260, tekst: '+1 sprett.' },
        { sprett: 3, hjelp: 24, intervall: 1.4, rekkevidde: 90, fart: 260, tekst: 'Mer hjelp per treff.' },
        { sprett: 4, hjelp: 24, intervall: 1.3, rekkevidde: 95, fart: 270, tekst: '+1 sprett og kortere intervall.' },
        { sprett: 4, hjelp: 30, intervall: 1.2, rekkevidde: 95, fart: 270, tekst: 'Mer hjelp, kortere intervall.' },
        { sprett: 5, hjelp: 30, intervall: 1.1, rekkevidde: 100, fart: 280, tekst: '+1 sprett.' },
        { sprett: 5, hjelp: 36, intervall: 1.0, rekkevidde: 100, fart: 280, tekst: 'Mer hjelp, kortere intervall.' },
        { sprett: 6, hjelp: 40, intervall: 0.9, rekkevidde: 105, fart: 290, tekst: '+1 sprett og mer hjelp.' },
      ],
      kombinasjon: {
        passiv: 'dobbelSkjerm', navn: 'Allmøte på Teams',
        tekst: 'Varslet deler seg i to ved hvert sprett.',
        /** maksTreff = tak på antall treff per varsel (alle grener til sammen). */
        tall: { sprett: 4, hjelp: 38, intervall: 1.0, rekkevidde: 100, fart: 290, maksTreff: 24 },
      },
    },
    headset: {
      navn: 'Støydempende headset',
      beskrivelse: 'Et skjold som blokkerer ett treff og sender ut en puls. Lades opp igjen.',
      nivaaer: [
        /** lading = sekunder før skjoldet er klart igjen, ladninger = treff det tåler før lading. */
        { lading: 20, pulsRadius: 50, hjelp: 30, ladninger: 1, tekst: 'Et skjold som blokkerer ett treff og sender ut en puls. Lades opp igjen.' },
        { lading: 18.5, pulsRadius: 55, hjelp: 35, ladninger: 1, tekst: 'Raskere oppladning, større puls.' },
        { lading: 17, pulsRadius: 60, hjelp: 40, ladninger: 1, tekst: 'Raskere oppladning, mer hjelp.' },
        { lading: 15, pulsRadius: 65, hjelp: 45, ladninger: 1, tekst: 'Raskere oppladning.' },
        { lading: 13.5, pulsRadius: 70, hjelp: 52, ladninger: 1, tekst: 'Større puls og mer hjelp.' },
        { lading: 12, pulsRadius: 75, hjelp: 60, ladninger: 1, tekst: 'Raskere oppladning.' },
        { lading: 10, pulsRadius: 82, hjelp: 70, ladninger: 1, tekst: 'Raskere oppladning, større puls.' },
        { lading: 8, pulsRadius: 90, hjelp: 80, ladninger: 1, tekst: 'Lades på 8 sekunder.' },
      ],
      kombinasjon: {
        passiv: 'ergonomisk', navn: 'Hjemmekontor',
        tekst: 'Skjoldet blokkerer to treff før det må lades, og pulsen blir mye større.',
        tall: { lading: 9, pulsRadius: 130, hjelp: 80, ladninger: 2 },
      },
    },
  },

  /** De fire nye passive (lagt til i versjon 3). */
  nyePassiver: {
    dobbelSkjerm: { navn: 'Dobbel skjerm', verdi: 0.05, tekst: '+5 % sjanse for at et våpen aktiveres to ganger på rad.' },
    hurtigtaster: { navn: 'Hurtigtaster', verdi: 0.12, tekst: '+12 % fart på prosjektiler, bumeranger og kjeder.' },
    ergonomisk: { navn: 'Ergonomisk stol', verdi: 0.06, tekst: '−6 % skade fra treff.' },
    sertifisering: { navn: 'Sertifisering', verdi: 0.08, tekst: '+8 % erfaring fra ticket-lapper.' },
  },

  /**
   * PASSIVE. «verdi» er effekten per nivå (0.10 = 10 %).
   * nivaaTekst (valgfri) gir egen korttekst per nivå.
   */
  passiver: {
    ram: { navn: 'Ekstra RAM', verdi: 0.10, tekst: '+10 % større område på alle våpen.' },
    papir: {
      navn: 'Papirskuff', verdi: 0.05, tekst: '+5 % hjelp på alle våpen.',
      /** Nivåene som gir +1 prosjektil (Toner-kast og Passord-reset). De andre gir +verdi hjelp. */
      prosjektilNivaaer: [2, 4],
      nivaaTekst: ['+5 % hjelp på alle våpen.', '+1 prosjektil (Toner-kast og Passord-reset).', '+5 % hjelp på alle våpen.', '+1 prosjektil (Toner-kast og Passord-reset).', '+5 % hjelp på alle våpen.'],
    },
    batteri: { navn: 'Nye batterier', verdi: 0.10, tekst: '+10 % varighet og hastighet på våpen.' },
    ssd: { navn: 'Raskere SSD', verdi: 0.08, tekst: '−8 % tid mellom hver aktivering av våpen.' },
    joggesko: { navn: 'Joggesko', verdi: 0.08, tekst: '+8 % bevegelseshastighet.' },
    boks: { navn: 'Større boks', verdi: 20, tekst: '+20 maks energi og fyller opp 20 energi.' },
    skjote: { navn: 'Lang skjøteledning', verdi: 0.25, tekst: '+25 % større radius for å plukke opp ticket-lapper.' },
    admin: { navn: 'Admin-rettigheter', verdi: 0.10, tekst: '+10 % hjelp på alle våpen.' },
  },

  /** Snakkebobler (maks 3 samtidig). */
  bobler: [
    'Hvor er Teams-lenka?', 'Skjermen er svart!', 'Printeren virker ikke!', 'Jeg har glemt passordet',
    'Det funket i går!', 'Jeg rørte ingenting!', 'Har du to minutter?', 'Musa har hengt seg!',
    'Hvor ble filen av?', 'Jeg har møte nå!', 'Wi-Fi-en er treg!', 'Den bare piper!',
  ],

  /** Skjerm og HUD (bare utseende – påvirker aldri spillet). */
  grensesnitt: {
    /** Faktor for hver UI-størrelse i innstillingene. */
    uiStoerrelser: { liten: 0.8, middels: 1, stor: 1.25, ekstraStor: 1.5 },
    /** Minikartets bredde som andel av skjermbredden. */
    minikart: { liten: 0.14, stor: 0.22, oppdateringerPerSekund: 10 },
    /** Energibaren skal være minst så stor andel av skjermbredden. */
    energiBredde: 0.25,
    /** Energibaren blinker rødt under denne andelen. */
    energiLav: 0.25,
  },

  /** Automatisk kvalitet: skrur ned rene visuelle effekter når maskinen sliter. Påvirker aldri spillogikken. */
  kvalitet: {
    /** Gjennomsnittlig tid per bilde (ms) som regnes som «for tregt». */
    grenseMs: 16.5,
    /** Sekunder med for treg tid før kvaliteten senkes, og sekunder med god tid før den økes igjen. */
    nedEtter: 1.5, oppEtter: 8,
  },

  /** Grenser som toppliste-serveren bruker for å avvise urealistiske innsendinger. */
  toppliste: {
    maksNavn: 20,
    /** Maks poeng per overlevd sekund (romslig). */
    maksPoengPerSekund: 5000,
    /** Maks hjulpne advokater per overlevd sekund. */
    maksHjulpnePerSekund: 50,
    /** Maks innsendinger per minutt fra samme adresse (romslig, i tilfelle hele huset deler adresse bak en proxy). */
    maksInnsendingerPerMinutt: 30,
    /** Antall som vises. */
    vis: 20,
  },
};

// De nye våpnene og passivene slås sammen med de gamle, så resten av spillet ser 10 våpen og 12 passive.
Object.assign(CONFIG.vaapen, CONFIG.nyeVaapen);
Object.assign(CONFIG.passiver, CONFIG.nyePassiver);
// Avsenderen bruker samme felter som de andre advokattypene.
/** @type {any} */ (CONFIG.fiender).avsender = CONFIG.avsender;

/** Snakkebobler for «Haster!»-avsenderen. */
export const AVSENDER_BOBLER = ['Sendte deg en mail!', 'Svarte du på mailen min?', 'HASTER!!!', 'Så du mailen?'];

/** Fast tidssteg i sekunder. */
export const DT = 1 / CONFIG.tikkPerSekund;

// @ts-check
// Selve spillet: all tilstand og én oppdatering per fast tidssteg.
// Denne filen (og alt den importerer) bruker verken skjerm, lyd eller Math.random(),
// så samme dato + samme tastetrykk gir nøyaktig samme runde på alle maskiner.
// Grafikkinnstillinger og automatisk kvalitet ligger i tegnekoden og kan aldri påvirke noe her.
import { CONFIG, DT } from './config.js';
import { Rng, Pool, Rutenett } from './verktoy.js';
import { lagSpiller, oppdaterSpiller } from './spiller.js';
import { lagFiende, lagPapir, lagEpost, oppdaterRegissor, oppdaterFiender, oppdaterEposter, ryddFiender, spawnFiende } from './fiender.js';
import { lagProsjektil, oppdaterVaapen, oppdaterProsjektiler } from './vaapen.js';
import { lagLapp, lagPickup, oppdaterLapper, leggPickup, oppdaterDrikker } from './lapper.js';
import { lagEffekt, oppdaterEffekter } from './effekter.js';
import { giVaapen, giPassiv, giKombinasjon, lagKort, brukKort, regnUtBonuser } from './oppgraderinger.js';
import { xpBehov } from './score.js';

const VB = CONFIG.visning.bredde, VH = CONFIG.visning.hoeyde;
const KB = CONFIG.kart.bredde, KH = CONFIG.kart.hoeyde;

export class Spill {
  /**
   * @param {string} dato dagens dato ("ÅÅÅÅ-MM-DD") – brukes som seed for «Dagens vakt»
   * @param {number} [karakter] hvilken spillbar karakter (0–3), se CONFIG.karakterer
   */
  constructor(dato, karakter = 0) {
    this.dato = dato;
    this.karakter = Math.max(0, Math.min(CONFIG.karakterer.length - 1, karakter | 0));
    /** Separate tilfeldighetsstrømmer, så én ikke påvirker en annen. */
    this.rng = {
      /** når advokatene kommer, og hvilken type */
      spawn: new Rng(dato + '|spawn'),
      /** hvor de kommer inn (avhenger av hvor spilleren står) */
      plass: new Rng(dato + '|plass'),
      /** hastesak og boss */
      spesial: new Rng(dato + '|spesial'),
      /** oppgraderingskort */
      kort: new Rng(dato + '|kort'),
      /** Ny PC-drops */
      drops: new Rng(dato + '|drops'),
      /** hvor energidrikken dukker opp */
      drikk: new Rng(dato + '|drikk'),
      /** Fjernstyring */
      vaapen: new Rng(dato + '|vaapen'),
      /** «Dobbel skjerm»: om et våpen aktiveres to ganger på rad */
      dobbel: new Rng(dato + '|dobbel'),
      /** bare utseende – påvirker aldri noe annet */
      utseende: new Rng(dato + '|utseende'),
    };
    /** 'spiller' | 'nivaaopp' | 'ferdig' */
    this.status = 'spiller';
    this.tid = 0;
    this.spiller = lagSpiller();
    /** Det spilleren ser (640 × 360), følger spilleren men stopper ved kartkanten. */
    this.kamera = { x: 0, y: 0 };

    this.fiender = new Pool(lagFiende);
    this.prosjektiler = new Pool(lagProsjektil);
    this.prosjTeller = { toner: 0, noekkel: 0, ctrlz: 0, teams: 0 };
    this.lapper = new Pool(lagLapp);
    this.pickups = new Pool(lagPickup);
    this.papir = new Pool(lagPapir);
    /** E-poster fra «Haster!»-avsendere og bosser. */
    this.fiendeSkudd = new Pool(lagEpost);
    this.antallAvsendere = 0;
    this.effekter = new Pool(lagEffekt);
    this.rutenett = new Rutenett();
    /** Gjenbrukte lister (unngår nye objekter i hver oppdatering). */
    this.treffListe = /** @type {number[]} */ ([]);
    this.kandidater = /** @type {number[]} */ ([]);
    this.treffListe2 = /** @type {number[]} */ ([]);
    /** Teams-varsel: hvilket mål hvert varsel flyr mot. @type {Map<any, any>} */
    this.teamsMaal = new Map();
    this.drikkKand = new Float64Array(CONFIG.energidrikk.kandidater);
    this.drikkKandY = new Float64Array(CONFIG.energidrikk.kandidater);
    this.nesteUid = 0;

    // Regissøren
    this.spawnAkk = 0;
    /** Advokater som ikke fikk plass under taket – gjør de neste sterkere. */
    this.spart = 0;
    this.nesteBoelge = CONFIG.boelger.forste;
    this.nesteHastesak = CONFIG.fiender.hastesak.fra;
    this.nesteBoss = CONFIG.fiender.boss.forste;
    this.nesteDrikk = CONFIG.energidrikk.forste;
    this.bossNr = 0;
    this.faseIndeks = -1;
    /** Antall som ble glade i denne oppdateringen (for å forkorte animasjonen ved mange). */
    this.gladeNaa = 0;

    // Poeng og nivå
    this.score = 0;
    this.hjulpne = 0;
    this.multSteg = 0;
    this.multTeller = 0;
    this.nivaa = 1;
    this.xp = 0;
    this.xpBehov = xpBehov(1);
    /** Kortene som vises ved nivåopp. @type {import('./oppgraderinger.js').Kort[] | null} */
    this.kort = null;

    this.stat = {
      perType: /** @type {Record<string, number>} */ ({}),
      hjelpPerVaapen: /** @type {Record<string, number>} */ ({}),
      bosserTotalt: 0, bosserHjulpet: 0, maksMultSteg: 0, treff: 0,
      lapperPlukket: 0, lapperTapt: 0, drikker: 0, blokkert: 0, eposter: 0,
      kombinasjoner: /** @type {string[]} */ ([]),
    };
    /** Hendelser siden sist – leses av UI og lyd, og tømmes derfra. @type {string[]} */
    this.hendelser = [];
    this.debug = { udoedelig: false, brukt: false };

    // Karakterens bonus og startvåpen
    const k = CONFIG.karakterer[this.karakter];
    this.karakterBonus = { hjelp: 0, fart: 0, plukk: 0, ...k.bonus };
    if (k.bonus.maksEnergi) {
      this.spiller.maksEnergi += k.bonus.maksEnergi;
      this.spiller.energi = this.spiller.maksEnergi;
    }
    regnUtBonuser(this);
    giVaapen(this, k.startVaapen);
    this.oppdaterKamera();
  }

  /** Kameraet følger spilleren, men stopper ved kartkanten så man aldri ser utenfor kartet. */
  oppdaterKamera() {
    const p = this.spiller;
    this.kamera.x = Math.min(KB - VB, Math.max(0, p.x - VB / 2));
    this.kamera.y = Math.min(KH - VH, Math.max(0, p.y - VH / 2));
  }

  /**
   * Én oppdatering på fast tidssteg (1/60 sekund).
   * @param {number} ix ønsket retning vannrett (−1 til 1)
   * @param {number} iy ønsket retning loddrett (−1 til 1)
   */
  tikk(ix, iy) {
    if (this.status !== 'spiller') return;
    this.tid += DT;
    this.gladeNaa = 0;

    // Fasebytte («Morgenkaffe», «Formiddagen» …)
    const faser = CONFIG.faser;
    while (this.faseIndeks + 1 < faser.length && this.tid >= faser[this.faseIndeks + 1].fra) {
      this.faseIndeks++;
      this.hendelser.push('fase');
    }

    oppdaterSpiller(this, DT, ix, iy);
    this.oppdaterKamera();
    oppdaterRegissor(this, DT);
    oppdaterDrikker(this);
    this.rutenett.bygg(this.fiender.items, this.fiender.n);
    oppdaterFiender(this, DT);
    this.rutenett.bygg(this.fiender.items, this.fiender.n);
    if (this.status === 'spiller') {
      oppdaterVaapen(this, DT);
      oppdaterProsjektiler(this, DT);
      oppdaterEposter(this, DT);
      oppdaterLapper(this, DT);
    }
    ryddFiender(this);
    oppdaterEffekter(this, DT);
    this.sjekkNivaa();
  }

  /** Nok erfaring? Da pauses spillet og kortene vises. */
  sjekkNivaa() {
    if (this.status !== 'spiller' || this.xp < this.xpBehov) return;
    this.xp -= this.xpBehov;
    this.nivaa++;
    this.xpBehov = xpBehov(this.nivaa);
    this.kort = lagKort(this);
    this.status = 'nivaaopp';
    this.hendelser.push('nivaa');
  }

  /** Spilleren velger kort nr. i. */
  velgKort(i) {
    if (this.status !== 'nivaaopp' || !this.kort || !this.kort[i]) return;
    const kort = this.kort[i];
    this.kort = null;
    this.status = 'spiller';
    brukKort(this, kort);
    this.sjekkNivaa();
  }

  /** Navnet på fasen vi er i nå. */
  get faseNavn() {
    return CONFIG.faser[Math.max(0, this.faseIndeks)].navn;
  }

  // ---------- Debug-hjelpere (brukes bare med ?debug) ----------

  /** Hopper frem i tid uten å utløse alle bossene på veien. */
  debugHopp(sek) {
    this.debug.brukt = true;
    this.tid += sek;
    const B = CONFIG.fiender.boss;
    while (this.nesteBoss <= this.tid) {
      this.nesteBoss += B.intervall;
      this.bossNr++;
    }
    while (this.nesteDrikk <= this.tid - CONFIG.energidrikk.intervall) this.nesteDrikk += CONFIG.energidrikk.intervall;
    if (this.nesteBoelge < this.tid) this.nesteBoelge = this.tid + 10;
    if (this.nesteHastesak < this.tid) this.nesteHastesak = this.tid + 5;
  }

  debugNivaaOpp() {
    this.debug.brukt = true;
    this.xp = this.xpBehov;
    this.sjekkNivaa();
  }

  /**
   * Fire våpen på maks nivå med kombinasjoner, og passivene som hører til.
   * @param {string[]} [vaapen] hvilke fire (standard: Skru av og på, Trådløse mus, Toner-kast, Fjernstyring)
   * @param {boolean} [kombiner] gjør dem om til kombinasjoner med en gang
   */
  debugMaksBygg(vaapen = ['avpaa', 'mus', 'toner', 'fjern'], kombiner = false) {
    this.debug.brukt = true;
    this.spiller.vaapen.length = 0;
    for (const id of vaapen.slice(0, CONFIG.grenser.vaapen)) {
      for (let i = 0; i < CONFIG.grenser.vaapenNivaa; i++) giVaapen(this, id);
      const passiv = CONFIG.vaapen[id].kombinasjon.passiv;
      for (let i = 0; i < CONFIG.grenser.passivNivaa; i++) giPassiv(this, passiv);
      if (kombiner) giKombinasjon(this, id);
    }
    for (const id of ['joggesko', 'boks']) for (let i = 0; i < CONFIG.grenser.passivNivaa; i++) giPassiv(this, id);
  }

  debugSpawn(type) {
    this.debug.brukt = true;
    const p = this.spiller;
    if (type === 'pc' || type === 'drikk') leggPickup(this, type, p.x + 40, p.y);
    else {
      spawnFiende(this, type, p.x + 190, p.y - 50);
      if (type === 'boss') {
        this.bossNr++;
        this.stat.bosserTotalt++;
        this.hendelser.push('boss');
      }
    }
  }
}

// @ts-check
// Inngangspunktet: binder sammen spill, tegning, HUD, styring, lyd, innstillinger, menyer og toppliste.
import { CONFIG, DT } from './config.js';
import { datoOslo, penDato, mmss, tall } from './verktoy.js';
import { Spill } from './spill.js';
import { Tegner } from './tegning.js';
import { Hud } from './hud.js';
import { Styring } from './styring.js';
import { Lyd } from './lyd.js';
import { Innstillinger } from './innstillinger.js';
import { hentToppliste, sendInnScore } from './toppliste.js';
import { multiplikator } from './score.js';
import { spawnFiende, spawnRate, frustrasjonsfaktor } from './fiender.js';
import { ikon, ikonElement } from './ikoner.js';
import { xpBehov } from './score.js';
import * as ui from './ui.js';

const { el } = ui;
const DEBUG = new URLSearchParams(location.search).has('debug');

// ?utenGPU: all tegning skjer på prosessoren, som på en kontor-PC uten grafikkort (verste fall for ytelsen).
if (new URLSearchParams(location.search).has('utenGPU')) {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = /** @type {any} */ (function (type, valg) {
    return type === '2d' ? original.call(this, type, { ...(valg || {}), willReadFrequently: true }) : original.call(this, type, valg);
  });
}
const NAVN_NOEKKEL = 'hds_navn';
const KARAKTER_NOEKKEL = 'hds_karakter';
const VB = CONFIG.visning.bredde, VH = CONFIG.visning.hoeyde;

const innst = new Innstillinger();
const lyd = new Lyd(innst);
const spillLerret = /** @type {HTMLCanvasElement} */ (el('spill'));
const hudLerret = /** @type {HTMLCanvasElement} */ (el('hud'));
const tegner = new Tegner(spillLerret, innst);
const hud = new Hud(hudLerret);
const styring = new Styring(window);

/** @type {Spill | null} */
let spill = null;
/** 'start' | 'spill' | 'pause' | 'nivaaopp' | 'innstillinger' | 'slutter' | 'slutt' */
let modus = 'start';
/** Hvor innstillingene ble åpnet fra (for «Tilbake»). */
let innstFra = 'start';
let dato = datoOslo();
let akk = 0;
let forrige = 0;
/** Klokke som bare går mens spillet går – brukes til animasjoner. */
let animTid = 0;
let kortKlare = 0;
let sendt = false;
/** Valgt karakter (huskes lokalt til neste gang). */
let valgtKarakter = (() => {
  try {
    const i = Number(localStorage.getItem(KARAKTER_NOEKKEL));
    return i >= 0 && i < CONFIG.karakterer.length ? i : 0;
  } catch {
    return 0;
  }
})();

function hentNavn() {
  try {
    return localStorage.getItem(NAVN_NOEKKEL) || '';
  } catch {
    return '';
  }
}

// ---------- Skjermstørrelse ----------

/**
 * Plasserer spillet: alle ser nøyaktig 640 × 360 logiske piksler av kartet.
 * Skaleringen er i hele device-piksler der det går (skarpe, like store piksler), og kantene fylles med ramme.
 */
function tilpass() {
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  const plass = Math.min((W * dpr) / VB, (H * dpr) / VH);
  let k;
  const valg = innst.v.spillStoerrelse;
  if (valg === 'tilpass') {
    k = plass >= 1 && Math.floor(plass) / plass >= 0.85 ? Math.floor(plass) : plass;
  } else {
    k = Math.min(Number(valg) * dpr, plass);
    if (k >= 1 && k < plass) k = Math.floor(k);
  }
  const wDev = Math.round(VB * k), hDev = Math.round(VH * k);
  const x = Math.round((W * dpr - wDev) / 2) / dpr, y = Math.round((H * dpr - hDev) / 2) / dpr;
  const w = wDev / dpr, h = hDev / dpr;
  spillLerret.style.width = w + 'px';
  spillLerret.style.height = h + 'px';
  spillLerret.style.left = x + 'px';
  spillLerret.style.top = y + 'px';

  // UI-størrelse
  const v = innst.v.ui;
  const faktor = v === 'auto' ? (h < 600 ? 1.25 : 1) : CONFIG.grensesnitt.uiStoerrelser[v];
  const base = 4 * Math.max(4, Math.round(4.5 * faktor * Math.min(1.6, Math.max(0.8, H / 1080))));
  document.documentElement.style.setProperty('--ui', base + 'px');
  hud.tilpass(W, H, { x, y, w, h }, dpr, faktor, innst.v.minikart);
  tegner.marg = hud.margLogisk;

  const knapper = el('hudknapper');
  knapper.style.right = Math.max(8, W - (x + w) + 8) + 'px';
  knapper.style.bottom = Math.max(8, H - (y + h) + 8) + 'px';
}

// ---------- Flyt mellom skjermene ----------

function tilStart() {
  modus = 'start';
  spill = null;
  styring.aktiv = false;
  dato = datoOslo();
  el('vaktdato').textContent = penDato(dato);
  ui.tegnOppslagstavle();
  ui.visSkjerm('start');
  el('hudknapper').hidden = true;
  lastToppliste(el('startliste'));
}

/** Karaktervalget vises etter «Start vakt». */
function visKaraktervalg() {
  modus = 'karaktervalg';
  ui.visKaraktervalg(valgtKarakter, velgKarakter);
  ui.visSkjerm('karaktervalg');
  /** @type {HTMLElement | null} */ (document.querySelectorAll('.karakter')[valgtKarakter])?.focus();
}

/** Velger karakter nr. i (og starter vakta hvis start = true). Valget huskes lokalt. */
function velgKarakter(i, start) {
  valgtKarakter = (i + CONFIG.karakterer.length) % CONFIG.karakterer.length;
  ui.markerKarakter(valgtKarakter);
  try {
    localStorage.setItem(KARAKTER_NOEKKEL, String(valgtKarakter));
  } catch {
    /* ignorer */
  }
  if (start) startVakt();
}

function startVakt() {  // Dagens dato i norsk tid er seeden: alle får samme vakt samme dag.
  dato = datoOslo();
  // Gjør ferdig figurene som ikke er laget ennå (normalt allerede ferdig mens startskjermen vises).
  tegner.fig.lagNoen(1e9);
  spill = new Spill(dato, valgtKarakter);
  hud.portrett = tegner.fig.portrett(valgtKarakter);
  akk = 0;
  sendt = false;
  stress = null;
  styring.nullstill();
  styring.aktiv = true;
  hud.ikonerEndret();
  ui.visSkjerm('');
  el('hudknapper').hidden = false;
  modus = 'spill';
  lyd.spill('klikk');
}

function pause() {
  if (modus !== 'spill' || stress) return;
  modus = 'pause';
  styring.aktiv = false;
  ui.visSkjerm('pause');
}

function fortsett() {
  if (modus !== 'pause') return;
  modus = 'spill';
  akk = 0;
  styring.nullstill();
  styring.aktiv = true;
  ui.visSkjerm('');
}

let visInnstillinger = () => {};
function aapneInnstillinger(fra) {
  innstFra = fra;
  modus = 'innstillinger';
  visInnstillinger();
  ui.visSkjerm('innstillinger');
  /** @type {HTMLElement} */ (el('innsttilbake')).focus();
}
function lukkInnstillinger() {
  modus = innstFra;
  ui.visSkjerm(innstFra);
}

function aapneNivaaopp() {
  if (!spill) return;
  modus = 'nivaaopp';
  styring.aktiv = false;
  kortKlare = performance.now() + 350; // hindrer at man velger kort ved et uhell
  ui.visKort(spill, velgKort);
  ui.visSkjerm('nivaaopp');
  lyd.spill('nivaa');
}

function velgKort(i) {
  if (!spill || modus !== 'nivaaopp' || performance.now() < kortKlare) return;
  spill.velgKort(i);
  behandleHendelser();
  if (spill.status === 'nivaaopp') {
    aapneNivaaopp(); // flere nivåer på én gang
    return;
  }
  modus = 'spill';
  akk = 0;
  styring.nullstill();
  styring.aktiv = true;
  ui.visSkjerm('');
}

/** Vakta er over: vis slutt-skjermen med statistikk og toppliste. */
function visSlutt() {
  if (!spill) return;
  modus = 'slutt';
  styring.aktiv = false;
  el('hudknapper').hidden = true;
  // Lagring skjer først nå – aldri under spill.
  if (!spill.debug.brukt) ui.lagreKombinasjoner(spill.stat.kombinasjoner);
  const k = CONFIG.karakterer[spill.karakter];
  const sp = /** @type {HTMLCanvasElement} */ (el('sluttportrett'));
  const spc = /** @type {CanvasRenderingContext2D} */ (sp.getContext('2d'));
  spc.clearRect(0, 0, 64, 64);
  spc.drawImage(tegner.fig.portrett(spill.karakter), 0, 0);
  el('sluttkarakter').textContent = `${k.navn} – ${k.tittel}`;
  el('sluttscore').textContent = tall(spill.score);
  el('slutttid').textContent = mmss(spill.tid);
  ui.tegnStatistikk(spill);
  const navn = /** @type {HTMLInputElement} */ (el('navn'));
  navn.value = hentNavn();
  navn.maxLength = CONFIG.toppliste.maksNavn;
  const kanSende = !spill.debug.brukt;
  el('navneskjema').hidden = !kanSende;
  /** @type {HTMLButtonElement} */ (el('sendknapp')).disabled = false;
  el('sendstatus').textContent = kanSende ? '' : 'Debug-runder sendes ikke inn til topplisten.';
  ui.visSkjerm('slutt');
  lastToppliste(el('sluttliste'));
}

async function lastToppliste(holder) {
  const navn = hentNavn();
  try {
    ui.tegnToppliste(holder, await hentToppliste(datoOslo(), navn), navn);
  } catch {
    ui.tegnToppliste(holder, null, navn);
  }
}

async function sendInn(e) {
  e.preventDefault();
  if (!spill || sendt || spill.debug.brukt) return;
  const felt = /** @type {HTMLInputElement} */ (el('navn'));
  const navn = felt.value.trim().slice(0, CONFIG.toppliste.maksNavn);
  if (!navn) {
    el('sendstatus').textContent = 'Skriv inn navnet ditt først.';
    felt.focus();
    return;
  }
  try {
    localStorage.setItem(NAVN_NOEKKEL, navn);
  } catch {
    /* ignorer */
  }
  const knapp = /** @type {HTMLButtonElement} */ (el('sendknapp'));
  knapp.disabled = true;
  el('sendstatus').textContent = 'Sender …';
  try {
    const svar = await sendInnScore({
      navn, dato: spill.dato, karakter: CONFIG.karakterer[spill.karakter].id, score: spill.score, tid: Math.round(spill.tid), hjulpne: spill.hjulpne,
      maksMult: CONFIG.multiplikator.start + spill.stat.maksMultSteg * CONFIG.multiplikator.steg,
    });
    sendt = true;
    el('sendstatus').textContent = svar.forbedret
      ? `Registrert! Du ligger på ${svar.plass}. plass i dag.`
      : `Du har en bedre runde fra før i dag (${svar.plass}. plass). Den står fortsatt.`;
    lastToppliste(el('sluttliste'));
  } catch (feil) {
    knapp.disabled = false;
    el('sendstatus').textContent = feil instanceof TypeError || /** @type {any} */ (feil)?.name === 'AbortError'
      ? 'Topplisten er utilgjengelig akkurat nå. Prøv igjen om litt.'
      : String(/** @type {any} */ (feil)?.message || 'Noe gikk galt. Prøv igjen.');
  }
}

// ---------- Hendelser fra spillet → lyd og HUD ----------

function behandleHendelser() {
  if (!spill) return;
  const h = spill.hendelser;
  for (let i = 0; i < h.length; i++) {
    const navn = h[i];
    switch (navn) {
      case 'lapp': lyd.spill('lapp'); break;
      case 'glad': lyd.spill('glad'); break;
      case 'treff':
        lyd.spill('treff');
        tegner.rist = 0.2;
        break;
      case 'multOpp': lyd.spill('multOpp'); hud.multEffekt(1); break;
      case 'multNed': lyd.spill('multNed'); hud.multEffekt(-1); break;
      case 'fase': hud.visBanner(spill.faseNavn); break;
      case 'boss': lyd.spill('boss'); hud.visBanner('Fristen er om 2 minutter!', 'boss', 4000); break;
      case 'bossGlad': lyd.spill('bonus'); hud.visBanner('Fristen ble holdt!', 'gull'); break;
      case 'bossTapt': hud.visBanner('Fristen gikk ut – bonusen røk'); break;
      case 'hastesakKom': hud.visBanner('Hastesak! Ta igjen den gylne advokaten', 'gull'); break;
      case 'hastesakGlad': lyd.spill('bonus'); break;
      case 'ring': hud.visBanner('De omringer deg – finn åpningen!'); break;
      case 'drikk': lyd.spill('drikk'); hud.visBanner('Sukkerkick!', 'gull', 1500); break;
      case 'drikkKom': if (spill.stat.drikker === 0 && spill.tid < 60) hud.visBanner('Energidrikk på kartet – følg den grønne pilen!', 'gull', 3500); break;
      case 'nypc': lyd.spill('nypc'); hud.visBanner('Ny PC! Alle på skjermen er fornøyde', 'gull'); break;
      case 'oppgradert': hud.ikonerEndret(); break;
      case 'ferdig': lyd.spill('ferdig'); break;
      default:
        if (navn.startsWith('kombinasjon:')) {
          const id = navn.slice(12);
          lyd.spill('bonus');
          hud.visBanner(`Kombinasjon: ${CONFIG.vaapen[id].kombinasjon.navn}!`, 'gull', 3500);
        }
    }
  }
  h.length = 0;
}

// ---------- Hovedløkka ----------

/** Ytelsesmåling (vises i debug-modus og brukes av automatisk kvalitet). */
const ytelse = {
  fps: 60, minFps: 60, snittFps: 60, msOppd: 0, msTegn: 0,
  bilder: 0, tid: 0, sumDt: 0, antallDt: 0, vindu: /** @type {number[]} */ ([]),
  tregTid: 0, godTid: 0,
};

function ramme(ms) {
  const naa = ms / 1000;
  const dt = Math.min(0.25, Math.max(0, naa - forrige));
  forrige = naa;
  const t0 = performance.now();

  if (modus === 'spill' && spill) {
    // Spillogikken går på fast tidssteg (60 per sekund), uavhengig av skjermens bildefrekvens.
    akk += dt;
    let steg = 0;
    while (akk >= DT && steg < CONFIG.maksTikkPerBilde) {
      let [ix, iy] = styring.retning();
      if (stress) [ix, iy] = stressStyring();
      spill.tikk(ix, iy);
      akk -= DT;
      steg++;
      behandleHendelser();
      if (spill.status !== 'spiller') {
        akk = 0;
        break;
      }
    }
    // Treg maskin: ikke prøv å ta igjen alt (unngår at spillet henger seg opp mer og mer).
    if (steg === CONFIG.maksTikkPerBilde) akk = 0;
    animTid += dt;
    if (stress) stressTikk(dt);
    if (spill.status === 'nivaaopp') {
      if (stress) spill.velgKort(0);
      else aapneNivaaopp();
    } else if (spill.status === 'ferdig') {
      modus = 'slutter';
      styring.aktiv = false;
      setTimeout(visSlutt, 900);
    }
  } else if (modus === 'start') {
    animTid += dt;
  }
  const t1 = performance.now();

  tegner.tegn(modus === 'start' ? null : spill, animTid, modus === 'spill' ? dt : 0);
  hud.oppdater(modus === 'start' || modus === 'slutt' ? null : spill, innst, styring.joystick);
  const t2 = performance.now();

  maalYtelse(dt, t1 - t0, t2 - t1);
  requestAnimationFrame(ramme);
}

/** Holder styr på FPS og justerer automatisk kvalitet (bare visuelt – aldri spillogikken). */
function maalYtelse(dt, msOppd, msTegn) {
  const y = ytelse;
  y.bilder++;
  y.tid += dt;
  y.msOppd = y.msOppd * 0.95 + msOppd * 0.05;
  y.msTegn = y.msTegn * 0.95 + msTegn * 0.05;
  if (y.tid >= 0.5) {
    y.fps = Math.round(y.bilder / y.tid);
    y.vindu.push(y.fps);
    if (y.vindu.length > 20) y.vindu.shift();
    y.minFps = Math.min(...y.vindu);
    y.snittFps = Math.round(y.vindu.reduce((a, b) => a + b, 0) / y.vindu.length);
    y.bilder = 0;
    y.tid = 0;
    if (DEBUG) visDebug();
  }
  if (modus !== 'spill' || document.hidden) return;
  const K = CONFIG.kvalitet;
  const ms = dt * 1000;
  if (ms > K.grenseMs) {
    y.tregTid += dt;
    y.godTid = 0;
  } else {
    y.godTid += dt;
    y.tregTid = Math.max(0, y.tregTid - dt * 0.5);
  }
  if (y.tregTid > K.nedEtter && tegner.kvalitet < 2) {
    tegner.kvalitet++;
    y.tregTid = 0;
  } else if (y.godTid > K.oppEtter && tegner.kvalitet > 0) {
    tegner.kvalitet--;
    y.godTid = 0;
  }
}

// ---------- Knapper og taster ----------

function oppdaterLydknapper() {
  const paa = lyd.paa;
  const knapp = el('lydknapp');
  knapp.replaceChildren(ikonElement(paa ? 'lydPaa' : 'lydAv'));
  el('startlyd').textContent = `Lyd er ${paa ? 'på' : 'av'}`;
  el('pauselyd').textContent = `Lyd er ${paa ? 'på' : 'av'}`;
}
function byttLyd() {
  innst.sett('demp', !innst.v.demp);
  if (lyd.paa) lyd.spill('test');
}

el('pauseknapp').replaceChildren(ikonElement('pause'));
const logo = /** @type {HTMLCanvasElement} */ (el('logo'));
/** @type {CanvasRenderingContext2D} */ (logo.getContext('2d')).drawImage(ikon('avpaa'), 0, 0);

el('startknapp').addEventListener('click', visKaraktervalg);
el('karakterstart').addEventListener('click', () => startVakt());
el('karaktertilbake').addEventListener('click', tilStart);
el('nyvaktknapp').addEventListener('click', startVakt);
el('tilstartknapp').addEventListener('click', tilStart);
el('pauseknapp').addEventListener('click', pause);
el('fortsettknapp').addEventListener('click', fortsett);
el('avsluttknapp').addEventListener('click', () => {
  if (!spill) return;
  spill.status = 'ferdig';
  visSlutt();
});
el('lydknapp').addEventListener('click', byttLyd);
el('startlyd').addEventListener('click', byttLyd);
el('pauselyd').addEventListener('click', byttLyd);
el('startinnst').addEventListener('click', () => aapneInnstillinger('start'));
el('pauseinnst').addEventListener('click', () => aapneInnstillinger('pause'));
el('innsttilbake').addEventListener('click', lukkInnstillinger);
el('navneskjema').addEventListener('submit', sendInn);

const erFullskjerm = () => !!document.fullscreenElement;
visInnstillinger = ui.kobleInnstillinger(innst, {
  testlyd: () => {
    lyd.start();
    lyd.spill('test');
  },
  fullskjerm: (paa) => {
    try {
      if (paa && !erFullskjerm()) document.documentElement.requestFullscreen?.().catch(() => {});
      else if (!paa && erFullskjerm()) document.exitFullscreen?.().catch(() => {});
    } catch {
      /* fullskjerm støttes ikke */
    }
  },
  erFullskjerm,
});

innst.vedEndring((v, endret) => {
  oppdaterLydknapper();
  if (endret === '*' || endret === 'spillStoerrelse' || endret === 'ui' || endret === 'minikart') tilpass();
});

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'text') return;
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (modus === 'spill') pause();
    else if (modus === 'pause') fortsett();
    else if (modus === 'innstillinger' && e.code === 'Escape') lukkInnstillinger();
  } else if (modus === 'nivaaopp' && /^(Digit|Numpad)[1-3]$/.test(e.code)) {
    velgKort(Number(e.code.slice(-1)) - 1);
  } else if (modus === 'karaktervalg') {
    if (/^(Digit|Numpad)[1-4]$/.test(e.code)) velgKarakter(Number(e.code.slice(-1)) - 1, true);
    else if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyD' || e.code === 'KeyS') { e.preventDefault(); velgKarakter(valgtKarakter + 1, false); /** @type {HTMLElement | null} */ (document.querySelectorAll('.karakter')[valgtKarakter])?.focus(); }
    else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyA' || e.code === 'KeyW') { e.preventDefault(); velgKarakter(valgtKarakter - 1, false); /** @type {HTMLElement | null} */ (document.querySelectorAll('.karakter')[valgtKarakter])?.focus(); }
    else if (e.code === 'Enter' && !e.repeat) { e.preventDefault(); startVakt(); }
    else if (e.code === 'Escape') tilStart();
  } else if (e.code === 'Enter' && !e.repeat && modus === 'start' && document.activeElement === document.body) {
    visKaraktervalg();
  }
});

// Pause automatisk når fanen eller vinduet mister fokus (også når fullskjerm avsluttes med Esc).
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
document.addEventListener('fullscreenchange', () => {
  if (!erFullskjerm()) pause();
  setTimeout(tilpass, 50);
});
window.addEventListener('resize', tilpass);
window.addEventListener('orientationchange', () => setTimeout(tilpass, 100));
spillLerret.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- Debug-modus (?debug) ----------

/** Stresstest: minutt 15, fullt bygg med kombinasjoner, maks advokater, 5 minutter uten å kunne dø. */
let stress = /** @type {null | {tid: number, bilder: number, minFps: number, sumFps: number, maalinger: number, heapStart: number, heapMaks: number, heapSlutt: number, logg: string[]}} */ (null);
const heap = () => (/** @type {any} */ (performance).memory ? /** @type {any} */ (performance).memory.usedJSHeapSize / 1048576 : -1);

function startStresstest() {
  startVakt();
  if (!spill) return;
  const s = spill;
  s.debugHopp(15 * 60 - 1);
  // De tyngste våpnene for ytelsen: mange prosjektiler, kjeder og stråler (alle som kombinasjoner)
  s.debugMaksBygg(['teams', 'ctrlz', 'straale', 'toner'], true);
  s.debug.udoedelig = true;
  hud.ikonerEndret();
  stress = { tid: 0, bilder: 0, minFps: 999, sumFps: 0, maalinger: 0, heapStart: heap(), heapMaks: heap(), heapSlutt: 0, logg: [] };
  console.log('[stresstest] start: minutt 15, 4 våpen med kombinasjoner, maks advokater, 5 minutter');
}

function stressStyring() {
  const a = animTid * 0.6;
  return [Math.cos(a), Math.sin(a * 1.3)];
}

function stressTikk(dt) {
  if (!stress || !spill) return;
  const s = spill;
  // Hold antallet på taket hele tiden
  const p = s.spiller;
  for (let i = 0; s.fiender.n < CONFIG.spawn.maksSamtidige && i < 40; i++) {
    const v = (s.nesteUid * 2.399) % (Math.PI * 2);
    const type = i % 6 === 0 ? 'senior' : i % 7 === 0 ? 'printer' : i % 5 === 0 && s.antallAvsendere < 30 ? 'avsender' : 'junior';
    spawnFiende(s, type, p.x + Math.cos(v) * 260, p.y + Math.sin(v) * 200);
  }
  stress.tid += dt;
  stress.bilder++;
  if (Math.floor(stress.tid) !== Math.floor(stress.tid - dt)) {
    stress.minFps = Math.min(stress.minFps, ytelse.fps);
    stress.sumFps += ytelse.fps;
    stress.maalinger++;
    const h = heap();
    stress.heapMaks = Math.max(stress.heapMaks, h);
    if (Math.floor(stress.tid) % 30 === 0) {
      const linje = `${mmss(stress.tid)}: ${ytelse.fps} FPS, oppdatering ${ytelse.msOppd.toFixed(2)} ms, tegning ${ytelse.msTegn.toFixed(2)} ms, advokater ${s.fiender.n}, effekter ${s.effekter.n}, minne ${h.toFixed(1)} MB, kvalitet ${tegner.kvalitet}`;
      stress.logg.push(linje);
      console.log('[stresstest] ' + linje);
    }
  }
  if (stress.tid >= 300) {
    stress.heapSlutt = heap();
    const res = `Stresstest ferdig: snitt ${Math.round(stress.sumFps / Math.max(1, stress.maalinger))} FPS, laveste ${stress.minFps} FPS, minne start ${stress.heapStart.toFixed(1)} MB → maks ${stress.heapMaks.toFixed(1)} MB → slutt ${stress.heapSlutt.toFixed(1)} MB`;
    console.log('[stresstest] ' + res);
    console.log('[stresstest] e-poster nå: ' + s.fiendeSkudd.n + ', avsendere: ' + s.antallAvsendere);
    stress.logg.push(res);
    /** @type {any} */ (window).stressResultat = stress;
    s.status = 'ferdig';
    stress = null;
  }
}

/** @type {{t: number, h: Record<string, number>}[]} */
const hjelpLogg = [];

function visDebug() {
  const y = ytelse;
  const minne = heap();
  let t = `FPS ${y.fps} (min ${y.minFps}, snitt ${y.snittFps})  kvalitet ${['full', 'middels', 'lav'][tegner.kvalitet]}\n` +
    `ms/bilde: oppdatering ${y.msOppd.toFixed(2)}  tegning ${y.msTegn.toFixed(2)}\n` +
    (minne >= 0 ? `minne ${minne.toFixed(1)} MB\n` : 'minne: ikke tilgjengelig i denne nettleseren\n');
  if (spill) {
    const s = spill;
    t += `tid ${mmss(s.tid)}  ${s.faseNavn}\n` +
      `advokater ${s.fiender.n}  prosjektiler ${s.prosjektiler.n}  effekter ${s.effekter.n}\n` +
      `lapper ${s.lapper.n}  glade (animasjon) ${tegner.gladeVist}  spart ${s.spart}\n` +
      `inn/sek ${spawnRate(s.tid).toFixed(1)}  frustrasjon ×${frustrasjonsfaktor(s.tid).toFixed(2)}\n` +
      `mult x${multiplikator(s).toFixed(1)}  hjulpne ${s.hjulpne}  nivå ${s.nivaa}\n` +
      `udødelig: ${s.debug.udoedelig ? 'JA' : 'nei'}  seed: ${s.dato}`;
  }
  if (spill) {
    // Hjelp per sekund per våpen (siste ca. 10 sekunder) – brukes til å sammenligne våpen og kombinasjoner
    const naa = spill.tid;
    hjelpLogg.push({ t: naa, h: { ...spill.stat.hjelpPerVaapen } });
    while (hjelpLogg.length > 2 && naa - hjelpLogg[0].t > 10) hjelpLogg.shift();
    const forst = hjelpLogg[0];
    const dt = naa - forst.t;
    if (dt > 1) {
      t += '\nhjelp/s siste ' + Math.round(dt) + ' s:';
      for (const w of spill.spiller.vaapen) {
        const id = w.id;
        const hps = ((spill.stat.hjelpPerVaapen[id] ?? 0) - (forst.h[id] ?? 0)) / dt;
        t += `\n  ${w.evo ? CONFIG.vaapen[id].kombinasjon.navn : CONFIG.vaapen[id].navn}: ${Math.round(hps)}`;
      }
    }
  }
  if (stress) t += `\nSTRESSTEST ${mmss(stress.tid)} / 05:00  laveste FPS ${stress.minFps === 999 ? '-' : stress.minFps}`;
  else if (/** @type {any} */ (window).stressResultat) t += '\n' + /** @type {any} */ (window).stressResultat.logg.slice(-1)[0];
  el('debuginfo').textContent = t;
}

if (DEBUG) {
  el('debug').hidden = false;
  el('debug').addEventListener('click', (e) => {
    const d = /** @type {HTMLElement} */ (e.target).dataset?.d;
    if (!d) return;
    if (d === 'stress') {
      startStresstest();
      return;
    }
    if (!spill) return;
    if (d === 't60') spill.debugHopp(60);
    else if (d === 't180') spill.debugHopp(180);
    else if (d === 'nivaa') spill.debugNivaaOpp();
    else if (d === 'nivaa10') {
      spill.debug.brukt = true;
      for (let n = spill.nivaa, i = 0; i < 10; i++) spill.xp += xpBehov(n + i);
      spill.sjekkNivaa();
    } else if (d === 'maks') spill.debugMaksBygg();
    else if (d === 'komb') spill.debugMaksBygg(spill.spiller.vaapen.map((w) => w.id).concat(['avpaa', 'mus', 'toner', 'fjern']).filter((v, i, a) => a.indexOf(v) === i), true);
    else if (d === 'udoed') {
      spill.debug.brukt = true;
      spill.debug.udoedelig = !spill.debug.udoedelig;
    } else if (d === 'sverm') {
      spill.debug.brukt = true;
      const p = spill.spiller;
      for (let i = 0; i < 100; i++) {
        const a = (i / 100) * Math.PI * 2;
        spawnFiende(spill, i % 7 === 0 ? 'senior' : 'junior', p.x + Math.cos(a) * (200 + (i % 5) * 20), p.y + Math.sin(a) * (200 + (i % 5) * 20));
      }
    } else spill.debugSpawn(d);
    hud.ikonerEndret();
    behandleHendelser();
    if (spill.status === 'nivaaopp' && modus === 'spill') aapneNivaaopp();
  });
  // Gjør spillet tilgjengelig i konsollen for testing.
  Object.defineProperty(window, 'hds', { get: () => ({ spill, CONFIG, modus, tegner, hud, styring, innst, ytelse, startStresstest }) });
}

ui.settPortrettKilde((i) => tegner.fig.portrett(i));
tilpass();
oppdaterLydknapper();
tilStart();
if (new URLSearchParams(location.search).get('debug') === 'karakterer') ui.visKarakterForhaandsvisning(tegner.fig);

// Lag alle figurvariantene mens startskjermen vises. Atlasene skal aldri endres under spill
// (det tvinger nettleseren til å kopiere hele atlaset på nytt og gir hakking).
setTimeout(function lagNoen() {
  if (!tegner.fig.lagNoen(8)) setTimeout(lagNoen, 16);
}, 50);
requestAnimationFrame((ms) => {
  forrige = ms / 1000;
  requestAnimationFrame(ramme);
});

// @ts-check
// Entry point: ties together game, renderer, HUD, input, sound, settings, menus and leaderboard.
import { CONFIG, DT } from './config.js';
import { dateOslo, prettyDate, mmss, formatNumber } from './utils.js';
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { Sound } from './sound.js';
import { Settings } from './settings.js';
import { fetchLeaderboard, submitScore } from './leaderboard.js';
import { multiplier } from './score.js';
import { spawnEnemy, spawnRate, frustrationFactor } from './enemies.js';
import { icon, iconElement } from './icons.js';
import { xpNeeded } from './score.js';
import { MatrixIntro } from './matrixfx.js';
import { capViolations } from './upgrades.js';
import { playBotRound, botReport, testSeed } from './bot.js';
import * as ui from './ui.js';

const { el } = ui;
const DEBUG = new URLSearchParams(location.search).has('debug');

// ?utenGPU: all drawing happens on the CPU, as on an office PC without a graphics card (worst case for performance).
if (new URLSearchParams(location.search).has('utenGPU')) {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = /** @type {any} */ (function (type, options) {
    return type === '2d' ? original.call(this, type, { ...(options || {}), willReadFrequently: true }) : original.call(this, type, options);
  });
}
const NAME_KEY = 'hds_navn';
const CHARACTER_KEY = 'hds_karakter';
const VB = CONFIG.view.width, VH = CONFIG.view.height;

const settings = new Settings();
const sound = new Sound(settings);
const gameCanvas = /** @type {HTMLCanvasElement} */ (el('game'));
const hudCanvas = /** @type {HTMLCanvasElement} */ (el('hud'));
const renderer = new Renderer(gameCanvas, settings);
const hud = new Hud(hudCanvas);
const input = new Input(window);
/** The Matrix's introduction (shown over the game while it is paused). */
const matrixCanvas = /** @type {HTMLCanvasElement} */ (el('matrixFx'));
const matrixIntro = new MatrixIntro(matrixCanvas, renderer.spr, renderer.font);
/** Set when The Matrix card was chosen: the animation plays before the game continues. */
let pendingMatrix = false;
/** The «Kode-regn» banner is only shown the first time in a shift. */
let rainShown = false;

/** @type {Game | null} */
let game = null;
/** 'start' | 'game' | 'pause' | 'levelUp' | 'package' | 'settings' | 'ending' | 'gameOver' */
let mode = 'start';
/** Level-up: «B» was pressed, so the next number banishes a card instead of choosing it. */
let banishMode = false;
/** Where the settings were opened from (for «Tilbake» ("Back")). */
let settingsFrom = 'start';
let date = dateOslo();
let acc = 0;
let previous = 0;
/** Clock that only runs while the game is running – used for animations. */
let animTime = 0;
let cardsReady = 0;
let sent = false;
/** The last whole second the boss clock ticked on. */
let lastTick = -1;
/** Selected character (remembered locally for next time). */
let selectedCharacter = (() => {
  try {
    const i = Number(localStorage.getItem(CHARACTER_KEY));
    return i >= 0 && i < CONFIG.characters.length ? i : 0;
  } catch {
    return 0;
  }
})();

function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

// ---------- Screen size ----------

/**
 * Positions the game: everyone sees exactly 640 × 360 logical pixels of the map.
 * Scaling uses whole device pixels where possible (sharp, equally sized pixels), and the edges are filled with a frame.
 */
function fit() {
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  const spot = Math.min((W * dpr) / VB, (H * dpr) / VH);
  let k;
  const options = settings.v.gameSize;
  if (options === 'fit') {
    // Always a whole multiple of 640 × 360 in real pixels (sharp, equal pixels), unless the screen is smaller than that
    k = spot >= 1 ? Math.floor(spot) : spot;
  } else {
    k = Math.min(Number(options) * dpr, spot);
    if (k >= 1 && k < spot) k = Math.floor(k);
  }
  const wDev = Math.round(VB * k), hDev = Math.round(VH * k);
  const x = Math.round((W * dpr - wDev) / 2) / dpr, y = Math.round((H * dpr - hDev) / 2) / dpr;
  const w = wDev / dpr, h = hDev / dpr;
  gameCanvas.style.width = w + 'px';
  gameCanvas.style.height = h + 'px';
  gameCanvas.style.left = x + 'px';
  gameCanvas.style.top = y + 'px';
  // The Matrix's animation lies exactly over the game, with the same crisp scaling
  matrixCanvas.style.width = w + 'px';
  matrixCanvas.style.height = h + 'px';
  matrixCanvas.style.left = x + 'px';
  matrixCanvas.style.top = y + 'px';

  // UI size
  const v = settings.v.ui;
  const factor = v === 'auto' ? (h < 600 ? 1.25 : 1) : CONFIG.display.uiSizes[v];
  const base = 4 * Math.max(4, Math.round(4.5 * factor * Math.min(1.6, Math.max(0.8, H / 1080))));
  document.documentElement.style.setProperty('--ui', base + 'px');
  hud.fit(W, H, { x, y, w, h }, dpr, factor, settings.v.minimap);
  renderer.margin = hud.marginLogical;

  const buttons = el('hudButtons');
  buttons.style.right = Math.max(8, W - (x + w) + 8) + 'px';
  buttons.style.bottom = Math.max(8, H - (y + h) + 8) + 'px';
}

// ---------- Flow between screens ----------

function toStart() {
  mode = 'start';
  game = null;
  input.active = false;
  date = dateOslo();
  el('shiftDate').textContent = prettyDate(date);
  ui.drawNoticeBoard();
  ui.showScreen('start');
  el('hudButtons').hidden = true;
  loadLeaderboard(el('startList'));
}

/** Character select is shown after «Start vakt» ("Start shift"). */
function showCharacterSelect() {
  mode = 'characterSelect';
  ui.showCharacterSelect(selectedCharacter, selectCharacter);
  ui.showScreen('characterSelect');
  /** @type {HTMLElement | null} */ (document.querySelectorAll('.character')[selectedCharacter])?.focus();
}

/** Selects character no. i (and starts the shift if start = true). The choice is remembered locally. */
function selectCharacter(i, start) {
  selectedCharacter = (i + CONFIG.characters.length) % CONFIG.characters.length;
  ui.markCharacter(selectedCharacter);
  try {
    localStorage.setItem(CHARACTER_KEY, String(selectedCharacter));
  } catch {
    /* ignore */
  }
  if (start) startShift();
}

/**
 * A new run seed («rundeseed», Endringsprompt 6) from the browser's crypto source. In debug mode «?debug&seed=…»
 * replays a round: the same run seed on the same day with the same choices gives the same round.
 */
function newRunSeed() {
  const forced = DEBUG ? new URLSearchParams(location.search).get('seed') : null;
  if (forced && /^[0-9a-f]{1,32}$/i.test(forced)) return forced.toLowerCase();
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return a[0].toString(16).padStart(8, '0') + a[1].toString(16).padStart(8, '0');
}

function startShift() {
  // Today's date in Norwegian time seeds the structure of the shift (the same for everyone all day); the run seed
  // makes the rest of the round new every time (see the Game constructor).
  date = dateOslo();
  // Finish the figures that are not made yet (normally already done while the start screen is shown).
  renderer.fig.makeSome(1e9);
  game = new Game(date, selectedCharacter, newRunSeed());
  // A replayed round (forced run seed) is for debugging only and is never submitted to the leaderboard
  if (DEBUG && new URLSearchParams(location.search).get('seed')) game.debug.used = true;
  hud.portrait = renderer.fig.portrait(selectedCharacter);
  hud.showFired('');
  hud.intro = null;
  lastTick = -1;
  rainShown = false;
  pendingMatrix = false;
  matrixCanvas.hidden = true;
  acc = 0;
  sent = false;
  stress = null;
  input.reset();
  input.active = true;
  hud.iconsChanged();
  ui.showScreen('');
  el('hudButtons').hidden = false;
  mode = 'game';
  sound.play('click');
}

function pause() {
  if (mode !== 'game' || stress) return;
  mode = 'pause';
  input.active = false;
  if (game) ui.drawStatSheet(game, 'pauseStats');
  ui.showScreen('pause');
}

function resume() {
  if (mode !== 'pause') return;
  mode = 'game';
  acc = 0;
  input.reset();
  input.active = true;
  ui.showScreen('');
}

let showSettings = () => {};
function openSettings(from) {
  settingsFrom = from;
  mode = 'settings';
  showSettings();
  ui.showScreen('settings');
  /** @type {HTMLElement} */ (el('settingsBack')).focus();
}
function closeSettings() {
  mode = settingsFrom;
  ui.showScreen(settingsFrom);
}

function openLevelUp() {
  if (!game) return;
  mode = 'levelUp';
  input.active = false;
  banishMode = false;
  cardsReady = performance.now() + 350; // prevents picking a card by accident
  ui.showCards(game, chooseCard, { reroll, banish });
  ui.showScreen('levelUp');
  sound.play('level');
}

function chooseCard(i) {
  if (!game || mode !== 'levelUp' || performance.now() < cardsReady) return;
  if (banishMode) {
    banish(i);
    return;
  }
  game.chooseCard(i);
  handleEvents();
  if (pendingMatrix) {
    startMatrixIntro();
    return;
  }
  if (game.status === 'levelUp') {
    openLevelUp(); // several levels at once
    return;
  }
  backToGame();
}

/** The Matrix was chosen: the short animation plays while the game stays paused (the shift's clock does not run). */
function startMatrixIntro() {
  pendingMatrix = false;
  mode = 'matrixIntro';
  input.active = false;
  ui.showScreen('');
  matrixIntro.start(settings.fewerFlashes);
  matrixCanvas.hidden = false;
  sound.play('matrix');
}

/** The animation is over (or skipped with a click or a key): the game continues where it left off. */
function endMatrixIntro() {
  if (mode !== 'matrixIntro' || !game) return;
  matrixCanvas.hidden = true;
  if (game.status === 'levelUp') {
    openLevelUp();
    return;
  }
  backToGame();
}

/** «Nytt utvalg»: new cards (if there are rerolls left). */
function reroll() {
  if (!game || mode !== 'levelUp' || performance.now() < cardsReady) return;
  if (!game.reroll()) return;
  handleEvents();
  banishMode = false;
  ui.showCards(game, chooseCard, { reroll, banish });
}

/** «Fjern kortet»: card no. i is never offered again this shift. */
function banish(i) {
  if (!game || mode !== 'levelUp' || performance.now() < cardsReady) return;
  banishMode = false;
  if (!game.banish(i)) {
    ui.setBanishMode(false);
    return;
  }
  handleEvents();
  ui.showCards(game, chooseCard, { reroll, banish });
}

/** The supplier package: shows what was in it until the player continues. */
function openPackage() {
  if (!game || !game.packageCards) return;
  mode = 'package';
  input.active = false;
  cardsReady = performance.now() + 300;
  ui.showPackage(game, closePackage);
  ui.showScreen('package');
  sound.play('bonus');
}

function closePackage() {
  if (!game || mode !== 'package' || performance.now() < cardsReady) return;
  game.closePackage();
  handleEvents();
  if (game.status === 'levelUp') {
    openLevelUp();
    return;
  }
  backToGame();
}

function backToGame() {
  mode = 'game';
  acc = 0;
  input.reset();
  input.active = true;
  ui.showScreen('');
}

/** The shift is over: show the end screen with stats and leaderboard. */
function showEnd() {
  if (!game) return;
  mode = 'gameOver';
  input.active = false;
  el('hudButtons').hidden = true;
  // Saving only happens now – never during play.
  if (!game.debug.used) ui.saveCombinations(game.stat.combinations);
  const k = CONFIG.characters[game.character];
  const sp = /** @type {HTMLCanvasElement} */ (el('endPortrait'));
  const spc = /** @type {CanvasRenderingContext2D} */ (sp.getContext('2d'));
  spc.clearRect(0, 0, 64, 64);
  spc.drawImage(renderer.fig.portrait(game.character), 0, 0);
  ui.crisp(sp, 128);
  el('endCharacter').textContent = `${k.name} – ${k.title}`;
  // Fired: a different headline, and which boss was one too many
  el('endTitle').textContent = game.fired ? 'Du har fått sparken!' : 'Vakta er over';
  el('endFired').hidden = !game.fired;
  if (game.fired) el('endFired').textContent = `${game.fired.name} fikk deg sparket ved ${mmss(game.fired.time)}`;
  el('endScore').textContent = formatNumber(game.score);
  el('endTime').textContent = mmss(game.time);
  hud.showFired('');
  ui.drawStats(game);
  ui.drawBosses(game, renderer.fig);
  const name = /** @type {HTMLInputElement} */ (el('name'));
  name.value = loadName();
  name.maxLength = CONFIG.leaderboard.maxName;
  const canSend = !game.debug.used;
  el('nameForm').hidden = !canSend;
  /** @type {HTMLButtonElement} */ (el('submitButton')).disabled = false;
  el('submitStatus').textContent = canSend ? '' : 'Debug-runder sendes ikke inn til topplisten.';
  ui.showScreen('gameOver');
  loadLeaderboard(el('endList'));
}

async function loadLeaderboard(holder) {
  const name = loadName();
  try {
    ui.drawLeaderboard(holder, await fetchLeaderboard(dateOslo(), name), name);
  } catch {
    ui.drawLeaderboard(holder, null, name);
  }
}

async function submit(e) {
  e.preventDefault();
  if (!game || sent || game.debug.used) return;
  const field = /** @type {HTMLInputElement} */ (el('name'));
  const name = field.value.trim().slice(0, CONFIG.leaderboard.maxName);
  if (!name) {
    el('submitStatus').textContent = 'Skriv inn navnet ditt først.';
    field.focus();
    return;
  }
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
  const button = /** @type {HTMLButtonElement} */ (el('submitButton'));
  button.disabled = true;
  el('submitStatus').textContent = 'Sender …';
  try {
    const response = await submitScore({
      name, date: game.date, character: CONFIG.characters[game.character].id, score: game.score, time: Math.round(game.time), helped: game.helped,
      maxMult: CONFIG.multiplier.start + game.stat.maxMultStep * CONFIG.multiplier.step,
      fired: !!game.fired,
      seed: game.runSeed,
    });
    sent = true;
    el('submitStatus').textContent = response.improved
      ? `Registrert! Du ligger på ${response.spot}. plass i dag.`
      : `Du har en bedre runde fra før i dag (${response.spot}. plass). Den står fortsatt.`;
    loadLeaderboard(el('endList'));
  } catch (error) {
    button.disabled = false;
    el('submitStatus').textContent = error instanceof TypeError || /** @type {any} */ (error)?.name === 'AbortError'
      ? 'Topplisten er utilgjengelig akkurat nå. Prøv igjen om litt.'
      : String(/** @type {any} */ (error)?.message || 'Noe gikk galt. Prøv igjen.');
  }
}

// ---------- Events from the game → sound and HUD ----------

function handleEvents() {
  if (!game) return;
  const h = game.events;
  for (let i = 0; i < h.length; i++) {
    const name = h[i];
    switch (name) {
      case 'ticket': sound.play('ticket'); break;
      case 'happy': sound.play('happy'); break;
      case 'hit':
        sound.play('hit');
        renderer.shake = 0.2;
        break;
      case 'dodge': sound.play('tell'); break;
      case 'multUp': sound.play('multUp'); hud.multEffect(1); break;
      case 'multDown': sound.play('multDown'); hud.multEffect(-1); break;
      case 'phase': hud.showBanner(game.phaseName); break;
      case 'tell': sound.play('tell'); break;
      case 'jam': sound.play('jam'); hud.showBanner('Papirstopp! Nå tar den dobbelt så mye hjelp', 'gold', 2200); break;
      case 'johanPhase2': hud.showBanner(CONFIG.bosses.johan.phaseText, 'boss', 2600); break;
      case 'fired':
        sound.play('fired');
        hud.showFired('DU HAR FÅTT SPARKEN!');
        break;
      case 'urgentSpawned': hud.showBanner('Hastesak! Ta igjen den gylne advokaten', 'gold'); break;
      case 'urgentHappy': sound.play('bonus'); break;
      case 'ring': hud.showBanner('De omringer deg – finn åpningen!'); break;
      case 'drink': sound.play('drink'); hud.showBanner('Sukkerkick!', 'gold', 1500); break;
      case 'drinkSpawned': if (game.stat.drinks === 0 && game.time < 60) hud.showBanner('Energidrikk på kartet – følg den grønne pilen!', 'gold', 3500); break;
      case 'newPcFx': sound.play('newPcFx'); hud.showBanner('Ny PC! Alle på skjermen er fornøyde', 'gold'); break;
      case 'upgraded': hud.iconsChanged(); break;
      case 'reroll': case 'banish': sound.play('click'); break;
      case 'revive': sound.play('bonus'); hud.showBanner('Sikkerhetskopi gjenopprettet!', 'gold', 2600); break;
      case 'packageDropped': hud.showBanner('Pakke fra leverandøren! Hent den', 'gold', 3000); break;
      // Endringsprompt 4
      case 'pok': sound.play('pok'); break;
      case 'cookie': sound.play('cookie'); break;
      case 'friendHappy': sound.play('bonus'); break;
      case 'baited': sound.play('hit'); hud.showBanner('Lokkemat! Det var svindel', 'boss', 1800); break;
      case 'hooked': hud.showBanner('Du klikket på lenken!', 'boss', 1400); break;
      case 'codeRain':
        if (!rainShown) {
          rainShown = true;
          hud.showBanner('Kode-regn: bullet time!', 'gold', 2200);
        }
        break;
      case 'matrix': pendingMatrix = true; break;
      // Endringsprompt 5
      case 'cloudSpawned': if (game.stat.cloudSyncs === 0) hud.showBanner(CONFIG.cloudSync.spawnText, 'gold', 3500); break;
      case 'cloudSync': sound.play('cloudSync'); hud.showBanner(CONFIG.cloudSync.pickText, 'gold', 2200); break;
      case 'done': sound.play('done'); break;
      default:
        if (name.startsWith('boss:')) {
          // Each boss gets its own introduction (Johan a bigger one, with the portrait and a darker screen)
          const type = name.slice(5);
          const k = CONFIG.bosses[type];
          sound.play(/** @type {any} */ (type));
          if (type === 'johan') hud.showIntro(renderer.fig.johanPortrait(), k.title, k.line);
          else hud.showBanner(k.intro, 'boss', 4200, k.line);
        } else if (name.startsWith('bossSoon:')) {
          const k = CONFIG.bosses[name.slice(9)];
          sound.play('tell');
          hud.showBanner(`${k.name} kommer om ${CONFIG.bosses.warnBefore} sekunder`, 'boss', 3000);
        } else if (name.startsWith('bossHappy:')) {
          const type = name.slice(10);
          sound.play('bonus');
          hud.showBanner(type === 'johan' ? 'Du hjalp Johan! Den største bossbonusen i spillet' : `${CONFIG.bosses[type].name} er fornøyd!`, 'gold', 3200);
        } else if (name.startsWith('combination:')) {
          const id = name.slice(12);
          sound.play('bonus');
          hud.showBanner(`Kombinasjon: ${CONFIG.weapons[id].combination.name}!`, 'gold', 3500);
        } else if (name.startsWith('captureStart:')) {
          // A capture-point event: the banner, a short sound, and the countdown box in the HUD (see hud.js)
          const k = /** @type {any} */ (CONFIG.capture.defs)[name.slice(13)];
          sound.play('capture');
          hud.showBanner(k.banner, 'gold', 3500, k.name);
        } else if (name.startsWith('captureDone:')) {
          const k = /** @type {any} */ (CONFIG.capture.defs)[name.slice(12)];
          sound.play('bonus');
          hud.showBanner(k.reward, 'gold', 3000, CONFIG.capture.levelText);
          hud.iconsChanged();
        } else if (name.startsWith('captureMissed:')) {
          hud.showBanner(CONFIG.capture.missedText, '', 2400, /** @type {any} */ (CONFIG.capture.defs)[name.slice(14)].name);
        } else if (name.startsWith('event:')) {
          // Lunch rush, partner meeting, coffee break … (see CONFIG.events)
          const id = name.slice(6);
          const k = CONFIG.events.defs[id];
          sound.play(id === 'serverCrash' || id === 'partnerMeeting' ? 'boss' : 'tell');
          hud.showBanner(k.name, id === 'serverCrash' || id === 'partnerMeeting' ? 'boss' : id === 'coffeeBreak' || id === 'freeLunch' ? 'gold' : '', 3200, k.text);
        }
    }
  }
  h.length = 0;
}

// ---------- Main loop ----------

/** Performance measurement (shown in debug mode and used by automatic quality). */
const perf = {
  fps: 60, minFps: 60, avgFps: 60, msUpdate: 0, msDraw: 0,
  frames: 0, time: 0, sumDt: 0, dtCount: 0, fpsWindow: /** @type {number[]} */ ([]),
  slowTime: 0, goodTime: 0,
};

function onFrame(ms) {
  const now = ms / 1000;
  const dt = Math.min(0.25, Math.max(0, now - previous));
  previous = now;
  const t0 = performance.now();

  if (mode === 'game' && game) {
    // Game logic runs on a fixed time step (60 per second), independent of the screen's frame rate.
    acc += dt;
    let step = 0;
    while (acc >= DT && step < CONFIG.maxTicksPerFrame) {
      let [ix, iy] = input.direction();
      if (stress) [ix, iy] = stressInput();
      game.tick(ix, iy);
      acc -= DT;
      step++;
      handleEvents();
      if (game.status !== 'running') {
        acc = 0;
        break;
      }
    }
    // Slow machine: don't try to catch up on everything (avoids the game bogging down more and more).
    if (step === CONFIG.maxTicksPerFrame) acc = 0;
    animTime += dt;
    if (stress) stressTick(dt);
    if (game.status === 'levelUp') {
      if (stress) game.chooseCard(0);
      else openLevelUp();
    } else if (game.status === 'package') {
      if (stress) game.closePackage();
      else openPackage();
    } else if (game.status === 'done') {
      // Fired: the game freezes for a moment with «DU HAR FÅTT SPARKEN!» before the end screen
      mode = 'ending';
      input.active = false;
      setTimeout(showEnd, game.fired ? CONFIG.bosses.firedPause * 1000 : 900);
    }
    // The boss clock ticks audibly in the last seconds
    const boss = game.boss && game.boss.active ? game.boss : null;
    if (boss && mode === 'game' && boss.timer <= CONFIG.bosses.warnRed) {
      const sec = Math.ceil(boss.timer);
      if (sec !== lastTick) {
        lastTick = sec;
        sound.play('tick');
      }
    }
  } else if (mode === 'start') {
    animTime += dt;
  } else if (mode === 'matrixIntro') {
    matrixIntro.draw(dt);
    if (matrixIntro.done) endMatrixIntro();
  }
  const t1 = performance.now();

  renderer.draw(mode === 'start' ? null : game, animTime, mode === 'game' ? dt : 0);
  hud.update(mode === 'start' || mode === 'gameOver' ? null : game, settings, input.joystick);
  const t2 = performance.now();

  measurePerf(dt, t1 - t0, t2 - t1);
  if (stress) {
    // the stress test's frame time: logic + drawing for this frame (not the time waiting for the screen)
    const ms = t2 - t0;
    stress.sumMs += ms;
    stress.msFrames++;
    if (ms > stress.maxMs) stress.maxMs = ms;
    if (ms > 1000 / 60) stress.slowFrames++;
  }
  requestAnimationFrame(onFrame);
}

/** Keeps track of FPS and adjusts quality automatically (visual only – never the game logic). */
function measurePerf(dt, msUpdate, msDraw) {
  const y = perf;
  y.frames++;
  y.time += dt;
  y.msUpdate = y.msUpdate * 0.95 + msUpdate * 0.05;
  y.msDraw = y.msDraw * 0.95 + msDraw * 0.05;
  if (y.time >= 0.5) {
    y.fps = Math.round(y.frames / y.time);
    y.fpsWindow.push(y.fps);
    if (y.fpsWindow.length > 20) y.fpsWindow.shift();
    y.minFps = Math.min(...y.fpsWindow);
    y.avgFps = Math.round(y.fpsWindow.reduce((a, b) => a + b, 0) / y.fpsWindow.length);
    y.frames = 0;
    y.time = 0;
    if (DEBUG) showDebug();
  }
  if (mode !== 'game' || document.hidden) return;
  const K = CONFIG.quality;
  const ms = dt * 1000;
  if (ms > K.limitMs) {
    y.slowTime += dt;
    y.goodTime = 0;
  } else {
    y.goodTime += dt;
    y.slowTime = Math.max(0, y.slowTime - dt * 0.5);
  }
  if (y.slowTime > K.downAfter && renderer.quality < 2) {
    renderer.quality++;
    y.slowTime = 0;
  } else if (y.goodTime > K.upAfter && renderer.quality > 0) {
    renderer.quality--;
    y.goodTime = 0;
  }
}

// ---------- Buttons and keys ----------

function updateSoundButtons() {
  const on = sound.on;
  const button = el('soundButton');
  button.replaceChildren(iconElement(on ? 'soundOn' : 'soundOff'));
  el('startSound').textContent = `Lyd er ${on ? 'på' : 'av'}`;
  el('pauseSound').textContent = `Lyd er ${on ? 'på' : 'av'}`;
}
function swapSound() {
  settings.set('mute', !settings.v.mute);
  if (sound.on) sound.play('test');
}

el('pauseButton').replaceChildren(iconElement('pause'));
const logo = /** @type {HTMLCanvasElement} */ (el('logo'));
/** @type {CanvasRenderingContext2D} */ (logo.getContext('2d')).drawImage(icon('powerCycle'), 0, 0);

el('startButton').addEventListener('click', showCharacterSelect);
el('characterStart').addEventListener('click', () => startShift());
el('characterBack').addEventListener('click', toStart);
el('newShiftButton').addEventListener('click', startShift);
el('toStartButton').addEventListener('click', toStart);
el('pauseButton').addEventListener('click', pause);
el('resumeButton').addEventListener('click', resume);
el('quitButton').addEventListener('click', () => {
  if (!game) return;
  game.status = 'done';
  showEnd();
});
el('soundButton').addEventListener('click', swapSound);
el('startSound').addEventListener('click', swapSound);
el('pauseSound').addEventListener('click', swapSound);
el('startSettings').addEventListener('click', () => openSettings('start'));
el('pauseSettings').addEventListener('click', () => openSettings('pause'));
el('settingsBack').addEventListener('click', closeSettings);
el('nameForm').addEventListener('submit', submit);

const isFullscreen = () => !!document.fullscreenElement;
showSettings = ui.bindSettings(settings, {
  testSound: () => {
    sound.start();
    sound.play('test');
  },
  fullscreen: (on) => {
    try {
      if (on && !isFullscreen()) document.documentElement.requestFullscreen?.().catch(() => {});
      else if (!on && isFullscreen()) document.exitFullscreen?.().catch(() => {});
    } catch {
      /* fullscreen is not supported */
    }
  },
  isFullscreen,
});

settings.onChange((v, changed) => {
  updateSoundButtons();
  if (changed === '*' || changed === 'gameSize' || changed === 'ui' || changed === 'minimap') fit();
});

matrixCanvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  endMatrixIntro();
});

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'text') return;
  if (mode === 'matrixIntro') {
    // any key skips The Matrix's animation
    e.preventDefault();
    endMatrixIntro();
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (mode === 'game') pause();
    else if (mode === 'pause') resume();
    else if (mode === 'settings' && e.code === 'Escape') closeSettings();
  } else if (mode === 'levelUp' && /^(Digit|Numpad)[1-4]$/.test(e.code)) {
    chooseCard(Number(e.code.slice(-1)) - 1);
  } else if (mode === 'levelUp' && e.code === 'KeyR') {
    reroll();
  } else if (mode === 'levelUp' && e.code === 'KeyB') {
    if (game && game.banishes > 0) {
      banishMode = !banishMode;
      ui.setBanishMode(banishMode);
    }
  } else if (mode === 'package' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape')) {
    e.preventDefault();
    closePackage();
  } else if (mode === 'characterSelect') {
    if (/^(Digit|Numpad)[1-4]$/.test(e.code)) selectCharacter(Number(e.code.slice(-1)) - 1, true);
    else if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyD' || e.code === 'KeyS') { e.preventDefault(); selectCharacter(selectedCharacter + 1, false); /** @type {HTMLElement | null} */ (document.querySelectorAll('.character')[selectedCharacter])?.focus(); }
    else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyA' || e.code === 'KeyW') { e.preventDefault(); selectCharacter(selectedCharacter - 1, false); /** @type {HTMLElement | null} */ (document.querySelectorAll('.character')[selectedCharacter])?.focus(); }
    else if (e.code === 'Enter' && !e.repeat) { e.preventDefault(); startShift(); }
    else if (e.code === 'Escape') toStart();
  } else if (e.code === 'Enter' && !e.repeat && mode === 'start' && document.activeElement === document.body) {
    showCharacterSelect();
  }
});

// Pause automatically when the tab or window loses focus (also when fullscreen is exited with Esc).
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
document.addEventListener('fullscreenchange', () => {
  if (!isFullscreen()) pause();
  setTimeout(fit, 50);
});
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 100));
gameCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- Debug mode (?debug) ----------

/**
 * Stress test: minute 15, a build with combinations, max lawyers, without being able to die.
 * sumMs/maxMs = the time per frame spent on logic + drawing (average and worst single frame), slowFrames = frames
 * over 16.7 ms (a visible hitch).
 */
let stress = /** @type {null | {name: string, duration: number, time: number, frames: number, minFps: number, sumFps: number, measurements: number, heapStart: number, heapMax: number, heapEnd: number, sumMs: number, maxMs: number, msFrames: number, slowFrames: number, log: string[]}} */ (null);
const heap = () => (/** @type {any} */ (performance).memory ? /** @type {any} */ (performance).memory.usedJSHeapSize / 1048576 : -1);

/**
 * The stress test scenarios (Endringsprompt 6, section 7): every combination (four at a time, the slots are four),
 * The Matrix, each boss, and a capture-point event with the office events on top. «main» is the original 5-minute test.
 * @type {Record<string, {text: string, combos?: string[], matrix?: boolean, boss?: string, event?: boolean}>}
 */
const STRESS = {
  main: { text: 'Tofaktor, Kontorprinteren, Ping of Death, The Matrix + Anonymous', combos: ['password', 'toner', 'pingpong'], matrix: true, boss: 'frida' },
  kombo1: { text: 'Full omstart, Kontorprinteren, Tofaktor, Kabelkaos', combos: ['powerCycle', 'toner', 'password', 'hdmi'] },
  kombo2: { text: 'Domene-admin, Musematta, Ctrl+Alt+Del, Tvungen oppdatering', combos: ['remote', 'mouse', 'ctrlz', 'beam'] },
  kombo3: { text: 'Allmøte på Teams, Himmelsk serviceavtale, Hjemmekontor, Ping of Death', combos: ['teams', 'angel', 'headset', 'pingpong'] },
  kombo4: { text: 'Neste generasjons brannmur, Allmøte, Tofaktor, Musematta', combos: ['bodyguard', 'teams', 'password', 'mouse'] },
  boss1: { text: 'Nørdic-konsulenten', combos: ['password', 'toner', 'pingpong'], matrix: true, boss: 'nordic' },
  boss2: { text: 'Multifunksjonsmonsteret', combos: ['password', 'toner', 'pingpong'], matrix: true, boss: 'printerBoss' },
  boss3: { text: 'Anonymous og venninnene', combos: ['password', 'toner', 'pingpong'], matrix: true, boss: 'frida' },
  boss4: { text: 'Johan', combos: ['password', 'toner', 'pingpong'], matrix: true, boss: 'johan' },
  hendelse: { text: 'Snacks på Jacobs + lunsjrush + partnermøte', combos: ['teams', 'angel', 'mouse', 'pingpong'], event: true },
};
/** The scenarios of «Stresstest-serie», each for «seriesSeconds». */
const STRESS_SERIES = ['kombo1', 'kombo2', 'kombo3', 'kombo4', 'main', 'boss1', 'boss2', 'boss3', 'boss4', 'hendelse'];
/** @type {string[]} */
let stressQueue = [];
/** @type {string[]} */
const stressResults = [];

function startStressTest(name = 'main', duration = 300) {
  const sc = STRESS[name];
  startShift();
  if (!game) return;
  const s = game;
  s.debugSkip(15 * 60 - 1);
  // The heaviest weapons as combinations: chains, many projectiles, the bouncing balls of Ping of Death (12 at
  // once), and The Matrix (mini printers, firewalls and the code rain with bullet time)
  s.debugMaxBuild(sc.combos ?? [], true);
  if (sc.matrix) s.debugMatrixBuild();
  s.debug.immortal = true;
  if (sc.boss) {
    // The boss is out during the whole test (with immortality its countdown starts over instead of firing the player)
    s.debugBoss(sc.boss);
    if (s.boss) s.boss.hp = s.boss.maxHp = 1e12;
  }
  if (sc.event) {
    s.debugCapture('snacks');
    s.debugFireEvent('lunchRush');
    s.debugFireEvent('partnerMeeting');
  }
  hud.iconsChanged();
  handleEvents();
  pendingMatrix = false;
  stress = { name, duration, time: 0, frames: 0, minFps: 999, sumFps: 0, measurements: 0, heapStart: heap(), heapMax: heap(), heapEnd: 0, sumMs: 0, maxMs: 0, msFrames: 0, slowFrames: 0, log: [] };
  console.log(`[stresstest] start «${name}»: minutt 15, ${sc.text}, maks advokater, ${duration} s`);
}

/** «Stresstest-serie»: every scenario one after the other (about 10 minutes), then a summary in the console. */
let inSeries = false;
function startStressSeries() {
  stressResults.length = 0;
  stressQueue = STRESS_SERIES.slice();
  inSeries = true;
  nextInSeries();
}
function nextInSeries() {
  const name = stressQueue.shift();
  if (!name) {
    inSeries = false;
    console.log('[stresstest] SERIE FERDIG\n' + stressResults.join('\n'));
    /** @type {any} */ (window).stressSeries = stressResults.slice();
    return;
  }
  startStressTest(name, name === 'main' ? 300 : 60);
}

/**
 * «Bot-test» in ?debug (Endringsprompt 6): the automatic test player plays CONFIG.botTest.browserRounds rounds in the
 * page with no drawing (one round at a time, so the page stays responsive), then the report is printed to the console
 * and shown in the overlay. For 100+ rounds, use «node tools/bot-test.js» (much faster).
 */
let botTestText = '';
async function runBotTestInPage() {
  const n = CONFIG.botTest.browserRounds, rounds = [];
  for (let i = 0; i < n; i++) {
    botTestText = `Bot-test: runde ${i + 1} av ${n} …`;
    await new Promise((r) => setTimeout(r, 0));
    rounds.push(playBotRound({ date: dateOslo(), character: i % CONFIG.characters.length, runSeed: testSeed(i), skill: 0.9 }));
  }
  botTestText = botReport(rounds, 'Bot-test i nettleseren (god spiller)');
  console.log(botTestText);
}

/** The weapons each character builds toward in the boss test (starting weapon first). */
const TEST_PLANS = [['powerCycle', 'mouse', 'toner', 'remote'], ['toner', 'powerCycle', 'hdmi', 'remote'], ['hdmi', 'powerCycle', 'mouse', 'teams'], ['mouse', 'powerCycle', 'ctrlz', 'beam']];

/** ?debug=boss1 … boss4: jumps straight to that boss with a reasonable build for the time. */
function startBossTest(n) {
  startShift();
  if (!game) return;
  game.debugBossTest(n, TEST_PLANS[game.character]);
  hud.iconsChanged();
  console.log(`[bosstest] boss ${n}: ${game.player.weapons.map((w) => w.id + (w.evo ? '*' : '') + ' +' + w.picks).join(', ')}`);
}

function stressInput() {
  const a = animTime * 0.6;
  return [Math.cos(a), Math.sin(a * 1.3)];
}

function stressTick(dt) {
  if (!stress || !game) return;
  const s = game;
  // Keep the count at the cap at all times
  const p = s.player;
  for (let i = 0; s.enemies.n < CONFIG.spawn.maxConcurrent && i < 40; i++) {
    const v = (s.nextUid * 2.399) % (Math.PI * 2);
    const type = i % 6 === 0 ? 'senior' : i % 7 === 0 ? 'printer' : i % 5 === 0 && s.senderCount < 30 ? 'sender' : 'junior';
    spawnEnemy(s, type, p.x + Math.cos(v) * 260, p.y + Math.sin(v) * 200);
  }
  stress.time += dt;
  stress.frames++;
  if (Math.floor(stress.time) !== Math.floor(stress.time - dt)) {
    stress.minFps = Math.min(stress.minFps, perf.fps);
    stress.sumFps += perf.fps;
    stress.measurements++;
    const h = heap();
    stress.heapMax = Math.max(stress.heapMax, h);
    if (Math.floor(stress.time) % 30 === 0) {
      const line = `${mmss(stress.time)}: ${perf.fps} FPS, oppdatering ${perf.msUpdate.toFixed(2)} ms, tegning ${perf.msDraw.toFixed(2)} ms, advokater ${s.enemies.n}, effekter ${s.effects.n}, minne ${h.toFixed(1)} MB, kvalitet ${renderer.quality}`;
      stress.log.push(line);
      console.log('[stresstest] ' + line);
    }
  }
  if (stress.time >= stress.duration) {
    stress.heapEnd = heap();
    const res = `Stresstest «${stress.name}» ferdig: snitt ${Math.round(stress.sumFps / Math.max(1, stress.measurements))} FPS, laveste ${stress.minFps} FPS, ` +
      `frametid snitt ${(stress.sumMs / Math.max(1, stress.msFrames)).toFixed(2)} ms, verste ${stress.maxMs.toFixed(1)} ms, hakk (>16,7 ms) ${stress.slowFrames}, ` +
      `minne start ${stress.heapStart.toFixed(1)} MB → maks ${stress.heapMax.toFixed(1)} MB → slutt ${stress.heapEnd.toFixed(1)} MB, prosjektiler ${s.projectiles.n}, effekter ${s.effects.n}`;
    console.log('[stresstest] ' + res);
    console.log('[stresstest] e-poster nå: ' + s.enemyShots.n + ', avsendere: ' + s.senderCount);
    stress.log.push(res);
    stressResults.push(res);
    /** @type {any} */ (window).stressResult = stress;
    s.status = 'done';
    stress = null;
    if (inSeries) setTimeout(nextInSeries, 600);
  }
}

/** @type {{t: number, h: Record<string, number>}[]} */
const helpLog = [];

/** The cap warnings already shown (Endringsprompt 6: warn once per problem). */
const capWarned = new Set();

/**
 * The automatic level cap check in debug mode: warns (console, banner and overlay) if any weapon goes over
 * CONFIG.limits.weaponLevel or any passive over CONFIG.limits.passiveLevel, so the bug from version 6–7.1 cannot return.
 */
function checkCaps(s) {
  const bad = capViolations(s);
  for (const b of bad) {
    if (capWarned.has(b)) continue;
    capWarned.add(b);
    console.error('[nivåtak] brutt: ' + b);
    hud.showBanner('Nivåtaket er brutt: ' + b, 'boss', 5000);
  }
  return bad.length ? `NIVÅTAK BRUTT: ${bad.join(', ')}` : `nivåtak ok (våpen ${CONFIG.limits.weaponLevel}, passive ${CONFIG.limits.passiveLevel})`;
}

/** The level pace over the last two minutes of shift time (Endringsprompt 5: aim for about 20–30 s at minute 8). */
function levelPace(s) {
  const from = Math.max(0, s.time - 120);
  let n = 0;
  for (const t of s.levelLog) if (t >= from) n++;
  return n ? `nivåopp hvert ${Math.round((s.time - from) / n)}. s (siste 2 min)` : 'nivåopp: ingen siste 2 min';
}

function showDebug() {
  const y = perf;
  const memory = heap();
  let t = `FPS ${y.fps} (min ${y.minFps}, snitt ${y.avgFps})  kvalitet ${['full', 'middels', 'lav'][renderer.quality]}\n` +
    `ms/bilde: oppdatering ${y.msUpdate.toFixed(2)}  tegning ${y.msDraw.toFixed(2)}\n` +
    (memory >= 0 ? `minne ${memory.toFixed(1)} MB\n` : 'minne: ikke tilgjengelig i denne nettleseren\n');
  if (game) {
    const s = game;
    t += `tid ${mmss(s.time)}  ${s.phaseName}\n` +
      `advokater ${s.enemies.n}  prosjektiler ${s.projectiles.n}  effekter ${s.effects.n}\n` +
      `lapper ${s.tickets.n}  glade (animasjon) ${renderer.happyShown}  spart ${s.spared}\n` +
      `inn/sek ${spawnRate(s.time).toFixed(1)}  frustrasjon ×${frustrationFactor(s.time).toFixed(2)}\n` +
      `mult x${multiplier(s).toFixed(1)}  hjulpne ${s.helped}  nivå ${s.level}\n` +
      `${levelPace(s)}  sky-synk ${s.stat.cloudSyncs}  punkt ${s.stat.captures}/${s.stat.captureEvents}\n` +
      `${checkCaps(s)}\n` +
      `udødelig: ${s.debug.immortal ? 'JA' : 'nei'}  dagens vakt: ${s.date}\nrundeseed: ${s.runSeed}  (spill av på nytt: ?debug&seed=${s.runSeed})`;
  }
  if (game) {
    // Help per second per weapon (last ca. 10 seconds) – used to compare weapons and combinations
    const now = game.time;
    helpLog.push({ t: now, h: { ...game.stat.helpPerWeapon } });
    while (helpLog.length > 2 && now - helpLog[0].t > 10) helpLog.shift();
    const atFirst = helpLog[0];
    const dt = now - atFirst.t;
    if (dt > 1) {
      t += '\nhjelp/s siste ' + Math.round(dt) + ' s:';
      for (const w of game.player.weapons) {
        const id = w.id;
        const hps = ((game.stat.helpPerWeapon[id] ?? 0) - (atFirst.h[id] ?? 0)) / dt;
        t += `\n  ${w.evo ? CONFIG.weapons[id].combination.name : CONFIG.weapons[id].name}: ${Math.round(hps)}`;
      }
    }
  }
  if (stress) t += `\nSTRESSTEST «${stress.name}» ${mmss(stress.time)} / ${mmss(stress.duration)}  laveste FPS ${stress.minFps === 999 ? '-' : stress.minFps}  frametid ${(stress.sumMs / Math.max(1, stress.msFrames)).toFixed(2)} ms` + (inSeries ? `  (serie: ${stressQueue.length} igjen)` : '');
  else if (/** @type {any} */ (window).stressResult) t += '\n' + /** @type {any} */ (window).stressResult.log.slice(-1)[0];
  if (botTestText) t += '\n' + botTestText;
  el('debuginfo').textContent = t;
}

if (DEBUG) {
  el('debug').hidden = false;
  el('debug').addEventListener('click', (e) => {
    const d = /** @type {HTMLElement} */ (e.target).dataset?.d;
    if (!d) return;
    if (d === 'stress') {
      startStressTest();
      return;
    }
    if (d === 'stressSeries') {
      startStressSeries();
      return;
    }
    if (d === 'botTest') {
      runBotTestInPage();
      return;
    }
    if (/^boss[1-4]$/.test(d)) {
      startBossTest(Number(d.slice(4)));
      return;
    }
    if (!game) return;
    if (d === 't60') game.debugSkip(60);
    else if (d === 't180') game.debugSkip(180);
    else if (d === 'level') game.debugLevelUp();
    else if (d === 'level10') {
      game.debug.used = true;
      for (let n = game.level, i = 0; i < 10; i++) game.xp += xpNeeded(n + i);
      game.checkLevel();
    } else if (d === 'max') game.debugMaxBuild();
    else if (d === 'matrixBuild') game.debugMatrixBuild();
    else if (d === 'pingBuild') {
      game.debugMaxBuild(['pingpong', 'bodyguard'], false, CONFIG.upgrades.combinationAfter);
      for (let i = 0; i < CONFIG.limits.passiveLevel; i++) game.debugGivePassive('sneakers');
    }
    else if (d === 'combo') game.debugMaxBuild(game.player.weapons.map((w) => w.id).concat(['powerCycle', 'mouse', 'toner', 'remote']).filter((v, i, a) => a.indexOf(v) === i), true);
    else if (d === 'immortal') {
      game.debug.used = true;
      game.debug.immortal = !game.debug.immortal;
    } else if (d === 'swarm') {
      game.debug.used = true;
      const p = game.player;
      for (let i = 0; i < 100; i++) {
        const a = (i / 100) * Math.PI * 2;
        spawnEnemy(game, i % 7 === 0 ? 'senior' : 'junior', p.x + Math.cos(a) * (200 + (i % 5) * 20), p.y + Math.sin(a) * (200 + (i % 5) * 20));
      }
    } else if (d.startsWith('capture:')) game.debugCapture(d.slice(8));
    else game.debugSpawn(d);
    hud.iconsChanged();
    handleEvents();
    if (pendingMatrix && mode === 'game') startMatrixIntro();
    if (game.status === 'levelUp' && mode === 'game') openLevelUp();
    if (game.status === 'package' && mode === 'game') openPackage();
  });
  // Make the game available in the console for testing.
  Object.defineProperty(window, 'hds', { get: () => ({ game, CONFIG, mode, renderer, hud, input, settings, perf, startStressTest }) });
}

// The client's own pixel art for the four playable characters (assets/karakterer/) must be loaded before anything is drawn.
await renderer.fig.loadCharacters();
ui.setPortraitSource((i) => renderer.fig.portrait(i));
ui.setFigureSource((i) => renderer.fig.sheet('player', i));
fit();
updateSoundButtons();
toStart();
const debugParam = new URLSearchParams(location.search).get('debug') ?? '';
if (debugParam === 'karakterer') ui.showCharacterPreview(renderer.fig);
// ?debug=boss1 … boss4: straight to that boss (after the figures are made)
if (/^boss[1-4]$/.test(debugParam)) setTimeout(() => startBossTest(Number(debugParam.slice(4))), 300);

// Make all the figure variants while the start screen is shown. The atlases must never change during play
// (that forces the browser to copy the whole atlas again and causes stutter).
setTimeout(function makeSome() {
  if (!renderer.fig.makeSome(8)) setTimeout(makeSome, 16);
}, 50);
requestAnimationFrame((ms) => {
  previous = ms / 1000;
  requestAnimationFrame(onFrame);
});

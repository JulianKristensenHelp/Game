// @ts-check
// Draws the game world as pixel art on an internal canvas of 640 × 360 logical pixels.
// The canvas is scaled up with nearest-neighbour in CSS, so the pixels stay sharp.
// Only reads from the game state – never changes the game logic. Automatic quality only affects what is shown.
import { CONFIG, SENDER_BUBBLES } from './config.js';
import { ZONES, GLASS, makeDecor, INSIDE } from './map.js';
import { makeSprites, ring, splash, drawSprite } from './sprites.js';
import { Figures, TILE, POSE } from './figures.js';
import { TYPE_NAMES, figureType } from './enemies.js';
import { BitmapFont, textWidth, HEIGHT as FONT_H } from './pixelfont.js';
import { weaponStats, spiralPos, angelPos } from './weapons.js';
import { Rng, TAU, mmss } from './utils.js';
import { makeCanvas, ctx2d } from './pixel.js';
import { icon } from './icons.js';
import { ELITE_TRAIT } from './enemies.js';
import { freshTime } from './tickets.js';

const VB = CONFIG.view.width, VH = CONFIG.view.height;
const KB = CONFIG.map.width, KH = CONFIG.map.height;
const SHADOW = { junior: 'small', printer: 'medium', senior: 'large', urgent: 'large', boss: 'boss', sender: 'small', friend: 'medium' };
/** Characters for the code rain (drawn with the game's own pixel font – digits and capitals). */
const CODE_CHARS = '0123456789ABCDEFHKMNPRTXZ';

/** Sort function (created once, so sorting produces no garbage). */
const afterY = (a, b) => a.y - b.y;

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas the game canvas (640 × 360)
   * @param {{shake: boolean, fewerFlashes: boolean, hitNumbers: boolean, bars: boolean}} settings
   */
  constructor(canvas, settings) {
    this.canvas = canvas;
    canvas.width = VB;
    canvas.height = VH;
    this.ctx = ctx2d(canvas);
    this.settings = settings;
    this.spr = makeSprites();
    this.fig = new Figures();
    this.font = new BitmapFont();
    this.map = this.makeMap();
    /** 0 = full quality, 1 = medium, 2 = low (set by main.js based on time per frame). */
    this.quality = 0;
    /** Decoration only (speech bubbles) – does not affect the game. */
    this.rng = new Rng('pynt');
    /** @type {{e: any, uid: number, text: string, t: number}[]} */
    this.bubbles = [];
    this.bubbleWait = 2;
    /** @type {Map<string, HTMLCanvasElement>} */
    this.bubbleCache = new Map();
    /** @type {Map<string, HTMLCanvasElement>} */
    this.textCache = new Map();
    /** The capture-point icons as sprites. @type {Map<string, any>} */
    this.capIcons = new Map();
    this.shake = 0;
    /** @type {any[]} */
    this.sorted = [];
    this.visibleCount = 0;
    this.playerDirection = 1;
    /** Margins (logical pixels) where the HUD sits, so the arrows do not end up behind it. */
    this.margin = { top: 40, bottom: 50, left: 12, right: 12 };
    /** Number of happy lawyers being animated right now (shown in debug). */
    this.happyShown = 0;
    /** Hit numbers: outlined digit sheets per color, 8 × 8 weapon icons, and reused digit buffer (no allocation per frame). */
    /** @type {Map<string, HTMLCanvasElement>} */
    this.digitSheets = new Map();
    /** @type {HTMLCanvasElement[]} */
    this.iconSmall = [];
    this.digits = new Int32Array(8);
    /** Frustration bars: positions collected in one pass, drawn in two (one fill color per pass). */
    this.barX = new Float32Array(512);
    this.barY = new Float32Array(512);
    this.barW = new Float32Array(512);
    this.barF = new Float32Array(512);
    /** @type {Map<string, HTMLCanvasElement>} */
    this.labelCache = new Map();
    /** Shopkeeperen's position (looks only: he follows the player with a little delay). */
    this.shopX = 0;
    this.shopY = 0;
    /** The code rain columns (looks only): x, y and speed per column, and one sheet of green glyphs. */
    this.rainCols = Array.from({ length: 40 }, (_, i) => ({ x: i * 16 + 4, y: -this.rng.next() * VH, v: 70 + this.rng.next() * 90, c: this.rng.integer(CODE_CHARS.length) }));
    /** @type {HTMLCanvasElement | null} */
    this.codeSheet = null;
  }

  /** One sheet with every code-rain glyph in two greens (bright head, dimmer trail), 6 px per cell. Made once. */
  codeGlyphs() {
    if (this.codeSheet) return this.codeSheet;
    const c = makeCanvas(CODE_CHARS.length * 6, (FONT_H + 1) * 2);
    const ctx = ctx2d(c);
    for (let i = 0; i < CODE_CHARS.length; i++) {
      this.font.draw(ctx, CODE_CHARS[i], i * 6, 0, '#c8ffd4');
      this.font.draw(ctx, CODE_CHARS[i], i * 6, FONT_H + 1, '#2fd06a');
    }
    this.codeSheet = c;
    return c;
  }

  // ---------- The map (pre-rendered once) ----------

  makeMap() {
    const c = makeCanvas(KB, KH);
    const ctx = ctx2d(c);
    const g = this.spr.floor;
    // Floor per zone
    for (const s of ZONES) {
      ctx.fillStyle = /** @type {CanvasPattern} */ (ctx.createPattern(g[s.floor], 'repeat'));
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
    // Trim strips between the zones
    ctx.fillStyle = 'rgba(40, 40, 60, 0.35)';
    for (const s of ZONES.slice(1)) {
      ctx.fillRect(s.x, s.y, s.w, 2);
      ctx.fillRect(s.x, s.y + s.h - 2, s.w, 2);
      ctx.fillRect(s.x, s.y, 2, s.h);
      ctx.fillRect(s.x + s.w - 2, s.y, 2, s.h);
    }
    // Decor (sorted by y, so things further down are drawn on top)
    const decor = makeDecor().sort((a, b) => a.y - b.y);
    for (const p of decor) {
      const s = this.spr.decor[p.t];
      if (s) drawSprite(ctx, s, p.x, p.y);
    }
    // Glass walls (decoration only, do not block)
    for (const [x0, y0, x1, y1] of GLASS) {
      const vertical = x0 === x1;
      const w = vertical ? 4 : x1 - x0, h = vertical ? y1 - y0 : 4;
      ctx.fillStyle = 'rgba(168, 220, 255, 0.45)';
      ctx.fillRect(x0 - (vertical ? 2 : 0), y0 - (vertical ? 0 : 2), w, h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(x0 - (vertical ? 2 : 0), y0 - (vertical ? 0 : 2), vertical ? 1 : w, vertical ? h : 1);
      ctx.fillStyle = '#5d6b7a';
      const lengthPx = vertical ? h : w;
      for (let i = 0; i <= lengthPx; i += 40) {
        if (vertical) ctx.fillRect(x0 - 2, y0 + Math.min(i, lengthPx - 2), 4, 2);
        else ctx.fillRect(x0 + Math.min(i, lengthPx - 2), y0 - 2, 2, 4);
      }
    }
    this.drawWalls(ctx);
    return c;
  }

  /** Outer walls with windows, elevator doors, entrance and emergency exits. */
  drawWalls(ctx) {
    const V = CONFIG.map.wall;
    // The top wall (we see the wall face)
    ctx.fillStyle = '#d9d2c3';
    ctx.fillRect(0, 0, KB, V.top);
    ctx.fillStyle = '#c4bba8';
    ctx.fillRect(0, V.top - 8, KB, 2);
    ctx.fillStyle = '#7d705d';
    ctx.fillRect(0, V.top - 6, KB, 6);
    ctx.fillStyle = '#3d3a40';
    ctx.fillRect(0, 0, KB, 4);
    // Windows
    for (let x = 40; x < KB - 80; x += 160) {
      if (x > 1020 && x < 1520) continue;
      ctx.fillStyle = '#5d6b7a';
      ctx.fillRect(x, 8, 72, 22);
      ctx.fillStyle = '#9fd3f0';
      ctx.fillRect(x + 2, 10, 68, 18);
      ctx.fillStyle = '#c8ecff';
      ctx.fillRect(x + 2, 10, 68, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 10 + (x % 30), 12, 10, 3);
      ctx.fillStyle = '#5d6b7a';
      ctx.fillRect(x + 35, 10, 2, 18);
    }
    // Elevator doors
    for (const x of [1110, 1240, 1370]) {
      ctx.fillStyle = '#5d6b7a';
      ctx.fillRect(x, 4, 80, V.top - 4);
      ctx.fillStyle = '#b9c3cd';
      ctx.fillRect(x + 4, 10, 35, V.top - 10);
      ctx.fillRect(x + 41, 10, 35, V.top - 10);
      ctx.fillStyle = '#eef1f5';
      ctx.fillRect(x + 4, 10, 2, V.top - 10);
      ctx.fillRect(x + 41, 10, 2, V.top - 10);
      ctx.fillStyle = '#f5cf3a';
      ctx.fillRect(x + 36, 5, 8, 3);
    }
    // Side walls and bottom wall (seen from above)
    ctx.fillStyle = '#4a4f5c';
    ctx.fillRect(0, 0, V.left, KH);
    ctx.fillRect(KB - V.right, 0, V.right, KH);
    ctx.fillRect(0, KH - V.bottom, KB, V.bottom);
    ctx.fillStyle = '#6b7383';
    ctx.fillRect(V.left - 3, V.top, 3, KH - V.top - V.bottom);
    ctx.fillRect(KB - V.right, V.top, 3, KH - V.top - V.bottom);
    ctx.fillRect(V.left, KH - V.bottom, KB - V.left - V.right, 3);
    // Main entrance (glass doors) and emergency exits
    ctx.fillStyle = '#a8dcff';
    ctx.fillRect(1236, KH - V.bottom, 88, V.bottom);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1279, KH - V.bottom, 2, V.bottom);
    for (const y of [736, 1226]) {
      ctx.fillStyle = '#2fd06a';
      ctx.fillRect(0, y, V.left, 48);
      ctx.fillRect(KB - V.right, y, V.right, 48);
    }
    for (const [x, y] of [[30, 300], [600, KH - V.bottom], [2000, 4]]) {
      ctx.fillStyle = '#8a6f4c';
      if (y === 4) ctx.fillRect(x - 24, 4, 48, V.top - 4);
      else if (x === 30) ctx.fillRect(0, y - 24, V.left, 48);
      else ctx.fillRect(x - 24, y, 48, V.bottom);
    }
  }

  // ---------- One frame ----------

  /**
   * @param {import('./game.js').Game | null} s
   * @param {number} now animation clock in seconds
   * @param {number} dt seconds since the previous frame (0 when the game is paused)
   */
  draw(s, now, dt) {
    const ctx = this.ctx;
    let kx = s ? Math.round(s.camera.x) : Math.round((KB - VB) / 2 + Math.sin(now * 0.1) * 300);
    let ky = s ? Math.round(s.camera.y) : Math.round((KH - VH) / 2 + Math.cos(now * 0.13) * 200);
    if (this.shake > 0) {
      this.shake -= dt;
      if (this.settings.shake) {
        kx += Math.round(Math.sin(now * 90) * 2);
        ky += Math.round(Math.cos(now * 70) * 2);
      }
    }
    kx = Math.max(0, Math.min(KB - VB, kx));
    ky = Math.max(0, Math.min(KH - VH, ky));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(this.map, kx, ky, VB, VH, 0, 0, VB, VH);
    if (!s) return;
    ctx.setTransform(1, 0, 0, 1, -kx, -ky);
    const x0 = kx - 48, y0 = ky - 48, x1 = kx + VB + 48, y1 = ky + VH + 64;
    const item = this.spr.item;
    const fewerFlashes = this.settings.fewerFlashes;

    // Paper piles
    for (let i = 0; i < s.paper.n; i++) {
      const h = s.paper.items[i];
      ctx.globalAlpha = Math.min(1, h.life / 1.2);
      drawSprite(ctx, item.paper, h.x, h.y);
    }
    ctx.globalAlpha = 1;

    // Ink puddles from the printer boss
    for (let i = 0; i < s.puddles.n; i++) {
      const h = s.puddles.items[i];
      ctx.globalAlpha = Math.min(1, h.life / 0.8);
      drawSprite(ctx, item.puddle[h.color], h.x, h.y);
    }
    ctx.globalAlpha = 1;

    this.drawEffectsUnder(s, now);

    // Partner aura: a faint gold ring around the elites that shield their neighbours
    for (let i = 0; i < s.elites.length; i++) {
      const e = s.elites[i];
      ctx.globalAlpha = fewerFlashes ? 0.5 : 0.4 + Math.sin(now * 3) * 0.15;
      drawSprite(ctx, ring(CONFIG.elites.traits.aura.radius, '#f5cf3a', 1, 0.06, 4), e.x, e.y);
    }
    ctx.globalAlpha = 1;

    // The capture-point event's circle on the floor (under the tickets and the figures)
    if (s.capture.active) this.drawCapture(s, s.capture.active, now);

    // Tickets (Endringsprompt 5): they never disappear and never blink. Fresh ones are bright yellow; stale ones are
    // yellowed with a dog-ear; case piles are a stack that grows with what it holds.
    const fresh = freshTime(s);
    const PS = CONFIG.tickets.pileSizes;
    for (let i = 0; i < s.tickets.n; i++) {
      const l = s.tickets.items[i];
      if (l.x < x0 || l.x > x1 || l.y < y0 || l.y > y1) continue;
      let spr;
      if (l.count >= PS[0]) spr = item.piles[l.count >= PS[2] ? 2 : l.count >= PS[1] ? 1 : 0];
      else if (l.age > fresh) spr = l.xp > 60 ? item.ticketStaleLarge : item.ticketStale;
      else spr = l.xp > 60 ? item.ticketLarge : item.ticket;
      drawSprite(ctx, spr, l.x, l.y);
    }

    // Energy drink, Ny PC and the supplier package (glow and a small bounce)
    for (let i = 0; i < s.pickups.n; i++) {
      const pk = s.pickups.items[i];
      if (pk.x < x0 || pk.x > x1 || pk.y < y0 || pk.y > y1) continue;
      if (pk.type === 'cookie') {
        // «Helsekjeks»: a soft warm glow (unlike the tickets), blinking the last seconds like them
        const CK = CONFIG.cookie;
        if (pk.age > CK.lifetime - CK.blinkTime) {
          if (fewerFlashes) ctx.globalAlpha = 0.5;
          else if (Math.floor(pk.age * 7) % 2 === 0) continue;
        }
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * (fewerFlashes ? 0.6 : 0.5 + Math.sin(now * 3 + i) * 0.15);
        drawSprite(ctx, item.cookieGlow, pk.x, pk.y);
        ctx.globalAlpha = a;
        drawSprite(ctx, item.cookie, pk.x, pk.y);
        ctx.globalAlpha = 1;
        continue;
      }
      if (pk.type === 'fakeDrink' || pk.type === 'fakePc') {
        // Fiske-Frida's bait: almost the real thing – a slightly wrong colour, a visible hook, a different, uneven
        // glint (a quick double blink instead of the real ones' slow pulse) and a stiffer bounce
        const bounce = fewerFlashes ? 0 : Math.floor(now * 2 + i) % 2 ? -2 : 0;
        ctx.globalAlpha = fewerFlashes ? 0.6 : Math.floor(now * 6 + i) % 5 < 2 ? 0.75 : 0.35;
        drawSprite(ctx, item.fakeGlow, pk.x, pk.y);
        ctx.globalAlpha = 1;
        drawSprite(ctx, pk.type === 'fakeDrink' ? item.fakeDrink : item.fakePc, pk.x, pk.y + bounce);
        if (!fewerFlashes && this.quality < 2 && Math.floor(now * 6 + i) % 5 === 0) drawSprite(ctx, item.glitter[2], pk.x + 8, pk.y + 2 + bounce);
        continue;
      }
      const bounce = fewerFlashes ? 0 : Math.round(Math.abs(Math.sin(now * 3 + i)) * -3);
      ctx.globalAlpha = fewerFlashes ? 0.7 : 0.55 + Math.sin(now * 4 + i) * 0.25;
      const glowSpr = pk.type === 'drink' ? item.drinkGlow : pk.type === 'package' ? item.packageGlow : pk.type === 'cloud' ? item.cloudGlow : item.pcGlow;
      drawSprite(ctx, glowSpr, pk.x, pk.y);
      ctx.globalAlpha = 1;
      drawSprite(ctx, pk.type === 'drink' ? item.drink : pk.type === 'package' ? item.package : pk.type === 'cloud' ? item.cloud : item.pc, pk.x, pk.y + bounce);
      if (!fewerFlashes && this.quality < 2 && Math.floor(now * 2 + i) % 3 === 0) {
        drawSprite(ctx, item.glitter[1], pk.x + 7, pk.y - 9 + bounce);
      }
    }

    // Happy lawyers (below the active ones, so they never hide anyone who still needs help)
    this.drawHappy(s, now);

    // Active lawyers sorted by y
    const sorted = this.sorted;
    let n = 0;
    for (let i = 0; i < s.enemies.n; i++) {
      const e = s.enemies.items[i];
      if (!e.active || e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1) continue;
      sorted[n++] = e;
    }
    sorted.length = n;
    sorted.sort(afterY);
    this.visibleCount = n;
    const shadows = item.shadows;
    for (let i = 0; i < n; i++) {
      const e = sorted[i];
      if (e.type === 'boss') {
        this.drawBoss(s, e, now);
        continue;
      }
      const sheet = this.fig.sheet(e.type, e.variant);
      if (e.type === 'urgent') {
        ctx.globalAlpha = fewerFlashes ? 0.8 : 0.7 + Math.sin(now * 8) * 0.2;
        drawSprite(ctx, item.urgentGlow, e.x, e.y - 4);
        ctx.globalAlpha = 1;
      }
      const sk = shadows[SHADOW[e.type]];
      drawSprite(ctx, sk, e.x, e.y + sheet.h - sheet.ay - 3);
      if (e.leaving) ctx.globalAlpha = 0.6;
      if (e.type === 'friend' && e.pose >= 0) {
        // Frida's friends raise their phones before they forward the scam emails
        const ps = this.fig.poses('friend', e.variant);
        const pf = e.pose + (e.direction < 0 ? POSE.count : 0);
        ctx.drawImage(ps.canvas, pf * ps.w, e.blink > 0 ? ps.h : 0, ps.w, ps.h, Math.round(e.x - ps.ax), Math.round(e.y - ps.ay), ps.w, ps.h);
      } else {
        const frame = (Math.floor(now * 8 + e.uid * 0.37) & 3) + (e.blink > 0 ? TILE.blink : 0) + (e.direction < 0 ? TILE.left : 0);
        ctx.drawImage(sheet.canvas, frame * sheet.w, sheet.sy, sheet.w, sheet.h, Math.round(e.x - sheet.ax), Math.round(e.y - sheet.ay), sheet.w, sheet.h);
      }
      ctx.globalAlpha = 1;
      if (e.elite) drawSprite(ctx, item.crown, e.x, e.y - sheet.ay);
      // Warning before an email (or a partner's dash): the laptop lights up and a «!» above the head
      if (e.alert) {
        if (e.type === 'sender') {
          ctx.globalAlpha = fewerFlashes ? 0.8 : 0.6 + Math.sin(now * 30) * 0.3;
          drawSprite(ctx, item.laptopGlow, e.x, e.y - 3);
          ctx.globalAlpha = 1;
        }
        drawSprite(ctx, item.exclaim, e.x, e.y - sheet.ay - (e.type === 'boss' ? 34 : e.elite ? 30 : 2));
      }
    }
    this.drawBars(s, n);
    this.drawBossClocks(s, n);

    // Emails and the bosses' projectiles (above the lawyers). Everything that can hurt blinks red-tinted every
    // other tenth of a second so it stands out from the player's own effects. With reduced flashing it is
    // tinted all the time instead of blinking.
    const red = fewerFlashes || Math.floor(now * 10) % 2 === 0;
    const RT = item.red;
    for (let i = 0; i < s.enemyShots.n; i++) {
      const q = s.enemyShots.items[i];
      const wobble = fewerFlashes ? 0 : Math.round(Math.sin(now * 10 + i));
      if (q.kind === 'note') {
        // hold music: harmless, so no red glow
        drawSprite(ctx, item.note, q.x, q.y + wobble);
        continue;
      }
      if (q.kind === 'herring') {
        // «Silderegn»: a shadow on the floor that grows, and the herring falling onto it at the end
        const f = 1 - Math.max(0, q.life) / Math.max(0.01, q.flight);
        ctx.globalAlpha = 0.25 + f * 0.35;
        ctx.fillStyle = '#1d1626';
        const rw = Math.round(q.r * (0.4 + 0.6 * f)), rh = Math.max(1, Math.round(rw * 0.45));
        ctx.fillRect(Math.round(q.x - rw), Math.round(q.y - rh / 2), rw * 2, rh);
        ctx.fillRect(Math.round(q.x - rw + 1), Math.round(q.y - rh / 2 - 1), rw * 2 - 2, rh + 2);
        ctx.globalAlpha = 1;
        if (f > 0.55) drawSprite(ctx, red ? RT.herring : item.herring, q.x, q.y - Math.round((1 - f) * 90));
        continue;
      }
      if (q.kind === 'hook') {
        // the fishing line from Frida's rod to the hook
        const b = s.boss;
        if (b && b.active) {
          ctx.fillStyle = '#e8eef4';
          const sx = b.x + b.direction * 14, sy = b.y - 30, d = Math.hypot(q.x - sx, q.y - sy);
          for (let t = 0; t < d; t += 3) ctx.fillRect(Math.round(sx + ((q.x - sx) * t) / d), Math.round(sy + ((q.y - sy) * t) / d), 1, 1);
        }
        drawSprite(ctx, red ? RT.fishHook : item.fishHook, q.x, q.y);
        continue;
      }
      if (q.kind === 'fishMail') {
        ctx.globalAlpha = 0.45;
        drawSprite(ctx, item.emailGlow, q.x, q.y);
        ctx.globalAlpha = 1;
        drawSprite(ctx, red ? RT.fishMail : item.fishMail, q.x, q.y);
        continue;
      }
      if (q.kind === 'cartridge') {
        // The landing spot is marked, and the cartridge blinks just before it lands
        const left = q.life;
        const lx = q.x + q.vx * left, ly = q.y + q.vy * left;
        ctx.globalAlpha = 0.6;
        drawSprite(ctx, ring(7, ['#19b5c9', '#e0409a', '#f5cf3a', '#2b2f38'][q.color], 1), lx, ly);
        ctx.globalAlpha = 1;
        if (left < 0.4 && !fewerFlashes && Math.floor(now * 16) % 2 === 0) continue;
        drawSprite(ctx, (red ? RT.cartridge : item.cartridge)[q.color], q.x, q.y - Math.round(Math.sin((q.t / q.flight) * Math.PI) * 14));
        continue;
      }
      ctx.globalAlpha = 0.45;
      drawSprite(ctx, item.emailGlow, q.x, q.y);
      ctx.globalAlpha = 1;
      const set = red ? RT : item;
      const spr = q.kind === 'ticket' ? (red ? RT.ticket : item.ticketShot) : q.kind === 'ticketSmall' ? set.ticketSmall : q.kind === 'paper' ? (red ? RT.paper : item.sheet) : q.kind === 'calendar' ? set.calendar : set.email;
      drawSprite(ctx, spr, q.x, q.y + wobble);
    }

    this.drawWeapons(s, now);
    this.drawHelpers(s, now);
    this.drawPlayer(s, now);
    if (s.capture.active) this.drawCaptureMarker(s.capture.active, now);
    this.drawEffectsOver(s, now);
    if (s.rain > 0) this.drawCodeRain(s, dt, kx, ky);
    if (this.quality < 2) this.drawBubbles(s, dt, n);
    else this.bubbles.length = 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawArrows(s, kx, ky, now);
  }

  /**
   * The capture point (Endringsprompt 5): a circle on the floor with a progress ring that fills while the player holds
   * it. Teal, and gold while the player stands in it (only the player counts). Calm (no pulse) with reduced flashing.
   * @param {import('./capture.js').ActiveCapture} a
   */
  drawCapture(s, a, now) {
    const ctx = this.ctx, C = CONFIG.capture;
    const R = C.radius;
    const color = a.inside ? '#f5cf3a' : '#14b8a6';
    ctx.globalAlpha = this.settings.fewerFlashes ? 0.85 : 0.7 + Math.sin(now * 4) * 0.15;
    drawSprite(ctx, ring(R, color, 2, 0.1, 6), a.x, a.y);
    ctx.globalAlpha = 1;
    // the progress ring just inside the circle, clockwise from the top
    const fraction = Math.min(1, a.progress / C.holdTime);
    ctx.fillStyle = '#fff6c8';
    const r = R - 5;
    for (let t = 0; t < fraction * TAU; t += 0.07) ctx.fillRect(Math.round(a.x + Math.sin(t) * r) - 1, Math.round(a.y - Math.cos(t) * r) - 1, 2, 2);
  }

  /** The event's 16 × 16 icon as a sprite (for the arrow at the screen edge), made once. */
  captureIcon(id) {
    let sp = this.capIcons.get(id);
    if (!sp) {
      sp = { canvas: icon('capture:' + id), w: 16, h: 16, ax: 8, ay: 8 };
      this.capIcons.set(id, sp);
    }
    return sp;
  }

  /** The icon over the capture point (bobbing gently). */
  drawCaptureMarker(a, now) {
    const ctx = this.ctx;
    const bob = this.settings.fewerFlashes ? 0 : Math.round(Math.sin(now * 3) * 2);
    const ic = icon('capture:' + a.id);
    ctx.drawImage(ic, Math.round(a.x - 8), Math.round(a.y - CONFIG.capture.radius - 20 + bob));
  }

  /** Happy animation: smile and thumbs up with a small hop and sparkles, then a small pixel cloud. */
  drawHappy(s, now) {
    const ctx = this.ctx;
    const item = this.spr.item;
    let shown = 0;
    const shortened = this.quality >= 2;
    for (let i = 0; i < s.effects.n; i++) {
      const e = s.effects.items[i];
      if (e.type !== 'happy') continue;
      shown++;
      const smile = shortened ? Math.min(e.r, 0.15) : e.r;
      const end = shortened ? Math.min(e.dur, 0.25) : e.dur;
      if (e.t > end) continue;
      const type = TYPE_NAMES[e.a];
      const sheet = this.fig.sheet(type, e.b);
      if (e.t < smile) {
        const f = e.t / smile;
        const bounce = Math.round(Math.sin(f * Math.PI) * (sheet.h >= 64 ? 8 : 4));
        const frame = TILE.happy + (e.c < 0 ? TILE.left : 0);
        ctx.drawImage(sheet.canvas, frame * sheet.w, sheet.sy, sheet.w, sheet.h, Math.round(e.x - sheet.ax), Math.round(e.y - sheet.ay - bounce), sheet.w, sheet.h);
        if (this.quality < 2 && !this.settings.fewerFlashes) {
          const count = this.quality === 0 ? 3 : 1;
          for (let j = 0; j < count; j++) {
            const a = now * 4 + j * 2.1 + e.b;
            drawSprite(ctx, item.glitter[(j + Math.floor(f * 3)) % 3], e.x + Math.cos(a) * (sheet.w * 0.45), e.y - sheet.ay * 0.6 + Math.sin(a) * 6 - bounce);
          }
        }
      } else {
        const f = (e.t - smile) / Math.max(0.01, end - smile);
        ctx.globalAlpha = 1 - f * 0.5;
        drawSprite(ctx, item.poof[Math.min(3, Math.floor(f * 4))], e.x, e.y - sheet.ay * 0.3);
        ctx.globalAlpha = 1;
      }
    }
    this.happyShown = shown;
  }

  /** Effects on the floor: pulse, toner splash, cable, flash and Ny PC. */
  drawEffectsUnder(s, now) {
    const ctx = this.ctx;
    const p = s.player;
    for (let i = 0; i < s.effects.n; i++) {
      const e = s.effects.items[i];
      const f = e.t / e.dur;
      const x = e.follow ? p.x : e.x, y = e.follow ? p.y : e.y;
      if (e.type === 'pulse') {
        const r = e.r * (0.35 + 0.65 * f);
        ctx.globalAlpha = 1 - f * 0.8;
        if (e.b) {
          // Full restart: double ring in teal and gold
          drawSprite(ctx, ring(r, '#5eead4', 3, this.quality < 2 ? 0.12 : 0), x, y);
          drawSprite(ctx, ring(r * 0.75, '#f5cf3a', 1), x, y);
        } else {
          drawSprite(ctx, ring(r, '#14b8a6', 2, this.quality < 2 ? 0.14 : 0), x, y);
        }
        drawSprite(ctx, this.spr.item.power, x, y - r);
        ctx.globalAlpha = 1;
      } else if (e.type === 'splash') {
        ctx.globalAlpha = 1 - f * 0.6;
        drawSprite(ctx, splash(e.r, Math.min(3, Math.floor(f * 4)), e.b === 1), x, y);
        ctx.globalAlpha = 1;
      } else if (e.type === 'swing') {
        this.drawCable(x, y, e.r, e.a, e.b, f);
      } else if (e.type === 'flash' && e.b === 3) {
        // Passord-reset (password reset) chain hits: a small golden spark
        ctx.globalAlpha = 1 - f;
        drawSprite(ctx, ring(e.r * 0.6 + f * 5, '#f5cf3a', 1), x, y);
        drawSprite(ctx, this.spr.item.glitter[0], x, y - 4);
        ctx.globalAlpha = 1;
      } else if (e.type === 'paperBurst') {
        // The mini printer shoots out sheets of paper in all directions
        ctx.globalAlpha = 1 - f;
        for (let j = 0; j < 6; j++) {
          const a = j * 1.047 + e.r;
          const d = 4 + f * e.r;
          drawSprite(ctx, this.spr.item.sheet, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7);
        }
        ctx.globalAlpha = 1;
      } else if (e.type === 'dust') {
        // A mini printer lands: a small puff of dust
        ctx.globalAlpha = (1 - f) * 0.8;
        ctx.fillStyle = '#d9d2c3';
        for (let j = 0; j < 6; j++) {
          const a = Math.PI + (j / 5) * Math.PI;
          const d = 3 + f * e.r;
          ctx.fillRect(Math.round(x + Math.cos(a) * d * -1.2), Math.round(y + Math.sin(a) * d * 0.4), 2, 2);
        }
        ctx.globalAlpha = 1;
      } else if (e.type === 'confetti') {
        // Himmelsk serviceavtale (heavenly service agreement): paper confetti
        const colors = ['#f5cf3a', '#e0409a', '#19b5c9', '#2fd06a', '#ffffff'];
        ctx.globalAlpha = 1 - f * 0.8;
        for (let j = 0; j < 24; j++) {
          const a = j * 2.39996;
          const d = (0.3 + 0.7 * ((j * 7) % 10) / 10) * e.r * Math.min(1, f * 2.2);
          ctx.fillStyle = colors[j % 5];
          ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d * 0.8 + f * 6), 2, 2);
        }
        ctx.globalAlpha = 1;
      } else if (e.type === 'flash' && e.b === 2) {
        // Teams alert hits: small purple ring
        ctx.globalAlpha = 1 - f;
        drawSprite(ctx, ring(e.r + 2 + f * 6, '#c06bd8', 1), x, y);
        ctx.globalAlpha = 1;
      } else if (e.type === 'block') {
        // The headset blocked a hit: pulse around the player
        ctx.globalAlpha = 1 - f;
        drawSprite(ctx, ring(e.r * (0.3 + 0.7 * f), e.b ? '#f5cf3a' : '#5eead4', 3, this.quality < 2 ? 0.15 : 0), x, y);
        ctx.globalAlpha = 1;
      } else if (e.type === 'flash') {
        // Fjernstyring (remote control): beam from above (gold for Domene-admin)
        const alpha = 1 - f;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = e.b ? '#f5cf3a' : '#3aa0ff';
        ctx.fillRect(Math.round(x) - 2, Math.round(y) - 160, 5, 160);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(x), Math.round(y) - 160, 1, 160);
        drawSprite(ctx, ring(e.r + 3 + f * 6, e.b ? '#f5cf3a' : '#8fd3ff', 1), x, y);
        ctx.globalAlpha = 1;
      }
    }
  }

  /** The HDMI cable: drawn as a pixel cable along an arc. type 0 = front, 1 = front and back, 2 = full circle. */
  drawCable(cx, cy, R, angle, type, f) {
    const ctx = this.ctx;
    const arc = type === 2 ? TAU : CONFIG.weapons.hdmi.base.arc;
    const drawArc = (mid) => {
      const from = type === 2 ? mid : mid - arc / 2;
      const sweep = arc * Math.min(1, f * 1.8);
      const step = Math.max(0.02, 1.6 / R);
      ctx.globalAlpha = 1 - f * 0.6;
      ctx.fillStyle = '#1d1626';
      for (let a = from; a <= from + sweep; a += step) ctx.fillRect(Math.round(cx + Math.cos(a) * (R - 2)) - 1, Math.round(cy + Math.sin(a) * (R - 2)) - 1, 3, 3);
      ctx.fillStyle = type === 2 ? '#f5cf3a' : '#6b7a8a';
      for (let a = from; a <= from + sweep; a += step * 2) ctx.fillRect(Math.round(cx + Math.cos(a) * (R - 2)), Math.round(cy + Math.sin(a) * (R - 2)), 1, 1);
      const end = from + sweep;
      ctx.fillStyle = '#f5cf3a';
      ctx.fillRect(Math.round(cx + Math.cos(end) * (R - 1)) - 2, Math.round(cy + Math.sin(end) * (R - 1)) - 2, 5, 5);
      ctx.fillStyle = '#1d1626';
      ctx.fillRect(Math.round(cx + Math.cos(end) * (R - 1)) - 1, Math.round(cy + Math.sin(end) * (R - 1)) - 1, 3, 2);
      ctx.globalAlpha = 1;
    };
    drawArc(angle);
    if (type === 1) drawArc(angle + Math.PI);
  }

  /** The update beam: green pixel blocks along a line, with the text «Oppdaterer… 47 %» ("Updating… 47%"). */
  drawBeam(x, y, angle, L, B, fraction, evo) {
    const ctx = this.ctx;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const b = Math.max(4, Math.round(B * 0.55));
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#1d1626';
    for (let d = 8; d < L; d += 3) ctx.fillRect(Math.round(x + cos * d - b / 2 - 1), Math.round(y + sin * d - b / 2 - 1), b + 2, b + 2);
    ctx.fillStyle = '#20302a';
    for (let d = 8; d < L; d += 3) ctx.fillRect(Math.round(x + cos * d - b / 2), Math.round(y + sin * d - b / 2), b, b);
    const filled = 8 + (L - 8) * fraction;
    for (let d = 8, i = 0; d < filled; d += 3, i++) {
      ctx.fillStyle = (i >> 1) & 1 ? (evo ? '#f5cf3a' : '#2fd06a') : evo ? '#fff6c8' : '#9ff0bd';
      ctx.fillRect(Math.round(x + cos * d - b / 2 + 1), Math.round(y + sin * d - b / 2 + 1), b - 2, b - 2);
    }
    ctx.globalAlpha = 1;
    if (this.quality < 2) {
      const pct = Math.min(99, Math.floor(fraction * 100));
      this.font.draw(ctx, 'Oppdaterer… ' + pct + ' %', x + cos * (L * 0.5), y + sin * (L * 0.5) - b - 10, '#ffffff', 1, '#1d1626', 'center');
    }
  }

  /** Wireless mice and projectiles. */  drawWeapons(s, now) {
    const ctx = this.ctx;
    const p = s.player;
    const item = this.spr.item;
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      if (w.id !== 'mouse') continue;
      const t = weaponStats(w);
      const R = t.track * p.mod.area;
      ctx.globalAlpha = w.evo ? 0.5 : 0.35;
      drawSprite(ctx, ring(R, w.evo ? '#8fd3ff' : '#14b8a6', w.evo ? 3 : 1, 0, w.evo ? 0 : 3), p.x, p.y);
      ctx.globalAlpha = 1;
      const set = w.evo ? item.mouseEvo : item.mouse;
      for (let j = 0; j < t.count; j++) {
        const a = w.angle + (j * TAU) / t.count;
        const idx = ((Math.round(((a + Math.PI / 2) / TAU) * 16) % 16) + 16) % 16;
        drawSprite(ctx, set[idx], p.x + Math.cos(a) * R, p.y + Math.sin(a) * R);
      }
    }
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      if (w.id === 'beam' && (w.active > 0 || w.evo)) {
        // The update beam: a long progress indicator («Oppdaterer… 47 %»)
        const t = weaponStats(w);
        const fraction = w.evo ? (now * 0.4) % 1 : 1 - w.active / Math.max(0.01, w.phase);
        this.drawBeam(p.x, p.y, w.angle, t.lengthPx * p.mod.area, t.width * p.mod.area, fraction, w.evo);
        if (w.evo) this.drawBeam(p.x, p.y, w.angle + Math.PI, t.lengthPx * p.mod.area, t.width * p.mod.area, (fraction + 0.5) % 1, true);
      } else if (w.id === 'ctrlz' && w.evo) {
        // Ctrl+Alt+Del: keys in a spiral
        const t = weaponStats(w);
        const R = t.radius * p.mod.area;
        for (let j = 0; j < t.count; j++) {
          const pos = spiralPos(w, t, j, R, p);
          drawSprite(ctx, item.spiralKeys[j % 3], pos[0], pos[1]);
        }
      }
    }
    for (let i = 0; i < s.projectiles.n; i++) {
      const pr = s.projectiles.items[i];
      if (pr.type === 'ctrlz') {
        drawSprite(ctx, item.ctrlz[(Math.floor(now * 16) + i) & 7], pr.x, pr.y);
        continue;
      }
      if (pr.type === 'teams') {
        drawSprite(ctx, item.teams, pr.x, pr.y);
        continue;
      }
      if (pr.type === 'ball') {
        // Ping-pong ball; Ping of Death leaves a short glowing trail (drawn from the velocity, no stored history)
        if (pr.evo && this.quality < 2) {
          const sp = Math.hypot(pr.vx, pr.vy) || 1;
          for (let k = 1; k <= 4; k++) {
            ctx.globalAlpha = 0.5 - k * 0.1;
            drawSprite(ctx, item.ballGlow, pr.x - (pr.vx / sp) * k * 5, pr.y - (pr.vy / sp) * k * 5);
          }
          ctx.globalAlpha = 1;
        }
        drawSprite(ctx, (pr.evo ? item.ballEvo : item.ball)[Math.floor(pr.angle) & 3], pr.x, pr.y);
        continue;
      }
      if (pr.type === 'wall') {
        this.drawWall(pr, now);
        continue;
      }
      if (pr.type === 'mini') {
        // Mini printer: in the air in an arc, then standing still where it landed and feeding out sheets
        const set = pr.evo === 2 ? item.miniMatrix : pr.evo ? item.miniEvo : item.mini;
        if (!pr.goBack) {
          drawSprite(ctx, set[0], pr.x, pr.y);
          continue;
        }
        // a discreet circle on the floor shows the range (below the lawyers' feet, faint)
        ctx.globalAlpha = 0.16;
        drawSprite(ctx, ring(pr.radius, pr.evo === 2 ? '#2fd06a' : pr.evo ? '#f5cf3a' : '#ffffff', 1, 0, 3), pr.x, pr.y + 2);
        ctx.globalAlpha = 1;
        drawSprite(ctx, item.shadows.small, pr.x, pr.y + 4);
        // a little hop right after landing
        const hop = pr.t < 0.25 ? Math.round(Math.sin((pr.t / 0.25) * Math.PI) * 4) : 0;
        // just fired: a sheet sticks out of the output tray
        const feeding = pr.every - pr.burst < 0.12 ? 1 : 0;
        drawSprite(ctx, set[feeding], pr.x, pr.y - hop);
        if (feeding) drawSprite(ctx, pr.evo === 2 ? item.sheetMatrix : item.sheetSmall, pr.x + (pr.angle < 0 ? -4 : 4), pr.y - 10 - hop);
        continue;
      }
      if (pr.type === 'sheet') {
        drawSprite(ctx, pr.evo === 2 ? item.sheetMatrix : item.sheetSmall, pr.x, pr.y);
        continue;
      }
      if (pr.type === 'toner') {
        const set = pr.evo ? item.tonerEvo : item.toner;
        drawSprite(ctx, set[(Math.floor(now * 14) + i) & 7], pr.x, pr.y);
      } else {
        // Passord-reset (password reset): a glittering key with a short streak of light behind it
        const len = Math.hypot(pr.vx, pr.vy) > 1 ? 16 : 0;
        if (len) {
          const cx = Math.cos(pr.angle), sy = Math.sin(pr.angle);
          ctx.fillStyle = pr.evo ? '#a8dcff' : '#fff6c8';
          for (let t = 2; t < len; t += 2) {
            ctx.globalAlpha = 1 - t / len;
            ctx.fillRect(Math.round(pr.x - cx * t), Math.round(pr.y - sy * t), 2, 2);
          }
          ctx.globalAlpha = 1;
        }
        const set = pr.evo ? item.keyEvo : item.key;
        const idx = ((Math.round((pr.angle / TAU) * 16) % 16) + 16) % 16;
        drawSprite(ctx, set[idx], pr.x, pr.y);
        if (this.quality < 2 && Math.floor(now * 12 + i) % 3 === 0) drawSprite(ctx, item.glitter[2], pr.x + 4, pr.y - 4);
      }
    }
    // Skytsengelen (the guardian angel) hovers around the player (in a black coat and sunglasses in The Matrix)
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      if (w.id !== 'angel' && w.id !== 'matrix') continue;
      const [ax, ay] = angelPos(w, p);
      if (w.evo || w.id === 'matrix') {
        ctx.globalAlpha = this.settings.fewerFlashes ? 0.6 : 0.5 + Math.sin(now * 3) * 0.2;
        drawSprite(ctx, w.id === 'matrix' ? item.matrixGlow : item.angelGlow, ax, ay - 2);
        ctx.globalAlpha = 1;
      }
      const set = w.id === 'matrix' ? item.angelMatrix : w.evo ? item.angelEvo : item.angel;
      drawSprite(ctx, set[Math.floor(now * 5) & 3], ax, ay);
    }
  }

  /**
   * A firewall: animated pixel flames along a line across pr.angle, with small padlocks, ones and zeros drifting up
   * from the glow (green «code» flames in The Matrix). It fades in and out.
   */
  drawWall(pr, now) {
    const ctx = this.ctx, item = this.spr.item;
    const green = pr.evo === 2, blue = pr.evo === 1;
    const set = green ? item.flameGreen : blue ? item.flameBlue : item.flame;
    const cos = Math.cos(pr.angle), sin = Math.sin(pr.angle);
    const L = pr.range;
    const fade = Math.min(1, pr.t / 0.25, pr.life / 0.4);
    const n = Math.max(2, Math.round((L * 2) / 7));
    const calm = this.settings.fewerFlashes;
    // a faint band on the floor
    ctx.globalAlpha = 0.25 * fade;
    ctx.fillStyle = green ? '#2fd06a' : blue ? '#3aa0ff' : '#ff9f43';
    for (let k = 0; k <= n; k++) {
      const u = -L + (2 * L * k) / n;
      ctx.fillRect(Math.round(pr.x - sin * u) - 3, Math.round(pr.y + cos * u) - 1, 7, 3);
    }
    ctx.globalAlpha = fade;
    for (let k = 0; k <= n; k++) {
      const u = -L + (2 * L * k) / n;
      const f = calm ? k % 3 : (Math.floor(now * 9) + k * 2) % 3;
      drawSprite(ctx, set[f], pr.x - sin * u, pr.y + cos * u + 2);
    }
    // the IT touch: padlocks, ones and zeros rising in the glow (full quality only)
    if (this.quality === 0) {
      for (let k = 0; k < 3; k++) {
        const ph = (now * 0.9 + k * 0.33 + pr.x * 0.01) % 1;
        const u = (((k * 37 + Math.floor(now * 0.9 + k * 0.33)) * 13) % 100) / 100 * 2 * L - L;
        const g = k === 0 ? item.lockSmall : (k + Math.floor(now)) % 2 ? (green ? item.oneGreen : item.one) : green ? item.zeroGreen : item.zero;
        ctx.globalAlpha = fade * (1 - ph) * 0.9;
        drawSprite(ctx, g, pr.x - sin * u, pr.y + cos * u - 8 - ph * 10);
      }
    }
    ctx.globalAlpha = 1;
  }

  /**
   * The helpers that walk with the player: Livvakten (beside the player; he stands still facing the firewall for a
   * moment when he lays one) and Shopkeeperen (a little behind, looks only). In The Matrix all three wear black coats
   * and sunglasses.
   */
  drawHelpers(s, now) {
    const ctx = this.ctx, item = this.spr.item, p = s.player;
    const walking = p.moving ? Math.floor(now * 6) & 1 : 0;
    let matrix = false;
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      if (w.id !== 'bodyguard' && w.id !== 'matrix') continue;
      if (w.id === 'matrix') matrix = true;
      const set = w.id === 'matrix' ? item.guardMatrix : item.guard;
      drawSprite(ctx, item.shadows.medium, w.gx, w.gy + 6);
      drawSprite(ctx, set[w.pose > 0 ? 0 : walking], w.gx, w.gy);
    }
    // Shopkeeperen: only when the player has the passive. He follows with a little delay (renderer state only).
    if (!p.passives.some((pa) => pa.id === 'certification')) return;
    const side = p.dirX < 0 ? -1 : 1;
    const tx = p.x - side * 16, ty = p.y + 12;
    if (Math.hypot(this.shopX - tx, this.shopY - ty) > 120) {
      this.shopX = tx;
      this.shopY = ty;
    }
    this.shopX += (tx - this.shopX) * 0.08;
    this.shopY += (ty - this.shopY) * 0.08;
    drawSprite(ctx, item.shadows.small, this.shopX, this.shopY + 6);
    drawSprite(ctx, (matrix ? item.shopMatrix : item.shop)[walking], this.shopX, this.shopY);
  }

  /**
   * The Matrix's code rain: columns of green glyphs falling over the screen while it lasts. Looks only.
   * With reduced flashing the glyphs do not change while they fall and the rain is fainter.
   */
  drawCodeRain(s, dt, kx, ky) {
    const ctx = this.ctx;
    const sheet = this.codeGlyphs();
    const calm = this.settings.fewerFlashes;
    const cols = this.quality === 2 ? 14 : this.quality === 1 ? 24 : this.rainCols.length;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fade = Math.min(1, s.rain / 0.5);
    for (let i = 0; i < cols; i++) {
      const c = this.rainCols[i];
      c.y += c.v * dt;
      if (c.y > VH + 60) {
        c.y = -20 - this.rng.next() * 80;
        c.c = this.rng.integer(CODE_CHARS.length);
      }
      for (let k = 0; k < 6; k++) {
        const y = Math.round(c.y - k * (FONT_H + 1));
        if (y < -FONT_H || y > VH) continue;
        const g = (c.c * 7 + k * 13 + (calm ? 0 : Math.floor(c.y / 24) * 5)) % CODE_CHARS.length;
        ctx.globalAlpha = fade * (calm ? 0.35 : 0.75) * (1 - k / 6);
        ctx.drawImage(sheet, g * 6, k === 0 ? 0 : FONT_H + 1, 6, FONT_H + 1, c.x, y, 6, FONT_H + 1);
      }
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, -kx, -ky);
  }

  /** The player – always drawn above the lawyers, with its own outline. */
  drawPlayer(s, now) {
    const ctx = this.ctx;
    const p = s.player;
    const item = this.spr.item;
    const sheet = this.fig.sheet('player', s.character);
    if (Math.abs(p.dirX) > 0.2) this.playerDirection = p.dirX < 0 ? -1 : 1;
    // Marker on the floor
    drawSprite(ctx, ring(11, '#14b8a6', 1, 0.25), p.x, p.y + sheet.h - sheet.ay - 4);
    // Noise-cancelling headset: full ring when the shield is ready, a ring that fills up while it charges
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      if (w.id !== 'headset') continue;
      const t = weaponStats(w);
      if (w.charges > 0) {
        ctx.globalAlpha = this.settings.fewerFlashes ? 0.8 : 0.65 + Math.sin(now * 4) * 0.2;
        drawSprite(ctx, ring(17, w.evo ? '#f5cf3a' : '#5eead4', 2, 0.1), p.x, p.y - 3);
        if (w.charges > 1) drawSprite(ctx, ring(20, '#f5cf3a', 1), p.x, p.y - 3);
        ctx.globalAlpha = 1;
      }
      if (w.charges < t.charges) {
        const fraction = 1 - w.cd / (t.charge * p.mod.cd);
        ctx.fillStyle = '#5eead4';
        const R = w.charges > 0 ? 22 : 17;
        for (let a = 0; a < fraction * TAU; a += 0.12) ctx.fillRect(Math.round(p.x + Math.sin(a) * R), Math.round(p.y - 3 - Math.cos(a) * R), 1, 1);
      }
    }    if (p.kick > 0) {
      // Sugar rush: yellow ring and green sparks around the figure
      const a = Math.min(1, p.kick);
      ctx.globalAlpha = a;
      drawSprite(ctx, ring(16 + (this.settings.fewerFlashes ? 0 : Math.round(Math.sin(now * 12))), '#ffe03c', 2), p.x, p.y - 2);
      if (this.quality < 2) {
        for (let j = 0; j < 4; j++) {
          const v = now * 5 + (j * TAU) / 4;
          drawSprite(ctx, item.glitter[2], p.x + Math.cos(v) * 18, p.y - 2 + Math.sin(v) * 18);
        }
      }
      ctx.globalAlpha = 1;
    }
    const walk = p.moving ? Math.floor(now * 10) & 3 : 0;
    const frame = walk + (this.playerDirection < 0 ? TILE.left : 0);
    const px = Math.round(p.x - sheet.ax), py = Math.round(p.y - sheet.ay);
    // the same small shadow under the feet as the other figures
    drawSprite(ctx, item.shadows.player, p.x, p.y + sheet.h - sheet.ay - 2);
    if (p.invulnerable > 0 && this.settings.fewerFlashes) ctx.globalAlpha = 0.65;
    ctx.drawImage(sheet.canvas, frame * sheet.w, sheet.sy, sheet.w, sheet.h, px, py, sheet.w, sheet.h);
    ctx.globalAlpha = 1;
    // Flash on hit: a white silhouette laid on top – the image itself is never changed
    if (p.invulnerable > 0 && !this.settings.fewerFlashes && Math.floor(now * 20) % 2 === 0) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(sheet.canvas, (frame + TILE.blink) * sheet.w, sheet.sy, sheet.w, sheet.h, px, py, sheet.w, sheet.h);
      ctx.globalAlpha = 1;
    }
    if (p.inPaper) this.font.draw(ctx, 'Sakte …', p.x, p.y - 30, '#ffffff', 1, '#1d1626', 'center');
  }

  /** Effects above the figures: pixel cloud, score text and Ny PC flash. */
  drawEffectsOver(s, now) {
    const ctx = this.ctx;
    const item = this.spr.item;
    for (let i = 0; i < s.effects.n; i++) {
      const e = s.effects.items[i];
      const f = e.t / e.dur;
      if (e.type === 'poof') {
        ctx.globalAlpha = 1 - f;
        drawSprite(ctx, item.poof[Math.min(3, Math.floor(f * 4))], e.x, e.y);
        drawSprite(ctx, item.glitter[0], e.x, e.y - 10 - f * 10);
        ctx.globalAlpha = 1;
      } else if (e.type === 'text') {
        ctx.globalAlpha = 1 - f * f;
        const c = this.textCanvas(e.text);
        ctx.drawImage(c, Math.round(e.x - c.width / 2), Math.round(e.y - f * 20));
        ctx.globalAlpha = 1;
      } else if (e.type === 'bubble') {
        // A happy boss's speech bubble («Sak lukket!», «Utskrift fullført», «Bra jobba!»)
        const c = this.bubbleCanvas(e.text);
        ctx.globalAlpha = Math.min(1, (1 - f) * 4);
        ctx.drawImage(c, Math.round(e.x - c.width / 2), Math.round(e.y - c.height - f * 6));
        ctx.globalAlpha = 1;
      } else if (e.type === 'newPcFx') {
        ctx.globalAlpha = (1 - f) * (this.settings.fewerFlashes ? 0.25 : 0.55);
        ctx.fillStyle = '#c8ecff';
        ctx.fillRect(s.camera.x, s.camera.y, VB, VH);
        ctx.globalAlpha = 1;
      } else if (e.type === 'hit' && this.quality < 2 && this.settings.hitNumbers) {
        this.drawHit(e, f);
      } else if (e.type === 'ping') {
        // Ping-pong: a small «PING» or «PONG» that fades quickly
        ctx.globalAlpha = 1 - f;
        const c = this.labelCanvas(e.b ? 'PONG' : 'PING');
        ctx.drawImage(c, Math.round(e.x - c.width / 2), Math.round(e.y - f * 6));
        ctx.globalAlpha = 1;
      } else if (e.type === 'fishSplash') {
        // a herring landed: a few drops of water
        ctx.globalAlpha = 1 - f;
        ctx.fillStyle = '#8fd3ff';
        for (let j = 0; j < 6; j++) {
          const a = j * 1.047;
          ctx.fillRect(Math.round(e.x + Math.cos(a) * (3 + f * e.r)), Math.round(e.y + Math.sin(a) * (2 + f * e.r * 0.5) - f * 4), 2, 2);
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalAlpha = 1;
    void now;
  }

  /**
   * Frustration bars over the lawyers: shown while a lawyer is damaged and was helped in the last moment,
   * always on the elites (with their trait as a label). Collected in one pass and filled in two, so the
   * fill color changes only twice no matter how many bars there are. Hidden at the lowest quality level
   * (except on the elites).
   */
  drawBars(s, n) {
    const ctx = this.ctx;
    const sorted = this.sorted;
    const t = s.time;
    const showAll = this.quality < 2 && this.settings.bars;
    if (this.barX.length < n) {
      this.barX = new Float32Array(n * 2);
      this.barY = new Float32Array(n * 2);
      this.barW = new Float32Array(n * 2);
      this.barF = new Float32Array(n * 2);
    }
    let k = 0;
    ctx.fillStyle = '#1d1626';
    for (let i = 0; i < n; i++) {
      const e = sorted[i];
      if (e.type === 'boss' || e.hp <= 0) continue;
      // the elites and Frida's friends always show a wide bar
      const elite = e.elite > 0 || e.type === 'friend';
      if (!elite && !(showAll && e.hp < e.maxHp && t - e.lastHit < 1.5)) continue;
      const sheet = this.fig.sheet(e.type, e.variant);
      const w = elite ? 22 : 12;
      const x = Math.round(e.x - w / 2), y = Math.round(e.y - sheet.ay - (elite ? 14 : 5));
      this.barX[k] = x;
      this.barY[k] = y;
      this.barW[k] = w;
      this.barF[k] = Math.max(0, Math.min(1, e.hp / e.maxHp));
      k++;
      ctx.fillRect(x - 1, y - 1, w + 2, elite ? 5 : 4);
      if (elite) {
        // gold frame and the trait as a small label
        ctx.fillStyle = '#f5cf3a';
        ctx.fillRect(x - 1, y - 1, w + 2, 1);
        ctx.fillRect(x - 1, y + 3, w + 2, 1);
        ctx.fillStyle = '#1d1626';
        if (showAll && e.elite > 0) {
          const c = this.labelCanvas(CONFIG.elites.traits[ELITE_TRAIT[e.elite]].name);
          ctx.drawImage(c, Math.round(e.x - c.width / 2), y - c.height - 1);
        }
      }
    }
    ctx.fillStyle = '#5d1a22';
    for (let i = 0; i < k; i++) ctx.fillRect(this.barX[i], this.barY[i], this.barW[i], 2);
    ctx.fillStyle = '#e5484d';
    for (let i = 0; i < k; i++) ctx.fillRect(this.barX[i], this.barY[i], Math.round(this.barW[i] * this.barF[i]), 2);
  }

  /** Small white label with an outline, cached per text (used for the elite traits). */
  labelCanvas(text) {
    let c = this.labelCache.get(text);
    if (c) return c;
    c = makeCanvas(textWidth(text) + 2, FONT_H + 2);
    this.font.draw(ctx2d(c), text, 1, 1, '#ffffff', 1, '#1d1626');
    this.labelCache.set(text, c);
    return c;
  }

  /** Outlined digits 0–9 in one color, 8 pixels per cell (made once per color). */
  digitSheet(color) {
    let c = this.digitSheets.get(color);
    if (c) return c;
    c = makeCanvas(80, FONT_H + 2);
    const ctx = ctx2d(c);
    for (let d = 0; d < 10; d++) this.font.draw(ctx, String(d), d * 8 + 1, 1, color, 1, '#1d1626');
    this.digitSheets.set(color, c);
    return c;
  }

  /** 8 × 8 version of a weapon icon (for the hit numbers), made once per weapon. */
  smallIcon(index) {
    let c = this.iconSmall[index];
    if (c) return c;
    const id = Object.keys(CONFIG.weapons)[index];
    c = makeCanvas(8, 8);
    const ctx = ctx2d(c);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(icon(id), 0, 0, 16, 16, 0, 0, 8, 8);
    this.iconSmall[index] = c;
    return c;
  }

  /**
   * A hit number: rises and fades, gold when critical, with a tiny icon of the weapon that gave the help
   * (the icon only at full quality). Digits are copied from a prepared sheet – no text drawing, no strings.
   */
  drawHit(e, f) {
    const ctx = this.ctx;
    const sheet = this.digitSheet(e.c ? '#ffd740' : '#ffffff');
    let v = Math.round(e.r);
    if (v < 1) v = 1;
    const dig = this.digits;
    let n = 0;
    while (v > 0 && n < 8) {
      dig[n++] = v % 10;
      v = (v / 10) | 0;
    }
    const w = n * 7 - 1;
    let x = Math.round(e.x - w / 2);
    const y = Math.round(e.y - f * 14);
    ctx.globalAlpha = f < 0.55 ? 1 : (1 - f) / 0.45;
    for (let i = n - 1; i >= 0; i--) {
      ctx.drawImage(sheet, dig[i] * 8, 0, 8, FONT_H + 2, x, y, 8, FONT_H + 2);
      x += 7;
    }
    if (this.quality === 0 && e.a >= 0) ctx.drawImage(this.smallIcon(e.a), Math.round(e.x - w / 2) - 10, y + 2);
  }

  /** Pre-rendered score text («+1000»), cached per text. */
  textCanvas(text) {
    let c = this.textCache.get(text);
    if (c) return c;
    c = makeCanvas(textWidth(text) * 2 + 4, FONT_H * 2 + 4);
    const ctx = ctx2d(c);
    this.font.draw(ctx, text, 2, 2, '#ffd740', 2, '#1d1626');
    if (this.textCache.size > 60) this.textCache.clear();
    this.textCache.set(text, c);
    return c;
  }

  /**
   * A boss: its own figure, the pose for the current attack, and the warning before each attack
   * (a «!», plus a calendar over Johan's head, a line for his sprint, the ticket box, the printer's lamps …).
   */
  drawBoss(s, e, now) {
    const ctx = this.ctx;
    const item = this.spr.item;
    const fewerFlashes = this.settings.fewerFlashes;
    const type = figureType(e);
    const sheet = this.fig.sheet(type, e.variant);
    drawSprite(ctx, item.shadows.boss, e.x, e.y + sheet.h - sheet.ay - 3);
    // Johan's sprint: a line shows the direction during the warning
    if (e.tell && e.attack === 'sprint') {
      ctx.globalAlpha = fewerFlashes ? 0.6 : 0.4 + Math.abs(Math.sin(now * 12)) * 0.4;
      ctx.fillStyle = '#e5484d';
      const dx = e.aimX - e.x, dy = e.aimY - e.y, d = Math.hypot(dx, dy) || 1;
      for (let t = 12; t < Math.min(d + 20, 300); t += 6) ctx.fillRect(Math.round(e.x + (dx / d) * t) - 1, Math.round(e.y + (dy / d) * t) - 1, 3, 3);
      ctx.globalAlpha = 1;
    }
    // Frida's «Klikk på lenken!»: a dashed line shows where the hook will fly
    if (e.tell && e.attack === 'hook') {
      ctx.globalAlpha = fewerFlashes ? 0.7 : 0.45 + Math.abs(Math.sin(now * 12)) * 0.4;
      const dx = e.aimX - e.x, dy = e.aimY - (e.y - 26), d = Math.hypot(dx, dy) || 1;
      const len = Math.min(CONFIG.bosses.frida.hook.range, 300);
      for (let t = 14; t < len; t += 8) {
        ctx.fillStyle = '#1d1626';
        ctx.fillRect(Math.round(e.x + (dx / d) * t) - 2, Math.round(e.y - 26 + (dy / d) * t) - 2, 5, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(e.x + (dx / d) * t) - 1, Math.round(e.y - 26 + (dy / d) * t) - 1, 3, 3);
      }
      ctx.globalAlpha = 1;
    }
    let x = Math.round(e.x - sheet.ax), y = Math.round(e.y - sheet.ay);
    // The printer shakes while it «warms up», and while the stream of paper comes out
    if (type === 'printerBoss' && e.attack === 'printJob' && !fewerFlashes) x += Math.round(Math.sin(now * 60) * 1.5);
    const flash = e.blink > 0 && e.invuln <= 0;
    if (e.invuln > 0) ctx.globalAlpha = 0.75;
    if (e.pose >= 0) {
      const ps = this.fig.poses(type, e.variant);
      const frame = e.pose + (e.direction < 0 ? POSE.count : 0);
      ctx.drawImage(ps.canvas, frame * ps.w, flash ? ps.h : 0, ps.w, ps.h, x, y, ps.w, ps.h);
    } else {
      const frame = (Math.floor(now * 8 + e.uid * 0.37) & 3) + (flash ? TILE.blink : 0) + (e.direction < 0 ? TILE.left : 0);
      ctx.drawImage(sheet.canvas, frame * sheet.w, sheet.sy, sheet.w, sheet.h, x, y, sheet.w, sheet.h);
    }
    ctx.globalAlpha = 1;
    const head = e.y - sheet.ay;
    if (e.tell || e.alert) {
      const blink = fewerFlashes || Math.floor(now * 10) % 2 === 0;
      if (e.attack === 'calendar' && blink) drawSprite(ctx, item.calendar, e.x, head - 2);
      else drawSprite(ctx, item.exclaim, e.x, head + 6);
    }
    if (e.jam > 0) {
      // «Papirstopp!» (paper jam): it takes double help now
      if (fewerFlashes || Math.floor(now * 4) % 2 === 0) this.font.draw(ctx, 'PAPIRSTOPP!', e.x, head - 6, '#ffe066', 1, '#1d1626', 'center');
    } else if (e.invuln > 0) {
      this.font.draw(ctx, 'Vi ringer deg tilbake …', e.x, head - 6, '#c8d6e5', 1, '#1d1626', 'center');
    }
  }

  /** The countdown clock and the boss's frustration bar. */
  drawBossClocks(s, n) {
    const ctx = this.ctx;
    const W = CONFIG.bosses;
    for (let i = 0; i < n; i++) {
      const e = this.sorted[i];
      if (e.type !== 'boss') continue;
      const sheet = this.fig.sheet(figureType(e), e.variant);
      const y = Math.round(e.y - sheet.ay - 16);
      const fraction = Math.max(0, e.timer / Math.max(1, e.deadline));
      drawSprite(ctx, this.spr.clocks[Math.round(fraction * 40)], e.x + 26, y + 8);
      const color = e.timer <= W.warnRed ? '#ff8f8f' : e.timer <= W.warnYellow ? '#ffe066' : '#ffffff';
      this.font.draw(ctx, mmss(Math.ceil(e.timer)), e.x + 26, y - 14, color, 1, '#1d1626', 'center');
      if (!e.leaving) {
        const bx = Math.round(e.x - 24), by = Math.round(e.y + sheet.h - sheet.ay + 2);
        ctx.fillStyle = '#1d1626';
        ctx.fillRect(bx - 1, by - 1, 50, 6);
        ctx.fillStyle = '#5d1a22';
        ctx.fillRect(bx, by, 48, 4);
        ctx.fillStyle = '#e5484d';
        ctx.fillRect(bx, by, Math.round(48 * Math.max(0, e.hp / e.maxHp)), 4);
        ctx.fillStyle = '#ff8f8f';
        ctx.fillRect(bx, by, Math.round(48 * Math.max(0, e.hp / e.maxHp)), 1);
      }
    }
  }

  /** Speech bubbles: sporadic, on a few, never more than three at a time. */
  drawBubbles(s, dt, visibleCount) {
    const ctx = this.ctx;
    const b = this.bubbles;
    const max = this.quality === 0 ? 3 : 1;
    for (let i = b.length - 1; i >= 0; i--) {
      b[i].t -= dt;
      // The bubble disappears the moment the lawyer becomes happy.
      if (b[i].t <= 0 || !b[i].e.active || b[i].e.uid !== b[i].uid) b.splice(i, 1);
    }
    this.bubbleWait -= dt;
    if (this.bubbleWait <= 0 && b.length < max && visibleCount > 0) {
      this.bubbleWait = 1.5 + this.rng.next() * 2.5;
      const e = this.sorted[this.rng.integer(visibleCount)];
      if (e && e.type !== 'boss' && !b.some((x) => x.e === e)) {
        const texts = e.type === 'sender' ? SENDER_BUBBLES : CONFIG.bubbles;
        b.push({ e, uid: e.uid, text: texts[this.rng.integer(texts.length)], t: 2.6 });
      }
    }
    for (const bo of b) {
      const c = this.bubbleCanvas(bo.text);
      const sheet = this.fig.sheet(bo.e.type, bo.e.variant);
      ctx.globalAlpha = Math.min(1, bo.t * 3, (2.6 - bo.t) * 6);
      ctx.drawImage(c, Math.round(bo.e.x - c.width / 2), Math.round(bo.e.y - sheet.ay - c.height - 2));
      ctx.globalAlpha = 1;
    }
  }

  /** Pixel-art speech bubble (cached per text). */
  bubbleCanvas(text) {
    let c = this.bubbleCache.get(text);
    if (c) return c;
    const b = textWidth(text) + 8, h = FONT_H + 4;
    c = makeCanvas(b + 2, h + 6);
    const ctx = ctx2d(c);
    ctx.fillStyle = '#1d1626';
    ctx.fillRect(1, 0, b, h + 2);
    ctx.fillRect(0, 1, b + 2, h);
    ctx.fillRect(Math.floor(b / 2) - 2, h + 1, 6, 3);
    ctx.fillRect(Math.floor(b / 2) - 1, h + 3, 3, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 1, b, h);
    ctx.fillRect(Math.floor(b / 2) - 1, h + 1, 4, 2);
    ctx.fillRect(Math.floor(b / 2), h + 3, 1, 1);
    this.font.draw(ctx, text, 5, 2 - 1, '#1d1626');
    this.bubbleCache.set(text, c);
    return c;
  }

  /** Arrows at the screen edge toward the boss, urgent case and nearest energy drink when they are off-screen. */
  drawArrows(s, kx, ky, now) {
    for (let i = 0; i < s.enemies.n; i++) {
      const e = s.enemies.items[i];
      if (!e.active || e.leaving || (e.type !== 'urgent' && e.type !== 'boss')) continue;
      const label = e.type === 'boss' ? CONFIG.bosses[e.bossType]?.short ?? 'BOSS' : 'HASTESAK';
      this.arrow(e.x - kx, e.y - ky, e.type === 'boss' ? this.spr.arrows.boss : this.spr.arrows.urgentSprite, label, now, null);
    }
    let best = null, bestD = 1e12, pkg = null, pkgD = 1e12, cloud = null;
    for (let i = 0; i < s.pickups.n; i++) {
      const pk = s.pickups.items[i];
      const d = (pk.x - s.player.x) ** 2 + (pk.y - s.player.y) ** 2;
      if (pk.type === 'drink' && d < bestD) {
        bestD = d;
        best = pk;
      } else if (pk.type === 'package' && d < pkgD) {
        pkgD = d;
        pkg = pk;
      } else if (pk.type === 'cloud') cloud = pk;
    }
    if (best) this.arrow(best.x - kx, best.y - ky, this.spr.arrows.drink, '', now, this.spr.item.drink);
    // The nearest supplier package too (gold arrow with the box)
    if (pkg) this.arrow(pkg.x - kx, pkg.y - ky, this.spr.arrows.urgentSprite, '', now, this.spr.item.package);
    // Endringsprompt 5: «Sky-synk» (the same green arrow as the energy drink, with the cloud), and the capture point
    if (cloud) this.arrow(cloud.x - kx, cloud.y - ky, this.spr.arrows.drink, '', now, this.spr.item.cloud);
    const cap = s.capture.active;
    if (cap) this.arrow(cap.x - kx, cap.y - ky, this.spr.arrows.urgentSprite, '', now, this.captureIcon(cap.id));
  }

  arrow(sx, sy, set, text, now, iconSprite) {
    if (sx > 0 && sx < VB && sy > 0 && sy < VH) return;
    const m = this.margin;
    const cx = VB / 2, cy = VH / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const hw = cx - Math.max(m.left, m.right) - 10, hh = cy - Math.max(m.top, m.bottom) - 10;
    const t = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
    const px = cx + Math.cos(a) * t, py = cy + Math.sin(a) * t;
    const pulse = this.settings.fewerFlashes ? 0 : Math.round(Math.sin(now * 7) * 2);
    const idx = ((Math.round((a / TAU) * 16) % 16) + 16) % 16;
    drawSprite(this.ctx, set[idx], px + Math.cos(a) * pulse, py + Math.sin(a) * pulse);
    const lx = px - Math.cos(a) * 16, ly = py - Math.sin(a) * 16;
    if (iconSprite) drawSprite(this.ctx, iconSprite, lx, ly);
    else if (text) this.font.draw(this.ctx, text, Math.max(30, Math.min(VB - 30, lx)), Math.max(m.top, Math.min(VH - 14, ly - 5)), '#ffffff', 1, '#1d1626', 'center');
  }
}

export { INSIDE };

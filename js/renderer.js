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

const VB = CONFIG.view.width, VH = CONFIG.view.height;
const KB = CONFIG.map.width, KH = CONFIG.map.height;
const SHADOW = { junior: 'small', printer: 'medium', senior: 'large', urgent: 'large', boss: 'boss', sender: 'small' };

/** Sort function (created once, so sorting produces no garbage). */
const afterY = (a, b) => a.y - b.y;

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas the game canvas (640 × 360)
   * @param {{shake: boolean, fewerFlashes: boolean}} settings
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
    this.shake = 0;
    /** @type {any[]} */
    this.sorted = [];
    this.visibleCount = 0;
    this.playerDirection = 1;
    /** Margins (logical pixels) where the HUD sits, so the arrows do not end up behind it. */
    this.margin = { top: 40, bottom: 50, left: 12, right: 12 };
    /** Number of happy lawyers being animated right now (shown in debug). */
    this.happyShown = 0;
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

    // Tickets (blink in the last seconds)
    const L = CONFIG.tickets;
    for (let i = 0; i < s.tickets.n; i++) {
      const l = s.tickets.items[i];
      if (l.x < x0 || l.x > x1 || l.y < y0 || l.y > y1) continue;
      if (!l.dragged && l.age > L.lifetime - L.blinkTime) {
        if (fewerFlashes) ctx.globalAlpha = 0.5;
        else if (Math.floor(l.age * 7) % 2 === 0) continue;
      }
      drawSprite(ctx, l.value > 60 ? item.ticketLarge : item.ticket, l.x, l.y);
      ctx.globalAlpha = 1;
    }

    // Energy drink and Ny PC (glow and a small bounce)
    for (let i = 0; i < s.pickups.n; i++) {
      const pk = s.pickups.items[i];
      if (pk.x < x0 || pk.x > x1 || pk.y < y0 || pk.y > y1) continue;
      const bounce = fewerFlashes ? 0 : Math.round(Math.abs(Math.sin(now * 3 + i)) * -3);
      ctx.globalAlpha = fewerFlashes ? 0.7 : 0.55 + Math.sin(now * 4 + i) * 0.25;
      drawSprite(ctx, pk.type === 'drink' ? item.drinkGlow : item.pcGlow, pk.x, pk.y);
      ctx.globalAlpha = 1;
      drawSprite(ctx, pk.type === 'drink' ? item.drink : item.pc, pk.x, pk.y + bounce);
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
      const frame = (Math.floor(now * 8 + e.uid * 0.37) & 3) + (e.blink > 0 ? TILE.blink : 0) + (e.direction < 0 ? TILE.left : 0);
      if (e.leaving) ctx.globalAlpha = 0.6;
      ctx.drawImage(sheet.canvas, frame * sheet.w, sheet.sy, sheet.w, sheet.h, Math.round(e.x - sheet.ax), Math.round(e.y - sheet.ay), sheet.w, sheet.h);
      ctx.globalAlpha = 1;
      // Warning before an email: the laptop lights up and a «!» above the head
      if (e.alert) {
        if (e.type === 'sender') {
          ctx.globalAlpha = fewerFlashes ? 0.8 : 0.6 + Math.sin(now * 30) * 0.3;
          drawSprite(ctx, item.laptopGlow, e.x, e.y - 3);
          ctx.globalAlpha = 1;
        }
        drawSprite(ctx, item.exclaim, e.x, e.y - sheet.ay - (e.type === 'boss' ? 34 : 2));
      }
    }
    this.drawBossClocks(s, n);

    // Emails and the bosses' projectiles (above the lawyers, with a red glow so they stand out from the player's own effects)
    for (let i = 0; i < s.enemyShots.n; i++) {
      const q = s.enemyShots.items[i];
      const wobble = fewerFlashes ? 0 : Math.round(Math.sin(now * 10 + i));
      if (q.kind === 'note') {
        // hold music: harmless, so no red glow
        drawSprite(ctx, item.note, q.x, q.y + wobble);
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
        drawSprite(ctx, item.cartridge[q.color], q.x, q.y - Math.round(Math.sin((q.t / q.flight) * Math.PI) * 14));
        continue;
      }
      ctx.globalAlpha = 0.45;
      drawSprite(ctx, item.emailGlow, q.x, q.y);
      ctx.globalAlpha = 1;
      const spr = q.kind === 'ticket' ? item.ticketShot : q.kind === 'ticketSmall' ? item.ticketSmall : q.kind === 'paper' ? item.sheet : q.kind === 'calendar' ? item.calendar : item.email;
      drawSprite(ctx, spr, q.x, q.y + wobble);
    }

    this.drawWeapons(s, now);
    this.drawPlayer(s, now);
    this.drawEffectsOver(s, now);
    if (this.quality < 2) this.drawBubbles(s, dt, n);
    else this.bubbles.length = 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawArrows(s, kx, ky, now);
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
    const arc = type === 2 ? TAU : CONFIG.weapons.hdmi.levels[0].arc;
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
      if (pr.type === 'mini') {
        // Mini printer: in the air in an arc, then shuffling on small legs
        const set = pr.evo ? item.miniEvo : item.mini;
        const frame = pr.goBack ? Math.floor(now * 8 + i) & 1 : 0;
        if (pr.goBack) drawSprite(ctx, item.shadows.small, pr.x, pr.y + 4);
        drawSprite(ctx, set[frame], pr.x, pr.y);
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
    // Skytsengelen (the guardian angel) hovers around the player
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      if (w.id !== 'angel') continue;
      const [ax, ay] = angelPos(w, p);
      if (w.evo) {
        ctx.globalAlpha = this.settings.fewerFlashes ? 0.6 : 0.5 + Math.sin(now * 3) * 0.2;
        drawSprite(ctx, item.angelGlow, ax, ay - 2);
        ctx.globalAlpha = 1;
      }
      const set = w.evo ? item.angelEvo : item.angel;
      drawSprite(ctx, set[Math.floor(now * 5) & 3], ax, ay);
    }
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
    let frame = walk + (this.playerDirection < 0 ? TILE.left : 0);
    if (p.invulnerable > 0) {
      // Flash on hit
      if (this.settings.fewerFlashes) ctx.globalAlpha = 0.65;
      else if (Math.floor(now * 20) % 2 === 0) frame += TILE.blink;
    }
    ctx.drawImage(sheet.canvas, frame * sheet.w, sheet.sy, sheet.w, sheet.h, Math.round(p.x - sheet.ax), Math.round(p.y - sheet.ay), sheet.w, sheet.h);
    ctx.globalAlpha = 1;
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
      }
    }
    void now;
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
    let best = null, bestD = 1e12;
    for (let i = 0; i < s.pickups.n; i++) {
      const pk = s.pickups.items[i];
      if (pk.type !== 'drink') continue;
      const d = (pk.x - s.player.x) ** 2 + (pk.y - s.player.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = pk;
      }
    }
    if (best) this.arrow(best.x - kx, best.y - ky, this.spr.arrows.drink, '', now, this.spr.item.drink);
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

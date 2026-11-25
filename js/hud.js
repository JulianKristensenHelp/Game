// @ts-check
// The HUD (energy, time, score, multiplier, experience, icons, minimap and banners).
// Drawn on its own canvas at full screen resolution over the game, with the same pixel font and pixel art icons.
// The HUD is only redrawn when something has changed (max about 20 times a second), never every frame for no reason.
import { CONFIG } from './config.js';
import { BitmapFont, textWidth, HEIGHT as FH } from './pixelfont.js';
import { icon, weaponIconId } from './icons.js';
import { ZONES, GLASS } from './map.js';
import { mmss, formatNumber } from './utils.js';
import { multiplier, multText } from './score.js';
import { makeCanvas, ctx2d } from './pixel.js';

const KB = CONFIG.map.width, KH = CONFIG.map.height;
const GR = CONFIG.display;

/** Small pixel symbols for the minimap. */
const SYMBOL = {
  player: ['.###.', '#####', '#####', '#####', '.###.'],
  star: ['..#..', '..#..', '#####', '.###.', '##.##'],
  boss: ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..'],
  drink: ['.##.', '####', '####', '####', '####'],
};

export class Hud {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = ctx2d(canvas);
    this.font = new BitmapFont();
    this.rect = { x: 0, y: 0, w: 640, h: 360 };
    this.s = 3;
    this.dpr = 1;
    this.gameScaleFactor = 1;
    this.minimapOption = 'small';
    /** Margins in logical pixels (passed to the drawing code for the arrows). */
    this.marginLogical = { top: 40, bottom: 50, left: 12, right: 12 };
    this.dirty = true;
    this.lastDraw = 0;
    this.signature = '';
    this.values = new Float64Array(7);
    this.multAnim = 0;
    this.multDirection = 1;
    this.banner = { text: '', style: '', end: 0, start: 0 };
    /** @type {HTMLCanvasElement | null} */
    this.minimapBase = null;
    /** @type {HTMLCanvasElement | null} */
    this.minimap = null;
    this.minimapLast = 0;
    this.iconVersion = 0;
    this.iconDrawn = -1;
    /** @type {HTMLCanvasElement | null} */
    this.iconRow = null;
    /** Portrait of the selected character (shown by the energy bar). @type {HTMLCanvasElement | null} */
    this.portrait = null;
  }

  /**
   * Positions the HUD over the play area.
   * @param {number} W window width (CSS pixels)
   * @param {number} H window height
   * @param {{x:number,y:number,w:number,h:number}} rect the play area in CSS pixels
   * @param {number} dpr
   * @param {number} uiFactor
   * @param {string} minimap 'off' | 'small' | 'large'
   */
  fit(W, H, rect, dpr, uiFactor, minimap) {
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    this.ctx = ctx2d(this.canvas);
    this.rect = { x: Math.round(rect.x * dpr), y: Math.round(rect.y * dpr), w: Math.round(rect.w * dpr), h: Math.round(rect.h * dpr) };
    // The icons should be at least about 48 screen pixels at 1080p (16 pixels × 3).
    const height = Math.max(rect.h, 540);
    this.s = Math.max(1, Math.round(3 * uiFactor * (height / 1080) * dpr));
    this.gameScaleFactor = this.rect.w / CONFIG.view.width;
    this.minimapOption = minimap;
    this.makeMinimap();
    this.iconDrawn = -1;
    const s = this.s, m = 3 * s;
    const topH = this.xpHeight() + m + Math.max(13 * s, FH * (s + 2) + FH * (s + 1));
    this.marginLogical = { top: Math.ceil(topH / this.gameScaleFactor), bottom: Math.ceil((m + 38 * s) / this.gameScaleFactor / 2), left: 12, right: 12 };
    this.dirty = true;
  }

  xpHeight() {
    return FH * Math.max(1, Math.round(this.s * 0.67)) + 4;
  }

  /** Shows a short text in the middle of the screen (phase change, boss, etc.). */
  showBanner(text, style = '', ms = 2800) {
    const now = performance.now();
    this.banner = { text, style, start: now, end: now + ms };
    this.dirty = true;
  }

  iconsChanged() {
    this.iconVersion++;
    this.dirty = true;
  }

  // ---------- Minimap ----------

  makeMinimap() {
    if (this.minimapOption === 'off') {
      this.minimapBase = null;
      this.minimap = null;
      return;
    }
    const fraction = this.minimapOption === 'large' ? GR.minimap.large : GR.minimap.small;
    const mw = Math.round(this.rect.w * fraction), mh = Math.round((mw * KH) / KB);
    const base = makeCanvas(mw, mh);
    const ctx = ctx2d(base);
    const k = mw / KB;
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(0, 0, mw, mh);
    for (const zone of ZONES) {
      ctx.fillStyle = zone.minimap;
      ctx.fillRect(Math.round(zone.x * k), Math.round(zone.y * k), Math.ceil(zone.w * k), Math.ceil(zone.h * k));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [x0, y0, x1, y1] of GLASS) ctx.fillRect(Math.round(x0 * k), Math.round(y0 * k), Math.max(1, Math.round((x1 - x0) * k)), Math.max(1, Math.round((y1 - y0) * k)));
    this.minimapBase = base;
    this.minimap = makeCanvas(mw, mh);
  }

  stamp(ctx, rows, x, y, k, fill, edge) {
    const w = rows[0].length, h = rows.length;
    x = Math.round(x - (w * k) / 2);
    y = Math.round(y - (h * k) / 2);
    ctx.fillStyle = edge;
    ctx.fillRect(x - k, y - k, (w + 2) * k, (h + 2) * k);
    ctx.fillStyle = fill;
    for (let ry = 0; ry < h; ry++) for (let rx = 0; rx < w; rx++) if (rows[ry][rx] === '#') ctx.fillRect(x + rx * k, y + ry * k, k, k);
  }

  /** Redraws the minimap (max about 10 times a second). */
  updateMinimap(s) {
    if (!this.minimap || !this.minimapBase) return;
    const ctx = ctx2d(this.minimap);
    const mw = this.minimap.width, mh = this.minimap.height;
    const k = mw / KB;
    ctx.drawImage(this.minimapBase, 0, 0);
    // Lawyers: small, faint dots
    const d = Math.max(1, Math.round(this.s / 2));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < s.enemies.n; i++) {
      const e = s.enemies.items[i];
      if (!e.active || e.type === 'boss' || e.type === 'urgent') continue;
      ctx.fillRect(Math.round(e.x * k), Math.round(e.y * k), d, d);
    }
    // What is on screen right now
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, Math.round(this.s / 3));
    ctx.strokeRect(Math.round(s.camera.x * k) + 0.5, Math.round(s.camera.y * k) + 0.5, Math.round(CONFIG.view.width * k), Math.round(CONFIG.view.height * k));
    const sk = Math.max(1, Math.round(this.s / 2));
    for (let i = 0; i < s.pickups.n; i++) {
      const p = s.pickups.items[i];
      if (p.type === 'drink') this.stamp(ctx, SYMBOL.drink, p.x * k, p.y * k, sk, '#2fd06a', '#0b3d1c');
    }
    for (let i = 0; i < s.enemies.n; i++) {
      const e = s.enemies.items[i];
      if (!e.active || e.leaving) continue;
      if (e.type === 'urgent') this.stamp(ctx, SYMBOL.star, e.x * k, e.y * k, sk, '#ffd240', '#4a3600');
      else if (e.type === 'boss') this.stamp(ctx, SYMBOL.boss, e.x * k, e.y * k, sk, '#e5484d', '#3d0a10');
    }
    this.stamp(ctx, SYMBOL.player, s.player.x * k, s.player.y * k, sk, '#ffffff', '#0f766e');
    void mh;
  }

  // ---------- Drawing ----------

  /**
   * Draws the HUD if something has changed.
   * @param {import('./game.js').Game | null} s
   * @param {{fewerFlashes: boolean}} settings
   * @param {{active:boolean,x0:number,y0:number,x:number,y:number}} joystick
   */
  update(s, settings, joystick, forced = false) {
    const now = performance.now();
    if (!s) {
      if (this.signature !== 'empty') {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.signature = 'empty';
      }
      return;
    }
    if (this.minimap && now - this.minimapLast > 1000 / GR.minimap.updatesPerSecond) {
      this.minimapLast = now;
      this.updateMinimap(s);
      this.dirty = true;
    }
    const p = s.player;
    const low = p.energy / p.maxEnergy < GR.energyLow;
    const blinkPhase = low && !settings.fewerFlashes ? Math.floor(now / 300) % 2 : 0;
    const bannerActive = now < this.banner.end + 400;
    // Compare the numbers with last time (without creating new objects)
    const v = this.values;
    const new0 = Math.floor(s.time), new1 = s.score, new2 = Math.ceil(p.energy), new3 = p.maxEnergy, new4 = s.multStep * 1000 + s.multCounter;
    const new5 = Math.round((s.xp / s.xpNeeded) * 100) * 1000 + s.level, new6 = blinkPhase * 1e6 + this.iconVersion;
    const changed = this.signature !== 'game' || v[0] !== new0 || v[1] !== new1 || v[2] !== new2 || v[3] !== new3 || v[4] !== new4 || v[5] !== new5 || v[6] !== new6;
    const sig = 'game';
    const animating = bannerActive || joystick.active;
    const limit = animating ? 1000 / 60 : 1000 / 20;
    if (!forced && !this.dirty && !changed && !animating) return;
    if (!forced && now - this.lastDraw < limit - 1) return;
    this.signature = sig;
    v[0] = new0; v[1] = new1; v[2] = new2; v[3] = new3; v[4] = new4; v[5] = new5; v[6] = new6;
    this.dirty = false;
    this.lastDraw = now;
    this.draw(s, now, blinkPhase, settings, joystick);
  }

  draw(s, now, blinkPhase, settings, joystick) {
    const ctx = this.ctx;
    const { x: rx, y: ry, w: rw, h: rh } = this.rect;
    const s3 = this.s, m = 3 * s3;
    const font = this.font;
    const fsS = Math.max(1, Math.round(s3 * 0.67));
    const fsM = Math.max(1, s3 - 1);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const p = s.player;

    // Experience bar with level (top)
    const xh = this.xpHeight();
    ctx.fillStyle = '#16202b';
    ctx.fillRect(rx, ry, rw, xh);
    const xpFraction = Math.min(1, s.xp / s.xpNeeded);
    ctx.fillStyle = '#3aa0ff';
    ctx.fillRect(rx, ry, Math.round(rw * xpFraction), xh);
    ctx.fillStyle = '#8fd3ff';
    ctx.fillRect(rx, ry, Math.round(rw * xpFraction), Math.max(1, fsS));
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(rx, ry + xh - Math.max(1, fsS), rw, Math.max(1, fsS));
    font.draw(ctx, 'Nivå ' + s.level, rx + rw / 2, ry + 2, '#ffffff', fsS, '#16202b', 'center');

    // Energy bar shaped like an energy drink can
    const ey = ry + xh + m;
    const ew = Math.min(Math.round(rw * 0.4), Math.max(Math.round(rw * GR.energyWidth), 70 * s3));
    const eh = 13 * s3;
    let ex = rx + m;
    if (this.portrait) {
      // Small portrait of the selected character by the energy bar
      const ps = eh + 4 * s3;
      ctx.fillStyle = '#1d1626';
      ctx.fillRect(ex, ey - 2 * s3, ps, ps);
      ctx.fillStyle = '#a9b8c8';
      ctx.fillRect(ex + s3, ey - s3, ps - 2 * s3, ps - 2 * s3);
      ctx.drawImage(this.portrait, 8, 2, 48, 48, ex + s3, ey - s3, ps - 2 * s3, ps - 2 * s3);
      ex += ps + 2 * s3;
    }
    this.drawEnergy(ctx, ex, ey, ew, eh, p, blinkPhase, settings);

    // Time, phase and score (middle)
    const mid = rx + rw / 2;
    const timeText = mmss(s.time);
    font.draw(ctx, timeText, mid, ey, '#ffffff', s3 + 1, '#16202b', 'center');
    const timeW = textWidth(timeText) * (s3 + 1);
    font.draw(ctx, s.phaseName, mid + timeW / 2 + 2 * s3, ey + FH * (s3 + 1) - FH * fsS - s3, '#c8d6e5', fsS, '#16202b');
    const scoreText = formatNumber(s.score);
    font.draw(ctx, scoreText, mid, ey + FH * (s3 + 1), '#ffe066', s3 + 2, '#16202b', 'center');

    // Multiplier with progress toward the next +0.1
    const multX = Math.max(mid + (textWidth(scoreText) * (s3 + 2)) / 2, mid + timeW / 2 + 2 * s3 + textWidth(s.phaseName) * fsS) + 6 * s3;
    const mult = multiplier(s);
    const multT = multText(mult);
    const lastMult = now - (this.multAnim ?? 0) < 500;
    const multColor = lastMult ? (this.multDirection > 0 ? '#ffffff' : '#ff6b6b') : '#ffd740';
    const shakeX = lastMult && this.multDirection < 0 && !settings.fewerFlashes ? Math.round(Math.sin(now / 25) * 2 * s3) : 0;
    font.draw(ctx, multT, multX + shakeX, ey + 2 * s3, multColor, s3 + 1, '#16202b');
    const mb = textWidth(multT) * (s3 + 1);
    const pby = ey + 2 * s3 + FH * (s3 + 1) + s3;
    ctx.fillStyle = '#16202b';
    ctx.fillRect(multX - s3, pby - s3, mb + 2 * s3, 4 * s3);
    ctx.fillStyle = '#4a3a10';
    ctx.fillRect(multX, pby, mb, 2 * s3);
    const max = mult >= CONFIG.multiplier.max - 1e-9;
    ctx.fillStyle = '#ffd740';
    ctx.fillRect(multX, pby, Math.round(mb * (max ? 1 : s.multCounter / CONFIG.multiplier.perHelped)), 2 * s3);
    if (lastMult || bannerActiveFor(this.banner, now)) this.dirty = true;

    // Minimap (top right)
    if (this.minimap) {
      const mw = this.minimap.width, mh = this.minimap.height;
      const mx = rx + rw - m - mw, my = ry + xh + m;
      ctx.fillStyle = '#1d1626';
      ctx.fillRect(mx - 2 * s3, my - 2 * s3, mw + 4 * s3, mh + 4 * s3);
      ctx.fillStyle = '#c8d6e5';
      ctx.fillRect(mx - s3, my - s3, mw + 2 * s3, mh + 2 * s3);
      ctx.drawImage(this.minimap, mx, my);
    }

    // Weapons and passives (bottom left, each in its own row)
    if (this.iconDrawn !== this.iconVersion) this.drawIconRow(s);
    if (this.iconRow) ctx.drawImage(this.iconRow, rx + m, ry + rh - m - this.iconRow.height);

    // Banner
    if (now < this.banner.end + 400) this.drawBanner(ctx, now, mid, ry + Math.round(rh * 0.26));

    // Joystick (touch)
    if (joystick.active) {
      const d = this.dpr;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(joystick.x0 * d, joystick.y0 * d, 52 * d, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.arc(joystick.x * d, joystick.y * d, 24 * d, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** The multiplier went up (+1) or down (−1): short effect. */
  multEffect(direction) {
    this.multAnim = performance.now();
    this.multDirection = direction;
    this.dirty = true;
  }

  drawEnergy(ctx, x, y, w, h, p, blinkPhase, settings) {
    const s = this.s;
    const fraction = Math.max(0, p.energy / p.maxEnergy);
    const low = fraction < GR.energyLow;
    // The can lies on its side: cap on the left, bottom on the right
    ctx.fillStyle = '#1d1626';
    ctx.fillRect(x, y + s, w, h - 2 * s);
    ctx.fillRect(x + s, y, w - 2 * s, h);
    ctx.fillStyle = '#9aa3ad';
    ctx.fillRect(x + s, y + s, 4 * s, h - 2 * s);
    ctx.fillStyle = '#d7dde4';
    ctx.fillRect(x + s, y + 2 * s, 2 * s, h - 4 * s);
    ctx.fillStyle = '#9aa3ad';
    ctx.fillRect(x + w - 4 * s, y + s, 3 * s, h - 2 * s);
    const bx = x + 5 * s, bw = w - 9 * s, by = y + s, bh = h - 2 * s;
    ctx.fillStyle = '#20302a';
    ctx.fillRect(bx, by, bw, bh);
    const flashRed = low && (settings.fewerFlashes || blinkPhase === 0);
    const fw = Math.round(bw * fraction);
    ctx.fillStyle = low ? (flashRed ? '#e5484d' : '#8a2a2f') : '#2fd06a';
    ctx.fillRect(bx, by, fw, bh);
    ctx.fillStyle = low ? '#ff9f9f' : '#9ff0bd';
    ctx.fillRect(bx, by, fw, s);
    ctx.fillStyle = low ? '#7a1f24' : '#1e9a4c';
    ctx.fillRect(bx, by + bh - s, fw, s);
    // Lightning bolt
    const lx = bx + 2 * s, ly = y + Math.round(h / 2) - 4 * s;
    ctx.fillStyle = '#ffe066';
    for (const [dx, dy, ww] of [[2, 0, 2], [1, 1, 2], [0, 2, 4], [1, 3, 2], [1, 4, 2], [0, 5, 2], [0, 6, 1]]) ctx.fillRect(lx + dx * s, ly + dy * s, ww * s, s);
    const text = `${Math.ceil(p.energy)} / ${p.maxEnergy}`;
    const fs = Math.max(1, s - 1);
    this.font.draw(ctx, text, bx + bw / 2, y + Math.round((h - FH * fs) / 2) + fs, '#ffffff', fs, '#1d1626', 'center');
  }

  drawIconRow(s) {
    this.iconDrawn = this.iconVersion;
    const st = this.s;
    const slot = 18 * st, gap = 2 * st;
    const w = Math.max(CONFIG.limits.weapons, CONFIG.limits.passives) * (slot + gap);
    const h = slot * 2 + gap * 2;
    const c = makeCanvas(w, h);
    const ctx = ctx2d(c);
    const fs = Math.max(1, st - 1);
    const drawSlot = (x, y, id, level, evo, empty) => {
      ctx.fillStyle = '#1d1626';
      ctx.fillRect(x, y, slot, slot);
      ctx.fillStyle = empty ? '#1d1626' : evo ? '#f5cf3a' : '#5d6b7a';
      ctx.fillRect(x + st, y + st, slot - 2 * st, slot - 2 * st);
      const inner = Math.max(1, Math.round(st / 3));
      ctx.fillStyle = empty ? '#1d1626' : '#2a3140';
      ctx.fillRect(x + st + inner, y + st + inner, slot - 2 * st - 2 * inner, slot - 2 * st - 2 * inner);
      if (empty) {
        // clearly empty frame (dashed)
        ctx.fillStyle = '#5d6b7a';
        for (let i = 0; i < slot - 2 * st; i += 3 * st) {
          ctx.fillRect(x + st + i, y + st, st, st);
          ctx.fillRect(x + st + i, y + slot - 2 * st, st, st);
          ctx.fillRect(x + st, y + st + i, st, st);
          ctx.fillRect(x + slot - 2 * st, y + st + i, st, st);
        }
        return;
      }
      ctx.drawImage(icon(id), x + st, y + st, 16 * st, 16 * st);
      const t = evo ? '★' : String(level);
      this.font.draw(ctx, t, x + slot - st, y + slot - FH * fs + fs, evo ? '#ffe066' : '#ffffff', fs, '#1d1626', 'right');
    };
    const pRow = 0, vRow = slot + gap;
    for (let i = 0; i < CONFIG.limits.passives; i++) {
      const pa = s.player.passives[i];
      if (pa) drawSlot(i * (slot + gap), pRow, pa.id, pa.level, false, false);
    }
    for (let i = 0; i < CONFIG.limits.weapons; i++) {
      const vw = s.player.weapons[i];
      if (vw) drawSlot(i * (slot + gap), vRow, weaponIconId(vw), vw.level, vw.evo, false);
      else drawSlot(i * (slot + gap), vRow, '', 0, false, true);
    }
    this.iconRow = c;
  }

  drawBanner(ctx, now, x, y) {
    const b = this.banner;
    const s = this.s;
    const fs = s + 1;
    const inner = Math.min(1, (now - b.start) / 200), out = Math.max(0, Math.min(1, (b.end + 400 - now) / 400));
    ctx.globalAlpha = Math.min(inner, out);
    const bw = textWidth(b.text) * fs + 8 * s, bh = FH * fs + 4 * s;
    const bx = Math.round(x - bw / 2), by = Math.round(y);
    ctx.fillStyle = '#1d1626';
    ctx.fillRect(bx, by + s, bw, bh - 2 * s);
    ctx.fillRect(bx + s, by, bw - 2 * s, bh);
    ctx.fillStyle = b.style === 'boss' ? '#c0392b' : b.style === 'gold' ? '#f5cf3a' : '#2a3140';
    ctx.fillRect(bx + s, by + s, bw - 2 * s, bh - 2 * s);
    this.font.draw(ctx, b.text, x, by + 2 * s, b.style === 'gold' ? '#1d1626' : '#ffffff', fs, b.style === 'gold' ? null : '#1d1626', 'center');
    ctx.globalAlpha = 1;
  }
}

function bannerActiveFor(b, now) {
  return now < b.end + 400;
}

// @ts-check
// The Matrix's introduction (Endringsprompt 4, section 7): a short animation (about 2.5 seconds) while the game is
// paused. The screen goes dark and green characters rain down, Skytsengelen, Livvakten and Shopkeeperen appear side by
// side and put on their sunglasses one by one, and «THE MATRIX» is typed out letter by letter in green.
// Looks only: it never touches the game state, and the shift's clock is stopped while it runs. Only the game's own
// pixel font and sprites are used (no logo, typeface, characters or images from the film).
import { Rng } from './utils.js';
import { drawSprite } from './sprites.js';
import { HEIGHT as FONT_H, textWidth } from './pixelfont.js';

/** How long the animation lasts (seconds), and when each part starts. */
export const MATRIX_INTRO = { duration: 2.5, figuresAt: 0.9, glassesAt: 1.15, glassesStep: 0.25, textAt: 1.55, letterTime: 0.065 };
const TITLE = 'THE MATRIX';
const GLYPHS = '0123456789ABCDEFHKMNPRTXZ';
const W = 640, H = 360;

export class MatrixIntro {
  /**
   * @param {HTMLCanvasElement} canvas 640 × 360, laid over the game canvas
   * @param {any} spr the sprites (makeSprites())
   * @param {import('./pixelfont.js').BitmapFont} font
   */
  constructor(canvas, spr, font) {
    this.canvas = canvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    this.ctx.imageSmoothingEnabled = false;
    this.spr = spr;
    this.font = font;
    this.t = 0;
    this.calm = false;
    // looks only: its own fixed stream, so nothing here can touch «Dagens vakt»
    const rng = new Rng('matrix-intro');
    this.cols = Array.from({ length: 54 }, (_, i) => ({ x: i * 12 + 2, y: -rng.next() * H * 1.2, v: 90 + rng.next() * 140, c: rng.integer(GLYPHS.length) }));
    /** @type {HTMLCanvasElement | null} */
    this.glyphs = null;
  }

  /** @param {boolean} fewerFlashes reduced flashing: no flicker, a calmer rain and no glint on the glasses */
  start(fewerFlashes) {
    this.t = 0;
    this.calm = fewerFlashes;
    for (const c of this.cols) c.y = -Math.abs(c.y % (H * 1.2));
  }

  get done() {
    return this.t >= MATRIX_INTRO.duration;
  }

  /** The glyph sheet: bright and dim green (made once). */
  sheet() {
    if (this.glyphs) return this.glyphs;
    const c = document.createElement('canvas');
    c.width = GLYPHS.length * 6;
    c.height = (FONT_H + 1) * 2;
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    for (let i = 0; i < GLYPHS.length; i++) {
      this.font.draw(ctx, GLYPHS[i], i * 6, 0, '#c8ffd4');
      this.font.draw(ctx, GLYPHS[i], i * 6, FONT_H + 1, '#2fd06a');
    }
    this.glyphs = c;
    return c;
  }

  /** Advances the animation by dt seconds and draws it. */
  draw(dt) {
    const I = MATRIX_INTRO;
    this.t += dt;
    const t = this.t, ctx = this.ctx, item = this.spr.item;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // 1. the screen goes dark …
    ctx.globalAlpha = Math.min(0.94, t / 0.3);
    ctx.fillStyle = '#020604';
    ctx.fillRect(0, 0, W, H);
    // … and green characters rain down
    const g = this.sheet();
    for (const c of this.cols) {
      c.y += c.v * dt * (this.calm ? 0.6 : 1);
      if (c.y > H + 80) c.y = -20;
      for (let k = 0; k < 9; k++) {
        const y = Math.round(c.y - k * (FONT_H + 1));
        if (y < -FONT_H || y > H) continue;
        const gi = (c.c * 7 + k * 13 + (this.calm ? 0 : Math.floor(c.y / 20) * 5)) % GLYPHS.length;
        ctx.globalAlpha = Math.min(1, t / 0.4) * (this.calm ? 0.4 : 0.8) * (1 - k / 9) * (t > I.figuresAt ? 0.6 : 1);
        ctx.drawImage(g, gi * 6, k === 0 ? 0 : FONT_H + 1, 6, FONT_H + 1, c.x, y, 6, FONT_H + 1);
      }
    }
    ctx.globalAlpha = 1;
    // 2. the three helpers side by side, putting on their sunglasses one by one (drawn 3 × with whole pixels)
    if (t >= I.figuresAt) {
      const appear = Math.min(1, (t - I.figuresAt) / 0.2);
      const figs = [
        [item.angel[1], item.angelMatrix[1]],
        [item.guard[0], item.guardMatrix[0]],
        [item.shop[0], item.shopMatrix[0]],
      ];
      ctx.globalAlpha = appear;
      figs.forEach(([before, after], i) => {
        const on = t >= I.glassesAt + i * I.glassesStep;
        const sp = on ? after : before;
        const x = 320 + (i - 1) * 110, y = 175;
        const k = 3;
        ctx.drawImage(sp.canvas, 0, 0, sp.w, sp.h, Math.round(x - sp.ax * k), Math.round(y - sp.ay * k), sp.w * k, sp.h * k);
        // a small glint on the new sunglasses
        const since = t - (I.glassesAt + i * I.glassesStep);
        if (on && since < 0.2 && !this.calm) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(x - 10), Math.round(y - sp.ay * k + 14), 6, 3);
        }
      });
      ctx.globalAlpha = 1;
      drawSprite(ctx, item.shadows.boss, 320, 245);
    }
    // 3. «THE MATRIX», letter by letter
    if (t >= I.textAt) {
      const n = Math.min(TITLE.length, Math.floor((t - I.textAt) / I.letterTime) + 1);
      const text = TITLE.slice(0, n);
      const scale = 4;
      // the text grows from the left edge of where the full title will be, like typing
      const x0 = Math.round(320 - (textWidth(TITLE) * scale) / 2);
      this.font.draw(ctx, text, x0, 262, '#2fd06a', scale, '#03140a');
      // a cursor block after the last letter (steady with reduced flashing)
      if (this.calm || Math.floor(t * 6) % 2 === 0) {
        ctx.fillStyle = '#7dff9e';
        ctx.fillRect(x0 + textWidth(text) * scale + scale, 262 + scale, scale * 3, FONT_H * scale - scale * 2);
      }
    }
  }
}

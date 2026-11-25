// @ts-check
// Small library for color-indexed pixel grids.
// All graphics are first drawn as numbers (color indices) in a grid, and turned into a canvas with a palette.
// That way the same figure can get a new skin color, hair color or clothes just by swapping the palette.

/** A grid where each pixel is a color index (0 = transparent). */
export class Raster {
  /** @param {number} w @param {number} h */
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8Array(w * h);
  }

  px(x, y, c) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }

  rect(x, y, w, h, c) {
    for (let yy = Math.floor(y); yy < y + h; yy++) for (let xx = Math.floor(x); xx < x + w; xx++) this.px(xx, yy, c);
  }

  /** Filled ellipse. The center can be at a half pixel. An optional function decides the color per pixel. */
  ellipse(cx, cy, rx, ry, c, color = null) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.px(x, y, color ? color(nx, ny, x, y) : c);
      }
    }
  }

  /** Ellipse with light at the top left and shadow at the bottom right. */
  ball(cx, cy, rx, ry, base, shadow, light) {
    this.ellipse(cx, cy, rx, ry, base, (nx, ny) => (nx * 0.7 + ny * 0.7 > 0.55 ? shadow : nx * 0.6 + ny * 0.8 < -0.6 ? light : base));
  }

  /** Rectangle with a light left edge and shadow on the right and bottom edges. */
  can(x, y, w, h, base, shadow, light) {
    this.rect(x, y, w, h, base);
    if (shadow) {
      this.rect(x + w - 1, y, 1, h, shadow);
      this.rect(x, y + h - 1, w, 1, shadow);
    }
    if (light && w > 2 && h > 2) this.rect(x, y, 1, h - 1, light);
  }

  /**
   * Stamps in a small drawn pattern. Each character is looked up in «map» (character → color index). '.' is transparent.
   * @param {string[] | string} rows
   * @param {Record<string, number>} map
   */
  stamp(rows, x, y, map, scale = 1) {
    const r = typeof rows === 'string' ? rows.trim().split(/\s+/) : rows;
    for (let ry = 0; ry < r.length; ry++) {
      for (let rx = 0; rx < r[ry].length; rx++) {
        const t = r[ry][rx];
        if (t === '.' || map[t] === undefined) continue;
        this.rect(x + rx * scale, y + ry * scale, scale, scale, map[t]);
      }
    }
  }

  /** Adds an outline (color index c) around all visible pixels. */
  outline(c) {
    const { w, h, d } = this;
    const copy = d.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (copy[y * w + x] !== 0) continue;
        const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && copy[yy * w + xx] !== 0 && copy[yy * w + xx] !== c;
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) d[y * w + x] = c;
      }
    }
  }

  /** Replaces one color index with another. */
  swap(from, to) {
    const d = this.d;
    for (let i = 0; i < d.length; i++) if (d[i] === from) d[i] = to;
  }

  /** Mirrored copy (left ↔ right). */
  mirrored() {
    const r = new Raster(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) r.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x];
    return r;
  }

  /** Copies another grid in (0 is skipped). */
  lim(r, dx, dy) {
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const c = r.d[y * r.w + x];
      if (c) this.px(dx + x, dy + y, c);
    }
  }
}

/** "#rrggbb" → [r, g, b] */
export function hex(s) {
  const v = parseInt(s.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Blends two colors. t = 0 gives a, t = 1 gives b. */
export function mix(a, b, t) {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

/** Makes a color ramp [base, shadow, light] from one color (the shadow is pulled slightly toward blue, the light toward yellow). */
export function ramp(color) {
  const b = typeof color === 'string' ? hex(color) : color;
  return [b, mix(b, [24, 20, 52], 0.32), mix(b, [255, 250, 230], 0.3)];
}

/**
 * Turns a grid into a canvas.
 * @param {Raster} r
 * @param {(number[] | null)[]} palette color index → [r, g, b] (or [r, g, b, a])
 * @param {HTMLCanvasElement} [canvas] draw into this one (otherwise a new one is made)
 */
export function toCanvas(r, palette, canvas, dx = 0, dy = 0) {
  if (!canvas) canvas = makeCanvas(r.w, r.h);
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const frame = ctx.createImageData(r.w, r.h);
  const out = frame.data;
  for (let i = 0; i < r.d.length; i++) {
    const c = r.d[i];
    if (c === 0) continue;
    const f = palette[c];
    if (!f) continue;
    out[i * 4] = f[0];
    out[i * 4 + 1] = f[1];
    out[i * 4 + 2] = f[2];
    out[i * 4 + 3] = f.length > 3 ? f[3] : 255;
  }
  ctx.putImageData(frame, dx, dy);
  return canvas;
}

/** New canvas (also works without a DOM in tests). */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** 2D context without smoothing (sharp pixels). */
export function ctx2d(canvas) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

// @ts-check
// Lite bibliotek for fargeindekserte pikselrutenett.
// All grafikk tegnes først som tall (fargeindekser) i et rutenett, og gjøres om til et lerret med en palett.
// Da kan samme figur få ny hudfarge, hårfarge eller klær bare ved å bytte palett.

/** Et rutenett der hver piksel er en fargeindeks (0 = gjennomsiktig). */
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

  /** Fylt ellipse. Senteret kan være på en halv piksel. Valgfri funksjon bestemmer fargen per piksel. */
  ellipse(cx, cy, rx, ry, c, farge = null) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.px(x, y, farge ? farge(nx, ny, x, y) : c);
      }
    }
  }

  /** Ellipse med lys oppe til venstre og skygge nede til høyre. */
  kule(cx, cy, rx, ry, base, skygge, lys) {
    this.ellipse(cx, cy, rx, ry, base, (nx, ny) => (nx * 0.7 + ny * 0.7 > 0.55 ? skygge : nx * 0.6 + ny * 0.8 < -0.6 ? lys : base));
  }

  /** Rektangel med lys venstrekant og skygge på høyre- og underkant. */
  boks(x, y, w, h, base, skygge, lys) {
    this.rect(x, y, w, h, base);
    if (skygge) {
      this.rect(x + w - 1, y, 1, h, skygge);
      this.rect(x, y + h - 1, w, 1, skygge);
    }
    if (lys && w > 2 && h > 2) this.rect(x, y, 1, h - 1, lys);
  }

  /**
   * Stempler inn et lite tegnet mønster. Hvert tegn slås opp i «kart» (tegn → fargeindeks). '.' er gjennomsiktig.
   * @param {string[] | string} rader
   * @param {Record<string, number>} kart
   */
  stempel(rader, x, y, kart, skala = 1) {
    const r = typeof rader === 'string' ? rader.trim().split(/\s+/) : rader;
    for (let ry = 0; ry < r.length; ry++) {
      for (let rx = 0; rx < r[ry].length; rx++) {
        const t = r[ry][rx];
        if (t === '.' || kart[t] === undefined) continue;
        this.rect(x + rx * skala, y + ry * skala, skala, skala, kart[t]);
      }
    }
  }

  /** Legger en kontur (fargeindeks c) rundt alle synlige piksler. */
  kontur(c) {
    const { w, h, d } = this;
    const kopi = d.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (kopi[y * w + x] !== 0) continue;
        const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && kopi[yy * w + xx] !== 0 && kopi[yy * w + xx] !== c;
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) d[y * w + x] = c;
      }
    }
  }

  /** Bytter én fargeindeks med en annen. */
  bytt(fra, til) {
    const d = this.d;
    for (let i = 0; i < d.length; i++) if (d[i] === fra) d[i] = til;
  }

  /** Speilvendt kopi (venstre ↔ høyre). */
  speilet() {
    const r = new Raster(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) r.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x];
    return r;
  }

  /** Kopierer et annet rutenett inn (0 hoppes over). */
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

/** Blander to farger. t = 0 gir a, t = 1 gir b. */
export function bland(a, b, t) {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

/** Lager en fargerampe [base, skygge, lys] fra én farge (skyggen dras litt mot blått, lyset mot gult). */
export function rampe(farge) {
  const b = typeof farge === 'string' ? hex(farge) : farge;
  return [b, bland(b, [24, 20, 52], 0.32), bland(b, [255, 250, 230], 0.3)];
}

/**
 * Gjør om et rutenett til et lerret.
 * @param {Raster} r
 * @param {(number[] | null)[]} palett fargeindeks → [r, g, b] (eller [r, g, b, a])
 * @param {HTMLCanvasElement} [lerret] tegn inn i dette (ellers lages et nytt)
 */
export function tilLerret(r, palett, lerret, dx = 0, dy = 0) {
  if (!lerret) lerret = lagLerret(r.w, r.h);
  const ctx = /** @type {CanvasRenderingContext2D} */ (lerret.getContext('2d'));
  const bilde = ctx.createImageData(r.w, r.h);
  const ut = bilde.data;
  for (let i = 0; i < r.d.length; i++) {
    const c = r.d[i];
    if (c === 0) continue;
    const f = palett[c];
    if (!f) continue;
    ut[i * 4] = f[0];
    ut[i * 4 + 1] = f[1];
    ut[i * 4 + 2] = f[2];
    ut[i * 4 + 3] = f.length > 3 ? f[3] : 255;
  }
  ctx.putImageData(bilde, dx, dy);
  return lerret;
}

/** Nytt lerret (fungerer også uten DOM i tester). */
export function lagLerret(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** 2D-kontekst uten utjevning (skarpe piksler). */
export function ctx2d(lerret) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (lerret.getContext('2d'));
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

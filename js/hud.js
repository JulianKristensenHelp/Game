// @ts-check
// HUD-en (energi, tid, score, multiplikator, erfaring, ikoner, minikart og bannere).
// Tegnes på et eget lerret i full skjermoppløsning over spillet, med samme pikselfont og pixel art-ikoner.
// HUD-en tegnes bare på nytt når noe har endret seg (maks ca. 20 ganger i sekundet), aldri hver frame uten grunn.
import { CONFIG } from './config.js';
import { BitmapFont, tekstBredde, HOEYDE as FH } from './pikselfont.js';
import { ikon, vaapenIkonId } from './ikoner.js';
import { SONER, GLASS } from './kart.js';
import { mmss, tall } from './verktoy.js';
import { multiplikator, multTekst } from './score.js';
import { lagLerret, ctx2d } from './piksel.js';

const KB = CONFIG.kart.bredde, KH = CONFIG.kart.hoeyde;
const GR = CONFIG.grensesnitt;

/** Små pikselsymboler for minikartet. */
const SYMBOL = {
  spiller: ['.###.', '#####', '#####', '#####', '.###.'],
  stjerne: ['..#..', '..#..', '#####', '.###.', '##.##'],
  boss: ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..'],
  drikk: ['.##.', '####', '####', '####', '####'],
};

export class Hud {
  /** @param {HTMLCanvasElement} lerret */
  constructor(lerret) {
    this.lerret = lerret;
    this.ctx = ctx2d(lerret);
    this.font = new BitmapFont();
    this.rect = { x: 0, y: 0, w: 640, h: 360 };
    this.s = 3;
    this.dpr = 1;
    this.skalaSpill = 1;
    this.minikartValg = 'liten';
    /** Marger i logiske piksler (sendes til tegnekoden for pilene). */
    this.margLogisk = { topp: 40, bunn: 50, venstre: 12, hoeyre: 12 };
    this.skitten = true;
    this.sisteTegning = 0;
    this.signatur = '';
    this.verdier = new Float64Array(7);
    this.multAnim = 0;
    this.multRetning = 1;
    this.banner = { tekst: '', stil: '', slutt: 0, start: 0 };
    /** @type {HTMLCanvasElement | null} */
    this.minikartBase = null;
    /** @type {HTMLCanvasElement | null} */
    this.minikart = null;
    this.minikartSist = 0;
    this.ikonVersjon = 0;
    this.ikonTegnet = -1;
    /** @type {HTMLCanvasElement | null} */
    this.ikonRad = null;
    /** Portrett av valgt karakter (vises ved energibaren). @type {HTMLCanvasElement | null} */
    this.portrett = null;
  }

  /**
   * Plasserer HUD-en over spillområdet.
   * @param {number} W vindusbredde (CSS-piksler)
   * @param {number} H vindushøyde
   * @param {{x:number,y:number,w:number,h:number}} rect spillområdet i CSS-piksler
   * @param {number} dpr
   * @param {number} uiFaktor
   * @param {string} minikart 'av' | 'liten' | 'stor'
   */
  tilpass(W, H, rect, dpr, uiFaktor, minikart) {
    this.dpr = dpr;
    this.lerret.width = Math.round(W * dpr);
    this.lerret.height = Math.round(H * dpr);
    this.lerret.style.width = W + 'px';
    this.lerret.style.height = H + 'px';
    this.ctx = ctx2d(this.lerret);
    this.rect = { x: Math.round(rect.x * dpr), y: Math.round(rect.y * dpr), w: Math.round(rect.w * dpr), h: Math.round(rect.h * dpr) };
    // Ikonene skal være minst ca. 48 skjermpiksler ved 1080p (16 piksler × 3).
    const hoeyde = Math.max(rect.h, 540);
    this.s = Math.max(1, Math.round(3 * uiFaktor * (hoeyde / 1080) * dpr));
    this.skalaSpill = this.rect.w / CONFIG.visning.bredde;
    this.minikartValg = minikart;
    this.lagMinikart();
    this.ikonTegnet = -1;
    const s = this.s, m = 3 * s;
    const toppH = this.xpHoeyde() + m + Math.max(13 * s, FH * (s + 2) + FH * (s + 1));
    this.margLogisk = { topp: Math.ceil(toppH / this.skalaSpill), bunn: Math.ceil((m + 38 * s) / this.skalaSpill / 2), venstre: 12, hoeyre: 12 };
    this.skitten = true;
  }

  xpHoeyde() {
    return FH * Math.max(1, Math.round(this.s * 0.67)) + 4;
  }

  /** Viser en kort tekst midt på skjermen (fasebytte, boss osv.). */
  visBanner(tekst, stil = '', ms = 2800) {
    const naa = performance.now();
    this.banner = { tekst, stil, start: naa, slutt: naa + ms };
    this.skitten = true;
  }

  ikonerEndret() {
    this.ikonVersjon++;
    this.skitten = true;
  }

  // ---------- Minikart ----------

  lagMinikart() {
    if (this.minikartValg === 'av') {
      this.minikartBase = null;
      this.minikart = null;
      return;
    }
    const andel = this.minikartValg === 'stor' ? GR.minikart.stor : GR.minikart.liten;
    const mw = Math.round(this.rect.w * andel), mh = Math.round((mw * KH) / KB);
    const base = lagLerret(mw, mh);
    const ctx = ctx2d(base);
    const k = mw / KB;
    ctx.fillStyle = '#2a3140';
    ctx.fillRect(0, 0, mw, mh);
    for (const sone of SONER) {
      ctx.fillStyle = sone.minikart;
      ctx.fillRect(Math.round(sone.x * k), Math.round(sone.y * k), Math.ceil(sone.w * k), Math.ceil(sone.h * k));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [x0, y0, x1, y1] of GLASS) ctx.fillRect(Math.round(x0 * k), Math.round(y0 * k), Math.max(1, Math.round((x1 - x0) * k)), Math.max(1, Math.round((y1 - y0) * k)));
    this.minikartBase = base;
    this.minikart = lagLerret(mw, mh);
  }

  stempel(ctx, rader, x, y, k, fyll, kant) {
    const w = rader[0].length, h = rader.length;
    x = Math.round(x - (w * k) / 2);
    y = Math.round(y - (h * k) / 2);
    ctx.fillStyle = kant;
    ctx.fillRect(x - k, y - k, (w + 2) * k, (h + 2) * k);
    ctx.fillStyle = fyll;
    for (let ry = 0; ry < h; ry++) for (let rx = 0; rx < w; rx++) if (rader[ry][rx] === '#') ctx.fillRect(x + rx * k, y + ry * k, k, k);
  }

  /** Tegner minikartet på nytt (maks ca. 10 ganger i sekundet). */
  oppdaterMinikart(s) {
    if (!this.minikart || !this.minikartBase) return;
    const ctx = ctx2d(this.minikart);
    const mw = this.minikart.width, mh = this.minikart.height;
    const k = mw / KB;
    ctx.drawImage(this.minikartBase, 0, 0);
    // Advokater: små, svake prikker
    const d = Math.max(1, Math.round(this.s / 2));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < s.fiender.n; i++) {
      const e = s.fiender.items[i];
      if (!e.aktiv || e.type === 'boss' || e.type === 'hastesak') continue;
      ctx.fillRect(Math.round(e.x * k), Math.round(e.y * k), d, d);
    }
    // Det som er på skjermen nå
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, Math.round(this.s / 3));
    ctx.strokeRect(Math.round(s.kamera.x * k) + 0.5, Math.round(s.kamera.y * k) + 0.5, Math.round(CONFIG.visning.bredde * k), Math.round(CONFIG.visning.hoeyde * k));
    const sk = Math.max(1, Math.round(this.s / 2));
    for (let i = 0; i < s.pickups.n; i++) {
      const p = s.pickups.items[i];
      if (p.type === 'drikk') this.stempel(ctx, SYMBOL.drikk, p.x * k, p.y * k, sk, '#2fd06a', '#0b3d1c');
    }
    for (let i = 0; i < s.fiender.n; i++) {
      const e = s.fiender.items[i];
      if (!e.aktiv || e.gaar) continue;
      if (e.type === 'hastesak') this.stempel(ctx, SYMBOL.stjerne, e.x * k, e.y * k, sk, '#ffd240', '#4a3600');
      else if (e.type === 'boss') this.stempel(ctx, SYMBOL.boss, e.x * k, e.y * k, sk, '#e5484d', '#3d0a10');
    }
    this.stempel(ctx, SYMBOL.spiller, s.spiller.x * k, s.spiller.y * k, sk, '#ffffff', '#0f766e');
    void mh;
  }

  // ---------- Tegning ----------

  /**
   * Tegner HUD-en hvis noe har endret seg.
   * @param {import('./spill.js').Spill | null} s
   * @param {{faerreBlink: boolean}} innst
   * @param {{aktiv:boolean,x0:number,y0:number,x:number,y:number}} joystick
   */
  oppdater(s, innst, joystick, tvang = false) {
    const naa = performance.now();
    if (!s) {
      if (this.signatur !== 'tom') {
        this.ctx.clearRect(0, 0, this.lerret.width, this.lerret.height);
        this.signatur = 'tom';
      }
      return;
    }
    if (this.minikart && naa - this.minikartSist > 1000 / GR.minikart.oppdateringerPerSekund) {
      this.minikartSist = naa;
      this.oppdaterMinikart(s);
      this.skitten = true;
    }
    const p = s.spiller;
    const lav = p.energi / p.maksEnergi < GR.energiLav;
    const blinkFase = lav && !innst.faerreBlink ? Math.floor(naa / 300) % 2 : 0;
    const bannerAktiv = naa < this.banner.slutt + 400;
    // Sammenlign tallene med forrige gang (uten å lage nye objekter)
    const v = this.verdier;
    const nye0 = Math.floor(s.tid), nye1 = s.score, nye2 = Math.ceil(p.energi), nye3 = p.maksEnergi, nye4 = s.multSteg * 1000 + s.multTeller;
    const nye5 = Math.round((s.xp / s.xpBehov) * 100) * 1000 + s.nivaa, nye6 = blinkFase * 1e6 + this.ikonVersjon;
    const endret = this.signatur !== 'spill' || v[0] !== nye0 || v[1] !== nye1 || v[2] !== nye2 || v[3] !== nye3 || v[4] !== nye4 || v[5] !== nye5 || v[6] !== nye6;
    const sig = 'spill';
    const animerer = bannerAktiv || joystick.aktiv;
    const grense = animerer ? 1000 / 60 : 1000 / 20;
    if (!tvang && !this.skitten && !endret && !animerer) return;
    if (!tvang && naa - this.sisteTegning < grense - 1) return;
    this.signatur = sig;
    v[0] = nye0; v[1] = nye1; v[2] = nye2; v[3] = nye3; v[4] = nye4; v[5] = nye5; v[6] = nye6;
    this.skitten = false;
    this.sisteTegning = naa;
    this.tegn(s, naa, blinkFase, innst, joystick);
  }

  tegn(s, naa, blinkFase, innst, joystick) {
    const ctx = this.ctx;
    const { x: rx, y: ry, w: rw, h: rh } = this.rect;
    const s3 = this.s, m = 3 * s3;
    const font = this.font;
    const fsS = Math.max(1, Math.round(s3 * 0.67));
    const fsM = Math.max(1, s3 - 1);
    ctx.clearRect(0, 0, this.lerret.width, this.lerret.height);
    const p = s.spiller;

    // Erfaringsbar med nivå (øverst)
    const xh = this.xpHoeyde();
    ctx.fillStyle = '#16202b';
    ctx.fillRect(rx, ry, rw, xh);
    const xpAndel = Math.min(1, s.xp / s.xpBehov);
    ctx.fillStyle = '#3aa0ff';
    ctx.fillRect(rx, ry, Math.round(rw * xpAndel), xh);
    ctx.fillStyle = '#8fd3ff';
    ctx.fillRect(rx, ry, Math.round(rw * xpAndel), Math.max(1, fsS));
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(rx, ry + xh - Math.max(1, fsS), rw, Math.max(1, fsS));
    font.tegn(ctx, 'Nivå ' + s.nivaa, rx + rw / 2, ry + 2, '#ffffff', fsS, '#16202b', 'midt');

    // Energibar formet som en energidrikkboks
    const ey = ry + xh + m;
    const ew = Math.min(Math.round(rw * 0.4), Math.max(Math.round(rw * GR.energiBredde), 70 * s3));
    const eh = 13 * s3;
    let ex = rx + m;
    if (this.portrett) {
      // Lite portrett av valgt karakter ved energibaren
      const ps = eh + 4 * s3;
      ctx.fillStyle = '#1d1626';
      ctx.fillRect(ex, ey - 2 * s3, ps, ps);
      ctx.fillStyle = '#a9b8c8';
      ctx.fillRect(ex + s3, ey - s3, ps - 2 * s3, ps - 2 * s3);
      ctx.drawImage(this.portrett, 8, 2, 48, 48, ex + s3, ey - s3, ps - 2 * s3, ps - 2 * s3);
      ex += ps + 2 * s3;
    }
    this.tegnEnergi(ctx, ex, ey, ew, eh, p, blinkFase, innst);

    // Tid, fase og score (midten)
    const midt = rx + rw / 2;
    const tidTekst = mmss(s.tid);
    font.tegn(ctx, tidTekst, midt, ey, '#ffffff', s3 + 1, '#16202b', 'midt');
    const tidB = tekstBredde(tidTekst) * (s3 + 1);
    font.tegn(ctx, s.faseNavn, midt + tidB / 2 + 2 * s3, ey + FH * (s3 + 1) - FH * fsS - s3, '#c8d6e5', fsS, '#16202b');
    const scoreTekst = tall(s.score);
    font.tegn(ctx, scoreTekst, midt, ey + FH * (s3 + 1), '#ffe066', s3 + 2, '#16202b', 'midt');

    // Multiplikator med fremdrift mot neste +0,1
    const multX = Math.max(midt + (tekstBredde(scoreTekst) * (s3 + 2)) / 2, midt + tidB / 2 + 2 * s3 + tekstBredde(s.faseNavn) * fsS) + 6 * s3;
    const mult = multiplikator(s);
    const multT = multTekst(mult);
    const sisteMult = naa - (this.multAnim ?? 0) < 500;
    const multFarge = sisteMult ? (this.multRetning > 0 ? '#ffffff' : '#ff6b6b') : '#ffd740';
    const ristX = sisteMult && this.multRetning < 0 && !innst.faerreBlink ? Math.round(Math.sin(naa / 25) * 2 * s3) : 0;
    font.tegn(ctx, multT, multX + ristX, ey + 2 * s3, multFarge, s3 + 1, '#16202b');
    const mb = tekstBredde(multT) * (s3 + 1);
    const pby = ey + 2 * s3 + FH * (s3 + 1) + s3;
    ctx.fillStyle = '#16202b';
    ctx.fillRect(multX - s3, pby - s3, mb + 2 * s3, 4 * s3);
    ctx.fillStyle = '#4a3a10';
    ctx.fillRect(multX, pby, mb, 2 * s3);
    const maks = mult >= CONFIG.multiplikator.maks - 1e-9;
    ctx.fillStyle = '#ffd740';
    ctx.fillRect(multX, pby, Math.round(mb * (maks ? 1 : s.multTeller / CONFIG.multiplikator.perHjulpne)), 2 * s3);
    if (sisteMult || bannerAktivFor(this.banner, naa)) this.skitten = true;

    // Minikart (øverst til høyre)
    if (this.minikart) {
      const mw = this.minikart.width, mh = this.minikart.height;
      const mx = rx + rw - m - mw, my = ry + xh + m;
      ctx.fillStyle = '#1d1626';
      ctx.fillRect(mx - 2 * s3, my - 2 * s3, mw + 4 * s3, mh + 4 * s3);
      ctx.fillStyle = '#c8d6e5';
      ctx.fillRect(mx - s3, my - s3, mw + 2 * s3, mh + 2 * s3);
      ctx.drawImage(this.minikart, mx, my);
    }

    // Våpen og passive (nederst til venstre, i hver sin rad)
    if (this.ikonTegnet !== this.ikonVersjon) this.tegnIkonRad(s);
    if (this.ikonRad) ctx.drawImage(this.ikonRad, rx + m, ry + rh - m - this.ikonRad.height);

    // Banner
    if (naa < this.banner.slutt + 400) this.tegnBanner(ctx, naa, midt, ry + Math.round(rh * 0.26));

    // Joystick (touch)
    if (joystick.aktiv) {
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

  /** Multiplikatoren gikk opp (+1) eller ned (−1): kort effekt. */
  multEffekt(retning) {
    this.multAnim = performance.now();
    this.multRetning = retning;
    this.skitten = true;
  }

  tegnEnergi(ctx, x, y, w, h, p, blinkFase, innst) {
    const s = this.s;
    const andel = Math.max(0, p.energi / p.maksEnergi);
    const lav = andel < GR.energiLav;
    // Boksen ligger på siden: lokk til venstre, bunn til høyre
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
    const rød = lav && (innst.faerreBlink || blinkFase === 0);
    const fw = Math.round(bw * andel);
    ctx.fillStyle = lav ? (rød ? '#e5484d' : '#8a2a2f') : '#2fd06a';
    ctx.fillRect(bx, by, fw, bh);
    ctx.fillStyle = lav ? '#ff9f9f' : '#9ff0bd';
    ctx.fillRect(bx, by, fw, s);
    ctx.fillStyle = lav ? '#7a1f24' : '#1e9a4c';
    ctx.fillRect(bx, by + bh - s, fw, s);
    // Lyn
    const lx = bx + 2 * s, ly = y + Math.round(h / 2) - 4 * s;
    ctx.fillStyle = '#ffe066';
    for (const [dx, dy, ww] of [[2, 0, 2], [1, 1, 2], [0, 2, 4], [1, 3, 2], [1, 4, 2], [0, 5, 2], [0, 6, 1]]) ctx.fillRect(lx + dx * s, ly + dy * s, ww * s, s);
    const tekst = `${Math.ceil(p.energi)} / ${p.maksEnergi}`;
    const fs = Math.max(1, s - 1);
    this.font.tegn(ctx, tekst, bx + bw / 2, y + Math.round((h - FH * fs) / 2) + fs, '#ffffff', fs, '#1d1626', 'midt');
  }

  tegnIkonRad(s) {
    this.ikonTegnet = this.ikonVersjon;
    const st = this.s;
    const slot = 18 * st, gap = 2 * st;
    const w = Math.max(CONFIG.grenser.vaapen, CONFIG.grenser.passiver) * (slot + gap);
    const h = slot * 2 + gap * 2;
    const c = lagLerret(w, h);
    const ctx = ctx2d(c);
    const fs = Math.max(1, st - 1);
    const rute = (x, y, id, nivaa, evo, tom) => {
      ctx.fillStyle = '#1d1626';
      ctx.fillRect(x, y, slot, slot);
      ctx.fillStyle = tom ? '#1d1626' : evo ? '#f5cf3a' : '#5d6b7a';
      ctx.fillRect(x + st, y + st, slot - 2 * st, slot - 2 * st);
      const inn = Math.max(1, Math.round(st / 3));
      ctx.fillStyle = tom ? '#1d1626' : '#2a3140';
      ctx.fillRect(x + st + inn, y + st + inn, slot - 2 * st - 2 * inn, slot - 2 * st - 2 * inn);
      if (tom) {
        // tydelig tom ramme (stiplet)
        ctx.fillStyle = '#5d6b7a';
        for (let i = 0; i < slot - 2 * st; i += 3 * st) {
          ctx.fillRect(x + st + i, y + st, st, st);
          ctx.fillRect(x + st + i, y + slot - 2 * st, st, st);
          ctx.fillRect(x + st, y + st + i, st, st);
          ctx.fillRect(x + slot - 2 * st, y + st + i, st, st);
        }
        return;
      }
      ctx.drawImage(ikon(id), x + st, y + st, 16 * st, 16 * st);
      const t = evo ? '★' : String(nivaa);
      this.font.tegn(ctx, t, x + slot - st, y + slot - FH * fs + fs, evo ? '#ffe066' : '#ffffff', fs, '#1d1626', 'hoeyre');
    };
    const pRad = 0, vRad = slot + gap;
    for (let i = 0; i < CONFIG.grenser.passiver; i++) {
      const pa = s.spiller.passiver[i];
      if (pa) rute(i * (slot + gap), pRad, pa.id, pa.nivaa, false, false);
    }
    for (let i = 0; i < CONFIG.grenser.vaapen; i++) {
      const vw = s.spiller.vaapen[i];
      if (vw) rute(i * (slot + gap), vRad, vaapenIkonId(vw), vw.nivaa, vw.evo, false);
      else rute(i * (slot + gap), vRad, '', 0, false, true);
    }
    this.ikonRad = c;
  }

  tegnBanner(ctx, naa, x, y) {
    const b = this.banner;
    const s = this.s;
    const fs = s + 1;
    const inn = Math.min(1, (naa - b.start) / 200), ut = Math.max(0, Math.min(1, (b.slutt + 400 - naa) / 400));
    ctx.globalAlpha = Math.min(inn, ut);
    const bw = tekstBredde(b.tekst) * fs + 8 * s, bh = FH * fs + 4 * s;
    const bx = Math.round(x - bw / 2), by = Math.round(y);
    ctx.fillStyle = '#1d1626';
    ctx.fillRect(bx, by + s, bw, bh - 2 * s);
    ctx.fillRect(bx + s, by, bw - 2 * s, bh);
    ctx.fillStyle = b.stil === 'boss' ? '#c0392b' : b.stil === 'gull' ? '#f5cf3a' : '#2a3140';
    ctx.fillRect(bx + s, by + s, bw - 2 * s, bh - 2 * s);
    this.font.tegn(ctx, b.tekst, x, by + 2 * s, b.stil === 'gull' ? '#1d1626' : '#ffffff', fs, b.stil === 'gull' ? null : '#1d1626', 'midt');
    ctx.globalAlpha = 1;
  }
}

function bannerAktivFor(b, naa) {
  return naa < b.slutt + 400;
}

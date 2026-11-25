// @ts-check
// Tegner spillverdenen i pixel art på et internt lerret på 640 × 360 logiske piksler.
// Lerretet skaleres opp med nærmeste nabo i CSS, så pikslene blir skarpe.
// Leser bare fra spilltilstanden – endrer aldri spillogikken. Automatisk kvalitet påvirker bare det som vises.
import { CONFIG, AVSENDER_BOBLER } from './config.js';
import { SONER, GLASS, lagPynt, INNE } from './kart.js';
import { lagSprites, ring, sprut, tegnSprite } from './sprites.js';
import { Figurer, RUTE } from './figurer.js';
import { TYPENAVN } from './fiender.js';
import { BitmapFont, tekstBredde, HOEYDE as FONT_H } from './pikselfont.js';
import { vaapenTall, spiralPos } from './vaapen.js';
import { Rng, TAU, mmss } from './verktoy.js';
import { lagLerret, ctx2d } from './piksel.js';

const VB = CONFIG.visning.bredde, VH = CONFIG.visning.hoeyde;
const KB = CONFIG.kart.bredde, KH = CONFIG.kart.hoeyde;
const SKYGGE = { junior: 'liten', printer: 'middels', senior: 'stor', hastesak: 'stor', boss: 'boss', avsender: 'liten' };

/** Sorteringsfunksjon (laget én gang, så sorteringen ikke lager søppel). */
const etterY = (a, b) => a.y - b.y;

export class Tegner {
  /**
   * @param {HTMLCanvasElement} lerret spillets lerret (640 × 360)
   * @param {{rist: boolean, faerreBlink: boolean}} innst
   */
  constructor(lerret, innst) {
    this.lerret = lerret;
    lerret.width = VB;
    lerret.height = VH;
    this.ctx = ctx2d(lerret);
    this.innst = innst;
    this.spr = lagSprites();
    this.fig = new Figurer();
    this.font = new BitmapFont();
    this.kart = this.lagKart();
    /** 0 = full kvalitet, 1 = middels, 2 = lav (settes av main.js ut fra tid per bilde). */
    this.kvalitet = 0;
    /** Bare til pynt (snakkebobler) – påvirker ikke spillet. */
    this.rng = new Rng('pynt');
    /** @type {{e: any, uid: number, tekst: string, t: number}[]} */
    this.bobler = [];
    this.bobleVent = 2;
    /** @type {Map<string, HTMLCanvasElement>} */
    this.bobleCache = new Map();
    /** @type {Map<string, HTMLCanvasElement>} */
    this.tekstCache = new Map();
    this.rist = 0;
    /** @type {any[]} */
    this.sortert = [];
    this.antallSynlige = 0;
    this.spillerRetning = 1;
    /** Marger (logiske piksler) der HUD-en ligger, så pilene ikke havner bak den. */
    this.marg = { topp: 40, bunn: 50, venstre: 12, hoeyre: 12 };
    /** Antall glade advokater som animeres akkurat nå (vises i debug). */
    this.gladeVist = 0;
  }

  // ---------- Kartet (forhåndstegnes én gang) ----------

  lagKart() {
    const c = lagLerret(KB, KH);
    const ctx = ctx2d(c);
    const g = this.spr.gulv;
    // Gulv per sone
    for (const s of SONER) {
      ctx.fillStyle = /** @type {CanvasPattern} */ (ctx.createPattern(g[s.gulv], 'repeat'));
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
    // Lister mellom sonene
    ctx.fillStyle = 'rgba(40, 40, 60, 0.35)';
    for (const s of SONER.slice(1)) {
      ctx.fillRect(s.x, s.y, s.w, 2);
      ctx.fillRect(s.x, s.y + s.h - 2, s.w, 2);
      ctx.fillRect(s.x, s.y, 2, s.h);
      ctx.fillRect(s.x + s.w - 2, s.y, 2, s.h);
    }
    // Pynt (sortert etter y, så det som står lenger ned tegnes over)
    const pynt = lagPynt().sort((a, b) => a.y - b.y);
    for (const p of pynt) {
      const s = this.spr.pynt[p.t];
      if (s) tegnSprite(ctx, s, p.x, p.y);
    }
    // Glassvegger (bare pynt, blokkerer ikke)
    for (const [x0, y0, x1, y1] of GLASS) {
      const loddrett = x0 === x1;
      const w = loddrett ? 4 : x1 - x0, h = loddrett ? y1 - y0 : 4;
      ctx.fillStyle = 'rgba(168, 220, 255, 0.45)';
      ctx.fillRect(x0 - (loddrett ? 2 : 0), y0 - (loddrett ? 0 : 2), w, h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(x0 - (loddrett ? 2 : 0), y0 - (loddrett ? 0 : 2), loddrett ? 1 : w, loddrett ? h : 1);
      ctx.fillStyle = '#5d6b7a';
      const lengde = loddrett ? h : w;
      for (let i = 0; i <= lengde; i += 40) {
        if (loddrett) ctx.fillRect(x0 - 2, y0 + Math.min(i, lengde - 2), 4, 2);
        else ctx.fillRect(x0 + Math.min(i, lengde - 2), y0 - 2, 2, 4);
      }
    }
    this.tegnVegger(ctx);
    return c;
  }

  /** Yttervegger med vinduer, heisdører, inngang og nødutganger. */
  tegnVegger(ctx) {
    const V = CONFIG.kart.vegg;
    // Toppveggen (vi ser veggflaten)
    ctx.fillStyle = '#d9d2c3';
    ctx.fillRect(0, 0, KB, V.topp);
    ctx.fillStyle = '#c4bba8';
    ctx.fillRect(0, V.topp - 8, KB, 2);
    ctx.fillStyle = '#7d705d';
    ctx.fillRect(0, V.topp - 6, KB, 6);
    ctx.fillStyle = '#3d3a40';
    ctx.fillRect(0, 0, KB, 4);
    // Vinduer
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
    // Heisdører
    for (const x of [1110, 1240, 1370]) {
      ctx.fillStyle = '#5d6b7a';
      ctx.fillRect(x, 4, 80, V.topp - 4);
      ctx.fillStyle = '#b9c3cd';
      ctx.fillRect(x + 4, 10, 35, V.topp - 10);
      ctx.fillRect(x + 41, 10, 35, V.topp - 10);
      ctx.fillStyle = '#eef1f5';
      ctx.fillRect(x + 4, 10, 2, V.topp - 10);
      ctx.fillRect(x + 41, 10, 2, V.topp - 10);
      ctx.fillStyle = '#f5cf3a';
      ctx.fillRect(x + 36, 5, 8, 3);
    }
    // Sidevegger og bunnvegg (sett ovenfra)
    ctx.fillStyle = '#4a4f5c';
    ctx.fillRect(0, 0, V.venstre, KH);
    ctx.fillRect(KB - V.hoeyre, 0, V.hoeyre, KH);
    ctx.fillRect(0, KH - V.bunn, KB, V.bunn);
    ctx.fillStyle = '#6b7383';
    ctx.fillRect(V.venstre - 3, V.topp, 3, KH - V.topp - V.bunn);
    ctx.fillRect(KB - V.hoeyre, V.topp, 3, KH - V.topp - V.bunn);
    ctx.fillRect(V.venstre, KH - V.bunn, KB - V.venstre - V.hoeyre, 3);
    // Hovedinngang (glassdører) og nødutganger
    ctx.fillStyle = '#a8dcff';
    ctx.fillRect(1236, KH - V.bunn, 88, V.bunn);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1279, KH - V.bunn, 2, V.bunn);
    for (const y of [736, 1226]) {
      ctx.fillStyle = '#2fd06a';
      ctx.fillRect(0, y, V.venstre, 48);
      ctx.fillRect(KB - V.hoeyre, y, V.hoeyre, 48);
    }
    for (const [x, y] of [[30, 300], [600, KH - V.bunn], [2000, 4]]) {
      ctx.fillStyle = '#8a6f4c';
      if (y === 4) ctx.fillRect(x - 24, 4, 48, V.topp - 4);
      else if (x === 30) ctx.fillRect(0, y - 24, V.venstre, 48);
      else ctx.fillRect(x - 24, y, 48, V.bunn);
    }
  }

  // ---------- Ett bilde ----------

  /**
   * @param {import('./spill.js').Spill | null} s
   * @param {number} naa animasjonsklokke i sekunder
   * @param {number} dt sekunder siden forrige bilde (0 når spillet står stille)
   */
  tegn(s, naa, dt) {
    const ctx = this.ctx;
    let kx = s ? Math.round(s.kamera.x) : Math.round((KB - VB) / 2 + Math.sin(naa * 0.1) * 300);
    let ky = s ? Math.round(s.kamera.y) : Math.round((KH - VH) / 2 + Math.cos(naa * 0.13) * 200);
    if (this.rist > 0) {
      this.rist -= dt;
      if (this.innst.rist) {
        kx += Math.round(Math.sin(naa * 90) * 2);
        ky += Math.round(Math.cos(naa * 70) * 2);
      }
    }
    kx = Math.max(0, Math.min(KB - VB, kx));
    ky = Math.max(0, Math.min(KH - VH, ky));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(this.kart, kx, ky, VB, VH, 0, 0, VB, VH);
    if (!s) return;
    ctx.setTransform(1, 0, 0, 1, -kx, -ky);
    const x0 = kx - 48, y0 = ky - 48, x1 = kx + VB + 48, y1 = ky + VH + 64;
    const ting = this.spr.ting;
    const faerreBlink = this.innst.faerreBlink;

    // Papirhauger
    for (let i = 0; i < s.papir.n; i++) {
      const h = s.papir.items[i];
      ctx.globalAlpha = Math.min(1, h.liv / 1.2);
      tegnSprite(ctx, ting.papir, h.x, h.y);
    }
    ctx.globalAlpha = 1;

    this.tegnEffekterUnder(s, naa);

    // Ticket-lapper (blinker de siste sekundene)
    const L = CONFIG.lapper;
    for (let i = 0; i < s.lapper.n; i++) {
      const l = s.lapper.items[i];
      if (l.x < x0 || l.x > x1 || l.y < y0 || l.y > y1) continue;
      if (!l.dratt && l.alder > L.levetid - L.blinkTid) {
        if (faerreBlink) ctx.globalAlpha = 0.5;
        else if (Math.floor(l.alder * 7) % 2 === 0) continue;
      }
      tegnSprite(ctx, l.verdi > 60 ? ting.lappStor : ting.lapp, l.x, l.y);
      ctx.globalAlpha = 1;
    }

    // Energidrikk og Ny PC (glød og en liten hoppe-bevegelse)
    for (let i = 0; i < s.pickups.n; i++) {
      const pk = s.pickups.items[i];
      if (pk.x < x0 || pk.x > x1 || pk.y < y0 || pk.y > y1) continue;
      const hopp = faerreBlink ? 0 : Math.round(Math.abs(Math.sin(naa * 3 + i)) * -3);
      ctx.globalAlpha = faerreBlink ? 0.7 : 0.55 + Math.sin(naa * 4 + i) * 0.25;
      tegnSprite(ctx, pk.type === 'drikk' ? ting.drikkGlod : ting.pcGlod, pk.x, pk.y);
      ctx.globalAlpha = 1;
      tegnSprite(ctx, pk.type === 'drikk' ? ting.drikk : ting.pc, pk.x, pk.y + hopp);
      if (!faerreBlink && this.kvalitet < 2 && Math.floor(naa * 2 + i) % 3 === 0) {
        tegnSprite(ctx, ting.glitter[1], pk.x + 7, pk.y - 9 + hopp);
      }
    }

    // Glade advokater (under de aktive, så de aldri skjuler noen som fortsatt trenger hjelp)
    this.tegnGlade(s, naa);

    // Aktive advokater sortert etter y
    const sortert = this.sortert;
    let n = 0;
    for (let i = 0; i < s.fiender.n; i++) {
      const e = s.fiender.items[i];
      if (!e.aktiv || e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1) continue;
      sortert[n++] = e;
    }
    sortert.length = n;
    sortert.sort(etterY);
    this.antallSynlige = n;
    const skygger = ting.skygger;
    for (let i = 0; i < n; i++) {
      const e = sortert[i];
      const ark = this.fig.ark(e.type, e.variant);
      if (e.type === 'hastesak') {
        ctx.globalAlpha = faerreBlink ? 0.8 : 0.7 + Math.sin(naa * 8) * 0.2;
        tegnSprite(ctx, ting.hasteGlod, e.x, e.y - 4);
        ctx.globalAlpha = 1;
      }
      const sk = skygger[SKYGGE[e.type]];
      tegnSprite(ctx, sk, e.x, e.y + ark.h - ark.ay - 3);
      const bilde = (Math.floor(naa * 8 + e.uid * 0.37) & 3) + (e.blink > 0 ? RUTE.blink : 0) + (e.retning < 0 ? RUTE.venstre : 0);
      if (e.gaar) ctx.globalAlpha = 0.6;
      ctx.drawImage(ark.lerret, bilde * ark.w, ark.sy, ark.w, ark.h, Math.round(e.x - ark.ax), Math.round(e.y - ark.ay), ark.w, ark.h);
      ctx.globalAlpha = 1;
      // Varsel før en e-post: laptopen lyser og et «!» over hodet
      if (e.varsel) {
        if (e.type === 'avsender') {
          ctx.globalAlpha = faerreBlink ? 0.8 : 0.6 + Math.sin(naa * 30) * 0.3;
          tegnSprite(ctx, ting.laptopGlod, e.x, e.y - 3);
          ctx.globalAlpha = 1;
        }
        tegnSprite(ctx, ting.utrop, e.x, e.y - ark.ay - (e.type === 'boss' ? 34 : 2));
      }
    }
    this.tegnBossKlokker(s, n);

    // E-poster (over advokatene, med rød glød så de skiller seg fra spillerens egne effekter)
    for (let i = 0; i < s.fiendeSkudd.n; i++) {
      const q = s.fiendeSkudd.items[i];
      ctx.globalAlpha = 0.55;
      tegnSprite(ctx, ting.epostGlod, q.x, q.y);
      ctx.globalAlpha = 1;
      tegnSprite(ctx, ting.epost, q.x, q.y + (faerreBlink ? 0 : Math.round(Math.sin(naa * 10 + i))));
    }

    this.tegnVaapen(s, naa);
    this.tegnSpiller(s, naa);
    this.tegnEffekterOver(s, naa);
    if (this.kvalitet < 2) this.tegnBobler(s, dt, n);
    else this.bobler.length = 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.tegnPiler(s, kx, ky, naa);
  }

  /** Glad-animasjon: smil og tommel opp med et lite hopp og glitter, så en liten piksel-sky. */
  tegnGlade(s, naa) {
    const ctx = this.ctx;
    const ting = this.spr.ting;
    let vist = 0;
    const kort = this.kvalitet >= 2;
    for (let i = 0; i < s.effekter.n; i++) {
      const e = s.effekter.items[i];
      if (e.type !== 'glad') continue;
      vist++;
      const smil = kort ? Math.min(e.r, 0.15) : e.r;
      const slutt = kort ? Math.min(e.dur, 0.25) : e.dur;
      if (e.t > slutt) continue;
      const type = TYPENAVN[e.a];
      const ark = this.fig.ark(type, e.b);
      if (e.t < smil) {
        const f = e.t / smil;
        const hopp = Math.round(Math.sin(f * Math.PI) * (type === 'boss' ? 8 : 4));
        const bilde = RUTE.glad + (e.c < 0 ? RUTE.venstre : 0);
        ctx.drawImage(ark.lerret, bilde * ark.w, ark.sy, ark.w, ark.h, Math.round(e.x - ark.ax), Math.round(e.y - ark.ay - hopp), ark.w, ark.h);
        if (this.kvalitet < 2 && !this.innst.faerreBlink) {
          const antall = this.kvalitet === 0 ? 3 : 1;
          for (let j = 0; j < antall; j++) {
            const a = naa * 4 + j * 2.1 + e.b;
            tegnSprite(ctx, ting.glitter[(j + Math.floor(f * 3)) % 3], e.x + Math.cos(a) * (ark.w * 0.45), e.y - ark.ay * 0.6 + Math.sin(a) * 6 - hopp);
          }
        }
      } else {
        const f = (e.t - smil) / Math.max(0.01, slutt - smil);
        ctx.globalAlpha = 1 - f * 0.5;
        tegnSprite(ctx, ting.poff[Math.min(3, Math.floor(f * 4))], e.x, e.y - ark.ay * 0.3);
        ctx.globalAlpha = 1;
      }
    }
    this.gladeVist = vist;
  }

  /** Effekter som ligger på gulvet: puls, tonersprut, kabel, glimt og Ny PC. */
  tegnEffekterUnder(s, naa) {
    const ctx = this.ctx;
    const p = s.spiller;
    for (let i = 0; i < s.effekter.n; i++) {
      const e = s.effekter.items[i];
      const f = e.t / e.dur;
      const x = e.folg ? p.x : e.x, y = e.folg ? p.y : e.y;
      if (e.type === 'puls') {
        const r = e.r * (0.35 + 0.65 * f);
        ctx.globalAlpha = 1 - f * 0.8;
        if (e.b) {
          // Full omstart: dobbel ring i turkis og gull
          tegnSprite(ctx, ring(r, '#5eead4', 3, this.kvalitet < 2 ? 0.12 : 0), x, y);
          tegnSprite(ctx, ring(r * 0.75, '#f5cf3a', 1), x, y);
        } else {
          tegnSprite(ctx, ring(r, '#14b8a6', 2, this.kvalitet < 2 ? 0.14 : 0), x, y);
        }
        tegnSprite(ctx, this.spr.ting.stroem, x, y - r);
        ctx.globalAlpha = 1;
      } else if (e.type === 'sprut') {
        ctx.globalAlpha = 1 - f * 0.6;
        tegnSprite(ctx, sprut(e.r, Math.min(3, Math.floor(f * 4)), e.b === 1), x, y);
        ctx.globalAlpha = 1;
      } else if (e.type === 'sving') {
        this.tegnKabel(x, y, e.r, e.a, e.b, f);
      } else if (e.type === 'glimt' && e.b === 2) {
        // Teams-varsel treffer: liten lilla ring
        ctx.globalAlpha = 1 - f;
        tegnSprite(ctx, ring(e.r + 2 + f * 6, '#c06bd8', 1), x, y);
        ctx.globalAlpha = 1;
      } else if (e.type === 'blokk') {
        // Headsetet blokkerte et treff: puls rundt spilleren
        ctx.globalAlpha = 1 - f;
        tegnSprite(ctx, ring(e.r * (0.3 + 0.7 * f), e.b ? '#f5cf3a' : '#5eead4', 3, this.kvalitet < 2 ? 0.15 : 0), x, y);
        ctx.globalAlpha = 1;
      } else if (e.type === 'glimt') {
        // Fjernstyring: stråle ovenfra (gull for Domene-admin)
        const alfa = 1 - f;
        ctx.globalAlpha = alfa;
        ctx.fillStyle = e.b ? '#f5cf3a' : '#3aa0ff';
        ctx.fillRect(Math.round(x) - 2, Math.round(y) - 160, 5, 160);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(x), Math.round(y) - 160, 1, 160);
        tegnSprite(ctx, ring(e.r + 3 + f * 6, e.b ? '#f5cf3a' : '#8fd3ff', 1), x, y);
        ctx.globalAlpha = 1;
      }
    }
  }

  /** HDMI-kabelen: tegnes som en pikselkabel langs en bue. type 0 = foran, 1 = foran og bak, 2 = full sirkel. */
  tegnKabel(cx, cy, R, vinkel, type, f) {
    const ctx = this.ctx;
    const bue = type === 2 ? TAU : CONFIG.vaapen.hdmi.nivaaer[0].bue;
    const tegnBue = (midt) => {
      const fra = type === 2 ? midt : midt - bue / 2;
      const sveip = bue * Math.min(1, f * 1.8);
      const steg = Math.max(0.02, 1.6 / R);
      ctx.globalAlpha = 1 - f * 0.6;
      ctx.fillStyle = '#1d1626';
      for (let a = fra; a <= fra + sveip; a += steg) ctx.fillRect(Math.round(cx + Math.cos(a) * (R - 2)) - 1, Math.round(cy + Math.sin(a) * (R - 2)) - 1, 3, 3);
      ctx.fillStyle = type === 2 ? '#f5cf3a' : '#6b7a8a';
      for (let a = fra; a <= fra + sveip; a += steg * 2) ctx.fillRect(Math.round(cx + Math.cos(a) * (R - 2)), Math.round(cy + Math.sin(a) * (R - 2)), 1, 1);
      const slutt = fra + sveip;
      ctx.fillStyle = '#f5cf3a';
      ctx.fillRect(Math.round(cx + Math.cos(slutt) * (R - 1)) - 2, Math.round(cy + Math.sin(slutt) * (R - 1)) - 2, 5, 5);
      ctx.fillStyle = '#1d1626';
      ctx.fillRect(Math.round(cx + Math.cos(slutt) * (R - 1)) - 1, Math.round(cy + Math.sin(slutt) * (R - 1)) - 1, 3, 2);
      ctx.globalAlpha = 1;
    };
    tegnBue(vinkel);
    if (type === 1) tegnBue(vinkel + Math.PI);
  }

  /** Oppdateringsstrålen: grønne pikselblokker langs en linje, med tekst «Oppdaterer… 47 %». */
  tegnStraale(x, y, vinkel, L, B, andel, evo) {
    const ctx = this.ctx;
    const cos = Math.cos(vinkel), sin = Math.sin(vinkel);
    const b = Math.max(4, Math.round(B * 0.55));
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#1d1626';
    for (let d = 8; d < L; d += 3) ctx.fillRect(Math.round(x + cos * d - b / 2 - 1), Math.round(y + sin * d - b / 2 - 1), b + 2, b + 2);
    ctx.fillStyle = '#20302a';
    for (let d = 8; d < L; d += 3) ctx.fillRect(Math.round(x + cos * d - b / 2), Math.round(y + sin * d - b / 2), b, b);
    const fylt = 8 + (L - 8) * andel;
    for (let d = 8, i = 0; d < fylt; d += 3, i++) {
      ctx.fillStyle = (i >> 1) & 1 ? (evo ? '#f5cf3a' : '#2fd06a') : evo ? '#fff6c8' : '#9ff0bd';
      ctx.fillRect(Math.round(x + cos * d - b / 2 + 1), Math.round(y + sin * d - b / 2 + 1), b - 2, b - 2);
    }
    ctx.globalAlpha = 1;
    if (this.kvalitet < 2) {
      const pst = Math.min(99, Math.floor(andel * 100));
      this.font.tegn(ctx, 'Oppdaterer… ' + pst + ' %', x + cos * (L * 0.5), y + sin * (L * 0.5) - b - 10, '#ffffff', 1, '#1d1626', 'midt');
    }
  }

  /** Trådløse mus og prosjektiler. */  tegnVaapen(s, naa) {
    const ctx = this.ctx;
    const p = s.spiller;
    const ting = this.spr.ting;
    for (let i = 0; i < p.vaapen.length; i++) {
      const w = p.vaapen[i];
      if (w.id !== 'mus') continue;
      const t = vaapenTall(w);
      const R = t.bane * p.mod.omraade;
      ctx.globalAlpha = w.evo ? 0.5 : 0.35;
      tegnSprite(ctx, ring(R, w.evo ? '#8fd3ff' : '#14b8a6', w.evo ? 3 : 1, 0, w.evo ? 0 : 3), p.x, p.y);
      ctx.globalAlpha = 1;
      const sett = w.evo ? ting.musEvo : ting.mus;
      for (let j = 0; j < t.antall; j++) {
        const a = w.vinkel + (j * TAU) / t.antall;
        const idx = ((Math.round(((a + Math.PI / 2) / TAU) * 16) % 16) + 16) % 16;
        tegnSprite(ctx, sett[idx], p.x + Math.cos(a) * R, p.y + Math.sin(a) * R);
      }
    }
    for (let i = 0; i < p.vaapen.length; i++) {
      const w = p.vaapen[i];
      if (w.id === 'straale' && (w.aktiv > 0 || w.evo)) {
        // Oppdateringsstrålen: en lang fremdriftsindikator («Oppdaterer… 47 %»)
        const t = vaapenTall(w);
        const andel = w.evo ? (naa * 0.4) % 1 : 1 - w.aktiv / Math.max(0.01, w.fase);
        this.tegnStraale(p.x, p.y, w.vinkel, t.lengde * p.mod.omraade, t.bredde * p.mod.omraade, andel, w.evo);
        if (w.evo) this.tegnStraale(p.x, p.y, w.vinkel + Math.PI, t.lengde * p.mod.omraade, t.bredde * p.mod.omraade, (andel + 0.5) % 1, true);
      } else if (w.id === 'ctrlz' && w.evo) {
        // Ctrl+Alt+Del: taster i spiral
        const t = vaapenTall(w);
        const R = t.radius * p.mod.omraade;
        for (let j = 0; j < t.antall; j++) {
          const pos = spiralPos(w, t, j, R, p);
          tegnSprite(ctx, ting.spiralTaster[j % 3], pos[0], pos[1]);
        }
      }
    }
    for (let i = 0; i < s.prosjektiler.n; i++) {
      const pr = s.prosjektiler.items[i];
      if (pr.type === 'ctrlz') {
        tegnSprite(ctx, ting.ctrlz[(Math.floor(naa * 16) + i) & 7], pr.x, pr.y);
        continue;
      }
      if (pr.type === 'teams') {
        tegnSprite(ctx, ting.teams, pr.x, pr.y);
        continue;
      }      if (pr.type === 'toner') {
        const sett = pr.evo ? ting.tonerEvo : ting.toner;
        tegnSprite(ctx, sett[(Math.floor(naa * 14) + i) & 7], pr.x, pr.y);
      } else {
        const sett = pr.evo ? ting.noekkelEvo : ting.noekkel;
        const idx = ((Math.round((pr.vinkel / TAU) * 16) % 16) + 16) % 16;
        tegnSprite(ctx, sett[idx], pr.x, pr.y);
      }
    }
  }

  /** Spilleren – tegnes alltid over advokatene, med eget omriss. */
  tegnSpiller(s, naa) {
    const ctx = this.ctx;
    const p = s.spiller;
    const ting = this.spr.ting;
    const ark = this.fig.ark('spiller', s.karakter);
    if (Math.abs(p.retX) > 0.2) this.spillerRetning = p.retX < 0 ? -1 : 1;
    // Markør på gulvet
    tegnSprite(ctx, ring(11, '#14b8a6', 1, 0.25), p.x, p.y + ark.h - ark.ay - 4);
    // Støydempende headset: hel ring når skjoldet er klart, en ring som fylles opp mens det lades
    for (let i = 0; i < p.vaapen.length; i++) {
      const w = p.vaapen[i];
      if (w.id !== 'headset') continue;
      const t = vaapenTall(w);
      if (w.ladninger > 0) {
        ctx.globalAlpha = this.innst.faerreBlink ? 0.8 : 0.65 + Math.sin(naa * 4) * 0.2;
        tegnSprite(ctx, ring(17, w.evo ? '#f5cf3a' : '#5eead4', 2, 0.1), p.x, p.y - 3);
        if (w.ladninger > 1) tegnSprite(ctx, ring(20, '#f5cf3a', 1), p.x, p.y - 3);
        ctx.globalAlpha = 1;
      }
      if (w.ladninger < t.ladninger) {
        const andel = 1 - w.cd / (t.lading * p.mod.cd);
        ctx.fillStyle = '#5eead4';
        const R = w.ladninger > 0 ? 22 : 17;
        for (let a = 0; a < andel * TAU; a += 0.12) ctx.fillRect(Math.round(p.x + Math.sin(a) * R), Math.round(p.y - 3 - Math.cos(a) * R), 1, 1);
      }
    }    if (p.kick > 0) {
      // Sukkerkick: gul ring og grønne gnister rundt figuren
      const a = Math.min(1, p.kick);
      ctx.globalAlpha = a;
      tegnSprite(ctx, ring(16 + (this.innst.faerreBlink ? 0 : Math.round(Math.sin(naa * 12))), '#ffe03c', 2), p.x, p.y - 2);
      if (this.kvalitet < 2) {
        for (let j = 0; j < 4; j++) {
          const v = naa * 5 + (j * TAU) / 4;
          tegnSprite(ctx, ting.glitter[2], p.x + Math.cos(v) * 18, p.y - 2 + Math.sin(v) * 18);
        }
      }
      ctx.globalAlpha = 1;
    }
    const gange = p.beveger ? Math.floor(naa * 10) & 3 : 0;
    let bilde = gange + (this.spillerRetning < 0 ? RUTE.venstre : 0);
    if (p.usaarbar > 0) {
      // Blink ved treff
      if (this.innst.faerreBlink) ctx.globalAlpha = 0.65;
      else if (Math.floor(naa * 20) % 2 === 0) bilde += RUTE.blink;
    }
    ctx.drawImage(ark.lerret, bilde * ark.w, ark.sy, ark.w, ark.h, Math.round(p.x - ark.ax), Math.round(p.y - ark.ay), ark.w, ark.h);
    ctx.globalAlpha = 1;
    if (p.iPapir) this.font.tegn(ctx, 'Sakte …', p.x, p.y - 30, '#ffffff', 1, '#1d1626', 'midt');
  }

  /** Effekter over figurene: piksel-sky, poengtekst og Ny PC-blink. */
  tegnEffekterOver(s, naa) {
    const ctx = this.ctx;
    const ting = this.spr.ting;
    for (let i = 0; i < s.effekter.n; i++) {
      const e = s.effekter.items[i];
      const f = e.t / e.dur;
      if (e.type === 'poff') {
        ctx.globalAlpha = 1 - f;
        tegnSprite(ctx, ting.poff[Math.min(3, Math.floor(f * 4))], e.x, e.y);
        tegnSprite(ctx, ting.glitter[0], e.x, e.y - 10 - f * 10);
        ctx.globalAlpha = 1;
      } else if (e.type === 'tekst') {
        ctx.globalAlpha = 1 - f * f;
        const c = this.tekstLerret(e.tekst);
        ctx.drawImage(c, Math.round(e.x - c.width / 2), Math.round(e.y - f * 20));
        ctx.globalAlpha = 1;
      } else if (e.type === 'nypc') {
        ctx.globalAlpha = (1 - f) * (this.innst.faerreBlink ? 0.25 : 0.55);
        ctx.fillStyle = '#c8ecff';
        ctx.fillRect(s.kamera.x, s.kamera.y, VB, VH);
        ctx.globalAlpha = 1;
      }
    }
    void naa;
  }

  /** Ferdig tegnet poengtekst («+1000»), caches per tekst. */
  tekstLerret(tekst) {
    let c = this.tekstCache.get(tekst);
    if (c) return c;
    c = lagLerret(tekstBredde(tekst) * 2 + 4, FONT_H * 2 + 4);
    const ctx = ctx2d(c);
    this.font.tegn(ctx, tekst, 2, 2, '#ffd740', 2, '#1d1626');
    if (this.tekstCache.size > 60) this.tekstCache.clear();
    this.tekstCache.set(tekst, c);
    return c;
  }

  /** Nedtellingsklokka og frustrasjonsbaren til bossen. */
  tegnBossKlokker(s, n) {
    const ctx = this.ctx;
    for (let i = 0; i < n; i++) {
      const e = this.sortert[i];
      if (e.type !== 'boss') continue;
      const ark = this.fig.ark('boss', e.variant);
      const y = Math.round(e.y - ark.ay - 16);
      const andel = e.gaar ? 0 : Math.max(0, e.timer / CONFIG.fiender.boss.frist);
      tegnSprite(ctx, this.spr.klokker[Math.round(andel * 40)], e.x, y);
      this.font.tegn(ctx, e.gaar ? 'For sent!' : mmss(Math.ceil(e.timer)), e.x, y - 24, e.gaar ? '#ffffff' : andel < 0.25 ? '#ff8f8f' : '#ffffff', 1, '#1d1626', 'midt');
      if (!e.gaar) {
        const bx = Math.round(e.x - 24), by = Math.round(e.y + ark.h - ark.ay + 2);
        ctx.fillStyle = '#1d1626';
        ctx.fillRect(bx - 1, by - 1, 50, 6);
        ctx.fillStyle = '#5d1a22';
        ctx.fillRect(bx, by, 48, 4);
        ctx.fillStyle = '#e5484d';
        ctx.fillRect(bx, by, Math.round(48 * Math.max(0, e.hp / e.maksHp)), 4);
        ctx.fillStyle = '#ff8f8f';
        ctx.fillRect(bx, by, Math.round(48 * Math.max(0, e.hp / e.maksHp)), 1);
      }
    }
  }

  /** Snakkebobler: sporadisk, på noen få, aldri mer enn tre samtidig. */
  tegnBobler(s, dt, antallSynlige) {
    const ctx = this.ctx;
    const b = this.bobler;
    const maks = this.kvalitet === 0 ? 3 : 1;
    for (let i = b.length - 1; i >= 0; i--) {
      b[i].t -= dt;
      // Boblen forsvinner i samme øyeblikk som advokaten blir glad.
      if (b[i].t <= 0 || !b[i].e.aktiv || b[i].e.uid !== b[i].uid) b.splice(i, 1);
    }
    this.bobleVent -= dt;
    if (this.bobleVent <= 0 && b.length < maks && antallSynlige > 0) {
      this.bobleVent = 1.5 + this.rng.neste() * 2.5;
      const e = this.sortert[this.rng.heltall(antallSynlige)];
      if (e && e.type !== 'boss' && !b.some((x) => x.e === e)) {
        const tekster = e.type === 'avsender' ? AVSENDER_BOBLER : CONFIG.bobler;
        b.push({ e, uid: e.uid, tekst: tekster[this.rng.heltall(tekster.length)], t: 2.6 });
      }
    }
    for (const bo of b) {
      const c = this.bobleLerret(bo.tekst);
      const ark = this.fig.ark(bo.e.type, bo.e.variant);
      ctx.globalAlpha = Math.min(1, bo.t * 3, (2.6 - bo.t) * 6);
      ctx.drawImage(c, Math.round(bo.e.x - c.width / 2), Math.round(bo.e.y - ark.ay - c.height - 2));
      ctx.globalAlpha = 1;
    }
  }

  /** Snakkeboble i pixel art (caches per tekst). */
  bobleLerret(tekst) {
    let c = this.bobleCache.get(tekst);
    if (c) return c;
    const b = tekstBredde(tekst) + 8, h = FONT_H + 4;
    c = lagLerret(b + 2, h + 6);
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
    this.font.tegn(ctx, tekst, 5, 2 - 1, '#1d1626');
    this.bobleCache.set(tekst, c);
    return c;
  }

  /** Piler i skjermkanten mot boss, hastesak og nærmeste energidrikk når de er utenfor bildet. */
  tegnPiler(s, kx, ky, naa) {
    for (let i = 0; i < s.fiender.n; i++) {
      const e = s.fiender.items[i];
      if (!e.aktiv || e.gaar || (e.type !== 'hastesak' && e.type !== 'boss')) continue;
      this.pil(e.x - kx, e.y - ky, e.type === 'boss' ? this.spr.piler.boss : this.spr.piler.haste, e.type === 'boss' ? 'FRIST' : 'HASTESAK', naa, null);
    }
    let best = null, bestD = 1e12;
    for (let i = 0; i < s.pickups.n; i++) {
      const pk = s.pickups.items[i];
      if (pk.type !== 'drikk') continue;
      const d = (pk.x - s.spiller.x) ** 2 + (pk.y - s.spiller.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = pk;
      }
    }
    if (best) this.pil(best.x - kx, best.y - ky, this.spr.piler.drikk, '', naa, this.spr.ting.drikk);
  }

  pil(sx, sy, sett, tekst, naa, ikonSprite) {
    if (sx > 0 && sx < VB && sy > 0 && sy < VH) return;
    const m = this.marg;
    const cx = VB / 2, cy = VH / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const hw = cx - Math.max(m.venstre, m.hoeyre) - 10, hh = cy - Math.max(m.topp, m.bunn) - 10;
    const t = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
    const px = cx + Math.cos(a) * t, py = cy + Math.sin(a) * t;
    const puls = this.innst.faerreBlink ? 0 : Math.round(Math.sin(naa * 7) * 2);
    const idx = ((Math.round((a / TAU) * 16) % 16) + 16) % 16;
    tegnSprite(this.ctx, sett[idx], px + Math.cos(a) * puls, py + Math.sin(a) * puls);
    const lx = px - Math.cos(a) * 16, ly = py - Math.sin(a) * 16;
    if (ikonSprite) tegnSprite(this.ctx, ikonSprite, lx, ly);
    else if (tekst) this.font.tegn(this.ctx, tekst, Math.max(30, Math.min(VB - 30, lx)), Math.max(m.topp, Math.min(VH - 14, ly - 5)), '#ffffff', 1, '#1d1626', 'midt');
  }
}

export { INNE };

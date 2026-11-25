// @ts-check
// Advokatene: hvem som dukker opp når og hvor, hvordan de beveger seg, og hva som skjer når de blir glade.
import { CONFIG } from './config.js';
import { TAU } from './verktoy.js';
import { effekt } from './effekter.js';
import { giPoeng, registrerHjulpet } from './score.js';
import { skadSpiller } from './spiller.js';
import { leggLapp, leggPickup } from './lapper.js';
import { INNE, DOERER } from './kart.js';

const F = CONFIG.fiender;
const SP = CONFIG.spawn;
const VB = CONFIG.visning.bredde, VH = CONFIG.visning.hoeyde;

/** Typekoder brukt av glad-animasjonen (effekter lagrer tall, ikke tekst). */
export const TYPEKODE = { junior: 0, printer: 1, senior: 2, hastesak: 3, boss: 4, avsender: 5 };
export const TYPENAVN = ['junior', 'printer', 'senior', 'hastesak', 'boss', 'avsender'];

/** Tomt fiendeobjekt til poolen. */
export function lagFiende() {
  return {
    aktiv: false, type: 'junior', x: 0, y: 0, r: 7,
    /** hp = gjenstående frustrasjon. */
    hp: 0, maksHp: 0, fart: 0, skade: 0, poeng: 0,
    blink: 0, musCd: 0, ctrlCd: 0, uid: 0, cx: 0, cy: 0,
    /** Avsender og boss: tid til neste e-post, og om varselet («!») vises nå. */
    skudd: 0, varsel: false, bossIndeks: 0,
    /** Boss: nedtelling. Hastesak: levetid. Printer: tid til neste papirhaug. */
    timer: 0,
    /** Boss som har gitt opp og går ut. */
    gaar: false,
    fase: 0,
    /** Bare utseende: hvilken variant (fra egen tilfeldighetsstrøm) og hvilken vei figuren ser. */
    variant: 0, retning: 1,
  };
}

export function lagPapir() {
  return { x: 0, y: 0, liv: 0 };
}

function overtid(min) {
  const sk = CONFIG.skalering;
  return min > sk.overtidFraMin ? Math.pow(sk.overtidVekstPerMin, min - sk.overtidFraMin) : 1;
}
/** Frustrasjon: vokser med en fast prosent per minutt etter den rolige starten. */
export function frustrasjonsfaktor(t) {
  const sk = CONFIG.skalering;
  const min = t / 60;
  return Math.pow(sk.frustrasjonVekstPerMin, Math.max(0, min - sk.startEtterMin)) * overtid(min);
}
/** Skade: øker jevnt per minutt. */
export function skadefaktor(t) {
  const min = t / 60;
  return (1 + CONFIG.skalering.skadePerMin * min) * overtid(min);
}
/** Fartsøkning med tiden (med tak). */
export const fartsfaktor = (t) => {
  const sk = CONFIG.skalering;
  const min = t / 60;
  // I overtid blir de i tillegg raskere, uten tak – så ingen kan bare løpe unna for alltid.
  return Math.min(sk.fartMaks, 1 + sk.fartPerMin * min) + Math.max(0, min - sk.overtidFraMin) * sk.overtidFartPerMin;
};

/** Advokater per sekund ved tid t (glir jevnt mellom punktene i CONFIG.spawn.rate). */
export function spawnRate(t) {
  const pkt = SP.rate;
  for (let i = 1; i < pkt.length; i++) {
    if (t < pkt[i][0]) {
      const [t0, r0] = pkt[i - 1], [t1, r1] = pkt[i];
      return r0 + ((r1 - r0) * (t - t0)) / (t1 - t0);
    }
  }
  const siste = pkt[pkt.length - 1];
  return siste[1] + (SP.overtidPerMin * (t - siste[0])) / 60;
}

/** Er punktet innenfor det spilleren ser (med litt ekstra marg)? */
export function iSynsfelt(s, x, y, marg = 0) {
  const k = s.kamera;
  return x > k.x - marg && x < k.x + VB + marg && y > k.y - marg && y < k.y + VH + marg;
}

/** Setter en advokat ut på kartet. */
export function spawnFiende(s, type, x, y) {
  const k = F[type];
  const e = s.fiender.ny();
  e.aktiv = true;
  e.type = type;
  e.x = Math.min(INNE.x1 - k.radius, Math.max(INNE.x0 + k.radius, x));
  e.y = Math.min(INNE.y1 - k.radius, Math.max(INNE.y0 + k.radius, y));
  e.r = k.radius;
  e.fart = k.fart;
  e.blink = 0;
  e.musCd = 0;
  e.uid = ++s.nesteUid;
  e.gaar = false;
  e.fase = (e.uid * 2.399) % TAU;
  e.timer = 0;
  e.skudd = CONFIG.avsender.skuddIntervall;
  e.varsel = false;
  e.ctrlCd = 0;
  // Utseendet trekkes fra en egen strøm, så det aldri påvirker Dagens vakt.
  e.variant = s.rng.utseende.heltall(CONFIG.figurVarianter[type]);
  e.retning = x > s.spiller.x ? -1 : 1;
  if (type === 'avsender') s.antallAvsendere++;
  if (type === 'boss') {
    e.bossIndeks = s.bossNr;
    e.skudd = CONFIG.bossSkudd.intervall;
    e.hp = k.frustrasjon * Math.pow(k.frustrasjonPerBoss, s.bossNr);
    e.poeng = Math.round(k.poeng * Math.pow(k.poengPerBoss, s.bossNr));
    e.skade = k.skade * skadefaktor(s.tid);
    e.timer = k.frist;
  } else {
    e.hp = k.frustrasjon * frustrasjonsfaktor(s.tid);
    if (type !== 'hastesak') e.fart = k.fart * fartsfaktor(s.tid);
    e.poeng = k.poeng;
    e.skade = k.skade * skadefaktor(s.tid);
    if (type === 'hastesak') e.timer = k.levetid;
    if (type === 'printer') e.timer = k.papirIntervall;
    // Taket på antall advokater er nådd: de neste blir sterkere i stedet for flere.
    if (s.spart > 0 && type !== 'hastesak') {
      const u = Math.min(s.spart, SP.maksSpart);
      s.spart -= u;
      e.hp *= 1 + SP.styrkePerSpart * u;
      e.skade *= 1 + SP.skadePerSpart * u;
    }
  }
  e.maksHp = e.hp;
  return e;
}

const plass = { x: 0, y: 0 };

/**
 * Finner et sted å slippe inn en advokat: inne på kartet, utenfor synsfeltet og et godt stykke unna.
 * Er det trangt (spilleren står i et hjørne), brukes heisene og dørene langs veggene.
 */
function finnSpawnPlass(s, minAvst = SP.minAvstand, maksAvst = SP.maksAvstand) {
  const p = s.spiller, rng = s.rng.plass;
  for (let i = 0; i < SP.forsoek; i++) {
    const a = rng.neste() * TAU, d = minAvst + rng.neste() * (maksAvst - minAvst);
    const x = Math.min(INNE.x1 - 12, Math.max(INNE.x0 + 12, p.x + Math.cos(a) * d));
    const y = Math.min(INNE.y1 - 12, Math.max(INNE.y0 + 12, p.y + Math.sin(a) * d));
    if (iSynsfelt(s, x, y, 20)) continue;
    if ((x - p.x) ** 2 + (y - p.y) ** 2 < SP.absoluttMin ** 2) continue;
    plass.x = x;
    plass.y = y;
    return plass;
  }
  return dorPlass(s);
}

/** Velger en dør eller heis som ikke er i synsfeltet og ikke for nær (ellers den som er lengst unna). */
function dorPlass(s) {
  const p = s.spiller;
  let antall = 0;
  for (const d of DOERER) if (!iSynsfelt(s, d.x, d.y, 20) && (d.x - p.x) ** 2 + (d.y - p.y) ** 2 >= SP.absoluttMin ** 2) antall++;
  if (antall > 0) {
    let n = s.rng.plass.heltall(antall);
    for (const d of DOERER) {
      if (!iSynsfelt(s, d.x, d.y, 20) && (d.x - p.x) ** 2 + (d.y - p.y) ** 2 >= SP.absoluttMin ** 2 && n-- === 0) {
        plass.x = d.x;
        plass.y = d.y;
        return plass;
      }
    }
  }
  let best = DOERER[0], bestD = -1;
  for (const d of DOERER) {
    const dd = (d.x - p.x) ** 2 + (d.y - p.y) ** 2;
    if (dd > bestD) {
      bestD = dd;
      best = d;
    }
  }
  plass.x = best.x;
  plass.y = best.y;
  return plass;
}

/** Slipper inn en advokat hvis det er plass under taket, ellers spares den (og de neste blir sterkere). */
function proevSpawn(s, type, x, y) {
  if (s.fiender.n >= SP.maksSamtidige) {
    s.spart = Math.min(200, s.spart + 1);
    return;
  }
  spawnFiende(s, type, x, y);
}

/**
 * Regissøren: bestemmer når og hvor advokater dukker opp.
 * Tidspunkt og typer kommer fra spawn-strømmen og er like for alle samme dag.
 */
export function oppdaterRegissor(s, dt) {
  const p = s.spiller;
  const rng = s.rng.spawn;
  const t = s.tid;

  // Jevn strøm av advokater.
  s.spawnAkk += spawnRate(t) * dt;
  while (s.spawnAkk >= 1) {
    s.spawnAkk -= 1;
    const typeTall = rng.neste();
    let type = 'junior';
    const vS = t >= F.senior.fra ? F.senior.vekt : 0;
    const vP = t >= F.printer.fra ? F.printer.vekt : 0;
    const A = CONFIG.avsender;
    const vA = t >= A.fra ? A.vekt : 0;
    const x = typeTall * (F.junior.vekt + vS + vP + vA);
    if (x < vS) type = 'senior';
    else if (x < vS + vP) type = 'printer';
    else if (x < vS + vP + vA) {
      // Tak: maks 15 % av de aktive og maks 30 samtidig (ellers blir det en juniorfullmektig)
      const tak = Math.min(A.maksAntall, Math.floor(Math.max(s.fiender.n, 20) * A.maksAndel));
      type = s.antallAvsendere < tak ? 'avsender' : 'junior';
    }
    const pl = finnSpawnPlass(s);
    proevSpawn(s, type, pl.x, pl.y);
  }

  // Bølgehendelser: flokk fra én retning, eller ring med åpning. Tilpasses veggene.
  const B = CONFIG.boelger;
  if (t >= s.nesteBoelge) {
    const slag = rng.neste();
    const vinkel = rng.neste() * TAU;
    s.nesteBoelge = t + rng.mellom(B.intervallMin, B.intervallMaks);
    const min = t / 60;
    if (t >= B.ringFra && slag < B.ringSjanse) {
      const n = Math.min(B.ringMaks, Math.round(B.ringStart + B.ringPerMin * min));
      const bue = TAU - B.ringAapning;
      for (let i = 0; i < n; i++) {
        const a = vinkel + B.ringAapning / 2 + (bue * (i + 0.5)) / n;
        const x = Math.min(INNE.x1 - 12, Math.max(INNE.x0 + 12, p.x + Math.cos(a) * B.ringRadius));
        const y = Math.min(INNE.y1 - 12, Math.max(INNE.y0 + 12, p.y + Math.sin(a) * B.ringRadius));
        // Punkter som havner tett inntil spilleren fordi veggen er nær, hoppes over.
        if ((x - p.x) ** 2 + (y - p.y) ** 2 < 200 * 200) continue;
        proevSpawn(s, 'junior', x, y);
      }
      s.hendelser.push('ring');
    } else {
      const n = Math.min(B.flokkMaks, Math.round(B.flokkStart + B.flokkPerMin * min));
      const d = (SP.minAvstand + SP.maksAvstand) / 2;
      let mx = 0, my = 0, funnet = false;
      for (const a of [vinkel, vinkel + Math.PI, vinkel + Math.PI / 2, vinkel - Math.PI / 2]) {
        mx = Math.min(INNE.x1 - 40, Math.max(INNE.x0 + 40, p.x + Math.cos(a) * d));
        my = Math.min(INNE.y1 - 40, Math.max(INNE.y0 + 40, p.y + Math.sin(a) * d));
        if (!iSynsfelt(s, mx, my, 20) && (mx - p.x) ** 2 + (my - p.y) ** 2 >= SP.absoluttMin ** 2) {
          funnet = true;
          break;
        }
      }
      if (!funnet) {
        const pl = dorPlass(s);
        mx = pl.x;
        my = pl.y;
      }
      for (let i = 0; i < n; i++) {
        // Tett spiral rundt midtpunktet.
        const rr = 10 * Math.sqrt(i), aa = i * 2.4;
        proevSpawn(s, 'junior', mx + Math.cos(aa) * rr, my + Math.sin(aa) * rr);
      }
    }
  }

  // Hastesak og boss bruker en egen strøm.
  const rs = s.rng.spesial;
  const H = F.hastesak;
  if (t >= s.nesteHastesak) {
    s.nesteHastesak = t + rs.mellom(H.intervallMin, H.intervallMaks);
    const a = rs.neste() * TAU;
    // Aldri mer enn én hastesak om gangen.
    let finnes = false;
    for (let i = 0; i < s.fiender.n; i++) if (s.fiender.items[i].aktiv && s.fiender.items[i].type === 'hastesak') finnes = true;
    if (!finnes) {
      let x = p.x + Math.cos(a) * H.startAvstand, y = p.y + Math.sin(a) * H.startAvstand;
      if (x < INNE.x0 + 60 || x > INNE.x1 - 60) x = p.x - Math.cos(a) * H.startAvstand;
      if (y < INNE.y0 + 60 || y > INNE.y1 - 60) y = p.y - Math.sin(a) * H.startAvstand;
      spawnFiende(s, 'hastesak', x, y);
      s.hendelser.push('hastesakKom');
    }
  }
  if (t >= s.nesteBoss) {
    s.nesteBoss += F.boss.intervall;
    const a = rs.neste() * TAU;
    let x = p.x + Math.cos(a) * 330, y = p.y + Math.sin(a) * 330;
    if (x < INNE.x0 + 40 || x > INNE.x1 - 40) x = p.x - Math.cos(a) * 330;
    if (y < INNE.y0 + 40 || y > INNE.y1 - 40) y = p.y - Math.sin(a) * 330;
    spawnFiende(s, 'boss', x, y);
    s.bossNr++;
    s.stat.bosserTotalt++;
    s.hendelser.push('boss');
  }
}

/** Legger en papirhaug. Er det for mange, fjernes den eldste. */
function leggPapir(s, x, y) {
  const k = F.printer;
  const hauger = s.papir;
  if (hauger.n >= k.papirMaks) {
    let eldst = 0;
    for (let i = 1; i < hauger.n; i++) if (hauger.items[i].liv < hauger.items[eldst].liv) eldst = i;
    hauger.fjern(eldst);
  }
  const h = hauger.ny();
  h.x = x;
  h.y = y;
  h.liv = k.papirLevetid;
}

/** Tomt fiendeskudd (e-post) til poolen. */
export function lagEpost() {
  return { x: 0, y: 0, vx: 0, vy: 0, liv: 0, skade: 0, vinkel: 0 };
}

/** Sender en e-post i rett linje mot der spilleren står nå (ikke målsøkende). */
function sendEpost(s, x, y, vinkel, skade) {
  const FS = CONFIG.fiendeSkudd;
  if (s.fiendeSkudd.n >= FS.maks) return;
  const q = s.fiendeSkudd.ny();
  q.x = x;
  q.y = y;
  q.vx = Math.cos(vinkel) * FS.fart;
  q.vy = Math.sin(vinkel) * FS.fart;
  q.liv = FS.levetid;
  q.skade = skade;
  q.vinkel = vinkel;
  s.hendelser.push('epost');
}

/** Flytter e-postene. De forsvinner etter levetiden, ved ytterveggen eller når de treffer spilleren. */
export function oppdaterEposter(s, dt) {
  const pool = s.fiendeSkudd, p = s.spiller;
  const rr = (CONFIG.fiendeSkudd.radius + p.r) ** 2;
  for (let i = pool.n - 1; i >= 0; i--) {
    const q = pool.items[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.liv -= dt;
    if (q.liv <= 0 || q.x < INNE.x0 || q.x > INNE.x1 || q.y < INNE.y0 || q.y > INNE.y1) {
      pool.fjern(i);
      continue;
    }
    if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 < rr) {
      if (p.usaarbar <= 0) skadSpiller(s, q.skade);
      pool.fjern(i);
    }
  }
}

/** Flytter alle advokater, holder dem litt fra hverandre og sjekker berøring med spilleren. */
export function oppdaterFiender(s, dt) {
  const p = s.spiller;
  const f = s.fiender;
  const ut = s.treffListe;
  s.antallAvsendere = 0;
  for (let i = 0; i < f.n; i++) {
    const e = f.items[i];
    if (!e.aktiv) continue;
    if (e.blink > 0) e.blink -= dt;
    if (e.musCd > 0) e.musCd -= dt;
    if (e.ctrlCd > 0) e.ctrlCd -= dt;
    let dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;

    if (e.type === 'hastesak') {
      // Løper fra spilleren i sikksakk, unna veggene, og skader ikke.
      e.timer -= dt;
      if (e.timer <= 0) {
        e.aktiv = false;
        effekt(s, 'poff', e.x, e.y, 0.4, e.r);
        continue;
      }
      const fart = e.fart * (d > F.hastesak.saktAvstand ? F.hastesak.saktFaktor : 1);
      e.fase += dt * 3;
      const sving = Math.sin(e.fase) * 0.6;
      let vx = -dx - dy * sving, vy = -dy + dx * sving;
      const marg = 90;
      if (e.x < INNE.x0 + marg) vx += (INNE.x0 + marg - e.x) / marg * 2;
      if (e.x > INNE.x1 - marg) vx -= (e.x - (INNE.x1 - marg)) / marg * 2;
      if (e.y < INNE.y0 + marg) vy += (INNE.y0 + marg - e.y) / marg * 2;
      if (e.y > INNE.y1 - marg) vy -= (e.y - (INNE.y1 - marg)) / marg * 2;
      const vl = Math.hypot(vx, vy) || 1;
      e.x += (vx / vl) * fart * dt;
      e.y += (vy / vl) * fart * dt;
      if (Math.abs(vx) > 0.2) e.retning = vx < 0 ? -1 : 1;
    } else if (e.type === 'avsender') {
      // Holder avstand: går nærmere hvis for langt unna, trekker seg unna hvis for nær, ellers sidelengs.
      const A = CONFIG.avsender;
      let vx = 0, vy = 0;
      if (d > A.avstandMaks) {
        vx = dx;
        vy = dy;
      } else if (d < A.avstandMin) {
        vx = -dx;
        vy = -dy;
      } else {
        const side = (e.uid & 1) ? 1 : -1;
        vx = -dy * side * 0.5;
        vy = dx * side * 0.5;
      }
      e.x += vx * e.fart * dt;
      e.y += vy * e.fart * dt;
      e.retning = dx < 0 ? -1 : 1;
      s.antallAvsendere++;
      // E-post: bare når avsenderen er på skjermen, så varselet alltid kan sees.
      if (iSynsfelt(s, e.x, e.y, -8)) {
        e.skudd -= dt;
        e.varsel = e.skudd <= A.varsel;
        if (e.skudd <= 0) {
          if (s.fiendeSkudd.n < CONFIG.fiendeSkudd.maks) {
            sendEpost(s, e.x, e.y - 4, Math.atan2(p.y - e.y, p.x - e.x), e.skade);
            e.skudd = Math.max(A.skuddIntervallMin, A.skuddIntervall / (1 + A.skuddRaskerePerMin * (s.tid / 60)));
            e.varsel = false;
          } else e.skudd = 0; // venter til det er plass
        }
      } else {
        e.skudd = Math.max(e.skudd, A.varsel + 0.3);
        e.varsel = false;
      }
      // Myk dytting så de ikke står oppå hverandre
      const n = s.rutenett.finn(e.x, e.y, e.r * 0.8, ut, 6);
      for (let j = 0; j < n; j++) {
        const o = f.items[ut[j]];
        if (o === e) continue;
        const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy), min = (e.r + o.r) * 0.8;
        if (od < min && od > 0.01) {
          e.x += (ox / od) * (min - od) * 0.25;
          e.y += (oy / od) * (min - od) * 0.25;
        }
      }
    } else if (e.type === 'boss' && e.gaar) {
      // Fristen gikk ut: bossen går sint ut og kan verken skade eller treffes.
      e.x -= dx * F.boss.gaarFart * dt;
      e.y -= dy * F.boss.gaarFart * dt;
      e.timer -= dt;
      e.retning = dx > 0 ? -1 : 1;
      if (!iSynsfelt(s, e.x, e.y, 60) || e.timer <= 0) e.aktiv = false;
    } else {
      if (e.type === 'boss') {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.gaar = true;
          e.timer = 8;
          e.varsel = false;
          s.hendelser.push('bossTapt');
        }
        // Fra og med boss nummer tre: en vifte med e-poster, med samme varsel og regler
        const BS = CONFIG.bossSkudd;
        if (!e.gaar && e.bossIndeks + 1 >= BS.fraBoss && iSynsfelt(s, e.x, e.y, -8)) {
          e.skudd -= dt;
          e.varsel = e.skudd <= CONFIG.avsender.varsel;
          if (e.skudd <= 0) {
            if (s.fiendeSkudd.n + BS.antall <= CONFIG.fiendeSkudd.maks) {
              const a = Math.atan2(p.y - e.y, p.x - e.x);
              for (let j = 0; j < BS.antall; j++) sendEpost(s, e.x, e.y - 10, a + (j - (BS.antall - 1) / 2) * BS.spredning, e.skade * 0.6);
              e.skudd = BS.intervall;
              e.varsel = false;
            } else e.skudd = 0;
          }
        }
      } else if (e.type === 'printer') {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = F.printer.papirIntervall;
          if (iSynsfelt(s, e.x, e.y, 40)) leggPapir(s, e.x, e.y);
        }
      }
      e.x += dx * e.fart * dt;
      e.y += dy * e.fart * dt;
      if (Math.abs(dx) > 0.15) e.retning = dx < 0 ? -1 : 1;

      if (e.type !== 'boss') {
        // Myk dytting så advokatene ikke står oppå hverandre (maks 6 naboer, så det aldri blir tregt).
        const n = s.rutenett.finn(e.x, e.y, e.r * 0.8, ut, 6);
        for (let j = 0; j < n; j++) {
          const o = f.items[ut[j]];
          if (o === e) continue;
          const ox = e.x - o.x, oy = e.y - o.y;
          const od = Math.hypot(ox, oy);
          const min = (e.r + o.r) * 0.8;
          if (od < min && od > 0.01) {
            const skyv = (min - od) * 0.25;
            e.x += (ox / od) * skyv;
            e.y += (oy / od) * skyv;
          }
        }
      }
    }

    // Ytterveggene stopper advokatene også.
    if (e.x < INNE.x0 + e.r) e.x = INNE.x0 + e.r;
    else if (e.x > INNE.x1 - e.r) e.x = INNE.x1 - e.r;
    if (e.y < INNE.y0 + e.r) e.y = INNE.y0 + e.r;
    else if (e.y > INNE.y1 - e.r) e.y = INNE.y1 - e.r;

    // Berøring med spilleren.
    if (e.aktiv && !e.gaar && e.skade > 0) {
      const bx = p.x - e.x, by = p.y - e.y, rr = e.r + p.r - 2;
      if (bx * bx + by * by < rr * rr) skadSpiller(s, e.skade);
    }
  }
}

/**
 * Gir en advokat hjelp (senker frustrasjonen). Når den når null, blir advokaten glad.
 * @param {string} kilde hvilket våpen hjelpen kom fra (til statistikken)
 */
export function hjelp(s, e, mengde, kilde) {
  if (!e.aktiv || e.gaar) return;
  const m = mengde * s.spiller.mod.hjelp;
  s.stat.hjelpPerVaapen[kilde] = (s.stat.hjelpPerVaapen[kilde] || 0) + Math.min(e.hp, m);
  e.hp -= m;
  e.blink = 0.09;
  if (e.hp <= 0) blirGlad(s, e);
}

/**
 * Advokaten er fornøyd. Fra dette øyeblikket kan den verken skade, treffes eller telles som fiende.
 * Det som vises (smil, tommel opp, piksel-sky) er en ren effekt. Igjen ligger bare ticket-lappen.
 */
export function blirGlad(s, e) {
  if (!e.aktiv) return;
  e.aktiv = false;
  e.hp = 0;
  const G = CONFIG.glad;
  s.gladeNaa++;
  const kort = s.gladeNaa > G.mangeSamtidig;
  effekt(s, 'glad', e.x, e.y, kort ? G.kortVarighet : G.varighet, kort ? G.kortSmil : G.smil, TYPEKODE[e.type], e.variant, false, '', e.retning);
  s.hjulpne++;
  s.stat.perType[e.type] = (s.stat.perType[e.type] || 0) + 1;
  s.hendelser.push('glad');

  if (e.type === 'hastesak') {
    const poeng = giPoeng(s, e.poeng);
    effekt(s, 'tekst', e.x, e.y - 20, 1.2, 0, 0, 0, false, '+' + poeng);
    s.hendelser.push('hastesakGlad');
  } else if (e.type === 'boss') {
    const poeng = giPoeng(s, e.poeng);
    effekt(s, 'tekst', e.x, e.y - 40, 1.6, 0, 0, 0, false, '+' + poeng);
    s.stat.bosserHjulpet++;
    // Bossen gir poengbonus og en garantert «Ny PC» (ikke energidrikk).
    leggPickup(s, 'pc', e.x, e.y + 10);
    s.hendelser.push('bossGlad');
  } else {
    leggLapp(s, e.x, e.y, e.poeng);
    if (s.rng.drops.neste() < CONFIG.nyPc.dropSjanse) leggPickup(s, 'pc', e.x, e.y);
  }
  registrerHjulpet(s);
}

/** «Ny PC»: alle vanlige advokater på skjermen blir glade. Bosser og hastesaker får mye hjelp. */
export function nyPc(s) {
  const f = s.fiender;
  const n = f.n;
  for (let i = 0; i < n; i++) {
    const e = f.items[i];
    if (!e.aktiv || e.gaar || !iSynsfelt(s, e.x, e.y, 0)) continue;
    if (e.type === 'boss' || e.type === 'hastesak') hjelp(s, e, CONFIG.nyPc.hjelpTilSpesielle, 'nypc');
    else blirGlad(s, e);
  }
  const p = s.spiller;
  effekt(s, 'nypc', p.x, p.y, 0.5, 400, 0, 0, true);
  s.hendelser.push('nypc');
}

/** Rydder bort advokater som ikke lenger er aktive. */
export function ryddFiender(s) {
  const f = s.fiender;
  for (let i = f.n - 1; i >= 0; i--) if (!f.items[i].aktiv) f.fjern(i);
}

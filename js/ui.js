// @ts-check
// Menyene (HTML): start, nivåopp-kort, pause, innstillinger, toppliste, statistikk og oppslagstavle.
import { CONFIG } from './config.js';
import { mmss, tall } from './verktoy.js';
import { multTekst } from './score.js';
import { vaapenNavn } from './vaapen.js';
import { ikonElement } from './ikoner.js';

/** @returns {HTMLElement} */
export const el = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

const SKJERMER = ['start', 'karaktervalg', 'nivaaopp', 'pause', 'innstillinger', 'slutt'];

/** Hvor portrettene hentes fra (settes av main.js). @type {(i: number) => HTMLCanvasElement} */
let portrettKilde = () => document.createElement('canvas');
export function settPortrettKilde(f) {
  portrettKilde = f;
}

/** Et lite lerret-element med portrettet til karakter nr. i. */
export function portrettElement(i) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  c.className = 'portrett';
  /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(portrettKilde(i), 0, 0);
  return c;
}

/** Karakter nr. ut fra id-en som lagres i topplisten ('k1'–'k4'). */
export function karakterIndeks(id) {
  const i = CONFIG.karakterer.findIndex((k) => k.id === id);
  return i;
}

/** Viser én av skjermene (eller ingen). */
export function visSkjerm(navn) {
  for (const s of SKJERMER) el(s).hidden = s !== navn;
}

/** Lager et element med tekst (unngår innerHTML med brukerdata, f.eks. navn i topplisten). */
function lag(tag, klasse, tekst) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = String(tekst);
  return e;
}

// ---------- Nivåopp ----------

/** Viser oppgraderingskortene med store ikoner og stor tekst. */
export function visKort(s, velg) {
  el('nyttnivaa').textContent = String(s.nivaa);
  const holder = el('kort');
  holder.replaceChildren();
  holder.className = s.kort.length === 1 ? 'en' : s.kort.length === 2 ? 'to' : '';
  s.kort.forEach((k, i) => {
    const b = lag('button', 'kort' + (k.fremhevet ? ' fremhevet' : ''));
    b.append(lag('kbd', 'tast', i + 1), ikonElement(k.ikon), lag('span', 'navn', k.navn), lag('span', 'nivaa', k.nivaaTekst), lag('span', 'tekst', k.tekst));
    b.addEventListener('click', () => velg(i));
    holder.append(b);
  });
}

// ---------- Toppliste ----------

/**
 * Tegner topplisten. Spillerens egen rad fremheves, også utenfor topp 20.
 * @param {HTMLElement} holder
 * @param {import('./toppliste.js').Toppliste | null} data null = utilgjengelig
 * @param {string} egetNavn
 */
export function tegnToppliste(holder, data, egetNavn) {
  holder.replaceChildren();
  if (!data) {
    holder.append(lag('p', 'dempet', 'Topplisten er utilgjengelig akkurat nå. Du kan fortsatt spille – prøv igjen litt senere.'));
    return;
  }
  if (data.topp.length === 0) {
    holder.append(lag('p', 'dempet', 'Ingen har spilt i dag ennå. Bli den første på lista!'));
    return;
  }
  const tabell = lag('table');
  const hode = lag('tr');
  hode.append(lag('th', '', '#'), lag('th', '', 'Navn'), lag('th', 'hoyre', 'Poeng'), lag('th', 'hoyre', 'Tid'));
  tabell.append(hode);
  const meg = egetNavn.trim().toLowerCase();
  const rad = (r) => {
    const tr = lag('tr', meg && r.navn.toLowerCase() === meg ? 'meg' : '');
    const navn = lag('td', 'navn');
    const ki = karakterIndeks(r.karakter);
    if (ki >= 0) navn.append(portrettElement(ki));
    navn.append(document.createTextNode(r.navn));
    tr.append(lag('td', '', r.plass + '.'), navn, lag('td', 'hoyre', tall(r.score)), lag('td', 'hoyre', mmss(r.tid)));
    tr.title = `${r.hjulpne} hjulpne advokater · høyeste multiplikator ${multTekst(r.maksMult)}`;
    return tr;
  };
  for (const r of data.topp) tabell.append(rad(r));
  if (data.egen && data.egen.plass > data.topp.length) {
    const skille = lag('tr', 'skille');
    const td = lag('td', '', '…');
    td.colSpan = 4;
    skille.append(td);
    tabell.append(skille, rad(data.egen));
  }
  holder.append(tabell);
  if (data.antall > data.topp.length) holder.append(lag('p', 'dempet liten', `${data.antall} har spilt i dag.`));
}

// ---------- Oppslagstavle ----------

const TAVLE = 'hds_kombinasjoner';

/** @returns {string[]} våpen-id-ene til kombinasjoner spilleren har låst opp */
export function hentKombinasjoner() {
  try {
    const v = JSON.parse(localStorage.getItem(TAVLE) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Lagrer nye kombinasjoner (kalles når runden er over – aldri under spill). */
export function lagreKombinasjoner(ider) {
  const liste = hentKombinasjoner();
  let endret = false;
  for (const id of ider) if (!liste.includes(id)) {
    liste.push(id);
    endret = true;
  }
  if (!endret) return;
  try {
    localStorage.setItem(TAVLE, JSON.stringify(liste));
  } catch {
    /* ignorer */
  }
}

export function tegnOppslagstavle() {
  const holder = el('oppslagstavle');
  holder.replaceChildren();
  const funnet = hentKombinasjoner();
  for (const [id, v] of Object.entries(CONFIG.vaapen)) {
    const k = v.kombinasjon;
    if (funnet.includes(id)) {
      const li = lag('li');
      const tekst = lag('div');
      tekst.append(lag('span', '', k.navn), lag('small', '', `${v.navn} (nivå 8) + ${CONFIG.passiver[k.passiv].navn}`));
      li.append(ikonElement('evo:' + id), tekst);
      holder.append(li);
    } else {
      const li = lag('li', 'laast');
      li.append(ikonElement('laas'), lag('span', '', 'Ikke oppdaget ennå'));
      holder.append(li);
    }
  }
}

// ---------- Slutt-skjerm ----------

/** Morsom statistikk fra runden. */
export function tegnStatistikk(s) {
  const liste = el('statistikk');
  liste.replaceChildren();
  const linje = (t) => liste.append(lag('li', '', t));
  const st = s.stat;
  linje(`Du hjalp ${tall(s.hjulpne)} advokater`);
  const printer = st.perType.printer || 0;
  if (printer > 0) linje(`${tall(printer)} av dem hadde printerproblemer`);
  const senior = st.perType.senior || 0;
  if (senior > 0) linje(`${tall(senior)} seniorpartnere fikk omsider logget inn`);
  if (st.bosserTotalt > 0) linje(`Du hjalp ${st.bosserHjulpet} av ${st.bosserTotalt} bosser før fristen`);
  const haste = st.perType.hastesak || 0;
  if (haste > 0) linje(`Du rakk ${haste} ${haste === 1 ? 'hastesak' : 'hastesaker'}`);
  if (st.blokkert > 0) linje(`Headsetet blokkerte ${st.blokkert} treff`);
  if (st.drikker > 0) linje(`Du fant ${st.drikker} ${st.drikker === 1 ? 'energidrikk' : 'energidrikker'} på kartet`);
  linje(`Høyeste multiplikator: ${multTekst(CONFIG.multiplikator.start + st.maksMultSteg * CONFIG.multiplikator.steg)}`);
  let best = '', bestHjelp = 0;
  for (const [id, h] of Object.entries(st.hjelpPerVaapen)) {
    if (h > bestHjelp && CONFIG.vaapen[id]) {
      bestHjelp = h;
      best = id;
    }
  }
  if (best) {
    const w = s.spiller.vaapen.find((x) => x.id === best);
    linje(`Mest effektive våpen: ${w ? vaapenNavn(w) : CONFIG.vaapen[best].navn} (${tall(bestHjelp)} hjelp gitt)`);
  }
  if (st.kombinasjoner.length > 0) {
    linje(`Kombinasjoner låst opp: ${st.kombinasjoner.map((id) => CONFIG.vaapen[id].kombinasjon.navn).join(', ')}`);
  } else {
    linje('Ingen kombinasjoner denne vakta – våpen på nivå 8 + riktig passiv gir én');
  }
  const totalt = st.lapperPlukket + st.lapperTapt;
  if (totalt > 0) linje(`Du rakk ${Math.round((st.lapperPlukket / totalt) * 100)} % av ticket-lappene (nivå ${s.nivaa})`);
}

// ---------- Karaktervalg ----------

/**
 * Viser de fire karakterene side om side: portrett, navn, tittel, startvåpen og bonus.
 * @param {number} valgt forhåndsvalgt karakter
 * @param {(i: number, start: boolean) => void} velg kalles ved valg (start = true betyr «start vakta nå»)
 */
export function visKaraktervalg(valgt, velg) {
  const holder = el('karakterer');
  holder.replaceChildren();
  CONFIG.karakterer.forEach((k, i) => {
    const b = lag('button', 'karakter' + (i === valgt ? ' valgt' : ''));
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(i === valgt));
    const vaapen = lag('span', 'vaapen');
    vaapen.append(ikonElement(k.startVaapen), lag('span', '', CONFIG.vaapen[k.startVaapen].navn));
    b.append(lag('kbd', '', i + 1), portrettElement(i), lag('span', 'navn', k.navn), lag('span', 'tittel', k.tittel), vaapen, lag('span', 'bonus', k.bonusTekst));
    b.addEventListener('click', () => velg(i, true));
    b.addEventListener('focus', () => velg(i, false));
    holder.append(b);
  });
}

/** Markerer valgt karakter uten å bygge kortene på nytt. */
export function markerKarakter(valgt) {
  el('karakterer').querySelectorAll('.karakter').forEach((b, i) => {
    b.classList.toggle('valgt', i === valgt);
    b.setAttribute('aria-checked', String(i === valgt));
  });
}

// ---------- Forhåndsvisning av karakterene (?debug=karakterer) ----------

/**
 * Viser de fire spillbare karakterene stort, til godkjenning: portrett, gangsyklus (animert), glad bilde,
 * og navn, tittel, startvåpen og bonus fra config.js.
 * @param {import('./figurer.js').Figurer} fig
 */
export function visKarakterForhaandsvisning(fig) {
  const lag2 = (tag, stil, tekst) => {
    const e = document.createElement(tag);
    if (stil) e.style.cssText = stil;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  };
  const rot = lag2('div', 'position:fixed;inset:0;z-index:50;overflow:auto;background:#16202b;color:#fff;padding:24px;font-family:var(--font)');
  rot.append(lag2('h1', 'margin:0 0 4px;font-size:2em', 'Forhåndsvisning: de fire spillbare karakterene'));
  rot.append(lag2('p', 'margin:0 0 20px;color:#c8d6e5', 'Til godkjenning. Navn og tittel fylles inn i js/config.js (CONFIG.karakterer). Utseendet justeres i js/figurer.js (SPILLERE).'));
  const rad = lag2('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px');
  /** @type {{c: HTMLCanvasElement, i: number}[]} */
  const animerte = [];
  CONFIG.karakterer.forEach((k, i) => {
    const kort = lag2('div', 'background:#f4f1ea;color:#1d1626;padding:16px;box-shadow:0 0 0 4px #1d1626');
    const p = document.createElement('canvas');
    p.width = 64;
    p.height = 64;
    p.style.cssText = 'width:256px;height:256px;image-rendering:pixelated;display:block;margin:0 auto 8px;background:#a9b8c8';
    /** @type {CanvasRenderingContext2D} */ (p.getContext('2d')).drawImage(fig.portrett(i), 0, 0);
    kort.append(p);
    const figRad = lag2('div', 'display:flex;gap:8px;justify-content:center;margin-bottom:8px');
    const ark = fig.ark('spiller', i);
    for (const bilde of [-1, 8, 4]) {
      const c = document.createElement('canvas');
      c.width = ark.w;
      c.height = ark.h;
      c.style.cssText = 'width:96px;height:96px;image-rendering:pixelated;background:#a9b8c8';
      if (bilde >= 0) /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).drawImage(ark.lerret, bilde * ark.w, ark.sy, ark.w, ark.h, 0, 0, ark.w, ark.h);
      else animerte.push({ c, i });
      figRad.append(c);
    }
    kort.append(figRad);
    kort.append(lag2('p', 'margin:0;font-size:0.8em;color:#5d6b7a;text-align:center', 'Gange (animert) · Glad · Blink ved treff'));
    kort.append(lag2('h2', 'margin:12px 0 2px', `${i + 1}. ${k.navn}`));
    kort.append(lag2('p', 'margin:0 0 6px;color:#5d6b7a', k.tittel));
    kort.append(lag2('p', 'margin:0', `Startvåpen: ${CONFIG.vaapen[k.startVaapen].navn}`));
    kort.append(lag2('p', 'margin:0', `Bonus: ${k.bonusTekst}`));
    rad.append(kort);
  });
  rot.append(rad);
  const lukk = lag2('button', 'margin-top:20px', 'Lukk forhåndsvisningen');
  lukk.addEventListener('click', () => rot.remove());
  rot.append(lukk);
  document.body.append(rot);
  let bilde = 0;
  const tikk = () => {
    if (!rot.isConnected) return;
    bilde = (bilde + 1) & 3;
    for (const { c, i } of animerte) {
      const ark = fig.ark('spiller', i);
      const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(ark.lerret, bilde * ark.w, ark.sy, ark.w, ark.h, 0, 0, ark.w, ark.h);
    }
    setTimeout(tikk, 140);
  };
  tikk();
}

// ---------- Innstillinger ----------

/**
 * Kobler innstillingsmenyen til innstillingene.
 * @param {import('./innstillinger.js').Innstillinger} innst
 * @param {{testlyd: () => void, fullskjerm: (paa: boolean) => void, erFullskjerm: () => boolean}} hjelp
 */
export function kobleInnstillinger(innst, hjelp) {
  const demp = /** @type {HTMLInputElement} */ (el('i-demp'));
  const volum = /** @type {HTMLInputElement} */ (el('i-volum'));
  const effekter = /** @type {HTMLInputElement} */ (el('i-effekter'));
  const full = /** @type {HTMLInputElement} */ (el('i-fullskjerm'));
  const rist = /** @type {HTMLInputElement} */ (el('i-rist'));
  const blink = /** @type {HTMLInputElement} */ (el('i-blink'));

  const vis = () => {
    const v = innst.v;
    demp.checked = v.demp;
    volum.value = String(Math.round(v.volum * 100));
    effekter.value = String(Math.round(v.effekter * 100));
    el('o-volum').textContent = volum.value + ' %';
    el('o-effekter').textContent = effekter.value + ' %';
    full.checked = hjelp.erFullskjerm();
    rist.checked = v.rist;
    blink.checked = v.faerreBlink;
    for (const gruppe of document.querySelectorAll('.valg')) {
      const navn = /** @type {HTMLElement} */ (gruppe).dataset.navn ?? '';
      for (const inp of gruppe.querySelectorAll('input')) /** @type {HTMLInputElement} */ (inp).checked = /** @type {HTMLInputElement} */ (inp).value === String(v[navn]);
    }
  };

  demp.addEventListener('change', () => {
    innst.sett('demp', demp.checked);
    if (!demp.checked) hjelp.testlyd();
  });
  for (const [felt, navn] of [[volum, 'volum'], [effekter, 'effekter']]) {
    const f = /** @type {HTMLInputElement} */ (felt);
    f.addEventListener('input', () => {
      innst.sett(navn, Number(f.value) / 100);
      el('o-' + navn).textContent = f.value + ' %';
    });
    // Testlyd når man slipper glidebryteren
    f.addEventListener('change', () => hjelp.testlyd());
  }
  full.addEventListener('change', () => hjelp.fullskjerm(full.checked));
  rist.addEventListener('change', () => innst.sett('rist', rist.checked));
  blink.addEventListener('change', () => innst.sett('faerreBlink', blink.checked));
  for (const gruppe of document.querySelectorAll('.valg')) {
    const navn = /** @type {HTMLElement} */ (gruppe).dataset.navn ?? '';
    gruppe.addEventListener('change', (e) => innst.sett(navn, /** @type {HTMLInputElement} */ (e.target).value));
  }
  el('innstnullstill').addEventListener('click', () => {
    innst.tilbakestill();
    vis();
  });
  document.addEventListener('fullscreenchange', () => {
    full.checked = hjelp.erFullskjerm();
  });
  return vis;
}

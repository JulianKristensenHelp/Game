// @ts-check
// Måler hvor mye hjelp per sekund hvert våpen gir på nivå 8 og som kombinasjon, under like forhold.
// Kjør:  node tools/maalvaapen.js   (eller: powershell -File tools/node.ps1 tools/maalvaapen.js)
//
// Oppsett: spilleren går gjennom kontorlandskapet i en stor, langsom sløyfe. 150 «dummy»-advokater med uendelig
// frustrasjon står jevnt spredt 40–300 piksler rundt spilleren (de som havner for nær eller for langt unna, flyttes).
// Kombinasjonen måles med den tilhørende passive på nivå 1 (det som minst trengs for å låse den opp).
// Samme tall vises også i debug-modus i spillet (hjelp per sekund per våpen, siste 10 sekunder).
import { Spill } from '../js/spill.js';
import { CONFIG } from '../js/config.js';
import { Rng } from '../js/verktoy.js';
import { spawnFiende } from '../js/fiender.js';
import { giVaapen, giPassiv, giKombinasjon } from '../js/oppgraderinger.js';

const SEK = 60;

function maal(id, evo) {
  const s = new Spill('2026-11-25');
  s.debug.udoedelig = true;
  s.tid = 600;
  s.nesteBoss = s.nesteHastesak = s.nesteBoelge = s.nesteDrikk = 1e9;
  s.spiller.vaapen.length = 0;
  for (let i = 0; i < 8; i++) giVaapen(s, id);
  if (evo) {
    giPassiv(s, CONFIG.vaapen[id].kombinasjon.passiv);
    giKombinasjon(s, id);
  }
  const rng = new Rng('maal');
  const p = s.spiller;
  const plasser = () => {
    const a = rng.neste() * Math.PI * 2, d = 40 + rng.neste() * 260;
    return [p.x + Math.cos(a) * d, p.y + Math.sin(a) * d];
  };
  for (let i = 0; i < 150; i++) {
    const [x, y] = plasser();
    const e = spawnFiende(s, 'junior', x, y);
    e.hp = e.maksHp = 1e9;
    e.fart = 0;
    e.skade = 0;
  }
  // Ingen nye advokater fra regissøren under målingen
  s.spawnAkk = -1e9;
  for (let t = 0; t < SEK * 60; t++) {
    const a = t / 300;
    s.tikk(Math.cos(a), Math.sin(a * 2) * 0.8);
    s.hendelser.length = 0;
    for (let i = 0; i < s.fiender.n; i++) {
      const e = s.fiender.items[i];
      const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d2 < 15 * 15 || d2 > 320 * 320) {
        const [x, y] = plasser();
        e.x = x;
        e.y = y;
      }
    }
  }
  const total = Object.values(s.stat.hjelpPerVaapen).reduce((a, b) => a + b, 0);
  return { hps: total / SEK, blokk: s.stat.blokkert };
}

const rader = [];
for (const id of Object.keys(CONFIG.vaapen)) {
  const n8 = maal(id, false), evo = maal(id, true);
  rader.push({ id, navn: CONFIG.vaapen[id].navn, n8: n8.hps, evoNavn: CONFIG.vaapen[id].kombinasjon.navn, evo: evo.hps });
}
const snittEvo = rader.filter((r) => r.id !== 'headset').reduce((a, r) => a + r.evo, 0) / (rader.length - 1);
console.log('Hjelp per sekund (60 s, 150 advokater jevnt spredt 40–300 px rundt spilleren):\n');
console.log('Våpen'.padEnd(22) + 'Nivå 8'.padStart(9) + '   ' + 'Kombinasjon'.padEnd(30) + 'Hjelp/s'.padStart(9) + '  i forhold til snitt');
for (const r of rader) {
  console.log(r.navn.padEnd(22) + r.n8.toFixed(0).padStart(9) + '   ' + r.evoNavn.padEnd(30) + r.evo.toFixed(0).padStart(9) + '  ' + (r.id === 'headset' ? '(forsvar – blokkerer treff)' : ((r.evo / snittEvo) * 100).toFixed(0) + ' %'));
}

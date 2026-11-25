// @ts-check
// Enkle lydeffekter laget med Web Audio API (ingen lydfiler). Lyden er AV som standard.
// Hver lyd regnes ut én gang til en lydbuffer som gjenbrukes, og antall like lyder samtidig er begrenset.

/** Hver lyd: toner [frekvens, start, varighet, bølgeform, volum, sluttfrekvens], og maks samtidige. */
const LYDER = {
  lapp: { maks: 3, toner: [[1250, 0, 0.06, 'sine', 0.35, 1500]] },
  glad: { maks: 4, toner: [[660, 0, 0.07, 'triangle', 0.3, 880], [990, 0.05, 0.06, 'sine', 0.2, 1320]] },
  nivaa: { maks: 1, toner: [[523, 0, 0.1, 'triangle', 0.5], [659, 0.1, 0.1, 'triangle', 0.5], [784, 0.2, 0.18, 'triangle', 0.5]] },
  treff: { maks: 2, toner: [[180, 0, 0.18, 'saw', 0.45, 70]] },
  boss: { maks: 1, toner: [[220, 0, 0.25, 'square', 0.3], [220, 0.35, 0.25, 'square', 0.3], [165, 0.7, 0.45, 'square', 0.3]] },
  multOpp: { maks: 1, toner: [[880, 0, 0.08, 'sine', 0.4], [1320, 0.08, 0.12, 'sine', 0.4]] },
  multNed: { maks: 1, toner: [[400, 0, 0.2, 'triangle', 0.45, 200]] },
  drikk: { maks: 1, toner: [[500, 0, 0.3, 'sine', 0.5, 1000]] },
  nypc: { maks: 1, toner: [[400, 0, 0.5, 'sine', 0.55, 1600], [800, 0.1, 0.5, 'triangle', 0.3, 2000]] },
  bonus: { maks: 1, toner: [[784, 0, 0.1, 'triangle', 0.5], [988, 0.1, 0.1, 'triangle', 0.5], [1175, 0.2, 0.1, 'triangle', 0.5], [1568, 0.3, 0.25, 'triangle', 0.5]] },
  ferdig: { maks: 1, toner: [[392, 0, 0.25, 'triangle', 0.5], [330, 0.25, 0.25, 'triangle', 0.5], [262, 0.5, 0.5, 'triangle', 0.5]] },
  klikk: { maks: 2, toner: [[700, 0, 0.04, 'sine', 0.35]] },
  test: { maks: 1, toner: [[660, 0, 0.12, 'triangle', 0.5], [880, 0.12, 0.16, 'triangle', 0.5]] },
};

/** Regner ut en lyd som rå lydprøver (gjøres én gang per lyd). */
function syntetiser(ctx, def) {
  const rate = ctx.sampleRate;
  let lengde = 0;
  for (const [, start, varighet] of def.toner) lengde = Math.max(lengde, start + varighet + 0.02);
  const buffer = ctx.createBuffer(1, Math.ceil(lengde * rate), rate);
  const data = buffer.getChannelData(0);
  for (const [frekvens, start, varighet, form, volum, slutt] of def.toner) {
    const i0 = Math.floor(start * rate), n = Math.floor(varighet * rate);
    let fase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const f = slutt ? frekvens * Math.pow(slutt / frekvens, t) : frekvens;
      fase += f / rate;
      const x = fase % 1;
      let v;
      if (form === 'sine') v = Math.sin(x * Math.PI * 2);
      else if (form === 'triangle') v = 1 - 4 * Math.abs(x - 0.5);
      else if (form === 'square') v = x < 0.5 ? 1 : -1;
      else v = 2 * x - 1;
      const env = Math.min(1, i / (rate * 0.004)) * Math.pow(1 - t, 2.2);
      data[i0 + i] += v * volum * env * 0.5;
    }
  }
  return buffer;
}

export class Lyd {
  /** @param {import('./innstillinger.js').Innstillinger} innst */
  constructor(innst) {
    this.innst = innst;
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} */
    this.hoved = null;
    /** @type {GainNode | null} */
    this.sfx = null;
    /** @type {Record<string, AudioBuffer>} */
    this.buffere = {};
    /** @type {Record<string, number>} antall som spilles akkurat nå */
    this.aktive = {};
    innst.vedEndring(() => this.oppdaterVolum());
  }

  get paa() {
    return !this.innst.v.demp;
  }

  /** Lager lydsystemet første gang det trengs (må skje etter et klikk/tastetrykk). */
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      this.ctx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
      this.hoved = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.hoved).connect(this.ctx.destination);
      for (const [navn, def] of Object.entries(LYDER)) this.buffere[navn] = syntetiser(this.ctx, def);
      this.oppdaterVolum();
      return true;
    } catch {
      return false;
    }
  }

  oppdaterVolum() {
    if (!this.hoved || !this.sfx) return;
    const v = this.innst.v;
    this.hoved.gain.value = v.demp ? 0 : v.volum;
    this.sfx.gain.value = v.effekter;
  }

  /** @param {keyof typeof LYDER} navn */
  spill(navn) {
    if (!this.paa) return;
    if (!this.start() || !this.ctx || !this.sfx) return;
    const def = LYDER[navn];
    const buf = this.buffere[navn];
    if (!def || !buf) return;
    const aktive = this.aktive[navn] ?? 0;
    if (aktive >= def.maks) return;
    try {
      const kilde = this.ctx.createBufferSource();
      kilde.buffer = buf;
      kilde.connect(this.sfx);
      this.aktive[navn] = aktive + 1;
      kilde.onended = () => {
        this.aktive[navn] = Math.max(0, (this.aktive[navn] ?? 1) - 1);
        kilde.disconnect();
      };
      kilde.start();
    } catch {
      /* lyd er ikke kritisk */
    }
  }
}

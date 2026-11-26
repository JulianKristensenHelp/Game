// @ts-check
// Simple sound effects made with the Web Audio API (no audio files). Sound is OFF by default.
// Each sound is computed once into an audio buffer that is reused, and the number of identical sounds at once is limited.

/** Each sound: tones [frequency, start, duration, waveform, volume, end frequency], and max concurrent. */
const SOUNDS = {
  ticket: { max: 3, tones: [[1250, 0, 0.06, 'sine', 0.35, 1500]] },
  happy: { max: 4, tones: [[660, 0, 0.07, 'triangle', 0.3, 880], [990, 0.05, 0.06, 'sine', 0.2, 1320]] },
  level: { max: 1, tones: [[523, 0, 0.1, 'triangle', 0.5], [659, 0.1, 0.1, 'triangle', 0.5], [784, 0.2, 0.18, 'triangle', 0.5]] },
  hit: { max: 2, tones: [[180, 0, 0.18, 'saw', 0.45, 70]] },
  boss: { max: 1, tones: [[220, 0, 0.25, 'square', 0.3], [220, 0.35, 0.25, 'square', 0.3], [165, 0.7, 0.45, 'square', 0.3]] },
  multUp: { max: 1, tones: [[880, 0, 0.08, 'sine', 0.4], [1320, 0.08, 0.12, 'sine', 0.4]] },
  multDown: { max: 1, tones: [[400, 0, 0.2, 'triangle', 0.45, 200]] },
  drink: { max: 1, tones: [[500, 0, 0.3, 'sine', 0.5, 1000]] },
  newPcFx: { max: 1, tones: [[400, 0, 0.5, 'sine', 0.55, 1600], [800, 0.1, 0.5, 'triangle', 0.3, 2000]] },
  bonus: { max: 1, tones: [[784, 0, 0.1, 'triangle', 0.5], [988, 0.1, 0.1, 'triangle', 0.5], [1175, 0.2, 0.1, 'triangle', 0.5], [1568, 0.3, 0.25, 'triangle', 0.5]] },
  done: { max: 1, tones: [[392, 0, 0.25, 'triangle', 0.5], [330, 0.25, 0.25, 'triangle', 0.5], [262, 0.5, 0.5, 'triangle', 0.5]] },
  click: { max: 2, tones: [[700, 0, 0.04, 'sine', 0.35]] },
  test: { max: 1, tones: [[660, 0, 0.12, 'triangle', 0.5], [880, 0.12, 0.16, 'triangle', 0.5]] },
  // ----- Version 4: the bosses -----
  nordic: { max: 1, tones: [[523, 0, 0.12, 'sine', 0.4], [659, 0.14, 0.12, 'sine', 0.4], [784, 0.28, 0.12, 'sine', 0.4], [659, 0.42, 0.25, 'sine', 0.35]] },
  printerBoss: { max: 1, tones: [[110, 0, 0.12, 'square', 0.3], [110, 0.16, 0.12, 'square', 0.3], [90, 0.32, 0.12, 'square', 0.3], [70, 0.48, 0.4, 'saw', 0.35, 50]] },
  johan: { max: 1, tones: [[196, 0, 0.3, 'square', 0.3], [262, 0.32, 0.3, 'square', 0.3], [330, 0.64, 0.3, 'square', 0.3], [392, 0.96, 0.6, 'triangle', 0.45]] },
  tick: { max: 1, tones: [[1800, 0, 0.025, 'square', 0.18]] },
  fired: { max: 1, tones: [[330, 0, 0.3, 'saw', 0.4], [262, 0.32, 0.3, 'saw', 0.4], [196, 0.64, 0.8, 'saw', 0.45, 120]] },
  tell: { max: 2, tones: [[880, 0, 0.06, 'square', 0.15], [880, 0.1, 0.06, 'square', 0.15]] },
  jam: { max: 1, tones: [[200, 0, 0.08, 'square', 0.3], [200, 0.1, 0.08, 'square', 0.3], [200, 0.2, 0.08, 'square', 0.3]] },
  // ----- Endringsprompt 4 -----
  /** Ping-pong: a short «pok». */
  pok: { max: 2, tones: [[1500, 0, 0.03, 'sine', 0.35, 900]] },
  cookie: { max: 1, tones: [[700, 0, 0.06, 'triangle', 0.35, 900], [1050, 0.06, 0.08, 'triangle', 0.3]] },
  frida: { max: 1, tones: [[659, 0, 0.12, 'triangle', 0.4], [784, 0.14, 0.12, 'triangle', 0.4], [988, 0.28, 0.12, 'triangle', 0.4], [784, 0.42, 0.3, 'sine', 0.35, 700]] },
  matrix: { max: 1, tones: [[110, 0, 0.5, 'saw', 0.3, 220], [440, 0.5, 0.12, 'square', 0.25], [660, 0.65, 0.12, 'square', 0.25], [880, 0.8, 0.35, 'triangle', 0.35]] },
};

/** Computes a sound as raw audio samples (done once per sound). */
function synthesize(ctx, def) {
  const rate = ctx.sampleRate;
  let lengthPx = 0;
  for (const [, start, duration] of def.tones) lengthPx = Math.max(lengthPx, start + duration + 0.02);
  const buffer = ctx.createBuffer(1, Math.ceil(lengthPx * rate), rate);
  const data = buffer.getChannelData(0);
  for (const [frequency, start, duration, form, volume, end] of def.tones) {
    const i0 = Math.floor(start * rate), n = Math.floor(duration * rate);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const f = end ? frequency * Math.pow(end / frequency, t) : frequency;
      phase += f / rate;
      const x = phase % 1;
      let v;
      if (form === 'sine') v = Math.sin(x * Math.PI * 2);
      else if (form === 'triangle') v = 1 - 4 * Math.abs(x - 0.5);
      else if (form === 'square') v = x < 0.5 ? 1 : -1;
      else v = 2 * x - 1;
      const env = Math.min(1, i / (rate * 0.004)) * Math.pow(1 - t, 2.2);
      data[i0 + i] += v * volume * env * 0.5;
    }
  }
  return buffer;
}

export class Sound {
  /** @param {import('./settings.js').Settings} settings */
  constructor(settings) {
    this.settings = settings;
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} */
    this.main = null;
    /** @type {GainNode | null} */
    this.sfx = null;
    /** @type {Record<string, AudioBuffer>} */
    this.buffers = {};
    /** @type {Record<string, number>} number currently playing */
    this.actives = {};
    settings.onChange(() => this.updateVolume());
  }

  get on() {
    return !this.settings.v.mute;
  }

  /** Creates the audio system the first time it is needed (must happen after a click/keypress). */
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      this.ctx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
      this.main = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.main).connect(this.ctx.destination);
      for (const [name, def] of Object.entries(SOUNDS)) this.buffers[name] = synthesize(this.ctx, def);
      this.updateVolume();
      return true;
    } catch {
      return false;
    }
  }

  updateVolume() {
    if (!this.main || !this.sfx) return;
    const v = this.settings.v;
    this.main.gain.value = v.mute ? 0 : v.volume;
    this.sfx.gain.value = v.effects;
  }

  /** @param {keyof typeof SOUNDS} name */
  play(name) {
    if (!this.on) return;
    if (!this.start() || !this.ctx || !this.sfx) return;
    const def = SOUNDS[name];
    const buf = this.buffers[name];
    if (!def || !buf) return;
    const actives = this.actives[name] ?? 0;
    if (actives >= def.max) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      source.connect(this.sfx);
      this.actives[name] = actives + 1;
      source.onended = () => {
        this.actives[name] = Math.max(0, (this.actives[name] ?? 1) - 1);
        source.disconnect();
      };
      source.start();
    } catch {
      /* sound is not critical */
    }
  }
}

// @ts-check
// Simple sound effects made with the Web Audio API (no audio files). Sound is OFF by default.
// Each sound is computed once into an audio buffer that is reused, and the number of identical sounds at once is limited.

/** Each sound: tones [frequency, start, duration, waveform, volume, end frequency], and max concurrent. */
const SOUNDS = {
  ticket: { max: 3, toner: [[1250, 0, 0.06, 'sine', 0.35, 1500]] },
  happy: { max: 4, toner: [[660, 0, 0.07, 'triangle', 0.3, 880], [990, 0.05, 0.06, 'sine', 0.2, 1320]] },
  level: { max: 1, toner: [[523, 0, 0.1, 'triangle', 0.5], [659, 0.1, 0.1, 'triangle', 0.5], [784, 0.2, 0.18, 'triangle', 0.5]] },
  hit: { max: 2, toner: [[180, 0, 0.18, 'saw', 0.45, 70]] },
  boss: { max: 1, toner: [[220, 0, 0.25, 'square', 0.3], [220, 0.35, 0.25, 'square', 0.3], [165, 0.7, 0.45, 'square', 0.3]] },
  multUp: { max: 1, toner: [[880, 0, 0.08, 'sine', 0.4], [1320, 0.08, 0.12, 'sine', 0.4]] },
  multDown: { max: 1, toner: [[400, 0, 0.2, 'triangle', 0.45, 200]] },
  drink: { max: 1, toner: [[500, 0, 0.3, 'sine', 0.5, 1000]] },
  newPcFx: { max: 1, toner: [[400, 0, 0.5, 'sine', 0.55, 1600], [800, 0.1, 0.5, 'triangle', 0.3, 2000]] },
  bonus: { max: 1, toner: [[784, 0, 0.1, 'triangle', 0.5], [988, 0.1, 0.1, 'triangle', 0.5], [1175, 0.2, 0.1, 'triangle', 0.5], [1568, 0.3, 0.25, 'triangle', 0.5]] },
  done: { max: 1, toner: [[392, 0, 0.25, 'triangle', 0.5], [330, 0.25, 0.25, 'triangle', 0.5], [262, 0.5, 0.5, 'triangle', 0.5]] },
  click: { max: 2, toner: [[700, 0, 0.04, 'sine', 0.35]] },
  test: { max: 1, toner: [[660, 0, 0.12, 'triangle', 0.5], [880, 0.12, 0.16, 'triangle', 0.5]] },
};

/** Computes a sound as raw audio samples (done once per sound). */
function synthesize(ctx, def) {
  const rate = ctx.sampleRate;
  let lengthPx = 0;
  for (const [, start, duration] of def.toner) lengthPx = Math.max(lengthPx, start + duration + 0.02);
  const buffer = ctx.createBuffer(1, Math.ceil(lengthPx * rate), rate);
  const data = buffer.getChannelData(0);
  for (const [frequency, start, duration, form, volume, end] of def.toner) {
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

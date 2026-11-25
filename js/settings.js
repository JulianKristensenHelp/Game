// @ts-check
// Settings for sound and screen. Stored locally in the browser and take effect immediately.
// Only affects sound and looks – never the game logic.

const KEY = 'hds_innstillinger';

/**
 * @typedef {Object} Options
 * @property {number} volume main volume 0–1
 * @property {number} effects sound effects 0–1
 * @property {boolean} mute sound is off (default: off – it's an office)
 * @property {'fit'|'2'|'3'|'4'} gameSize
 * @property {'auto'|'small'|'medium'|'large'|'extraLarge'} ui
 * @property {'off'|'small'|'large'} minimap
 * @property {boolean} shake screen shake
 * @property {boolean} fewerFlashes reduced flash effects
 */

/** Keys and values saved by older versions, before the code was translated to English. */
const LEGACY_KEYS = { volum: 'volume', effekter: 'effects', demp: 'mute', spillStoerrelse: 'gameSize', minikart: 'minimap', rist: 'shake', faerreBlink: 'fewerFlashes' };
const LEGACY_VALUES = { tilpass: 'fit', liten: 'small', middels: 'medium', stor: 'large', ekstraStor: 'extraLarge', av: 'off' };

/** Converts settings saved by an older version to the current names. */
function migrate(saved) {
  const out = { ...saved };
  for (const [old, now] of Object.entries(LEGACY_KEYS)) if (old in out && !(now in out)) out[now] = out[old];
  for (const k of ['gameSize', 'ui', 'minimap']) if (typeof out[k] === 'string' && LEGACY_VALUES[out[k]]) out[k] = LEGACY_VALUES[out[k]];
  return out;
}

const reduceMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** @returns {Options} */
export function defaults() {
  return {
    volume: 0.5,
    effects: 1,
    mute: true,
    gameSize: 'fit',
    ui: 'auto',
    minimap: 'small',
    shake: !reduceMotion(),
    fewerFlashes: reduceMotion(),
  };
}

export class Settings {
  constructor() {
    /** @type {Options} */
    this.v = defaults();
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (stored && typeof stored === 'object') {
        const saved = migrate(stored);
        for (const k of Object.keys(this.v)) if (typeof saved[k] === typeof this.v[k]) this.v[k] = saved[k];
      }
    } catch {
      /* no storage available – defaults are used */
    }
    /** @type {((v: Options, changed: string) => void)[]} */
    this.listeners = [];
  }

  /** Changes one option, saves and notifies. */
  set(keyName, value) {
    this.v[keyName] = value;
    this.save();
    for (const f of this.listeners) f(this.v, keyName);
  }

  restoreDefaults() {
    this.v = defaults();
    this.save();
    for (const f of this.listeners) f(this.v, '*');
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.v));
    } catch {
      /* ignore */
    }
  }

  /** @param {(v: Options, changed: string) => void} f */
  onChange(f) {
    this.listeners.push(f);
  }

  // Shortcuts used by the drawing code
  get shake() {
    return this.v.shake;
  }
  get fewerFlashes() {
    return this.v.fewerFlashes;
  }
}

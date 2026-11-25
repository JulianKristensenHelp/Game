// @ts-check
// Styring: tastatur (WASD + piltaster) og virtuell joystick for touch.

export class Styring {
  /** @param {HTMLElement | Window} flate der touch fanges opp (hele vinduet) */
  constructor(flate) {
    /** @type {Set<string>} */
    this.taster = new Set();
    /** Joysticken dukker opp der man legger fingeren. */
    this.joystick = { aktiv: false, id: -1, x0: 0, y0: 0, x: 0, y: 0 };
    this.radius = 52;
    /** Joysticken virker bare mens man spiller. */
    this.aktiv = false;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      this.taster.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.taster.delete(e.code));
    window.addEventListener('blur', () => this.nullstill());

    flate.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || this.joystick.aktiv || !this.aktiv) return;
      // Joysticken dukker opp der man legger fingeren – også i rammen rundt spillet, men ikke på knapper og menyer.
      const t = /** @type {HTMLElement} */ (e.target);
      if (t && t.tagName !== 'CANVAS' && t.tagName !== 'BODY' && t.tagName !== 'HTML') return;
      const j = this.joystick;
      j.aktiv = true;
      j.id = e.pointerId;
      j.x0 = j.x = e.clientX;
      j.y0 = j.y = e.clientY;
      e.preventDefault();
    });
    window.addEventListener('pointermove', (e) => {
      const j = this.joystick;
      if (!j.aktiv || e.pointerId !== j.id) return;
      let dx = e.clientX - j.x0, dy = e.clientY - j.y0;
      const d = Math.hypot(dx, dy);
      if (d > this.radius) {
        dx = (dx / d) * this.radius;
        dy = (dy / d) * this.radius;
      }
      j.x = j.x0 + dx;
      j.y = j.y0 + dy;
    });
    const slipp = (e) => {
      if (e.pointerId === this.joystick.id) this.joystick.aktiv = false;
    };
    window.addEventListener('pointerup', slipp);
    window.addEventListener('pointercancel', slipp);
  }

  nullstill() {
    this.taster.clear();
    this.joystick.aktiv = false;
  }

  /**
   * Ønsket retning akkurat nå. Lengden er maks 1 (diagonal normaliseres i spiller.js).
   * @returns {[number, number]}
   */
  retning() {
    const t = this.taster;
    let x = 0, y = 0;
    if (t.has('KeyA') || t.has('ArrowLeft')) x -= 1;
    if (t.has('KeyD') || t.has('ArrowRight')) x += 1;
    if (t.has('KeyW') || t.has('ArrowUp')) y -= 1;
    if (t.has('KeyS') || t.has('ArrowDown')) y += 1;
    if (x !== 0 || y !== 0) return [x, y];
    const j = this.joystick;
    if (j.aktiv) {
      const dx = (j.x - j.x0) / this.radius, dy = (j.y - j.y0) / this.radius;
      // Liten dødsone, og full fart litt før kanten
      const d = Math.hypot(dx, dy);
      if (d < 0.15) return [0, 0];
      const f = Math.min(1, d / 0.8) / d;
      return [dx * f, dy * f];
    }
    return [0, 0];
  }
}

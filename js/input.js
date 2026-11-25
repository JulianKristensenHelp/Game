// @ts-check
// Input: keyboard (WASD + arrow keys) and virtual joystick for touch.

export class Input {
  /** @param {HTMLElement | Window} surface where touch is captured (the whole window) */
  constructor(surface) {
    /** @type {Set<string>} */
    this.keys = new Set();
    /** The joystick appears where you put your finger. */
    this.joystick = { active: false, id: -1, x0: 0, y0: 0, x: 0, y: 0 };
    this.radius = 52;
    /** The joystick only works while you are playing. */
    this.active = false;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.reset());

    surface.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || this.joystick.active || !this.active) return;
      // The joystick appears where you put your finger – also in the frame around the game, but not on buttons and menus.
      const t = /** @type {HTMLElement} */ (e.target);
      if (t && t.tagName !== 'CANVAS' && t.tagName !== 'BODY' && t.tagName !== 'HTML') return;
      const j = this.joystick;
      j.active = true;
      j.id = e.pointerId;
      j.x0 = j.x = e.clientX;
      j.y0 = j.y = e.clientY;
      e.preventDefault();
    });
    window.addEventListener('pointermove', (e) => {
      const j = this.joystick;
      if (!j.active || e.pointerId !== j.id) return;
      let dx = e.clientX - j.x0, dy = e.clientY - j.y0;
      const d = Math.hypot(dx, dy);
      if (d > this.radius) {
        dx = (dx / d) * this.radius;
        dy = (dy / d) * this.radius;
      }
      j.x = j.x0 + dx;
      j.y = j.y0 + dy;
    });
    const release = (e) => {
      if (e.pointerId === this.joystick.id) this.joystick.active = false;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }

  reset() {
    this.keys.clear();
    this.joystick.active = false;
  }

  /**
   * Desired direction right now. The length is at most 1 (diagonal is normalized in player.js).
   * @returns {[number, number]}
   */
  direction() {
    const t = this.keys;
    let x = 0, y = 0;
    if (t.has('KeyA') || t.has('ArrowLeft')) x -= 1;
    if (t.has('KeyD') || t.has('ArrowRight')) x += 1;
    if (t.has('KeyW') || t.has('ArrowUp')) y -= 1;
    if (t.has('KeyS') || t.has('ArrowDown')) y += 1;
    if (x !== 0 || y !== 0) return [x, y];
    const j = this.joystick;
    if (j.active) {
      const dx = (j.x - j.x0) / this.radius, dy = (j.y - j.y0) / this.radius;
      // Small dead zone, and full speed a little before the edge
      const d = Math.hypot(dx, dy);
      if (d < 0.15) return [0, 0];
      const f = Math.min(1, d / 0.8) / d;
      return [dx * f, dy * f];
    }
    return [0, 0];
  }
}

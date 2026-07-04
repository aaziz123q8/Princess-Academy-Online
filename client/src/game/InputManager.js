// ============================================================================
//  InputManager.js — Unified movement input for desktop and mobile.
//  Exposes a normalized 2D vector { x, y } in the range [-1, 1]:
//    y = +1 forward (away from camera), x = +1 right.
//  Desktop: WASD / Arrow keys. Mobile: an on-screen virtual joystick.
//  Camera orbit is handled separately by Babylon's ArcRotateCamera (pointer/
//  touch drag), so this only concerns locomotion.
// ============================================================================

export class InputManager {
  constructor() {
    this.move = { x: 0, y: 0 };
    this.jumpQueued = false;
    this.sprint = false;
    this._keys = new Set();
    this.isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

    this._onKeyDown = (e) => this._key(e, true);
    this._onKeyUp = (e) => this._key(e, false);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  _key(e, down) {
    // Ignore when typing into a text field (chat, login).
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const k = e.key.toLowerCase();
    if (k === "shift") { this.sprint = down; return; }
    const tracked = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "];
    if (!tracked.includes(k)) return;
    e.preventDefault();

    if (k === " ") {
      if (down) this.jumpQueued = true;
      return;
    }
    if (down) this._keys.add(k);
    else this._keys.delete(k);
    this._recomputeKeyboard();
  }

  _recomputeKeyboard() {
    if (this._joystickActive) return; // joystick overrides keyboard
    let x = 0;
    let y = 0;
    if (this._keys.has("w") || this._keys.has("arrowup")) y += 1;
    if (this._keys.has("s") || this._keys.has("arrowdown")) y -= 1;
    if (this._keys.has("d") || this._keys.has("arrowright")) x += 1;
    if (this._keys.has("a") || this._keys.has("arrowleft")) x -= 1;
    const len = Math.hypot(x, y) || 1;
    this.move.x = x / len;
    this.move.y = y / len;
  }

  /** Wire up the DOM virtual joystick + jump button (mobile only). */
  attachTouchControls(joystickEl, knobEl, jumpBtn) {
    if (!this.isTouch) return;
    joystickEl.classList.remove("hidden");
    jumpBtn.classList.remove("hidden");

    const radius = 48; // max knob travel in px
    let pointerId = null;
    const rect = () => joystickEl.getBoundingClientRect();

    const start = (e) => {
      pointerId = e.pointerId;
      this._joystickActive = true;
      joystickEl.setPointerCapture(pointerId);
      moveKnob(e);
    };
    const moveKnob = (e) => {
      if (pointerId !== e.pointerId) return;
      const r = rect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
      }
      knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
      // Screen y-down → world forward is up, so invert dy.
      this.move.x = dx / radius;
      this.move.y = -dy / radius;
    };
    const end = (e) => {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      this._joystickActive = false;
      knobEl.style.transform = "translate(0,0)";
      this.move.x = 0;
      this.move.y = 0;
      this._recomputeKeyboard();
    };

    joystickEl.addEventListener("pointerdown", start);
    joystickEl.addEventListener("pointermove", moveKnob);
    joystickEl.addEventListener("pointerup", end);
    joystickEl.addEventListener("pointercancel", end);

    jumpBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.jumpQueued = true;
    });
  }

  consumeJump() {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }
}

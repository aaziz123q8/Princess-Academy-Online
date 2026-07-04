// ============================================================================
//  Sound.js — Web Audio sound system (no external files, no credits).
//  * Synthesized SFX: collect coin/gem, jump, level-up, click, quest complete.
//  * A gentle looping ambient music pad (soft chords) that fits the magical
//    fantasy mood, scheduled with the Web Audio clock.
//  * Respects browser autoplay rules: the AudioContext is resumed on the first
//    user gesture. A mute toggle persists to localStorage.
//  Real generated music/voice can be layered on later; this keeps the game
//  alive with zero asset cost.
// ============================================================================

const MUTE_KEY = "pao.muted";

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = localStorage.getItem(MUTE_KEY) === "1";
    this._musicTimer = null;
    this._started = false;
  }

  /** Lazily create the audio graph (must follow a user gesture). */
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.master);
  }

  /** Call once after the first interaction to unlock + start ambient music. */
  start() {
    this.ensure();
    if (!this.ctx || this._started) return;
    this._started = true;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this._scheduleMusic();
  }

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
  }
  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---- SFX ---------------------------------------------------------------

  _blip(freq, { type = "sine", dur = 0.12, gain = 0.3, slideTo = null } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _arp(freqs, step = 0.09, opts = {}) {
    freqs.forEach((f, i) => setTimeout(() => this._blip(f, opts), i * step * 1000));
  }

  coin() { this._blip(880, { type: "triangle", dur: 0.1, gain: 0.25, slideTo: 1320 }); }
  gem() { this._arp([784, 1046, 1318], 0.06, { type: "sine", dur: 0.14, gain: 0.22 }); }
  jump() { this._blip(300, { type: "square", dur: 0.14, gain: 0.14, slideTo: 620 }); }
  click() { this._blip(520, { type: "square", dur: 0.05, gain: 0.12 }); }
  levelUp() { this._arp([523, 659, 784, 1046, 1318], 0.08, { type: "triangle", dur: 0.2, gain: 0.25 }); }
  questComplete() { this._arp([659, 784, 988, 1318], 0.12, { type: "sine", dur: 0.3, gain: 0.24 }); }

  // ---- Ambient music -----------------------------------------------------

  _scheduleMusic() {
    if (!this.ctx) return;
    // Soft major-ish chord progression (frequencies in Hz), looped gently.
    const chords = [
      [261.63, 329.63, 392.0],   // C
      [293.66, 349.23, 440.0],   // Dm-ish
      [349.23, 440.0, 523.25],   // F
      [392.0, 493.88, 587.33],   // G
    ];
    let i = 0;
    const playChord = () => {
      if (!this.ctx || this.muted) { this._musicTimer = setTimeout(playChord, 3200); return; }
      const notes = chords[i % chords.length];
      i++;
      const t = this.ctx.currentTime;
      notes.forEach((f) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.8);
        g.gain.linearRampToValueAtTime(0.0001, t + 3.0);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 3.1);
      });
      this._musicTimer = setTimeout(playChord, 3200);
    };
    playChord();
  }

  dispose() {
    clearTimeout(this._musicTimer);
    if (this.ctx) this.ctx.close();
  }
}

// A single shared instance for the whole client.
export const sound = new Sound();

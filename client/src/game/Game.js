// ============================================================================
//  Game.js — Top-level game orchestrator.
//  Owns the engine, scene, world, local player, input, and network. Exposes a
//  tiny API (start, setProfile, sendChat, dispose) that the UI layer drives.
// ============================================================================

import { Scene } from "@babylonjs/core/scene.js";
import { createEngine } from "./createEngine.js";
import { buildWorld } from "./World.js";
import { InputManager } from "./InputManager.js";
import { PlayerController } from "./PlayerController.js";
import { Network } from "./Network.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
  }

  /**
   * @param {object} opts
   *   profile   {name, dress, hair, skin}
   *   multiplayer boolean — connect to the realtime server
   *   onChat / onSystem callbacks for the HUD chat log
   */
  async start(opts = {}) {
    const { onProgress = () => {} } = opts;

    onProgress(0.15, "loading.engine");
    this.engine = await createEngine(this.canvas);

    this.scene = new Scene(this.engine);

    onProgress(0.5, "loading.world");
    buildWorld(this.scene);

    this.input = new InputManager();
    this.player = new PlayerController(this.scene, this.canvas, this.input, opts.profile);

    if (opts.multiplayer) {
      this.network = new Network(this.scene, {
        name: opts.profile?.name,
        onChat: opts.onChat,
        onSystem: opts.onSystem,
      });
    }

    // Feed the local transform to the network each frame (throttled inside).
    this.scene.onBeforeRenderObservable.add(() => {
      if (this.network) {
        this.network.pushState(
          this.player.position,
          this.player.rotationY,
          Math.abs(this.input.move.x) > 0.02 || Math.abs(this.input.move.y) > 0.02
        );
      }
    });

    onProgress(0.9, "loading.ready");
    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", this._onResize);
    this.running = true;

    onProgress(1, "loading.ready");
    return this;
  }

  attachTouchControls(joystickEl, knobEl, jumpBtn) {
    this.input?.attachTouchControls(joystickEl, knobEl, jumpBtn);
  }

  sendChat(text) {
    this.network?.sendChat(text);
  }

  setProfileName(name) {
    this.player?.setName(name);
  }

  _onResize = () => this.engine?.resize();

  dispose() {
    window.removeEventListener("resize", this._onResize);
    this.network?.dispose();
    this.player?.dispose();
    this.input?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
    this.running = false;
  }
}

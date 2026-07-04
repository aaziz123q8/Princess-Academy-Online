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
import { Collectibles } from "./Collectibles.js";
import { PetCompanion } from "./PetCompanion.js";
import { House } from "./House.js";
import { NPCs } from "./NPC.js";
import { QuestManager } from "./QuestManager.js";
import { setupVisuals } from "./Visuals.js";

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

    // Cinematic post-processing (needs the camera to exist first).
    setupVisuals(this.scene, this.player.camera);

    // Adventure: scattered gems/coins + a following pet companion.
    const getPos = () => this.player.position;
    this.collectibles = new Collectibles(this.scene, {
      getPlayerPos: getPos,
      onReward: opts.onReward || (() => {}),
      onQuest: opts.onQuest || (() => {}),
    });
    this.pet = new PetCompanion(this.scene, getPos);

    // Player's house: enter from the city cottage, then decorate the interior.
    this.house = new House(this.scene, {
      player: this.player,
      onCanEnter: opts.onCanEnter || (() => {}),
    });

    // Friendly NPCs that greet the player.
    this.npcs = new NPCs(this.scene, {
      getPlayerPos: getPos,
      onGreet: opts.onGreet || (() => {}),
    });

    // Main adventure: the Star Shard quest.
    this.quest = new QuestManager(this.scene, {
      player: this.player,
      onReward: opts.onReward || (() => {}),
      onObjective: opts.onObjective || (() => {}),
      onStory: opts.onStory || (() => {}),
    });

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

  setAppearance(app) {
    this.player?.setAppearance(app);
  }

  playEmote(name) {
    this.player?.playEmote(name);
  }

  // ---- House controls (driven by the UI) ----
  enterHouse() { this.house?.enter(); }
  exitHouse() { this.house?.exit(); }
  houseDecorate(on) { this.house?.setDecorating(on); }
  houseSelect(type) { this.house?.selectFurniture(type); }
  houseRemoveMode(on) { this.house?.setRemoveMode(on); }
  houseIsInside() { return !!this.house?.inside; }

  _onResize = () => this.engine?.resize();

  dispose() {
    window.removeEventListener("resize", this._onResize);
    this.network?.dispose();
    this.quest?.dispose();
    this.npcs?.dispose();
    this.house?.dispose();
    this.collectibles?.dispose();
    this.pet?.dispose();
    this.player?.dispose();
    this.input?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
    this.running = false;
  }
}

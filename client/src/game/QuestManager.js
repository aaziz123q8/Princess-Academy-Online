// ============================================================================
//  QuestManager.js — The main adventure: "Quest for the Star Shards".
//  Gives the game a purpose, mystery, and exploration:
//   * 5 glowing Star Shards are hidden across the far corners of the kingdom,
//     each marked by a distant pillar of light so players explore toward them.
//   * A locked Mystery Tower sits at the edge of the map behind a magic barrier.
//   * Collect all 5 shards -> the barrier fades -> enter the tower -> a finale
//     chamber with the Crown of Light and a big reward.
//  Progress persists to localStorage. Story/objectives are localized.
// ============================================================================

import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { sound } from "./Sound.js";

const SHARD_SPOTS = [
  { id: 0, pos: [40, 1.4, 40] },
  { id: 1, pos: [-44, 1.4, 38] },
  { id: 2, pos: [46, 1.4, -34] },
  { id: 3, pos: [-40, 1.4, -42] },
  { id: 4, pos: [0, 1.4, -30] },
];
const TOWER = new Vector3(0, 0, -50);
const CHAMBER = new Vector3(600, 0, 0);
const PICKUP_R = 2.2;
const SAVE_KEY = "pao.quest";

export class QuestManager {
  /**
   * @param scene
   * @param opts { player, onReward, onObjective, onStory }
   *   onReward(kind, amount, xp) — same signature the HUD uses elsewhere.
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.player = opts.player;
    this.onReward = opts.onReward || (() => {});
    this.onObjective = opts.onObjective || (() => {});
    this.onStory = opts.onStory || (() => {});

    this.state = this._load();
    this.shards = [];
    this._inChamber = false;

    this._buildShards();
    this._buildTower();
    this._buildChamber();
    this._refreshObjective();

    // Intro story on first ever play.
    if (!this.state.introSeen) {
      this.state.introSeen = true;
      this._save();
      setTimeout(() => this.onStory("quest.story.intro"), 2600);
    }

    this._obs = scene.onBeforeRenderObservable.add(() => this._update());
  }

  _load() {
    try {
      return Object.assign({ step: 0, found: [], done: false, introSeen: false }, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"));
    } catch {
      return { step: 0, found: [], done: false, introSeen: false };
    }
  }
  _save() { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); }

  _mat(name, hex, emissive, alpha) {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = Color3.FromHexString(hex);
    if (emissive) m.emissiveColor = Color3.FromHexString(emissive);
    if (alpha != null) m.alpha = alpha;
    return m;
  }

  _beam(x, z, hex) {
    const beam = MeshBuilder.CreateCylinder("beam", { diameter: 0.4, height: 30, tessellation: 8 }, this.scene);
    beam.material = this._mat("beamMat", hex, hex, 0.28);
    beam.position.set(x, 15, z);
    beam.isPickable = false;
    return beam;
  }

  _buildShards() {
    SHARD_SPOTS.forEach((s) => {
      if (this.state.found.includes(s.id)) return; // already collected
      const shard = MeshBuilder.CreateSphere(`shard_${s.id}`, { diameter: 0.7, segments: 4 }, this.scene);
      shard.material = this._mat(`shardMat_${s.id}`, "#ffe680", "#ffcf40");
      shard.scaling.y = 1.6;
      shard.position.set(s.pos[0], s.pos[1], s.pos[2]);
      const beam = this._beam(s.pos[0], s.pos[2], "#ffe066");
      this.shards.push({ id: s.id, mesh: shard, beam, base: s.pos[1] });
    });
  }

  _buildTower() {
    const body = MeshBuilder.CreateCylinder("towerBody", { diameter: 6, height: 16, tessellation: 12 }, this.scene);
    body.material = this._mat("towerMat", "#4a2f6e");
    body.position.set(TOWER.x, 8, TOWER.z);
    body.checkCollisions = true;

    const roof = MeshBuilder.CreateCylinder("towerRoof", { diameterTop: 0, diameterBottom: 8, height: 6, tessellation: 12 }, this.scene);
    roof.material = this._mat("towerRoofMat", "#7a3ff2", "#3a1f6e");
    roof.position.set(TOWER.x, 19, TOWER.z);

    const door = MeshBuilder.CreateBox("towerDoor", { width: 2, height: 3, depth: 0.3 }, this.scene);
    door.material = this._mat("towerDoorMat", "#1a0f2e", "#7ec8f0");
    door.position.set(TOWER.x, 1.5, TOWER.z + 3.05);

    this._towerBeam = this._beam(TOWER.x, TOWER.z, "#b57bff");

    // Magic barrier (blocks entry until all shards are found).
    this._barrier = MeshBuilder.CreateCylinder("barrier", { diameter: 12, height: 10, tessellation: 24 }, this.scene);
    this._barrier.material = this._mat("barrierMat", "#7ec8f0", "#3fbfe0", 0.22);
    this._barrier.position.set(TOWER.x, 5, TOWER.z);
    this._barrier.checkCollisions = true;
    if (this.state.step >= 1 || this.state.done) this._dropBarrier();
  }

  _dropBarrier() {
    if (this._barrier) { this._barrier.dispose(); this._barrier = null; }
  }

  _buildChamber() {
    // A bright reward room far away; the player is teleported here for the finale.
    const root = new Vector3(CHAMBER.x, 0, CHAMBER.z);
    const floor = MeshBuilder.CreateCylinder("chamberFloor", { diameter: 24, height: 0.3, tessellation: 32 }, this.scene);
    floor.material = this._mat("chamberFloorMat", "#efe0ff", "#5a3fa0");
    floor.position.set(root.x, -0.1, root.z);
    floor.checkCollisions = true;

    const pedestal = MeshBuilder.CreateCylinder("pedestal", { diameter: 2.4, height: 1.4, tessellation: 16 }, this.scene);
    pedestal.material = this._mat("pedestalMat", "#d8c8f0");
    pedestal.position.set(root.x, 0.7, root.z);

    // The Crown of Light — the goal.
    this._crown = MeshBuilder.CreateCylinder("crownOfLight", { diameterTop: 2, diameterBottom: 1.4, height: 1.1, tessellation: 8 }, this.scene);
    this._crown.material = this._mat("crownOfLightMat", "#fff2b0", "#ffcf40");
    this._crown.position.set(root.x, 2, root.z);
    this._crownBeam = this._beam(root.x, root.z, "#ffe680");
    this._crownBeam.scaling.y = 0.5;
  }

  _update() {
    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    const p = this.player.position;
    const now = (typeof performance !== "undefined" ? performance.now() : 0) / 1000;

    // Spin the crown in the chamber.
    if (this._crown) this._crown.rotation.y += dt * 0.8;

    // Shard collection (only while hunting).
    if (!this.state.done) {
      for (let i = this.shards.length - 1; i >= 0; i--) {
        const sh = this.shards[i];
        sh.mesh.rotation.y += dt * 2;
        sh.mesh.position.y = sh.base + Math.sin(now * 2 + i) * 0.25;
        const dx = sh.mesh.position.x - p.x;
        const dz = sh.mesh.position.z - p.z;
        if (dx * dx + dz * dz < PICKUP_R * PICKUP_R) this._collectShard(sh, i);
      }
    }

    // Enter the tower once the barrier is down.
    if (this.state.step === 1 && !this.state.done && !this._inChamber) {
      const dx = p.x - TOWER.x;
      const dz = p.z - (TOWER.z + 3);
      if (dx * dx + dz * dz < 9) this._finale();
    }
  }

  _collectShard(sh, index) {
    this.shards.splice(index, 1);
    sh.mesh.dispose();
    sh.beam.dispose();
    this.state.found.push(sh.id);
    this._save();
    sound.gem();
    this.onReward("shard", 0, 40); // XP only
    this.onStory("quest.story.shard", { n: this.state.found.length });

    if (this.state.found.length >= SHARD_SPOTS.length) {
      this.state.step = 1;
      this._save();
      this._dropBarrier();
      setTimeout(() => this.onStory("quest.story.unlock"), 600);
    }
    this._refreshObjective();
  }

  _finale() {
    this._inChamber = true;
    this.player.teleport(new Vector3(CHAMBER.x, 0, CHAMBER.z - 6));
    const cam = this.player.camera;
    if (cam) { cam.alpha = -Math.PI / 2; cam.beta = 1.05; cam.radius = 9; }
    this.onStory("quest.story.finale");
    sound.levelUp();
    setTimeout(() => sound.questComplete(), 700);

    // Grant the big reward once.
    if (!this.state.done) {
      this.state.done = true;
      this.state.step = 2;
      this._save();
      this.onReward("coin", 200, 150);
      this.onReward("gem", 10, 0);
    }
    this._refreshObjective();

    // Return to the city after savouring the moment.
    setTimeout(() => {
      this.player.teleport(new Vector3(0, 0, 8));
      if (cam) { cam.radius = 9; }
      this._inChamber = false;
    }, 6000);
  }

  _refreshObjective() {
    if (this.state.done) this.onObjective("quest.obj.done");
    else if (this.state.step === 1) this.onObjective("quest.obj.tower");
    else this.onObjective("quest.obj.find", { n: this.state.found.length, total: SHARD_SPOTS.length });
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._obs);
  }
}

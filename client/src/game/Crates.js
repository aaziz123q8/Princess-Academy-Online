// ============================================================================
//  Crates.js — Crash-style breakable crates. Spin near them to smash them; each
//  crate pops and drops coins or gems. Adds action to the world beyond walking
//  and collecting. Crates respawn is off (they stay broken for the session).
// ============================================================================

import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { sound } from "./Sound.js";
import { toonMesh } from "./Toon.js";

const SPOTS = [
  { x: 5, z: 4, gem: false }, { x: -5, z: 4, gem: false }, { x: 6, z: -3, gem: true },
  { x: -6, z: -4, gem: false }, { x: 10, z: 2, gem: false }, { x: -10, z: 3, gem: true },
  { x: 3, z: 8, gem: false }, { x: -3, z: 9, gem: false },
  // a little stack
  { x: 14, z: -2, gem: false }, { x: 14, z: -2, y: 1.05, gem: true }, { x: 14, z: -2, y: 2.1, gem: false },
];

export class Crates {
  constructor(scene, { getPlayerPos, onReward } = {}) {
    this.scene = scene;
    this.getPlayerPos = getPlayerPos;
    this.onReward = onReward || (() => {});
    this.crates = [];
    SPOTS.forEach((s, i) => this._make(s, i));
  }

  _make(s, i) {
    const node = new TransformNode(`crate_${i}`, this.scene);
    node.position.set(s.x, (s.y || 0) + 0.5, s.z);

    const box = MeshBuilder.CreateBox(`crateBox_${i}`, { size: 1 }, this.scene);
    const mat = new StandardMaterial(`crateMat_${i}`, this.scene);
    mat.diffuseColor = Color3.FromHexString(s.gem ? "#9b6cff" : "#c98a4a");
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    box.material = mat;
    box.parent = node;
    box.checkCollisions = true;
    toonMesh(box, 0.04);

    // A little marker band so it reads as a crate.
    const band = MeshBuilder.CreateBox(`crateBand_${i}`, { width: 1.02, height: 0.18, depth: 1.02 }, this.scene);
    const bmat = new StandardMaterial(`crateBandMat_${i}`, this.scene);
    bmat.diffuseColor = Color3.FromHexString(s.gem ? "#ffd166" : "#7a5230");
    bmat.emissiveColor = Color3.FromHexString(s.gem ? "#e0a800" : "#000000");
    band.material = bmat;
    band.parent = node;
    toonMesh(band, 0.04);

    this.crates.push({ node, gem: s.gem, alive: true });
  }

  /** Smash any crates within `radius` of a point (called by the spin attack). */
  breakNear(pos, radius = 2.6) {
    let broke = 0;
    this.crates.forEach((c) => {
      if (!c.alive) return;
      const dx = c.node.position.x - pos.x;
      const dz = c.node.position.z - pos.z;
      if (dx * dx + dz * dz <= radius * radius) {
        c.alive = false;
        this._pop(c);
        broke++;
      }
    });
    if (broke > 0) {
      sound.coin();
      // Reward per crate.
      this.crates.filter((c) => !c.alive).slice(-broke).forEach((c) => {
        if (c.gem) this.onReward("gem", 1, 10);
        else this.onReward("coin", 10, 8);
      });
    }
    return broke;
  }

  /** Quick pop animation, then dispose. */
  _pop(c) {
    const start = performance ? performance.now() : 0;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      const t = ((performance ? performance.now() : 0) - start) / 180;
      const s = Math.max(0, 1 - t);
      c.node.scaling.setAll(s);
      c.node.position.y += 0.03;
      if (t >= 1) {
        this.scene.onBeforeRenderObservable.remove(obs);
        c.node.dispose(false, true);
      }
    });
  }

  dispose() {
    this.crates.forEach((c) => c.alive && c.node.dispose(false, true));
    this.crates = [];
  }
}

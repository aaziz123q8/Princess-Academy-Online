// ============================================================================
//  Collectibles.js — Adventure loop: spinning gems and coins scattered around
//  the city. Walking near one collects it → awards currency + XP, plays a
//  sound, and shows a popup. Collecting every gem completes a quest for a bonus.
//  Zero asset cost — everything is built from primitives.
// ============================================================================

import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { sound } from "./Sound.js";

const PICKUP_RADIUS = 1.6;

export class Collectibles {
  /**
   * @param scene
   * @param opts { getPlayerPos:()=>Vector3, onReward:(kind,amount,xp)=>void, onQuest:(done,total)=>void }
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.getPlayerPos = opts.getPlayerPos;
    this.onReward = opts.onReward || (() => {});
    this.onQuest = opts.onQuest || (() => {});
    this.items = [];
    this._gemsTotal = 0;
    this._gemsGot = 0;

    this._spawnGems(10);
    this._spawnCoins(14);
    this.onQuest(this._gemsGot, this._gemsTotal);

    this._obs = scene.onBeforeRenderObservable.add(() => this._update());
  }

  _mat(name, hex, emissive) {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.emissiveColor = Color3.FromHexString(emissive || hex);
    m.specularColor = new Color3(0.4, 0.4, 0.4);
    return m;
  }

  _spawnGems(n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 12 + (i % 4) * 5;
      const mesh = MeshBuilder.CreateSphere(`gem_${i}`, { diameter: 0.55, segments: 4 }, this.scene);
      mesh.material = this._mat(`gemMat_${i}`, "#b57bff", "#7a3ff2");
      mesh.position.set(Math.cos(a) * r, 1.1, Math.sin(a) * r);
      mesh.scaling.y = 1.5;
      this.items.push({ mesh, kind: "gem", spin: 2.2, bob: 0.25, base: mesh.position.y });
      this._gemsTotal++;
    }
  }

  _spawnCoins(n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const r = 8 + (i % 5) * 4.5;
      const mesh = MeshBuilder.CreateCylinder(`coin_${i}`, { diameter: 0.5, height: 0.08, tessellation: 20 }, this.scene);
      mesh.material = this._mat(`coinMat_${i}`, "#ffcf40", "#e0a800");
      mesh.position.set(Math.cos(a) * r, 0.9, Math.sin(a) * r);
      mesh.rotation.x = Math.PI / 2;
      this.items.push({ mesh, kind: "coin", spin: 3.5, bob: 0.15, base: mesh.position.y });
    }
  }

  _update() {
    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    const p = this.getPlayerPos ? this.getPlayerPos() : null;
    const now = performance.now ? performance.now() / 1000 : 0;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      // Spin + bob animation.
      if (it.kind === "coin") it.mesh.rotation.y += it.spin * dt;
      else it.mesh.rotation.y += it.spin * dt;
      it.mesh.position.y = it.base + Math.sin(now * 2 + i) * it.bob;

      // Proximity pickup (compare on the horizontal plane).
      if (p) {
        const dx = it.mesh.position.x - p.x;
        const dz = it.mesh.position.z - p.z;
        if (dx * dx + dz * dz < PICKUP_RADIUS * PICKUP_RADIUS) {
          this._collect(it, i);
        }
      }
    }
  }

  _collect(it, index) {
    this.items.splice(index, 1);
    it.mesh.dispose();

    if (it.kind === "gem") {
      this._gemsGot++;
      this.onReward("gem", 1, 15);
      sound.gem();
      this.onQuest(this._gemsGot, this._gemsTotal);
      if (this._gemsGot >= this._gemsTotal) {
        // Quest complete bonus.
        setTimeout(() => {
          this.onReward("coin", 100, 50);
          sound.questComplete();
        }, 300);
      }
    } else {
      this.onReward("coin", 5, 5);
      sound.coin();
    }
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._obs);
    this.items.forEach((it) => it.mesh.dispose());
    this.items = [];
  }
}

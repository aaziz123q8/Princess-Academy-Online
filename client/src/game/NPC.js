// ============================================================================
//  NPC.js — A few friendly characters standing around the city. When the player
//  walks up to one, the NPC waves and greets them with a localized line. Reuses
//  the Avatar so NPCs look consistent with players. (Later: quests & shops.)
// ============================================================================

import { Avatar } from "./Avatar.js";

const NPCS = [
  { name: "Luna",  pos: [-9, 0, -3], dress: "#7a3ff2", hair: "#2b2b2b", hairStyle: "long",     accessory: "halo",    line: "npc.luna" },
  { name: "Rose",  pos: [9, 0, -6],  dress: "#e0245e", hair: "#e9b44c", hairStyle: "ponytail", accessory: "none",    line: "npc.rose" },
  { name: "Bella", pos: [-6, 0, 7],  dress: "#3fbf7a", hair: "#5b3a29", hairStyle: "bun",       accessory: "glasses", line: "npc.bella" },
];

export class NPCs {
  constructor(scene, { getPlayerPos, onGreet } = {}) {
    this.scene = scene;
    this.getPlayerPos = getPlayerPos;
    this.onGreet = onGreet || (() => {});
    this.npcs = NPCS.map((n, i) => {
      const a = new Avatar(scene, {
        name: n.name, dress: n.dress, hair: n.hair,
        hairStyle: n.hairStyle, accessory: n.accessory,
      });
      a.root.position.set(n.pos[0], 0, n.pos[2]);
      a.root.rotation.y = (i * 2.1) % (Math.PI * 2);
      return { a, line: n.line, greeted: false };
    });
    this._obs = scene.onBeforeRenderObservable.add(() => this._update());
  }

  _update() {
    const p = this.getPlayerPos && this.getPlayerPos();
    if (!p) return;
    this.npcs.forEach((n) => {
      const dx = n.a.root.position.x - p.x;
      const dz = n.a.root.position.z - p.z;
      const near = dx * dx + dz * dz < 10; // ~3.2m
      if (near && !n.greeted) {
        n.greeted = true;
        n.a.playEmote("wave");
        this.onGreet(n.line, { name: n.a.name });
      } else if (!near && n.greeted) {
        n.greeted = false;
      }
    });
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._obs);
    this.npcs.forEach((n) => n.a.dispose());
  }
}

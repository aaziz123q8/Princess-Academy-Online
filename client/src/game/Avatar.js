// ============================================================================
//  Avatar.js — Builds a stylized princess character from primitives and gives
//  it a simple procedural walk animation. Used for BOTH the local player and
//  remote players. In a later art phase this is swapped for a rigged glTF model
//  loaded through @babylonjs/loaders — the rest of the game only touches the
//  root TransformNode and setMoving()/setColors(), so nothing else changes.
// ============================================================================

import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.js";

let uid = 0;

export class Avatar {
  /**
   * @param {import("@babylonjs/core/scene").Scene} scene
   * @param {object} opts { name, skin, dress, hair }
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.name = opts.name || "Princess";
    const id = `avatar_${uid++}`;

    const skin = mat(scene, `${id}_skin`, opts.skin || "#ffd9c0");
    const dress = mat(scene, `${id}_dress`, opts.dress || "#ff5fa2");
    const hair = mat(scene, `${id}_hair`, opts.hair || "#5b3a29");

    // Root node — the ONLY thing external systems move/rotate.
    this.root = new TransformNode(id, scene);

    // Body (dress) — a tapered cylinder.
    const body = MeshBuilder.CreateCylinder(`${id}_body`, { diameterTop: 0.5, diameterBottom: 1.0, height: 1.1, tessellation: 16 }, scene);
    body.material = dress;
    body.position.y = 0.55;
    body.parent = this.root;
    body.checkCollisions = false;

    // Head.
    const head = MeshBuilder.CreateSphere(`${id}_head`, { diameter: 0.55, segments: 12 }, scene);
    head.material = skin;
    head.position.y = 1.42;
    head.parent = this.root;

    // Hair cap.
    const hairCap = MeshBuilder.CreateSphere(`${id}_hair`, { diameter: 0.62, segments: 12, slice: 0.62 }, scene);
    hairCap.material = hair;
    hairCap.position.y = 1.5;
    hairCap.parent = this.root;

    // Crown.
    const crown = MeshBuilder.CreateCylinder(`${id}_crown`, { diameterTop: 0.42, diameterBottom: 0.32, height: 0.2, tessellation: 8 }, scene);
    crown.material = mat(scene, `${id}_crownmat`, "#ffcf40");
    crown.position.y = 1.78;
    crown.parent = this.root;

    // Arms (animated).
    this.armL = limb(scene, `${id}_armL`, skin, -0.42);
    this.armR = limb(scene, `${id}_armR`, skin, 0.42);
    this.armL.parent = this.root;
    this.armR.parent = this.root;

    // Floating name label above the head.
    this.label = makeNameLabel(scene, this.name, id);
    this.label.parent = this.root;
    this.label.position.y = 2.15;

    this._phase = 0;
    this._moving = false;

    // Per-frame limb animation.
    this._obs = scene.onBeforeRenderObservable.add(() => this._animate());
  }

  setMoving(isMoving) {
    this._moving = isMoving;
  }

  _animate() {
    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    if (this._moving) {
      this._phase += dt * 9;
      const swing = Math.sin(this._phase) * 0.6;
      this.armL.rotation.x = swing;
      this.armR.rotation.x = -swing;
      // Subtle body bob while walking.
      this.root.getChildMeshes()[0].position.y = 0.55 + Math.abs(Math.sin(this._phase)) * 0.04;
    } else {
      this.armL.rotation.x *= 0.8;
      this.armR.rotation.x *= 0.8;
    }
  }

  setName(name) {
    this.name = name;
    if (this.label) drawNameLabel(this.label._tex, name);
  }

  get position() {
    return this.root.position;
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._obs);
    this.root.dispose(false, true);
  }
}

/* ------------------------------- helpers -------------------------------- */

function mat(scene, name, hex) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.1, 0.1, 0.1);
  return m;
}

function limb(scene, name, material, offsetX) {
  const arm = MeshBuilder.CreateCapsule(name, { radius: 0.11, height: 0.7 }, scene);
  arm.material = material;
  arm.position.set(offsetX, 0.95, 0);
  arm.setPivotPoint(new Vector3(0, 0.3, 0));
  return arm;
}

function makeNameLabel(scene, name, id) {
  const plane = MeshBuilder.CreatePlane(`${id}_label`, { width: 1.6, height: 0.4 }, scene);
  plane.billboardMode = 7; // BILLBOARDMODE_ALL — always faces camera
  const tex = new DynamicTexture(`${id}_labeltex`, { width: 256, height: 64 }, scene, false);
  tex.hasAlpha = true;
  const m = new StandardMaterial(`${id}_labelmat`, scene);
  m.diffuseTexture = tex;
  m.emissiveColor = new Color3(1, 1, 1);
  m.disableLighting = true;
  m.useAlphaFromDiffuseTexture = true;
  m.backFaceCulling = false;
  plane.material = m;
  plane._tex = tex;
  drawNameLabel(tex, name);
  return plane;
}

function drawNameLabel(tex, name) {
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = "bold 30px Segoe UI, Tahoma, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(name, 129, 33);
  ctx.fillStyle = "#ffe9f6";
  ctx.fillText(name, 128, 32);
  tex.update();
}

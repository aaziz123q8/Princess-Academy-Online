// ============================================================================
//  Avatar.js — Stylized princess character built from primitives.
//  Supports live appearance changes (skin / hair / dress / crown colours) and
//  emotes (wave, cheer, dance, spin) on top of a procedural walk cycle. Used
//  for both the local player and remote players. Swappable for a rigged glTF
//  later — callers only touch the root node, setAppearance(), and playEmote().
// ============================================================================

import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.js";

let uid = 0;

const EMOTE_DURATION = 2.2; // seconds

export class Avatar {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.name = opts.name || "Princess";
    const id = `avatar_${uid++}`;

    this.mat = {
      skin: mat(scene, `${id}_skin`, opts.skin || "#ffd9c0"),
      dress: mat(scene, `${id}_dress`, opts.dress || "#ff5fa2"),
      hair: mat(scene, `${id}_hair`, opts.hair || "#5b3a29"),
      crown: mat(scene, `${id}_crown`, opts.crown || "#ffcf40"),
    };

    this.root = new TransformNode(id, scene);

    const body = MeshBuilder.CreateCylinder(`${id}_body`, { diameterTop: 0.5, diameterBottom: 1.0, height: 1.1, tessellation: 16 }, scene);
    body.material = this.mat.dress;
    body.position.y = 0.55;
    body.parent = this.root;
    this._body = body;

    const head = MeshBuilder.CreateSphere(`${id}_head`, { diameter: 0.55, segments: 12 }, scene);
    head.material = this.mat.skin;
    head.position.y = 1.42;
    head.parent = this.root;

    const hairCap = MeshBuilder.CreateSphere(`${id}_hair`, { diameter: 0.62, segments: 12, slice: 0.62 }, scene);
    hairCap.material = this.mat.hair;
    hairCap.position.y = 1.5;
    hairCap.parent = this.root;

    const crown = MeshBuilder.CreateCylinder(`${id}_crownmesh`, { diameterTop: 0.42, diameterBottom: 0.32, height: 0.2, tessellation: 8 }, scene);
    crown.material = this.mat.crown;
    crown.position.y = 1.78;
    crown.parent = this.root;
    this._crown = crown;

    this.armL = limb(scene, `${id}_armL`, this.mat.skin, -0.42);
    this.armR = limb(scene, `${id}_armR`, this.mat.skin, 0.42);
    this.armL.parent = this.root;
    this.armR.parent = this.root;

    this.label = makeNameLabel(scene, this.name, id);
    this.label.parent = this.root;
    this.label.position.y = 2.15;

    this._phase = 0;
    this._moving = false;
    this._emote = null;
    this._emoteT = 0;
    this._baseYaw = 0;

    this._obs = scene.onBeforeRenderObservable.add(() => this._animate());
  }

  setMoving(isMoving) {
    this._moving = isMoving;
  }

  /** Update any subset of appearance colours (hex strings). */
  setAppearance(app = {}) {
    if (app.skin) this.mat.skin.diffuseColor = Color3.FromHexString(app.skin);
    if (app.hair) this.mat.hair.diffuseColor = Color3.FromHexString(app.hair);
    if (app.dress) this.mat.dress.diffuseColor = Color3.FromHexString(app.dress);
    if (app.crown) this.mat.crown.diffuseColor = Color3.FromHexString(app.crown);
  }

  /** Trigger an emote animation. */
  playEmote(name) {
    this._emote = name;
    this._emoteT = 0;
    this._baseYaw = this.root.rotation.y;
  }

  _animate() {
    const dt = this.scene.getEngine().getDeltaTime() / 1000;

    // Emote overrides walk/idle while active.
    if (this._emote) {
      this._emoteT += dt;
      const t = this._emoteT;
      switch (this._emote) {
        case "wave":
          this.armR.rotation.x = -2.4;
          this.armR.rotation.z = Math.sin(t * 10) * 0.5;
          break;
        case "cheer":
          this.armL.rotation.x = -2.5;
          this.armR.rotation.x = -2.5;
          this._body.position.y = 0.55 + Math.abs(Math.sin(t * 6)) * 0.12;
          break;
        case "dance":
          this.armL.rotation.x = Math.sin(t * 8) * 1.2;
          this.armR.rotation.x = -Math.sin(t * 8) * 1.2;
          this.root.rotation.z = Math.sin(t * 8) * 0.15;
          this._body.position.y = 0.55 + Math.abs(Math.sin(t * 8)) * 0.08;
          break;
        case "spin":
          this.root.rotation.y = this._baseYaw + (t / EMOTE_DURATION) * Math.PI * 2;
          break;
      }
      if (this._emoteT >= EMOTE_DURATION) {
        this._emote = null;
        this.root.rotation.z = 0;
        this.armL.rotation.x = 0;
        this.armR.rotation.x = 0;
        this.armR.rotation.z = 0;
        this._body.position.y = 0.55;
      }
      return;
    }

    if (this._moving) {
      this._phase += dt * 9;
      const swing = Math.sin(this._phase) * 0.6;
      this.armL.rotation.x = swing;
      this.armR.rotation.x = -swing;
      this._body.position.y = 0.55 + Math.abs(Math.sin(this._phase)) * 0.04;
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
  plane.billboardMode = 7;
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

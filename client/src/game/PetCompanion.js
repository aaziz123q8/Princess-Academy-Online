// ============================================================================
//  PetCompanion.js — A cute pet that follows the player around, hopping along.
//  Built from primitives (a pastel dragon-ish creature) so it works with zero
//  asset cost. If an image file `pet.png` is present at the site root (e.g. the
//  AI-generated dragon downloaded from Higgsfield and uploaded next to
//  index.html), it is shown as a billboard sprite instead — upgrading the look
//  to the AI art with no code change.
// ============================================================================

import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

const FOLLOW_DISTANCE = 2.2;
const SPEED = 5.5;

export class PetCompanion {
  constructor(scene, getPlayerPos) {
    this.scene = scene;
    this.getPlayerPos = getPlayerPos;
    this.root = new TransformNode("pet", scene);
    this.root.position = new Vector3(2, 0, 12);
    this._phase = 0;

    this._buildPrimitivePet();
    this._tryLoadSprite(); // upgrades to AI art if pet.png exists

    this._obs = scene.onBeforeRenderObservable.add(() => this._update());
  }

  _mat(name, hex, emissive) {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = Color3.FromHexString(hex);
    if (emissive) m.emissiveColor = Color3.FromHexString(emissive);
    m.specularColor = new Color3(0.2, 0.2, 0.2);
    return m;
  }

  _buildPrimitivePet() {
    const body = MeshBuilder.CreateSphere("petBody", { diameter: 0.7, segments: 10 }, this.scene);
    body.material = this._mat("petBodyMat", "#ff9ec7");
    body.position.y = 0.5;
    body.parent = this.root;
    this._body = body;

    const head = MeshBuilder.CreateSphere("petHead", { diameter: 0.5, segments: 10 }, this.scene);
    head.material = this._mat("petHeadMat", "#ffb3d6");
    head.position.set(0, 0.95, 0.15);
    head.parent = this.root;

    // Eyes.
    [-0.12, 0.12].forEach((x, i) => {
      const eye = MeshBuilder.CreateSphere(`petEye_${i}`, { diameter: 0.12, segments: 6 }, this.scene);
      eye.material = this._mat(`petEyeMat_${i}`, "#2a1436", "#2a1436");
      eye.position.set(x, 1.0, 0.35);
      eye.parent = this.root;
    });

    // Little wings.
    [-0.32, 0.32].forEach((x, i) => {
      const wing = MeshBuilder.CreateSphere(`petWing_${i}`, { diameter: 0.4, segments: 6 }, this.scene);
      wing.material = this._mat(`petWingMat_${i}`, "#c9a7ff");
      wing.scaling.set(0.5, 0.9, 0.15);
      wing.position.set(x, 0.6, -0.15);
      wing.parent = this.root;
    });
  }

  /** If pet.png exists at site root, show it as a billboard sprite. */
  _tryLoadSprite() {
    const url = "./pet.png";
    const tex = new Texture(
      url,
      this.scene,
      true,
      true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => {
        // onLoad: hide the primitive pet, show the sprite billboard.
        const plane = MeshBuilder.CreatePlane("petSprite", { size: 1.6 }, this.scene);
        plane.billboardMode = 7;
        const m = new StandardMaterial("petSpriteMat", this.scene);
        m.diffuseTexture = tex;
        m.diffuseTexture.hasAlpha = true;
        m.useAlphaFromDiffuseTexture = true;
        m.emissiveColor = new Color3(1, 1, 1);
        m.disableLighting = true;
        m.backFaceCulling = false;
        plane.material = m;
        plane.position.y = 0.9;
        plane.parent = this.root;
        this.root.getChildMeshes().forEach((mesh) => {
          if (mesh !== plane) mesh.setEnabled(false);
        });
      },
      () => {
        /* onError: no pet.png — keep the primitive pet. This is expected. */
      }
    );
  }

  _update() {
    const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.05);
    const target = this.getPlayerPos ? this.getPlayerPos() : null;
    if (!target) return;

    // Follow: move toward a point a short distance from the player.
    const toPlayer = target.subtract(this.root.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > FOLLOW_DISTANCE) {
      const dir = toPlayer.normalize();
      const step = Math.min(SPEED * dt, dist - FOLLOW_DISTANCE);
      this.root.position.addInPlace(dir.scale(step));
      this.root.rotation.y = Math.atan2(dir.x, dir.z);
      this._phase += dt * 10;
    } else {
      this._phase += dt * 3;
    }

    // Hop.
    const hop = Math.abs(Math.sin(this._phase)) * 0.18;
    if (this._body) this.root.position.y = hop;
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._obs);
    this.root.dispose(false, true);
  }
}

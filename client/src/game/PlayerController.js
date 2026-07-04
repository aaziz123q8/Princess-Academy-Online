// ============================================================================
//  PlayerController.js — Local player: third-person movement + camera.
//  * Movement is camera-relative (push forward = away from camera).
//  * The character turns smoothly to face its travel direction.
//  * An invisible capsule collider moves with Babylon collisions (so the player
//    can't walk through buildings) and simple gravity; the visual avatar (a
//    TransformNode) is synced to the collider each frame.
//  * An ArcRotateCamera follows the player and supports pointer/touch orbit.
// ============================================================================

import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
// Side-effects: Ray registers camera.getForwardRay(); collisionCoordinator
// enables moveWithCollisions(). Babylon's tree-shaking needs these explicitly.
import "@babylonjs/core/Culling/ray.js";
import "@babylonjs/core/Collisions/collisionCoordinator.js";
import { Avatar } from "./Avatar.js";

const MOVE_SPEED = 6.5; // metres / second
const TURN_LERP = 0.18; // how quickly the avatar rotates to face travel dir
const GRAVITY = -18;
const JUMP_VELOCITY = 7;
const CAPSULE_HALF = 1.0; // collider is 2m tall; its centre sits 1m above the feet

export class PlayerController {
  constructor(scene, canvas, input, profile = {}) {
    this.scene = scene;
    this.input = input;

    this.avatar = new Avatar(scene, {
      name: profile.name || "Princess",
      dress: profile.dress,
      hair: profile.hair,
      skin: profile.skin,
    });

    // Invisible collider that actually handles movement + collisions.
    this.collider = MeshBuilder.CreateCapsule("playerCollider", { radius: 0.5, height: 2 }, scene);
    this.collider.isVisible = false;
    this.collider.checkCollisions = true;
    this.collider.ellipsoid = new Vector3(0.5, CAPSULE_HALF, 0.5);
    this.collider.position = new Vector3(0, CAPSULE_HALF, 10);
    this._syncAvatar();

    // Third-person camera orbiting the player.
    this.camera = new ArcRotateCamera("tpCam", -Math.PI / 2, 1.15, 9, this.avatar.root.position.clone(), scene);
    this.camera.lowerBetaLimit = 0.35;
    this.camera.upperBetaLimit = 1.45;
    this.camera.lowerRadiusLimit = 4;
    this.camera.upperRadiusLimit = 14;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.panningSensibility = 0; // it's a follow cam, not a pan cam
    this.camera.attachControl(canvas, true);
    scene.activeCamera = this.camera;

    this._vy = 0; // vertical velocity
    this._grounded = true;
    this._obs = scene.onBeforeRenderObservable.add(() => this._update());
  }

  _syncAvatar() {
    const p = this.collider.position;
    this.avatar.root.position.set(p.x, p.y - CAPSULE_HALF, p.z);
  }

  _update() {
    const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.05);
    const inp = this.input.move;
    const moving = Math.abs(inp.x) > 0.02 || Math.abs(inp.y) > 0.02;

    // Camera-relative basis, flattened to the ground plane.
    const forward = this.camera.getForwardRay().direction;
    forward.y = 0;
    forward.normalize();
    const right = new Vector3(forward.z, 0, -forward.x); // 90° from forward

    let disp = new Vector3(0, 0, 0);
    if (moving) {
      disp = forward.scale(inp.y).add(right.scale(inp.x));
      if (disp.lengthSquared() > 0) disp.normalize();

      // Rotate avatar to face travel direction (shortest-arc lerp).
      const targetYaw = Math.atan2(disp.x, disp.z);
      const cur = this.avatar.root.rotation.y;
      this.avatar.root.rotation.y = cur + shortestAngle(cur, targetYaw) * TURN_LERP;
    }
    this.avatar.setMoving(moving);

    // Jump / gravity.
    if (this.input.consumeJump() && this._grounded) {
      this._vy = JUMP_VELOCITY;
      this._grounded = false;
    }
    this._vy += GRAVITY * dt;

    const speed = MOVE_SPEED * (this.input.sprint ? 1.7 : 1);
    const move = disp.scale(speed * dt);
    move.y = this._vy * dt;
    this.collider.moveWithCollisions(move);

    // Ground check (collider centre rests at CAPSULE_HALF above the floor).
    if (this.collider.position.y <= CAPSULE_HALF + 0.001) {
      this.collider.position.y = CAPSULE_HALF;
      this._vy = 0;
      this._grounded = true;
    }

    this._syncAvatar();

    // Camera follows the avatar (orbit angle stays user-controlled).
    const p = this.avatar.root.position;
    this.camera.target = Vector3.Lerp(this.camera.target, new Vector3(p.x, p.y + 1.2, p.z), 0.2);
  }

  get position() {
    return this.avatar.root.position;
  }

  get rotationY() {
    return this.avatar.root.rotation.y;
  }

  setName(name) {
    this.avatar.setName(name);
  }

  setAppearance(app) {
    this.avatar.setAppearance(app);
  }

  playEmote(name) {
    this.avatar.playEmote(name);
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._obs);
    this.collider.dispose();
    this.avatar.dispose();
    this.camera.dispose();
  }
}

function shortestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

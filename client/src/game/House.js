// ============================================================================
//  House.js — The player's own home: enter it from the city, then decorate it
//  by placing furniture. The interior is built far from the city in the same
//  scene; entering/leaving teleports the player. The furniture layout persists
//  to localStorage (ready to sync to the server later).
//
//  Step 1 of the houses feature: own + enter + decorate. Multiplayer visiting
//  and buying furniture from a shop come in later steps.
// ============================================================================

import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.js";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents.js";
import { sound } from "./Sound.js";

const CITY_DOOR = new Vector3(13, 0, 8);      // cottage location in the city
const INTERIOR = new Vector3(500, 0, 0);       // interior built far away
const ENTER_RADIUS = 3.2;
const SAVE_KEY = "pao.house";

export const FURNITURE = ["table", "chair", "plant", "lamp", "rug", "bed", "teddy"];

export class House {
  /**
   * @param scene
   * @param opts { player, onCanEnter:(bool)=>void }
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.player = opts.player;
    this.onCanEnter = opts.onCanEnter || (() => {});
    this.inside = false;
    this.decorating = false;
    this.removeMode = false;
    this._selected = "table";
    this._placed = []; // { type, node }
    this._canEnter = false;

    this._buildCottage();
    this._buildInterior();
    this._loadLayout();

    this._pointerObs = scene.onPointerObservable.add((pi) => this._onPointer(pi));
    this._obs = scene.onBeforeRenderObservable.add(() => this._update());
  }

  _mat(name, hex, emissive) {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = Color3.FromHexString(hex);
    if (emissive) m.emissiveColor = Color3.FromHexString(emissive);
    m.specularColor = new Color3(0.05, 0.05, 0.05);
    return m;
  }

  // ---- City cottage (the entrance) ----
  _buildCottage() {
    const root = new TransformNode("cottage", this.scene);
    root.position = CITY_DOOR.clone();

    const walls = MeshBuilder.CreateBox("cottageWalls", { width: 5, height: 4, depth: 5 }, this.scene);
    walls.material = this._mat("cottageWallMat", "#ffe0ef");
    walls.position.y = 2;
    walls.parent = root;
    walls.checkCollisions = true;

    const roof = MeshBuilder.CreateCylinder("cottageRoof", { diameterTop: 0, diameterBottom: 7.5, height: 3, tessellation: 4 }, this.scene);
    roof.material = this._mat("cottageRoofMat", "#e8388a");
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 5.2;
    roof.parent = root;

    const door = MeshBuilder.CreateBox("cottageDoor", { width: 1.4, height: 2.4, depth: 0.2 }, this.scene);
    door.material = this._mat("cottageDoorMat", "#7a3ff2", "#b57bff");
    door.position.set(0, 1.2, -2.55);
    door.parent = root;

    this._label(root, "🏠", 3.2);
  }

  // ---- Interior room ----
  _buildInterior() {
    const root = new TransformNode("interior", this.scene);
    root.position = INTERIOR.clone();
    this._interiorRoot = root;

    // Room is 20x20 so the third-person camera fits inside without clipping.
    const floor = MeshBuilder.CreateBox("houseFloor", { width: 20, height: 0.2, depth: 20 }, this.scene);
    floor.material = this._mat("houseFloorMat", "#e8c9a0");
    floor.position.y = -0.1;
    floor.parent = root;
    floor.checkCollisions = true;
    this._floor = floor;

    // Four walls with a doorway gap on the south wall.
    const wallMat = this._mat("houseWallMat", "#fff0f6");
    const mkWall = (w, d, x, z) => {
      const wall = MeshBuilder.CreateBox("hw", { width: w, height: 4, depth: d }, this.scene);
      wall.material = wallMat;
      wall.position.set(x, 2, z);
      wall.checkCollisions = true;
      wall.parent = root;
    };
    mkWall(20, 0.3, 0, 10);      // north
    mkWall(0.3, 20, 10, 0);      // east
    mkWall(0.3, 20, -10, 0);     // west
    mkWall(8, 0.3, -6, -10);     // south left
    mkWall(8, 0.3, 6, -10);      // south right (gap in middle = doorway)

    // A window on the north wall.
    const window = MeshBuilder.CreateBox("houseWindow", { width: 4, height: 2.2, depth: 0.1 }, this.scene);
    window.material = this._mat("houseWindowMat", "#bfe9ff", "#7ec8f0");
    window.position.set(0, 2.4, 9.9);
    window.parent = root;

    this._exitPad = MeshBuilder.CreateCylinder("exitPad", { diameter: 2.4, height: 0.05, tessellation: 24 }, this.scene);
    this._exitPad.material = this._mat("exitPadMat", "#7a3ff2", "#b57bff");
    this._exitPad.position.set(0, 0.05, -9);
    this._exitPad.parent = root;
    this._label(root, "🚪", 2.2, new Vector3(0, 2.4, -9));
  }

  _label(parent, emoji, y, localPos) {
    const plane = MeshBuilder.CreatePlane(`${parent.name}_lbl`, { width: 1.4, height: 1.4 }, this.scene);
    plane.billboardMode = 7;
    const tex = new DynamicTexture(`${parent.name}_lblt`, { width: 128, height: 128 }, this.scene, false);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 128, 128);
    ctx.font = "90px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 64, 68);
    tex.update();
    const m = new StandardMaterial(`${parent.name}_lblm`, this.scene);
    m.diffuseTexture = tex;
    m.diffuseTexture.hasAlpha = true;
    m.useAlphaFromDiffuseTexture = true;
    m.emissiveColor = new Color3(1, 1, 1);
    m.disableLighting = true;
    m.backFaceCulling = false;
    plane.material = m;
    plane.parent = parent;
    if (localPos) plane.position.copyFrom(localPos);
    else plane.position.y = y;
  }

  // ---- Enter / exit ----
  _update() {
    if (this.inside) return;
    const p = this.player.position;
    const dx = p.x - CITY_DOOR.x;
    const dz = p.z - CITY_DOOR.z;
    const near = dx * dx + dz * dz < ENTER_RADIUS * ENTER_RADIUS;
    if (near !== this._canEnter) {
      this._canEnter = near;
      this.onCanEnter(near);
    }
  }

  enter() {
    this.inside = true;
    this._canEnter = false;
    this.onCanEnter(false);
    // Spawn in the room's north half so the (south-side) camera has space.
    this.player.teleport(new Vector3(INTERIOR.x, 0, INTERIOR.z + 2));
    const cam = this.player.camera;
    if (cam) { cam.alpha = -Math.PI / 2; cam.beta = 1.05; cam.radius = 7; }
    sound.click();
  }

  exit() {
    this.inside = false;
    this.setDecorating(false);
    this.player.teleport(new Vector3(CITY_DOOR.x, 0, CITY_DOOR.z - 4));
    sound.click();
  }

  // ---- Decoration ----
  setDecorating(on) {
    this.decorating = on;
    if (!on) this.removeMode = false;
  }
  selectFurniture(type) {
    this._selected = type;
    this.removeMode = false;
  }
  setRemoveMode(on) {
    this.removeMode = on;
  }

  _onPointer(pi) {
    if (!this.inside || !this.decorating) return;
    if (pi.type !== PointerEventTypes.POINTERPICK) return;
    const pick = pi.pickInfo;
    if (!pick || !pick.hit) return;

    // Remove mode: tap a placed furniture to delete it.
    if (this.removeMode) {
      const hit = this._placed.find((f) => pick.pickedMesh && isDescendant(pick.pickedMesh, f.node));
      if (hit) {
        hit.node.dispose(false, true);
        this._placed = this._placed.filter((f) => f !== hit);
        this._saveLayout();
        sound.click();
      }
      return;
    }

    // Place mode: tap the floor to drop the selected furniture.
    if (pick.pickedMesh === this._floor) {
      const local = pick.pickedPoint.subtract(INTERIOR);
      this._place(this._selected, local.x, local.z, Math.random() * Math.PI * 2);
      this._saveLayout();
      sound.coin();
    }
  }

  _place(type, x, z, rot) {
    const node = makeFurniture(this.scene, type, this._mat.bind(this));
    node.parent = this._interiorRoot;
    node.position.set(x, 0, z);
    node.rotation.y = rot || 0;
    this._placed.push({ type, node });
  }

  _saveLayout() {
    const data = this._placed.map((f) => ({
      type: f.type,
      x: round(f.node.position.x),
      z: round(f.node.position.z),
      r: round(f.node.rotation.y),
    }));
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  _loadLayout() {
    let data = [];
    try {
      data = JSON.parse(localStorage.getItem(SAVE_KEY) || "[]");
    } catch {
      data = [];
    }
    if (!data.length) {
      // A cozy default layout for first-time visitors.
      data = [
        { type: "rug", x: 0, z: 0, r: 0 },
        { type: "bed", x: -4, z: 4, r: 0 },
        { type: "table", x: 3.5, z: 2, r: 0 },
        { type: "plant", x: 5.5, z: 5.5, r: 0 },
        { type: "lamp", x: -5.5, z: -4, r: 0 },
      ];
    }
    data.forEach((f) => this._place(f.type, f.x, f.z, f.r));
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this._obs);
    this.scene.onPointerObservable.remove(this._pointerObs);
  }
}

/* --------------------------- furniture factory --------------------------- */

function makeFurniture(scene, type, matFn) {
  const root = new TransformNode(`furn_${type}_${Math.floor(Math.random() * 1e6)}`, scene);
  const M = (hex, emissive) => matFn(`fm_${Math.floor(Math.random() * 1e9)}`, hex, emissive);
  const add = (mesh, y) => { mesh.parent = root; mesh.position.y = y; return mesh; };

  switch (type) {
    case "table": {
      const top = MeshBuilder.CreateBox("t", { width: 1.4, height: 0.14, depth: 0.9 }, scene);
      top.material = M("#b07a4a"); add(top, 0.8);
      const leg = MeshBuilder.CreateCylinder("tl", { diameter: 0.6, height: 0.8 }, scene);
      leg.material = M("#8d5a3b"); add(leg, 0.4);
      break;
    }
    case "chair": {
      const seat = MeshBuilder.CreateBox("s", { width: 0.6, height: 0.12, depth: 0.6 }, scene);
      seat.material = M("#ff8fab"); add(seat, 0.5);
      const back = MeshBuilder.CreateBox("b", { width: 0.6, height: 0.6, depth: 0.12 }, scene);
      back.material = M("#ff5fa2"); add(back, 0.8).position.z = -0.24;
      break;
    }
    case "plant": {
      const pot = MeshBuilder.CreateCylinder("p", { diameterTop: 0.5, diameterBottom: 0.35, height: 0.5 }, scene);
      pot.material = M("#c96a4a"); add(pot, 0.25);
      const leaves = MeshBuilder.CreateSphere("pl", { diameter: 0.9, segments: 8 }, scene);
      leaves.material = M("#5fb56a"); add(leaves, 0.9);
      break;
    }
    case "lamp": {
      const pole = MeshBuilder.CreateCylinder("lp", { diameter: 0.12, height: 1.6 }, scene);
      pole.material = M("#3a2150"); add(pole, 0.8);
      const bulb = MeshBuilder.CreateSphere("lb", { diameter: 0.5, segments: 8 }, scene);
      bulb.material = M("#fff8d0", "#ffcf40"); add(bulb, 1.7);
      break;
    }
    case "rug": {
      const rug = MeshBuilder.CreateCylinder("r", { diameter: 3, height: 0.05, tessellation: 24 }, scene);
      rug.material = M("#b57bff"); add(rug, 0.03);
      break;
    }
    case "bed": {
      const mattress = MeshBuilder.CreateBox("m", { width: 2, height: 0.4, depth: 3 }, scene);
      mattress.material = M("#ffd9ec"); add(mattress, 0.3);
      const pillow = MeshBuilder.CreateBox("pi", { width: 1.6, height: 0.25, depth: 0.7 }, scene);
      pillow.material = M("#ffffff"); add(pillow, 0.6).position.z = -1;
      break;
    }
    case "teddy": {
      const body = MeshBuilder.CreateSphere("tb", { diameter: 0.6, segments: 8 }, scene);
      body.material = M("#c98a5e"); add(body, 0.3);
      const head = MeshBuilder.CreateSphere("th", { diameter: 0.4, segments: 8 }, scene);
      head.material = M("#c98a5e"); add(head, 0.75);
      break;
    }
    default: {
      const box = MeshBuilder.CreateBox("d", { size: 0.6 }, scene);
      box.material = M("#cccccc"); add(box, 0.3);
    }
  }
  return root;
}

function isDescendant(mesh, node) {
  let n = mesh;
  while (n) {
    if (n === node) return true;
    n = n.parent;
  }
  return false;
}

const round = (n) => Math.round(n * 100) / 100;

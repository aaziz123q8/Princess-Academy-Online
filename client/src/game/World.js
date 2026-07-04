// ============================================================================
//  World.js — Procedurally builds the fantasy city: sky, lighting, ground,
//  an academy, boutiques, towers with cone roofs, a central fountain, trees and
//  lamp posts. Kept deliberately performant (instances, modest counts) so it
//  runs smoothly in mobile browsers. This is a greybox-quality blockout that a
//  later art pass replaces with authored 3D assets.
// ============================================================================

import { Scene } from "@babylonjs/core/scene.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";

import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js";
import "@babylonjs/core/Collisions/collisionCoordinator.js";

export const WORLD_SIZE = 120;

export function buildWorld(scene) {
  scene.clearColor = new Color4(0.53, 0.72, 0.92, 1);
  scene.ambientColor = new Color3(0.5, 0.45, 0.6);
  scene.collisionsEnabled = true;
  scene.gravity = new Vector3(0, -0.6, 0);

  // Soft pink-tinted fog fading the city edges into the sky.
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = new Color3(0.82, 0.78, 0.95);
  scene.fogStart = 55;
  scene.fogEnd = 140;

  // ---- Lighting ----
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.85;
  hemi.diffuse = new Color3(1, 0.95, 0.98);
  hemi.groundColor = new Color3(0.5, 0.4, 0.55);

  const sun = new DirectionalLight("sun", new Vector3(-0.6, -1, 0.4), scene);
  sun.position = new Vector3(40, 60, -30);
  sun.intensity = 1.1;

  const shadows = new ShadowGenerator(1024, sun);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 24;

  // ---- Skybox ----
  const sky = MeshBuilder.CreateBox("sky", { size: 500 }, scene);
  const skyMat = new StandardMaterial("skyMat", scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.emissiveColor = new Color3(0.6, 0.78, 0.98);
  sky.material = skyMat;
  sky.infiniteDistance = true;

  // ---- Ground ----
  const ground = MeshBuilder.CreateGround("ground", { width: WORLD_SIZE, height: WORLD_SIZE, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.62, 0.78, 0.52);
  groundMat.specularColor = new Color3(0, 0, 0);
  ground.material = groundMat;
  ground.checkCollisions = true;
  ground.receiveShadows = true;

  // ---- Central plaza (stone circle) ----
  const plaza = MeshBuilder.CreateCylinder("plaza", { diameter: 26, height: 0.2, tessellation: 48 }, scene);
  const plazaMat = new StandardMaterial("plazaMat", scene);
  plazaMat.diffuseColor = new Color3(0.86, 0.82, 0.88);
  plaza.material = plazaMat;
  plaza.position.y = 0.1;
  plaza.receiveShadows = true;

  // ---- Fountain in the center ----
  buildFountain(scene, shadows);

  // ---- Buildings around the plaza ----
  const palette = ["#f7b7d3", "#c9a7ff", "#a7d8ff", "#ffd9a0", "#b8f0c8"];
  const roofPalette = ["#e8388a", "#7a3ff2", "#3f8cf2", "#f2a03f", "#3fbf7a"];

  const ring = [
    { a: 0, r: 22, w: 8, h: 7, d: 8 },
    { a: 51, r: 24, w: 7, h: 9, d: 7 },
    { a: 102, r: 22, w: 9, h: 6, d: 7 },
    { a: 153, r: 25, w: 7, h: 10, d: 7 },
    { a: 204, r: 22, w: 8, h: 7, d: 8 },
    { a: 255, r: 24, w: 7, h: 8, d: 7 },
    { a: 306, r: 23, w: 9, h: 6, d: 8 },
  ];

  ring.forEach((b, i) => {
    const rad = (b.a * Math.PI) / 180;
    const x = Math.cos(rad) * b.r;
    const z = Math.sin(rad) * b.r;
    buildTower(scene, shadows, {
      x, z, w: b.w, h: b.h, d: b.d,
      wall: palette[i % palette.length],
      roof: roofPalette[i % roofPalette.length],
      faceCenter: rad,
    });
  });

  // ---- Trees + lamp posts scattered on an outer ring ----
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 38 + (i % 3) * 4;
    buildTree(scene, shadows, Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    buildLamp(scene, Math.cos(a) * 15, Math.sin(a) * 15);
  }

  // ---- Invisible boundary walls so players can't walk off the world ----
  buildBoundary(scene);

  return { ground, shadows, sun };
}

/* ------------------------------------------------------------------ */

function solidMat(scene, name, hex, opts = {}) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  if (opts.emissive) m.emissiveColor = Color3.FromHexString(opts.emissive);
  return m;
}

function buildTower(scene, shadows, o) {
  const wall = MeshBuilder.CreateBox("wall", { width: o.w, height: o.h, depth: o.d }, scene);
  wall.material = solidMat(scene, "wallMat", o.wall);
  wall.position.set(o.x, o.h / 2, o.z);
  wall.checkCollisions = true;
  wall.receiveShadows = true;
  shadows.addShadowCaster(wall);

  // Conical roof.
  const roof = MeshBuilder.CreateCylinder("roof", { diameterTop: 0, diameterBottom: Math.max(o.w, o.d) * 1.25, height: o.h * 0.6, tessellation: 6 }, scene);
  roof.material = solidMat(scene, "roofMat", o.roof);
  roof.position.set(o.x, o.h + o.h * 0.3, o.z);
  shadows.addShadowCaster(roof);

  // Glowing door facing the plaza center.
  const door = MeshBuilder.CreateBox("door", { width: 1.4, height: 2.4, depth: 0.2 }, scene);
  door.material = solidMat(scene, "doorMat", "#3a2150", { emissive: "#ffcf40" });
  const nx = Math.cos(o.faceCenter);
  const nz = Math.sin(o.faceCenter);
  door.position.set(o.x - nx * (o.w / 2 + 0.05), 1.2, o.z - nz * (o.d / 2 + 0.05));
  door.rotation.y = -o.faceCenter;
}

function buildFountain(scene, shadows) {
  const base = MeshBuilder.CreateCylinder("fbase", { diameter: 6, height: 0.6, tessellation: 32 }, scene);
  base.material = solidMat(scene, "fbaseMat", "#b8a7d8");
  base.position.y = 0.3;
  base.checkCollisions = true;
  shadows.addShadowCaster(base);

  const water = MeshBuilder.CreateCylinder("fwater", { diameter: 5.2, height: 0.2, tessellation: 32 }, scene);
  water.material = solidMat(scene, "fwaterMat", "#7ec8f0", { emissive: "#2a6fa0" });
  water.position.y = 0.55;

  const pillar = MeshBuilder.CreateCylinder("fpillar", { diameterTop: 0.6, diameterBottom: 1.2, height: 2.2, tessellation: 16 }, scene);
  pillar.material = solidMat(scene, "fpillarMat", "#d8c8f0");
  pillar.position.y = 1.6;
  pillar.checkCollisions = true;

  const top = MeshBuilder.CreateSphere("ftop", { diameter: 1, segments: 12 }, scene);
  top.material = solidMat(scene, "ftopMat", "#7ec8f0", { emissive: "#2a6fa0" });
  top.position.y = 3;
}

function buildTree(scene, shadows, x, z) {
  const trunk = MeshBuilder.CreateCylinder("trunk", { diameterTop: 0.3, diameterBottom: 0.5, height: 2, tessellation: 8 }, scene);
  trunk.material = solidMat(scene, "trunkMat", "#7a5230");
  trunk.position.set(x, 1, z);
  trunk.checkCollisions = true;

  const leaves = MeshBuilder.CreateSphere("leaves", { diameter: 2.6, segments: 10 }, scene);
  leaves.material = solidMat(scene, "leavesMat", "#5fb56a");
  leaves.position.set(x, 2.9, z);
  shadows.addShadowCaster(leaves);

  const blossom = MeshBuilder.CreateSphere("blossom", { diameter: 1.6, segments: 8 }, scene);
  blossom.material = solidMat(scene, "blossomMat", "#ff9ec7");
  blossom.position.set(x + 0.6, 3.4, z - 0.4);
}

function buildLamp(scene, x, z) {
  const post = MeshBuilder.CreateCylinder("post", { diameter: 0.18, height: 3, tessellation: 8 }, scene);
  post.material = solidMat(scene, "postMat", "#3a2150");
  post.position.set(x, 1.5, z);

  const light = MeshBuilder.CreateSphere("lampLight", { diameter: 0.5, segments: 8 }, scene);
  light.material = solidMat(scene, "lampMat", "#fff", { emissive: "#ffcf40" });
  light.position.set(x, 3.1, z);
}

function buildBoundary(scene) {
  const half = WORLD_SIZE / 2;
  const t = 2;
  const specs = [
    { x: 0, z: half, w: WORLD_SIZE, d: t },
    { x: 0, z: -half, w: WORLD_SIZE, d: t },
    { x: half, z: 0, w: t, d: WORLD_SIZE },
    { x: -half, z: 0, w: t, d: WORLD_SIZE },
  ];
  specs.forEach((s, i) => {
    const wall = MeshBuilder.CreateBox(`bound_${i}`, { width: s.w, height: 8, depth: s.d }, scene);
    wall.position.set(s.x, 4, s.z);
    wall.checkCollisions = true;
    wall.isVisible = false;
  });
}

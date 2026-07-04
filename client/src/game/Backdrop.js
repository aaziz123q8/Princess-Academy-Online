// ============================================================================
//  Backdrop.js — A big painted landmark standing behind the city: the Princess
//  Academy castle. It's a 2D art cutout (an AI-generated image) shown on a tall
//  plane at the north edge, so the skyline gets a real hand-painted hero for
//  ZERO 3D cost. The source art sits on a white background; we key that white
//  out to transparent at runtime on a canvas, so the castle reads as a clean
//  cutout with no ugly white box — all client-side, no extra credits.
//
//  Drop the image at assets/backdrops/castle.png and it appears. If it's
//  missing, this silently does nothing (the city just has no backdrop).
// ============================================================================

import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";

const CASTLE_URL = "./assets/backdrops/castle.png";

// Where the castle stands and how big it looms over the city.
const POS = { x: 0, y: 21, z: -56 }; // north edge, base near the ground
const WIDTH = 54;
const ASPECT = 1; // source art is square (1:1)

/**
 * Load the castle art, key out its white background, and stand it up as a
 * skyline landmark. No-op (silent) if the image isn't present.
 */
export function addCastleBackdrop(scene) {
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    try {
      buildCutoutPlane(scene, img);
    } catch {
      /* any canvas/read quirk — skip the backdrop rather than break the world */
    }
  };
  img.onerror = () => {
    /* No castle.png uploaded yet — expected; the city just has no backdrop. */
  };
  img.src = CASTLE_URL;
}

function buildCutoutPlane(scene, img) {
  const w = img.width || 1024;
  const h = img.height || 1024;

  // Paint the art onto a canvas-backed texture, then punch out near-white pixels.
  const tex = new DynamicTexture("castleTex", { width: w, height: h }, scene, true);
  const ctx = tex.getContext();
  ctx.drawImage(img, 0, 0, w, h);

  const frame = ctx.getImageData(0, 0, w, h);
  const px = frame.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const lo = Math.min(r, g, b);
    if (r > 236 && g > 236 && b > 236) {
      px[i + 3] = 0; // solid white → fully transparent
    } else if (lo > 214) {
      // Soft feather on the near-white halo so edges aren't jagged.
      px[i + 3] = Math.max(0, Math.round(255 - (lo - 214) * (255 / 40)));
    }
  }
  ctx.putImageData(frame, 0, 0);
  tex.update();
  tex.hasAlpha = true;

  const mat = new StandardMaterial("castleBackdropMat", scene);
  mat.diffuseTexture = tex;
  mat.diffuseTexture.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.emissiveColor = new Color3(1, 1, 1); // show the art at full painted colour
  mat.disableLighting = true;               // flat art, not lit geometry
  mat.backFaceCulling = false;              // visible from both sides
  mat.transparencyMode = 2;                 // alpha blend

  const plane = MeshBuilder.CreatePlane(
    "castleBackdrop",
    { width: WIDTH, height: WIDTH / ASPECT },
    scene
  );
  plane.material = mat;
  plane.position.set(POS.x, POS.y, POS.z);
  plane.isPickable = false;
  plane.checkCollisions = false;
  plane.applyFog = false;
}

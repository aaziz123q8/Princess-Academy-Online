// ============================================================================
//  Cartoon.js — Whole-scene "animated movie" look, code-only (no textures, no
//  extra deps). Real cel-shaded films read as cartoon because of three things:
//    1) FLAT colour — surfaces keep their vivid hue in light AND in shadow,
//       instead of fading to muddy grey like a realistic render.
//    2) INK OUTLINES — every solid shape is drawn with a dark contour.
//    3) SOFT, PUNCHY light — gentle shadows, saturated palette, warm key.
//
//  We can't swap in a GLSL toon ramp without rewriting every material, so we
//  fake the cel look on the existing StandardMaterials: kill the plastic
//  specular highlight and lift each surface with a self-lit "fill" equal to a
//  fraction of its own diffuse colour. That fill keeps shadowed sides bright
//  and poster-flat — the single strongest cartoon signal — and it tracks the
//  material's colour, so recolouring a dress or a roof still looks right.
//
//  Call applyCartoonStyle(scene) ONCE after the world and all actors exist. It
//  styles every material present now, and hooks onNewMaterialAddedObservable so
//  actors spawned later (remote players joining, crates respawning) match too.
// ============================================================================

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { toonMesh } from "./Toon.js";

// How much of a surface's own colour is baked back in as flat self-fill.
// Higher = flatter / more "sticker" cartoon; lower = more visible shading.
const FLAT_FILL = 0.26;

// Meshes we never outline or flatten (backdrops, flat UI, huge planes).
const SKIP = /^(sky|ground|plaza|bound_|.*label|.*Sprite|.*water|petSprite)/i;

/**
 * Turn a plain lit StandardMaterial into a flat cel material:
 *   - remove the specular highlight (cartoons have no glossy hotspot),
 *   - add a self-lit fill so the colour stays vivid in shadow.
 * Glow materials (doors, gems, lamps, halos — anything that deliberately set a
 * bright emissive) are left to glow; we only drop their specular.
 */
export function cartoonizeMaterial(m) {
  if (!(m instanceof StandardMaterial)) return;
  if (m.__cartoon) return; // idempotent
  m.__cartoon = true;

  // Flat, matte surface — no plastic highlight.
  m.specularColor = new Color3(0, 0, 0);

  // Skip lightless UI/sprite materials (labels, billboards): they're already flat.
  if (m.disableLighting) return;

  const emissiveIsGlow =
    m.emissiveColor && (m.emissiveColor.r + m.emissiveColor.g + m.emissiveColor.b) > 0.05;

  if (!emissiveIsGlow && m.diffuseColor) {
    // Poster-flat fill: shadowed sides keep the hue instead of going grey.
    m.emissiveColor = m.diffuseColor.scale(FLAT_FILL);
    m.__cartoonFill = true;
  }
}

/**
 * Apply the cartoon look across the whole scene and keep new materials in sync.
 * Also inks an outline around solid shapes so the frame reads hand-drawn.
 */
export function applyCartoonStyle(scene) {
  scene.materials.forEach(cartoonizeMaterial);

  // Keep future materials (late-joining players, respawned crates) consistent.
  scene.onNewMaterialAddedObservable.add(cartoonizeMaterial);

  // Ink outlines on every solid mesh silhouette, skipping backdrops & flat UI.
  outlineScene(scene);
  scene.onNewMeshAddedObservable.add((mesh) => maybeOutline(mesh));
}

function outlineScene(scene) {
  scene.meshes.forEach(maybeOutline);
}

function maybeOutline(mesh) {
  if (!mesh || mesh.__outlined) return;
  const n = mesh.name || "";
  if (SKIP.test(n)) return;
  if (mesh.billboardMode) return; // billboards read as flat UI
  if (mesh.getTotalVertices && mesh.getTotalVertices() === 0) return;
  mesh.__outlined = true;
  // Thin, consistent contour. Characters already self-outline a touch heavier;
  // this width suits the mid/large environment shapes.
  toonMesh(mesh, 0.028);
}

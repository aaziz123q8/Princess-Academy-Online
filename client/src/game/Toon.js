// ============================================================================
//  Toon.js — Cartoon look helper. Adds a dark outline around game objects
//  (characters, pets, crates, pickups) — the classic "stylized cartoon" signal.
//  Environment stays un-outlined so the scene doesn't get noisy. This pushes
//  the render toward a Crash-style cartoon feel within the limits of code-only
//  primitives (true AAA still needs authored 3D models + textures).
// ============================================================================

import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import "@babylonjs/core/Rendering/outlineRenderer.js";

const OUTLINE = new Color3(0.14, 0.07, 0.18);

/** Give a single mesh a cartoon outline. */
export function toonMesh(mesh, width = 0.035) {
  if (!mesh) return;
  mesh.renderOutline = true;
  mesh.outlineColor = OUTLINE;
  mesh.outlineWidth = width;
}

/** Outline every child mesh of a node, skipping flat labels/sprites/billboards. */
export function toonNode(node, width = 0.035) {
  if (!node || !node.getChildMeshes) return;
  node.getChildMeshes().forEach((m) => {
    const n = m.name || "";
    if (n.includes("label") || n.includes("Sprite") || n.includes("Label")) return;
    if (m.billboardMode) return; // billboards read as flat UI, no outline
    toonMesh(m, width);
  });
}

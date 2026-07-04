// ============================================================================
//  ModelLoader.js — Load authored glTF/GLB 3D models (e.g. AI-generated ones
//  from Higgsfield, or free CC0 packs) and drop them into the scene. This is
//  the bridge from code-built primitives to real 3D art: put a .glb next to the
//  game and it appears; if it's missing or fails to load, callers fall back to
//  the primitive version so the game never breaks.
// ============================================================================

import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import "@babylonjs/loaders/glTF/2.0/glTFLoader.js";

/**
 * Load a GLB and attach it under `holder`, normalized to `targetHeight` metres
 * and resting on the ground. Resolves with the loaded meshes, or rejects if the
 * file is missing / invalid (so the caller can fall back).
 */
export async function loadModel(scene, url, holder, targetHeight = 1.4) {
  const slash = url.lastIndexOf("/");
  const rootUrl = url.slice(0, slash + 1);
  const file = url.slice(slash + 1);

  const res = await SceneLoader.ImportMeshAsync("", rootUrl, file, scene);
  const roots = res.meshes.filter((m) => !m.parent);
  roots.forEach((m) => (m.parent = holder));

  // Best-effort normalize: scale the holder so the model is `targetHeight` tall
  // and lift it so its feet sit at y = 0. Wrapped so a quirk never throws.
  try {
    let min = null;
    let max = null;
    res.meshes.forEach((m) => {
      m.computeWorldMatrix(true);
      const bi = m.getBoundingInfo && m.getBoundingInfo();
      if (!bi) return;
      const bmin = bi.boundingBox.minimumWorld;
      const bmax = bi.boundingBox.maximumWorld;
      min = min ? Vector3.Minimize(min, bmin) : bmin.clone();
      max = max ? Vector3.Maximize(max, bmax) : bmax.clone();
    });
    if (min && max) {
      const height = Math.max(0.001, max.y - min.y);
      const scale = targetHeight / height;
      holder.scaling.setAll(scale);
      roots.forEach((m) => (m.position.y -= min.y));
    }
  } catch {
    /* leave the model at its native transform */
  }

  return res.meshes;
}

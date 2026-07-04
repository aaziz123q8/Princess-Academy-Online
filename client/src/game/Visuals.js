// ============================================================================
//  Visuals.js — Cinematic post-processing to make the 3D world read as "real".
//  Adds a DefaultRenderingPipeline: anti-aliasing (FXAA + MSAA), bloom, ACES
//  tone mapping, contrast/exposure grading, a soft vignette, and subtle
//  sharpening. This is the single biggest code-only upgrade to the look.
// ============================================================================

import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js";
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent.js";

export function setupVisuals(scene, camera) {
  const pipe = new DefaultRenderingPipeline("cinematic", true, scene, [camera]);

  // Anti-aliasing for clean edges.
  pipe.samples = 4;
  pipe.fxaaEnabled = true;

  // Soft glow on bright/emissive surfaces (crowns, gems, lamps, windows).
  pipe.bloomEnabled = true;
  pipe.bloomThreshold = 0.72;
  pipe.bloomWeight = 0.35;
  pipe.bloomKernel = 64;
  pipe.bloomScale = 0.5;

  // Colour grading: filmic tone mapping + a touch more contrast and light.
  const ip = pipe.imageProcessing;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = 1; // ACES
  ip.exposure = 1.15;
  ip.contrast = 1.18;

  // Gentle vignette to focus the frame.
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 2.0;

  // Light sharpening keeps things crisp after AA.
  pipe.sharpenEnabled = true;
  pipe.sharpen.edgeAmount = 0.18;
  pipe.sharpen.colorAmount = 1.0;

  return pipe;
}

// ============================================================================
//  Visuals.js — Colour grade tuned for an animated-movie look (not a filmic /
//  photoreal one). The cartoon feel comes from flat materials + ink outlines
//  (see Cartoon.js); this pass makes the palette POP: boosted saturation, a
//  warm storybook tint, gentle contrast, soft glow on bright things, and a
//  light vignette. We deliberately avoid heavy ACES tone mapping, which crushes
//  and desaturates highlights — the opposite of a bright cartoon.
// ============================================================================

import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js";
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves.js";
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent.js";

export function setupVisuals(scene, camera) {
  const pipe = new DefaultRenderingPipeline("cinematic", true, scene, [camera]);

  // Clean edges — matters a lot once we draw crisp ink outlines.
  pipe.samples = 4;
  pipe.fxaaEnabled = true;

  // Soft dreamy glow on bright/emissive things (crowns, gems, lamps, windows).
  pipe.bloomEnabled = true;
  pipe.bloomThreshold = 0.68;
  pipe.bloomWeight = 0.42;
  pipe.bloomKernel = 64;
  pipe.bloomScale = 0.5;

  const ip = pipe.imageProcessing;

  // Light tone mapping only — keep colours bright and readable, don't crush them.
  ip.toneMappingEnabled = true;
  ip.toneMappingType = 0; // Standard, gentler than ACES for a bright toon look
  ip.exposure = 1.0;
  ip.contrast = 1.24;     // crisp poster contrast so colours don't wash out

  // The cartoon punch: richer, warmer colour — without lifting exposure (which
  // milked everything out), so hues stay deep and readable.
  const curves = new ColorCurves();
  curves.globalSaturation = 64;   // vivid, poster-like hues
  curves.globalHue = 5;           // nudge warm
  curves.highlightsSaturation = 30;
  curves.shadowsSaturation = 24;
  ip.colorCurvesEnabled = true;
  ip.colorCurves = curves;

  // Vignette frames the storybook shot and counters edge wash.
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 2.2;

  // A touch of sharpening keeps outlines and edges crisp after AA.
  pipe.sharpenEnabled = true;
  pipe.sharpen.edgeAmount = 0.16;
  pipe.sharpen.colorAmount = 1.0;

  return pipe;
}

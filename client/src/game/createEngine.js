// ============================================================================
//  createEngine.js — Boot the best available renderer.
//  Tries WebGPU first (modern, faster); falls back to WebGL2/WebGL automatically
//  so the game runs on every desktop and mobile browser.
// ============================================================================

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine.js";

export async function createEngine(canvas) {
  const canUseWebGPU =
    typeof navigator !== "undefined" && !!navigator.gpu && WebGPUEngine.IsSupportedAsync;

  if (canUseWebGPU) {
    try {
      const supported = await WebGPUEngine.IsSupportedAsync;
      if (supported) {
        const engine = new WebGPUEngine(canvas, {
          antialias: true,
          adaptToDeviceRatio: true,
        });
        await engine.initAsync();
        engine.__backend = "webgpu";
        return engine;
      }
    } catch (err) {
      // WebGPU present but failed to initialise — fall through to WebGL.
      console.warn("[engine] WebGPU init failed, falling back to WebGL:", err);
    }
  }

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    // Cap devicePixelRatio on mobile so high-DPI phones stay at a smooth framerate.
    adaptToDeviceRatio: true,
    powerPreference: "high-performance",
  });
  engine.__backend = "webgl";
  return engine;
}

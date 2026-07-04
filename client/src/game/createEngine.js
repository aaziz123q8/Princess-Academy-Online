// ============================================================================
//  createEngine.js — Boot the renderer.
//  We default to WebGL2, which is stable and supported across every modern
//  desktop and mobile browser. WebGPU is still experimental on mobile (it was
//  causing load failures on some Android browsers), so it stays OFF until it's
//  verified per-platform. Flip PREFER_WEBGPU to true to opt back in later.
// ============================================================================

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine.js";

const PREFER_WEBGPU = false;

export async function createEngine(canvas) {
  if (PREFER_WEBGPU && typeof navigator !== "undefined" && navigator.gpu) {
    try {
      const supported = await WebGPUEngine.IsSupportedAsync;
      if (supported) {
        const engine = new WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: true });
        await engine.initAsync();
        engine.__backend = "webgpu";
        return engine;
      }
    } catch (err) {
      console.warn("[engine] WebGPU init failed, falling back to WebGL:", err);
    }
  }

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    adaptToDeviceRatio: true,
    powerPreference: "high-performance",
    // Keep going if the GPU context is briefly lost (mobile tab switches, etc.).
    doNotHandleContextLost: false,
  });
  engine.__backend = "webgl";
  return engine;
}

# 3D Models

The game auto-upgrades the pet's look when a real 3D model is present here.

## pet.glb — the companion pet

`PetCompanion.js` tries to load `assets/models/pet.glb` first. If it's missing
it silently falls back to a `pet.png` sprite, and then to the built-in
primitive pet — so the game never breaks.

To add the AI-generated dragon:

1. Download the GLB from the Higgsfield link provided in chat.
2. Rename it to **`pet.glb`**.
3. Drop it in this folder: `assets/models/pet.glb`.

It appears in-game on the next load — no code change needed. The loader
normalizes height and rests it on the ground automatically (`ModelLoader.js`).

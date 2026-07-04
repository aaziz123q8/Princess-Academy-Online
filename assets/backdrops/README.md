# Backdrops

Large painted art landmarks that stand behind the city skyline. They cost zero
3D credits — they're 2D images shown on tall planes, with their white
background keyed out to transparent automatically at runtime (see
`client/src/game/Backdrop.js`).

## castle.png — the Princess Academy castle

The game looks for `assets/backdrops/castle.png` and, if present, stands it up
as a giant castle on the north skyline. If it's missing, the city simply has no
backdrop (no error).

To add the AI-generated academy castle:

1. Download the castle image from the Higgsfield link provided in chat.
2. Rename it to **`castle.png`**.
3. Drop it in this folder: `assets/backdrops/castle.png`.

Keep the art on a plain white background — the code turns that white
transparent, so the castle appears as a clean cutout, no white box.

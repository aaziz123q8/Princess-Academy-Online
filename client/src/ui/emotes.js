// ============================================================================
//  emotes.js — Quick emote bar. Tapping an emote plays an avatar animation
//  (and, once multiplayer is on, will broadcast it to nearby players).
// ============================================================================

import { sound } from "../game/Sound.js";

const EMOTES = [
  { id: "wave", icon: "👋" },
  { id: "cheer", icon: "🙌" },
  { id: "dance", icon: "💃" },
  { id: "spin", icon: "🌀" },
];

export function initEmotes(game) {
  const bar = document.getElementById("emoteBar");
  const btn = document.getElementById("emoteBtn");
  if (!bar || !btn) return;

  bar.innerHTML = "";
  EMOTES.forEach((e) => {
    const b = document.createElement("button");
    b.className = "emote-item";
    b.textContent = e.icon;
    b.setAttribute("aria-label", e.id);
    b.addEventListener("click", () => {
      game.playEmote(e.id);
      sound.click();
      bar.classList.add("hidden");
    });
    bar.appendChild(b);
  });

  btn.addEventListener("click", () => bar.classList.toggle("hidden"));
}

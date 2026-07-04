// ============================================================================
//  houseUI.js — DOM controls for the house feature.
//  In the city: a proximity "Enter House" button. Inside: a controls bar with
//  Decorate (opens the furniture palette), Remove, and Exit. Wires the buttons
//  to the game's house methods. Returns the onCanEnter handler that the game
//  calls when the player walks in/out of range of the cottage.
// ============================================================================

import { FURNITURE } from "../game/House.js";
import { sound } from "../game/Sound.js";

const ICONS = {
  table: "🟫",
  chair: "🪑",
  plant: "🪴",
  lamp: "💡",
  rug: "🟪",
  bed: "🛏️",
  teddy: "🧸",
};

export function initHouseUI(game) {
  const el = {
    enter: document.getElementById("enterHouseBtn"),
    bar: document.getElementById("houseBar"),
    decor: document.getElementById("decorToggle"),
    palette: document.getElementById("furnPalette"),
    remove: document.getElementById("removeToggle"),
    exit: document.getElementById("exitHouseBtn"),
  };
  if (!el.enter) return () => {};

  let decorating = false;
  let removing = false;

  // Build the furniture palette once.
  el.palette.innerHTML = "";
  FURNITURE.forEach((type, i) => {
    const b = document.createElement("button");
    b.className = "furn-item" + (i === 0 ? " active" : "");
    b.textContent = ICONS[type] || "▫";
    b.setAttribute("aria-label", type);
    b.addEventListener("click", () => {
      game.houseSelect(type);
      removing = false;
      el.remove.classList.remove("active");
      game.houseRemoveMode(false);
      [...el.palette.children].forEach((c) => c.classList.remove("active"));
      b.classList.add("active");
      sound.click();
    });
    el.palette.appendChild(b);
  });

  const setDecorUI = (on) => {
    decorating = on;
    game.houseDecorate(on);
    el.palette.classList.toggle("hidden", !on);
    el.remove.classList.toggle("hidden", !on);
    el.decor.classList.toggle("active", on);
    if (!on) {
      removing = false;
      el.remove.classList.remove("active");
      game.houseRemoveMode(false);
    }
  };

  el.enter.addEventListener("click", () => {
    game.enterHouse();
    el.enter.classList.add("hidden");
    el.bar.classList.remove("hidden");
    setDecorUI(false);
  });

  el.decor.addEventListener("click", () => {
    setDecorUI(!decorating);
    sound.click();
  });

  el.remove.addEventListener("click", () => {
    removing = !removing;
    game.houseRemoveMode(removing);
    el.remove.classList.toggle("active", removing);
    sound.click();
  });

  el.exit.addEventListener("click", () => {
    game.exitHouse();
    el.bar.classList.add("hidden");
    setDecorUI(false);
  });

  // Returned to the game: toggles the "Enter House" prompt on proximity.
  return (canEnter) => {
    if (game.houseIsInside()) return;
    el.enter.classList.toggle("hidden", !canEnter);
  };
}

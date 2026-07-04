// ============================================================================
//  houseUI.js — DOM controls for the house feature + furniture shop.
//  In the city: a proximity "Enter House" button. Inside: Decorate (opens the
//  furniture palette), Remove, and Exit. Some furniture is free; premium pieces
//  cost coins/gems and unlock permanently (persisted). Returns the onCanEnter
//  handler the game calls when the player nears the cottage.
// ============================================================================

import { FURNITURE } from "../game/House.js";
import { t } from "./i18n.js";
import { sound } from "../game/Sound.js";

const ICONS = { table: "🟫", chair: "🪑", plant: "🪴", lamp: "💡", rug: "🟪", bed: "🛏️", teddy: "🧸" };
// Price per piece. c = coins, g = gems, 0 = free.
const PRICES = {
  table: { c: 0 }, chair: { c: 0 }, rug: { c: 0 },
  plant: { c: 20 }, lamp: { c: 30 }, bed: { c: 60 }, teddy: { g: 3 },
};
const OWNED_KEY = "pao.ownedFurniture";

function loadOwned() {
  const owned = new Set();
  try { JSON.parse(localStorage.getItem(OWNED_KEY) || "[]").forEach((x) => owned.add(x)); } catch {}
  FURNITURE.forEach((f) => { const p = PRICES[f]; if (p && (p.c === 0) && p.g == null) owned.add(f); });
  return owned;
}
function saveOwned(set) { localStorage.setItem(OWNED_KEY, JSON.stringify([...set])); }

export function initHouseUI(game, hud) {
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
  const owned = loadOwned();

  const priceLabel = (f) => {
    const p = PRICES[f];
    if (!p || (p.c === 0 && p.g == null)) return "";
    return p.g != null ? `${p.g}💎` : `${p.c}🪙`;
  };

  const renderPalette = () => {
    el.palette.innerHTML = "";
    FURNITURE.forEach((type, i) => {
      const b = document.createElement("button");
      b.className = "furn-item" + (i === 0 ? " active" : "");
      b.innerHTML = `<span class="furn-icon">${ICONS[type] || "▫"}</span>`;
      if (!owned.has(type)) {
        const badge = document.createElement("span");
        badge.className = "furn-price";
        badge.textContent = priceLabel(type);
        b.appendChild(badge);
        b.classList.add("locked");
      }
      b.setAttribute("aria-label", type);
      b.addEventListener("click", () => onPick(type, b));
      el.palette.appendChild(b);
    });
  };

  const onPick = (type, btn) => {
    if (!owned.has(type)) {
      // Buy it.
      const p = PRICES[type];
      const currency = p.g != null ? "gems" : "coins";
      const cost = p.g != null ? p.g : p.c;
      if (hud.state[currency] < cost) { sound.click(); hud.floatReward(t("wardrobe.needMore")); return; }
      if (currency === "gems") hud.addGems(-cost); else hud.addCoins(-cost);
      owned.add(type);
      saveOwned(owned);
      sound.coin();
      hud.floatReward(t("wardrobe.unlocked"));
      renderPalette();
    }
    game.houseSelect(type);
    removing = false;
    el.remove.classList.remove("active");
    game.houseRemoveMode(false);
    [...el.palette.children].forEach((c) => c.classList.remove("active"));
    // Re-find the button for this type (palette may have re-rendered).
    const idx = FURNITURE.indexOf(type);
    if (el.palette.children[idx]) el.palette.children[idx].classList.add("active");
    sound.click();
  };

  renderPalette();

  const setDecorUI = (on) => {
    decorating = on;
    game.houseDecorate(on);
    el.palette.classList.toggle("hidden", !on);
    el.remove.classList.toggle("hidden", !on);
    el.decor.classList.toggle("active", on);
    if (!on) { removing = false; el.remove.classList.remove("active"); game.houseRemoveMode(false); }
  };

  el.enter.addEventListener("click", () => {
    game.enterHouse();
    el.enter.classList.add("hidden");
    el.bar.classList.remove("hidden");
    setDecorUI(false);
  });
  el.decor.addEventListener("click", () => { setDecorUI(!decorating); sound.click(); });
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

  return (canEnter) => {
    if (game.houseIsInside()) return;
    el.enter.classList.toggle("hidden", !canEnter);
  };
}

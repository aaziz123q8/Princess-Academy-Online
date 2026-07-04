// ============================================================================
//  wardrobe.js — Character customization + shop.
//  Players change skin / hair / dress / crown colours; the avatar updates live.
//  Some items are free (owned from the start); premium items cost coins or gems
//  and unlock permanently. Selection + owned items persist to localStorage and
//  are ready to sync to the server later.
// ============================================================================

import { t, onLanguageChange } from "./i18n.js";
import { sound } from "../game/Sound.js";

// Catalog. price>0 with currency 'coin' or 'gem'; price 0 = free/owned.
const CATALOG = {
  skin: [
    { id: "skin_light", color: "#ffd9c0", price: 0 },
    { id: "skin_warm", color: "#f0b892", price: 0 },
    { id: "skin_tan", color: "#c98a5e", price: 0 },
    { id: "skin_deep", color: "#8d5a3b", price: 0 },
  ],
  hair: [
    { id: "hair_brown", color: "#5b3a29", price: 0 },
    { id: "hair_black", color: "#2b2b2b", price: 0 },
    { id: "hair_blonde", color: "#e9b44c", price: 0 },
    { id: "hair_pink", color: "#e67ea3", price: 40, currency: "coin" },
    { id: "hair_purple", color: "#8e44ad", price: 60, currency: "coin" },
    { id: "hair_silver", color: "#d8d8e8", price: 3, currency: "gem" },
  ],
  dress: [
    { id: "dress_pink", color: "#ff5fa2", price: 0 },
    { id: "dress_sky", color: "#7ec8e3", price: 0 },
    { id: "dress_mint", color: "#8fd694", price: 40, currency: "coin" },
    { id: "dress_gold", color: "#ffd166", price: 80, currency: "coin" },
    { id: "dress_royal", color: "#7a3ff2", price: 5, currency: "gem" },
    { id: "dress_ruby", color: "#e0245e", price: 6, currency: "gem" },
  ],
  crown: [
    { id: "crown_gold", color: "#ffcf40", price: 0 },
    { id: "crown_rose", color: "#ff8fab", price: 30, currency: "coin" },
    { id: "crown_emerald", color: "#3fbf7a", price: 3, currency: "gem" },
    { id: "crown_diamond", color: "#bfe9ff", price: 8, currency: "gem" },
  ],
};

const TABS = ["skin", "hair", "dress", "crown"];
const OWNED_KEY = "pao.owned";
const LOOK_KEY = "pao.appearance";

function loadOwned() {
  try {
    const saved = JSON.parse(localStorage.getItem(OWNED_KEY) || "[]");
    return new Set(saved);
  } catch {
    return new Set();
  }
}
function saveOwned(set) {
  localStorage.setItem(OWNED_KEY, JSON.stringify([...set]));
}

export function loadAppearance() {
  try {
    return JSON.parse(localStorage.getItem(LOOK_KEY)) || defaultLook();
  } catch {
    return defaultLook();
  }
}
function defaultLook() {
  return { skin: "#ffd9c0", hair: "#5b3a29", dress: "#ff5fa2", crown: "#ffcf40" };
}
function saveAppearance(look) {
  localStorage.setItem(LOOK_KEY, JSON.stringify(look));
}

export class Wardrobe {
  /** @param {{game, hud}} deps */
  constructor({ game, hud }) {
    this.game = game;
    this.hud = hud;
    this.owned = loadOwned();
    this.look = loadAppearance();
    this.activeTab = "skin";

    // Everything free is implicitly owned.
    for (const cat of TABS) {
      for (const item of CATALOG[cat]) if (item.price === 0) this.owned.add(item.id);
    }
    saveOwned(this.owned);

    this.el = {
      screen: document.getElementById("wardrobeScreen"),
      tabs: document.getElementById("wardrobeTabs"),
      grid: document.getElementById("wardrobeGrid"),
      coins: document.getElementById("wardrobeCoins"),
      gems: document.getElementById("wardrobeGems"),
      openBtn: document.getElementById("wardrobeBtn"),
      closeBtn: document.getElementById("closeWardrobe"),
    };

    this.el.openBtn?.addEventListener("click", () => this.open());
    this.el.closeBtn?.addEventListener("click", () => this.close());
    onLanguageChange(() => { if (this._isOpen()) this._render(); });

    // Apply the saved look to the avatar at startup.
    this.game.setAppearance(this.look);
  }

  _isOpen() {
    return this.el.screen && !this.el.screen.classList.contains("hidden");
  }

  open() {
    this._buildTabs();
    this._render();
    this.el.screen.classList.remove("hidden");
    sound.click();
  }
  close() {
    this.el.screen.classList.add("hidden");
    saveAppearance(this.look);
    sound.click();
  }

  _buildTabs() {
    this.el.tabs.innerHTML = "";
    TABS.forEach((cat) => {
      const b = document.createElement("button");
      b.className = "wardrobe-tab" + (cat === this.activeTab ? " active" : "");
      b.textContent = t(`wardrobe.tab.${cat}`);
      b.addEventListener("click", () => { this.activeTab = cat; this._buildTabs(); this._render(); });
      this.el.tabs.appendChild(b);
    });
  }

  _render() {
    this.el.coins.textContent = this.hud.state.coins;
    this.el.gems.textContent = this.hud.state.gems;
    this.el.grid.innerHTML = "";

    CATALOG[this.activeTab].forEach((item) => {
      const owned = this.owned.has(item.id);
      const selected = this.look[this.activeTab] === item.color;

      const cell = document.createElement("button");
      cell.className = "wardrobe-item" + (selected ? " selected" : "");

      const sw = document.createElement("span");
      sw.className = "wardrobe-swatch";
      sw.style.background = item.color;
      cell.appendChild(sw);

      const tag = document.createElement("span");
      tag.className = "wardrobe-tag";
      if (owned) {
        tag.textContent = selected ? "✓" : "";
      } else {
        const icon = item.currency === "gem" ? "💎" : "🪙";
        tag.textContent = `${item.price}${icon}`;
        cell.classList.add("locked");
      }
      cell.appendChild(tag);

      cell.addEventListener("click", () => this._onItem(item, owned));
      this.el.grid.appendChild(cell);
    });
  }

  _onItem(item, owned) {
    if (owned) {
      this._equip(item);
      return;
    }
    // Attempt purchase.
    const currency = item.currency === "gem" ? "gems" : "coins";
    if (this.hud.state[currency] < item.price) {
      sound.click();
      this.hud.floatReward(t("wardrobe.needMore"));
      return;
    }
    if (currency === "gems") this.hud.addGems(-item.price);
    else this.hud.addCoins(-item.price);
    this.owned.add(item.id);
    saveOwned(this.owned);
    sound.coin();
    this.hud.floatReward(t("wardrobe.unlocked"));
    this._equip(item);
    this._render();
  }

  _equip(item) {
    this.look[this.activeTab] = item.color;
    this.game.setAppearance({ [this.activeTab]: item.color });
    saveAppearance(this.look);
    sound.click();
    this._render();
  }
}

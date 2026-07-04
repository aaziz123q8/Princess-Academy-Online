// ============================================================================
//  wardrobe.js — Character customization + shop.
//  Colour tabs (skin/hair/dress/crown) recolour the avatar; type tabs
//  (hairStyle/accessory) swap meshes. Free items are owned from the start;
//  premium items cost coins or gems and unlock permanently. Selection + owned
//  items persist to localStorage, ready to sync to the server later.
// ============================================================================

import { t, onLanguageChange } from "./i18n.js";
import { sound } from "../game/Sound.js";

// kind "color" items use `color`; kind "type" items use `value` + `icon`.
const CATALOG = {
  skin: { kind: "color", items: [
    { id: "skin_light", color: "#ffd9c0", price: 0 },
    { id: "skin_warm", color: "#f0b892", price: 0 },
    { id: "skin_tan", color: "#c98a5e", price: 0 },
    { id: "skin_deep", color: "#8d5a3b", price: 0 },
  ]},
  hair: { kind: "color", items: [
    { id: "hair_brown", color: "#5b3a29", price: 0 },
    { id: "hair_black", color: "#2b2b2b", price: 0 },
    { id: "hair_blonde", color: "#e9b44c", price: 0 },
    { id: "hair_pink", color: "#e67ea3", price: 40, currency: "coin" },
    { id: "hair_purple", color: "#8e44ad", price: 60, currency: "coin" },
    { id: "hair_silver", color: "#d8d8e8", price: 3, currency: "gem" },
  ]},
  hairStyle: { kind: "type", items: [
    { id: "hs_short", value: "short", icon: "👩", price: 0 },
    { id: "hs_long", value: "long", icon: "💇‍♀️", price: 0 },
    { id: "hs_pony", value: "ponytail", icon: "🎀", price: 30, currency: "coin" },
    { id: "hs_bun", value: "bun", icon: "🧑‍🦰", price: 50, currency: "coin" },
  ]},
  dress: { kind: "color", items: [
    { id: "dress_pink", color: "#ff5fa2", price: 0 },
    { id: "dress_sky", color: "#7ec8e3", price: 0 },
    { id: "dress_mint", color: "#8fd694", price: 40, currency: "coin" },
    { id: "dress_gold", color: "#ffd166", price: 80, currency: "coin" },
    { id: "dress_royal", color: "#7a3ff2", price: 5, currency: "gem" },
    { id: "dress_ruby", color: "#e0245e", price: 6, currency: "gem" },
  ]},
  crown: { kind: "color", items: [
    { id: "crown_gold", color: "#ffcf40", price: 0 },
    { id: "crown_rose", color: "#ff8fab", price: 30, currency: "coin" },
    { id: "crown_emerald", color: "#3fbf7a", price: 3, currency: "gem" },
    { id: "crown_diamond", color: "#bfe9ff", price: 8, currency: "gem" },
  ]},
  accessory: { kind: "type", items: [
    { id: "ac_none", value: "none", icon: "🚫", price: 0 },
    { id: "ac_glasses", value: "glasses", icon: "👓", price: 25, currency: "coin" },
    { id: "ac_wings", value: "wings", icon: "🧚", price: 5, currency: "gem" },
    { id: "ac_halo", value: "halo", icon: "😇", price: 4, currency: "gem" },
  ]},
};

const TABS = ["skin", "hair", "hairStyle", "dress", "crown", "accessory"];
const OWNED_KEY = "pao.owned";
const LOOK_KEY = "pao.appearance";

const itemValue = (item) => (item.color != null ? item.color : item.value);

function loadOwned() {
  try { return new Set(JSON.parse(localStorage.getItem(OWNED_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveOwned(set) { localStorage.setItem(OWNED_KEY, JSON.stringify([...set])); }

export function loadAppearance() {
  try { return { ...defaultLook(), ...JSON.parse(localStorage.getItem(LOOK_KEY)) }; }
  catch { return defaultLook(); }
}
function defaultLook() {
  return { skin: "#ffd9c0", hair: "#5b3a29", hairStyle: "short", dress: "#ff5fa2", crown: "#ffcf40", accessory: "none" };
}
function saveAppearance(look) { localStorage.setItem(LOOK_KEY, JSON.stringify(look)); }

export class Wardrobe {
  constructor({ game, hud }) {
    this.game = game;
    this.hud = hud;
    this.owned = loadOwned();
    this.look = loadAppearance();
    this.activeTab = "skin";

    for (const cat of TABS) {
      for (const item of CATALOG[cat].items) if (item.price === 0) this.owned.add(item.id);
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

    // Apply the saved look (colours + hair style + accessory) at startup.
    this.game.setAppearance(this.look);
  }

  _isOpen() { return this.el.screen && !this.el.screen.classList.contains("hidden"); }

  open() { this._buildTabs(); this._render(); this.el.screen.classList.remove("hidden"); sound.click(); }
  close() { this.el.screen.classList.add("hidden"); saveAppearance(this.look); sound.click(); }

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
    const cat = CATALOG[this.activeTab];

    cat.items.forEach((item) => {
      const val = itemValue(item);
      const owned = this.owned.has(item.id);
      const selected = this.look[this.activeTab] === val;

      const cell = document.createElement("button");
      cell.className = "wardrobe-item" + (selected ? " selected" : "");

      const sw = document.createElement("span");
      sw.className = "wardrobe-swatch";
      if (cat.kind === "color") sw.style.background = item.color;
      else { sw.classList.add("icon"); sw.textContent = item.icon; }
      cell.appendChild(sw);

      const tag = document.createElement("span");
      tag.className = "wardrobe-tag";
      if (owned) tag.textContent = selected ? "✓" : "";
      else { tag.textContent = `${item.price}${item.currency === "gem" ? "💎" : "🪙"}`; cell.classList.add("locked"); }
      cell.appendChild(tag);

      cell.addEventListener("click", () => this._onItem(item, owned));
      this.el.grid.appendChild(cell);
    });
  }

  _onItem(item, owned) {
    if (owned) { this._equip(item); return; }
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
  }

  _equip(item) {
    const val = itemValue(item);
    this.look[this.activeTab] = val;
    this.game.setAppearance({ [this.activeTab]: val });
    saveAppearance(this.look);
    sound.click();
    this._render();
  }
}

// ============================================================================
//  main.js — Application entry point.
//  Orchestrates screens (loading → auth → game), localization, the HUD, and the
//  Babylon game instance. Wiring only; gameplay lives under ./game and UI under
//  ./ui. Works fully offline (guest mode) if the backend is unreachable.
// ============================================================================

import "./ui/styles.css";
import { applyToDocument, bindLanguageButtons, setLanguage, getLanguage, t, onLanguageChange } from "./ui/i18n.js";
import { api } from "./ui/api.js";
import { Hud } from "./ui/hud.js";
import { Game } from "./game/Game.js";

const els = {
  loading: document.getElementById("loadingScreen"),
  loaderFill: document.getElementById("loaderFill"),
  loaderStatus: document.getElementById("loaderStatus"),
  auth: document.getElementById("authScreen"),
  authForm: document.getElementById("authForm"),
  authError: document.getElementById("authError"),
  authSubmit: document.getElementById("authSubmit"),
  tabLogin: document.getElementById("tabLogin"),
  tabRegister: document.getElementById("tabRegister"),
  fieldUsername: document.getElementById("fieldUsername"),
  guestBtn: document.getElementById("guestBtn"),
  settings: document.getElementById("settingsScreen"),
  settingsBtn: document.getElementById("settingsBtn"),
  closeSettings: document.getElementById("closeSettings"),
  logoutBtn: document.getElementById("logoutBtn"),
  joystick: document.getElementById("touchJoystick"),
  joystickKnob: document.getElementById("joystickKnob"),
  jumpBtn: document.getElementById("jumpBtn"),
};

let authMode = "login"; // or "register"
let game = null;
const hud = new Hud();

// ---- Boot ----
init();

function init() {
  // Apply the saved/detected language to the whole document up front.
  setLanguage(getLanguage());
  bindLanguageButtons(document.getElementById("authLangSwitch"));
  bindLanguageButtons(document.getElementById("settingsLangSwitch"));
  onLanguageChange(() => applyToDocument());

  wireAuthUI();
  wireSettings();

  // Show a brief branded loading beat, then route to auth or straight into the
  // game if a valid session token already exists.
  progress(0.4, "loading.booting");
  setTimeout(() => {
    hide(els.loading);
    if (api.isLoggedIn()) {
      api.getProfile()
        .then((p) => enterGame(p))
        .catch(() => show(els.auth)); // token expired/invalid → ask to log in
    } else {
      show(els.auth);
    }
  }, 600);
}

/* ------------------------------- Auth UI ------------------------------- */

function wireAuthUI() {
  const setMode = (mode) => {
    authMode = mode;
    els.tabLogin.classList.toggle("active", mode === "login");
    els.tabRegister.classList.toggle("active", mode === "register");
    els.fieldUsername.style.display = mode === "register" ? "" : "none";
    els.authSubmit.textContent = t(mode === "login" ? "auth.login" : "auth.register");
    els.authError.textContent = "";
  };
  els.tabLogin.addEventListener("click", () => setMode("login"));
  els.tabRegister.addEventListener("click", () => setMode("register"));
  onLanguageChange(() => setMode(authMode)); // keep submit label localized
  setMode("login");

  els.authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.authError.textContent = "";
    const fd = new FormData(els.authForm);
    const creds = {
      username: (fd.get("username") || "").toString().trim(),
      email: (fd.get("email") || "").toString().trim(),
      password: (fd.get("password") || "").toString(),
    };
    els.authSubmit.disabled = true;
    try {
      const profile = authMode === "register" ? await api.register(creds) : await api.login(creds);
      enterGame(profile);
    } catch (err) {
      els.authError.textContent = t(mapAuthError(err));
    } finally {
      els.authSubmit.disabled = false;
    }
  });

  els.guestBtn.addEventListener("click", () => {
    // Offline/guest profile — no server needed.
    enterGame({ name: guestName(), level: 1, coins: 100, gems: 5, xp: 0, xpMax: 100, guest: true });
  });
}

function mapAuthError(err) {
  if (err.status === 401) return "auth.error.invalid";
  if (err.status === 409 || err.code === "exists") return "auth.error.exists";
  if (err.status == null) return "auth.error.offline"; // network failure
  return "auth.error.generic";
}

function guestName() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `Princess${n}`;
}

/* ------------------------------ Settings ------------------------------ */

function wireSettings() {
  els.settingsBtn?.addEventListener("click", () => show(els.settings));
  els.closeSettings?.addEventListener("click", () => hide(els.settings));
  els.logoutBtn?.addEventListener("click", () => {
    api.logout();
    location.reload();
  });
}

/* ------------------------------ Enter game ---------------------------- */

async function enterGame(profile) {
  hide(els.auth);
  show(els.loading);
  progress(0.1, "loading.engine");

  hud.setProfile({
    name: profile.name,
    level: profile.level ?? 1,
    coins: profile.coins ?? 0,
    gems: profile.gems ?? 0,
    xp: profile.xp ?? 0,
    xpMax: profile.xpMax ?? 100,
  });

  const canvas = document.getElementById("gameCanvas");
  game = new Game(canvas);
  await game.start({
    profile: { name: profile.name, dress: profile.dress, hair: profile.hair, skin: profile.skin },
    multiplayer: true,
    onProgress: (p, key) => progress(0.1 + p * 0.9, key),
    onChat: (m) => hud.chatMessage(m),
    onSystem: (key, params) => hud.systemMessage(key, params),
  });
  game.attachTouchControls(els.joystick, els.joystickKnob, els.jumpBtn);

  // Chat send → network.
  hud.onChatSubmit((text) => {
    game.sendChat(text);
    hud.chatMessage({ name: profile.name, text, self: true });
  });

  hide(els.loading);
  hud.show();
  hud.systemMessage("chat.welcome");

  // Small welcome reward to demonstrate the economy/XP loop end-to-end.
  if (!profile.guest) scheduleAutosave(profile);
}

/**
 * Periodically persist progress to the backend so a session survives refresh.
 * Skipped for guests (nothing to save server-side).
 */
function scheduleAutosave(profile) {
  setInterval(() => {
    api.saveProgress({
      level: hud.state.level,
      coins: hud.state.coins,
      gems: hud.state.gems,
      xp: hud.state.xp,
      xpMax: hud.state.xpMax,
    }).catch(() => {}); // ignore transient network errors
  }, 15000);
}

/* ------------------------------- helpers ------------------------------ */

function progress(pct, statusKey) {
  els.loaderFill.style.width = `${Math.round(pct * 100)}%`;
  if (statusKey) els.loaderStatus.textContent = t(statusKey);
}
function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

// ============================================================================
//  i18n.js — Bilingual localization engine (Arabic / English) with RTL support
// ----------------------------------------------------------------------------
//  Rules of this project:
//   * No user-facing string is hard-coded. Everything goes through t(key).
//   * Switching language is instant and updates the document direction (RTL/LTR).
//   * The choice is persisted so the player keeps their language next visit.
// ============================================================================

import en from "./locales/en.json";
import ar from "./locales/ar.json";

const TABLES = { en, ar };
const RTL_LANGS = new Set(["ar"]);
const STORAGE_KEY = "pao.lang";

/** Simple event emitter so any system can react to a language change. */
const listeners = new Set();

let current = detectInitialLanguage();

function detectInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && TABLES[saved]) return saved;
  // Fall back to the browser language, defaulting to English.
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  return TABLES[nav] ? nav : "en";
}

/**
 * Translate a key, with optional {placeholder} interpolation.
 * Falls back to English, then to the raw key, so nothing ever renders blank.
 */
export function t(key, params) {
  const table = TABLES[current] || TABLES.en;
  let str = table[key];
  if (str == null) str = TABLES.en[key];
  if (str == null) return key; // visible-but-safe fallback for missing keys
  if (params) {
    str = str.replace(/\{(\w+)\}/g, (m, name) =>
      params[name] != null ? String(params[name]) : m
    );
  }
  return str;
}

export function getLanguage() {
  return current;
}

export function isRTL() {
  return RTL_LANGS.has(current);
}

/** Change language, persist it, update the DOM, and notify listeners. */
export function setLanguage(lang) {
  if (!TABLES[lang] || lang === current) {
    // Still re-apply DOM in case this is the first call.
    if (TABLES[lang]) current = lang;
  } else {
    current = lang;
  }
  localStorage.setItem(STORAGE_KEY, current);
  applyToDocument();
  listeners.forEach((fn) => fn(current));
}

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Apply the current language to the whole document:
 *  - sets <html lang> and dir (rtl/ltr)
 *  - fills every [data-i18n] element's text
 *  - fills every [data-i18n-ph] element's placeholder
 *  - marks the active language button
 */
export function applyToDocument(root = document) {
  const html = document.documentElement;
  html.lang = current;
  html.dir = isRTL() ? "rtl" : "ltr";

  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
  });
  root.querySelectorAll(".lang-btn[data-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === current);
  });
}

/**
 * Wire any group of language buttons ([data-lang]) to switch the language.
 * Used by both the auth screen and the settings screen.
 */
export function bindLanguageButtons(container) {
  if (!container) return;
  container.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLanguage(btn.getAttribute("data-lang")));
  });
}

// ============================================================================
//  api.js — Thin client for the Node/MySQL backend (REST + JWT).
//  Same-origin calls to /api/* (Vite proxies these to :3000 in dev). Tokens are
//  kept in localStorage. Every method degrades gracefully: if the server is
//  unreachable the caller can fall back to offline guest play.
// ============================================================================

import { getLanguage } from "./i18n.js";

const TOKEN_KEY = "pao.token";

function authHeaders() {
  const h = { "Content-Type": "application/json", "Accept-Language": getLanguage() };
  const tok = localStorage.getItem(TOKEN_KEY);
  if (tok) h["Authorization"] = `Bearer ${tok}`;
  return h;
}

async function request(path, method, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "request_failed");
    err.code = data.error;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  async register({ username, email, password }) {
    const data = await request("/auth/register", "POST", { username, email, password });
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    return data.profile;
  },

  async login({ email, password }) {
    const data = await request("/auth/login", "POST", { email, password });
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    return data.profile;
  },

  async getProfile() {
    const data = await request("/profile", "GET");
    return data.profile;
  },

  async saveProgress(progress) {
    return request("/profile/progress", "POST", progress);
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

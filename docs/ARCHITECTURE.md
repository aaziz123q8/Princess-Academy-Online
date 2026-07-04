# Architecture

Princess Academy Online is a browser-based 3D social world with three parts: the **Babylon.js
game client** (runs in the browser), the **Node.js backend** (accounts, persistence, economy),
and the **realtime WebSocket relay** (live player movement + chat). MySQL is the durable store.

```
                         ┌─────────────────────────────────────┐
                         │      Player's browser (mobile/PC)     │
                         │      Babylon.js 3D game (WebGL/WebGPU) │
                         └──────────┬───────────────┬────────────┘
              HTTPS  /api  (JWT)    │               │   WSS  /ws  (realtime)
              register/login/save   │               │   positions · chat · presence
                                    ▼               ▼
                    ┌───────────────────────────────────────────┐
                    │            Node.js server (Express)         │
                    │  • REST API: auth, profile, leaderboard     │
                    │  • WebSocket relay (ws): movement + chat     │
                    │  • JWT + bcrypt, rate limiting, i18n          │
                    │  • (optional) serves the built client         │
                    └───────────────────────┬─────────────────────┘
                                            │  SQL (mysql2, pooled)
                                            ▼
                                   ┌──────────────────┐
                                   │   MySQL (utf8mb4) │
                                   │  users, characters │
                                   │  inventory, friends│
                                   │  leaderboards, audit│
                                   └──────────────────┘
```

---

## Client (`client/`)

Built with **Vite**; the 3D runtime is **Babylon.js 7**. Rendering picks **WebGPU** when the
browser supports it and falls back to **WebGL2** automatically (`game/createEngine.js`).

Module responsibilities:

| File | Responsibility |
|------|----------------|
| `game/createEngine.js` | Boot WebGPU or WebGL renderer |
| `game/World.js` | Procedurally build the fantasy city (ground, plaza, towers, fountain, trees, lamps, collision boundary) |
| `game/Avatar.js` | Stylized princess character from primitives + procedural walk; shared by local & remote players. Swappable for a rigged glTF later without touching callers |
| `game/PlayerController.js` | Local player: camera-relative movement, smooth turning, gravity/jump, collisions, third-person **ArcRotateCamera** |
| `game/InputManager.js` | Keyboard (WASD/arrows) + mobile virtual joystick + jump; unified `{x,y}` vector |
| `game/Network.js` | WebSocket client: sends throttled transforms, spawns/interpolates remote avatars, relays chat; **degrades to offline** if the server is down |
| `game/Game.js` | Orchestrates engine/scene/world/player/input/network |
| `ui/i18n.js` | Bilingual engine: `t(key)`, live language switch, **RTL** document direction |
| `ui/api.js` | REST client (JWT in `localStorage`), graceful offline fallback |
| `ui/hud.js` | HUD: name, coins, gems, XP/level, chat log (all localized) |
| `main.js` | Screen flow: loading → auth/guest → game; autosave loop |

**Design choices**
- The 3D scene *is* the game. DOM is used only for UI chrome (menus, HUD, chat, mobile buttons)
  — standard for browser games and the cleanest way to get accessible forms + correct RTL.
- The client is **untrusted**: it never writes the database directly. It calls the API, which
  validates and clamps everything (see `server/src/routes/profile.js`).
- Guest/offline mode keeps the game demoable with zero backend.

---

## Backend (`server/`)

**Node.js + Express**, ES modules. Layers:

| File | Responsibility |
|------|----------------|
| `src/config.js` | Env-driven config (DB, JWT, CORS, serveClient) |
| `src/db.js` | Pooled `mysql2/promise` access + startup connectivity check |
| `src/i18n.js` | Server-side AR/EN messages, chosen by `Accept-Language` |
| `src/auth.js` | JWT sign/verify, `requireAuth`, `requireRole` (player/moderator/admin) |
| `src/routes/auth.js` | Register + login: bcrypt hashing, uniqueness, validation |
| `src/routes/profile.js` | Get profile; persist progress & appearance (server-clamped) |
| `src/routes/leaderboard.js` | Top-N per board from `leaderboard_scores` |
| `src/realtime.js` | WebSocket relay: presence, transform broadcast, chat |
| `src/index.js` | Wires HTTP + WebSocket; optional static hosting of `client/dist` |
| `src/initDb.js` | Applies `sql/schema.sql` (via `npm run init-db`) |

**Why Node + MySQL:** exactly what Hostinger supports out of the box, no Docker/Postgres/Redis
required. A single Node process can serve both the API and the built game (`SERVE_CLIENT=true`),
or the static client can be uploaded to `public_html` separately.

---

## Realtime model

Movement uses a **client-reported relay**: each client sends its own transform ~8×/second; the
server rebroadcasts to others in the zone and remote avatars are **interpolated** for smoothness.
Chat and join/leave presence flow through the same socket. This is simple, cheap, and perfect for
a social hangout.

The [roadmap](ROADMAP.md) upgrades this to **server-authoritative** movement and **zone sharding**
when anti-cheat and scale demand it — the client/server socket contract stays the same, so the
upgrade is contained.

---

## Security

- **bcrypt** password hashing (cost 12); credentials never stored or logged in plaintext.
- **JWT** bearer tokens for API auth; `refresh_tokens` table exists for rotation/revocation.
- **Rate limiting** on `/api/auth` to blunt brute force.
- **Server-side validation & clamping** of all persisted values (anti-cheat baseline).
- **Parameterized queries** everywhere (mysql2 prepared statements) — no SQL injection surface.
- **utf8mb4** so Arabic and emoji are stored losslessly.
- **CORS allowlist** and a central error handler that never leaks stack traces.

---

## Data ownership

| Data | Source of truth |
|------|-----------------|
| Accounts, roles, status | MySQL `users` |
| Character look & progression (level/xp/coins/gems) | MySQL `characters` |
| Inventory (clothes/hair/accessories/furniture/pets) | MySQL `inventory_items` |
| Friendships | MySQL `friendships` |
| Leaderboards | MySQL `leaderboard_scores` |
| Live positions / chat | Server RAM (transient) |
| Localized strings | Client JSON tables + server i18n map |

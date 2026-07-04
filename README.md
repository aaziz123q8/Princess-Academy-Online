# Princess Academy Online 👑

A **real 3D browser game** — a bilingual (العربية / English) online social world inspired by
Roblox, PK XD, and Avakin Life. It runs directly in the browser with **WebGL/WebGPU** (no plugin,
no download) and is designed to deploy on **Hostinger** with a **Node.js + MySQL** backend.

Players log in, spawn as a customizable princess in a 3D fantasy city, walk around in third
person, see other players in real time, and chat — in Arabic (RTL) or English, switchable live.

> **Status — playable foundation.** The 3D world, third-person character + camera, mobile touch
> controls, realtime multiplayer, bilingual UI, and the secure Node/MySQL backend (auth + save)
> are implemented. Bigger features (houses, pets, shop, events, admin panel) are staged in
> [`docs/ROADMAP.md`](docs/ROADMAP.md) and built step by step.

---

## Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| 3D engine | **Babylon.js 7** (WebGL2, WebGPU when available) | Runs in every modern mobile & desktop browser |
| Build | **Vite** | Outputs a static `dist/` you upload to Hostinger |
| UI / i18n | Vanilla JS + CSS overlays, custom AR/EN engine with **RTL** | No hard-coded user strings |
| Backend | **Node.js + Express** | Single app can also serve the game |
| Realtime | **WebSocket (`ws`)** | Player movement, presence, chat |
| Database | **MySQL 8 / MariaDB** (Hostinger-supported, `utf8mb4`) | Accounts, characters, economy, social, leaderboards |
| Auth | **JWT + bcrypt** | Rate-limited endpoints |

No Unity. No Docker. No PostgreSQL. No Redis.

---

## Repository layout

```
Princess-Academy-Online/
├── client/                  ← Babylon.js game (Vite)
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.js          ← screen flow, wiring
│       ├── game/            ← Babylon: engine, world, player, camera, input, network
│       └── ui/              ← i18n (ar/en), styles, HUD, API client
├── server/                  ← Node.js + MySQL backend
│   ├── sql/schema.sql       ← MySQL schema (utf8mb4)
│   └── src/                 ← express app, auth, routes, realtime websocket
└── docs/                    ← architecture, roadmap, localization, Hostinger deploy
```

---

## Run it locally

**Prerequisites:** Node.js 18+ and a local MySQL/MariaDB (or a remote Hostinger DB).

### 1. Backend

```bash
cd server
cp .env.example .env          # then edit DB_* and JWT_SECRET
npm install
npm run init-db               # creates the tables
npm run dev                   # http://localhost:3000
```

### 2. Client

```bash
cd client
npm install
npm run dev                   # http://localhost:5173  (proxies /api and /ws to :3000)
```

Open http://localhost:5173. Register or click **Play as Guest** (guest works even with no
backend), then walk around with **WASD**/arrows (or the on-screen joystick on mobile) and drag to
orbit the camera. Toggle **English / العربية** any time — the whole UI flips to RTL for Arabic.

> **Guest/offline mode:** if the backend or websocket isn't running, the game still loads and is
> fully explorable single-player. Multiplayer and cloud-save activate automatically when the
> server is reachable.

---

## Deploy to Hostinger

Two supported models (single Node app, or static client + Node API). Full step-by-step —
including creating the MySQL database, setting env vars, and building the client — is in
[`docs/DEPLOY-HOSTINGER.md`](docs/DEPLOY-HOSTINGER.md).

Quick version (single Node app on a plan with Node.js support):

```bash
cd client && npm install && npm run build   # produces client/dist
# upload the repo, set env vars in hPanel, run the MySQL schema, then start:
cd server && npm install && npm start        # SERVE_CLIENT=true serves the game too
```

---

## Localization (Arabic / English) — first-class

Every user-facing string is a **key**, resolved at runtime from
`client/src/ui/locales/{en,ar}.json` (client) and `server/src/i18n.js` (backend). Switching
language is instant and sets the document direction to **RTL** for Arabic with mirrored layout.
Adding a language = adding one JSON file. Details in [`docs/LOCALIZATION.md`](docs/LOCALIZATION.md).

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the client, backend, and realtime fit together
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what's done and the step-by-step feature plan
- [`docs/LOCALIZATION.md`](docs/LOCALIZATION.md) — the bilingual/RTL system
- [`docs/DEPLOY-HOSTINGER.md`](docs/DEPLOY-HOSTINGER.md) — production deployment

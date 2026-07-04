# Development Roadmap

Turns the requirement list into an ordered, buildable plan. Each milestone is runnable and
testable. Legend: ✅ done · 🚧 in progress · ⬜ planned.

**Honest scope note.** A social world at Roblox/PK XD/Avakin scale is a multi-year effort for a
full team (artists, designers, live-ops, backend). This repo builds it as a **real, modular
foundation first**, then layers features. Early milestones are code-complete and run in the
browser today; later milestones depend on authored 3D art and live-ops content that go beyond
code, and proceed with greybox placeholders so systems are proven before final art drops in.

---

## Phase 0 — Foundation ✅

- ✅ Monorepo: `client/` (Babylon.js + Vite), `server/` (Node + MySQL), `docs/`
- ✅ Architecture, roadmap, localization, and Hostinger deploy docs
- ✅ MySQL schema (utf8mb4): users, characters, inventory, friends, refresh tokens, leaderboards, audit
- ✅ Secure backend: register/login (bcrypt + JWT), rate limiting, server-side i18n (ar/en)
- ✅ REST: profile fetch, progress save (clamped), appearance save, leaderboard
- ✅ Client build verified (`vite build`), server boot verified

## Phase 1 — Playable 3D world ✅ (current foundation)

- ✅ WebGPU/WebGL engine boot with automatic fallback
- ✅ Procedural fantasy city: plaza, towers with cone roofs, fountain, trees, lamps, boundaries
- ✅ Third-person character (stylized princess) + ArcRotate follow camera
- ✅ Movement: camera-relative, smooth turning, gravity/jump, collisions
- ✅ Mobile support: on-screen joystick + jump button, responsive HUD, touch camera orbit
- ✅ Realtime multiplayer relay: see other players move, join/leave presence
- ✅ Chat (proximity/global) with localized system messages
- ✅ Bilingual UI (ar/en) with instant switch + RTL; HUD for coins/gems/XP/level
- ✅ Auth screens (login/register/guest) wired to the backend; cloud autosave

**Exit criteria (met):** a player logs in (or plays as guest), spawns in the 3D city, walks in
third person on desktop or mobile, sees and chats with others, in Arabic or English.

## Phase 2 — Identity & customization ⬜

- ⬜ Character creation flow (skin/face/body) saved via `/api/profile/appearance`
- ⬜ Wardrobe UI: hairstyles, clothes, accessories (data-driven catalog)
- ⬜ Equip/unequip persists to `inventory_items`; appearance replicated to other players
- ⬜ Swap the primitive avatar for a rigged glTF model with real animations (`@babylonjs/loaders`)

## Phase 3 — World depth ⬜

- ⬜ Expand the city into districts; day/night; ambient audio
- ⬜ Level streaming for a larger open world (load zones on demand)
- ⬜ Interactables: shops, wardrobe mirrors, teleporters, mini-activities
- ⬜ Houses: own, enter, decorate (placement + persistence)
- ⬜ Pets: adopt, follow AI, feed/interact

## Phase 4 — Social & economy ⬜

- ⬜ Friends: requests/accept/block (schema ready), presence, join-friend
- ⬜ Emotes wheel (localized), synced to nearby players
- ⬜ Shop: buy clothes/furniture/pets with coins & gems (server-authoritative purchase)
- ⬜ Gifting/trading with anti-fraud safeguards

## Phase 5 — Progression & live-ops ⬜

- ⬜ Daily rewards calendar; daily missions (data-driven, localized)
- ⬜ Weekly + seasonal events framework (schedules, themed content)
- ⬜ Fashion competitions: submit a look, voting, prizes
- ⬜ Leaderboards UI (XP, fashion, events) on top of the existing API

## Phase 6 — Admin, hardening & ops ⬜

- ⬜ Admin panel: player search, mute/ban, grant/revoke currency & items, audit log view
- ⬜ Server-authoritative movement + zone sharding (anti-cheat & scale)
- ⬜ Refresh-token rotation endpoints; observability (logs, metrics, health dashboards)
- ⬜ Load testing and CI

## Phase 7 — Content, polish & release ⬜

- ⬜ Commercial-grade art/audio pipeline & integration
- ⬜ Onboarding/tutorial, accessibility, settings (audio/graphics/controls/language)
- ⬜ Store/IAP integration, compliance (privacy, age gating), localization QA
- ⬜ Soft launch → live-ops cadence

---

## How "step by step" works

Each session picks the next unchecked item(s), implements them with real code, verifies (client
`vite build`, server boot/route tests), updates these checkboxes, and commits. The backend stays
runnable and the client stays playable at every step. Art-dependent milestones use greybox
placeholders so the systems are proven before final assets are added.

# Deploying to Hostinger

Two supported models. Pick based on your Hostinger plan:

- **Model A — Single Node app** (recommended if your plan supports **Node.js**, e.g. Cloud/VPS or
  Business with Node.js): one Node process serves both the game and the API. Simplest to operate.
- **Model B — Static client + Node API**: upload the built game to `public_html` and run the Node
  API separately. Use this if you want the game on Apache and the API on a Node subdomain.

Either way you need a **MySQL database**, which every Hostinger plan provides.

---

## 1. Create the MySQL database (both models)

1. hPanel → **Databases → MySQL Databases**.
2. Create a database (e.g. `princess_academy`) and a user; note the **host, name, user, password**.
   On shared hosting the names are usually prefixed, e.g. `u123456_princess_academy`.
3. Import the schema: hPanel → **phpMyAdmin** → select the DB → **SQL** tab → paste the contents
   of [`server/sql/schema.sql`](../server/sql/schema.sql) → **Go**.
   (Or from a shell with DB access: `mysql -u USER -p DBNAME < server/sql/schema.sql`.)

The schema uses **utf8mb4** so Arabic text and emoji store correctly.

---

## 2. Build the client

On your own machine (Hostinger doesn't need to build it):

```bash
cd client
npm install
npm run build      # outputs client/dist  (relative paths, works in any subfolder)
```

---

## Model A — Single Node app

1. **Upload** the repository (or at least `server/` and `client/dist`) to your Node app directory.
2. hPanel → **Advanced → Node.js**: create an app, set the **application root** to `server/`,
   **startup file** to `src/index.js`, and Node version to 18+.
3. Set **environment variables** (hPanel Node.js panel — do **not** commit `.env`):
   ```
   PORT=<the port Hostinger gives the app>
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=u123456_princess
   DB_PASSWORD=********
   DB_NAME=u123456_princess_academy
   JWT_SECRET=<64+ random hex chars>
   CORS_ORIGINS=https://your-domain.com
   SERVE_CLIENT=true
   NODE_ENV=production
   ```
   Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
4. **Install & run**: in the Node.js panel run `npm install` (in `server/`), then **Start**.
   With `SERVE_CLIENT=true`, the app serves `client/dist` at `/` and the API at `/api`, and the
   WebSocket at `/ws` — all same-origin, so no CORS or mixed-content issues.
5. Visit `https://your-domain.com`. Register a player and walk around.

> **WebSocket note:** Hostinger's proxy supports WebSocket upgrades on the same origin/port as the
> HTTP app, so `/ws` works without extra config. The client auto-selects `wss://` on HTTPS.

---

## Model B — Static client on `public_html` + Node API

1. **Upload `client/dist/*`** into `public_html` (or a subfolder like `public_html/game`).
2. Point the client at your API origin. Since the client calls same-origin `/api` and `/ws`, the
   simplest path is to host the Node API on the **same domain** via a reverse proxy, or on a
   subdomain (e.g. `api.your-domain.com`) and add a small rewrite so `/api` and `/ws` proxy there.
   If you use a separate origin, set `CORS_ORIGINS` to your site and update the client to use the
   absolute API/WS URL (see `client/src/ui/api.js` and `game/Network.js`).
3. Run the Node API as in Model A but with `SERVE_CLIENT=false`.

Model A is simpler; choose Model B only if you specifically want Apache to serve the static game.

---

## 3. Post-deploy checklist

- [ ] `https://your-domain.com/api/health` returns `{ "ok": true }`.
- [ ] Registration creates a row in `users` + `characters` (check phpMyAdmin).
- [ ] Two browsers/devices see each other move in the same city (WebSocket working).
- [ ] Switching to Arabic flips the UI to RTL and API errors return Arabic text.
- [ ] `JWT_SECRET` is a strong random value and **not** the dev default.
- [ ] `.env` is **not** uploaded/committed; secrets are in the hPanel env panel.

---

## Updating after changes

- **Client change:** `npm run build` locally → re-upload `client/dist`.
- **Server change:** upload changed files → **Restart** the Node app in hPanel.
- **Schema change:** apply the new SQL via phpMyAdmin (write migrations as additive `ALTER`s).

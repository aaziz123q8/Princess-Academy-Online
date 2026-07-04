// ============================================================================
//  index.js — HTTP + WebSocket server entry point.
//  Serves the REST API, the realtime multiplayer socket, and (optionally) the
//  built client so a single Node process can host the whole game on Hostinger.
// ============================================================================

import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { assertConnection } from "./db.js";
import { localeMiddleware } from "./i18n.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { attachRealtime } from "./realtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Fail fast with a clear message if the DB isn't reachable.
  await assertConnection();

  const app = express();
  app.set("trust proxy", 1); // correct client IPs behind Hostinger's proxy
  app.use(express.json({ limit: "64kb" }));
  app.use(
    cors({
      origin: config.corsOrigins.includes("*") ? true : config.corsOrigins,
      credentials: true,
    })
  );
  app.use(localeMiddleware);

  // Rate-limit auth endpoints to slow down brute force / abuse.
  const authLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "princess-academy", ts: Date.now() }));
  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/leaderboard", leaderboardRouter);

  // Optionally serve the built client (client/dist) for single-app hosting.
  if (config.serveClient) {
    const clientDir = path.resolve(__dirname, "../../client/dist");
    app.use(express.static(clientDir));
    // SPA fallback for any non-API route.
    app.get(/^\/(?!api|ws).*/, (_req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  // Central error handler — never leak stack traces to clients.
  app.use((err, req, res, _next) => {
    console.error("[error]", err);
    res.status(500).json({ error: "server", message: req.t ? req.t("error.server") : "Server error" });
  });

  const server = http.createServer(app);
  attachRealtime(server); // WebSocket at /ws

  server.listen(config.port, () => {
    console.log(`👑 Princess Academy backend on http://localhost:${config.port}`);
    console.log(`   REST: /api   ·   WebSocket: /ws   ·   serveClient=${config.serveClient}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:\n", err.message);
  process.exit(1);
});

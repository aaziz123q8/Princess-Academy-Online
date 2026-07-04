// Profile routes: fetch the logged-in player's profile and persist progress.
// Progress writes are server-validated and clamped so clients can't inject
// impossible values (basic anti-cheat; deeper validation comes with the
// server-authoritative economy in a later phase).
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../auth.js";

export const profileRouter = Router();

function profileOut(user, c) {
  return {
    id: user.id,
    name: c.display_name,
    role: user.role,
    level: c.level,
    xp: c.xp,
    xpMax: c.xp_max,
    coins: c.coins,
    gems: c.gems,
    skin: c.skin_color,
    hair: c.hair_color,
    dress: c.dress_color,
  };
}

// ---- GET /api/profile ----
profileRouter.get("/", requireAuth, async (req, res) => {
  const [user] = await query("SELECT id, username, role FROM users WHERE id = ?", [req.user.id]);
  if (!user) return res.status(404).json({ error: "not_found", message: req.t("error.not_found") });
  const [character] = await query("SELECT * FROM characters WHERE user_id = ?", [req.user.id]);
  res.json({ profile: profileOut(user, character) });
});

// ---- POST /api/profile/progress ----
// Persists level/xp/coins/gems. Values are clamped to sane bounds.
profileRouter.post("/progress", requireAuth, async (req, res) => {
  const b = req.body || {};
  const clamp = (v, min, max, def) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.max(min, Math.min(max, Math.floor(n)));
  };

  const level = clamp(b.level, 1, 999, 1);
  const xp = clamp(b.xp, 0, 10_000_000, 0);
  const xpMax = clamp(b.xpMax, 1, 10_000_000, 100);
  const coins = clamp(b.coins, 0, 1_000_000_000, 0);
  const gems = clamp(b.gems, 0, 1_000_000_000, 0);

  await query(
    `UPDATE characters
        SET level = ?, xp = ?, xp_max = ?, coins = ?, gems = ?
      WHERE user_id = ?`,
    [level, xp, xpMax, coins, gems, req.user.id]
  );

  // Keep the XP leaderboard fresh.
  const totalScore = (level - 1) * 1000 + xp;
  await query(
    `INSERT INTO leaderboard_scores (board_key, user_id, score)
          VALUES ('xp', ?, ?)
     ON DUPLICATE KEY UPDATE score = VALUES(score)`,
    [req.user.id, totalScore]
  );

  res.json({ ok: true });
});

// ---- POST /api/profile/appearance ----
// Saves character customization colors.
profileRouter.post("/appearance", requireAuth, async (req, res) => {
  const b = req.body || {};
  const hex = (v, def) => (/^#[0-9a-fA-F]{6}$/.test(v || "") ? v : def);
  await query(
    `UPDATE characters SET skin_color = ?, hair_color = ?, dress_color = ? WHERE user_id = ?`,
    [hex(b.skin, "#ffd9c0"), hex(b.hair, "#5b3a29"), hex(b.dress, "#ff5fa2"), req.user.id]
  );
  res.json({ ok: true });
});

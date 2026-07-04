// Leaderboard route: top players for a given board (xp, fashion, events).
// Backed by the leaderboard_scores table (indexed by board_key, score DESC).
import { Router } from "express";
import { query } from "../db.js";

export const leaderboardRouter = Router();

// ---- GET /api/leaderboard/:board?limit=20 ----
leaderboardRouter.get("/:board", async (req, res) => {
  const board = String(req.params.board || "xp").slice(0, 32);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));

  const rows = await query(
    `SELECT ls.score, c.display_name AS name, c.level
       FROM leaderboard_scores ls
       JOIN characters c ON c.user_id = ls.user_id
      WHERE ls.board_key = ?
      ORDER BY ls.score DESC
      LIMIT ?`,
    [board, limit]
  );

  res.json({
    board,
    entries: rows.map((r, i) => ({ rank: i + 1, name: r.name, level: r.level, score: r.score })),
  });
});

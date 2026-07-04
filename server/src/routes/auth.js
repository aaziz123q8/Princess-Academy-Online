// Auth routes: register + login. Passwords hashed with bcrypt; JWT issued on success.
import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { signToken } from "../auth.js";

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[\p{L}\p{N}_ ]{3,20}$/u; // letters (incl. Arabic), digits, _ space

function profileFromRows(user, character) {
  return {
    id: user.id,
    name: character.display_name,
    role: user.role,
    level: character.level,
    xp: character.xp,
    xpMax: character.xp_max,
    coins: character.coins,
    gems: character.gems,
    skin: character.skin_color,
    hair: character.hair_color,
    dress: character.dress_color,
  };
}

// ---- POST /api/auth/register ----
authRouter.post("/register", async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!USERNAME_RE.test(username || "") || !EMAIL_RE.test(email || "") || (password || "").length < 8) {
    return res.status(400).json({ error: "validation", message: req.t("error.validation") });
  }

  // Uniqueness check.
  const existing = await query("SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1", [email, username]);
  if (existing.length) {
    return res.status(409).json({ error: "exists", message: req.t("error.exists") });
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await query(
    "INSERT INTO users (username, email, password_hash, locale) VALUES (?, ?, ?, ?)",
    [username, email, hash, req.locale]
  );
  const userId = result.insertId;

  // Create the starting character.
  await query(
    "INSERT INTO characters (user_id, display_name) VALUES (?, ?)",
    [userId, username]
  );

  const [user] = await query("SELECT id, username, role FROM users WHERE id = ?", [userId]);
  const [character] = await query("SELECT * FROM characters WHERE user_id = ?", [userId]);

  const token = signToken(user);
  return res.status(201).json({ token, profile: profileFromRows(user, character), message: req.t("auth.registered") });
});

// ---- POST /api/auth/login ----
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!EMAIL_RE.test(email || "") || !password) {
    return res.status(400).json({ error: "validation", message: req.t("error.validation") });
  }

  const rows = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  const user = rows[0];
  // Constant-ish response whether or not the user exists (avoid enumeration).
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials", message: req.t("error.invalid_credentials") });
  }
  if (user.status === "banned") {
    return res.status(403).json({ error: "forbidden", message: req.t("error.forbidden") });
  }

  await query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
  const [character] = await query("SELECT * FROM characters WHERE user_id = ?", [user.id]);

  const token = signToken(user);
  return res.json({ token, profile: profileFromRows(user, character) });
});

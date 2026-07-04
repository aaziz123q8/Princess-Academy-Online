// JWT helpers + auth middleware shared across routes.
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

/** Require a valid JWT; attaches req.user = { id, username, role }. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "unauthorized", message: req.t("error.unauthorized") });
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized", message: req.t("error.unauthorized") });
  }
}

/** Require one of the given roles (e.g. requireRole('admin','moderator')). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden", message: req.t("error.forbidden") });
    }
    next();
  };
}

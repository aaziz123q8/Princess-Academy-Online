// Central config, loaded from environment (.env in dev; hPanel env in prod).
import dotenv from "dotenv";
dotenv.config();

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    console.warn(`[config] Missing env ${name}. Set it in .env or your host panel.`);
  }
  return v;
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  db: {
    host: required("DB_HOST", "localhost"),
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: required("DB_USER", "root"),
    password: required("DB_PASSWORD", ""),
    database: required("DB_NAME", "princess_academy"),
  },
  jwt: {
    secret: required("JWT_SECRET", "dev-insecure-secret-change-me"),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  corsOrigins: (process.env.CORS_ORIGINS || "*").split(",").map((s) => s.trim()),
  serveClient: (process.env.SERVE_CLIENT || "true").toLowerCase() === "true",
  isProd: process.env.NODE_ENV === "production",
};

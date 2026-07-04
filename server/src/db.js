// MySQL connection pool (mysql2/promise). One shared pool for the whole app.
import mysql from "mysql2/promise";
import { config } from "./config.js";

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4_unicode_ci",
  timezone: "Z",
});

/** Convenience: run a query and return rows. */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Verify connectivity at startup; throws with a friendly message if it fails. */
export async function assertConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
  } catch (err) {
    throw new Error(
      `Cannot connect to MySQL at ${config.db.host}:${config.db.port} as ` +
        `'${config.db.user}' (db '${config.db.database}'). ` +
        `Check your .env / host DB settings. Original: ${err.message}`
    );
  }
}

// One-shot DB initializer: runs sql/schema.sql against the configured database.
// Usage:  npm run init-db
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = fs.readFileSync(path.resolve(__dirname, "../sql/schema.sql"), "utf8");
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });
  console.log(`Applying schema to '${config.db.database}'…`);
  await conn.query(sql);
  await conn.end();
  console.log("✔ Schema applied successfully.");
}

main().catch((err) => {
  console.error("Schema init failed:", err.message);
  process.exit(1);
});

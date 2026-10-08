import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
}

async function main() {
  const { getDbPool } = await import("../src/lib/db");
  const pool = getDbPool();
  try {
    const cs = await pool.query(`
      SELECT key, value FROM erp.company_settings LIMIT 10;
    `);
    console.log("company_settings rows:", cs.rows);
  } catch (e: any) {
    console.error("DB Error:", e);
  } finally {
    process.exit(0);
  }
}

main();

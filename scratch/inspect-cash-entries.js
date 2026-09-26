const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL=(.+)/);
const dbUrl = m[1].trim();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'erp' AND table_name = 'cash_entries'");
  console.log("cash_entries columns:", r.rows);
  await pool.end();
}

main().catch(console.error);

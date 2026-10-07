import { getDbPool } from "./src/lib/db";

async function run() {
  try {
    const pool = getDbPool();
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'erp' AND table_name = 'payments'
      ORDER BY ordinal_position
    `);
    console.table(res.rows);

    const accountsRes = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'erp' AND table_name LIKE '%account%' OR table_name LIKE '%fund%'
    `);
    console.log("Finance tables:", accountsRes.rows);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();

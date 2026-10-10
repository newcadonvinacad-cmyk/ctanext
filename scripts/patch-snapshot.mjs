import nextEnv from '@next/env';
import pg from 'pg';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function patch() {
  const client = await pool.connect();
  try {
    const bomRes = await client.query('SELECT * FROM erp.project_boms WHERE code = $1', ['BOM-DA-2026-001']);
    const bom = bomRes.rows[0];
    if (bom) {
      const lines = (
        await client.query(
          `SELECT l.*, i.code AS item_code, i.name AS item_name, u.name AS unit_name 
           FROM erp.project_bom_lines l 
           LEFT JOIN erp.items i ON i.id = l.item_id 
           LEFT JOIN erp.units u ON u.id = l.unit_id 
           WHERE l.bom_id = $1 ORDER BY l.line_no`,
          [bom.id]
        )
      ).rows;
      bom.lines = lines;

      const ord = (await client.query('SELECT id FROM erp.production_orders WHERE code = $1', ['LSX-2026-001'])).rows[0];
      if (ord) {
        const l = (await client.query('SELECT id, snapshot FROM erp.production_order_lines WHERE production_order_id = $1', [ord.id])).rows[0];
        if (l) {
          const nextSnapshot = { ...l.snapshot, bom };
          await client.query('UPDATE erp.production_order_lines SET snapshot = $1 WHERE id = $2', [
            JSON.stringify(nextSnapshot),
            l.id,
          ]);
          console.log('Successfully patched snapshot with full bom!');
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

patch();

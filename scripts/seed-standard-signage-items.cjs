const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const orgRes = await pool.query('SELECT id FROM erp.organizations LIMIT 1');
    const org = orgRes.rows[0].id;
    const userRes = await pool.query('SELECT id FROM public."user" LIMIT 1');
    const user = userRes.rows[0].id;

    const itemsToEnsure = [
      {
        code: 'SH-2525',
        name: 'Sắt hộp mạ kẽm Hòa Phát 25x25 dày 1.4mm',
        category_id: 'e6c47cf7-ac2f-48d3-9a5d-2ec463e8d9ca',
        base_unit_id: 'bfb0a8ba-1a80-4771-b8b1-79fc20f7ac07'
      },
      {
        code: 'NGUON-MEANWELL-400W',
        name: 'Bộ nguồn Meanwell ngoài trời 12V 400W IP67',
        category_id: '500872db-fb6a-46a5-a1b7-1276cf1195a0',
        base_unit_id: 'd4661d2c-5394-4492-b603-be73f34152c8'
      },
      {
        code: 'KEO-APOLLO-A500',
        name: 'Keo Silicone chống nước ngoài trời Apollo A500',
        category_id: '5d3c114c-521e-41d8-a352-b3e92769b7f8',
        base_unit_id: '557cd489-74a9-45e4-b355-49ad510e5c0b'
      }
    ];

    for (const it of itemsToEnsure) {
      const existing = await pool.query('SELECT id FROM erp.items WHERE organization_id = $1 AND code = $2', [org, it.code]);
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO erp.items(organization_id, code, name, kind, track_stock, category_id, base_unit_id, created_by, updated_by)
           VALUES($1, $2, $3, 'material', true, $4, $5, $6, $6)`,
          [org, it.code, it.name, it.category_id, it.base_unit_id, user]
        );
        console.log('Inserted item:', it.code);
      } else {
        console.log('Item already exists:', it.code);
      }
    }

    // Cập nhật default_item_id trong material_representatives
    const reps = [
      { code: 'frame', itemCode: 'SH-2525' },
      { code: 'face', itemCode: 'ALU-ALCO-3MM' },
      { code: 'lighting', itemCode: 'LED-MOD-3B' },
      { code: 'power', itemCode: 'NGUON-MEANWELL-400W' },
      { code: 'accessories', itemCode: 'KEO-TITEBOND' },
      { code: 'letters', itemCode: 'TP-2026-4415' }
    ];

    for (const r of reps) {
      const itemRow = (await pool.query('SELECT id, base_unit_id FROM erp.items WHERE organization_id = $1 AND code = $2', [org, r.itemCode])).rows[0];
      if (itemRow) {
        await pool.query(
          `UPDATE erp.material_representatives
           SET default_item_id = $1, default_unit_id = $2, updated_at = now()
           WHERE organization_id = $3 AND code = $4`,
          [itemRow.id, itemRow.base_unit_id, org, r.code]
        );
        console.log(`Updated representative '${r.code}' -> ${r.itemCode}`);
      }
    }

    console.log('Seed completed successfully!');
  } finally {
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

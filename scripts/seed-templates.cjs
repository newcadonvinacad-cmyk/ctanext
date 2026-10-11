const { productionDb } = require('../tests/helpers/production-db.cjs');

async function seed() {
  const db = await productionDb();
  const pool = db.pool;

  const sql = `
    INSERT INTO erp.product_templates (organization_id, code, name, signage_type, version_no, description, parameter_schema)
    VALUES
    (NULL, 'TPL-LIGHTBOX-BLADE', 'Biển Vẫy / Hộp Đèn Hút Nổi LED', 'lightbox_blade', 1, 'Hộp đèn vẫy tròn/vuông gắn tường hoặc trụ', '[{"key":"w","default":0.8},{"key":"h","default":0.8}]'::jsonb),
    (NULL, 'TPL-LETTERS-LOGO', 'Bộ Chữ Nổi & Logo Tòa Nhà / Quầy Lễ Tân', 'letters_logo', 1, 'Chữ nổi mica, inox, formex uốn chân gắn led hắt', '[{"key":"w","default":3.0},{"key":"h","default":0.8}]'::jsonb),
    (NULL, 'TPL-POSM-STAND', 'Kệ Sắt Trưng Bày POSM / Standee Quảng Cáo', 'posm_stand', 1, 'Kệ sắt trưng bày POSM, standee lắp ghép', '[{"key":"w","default":1.2},{"key":"h","default":1.8}]'::jsonb),
    (NULL, 'TPL-AWNING-CANOPY', 'Mái Che Bạt Xếp / Mái Hiên Di Động', 'awning_canopy', 1, 'Mái xếp lượn sóng, mái hiên che nắng mưa', '[{"key":"w","default":5.0},{"key":"h","default":3.0}]'::jsonb),
    (NULL, 'TPL-REPAIR-MAINT', 'Bảo Trì / Sửa Chữa Bảng Hiệu', 'repair_service', 1, 'Gia cố khung, thay nguồn led, căng lại bạt', '[{"key":"w","default":4.0},{"key":"h","default":2.0}]'::jsonb)
    ON CONFLICT (code, version_no) DO UPDATE SET name = EXCLUDED.name, signage_type = EXCLUDED.signage_type;
  `;

  await pool.query(sql);

  const res = await pool.query('SELECT id, code, name, signage_type FROM erp.product_templates ORDER BY name');
  console.log('Seeded product templates count:', res.rows.length);
  console.log(res.rows);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

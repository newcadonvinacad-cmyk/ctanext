const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/DATABASE_URL=(.+)/);
const dbUrl = m[1].trim();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  const orgId = '31880495-5cb5-48e5-8ea5-cb774e0a2ce5';
  const userId = 'rjKgQuJGANYAgeVpGqRUCOsBG8nbRhA6';

  // PO-2026-001 (ad6105d5-e4ac-49fc-ac92-bec1b3033be7)
  await pool.query(`INSERT INTO erp.purchase_order_lines (organization_id, purchase_order_id, line_no, item_id, unit_id, description, qty, unit_price, line_total, factor_snapshot, created_by, updated_by) VALUES
  ($1, 'ad6105d5-e4ac-49fc-ac92-bec1b3033be7', 1, 'af082418-084d-4ee0-adcf-2da07c219925', 'f0394ad3-80ac-4fca-86cb-4020a6b1d5af', 'Tấm Alu Alcorest trong nhà EV2002 3mm', 30, 320000, 9600000, 1, $2, $2),
  ($1, 'ad6105d5-e4ac-49fc-ac92-bec1b3033be7', 2, '0a7cb054-ad63-4f23-91c4-f93098a4c4b9', 'bfb0a8ba-1a80-4771-b8b1-79fc20f7ac07', 'Sắt hộp mạ kẽm Hòa Phát 30x30 dày 1.4mm', 40, 150000, 6000000, 1, $2, $2)
  ON CONFLICT DO NOTHING`, [orgId, userId]);

  // PO-2026-002 (d648cede-37ed-4ffe-8230-cb9c5c89fe01)
  await pool.query(`INSERT INTO erp.purchase_order_lines (organization_id, purchase_order_id, line_no, item_id, unit_id, description, qty, unit_price, line_total, factor_snapshot, created_by, updated_by) VALUES
  ($1, 'd648cede-37ed-4ffe-8230-cb9c5c89fe01', 1, 'c15e3063-c401-449e-b826-5b8d66a5497e', 'f0394ad3-80ac-4fca-86cb-4020a6b1d5af', 'Tấm Mica Đài Loan Chochen trong suốt 2mm', 10, 620000, 6200000, 1, $2, $2),
  ($1, 'd648cede-37ed-4ffe-8230-cb9c5c89fe01', 2, 'ad0f4065-69c2-478e-ab2f-209922977a84', 'bfb0a8ba-1a80-4771-b8b1-79fc20f7ac07', 'Sắt hộp mạ kẽm Hòa Phát 20x20 dày 1.2mm', 25, 102000, 2550000, 1, $2, $2)
  ON CONFLICT DO NOTHING`, [orgId, userId]);

  // PO-2026-003 (6c71371e-6849-4274-8841-89175610d4fb)
  await pool.query(`INSERT INTO erp.purchase_order_lines (organization_id, purchase_order_id, line_no, item_id, unit_id, description, qty, unit_price, line_total, factor_snapshot, created_by, updated_by) VALUES
  ($1, '6c71371e-6849-4274-8841-89175610d4fb', 1, '009f5a3f-770c-42fa-be44-a2bc4b9ca983', 'f0394ad3-80ac-4fca-86cb-4020a6b1d5af', 'Tấm Alu Triều Chen ngoài trời PVDF 3mm', 25, 580000, 14500000, 1, $2, $2),
  ($1, '6c71371e-6849-4274-8841-89175610d4fb', 2, '0a7cb054-ad63-4f23-91c4-f93098a4c4b9', 'bfb0a8ba-1a80-4771-b8b1-79fc20f7ac07', 'Sắt hộp mạ kẽm Hòa Phát 30x30 dày 1.4mm', 45, 150000, 6750000, 1, $2, $2),
  ($1, '6c71371e-6849-4274-8841-89175610d4fb', 3, 'ad0f4065-69c2-478e-ab2f-209922977a84', 'bfb0a8ba-1a80-4771-b8b1-79fc20f7ac07', 'Ốc vít, keo chuyên dụng dán Alu', 10, 130000, 1300000, 1, $2, $2)
  ON CONFLICT DO NOTHING`, [orgId, userId]);

  console.log('Seeded lines successfully!');
  process.exit(0);
})();

import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log("=== BẮT ĐẦU SEED DỮ LIỆU VẬT TƯ & ĐA KHO NGÀNH BIỂN QUẢNG CÁO ===");

    // 1. Lấy Organization ID
    const orgRes = await client.query("SELECT id FROM erp.organizations WHERE code = 'SIGNAGE' LIMIT 1");
    if (orgRes.rows.length === 0) throw new Error("Org SIGNAGE not found!");
    const orgId = orgRes.rows[0].id;

    // Lấy Admin user id để làm created_by
    const userRes = await client.query('SELECT id FROM public."user" LIMIT 1');
    const adminUserId = userRes.rows[0].id;

    // Lấy đơn vị tính
    const unitsRes = await client.query("SELECT id, code FROM erp.units WHERE organization_id = $1", [orgId]);
    const units = {};
    for (const row of unitsRes.rows) {
      units[row.code] = row.id;
    }

    await client.query("BEGIN");

    // 2. Tạo 4 Kho (Warehouses)
    const WAREHOUSES = [
      { code: "KHO_XUONG", name: "Kho Xưởng Sản Xuất Chính", kind: "workshop" },
      { code: "KHO_THANH_PHAM", name: "Kho Phân Phối & Thành Phẩm", kind: "distribution" },
      { code: "KHO_XE_01", name: "Kho Xe Tải Lưu Động 01 (29C-888.99)", kind: "vehicle" },
      { code: "KHO_TAM_LE", name: "Kho Tấm Lẻ & Tối Ưu Phế Liệu", kind: "transit" },
    ];

    const warehouseMap = {};
    for (const w of WAREHOUSES) {
      const res = await client.query(
        `INSERT INTO erp.warehouses(organization_id, code, name, kind, is_active, created_by, updated_by)
         VALUES($1, $2, $3, $4, true, $5, $5)
         ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind
         RETURNING id, code`,
        [orgId, w.code, w.name, w.kind, adminUserId]
      );
      warehouseMap[res.rows[0].code] = res.rows[0].id;
    }
    console.log("✓ Đã khởi tạo 4 Điểm kho đa kho.");

    // 3. Tạo 4 Nhóm Vật Tư (Item Categories)
    const CATEGORIES = [
      { code: "SAT_HOP", name: "Sắt & Kim loại hộp" },
      { code: "ALU_MICA", name: "Tấm Alu & Mica" },
      { code: "LED_NGUON", name: "Đèn LED & Bộ nguồn" },
      { code: "BAT_DECAL", name: "Bạt in & Decal dán" },
    ];

    const categoryMap = {};
    for (const c of CATEGORIES) {
      const res = await client.query(
        `INSERT INTO erp.item_categories(organization_id, code, name, created_by, updated_by)
         VALUES($1, $2, $3, $4, $4)
         ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, code`,
        [orgId, c.code, c.name, adminUserId]
      );
      categoryMap[res.rows[0].code] = res.rows[0].id;
    }
    console.log("✓ Đã khởi tạo 4 Nhóm vật tư chuẩn ngành biển.");

    // 4. Tạo 12 Vật tư tiêu chuẩn (Items)
    const ITEMS = [
      // Sắt hộp
      {
        code: "SH-3030",
        name: "Sắt hộp mạ kẽm Hòa Phát 30x30 dày 1.4mm",
        kind: "material",
        categoryCode: "SAT_HOP",
        baseUnitCode: "CAY",
        spec: { size: "30x30mm", thickness: "1.4mm", brand: "Hòa Phát", length: "6m" },
        minQty: 20,
        reorderQty: 50,
        binLabel: "Giá Sắt A1-01",
        price: 185000,
        initQty: 85,
      },
      {
        code: "SH-2020",
        name: "Sắt hộp mạ kẽm Hòa Phát 20x20 dày 1.2mm",
        kind: "material",
        categoryCode: "SAT_HOP",
        baseUnitCode: "CAY",
        spec: { size: "20x20mm", thickness: "1.2mm", brand: "Hòa Phát", length: "6m" },
        minQty: 15,
        reorderQty: 40,
        binLabel: "Giá Sắt A1-02",
        price: 125000,
        initQty: 60,
      },
      // Alu & Mica
      {
        code: "ALU-ALCO-3MM",
        name: "Tấm Alu Alcorest trong nhà EV2002 3mm x 0.06",
        kind: "material",
        categoryCode: "ALU_MICA",
        baseUnitCode: "TAM",
        spec: { thickness: "3mm", coating: "0.06mm", size: "1220x2440mm", color: "Trắng sứ" },
        minQty: 10,
        reorderQty: 25,
        binLabel: "Kệ Alu B2-01",
        price: 360000,
        initQty: 42,
      },
      {
        code: "ALU-TRIEU-3MM",
        name: "Tấm Alu Triều Chen ngoài trời PVDF 3mm x 0.21",
        kind: "material",
        categoryCode: "ALU_MICA",
        baseUnitCode: "TAM",
        spec: { thickness: "3mm", coating: "0.21mm", size: "1220x2440mm", color: "Ghi bạc" },
        minQty: 8,
        reorderQty: 20,
        binLabel: "Kệ Alu B2-02",
        price: 520000,
        initQty: 28,
      },
      {
        code: "MICA-DAILOAN-2MM",
        name: "Tấm Mica Đài Loan Chochen trong suốt 2mm",
        kind: "material",
        categoryCode: "ALU_MICA",
        baseUnitCode: "TAM",
        spec: { thickness: "2mm", size: "1220x2440mm", type: "Trong suốt", brand: "Chochen" },
        minQty: 5,
        reorderQty: 15,
        binLabel: "Kệ Mica B1-01",
        price: 680000,
        initQty: 18,
      },
      {
        code: "MICA-DAILOAN-3MM",
        name: "Tấm Mica Đài Loan Chochen trắng sữa 3mm",
        kind: "material",
        categoryCode: "ALU_MICA",
        baseUnitCode: "TAM",
        spec: { thickness: "3mm", size: "1220x2440mm", type: "Trắng sữa", brand: "Chochen" },
        minQty: 5,
        reorderQty: 15,
        binLabel: "Kệ Mica B1-02",
        price: 890000,
        initQty: 14,
      },
      // LED & Nguồn
      {
        code: "LED-MOD-3B",
        name: "Led module 3 bóng 12V mắt lồi siêu sáng NC Korea",
        kind: "material",
        categoryCode: "LED_NGUON",
        baseUnitCode: "CAI",
        spec: { voltage: "12V", power: "1.2W", chip: "Samsung 2835", ip: "IP68" },
        minQty: 500,
        reorderQty: 1000,
        binLabel: "Ngăn Tủ Led C1-05",
        price: 4500,
        initQty: 2400,
      },
      {
        code: "NGUON-12V-33A",
        name: "Bộ nguồn tổ ong 12V 33A 400W chống nước ngoài trời",
        kind: "material",
        categoryCode: "LED_NGUON",
        baseUnitCode: "CAI",
        spec: { voltageIn: "220V", voltageOut: "12V", currentOut: "33A", power: "400W", ip: "IP67" },
        minQty: 5,
        reorderQty: 20,
        binLabel: "Kệ Nguồn C2-01",
        price: 320000,
        initQty: 22,
      },
      // Bạt in & Decal
      {
        code: "BAT-HIFLEX-36",
        name: "Bạt Hiflex đế ghi cản sáng 3.6 zem khổ 3.2m",
        kind: "material",
        categoryCode: "BAT_DECAL",
        baseUnitCode: "M2",
        spec: { thickness: "0.36mm", backing: "Grey Back (Đế ghi)", width: "3.2m" },
        minQty: 100,
        reorderQty: 300,
        binLabel: "Kệ Bạt D1-01",
        price: 28000,
        initQty: 450,
      },
      {
        code: "BAT-3M-UV",
        name: "Bạt 3M Panagraphics II in UV xuyên sáng cao cấp",
        kind: "material",
        categoryCode: "BAT_DECAL",
        baseUnitCode: "M2",
        spec: { brand: "3M USA", type: "Panagraphics II", warranty: "5 năm", width: "3.2m" },
        minQty: 30,
        reorderQty: 100,
        binLabel: "Kệ Bạt D1-02",
        price: 180000,
        initQty: 75,
      },
      {
        code: "DECAL-OUTF-TRANG",
        name: "Decal dán ngoài trời Avery/3M trắng sữa xuyên đèn",
        kind: "material",
        categoryCode: "BAT_DECAL",
        baseUnitCode: "M2",
        spec: { color: "Trắng sữa", surface: "Bóng mờ", width: "1.2m" },
        minQty: 40,
        reorderQty: 120,
        binLabel: "Kệ Decal D2-01",
        price: 55000,
        initQty: 130,
      },
      {
        code: "KEO-TITEBOND",
        name: "Keo Titebond Heavy Duty dán alu/chữ kim loại",
        kind: "material",
        categoryCode: "ALU_MICA",
        baseUnitCode: "TUYP",
        spec: { volume: "296ml", color: "Vàng nhạt", origin: "USA" },
        minQty: 20,
        reorderQty: 60,
        binLabel: "Tủ Hóa Chất E1-01",
        price: 68000,
        initQty: 54,
      },
    ];

    const itemMap = {};
    for (const it of ITEMS) {
      const baseUnitId = units[it.baseUnitCode];
      if (!baseUnitId) throw new Error(`Unit ${it.baseUnitCode} not found!`);

      const catId = categoryMap[it.categoryCode];

      const res = await client.query(
        `INSERT INTO erp.items(
           organization_id, code, name, kind, track_stock, 
           specification, is_active, category_id, base_unit_id, 
           created_by, updated_by
         )
         VALUES($1, $2, $3, $4, true, $5, true, $6, $7, $8, $8)
         ON CONFLICT (organization_id, code) 
         DO UPDATE SET name = EXCLUDED.name, specification = EXCLUDED.specification, base_unit_id = EXCLUDED.base_unit_id
         RETURNING id, code`,
        [orgId, it.code, it.name, it.kind, JSON.stringify(it.spec), catId, baseUnitId, adminUserId]
      );
      const itemId = res.rows[0].id;
      itemMap[it.code] = itemId;

      // Cài đặt định mức & vị trí giá kệ tại Kho Xưởng Chính
      await client.query(
        `INSERT INTO erp.warehouse_item_settings(
           organization_id, warehouse_id, item_id, 
           min_qty, reorder_qty, bin_label, created_by, updated_by
         )
         VALUES($1, $2, $3, $4, $5, $6, $7, $7)
         ON CONFLICT (organization_id, warehouse_id, item_id)
         DO UPDATE SET min_qty = EXCLUDED.min_qty, reorder_qty = EXCLUDED.reorder_qty, bin_label = EXCLUDED.bin_label`,
        [orgId, warehouseMap["KHO_XUONG"], itemId, it.minQty, it.reorderQty, it.binLabel, adminUserId]
      );

      // Tạo Standard Lot
      const lotRes = await client.query(
        `INSERT INTO erp.stock_lots(
           organization_id, lot_code, kind, item_id, created_by, updated_by
         )
         VALUES($1, $2, 'standard', $3, $4, $4)
         ON CONFLICT (organization_id, item_id, lot_code) DO UPDATE SET kind = 'standard'
         RETURNING id`,
        [orgId, `${it.code}-STD`, itemId, adminUserId]
      );
      const stdLotId = lotRes.rows[0].id;

      // Khởi tạo Tồn kho ban đầu tại Kho Xưởng Chính
      await client.query(
        `INSERT INTO erp.stock_balances(
           organization_id, warehouse_id, item_id, lot_id,
           on_hand_qty, reserved_qty, inventory_value, created_by, updated_by
         )
         VALUES($1, $2, $3, $4, $5, 0, $6, $7, $7)
         ON CONFLICT (organization_id, warehouse_id, item_id, lot_id)
         DO UPDATE SET on_hand_qty = EXCLUDED.on_hand_qty, inventory_value = EXCLUDED.inventory_value`,
        [orgId, warehouseMap["KHO_XUONG"], itemId, stdLotId, it.initQty, it.initQty * it.price, adminUserId]
      );
    }
    console.log("✓ Đã khởi tạo 12 vật tư tiêu chuẩn & tồn kho ban đầu.");

    // 5. Khởi tạo Tấm Lẻ & Phế Liệu (Remnants) trong kho KHO_TAM_LE
    const REMNANTS = [
      {
        itemCode: "ALU-ALCO-3MM",
        lotCode: "REM-ALU-01",
        lengthMm: 1200,
        widthMm: 850,
        qty: 3,
        binLabel: "Kệ Tấm Lẻ R1-01",
      },
      {
        itemCode: "ALU-TRIEU-3MM",
        lotCode: "REM-ALU-02",
        lengthMm: 1400,
        widthMm: 600,
        qty: 2,
        binLabel: "Kệ Tấm Lẻ R1-02",
      },
      {
        itemCode: "MICA-DAILOAN-2MM",
        lotCode: "REM-MICA-01",
        lengthMm: 800,
        widthMm: 550,
        qty: 4,
        binLabel: "Hộc Mica Lẻ R2-01",
      },
    ];

    for (const rem of REMNANTS) {
      const itemId = itemMap[rem.itemCode];
      const remLotRes = await client.query(
        `INSERT INTO erp.stock_lots(
           organization_id, lot_code, kind, length_mm, width_mm, item_id, created_by, updated_by
         )
         VALUES($1, $2, 'remnant', $3, $4, $5, $6, $6)
         ON CONFLICT (organization_id, item_id, lot_code)
         DO UPDATE SET length_mm = EXCLUDED.length_mm, width_mm = EXCLUDED.width_mm
         RETURNING id`,
        [orgId, rem.lotCode, rem.lengthMm, rem.widthMm, itemId, adminUserId]
      );
      const remLotId = remLotRes.rows[0].id;

      // Tồn kho tấm lẻ
      await client.query(
        `INSERT INTO erp.stock_balances(
           organization_id, warehouse_id, item_id, lot_id, on_hand_qty, reserved_qty, inventory_value, created_by, updated_by
         )
         VALUES($1, $2, $3, $4, $5, 0, $6, $7, $7)
         ON CONFLICT (organization_id, warehouse_id, item_id, lot_id)
         DO UPDATE SET on_hand_qty = EXCLUDED.on_hand_qty, inventory_value = EXCLUDED.inventory_value`,
        [orgId, warehouseMap["KHO_TAM_LE"], itemId, remLotId, rem.qty, rem.qty * 150000, adminUserId]
      );
    }
    console.log("✓ Đã khởi tạo danh mục tấm lẻ alu & mica cắt dở.");

    // 6. Tạo 3 Phiếu Kho mẫu: 1 Nhập, 1 Xuất, 1 Điều chuyển
    // Phiếu Nhập: Nhập sắt hộp và alu từ NCC
    let docReceipt = (await client.query("SELECT id, status FROM erp.stock_documents WHERE organization_id = $1 AND code = 'PNK-2026-001'", [orgId])).rows[0];
    if (!docReceipt) {
      const docReceiptRes = await client.query(
        `INSERT INTO erp.stock_documents(
           organization_id, code, type, purpose, reason, status, 
           destination_warehouse_id, created_by, updated_by
         )
         VALUES($1, 'PNK-2026-001', 'receipt', 'Nhập bổ sung vật tư thi công tháng 9', 'Đơn mua hàng PO-2026-089', 'draft', $2, $3, $3)
         RETURNING id`,
        [orgId, warehouseMap["KHO_XUONG"], adminUserId]
      );
      const docReceiptId = docReceiptRes.rows[0].id;
      const stdLotSh = (await client.query("SELECT id FROM erp.stock_lots WHERE lot_code = 'SH-3030-STD' LIMIT 1")).rows[0].id;
      await client.query(
        `INSERT INTO erp.stock_document_lines(
           organization_id, document_id, line_no, item_id, lot_id, unit_id, 
           qty, factor_snapshot, base_qty, unit_cost_snapshot, created_by, updated_by
         )
         VALUES($1, $2, 1, $3, $4, $5, 50, 1, 50, 185000, $6, $6)`,
        [orgId, docReceiptId, itemMap["SH-3030"], stdLotSh, units["CAY"], adminUserId]
      );
      await client.query(
        `UPDATE erp.stock_documents 
         SET status = 'completed', posted_at = now() - interval '2 days', updated_by = $1
         WHERE id = $2`,
        [adminUserId, docReceiptId]
      );
    }

    // Phiếu Xuất: Xuất vật tư cho thợ gia công biển
    let docIssue = (await client.query("SELECT id, status FROM erp.stock_documents WHERE organization_id = $1 AND code = 'PXK-2026-015'", [orgId])).rows[0];
    if (!docIssue) {
      const docIssueRes = await client.query(
        `INSERT INTO erp.stock_documents(
           organization_id, code, type, purpose, reason, status, 
           source_warehouse_id, created_by, updated_by
         )
         VALUES($1, 'PXK-2026-015', 'issue', 'Xuất vật tư thi công Pano Ngã 6', 'Lệnh sản xuất LSX-004', 'draft', $2, $3, $3)
         RETURNING id`,
        [orgId, warehouseMap["KHO_XUONG"], adminUserId]
      );
      const docIssueId = docIssueRes.rows[0].id;
      const aluLot = (await client.query("SELECT id FROM erp.stock_lots WHERE lot_code = 'ALU-ALCO-3MM-STD' LIMIT 1")).rows[0].id;
      await client.query(
        `INSERT INTO erp.stock_document_lines(
           organization_id, document_id, line_no, item_id, lot_id, unit_id, 
           qty, factor_snapshot, base_qty, unit_cost_snapshot, created_by, updated_by
         )
         VALUES($1, $2, 1, $3, $4, $5, 12, 1, 12, 360000, $6, $6)`,
        [orgId, docIssueId, itemMap["ALU-ALCO-3MM"], aluLot, units["TAM"], adminUserId]
      );
      await client.query(
        `UPDATE erp.stock_documents 
         SET status = 'approved', updated_by = $1
         WHERE id = $2`,
        [adminUserId, docIssueId]
      );
    }

    // Phiếu Điều chuyển: Điều chuyển vật tư phụ từ Xưởng sang Xe tải lưu động
    let docTransfer = (await client.query("SELECT id, status FROM erp.stock_documents WHERE organization_id = $1 AND code = 'PDC-2026-003'", [orgId])).rows[0];
    if (!docTransfer) {
      const docTransferRes = await client.query(
        `INSERT INTO erp.stock_documents(
           organization_id, code, type, purpose, reason, status, 
           source_warehouse_id, destination_warehouse_id, created_by, updated_by
         )
         VALUES($1, 'PDC-2026-003', 'transfer', 'Cấp phát vật tư dự phòng cho xe thợ thi công', 'Đề xuất điều phối xe tải 29C-888.99', 'draft', $2, $3, $4, $4)
         RETURNING id`,
        [orgId, warehouseMap["KHO_XUONG"], warehouseMap["KHO_XE_01"], adminUserId]
      );
      const docTransferId = docTransferRes.rows[0].id;
      const titebondLot = (await client.query("SELECT id FROM erp.stock_lots WHERE lot_code = 'KEO-TITEBOND-STD' LIMIT 1")).rows[0].id;
      await client.query(
        `INSERT INTO erp.stock_document_lines(
           organization_id, document_id, line_no, item_id, lot_id, unit_id, 
           qty, factor_snapshot, base_qty, unit_cost_snapshot, created_by, updated_by
         )
         VALUES($1, $2, 1, $3, $4, $5, 10, 1, 10, 68000, $6, $6)`,
        [orgId, docTransferId, itemMap["KEO-TITEBOND"], titebondLot, units["TUYP"], adminUserId]
      );
      await client.query(
        `UPDATE erp.stock_documents 
         SET status = 'submitted', updated_by = $1
         WHERE id = $2`,
        [adminUserId, docTransferId]
      );
    }

    console.log("✓ Đã khởi tạo 3 Phiếu kho mẫu (Nhập, Xuất, Điều chuyển).");

    await client.query("COMMIT");

    console.log("\n=======================================================");
    console.log("🎉 SEED TOÀN BỘ DỮ LIỆU BƯỚC 1 VẬT TƯ & ĐA KHO THÀNH CÔNG!");
    console.log("=======================================================\n");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Lỗi seed vật tư & kho:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

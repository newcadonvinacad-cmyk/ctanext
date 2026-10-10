import nextEnv from '@next/env';
import pg from 'pg';
import crypto from 'node:crypto';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seedProductionDemo() {
  const client = await pool.connect();
  try {
    console.log('=== BẮT ĐẦU IMPORT DỮ LIỆU MẪU SẢN XUẤT THEO TRÌNH TỰ NGHIỆP VỤ ===');
    await client.query('BEGIN');

    // 0. Lấy thông tin cơ bản: Organization, Admin User, Membership
    const orgRes = await client.query("SELECT id FROM erp.organizations WHERE code = 'SIGNAGE' LIMIT 1");
    if (!orgRes.rows.length) throw new Error("Chưa có Organization 'SIGNAGE'");
    const orgId = orgRes.rows[0].id;

    const userRes = await client.query(
      "SELECT u.id, m.id AS mem_id FROM public.user u JOIN erp.memberships m ON m.user_id = u.id WHERE u.email = 'admin@signage-erp.vn' LIMIT 1"
    );
    if (!userRes.rows.length) throw new Error("Chưa có Admin user/membership");
    const adminUserId = userRes.rows[0].id;
    const adminMemId = userRes.rows[0].mem_id;

    // BƯỚC 1: Cấu hình nhân sự & tổ xưởng (để phân bổ công đoạn WBS)
    console.log('1. Cấu hình nhân sự cho tổ xưởng cơ khí...');
    const thoEmp = (await client.query("SELECT id FROM erp.employees WHERE code = 'NV-THO' LIMIT 1")).rows[0]?.id;
    const adminEmp = (await client.query("SELECT id FROM erp.employees WHERE code = 'NV-ADMIN' LIMIT 1")).rows[0]?.id;
    const teamRes = await client.query("SELECT id FROM erp.teams WHERE code = 'TO-COKHI' LIMIT 1");
    if (!teamRes.rows.length) throw new Error("Chưa có tổ xưởng 'TO-COKHI'");
    const teamId = teamRes.rows[0].id;

    if (thoEmp) {
      const exists = (await client.query("SELECT id FROM erp.team_members WHERE organization_id = $1 AND team_id = $2 AND employee_id = $3", [orgId, teamId, thoEmp])).rows;
      if (!exists.length) {
        await client.query(
          `INSERT INTO erp.team_members(organization_id, team_id, employee_id, valid_from)
           VALUES($1, $2, $3, now())`,
          [orgId, teamId, thoEmp]
        );
      }
    }
    if (adminEmp) {
      const exists = (await client.query("SELECT id FROM erp.team_members WHERE organization_id = $1 AND team_id = $2 AND employee_id = $3", [orgId, teamId, adminEmp])).rows;
      if (!exists.length) {
        await client.query(
          `INSERT INTO erp.team_members(organization_id, team_id, employee_id, valid_from)
           VALUES($1, $2, $3, now())`,
          [orgId, teamId, adminEmp]
        );
      }
    }
    console.log('✓ Đã cập nhật thành viên cho Tổ xưởng cơ khí.');

    // BƯỚC 2: Cấu hình gán vật tư đại diện (Gán quy cách & Đại diện)
    console.log('2. Thiết lập quy cách & gán vật tư đại diện...');
    const itemFrame = (await client.query("SELECT id, base_unit_id FROM erp.items WHERE code = 'SH-3030' LIMIT 1")).rows[0];
    const itemFace = (await client.query("SELECT id, base_unit_id FROM erp.items WHERE code = 'ALU-TRIEU-3MM' LIMIT 1")).rows[0];
    const itemLetters = (await client.query("SELECT id, base_unit_id FROM erp.items WHERE code = 'TP-2026-4415' LIMIT 1")).rows[0];

    if (itemFrame) {
      await client.query(
        `UPDATE erp.material_representatives 
         SET default_item_id = $1, default_unit_id = $2, quantity_basis = 'perimeter', rules = '{"coefficient": 1, "wasteRate": 5}', updated_at = now()
         WHERE organization_id = $3 AND code = 'frame'`,
        [itemFrame.id, itemFrame.base_unit_id, orgId]
      );
    }
    if (itemFace) {
      await client.query(
        `UPDATE erp.material_representatives 
         SET default_item_id = $1, default_unit_id = $2, quantity_basis = 'area', rules = '{"coefficient": 1, "wasteRate": 8}', updated_at = now()
         WHERE organization_id = $3 AND code = 'face'`,
        [itemFace.id, itemFace.base_unit_id, orgId]
      );
    }
    if (itemLetters) {
      await client.query(
        `UPDATE erp.material_representatives 
         SET default_item_id = $1, default_unit_id = $2, quantity_basis = 'manual', rules = '{"coefficient": 1, "wasteRate": 0}', updated_at = now()
         WHERE organization_id = $3 AND code = 'letters'`,
        [itemLetters.id, itemLetters.base_unit_id, orgId]
      );
    }
    console.log('✓ Đã thiết lập gán vật tư đại diện mặc định (Khung, Mặt biển, Chữ nổi).');

    // BƯỚC 3: Dự án & Khảo sát & Maket đã duyệt
    console.log('3. Chuẩn bị hồ sơ dự án & maket đã duyệt...');
    const projRes = await client.query("SELECT id, code, name, customer_id FROM erp.projects WHERE code = 'DA-2026-002' LIMIT 1");
    if (!projRes.rows.length) throw new Error("Chưa có dự án 'DA-2026-002'");
    const project = projRes.rows[0];

    const surveyRes = await client.query("SELECT id, code, width_meters, height_meters FROM erp.site_surveys WHERE project_id = $1 LIMIT 1", [project.id]);
    if (!surveyRes.rows.length) throw new Error('Chưa có khảo sát thuộc dự án DA-2026-002');
    const survey = surveyRes.rows[0];

    // Cập nhật client_feedback của maket MK-2026-0002 mang _parametricSpec chuẩn
    const proofRes = await client.query("SELECT id, code, title FROM erp.design_proofs WHERE code = 'MK-2026-0002' LIMIT 1");
    if (!proofRes.rows.length) throw new Error("Chưa có maket 'MK-2026-0002'");
    const proof = proofRes.rows[0];

    const parametricSpec = {
      surveyId: survey.id,
      input: {
        widthMeters: Number(survey.width_meters),
        heightMeters: Number(survey.height_meters),
        materialType: 'Tấm Alu Triều Chen ngoài trời PVDF 3mm x 0.21',
      },
      drawing: {
        width: Number(survey.width_meters) * 1000,
        height: Number(survey.height_meters) * 1000,
      },
    };

    await client.query(
      `UPDATE erp.design_proofs 
       SET status = 'approved', client_feedback = $1, updated_at = now()
       WHERE id = $2`,
      [JSON.stringify({ note: 'Khách hàng duyệt phương án 1', _parametricSpec: parametricSpec }), proof.id]
    );
    console.log(`✓ Hồ sơ maket ${proof.code} đã liên kết khảo sát ${survey.code} (${survey.width_meters}m x ${survey.height_meters}m).`);

    // BƯỚC 4: Tạo BOM định mức từ Maket
    console.log('4. Khởi tạo BOM định mức kỹ thuật dự án...');
    let bomId;
    const existingBom = (await client.query("SELECT id FROM erp.project_boms WHERE project_id = $1 AND design_proof_id = $2 LIMIT 1", [project.id, proof.id])).rows[0];
    
    const repFrame = (await client.query("SELECT id FROM erp.material_representatives WHERE code = 'frame' LIMIT 1")).rows[0]?.id;
    const repFace = (await client.query("SELECT id FROM erp.material_representatives WHERE code = 'face' LIMIT 1")).rows[0]?.id;
    const repLetters = (await client.query("SELECT id FROM erp.material_representatives WHERE code = 'letters' LIMIT 1")).rows[0]?.id;

    const width = Number(survey.width_meters);
    const height = Number(survey.height_meters);

    if (existingBom) {
      bomId = existingBom.id;
      console.log('✓ BOM dự án đã tồn tại:', bomId);
    } else {
      const bomCode = `BOM-DA-${new Date().getFullYear()}-001`;
      const bomRes = await client.query(
        `INSERT INTO erp.project_boms(organization_id, code, title, project_id, signage_type, width_meters, height_meters, design_proof_id, survey_id, mapped, source_snapshot, status, revision_no, created_by, updated_by)
         VALUES($1, $2, $3, $4, 'other', $5, $6, $7, $8, true, $9, 'draft', 1, $10, $10)
         RETURNING id`,
        [
          orgId,
          bomCode,
          `BOM Mặt dựng Alu Chữ Nổi Inox - ${project.name}`,
          project.id,
          width,
          height,
          proof.id,
          survey.id,
          { proof: { id: proof.id, code: proof.code }, survey: { id: survey.id, code: survey.code }, parametricSpec },
          adminUserId,
        ]
      );
      bomId = bomRes.rows[0].id;

      // Thêm các dòng BOM đã gán đúng vật tư thật trong kho
      await client.query(
        `INSERT INTO erp.project_bom_lines(organization_id, bom_id, line_no, representative_id, description, quantity, item_id, unit_id, waste_rate, notes)
         VALUES
         ($1, $2, 1, $3, 'Khung sắt hộp mạ kẽm gia cố chịu lực', $4, $5, $6, 5, 'Chu vi mặt dựng gia cố 45.4m'),
         ($1, $2, 2, $7, 'Mặt dựng ốp Alu Triều Chen PVDF', $8, $9, $10, 8, 'Diện tích mặt tiền 77.7 m2'),
         ($1, $2, 3, $11, 'Bộ chữ nổi Inox vàng gương logo VNG Campus', 1, $12, $13, 0, 'Gia công uốn chân nổi 60mm')`,
        [
          orgId,
          bomId,
          repFrame,
          2 * (width + height),
          itemFrame.id,
          itemFrame.base_unit_id,
          repFace,
          width * height,
          itemFace.id,
          itemFace.base_unit_id,
          repLetters,
          itemLetters.id,
          itemLetters.base_unit_id,
        ]
      );
      console.log('✓ Đã lập BOM định mức kỹ thuật:', bomCode);
    }

    // BƯỚC 5: Tạo Lệnh sản xuất (Production Order)
    console.log('5. Lập Lệnh sản xuất gắn WBS dự án...');
    const orderCode = `LSX-${new Date().getFullYear()}-001`;
    let prodOrderId;
    const existingOrder = (await client.query("SELECT id FROM erp.production_orders WHERE code = $1 LIMIT 1", [orderCode])).rows[0];

    const whXuong = (await client.query("SELECT id FROM erp.warehouses WHERE code = 'KHO_XUONG' LIMIT 1")).rows[0]?.id;
    const whThanhPham = (await client.query("SELECT id FROM erp.warehouses WHERE code = 'KHO_THANH_PHAM' LIMIT 1")).rows[0]?.id;

    if (existingOrder) {
      prodOrderId = existingOrder.id;
      console.log('✓ Lệnh sản xuất đã có sẵn:', prodOrderId);
    } else {
      // 5.1 Tạo WBS Task cha
      const wbsParent = (
        await client.query(
          `INSERT INTO erp.tasks(organization_id, code, title, project_id, progress_mode, created_by, updated_by)
           VALUES($1, $2, $3, $4, 'children', $5, $5)
           RETURNING id`,
          [orgId, `${orderCode}-WBS`, `Sản xuất xưởng - ${project.name}`, project.id, adminUserId]
        )
      ).rows[0].id;

      // 5.2 Tạo Production Order
      const prodOrderRes = await client.query(
        `INSERT INTO erp.production_orders(organization_id, code, title, task_id, team_id, project_id, due_at, status, source_snapshot, created_by, updated_by)
         VALUES($1, $2, $3, $4, $5, $6, now() + interval '7 days', 'in_progress', $7, $8, $8)
         RETURNING id`,
        [
          orgId,
          orderCode,
          `Sản xuất Mặt Dựng Alu Chữ Nổi Inox - ${project.name}`,
          wbsParent,
          teamId,
          project.id,
          { project: { id: project.id, code: project.code, name: project.name } },
          adminUserId,
        ]
      );
      prodOrderId = prodOrderRes.rows[0].id;

      // 5.3 Tạo Line sản xuất
      const wbsLine = (
        await client.query(
          `INSERT INTO erp.tasks(organization_id, code, title, project_id, parent_id, created_by, updated_by)
           VALUES($1, $2, $3, $4, $5, $6, $6)
           RETURNING id`,
          [orgId, `${orderCode}-L1`, `Gia công & Lắp ráp trọn bộ mặt dựng Alu chữ nổi`, project.id, wbsParent, adminUserId]
        )
      ).rows[0].id;

      // 5.3 Lấy thông tin BOM đầy đủ kèm lines để đưa vào snapshot
      const bomDetailRes = await client.query('SELECT * FROM erp.project_boms WHERE id = $1', [bomId]);
      const bomSnapshot = bomDetailRes.rows[0];
      const bomLinesRes = await client.query(
        `SELECT l.*, i.code AS item_code, i.name AS item_name, u.name AS unit_name
         FROM erp.project_bom_lines l
         LEFT JOIN erp.items i ON i.id = l.item_id
         LEFT JOIN erp.units u ON u.id = l.unit_id
         WHERE l.bom_id = $1 ORDER BY l.line_no`,
        [bomId]
      );
      bomSnapshot.lines = bomLinesRes.rows;

      const lineRes = await client.query(
        `INSERT INTO erp.production_order_lines(
           organization_id, production_order_id, bom_id, design_proof_id, task_id, team_id,
           output_item_id, unit_id, title, target_qty, bom_yield_qty, received_qty, has_electrical, status, snapshot
         )
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, 1, 1, true, 'completed', $10)
         RETURNING id`,
        [
          orgId,
          prodOrderId,
          bomId,
          proof.id,
          wbsLine,
          teamId,
          itemLetters.id,
          itemLetters.base_unit_id,
          `Hạng mục Biển hiệu mặt tiền Alu VNG Campus`,
          {
            bom: bomSnapshot,
            design: { proof, survey },
            outputItem: { id: itemLetters.id, code: 'TP-2026-4415', name: 'Bộ chữ' },
            hasElectrical: true,
            lineNo: 1,
          },
        ]
      );
      const lineId = lineRes.rows[0].id;

      // 5.4 Tạo NVL cho Line
      const pMatFrame = (
        await client.query(
          `INSERT INTO erp.production_materials(organization_id, production_order_id, production_order_line_id, item_id, required_base_qty, source_warehouse_id, created_by, updated_by)
           VALUES($1, $2, $3, $4, 45.4, $5, $6, $6) RETURNING id`,
          [orgId, prodOrderId, lineId, itemFrame.id, whXuong, adminUserId]
        )
      ).rows[0].id;

      const pMatFace = (
        await client.query(
          `INSERT INTO erp.production_materials(organization_id, production_order_id, production_order_line_id, item_id, required_base_qty, source_warehouse_id, created_by, updated_by)
           VALUES($1, $2, $3, $4, 77.7, $5, $6, $6) RETURNING id`,
          [orgId, prodOrderId, lineId, itemFace.id, whXuong, adminUserId]
        )
      ).rows[0].id;

      // 5.5 Tạo các công đoạn sản xuất
      const steps = [
        { seq: 1, title: 'Hàn khung sắt hộp & xử lý mối hàn kết cấu', progress: 100, status: 'done' },
        { seq: 2, title: 'Cắt phay rãnh & ốp tấm Alu Triều Chen', progress: 100, status: 'done' },
        { seq: 3, title: 'Uốn chân chữ Inox & đi dây LED kiểm tra an toàn điện', progress: 100, status: 'done' },
        { seq: 4, title: 'Nghiệm thu QC xuất xưởng & đóng gói bảo vệ', progress: 100, status: 'done' },
      ];
      for (const s of steps) {
        const stepRes = await client.query(
          `INSERT INTO erp.production_steps(organization_id, order_line_id, sequence, title, status, progress, started_at, completed_at)
           VALUES($1, $2, $3, $4, $5, $6, now() - interval '3 days', now() - interval '1 days')
           RETURNING id`,
          [orgId, lineId, s.seq, s.title, s.status, s.progress]
        );
        const stepId = stepRes.rows[0].id;

        // Nhật ký tiến độ cho từng bước
        await client.query(
          `INSERT INTO erp.production_step_reports(organization_id, step_id, progress, output_qty, waste_qty, notes, reported_by, reported_at)
           VALUES($1, $2, $3, 1, 0, $4, $5, now() - interval '2 days')`,
          [orgId, stepId, s.progress, `Đã hoàn thành tốt bước ${s.seq} theo tiêu chuẩn kỹ thuật`, adminUserId]
        );
      }

      // 5.6 Phiếu xuất kho NVL: Tạo ở trạng thái draft, thêm lines, sau đó update sang completed
      const docCodeIssue = `XK-SX-${new Date().getFullYear()}-001`;
      const docIssueRes = await client.query(
        `INSERT INTO erp.stock_documents(organization_id, code, type, purpose, status, source_warehouse_id, project_id, production_order_id, workflow_kind, created_by, updated_by)
         VALUES($1, $2, 'issue', $3, 'draft', $4, $5, $6, 'production_material', $7, $7)
         RETURNING id`,
        [orgId, docCodeIssue, `Xuất cấp NVL sản xuất ${orderCode}`, whXuong, project.id, prodOrderId, adminUserId]
      );
      const docIssueId = docIssueRes.rows[0].id;

      // Lấy lô vật tư sẵn có trong kho
      const lotFrame = (await client.query("SELECT id FROM erp.stock_lots WHERE item_id = $1 LIMIT 1", [itemFrame.id])).rows[0]?.id;
      const lotFace = (await client.query("SELECT id FROM erp.stock_lots WHERE item_id = $1 LIMIT 1", [itemFace.id])).rows[0]?.id;

      await client.query(
        `INSERT INTO erp.stock_document_lines(organization_id, document_id, line_no, item_id, unit_id, lot_id, base_qty, qty, factor_snapshot, unit_cost_snapshot, production_material_id)
         VALUES
         ($1, $2, 1, $3, $4, $5, 20, 20, 1, 150000, $6),
         ($1, $2, 2, $7, $8, $9, 15, 15, 1, 480000, $10)`,
        [
          orgId,
          docIssueId,
          itemFrame.id,
          itemFrame.base_unit_id,
          lotFrame,
          pMatFrame,
          itemFace.id,
          itemFace.base_unit_id,
          lotFace,
          pMatFace,
        ]
      );

      // Chuyển phiếu xuất kho sang completed
      await client.query(
        `UPDATE erp.stock_documents SET status = 'completed', updated_by = $1, updated_at = now() WHERE id = $2`,
        [adminUserId, docIssueId]
      );

      // 5.7 Biên bản QC hoàn tất đạt chuẩn
      const qcCode = `QC-${new Date().getFullYear()}-001`;
      await client.query(
        `INSERT INTO erp.factory_qc_records(organization_id, project_id, code, production_order_line_id, accepted_qty, rejected_qty, status, checks, defect_notes, inspector_employee_id, created_by, updated_by)
         VALUES($1, $2, $3, $4, 1, 0, 'passed', $5, 'Bề mặt phẳng, màu chuẩn, an toàn điện tuyệt đối', $6, $7, $7)`,
        [
          orgId,
          project.id,
          qcCode,
          lineId,
          JSON.stringify({
            dimensions: true,
            appearance: true,
            structure: true,
            accessories: true,
            electrical: true,
            lightUniformity: true,
          }),
          adminEmp,
          adminUserId,
        ]
      );

      // 5.8 Tạo Lô thành phẩm riêng (Project Lot) và Phiếu nhập kho thành phẩm
      const tpLotCode = `TP-VNG-${new Date().getFullYear()}-L01`;
      const tpLotRes = await client.query(
        `INSERT INTO erp.stock_lots(organization_id, lot_code, item_id, project_id, production_order_line_id, design_proof_id, design_snapshot, created_by, updated_by)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING id`,
        [
          orgId,
          tpLotCode,
          itemLetters.id,
          project.id,
          lineId,
          proof.id,
          { proof: { code: proof.code }, survey: { code: survey.code } },
          adminUserId,
        ]
      );
      const tpLotId = tpLotRes.rows[0].id;

      const docCodeReceipt = `NK-TP-${new Date().getFullYear()}-001`;
      const docReceiptRes = await client.query(
        `INSERT INTO erp.stock_documents(organization_id, code, type, purpose, status, destination_warehouse_id, project_id, production_order_id, workflow_kind, created_by, updated_by)
         VALUES($1, $2, 'receipt', $3, 'draft', $4, $5, $6, 'production_output', $7, $7)
         RETURNING id`,
        [orgId, docCodeReceipt, `Nhập kho thành phẩm theo lô ${orderCode}`, whThanhPham, project.id, prodOrderId, adminUserId]
      );
      const docReceiptId = docReceiptRes.rows[0].id;

      await client.query(
        `INSERT INTO erp.stock_document_lines(organization_id, document_id, line_no, item_id, unit_id, lot_id, base_qty, qty, factor_snapshot, unit_cost_snapshot)
         VALUES($1, $2, 1, $3, $4, $5, 1, 1, 1, 125000000)`,
        [orgId, docReceiptId, itemLetters.id, itemLetters.base_unit_id, tpLotId]
      );

      // Chuyển phiếu nhập kho sang completed
      await client.query(
        `UPDATE erp.stock_documents SET status = 'completed', updated_by = $1, updated_at = now() WHERE id = $2`,
        [adminUserId, docReceiptId]
      );

      // Cập nhật production_outputs
      await client.query(
        `INSERT INTO erp.production_outputs(organization_id, production_order_id, production_order_line_id, receipt_document_id, lot_id, accepted_qty, accepted_by, created_by, updated_by)
         VALUES($1, $2, $3, $4, $5, 1, $6, $6, $6)`,
        [orgId, prodOrderId, lineId, docReceiptId, tpLotId, adminUserId]
      );

      // Tăng số dư tồn kho thành phẩm khả dụng theo đúng lô
      await client.query(
        `INSERT INTO erp.stock_balances(organization_id, warehouse_id, item_id, lot_id, on_hand_qty, reserved_qty, inventory_value)
         VALUES($1, $2, $3, $4, 1, 0, 125000000)
         ON CONFLICT (organization_id, warehouse_id, item_id, lot_id) 
         DO UPDATE SET on_hand_qty = erp.stock_balances.on_hand_qty + 1`,
        [orgId, whThanhPham, itemLetters.id, tpLotId]
      );

      console.log(`✓ Đã nhập kho thành phẩm theo lô ${tpLotCode} vào kho ${whThanhPham}.`);
    }

    await client.query('COMMIT');
    console.log('=== HOÀN TẤT IMPORT DỮ LIỆU MẪU SẢN XUẤT THÀNH CÔNG ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Lỗi khi import dữ liệu mẫu:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedProductionDemo();

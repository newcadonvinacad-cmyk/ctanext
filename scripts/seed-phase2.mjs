import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seedPhase2() {
  const client = await pool.connect();
  try {
    console.log("=== BẮT ĐẦU SEED DỮ LIỆU GIAI ĐOẠN 2: KHẢO SÁT, MARKET, QC VÀ BẢO HÀNH ===");
    await client.query("BEGIN");

    const orgRes = await client.query("SELECT id FROM erp.organizations WHERE code = 'SIGNAGE' LIMIT 1");
    const orgId = orgRes.rows[0].id;

    const prjs = (await client.query("SELECT id, code, name, customer_id FROM erp.projects WHERE organization_id = $1", [orgId])).rows;
    const p1 = prjs.find(p => p.code === "DA-2026-001") || prjs[0];
    const p2 = prjs.find(p => p.code === "DA-2026-002") || prjs[1] || prjs[0];
    const p3 = prjs.find(p => p.code === "DA-2026-003") || prjs[2] || prjs[0];

    const emps = (await client.query("SELECT id, name FROM erp.employees WHERE organization_id = $1", [orgId])).rows;
    const empSurveyor = emps.find(e => e.name.includes("Tuấn"))?.id || emps[0]?.id;
    const empInspector = emps.find(e => e.name.includes("Trọng"))?.id || emps[1]?.id;

    // 1. SEED KHẢO SÁT HIỆN TRƯỜNG (erp.site_surveys)
    console.log("Seeding site surveys...");
    await client.query(`
      INSERT INTO erp.site_surveys (
        organization_id, code, customer_id, project_id, title, address, survey_date,
        surveyor_employee_id, status, width_meters, height_meters, depth_meters, floor_level,
        elevation_meters, structure_type, power_source, power_distance_meters, installation_method,
        obstacles, notes, photos
      ) VALUES
      (
        $1, 'KS-2026-0001', $2, $3,
        'Khảo sát mặt bằng biển hộp đèn 3M Highlands Vincom Bà Triệu',
        '191 Bà Triệu, Lê Đại Hành, Hai Bà Trưng, Hà Nội',
        CURRENT_DATE - interval '18 days', $4, 'completed',
        8.50, 2.40, 0.35, 'Tầng 1 (Mặt tiền sảnh chính)', 3.80,
        'Dầm bê tông chịu lực & tường gạch 220mm chắc chắn',
        '220V 1 pha, kéo từ tủ điện kỹ thuật tòa nhà', 14.5,
        'Giàn giáo 2 tầng tiêu chuẩn & thang nhôm rút chữ A',
        'Tránh giờ cao điểm khách ra vào sảnh TTTM (thi công ban đêm sau 22h)',
        'Khách yêu cầu dây nguồn bọc ống gen chống cháy, hộp đèn bạt 3M in UV 2 lớp sắc nét.',
        '[
          {"url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80", "caption": "Toàn cảnh mặt tiền sảnh Bà Triệu", "stage": "before"},
          {"url": "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?auto=format&fit=crop&w=800&q=80", "caption": "Vị trí dầm bê tông & hộp kỹ thuật điện", "stage": "structure"}
        ]'::jsonb
      ),
      (
        $1, 'KS-2026-0002', $5, $6,
        'Đo đạc & Khảo sát kết cấu mặt dựng Alu Chữ Inox VNG Campus',
        'Khu chế xuất Tân Thuận, Phường Tân Thuận Đông, Quận 7, TP.HCM',
        CURRENT_DATE - interval '14 days', $4, 'completed',
        18.50, 4.20, 0.45, 'Mặt dựng khối nhà A (Tầng 2 - 3)', 8.50,
        'Hệ khung xương thép tiền chế I150 chịu tải gió cấp 10',
        '380V 3 pha, tủ điện tổng tầng 2 có aptomat 63A', 8.0,
        'Xe cẩu thùng chuyên dụng vươn cần 15m & dây đai an toàn 2 móc',
        'Mặt bằng thông thoáng, xe cẩu tiếp cận sát chân công trình thuận lợi',
        'Chữ nổi Inox vàng gương lọng mica cháo, module LED 3 mắt Hàn Quốc sáng chân sang trọng.',
        '[
          {"url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80", "caption": "Góc đo đạc dầm thép tiền chế", "stage": "structure"}
        ]'::jsonb
      ),
      (
        $1, 'KS-2026-0003', $7, $8,
        'Khảo sát hiện trạng mặt bằng Showroom Fiona Luxury Chùa Bộc',
        '88 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội',
        CURRENT_DATE - interval '5 days', $4, 'completed',
        12.20, 3.60, 0.30, 'Tầng 2 mặt tiền phố', 6.20,
        'Tường gạch và dầm ban công bê tông cốt thép',
        '220V 1 pha, kéo từ aptomat tầng 1 lên', 18.0,
        'Giàn giáo 3 tầng có lưới bao che an toàn',
        'Vướng tán cây xanh đô thị bên phải, cần bấm tỉa trước khi treo chữ',
        'Mặt alu đen bóng gương, viền led silicon chạy bo quanh viền mặt dựng.',
        '[]'::jsonb
      )
      ON CONFLICT (organization_id, code) DO NOTHING
    `, [
      orgId,
      p1.customer_id, p1.id, empSurveyor,
      p2.customer_id, p2.id,
      p3.customer_id, p3.id,
    ]);

    // 2. SEED MARKET THIẾT KẾ 2D/3D (erp.design_proofs)
    console.log("Seeding design proofs...");
    await client.query(`
      INSERT INTO erp.design_proofs (
        organization_id, code, project_id, title, version_no, file_url,
        background_material, letter_material, led_spec, power_spec,
        status, client_feedback, approved_at, approved_by_name
      ) VALUES
      (
        $1, 'MK-2026-0001', $2,
        'Market phối cảnh 3D Biển Bạt Hộp Đèn 3M Highlands Coffee (Bản Chốt Ký Duyệt)',
        2,
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
        'Khung thép mạ kẽm hộp 40x40 dày 1.4mm bọc tôn định hình sơn tĩnh điện',
        'Bạt 3M Panagraphics II in UV 2 mặt, viền nẹp nhôm định hình không vít',
        'Module LED thanh 3 mắt tỏa 160 độ, ánh sáng trắng ấm 4000K siêu sáng',
        'Nguồn Meanwell ngoài trời 12V 350W chống nước IP67 kèm rơ-le hẹn giờ',
        'approved',
        'Đã duyệt chuẩn màu đỏ Highlands theo guideline thương hiệu 2026.',
        now() - interval '12 days', 'Đại diện Highlands Coffee - GĐ Thương Hiệu'
      ),
      (
        $1, 'MK-2026-0002', $3,
        'Phối cảnh Market 3D Chữ Nổi Inox Vàng Gương Logo VNG Campus',
        1,
        'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1000&q=80',
        'Tấm ốp nhôm Alu Alcorest EV2002 dày 3mm x nhôm 0.10 màu ghi bạc cao cấp',
        'Inox vàng gương 304 uốn nổi chân 6cm, mặt lọng mica sữa Đài Loan 3mm',
        'Module LED NC Hàn Quốc ánh sáng vàng nắng 3000K sáng rực rỡ',
        'Bộ nguồn Meanwell LRS-350-12 chống nước lắp trong hộp kỹ thuật thông gió',
        'approved',
        'Khách duyệt phương án 1, giữ nguyên font chữ logo chuẩn.',
        now() - interval '8 days', 'Phòng Hành Chính Quản Trị VNG'
      ),
      (
        $1, 'MK-2026-0003', $4,
        'Bản vẽ kỹ thuật 2D kết cấu & phối cảnh 3D Fiona Luxury Chùa Bộc',
        1,
        'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?auto=format&fit=crop&w=1000&q=80',
        'Alu gương đen bóng sang trọng kết hợp thanh lam sóng composite ngoài trời',
        'Chữ Inox trắng xước hairline uốn nổi chân 5cm hắt sáng chân tường',
        'Dây LED silicon uốn dẻo định hình nhiệt độ màu 3000K',
        'Nguồn tổ ong 12V 33A lắp trong nhà kèm quạt hút nhiệt tự động',
        'feedback',
        'Khách đề nghị chỉnh chữ "LUXURY" nhỏ lại 10% để cân đối với mặt tiền.',
        null, null
      )
      ON CONFLICT (organization_id, code) DO NOTHING
    `, [orgId, p1.id, p2.id, p3.id]);

    // 3. SEED KIỂM THỬ QC XUẤT XƯỞNG (erp.factory_qc_records)
    console.log("Seeding factory QC records...");
    await client.query(`
      INSERT INTO erp.factory_qc_records (
        organization_id, code, project_id, inspector_employee_id, qc_date, status,
        aging_test_hours, voltage_drop_check, waterproof_check, frame_weld_check, light_uniformity_check,
        accessories_checklist, photos, defect_notes
      ) VALUES
      (
        $1, 'QC-2026-0001', $2, $3,
        CURRENT_DATE - interval '10 days', 'passed',
        6.0, true, true, true, true,
        '[
          {"item": "Bu-lông nở sắt neo dầm chịu lực M12x120", "checked": true, "note": "12 bộ đủ chuẩn"},
          {"item": "Bộ nguồn Meanwell 12V 350W dự phòng", "checked": true, "note": "1 nguồn mới nguyên hộp"},
          {"item": "Dây cáp bọc cao su chịu nhiệt & keo A500", "checked": true, "note": "2 lọ keo dán khe hở"},
          {"item": "Màng PE & bọt xốp bọc bảo vệ bề mặt bạt 3M", "checked": true, "note": "Đã bọc kín 3 lớp"}
        ]'::jsonb,
        '[
          {"url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80", "caption": "Test sáng liên tục 6 tiếng trong xưởng gia công"}
        ]'::jsonb,
        'Nhiệt độ nguồn đo được 46°C sau 6h chạy hết công suất (an toàn < 65°C). Độ sáng đồng đều 100%, không bóng ma.'
      ),
      (
        $1, 'QC-2026-0002', $4, $3,
        CURRENT_DATE - interval '4 days', 'passed',
        8.0, true, true, true, true,
        '[
          {"item": "Bu-lông neo dầm và nở đạn M10", "checked": true, "note": "Đầy đủ 16 con"},
          {"item": "Nguồn phụ dự phòng ngoài trời 12V 400W", "checked": true, "note": "1 bộ kèm dây kẹp"},
          {"item": "Kiểm tra keo chống nước silicon mặt chữ inox", "checked": true, "note": "Kín 100% đạt chuẩn IP67"}
        ]'::jsonb,
        '[]'::jsonb,
        'Chữ nổi Inox vàng gương gia công bén cạnh sắc nét, sáng chân vàng ấm đồng đều, đạt chuẩn xuất xưởng.'
      )
      ON CONFLICT (organization_id, code) DO NOTHING
    `, [orgId, p1.id, empInspector, p2.id]);

    // 4. SEED SỔ BẢO HÀNH & TICKET SỰ CỐ (erp.service_tickets)
    console.log("Seeding service tickets & warranty...");
    // Cập nhật thông tin bảo hành trên dự án DA-2026-001
    await client.query(`
      UPDATE erp.projects 
      SET warranty_months = 24, 
          warranty_until = CURRENT_DATE + interval '715 days',
          maintenance_notes = 'Bảo hành toàn diện 24 tháng cho mặt bạt 3M và hệ thống nguồn đèn LED ngoài trời. Định kỳ kiểm tra 6 tháng/lần.'
      WHERE organization_id = $1 AND id = $2
    `, [orgId, p1.id]);

    await client.query(`
      INSERT INTO erp.service_tickets (
        organization_id, code, project_id, customer_id, title,
        issue_type, priority, status, is_warranty,
        assigned_employee_id, resolution_notes, resolved_at, cost_amount, photos
      ) VALUES
      (
        $1, 'SC-2026-0001', $2, $3,
        'Kiểm tra sụt áp nguồn LED sau trận bão lớn & thay 01 rơ-le thời gian',
        'led_power', 'high', 'resolved', true,
        $4,
        'Đội kỹ thuật đã kiểm tra hiện trường, nguồn chính vẫn tốt, nước mưa không lọt vào hộp kỹ thuật. Đã thay rơ-le hẹn giờ tự động và bơm thêm keo chống thấm bảo vệ.',
        now() - interval '2 days', 350000,
        '[
          {"url": "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80", "caption": "Đã xử lý xong, biển sáng rực rỡ trở lại"}
        ]'::jsonb
      ),
      (
        $1, 'SC-2026-0002', $5, $6,
        'Tiếp nhận yêu cầu bảo trì định kỳ 6 tháng & lau rửa bụi mặt dựng kính',
        'other', 'medium', 'in_progress', false,
        $4,
        'Đã điều xe cẩu thùng chuyên dụng và 2 thợ hiện trường đến vệ sinh bề mặt chữ và xịt rửa bụi bẩn.',
        null, 1200000,
        '[]'::jsonb
      )
      ON CONFLICT (organization_id, code) DO NOTHING
    `, [
      orgId,
      p1.id, p1.customer_id, empInspector,
      p2.id, p2.customer_id,
    ]);

    await client.query("COMMIT");
    console.log("=== SEED THÀNH CÔNG DỮ LIỆU GIAI ĐOẠN 2! ===");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Lỗi seed Phase 2:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedPhase2();

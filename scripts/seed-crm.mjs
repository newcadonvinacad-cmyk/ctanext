import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function seedCRM() {
    const client = await pool.connect();
    try {
        console.log("=== BẮT ĐẦU SEED DỮ LIỆU BƯỚC 2: KHÁCH HÀNG & BÁO GIÁ DỰ TOÁN ===");

        await client.query("BEGIN");

        // Lấy organization ID
        const orgRes = await client.query("SELECT id FROM erp.organizations WHERE code = 'SIGNAGE' LIMIT 1");
        if (orgRes.rows.length === 0) throw new Error("Chưa có Organization 'SIGNAGE'");
        const orgId = orgRes.rows[0].id;

        // Lấy ID người dùng admin và quản lý dự án
        const adminUser = (await client.query("SELECT id FROM public.\"user\" WHERE email = 'admin@signage-erp.vn' LIMIT 1")).rows[0];
        const duanUser = (await client.query("SELECT id FROM public.\"user\" WHERE email = 'duan@signage-erp.vn' LIMIT 1")).rows[0];
        const adminUserId = adminUser ? adminUser.id : null;

        // Lấy membership của admin
        const memRes = await client.query("SELECT id FROM erp.memberships WHERE organization_id = $1 LIMIT 1", [orgId]);
        const ownerMembershipId = memRes.rows[0].id;

        // 1. Tạo 5 Khách Hàng Tiêu Biểu Chuẩn Ngành Biển Bảng
        const CUSTOMERS = [{
                code: "KH-HIGHLANDS",
                name: "Chuỗi Cà Phê Highlands Coffee (Công Ty CP Dịch Vụ Cà Phê Cao Nguyên)",
                taxCode: "0302688888",
                phone: "028.3512.7355",
                address: "Tầng 5, Tòa nhà Viet Tower, Số 1 Thái Hà, Đống Đa, Hà Nội",
                creditLimit: 200000000, // 200 triệu
                paymentDays: 30,
                contact: {
                    name: "Trần Anh Quân",
                    phone: "0912.888.777",
                    email: "quan.ta@highlands.vn",
                    position: "Trưởng phòng Phát triển Mặt bằng & Thi công",
                },
            },
            {
                code: "KH-DUCANH",
                name: "Đại Lý Quảng Cáo Đức Anh (Xưởng In Bạt & Gia Công)",
                taxCode: "0108999123",
                phone: "0983.112.233",
                address: "Số 45 Đường Cầu Diễn, Phường Phúc Diễn, Bắc Từ Liêm, Hà Nội",
                creditLimit: 50000000, // 50 triệu
                paymentDays: 15,
                contact: {
                    name: "Nguyễn Đức Anh",
                    phone: "0983.112.233",
                    email: "quangcaoducanh@gmail.com",
                    position: "Chủ đại lý",
                },
            },
            {
                code: "KH-VNG",
                name: "Công Ty Cổ Phần VNG (VNG Campus)",
                taxCode: "0303886542",
                phone: "028.3962.3888",
                address: "Khu chế xuất Tân Thuận, Phường Tân Thuận Đông, Quận 7, TP.HCM",
                creditLimit: 150000000,
                paymentDays: 45,
                contact: {
                    name: "Lê Hoàng Phúc",
                    phone: "0909.555.666",
                    email: "phuclh@vng.com.vn",
                    position: "Chuyên viên Quản lý Cơ sở vật chất",
                },
            },
            {
                code: "KH-FIONA",
                name: "Hệ Thống Thời Trang Fiona Luxury",
                taxCode: "0105443322",
                phone: "0977.666.999",
                address: "128 Phố Chùa Bộc, Quang Trung, Đống Đa, Hà Nội",
                creditLimit: 30000000,
                paymentDays: 7,
                contact: {
                    name: "Phạm Thúy Hằng",
                    phone: "0977.666.999",
                    email: "hangpt@fionaluxury.vn",
                    position: "Quản lý chuỗi cửa hàng",
                },
            },
            {
                code: "KH-SMILE",
                name: "Nha Khoa Thẩm Mỹ Quốc Tế Smile Dental",
                taxCode: "0107778899",
                phone: "0936.444.222",
                address: "220 Xã Đàn, Nam Đồng, Đống Đa, Hà Nội",
                creditLimit: 40000000,
                paymentDays: 10,
                contact: {
                    name: "Bác sĩ Nguyễn Thanh Tùng",
                    phone: "0936.444.222",
                    email: "tung.smiledental@gmail.com",
                    position: "Giám đốc chuyên môn",
                },
            },
        ];

        const customerMap = {};

        for (const c of CUSTOMERS) {
            const pRes = await client.query(
                `INSERT INTO erp.partners(
           organization_id, code, name, tax_code, phone, address,
           is_customer, is_supplier, is_active, owner_membership_id, created_by, updated_by
         )
         VALUES($1, $2, $3, $4, $5, $6, true, false, true, $7, $8, $8)
         ON CONFLICT (organization_id, code) 
         DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address
         RETURNING id`, [orgId, c.code, c.name, c.taxCode, c.phone, c.address, ownerMembershipId, adminUserId]
            );
            const partnerId = pRes.rows[0].id;
            customerMap[c.code] = partnerId;

            // Cài đặt hạn mức nợ & thời hạn thanh toán
            await client.query(
                `INSERT INTO erp.partner_terms(
           organization_id, partner_id, side, credit_limit, payment_days, currency, created_by, updated_by
         )
         VALUES($1, $2, 'receivable', $3, $4, 'VND', $5, $5)
         ON CONFLICT (organization_id, partner_id, side, currency)
         DO UPDATE SET credit_limit = EXCLUDED.credit_limit, payment_days = EXCLUDED.payment_days`, [orgId, partnerId, c.creditLimit, c.paymentDays, adminUserId]
            );

            // Thêm thông tin liên hệ chính
            await client.query(
                `INSERT INTO erp.partner_contacts(
           organization_id, partner_id, name, phone, email, position, created_by, updated_by
         )
         VALUES($1, $2, $3, $4, $5, $6, $7, $7)`, [orgId, partnerId, c.contact.name, c.contact.phone, c.contact.email, c.contact.position, adminUserId]
            );
        }
        console.log("✓ Đã khởi tạo 5 Khách hàng doanh nghiệp & cài đặt hạn mức công nợ.");

        // Lấy ID đơn vị tính
        const unitM2 = (await client.query("SELECT id FROM erp.units WHERE code = 'M2' LIMIT 1")).rows[0].id;
        const unitBo = (await client.query("SELECT id FROM erp.units WHERE code = 'BO' LIMIT 1")).rows[0].id;
        const unitCai = (await client.query("SELECT id FROM erp.units WHERE code = 'CAI' LIMIT 1")).rows[0].id;
        const unitTam = (await client.query("SELECT id FROM erp.units WHERE code = 'TAM' LIMIT 1")).rows[0].id;

        // 2. Khởi tạo 3 Báo Giá Dự Toán Chuyên Ngành Biển Bảng

        // BÁO GIÁ 1: Highlands Coffee - Bộ chữ nổi Inox sáng chân mặt Mica hút nổi
        const q1Res = await client.query(
            `INSERT INTO erp.quotations(
         organization_id, code, status, customer_id, owner_membership_id, created_by, updated_by
       )
       VALUES($1, 'BG-2026-001', 'approved', $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status
       RETURNING id`, [orgId, customerMap["KH-HIGHLANDS"], ownerMembershipId, adminUserId]
        );
        const q1Id = q1Res.rows[0].id;

        // Revision 1
        const q1RevRes = await client.query(
            `INSERT INTO erp.quotation_revisions(
         organization_id, quotation_id, revision_no, valid_until, currency,
         subtotal, discount_amount, tax_amount, total, terms_snapshot, sent_at, created_by, updated_by
       )
       VALUES($1, $2, 1, CURRENT_DATE + interval '30 days', 'VND', 48500000, 2500000, 4600000, 50600000, 
              '{"warranty": "Bảo hành 24 tháng cho LED và bộ nguồn, 36 tháng cho bề mặt chữ", "paymentTerms": "Tạm ứng 50%, thanh toán 50% sau nghiệm thu"}',
              now() - interval '3 days', $3, $3)
       ON CONFLICT (organization_id, quotation_id, revision_no) DO UPDATE SET total = EXCLUDED.total
       RETURNING id`, [orgId, q1Id, adminUserId]
        );
        const q1RevId = q1RevRes.rows[0].id;

        // Cập nhật accepted_revision_id
        await client.query("UPDATE erp.quotations SET accepted_revision_id = $1 WHERE id = $2", [q1RevId, q1Id]);

        // Quotation Line 1
        const q1Line1Res = await client.query(
            `INSERT INTO erp.quotation_lines(
         organization_id, revision_id, line_no, description, qty, unit_price, discount_amount, tax_rate, line_total, unit_id, created_by, updated_by
       )
       VALUES($1, $2, 1, 'Bộ chữ Inox vàng gương sáng chân LED NC Korea logo Highlands Coffee (Cao 800mm)', 1, 32000000, 1500000, 0.1, 30500000, $3, $4, $4)
       ON CONFLICT (organization_id, revision_id, line_no) DO UPDATE SET line_total = EXCLUDED.line_total
       RETURNING id`, [orgId, q1RevId, unitBo, adminUserId]
        );
        const q1Line1Id = q1Line1Res.rows[0].id;

        // Bóc tách dự toán Line 1 (Estimate components)
        await client.query(
            `INSERT INTO erp.estimate_components(
         organization_id, quotation_line_id, kind, qty, unit_cost, waste_rate, unit_id, created_by, updated_by
       )
       VALUES
         ($1, $2, 'material', 4, 1800000, 0.05, $3, $4, $4),  -- Tấm Inox 304 vàng gương
         ($1, $2, 'material', 280, 4500, 0.03, $5, $4, $4),    -- LED NC Korea mắt lồi 12V
         ($1, $2, 'material', 2, 450000, 0.00, $5, $4, $4),    -- Nguồn chống nước ngoài trời 12V
         ($1, $2, 'labor', 3, 2500000, 0.00, $3, $4, $4),      -- Công thợ uốn gáy và hàn Inox
         ($1, $2, 'transport', 1, 2000000, 0.00, $5, $4, $4)   -- Xe cẩu nâng thi công ban đêm`, [orgId, q1Line1Id, unitTam, adminUserId, unitCai]
        );

        // Quotation Line 2: Mặt dựng Alu nền sảnh
        await client.query(
            `INSERT INTO erp.quotation_lines(
         organization_id, revision_id, line_no, description, qty, unit_price, discount_amount, tax_rate, line_total, unit_id, created_by, updated_by
       )
       VALUES($1, $2, 2, 'Mặt dựng tấm Alu Alcorest EV2002 ngoài trời màu nâu cà phê kèm khung sắt mạ kẽm', 24, 750000, 1000000, 0.1, 18000000, $3, $4, $4)
       ON CONFLICT (organization_id, revision_id, line_no) DO UPDATE SET line_total = EXCLUDED.line_total`, [orgId, q1RevId, unitM2, adminUserId]
        );

        // BÁO GIÁ 2: VNG Campus - Biển Pano Tấm Lớn Ngoài Trời
        const q2Res = await client.query(
            `INSERT INTO erp.quotations(
         organization_id, code, status, customer_id, owner_membership_id, created_by, updated_by
       )
       VALUES($1, 'BG-2026-002', 'submitted', $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status
       RETURNING id`, [orgId, customerMap["KH-VNG"], ownerMembershipId, adminUserId]
        );
        const q2Id = q2Res.rows[0].id;

        await client.query(
            `INSERT INTO erp.quotation_revisions(
         organization_id, quotation_id, revision_no, valid_until, currency,
         subtotal, discount_amount, tax_amount, total, terms_snapshot, sent_at, created_by, updated_by
       )
       VALUES($1, $2, 1, CURRENT_DATE + interval '45 days', 'VND', 85000000, 0, 8500000, 93500000, 
              '{"warranty": "Bảo hành kết cấu 5 năm, bạt in 2 năm", "advance": "40%"}',
              now() - interval '1 days', $3, $3)
       ON CONFLICT (organization_id, quotation_id, revision_no) DO UPDATE SET total = EXCLUDED.total`, [orgId, q2Id, adminUserId]
        );

        // BÁO GIÁ 3: Thời Trang Fiona - Biển Hộp Đèn 3M in UV (Bản nháp)
        await client.query(
            `INSERT INTO erp.quotations(
         organization_id, code, status, customer_id, owner_membership_id, created_by, updated_by
       )
       VALUES($1, 'BG-2026-003', 'draft', $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status`, [orgId, customerMap["KH-FIONA"], ownerMembershipId, adminUserId]
        );

        console.log("✓ Đã khởi tạo 3 Báo giá dự toán bóc tách kỹ thuật (Approved, Submitted, Draft).");

        // 3. Khởi tạo 2 Đơn Bán Hàng (Sales Orders)
        // Đơn 1: Đơn thương mại bán lẻ vật tư cho Đại lý Đức Anh
        const so1Res = await client.query(
            `INSERT INTO erp.sales_orders(
         organization_id, code, status, currency, total, customer_id, owner_membership_id, created_by, updated_by
       )
       VALUES($1, 'SO-2026-001', 'completed', 'VND', 15600000, $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET total = EXCLUDED.total
       RETURNING id`, [orgId, customerMap["KH-DUCANH"], ownerMembershipId, adminUserId]
        );
        const so1Id = so1Res.rows[0].id;

        // Lấy ID sắt hộp và alu
        const itemSh = (await client.query("SELECT id FROM erp.items WHERE code = 'SH-3030' LIMIT 1")).rows[0].id;
        const unitCay = (await client.query("SELECT id FROM erp.units WHERE code = 'CAY' LIMIT 1")).rows[0].id;

        await client.query(
            `INSERT INTO erp.sales_order_lines(
         organization_id, sales_order_id, line_no, description, qty, unit_price, discount_amount, tax_rate, line_total, factor_snapshot, item_id, unit_id, created_by, updated_by
       )
       VALUES($1, $2, 1, 'Sắt hộp mạ kẽm Hòa Phát 30x30x1.2mm (Cây 6m)', 60, 260000, 0, 0, 15600000, 1, $3, $4, $5, $5)
       ON CONFLICT (organization_id, sales_order_id, line_no) DO NOTHING`, [orgId, so1Id, itemSh, unitCay, adminUserId]
        );

        // Ghi nhận công nợ phải thu (open_items) cho đơn SO-2026-001
        await client.query(
            `INSERT INTO erp.open_items(
         organization_id, side, currency, original_amount, due_date, status, source_sequence, partner_id, sales_order_id, created_by, updated_by
       )
       VALUES($1, 'receivable', 'VND', 15600000, CURRENT_DATE + interval '15 days', 'confirmed', 1, $2, $3, $4, $4)
       ON CONFLICT (organization_id, sales_order_id, source_sequence) WHERE sales_order_id IS NOT NULL DO NOTHING`, [orgId, customerMap["KH-DUCANH"], so1Id, adminUserId]
        );

        // Đơn 2: Chuyển từ Báo giá BG-2026-001 của Highlands Coffee
        const so2Res = await client.query(
            `INSERT INTO erp.sales_orders(
         organization_id, code, status, currency, total, customer_id, quotation_revision_id, owner_membership_id, created_by, updated_by
       )
       VALUES($1, 'SO-2026-002', 'approved', 'VND', 50600000, $2, $3, $4, $5, $5)
       ON CONFLICT (organization_id, code) DO UPDATE SET total = EXCLUDED.total
       RETURNING id`, [orgId, customerMap["KH-HIGHLANDS"], q1RevId, ownerMembershipId, adminUserId]
        );
        const so2Id = so2Res.rows[0].id;

        // Ghi nhận công nợ phải thu cho đơn SO-2026-002
        await client.query(
            `INSERT INTO erp.open_items(
         organization_id, side, currency, original_amount, due_date, status, source_sequence, partner_id, sales_order_id, created_by, updated_by
       )
       VALUES($1, 'receivable', 'VND', 50600000, CURRENT_DATE + interval '30 days', 'confirmed', 1, $2, $3, $4, $4)
       ON CONFLICT (organization_id, sales_order_id, source_sequence) WHERE sales_order_id IS NOT NULL DO NOTHING`, [orgId, customerMap["KH-HIGHLANDS"], so2Id, adminUserId]
        );

        console.log("✓ Đã khởi tạo 2 Đơn bán hàng và ghi nhận công nợ phải thu (open_items).");

        await client.query("COMMIT");
        console.log("\n=======================================================");
        console.log("🎉 SEED TOÀN BỘ DỮ LIỆU BƯỚC 2 (CRM, BÁO GIÁ, ĐƠN HÀNG) THÀNH CÔNG!");
        console.log("=======================================================");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Lỗi seed dữ liệu Bước 2:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedCRM();
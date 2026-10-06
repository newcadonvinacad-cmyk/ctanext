import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function seedProcurementAndFinance() {
    const client = await pool.connect();
    try {
        console.log("=== BẮT ĐẦU SEED DỮ LIỆU BƯỚC 3 & BƯỚC 5 ===");
        await client.query("BEGIN");

        // 1. Lấy Organization 'SIGNAGE'
        const orgRes = await client.query("SELECT id FROM erp.organizations WHERE code = 'SIGNAGE' LIMIT 1");
        if (orgRes.rows.length === 0) throw new Error("Chưa có Organization 'SIGNAGE'");
        const orgId = orgRes.rows[0].id;

        // 2. Lấy Users & Memberships
        const users = (await client.query("SELECT id, email, name FROM public.\"user\"")).rows;
        const userMap = {};
        for (const u of users) userMap[u.email] = u;

        const memberships = (await client.query("SELECT id, user_id FROM erp.memberships WHERE organization_id = $1", [orgId])).rows;
        const memMap = {};
        for (const m of memberships) {
            const u = users.find((usr) => usr.id === m.user_id);
            if (u) memMap[u.email] = m.id;
        }

        const adminUserId = userMap["admin@signage-erp.vn"] ? .id || users[0].id;
        const ketoanUserId = userMap["ketoan@signage-erp.vn"] ? .id || adminUserId;
        const duanUserId = userMap["duan@signage-erp.vn"] ? .id || adminUserId;
        const adminMemId = memMap["admin@signage-erp.vn"] || memberships[0].id;
        const duanMemId = memMap["duan@signage-erp.vn"] || adminMemId;

        // Lấy Employees
        const empRows = (await client.query("SELECT id, code, name FROM erp.employees WHERE organization_id = $1", [orgId])).rows;
        const empMap = {};
        for (const e of empRows) empMap[e.code] = e.id;

        // Lấy Items & Units
        const items = (await client.query("SELECT id, code, name FROM erp.items WHERE organization_id = $1", [orgId])).rows;
        const itemMap = {};
        for (const i of items) itemMap[i.code] = i.id;

        const units = (await client.query("SELECT id, code, name FROM erp.units WHERE organization_id = $1", [orgId])).rows;
        const unitMap = {};
        for (const u of units) unitMap[u.code] = u.id;

        const cayUnit = unitMap["CAY"] || units[0].id;
        const tamUnit = unitMap["TAM"] || units[0].id;
        const bongUnit = unitMap["BONG"] || units[0].id;
        const m2Unit = unitMap["M2"] || units[0].id;
        const caiUnit = unitMap["CAI"] || units[0].id;

        // Lấy Projects
        const projects = (await client.query("SELECT id, code, name FROM erp.projects WHERE organization_id = $1", [orgId])).rows;
        const projMap = {};
        for (const p of projects) projMap[p.code] = p.id;
        const pHighlands = projMap["DA-2026-001"] || null;
        const pVng = projMap["DA-2026-002"] || null;

        // ========================================================
        // BƯỚC 3: NHÀ CUNG CẤP & BẢNG GIÁ & ĐƠN MUA HÀNG (PO)
        // ========================================================
        console.log("1. Khởi tạo 5 Nhà Cung Cấp hàng đầu ngành biển quảng cáo...");
        const SUPPLIERS = [{
                code: "NCC-HOAPHAT",
                name: "Công Ty Cổ Phần Thép Hòa Phát (Tổng Kho Kim Khí)",
                taxCode: "0800373586",
                phone: "024.628.48666",
                address: "Khu CN Phố Nối A, Giai Phạm, Yên Mỹ, Hưng Yên",
                creditLimit: 100000000,
                paymentDays: 30,
            },
            {
                code: "NCC-ALCOREST",
                name: "Nhà Phân Phối Tấm Nhôm Nhựa Alcorest Việt Dũng",
                taxCode: "0101239874",
                phone: "024.3768.9999",
                address: "Lô CN4, Cụm CN Từ Liêm, Phường Minh Khai, Bắc Từ Liêm, Hà Nội",
                creditLimit: 80000000,
                paymentDays: 15,
            },
            {
                code: "NCC-LEDNC",
                name: "Đại Lý Đèn LED Quảng Cáo NC & Nguồn Ngoài Trời Hàn Quốc",
                taxCode: "0312456789",
                phone: "0908.112.334",
                address: "Số 88 Đường Kim Giang, Đại Kim, Hoàng Mai, Hà Nội",
                creditLimit: 50000000,
                paymentDays: 15,
            },
            {
                code: "NCC-3M",
                name: "Nhà Phân Phối Bạt 3M Panagraphics & Decal 3M Chính Hãng",
                taxCode: "0301148888",
                phone: "028.5416.0429",
                address: "Tầng 20 Tòa nhà Mapletree Business Centre, 1060 Nguyễn Văn Linh, Q.7, TP.HCM",
                creditLimit: 120000000,
                paymentDays: 30,
            },
            {
                code: "NCC-MICA",
                name: "Tổng Kho Mica Đài Loan Chochen & Sơn Chống Rỉ",
                taxCode: "0106554433",
                phone: "0915.666.777",
                address: "Km 12 Quốc lộ 1A, Ngọc Hồi, Thanh Trì, Hà Nội",
                creditLimit: 40000000,
                paymentDays: 7,
            },
        ];

        const supplierMap = {};
        for (const s of SUPPLIERS) {
            const res = await client.query(
                `INSERT INTO erp.partners (
           organization_id, code, name, tax_code, phone, address,
           is_customer, is_supplier, is_active, owner_membership_id, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, false, true, true, $7, $8, $8)
         ON CONFLICT (organization_id, code) DO UPDATE SET
           name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address, is_supplier = true
         RETURNING id`, [orgId, s.code, s.name, s.taxCode, s.phone, s.address, adminMemId, adminUserId]
            );
            const supplierId = res.rows[0].id;
            supplierMap[s.code] = supplierId;

            // Cài đặt hạn mức nợ phải trả
            await client.query(
                `INSERT INTO erp.partner_terms (
           organization_id, partner_id, side, credit_limit, payment_days, currency, created_by, updated_by
         )
         VALUES ($1, $2, 'payable', $3, $4, 'VND', $5, $5)
         ON CONFLICT (organization_id, partner_id, side, currency) DO UPDATE SET
           credit_limit = EXCLUDED.credit_limit, payment_days = EXCLUDED.payment_days`, [orgId, supplierId, s.creditLimit, s.paymentDays, adminUserId]
            );
        }

        // 2. Bảng Giá Vật Tư Thỏa Thuận Với Nhà Cung Cấp
        console.log("2. Thiết lập bảng giá thỏa thuận với nhà cung cấp...");
        const PRICES = [
            { supplier: "NCC-HOAPHAT", item: "SH-3030", unit: cayUnit, price: 175000 },
            { supplier: "NCC-ALCOREST", item: "ALU-ALCO-3MM", unit: tamUnit, price: 410000 },
            { supplier: "NCC-LEDNC", item: "LED-MOD-3B", unit: bongUnit, price: 4800 },
            { supplier: "NCC-LEDNC", item: "NGUON-12V-33A", unit: caiUnit, price: 245000 },
            { supplier: "NCC-3M", item: "BAT-3M-UV", unit: m2Unit, price: 160000 },
        ];
        for (const p of PRICES) {
            const sId = supplierMap[p.supplier];
            const iId = itemMap[p.item];
            if (sId && iId) {
                const existingPrice = await client.query(
                    `SELECT id FROM erp.supplier_prices
           WHERE organization_id = $1 AND partner_id = $2 AND item_id = $3 AND unit_id = $4 AND currency = 'VND'
             AND (valid_to IS NULL OR valid_to > now())`, [orgId, sId, iId, p.unit]
                );
                if (existingPrice.rows.length === 0) {
                    await client.query(
                        `INSERT INTO erp.supplier_prices (
               organization_id, partner_id, item_id, unit_id, price, currency, created_by, updated_by
             )
             VALUES ($1, $2, $3, $4, $5, 'VND', $6, $6)`, [orgId, sId, iId, p.unit, p.price, adminUserId]
                    );
                }
            }
        }

        // 3. Đơn Mua Hàng PO (Purchase Orders)
        console.log("3. Tạo các đơn mua hàng (PO) và liên kết bóc tách chi phí...");
        const pos = [{
                code: "PO-2026-001",
                supplier: supplierMap["NCC-3M"],
                project: pHighlands,
                status: "approved",
                total: 15600000,
                expectedDate: "2026-03-20",
                lines: [{
                        item: itemMap["BAT-3M-UV"],
                        unit: m2Unit,
                        description: "Bạt không gân 3M Korea cao cấp in UV 2 mặt",
                        qty: 60,
                        unitPrice: 160000,
                        total: 9600000,
                    },
                    {
                        item: itemMap["LED-MOD-3B"],
                        unit: bongUnit,
                        description: "LED Module 3 bóng mắt lồi NC Hàn Quốc",
                        qty: 1250,
                        unitPrice: 4800,
                        total: 6000000,
                    },
                ],
            },
            {
                code: "PO-2026-002",
                supplier: supplierMap["NCC-HOAPHAT"],
                project: null,
                status: "completed",
                total: 8750000,
                expectedDate: "2026-03-15",
                lines: [{
                    item: itemMap["SH-3030"],
                    unit: cayUnit,
                    description: "Sắt hộp mạ kẽm Hòa Phát 30x30 dày 1.4mm",
                    qty: 50,
                    unitPrice: 175000,
                    total: 8750000,
                }, ],
            },
            {
                code: "PO-2026-003",
                supplier: supplierMap["NCC-ALCOREST"],
                project: pVng,
                status: "submitted", // Vượt hạn mức 20tr của Kế toán, chờ Giám đốc duyệt
                total: 22550000,
                expectedDate: "2026-03-28",
                lines: [{
                    item: itemMap["ALU-ALCO-3MM"],
                    unit: tamUnit,
                    description: "Tấm nhôm nhựa Alu Alcorest 3mm nhôm 0.10 ngoài trời",
                    qty: 55,
                    unitPrice: 410000,
                    total: 22550000,
                }, ],
            },
        ];

        for (const po of pos) {
            const poRes = await client.query(
                `INSERT INTO erp.purchase_orders (
           organization_id, code, status, currency, total, expected_date,
           supplier_id, project_id, requested_by, created_by, updated_by
         )
         VALUES ($1, $2, $3, 'VND', $4, $5, $6, $7, $8, $9, $9)
         ON CONFLICT (organization_id, code) DO UPDATE SET
           status = EXCLUDED.status, total = EXCLUDED.total
         RETURNING id`, [orgId, po.code, po.status, po.total, po.expectedDate, po.supplier, po.project, duanMemId, ketoanUserId]
            );
            const poId = poRes.rows[0].id;

            let lineNo = 1;
            for (const line of po.lines) {
                if (line.item) {
                    await client.query(
                        `INSERT INTO erp.purchase_order_lines (
               organization_id, purchase_order_id, line_no, item_id, unit_id,
               description, qty, unit_price, line_total, factor_snapshot, created_by, updated_by
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $10)
             ON CONFLICT (organization_id, purchase_order_id, line_no) DO UPDATE SET
               qty = EXCLUDED.qty, unit_price = EXCLUDED.unit_price, line_total = EXCLUDED.line_total`, [orgId, poId, lineNo, line.item, line.unit, line.description, line.qty, line.unitPrice, line.total, ketoanUserId]
                    );
                    lineNo++;
                }
            }
        }

        // ========================================================
        // BƯỚC 5: TÀI CHÍNH, SỔ QUỸ, CÔNG NỢ & NHÂN SỰ
        // ========================================================
        console.log("4. Tạo tài khoản sổ quỹ tiền mặt & tài khoản ngân hàng công ty...");
        const accounts = [
            { code: "TK-TIENMAT", name: "Quỹ Tiền Mặt Tại Xưởng Signage ERP", kind: "cash" },
            { code: "TK-MBBANK", name: "Tài Khoản MB Bank Công Ty CP Signage ERP (STK: 8888.6666)", kind: "bank" },
        ];
        const accMap = {};
        for (const a of accounts) {
            const res = await client.query(
                `INSERT INTO erp.cash_accounts (
           organization_id, code, name, kind, currency, is_active, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, 'VND', true, $5, $5)
         ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`, [orgId, a.code, a.name, a.kind, adminUserId]
            );
            accMap[a.code] = res.rows[0].id;
        }

        // 5. Phiếu Thu - Chi Thực Tế (erp.payments)
        console.log("5. Ghi nhận phiếu thu tạm ứng công trình và phiếu chi tiền mua hàng...");
        const payments = [{
                code: "PT-2026-001",
                direction: "receipt",
                amount: 24000000,
                purpose: "Thu tiền tạm ứng 50% Hợp đồng thi công biển hộp đèn Highlands Coffee Bà Triệu",
                cashAcc: accMap["TK-MBBANK"],
                project: pHighlands,
                paidAt: "2026-03-12 10:30:00+07",
            },
            {
                code: "PC-2026-001",
                direction: "disbursement",
                amount: 8750000,
                purpose: "Thanh toán tiền mua 50 cây thép hộp Hòa Phát (Đơn PO-2026-002)",
                cashAcc: accMap["TK-MBBANK"],
                project: null,
                paidAt: "2026-03-15 15:00:00+07",
            },
            {
                code: "PC-2026-002",
                direction: "disbursement",
                amount: 2500000,
                purpose: "Tạm ứng tiền xăng dầu, vé cầu đường và chi phí thuê xe cẩu cho thợ thi công",
                cashAcc: accMap["TK-TIENMAT"],
                project: pHighlands,
                employee: empMap["NV-THO"],
                paidAt: "2026-03-20 08:30:00+07",
            },
        ];

        for (const p of payments) {
            await client.query(
                `INSERT INTO erp.payments (
           organization_id, code, direction, amount, currency, status,
           paid_at, purpose, cash_account_id, project_id, employee_id, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, 'VND', 'posted', $5, $6, $7, $8, $9, $10, $10)
         ON CONFLICT (organization_id, code) DO UPDATE SET
           amount = EXCLUDED.amount, purpose = EXCLUDED.purpose`, [orgId, p.code, p.direction, p.amount, p.paidAt, p.purpose, p.cashAcc, p.project, p.employee || null, ketoanUserId]
            );
        }

        // 6. Ghi nhận Công nợ phải trả NCC vào erp.open_items
        console.log("6. Cập nhật sổ công nợ phải trả nhà cung cấp...");
        const po3Res = await client.query("SELECT id FROM erp.purchase_orders WHERE code = 'PO-2026-003' LIMIT 1");
        const po3Id = po3Res.rows[0] ? .id;
        if (po3Id) {
            await client.query(
                `INSERT INTO erp.open_items (
           organization_id, side, partner_id, currency, original_amount,
           due_date, status, source_sequence, purchase_order_id, created_by, updated_by
         )
         VALUES 
           ($1, 'payable', $2, 'VND', 22550000, '2026-04-12', 'confirmed', 1, $3, $4, $4)
         ON CONFLICT (organization_id, purchase_order_id, source_sequence) WHERE purchase_order_id IS NOT NULL DO NOTHING`, [orgId, supplierMap["NCC-ALCOREST"], po3Id, ketoanUserId]
            );
        }

        // 7. Kỳ Chấm Công & Thang Lương Nhân Viên (HRM)
        console.log("7. Cấu hình kỳ chấm công Tháng 03/2026 và thang lương nhân sự...");
        const periodRes = await client.query(
            `INSERT INTO erp.attendance_periods (organization_id, year, month, status, created_by, updated_by)
       VALUES ($1, 2026, 3, 'open', $2, $2)
       ON CONFLICT (organization_id, year, month) DO UPDATE SET status = EXCLUDED.status
       RETURNING id`, [orgId, adminUserId]
        );
        const periodId = periodRes.rows[0].id;

        const salaryTerms = [
            { emp: empMap["NV-THO"], base: 12000000, basis: "monthly", allowances: { site: 2000000, meal: 730000 } },
            { emp: empMap["NV-DUAN"], base: 16000000, basis: "monthly", allowances: { responsibility: 3000000 } },
            { emp: empMap["NV-KHO"], base: 10000000, basis: "monthly", allowances: { hazardous: 1000000 } },
            { emp: empMap["NV-KETOAN"], base: 14000000, basis: "monthly", allowances: { responsibility: 2000000 } },
        ];

        for (const st of salaryTerms) {
            if (st.emp) {
                const existingTerm = await client.query(
                    `SELECT id FROM erp.salary_terms
           WHERE organization_id = $1 AND employee_id = $2 AND (valid_to IS NULL OR valid_to > now())`, [orgId, st.emp]
                );
                if (existingTerm.rows.length === 0) {
                    await client.query(
                        `INSERT INTO erp.salary_terms (
               organization_id, employee_id, base_salary, pay_basis, allowances, valid_from, created_by, updated_by
             )
             VALUES ($1, $2, $3, $4, $5, '2026-01-01', $6, $6)`, [orgId, st.emp, st.base, st.basis, JSON.stringify(st.allowances), adminUserId]
                    );
                }
            }
        }

        // 8. Phiên Xử Lý Trợ Lý AI (erp.ai_runs)
        console.log("8. Lưu trữ nhật ký phiên Trợ lý AI Signage ERP...");
        const reqId1 = crypto.randomUUID();
        const reqId2 = crypto.randomUUID();
        await client.query(
            `INSERT INTO erp.ai_runs (
         organization_id, agent_code, status, model, input_snapshot, output_json,
         schema_version, request_id, requested_by, created_by
       )
       VALUES 
         ($1, 'INVOICE_OCR', 'confirmed', 'gemini-1.5-flash', 
          '{"prompt": "OCR bóc tách hóa đơn GTGT NCC Alcorest: 55 tấm Alu 3mm"}', 
          '{"supplier":"NCC-ALCOREST","taxCode":"0101239874","total":22550000,"items":[{"name":"Alu Alcorest 3mm","qty":55,"price":410000}]}',
          'v1', $2, $3, $4),
         ($1, 'ESTIMATION_ADVISOR', 'completed', 'gemini-1.5-pro',
          '{"prompt": "Định mức vật tư biển bạt hộp đèn 3M kích thước 6m x 2m"}', 
          '{"frame":"Sắt hộp 30x30: 8 cây","sheet":"Bạt 3M: 14.4 m2","led":"Module 3 bóng: 320 bóng","power":"Nguồn 12V 400W: 2 cái"}',
          'v1', $5, $3, $4)
       ON CONFLICT DO NOTHING`, [orgId, reqId1, duanMemId, adminUserId, reqId2]
        );

        await client.query("COMMIT");
        console.log("=== SEED THÀNH CÔNG BƯỚC 3 & BƯỚC 5: MUA HÀNG, TÀI CHÍNH, NHÂN SỰ & AI! ===");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("LỖI SEED BƯỚC 3 & 5:", err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seedProcurementAndFinance().catch(console.error);
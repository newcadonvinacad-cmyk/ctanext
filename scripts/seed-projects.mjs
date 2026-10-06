import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function seedProjects() {
    const client = await pool.connect();
    try {
        console.log("=== BẮT ĐẦU SEED DỮ LIỆU BƯỚC 4: DỰ ÁN, HIỆN TRƯỜNG GPS & ĐỘI XE ===");
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
        const adminMemId = memMap["admin@signage-erp.vn"] || memberships[0].id;
        const duanMemId = memMap["duan@signage-erp.vn"] || adminMemId;
        const thoMemId = memMap["tho@signage-erp.vn"] || adminMemId;

        // 3. Seed Phòng ban (Departments) & Tổ đội (Teams)
        console.log("1. Tạo phòng ban và tổ đội chuyên môn...");
        const depts = [
            { code: "PB-DUAN", name: "Phòng Quản Lý Dự Án & Thi Công" },
            { code: "PB-XUONG", name: "Xưởng Sản Xuất Biển & Khung Cơ Khí" },
            { code: "PB-DOIXE", name: "Đội Xe Tải & Vận Chuyển Lưu Động" },
        ];
        const deptMap = {};
        for (const d of depts) {
            const res = await client.query(
                `INSERT INTO erp.departments (organization_id, code, name, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $4)
         ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`, [orgId, d.code, d.name, adminUserId]
            );
            deptMap[d.code] = res.rows[0].id;
        }

        const teams = [
            { code: "TO-COKHI", name: "Tổ Hàn Khung Cơ Khí & Kết Cấu Sắt", dept: "PB-XUONG" },
            { code: "TO-INAN", name: "Tổ In Bạt 3M & Decal UV", dept: "PB-XUONG" },
            { code: "TO-DIENLED", name: "Tổ Điện, Nguồn & Module LED", dept: "PB-XUONG" },
            { code: "TO-THICONG", name: "Tổ Thi Công & Lắp Đặt Hiện Trường", dept: "PB-DUAN" },
            { code: "TO-LAIXE", name: "Tổ Lái Xe & Giao Nhận", dept: "PB-DOIXE" },
        ];
        const teamMap = {};
        for (const t of teams) {
            const res = await client.query(
                `INSERT INTO erp.teams (organization_id, code, name, department_id, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $5)
         ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`, [orgId, t.code, t.name, deptMap[t.dept], adminUserId]
            );
            teamMap[t.code] = res.rows[0].id;
        }

        // 4. Seed Nhân viên (Employees)
        console.log("2. Tạo danh sách nhân viên công ty...");
        const employees = [
            { code: "NV-ADMIN", name: "Nguyễn Văn An (Giám Đốc)", email: "admin@signage-erp.vn", phone: "0901.234.567", dept: "PB-DUAN" },
            { code: "NV-DUAN", name: "Phạm Minh Tuấn (Chỉ Huy Trưởng)", email: "duan@signage-erp.vn", phone: "0912.333.444", dept: "PB-DUAN" },
            { code: "NV-THO", name: "Vũ Đình Trọng (Đội Trưởng Lắp Đặt / Lái Xe)", email: "tho@signage-erp.vn", phone: "0988.777.666", dept: "PB-DUAN" },
            { code: "NV-KHO", name: "Lê Hoàng Long (Thủ Kho Xưởng)", email: "thukho@signage-erp.vn", phone: "0934.555.666", dept: "PB-XUONG" },
            { code: "NV-KETOAN", name: "Trần Thị Mai (Kế Toán Trưởng)", email: "ketoan@signage-erp.vn", phone: "0945.666.777", dept: "PB-DUAN" },
        ];
        const empMap = {};
        for (const e of employees) {
            const memId = memMap[e.email];
            const res = await client.query(
                `INSERT INTO erp.employees (organization_id, code, name, phone, membership_id, department_id, hire_date, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, '2024-01-01', true, $7, $7)
         ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, membership_id = EXCLUDED.membership_id
         RETURNING id`, [orgId, e.code, e.name, e.phone, memId || null, deptMap[e.dept], adminUserId]
            );
            empMap[e.code] = res.rows[0].id;
        }

        // 5. Seed Đội xe (Vehicles)
        console.log("3. Tạo danh sách xe tải & xe lưu động...");
        const vehicles = [
            { code: "XE-01", plate_no: "29C-888.99" }, // Xe tải Hyundai 2.5T
            { code: "XE-02", plate_no: "29H-123.45" }, // Xe bán tải Ford Ranger
        ];
        const vehicleMap = {};
        for (const v of vehicles) {
            const res = await client.query(
                `INSERT INTO erp.vehicles (organization_id, code, plate_no, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, true, $4, $4)
         ON CONFLICT (organization_id, code) DO UPDATE SET plate_no = EXCLUDED.plate_no
         RETURNING id`, [orgId, v.code, v.plate_no, adminUserId]
            );
            vehicleMap[v.code] = res.rows[0].id;
        }

        // 6. Seed Thư Viện Mẫu Dự Án (Project Templates)
        console.log("4. Tạo thư viện quy trình dự án mẫu (Templates)...");
        const templates = [{
                code: "TPL-HOPDEN-3M",
                name: "Biển Bạt Hộp Đèn 3M Korea Khung Sắt Mạ Kẽm",
                definition: {
                    stages: [{
                            name: "Giai đoạn 1: Khảo sát hiện trường",
                            tasks: [
                                { title: "Khảo sát mặt bằng & đo đạc kích thước thực tế", weight: 5, mode: "manual" },
                                { title: "Kiểm tra kết cấu chịu lực & đường nguồn điện", weight: 5, mode: "manual" },
                            ],
                        },
                        {
                            name: "Giai đoạn 2: Gia công sản xuất tại xưởng",
                            tasks: [
                                { title: "Hàn kết cấu khung sắt hộp 30x30 mạ kẽm sơn chống rỉ", weight: 15, mode: "manual" },
                                { title: "In bạt 3M không gân công nghệ UV 2 mặt", weight: 15, mode: "manual" },
                                { title: "Gắn module LED 3 bóng chống nước & đi dây nguồn 12V", weight: 15, mode: "manual" },
                                { title: "Căng bạt hộp đèn & nẹp nhôm định hình", weight: 10, mode: "manual" },
                            ],
                        },
                        {
                            name: "Giai đoạn 3: Vận chuyển & Điều xe",
                            tasks: [
                                { title: "Bốc xếp biển lên xe tải chuyên dụng có giá đỡ", weight: 5, mode: "manual" },
                                { title: "Vận chuyển đến địa điểm thi công", weight: 5, mode: "manual" },
                            ],
                        },
                        {
                            name: "Giai đoạn 4: Thi công lắp dựng hiện trường",
                            tasks: [
                                { title: "Dựng giàn giáo & căng dây cảnh báo an toàn", weight: 5, mode: "manual" },
                                { title: "Cẩu hạ biển & bắt bu-lông nở sắt neo dầm tường", weight: 15, mode: "manual" },
                                { title: "Đấu nối tủ điện điều khiển hẹn giờ Timer tự động", weight: 5, mode: "manual" },
                            ],
                        },
                        {
                            name: "Giai đoạn 5: Nghiệm thu & Bàn giao",
                            tasks: [
                                { title: "Test sáng toàn bộ hệ thống đèn ban ngày & ban đêm", weight: 5, mode: "manual" },
                                { title: "Ký biên bản nghiệm thu hoàn thành công trình", weight: 5, mode: "manual" },
                            ],
                        },
                    ],
                },
            },
            {
                code: "TPL-ALU-CHU-INOX",
                name: "Mặt Dựng Alu Alcorest & Bộ Chữ Nổi Inox Sáng Chân LED",
                definition: {
                    stages: [{
                            name: "Giai đoạn 1: Khảo sát & Thiết kế",
                            tasks: [
                                { title: "Khảo sát mặt bằng & chốt bản vẽ kỹ thuật 2D/3D", weight: 10, mode: "manual" },
                            ],
                        },
                        {
                            name: "Giai đoạn 2: Gia công xưởng",
                            tasks: [
                                { title: "Hàn khung xương sắt đan nan 600x600", weight: 20, mode: "manual" },
                                { title: "Cắt uốn chân chữ Inox vàng gương bằng máy Fiber Laser", weight: 20, mode: "manual" },
                                { title: "Hút nổi mặt Mica cháo & đi LED hắt chân", weight: 20, mode: "manual" },
                            ],
                        },
                        {
                            name: "Giai đoạn 3: Lắp đặt & Bàn giao",
                            tasks: [
                                { title: "Ốp tấm Alu Alcorest 3mm bắn silicone chống thấm", weight: 20, mode: "manual" },
                                { title: "Gắn định vị chân chữ nổi Inox & đấu điện", weight: 10, mode: "manual" },
                            ],
                        },
                    ],
                },
            },
            {
                code: "TPL-PANO-NGOAITROI",
                name: "Biển Pano Tấm Lớn Ngoài Trời Trụ Cột Thép Phi 1200",
                definition: {
                    stages: [{
                            name: "Giai đoạn 1: Ép cọc móng & Đổ bê tông trụ móng",
                            tasks: [
                                { title: "Khảo sát địa chất & đào hố móng", weight: 20, mode: "manual" },
                                { title: "Đổ bê tông móng cọc & đặt bu-lông móng M36", weight: 20, mode: "manual" },
                            ],
                        },
                        {
                            name: "Giai đoạn 2: Lắp dựng kết cấu thép",
                            tasks: [
                                { title: "Cẩu dựng cột thép phi 1200", weight: 20, mode: "manual" },
                                { title: "Lắp đặt khung giàn đỡ mặt biển pano", weight: 20, mode: "manual" },
                            ],
                        },
                        {
                            name: "Giai đoạn 3: Căng bạt & Hệ thống đèn pha Led",
                            tasks: [
                                { title: "Căng bạt Hiflex dày chống xuyên sáng", weight: 10, mode: "manual" },
                                { title: "Lắp 12 bộ đèn pha Led 200W chống nước IP66", weight: 10, mode: "manual" },
                            ],
                        },
                    ],
                },
            },
        ];

        const tplVersionMap = {};
        for (const tpl of templates) {
            const tplRes = await client.query(
                `INSERT INTO erp.project_templates (organization_id, code, name, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, true, $4, $4)
         ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`, [orgId, tpl.code, tpl.name, adminUserId]
            );
            const tplId = tplRes.rows[0].id;

            let verId = (await client.query("SELECT id FROM erp.project_template_versions WHERE organization_id = $1 AND template_id = $2 AND revision_no = 1", [orgId, tplId])).rows[0] ? .id;
            if (!verId) {
                const verRes = await client.query(
                    `INSERT INTO erp.project_template_versions (organization_id, template_id, revision_no, definition, published_at, created_by, updated_by)
           VALUES ($1, $2, 1, $3, now(), $4, $4)
           RETURNING id`, [orgId, tplId, JSON.stringify(tpl.definition), adminUserId]
                );
                verId = verRes.rows[0].id;
            }
            tplVersionMap[tpl.code] = verId;
        }

        // 7. Lấy Khách Hàng (Partners)
        const partners = (await client.query("SELECT id, code, name FROM erp.partners WHERE organization_id = $1", [orgId])).rows;
        const partnerMap = {};
        for (const p of partners) partnerMap[p.code] = p.id;

        const hlCustomer = partnerMap["KH-HIGHLANDS"] || partners[0] ? .id;
        const vngCustomer = partnerMap["KH-VNG"] || partners[0] ? .id;
        const fionaCustomer = partnerMap["KH-FIONA"] || partners[0] ? .id;

        // 8. Seed 3 Dự án thực tế (Projects)
        console.log("5. Tạo các dự án thực tế kết nối khách hàng & tọa độ GPS...");
        const projects = [{
                code: "DA-2026-001",
                name: "Thi Công Biển Bạt Hộp Đèn 3M - Highlands Coffee Vincom Center Bà Triệu",
                address: "191 Bà Triệu, Phường Lê Đại Hành, Quận Hai Bà Trưng, Hà Nội",
                latitude: 21.011667,
                longitude: 105.849444,
                start_date: "2026-03-10",
                due_date: "2026-03-30",
                status: "installation", // 5 mốc: survey, production, transport, installation, acceptance
                customer_id: hlCustomer,
                template_version_id: tplVersionMap["TPL-HOPDEN-3M"],
            },
            {
                code: "DA-2026-002",
                name: "Gia Công & Lắp Đặt Mặt Dựng Alu Chữ Nổi Inox - VNG Campus",
                address: "Khu Chế Xuất Tân Thuận, Phường Tân Thuận Đông, Quận 7, TP.HCM",
                latitude: 10.748611,
                longitude: 106.726944,
                start_date: "2026-03-15",
                due_date: "2026-04-10",
                status: "production",
                customer_id: vngCustomer,
                template_version_id: tplVersionMap["TPL-ALU-CHU-INOX"],
            },
            {
                code: "DA-2026-003",
                name: "Khảo Sát & Thi Công Chuỗi Biển Hiệu Showroom Fiona Luxury Chùa Bộc",
                address: "128 Phố Chùa Bộc, Phường Quang Trung, Quận Đống Đa, Hà Nội",
                latitude: 21.007222,
                longitude: 105.828611,
                start_date: "2026-03-22",
                due_date: "2026-04-05",
                status: "survey",
                customer_id: fionaCustomer,
                template_version_id: tplVersionMap["TPL-HOPDEN-3M"],
            },
        ];

        const projMap = {};
        for (const p of projects) {
            const res = await client.query(
                `INSERT INTO erp.projects (
           organization_id, code, name, address, latitude, longitude,
           start_date, due_date, status, customer_id, manager_membership_id, template_version_id,
           created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
         ON CONFLICT (organization_id, code) DO UPDATE SET
           name = EXCLUDED.name, address = EXCLUDED.address, latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude, status = EXCLUDED.status, due_date = EXCLUDED.due_date
         RETURNING id`, [
                    orgId,
                    p.code,
                    p.name,
                    p.address,
                    p.latitude,
                    p.longitude,
                    p.start_date,
                    p.due_date,
                    p.status,
                    p.customer_id,
                    duanMemId,
                    p.template_version_id,
                    adminUserId,
                ]
            );
            projMap[p.code] = res.rows[0].id;
        }

        // 9. Seed Cây công việc WBS (Tasks) cho Dự án DA-2026-001
        console.log("6. Tạo cây công việc WBS phân rã Cha - Con...");
        const p1Id = projMap["DA-2026-001"];

        // Task Cha 1: Khảo sát
        const t1 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, created_by, updated_by)
       VALUES ($1, 'TK-001-KHAOSAT', 'Giai đoạn 1: Khảo sát hiện trường & kết cấu tòa nhà', 'done', 10, 'manual', 100, $2, $3, $3)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, adminUserId]
        );

        // Task Cha 2: Gia công xưởng (Cha có con)
        const t2 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, created_by, updated_by)
       VALUES ($1, 'TK-001-GIACONG', 'Giai đoạn 2: Gia công sản xuất tại xưởng', 'done', 35, 'children', 100, $2, $3, $3)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, adminUserId]
        );
        const t2Id = t2.rows[0].id;

        // Con của Cha 2:
        const t2_1 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, parent_id, created_by, updated_by)
       VALUES ($1, 'TK-001-GC-KHUNG', 'Hàn kết cấu khung sắt hộp 30x30 mạ kẽm sơn chống rỉ', 'done', 1, 'manual', 100, $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, t2Id, adminUserId]
        );
        const t2_2 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, parent_id, created_by, updated_by)
       VALUES ($1, 'TK-001-GC-BAT', 'In bạt không gân 3M Korea công nghệ in UV 2 mặt', 'done', 1, 'manual', 100, $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, t2Id, adminUserId]
        );
        const t2_3 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, parent_id, created_by, updated_by)
       VALUES ($1, 'TK-001-GC-LED', 'Lắp module LED 3 bóng chống nước & đi dây nguồn 12V 400W', 'done', 1, 'manual', 100, $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, t2Id, adminUserId]
        );

        // Task Cha 3: Vận chuyển
        const t3 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, created_by, updated_by)
       VALUES ($1, 'TK-001-VANCHUYEN', 'Giai đoạn 3: Vận chuyển biển hộp đèn & đồ nghề ra công trình', 'done', 10, 'manual', 100, $2, $3, $3)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, adminUserId]
        );

        // Task Cha 4: Thi công lắp dựng (Đang thực hiện)
        const t4 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, created_by, updated_by)
       VALUES ($1, 'TK-001-THICONG', 'Giai đoạn 4: Thi công lắp dựng mặt tiền Vincom Bà Triệu', 'doing', 35, 'children', 65, $2, $3, $3)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, adminUserId]
        );
        const t4Id = t4.rows[0].id;

        // Con của Cha 4:
        const t4_1 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, parent_id, created_by, updated_by)
       VALUES ($1, 'TK-001-TC-GIAO', 'Dựng hệ thống giàn giáo bao che & dây phản quang an toàn', 'done', 1, 'manual', 100, $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, t4Id, adminUserId]
        );
        const t4_2 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, parent_id, created_by, updated_by)
       VALUES ($1, 'TK-001-TC-CAU', 'Cẩu tời biển hộp đèn lên cao & bắt bu-lông neo dầm chịu lực', 'doing', 1, 'manual', 70, $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, t4Id, adminUserId]
        );
        const t4_3 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, parent_id, created_by, updated_by)
       VALUES ($1, 'TK-001-TC-DIEN', 'Đấu nối tủ điện Timer hẹn giờ tự động & test độ sáng', 'todo', 1, 'manual', 0, $2, $3, $4, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, t4Id, adminUserId]
        );

        // Task Cha 5: Nghiệm thu
        const t5 = await client.query(
            `INSERT INTO erp.tasks (organization_id, code, title, status, weight, progress_mode, progress_percent, project_id, created_by, updated_by)
       VALUES ($1, 'TK-001-NGHIEMTHU', 'Giai đoạn 5: Bàn giao & ký biên bản nghiệm thu với Highlands', 'todo', 10, 'manual', 0, $2, $3, $3)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status, progress_percent = EXCLUDED.progress_percent
       RETURNING id`, [orgId, p1Id, adminUserId]
        );

        // 10. Phân công thợ (Task Assignees)
        console.log("7. Phân công thợ thi công vào các tác vụ...");
        const thoEmpId = empMap["NV-THO"];
        const assignTasks = [t4_1.rows[0].id, t4_2.rows[0].id, t4_3.rows[0].id];
        for (const taskId of assignTasks) {
            const existingAssignee = await client.query(
                `SELECT id FROM erp.task_assignees 
         WHERE organization_id = $1 AND task_id = $2 AND employee_id = $3 AND (valid_to IS NULL OR valid_to > now())`, [orgId, taskId, thoEmpId]
            );
            if (existingAssignee.rows.length === 0) {
                await client.query(
                    `INSERT INTO erp.task_assignees (organization_id, task_id, employee_id, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $4)`, [orgId, taskId, thoEmpId, adminUserId]
                );
            }
        }

        // 11. Chuyến xe (Trips & Trip Stops)
        console.log("8. Tạo lệnh điều xe vận chuyển biển quảng cáo...");
        const vehicleId = vehicleMap["XE-01"];
        const tripRes = await client.query(
            `INSERT INTO erp.trips (organization_id, code, status, planned_departure, vehicle_id, driver_employee_id, project_id, created_by, updated_by)
       VALUES ($1, 'CHUYEN-2026-001', 'completed', now() - interval '2 days', $2, $3, $4, $5, $5)
       ON CONFLICT (organization_id, code) DO UPDATE SET status = EXCLUDED.status
       RETURNING id`, [orgId, vehicleId, thoEmpId, p1Id, adminUserId]
        );
        const tripId = tripRes.rows[0].id;

        await client.query(
            `INSERT INTO erp.trip_stops (organization_id, sequence, address, arrived_at, delivery_status, trip_id, project_id, created_by, updated_by)
       VALUES 
         ($1, 1, 'Xưởng Gia Công Signage ERP - Cụm CN Cầu Gáo, Đan Phượng, Hà Nội', now() - interval '2 days' + interval '30 minutes', 'delivered', $2, $3, $4, $4),
         ($1, 2, 'Vincom Center Bà Triệu - 191 Bà Triệu, Hai Bà Trưng, Hà Nội', now() - interval '2 days' + interval '2 hours', 'delivered', $2, $3, $4, $4)
       ON CONFLICT (organization_id, trip_id, sequence) DO UPDATE SET delivery_status = EXCLUDED.delivery_status`, [orgId, tripId, p1Id, adminUserId]
        );

        // 12. Tác nghiệp hiện trường (Field Event GPS Check-in)
        console.log("9. Ghi nhận sự kiện chấm công GPS hiện trường...");
        const clientReqId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
        await client.query(
            `INSERT INTO erp.field_events (
         organization_id, type, occurred_at, latitude, longitude, accuracy_m,
         client_request_id, employee_id, task_id, project_id, created_by
       )
       VALUES ($1, 'check_in', now() - interval '3 hours', 21.011680, 105.849450, 4.5, $2, $3, $4, $5, $6)
       ON CONFLICT (organization_id, employee_id, client_request_id) DO NOTHING`, [orgId, clientReqId, thoEmpId, t4_2.rows[0].id, p1Id, adminUserId]
        );

        // 13. Biên bản nghiệm thu dự thảo (Acceptance)
        console.log("10. Tạo biên bản nghiệm thu dự thảo...");
        await client.query(
            `INSERT INTO erp.acceptances (organization_id, code, status, customer_signer_name, project_id, created_by, updated_by)
       VALUES ($1, 'BB-NT-2026-001', 'draft', 'Trần Anh Quân (Đại diện Highlands Coffee)', $2, $3, $3)
       ON CONFLICT (organization_id, code) DO UPDATE SET customer_signer_name = EXCLUDED.customer_signer_name`, [orgId, p1Id, adminUserId]
        );

        await client.query("COMMIT");
        console.log("=== SEED THÀNH CÔNG DỮ LIỆU BƯỚC 4: DỰ ÁN, HIỆN TRƯỜNG GPS & ĐỘI XE! ===");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("LỖI SEED BƯỚC 4:", err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seedProjects().catch(console.error);
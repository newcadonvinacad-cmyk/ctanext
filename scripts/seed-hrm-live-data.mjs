import nextEnv from '@next/env';
import pg from 'pg';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

async function seedHrm() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('--- BẮT ĐẦU NẠP DỮ LIỆU THẬT CHO PHÂN HỆ HRM & LƯƠNG ---');

  const orgRes = await client.query(`SELECT id FROM erp.organizations WHERE code = 'SIGNAGE' LIMIT 1`);
  const orgId = orgRes.rows[0]?.id;
  if (!orgId) throw new Error('Không tìm thấy tổ chức SIGNAGE');

  const userRes = await client.query(`SELECT id FROM public."user" LIMIT 1`);
  const userId = userRes.rows[0]?.id || 'usr_system';

  // 1. Cập nhật chính sách lương thực tế cho 5 nhân viên
  const employees = (await client.query(`SELECT id, code, name FROM erp.employees WHERE organization_id = $1 ORDER BY code`, [orgId])).rows;
  console.log(`Tìm thấy ${employees.length} nhân sự.`);

  const policyConfigs = {
    'NV-ADMIN': {
      muc_luong: 25000000,
      cong_chuan: 26,
      tong_phep: 12,
      ngay_onboard: '2025-01-01',
      he_so_ot: 150,
      thuong_bat: true,
      thuong: [{ ten: 'Thưởng KPI điều hành', so_tien: 3000000, tu_dong: false }],
      phu_cap_bat: true,
      phu_cap: [{ ten: 'Phụ cấp trách nhiệm', so_tien: 2000000, mien_thue: false }, { ten: 'Ăn trưa', so_tien: 730000, mien_thue: true }],
      phat_bat: false,
      luong_bhxh: 10000000,
      ptram_bhxh: 10.5,
      template_code: 'TEMPLATE_OFFICE',
    },
    'NV-DUAN': {
      muc_luong: 16000000,
      cong_chuan: 26,
      tong_phep: 12,
      ngay_onboard: '2025-03-01',
      he_so_ot: 150,
      thuong_bat: true,
      thuong: [{ ten: 'Thưởng tiến độ công trình', so_tien: 1500000, tu_dong: false }, { ten: 'Chuyên cần', so_tien: 500000, tu_dong: true }],
      phu_cap_bat: true,
      phu_cap: [{ ten: 'Xăng xe & điện thoại hiện trường', so_tien: 1200000, mien_thue: true }, { ten: 'Ăn trưa', so_tien: 730000, mien_thue: true }],
      phat_bat: true,
      phat_muon: 50000,
      phat_quen_cham: 50000,
      luong_bhxh: 6000000,
      ptram_bhxh: 10.5,
      template_code: 'TEMPLATE_FIELD',
    },
    'NV-KETOAN': {
      muc_luong: 14000000,
      cong_chuan: 26,
      tong_phep: 12,
      ngay_onboard: '2025-02-15',
      he_so_ot: 150,
      thuong_bat: true,
      thuong: [{ ten: 'Thưởng chuyên cần', so_tien: 500000, tu_dong: true }],
      phu_cap_bat: true,
      phu_cap: [{ ten: 'Ăn trưa văn phòng', so_tien: 730000, mien_thue: true }, { ten: 'Phụ cấp chứng từ', so_tien: 500000, mien_thue: true }],
      phat_bat: true,
      phat_muon: 50000,
      phat_quen_cham: 50000,
      luong_bhxh: 5500000,
      ptram_bhxh: 10.5,
      template_code: 'TEMPLATE_OFFICE',
    },
    'NV-KHO': {
      muc_luong: 10000000,
      cong_chuan: 26,
      tong_phep: 12,
      ngay_onboard: '2025-05-01',
      he_so_ot: 150,
      thuong_bat: true,
      thuong: [{ ten: 'Thưởng bảo quản vật tư tốt', so_tien: 500000, tu_dong: false }, { ten: 'Chuyên cần', so_tien: 500000, tu_dong: true }],
      phu_cap_bat: true,
      phu_cap: [{ ten: 'Ăn trưa xưởng', so_tien: 730000, mien_thue: true }, { ten: 'Phụ cấp độc hại kho bạt/sơn', so_tien: 600000, mien_thue: true }],
      phat_bat: true,
      phat_muon: 50000,
      phat_quen_cham: 50000,
      luong_bhxh: 5000000,
      ptram_bhxh: 10.5,
      template_code: 'TEMPLATE_WORKSHOP',
    },
    'NV-THO': {
      muc_luong: 12000000,
      cong_chuan: 26,
      tong_phep: 12,
      ngay_onboard: '2025-04-10',
      he_so_ot: 150,
      he_so_ot_cn: 200,
      he_so_le: 300,
      thuong_bat: true,
      thuong: [{ ten: 'Thưởng lắp đặt an toàn', so_tien: 800000, tu_dong: false }, { ten: 'Chuyên cần', so_tien: 500000, tu_dong: true }],
      phu_cap_bat: true,
      phu_cap: [{ ten: 'Ăn trưa & bồi dưỡng thi công cao độ', so_tien: 1000000, mien_thue: true }, { ten: 'Xăng xe di chuyển công trình', so_tien: 500000, mien_thue: true }],
      phat_bat: true,
      phat_muon: 50000,
      phat_quen_cham: 50000,
      luong_bhxh: 5000000,
      ptram_bhxh: 10.5,
      template_code: 'TEMPLATE_WORKSHOP',
    },
  };

  for (const emp of employees) {
    const cfg = policyConfigs[emp.code] || {
      muc_luong: 10000000,
      cong_chuan: 26,
      tong_phep: 12,
      ngay_onboard: '2026-01-01',
      he_so_ot: 150,
      luong_bhxh: 5000000,
      ptram_bhxh: 10.5,
    };
    const baseSalary = cfg.muc_luong;
    const policy = {
      loai: 'Tháng',
      ...cfg,
    };

    const check = await client.query(`SELECT id FROM erp.salary_terms WHERE organization_id = $1 AND employee_id = $2 AND valid_to IS NULL`, [orgId, emp.id]);
    if (check.rows.length > 0) {
      await client.query(`
        UPDATE erp.salary_terms
        SET base_salary = $1, policy = $2, template_code = $3, updated_at = now()
        WHERE id = $4
      `, [baseSalary, JSON.stringify(policy), cfg.template_code || 'TEMPLATE_OFFICE', check.rows[0].id]);
    } else {
      await client.query(`
        INSERT INTO erp.salary_terms (
          organization_id, employee_id, base_salary, pay_basis, policy, template_code, created_by, updated_by
        )
        VALUES ($1, $2, $3, 'monthly', $4, $5, $6, $6)
      `, [orgId, emp.id, baseSalary, JSON.stringify(policy), cfg.template_code || 'TEMPLATE_OFFICE', userId]);
    }
  }

  // 2. Tạo chấm công hôm nay (Today Check-in Records)
  console.log('Nạp dữ liệu chấm công thời gian thực cho ngày hôm nay...');
  const todayStr = new Date().toISOString().split('T')[0];

  // Xóa bản ghi test hôm nay nếu có để nạp chuẩn
  await client.query(`DELETE FROM erp.attendance_entries WHERE organization_id = $1 AND work_date = $2`, [orgId, todayStr]);

  const empMap = Object.fromEntries(employees.map(e => [e.code, e.id]));

  // NV-ADMIN: Đã check-in 07:48 (Đúng giờ), chưa checkout (Đang làm việc)
  if (empMap['NV-ADMIN']) {
    await client.query(`
      INSERT INTO erp.attendance_entries (organization_id, employee_id, work_date, start_at, source, status, created_by, updated_by)
      VALUES ($1, $2, $3, $3::date + time '07:48:00', 'manual', 'draft', $4, $4)
    `, [orgId, empMap['NV-ADMIN'], todayStr, userId]);
  }

  // NV-DUAN: Đã check-in 08:02 (Đúng giờ), chưa checkout (Đang làm việc GPS hiện trường)
  if (empMap['NV-DUAN']) {
    await client.query(`
      INSERT INTO erp.attendance_entries (organization_id, employee_id, work_date, start_at, source, status, created_by, updated_by)
      VALUES ($1, $2, $3, $3::date + time '08:02:15', 'field', 'draft', $4, $4)
    `, [orgId, empMap['NV-DUAN'], todayStr, userId]);
  }

  // NV-KETOAN: Đã check-in 07:55, chưa checkout (Đang làm việc Desk)
  if (empMap['NV-KETOAN']) {
    await client.query(`
      INSERT INTO erp.attendance_entries (organization_id, employee_id, work_date, start_at, source, status, created_by, updated_by)
      VALUES ($1, $2, $3, $3::date + time '07:55:00', 'manual', 'draft', $4, $4)
    `, [orgId, empMap['NV-KETOAN'], todayStr, userId]);
  }

  // NV-THO: Đi muộn (08:32:00 > 08:15)
  if (empMap['NV-THO']) {
    await client.query(`
      INSERT INTO erp.attendance_entries (organization_id, employee_id, work_date, start_at, source, status, created_by, updated_by)
      VALUES ($1, $2, $3, $3::date + time '08:32:00', 'workshop', 'draft', $4, $4)
    `, [orgId, empMap['NV-THO'], todayStr, userId]);
  }

  // NV-KHO: Chưa check-in hôm nay (Vắng / Nghỉ phép) -> Không tạo entry

  // 3. Nạp dữ liệu các ngày trước trong Tháng 3/2026 (1..7/3/2026)
  const currentDay = Math.min(new Date().getDate(), 28);
  for (let day = 1; day < currentDay; day++) {
    const dayDate = `2026-03-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(dayDate);
    if (dateObj.getDay() === 0) continue; // Chủ nhật nghỉ

    for (const emp of employees) {
      // Xác suất 95% đi làm đủ công 8h
      const isLate = (day % 7 === 0 && emp.code === 'NV-THO');
      const startHour = isLate ? '08:25:00' : '07:55:00';
      const endHour = (emp.code === 'NV-THO' && day % 3 === 0) ? '19:30:00' : '17:30:00'; // Có OT

      await client.query(`
        INSERT INTO erp.attendance_entries (organization_id, employee_id, work_date, start_at, end_at, source, status, created_by, updated_by)
        VALUES ($1, $2, $3, $3::date + time '${startHour}', $3::date + time '${endHour}', 'manual', 'completed', $4, $4)
        ON CONFLICT DO NOTHING
      `, [orgId, emp.id, dayDate, userId]);
    }
  }

  // 4. Nạp Bảng Lương Đã Chốt Lịch Sử (Tháng 1/2026 & Tháng 2/2026)
  console.log('Nạp lịch sử bảng lương đã chốt (Tháng 1 & Tháng 2/2026)...');

  // Tháng 1/2026
  const p1Res = await client.query(`
    INSERT INTO erp.attendance_periods (organization_id, year, month, status, created_by, updated_by)
    VALUES ($1, 2026, 1, 'closed', $2, $2)
    ON CONFLICT (organization_id, year, month) DO UPDATE SET status = 'closed', updated_at = now()
    RETURNING id
  `, [orgId, userId]);
  const p1Id = p1Res.rows[0].id;

  const run1Res = await client.query(`
    INSERT INTO erp.payroll_runs (
      organization_id, revision_no, status, approved_by, approved_at, period_id, created_by, updated_by
    )
    VALUES ($1, 1, 'approved', $2, '2026-02-05 10:30:00+07', $3, $2, $2)
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId, userId, p1Id]);
  const run1Id = run1Res.rows[0]?.id || (await client.query(`SELECT id FROM erp.payroll_runs WHERE organization_id = $1 AND period_id = $2 LIMIT 1`, [orgId, p1Id])).rows[0]?.id;

  // Nạp dòng lương Tháng 1/2026
  if (run1Id) {
    for (const emp of employees) {
      const cfg = policyConfigs[emp.code] || { muc_luong: 10000000 };
      const baseSalary = cfg.muc_luong;
      const baseAmount = baseSalary;
      const allowances = cfg.phu_cap ? cfg.phu_cap.reduce((s, x) => s + x.so_tien, 0) : 730000;
      const bonus = cfg.thuong ? cfg.thuong.reduce((s, x) => s + x.so_tien, 0) : 500000;
      const deductions = Math.round((cfg.luong_bhxh || 5000000) * 0.105);
      const netAmount = baseAmount + allowances + bonus - deductions;

      const snapshot = {
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        baseSalary,
        standardDays: 26,
        actualDays: 26,
        otHours: emp.code === 'NV-THO' ? 12 : 0,
        timeSalary: baseAmount,
        otSalary: 0,
        allowances,
        allowanceDetails: cfg.phu_cap || [],
        bonus,
        bonusDetails: cfg.thuong || [],
        fines: 0,
        socialInsurance: deductions,
        netSalary: netAmount,
        note: 'Đã hoàn tất thanh toán chuyển khoản qua Vietcombank',
      };

      await client.query(`
        INSERT INTO erp.payroll_lines (
          organization_id, run_id, employee_id, salary_snapshot, regular_minutes, overtime_minutes,
          base_amount, allowances, bonus, deductions, net_amount, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, 26 * 480, 0, $5, $6, $7, $8, $9, $10, $10)
        ON CONFLICT (organization_id, run_id, employee_id) DO UPDATE SET
          salary_snapshot = EXCLUDED.salary_snapshot,
          net_amount = EXCLUDED.net_amount
      `, [orgId, run1Id, emp.id, JSON.stringify(snapshot), baseAmount, allowances, bonus, deductions, netAmount, userId]);
    }
  }

  // Tháng 2/2026
  const p2Res = await client.query(`
    INSERT INTO erp.attendance_periods (organization_id, year, month, status, created_by, updated_by)
    VALUES ($1, 2026, 2, 'closed', $2, $2)
    ON CONFLICT (organization_id, year, month) DO UPDATE SET status = 'closed', updated_at = now()
    RETURNING id
  `, [orgId, userId]);
  const p2Id = p2Res.rows[0].id;

  const run2Res = await client.query(`
    INSERT INTO erp.payroll_runs (
      organization_id, revision_no, status, approved_by, approved_at, period_id, created_by, updated_by
    )
    VALUES ($1, 1, 'approved', $2, '2026-03-05 14:15:00+07', $3, $2, $2)
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [orgId, userId, p2Id]);
  const run2Id = run2Res.rows[0]?.id || (await client.query(`SELECT id FROM erp.payroll_runs WHERE organization_id = $1 AND period_id = $2 LIMIT 1`, [orgId, p2Id])).rows[0]?.id;

  // Nạp dòng lương Tháng 2/2026
  if (run2Id) {
    for (const emp of employees) {
      const cfg = policyConfigs[emp.code] || { muc_luong: 10000000 };
      const baseSalary = cfg.muc_luong;
      const baseAmount = baseSalary;
      const allowances = cfg.phu_cap ? cfg.phu_cap.reduce((s, x) => s + x.so_tien, 0) : 730000;
      const bonus = cfg.thuong ? cfg.thuong.reduce((s, x) => s + x.so_tien, 0) : 500000;
      const deductions = Math.round((cfg.luong_bhxh || 5000000) * 0.105);
      const netAmount = baseAmount + allowances + bonus - deductions;

      const snapshot = {
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        baseSalary,
        standardDays: 26,
        actualDays: 24, // Tháng 2 có Tết nguyên đán
        otHours: emp.code === 'NV-THO' ? 16 : 4,
        timeSalary: baseAmount,
        otSalary: 0,
        allowances,
        allowanceDetails: cfg.phu_cap || [],
        bonus,
        bonusDetails: cfg.thuong || [],
        fines: 0,
        socialInsurance: deductions,
        netSalary: netAmount,
        note: 'Kỳ lương Tết & hoàn ứng thi công',
      };

      await client.query(`
        INSERT INTO erp.payroll_lines (
          organization_id, run_id, employee_id, salary_snapshot, regular_minutes, overtime_minutes,
          base_amount, allowances, bonus, deductions, net_amount, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, 24 * 480, 0, $5, $6, $7, $8, $9, $10, $10)
        ON CONFLICT (organization_id, run_id, employee_id) DO UPDATE SET
          salary_snapshot = EXCLUDED.salary_snapshot,
          net_amount = EXCLUDED.net_amount
      `, [orgId, run2Id, emp.id, JSON.stringify(snapshot), baseAmount, allowances, bonus, deductions, netAmount, userId]);
    }
  }

  // Đảm bảo Tháng 3/2026 có period open
  await client.query(`
    INSERT INTO erp.attendance_periods (organization_id, year, month, status, created_by, updated_by)
    VALUES ($1, 2026, 3, 'open', $2, $2)
    ON CONFLICT (organization_id, year, month) DO NOTHING
  `, [orgId, userId]);

  console.log('--- HOÀN TẤT NẠP DỮ LIỆU THẬT ---');
  await client.end();
}

seedHrm().catch(e => {
  console.error('LỖI KHI NẠP DỮ LIỆU:', e);
  process.exit(1);
});

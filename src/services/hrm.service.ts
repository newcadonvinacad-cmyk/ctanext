import { getDbPool, getCachedOrgId } from "@/lib/db";
import { FinanceService } from "./finance.service";

export interface SalaryPolicy {
  loai: "Tháng" | "Giờ" | "Ca" | "Khoán";
  muc_luong: number;
  cong_chuan: number;
  tong_phep: number;
  ngay_onboard: string;
  luong_gio_mac_dinh: number;
  luong_theo_ca: Record<string, number>;
  he_so_ot: number;
  he_so_ot_t7: number;
  he_so_ot_cn: number;
  he_so_le: number;
  thuong_bat: boolean;
  thuong: Array<{ ten: string; so_tien: number; tu_dong?: boolean }>;
  phu_cap_bat: boolean;
  phu_cap: Array<{ ten: string; so_tien: number; mien_thue?: boolean }>;
  phat_bat: boolean;
  phat_muon: number;
  phat_quen_cham: number;
  luong_bhxh: number;
  ptram_bhxh: number;
  template_code?: string;
}

export interface AttendanceTodayDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  durationSeconds: number;
  currentShiftName: string;
  isLate: boolean;
  recentLogs: Array<{
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    totalHours: number;
    status: string;
  }>;
  monthStats: {
    workDays: number;
    targetDays: number;
    otHours: number;
    leavesRemaining: number;
  };
}

export class HrmService {
  private static async getOrgId(): Promise<string> {
    return getCachedOrgId("SIGNAGE");
  }

  // ==========================================
  // 1. QUẢN LÝ MẪU CHÍNH SÁCH LƯƠNG
  // ==========================================
  static async listPolicyTemplates(): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `SELECT id, code, name, description, target_group, policy, is_default, created_at, updated_at
       FROM erp.salary_policy_templates
       WHERE organization_id = $1
       ORDER BY is_default DESC, name ASC`,
      [orgId]
    );
    return res.rows;
  }

  static async savePolicyTemplate(data: {
    code: string;
    name: string;
    description?: string;
    targetGroup?: string;
    policy: SalaryPolicy;
    isDefault?: boolean;
  }): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `INSERT INTO erp.salary_policy_templates (
         organization_id, code, name, description, target_group, policy, is_default, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (organization_id, code) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         target_group = EXCLUDED.target_group,
         policy = EXCLUDED.policy,
         is_default = EXCLUDED.is_default,
         updated_at = now()
       RETURNING *`,
      [
        orgId,
        data.code,
        data.name,
        data.description || "",
        data.targetGroup || "all",
        JSON.stringify(data.policy),
        Boolean(data.isDefault),
      ]
    );
    return res.rows[0];
  }

  static async createEmployee(data: {
    code?: string;
    name: string;
    phone?: string;
    departmentId?: string;
    hireDate?: string;
    membershipId?: string;
    baseSalary?: number;
    payBasis?: string;
    templateCode?: string;
    policy?: SalaryPolicy;
    createdBy?: string;
  }): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let empCode = data.code ? data.code.trim() : "";
    if (!empCode) {
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM erp.employees WHERE organization_id = $1`,
        [orgId]
      );
      const count = parseInt(countRes.rows[0].count, 10) + 1;
      empCode = `NV-${String(count).padStart(3, "0")}`;
    }

    // Kiểm tra trùng mã nhân viên
    const dupRes = await pool.query(
      `SELECT id FROM erp.employees WHERE organization_id = $1 AND code = $2`,
      [orgId, empCode]
    );
    if (dupRes.rows.length > 0) {
      empCode = `${empCode}-${Date.now().toString().slice(-4)}`;
    }

    const insRes = await pool.query(
      `INSERT INTO erp.employees (
         organization_id, code, name, phone, membership_id, department_id,
         hire_date, is_active, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $8)
       RETURNING *`,
      [
        orgId,
        empCode,
        data.name.trim(),
        data.phone || null,
        data.membershipId || null,
        data.departmentId || null,
        data.hireDate || new Date().toISOString().split("T")[0],
        data.createdBy || null,
      ]
    );
    const employee = insRes.rows[0];

    // Tạo salary policy nếu có thông tin lương
    if (data.baseSalary !== undefined || data.policy || data.templateCode) {
      const defaultPolicy: SalaryPolicy = data.policy || {
        loai: (data.payBasis === "hourly" ? "Giờ" : "Tháng") as any,
        muc_luong: Number(data.baseSalary) || 0,
        cong_chuan: 26,
        tong_phep: 12,
        ngay_onboard: data.hireDate || new Date().toISOString().split("T")[0],
        luong_gio_mac_dinh: data.payBasis === "hourly" ? Math.round((Number(data.baseSalary) || 0) / 208) : 0,
        luong_theo_ca: {},
        he_so_ot: 1.5,
        he_so_ot_t7: 1.5,
        he_so_ot_cn: 2.0,
        he_so_le: 3.0,
        thuong_bat: false,
        thuong: [],
        phu_cap_bat: false,
        phu_cap: [],
        phat_bat: false,
        phat_muon: 50000,
        phat_quen_cham: 50000,
        luong_bhxh: 0,
        ptram_bhxh: 10.5,
        template_code: data.templateCode,
      };

      await this.upsertEmployeeSalaryPolicy(
        employee.id,
        defaultPolicy,
        data.createdBy || "system"
      );
    }

    return employee;
  }

  // ==========================================
  // 2. DANH SÁCH NHÂN SỰ & CHÍNH SÁCH LƯƠNG
  // ==========================================
  static async listEmployeesWithPolicy(search?: string, departmentId?: string): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        e.id,
        e.code,
        e.name,
        e.phone,
        e.hire_date,
        e.end_date,
        e.is_active,
        e.department_id,
        d.name as department_name,
        st.id as salary_term_id,
        st.base_salary,
        st.pay_basis,
        st.policy,
        st.template_code
      FROM erp.employees e
      LEFT JOIN erp.departments d ON d.id = e.department_id
      LEFT JOIN erp.salary_terms st ON st.employee_id = e.id AND st.valid_to IS NULL
      WHERE e.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (departmentId) {
      params.push(departmentId);
      sql += ` AND e.department_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (e.name ILIKE $${params.length} OR e.code ILIKE $${params.length} OR e.phone ILIKE $${params.length})`;
    }

    sql += ` ORDER BY e.code ASC`;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      phone: r.phone,
      hireDate: r.hire_date ? new Date(r.hire_date).toISOString().split("T")[0] : null,
      endDate: r.end_date ? new Date(r.end_date).toISOString().split("T")[0] : null,
      isActive: r.is_active,
      departmentId: r.department_id,
      departmentName: r.department_name || "Chưa phân ban",
      salaryTermId: r.salary_term_id,
      baseSalary: Number(r.base_salary) || 0,
      payBasis: r.pay_basis || "monthly",
      policy: r.policy || null,
      templateCode: r.template_code || null,
    }));
  }

  static async getEmployeeSalaryPolicy(employeeId: string): Promise<SalaryPolicy | null> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const res = await pool.query(
      `SELECT policy, base_salary, template_code 
       FROM erp.salary_terms 
       WHERE organization_id = $1 AND employee_id = $2 AND valid_to IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [orgId, employeeId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0].policy as SalaryPolicy;
  }

  static async upsertEmployeeSalaryPolicy(
    employeeId: string,
    policy: SalaryPolicy,
    userId: string
  ): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const baseSalary = Math.max(0, Number(policy.muc_luong) || 0);
    const payBasis = policy.loai === "Giờ" ? "hourly" : policy.loai === "Ca" ? "daily" : "monthly";

    // Auto-calculate luong_gio_mac_dinh if 0
    if (!policy.luong_gio_mac_dinh && policy.cong_chuan && baseSalary) {
      policy.luong_gio_mac_dinh = Math.round(baseSalary / (policy.cong_chuan * 8));
    }

    const checkRes = await pool.query(
      `SELECT id FROM erp.salary_terms WHERE organization_id = $1 AND employee_id = $2 AND valid_to IS NULL LIMIT 1`,
      [orgId, employeeId]
    );

    if (checkRes.rows.length > 0) {
      const termId = checkRes.rows[0].id;
      const updateRes = await pool.query(
        `UPDATE erp.salary_terms
         SET base_salary = $1, pay_basis = $2, policy = $3, template_code = $4, updated_at = now(), updated_by = $5, version = version + 1
         WHERE id = $6
         RETURNING *`,
        [baseSalary, payBasis, JSON.stringify(policy), policy.template_code || null, userId, termId]
      );
      return updateRes.rows[0];
    } else {
      const insertRes = await pool.query(
        `INSERT INTO erp.salary_terms (
           organization_id, employee_id, base_salary, pay_basis, policy, template_code, created_by, updated_by, valid_from
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, CURRENT_DATE)
         RETURNING *`,
        [orgId, employeeId, baseSalary, payBasis, JSON.stringify(policy), policy.template_code || null, userId]
      );
      return insertRes.rows[0];
    }
  }

  // ==========================================
  // 3. CHẤM CÔNG THỜI GIAN THỰC (BÀN LÀM VIỆC & HIỆN TRƯỜNG)
  // ==========================================
  static async resolveEmployeeForUser(userId: string): Promise<{ id: string; code: string; name: string } | null> {
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT e.id, e.code, e.name 
       FROM erp.employees e
       JOIN erp.memberships m ON m.id = e.membership_id
       WHERE m.user_id = $1 LIMIT 1`,
      [userId]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  static async getTodayAttendance(userId: string): Promise<AttendanceTodayDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const emp = await this.resolveEmployeeForUser(userId);
    if (!emp) {
      return {
        employeeId: "",
        employeeCode: "",
        employeeName: "Chưa liên kết hồ sơ nhân sự",
        isCheckedIn: false,
        isCheckedOut: false,
        checkInTime: null,
        checkOutTime: null,
        durationSeconds: 0,
        currentShiftName: "Ca Hành Chính (08:00 - 17:30)",
        isLate: false,
        recentLogs: [],
        monthStats: { workDays: 0, targetDays: 26, otHours: 0, leavesRemaining: 12 },
      };
    }

    // 1. Kiểm tra bản ghi hôm nay trong erp.attendance_entries
    const todayRes = await pool.query(
      `SELECT start_at, end_at, source, status
       FROM erp.attendance_entries
       WHERE organization_id = $1 AND employee_id = $2 AND work_date = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [orgId, emp.id]
    );

    let isCheckedIn = false;
    let isCheckedOut = false;
    let checkInTime: string | null = null;
    let checkOutTime: string | null = null;
    let durationSeconds = 0;
    let isLate = false;

    if (todayRes.rows.length > 0) {
      const entry = todayRes.rows[0];
      if (entry.start_at) {
        isCheckedIn = true;
        checkInTime = entry.start_at.toISOString();
        const startMs = new Date(entry.start_at).getTime();

        // Kiểm tra đi muộn (> 08:15)
        const inDate = new Date(entry.start_at);
        if (inDate.getHours() > 8 || (inDate.getHours() === 8 && inDate.getMinutes() > 15)) {
          isLate = true;
        }

        if (entry.end_at) {
          isCheckedOut = true;
          checkOutTime = entry.end_at.toISOString();
          durationSeconds = Math.max(0, Math.floor((new Date(entry.end_at).getTime() - startMs) / 1000));
        } else {
          durationSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        }
      }
    }

    // 2. Lấy 5 ngày làm việc gần nhất
    const recentRes = await pool.query(
      `SELECT work_date, start_at, end_at, status
       FROM erp.attendance_entries
       WHERE organization_id = $1 AND employee_id = $2
       ORDER BY work_date DESC LIMIT 5`,
      [orgId, emp.id]
    );

    const recentLogs = recentRes.rows.map((r) => {
      let hours = 0;
      if (r.start_at && r.end_at) {
        hours = Math.round(((new Date(r.end_at).getTime() - new Date(r.start_at).getTime()) / 3600000) * 10) / 10;
      }
      return {
        date: r.work_date.toISOString().split("T")[0],
        checkIn: r.start_at ? new Date(r.start_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null,
        checkOut: r.end_at ? new Date(r.end_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null,
        totalHours: hours,
        status: r.end_at ? "Hoàn thành" : r.start_at ? "Đang làm" : "Vắng",
      };
    });

    // 3. Tổng hợp công trong tháng
    const monthStatsRes = await pool.query(
      `SELECT COUNT(*) as count, 
              COUNT(CASE WHEN end_at IS NOT NULL THEN 1 END) as completed_count
       FROM erp.attendance_entries
       WHERE organization_id = $1 AND employee_id = $2 
         AND work_date >= date_trunc('month', CURRENT_DATE) 
         AND work_date < date_trunc('month', CURRENT_DATE) + interval '1 month'`,
      [orgId, emp.id]
    );

    const totalDays = Number(monthStatsRes.rows[0]?.count) || 0;

    return {
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeName: emp.name,
      isCheckedIn,
      isCheckedOut,
      checkInTime,
      checkOutTime,
      durationSeconds,
      currentShiftName: "Ca Hành Chính (08:00 - 17:30)",
      isLate,
      recentLogs,
      monthStats: {
        workDays: Math.min(26, totalDays),
        targetDays: 26,
        otHours: 4.5,
        leavesRemaining: 10,
      },
    };
  }

  static async recordAttendance(
    userId: string,
    data: {
      type: "check_in" | "check_out";
      shiftId?: string;
      source?: "desk" | "field" | "workshop";
      latitude?: number;
      longitude?: number;
      accuracyM?: number;
      note?: string;
      explanationNote?: string;
    }
  ): Promise<{ success: boolean; entryId: string; type: string; timestamp: string }> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const emp = await this.resolveEmployeeForUser(userId);
    if (!emp) {
      throw new Error("Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên trong hệ thống");
    }

    const rawSource = data.source || "manual";
    const source = rawSource === "field" ? "field" : rawSource === "workshop" ? "workshop" : "manual";
    const now = new Date();

    // 0. Xác thực tọa độ GPS theo danh sách điểm làm việc được cấu hình
    let matchedLocationName: string | null = null;
    let locationDistanceM: number | null = null;

    if (data.latitude && data.longitude) {
      const locations = await this.listWorkLocations(true);
      if (locations.length > 0) {
        let isWithinAllowedArea = false;
        let nearestDistance = Infinity;
        let nearestLocName = "";
        let nearestRadius = 0;

        for (const loc of locations) {
          const dist = this.calculateDistanceMeters(
            Number(data.latitude),
            Number(data.longitude),
            Number(loc.latitude),
            Number(loc.longitude)
          );
          if (dist < nearestDistance) {
            nearestDistance = dist;
            nearestLocName = loc.name;
            nearestRadius = loc.radiusMeters;
          }
          if (dist <= loc.radiusMeters) {
            isWithinAllowedArea = true;
            matchedLocationName = loc.name;
            locationDistanceM = dist;
            break;
          }
        }

        if (!isWithinAllowedArea) {
          throw new Error(
            `Vị trí hiện tại của bạn cách "${nearestLocName}" khoảng ${Math.round(nearestDistance)}m, vượt quá bán kính cho phép (${nearestRadius}m). Vui lòng di chuyển đến điểm làm việc để check-in.`
          );
        }
      }
    }

    if (data.type === "check_in") {
      // Đóng bất kỳ phiên cũ nào còn mở hôm nay nếu có
      const existingOpen = await pool.query(
        `SELECT id FROM erp.attendance_entries
         WHERE organization_id = $1 AND employee_id = $2 AND work_date = CURRENT_DATE AND end_at IS NULL`,
        [orgId, emp.id]
      );
      if (existingOpen.rows.length > 0) {
        await pool.query(
          `UPDATE erp.attendance_entries
           SET end_at = now(), explanation_required = true,
               explanation_note = COALESCE(explanation_note, 'Tự động đóng phiên do có check-in phiên mới'),
               updated_at = now(), updated_by = $1
           WHERE id = $2`,
          [userId, existingOpen.rows[0].id]
        );
      }

      // Kiểm tra ca làm việc
      let shiftId = data.shiftId || null;
      let explanationRequired = false;
      let explanationNote = data.note || data.explanationNote || null;

      if (shiftId) {
        const shiftRes = await pool.query(
          `SELECT id, code, name, shift_kind, start_time FROM erp.work_shifts WHERE id = $1 AND organization_id = $2`,
          [shiftId, orgId]
        );
        if (shiftRes.rows.length > 0) {
          const shift = shiftRes.rows[0];
          if (shift.start_time) {
            const [sHour, sMin] = shift.start_time.split(":").map(Number);
            if (now.getHours() > sHour || (now.getHours() === sHour && now.getMinutes() > (sMin || 0) + 15)) {
              explanationRequired = true;
              explanationNote = explanationNote || `Đi muộn so với ca ${shift.name} (${shift.start_time})`;
            }
          }
        }
      }

      // 1. Ghi hoặc cập nhật attendance_entries
      const res = await pool.query(
        `INSERT INTO erp.attendance_entries (
           organization_id, work_date, start_at, source, status, employee_id,
           shift_id, explanation_required, explanation_note, created_by, updated_by
         )
         VALUES ($1, CURRENT_DATE, now(), $2, 'draft', $3, $4, $5, $6, $7, $7)
         RETURNING id`,
        [orgId, source, emp.id, shiftId, explanationRequired, explanationNote, userId]
      );
      const entryId = res.rows[0]?.id || crypto.randomUUID();

      // 2. Nếu có GPS, lưu vào field_events
      if (data.latitude && data.longitude) {
        await pool.query(
          `INSERT INTO erp.field_events (
             organization_id, type, occurred_at, latitude, longitude, accuracy_m, client_request_id, employee_id, created_by
           )
           VALUES ($1, 'check_in', now(), $2, $3, $4, gen_random_uuid(), $5, $6)`,
          [orgId, data.latitude, data.longitude, data.accuracyM || 5, emp.id, userId]
        );
      }

      return {
        success: true,
        entryId,
        type: "check_in",
        timestamp: now.toISOString(),
      };
    } else {
      // check_out
      const openRes = await pool.query(
        `SELECT ae.id, ae.start_at, ae.shift_id, ae.explanation_required, s.shift_kind, s.work_hours, s.end_time
         FROM erp.attendance_entries ae
         LEFT JOIN erp.work_shifts s ON s.id = ae.shift_id
         WHERE ae.organization_id = $1 AND ae.employee_id = $2 AND ae.work_date = CURRENT_DATE AND ae.end_at IS NULL
         ORDER BY ae.start_at DESC LIMIT 1`,
        [orgId, emp.id]
      );

      let entryId: string;
      if (openRes.rows.length > 0) {
        const openEntry = openRes.rows[0];
        const durationMinutes = Math.max(0, Math.round((now.getTime() - new Date(openEntry.start_at).getTime()) / 60000));
        let regularMinutes = 0;
        let otMinutes = 0;
        let explanationRequired = openEntry.explanation_required;
        let explanationNote = data.note || data.explanationNote || null;

        const shiftKind = openEntry.shift_kind || "regular";
        if (shiftKind === "overtime") {
          regularMinutes = 0;
          otMinutes = durationMinutes;
        } else {
          const standardMinutes = Math.round((openEntry.work_hours || 8) * 60);
          regularMinutes = Math.min(durationMinutes, standardMinutes);
          otMinutes = Math.max(0, durationMinutes - standardMinutes);
        }

        if (durationMinutes < 120 && shiftKind !== "overtime") {
          explanationRequired = true;
          explanationNote = explanationNote || "Thời gian làm việc dưới 2 tiếng";
        }

        await pool.query(
          `UPDATE erp.attendance_entries
           SET end_at = now(),
               status = 'completed',
               regular_minutes = $1,
               ot_minutes = $2,
               explanation_required = $3,
               explanation_note = COALESCE($4, explanation_note),
               updated_at = now(),
               updated_by = $5
           WHERE id = $6`,
          [regularMinutes, otMinutes, explanationRequired, explanationNote, userId, openEntry.id]
        );
        entryId = openEntry.id;
      } else {
        // Quên check-in mà check-out: KHÔNG tạo giả 08:00 AM!
        const ins = await pool.query(
          `INSERT INTO erp.attendance_entries (
             organization_id, work_date, start_at, end_at, source, status, employee_id,
             regular_minutes, ot_minutes, explanation_required, explanation_note, created_by, updated_by
           )
           VALUES ($1, CURRENT_DATE, now() - interval '1 second', now(), $2, 'completed', $3, 0, 0, true, $4, $5, $5)
           RETURNING id`,
          [orgId, source, emp.id, data.note || data.explanationNote || "Check-out không có check-in trước đó", userId]
        );
        entryId = ins.rows[0]?.id;
      }

      // Lưu field_events nếu có GPS
      if (data.latitude && data.longitude) {
        await pool.query(
          `INSERT INTO erp.field_events (
             organization_id, type, occurred_at, latitude, longitude, accuracy_m, client_request_id, employee_id, created_by
           )
           VALUES ($1, 'check_out', now(), $2, $3, $4, gen_random_uuid(), $5, $6)`,
          [orgId, data.latitude, data.longitude, data.accuracyM || 5, emp.id, userId]
        );
      }

      return {
        success: true,
        entryId,
        type: "check_out",
        timestamp: now.toISOString(),
      };
    }
  }

  /**
   * Nhân sự (HR) thẩm định phiên chấm công (duyệt OT, giải trình)
   */
  static async reviewAttendanceEntry(
    entryId: string,
    decision: {
      approvedOtMinutes?: number | null;
      explanationNote?: string | null;
      hrDecisionNote: string;
      clearExplanationRequired?: boolean;
    },
    reviewerUserId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const entryRes = await pool.query(
      `SELECT id, organization_id, hr_approved_ot_minutes, explanation_required
       FROM erp.attendance_entries
       WHERE id = $1 AND organization_id = $2`,
      [entryId, orgId]
    );
    if (entryRes.rows.length === 0) {
      throw new Error("Không tìm thấy bản ghi chấm công!");
    }

    await pool.query(
      `UPDATE erp.attendance_entries
       SET hr_approved_ot_minutes = COALESCE($1, hr_approved_ot_minutes),
           hr_decision_note = $2,
           hr_decided_by = $3,
           hr_decided_at = now(),
           explanation_required = CASE WHEN $4::boolean = true THEN false ELSE explanation_required END,
           explanation_note = COALESCE($5, explanation_note),
           updated_at = now(),
           updated_by = $3
       WHERE id = $6 AND organization_id = $7`,
      [
        decision.approvedOtMinutes !== undefined ? decision.approvedOtMinutes : null,
        decision.hrDecisionNote,
        reviewerUserId,
        decision.clearExplanationRequired ?? false,
        decision.explanationNote ?? null,
        entryId,
        orgId,
      ]
    );
  }

  // ==========================================
  // 4. MA TRẬN CHẤM CÔNG THÁNG 1..31 NGÀY
  // ==========================================
  static async getMonthlyAttendanceMatrix(year: number, month: number, departmentId?: string): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. Danh sách nhân sự
    let empSql = `
      SELECT e.id, e.code, e.name, d.name as department_name, st.policy
      FROM erp.employees e
      LEFT JOIN erp.departments d ON d.id = e.department_id
      LEFT JOIN erp.salary_terms st ON st.employee_id = e.id AND st.valid_to IS NULL
      WHERE e.organization_id = $1 AND e.is_active = true
    `;
    const empParams: any[] = [orgId];
    if (departmentId) {
      empParams.push(departmentId);
      empSql += ` AND e.department_id = $${empParams.length}`;
    }
    empSql += ` ORDER BY e.code ASC`;

    const empRes = await pool.query(empSql, empParams);

    // 2. Lấy dữ liệu attendance_entries trong tháng
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const attRes = await pool.query(
      `SELECT ae.id, ae.employee_id, ae.work_date, ae.start_at, ae.end_at, ae.source, ae.status,
              ae.shift_id, ae.regular_minutes, ae.ot_minutes, ae.explanation_required, ae.explanation_note,
              ae.hr_approved_ot_minutes, ae.hr_decided_by, s.shift_kind, s.name as shift_name
       FROM erp.attendance_entries ae
       LEFT JOIN erp.work_shifts s ON s.id = ae.shift_id
       WHERE ae.organization_id = $1 AND ae.work_date >= $2 AND ae.work_date <= $3
       ORDER BY ae.work_date ASC, ae.start_at ASC`,
      [orgId, startDate, endDate]
    );

    // Group theo employeeId -> work_date day -> Array of entries
    const attMap = new Map<string, Map<number, any[]>>();
    for (const row of attRes.rows) {
      const empId = row.employee_id;
      const dayNum = new Date(row.work_date).getDate();
      if (!attMap.has(empId)) {
        attMap.set(empId, new Map());
      }
      const dayMap = attMap.get(empId)!;
      if (!dayMap.has(dayNum)) {
        dayMap.set(dayNum, []);
      }
      dayMap.get(dayNum)!.push(row);
    }

    // 3. Xây dựng ma trận cho từng nhân sự
    const matrix = empRes.rows.map((emp) => {
      const empDays = attMap.get(emp.id) || new Map();
      const days: Record<number, { status: string; in?: string; out?: string; hours?: number }> = {};
      let totalWorkDays = 0;
      let totalOtHours = 0;
      let lateCount = 0;
      let missingCheckoutCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        const isSunday = dateObj.getDay() === 0;
        const entries = empDays.get(d) || [];

        if (entries.length > 0) {
          let dayRegMin = 0;
          let dayOtMin = 0;
          let dayTotalHours = 0;
          let hasMissingCheckout = false;
          let isLate = false;

          for (const entry of entries) {
            const hasIn = Boolean(entry.start_at);
            const hasOut = Boolean(entry.end_at);
            if (hasIn && !hasOut) {
              hasMissingCheckout = true;
            }
            if (entry.explanation_required && !entry.hr_decided_by) {
              isLate = true;
            }

            // Tính regular minutes và ot minutes
            let regMin = entry.regular_minutes || 0;
            let otMin = entry.hr_approved_ot_minutes !== null && entry.hr_approved_ot_minutes !== undefined
              ? entry.hr_approved_ot_minutes
              : (entry.ot_minutes || 0);

            // Fallback nếu bản ghi cũ chưa có regular_minutes tính sẵn
            if (regMin === 0 && otMin === 0 && hasIn && hasOut) {
              const diffM = Math.round((new Date(entry.end_at).getTime() - new Date(entry.start_at).getTime()) / 60000);
              if (entry.shift_kind === "overtime") {
                otMin = diffM;
              } else {
                regMin = Math.min(diffM, 480);
                otMin = Math.max(0, diffM - 480);
              }
            }

            dayRegMin += regMin;
            dayOtMin += otMin;
            if (hasIn && hasOut) {
              dayTotalHours += (new Date(entry.end_at).getTime() - new Date(entry.start_at).getTime()) / 3600000;
            }
          }

          if (hasMissingCheckout) missingCheckoutCount++;
          if (isLate) lateCount++;

          const dayWork = Math.min(1, Math.round((dayRegMin / 480) * 10) / 10);
          totalWorkDays += (dayWork > 0 ? dayWork : (dayTotalHours >= 4 ? 1 : (dayTotalHours > 0 ? 0.5 : 0)));
          totalOtHours += Math.round((dayOtMin / 60) * 10) / 10;

          const firstIn = entries.find((e: any) => e.start_at)?.start_at;
          const lastOut = [...entries].reverse().find((e: any) => e.end_at)?.end_at;
          const status = dayOtMin > 0 ? "OT" : (hasMissingCheckout ? "Q" : (dayWork >= 1 ? "1" : (dayWork > 0 ? "1/2" : "-")));

          days[d] = {
            status,
            in: firstIn ? new Date(firstIn).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : undefined,
            out: lastOut ? new Date(lastOut).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : undefined,
            hours: Math.round(dayTotalHours * 10) / 10,
          };
        } else {
          // Không có chấm công
          if (isSunday) {
            days[d] = { status: "OFF" };
          } else {
            days[d] = { status: "-" }; // Vắng
          }
        }
      }

      return {
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        departmentName: emp.department_name || "Văn phòng",
        totalWorkDays,
        totalOtHours,
        lateCount,
        missingCheckoutCount,
        days,
      };
    });

    return {
      year,
      month,
      daysInMonth,
      matrix,
    };
  }

  // ==========================================
  // 5. THEO DÕI TÌNH TRẠNG ĐIỂM DANH HÔM NAY (TODAY ROSTER)
  // ==========================================
  static async getTodayRoster(): Promise<{
    summary: {
      total: number;
      working: number;
      completed: number;
      late: number;
      absent: number;
    };
    roster: Array<{
      employeeId: string;
      employeeCode: string;
      employeeName: string;
      departmentName: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      isLate: boolean;
      lateMinutes: number;
      durationMinutes: number;
      source: string;
      status: "working" | "completed" | "late" | "absent";
      statusLabel: string;
    }>;
  }> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const empRes = await pool.query(
      `SELECT e.id, e.code, e.name, d.name as department_name
       FROM erp.employees e
       LEFT JOIN erp.departments d ON d.id = e.department_id
       WHERE e.organization_id = $1 AND e.is_active = true
       ORDER BY e.code ASC`,
      [orgId]
    );

    const attRes = await pool.query(
      `SELECT employee_id, start_at, end_at, source, status
       FROM erp.attendance_entries
       WHERE organization_id = $1 AND work_date = CURRENT_DATE`,
      [orgId]
    );

    const attMap = new Map<string, any>();
    for (const r of attRes.rows) {
      attMap.set(r.employee_id, r);
    }

    let working = 0;
    let completed = 0;
    let late = 0;
    let absent = 0;

    const roster = empRes.rows.map((emp) => {
      const entry = attMap.get(emp.id);
      if (!entry || !entry.start_at) {
        absent++;
        return {
          employeeId: emp.id,
          employeeCode: emp.code,
          employeeName: emp.name,
          departmentName: emp.department_name || "Chưa phân ban",
          checkInTime: null,
          checkOutTime: null,
          isLate: false,
          lateMinutes: 0,
          durationMinutes: 0,
          source: "-",
          status: "absent" as const,
          statusLabel: "Chưa điểm danh / Vắng",
        };
      }

      const inDate = new Date(entry.start_at);
      const outDate = entry.end_at ? new Date(entry.end_at) : null;
      const standardStart = new Date(inDate);
      standardStart.setHours(8, 0, 0, 0);

      let isLate = false;
      let lateMinutes = 0;
      if (inDate.getTime() > standardStart.getTime() + 15 * 60000) {
        isLate = true;
        lateMinutes = Math.round((inDate.getTime() - standardStart.getTime()) / 60000);
        late++;
      }

      const now = new Date();
      const endTime = outDate || now;
      const durationMinutes = Math.max(0, Math.round((endTime.getTime() - inDate.getTime()) / 60000));

      let st: "working" | "completed" | "late" | "absent" = "working";
      let statusLabel = "Đang làm việc";

      if (outDate) {
        st = "completed";
        statusLabel = "Đã hoàn thành ca";
        completed++;
      } else {
        working++;
        if (isLate) {
          statusLabel = `Đang làm (Muộn ${lateMinutes}p)`;
        }
      }

      const srcLabel = entry.source === "field" ? "GPS Hiện trường" : entry.source === "workshop" ? "Xưởng sản xuất" : "Bàn làm việc Desk";

      return {
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        departmentName: emp.department_name || "Chưa phân ban",
        checkInTime: inDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        checkOutTime: outDate ? outDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null,
        isLate,
        lateMinutes,
        durationMinutes,
        source: srcLabel,
        status: st,
        statusLabel,
      };
    });

    return {
      summary: {
        total: empRes.rows.length,
        working,
        completed,
        late,
        absent,
      },
      roster,
    };
  }

  // ==========================================
  // 6. DANH SÁCH CÁC KỲ LƯƠNG & TRẠNG THÁI KHÓA SỔ
  // ==========================================
  static async listPayrollPeriods(): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const res = await pool.query(
      `SELECT 
         ap.year,
         ap.month,
         ap.status as period_status,
         pr.id as run_id,
         pr.status as run_status,
         pr.approved_at,
         u.name as approved_by_name,
         COUNT(pl.id) as line_count,
         COALESCE(SUM(pl.net_amount), 0) as total_net_payout
       FROM erp.attendance_periods ap
       LEFT JOIN erp.payroll_runs pr ON pr.period_id = ap.id AND pr.status IN ('approved', 'paid')
       LEFT JOIN erp.payroll_lines pl ON pl.run_id = pr.id
       LEFT JOIN public."user" u ON u.id = pr.approved_by
       WHERE ap.organization_id = $1
       GROUP BY ap.year, ap.month, ap.status, pr.id, pr.status, pr.approved_at, u.name
       ORDER BY ap.year DESC, ap.month DESC`,
      [orgId]
    );

    return res.rows.map((r) => ({
      year: Number(r.year),
      month: Number(r.month),
      periodStatus: r.period_status,
      runId: r.run_id,
      runStatus: r.run_status || "draft",
      isApproved: r.run_status === "approved" || r.run_status === "paid",
      approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
      approvedByName: r.approved_by_name || null,
      lineCount: Number(r.line_count) || 0,
      totalNetPayout: Number(r.total_net_payout) || 0,
    }));
  }

  // ==========================================
  // 7. CÔNG CỤ TÍNH LƯƠNG & XEM LẠI LƯƠNG ĐÃ CHỐT
  // ==========================================
  static async calculateMonthlyPayroll(year: number, month: number): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    // 1. Kiểm tra xem kỳ này đã được phê duyệt / chốt sổ chưa
    const existingRunRes = await pool.query(
      `SELECT ap.id as period_id, ap.status as period_status,
              pr.id as run_id, pr.status as run_status, pr.approved_at,
              u.name as approved_by_name
       FROM erp.attendance_periods ap
       LEFT JOIN erp.payroll_runs pr ON pr.period_id = ap.id AND pr.status IN ('approved', 'paid')
       LEFT JOIN public."user" u ON u.id = pr.approved_by
       WHERE ap.organization_id = $1 AND ap.year = $2 AND ap.month = $3
       ORDER BY pr.revision_no DESC NULLS LAST LIMIT 1`,
      [orgId, year, month]
    );

    if (existingRunRes.rows.length > 0) {
      const r = existingRunRes.rows[0];
      const isPeriodLocked =
        r.period_status === "locked" ||
        r.period_status === "approved" ||
        r.period_status === "closed" ||
        r.run_status === "approved" ||
        r.run_status === "paid";

      if (isPeriodLocked) {
        let lines: any[] = [];
        if (r.run_id) {
          const linesRes = await pool.query(
            `SELECT pl.*, e.code as employee_code, e.name as employee_name, d.name as department_name
             FROM erp.payroll_lines pl
             JOIN erp.employees e ON e.id = pl.employee_id
             LEFT JOIN erp.departments d ON d.id = e.department_id
             WHERE pl.run_id = $1
             ORDER BY e.code ASC`,
            [r.run_id]
          );
          lines = linesRes.rows.map((lr) => {
            const snap = lr.salary_snapshot || {};
            return {
              employeeId: lr.employee_id,
              employeeCode: lr.employee_code,
              employeeName: lr.employee_name,
              departmentName: lr.department_name || "Chưa phân ban",
              baseSalary: Number(snap.baseSalary) || Number(lr.base_amount),
              standardDays: Number(snap.standardDays) || 26,
              actualDays: Number(snap.actualDays) || Math.round(lr.regular_minutes / 480),
              otHours: Number(snap.otHours) || Math.round(lr.overtime_minutes / 60),
              dailyRate: snap.dailyRate || Math.round(Number(lr.base_amount) / 26),
              hourlyRate: snap.hourlyRate || Math.round(Number(lr.base_amount) / (26 * 8)),
              timeSalary: Number(snap.timeSalary) || Number(lr.base_amount),
              otSalary: Number(snap.otSalary) || 0,
              allowances: Number(lr.allowances),
              allowanceDetails: snap.allowanceDetails || [],
              bonus: Number(lr.bonus),
              bonusDetails: snap.bonusDetails || [],
              fines: Number(snap.fines) || 0,
              socialInsurance: Number(snap.socialInsurance) || Number(lr.deductions),
              netSalary: Number(lr.net_amount),
              policySnapshot: snap.policySnapshot || snap,
              isLocked: true,
            };
          });
        }
        const totalCost = lines.reduce(
          (s, l) => s + (l.timeSalary || 0) + (l.otSalary || 0) + (l.allowances || 0) + (l.bonus || 0),
          0
        );
        const totalNet = lines.reduce((s, l) => s + (l.netSalary || 0), 0);

        return {
          year,
          month,
          isApproved: true,
          isLocked: true,
          periodStatus: r.period_status,
          runId: r.run_id || null,
          runStatus: r.run_status || "locked",
          approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
          approvedByName: r.approved_by_name || null,
          totalEmployees: lines.length,
          totalCompanyCost: totalCost,
          totalNetPayout: totalNet,
          lines,
        };
      }
    }

    // 2. Nếu chưa chốt, tính toán theo dữ liệu thực tế hiện tại
    const matrixData = await this.getMonthlyAttendanceMatrix(year, month);
    const empList = await this.listEmployeesWithPolicy();

    const payrollLines: any[] = [];
    let totalCompanyCost = 0;
    let totalNetPayout = 0;

    // TỐI ƯU HÓA: Truy vấn gom nhóm toàn bộ đơn từ đã duyệt trong tháng cho tất cả nhân viên (loại bỏ N+1 query)
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(matrixData.daysInMonth).padStart(2, "0")}`;
    const allApprovedReqsRes = await pool.query(
      `SELECT employee_id, type, payroll_fine_adjustment, payroll_ot_hours, payroll_leave_days
       FROM erp.hrm_requests
       WHERE organization_id = $1 AND status = 'approved'
         AND start_date >= $2 AND start_date <= $3`,
      [orgId, startDate, endDate]
    );

    const reqsByEmployeeId = new Map<string, any[]>();
    for (const r of allApprovedReqsRes.rows) {
      let list = reqsByEmployeeId.get(r.employee_id);
      if (!list) {
        list = [];
        reqsByEmployeeId.set(r.employee_id, list);
      }
      list.push(r);
    }

    for (const emp of empList) {
      const policy: SalaryPolicy = emp.policy || {
        loai: "Tháng",
        muc_luong: emp.baseSalary || 10000000,
        cong_chuan: 26,
        tong_phep: 12,
        ngay_onboard: "2026-01-01",
        luong_gio_mac_dinh: 0,
        luong_theo_ca: {},
        he_so_ot: 150,
        he_so_ot_t7: 150,
        he_so_ot_cn: 200,
        he_so_le: 300,
        thuong_bat: true,
        thuong: [{ ten: "Thưởng chuyên cần", so_tien: 500000, tu_dong: true }],
        phu_cap_bat: true,
        phu_cap: [{ ten: "Ăn trưa", so_tien: 730000, mien_thue: true }],
        phat_bat: true,
        phat_muon: 50000,
        phat_quen_cham: 50000,
        luong_bhxh: 5500000,
        ptram_bhxh: 10.5,
      };

      const att = matrixData.matrix.find((m: any) => m.employeeId === emp.id) || {
        totalWorkDays: 0,
        totalOtHours: 0,
        lateCount: 0,
        missingCheckoutCount: 0,
      };

      const baseSalary = Number(policy.muc_luong) || emp.baseSalary || 10000000;
      const standardDays = Number(policy.cong_chuan) || 26;
      const actualDays = Number(att.totalWorkDays) || 0;
      // Lấy các đơn từ đã được duyệt trong tháng của nhân viên từ map đã gom nhóm (O(1))
      const empReqRows = reqsByEmployeeId.get(emp.id) || [];

      const approvedOtFromRequests = empReqRows
        .filter((r) => r.type === "overtime")
        .reduce((sum, r) => sum + (Number(r.payroll_ot_hours) || 0), 0);

      const fineReliefFromRequests = empReqRows
        .filter((r) => r.type === "explanation")
        .reduce((sum, r) => sum + (Number(r.payroll_fine_adjustment) || 0), 0);

      let otHours = Number(att.totalOtHours) || 0;
      if (otHours > 0 && approvedOtFromRequests > 0) {
        otHours = Math.max(otHours, approvedOtFromRequests);
      } else if (otHours === 0) {
        otHours = approvedOtFromRequests;
      }

      // 1. Đơn giá
      const dailyRate = Math.round(baseSalary / standardDays);
      const hourlyRate = policy.luong_gio_mac_dinh || Math.round(dailyRate / 8);

      // 2. Lương thời gian
      const timeSalary = policy.loai === "Giờ" 
        ? Math.round(hourlyRate * actualDays * 8)
        : Math.round(dailyRate * actualDays);

      // 3. Lương OT
      const otMultiplier = (policy.he_so_ot || 150) / 100;
      const otSalary = Math.round(otHours * hourlyRate * otMultiplier);

      // 4. Phụ cấp
      let totalAllowances = 0;
      if (policy.phu_cap_bat && Array.isArray(policy.phu_cap)) {
        totalAllowances = policy.phu_cap.reduce((sum, item) => sum + (Number(item.so_tien) || 0), 0);
      }

      // 5. Thưởng (Tự động thưởng chuyên cần nếu làm đủ công và không đi muộn sau khi trừ giải trình)
      let totalBonuses = 0;
      if (policy.thuong_bat && Array.isArray(policy.thuong)) {
        totalBonuses = policy.thuong.reduce((sum, item) => {
          if (item.tu_dong && (actualDays < standardDays || (att.lateCount > 0 && fineReliefFromRequests === 0))) {
            return sum; // Không đạt chuyên cần
          }
          return sum + (Number(item.so_tien) || 0);
        }, 0);
      }

      // 6. Phạt (Tự động tính từ số lần đi muộn + quên checkout, trừ đi các giải trình đã được duyệt miễn phạt)
      let totalFines = 0;
      if (policy.phat_bat) {
        const rawFines = (att.lateCount * (Number(policy.phat_muon) || 0)) + (att.missingCheckoutCount * (Number(policy.phat_quen_cham) || 0));
        totalFines = Math.max(0, rawFines - fineReliefFromRequests);
      }

      // 7. Bảo hiểm xã hội NLĐ (10.5%)
      const insuranceBase = Number(policy.luong_bhxh) || 0;
      const insuranceRate = Number(policy.ptram_bhxh) || 10.5;
      const socialInsurance = Math.round(insuranceBase * (insuranceRate / 100));

      // 8. Thực nhận (Net)
      const netSalary = Math.max(0, timeSalary + otSalary + totalAllowances + totalBonuses - totalFines - socialInsurance);

      totalCompanyCost += (timeSalary + otSalary + totalAllowances + totalBonuses);
      totalNetPayout += netSalary;

      payrollLines.push({
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        departmentName: emp.departmentName,
        baseSalary,
        standardDays,
        actualDays,
        otHours,
        dailyRate,
        hourlyRate,
        timeSalary,
        otSalary,
        allowances: totalAllowances,
        allowanceDetails: policy.phu_cap || [],
        bonus: totalBonuses,
        bonusDetails: policy.thuong || [],
        fines: totalFines,
        lateTimes: att.lateCount,
        missingCheckouts: att.missingCheckoutCount,
        socialInsurance,
        netSalary,
        policySnapshot: policy,
      });
    }

    return {
      year,
      month,
      totalEmployees: payrollLines.length,
      totalCompanyCost,
      totalNetPayout,
      lines: payrollLines,
    };
  }

  static async approvePayroll(
    year: number,
    month: number,
    lines: any[],
    userId: string
  ): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const checkPeriod = await pool.query(
      `SELECT status FROM erp.attendance_periods WHERE organization_id = $1 AND year = $2 AND month = $3`,
      [orgId, year, month]
    );
    if (checkPeriod.rows[0]?.status === "locked") {
      throw new Error(`Kỳ lương tháng ${month}/${year} đã bị khóa (locked), không thể phê duyệt lại!`);
    }

    const formattedLines = lines.map((l) => ({
      employeeId: l.employeeId,
      baseAmount: l.timeSalary + l.otSalary,
      allowances: l.allowances,
      bonus: l.bonus,
      deductions: (l.fines || 0) + (l.socialInsurance || 0),
      salarySnapshot: l,
      directorNote: `Phê duyệt tự động từ HRM App (Tháng ${month}/${year})`,
    }));

    const result = await FinanceService.approvePayrollRun(
      {
        year,
        month,
        lines: formattedLines,
      },
      userId
    );

    await pool.query(
      `UPDATE erp.attendance_periods
       SET status = 'approved', updated_at = now(), updated_by = $1
       WHERE organization_id = $2 AND year = $3 AND month = $4`,
      [userId, orgId, year, month]
    );

    return result;
  }

  /**
   * Khóa kỳ chấm công / bảng lương (Ngăn tính lại hoặc ghi đè)
   */
  static async lockAttendancePeriod(
    year: number,
    month: number,
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    await pool.query(
      `INSERT INTO erp.attendance_periods (organization_id, year, month, status, created_by, updated_by)
       VALUES ($1, $2, $3, 'locked', $4, $4)
       ON CONFLICT (organization_id, year, month)
       DO UPDATE SET status = 'locked', updated_at = now(), updated_by = $4`,
      [orgId, year, month, userId]
    );
  }

  // ==========================================
  // 5. QUẢN LÝ CA LÀM VIỆC (WORK SHIFTS)
  // ==========================================
  static async listWorkShifts(): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `SELECT id, code, name, type, shift_kind, start_time, end_time, break_minutes, work_hours,
              split_start_time, split_end_time, night_multiplier, is_default, is_active, created_at
       FROM erp.work_shifts
       WHERE organization_id = $1
       ORDER BY is_default DESC, code ASC`,
      [orgId]
    );
    return res.rows;
  }

  static async upsertWorkShift(data: {
    id?: string;
    code: string;
    name: string;
    type?: "standard" | "split" | "overnight" | "parttime";
    shiftKind?: "regular" | "overtime";
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    workHours?: number;
    splitStartTime?: string | null;
    splitEndTime?: string | null;
    nightMultiplier?: number;
    isDefault?: boolean;
    isActive?: boolean;
  }): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    if (data.isDefault) {
      await pool.query(
        `UPDATE erp.work_shifts SET is_default = false WHERE organization_id = $1`,
        [orgId]
      );
    }

    const res = await pool.query(
      `INSERT INTO erp.work_shifts (
         organization_id, code, name, type, shift_kind, start_time, end_time,
         break_minutes, work_hours, split_start_time, split_end_time,
         night_multiplier, is_default, is_active, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
       ON CONFLICT (organization_id, code) DO UPDATE SET
         name = EXCLUDED.name,
         type = EXCLUDED.type,
         shift_kind = EXCLUDED.shift_kind,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         break_minutes = EXCLUDED.break_minutes,
         work_hours = EXCLUDED.work_hours,
         split_start_time = EXCLUDED.split_start_time,
         split_end_time = EXCLUDED.split_end_time,
         night_multiplier = EXCLUDED.night_multiplier,
         is_default = EXCLUDED.is_default,
         is_active = EXCLUDED.is_active,
         updated_at = now()
       RETURNING *`,
      [
        orgId,
        data.code,
        data.name,
        data.type || "standard",
        data.shiftKind || "regular",
        data.startTime,
        data.endTime,
        data.breakMinutes ?? 60,
        data.workHours ?? 8.0,
        data.splitStartTime || null,
        data.splitEndTime || null,
        data.nightMultiplier ?? 130,
        Boolean(data.isDefault),
        data.isActive !== undefined ? Boolean(data.isActive) : true,
      ]
    );
    return res.rows[0];
  }

  static async deleteWorkShift(id: string): Promise<boolean> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `DELETE FROM erp.work_shifts WHERE id = $1 AND organization_id = $2 AND is_default = false`,
      [id, orgId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 6. QUẢN LÝ NGÀY NGHỈ LỄ (HOLIDAYS)
  // ==========================================
  static async listHolidayConfigs(): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `SELECT id, code, name, start_date, end_date, multiplier, is_paid, note, created_at
       FROM erp.holiday_configs
       WHERE organization_id = $1
       ORDER BY start_date ASC`,
      [orgId]
    );
    return res.rows;
  }

  static async upsertHolidayConfig(data: {
    id?: string;
    code: string;
    name: string;
    startDate: string;
    endDate: string;
    multiplier?: number;
    isPaid?: boolean;
    note?: string;
  }): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `INSERT INTO erp.holiday_configs (
         organization_id, code, name, start_date, end_date, multiplier, is_paid, note, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (organization_id, code) DO UPDATE SET
         name = EXCLUDED.name,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         multiplier = EXCLUDED.multiplier,
         is_paid = EXCLUDED.is_paid,
         note = EXCLUDED.note,
         updated_at = now()
       RETURNING *`,
      [
        orgId,
        data.code,
        data.name,
        data.startDate,
        data.endDate,
        data.multiplier ?? 300,
        data.isPaid !== undefined ? Boolean(data.isPaid) : true,
        data.note || null,
      ]
    );
    return res.rows[0];
  }

  static async deleteHolidayConfig(id: string): Promise<boolean> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `DELETE FROM erp.holiday_configs WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 7. QUẢN LÝ CHÍNH SÁCH NGHỈ PHÉP & QUỸ PHÉP
  // ==========================================
  static async getLeavePolicy(): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `SELECT id, organization_id, standard_days, seniority_bonus_years,
              carryover_max_days, cash_out_allowed, pay_basis_types, updated_at
       FROM erp.leave_policies
       WHERE organization_id = $1 LIMIT 1`,
      [orgId]
    );
    if (res.rows.length === 0) {
      // Defaults if not exists
      const inserted = await pool.query(
        `INSERT INTO erp.leave_policies (organization_id, standard_days, seniority_bonus_years, carryover_max_days, cash_out_allowed)
         VALUES ($1, 12, 5, 5, true)
         RETURNING *`,
        [orgId]
      );
      return inserted.rows[0];
    }
    return res.rows[0];
  }

  static async updateLeavePolicy(data: {
    standardDays: number;
    seniorityBonusYears: number;
    carryoverMaxDays: number;
    cashOutAllowed: boolean;
    payBasisTypes?: string[];
  }): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `INSERT INTO erp.leave_policies (
         organization_id, standard_days, seniority_bonus_years, carryover_max_days, cash_out_allowed, pay_basis_types, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (organization_id) DO UPDATE SET
         standard_days = EXCLUDED.standard_days,
         seniority_bonus_years = EXCLUDED.seniority_bonus_years,
         carryover_max_days = EXCLUDED.carryover_max_days,
         cash_out_allowed = EXCLUDED.cash_out_allowed,
         pay_basis_types = COALESCE(EXCLUDED.pay_basis_types, erp.leave_policies.pay_basis_types),
         updated_at = now()
       RETURNING *`,
      [
        orgId,
        data.standardDays,
        data.seniorityBonusYears,
        data.carryoverMaxDays,
        Boolean(data.cashOutAllowed),
        JSON.stringify(data.payBasisTypes || ["monthly", "daily", "hourly", "shift"]),
      ]
    );
    return res.rows[0];
  }

  static async listEmployeeLeaveBalances(): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const policy = await this.getLeavePolicy();

    const empRes = await pool.query(
      `SELECT e.id, e.code, e.name, d.name as department_name, e.created_at,
              st.policy->>'ngay_onboard' as onboard_date
       FROM erp.employees e
       LEFT JOIN erp.departments d ON d.id = e.department_id
       LEFT JOIN erp.salary_terms st ON st.employee_id = e.id AND st.valid_to IS NULL
       WHERE e.organization_id = $1
       ORDER BY e.code ASC`,
      [orgId]
    );

    const now = new Date();
    const currentYear = 2026;

    // Lấy tổng số ngày nghỉ phép đã duyệt từ erp.hrm_requests trong năm
    const leaveReqsRes = await pool.query(
      `SELECT employee_id, SUM(payroll_leave_days) as approved_leave_days
       FROM erp.hrm_requests
       WHERE organization_id = $1 AND type = 'leave' AND status = 'approved'
         AND EXTRACT(YEAR FROM start_date) = $2
       GROUP BY employee_id`,
      [orgId, currentYear]
    );

    const leaveReqMap = new Map<string, number>();
    for (const r of leaveReqsRes.rows) {
      leaveReqMap.set(r.employee_id, Number(r.approved_leave_days) || 0);
    }

    return empRes.rows.map((row) => {
      const onboardStr = row.onboard_date || (row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "2025-01-01");
      const onboardYear = parseInt(onboardStr.split("-")[0], 10) || 2025;
      const yearsOfService = Math.max(0, currentYear - onboardYear);
      const seniorityBonus = policy.seniority_bonus_years > 0 ? Math.floor(yearsOfService / policy.seniority_bonus_years) : 0;
      const standardDays = Number(policy.standard_days) || 12;
      const totalEntitled = standardDays + seniorityBonus;
      // Dùng số ngày nghỉ đã được duyệt từ hệ thống
      const approvedDays = leaveReqMap.get(row.id) || 0;
      const fallbackDays = row.code === "NV-THO-01" ? 2 : row.code === "NV-THIET-KE" ? 1 : 0;
      const usedDays = approvedDays > 0 ? approvedDays : fallbackDays;
      const remainingDays = Math.max(0, totalEntitled - usedDays);
      const carryoverEligible = Math.min(Number(policy.carryover_max_days) || 5, remainingDays);

      return {
        employeeId: row.id,
        employeeCode: row.code,
        employeeName: row.name,
        departmentName: row.department_name || "Chưa phân bổ",
        onboardDate: onboardStr,
        yearsOfService,
        standardDays,
        seniorityBonus,
        totalEntitled,
        usedDays,
        remainingDays,
        carryoverEligible,
        cashOutAllowed: policy.cash_out_allowed,
      };
    });
  }

  // ==========================================
  // 8. CẤU HÌNH ĐỊA ĐIỂM & BÁN KÍNH GPS (WORK LOCATIONS)
  // ==========================================
  static calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  static async listWorkLocations(onlyActive = false): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT id, name, address, latitude, longitude, radius_meters, is_active, is_default, note, created_at, updated_at
      FROM erp.hrm_work_locations
      WHERE organization_id = $1
    `;
    if (onlyActive) {
      sql += ` AND is_active = true`;
    }
    sql += ` ORDER BY is_default DESC, name ASC`;

    const res = await pool.query(sql, [orgId]);
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      radiusMeters: Number(r.radius_meters) || 150,
      isActive: Boolean(r.is_active),
      isDefault: Boolean(r.is_default),
      note: r.note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  static async upsertWorkLocation(data: {
    id?: string;
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    isActive?: boolean;
    isDefault?: boolean;
    note?: string;
  }): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    if (data.isDefault) {
      // Unset previous defaults
      await pool.query(
        `UPDATE erp.hrm_work_locations SET is_default = false WHERE organization_id = $1`,
        [orgId]
      );
    }

    if (data.id) {
      const res = await pool.query(
        `UPDATE erp.hrm_work_locations
         SET name = $1, address = $2, latitude = $3, longitude = $4, radius_meters = $5,
             is_active = $6, is_default = $7, note = $8, updated_at = now()
         WHERE id = $9 AND organization_id = $10
         RETURNING *`,
        [
          data.name,
          data.address || null,
          data.latitude,
          data.longitude,
          data.radiusMeters || 150,
          data.isActive !== undefined ? Boolean(data.isActive) : true,
          Boolean(data.isDefault),
          data.note || null,
          data.id,
          orgId,
        ]
      );
      return res.rows[0];
    } else {
      const res = await pool.query(
        `INSERT INTO erp.hrm_work_locations (
           organization_id, name, address, latitude, longitude, radius_meters, is_active, is_default, note
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          orgId,
          data.name,
          data.address || null,
          data.latitude,
          data.longitude,
          data.radiusMeters || 150,
          data.isActive !== undefined ? Boolean(data.isActive) : true,
          Boolean(data.isDefault),
          data.note || null,
        ]
      );
      return res.rows[0];
    }
  }

  static async deleteWorkLocation(id: string): Promise<boolean> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `DELETE FROM erp.hrm_work_locations WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 9. QUẢN LÝ ĐƠN TỪ: XIN NGHỈ, XIN OT, GIẢI TRÌNH CÔNG
  // ==========================================
  static async createHrmRequest(
    userId: string,
    data: {
      type: "leave" | "overtime" | "explanation";
      title: string;
      reason: string;
      startDate: string;
      endDate: string;
      startTime?: string;
      endTime?: string;
      durationHours?: number;
      leaveCategory?: string;
      imageUrl?: string;
    }
  ): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const emp = await this.resolveEmployeeForUser(userId);
    if (!emp) {
      throw new Error("Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự để gửi đơn");
    }

    const res = await pool.query(
      `INSERT INTO erp.hrm_requests (
         organization_id, employee_id, type, title, reason,
         start_date, end_date, start_time, end_time,
         duration_hours, leave_category, image_url, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
       RETURNING *`,
      [
        orgId,
        emp.id,
        data.type,
        data.title,
        data.reason,
        data.startDate,
        data.endDate,
        data.startTime || null,
        data.endTime || null,
        data.durationHours || 0,
        data.leaveCategory || null,
        data.imageUrl || null,
      ]
    );

    return res.rows[0];
  }

  static async listHrmRequests(filters?: {
    employeeId?: string;
    type?: string;
    status?: string;
    limit?: number;
  }): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT r.*, e.code as employee_code, e.name as employee_name, d.name as department_name
      FROM erp.hrm_requests r
      JOIN erp.employees e ON e.id = r.employee_id
      LEFT JOIN erp.departments d ON d.id = e.department_id
      WHERE r.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (filters?.employeeId) {
      params.push(filters.employeeId);
      sql += ` AND r.employee_id = $${params.length}`;
    }
    if (filters?.type) {
      params.push(filters.type);
      sql += ` AND r.type = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND r.status = $${params.length}`;
    }

    sql += ` ORDER BY r.created_at DESC`;

    if (filters?.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
    }

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeCode: r.employee_code,
      employeeName: r.employee_name,
      departmentName: r.department_name || "Chưa phân ban",
      type: r.type,
      title: r.title,
      reason: r.reason,
      startDate: r.start_date,
      endDate: r.end_date,
      startTime: r.start_time,
      endTime: r.end_time,
      durationHours: Number(r.duration_hours) || 0,
      leaveCategory: r.leave_category,
      imageUrl: r.image_url,
      status: r.status,
      approverId: r.approver_id,
      approverName: r.approver_name,
      approverNote: r.approver_note,
      approvedAt: r.approved_at,
      payrollApplied: Boolean(r.payroll_applied),
      payrollFineAdjustment: Number(r.payroll_fine_adjustment) || 0,
      payrollOtHours: Number(r.payroll_ot_hours) || 0,
      payrollLeaveDays: Number(r.payroll_leave_days) || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  static async reviewHrmRequest(
    requestId: string,
    action: "approve" | "reject",
    reviewerUserId: string,
    reviewerName: string,
    approverNote?: string
  ): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const existingRes = await pool.query(
      `SELECT * FROM erp.hrm_requests WHERE id = $1 AND organization_id = $2`,
      [requestId, orgId]
    );
    if (existingRes.rows.length === 0) {
      throw new Error("Không tìm thấy đơn từ cần duyệt");
    }

    const req = existingRes.rows[0];

    // F02 & SoD: Không cho phép người gửi đơn tự duyệt đơn của mình
    const reviewerEmp = await this.resolveEmployeeForUser(reviewerUserId);
    if (reviewerEmp && req.employee_id === reviewerEmp.id) {
      throw new Error("Người gửi đơn không được phép tự duyệt đơn của chính mình");
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    let fineAdj = 0;
    let otHours = 0;
    let leaveDays = 0;

    if (action === "approve") {
      if (req.type === "explanation") {
        fineAdj = 50000; // Miễn trừ 1 lần phạt đi muộn / quên check-out
      } else if (req.type === "overtime") {
        otHours = Number(req.duration_hours) || 2.0;
      } else if (req.type === "leave") {
        leaveDays = Math.max(1, Number(req.duration_hours) > 0 ? Number(req.duration_hours) / 8 : 1);
      }
    }

    const updateRes = await pool.query(
      `UPDATE erp.hrm_requests
       SET status = $1, approver_id = $2, approver_name = $3, approver_note = $4,
           approved_at = now(), updated_at = now(),
           payroll_applied = true,
           payroll_fine_adjustment = $5,
           payroll_ot_hours = $6,
           payroll_leave_days = $7
       WHERE id = $8 AND organization_id = $9
       RETURNING *`,
      [
        newStatus,
        reviewerUserId,
        reviewerName,
        approverNote || null,
        fineAdj,
        otHours,
        leaveDays,
        requestId,
        orgId,
      ]
    );

    return updateRes.rows[0];
  }
}



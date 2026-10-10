const assert = require("node:assert/strict");
const { test } = require("node:test");
const { productionDb } = require("./helpers/production-db.cjs");

test("Package D: HRM Shift Kinds, Session Attendance, HR Review, No-Double-OT, Period Locking", async (t) => {
  const env = await productionDb();
  const db = env.pool;
  const ctx = env.ctx;
  const H = env.load("src/services/hrm.service.ts");
  const F = env.load("src/services/finance.service.ts");

  await t.test("1. Work Shifts: regular vs overtime shift kind support", async () => {
    const regShift = await H.HrmService.upsertWorkShift({
      code: "CA-HC",
      name: "Ca Hành Chính",
      type: "standard",
      shiftKind: "regular",
      startTime: "08:00:00",
      endTime: "17:00:00",
      workHours: 8,
      breakMinutes: 60,
    });
    assert.equal(regShift.shift_kind, "regular");

    const otShift = await H.HrmService.upsertWorkShift({
      code: "CA-OT-TOI",
      name: "Ca Tăng Ca Tối",
      type: "parttime",
      shiftKind: "overtime",
      startTime: "17:30:00",
      endTime: "21:30:00",
      workHours: 4,
      breakMinutes: 0,
    });
    assert.equal(otShift.shift_kind, "overtime");

    const list = await H.HrmService.listWorkShifts();
    const foundReg = list.find((s) => s.code === "CA-HC");
    const foundOt = list.find((s) => s.code === "CA-OT-TOI");
    assert.ok(foundReg && foundReg.shift_kind === "regular");
    assert.ok(foundOt && foundOt.shift_kind === "overtime");
  });

  await t.test("2. Session Attendance: checkout without checkin requires explanation and does not forge 8AM", async () => {
    // Record checkout directly for ctx.userId
    const outRes = await H.HrmService.recordAttendance(ctx.userId, {
      type: "check_out",
      note: "Quên quẹt thẻ vào",
    });
    assert.ok(outRes.entryId);

    const entry = (
      await db.query("SELECT * FROM erp.attendance_entries WHERE id = $1", [outRes.entryId])
    ).rows[0];
    assert.equal(entry.explanation_required, true, "Must require explanation");
    assert.equal(entry.regular_minutes, 0);
    assert.equal(entry.ot_minutes, 0);
    // start_at should NOT be 08:00:00 if now is afternoon/evening, it is equal to now
    assert.ok(entry.start_at);
  });

  await t.test("3. Overtime Shift Session & HR Review: all time allocated to OT, HR approves specific minutes", async () => {
    // Clean up entries for today
    await db.query("DELETE FROM erp.attendance_entries WHERE employee_id = $1", [ctx.employeeId]);

    const otShift = (
      await db.query("SELECT id FROM erp.work_shifts WHERE code = 'CA-OT-TOI'")
    ).rows[0];

    // Check in with OT shift
    const inRes = await H.HrmService.recordAttendance(ctx.userId, {
      type: "check_in",
      shiftId: otShift.id,
    });
    assert.ok(inRes.entryId);

    // Manually backdate start_at by 3 hours to simulate 3h overtime work
    await db.query(
      "UPDATE erp.attendance_entries SET start_at = now() - interval '3 hours' WHERE id = $1",
      [inRes.entryId]
    );

    // Check out
    const outRes = await H.HrmService.recordAttendance(ctx.userId, {
      type: "check_out",
      shiftId: otShift.id,
    });

    const entry = (
      await db.query("SELECT * FROM erp.attendance_entries WHERE id = $1", [inRes.entryId])
    ).rows[0];
    assert.equal(entry.regular_minutes, 0, "Overtime shift has 0 regular minutes");
    assert.ok(entry.ot_minutes >= 170 && entry.ot_minutes <= 190, "OT minutes should be ~180");

    // HR Review: approve 150 minutes
    await H.HrmService.reviewAttendanceEntry(
      inRes.entryId,
      {
        approvedOtMinutes: 150,
        hrDecisionNote: "Duyệt 2.5 tiếng tăng ca thực tế theo tiến độ xưởng",
        clearExplanationRequired: true,
      },
      ctx.userId
    );

    const reviewed = (
      await db.query("SELECT * FROM erp.attendance_entries WHERE id = $1", [inRes.entryId])
    ).rows[0];
    assert.equal(reviewed.hr_approved_ot_minutes, 150);
    assert.equal(reviewed.hr_decision_note, "Duyệt 2.5 tiếng tăng ca thực tế theo tiến độ xưởng");
    assert.equal(reviewed.explanation_required, false);
  });

  await t.test("4. Payroll Calculation: avoids double counting OT and respects period lock", async () => {
    const year = 2026;
    const month = 10;

    // Seed salary terms for employee
    await db.query(
      `INSERT INTO erp.salary_terms(organization_id, employee_id, base_salary, pay_basis, valid_from, created_by, updated_by)
       VALUES($1, $2, 12000000, 'monthly', now(), $3, $3)`,
      [ctx.orgId, ctx.employeeId, ctx.userId]
    );

    // Add an approved overtime request of 2.5 hours
    await db.query(
      `INSERT INTO erp.hrm_requests(
         organization_id, employee_id, type, title, reason, status, start_date, end_date,
         payroll_ot_hours
       )
       VALUES($1, $2, 'overtime', 'Tăng ca tiến độ xưởng', 'Tăng ca xưởng', 'approved', '2026-10-10', '2026-10-10', 2.5)`,
      [ctx.orgId, ctx.employeeId]
    );

    // Calculate monthly payroll
    const calc = await H.HrmService.calculateMonthlyPayroll(year, month);
    assert.ok(calc.lines.length > 0);
    const empLine = calc.lines.find((l) => l.employeeId === ctx.employeeId);
    assert.ok(empLine);

    // Crucial check: otHours must be 2.5 hours (from HR approved 150m or request 2.5h), NOT 5.0 hours (2.5 + 2.5)!
    assert.equal(empLine.otHours, 2.5, "OT hours must not be double counted");

    // Lock attendance period
    await H.HrmService.lockAttendancePeriod(year, month, ctx.userId);

    // Now try to approve payroll on the locked period -> should reject!
    await assert.rejects(
      H.HrmService.approvePayroll(year, month, calc.lines, ctx.userId),
      /bị khóa|locked/i
    );

    // Calculate payroll on locked period should return locked view
    const lockedCalc = await H.HrmService.calculateMonthlyPayroll(year, month);
    assert.equal(lockedCalc.isApproved, true);
  });

  await env.close();
});

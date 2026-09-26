import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FinanceService } from "@/services/finance.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const salaryCap = capabilities["salary.read"] || capabilities["payroll.read"];
    if (!salaryCap?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem bảng lương" }, { status: 403 });
    }

    let filterEmployeeId: string | undefined = undefined;
    // HR-04: Nếu scope là OWN, chỉ được xem bảng lương của chính mình
    if (salaryCap.scope === "OWN") {
      const pool = (await import("@/services/authorization.service")).getDbPool();
      const empRes = await pool.query(
        `SELECT e.id FROM erp.employees e
         JOIN erp.memberships m ON m.id = e.membership_id
         WHERE m.user_id = $1 LIMIT 1`,
        [session.user.id]
      );
      if (empRes.rows.length === 0) {
        return NextResponse.json({ salaries: [] });
      }
      filterEmployeeId = empRes.rows[0].id;
    }

    const salaries = await FinanceService.listSalaryTerms(filterEmployeeId);
    return NextResponse.json({ salaries });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải bảng lương", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const hasApproveCap = capabilities["payroll.approve"]?.isEnabled || capabilities["payroll.update"]?.isEnabled;
    if (!hasApproveCap) {
      return NextResponse.json({ error: "Không có quyền phê duyệt bảng lương (cần quyền payroll.approve)" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: "Danh sách nhân sự và số liệu lương không hợp lệ" }, { status: 400 });
    }

    const result = await FinanceService.approvePayrollRun(body, session.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi phê duyệt bảng lương", details: err.message },
      { status: 500 }
    );
  }
}

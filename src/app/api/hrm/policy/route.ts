import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "Thiếu employeeId" }, { status: 400 });
    }

    const { capabilities, roles, employeeId: userEmpId } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    const isOwn = userEmpId && userEmpId === employeeId;

    if (!isSuperAdmin && !isOwn && !capabilities["salary.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chính sách lương của nhân sự" }, { status: 403 });
    }

    const policy = await HrmService.getEmployeeSalaryPolicy(employeeId);
    return NextResponse.json({ policy });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải chính sách lương", details: err.message },
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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["salary.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền chỉnh sửa chính sách lương" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.employeeId || !body.policy) {
      return NextResponse.json({ error: "Thiếu employeeId hoặc dữ liệu policy" }, { status: 400 });
    }

    const updated = await HrmService.upsertEmployeeSalaryPolicy(
      body.employeeId,
      body.policy,
      session.user.id
    );

    return NextResponse.json({ success: true, salaryTerm: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lưu chính sách lương", details: err.message },
      { status: 500 }
    );
  }
}

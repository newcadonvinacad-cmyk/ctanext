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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["payroll.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem tính toán bảng lương" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year")) || now.getFullYear();
    const month = Number(searchParams.get("month")) || (now.getMonth() + 1);

    const result = await HrmService.calculateMonthlyPayroll(year, month);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tính toán bảng lương tự động", details: err.message },
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
    if (!isSuperAdmin && !capabilities["payroll.generate"]?.isEnabled && !capabilities["payroll.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo hoặc tính toán bảng lương" }, { status: 403 });
    }

    const body = await req.json();
    const now = new Date();
    const year = Number(body.year) || now.getFullYear();
    const month = Number(body.month) || (now.getMonth() + 1);

    const result = await HrmService.calculateMonthlyPayroll(year, month);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tính toán bảng lương tự động", details: err.message },
      { status: 500 }
    );
  }
}

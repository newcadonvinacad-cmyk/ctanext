import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";

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

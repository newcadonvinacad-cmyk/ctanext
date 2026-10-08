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

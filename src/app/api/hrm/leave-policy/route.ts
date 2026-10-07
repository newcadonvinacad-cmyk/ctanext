import { NextResponse } from "next/server";
import { HrmService } from "@/services/hrm.service";

export async function GET() {
  try {
    const policy = await HrmService.getLeavePolicy();
    return NextResponse.json({ success: true, data: policy });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải chính sách nghỉ phép" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await HrmService.updateLeavePolicy(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi cập nhật chính sách nghỉ phép" },
      { status: 500 }
    );
  }
}

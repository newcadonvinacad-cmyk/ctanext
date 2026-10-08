import { NextResponse } from "next/server";
import { HrmService } from "@/services/hrm.service";

export async function GET() {
  try {
    const shifts = await HrmService.listWorkShifts();
    return NextResponse.json({ success: true, data: shifts });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải ca làm việc" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.code || !body.name || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc (mã, tên, giờ bắt đầu, giờ kết thúc)" },
        { status: 400 }
      );
    }
    const result = await HrmService.upsertWorkShift(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi lưu ca làm việc" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID ca làm việc" }, { status: 400 });
    }
    const success = await HrmService.deleteWorkShift(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi xóa ca làm việc" },
      { status: 500 }
    );
  }
}

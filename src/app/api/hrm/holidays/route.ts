import { NextResponse } from "next/server";
import { HrmService } from "@/services/hrm.service";

export async function GET() {
  try {
    const holidays = await HrmService.listHolidayConfigs();
    return NextResponse.json({ success: true, data: holidays });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải danh sách ngày lễ" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.code || !body.name || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc (mã, tên ngày lễ, ngày bắt đầu, ngày kết thúc)" },
        { status: 400 }
      );
    }
    const result = await HrmService.upsertHolidayConfig(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi lưu cấu hình ngày lễ" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID ngày lễ" }, { status: 400 });
    }
    const success = await HrmService.deleteHolidayConfig(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi xóa ngày lễ" },
      { status: 500 }
    );
  }
}

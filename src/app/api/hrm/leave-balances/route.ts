import { NextResponse } from "next/server";
import { HrmService } from "@/services/hrm.service";

export async function GET() {
  try {
    const balances = await HrmService.listEmployeeLeaveBalances();
    return NextResponse.json({ success: true, data: balances });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải số dư phép nhân viên" },
      { status: 500 }
    );
  }
}

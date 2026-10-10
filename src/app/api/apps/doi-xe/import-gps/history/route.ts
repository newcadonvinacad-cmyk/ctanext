import { NextResponse } from "next/server";
import { GpsImportService } from "@/services/gps-import.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const batches = GpsImportService.getBatches();
    const auditLogs = GpsImportService.getAuditLogs();
    return NextResponse.json({
      success: true,
      batches,
      auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải lịch sử đợt nhập", details: err.message },
      { status: 500 }
    );
  }
}

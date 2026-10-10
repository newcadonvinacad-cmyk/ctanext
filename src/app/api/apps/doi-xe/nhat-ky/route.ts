import { NextResponse } from "next/server";
import { GpsImportService } from "@/services/gps-import.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId") || undefined;
    const searchDate = searchParams.get("searchDate") || undefined;
    const dateBasis = (searchParams.get("dateBasis") as "calendar" | "work_date") || "work_date";

    const logs = await GpsImportService.getDailyLogs({
      vehicleId,
      searchDate,
      dateBasis,
    });

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách nhật ký", details: err.message },
      { status: 500 }
    );
  }
}

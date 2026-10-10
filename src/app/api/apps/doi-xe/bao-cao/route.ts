import { NextResponse } from "next/server";
import { GpsImportService } from "@/services/gps-import.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vehiclePlate = searchParams.get("vehiclePlate") || "51D-982.46";
    const month = searchParams.get("month") || "2026-08";

    const stats = GpsImportService.getVehicleMonthStats(vehiclePlate, month);

    return NextResponse.json({
      success: true,
      vehiclePlate,
      month,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải số liệu báo cáo", details: err.message },
      { status: 500 }
    );
  }
}

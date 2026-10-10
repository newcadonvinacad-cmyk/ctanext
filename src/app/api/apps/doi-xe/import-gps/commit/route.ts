import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { GpsImportService } from "@/services/gps-import.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let userId: string | undefined;
    let orgId: string | undefined;
    try {
      const reqHeaders = await headers();
      const session = await auth.api.getSession({ headers: reqHeaders });
      if (session?.user) {
        userId = session.user.id;
        orgId = (session.user as any).organizationId;
      }
    } catch {
      // In dev or non-session context
    }

    const body = await req.json();
    const { preview } = body;

    if (!preview || !preview.batchId) {
      return NextResponse.json({ error: "Thiếu dữ liệu xem trước hợp lệ" }, { status: 400 });
    }

    const batch = await GpsImportService.commitImport(preview, userId, orgId);

    return NextResponse.json({
      success: true,
      batch,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lưu dữ liệu GPS", details: err.message },
      { status: 500 }
    );
  }
}

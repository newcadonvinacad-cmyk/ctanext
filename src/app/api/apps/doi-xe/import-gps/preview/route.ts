import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { GpsImportService } from "@/services/gps-import.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let orgId: string | undefined;
    try {
      const reqHeaders = await headers();
      const session = await auth.api.getSession({ headers: reqHeaders });
      if (session?.user) {
        orgId = (session.user as any).organizationId;
      }
    } catch {
      // In dev or non-session context, continue with default org
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn file Excel GPS để tải lên" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await GpsImportService.previewFile(buffer, file.name, orgId);

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi đọc file GPS", details: err.message },
      { status: 500 }
    );
  }
}

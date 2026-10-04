import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (
      !capabilities["item.read"]?.isEnabled &&
      !capabilities["project.read"]?.isEnabled &&
      !capabilities["stock_document.read"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền xem thông tin vật tư công trình" }, { status: 403 });
    }

    const materialsData = await ProjectService.getProjectMaterials(id);
    return NextResponse.json(materialsData);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải thông tin bóc tách vật tư", details: err.message },
      { status: 500 }
    );
  }
}

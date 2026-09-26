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
    if (!capabilities["acceptance.read"]?.isEnabled && !capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem biên bản nghiệm thu" }, { status: 403 });
    }

    const acceptances = await ProjectService.listAcceptances(id);
    return NextResponse.json({ acceptances });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải biên bản nghiệm thu", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(
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
    if (!capabilities["acceptance.create"]?.isEnabled && !capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo biên bản nghiệm thu" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.customerSignerName) {
      return NextResponse.json({ error: "Vui lòng nhập họ tên người đại diện khách hàng ký" }, { status: 400 });
    }

    const acceptanceId = await ProjectService.createAcceptance(
      {
        projectId: id,
        customerSignerName: body.customerSignerName,
        status: body.status || "approved",
      },
      session.user.id
    );

    return NextResponse.json({ success: true, acceptanceId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lưu biên bản nghiệm thu", details: err.message },
      { status: 500 }
    );
  }
}

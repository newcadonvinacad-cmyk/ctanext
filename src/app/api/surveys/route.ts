import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase2Service } from "@/services/signage-phase2.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["customer.read"]?.isEnabled && !capabilities["project.read"]?.isEnabled && !capabilities["quotation.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem khảo sát" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const search = searchParams.get("search") || undefined;

    const surveys = await SignagePhase2Service.listSiteSurveys({
      status,
      customerId,
      projectId,
      search,
    });

    return NextResponse.json({ surveys });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tải danh sách khảo sát", details: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["customer.update"]?.isEnabled && !capabilities["customer.create"]?.isEnabled && !capabilities["project.update"]?.isEnabled && !capabilities["quotation.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền lập phiếu khảo sát" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.title || !body.address) {
      return NextResponse.json({ error: "Tiêu đề và địa chỉ khảo sát là bắt buộc!" }, { status: 400 });
    }

    const survey = await SignagePhase2Service.createSiteSurvey(body, session.user.id);
    return NextResponse.json({ survey }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tạo phiếu khảo sát", details: err.message }, { status: 500 });
  }
}

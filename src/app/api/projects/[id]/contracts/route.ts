import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CrmService } from "@/services/crm.service";
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
    if (!capabilities["project.read"]?.isEnabled && !capabilities["contract.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem hợp đồng dự án" }, { status: 403 });
    }

    const contracts = await CrmService.listProjectContracts(id);
    return NextResponse.json({ contracts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tải hợp đồng dự án" }, { status: 500 });
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
    if (!capabilities["contract.create"]?.isEnabled && !capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền lập hợp đồng dự án" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.contractValue || body.contractValue <= 0) {
      return NextResponse.json({ error: "Vui lòng nhập giá trị hợp đồng hợp lệ" }, { status: 400 });
    }

    const contractId = await CrmService.createProjectContract(
      id,
      {
        code: body.code,
        contractValue: Number(body.contractValue),
        customerId: body.customerId,
        signedOn: body.signedOn,
        quotationRevisionId: body.quotationRevisionId,
        documentFileUrl: body.documentFileUrl,
        terms: body.terms,
        notes: body.notes,
        status: body.status,
        milestones: body.milestones,
      },
      session.user.id
    );

    return NextResponse.json({ success: true, contractId, message: "Tạo hợp đồng dự án thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tạo hợp đồng dự án" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["salary.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem mẫu chính sách lương" }, { status: 403 });
    }

    const templates = await HrmService.listPolicyTemplates();
    return NextResponse.json({ templates });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải mẫu chính sách lương", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["salary.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền cập nhật mẫu chính sách lương" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.code || !body.name || !body.policy) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc (code, name, policy)" }, { status: 400 });
    }

    const saved = await HrmService.savePolicyTemplate(body);
    return NextResponse.json({ success: true, template: saved });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lưu mẫu chính sách", details: err.message },
      { status: 500 }
    );
  }
}

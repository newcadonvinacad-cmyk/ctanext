import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
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
    if (!capabilities["project_template.read"]?.isEnabled && !capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem mẫu dự án" }, { status: 403 });
    }

    const templates = await ProjectService.listTemplates();
    return NextResponse.json({ templates });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách mẫu dự án", details: err.message },
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

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["project_template.create"]?.isEnabled && !capabilities["project.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo mẫu dự án" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.code || !body.name || !body.definition?.stages) {
      return NextResponse.json(
        { error: "Vui lòng nhập đủ mã mẫu, tên mẫu và cấu trúc giai đoạn" },
        { status: 400 }
      );
    }

    const templateId = await ProjectService.createTemplate(
      {
        code: body.code,
        name: body.name,
        definition: body.definition,
      },
      session.user.id
    );

    return NextResponse.json({ success: true, templateId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo mẫu dự án", details: err.message },
      { status: 500 }
    );
  }
}

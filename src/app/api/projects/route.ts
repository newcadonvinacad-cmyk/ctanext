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
    if (!capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem dự án" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const customerId = searchParams.get("customerId") || undefined;

    const projects = await ProjectService.listProjects({ status, search, customerId });
    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách dự án", details: err.message },
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
    if (!capabilities["project.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền khởi tạo dự án" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || !body.address || !body.customerId) {
      return NextResponse.json(
        { error: "Vui lòng điền đủ Tên dự án, Địa chỉ và Khách hàng" },
        { status: 400 }
      );
    }

    const projectId = await ProjectService.createProject(body, session.user.id);
    return NextResponse.json({ success: true, projectId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo dự án mới", details: err.message },
      { status: 500 }
    );
  }
}

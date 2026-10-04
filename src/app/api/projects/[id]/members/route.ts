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
    if (!capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem thông tin dự án" }, { status: 403 });
    }

    const members = await ProjectService.listProjectMembers(id);
    return NextResponse.json({ members });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải thành viên dự án", details: err.message },
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
    if (
      !capabilities["project.assign"]?.isEnabled &&
      !capabilities["project.update"]?.isEnabled
    ) {
      return NextResponse.json(
        { error: "Không có quyền thêm thành viên vào dự án (cần quyền project.assign)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.employeeId) {
      return NextResponse.json({ error: "Vui lòng chọn nhân sự" }, { status: 400 });
    }

    const memberId = await ProjectService.addProjectMember(
      id,
      { employeeId: body.employeeId, duty: body.duty || "Thành viên thi công" },
      session.user.id
    );

    return NextResponse.json({ success: true, memberId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi thêm thành viên dự án", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      !capabilities["project.assign"]?.isEnabled &&
      !capabilities["project.update"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền xóa thành viên dự án" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "Vui lòng chỉ định memberId" }, { status: 400 });
    }

    await ProjectService.removeProjectMember(memberId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi xóa thành viên dự án", details: err.message },
      { status: 500 }
    );
  }
}

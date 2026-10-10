import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";
import { getDbPool } from "@/lib/db";

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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles?.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
    );

    const pool = getDbPool();
    const pmCheck = await pool.query(
      `SELECT 1 FROM erp.projects p
       LEFT JOIN erp.memberships m ON m.user_id = $1
       WHERE p.id = $2
         AND (
           p.created_by = $1
           OR p.manager_membership_id = m.id
           OR EXISTS (
             SELECT 1 FROM erp.project_members pm
             WHERE pm.project_id = p.id AND (pm.membership_id = m.id OR pm.created_by = $1)
               AND (pm.duty ILIKE '%pm%' OR pm.duty ILIKE '%chỉ huy%' OR pm.duty ILIKE '%quản lý%' OR pm.duty ILIKE '%đội trưởng%' OR pm.duty ILIKE '%tổ trưởng%')
           )
         )
       LIMIT 1`,
      [session.user.id, id]
    );
    const isProjectPM = pmCheck.rows.length > 0;

    if (
      !isSuperAdmin &&
      !isProjectPM &&
      !capabilities["project.assign"]?.isEnabled &&
      !capabilities["project.update"]?.isEnabled
    ) {
      return NextResponse.json(
        { error: "Không có quyền thêm thành viên vào dự án (cần quyền project.assign)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.employeeId && !body.membershipId) {
      return NextResponse.json({ error: "Vui lòng chọn nhân sự" }, { status: 400 });
    }

    const memberId = await ProjectService.addProjectMember(
      id,
      {
        employeeId: body.employeeId,
        membershipId: body.membershipId,
        duty: body.duty || body.role || "Thành viên thi công",
      },
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

export async function PATCH(
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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles?.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
    );

    const pool = getDbPool();
    const pmCheck = await pool.query(
      `SELECT 1 FROM erp.projects p
       LEFT JOIN erp.memberships m ON m.user_id = $1
       WHERE p.id = $2
         AND (
           p.created_by = $1
           OR p.manager_membership_id = m.id
           OR EXISTS (
             SELECT 1 FROM erp.project_members pm
             WHERE pm.project_id = p.id AND (pm.membership_id = m.id OR pm.created_by = $1)
               AND (pm.duty ILIKE '%pm%' OR pm.duty ILIKE '%chỉ huy%' OR pm.duty ILIKE '%quản lý%' OR pm.duty ILIKE '%đội trưởng%' OR pm.duty ILIKE '%tổ trưởng%')
           )
         )
       LIMIT 1`,
      [session.user.id, id]
    );
    const isProjectPM = pmCheck.rows.length > 0;

    if (
      !isSuperAdmin &&
      !isProjectPM &&
      !capabilities["project.assign"]?.isEnabled &&
      !capabilities["project.update"]?.isEnabled
    ) {
      return NextResponse.json(
        { error: "Không có quyền thay đổi vai trò thành viên dự án" },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.memberId || !body.duty) {
      return NextResponse.json({ error: "Thiếu thông tin memberId hoặc vai trò" }, { status: 400 });
    }

    await ProjectService.updateProjectMemberDuty(id, body.memberId, body.duty, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật vai trò thành viên", details: err.message },
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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles?.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
    );

    const pool = getDbPool();
    const pmCheck = await pool.query(
      `SELECT 1 FROM erp.projects p
       LEFT JOIN erp.memberships m ON m.user_id = $1
       WHERE p.id = $2
         AND (
           p.created_by = $1
           OR p.manager_membership_id = m.id
           OR EXISTS (
             SELECT 1 FROM erp.project_members pm
             WHERE pm.project_id = p.id AND (pm.membership_id = m.id OR pm.created_by = $1)
               AND (pm.duty ILIKE '%pm%' OR pm.duty ILIKE '%chỉ huy%' OR pm.duty ILIKE '%quản lý%' OR pm.duty ILIKE '%đội trưởng%' OR pm.duty ILIKE '%tổ trưởng%')
           )
         )
       LIMIT 1`,
      [session.user.id, id]
    );
    const isProjectPM = pmCheck.rows.length > 0;

    if (
      !isSuperAdmin &&
      !isProjectPM &&
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

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthorizationService, getDbPool } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["role.update"]?.isEnabled && !capabilities["company_setting.update"]?.isEnabled) {
      return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền thêm quyền hạn mới" }, { status: 403 });
    }

    const body = await req.json();
    const { key, resource, action, description, isSensitive, supportedScopes, supportsAmountLimit } = body;

    if (!key || !resource || !action || !description) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin mã quyền, phân hệ, hành động và mô tả" }, { status: 400 });
    }

    const pool = getDbPool();
    const res = await pool.query(
      `INSERT INTO iam.permissions(key, resource, action, description, is_sensitive, supported_scopes, supports_amount_limit, is_active)
       VALUES($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (key) DO UPDATE SET 
         description = EXCLUDED.description,
         is_active = true,
         updated_at = now()
       RETURNING *`,
      [
        key.trim().toLowerCase(),
        resource.trim().toLowerCase(),
        action.trim().toLowerCase(),
        description.trim(),
        Boolean(isSensitive),
        supportedScopes || ["ORG", "ASSIGNED", "OWN"],
        Boolean(supportsAmountLimit),
      ]
    );

    return NextResponse.json({ permission: res.rows[0] });
  } catch (err: any) {
    console.error("Failed to create permission:", err);
    return NextResponse.json({ error: err.message || "Lỗi tạo quyền hạn mới" }, { status: 500 });
  }
}

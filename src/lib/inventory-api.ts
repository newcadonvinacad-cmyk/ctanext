import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { AuthorizationService, getDbPool } from "@/services/authorization.service";
import type { PermissionKey } from "@/types/iam";
import { InventoryApiError } from "./inventory-error";
export { InventoryApiError } from "./inventory-error";

// These catalog endpoints use the existing organization configuration permission for warehouse CRUD.
export async function inventoryActor(permissions: PermissionKey[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new InventoryApiError("Chưa xác thực", 401);
  const member = await getDbPool().query(
    `SELECT m.organization_id FROM erp.memberships m JOIN erp.organizations o ON o.id=m.organization_id
     WHERE m.user_id=$1 AND m.status='active' AND o.code='SIGNAGE'`, [session.user.id]);
  if (!member.rows[0]) throw new InventoryApiError("Tài khoản không có tư cách thành viên đang hoạt động", 403);
  const orgId = member.rows[0].organization_id as string;
  const { capabilities, membershipStatus } = await AuthorizationService.getUserCapabilities(session.user.id, orgId);
  if (membershipStatus !== "active" || !permissions.some(p => capabilities[p]?.isEnabled)) {
    throw new InventoryApiError("Bạn không có quyền thực hiện thao tác này", 403);
  }
  return { userId: session.user.id, orgId, capabilities };
}

export function inventoryError(error: unknown) {
  if (error instanceof InventoryApiError || typeof (error as any)?.status === "number") {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as any).status || 400 });
  }
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
  const code = (error as { code?: string })?.code;
  if (code === "23505") return NextResponse.json({ error: "Mã đã tồn tại. Vui lòng chọn mã khác." }, { status: 409 });
  if (code === "23503") return NextResponse.json({ error: "Dữ liệu đang được sử dụng hoặc tham chiếu không hợp lệ. Không thể xóa; hãy ngừng sử dụng nếu cần." }, { status: 409 });
  if (code === "22P02" || error instanceof SyntaxError) return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  console.error("Inventory API failed:", error);
  const message = error instanceof Error ? error.message : "Không thể xử lý dữ liệu. Vui lòng thử lại.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function allowedWarehouseIds(userId: string, orgId: string): Promise<string[]> {
  const result = await getDbPool().query(
    `SELECT DISTINCT w.id FROM erp.warehouses w
     JOIN erp.memberships m ON m.organization_id=w.organization_id AND m.user_id=$1 AND m.status='active'
     JOIN iam.user_roles ur ON ur.membership_id=m.id AND ur.organization_id=m.organization_id
       AND ur.valid_from<=now() AND (ur.valid_to IS NULL OR ur.valid_to>now())
     JOIN iam.roles r ON r.id=ur.role_id AND r.is_active
     JOIN iam.role_grants g ON g.role_id=r.id AND g.organization_id=w.organization_id AND g.is_enabled
     JOIN iam.permissions p ON p.id=g.permission_id
     WHERE w.organization_id=$2 AND p.key IN ('inventory.read','stock_document.read') AND (
       g.scope_kind='ORG' OR
       (g.scope_kind='ASSIGNED' AND EXISTS (SELECT 1 FROM erp.warehouse_members wm
         WHERE wm.warehouse_id=w.id AND wm.membership_id=m.id AND wm.organization_id=w.organization_id
         AND wm.valid_from<=now() AND (wm.valid_to IS NULL OR wm.valid_to>now()))) OR
       (g.scope_kind='SELECTED' AND EXISTS (SELECT 1 FROM iam.grant_warehouses gw
         WHERE gw.grant_id=g.id AND gw.warehouse_id=w.id AND gw.organization_id=w.organization_id)))`,
    [userId, orgId]);
  return result.rows.map(r => r.id);
}

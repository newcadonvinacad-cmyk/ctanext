import { getCachedOrgId, getDbPool } from '@/lib/db';
import { AuthorizationService } from '@/services/authorization.service';
import type { PermissionKey, UserCapability } from '@/types/iam';
import type { PoolClient } from 'pg';
import crypto from 'crypto';

export class WorkflowError extends Error { constructor(message: string, public status = 400) { super(message); } }
export interface WorkflowContext { orgId: string; userId: string; membershipId: string; employeeId?: string | null; capabilities: Record<PermissionKey, UserCapability> }
export async function workflowContext(userId: string): Promise<WorkflowContext> {
  const orgId = await getCachedOrgId();
  const auth = await AuthorizationService.getUserCapabilities(userId, orgId);
  const m = await getDbPool().query("SELECT id FROM erp.memberships WHERE organization_id=$1 AND user_id=$2 AND status='active'", [orgId, userId]);
  if (!m.rows[0] || auth.membershipStatus !== 'active') throw new WorkflowError('Tài khoản không có membership hoạt động', 403);
  return { orgId, userId, membershipId: m.rows[0].id, employeeId: auth.employeeId, capabilities: auth.capabilities };
}
export function requireCapability(ctx: WorkflowContext, key: PermissionKey) {
  if (!ctx.capabilities[key]?.isEnabled) throw new WorkflowError(`Không có quyền ${key}`, 403);
  return ctx.capabilities[key];
}
export async function assertProject(db: Pick<PoolClient, 'query'>, ctx: WorkflowContext, projectId: string, key: PermissionKey) {
  const cap = requireCapability(ctx, key);
  const r = await db.query(`SELECT p.*, EXISTS(SELECT 1 FROM erp.project_members pm WHERE pm.organization_id=p.organization_id AND pm.project_id=p.id AND pm.membership_id=$3 AND pm.valid_from<=now() AND (pm.valid_to IS NULL OR pm.valid_to>now())) AS member,
    EXISTS(SELECT 1 FROM erp.tasks t JOIN erp.task_assignees a ON a.organization_id=t.organization_id AND a.task_id=t.id WHERE t.organization_id=p.organization_id AND t.project_id=p.id AND a.employee_id=$4 AND a.valid_from<=now() AND (a.valid_to IS NULL OR a.valid_to>now())) AS assigned
    FROM erp.projects p WHERE p.organization_id=$1 AND p.id=$2`, [ctx.orgId, projectId, ctx.membershipId, ctx.employeeId || null]);
  const p = r.rows[0];
  if (!p) throw new WorkflowError('Không tìm thấy dự án', 404);
  let allowed=cap.scope==='ORG';
  if(cap.scope==='OWN')allowed=p.created_by===ctx.userId || p.manager_membership_id===ctx.membershipId;
  if(['ASSIGNED','TEAM','DEPARTMENT'].includes(cap.scope))allowed=p.manager_membership_id===ctx.membershipId || p.member || p.assigned;
  if(cap.scope==='SELECTED')allowed=Boolean((await db.query(`SELECT gp.id FROM iam.grant_projects gp JOIN iam.role_grants g ON g.organization_id=gp.organization_id AND g.id=gp.grant_id JOIN iam.permissions perm ON perm.id=g.permission_id JOIN iam.user_roles ur ON ur.organization_id=g.organization_id AND ur.role_id=g.role_id JOIN iam.roles role ON role.organization_id=g.organization_id AND role.id=g.role_id AND role.is_active=true WHERE gp.organization_id=$1 AND gp.project_id=$2 AND ur.membership_id=$3 AND perm.is_active=true AND perm.key=$4 AND g.scope_kind='SELECTED' AND COALESCE((to_jsonb(g)->>'is_enabled')::boolean,true) AND ur.valid_from<=now() AND (ur.valid_to IS NULL OR ur.valid_to>now()) LIMIT 1`,[ctx.orgId,projectId,ctx.membershipId,key])).rows.length);
  if(!allowed)throw new WorkflowError('Dự án ngoài phạm vi được phân công',403);
  return p;
}
export async function assertWarehouse(db: Pick<PoolClient, 'query'>, ctx: WorkflowContext, warehouseId: string, key: PermissionKey) {
  const cap = requireCapability(ctx, key);
  const r = await db.query(`SELECT w.id, EXISTS(SELECT 1 FROM erp.warehouse_members wm WHERE wm.organization_id=w.organization_id AND wm.warehouse_id=w.id AND wm.membership_id=$3 AND wm.valid_from<=now() AND (wm.valid_to IS NULL OR wm.valid_to>now())) AS member FROM erp.warehouses w WHERE w.organization_id=$1 AND w.id=$2 AND w.is_active=true`, [ctx.orgId, warehouseId, ctx.membershipId]);
  if (!r.rows[0]) throw new WorkflowError('Kho không hợp lệ', 404);
  let allowed=cap.scope==='ORG' || (cap.scope!=='SELECTED' && r.rows[0].member);
  if(cap.scope==='SELECTED')allowed=Boolean((await db.query(`SELECT gw.id FROM iam.grant_warehouses gw JOIN iam.role_grants g ON g.organization_id=gw.organization_id AND g.id=gw.grant_id JOIN iam.permissions p ON p.id=g.permission_id JOIN iam.user_roles ur ON ur.organization_id=g.organization_id AND ur.role_id=g.role_id WHERE gw.organization_id=$1 AND gw.warehouse_id=$2 AND ur.membership_id=$3 AND p.is_active=true AND p.key=$4 AND g.scope_kind='SELECTED' AND COALESCE((to_jsonb(g)->>'is_enabled')::boolean,true) AND ur.valid_from<=now() AND (ur.valid_to IS NULL OR ur.valid_to>now()) LIMIT 1`,[ctx.orgId,warehouseId,ctx.membershipId,key])).rows.length);
  if(!allowed)throw new WorkflowError('Kho ngoài phạm vi được phân công',403);
}
export async function transaction<T>(ctx: WorkflowContext, fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await getDbPool().connect();
  try { await db.query('BEGIN'); await db.query("SELECT set_config('app.organization_id',$1,true)", [ctx.orgId]); const result = await fn(db); await db.query('COMMIT'); return result; }
  catch (e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); }
}
export async function once<T>(db: PoolClient, ctx: WorkflowContext, requestId: string, operation: string, payload: unknown, fn: () => Promise<T>): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId || '')) throw new WorkflowError('Thiếu mã yêu cầu UUID');
  const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  await db.query('INSERT INTO erp.production_requests(organization_id,request_id,operation,payload_hash,requested_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [ctx.orgId, requestId, operation, hash, ctx.userId]);
  const r = await db.query('SELECT * FROM erp.production_requests WHERE organization_id=$1 AND request_id=$2 FOR UPDATE', [ctx.orgId, requestId]);
  const record = r.rows[0];
  if (record.payload_hash !== hash || record.operation !== operation || record.requested_by !== ctx.userId) throw new WorkflowError('Mã yêu cầu đã dùng cho nội dung khác', 409);
  if (record.result !== null) return record.result;
  const result = await fn();
  await db.query('UPDATE erp.production_requests SET result=$1 WHERE organization_id=$2 AND request_id=$3', [JSON.stringify(result), ctx.orgId, requestId]);
  return result;
}
export async function productionReady() {
  const db=getDbPool();const r=await db.query("SELECT to_regclass('erp.application_migrations') IS NOT NULL AND to_regclass('erp.production_requests') IS NOT NULL AS ready");
  if(!r.rows[0]?.ready)return false;
  return Boolean((await db.query("SELECT EXISTS(SELECT 1 FROM erp.application_migrations WHERE code='019_production_workflow') AND (SELECT COUNT(*)=2 FROM iam.permissions WHERE key IN ('production_order.report','production_order.qc') AND is_active=true) AS ready")).rows[0]?.ready);
}

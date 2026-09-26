/**
 * ĐẶC TẢ KIỂU DỮ LIỆU PHÂN QUYỀN ĐỘNG SIGNAGE ERP
 * Dựa trên tài liệu docs/MA_TRAN_PHAN_QUYEN_DONG.md và docs/THIET_KE_DATABASE.md
 */

export type ScopeKind = "ORG" | "OWN" | "ASSIGNED" | "TEAM" | "DEPARTMENT" | "SELECTED";

export type ResourceName =
  | "customer"
  | "supplier"
  | "quotation"
  | "sales_order"
  | "purchase_order"
  | "item"
  | "inventory"
  | "stock_document"
  | "task"
  | "work_report"
  | "project"
  | "contract"
  | "production_order"
  | "project_template"
  | "report_template"
  | "acceptance"
  | "trip"
  | "field_event"
  | "payment"
  | "receivable"
  | "payable"
  | "expense_claim"
  | "project_finance"
  | "employee"
  | "attendance"
  | "salary"
  | "payroll"
  | "ai_run"
  | "role"
  | "membership"
  | "approval_policy"
  | "company_setting"
  | "period_lock"
  | "audit";

export type ActionName =
  | "read"
  | "create"
  | "update"
  | "archive"
  | "export"
  | "import"
  | "submit"
  | "approve"
  | "cancel"
  | "cost_read"
  | "count"
  | "adjust"
  | "post"
  | "reverse"
  | "assign"
  | "complete"
  | "close"
  | "release"
  | "publish"
  | "dispatch"
  | "correct"
  | "settle"
  | "private_read"
  | "private_update"
  | "generate"
  | "pay"
  | "ai_suggest"
  | "ocr"
  | "speech"
  | "ask"
  | "retry"
  | "manage"
  | "invite"
  | "suspend"
  | "assign_role"
  | "reopen";

export type PermissionKey = `${ResourceName}.${string}`;

export interface PermissionDefinition {
  id: string;
  key: PermissionKey;
  resource: ResourceName;
  action: ActionName;
  description: string;
  supportedScopes: ScopeKind[];
  supportsAmountLimit: boolean;
  isSensitive: boolean;
  isActive: boolean;
}

export interface Role {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  version: number;
}

export interface RoleGrant {
  id: string;
  organizationId: string;
  roleId: string;
  permissionKey: PermissionKey;
  scopeKind: ScopeKind;
  amountLimit?: number | null;
  currency?: string | null;
  isEnabled: boolean;
}

export interface UserRoleAssignment {
  id: string;
  organizationId: string;
  membershipId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  validFrom: string;
  validTo?: string | null;
}

export interface UserCapability {
  permission: PermissionKey;
  resource: ResourceName;
  action: ActionName;
  scope: ScopeKind;
  amountLimit?: number | null;
  currency?: string | null;
  isEnabled: boolean;
  fromRole: string;
}

export interface UserAuthSession {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  organizationId: string;
  membershipId: string;
  membershipStatus: "active" | "suspended" | "revoked";
  roles: {
    id: string;
    code: string;
    name: string;
  }[];
  capabilities: Record<PermissionKey, UserCapability>;
  defaultRoute: string;
}

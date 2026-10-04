/**
 * DỊCH VỤ PHÂN QUYỀN VÀ XÁC THỰC PHÍA SERVER (AUTHORIZATION SERVICE)
 * Triển khai thuật toán theo Mục 8 và Ranh giới triển khai Mục 10 trong docs/MA_TRAN_PHAN_QUYEN_DONG.md
 */

import { Pool } from "pg";
import {
  PermissionKey,
  ScopeKind,
  UserCapability,
  UserAuthSession,
} from "@/types/iam";
import {
  SEED_ROLE_GRANTS,
  SCREEN_REQUIREMENTS,
  ROLE_DEFAULT_ROUTES,
} from "@/constants/permissions";

let _pool: Pool | null = null;
export function getDbPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL || "",
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return _pool;
}

export class AuthorizationService {
  /**
   * Truy vấn quyền hiệu lực từ Database hoặc Fallback ma trận Seed
   */
  static async getUserCapabilities(
    userId: string,
    organizationId?: string
  ): Promise<{
    roles: { id: string; code: string; name: string }[];
    capabilities: Record<PermissionKey, UserCapability>;
    membershipStatus: "active" | "suspended" | "revoked";
    membershipId?: string;
    employeeId?: string | null;
  }> {
    try {
      // 1. Thử truy vấn cơ sở dữ liệu thực tế
      const client = await getDbPool().connect();
      try {
        // Truy vấn membership & employee
        const memRes = await client.query(
          `SELECT m.id, m.organization_id, m.status, e.id as employee_id 
           FROM erp.memberships m 
           LEFT JOIN erp.employees e ON e.membership_id = m.id AND e.is_active = true 
           WHERE m.user_id = $1 LIMIT 1`,
          [userId]
        );

        if (memRes.rows.length === 0) {
          // IAM-01: An toàn tuyệt đối: User không có membership thì từ chối, không cấp quyền
          return {
            roles: [],
            capabilities: {} as Record<PermissionKey, UserCapability>,
            membershipStatus: "revoked",
          };
        }

        const membership = memRes.rows[0];
        const orgId = organizationId || membership.organization_id;

        // IAM-03: Nếu membership bị suspended hoặc revoked, lập tức từ chối và trả quyền rỗng
        if (membership.status !== "active") {
          return {
            roles: [],
            capabilities: {} as Record<PermissionKey, UserCapability>,
            membershipStatus: membership.status,
          };
        }

        // Truy vấn các vai trò đang có hiệu lực (valid_from <= now và valid_to is null hoặc > now)
        const rolesRes = await client.query(
          `SELECT r.id, r.code, r.name 
           FROM iam.user_roles ur 
           JOIN iam.roles r ON r.id = ur.role_id 
           WHERE ur.membership_id = $1 
             AND ur.organization_id = $2 
             AND ur.valid_from <= now() 
             AND (ur.valid_to IS NULL OR ur.valid_to > now()) 
             AND r.is_active = true`,
          [membership.id, orgId]
        );

        const roles = rolesRes.rows;
        if (roles.length === 0) {
          return {
            roles: [],
            capabilities: {} as Record<PermissionKey, UserCapability>,
            membershipStatus: "active",
          };
        }

        // Truy vấn các grant từ các role đang hoạt động
        const grantsRes = await client.query(
          `SELECT p.key as permission_key, p.resource, p.action, rg.scope_kind, rg.amount_limit, rg.currency, rg.is_enabled, r.code as role_code
           FROM iam.role_grants rg
           JOIN iam.roles r ON r.id = rg.role_id
           JOIN iam.permissions p ON p.id = rg.permission_id
           WHERE rg.role_id = ANY($1::uuid[])
             AND rg.organization_id = $2
             AND rg.is_enabled = true`,
          [roles.map((r) => r.id), orgId]
        );

        // IAM-05: Hợp nhất grants không phụ thuộc thứ tự SQL, lấy phạm vi rộng nhất & hạn mức lớn nhất
        const scopePriority: Record<string, number> = {
          ORG: 4,
          BRANCH: 3,
          ASSIGNED: 2,
          OWN: 1,
        };

        const capabilities: Record<PermissionKey, UserCapability> = {} as any;
        for (const row of grantsRes.rows) {
          const key = row.permission_key as PermissionKey;
          const currentLimit = row.amount_limit !== null && row.amount_limit !== undefined ? Number(row.amount_limit) : null;
          const existing = capabilities[key];

          if (!existing) {
            capabilities[key] = {
              permission: key,
              resource: row.resource,
              action: row.action,
              scope: row.scope_kind,
              amountLimit: currentLimit,
              currency: row.currency,
              isEnabled: row.is_enabled,
              fromRole: row.role_code,
            };
          } else {
            // Hợp nhất scope: ưu tiên scope rộng hơn
            const existingPrio = scopePriority[existing.scope] || 0;
            const newPrio = scopePriority[row.scope_kind] || 0;
            if (newPrio > existingPrio) {
              existing.scope = row.scope_kind;
            }

            // Hợp nhất amountLimit: nếu một bên null hoặc undefined (không giới hạn), kết quả là null; nếu cả 2 có số, lấy max
            if (existing.amountLimit === null || existing.amountLimit === undefined || currentLimit === null) {
              existing.amountLimit = null;
            } else {
              existing.amountLimit = Math.max(existing.amountLimit, currentLimit);
            }

            existing.isEnabled = existing.isEnabled || row.is_enabled;
            if (!existing.fromRole.includes(row.role_code)) {
              existing.fromRole = `${existing.fromRole}, ${row.role_code}`;
            }
          }
        }

        return {
          roles,
          capabilities,
          membershipStatus: membership.status,
          membershipId: membership.id,
          employeeId: membership.employee_id || null,
        };
      } finally {
        client.release();
      }
    } catch (dbError) {
      // Database offline: chỉ fallback nếu chạy trong môi trường phát triển local và có cờ explicitly
      if (process.env.NODE_ENV === "development" && process.env.ALLOW_DEMO_FALLBACK === "true") {
        return this.getFallbackCapabilities(userId);
      }
      // Mặc định từ chối an toàn khi DB lỗi
      return {
        roles: [],
        capabilities: {} as Record<PermissionKey, UserCapability>,
        membershipStatus: "suspended",
      };
    }
  }

  /**
   * Tính toán ma trận Capabilities từ seed matrix khi chạy chế độ demo/local
   * IAM-01: Không mặc định SUPER_ADMIN cho tài khoản lạ
   */
  static getFallbackCapabilities(userId: string): {
    roles: { id: string; code: string; name: string }[];
    capabilities: Record<PermissionKey, UserCapability>;
    membershipStatus: "active" | "suspended" | "revoked";
  } {
    let roleCode = "";
    let roleName = "";

    if (userId.includes("admin") || userId === "usr-admin-001") {
      roleCode = "SUPER_ADMIN";
      roleName = "Quản trị hệ thống";
    } else if (userId.includes("acc") || userId.includes("ketoan")) {
      roleCode = "ACCOUNTANT";
      roleName = "Kế toán";
    } else if (userId.includes("wh") || userId.includes("thukho")) {
      roleCode = "WAREHOUSE_KEEPER";
      roleName = "Thủ kho";
    } else if (userId.includes("pm") || userId.includes("duan")) {
      roleCode = "PROJECT_MANAGER";
      roleName = "Quản lý dự án";
    } else if (userId.includes("worker") || userId.includes("tho")) {
      roleCode = "FIELD_WORKER";
      roleName = "Thợ / lái xe";
    } else {
      // User không xác định trong chế độ fallback: trả quyền rỗng
      return {
        roles: [],
        capabilities: {} as Record<PermissionKey, UserCapability>,
        membershipStatus: "active",
      };
    }

    const roles = [{ id: `role-${roleCode}`, code: roleCode, name: roleName }];
    const capabilities: Record<PermissionKey, UserCapability> = {} as any;

    if (roleCode === "SUPER_ADMIN") {
      // SUPER_ADMIN được seed toàn bộ cặp action trong catalog với ORG
      SEED_ROLE_GRANTS.forEach((grant) => {
        capabilities[grant.permission] = {
          permission: grant.permission,
          resource: grant.permission.split(".")[0] as any,
          action: grant.permission.split(".")[1] as any,
          scope: "ORG",
          isEnabled: true,
          fromRole: "SUPER_ADMIN",
        };
      });
    } else {
      // Các role còn lại theo đúng ma trận
      SEED_ROLE_GRANTS.filter((g) => g.roleCode === roleCode).forEach((grant) => {
        capabilities[grant.permission] = {
          permission: grant.permission,
          resource: grant.permission.split(".")[0] as any,
          action: grant.permission.split(".")[1] as any,
          scope: grant.scope,
          amountLimit: grant.amountLimit !== undefined ? grant.amountLimit : null,
          currency: grant.currency || null,
          isEnabled: true,
          fromRole: roleCode,
        };
      });
    }

    return {
      roles,
      capabilities,
      membershipStatus: "active",
    };
  }

  /**
   * Kiểm tra quyền thực hiện một hành động (Thuật toán Mục 8)
   */
  static authorize(
    capabilities: Record<PermissionKey, UserCapability>,
    permission: PermissionKey,
    context?: {
      scope?: ScopeKind;
      amount?: number;
      currency?: string;
    }
  ): { allowed: boolean; reason?: string; capability?: UserCapability } {
    const cap = capabilities[permission];
    if (!cap || !cap.isEnabled) {
      return {
        allowed: false,
        reason: `Từ chối: Tài khoản không có quyền '${permission}'`,
      };
    }

    // Kiểm tra phạm vi (scope) nếu ngữ cảnh yêu cầu
    if (context?.scope) {
      const scopePriority: Record<string, number> = {
        ORG: 4,
        BRANCH: 3,
        ASSIGNED: 2,
        OWN: 1,
      };
      const userScopePrio = scopePriority[cap.scope] || 0;
      const requiredScopePrio = scopePriority[context.scope] || 0;
      if (userScopePrio < requiredScopePrio) {
        return {
          allowed: false,
          reason: `Từ chối: Phạm vi quyền '${cap.scope}' không đủ đáp ứng yêu cầu '${context.scope}'`,
          capability: cap,
        };
      }
    }

    // Kiểm tra hạn mức tiền nếu có (IAM-08: xử lý đúng khi hạn mức = 0 hoặc amount = 0)
    if (context?.amount !== undefined && cap.amountLimit !== null && cap.amountLimit !== undefined) {
      if (context.amount > cap.amountLimit) {
        return {
          allowed: false,
          reason: `Từ chối: Số tiền (${context.amount.toLocaleString("vi-VN")} ${context.currency || "VND"}) vượt quá hạn mức được duyệt (${cap.amountLimit.toLocaleString("vi-VN")} ${cap.currency || "VND"})`,
          capability: cap,
        };
      }
    }

    return { allowed: true, capability: cap };
  }

  /**
   * Kiểm tra điều kiện mở màn hình M00–M20 (Mục 6 docs/MA_TRAN_PHAN_QUYEN_DONG.md)
   */
  static canAccessScreen(
    capabilities: Record<PermissionKey, UserCapability>,
    screenCode: string
  ): boolean {
    const rule = SCREEN_REQUIREMENTS[screenCode];
    if (!rule) return true;
    if (rule.permissions.length === 0) return true;

    if (rule.anyOf) {
      return rule.permissions.some((p) => capabilities[p]?.isEnabled);
    } else {
      return rule.permissions.every((p) => capabilities[p]?.isEnabled);
    }
  }

  /**
   * Xác định điểm vào mặc định theo vai trò và quyền (Mục 6 DANH_SACH_MAN_HINH_HE_THONG.md)
   */
  static resolveDefaultRoute(
    roles: { code: string }[],
    capabilities: Record<PermissionKey, UserCapability>
  ): string {
    // Ưu tiên theo vai trò chính
    const roleCodes = roles.map((r) => r.code);
    if (roleCodes.includes("SUPER_ADMIN")) return ROLE_DEFAULT_ROUTES.SUPER_ADMIN;
    if (roleCodes.includes("ACCOUNTANT")) return ROLE_DEFAULT_ROUTES.ACCOUNTANT;
    if (roleCodes.includes("WAREHOUSE_KEEPER")) return ROLE_DEFAULT_ROUTES.WAREHOUSE_KEEPER;
    if (roleCodes.includes("PROJECT_MANAGER")) return ROLE_DEFAULT_ROUTES.PROJECT_MANAGER;
    if (roleCodes.includes("FIELD_WORKER")) return ROLE_DEFAULT_ROUTES.FIELD_WORKER;

    // Phân giải dự phòng dựa trên permissions
    if (this.canAccessScreen(capabilities, "M14")) return "/hien-truong";
    if (this.canAccessScreen(capabilities, "M08")) return "/kho";
    if (this.canAccessScreen(capabilities, "M16")) return "/tai-chinh";
    if (this.canAccessScreen(capabilities, "M11")) return "/du-an";

    return "/";
  }
}



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
import { getDbPool } from "@/lib/db";
export { getDbPool };

interface CachedCapabilitiesResult {
  data: {
    roles: { id: string; code: string; name: string }[];
    capabilities: Record<PermissionKey, UserCapability>;
    membershipStatus: "active" | "suspended" | "revoked";
    membershipId?: string;
    employeeId?: string | null;
  };
  expiresAt: number;
}

const globalForAuthCache = globalThis as unknown as {
  authCapCache?: Map<string, CachedCapabilitiesResult>;
  inFlightCapPromises?: Map<string, Promise<any>>;
};

const capCache =
  globalForAuthCache.authCapCache ??
  new Map<string, CachedCapabilitiesResult>();

const inFlightCapPromises =
  globalForAuthCache.inFlightCapPromises ??
  new Map<string, Promise<any>>();

globalForAuthCache.authCapCache = capCache;
globalForAuthCache.inFlightCapPromises = inFlightCapPromises;

export function invalidateUserCapabilitiesCache(userId?: string) {
  if (userId) {
    for (const key of capCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        capCache.delete(key);
        inFlightCapPromises.delete(key);
      }
    }
  } else {
    capCache.clear();
    inFlightCapPromises.clear();
  }
}

/**
 * F23 / Probe 11: Kiểm tra quan hệ bao hàm của Scope
 * Scope là điều kiện chọn dữ liệu (predicate matching), không phải thang bậc số học tuyệt đối.
 * - ORG: Toàn tổ chức -> bao hàm mọi scope
 * - BRANCH: Chi nhánh -> bao hàm DEPARTMENT, TEAM, ASSIGNED, OWN trong chi nhánh
 * - DEPARTMENT: Phòng ban -> bao hàm TEAM, ASSIGNED, OWN trong phòng
 * - TEAM: Tổ đội -> bao hàm ASSIGNED, OWN trong tổ
 * - ASSIGNED: Phân công -> bao hàm OWN (những việc do mình làm nằm trong phần được giao)
 * - OWN / SELECTED: Không tự bao hàm các scope khác
 */
export function satisfiesScope(userScope: ScopeKind, requiredScope: ScopeKind): boolean {
  if (userScope === requiredScope) return true;
  if (userScope === "ORG") return true;
  if (userScope === "DEPARTMENT") {
    return requiredScope === "TEAM" || requiredScope === "ASSIGNED" || requiredScope === "OWN";
  }
  if (userScope === "TEAM") {
    return requiredScope === "ASSIGNED" || requiredScope === "OWN";
  }
  if (userScope === "ASSIGNED") {
    return requiredScope === "OWN";
  }
  return false;
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
    const cacheKey = `${userId}:${organizationId || "default"}`;
    const now = Date.now();
    const hit = capCache.get(cacheKey);
    if (hit && hit.expiresAt > now) {
      return hit.data;
    }

    // Promise coalescing: Nếu đang có request khác truy vấn quyền cho user này, dùng chung kết quả
    const pending = inFlightCapPromises.get(cacheKey);
    if (pending) {
      return await pending;
    }

    const fetchPromise = (async () => {
      try {
        // 1. Thử truy vấn cơ sở dữ liệu thực tế
        const pool = getDbPool();

        // Truy vấn membership & employee (F24: chọn đúng membership theo organization nếu truyền vào)
        const memRes = await pool.query(
          `SELECT m.id, m.organization_id, m.status, e.id as employee_id 
         FROM erp.memberships m 
         LEFT JOIN erp.employees e ON e.membership_id = m.id AND e.is_active = true 
         WHERE m.user_id = $1 ${organizationId ? "AND m.organization_id = $2" : ""}
         ORDER BY (m.status = 'active') DESC, m.created_at DESC
         LIMIT 1`,
          organizationId ? [userId, organizationId] : [userId]
        );

        if (memRes.rows.length === 0) {
          // IAM-01: An toàn tuyệt đối: User không có membership thì từ chối, không cấp quyền
          const res = {
            roles: [],
            capabilities: {} as Record<PermissionKey, UserCapability>,
            membershipStatus: "revoked" as const,
          };
          capCache.set(cacheKey, { data: res, expiresAt: now + 30000 });
          return res;
        }

        const membership = memRes.rows[0];
        const orgId = organizationId || membership.organization_id;

        // IAM-03: Nếu membership bị suspended hoặc revoked, lập tức từ chối và trả quyền rỗng
        if (membership.status !== "active") {
          const res = {
            roles: [],
            capabilities: {} as Record<PermissionKey, UserCapability>,
            membershipStatus: membership.status as "suspended" | "revoked",
          };
          capCache.set(cacheKey, { data: res, expiresAt: now + 30000 });
          return res;
        }

        // Truy vấn đồng thời các vai trò và các grant được cấp trong 1 query tối ưu (F24: lọc p.is_active = true)
        const rolesAndGrantsRes = await pool.query(
          `SELECT 
           r.id as role_id, r.code as role_code, r.name as role_name,
           p.key as permission_key, p.resource, p.action, rg.scope_kind, rg.amount_limit, rg.currency, rg.is_enabled
         FROM iam.user_roles ur 
         JOIN iam.roles r ON r.id = ur.role_id 
         LEFT JOIN iam.role_grants rg ON rg.role_id = r.id AND rg.organization_id = $2 AND rg.is_enabled = true
         LEFT JOIN iam.permissions p ON p.id = rg.permission_id AND p.is_active = true
         WHERE ur.membership_id = $1 
           AND ur.organization_id = $2 
           AND ur.valid_from <= now() 
           AND (ur.valid_to IS NULL OR ur.valid_to > now()) 
           AND r.is_active = true`,
          [membership.id, orgId]
        );

        const rolesMap = new Map<string, { id: string; code: string; name: string }>();
        const capabilities: Record<PermissionKey, UserCapability> = {} as any;

        const scopePriority: Record<string, number> = {
          ORG: 4,
          BRANCH: 3,
          ASSIGNED: 2,
          OWN: 1,
        };

        for (const row of rolesAndGrantsRes.rows) {
          if (!rolesMap.has(row.role_id)) {
            rolesMap.set(row.role_id, {
              id: row.role_id,
              code: row.role_code,
              name: row.role_name,
            });
          }

          if (row.permission_key && row.is_enabled) {
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
              // Hợp nhất scope và hạn mức: không để hạn mức của scope hẹp thổi phồng scope rộng
              const existingPrio = scopePriority[existing.scope] || 0;
              const newPrio = scopePriority[row.scope_kind] || 0;
              if (newPrio > existingPrio) {
                existing.scope = row.scope_kind;
                existing.amountLimit = currentLimit;
              } else if (newPrio === existingPrio) {
                if (existing.amountLimit === null || existing.amountLimit === undefined || currentLimit === null) {
                  existing.amountLimit = null;
                } else {
                  existing.amountLimit = Math.max(existing.amountLimit, currentLimit);
                }
              }

              existing.isEnabled = existing.isEnabled || row.is_enabled;
              if (!existing.fromRole.includes(row.role_code)) {
                existing.fromRole = `${existing.fromRole}, ${row.role_code}`;
              }
            }
          }
        }

        const roles = Array.from(rolesMap.values());
        const isSuperAdmin = roles.some((r) =>
          ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
        );

        // Nếu người dùng có vai trò Quản Trị Hệ Thống (SUPER_ADMIN): luôn cấp toàn quyền ORG cho mọi tài nguyên
        if (isSuperAdmin) {
          try {
            const allPermsRes = await pool.query(
              `SELECT key, resource, action FROM iam.permissions WHERE is_active = true`
            );
            for (const pRow of allPermsRes.rows) {
              const key = pRow.key as PermissionKey;
              capabilities[key] = {
                permission: key,
                resource: pRow.resource,
                action: pRow.action,
                scope: "ORG",
                amountLimit: null,
                currency: "VND",
                isEnabled: true,
                fromRole: "SUPER_ADMIN",
              };
            }
          } catch {
            // Dự phòng nếu bảng iam.permissions chưa sẵn sàng
            SEED_ROLE_GRANTS.forEach((grant) => {
              capabilities[grant.permission] = {
                permission: grant.permission,
                resource: grant.permission.split(".")[0] as any,
                action: grant.permission.split(".")[1] as any,
                scope: "ORG",
                amountLimit: null,
                currency: "VND",
                isEnabled: true,
                fromRole: "SUPER_ADMIN",
              };
            });
          }
        }

        // Đồng bộ các bí danh quyền (aliases) cho phân hệ IAM (membership/role)
        AuthorizationService.enrichCapabilitiesAliases(capabilities, isSuperAdmin);

        const result = {
          roles,
          capabilities,
          membershipStatus: membership.status as "active",
          membershipId: membership.id,
          employeeId: membership.employee_id || null,
        };

        capCache.set(cacheKey, { data: result, expiresAt: Date.now() + 45000 }); // Cache 45 giây
        return result;
      } catch (dbError) {
        // Database offline: chỉ fallback nếu chạy trong môi trường phát triển local và có cờ explicitly
        if (process.env.NODE_ENV === "development" && process.env.ALLOW_DEMO_FALLBACK === "true") {
          return this.getFallbackCapabilities(userId);
        }
        // Mặc định từ chối an toàn khi DB lỗi
        return {
          roles: [],
          capabilities: {} as Record<PermissionKey, UserCapability>,
          membershipStatus: "suspended" as const,
        };
      } finally {
        inFlightCapPromises.delete(cacheKey);
      }
    })();

    inFlightCapPromises.set(cacheKey, fetchPromise);
    return await fetchPromise;
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

    this.enrichCapabilitiesAliases(capabilities, roleCode === "SUPER_ADMIN");

    return {
      roles,
      capabilities,
      membershipStatus: "active",
    };
  }

  /**
   * Đồng bộ hóa và bổ sung các bí danh quyền (aliases) trong IAM (membership / role)
   */
  static enrichCapabilitiesAliases(
    capabilities: Record<PermissionKey, UserCapability>,
    isSuperAdmin: boolean
  ): void {
    if (isSuperAdmin) {
      const adminKeys: Array<{ key: string; resource: string; action: string }> = [
        { key: "membership.read", resource: "membership", action: "read" },
        { key: "membership.create", resource: "membership", action: "create" },
        { key: "membership.invite", resource: "membership", action: "invite" },
        { key: "membership.update", resource: "membership", action: "update" },
        { key: "membership.suspend", resource: "membership", action: "suspend" },
        { key: "membership.assign_role", resource: "membership", action: "assign_role" },
        { key: "role.read", resource: "role", action: "read" },
        { key: "role.create", resource: "role", action: "create" },
        { key: "role.update", resource: "role", action: "update" },
        { key: "role.manage", resource: "role", action: "manage" },
        { key: "role.publish", resource: "role", action: "publish" },
        { key: "role.assign", resource: "role", action: "assign" },
      ];
      for (const item of adminKeys) {
        capabilities[item.key as PermissionKey] = {
          permission: item.key as PermissionKey,
          resource: item.resource as any,
          action: item.action as any,
          scope: "ORG",
          amountLimit: null,
          currency: "VND",
          isEnabled: true,
          fromRole: "SUPER_ADMIN",
        };
      }
    }

    // 1. membership.invite <-> membership.create
    if (capabilities["membership.invite"]?.isEnabled && !capabilities["membership.create" as PermissionKey]) {
      capabilities["membership.create" as PermissionKey] = {
        ...capabilities["membership.invite"],
        permission: "membership.create" as PermissionKey,
        action: "create" as any,
      };
    } else if (capabilities["membership.create" as PermissionKey]?.isEnabled && !capabilities["membership.invite"]) {
      capabilities["membership.invite"] = {
        ...capabilities["membership.create" as PermissionKey],
        permission: "membership.invite",
        action: "invite" as any,
      };
    }

    // 2. membership.suspend <-> membership.update
    if (capabilities["membership.suspend"]?.isEnabled && !capabilities["membership.update" as PermissionKey]) {
      capabilities["membership.update" as PermissionKey] = {
        ...capabilities["membership.suspend"],
        permission: "membership.update" as PermissionKey,
        action: "update" as any,
      };
    }

    // 3. membership.assign_role <-> role.assign
    if (capabilities["membership.assign_role"]?.isEnabled && !capabilities["role.assign" as PermissionKey]) {
      capabilities["role.assign" as PermissionKey] = {
        ...capabilities["membership.assign_role"],
        permission: "role.assign" as PermissionKey,
        resource: "role" as any,
        action: "assign" as any,
      };
    }

    // 4. role.manage -> role.create, role.update, role.assign
    if (capabilities["role.manage"]?.isEnabled) {
      if (!capabilities["role.create" as PermissionKey]) {
        capabilities["role.create" as PermissionKey] = {
          ...capabilities["role.manage"],
          permission: "role.create" as PermissionKey,
          action: "create" as any,
        };
      }
      if (!capabilities["role.update" as PermissionKey]) {
        capabilities["role.update" as PermissionKey] = {
          ...capabilities["role.manage"],
          permission: "role.update" as PermissionKey,
          action: "update" as any,
        };
      }
      if (!capabilities["role.assign" as PermissionKey]) {
        capabilities["role.assign" as PermissionKey] = {
          ...capabilities["role.manage"],
          permission: "role.assign" as PermissionKey,
          action: "assign" as any,
        };
      }
    }
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

    // Kiểm tra phạm vi (scope) nếu ngữ cảnh yêu cầu (F23 / Probe 11: không dùng priority số nguyên làm OWN thỏa SELECTED)
    if (context?.scope) {
      if (!satisfiesScope(cap.scope, context.scope)) {
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

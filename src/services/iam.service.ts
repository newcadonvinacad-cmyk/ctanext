
import { getDbPool, getCachedOrgId } from "@/lib/db";
import { invalidateUserCapabilitiesCache } from "./authorization.service";
import { ScopeKind } from "@/types/iam";
import { auth } from "@/lib/auth";

export interface IamUser {
  membershipId: string;
  userId: string;
  email: string;
  name: string;
  status: "active" | "suspended" | "revoked";
  joinedAt: string;
  roles: Array<{
    userRoleId: string;
    roleId: string;
    roleCode: string;
    roleName: string;
    validFrom: string;
    validTo: string | null;
    reason: string;
  }>;
}

export interface IamRole {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  memberCount: number;
  grantCount: number;
}

export interface IamPermissionGrant {
  permissionId: string;
  permissionKey: string;
  resource: string;
  action: string;
  description: string;
  supportedScopes: ScopeKind[];
  supportsAmountLimit: boolean;
  isSensitive: boolean;
  grantId: string | null;
  scopeKind: ScopeKind;
  amountLimit: number | null;
  currency: string | null;
  isEnabled: boolean;
}

export class IamService {
  /**
   * Lấy organization ID mặc định ('SIGNAGE')
   */
  static async getOrganizationId(_client?: any): Promise<string> {
    return getCachedOrgId("SIGNAGE");
  }

  /**
   * Lấy danh sách thành viên trong tổ chức kèm danh sách vai trò
   */
  static async listUsers(organizationId?: string): Promise<IamUser[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = organizationId || (await this.getOrganizationId(client));
      const query = `
        SELECT 
          m.id as membership_id,
          m.status,
          m.joined_at,
          u.id as user_id,
          u.email,
          u.name,
          COALESCE(
            json_agg(
              json_build_object(
                'userRoleId', ur.id,
                'roleId', r.id,
                'roleCode', r.code,
                'roleName', r.name,
                'validFrom', ur.valid_from,
                'validTo', ur.valid_to,
                'reason', ur.reason
              )
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'
          ) as roles
        FROM erp.memberships m
        JOIN public."user" u ON u.id = m.user_id
        LEFT JOIN iam.user_roles ur ON ur.membership_id = m.id 
          AND (ur.valid_to IS NULL OR ur.valid_to > now())
        LEFT JOIN iam.roles r ON r.id = ur.role_id AND r.is_active = true
        WHERE m.organization_id = $1
        GROUP BY m.id, m.status, m.joined_at, u.id, u.email, u.name
        ORDER BY m.joined_at ASC;
      `;
      const res = await client.query(query, [orgId]);

      return res.rows.map((row) => ({
        membershipId: row.membership_id,
        userId: row.user_id,
        email: row.email,
        name: row.name || row.email.split("@")[0],
        status: row.status,
        joinedAt: row.joined_at,
        roles: Array.isArray(row.roles) ? row.roles : [],
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Tạo tài khoản người dùng mới và gán vai trò ban đầu
   */
  static async createUser(data: {
    email: string;
    name: string;
    password?: string;
    roleId?: string;
    reason?: string;
    assignedBy: string;
    employeeId?: string;
    employeeCode?: string;
    phone?: string;
    departmentId?: string;
    createEmployee?: boolean;
  }): Promise<{ userId: string; membershipId: string; employeeId?: string }> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const email = data.email.trim().toLowerCase();
      const name = data.name.trim();

      // 1. Kiểm tra hoặc tạo User trong Better Auth
      const existingUser = await client.query(
        'SELECT id FROM public."user" WHERE email = $1',
        [email]
      );

      let targetUserId = "";
      if (existingUser.rows.length > 0) {
        targetUserId = existingUser.rows[0].id;
      } else {
        const password = data.password || "Signage@" + new Date().getFullYear();
        const created = await auth.api.signUpEmail({
          body: { email, password, name },
        });
        targetUserId = created.user.id;
      }

      await client.query("BEGIN");

      // 2. Tạo Membership
      const memRes = await client.query(
        `INSERT INTO erp.memberships(organization_id, user_id, status, created_by, updated_by)
         VALUES($1, $2, 'active', $3, $3)
         ON CONFLICT (organization_id, user_id) 
         DO UPDATE SET status = 'active', updated_at = now()
         RETURNING id`,
        [orgId, targetUserId, data.assignedBy]
      );
      const membershipId = memRes.rows[0].id;

      // 3. Gán Role ban đầu nếu được chỉ định
      if (data.roleId) {
        // Kiểm tra xem đã gán chưa
        const existingAssignment = await client.query(
          `SELECT id FROM iam.user_roles 
           WHERE organization_id = $1 AND membership_id = $2 AND role_id = $3
             AND (valid_to IS NULL OR valid_to > now())`,
          [orgId, membershipId, data.roleId]
        );

        if (existingAssignment.rows.length === 0) {
          await client.query(
            `INSERT INTO iam.user_roles(organization_id, membership_id, role_id, assigned_by, reason, created_by, updated_by)
             VALUES($1, $2, $3, $4, $5, $4, $4)`,
            [
              orgId,
              membershipId,
              data.roleId,
              data.assignedBy,
              data.reason || "Khởi tạo thành viên",
            ]
          );
        }
      }

      // 4. Đồng bộ tạo hoặc liên kết hồ sơ nhân sự (erp.employees)
      let employeeRecordId: string | undefined = undefined;
      if (data.employeeId) {
        // Liên kết với nhân viên đã có sẵn
        const upRes = await client.query(
          `UPDATE erp.employees 
           SET membership_id = $1, updated_at = now(), updated_by = $2
           WHERE organization_id = $3 AND id = $4
           RETURNING id`,
          [membershipId, data.assignedBy, orgId, data.employeeId]
        );
        employeeRecordId = upRes.rows[0]?.id;
      } else if (data.createEmployee !== false) {
        // Kiểm tra xem đã có hồ sơ employee cho membership này chưa
        const empCheck = await client.query(
          `SELECT id FROM erp.employees WHERE organization_id = $1 AND membership_id = $2`,
          [orgId, membershipId]
        );
        if (empCheck.rows.length > 0) {
          employeeRecordId = empCheck.rows[0].id;
        } else {
          // Tạo mã nhân viên mới
          let empCode = data.employeeCode ? data.employeeCode.trim() : "";
          if (!empCode) {
            const countRes = await client.query(
              `SELECT COUNT(*) FROM erp.employees WHERE organization_id = $1`,
              [orgId]
            );
            const count = parseInt(countRes.rows[0].count, 10) + 1;
            empCode = `NV-${String(count).padStart(3, "0")}`;
          }

          // Kiểm tra xem empCode có bị trùng không, nếu trùng thì gắn thêm hậu tố
          const dupRes = await client.query(
            `SELECT id FROM erp.employees WHERE organization_id = $1 AND code = $2`,
            [orgId, empCode]
          );
          if (dupRes.rows.length > 0) {
            empCode = `${empCode}-${Date.now().toString().slice(-4)}`;
          }

          const insEmpRes = await client.query(
            `INSERT INTO erp.employees(
               organization_id, code, name, phone, membership_id, department_id, hire_date, is_active, created_by, updated_by
             )
             VALUES($1, $2, $3, $4, $5, $6, CURRENT_DATE, true, $7, $7)
             RETURNING id`,
            [
              orgId,
              empCode,
              name,
              data.phone || null,
              membershipId,
              data.departmentId || null,
              data.assignedBy,
            ]
          );
          employeeRecordId = insEmpRes.rows[0]?.id;
        }
      }

      // Tăng policy_version để hủy cache
      await client.query(
        "UPDATE erp.organizations SET policy_version = policy_version + 1 WHERE id = $1",
        [orgId]
      );

      await client.query("COMMIT");

      return { userId: targetUserId, membershipId, employeeId: employeeRecordId };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => { });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cập nhật trạng thái thành viên (active, suspended, revoked)
   */
  static async updateUserStatus(
    membershipId: string,
    status: "active" | "suspended" | "revoked",
    updatedBy: string
  ): Promise<void> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      await client.query("BEGIN");

      // IAM-06: Bảo vệ quản trị viên cuối cùng của hệ thống
      if (status !== "active") {
        const adminRes = await client.query(
          `SELECT count(DISTINCT m.id) as active_admins
           FROM erp.memberships m
           JOIN iam.user_roles ur ON ur.membership_id = m.id AND (ur.valid_to IS NULL OR ur.valid_to > now())
           JOIN iam.roles r ON r.id = ur.role_id AND r.code = 'SUPER_ADMIN' AND r.is_active = true
           WHERE m.organization_id = $1 AND m.status = 'active'`,
          [orgId]
        );
        const currentMemberIsAdmin = await client.query(
          `SELECT 1 FROM iam.user_roles ur
           JOIN iam.roles r ON r.id = ur.role_id AND r.code = 'SUPER_ADMIN' AND r.is_active = true
           WHERE ur.membership_id = $1 AND ur.organization_id = $2 AND (ur.valid_to IS NULL OR ur.valid_to > now())`,
          [membershipId, orgId]
        );
        if (currentMemberIsAdmin.rows.length > 0 && Number(adminRes.rows[0]?.active_admins || 0) <= 1) {
          throw new Error("Không thể khóa hoặc thu hồi tài khoản của Quản trị viên hệ thống (SUPER_ADMIN) duy nhất!");
        }
      }

      await client.query(
        `UPDATE erp.memberships 
         SET status = $1, 
             updated_by = $2, 
             updated_at = now(),
             revoked_at = CASE WHEN $1 = 'revoked' THEN now() ELSE NULL END
         WHERE id = $3 AND organization_id = $4`,
        [status, updatedBy, membershipId, orgId]
      );

      await client.query(
        "UPDATE erp.organizations SET policy_version = policy_version + 1 WHERE id = $1",
        [orgId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => { });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Gán vai trò cho người dùng
   */
  static async assignUserRole(data: {
    membershipId: string;
    roleId: string;
    validFrom?: Date;
    validTo?: Date | null;
    reason: string;
    assignedBy: string;
  }): Promise<void> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      await client.query("BEGIN");

      // Đóng kỳ hiệu lực cũ nếu có
      await client.query(
        `UPDATE iam.user_roles 
         SET valid_to = now(), updated_at = now(), updated_by = $1
         WHERE organization_id = $2 AND membership_id = $3 AND role_id = $4
           AND (valid_to IS NULL OR valid_to > now())`,
        [data.assignedBy, orgId, data.membershipId, data.roleId]
      );

      // Thêm gán vai trò mới
      await client.query(
        `INSERT INTO iam.user_roles(
           organization_id, membership_id, role_id, 
           valid_from, valid_to, assigned_by, reason, 
           created_by, updated_by
         )
         VALUES($1, $2, $3, COALESCE($4, now()), $5, $6, $7, $6, $6)`,
        [
          orgId,
          data.membershipId,
          data.roleId,
          data.validFrom || null,
          data.validTo || null,
          data.assignedBy,
          data.reason,
        ]
      );

      await client.query(
        "UPDATE erp.organizations SET policy_version = policy_version + 1 WHERE id = $1",
        [orgId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => { });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Thu hồi vai trò của người dùng
   */
  static async revokeUserRole(
    userRoleId: string,
    revokedBy: string
  ): Promise<void> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      await client.query("BEGIN");

      // IAM-06: Bảo vệ quản trị viên cuối cùng không bị thu hồi vai trò
      const targetRole = await client.query(
        `SELECT r.code 
         FROM iam.user_roles ur 
         JOIN iam.roles r ON r.id = ur.role_id 
         WHERE ur.id = $1 AND ur.organization_id = $2`,
        [userRoleId, orgId]
      );
      if (targetRole.rows[0]?.code === "SUPER_ADMIN") {
        const adminCountRes = await client.query(
          `SELECT count(DISTINCT m.id) as active_admins
           FROM erp.memberships m
           JOIN iam.user_roles ur ON ur.membership_id = m.id AND (ur.valid_to IS NULL OR ur.valid_to > now())
           JOIN iam.roles r ON r.id = ur.role_id AND r.code = 'SUPER_ADMIN' AND r.is_active = true
           WHERE m.organization_id = $1 AND m.status = 'active'`,
          [orgId]
        );
        if (Number(adminCountRes.rows[0]?.active_admins || 0) <= 1) {
          throw new Error("Không thể thu hồi vai trò Quản trị viên (SUPER_ADMIN) duy nhất của tổ chức!");
        }
      }

      await client.query(
        `UPDATE iam.user_roles 
         SET valid_to = now(), updated_at = now(), updated_by = $1
         WHERE id = $2 AND organization_id = $3`,
        [revokedBy, userRoleId, orgId]
      );

      await client.query(
        "UPDATE erp.organizations SET policy_version = policy_version + 1 WHERE id = $1",
        [orgId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => { });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lấy danh sách các vai trò (Roles) trong tổ chức
   */
  static async listRoles(organizationId?: string): Promise<IamRole[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = organizationId || (await this.getOrganizationId(client));
      const query = `
        SELECT 
          r.id,
          r.code,
          r.name,
          r.description,
          r.is_system,
          r.is_active,
          count(DISTINCT ur.membership_id) FILTER (WHERE ur.valid_to IS NULL OR ur.valid_to > now()) as member_count,
          count(DISTINCT rg.id) FILTER (WHERE rg.is_enabled = true) as grant_count
        FROM iam.roles r
        LEFT JOIN iam.user_roles ur ON ur.role_id = r.id
        LEFT JOIN iam.role_grants rg ON rg.role_id = r.id
        WHERE r.organization_id = $1
        GROUP BY r.id, r.code, r.name, r.description, r.is_system, r.is_active
        ORDER BY r.is_system DESC, r.code ASC;
      `;
      const res = await client.query(query, [orgId]);

      return res.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description || "",
        isSystem: row.is_system,
        isActive: row.is_active,
        memberCount: parseInt(row.member_count, 10) || 0,
        grantCount: parseInt(row.grant_count, 10) || 0,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Tạo vai trò mới hoặc nhân bản từ một vai trò có sẵn
   */
  static async createRole(data: {
    code: string;
    name: string;
    description?: string;
    cloneFromRoleId?: string;
    createdBy: string;
  }): Promise<{ id: string }> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const code = data.code.trim().toUpperCase();
      const name = data.name.trim();

      await client.query("BEGIN");

      // 1. Tạo role mới
      const roleRes = await client.query(
        `INSERT INTO iam.roles(organization_id, code, name, description, is_system, is_active, created_by, updated_by)
         VALUES($1, $2, $3, $4, false, true, $5, $5)
         RETURNING id`,
        [orgId, code, name, data.description || "", data.createdBy]
      );
      const newRoleId = roleRes.rows[0].id;

      // 2. Nếu có nhân bản từ vai trò khác, sao chép toàn bộ role_grants
      if (data.cloneFromRoleId) {
        await client.query(
          `INSERT INTO iam.role_grants(
             organization_id, role_id, permission_id, 
             scope_kind, amount_limit, currency, is_enabled, 
             created_by, updated_by
           )
           SELECT 
             $1, $2, permission_id, 
             scope_kind, amount_limit, currency, is_enabled, 
             $3, $3
           FROM iam.role_grants
           WHERE role_id = $4 AND organization_id = $1`,
          [orgId, newRoleId, data.createdBy, data.cloneFromRoleId]
        );
      }

      await client.query(
        "UPDATE erp.organizations SET policy_version = policy_version + 1 WHERE id = $1",
        [orgId]
      );

      await client.query("COMMIT");
      return { id: newRoleId };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => { });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lấy ma trận quyền (Catalog Permissions + Active Grants) của một vai trò
   */
  static async getRoleGrants(roleId: string): Promise<IamPermissionGrant[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const query = `
        SELECT 
          p.id as permission_id,
          p.key as permission_key,
          p.resource,
          p.action,
          p.description,
          p.supported_scopes,
          p.supports_amount_limit,
          p.is_sensitive,
          rg.id as grant_id,
          rg.scope_kind,
          rg.amount_limit,
          rg.currency,
          COALESCE(rg.is_enabled, false) as is_enabled
        FROM iam.permissions p
        LEFT JOIN iam.role_grants rg 
          ON rg.permission_id = p.id 
          AND rg.role_id = $1 
          AND rg.organization_id = $2
        WHERE p.is_active = true
        ORDER BY p.resource ASC, p.action ASC;
      `;
      const res = await client.query(query, [roleId, orgId]);

      return res.rows.map((row) => ({
        permissionId: row.permission_id,
        permissionKey: row.permission_key,
        resource: row.resource,
        action: row.action,
        description: row.description,
        supportedScopes: row.supported_scopes || ["ORG"],
        supportsAmountLimit: row.supports_amount_limit,
        isSensitive: row.is_sensitive,
        grantId: row.grant_id,
        scopeKind: row.scope_kind || row.supported_scopes?.[0] || "ORG",
        amountLimit: row.amount_limit ? Number(row.amount_limit) : null,
        currency: row.currency || (row.supports_amount_limit ? "VND" : null),
        isEnabled: row.is_enabled === true,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Cập nhật toàn bộ ma trận quyền của một vai trò
   */
  static async updateRoleGrants(data: {
    roleId: string;
    grants: Array<{
      permissionId: string;
      scopeKind: ScopeKind;
      amountLimit?: number | null;
      currency?: string | null;
      isEnabled: boolean;
    }>;
    updatedBy: string;
  }): Promise<void> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      await client.query("BEGIN");

      for (const g of data.grants) {
        const limit = g.amountLimit !== undefined && g.amountLimit !== null ? Number(g.amountLimit) : null;
        const curr = limit !== null ? (g.currency || "VND") : null;

        if (g.isEnabled) {
          // IAM-07: Tắt các grant cũ khác scope của cùng permission_id để tránh sót quyền rộng cũ
          await client.query(
            `UPDATE iam.role_grants 
             SET is_enabled = false, updated_at = now(), updated_by = $1
             WHERE organization_id = $2 AND role_id = $3 AND permission_id = $4 AND scope_kind != $5`,
            [data.updatedBy, orgId, data.roleId, g.permissionId, g.scopeKind]
          );

          // Upsert grant mục tiêu
          await client.query(
            `INSERT INTO iam.role_grants(
               organization_id, role_id, permission_id, 
               scope_kind, amount_limit, currency, is_enabled, 
               created_by, updated_by
             )
             VALUES($1, $2, $3, $4, $5, $6, true, $7, $7)
             ON CONFLICT (organization_id, role_id, permission_id, scope_kind)
             DO UPDATE SET 
               is_enabled = true,
               amount_limit = EXCLUDED.amount_limit,
               currency = EXCLUDED.currency,
               updated_at = now(),
               updated_by = EXCLUDED.updated_by`,
            [
              orgId,
              data.roleId,
              g.permissionId,
              g.scopeKind,
              limit,
              curr,
              data.updatedBy,
            ]
          );
        } else {
          // Disable hoặc xóa grant
          await client.query(
            `UPDATE iam.role_grants 
             SET is_enabled = false, updated_at = now(), updated_by = $1
             WHERE organization_id = $2 AND role_id = $3 AND permission_id = $4`,
            [data.updatedBy, orgId, data.roleId, g.permissionId]
          );
        }
      }

      // Tăng policy_version để client và middleware cập nhật tức thì
      await client.query(
        "UPDATE erp.organizations SET policy_version = policy_version + 1 WHERE id = $1",
        [orgId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => { });
      throw err;
    } finally {
      client.release();
    }
  }
}

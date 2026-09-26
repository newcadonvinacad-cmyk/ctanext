import { betterAuth } from "better-auth";
import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
});

const SEED_USERS = [
  {
    email: "admin@signage-erp.vn",
    password: "Admin@Signage2026",
    name: "Nguyễn Văn Hưng (Tổng Giám Đốc)",
    roleCode: "SUPER_ADMIN",
  },
  {
    email: "ketoan@signage-erp.vn",
    password: "Ketoan@Signage2026",
    name: "Trần Thị Mai (Kế Toán Trưởng)",
    roleCode: "ACCOUNTANT",
  },
  {
    email: "thukho@signage-erp.vn",
    password: "Thukho@Signage2026",
    name: "Lê Hoàng Long (Thủ Kho Xưởng)",
    roleCode: "WAREHOUSE_KEEPER",
  },
  {
    email: "duan@signage-erp.vn",
    password: "Duan@Signage2026",
    name: "Phạm Minh Tuấn (Quản Lý Dự Án)",
    roleCode: "PROJECT_MANAGER",
  },
  {
    email: "tho@signage-erp.vn",
    password: "Tho@Signage2026",
    name: "Vũ Đình Trọng (Thợ Thi Công / Lái Xe)",
    roleCode: "FIELD_WORKER",
  },
];

async function main() {
  const client = await pool.connect();
  try {
    const orgRes = await client.query("SELECT id, code, name FROM erp.organizations WHERE code='SIGNAGE'");
    if (orgRes.rows.length === 0) {
      throw new Error("Organization SIGNAGE not found in database!");
    }
    const org = orgRes.rows[0];

    for (const u of SEED_USERS) {
      console.log(`Setting up user: ${u.email} [${u.roleCode}]...`);
      const userRes = await client.query('SELECT id, email FROM public."user" WHERE email = $1', [u.email]);
      let targetUserId = "";

      if (userRes.rows.length > 0) {
        targetUserId = userRes.rows[0].id;
        console.log(`  User already exists: ${targetUserId}`);
      } else {
        const created = await auth.api.signUpEmail({
          body: {
            email: u.email,
            password: u.password,
            name: u.name,
          },
        });
        targetUserId = created.user.id;
        console.log(`  User created: ${targetUserId}`);
      }

      await client.query("BEGIN");

      // Membership
      await client.query(
        `INSERT INTO erp.memberships(organization_id, user_id, status, created_by, updated_by)
         VALUES($1, $2, 'active', $2, $2)
         ON CONFLICT(organization_id, user_id) DO NOTHING`,
        [org.id, targetUserId]
      );

      const memRes = await client.query(
        `SELECT id FROM erp.memberships WHERE organization_id = $1 AND user_id = $2 AND status = 'active'`,
        [org.id, targetUserId]
      );
      const membershipId = memRes.rows[0].id;

      // Role
      const roleRes = await client.query(
        `SELECT id, code, name FROM iam.roles WHERE organization_id = $1 AND code = $2 AND is_active = true`,
        [org.id, u.roleCode]
      );
      if (roleRes.rows.length === 0) {
        throw new Error(`Role ${u.roleCode} not found in DB!`);
      }
      const role = roleRes.rows[0];

      // Check if user_role already exists
      const existingUserRole = await client.query(
        `SELECT id FROM iam.user_roles 
         WHERE organization_id = $1 AND membership_id = $2 AND role_id = $3
           AND (valid_to IS NULL OR valid_to > now())`,
        [org.id, membershipId, role.id]
      );

      if (existingUserRole.rows.length === 0) {
        await client.query(
          `INSERT INTO iam.user_roles(organization_id, membership_id, role_id, assigned_by, reason, created_by, updated_by)
           VALUES($1, $2, $3, $4, 'System Seed Setup', $4, $4)`,
          [org.id, membershipId, role.id, targetUserId]
        );
        console.log(`  Role assigned: ${role.name} (${role.code})`);
      } else {
        console.log(`  Role already assigned: ${role.name} (${role.code})`);
      }

      await client.query("COMMIT");
    }

    console.log("\n=======================================================");
    console.log("DANH SÁCH TÀI KHOẢN THẬT ĐÃ ĐƯỢC TẠO TRONG DATABASE:");
    console.log("=======================================================");
    for (const u of SEED_USERS) {
      console.log(`- [${u.roleCode.padEnd(16)}] Email: ${u.email.padEnd(25)} Mật khẩu: ${u.password}`);
    }
    console.log("=======================================================\n");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error setting up users:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

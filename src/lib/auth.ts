import { betterAuth } from "better-auth";
import { Pool } from "pg";

/**
 * Cấu hình Better Auth cho Signage ERP
 * Sử dụng PostgreSQL (Supabase) lưu trữ bảng user, session, account.
 */
export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL || "",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      console.log(`[AUTH] Reset password requested for ${user.email}. URL: ${url}, Token: ${token}`);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 ngày
    updateAge: 60 * 60 * 24, // Cập nhật session sau mỗi 24h
  },
});

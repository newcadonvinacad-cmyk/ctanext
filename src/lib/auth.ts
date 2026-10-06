import { betterAuth } from "better-auth";
import { dbPool } from "./db";


export const auth = betterAuth({
  database: dbPool,
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

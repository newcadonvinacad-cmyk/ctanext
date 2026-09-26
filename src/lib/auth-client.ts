"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Better Auth Client dùng trên giao diện React / Next.js
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
});

export const { signIn, signUp, signOut, useSession } = authClient;

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

interface CachedSession {
  session: any;
  expiresAt: number;
}

const globalForSessionCache = globalThis as unknown as {
  authSessionCache?: Map<string, CachedSession>;
  inFlightSessionPromises?: Map<string, Promise<any>>;
};

const sessionCache =
  globalForSessionCache.authSessionCache ??
  new Map<string, CachedSession>();

const inFlightPromises =
  globalForSessionCache.inFlightSessionPromises ??
  new Map<string, Promise<any>>();

globalForSessionCache.authSessionCache = sessionCache;
globalForSessionCache.inFlightSessionPromises = inFlightPromises;

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessionCache.entries()) {
      if (value.expiresAt <= now) {
        sessionCache.delete(key);
      }
    }
  }, 60000);
}

export async function getCachedSession() {
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") || "";

  const match =
    cookieHeader.match(/__Secure-better-auth\.session_token=([^;]+)/) ||
    cookieHeader.match(/better-auth\.session_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  const now = Date.now();

  if (token) {
    const cached = sessionCache.get(token);
    if (cached && cached.expiresAt > now) {
      return cached.session;
    }

    const pending = inFlightPromises.get(token);
    if (pending) {
      return await pending;
    }
  }

  const fetchPromise = (async () => {
    try {
      const session = await auth.api.getSession({ headers: reqHeaders });
      if (session?.user && token) {
        sessionCache.set(token, {
          session,
          expiresAt: Date.now() + 30000, // Cache 30 giây
        });
      }
      return session;
    } finally {
      if (token) {
        inFlightPromises.delete(token);
      }
    }
  })();

  if (token) {
    inFlightPromises.set(token, fetchPromise);
  }

  return await fetchPromise;
}

export function invalidateSessionCache(token?: string) {
  if (token) {
    sessionCache.delete(token);
    inFlightPromises.delete(token);
  } else {
    sessionCache.clear();
    inFlightPromises.clear();
  }
}

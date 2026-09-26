"use client";

import * as React from "react";
import { PermissionKey, ScopeKind, UserCapability } from "@/types/iam";
import { SCREEN_REQUIREMENTS } from "@/constants/permissions";

interface AuthContextValue {
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  roles: { id: string; code: string; name: string }[];
  capabilities: Record<PermissionKey, UserCapability>;
  defaultRoute: string;
  isLoading: boolean;
  can: (
    permission: PermissionKey,
    options?: { amount?: number; currency?: string }
  ) => boolean;
  canAccessScreen: (screenCode: string) => boolean;
  refetch: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [roles, setRoles] = React.useState<
    { id: string; code: string; name: string }[]
  >([]);
  const [capabilities, setCapabilities] = React.useState<
    Record<PermissionKey, UserCapability>
  >({} as any);
  const [defaultRoute, setDefaultRoute] = React.useState<string>("/");
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchCapabilities = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setRoles(data.roles || []);
        setCapabilities(data.capabilities || {});
        setDefaultRoute(data.defaultRoute || "/");
      } else {
        setUser(null);
        setRoles([]);
        setCapabilities({} as any);
      }
    } catch (e) {
      console.error("Lỗi khi tải capabilities:", e);
      setUser(null);
      setRoles([]);
      setCapabilities({} as any);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCapabilities();

    const handleSessionChange = () => {
      fetchCapabilities();
    };

    window.addEventListener("auth-session-changed", handleSessionChange);
    return () => {
      window.removeEventListener("auth-session-changed", handleSessionChange);
    };
  }, [fetchCapabilities]);

  /**
   * Kiểm tra quyền người dùng đối với một hành động
   * Tuyệt đối không kiểm tra theo tên role hardcode (theo Mục 10 MA_TRAN_PHAN_QUYEN_DONG.md)
   */
  const can = React.useCallback(
    (
      permission: PermissionKey,
      options?: { amount?: number; currency?: string }
    ): boolean => {
      const cap = capabilities[permission];
      if (!cap || !cap.isEnabled) return false;

      // Kiểm tra hạn mức tiền nếu có
      if (
        options?.amount &&
        cap.amountLimit !== null &&
        cap.amountLimit !== undefined
      ) {
        if (options.amount > cap.amountLimit) {
          return false;
        }
      }

      return true;
    },
    [capabilities]
  );

  /**
   * Kiểm tra điều kiện mở màn hình M00–M20 (Mục 6 MA_TRAN_PHAN_QUYEN_DONG.md)
   */
  const canAccessScreen = React.useCallback(
    (screenCode: string): boolean => {
      const rule = SCREEN_REQUIREMENTS[screenCode];
      if (!rule) return true;
      if (rule.permissions.length === 0) return true;

      if (rule.anyOf) {
        return rule.permissions.some((p) => capabilities[p]?.isEnabled);
      } else {
        return rule.permissions.every((p) => capabilities[p]?.isEnabled);
      }
    },
    [capabilities]
  );

  const value = React.useMemo(
    () => ({
      user,
      roles,
      capabilities,
      defaultRoute,
      isLoading,
      can,
      canAccessScreen,
      refetch: fetchCapabilities,
    }),
    [user, roles, capabilities, defaultRoute, isLoading, can, canAccessScreen, fetchCapabilities]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthorization() {
  const context = React.useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      roles: [],
      capabilities: {} as Record<PermissionKey, UserCapability>,
      defaultRoute: "/",
      isLoading: false,
      can: () => true,
      canAccessScreen: () => true,
      refetch: async () => {},
    };
  }
  return context;
}

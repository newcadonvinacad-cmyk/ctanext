"use client";

import * as React from "react";
import { PermissionKey, ScopeKind, UserCapability } from "@/types/iam";
import { SCREEN_REQUIREMENTS } from "@/constants/permissions";

interface AuthContextValue {
  user: {
    id: string;
    email: string;
    name: string;
    membershipId?: string | null;
    employeeId?: string | null;
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
    membershipId?: string | null;
    employeeId?: string | null;
  } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const c = sessionStorage.getItem("erp_auth_user");
        return c ? JSON.parse(c) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [roles, setRoles] = React.useState<
    { id: string; code: string; name: string }[]
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const c = sessionStorage.getItem("erp_auth_roles");
        return c ? JSON.parse(c) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [capabilities, setCapabilities] = React.useState<
    Record<PermissionKey, UserCapability>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const c = sessionStorage.getItem("erp_auth_capabilities");
        return c ? JSON.parse(c) : ({} as any);
      } catch {
        return {} as any;
      }
    }
    return {} as any;
  });

  const [defaultRoute, setDefaultRoute] = React.useState<string>("/");
  const [isLoading, setIsLoading] = React.useState(() => {
    if (typeof window !== "undefined") {
      try {
        return !sessionStorage.getItem("erp_auth_user");
      } catch {
        return true;
      }
    }
    return true;
  });

  const fetchCapabilities = React.useCallback(async (silent = false) => {
    if (!silent && !sessionStorage.getItem("erp_auth_user")) {
      setIsLoading(true);
    }
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setRoles(data.roles || []);
        setCapabilities(data.capabilities || {});
        setDefaultRoute(data.defaultRoute || "/");
        if (typeof window !== "undefined") {
          sessionStorage.setItem("erp_auth_user", JSON.stringify(data.user));
          sessionStorage.setItem("erp_auth_roles", JSON.stringify(data.roles || []));
          sessionStorage.setItem("erp_auth_capabilities", JSON.stringify(data.capabilities || {}));
        }
      } else {
        setUser(null);
        setRoles([]);
        setCapabilities({} as any);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("erp_auth_user");
          sessionStorage.removeItem("erp_auth_roles");
          sessionStorage.removeItem("erp_auth_capabilities");
        }
      }
    } catch (e) {
      console.error("Lỗi khi tải capabilities:", e);
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

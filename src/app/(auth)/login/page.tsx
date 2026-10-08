"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  toast,
  LogoProgressLoader,
} from "@/components/ui";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Xử lý xác thực người dùng thật qua Better Auth
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg("Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Xác thực tài khoản trực tiếp trên Better Auth (kết nối PostgreSQL)
      const result = await authClient.signIn.email({
        email: cleanEmail,
        password,
        rememberMe,
      });

      if (result.error) {
        setErrorMsg(
          result.error.message ||
            "Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!"
        );
        setIsLoading(false);
        return;
      }

      // 2. Lấy thông tin phân quyền động thực tế từ cơ sở dữ liệu
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          window.dispatchEvent(new Event("auth-session-changed"));
          toast.success(
            `Đăng nhập thành công! Xin chào ${meData.user?.name || cleanEmail}.`
          );

          // Điều hướng về trang redirect được yêu cầu hoặc điểm vào mặc định theo vai trò trong DB
          const targetRoute = redirectParam || meData.defaultRoute || "/";
          router.push(targetRoute);
          return;
        }
      } catch (meErr) {
        console.warn("Lỗi nạp capabilities phiên:", meErr);
      }

      // Fallback nếu không nạp được me
      toast.success("Đăng nhập thành công!");
      router.push(redirectParam || "/");
    } catch (err: any) {
      console.error("Lỗi đăng nhập:", err);
      setErrorMsg(
        err.message || "Đã xảy ra lỗi khi kết nối tới máy chủ xác thực. Vui lòng thử lại!"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng nhập Single Sign-On (Google Workspace Doanh nghiệp)
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin + (redirectParam || "/"),
      });
    } catch (e: any) {
      setErrorMsg("Không thể kết nối cổng đăng nhập Google SSO.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Đăng nhập
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Dùng tài khoản được cấp để vào không gian làm việc của xưởng và dự án.
        </p>
      </div>

      {/* Thông báo lỗi xác thực */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {/* Form Đăng Nhập Doanh Nghiệp */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vidu@signage-erp.vn"
              required
              disabled={isLoading}
              className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Mật khẩu <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
              disabled={isLoading}
              className="w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-400 w-3.5 h-3.5"
            />
            <span className="font-medium">Ghi nhớ đăng nhập</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-slate-800 font-semibold hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Nút Submit */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full py-2.5 font-bold flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang xác thực...</span>
            </>
          ) : (
            <>
              <span>Đăng nhập</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {/* Phân cách SSO */}
      <div className="relative flex items-center justify-center my-5">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-[11px] text-slate-400 shrink-0">
          hoặc
        </span>
        <div className="border-t border-slate-200 w-full" />
      </div>

      {/* Google SSO Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full py-2.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition flex items-center justify-center gap-2.5 text-xs font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Tiếp tục với Google</span>
      </button>

      {/* Ghi chú bảo mật */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>Phiên đăng nhập được bảo vệ theo quyền của tài khoản</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-12 flex items-center justify-center">
          <LogoProgressLoader
            variant="inline"
            size="md"
            title="ĐĂNG NHẬP HỆ THỐNG"
            statusText="Đang chuẩn bị không gian làm việc..."
          />
        </div>
      }
    >
      <LoginFormContent />
    </React.Suspense>
  );
}

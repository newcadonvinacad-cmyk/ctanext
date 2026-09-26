"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, toast } from "@/components/ui";
import { Lock, Eye, EyeOff, Check, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Đánh giá độ mạnh mật khẩu
  const strengthCriteria = React.useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = Object.values(strengthCriteria).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Mã xác thực (token) không tồn tại hoặc đã hết hạn! Vui lòng yêu cầu cấp lại từ email.");
      return;
    }

    if (!password || !confirmPassword) {
      toast.error("Vui lòng điền đầy đủ các trường!");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (password.length < 8) {
      toast.error("Mật khẩu phải có tối thiểu 8 ký tự!");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        throw new Error(error.message || "Đặt lại mật khẩu thất bại");
      }
      toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật mật khẩu, vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-200">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Thiết lập mật khẩu mới
        </h1>
        <p className="text-xs text-slate-500">
          Vui lòng chọn mật khẩu đủ mạnh để bảo vệ dữ liệu doanh nghiệp và công nợ.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mật khẩu mới */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mật khẩu mới <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự..."
              required
              className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Thanh đo độ mạnh mật khẩu */}
          {password.length > 0 && (
            <div className="space-y-1.5 mt-2">
              <div className="flex gap-1 h-1.5 w-full">
                <div
                  className={`flex-1 rounded-full transition-colors ${
                    strengthScore >= 1 ? "bg-rose-500" : "bg-slate-200"
                  }`}
                />
                <div
                  className={`flex-1 rounded-full transition-colors ${
                    strengthScore >= 2 ? "bg-amber-500" : "bg-slate-200"
                  }`}
                />
                <div
                  className={`flex-1 rounded-full transition-colors ${
                    strengthScore >= 3 ? "bg-blue-500" : "bg-slate-200"
                  }`}
                />
                <div
                  className={`flex-1 rounded-full transition-colors ${
                    strengthScore >= 4 ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1">
                <span
                  className={`flex items-center gap-1 ${
                    strengthCriteria.minLength ? "text-emerald-600 font-bold" : ""
                  }`}
                >
                  <Check className="w-3 h-3" /> Tối thiểu 8 ký tự
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    strengthCriteria.hasLetter ? "text-emerald-600 font-bold" : ""
                  }`}
                >
                  <Check className="w-3 h-3" /> Chứa chữ cái
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    strengthCriteria.hasNumber ? "text-emerald-600 font-bold" : ""
                  }`}
                >
                  <Check className="w-3 h-3" /> Chứa số (0-9)
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    strengthCriteria.hasSpecial ? "text-emerald-600 font-bold" : ""
                  }`}
                >
                  <Check className="w-3 h-3" /> Ký tự đặc biệt (@, #...)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu..."
              required
              className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white font-mono"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full font-bold shadow-sm shadow-blue-500/20"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang cập nhật...
            </>
          ) : (
            <>
              Xác nhận đổi mật khẩu
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </>
          )}
        </Button>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold transition"
          >
            Quay lại trang Đăng nhập
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-8 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-500 font-medium">Đang tải biểu mẫu xác thực...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </React.Suspense>
  );
}

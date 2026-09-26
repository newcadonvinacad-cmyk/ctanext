"use client";

import * as React from "react";
import Link from "next/link";
import { Button, toast } from "@/components/ui";
import { Mail, ArrowLeft, CheckCircle2, Loader2, KeyRound } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Vui lòng nhập địa chỉ email!");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: "/reset-password",
      });
      if (error) {
        throw new Error(error.message || "Không thể gửi yêu cầu đặt lại mật khẩu");
      }
      setIsSubmitted(true);
      toast.success("Đã gửi liên kết khôi phục mật khẩu!");
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra, vui lòng thử lại sau!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-200">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Quên mật khẩu?
        </h1>
        <p className="text-xs text-slate-500">
          Đừng lo lắng, hãy nhập email công việc của bạn để nhận hướng dẫn khôi phục.
        </p>
      </div>

      {isSubmitted ? (
        <div className="p-5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-emerald-950">
              Kiểm tra hộp thư điện tử
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Hệ thống đã gửi hướng dẫn đặt lại mật khẩu đến:
              <br />
              <strong className="font-mono text-emerald-900">{email}</strong>
            </p>
          </div>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="primary" size="sm" className="w-full">
                Quay lại trang Đăng nhập
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email tài khoản đăng ký <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten.nguoidung@signage-erp.vn"
                required
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Hệ thống sẽ gửi mã xác thực gồm 6 chữ số hoặc đường dẫn đặt lại mật khẩu an toàn.
            </p>
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
                Đang gửi yêu cầu...
              </>
            ) : (
              "Gửi liên kết khôi phục"
            )}
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

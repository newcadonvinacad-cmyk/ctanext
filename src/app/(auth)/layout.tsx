import * as React from "react";
import Link from "next/link";
import { SignageLogo } from "@/components/brand/SignageLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100 antialiased text-slate-900">
      {/* Logo */}
      <div className="pt-10 flex justify-center">
        <Link href="/login" className="inline-flex items-center">
          <SignageLogo
            size="md"
            showText={true}
            subtitle="Hệ thống quản trị xưởng biển bảng"
            animated={false}
          />
        </Link>
      </div>

      {/* Form đăng nhập ở giữa */}
      <div className="flex-1 flex items-start justify-center px-4 pt-8 pb-6">
        <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-6 text-center text-[11px] text-slate-400">
        © 2026 Signage ERP • Nội bộ doanh nghiệp
      </div>
    </div>
  );
}

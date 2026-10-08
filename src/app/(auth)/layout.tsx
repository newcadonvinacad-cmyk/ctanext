import * as React from "react";
import Link from "next/link";
import { SignageLogo } from "@/components/brand/SignageLogo";
import {
  Layers,
  ShieldCheck,
  Calculator,
  Camera,
  Boxes,
  CheckCircle2,
} from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex bg-slate-50 antialiased text-slate-900">
      {/* 1. CỘT TRÁI: Khu vực Form xác thực */}
      <div className="w-full lg:w-[500px] xl:w-[560px] flex flex-col justify-between p-6 sm:p-10 md:p-12 bg-white border-r border-slate-200 shrink-0 min-h-screen">
        {/* Header: Logo & Tên hệ thống */}
        <div>
          <Link href="/login" className="inline-flex items-center group">
            <SignageLogo
              size="md"
              showText={true}
              subtitle="Hệ Thống Quản Trị Xưởng Biển Quảng Cáo"
              animated={true}
            />
          </Link>
        </div>

        {/* Nội dung trang con (Login / Forgot / Reset) */}
        <div className="my-auto py-8">{children}</div>

        {/* Footer: Thông tin bảo mật & Bản quyền */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Bảo mật 256-bit • Supabase & Better Auth</span>
          </div>
          <span>© 2026 Signage ERP System</span>
        </div>
      </div>

      {/* 2. CỘT PHẢI: Giới thiệu giải pháp (Ẩn trên mobile) */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-slate-900 text-slate-100 relative overflow-hidden select-none">
        {/* Top Tagline */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
            Quản trị xưởng biển bảng khép kín
          </span>
          <span className="text-xs text-slate-500 tabular-nums">
            Phiên bản 2.5
          </span>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 max-w-xl space-y-8 my-auto">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
              Tối ưu từng mét bạt in,
              <br />
              minh bạch từng đồng công thợ.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Giải pháp quản trị cho xưởng sản xuất biển hiệu, thi công và lắp đặt:
              từ báo giá, vật tư, tiến độ đến thu chi và lương.
            </p>
          </div>

          {/* 4 trụ cột */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="flex items-start gap-3">
              <Calculator className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white">Bóc tách & báo giá</h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                  Định mức khung sắt, alu, LED theo số đo thực tế.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Boxes className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white">Kho & vật tư</h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                  Tồn kho đa điểm, phiếu nhập xuất, cảnh báo thiếu hụt.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Camera className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white">Hiện trường GPS</h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                  Check-in vị trí, ảnh watermark, ký số nghiệm thu.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Layers className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white">Tiến độ & thu chi</h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                  WBS công việc, sổ quỹ công trình, chấm công tính lương.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center gap-1.5 text-xs text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-slate-500" />
          <span>Dữ liệu đồng bộ thời gian thực trên mọi phân hệ</span>
        </div>
      </div>
    </div>
  );
}

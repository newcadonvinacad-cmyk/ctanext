import * as React from "react";
import Link from "next/link";
import {
  Layers,
  ShieldCheck,
  Sparkles,
  Camera,
  Boxes,
  Calculator,
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
          <Link href="/login" className="inline-flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/25 group-hover:bg-blue-500 transition">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  SIGNAGE ERP
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Hệ Thống Quản Trị Xưởng Biển Quảng Cáo
              </p>
            </div>
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

      {/* 2. CỘT PHẢI: Showcase Giải pháp Signage ERP (Ẩn trên mobile) */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-slate-900 text-slate-100 relative overflow-hidden select-none">
        {/* Background gradient & decorative glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Tagline */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-blue-400 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Nền tảng Quản trị Sản xuất & Thi công Khép kín
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Phiên bản 2.5 (2026)
          </span>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 max-w-xl space-y-8 my-auto">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Tối ưu từng mét bạt in,
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">
                Minh bạch từng đồng công thợ.
              </span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Giải pháp chuyên sâu được thiết kế riêng cho ngành sản xuất biển hiệu,
              alu, led ma trận và in phun quảng cáo khổ lớn.
            </p>
          </div>

          {/* Grid 4 trụ cột */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm space-y-1.5 hover:border-blue-500/40 transition">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Bóc Tách Dự Toán Kỹ Thuật</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Tự động tính khung sắt hộp, m² alu, nguồn điện 12V & xuất PDF báo giá chuẩn in.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm space-y-1.5 hover:border-blue-500/40 transition">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Hệ Thống Quản Trị Đa Kho</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Theo dõi kho xưởng SX, kho xe lưu động, kho phân phối & kiểm soát tấm alu cắt lẻ.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm space-y-1.5 hover:border-blue-500/40 transition">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Tác Nghiệp GPS 1 Chạm</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Check-in tọa độ công trình, ảnh đóng dấu watermark chống gian lận & ký số nghiệm thu.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm space-y-1.5 hover:border-blue-500/40 transition">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Trợ Lý AI & OCR Hóa Đơn</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Quét hóa đơn vật tư ngoài chợ bằng ảnh chụp, bóc tách tiến độ bằng giọng nói.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof / Trust Metrics */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-6">
            <div>
              <span className="block text-base font-bold text-white font-mono">10.000+</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">m² Biển Bảng/Tháng</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="block text-base font-bold text-white font-mono">99.9%</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">SLA Hoạt Động</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="block text-base font-bold text-emerald-400 font-mono">0 Đồng</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Thất Thoát Vật Tư</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Đã kiểm nghiệm thực tế</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, Home, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuthorization } from "@/hooks/use-authorization";

interface AccessDeniedProps {
  screenCode?: string;
  screenName?: string;
  requiredPermission?: string;
}

export function AccessDenied({
  screenCode,
  screenName,
  requiredPermission,
}: AccessDeniedProps) {
  const router = useRouter();
  const { user, roles, defaultRoute } = useAuthorization();

  const roleName = roles.length > 0 ? roles[0].name : "Thành viên";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center space-y-6">
        {/* Biểu tượng cảnh báo bảo mật */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Tiêu đề & Mã màn hình */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            <span>403 - KHÔNG CÓ QUYỀN TRUY CẬP</span>
            {screenCode && <span>[{screenCode}]</span>}
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {screenName ? `Từ chối truy cập: ${screenName}` : "Phân hệ yêu cầu quyền hạn cao hơn"}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tài khoản <span className="font-semibold text-slate-700">{user?.email || "của bạn"}</span> với vai trò <span className="font-semibold text-blue-600">{roleName}</span> chưa được cấp quyền truy cập tính năng này trong hệ thống phân quyền động.
          </p>
        </div>

        {/* Chi tiết kỹ thuật */}
        {requiredPermission && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-left text-xs font-mono text-slate-600 space-y-1">
            <div className="text-[10px] text-slate-400 font-sans uppercase font-bold">
              Quyền yêu cầu từ ma trận:
            </div>
            <div className="text-blue-700 font-semibold break-all">
              {requiredPermission}
            </div>
          </div>
        )}

        {/* Nút thao tác */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 text-xs"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Quay lại trang trước
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1 text-xs font-bold shadow-sm"
            onClick={() => router.push(defaultRoute || "/")}
          >
            <Home className="w-3.5 h-3.5 mr-1.5" />
            Về bàn làm việc chính
          </Button>
        </div>

        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Nếu cần cấp quyền này, vui lòng liên hệ Ban Giám Đốc hoặc Quản trị hệ thống.</span>
        </p>
      </div>
    </div>
  );
}

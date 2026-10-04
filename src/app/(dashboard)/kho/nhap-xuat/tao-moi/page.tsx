"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Trang cũ /kho/nhap-xuat/tao-moi đã được bãi bỏ theo quy chuẩn mới.
 * Tự động chuyển hướng sang /kho/nhap-xuat với query mở Modal hiện đại (CreateStockDocModal).
 */
export default function DeprecatedTaoMoiRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("create", "true");
    router.replace(`/kho/nhap-xuat?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      <p className="text-sm font-medium">Đang chuyển tiếp tới giao diện tạo phiếu kho hiện đại...</p>
    </div>
  );
}

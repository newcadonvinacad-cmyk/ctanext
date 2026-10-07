"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Định mức & Bóc tách BOM đã được chuyển thành một Tab tiêu chuẩn
 * bên trong Danh mục Vật tư & Quy cách (/vat-tu?tab=bom).
 * Tự động chuyển tiếp người dùng sang trang mới.
 */
export default function DinhMucBomRedirectPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/vat-tu?tab=bom");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      <p className="text-sm font-medium">Đang chuyển tiếp tới Định Mức & Bóc Tách BOM trong Danh mục Vật tư...</p>
    </div>
  );
}

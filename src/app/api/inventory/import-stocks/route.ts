import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthorizationService } from "@/services/authorization.service";
import { InventoryService } from "@/services/inventory.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const canImport =
      capabilities["inventory.adjust"]?.isEnabled ||
      capabilities["stock_document.create"]?.isEnabled;

    if (!canImport) {
      return NextResponse.json(
        { error: "Không có quyền điều chỉnh số dư tồn kho hàng loạt (yêu cầu quyền 'inventory.adjust')" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { rows, warehouseId } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Không có dòng dữ liệu hợp lệ nào để nhập" },
        { status: 400 }
      );
    }

    if (!warehouseId) {
      return NextResponse.json(
        { error: "Vui lòng chọn kho nhận trước khi nhập tồn kho" },
        { status: 400 }
      );
    }

    const result = await InventoryService.importStocksFromExcel(
      rows,
      warehouseId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("POST /api/inventory/import-stocks ERROR:", err);
    return NextResponse.json(
      { error: "Lỗi nhập file tồn kho", details: err.message },
      { status: 500 }
    );
  }
}

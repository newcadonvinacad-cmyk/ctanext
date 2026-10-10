import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["inventory.read"]?.isEnabled && !capabilities["stock_document.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem kiểm kê kho" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId") || undefined;

    const counts = await InventoryService.listInventoryCounts(warehouseId);
    return NextResponse.json({ counts });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách phiếu kiểm kê", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["inventory.count"]?.isEnabled && !capabilities["stock_document.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo phiếu kiểm kê (yêu cầu quyền 'inventory.count' hoặc 'stock_document.create')" }, { status: 403 });
    }

    const body = await req.json();
    const { warehouseId, lines } = body;

    if (!warehouseId || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn kho và nhập ít nhất một mặt hàng kiểm kê" },
        { status: 400 }
      );
    }

    const created = await InventoryService.createInventoryCount(
      { warehouseId, lines },
      session.user.id
    );

    return NextResponse.json({ count: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo phiếu kiểm kê", details: err.message },
      { status: 500 }
    );
  }
}

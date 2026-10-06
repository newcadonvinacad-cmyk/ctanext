import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";
import { InventoryService } from "@/services/inventory.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["item.read"]?.isEnabled && !capabilities["stock_document.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền truy cập danh mục vật tư" }, { status: 403 });
    }

    const canViewCost = !!capabilities["item.cost_read"]?.isEnabled;

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const isActiveStr = searchParams.get("isActive");
    const isActive = isActiveStr !== null ? isActiveStr === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const result = await InventoryService.listItems(
      { keyword, categoryId, isActive, limit, offset },
      { canViewCost }
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh mục vật tư", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["item.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo vật tư mới" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.code || !body.name || !body.categoryId || !body.baseUnitId) {
      return NextResponse.json(
        { error: "Mã SKU, Tên vật tư, Nhóm ngành và Đơn vị tính cơ sở là bắt buộc!" },
        { status: 400 }
      );
    }

    const item = await InventoryService.createItem(body, session.user.id);
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo vật tư", details: err.message },
      { status: 400 }
    );
  }
}

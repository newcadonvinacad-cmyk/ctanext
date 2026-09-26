import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["item.read"]?.isEnabled && !capabilities["inventory.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chi tiết vật tư" }, { status: 403 });
    }

    const canViewCost = !!capabilities["item.cost_read"]?.isEnabled;
    const data = await InventoryService.getItemById(id, { canViewCost });

    if (!data) {
      return NextResponse.json({ error: "Không tìm thấy vật tư" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: data.item, stocks: data.stocks });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải chi tiết vật tư", details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["item.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền chỉnh sửa vật tư" }, { status: 403 });
    }

    const body = await req.json();
    await InventoryService.updateItem(id, body, session.user.id);

    return NextResponse.json({ success: true, message: "Đã cập nhật thông tin vật tư thành công" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật vật tư", details: err.message },
      { status: 400 }
    );
  }
}

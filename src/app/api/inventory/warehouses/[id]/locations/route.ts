import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const locations = await InventoryService.listWarehouseLocations(id);
    return NextResponse.json({ locations });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách vị trí kho", details: err.message },
      { status: 400 }
    );
  }
}

export async function POST(
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
    if (!capabilities["item.update"]?.isEnabled && !capabilities["stock_document.create"]?.isEnabled) {
      return NextResponse.json({ error: "Bạn không có quyền quản lý vị trí kho" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Mã và tên vị trí là bắt buộc" }, { status: 400 });
    }

    const location = await InventoryService.createWarehouseLocation(id, body, session.user.id);
    return NextResponse.json({ success: true, location }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo vị trí kho", details: err.message },
      { status: 400 }
    );
  }
}

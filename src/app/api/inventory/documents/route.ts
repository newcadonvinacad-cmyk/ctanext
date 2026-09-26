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
    if (!capabilities["stock_document.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem danh sách phiếu kho" }, { status: 403 });
    }

    const canViewCost = !!capabilities["item.cost_read"]?.isEnabled || !!capabilities["stock_document.cost_read"]?.isEnabled;

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") as any) || undefined;
    const status = searchParams.get("status") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const pendingOnly = searchParams.get("pendingOnly") === "true";

    const userApprovalLimit = capabilities["stock_document.approve"]?.amountLimit;

    const documents = await InventoryService.listDocuments(
      { type, status, warehouseId, pendingOnly, userApprovalLimit },
      { canViewCost }
    );

    return NextResponse.json({ documents });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách phiếu kho", details: err.message },
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
    if (!capabilities["stock_document.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo phiếu kho" }, { status: 403 });
    }

    const body = await req.json();
    const purpose =
      body.purpose?.trim() ||
      body.reason?.trim() ||
      (body.type === "receipt"
        ? "Nhập kho vật tư"
        : body.type === "issue"
        ? "Xuất kho vật tư"
        : "Điều chuyển kho");

    if (!body.type || !body.lines || body.lines.length === 0) {
      return NextResponse.json(
        { error: "Loại phiếu và Danh sách chi tiết vật tư là bắt buộc!" },
        { status: 400 }
      );
    }

    const documentId = await InventoryService.createDocument(
      { ...body, purpose },
      session.user.id
    );
    return NextResponse.json({ success: true, documentId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo phiếu kho", details: err.message },
      { status: 400 }
    );
  }
}

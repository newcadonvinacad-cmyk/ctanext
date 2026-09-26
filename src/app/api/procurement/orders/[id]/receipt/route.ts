import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProcurementService } from "@/services/procurement.service";
import { InventoryService } from "@/services/inventory.service";
import { AuthorizationService, getDbPool } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

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
    if (!capabilities["purchase_order.read"]?.isEnabled && !capabilities["stock_document.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo đề xuất nhập kho cho đơn mua" }, { status: 403 });
    }

    const po = await ProcurementService.getPurchaseOrderById(id);
    if (!po) {
      return NextResponse.json({ error: "Không tìm thấy đơn mua hàng" }, { status: 404 });
    }

    if (!po.lines || po.lines.length === 0) {
      return NextResponse.json({ error: "Đơn mua hàng không có danh mục vật tư nào để nhập kho!" }, { status: 400 });
    }

    const body = await req.json();
    const { destinationWarehouseId, reason, receivedLines, markOrderCompleted } = body;

    if (!destinationWarehouseId) {
      return NextResponse.json({ error: "Vui lòng chọn Kho nhập hàng!" }, { status: 400 });
    }

    let docLines: Array<{
      itemId: string;
      unitId: string;
      qty: number;
      unitCostSnapshot?: number;
      purchaseLineId?: string;
    }> = [];

    if (Array.isArray(receivedLines) && receivedLines.length > 0) {
      docLines = receivedLines
        .filter((l: any) => l.qty > 0)
        .map((l: any) => ({
          itemId: l.itemId,
          unitId: l.unitId,
          qty: Number(l.qty),
          unitCostSnapshot: Number(l.unitPrice || 0),
          purchaseLineId: l.purchaseLineId || l.id || null,
        }));
    } else {
      docLines = po.lines.map((l) => ({
        itemId: l.itemId,
        unitId: l.unitId,
        qty: Number(l.qty),
        unitCostSnapshot: Number(l.unitPrice || 0),
        purchaseLineId: l.id,
      }));
    }

    if (docLines.length === 0) {
      return NextResponse.json({ error: "Số lượng vật tư thực nhận phải lớn hơn 0!" }, { status: 400 });
    }

    const purpose = `Nhập kho theo đơn mua hàng ${po.code} (${po.supplierName})`;
    const docReason = reason?.trim() || `Đề xuất nhập kho đối soát theo đơn đặt hàng ${po.code}`;

    const documentId = await InventoryService.createDocument(
      {
        type: "receipt",
        purpose,
        reason: docReason,
        destinationWarehouseId,
        projectId: po.projectId || null,
        submitNow: true,
        lines: docLines,
      },
      session.user.id
    );

    const pool = getDbPool();
    const docRes = await pool.query(
      "SELECT code FROM erp.stock_documents WHERE id = $1 LIMIT 1",
      [documentId]
    );
    const documentCode = docRes.rows[0]?.code || documentId;

    if (markOrderCompleted !== false) {
      await pool.query(
        "UPDATE erp.purchase_orders SET status = 'completed', updated_at = now(), updated_by = $1 WHERE id = $2",
        [session.user.id, po.id]
      );
    }

    return NextResponse.json({
      success: true,
      documentId,
      documentCode,
      message: `Đã tạo phiếu đề xuất nhập kho ${documentCode} thành công từ đơn mua ${po.code}!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Lỗi tạo phiếu đề xuất nhập kho" },
      { status: 500 }
    );
  }
}

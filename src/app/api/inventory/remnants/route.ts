import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["inventory.read"]?.isEnabled && !capabilities["stock_document.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem kho tấm lẻ" }, { status: 403 });
    }

    const canViewCost = !!capabilities["item.cost_read"]?.isEnabled;
    const remnants = await InventoryService.listRemnants({ canViewCost });

    return NextResponse.json({ remnants });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải kho tấm lẻ phế liệu", details: err.message },
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
    if (
      !capabilities["stock_document.create"]?.isEnabled &&
      !capabilities["inventory.update"]?.isEnabled
    ) {
      return NextResponse.json(
        { error: "Không có quyền thực hiện cắt tận dụng tấm lẻ" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { sourceRemnantId, cutLengthMm, cutWidthMm, projectId } = body;

    if (!sourceRemnantId) {
      return NextResponse.json(
        { error: "Thiếu mã định danh tấm lẻ nguồn (sourceRemnantId)" },
        { status: 400 }
      );
    }

    const length = Number(cutLengthMm);
    const width = Number(cutWidthMm);

    if (isNaN(length) || length <= 0 || isNaN(width) || width <= 0) {
      return NextResponse.json(
        { error: "Kích thước cắt (dài, rộng) phải là số dương hợp lệ!" },
        { status: 400 }
      );
    }

    const result = await InventoryService.cutRemnant(
      {
        sourceRemnantId,
        cutLengthMm: length,
        cutWidthMm: width,
        projectId,
      },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Cắt tấm lẻ thành công",
      childRemnant: result.childRemnant,
      consumedPiece: result.consumedPiece,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi xử lý cắt tấm lẻ", details: err.message },
      { status: 400 }
    );
  }
}

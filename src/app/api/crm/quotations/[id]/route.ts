import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CrmService } from "@/services/crm.service";
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
    if (!capabilities["quotation.read"]?.isEnabled && !capabilities["sales_order.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chi tiết báo giá" }, { status: 403 });
    }

    const detail = await CrmService.getQuotationDetail(id);

    // F14: Ẩn giá vốn và biên lợi nhuận nếu không có quyền quotation.cost_read
    const canViewCost = Boolean(capabilities["quotation.cost_read"]?.isEnabled);
    if (!canViewCost && detail?.quotation) {
      delete (detail.quotation as any).estimatedCost;
      delete (detail.quotation as any).grossMarginPct;
      if (Array.isArray(detail.lines)) {
        for (const line of detail.lines) {
          if (Array.isArray((line as any).components)) {
            for (const comp of (line as any).components) {
              delete comp.unitCost;
              delete comp.totalCost;
            }
          }
        }
      }
    }

    return NextResponse.json(detail);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải chi tiết báo giá", details: err.message },
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

    const body = await req.json();

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);

    // F12 / Probe 4: Kiểm soát chặt chẽ từng bước chuyển đổi trạng thái báo giá
    if (body.status) {
      if (body.status === "approved") {
        if (!capabilities["quotation.approve"]?.isEnabled) {
          return NextResponse.json({ error: "Không có quyền phê duyệt báo giá (yêu cầu quyền 'quotation.approve')" }, { status: 403 });
        }
        const approveCap = capabilities["quotation.approve"];
        if (approveCap.amountLimit !== null && approveCap.amountLimit !== undefined) {
          const qDetail = await CrmService.getQuotationDetail(id);
          const totalAmount = qDetail?.quotation?.total || 0;
          if (totalAmount > approveCap.amountLimit) {
            return NextResponse.json({
              error: `Số tiền báo giá (${totalAmount.toLocaleString("vi-VN")} đ) vượt quá hạn mức phê duyệt (${approveCap.amountLimit.toLocaleString("vi-VN")} đ)`,
            }, { status: 403 });
          }
        }
      } else if (body.status === "submitted") {
        if (!capabilities["quotation.submit"]?.isEnabled && !capabilities["quotation.create"]?.isEnabled && !capabilities["quotation.update"]?.isEnabled) {
          return NextResponse.json({ error: "Không có quyền gửi duyệt báo giá (yêu cầu quyền 'quotation.submit' hoặc 'quotation.update')" }, { status: 403 });
        }
      } else if (body.status === "cancelled" || body.status === "rejected") {
        if (!capabilities["quotation.approve"]?.isEnabled && !capabilities["quotation.update"]?.isEnabled) {
          return NextResponse.json({ error: "Không có quyền hủy hoặc từ chối báo giá" }, { status: 403 });
        }
      } else {
        if (!capabilities["quotation.update"]?.isEnabled) {
          return NextResponse.json({ error: "Không có quyền cập nhật trạng thái báo giá" }, { status: 403 });
        }
      }

      await CrmService.updateQuotationStatus(id, body.status, session.user.id);
      return NextResponse.json({ success: true, message: `Đã cập nhật trạng thái báo giá sang '${body.status}'` });
    }

    // Nếu cập nhật nội dung báo giá (lines, discount, tax...)
    if (!capabilities["quotation.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền cập nhật báo giá (yêu cầu quyền 'quotation.update')" }, { status: 403 });
    }

    await CrmService.updateQuotation(id, body, session.user.id);
    return NextResponse.json({ success: true, message: "Đã cập nhật chi tiết báo giá thành công" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật báo giá", details: err.message },
      { status: 400 }
    );
  }
}

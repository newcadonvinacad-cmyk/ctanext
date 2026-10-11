import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FinanceService } from "@/services/finance.service";
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
    if (!capabilities["payment.read"]?.isEnabled && !capabilities["project_finance.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem giao dịch thu chi" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const direction = searchParams.get("direction") || undefined;
    const accountId = searchParams.get("accountId") || undefined;

    const payments = await FinanceService.listPayments({ direction, accountId });
    return NextResponse.json({ payments });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải giao dịch", details: err.message },
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
    const canCreate = Boolean(
      capabilities["payment.create"]?.isEnabled ||
      capabilities["payment.submit"]?.isEnabled
    );
    if (!canCreate) {
      return NextResponse.json({ error: "Không có quyền lập phiếu thu/chi" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.direction || !body.amount || !body.purpose || !body.cashAccountId) {
      return NextResponse.json(
        { error: "Vui lòng nhập đủ: Loại phiếu (Thu/Chi), Số tiền, Lý do và Tài khoản quỹ" },
        { status: 400 }
      );
    }

    // F11: Kiểm soát trạng thái ghi sổ trực tiếp / duyệt kèm hạn mức server
    const amount = Number(body.amount) || 0;
    const postCap = capabilities["payment.post"];
    const approveCap = capabilities["payment.approve"];

    // BUG-012, BUG-017: Tuân thủ quy trình chuẩn Lập (submitted) -> Duyệt (approved) -> Ghi sổ (posted).
    // Tuyệt đối không tự ý nhảy thẳng lên 'posted' khi người lập không yêu cầu rõ ràng.
    // Ngoại lệ ghi sổ trực tiếp chỉ áp dụng khi client gửi rõ body.status === "posted" VÀ người dùng có quyền payment.post hợp lệ trong hạn mức.
    let targetStatus: "approved" | "draft" | "submitted" | "posted" = "submitted";
    if (body.status === "draft") {
      targetStatus = "draft";
    } else if (body.status === "posted") {
      if (!postCap?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền ghi sổ trực tiếp phiếu thu/chi (yêu cầu quyền payment.post)" }, { status: 403 });
      }
      if (postCap.amountLimit != null && amount > postCap.amountLimit) {
        return NextResponse.json({ error: `Số tiền phiếu (${amount.toLocaleString("vi-VN")} đ) vượt quá hạn mức ghi sổ trực tiếp (${postCap.amountLimit.toLocaleString("vi-VN")} đ)` }, { status: 403 });
      }
      targetStatus = "posted";
    } else if (body.status === "approved") {
      if (!approveCap?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền phê duyệt phiếu thu/chi (yêu cầu quyền payment.approve)" }, { status: 403 });
      }
      if (approveCap.amountLimit != null && amount > approveCap.amountLimit) {
        return NextResponse.json({ error: `Số tiền phiếu (${amount.toLocaleString("vi-VN")} đ) vượt quá hạn mức phê duyệt (${approveCap.amountLimit.toLocaleString("vi-VN")} đ)` }, { status: 403 });
      }
      targetStatus = "approved";
    } else {
      // Mặc định tạo phiếu ở trạng thái chờ duyệt (submitted)
      targetStatus = "submitted";
    }

    const paymentId = await FinanceService.createPayment(
      {
        direction: body.direction,
        amount: body.amount,
        purpose: body.purpose,
        cashAccountId: body.cashAccountId,
        projectId: body.projectId,
        employeeId: body.employeeId,
        partnerId: body.partnerId,
        documentImage: body.documentImage,
        documentFileUrl: body.documentFileUrl,
        documentFileName: body.documentFileName,
        documentFileSize: body.documentFileSize,
        documentMimeType: body.documentMimeType,
        status: targetStatus,
        paidAt: body.paidAt,
        allocatedItemIds: body.allocatedItemIds,
        allocations: body.allocations,
      },
      session.user.id
    );
    return NextResponse.json({ success: true, paymentId, status: targetStatus });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi ghi nhận giao dịch", details: err.message },
      { status: 500 }
    );
  }
}

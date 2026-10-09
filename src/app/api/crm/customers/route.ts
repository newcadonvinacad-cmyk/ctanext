import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CrmService } from "@/services/crm.service";
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
    if (!capabilities["customer.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem danh sách khách hàng" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") || undefined;

    const customers = await CrmService.listCustomers({ keyword });
    return NextResponse.json({ customers });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách khách hàng", details: err.message },
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
    if (!capabilities["customer.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo mới khách hàng" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Tên khách hàng là bắt buộc!" },
        { status: 400 }
      );
    }

    const customerId = await CrmService.createCustomer(body, session.user.id);
    return NextResponse.json({ success: true, customerId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo khách hàng", details: err.message },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProcurementService } from "@/services/procurement.service";
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
    if (!capabilities["supplier.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem danh sách nhà cung cấp" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const suppliers = await ProcurementService.listSuppliers({ search });
    return NextResponse.json({ suppliers });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải nhà cung cấp", details: err.message },
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
    if (!capabilities["supplier.create"]?.isEnabled && !capabilities["supplier.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo nhà cung cấp" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Vui lòng nhập tên nhà cung cấp" }, { status: 400 });
    }

    const supplierId = await ProcurementService.createSupplier(body, session.user.id);
    return NextResponse.json({ success: true, supplierId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo nhà cung cấp", details: err.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProductTemplateService } from "@/services/product-template.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const templates = await ProductTemplateService.listTemplates();
    return NextResponse.json({ templates });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tải mẫu sản phẩm", details: err.message }, { status: 500 });
  }
}

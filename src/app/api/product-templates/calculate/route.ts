import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProductTemplateService } from "@/services/product-template.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.templateId) {
      return NextResponse.json({ error: "Thiếu templateId" }, { status: 400 });
    }

    const result = await ProductTemplateService.calculateBomFromTemplate(body.templateId, {
      widthMeters: Number(body.widthMeters) || 1.0,
      heightMeters: Number(body.heightMeters) || 1.0,
      depthMeters: Number(body.depthMeters) || 0.1,
      quantity: Number(body.quantity) || 1,
      parameters: body.parameters || {},
      selectedSpecs: body.selectedSpecs || {},
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tính định mức theo mẫu", details: err.message },
      { status: 500 }
    );
  }
}

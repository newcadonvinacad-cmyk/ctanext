import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  SignagePhase3Service,
  STANDARD_IRON_OPTIONS,
  STANDARD_SURFACE_OPTIONS,
  STANDARD_LED_OPTIONS,
  STANDARD_POWER_OPTIONS,
} from "@/services/signage-phase3.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    ironOptions: STANDARD_IRON_OPTIONS,
    surfaceOptions: STANDARD_SURFACE_OPTIONS,
    ledOptions: STANDARD_LED_OPTIONS,
    powerOptions: STANDARD_POWER_OPTIONS,
  });
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    const result = SignagePhase3Service.calculateSignageBom(body);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tính toán định mức BOM", details: err.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
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
    if (!capabilities["trip.read"]?.isEnabled && !capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chuyến xe" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const trips = await ProjectService.listTrips({ status });
    return NextResponse.json({ trips });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách chuyến xe", details: err.message },
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
    if (!capabilities["trip.create"]?.isEnabled && !capabilities["project.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo lệnh điều xe" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.vehicleId || !body.driverEmployeeId) {
      return NextResponse.json({ error: "Vui lòng chọn Xe và Lái xe phụ trách" }, { status: 400 });
    }

    const tripId = await ProjectService.createTrip(body, session.user.id);
    return NextResponse.json({ success: true, tripId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo lệnh điều xe", details: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["trip.update"]?.isEnabled && !capabilities["trip.dispatch"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền cập nhật trạng thái chuyến xe" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.tripId || !body.status) {
      return NextResponse.json({ error: "Thiếu tripId hoặc status" }, { status: 400 });
    }

    await ProjectService.updateTripStatus(body.tripId, body.status, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật trạng thái chuyến xe", details: err.message },
      { status: 500 }
    );
  }
}

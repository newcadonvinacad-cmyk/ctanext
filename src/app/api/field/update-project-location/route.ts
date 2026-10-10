import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthorizationService, getDbPool } from "@/services/authorization.service";
import { getCachedOrgId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const canUpdateField = Boolean(
      capabilities["field_event.create"]?.isEnabled ||
      capabilities["task.update"]?.isEnabled ||
      capabilities["project.update"]?.isEnabled
    );

    if (!canUpdateField) {
      return NextResponse.json(
        { error: "Không có quyền cập nhật tọa độ công trình hiện trường" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { projectId, latitude, longitude, address } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Thiếu ID công trình/dự án" }, { status: 400 });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
      isNaN(lat) ||
      isNaN(lon) ||
      !isFinite(lat) ||
      !isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return NextResponse.json(
        { error: "Tọa độ GPS không hợp lệ (latitude: -90..90, longitude: -180..180)" },
        { status: 400 }
      );
    }

    const cleanAddress = typeof address === "string" && address.trim() ? address.trim() : null;

    const pool = getDbPool();
    const orgId = await getCachedOrgId();

    const updateRes = await pool.query(
      `UPDATE erp.projects
       SET latitude = $1,
           longitude = $2,
           address = COALESCE($3, address),
           updated_at = now(),
           updated_by = $4
       WHERE organization_id = $5 AND id = $6
       RETURNING id, code, name, address, latitude, longitude`,
      [lat, lon, cleanAddress, session.user.id, orgId, projectId]
    );

    if (updateRes.rowCount === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy dự án hoặc không có quyền truy cập" },
        { status: 404 }
      );
    }

    const updated = updateRes.rows[0];

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật vị trí & tọa độ GPS công trình thành công",
      project: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        address: updated.address,
        latitude: Number(updated.latitude),
        longitude: Number(updated.longitude),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật tọa độ công trình", details: err.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function fetchAddressFromBigDataCloud(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`,
      {
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const parts = [
      data.locality || data.district,
      data.city || data.localityInfo?.administrative?.[2]?.name,
      data.principalSubdivision,
    ].filter(Boolean);
    const uniqueParts = Array.from(new Set(parts));
    if (uniqueParts.length > 0) {
      return uniqueParts.join(", ");
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchAddressFromNominatim(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=vi`,
      {
        headers: {
          "User-Agent": "Signage-ERP-App/2.0 (ERP Signage Field Management)",
        },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const displayName = data.display_name || "";
    return (
      displayName
        .replace(/,\s*\d{4,6}/g, "")
        .replace(/,\s*Việt Nam$/i, "")
        .trim() || null
    );
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json({ success: true, address: null });
    }

    // Thử BigDataCloud trước (nhanh & không bị block)
    let address = await fetchAddressFromBigDataCloud(lat, lon);

    // Nếu không có, thử tiếp Nominatim
    if (!address) {
      address = await fetchAddressFromNominatim(lat, lon);
    }

    return NextResponse.json({
      success: true,
      address: address || null,
    });
  } catch (err: any) {
    // Trả về success: true với address: null để không gây popup lỗi đỏ cho người dùng
    return NextResponse.json({
      success: true,
      address: null,
      message: err.message,
    });
  }
}

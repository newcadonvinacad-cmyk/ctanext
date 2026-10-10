import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

function extractCoordinatesFromTextOrUrl(rawUrl: string, htmlContent: string = ""): { lat: number; lon: number; source: string } | null {
  const decodedUrl = decodeURIComponent(rawUrl);

  // 1. Dạng /search/10.880280,+106.790393
  let m =
    decodedUrl.match(/\/search\/(-?\d+\.\d+)[\s,+]*(?:%2C|\+|,)\s*(-?\d+\.\d+)/i) ||
    decodedUrl.match(/\/search\/(-?\d+\.\d+)[\s,+]+\+?(-?\d+\.\d+)/i);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), source: "search_path" };

  // 2. Dạng @10.880280,106.790393
  m = decodedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), source: "@lat,lon" };

  // 3. Dạng !3d10.880280!4d106.790393
  m = decodedUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), source: "!3d!4d" };

  // 4. Query params ?q=10.880280,106.790393 / ll / query / center / destination
  m =
    decodedUrl.match(/[?&](?:q|ll|query|center|daddr|destination)=(-?\d+\.\d+)[\s,+]*(?:%2C|\+|,)\s*(-?\d+\.\d+)/i) ||
    decodedUrl.match(/[?&](?:q|ll|query|center|daddr|destination)=(-?\d+\.\d+)[\s,+]+\+?(-?\d+\.\d+)/i);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), source: "query_param" };

  // 5. Tìm trong nội dung HTML trang đích
  if (htmlContent) {
    m =
      htmlContent.match(/\/search\/(-?\d+\.\d+)[\s,+]*(?:%2C|\+|,)\s*(-?\d+\.\d+)/i) ||
      htmlContent.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      htmlContent.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
      htmlContent.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/) ||
      htmlContent.match(/\[(-?\d+\.\d{4,}),\s*(-?\d+\.\d{4,})\]/);
    if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), source: "html_body" };
  }

  // 6. Chuỗi tọa độ số trực tiếp "10.846090, 106.792672"
  m = decodedUrl.match(/(-?\d{1,2}\.\d{3,})[\s,;+]+(-?\d{1,3}\.\d{3,})/);
  if (m) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon, source: "plain_text" };
    }
  }

  return null;
}

async function reverseGeocodeAddress(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=vi`,
      {
        headers: {
          "User-Agent": "Signage-ERP/1.0 (ERP Field Management System)",
        },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch (err) {
    return null;
  }
}

function extractPlaceNameFromUrlOrHtml(rawUrl: string, htmlContent: string = ""): string | null {
  try {
    const decodedUrl = decodeURIComponent(rawUrl);

    // 1. Dạng /place/Vincom+Center+Ba+Trieu/...
    const placeMatch = decodedUrl.match(/\/place\/([^/@?]+)/i);
    if (placeMatch && placeMatch[1]) {
      const cleaned = placeMatch[1].replace(/\+/g, " ").trim();
      if (cleaned && !cleaned.includes("http") && !cleaned.startsWith("@")) {
        return cleaned;
      }
    }

    // 2. Thẻ title hoặc og:title trong HTML
    if (htmlContent) {
      const ogMatch = htmlContent.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogMatch && ogMatch[1]) {
        const t = ogMatch[1].replace(/\s*-\s*Google\s*Maps.*$/i, "").trim();
        if (t && t.toLowerCase() !== "google maps") return t;
      }

      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const t = titleMatch[1].replace(/\s*-\s*Google\s*Maps.*$/i, "").trim();
        if (t && t.toLowerCase() !== "google maps") return t;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    const input = (body.url || body.input || "").trim();

    if (!input) {
      return NextResponse.json(
        { error: "Vui lòng nhập đường link Google Maps hoặc chuỗi tọa độ" },
        { status: 400 }
      );
    }

    // Bước 1: Thử trích xuất ngay từ chuỗi input nếu có sẵn tọa độ
    const quickMatch = extractCoordinatesFromTextOrUrl(input);
    if (quickMatch && !input.startsWith("http")) {
      const geoAddress = await reverseGeocodeAddress(quickMatch.lat, quickMatch.lon);
      return NextResponse.json({
        success: true,
        latitude: quickMatch.lat,
        longitude: quickMatch.lon,
        address: geoAddress || null,
        source: quickMatch.source,
      });
    }

    // Bước 2: Nếu là link rút gọn hoặc link web, gửi HTTP request lấy URL sau khi Redirect
    let targetUrl = input;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      if (targetUrl.includes("maps.app.goo.gl") || targetUrl.includes("goo.gl") || targetUrl.includes("google.com/maps")) {
        targetUrl = "https://" + targetUrl;
      }
    }

    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      try {
        const response = await fetch(targetUrl, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "vi,en;q=0.9",
          },
        });

        const finalUrl = response.url || targetUrl;
        const html = await response.text();

        const match = extractCoordinatesFromTextOrUrl(finalUrl, html);
        const placeName = extractPlaceNameFromUrlOrHtml(finalUrl, html);

        if (match) {
          let address = placeName;
          if (!address) {
            address = await reverseGeocodeAddress(match.lat, match.lon);
          }

          return NextResponse.json({
            success: true,
            latitude: match.lat,
            longitude: match.lon,
            address: address || null,
            placeName: placeName || null,
            resolvedUrl: finalUrl,
            source: match.source,
          });
        }
      } catch (fetchErr: any) {
        console.error("Lỗi phân giải link Google Maps:", fetchErr);
      }
    }

    // Bước 3: Thử lại lần cuối bằng chuỗi ban đầu
    if (quickMatch) {
      const geoAddress = await reverseGeocodeAddress(quickMatch.lat, quickMatch.lon);
      return NextResponse.json({
        success: true,
        latitude: quickMatch.lat,
        longitude: quickMatch.lon,
        address: geoAddress || null,
        source: quickMatch.source,
      });
    }

    return NextResponse.json(
      {
        error:
          "Không thể tự động trích xuất tọa độ từ liên kết này. Vui lòng mở link trên Google Maps, nhấp chuột phải vào vị trí và chọn sao chép tọa độ (VD: 10.880280, 106.790393).",
      },
      { status: 422 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi phân giải liên kết", details: err.message },
      { status: 500 }
    );
  }
}

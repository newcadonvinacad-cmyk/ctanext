import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";

export const dynamic = "force-dynamic";

/**
 * Proxy stream file để tránh lỗi CORS khi client fetch đóng gói file ZIP hàng loạt
 */
export async function GET(req: Request) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json({ error: "Thiếu tham số url" }, { status: 400 });
    }

    // 1. Trường hợp data-url (Base64 hoặc SVG)
    if (targetUrl.startsWith("data:")) {
      const matches = targetUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches) {
        const mime = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mime,
            "Content-Length": buffer.length.toString(),
          },
        });
      }

      // data:image/svg+xml;utf8,...
      if (targetUrl.startsWith("data:image/svg+xml")) {
        const svgContent = decodeURIComponent(targetUrl.replace(/^data:image\/svg\+xml;utf8,/, ""));
        return new NextResponse(svgContent, {
          headers: {
            "Content-Type": "image/svg+xml",
          },
        });
      }
    }

    // 2. Trường hợp fetch từ HTTP / HTTPS (Supabase Storage, CDN, Unsplash...)
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Signage ERP Document Downloader)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Không thể tải file từ nguồn gốc (HTTP ${response.status})` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: any) {
    console.error("[PROXY DOWNLOAD ERROR]:", err);
    return NextResponse.json(
      { error: "Lỗi proxy download", details: err.message },
      { status: 500 }
    );
  }
}

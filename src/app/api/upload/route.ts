import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { storageService } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực đăng nhập" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // 1. Trường hợp gửi Multipart FormData
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const projectId = (formData.get("projectId") as string) || "general";
      const folder = (formData.get("folder") as string) || "evidence";

      if (!file) {
        return NextResponse.json({ error: "Không tìm thấy file tải lên" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop() || "jpg";
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${folder}/${projectId}/${Date.now()}_${sanitizedName}`;

      try {
        const uploadResult = await storageService.uploadFile(
          filePath,
          buffer,
          file.type || "image/jpeg",
          true
        );
        return NextResponse.json({
          success: true,
          url: uploadResult.publicUrl,
          path: uploadResult.path,
          fileName: file.name,
          fileSize: file.size,
        });
      } catch (storageErr: any) {
        // Fallback: nếu Supabase Storage chưa cấu hình bucket hoặc lỗi mạng, trả về base64 data-url
        console.warn("Supabase Storage không khả dụng, sử dụng Base64 fallback:", storageErr.message);
        const mime = file.type || "image/jpeg";
        const base64 = `data:${mime};base64,${buffer.toString("base64")}`;
        return NextResponse.json({
          success: true,
          url: base64,
          fileName: file.name,
          fileSize: file.size,
          isFallback: true,
        });
      }
    }

    // 2. Trường hợp gửi JSON Base64
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { fileBase64, fileName, projectId = "general", folder = "evidence" } = body;

      if (!fileBase64) {
        return NextResponse.json({ error: "Không có dữ liệu file Base64" }, { status: 400 });
      }

      try {
        const uploadResult = await storageService.uploadReceiptPhoto({
          fileOrBase64: fileBase64,
          isServer: true,
        });
        return NextResponse.json({
          success: true,
          url: uploadResult.publicUrl,
          path: uploadResult.path,
        });
      } catch (storageErr: any) {
        console.warn("Supabase upload error, using raw base64:", storageErr.message);
        return NextResponse.json({
          success: true,
          url: fileBase64,
          isFallback: true,
        });
      }
    }

    return NextResponse.json({ error: "Content-Type không được hỗ trợ" }, { status: 400 });
  } catch (err: any) {
    console.error("Lỗi API upload:", err);
    return NextResponse.json({ error: "Lỗi tải tệp lên hệ thống", details: err.message }, { status: 500 });
  }
}

import { supabaseClient } from "./client";
import { supabaseServer } from "./server";

export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  process.env.SUPABASE_STORAGE_BUCKET ||
  "erp-evidence";

/**
 * Lớp điều khiển Upload và Quản lý file trên Supabase Storage
 */
export const storageService = {
  /**
   * Upload file cơ bản
   * @param path Đường dẫn lưu trong bucket (vd: projects/DA01/photo.jpg)
   * @param file Dữ liệu file (Buffer, Blob hoặc File)
   * @param contentType MIME type (mặc định: image/jpeg)
   * @param isServer Chọn client phù hợp (mặc định true: server, false: client)
   */
  async uploadFile(
    path: string,
    file: Buffer | Blob | File,
    contentType: string = "image/jpeg",
    isServer: boolean = true
  ) {
    const client = isServer ? supabaseServer : supabaseClient;
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Lỗi upload Supabase Storage: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = client.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);

    return {
      path: data.path,
      publicUrl,
    };
  },

  /**
   * 1. Upload ảnh bằng chứng hiện trường (trước, trong, sau thi công)
   */
  async uploadEvidencePhoto({
    projectId,
    stage,
    file,
    extension = "jpg",
    isServer = true,
  }: {
    projectId: string;
    stage: "BEFORE" | "IN_PROGRESS" | "AFTER";
    file: Buffer | Blob | File;
    extension?: string;
    isServer?: boolean;
  }) {
    const timestamp = Date.now();
    const filePath = `evidence/${projectId}/${stage}_${timestamp}.${extension}`;
    return this.uploadFile(filePath, file, `image/${extension === "png" ? "png" : "jpeg"}`, isServer);
  },

  /**
   * 2. Upload chữ ký số điện tử của khách hàng khi nghiệm thu
   */
  async uploadClientSignature({
    projectId,
    fileOrBase64,
    isServer = true,
  }: {
    projectId: string;
    fileOrBase64: Buffer | Blob | string;
    isServer?: boolean;
  }) {
    const timestamp = Date.now();
    const filePath = `signatures/${projectId}/signature_${timestamp}.png`;

    let data: Buffer | Blob;
    if (typeof fileOrBase64 === "string") {
      // Xử lý chuỗi base64 từ canvas signature pad (data:image/png;base64,...)
      const base64Data = fileOrBase64.replace(/^data:image\/\w+;base64,/, "");
      data = Buffer.from(base64Data, "base64");
    } else {
      data = fileOrBase64;
    }

    return this.uploadFile(filePath, data, "image/png", isServer);
  },

  /**
   * 3. Upload ảnh chụp hóa đơn mua vật tư ngoài công trình (phục vụ AI OCR & lưu trữ PO)
   */
  async uploadReceiptPhoto({
    fileOrBase64,
    file,
    extension = "jpg",
    isServer = true,
  }: {
    fileOrBase64?: Buffer | Blob | File | string;
    file?: Buffer | Blob | File;
    extension?: string;
    isServer?: boolean;
  }) {
    const rawInput = fileOrBase64 || file;
    if (!rawInput) {
      throw new Error("Không có dữ liệu file hoặc base64 để upload");
    }

    const timestamp = Date.now();
    let ext = extension;
    let data: Buffer | Blob | File;
    let contentType = `image/${ext === "png" ? "png" : "jpeg"}`;

    if (typeof rawInput === "string") {
      const match = rawInput.match(/^data:(image\/(\w+));base64,/);
      if (match) {
        contentType = match[1];
        ext = match[2] === "jpeg" ? "jpg" : match[2];
      }
      const base64Data = rawInput.replace(/^data:image\/\w+;base64,/, "");
      data = Buffer.from(base64Data, "base64");
    } else {
      data = rawInput;
    }

    const filePath = `receipts/${timestamp}.${ext}`;
    return this.uploadFile(filePath, data, contentType, isServer);
  },

  /**
   * Lấy Public URL của bất kỳ file nào theo đường dẫn trong bucket
   */
  getPublicUrl(path: string) {
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return publicUrl;
  },

  /**
   * Xóa file khỏi Storage
   */
  async deleteFile(path: string, isServer: boolean = true) {
    const client = isServer ? supabaseServer : supabaseClient;
    const { error } = await client.storage.from(STORAGE_BUCKET).remove([path]);
    if (error) {
      throw new Error(`Lỗi xóa file: ${error.message}`);
    }
    return true;
  },
};

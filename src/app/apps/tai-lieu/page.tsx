"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import JSZip from "jszip";
import {
  Search,
  Upload,
  FolderPlus,
  Grid,
  List,
  RefreshCw,
  Folder,
  FileText,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  FileCheck,
  Eye,
  Download,
  Copy,
  Trash2,
  ExternalLink,
  X,
  ChevronRight,
  HardDrive,
  Info,
  Check,
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckSquare,
  Square,
  Archive,
  Loader2,
  AlertCircle,
  FileArchive,
  Pause,
  Play,
} from "lucide-react";
import { UnifiedDocumentItem, DocumentFolderItem } from "@/services/document.service";

export default function DocumentExplorerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const folderId = searchParams.get("folder") || "all";

  // Data States
  const [files, setFiles] = React.useState<UnifiedDocumentItem[]>([]);
  const [subFolders, setSubFolders] = React.useState<DocumentFolderItem[]>([]);
  const [currentFolderInfo, setCurrentFolderInfo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = React.useState("");
  const [fileTypeFilter, setFileTypeFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("date_desc");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Upload States
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  // Modal States
  const [previewFile, setPreviewFile] = React.useState<UnifiedDocumentItem | null>(null);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Batch / Backup Progress Modal State
  const [batchModalOpen, setBatchModalOpen] = React.useState(false);
  const [batchTitle, setBatchTitle] = React.useState("");
  const [batchStatus, setBatchStatus] = React.useState<
    "idle" | "fetching" | "zipping" | "completed" | "cancelled" | "error"
  >("idle");
  const [batchCurrent, setBatchCurrent] = React.useState(0);
  const [batchTotal, setBatchTotal] = React.useState(0);
  const [batchPercent, setBatchPercent] = React.useState(0);
  const [batchFileName, setBatchFileName] = React.useState("");
  const [batchBytes, setBatchBytes] = React.useState(0);
  const [batchFailedCount, setBatchFailedCount] = React.useState(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Tải danh sách tệp tin & thư mục
  const loadDocuments = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        folderId,
        search: searchQuery,
        fileType: fileTypeFilter,
        sortBy,
      });

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setSubFolders(data.subFolders || []);
        setCurrentFolderInfo(data.currentFolderInfo || null);
        // Reset selections if folder changed
        setSelectedIds(new Set());
      }
    } catch (e: any) {
      console.error("Lỗi tải tệp tin:", e);
    } finally {
      setLoading(false);
    }
  }, [folderId, searchQuery, fileTypeFilter, sortBy]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 2. Multi-selection helpers
  const handleToggleSelectFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // 3. Helper tải nhị phân tệp tin an toàn (hỗ trợ Data-URL, Direct HTTP & Server Proxy)
  const fetchFileBinary = async (
    url: string,
    signal?: AbortSignal
  ): Promise<{ data: Uint8Array | ArrayBuffer; extension: string }> => {
    // 3.1 Data URI (Base64 hoặc SVG)
    if (url.startsWith("data:")) {
      const commaIdx = url.indexOf(",");
      if (commaIdx !== -1) {
        const header = url.substring(0, commaIdx);
        const dataStr = url.substring(commaIdx + 1);

        if (header.includes(";base64")) {
          const binaryStr = atob(dataStr);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const ext = header.includes("image/png")
            ? "png"
            : header.includes("image/jpeg")
            ? "jpg"
            : header.includes("pdf")
            ? "pdf"
            : "bin";
          return { data: bytes, extension: ext };
        } else {
          const decoded = decodeURIComponent(dataStr);
          const encoder = new TextEncoder();
          return { data: encoder.encode(decoded), extension: "svg" };
        }
      }
    }

    // 3.2 Thử fetch trực tiếp phía client
    try {
      const res = await fetch(url, { signal });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const ext = url.split("?")[0].split(".").pop() || "bin";
        return { data: buffer, extension: ext };
      }
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
    }

    // 3.3 Fallback qua Server Proxy để tránh lỗi CORS
    const proxyUrl = `/api/documents/proxy?url=${encodeURIComponent(url)}`;
    const proxyRes = await fetch(proxyUrl, { signal });
    if (!proxyRes.ok) {
      throw new Error(`Proxy error ${proxyRes.status}`);
    }
    const buffer = await proxyRes.arrayBuffer();
    const ext = url.split("?")[0].split(".").pop() || "bin";
    return { data: buffer, extension: ext };
  };

  // 4. TIẾN TRÌNH TẢI HÀNG LOẠT & ĐÓNG GÓI ZIP TỪ TỪ (RATE-LIMITED BATCH DOWNLOAD)
  const executeBatchDownload = async (
    targetFiles: UnifiedDocumentItem[],
    zipFileName: string,
    titleDesc: string
  ) => {
    if (!targetFiles || targetFiles.length === 0) {
      showToast("Không có tệp nào để tải");
      return;
    }

    // Khởi tạo Modal Tiến Trình
    abortControllerRef.current = new AbortController();
    setBatchTitle(titleDesc);
    setBatchStatus("fetching");
    setBatchCurrent(0);
    setBatchTotal(targetFiles.length);
    setBatchPercent(0);
    setBatchBytes(0);
    setBatchFailedCount(0);
    setBatchFileName(targetFiles[0].name);
    setBatchModalOpen(true);

    const zip = new JSZip();
    let accumulatedBytes = 0;
    let failed = 0;
    const nameCountMap = new Map<string, number>();

    try {
      for (let i = 0; i < targetFiles.length; i++) {
        // Kiểm tra tín hiệu hủy
        if (abortControllerRef.current?.signal.aborted) {
          setBatchStatus("cancelled");
          return;
        }

        const fileItem = targetFiles[i];
        setBatchCurrent(i + 1);
        setBatchFileName(fileItem.name);
        const percent = Math.round(((i + 1) / targetFiles.length) * 85);
        setBatchPercent(percent);

        try {
          const { data, extension } = await fetchFileBinary(
            fileItem.fileUrl,
            abortControllerRef.current?.signal
          );

          // Tạo tên tệp an toàn trong zip và phân thư mục nếu là sao lưu toàn bộ
          let folderPrefix = "";
          if (titleDesc.includes("Toàn Bộ")) {
            switch (fileItem.sourceModule) {
              case "design_proofs":
                folderPrefix = "01_Ban_Ve_Maket/";
                break;
              case "site_surveys":
                folderPrefix = "02_Khao_Sat_Hien_Truong/";
                break;
              case "purchase_orders":
                folderPrefix = "03_Hoa_Don_PO/";
                break;
              case "acceptances":
                folderPrefix = "04_Nghiem_Thu_Chu_Ky/";
                break;
              case "factory_qc_records":
                folderPrefix = "05_Kiem_Thu_QC/";
                break;
              default:
                folderPrefix = "06_Tai_Lieu_Khac/";
            }
          }

          let safeName = fileItem.name.replace(/[/\\?%*:|"<>]/g, "_");
          if (!safeName.includes(".") && extension) {
            safeName = `${safeName}.${extension}`;
          }

          // Xử lý trùng tên tệp
          const fullPath = `${folderPrefix}${safeName}`;
          let finalPath = fullPath;
          const count = nameCountMap.get(fullPath) || 0;
          if (count > 0) {
            const extDot = safeName.lastIndexOf(".");
            if (extDot !== -1) {
              finalPath = `${folderPrefix}${safeName.substring(0, extDot)}_${count}${safeName.substring(extDot)}`;
            } else {
              finalPath = `${folderPrefix}${safeName}_${count}`;
            }
          }
          nameCountMap.set(fullPath, count + 1);

          zip.file(finalPath, data);
          accumulatedBytes += data.byteLength;
          setBatchBytes(accumulatedBytes);
        } catch (fileErr: any) {
          if (fileErr.name === "AbortError") {
            setBatchStatus("cancelled");
            return;
          }
          console.warn(`Lỗi tải tệp [${fileItem.name}]:`, fileErr.message);
          failed++;
          setBatchFailedCount(failed);
        }

        // TẢI TỪ TỪ: Delay 180ms giữa các tệp để giao diện render mượt và không nghẽn băng thông
        await new Promise((resolve) => setTimeout(resolve, 180));
      }

      // Bước 2: Nén và đóng gói ZIP
      setBatchStatus("zipping");
      setBatchPercent(90);
      setBatchFileName("Đang nén dữ liệu thành tệp ZIP hoàn chỉnh...");

      const zipBlob = await zip.generateAsync(
        {
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          setBatchPercent(90 + Math.round(metadata.percent * 0.1));
        }
      );

      // Kích hoạt tải file ZIP về máy tính
      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = zipFileName;
      link.click();
      URL.revokeObjectURL(blobUrl);

      setBatchPercent(100);
      setBatchStatus("completed");
      showToast(`Đã xuất gói sao lưu ${zipFileName} thành công!`);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setBatchStatus("cancelled");
      } else {
        console.error("Lỗi đóng gói batch:", err);
        setBatchStatus("error");
      }
    }
  };

  // 5. Tải các tệp đang chọn (Selected Batch)
  const handleDownloadSelected = () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f.id));
    if (selectedFiles.length === 0) return;

    const dateStr = new Date().toISOString().slice(0, 10);
    const zipName = `Tai_Hang_Loat_${selectedFiles.length}_Tep_${dateStr}.zip`;
    executeBatchDownload(
      selectedFiles,
      zipName,
      `Tải Hàng Loạt ${selectedFiles.length} Tệp Đã Chọn`
    );
  };

  // 6. Sao lưu toàn bộ thư mục hiện tại
  const handleBackupCurrentFolder = () => {
    if (files.length === 0) {
      showToast("Thư mục hiện tại không có tệp nào để sao lưu");
      return;
    }
    const folderNameClean = (currentFolderInfo?.name || "Thu_Muc")
      .replace(/[^a-zA-Z0-9À-ỹ]/g, "_")
      .slice(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10);
    const zipName = `SaoLuu_${folderNameClean}_${files.length}Tep_${dateStr}.zip`;
    executeBatchDownload(
      files,
      zipName,
      `Sao Lưu Thư Mục: ${currentFolderInfo?.name || "Hiện Tại"} (${files.length} tệp)`
    );
  };

  // 7. Sao lưu toàn bộ kho tài liệu hệ thống (Tất cả ERP)
  const handleBackupAllSystem = async () => {
    try {
      showToast("Đang thu thập toàn bộ tệp tin trong hệ thống...");
      const res = await fetch("/api/documents?folderId=all");
      if (!res.ok) throw new Error("Không thể tải danh sách tệp");
      const data = await res.json();
      const allFiles: UnifiedDocumentItem[] = data.files || [];

      if (allFiles.length === 0) {
        showToast("Hệ thống chưa có tệp tin nào để sao lưu");
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const zipName = `SaoLuu_ToanBo_KhoTaiLieu_ERP_${allFiles.length}Tep_${dateStr}.zip`;
      executeBatchDownload(
        allFiles,
        zipName,
        `Sao Lưu Toàn Bộ Kho Tài Liệu ERP (${allFiles.length} tệp)`
      );
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  // Hủy tiến trình tải
  const handleCancelBatch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setBatchStatus("cancelled");
  };

  // 8. Xử lý Upload Tệp
  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress(`Đang tải lên ${uploadedFiles.length} tệp...`);

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "documents");
        formData.append("projectId", folderId.startsWith("sys_") ? "system" : folderId);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Không thể tải lên ${file.name}`);
        }

        const uploadData = await uploadRes.json();
        const fileUrl = uploadData.url;

        const targetFolder = folderId.startsWith("sys_") || folderId === "all" ? null : folderId;
        await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            fileUrl,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            folderId: targetFolder,
          }),
        });
      }

      showToast(`Đã tải lên ${uploadedFiles.length} tệp thành công!`);
      await loadDocuments();
    } catch (err: any) {
      alert("Lỗi tải tệp: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 9. Xử lý xóa tệp tự upload
  const handleDeleteDocument = async (docId: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tệp "${name}" không?`)) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Đã xóa tệp thành công!");
        if (previewFile?.id === docId) setPreviewFile(null);
        await loadDocuments();
      } else {
        const err = await res.json();
        alert(err.error || "Không thể xóa tệp");
      }
    } catch (e: any) {
      alert("Lỗi xóa: " + e.message);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast("Đã sao chép liên kết tệp vào clipboard!");
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return "--";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "--";
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getFileIcon = (ext: string, mime?: string) => {
    const e = (ext || "").toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(e) || mime?.startsWith("image/")) {
      return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    }
    if (e === "pdf" || mime?.includes("pdf")) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (["svg", "dwg", "ai", "eps"].includes(e)) {
      return <FileCode className="w-5 h-5 text-amber-500" />;
    }
    if (["xlsx", "xls", "csv"].includes(e)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    return <FileText className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-full font-sans relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleFileUpload(e.dataTransfer.files);
      }}
    >
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-40 bg-sky-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none">
          <Upload className="w-16 h-16 animate-bounce text-sky-300 mb-3" />
          <h2 className="text-xl font-bold">Thả tệp vào đây để tải lên ngay</h2>
          <p className="text-sm text-sky-200 mt-1">Hỗ trợ ảnh hiện trường, bản vẽ, PDF, hóa đơn...</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* ======================================================== */}
      {/* 1. TOP HEADER TOOLBAR: BREADCRUMBS & BATCH ACTIONS */}
      {/* ======================================================== */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link
              href="/apps/tai-lieu?folder=all"
              className="hover:text-slate-800 font-semibold flex items-center gap-1"
            >
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Kho tài liệu</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-bold text-slate-800 truncate max-w-[200px]">
              {currentFolderInfo?.name || "Tất cả"}
            </span>
          </div>

          <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>{currentFolderInfo?.name || "Tất Cả Tệp Tin & Tài Liệu"}</span>
            {currentFolderInfo?.isSystem && (
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold border border-slate-200">
                Hệ thống ERP
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentFolderInfo?.description ||
              "Kho lưu trữ tệp tin tập trung, tự động phân loại theo từng nghiệp vụ"}
          </p>
        </div>

        {/* Nút hành động chính */}
        <div className="flex items-center flex-wrap gap-2">
          {/* NÚT SAO LƯU THƯ MỤC HIỆN TẠI */}
          <button
            onClick={handleBackupCurrentFolder}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Tải toàn bộ tệp trong thư mục này thành file .ZIP"
          >
            <Archive className="w-3.5 h-3.5 text-slate-600" />
            <span>Sao Lưu Thư Mục (.ZIP)</span>
          </button>

          {/* NÚT SAO LƯU TOÀN BỘ HỆ THỐNG */}
          <button
            onClick={handleBackupAllSystem}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Đóng gói tất cả tài liệu toàn hệ thống ERP thành file .ZIP"
          >
            <FileArchive className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sao Lưu Toàn Bộ Kho</span>
          </button>

          {/* NÚT TẢI TỆP LÊN */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? uploadProgress || "Đang tải lên..." : "Tải Tệp Lên"}</span>
          </button>

          <button
            onClick={loadDocuments}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FILTER & SEARCH BAR */}
      {/* ======================================================== */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Tìm kiếm & Lọc định dạng */}
        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-[280px]">
          {/* Ô Tìm Kiếm */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên tệp, mã PO, khảo sát, maket..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bộ lọc định dạng */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            {[
              { id: "all", label: "Tất cả" },
              { id: "image", label: "Ảnh" },
              { id: "pdf", label: "PDF" },
              { id: "cad", label: "Bản vẽ/CAD" },
              { id: "spreadsheet", label: "Bảng tính" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFileTypeFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  fileTypeFilter === f.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Nút Chọn Tất Cả Tệp */}
          {files.length > 0 && (
            <button
              onClick={handleSelectAll}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition ${
                selectedIds.size === files.length
                  ? "bg-sky-50 border-sky-300 text-sky-700"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {selectedIds.size === files.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>
                {selectedIds.size === files.length
                  ? `Bỏ chọn (${files.length})`
                  : `Chọn tất cả (${files.length})`}
              </span>
            </button>
          )}
        </div>

        {/* Chế độ xem & Sắp xếp */}
        <div className="flex items-center gap-2">
          {/* Sắp xếp */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-200 rounded-lg">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-[11px] font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="date_desc">Mới nhất trước</option>
              <option value="date_asc">Cũ nhất trước</option>
              <option value="name_asc">Tên (A → Z)</option>
              <option value="size_desc">Dung lượng lớn</option>
            </select>
          </div>

          {/* Toggle Grid vs List */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition ${
                viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Chế độ lưới (Grid)"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition ${
                viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Chế độ danh sách (List)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. NỘI DUNG CHÍNH: SUBFOLDERS & FILES */}
      {/* ======================================================== */}
      <div className="flex-1 p-6 space-y-6 pb-24">
        {/* SUBFOLDERS SECTION */}
        {subFolders.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Thư Mục Con ({subFolders.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {subFolders.map((sf) => (
                <div
                  key={sf.id}
                  onClick={() => router.push(`/apps/tai-lieu?folder=${sf.id}`)}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:shadow-xs transition group cursor-pointer flex items-center gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${sf.color}15` }}
                  >
                    <Folder className="w-5 h-5" style={{ color: sf.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate group-hover:text-sky-600 transition">
                      {sf.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{sf.itemCount} tệp</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILES SECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Danh Sách Tệp Tin ({files.length})
            </h3>
            {searchQuery && (
              <span className="text-xs text-sky-600 font-medium">
                Kết quả tìm kiếm cho: "{searchQuery}"
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold">Đang tải kho tài liệu...</p>
            </div>
          ) : files.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto my-8">
              <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HardDrive className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Thư mục hiện tại chưa có tệp nào</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Bạn có thể kéo thả tệp trực tiếp vào đây hoặc nhấn nút "Tải Tệp Lên" để lưu tài liệu
                mới.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải Tệp Ngay</span>
                </button>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            /* ======================================================== */
            /* 3.1 CHẾ ĐỘ LƯỚI (GRID VIEW) VỚI SELECTION CHECKBOX */
            /* ======================================================== */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
              {files.map((file) => {
                const isImage =
                  file.mimeType.startsWith("image/") ||
                  ["jpg", "jpeg", "png", "webp", "gif"].includes(file.extension.toLowerCase());
                const isSvg = file.extension.toLowerCase() === "svg";
                const isSelected = selectedIds.has(file.id);

                return (
                  <div
                    key={file.id}
                    onClick={() => setPreviewFile(file)}
                    className={`bg-white rounded-xl border transition group overflow-hidden cursor-pointer flex flex-col relative ${
                      isSelected
                        ? "border-sky-500 ring-2 ring-sky-500/20 shadow-sm"
                        : "border-slate-200 hover:border-sky-400 hover:shadow-md"
                    }`}
                  >
                    {/* Checkbox Chọn tệp ở góc trên bên phải */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelectFile(file.id, e)}
                      className={`absolute top-2 right-2 z-20 p-1 rounded-md transition backdrop-blur-xs ${
                        isSelected
                          ? "bg-sky-600 text-white"
                          : "bg-slate-900/40 text-white/80 hover:bg-slate-900/70 opacity-0 group-hover:opacity-100"
                      }`}
                      title={isSelected ? "Bỏ chọn" : "Chọn tệp này"}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Thumbnail Zone */}
                    <div className="h-32 bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden relative">
                      {isImage && file.fileUrl ? (
                        <img
                          src={file.fileUrl}
                          alt={file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      ) : isSvg ? (
                        <div className="p-4 text-center">
                          <FileCode className="w-12 h-12 text-amber-500 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-amber-600">VECTOR SVG</span>
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          {getFileIcon(file.extension, file.mimeType)}
                          <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 block font-mono">
                            .{file.extension || "FILE"}
                          </span>
                        </div>
                      )}

                      {/* Badge Danh mục */}
                      <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                        {file.category}
                      </span>

                      {/* Hover Action Overlay */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                          className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 shadow"
                          title="Xem trước"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={file.fileUrl}
                          download={file.name}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 shadow"
                          title="Tải xuống"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* File Info Zone */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div
                          className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-sky-600 transition leading-snug"
                          title={file.name}
                        >
                          {file.name}
                        </div>
                        {file.sourceRefCode && (
                          <div className="text-[10px] text-sky-600 font-mono font-bold mt-1 truncate">
                            #{file.sourceRefCode}
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{formatBytes(file.fileSize)}</span>
                        <span>{new Date(file.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ======================================================== */
            /* 3.2 CHẾ ĐỘ DANH SÁCH (LIST / TABLE VIEW) */
            /* ======================================================== */
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                    <th className="py-2.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={files.length > 0 && selectedIds.size === files.length}
                        onChange={handleSelectAll}
                        className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-4">Tên Tệp Tin</th>
                    <th className="py-2.5 px-3">Phân Loại Nghiệp Vụ</th>
                    <th className="py-2.5 px-3">Mã Liên Kết</th>
                    <th className="py-2.5 px-3">Dung Lượng</th>
                    <th className="py-2.5 px-3">Ngày Cập Nhật</th>
                    <th className="py-2.5 px-3">Người Tạo</th>
                    <th className="py-2.5 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {files.map((file) => {
                    const isSelected = selectedIds.has(file.id);
                    return (
                      <tr
                        key={file.id}
                        onClick={() => setPreviewFile(file)}
                        className={`transition cursor-pointer group ${
                          isSelected ? "bg-sky-50/60" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectFile(file.id)}
                            className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 max-w-xs">
                          <div className="flex items-center gap-2.5">
                            {getFileIcon(file.extension, file.mimeType)}
                            <span className="truncate group-hover:text-sky-600 transition">
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {file.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-sky-600 font-bold">
                          {file.sourceRefCode ? `#${file.sourceRefCode}` : "--"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {formatBytes(file.fileSize)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {formatDate(file.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {file.createdByName || "--"}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="p-1.5 text-slate-500 hover:text-sky-600 rounded transition"
                              title="Xem trước"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={file.fileUrl}
                              download={file.name}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 rounded transition"
                              title="Tải xuống"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleCopyLink(file.fileUrl)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 rounded transition"
                              title="Sao chép link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {!file.isSystem && (
                              <button
                                onClick={() => handleDeleteDocument(file.id, file.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Xóa tệp"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. THANH HÀNH ĐỘNG NỔI KHI CHỌN NHIỀU TỆP (FLOATING BAR) */}
      {/* ======================================================== */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-[11px]">
              {selectedIds.size}
            </span>
            <span>Tệp tin đã chọn</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <button
            onClick={handleDownloadSelected}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải Hàng Loạt ({selectedIds.size} tệp .ZIP)</span>
          </button>

          <button
            onClick={handleClearSelection}
            className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL TIẾN TRÌNH TẢI HÀNG LOẠT & ĐÓNG GÓI SAO LƯU */}
      {/* ======================================================== */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <FileArchive className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">{batchTitle}</h3>
              </div>
              {batchStatus === "completed" || batchStatus === "cancelled" || batchStatus === "error" ? (
                <button
                  onClick={() => setBatchModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : null}
            </div>

            {/* Body Tiến Trình */}
            <div className="p-6 space-y-5">
              {/* Vòng quay / Biểu tượng trạng thái */}
              <div className="text-center py-2">
                {batchStatus === "fetching" && (
                  <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                  </div>
                )}
                {batchStatus === "zipping" && (
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Archive className="w-6 h-6 animate-bounce text-indigo-600" />
                  </div>
                )}
                {batchStatus === "completed" && (
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-emerald-600 stroke-[3]" />
                  </div>
                )}
                {batchStatus === "cancelled" && (
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                )}
                {batchStatus === "error" && (
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <X className="w-6 h-6 text-rose-600" />
                  </div>
                )}

                <h4 className="text-sm font-bold text-slate-900">
                  {batchStatus === "fetching" && "Đang nạp từng tệp từ từ..."}
                  {batchStatus === "zipping" && "Đang đóng gói file ZIP..."}
                  {batchStatus === "completed" && "Hoàn Tất Tải Xuống!"}
                  {batchStatus === "cancelled" && "Tiến trình đã được hủy"}
                  {batchStatus === "error" && "Có lỗi xảy ra khi nén tệp"}
                </h4>

                <p className="text-xs text-slate-500 mt-1 truncate px-2 font-mono">
                  {batchFileName}
                </p>
              </div>

              {/* Thanh Tiến Trình (Progress Bar) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>
                    Tiến độ: {batchCurrent} / {batchTotal} tệp
                  </span>
                  <span className="font-mono text-sky-600 font-bold">{batchPercent}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-200 rounded-full ${
                      batchStatus === "completed"
                        ? "bg-emerald-500"
                        : batchStatus === "cancelled"
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-sky-500 to-indigo-600"
                    }`}
                    style={{ width: `${batchPercent}%` }}
                  />
                </div>
              </div>

              {/* Thống kê chi tiết */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Dung lượng đã tích lũy:</span>
                  <strong className="text-slate-900 font-mono">{formatBytes(batchBytes)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tốc độ xử lý:</span>
                  <span className="text-slate-700 font-medium">Tuần tự an toàn (180ms/tệp)</span>
                </div>
                {batchFailedCount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Tệp bỏ qua do lỗi:</span>
                    <strong className="font-mono">{batchFailedCount} tệp</strong>
                  </div>
                )}
              </div>

              {/* Nút điều khiển Modal */}
              <div className="pt-2 flex items-center justify-end gap-2">
                {batchStatus === "fetching" || batchStatus === "zipping" ? (
                  <button
                    onClick={handleCancelBatch}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Hủy Bỏ Tiến Trình</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setBatchModalOpen(false)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                  >
                    Đóng
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL XEM TRƯỚC TỆP TIN TOÀN DIỆN (FILE PREVIEW MODAL) */}
      {/* ======================================================== */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5 truncate max-w-xl">
                {getFileIcon(previewFile.extension, previewFile.mimeType)}
                <div className="truncate">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{previewFile.name}</h3>
                  <span className="text-[10px] text-slate-500">{previewFile.category}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewFile.fileUrl}
                  download={previewFile.name}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Xuống</span>
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: 2 Cột Preview & Chi tiết */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-[380px]">
              {/* Cột trái: Khung Preview Media */}
              <div className="md:col-span-8 p-4 bg-slate-950 flex items-center justify-center min-h-[320px]">
                {previewFile.mimeType.startsWith("image/") ||
                ["jpg", "jpeg", "png", "webp", "gif"].includes(
                  previewFile.extension.toLowerCase()
                ) ? (
                  <img
                    src={previewFile.fileUrl}
                    alt={previewFile.name}
                    className="max-h-[65vh] max-w-full object-contain rounded shadow-lg"
                  />
                ) : previewFile.extension.toLowerCase() === "svg" ? (
                  <iframe
                    src={previewFile.fileUrl}
                    className="w-full h-[60vh] bg-white rounded border-none"
                    title={previewFile.name}
                  />
                ) : previewFile.extension.toLowerCase() === "pdf" ? (
                  <iframe
                    src={previewFile.fileUrl}
                    className="w-full h-[60vh] rounded border-none"
                    title={previewFile.name}
                  />
                ) : (
                  <div className="text-center text-slate-400 p-8">
                    <FileText className="w-16 h-16 mx-auto mb-2 text-slate-500" />
                    <p className="text-xs">Định dạng tệp này không hỗ trợ xem trực tiếp.</p>
                    <a
                      href={previewFile.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-xs font-bold rounded-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở Tệp Trong Tab Mới</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Cột phải: Thông tin chi tiết Metadata */}
              <div className="md:col-span-4 p-5 bg-white space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Thông Tin Tệp
                  </span>
                  <div className="font-bold text-slate-900 break-all">{previewFile.name}</div>
                </div>

                <div className="space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dung lượng:</span>
                    <strong className="text-slate-800">{formatBytes(previewFile.fileSize)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Định dạng:</span>
                    <strong className="text-slate-800 uppercase font-mono">
                      .{previewFile.extension || "N/A"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phân loại:</span>
                    <strong className="text-slate-800">{previewFile.category}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ngày tạo:</span>
                    <strong className="text-slate-800">{formatDate(previewFile.createdAt)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Người tạo:</span>
                    <strong className="text-slate-800">{previewFile.createdByName || "--"}</strong>
                  </div>
                </div>

                {/* Liên kết Nghiệp vụ ERP (nếu có) */}
                {previewFile.sourceRefUrl && (
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                      Chứng Từ Gốc ERP
                    </span>
                    <div className="font-bold text-sky-950 truncate">
                      {previewFile.sourceRefTitle || previewFile.sourceRefCode}
                    </div>
                    <Link
                      href={previewFile.sourceRefUrl}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 mt-1"
                    >
                      <span>Mở màn hình nghiệp vụ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Các nút hành động phụ */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => handleCopyLink(previewFile.fileUrl)}
                    className="w-full py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sao Chép Liên Kết Tệp</span>
                  </button>

                  {!previewFile.isSystem && (
                    <button
                      onClick={() => handleDeleteDocument(previewFile.id, previewFile.name)}
                      className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Tệp Này</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

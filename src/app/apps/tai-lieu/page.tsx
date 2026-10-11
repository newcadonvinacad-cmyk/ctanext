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
import { toast } from "@/components/ui";
import { useConfirm } from "@/contexts/confirm-dialog-context";

export default function DocumentExplorerPage() {
  const confirm = useConfirm();
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
      toast.error("Lỗi: " + e.message);
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

      toast.success(`Đã tải lên ${uploadedFiles.length} tệp thành công!`);
      await loadDocuments();
    } catch (err: any) {
      toast.error("Lỗi tải tệp: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 9. Xử lý xóa tệp tự upload
  const handleDeleteDocument = async (docId: string, name: string) => {
    const ok = await confirm({
      title: "Xác nhận xóa tệp tin",
      message: `Bạn có chắc chắn muốn xóa tệp "${name}" không?`,
      variant: "danger",
      confirmText: "Xóa tệp",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xóa tệp thành công!");
        if (previewFile?.id === docId) setPreviewFile(null);
        await loadDocuments();
      } else {
        const err = await res.json();
        toast.error(err.error || "Không thể xóa tệp");
      }
    } catch (e: any) {
      toast.error("Lỗi xóa: " + e.message);
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
      {/* 1. TOP HEADER TOOLBAR: BREADCRUMBS, SEARCH & UPLOAD (THEO MOCKUP) */}
      {/* ======================================================== */}
      <div className="bg-white border-b border-slate-200/90 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Current Folder Name */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <Link
              href="/apps/tai-lieu?folder=all"
              className="hover:text-slate-800 transition flex items-center gap-1"
            >
              <span>Kho Tài Liệu</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-600 truncate max-w-[220px]">
              {currentFolderInfo?.name || "Tất Cả Tệp Tin"}
            </span>
          </div>

          <h1 className="text-xl font-extrabold text-[#0e1726] flex items-center gap-2 tracking-tight">
            <span>{currentFolderInfo?.name || "Kho Lưu Trữ Tệp Tin"}</span>
            {currentFolderInfo?.isSystem && (
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold border border-slate-200">
                ERP Sync
              </span>
            )}
          </h1>
        </div>

        {/* Right: Search, Grid/List Toggle & Upload Action */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Ô Tìm Kiếm theo mockup */}
          <div className="relative w-64 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Tìm trong ${currentFolderInfo?.name || "kho tệp"}...`}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Nút Toggle Grid vs List theo mockup */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid"
                  ? "bg-[#0e1726] text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Chế độ lưới (Grid)"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "list"
                  ? "bg-[#0e1726] text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Chế độ danh sách (List)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* NÚT TẢI LÊN MÀU XANH ĐẬM THEO MOCKUP */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-[#0e1726] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? uploadProgress || "Đang tải lên..." : "Tải lên"}</span>
          </button>

          {/* Nút tác vụ phụ: Sao lưu ZIP & Làm mới */}
          <div className="flex items-center gap-1 pl-1">
            <button
              onClick={handleBackupCurrentFolder}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition"
              title="Tải toàn bộ tệp trong thư mục này thành file .ZIP"
            >
              <Archive className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={loadDocuments}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-slate-800" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SUB-BAR: SỐ LƯỢNG TỆP & SẮP XẾP THEO MOCKUP */}
      {/* ======================================================== */}
      <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-800">
            {files.length} tệp
          </span>

          {/* Bộ lọc loại tệp nhanh */}
          <div className="hidden sm:flex items-center gap-1 pl-3 border-l border-slate-200">
            {[
              { id: "all", label: "Tất cả" },
              { id: "image", label: "Ảnh" },
              { id: "pdf", label: "PDF" },
              { id: "cad", label: "Bản vẽ/CAD" },
              { id: "spreadsheet", label: "Excel" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFileTypeFilter(f.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition ${
                  fileTypeFilter === f.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {files.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 pl-2"
            >
              {selectedIds.size === files.length ? "Bỏ chọn tất cả" : `Chọn tất cả (${files.length})`}
            </button>
          )}
        </div>

        {/* Dropdown Sắp xếp theo mockup */}
        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="text-[11px] font-medium text-slate-400">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="date_desc">Mới nhất</option>
            <option value="date_asc">Cũ nhất</option>
            <option value="name_asc">Tên (A → Z)</option>
            <option value="size_desc">Dung lượng</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. NỘI DUNG CHÍNH: SUBFOLDERS & FILES (THEO PHONG CÁCH MOCKUP) */}
      {/* ======================================================== */}
      <div className="flex-1 p-6 space-y-6 pb-24 bg-white">
        {/* SUBFOLDERS SECTION */}
        {subFolders.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Thư Mục Con ({subFolders.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {subFolders.map((sf) => (
                <div
                  key={sf.id}
                  onClick={() => router.push(`/apps/tai-lieu?folder=${sf.id}`)}
                  className="bg-slate-50/70 hover:bg-white p-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-xs transition group cursor-pointer flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Folder className="w-4 h-4 text-amber-500 fill-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate group-hover:text-slate-900 transition">
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
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold">Đang tải kho tài liệu...</p>
            </div>
          ) : files.length === 0 ? (
            /* Empty State */
            <div className="bg-slate-50/60 rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto my-8">
              <div className="w-14 h-14 bg-white text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs border border-slate-200">
                <HardDrive className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Thư mục hiện tại chưa có tệp nào</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Kéo thả tệp trực tiếp vào màn hình hoặc bấm nút "Tải lên" ở trên để lưu trữ.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#0e1726] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải lên tệp ngay</span>
                </button>
              </div>
            </div>
          ) : viewMode === "list" ? (
            /* ======================================================== */
            /* 3.1 CHẾ ĐỘ DANH SÁCH THẺ (FILE ROW CARDS THEO ĐÚNG MOCKUP) */
            /* ======================================================== */
            <div className="space-y-2.5">
              {files.map((file) => {
                const ext = (file.extension || "").toLowerCase();
                const isSelected = selectedIds.has(file.id);

                // Tạo badge màu định dạng file theo mockup
                const renderFileBadge = () => {
                  if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
                    if (ext === "png") {
                      return (
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs tracking-wider">
                          PNG
                        </div>
                      );
                    }
                    return (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <ImageIcon className="w-5 h-5 text-white" />
                      </div>
                    );
                  }
                  if (ext === "pdf") {
                    return (
                      <div className="w-10 h-10 rounded-xl bg-rose-500 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs tracking-wider">
                        PDF
                      </div>
                    );
                  }
                  if (["svg", "ai", "dwg"].includes(ext)) {
                    return (
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs tracking-wider">
                        SVG
                      </div>
                    );
                  }
                  if (["xlsx", "xls", "csv"].includes(ext)) {
                    return (
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs tracking-wider">
                        XLSX
                      </div>
                    );
                  }
                  return (
                    <div className="w-10 h-10 rounded-xl bg-slate-500 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs uppercase tracking-wider">
                      {ext.slice(0, 4) || "DOC"}
                    </div>
                  );
                };

                return (
                  <div
                    key={file.id}
                    onClick={() => setPreviewFile(file)}
                    className={`px-4 py-3 bg-white rounded-xl border transition-all duration-150 flex items-center justify-between gap-4 cursor-pointer group ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/40 ring-1 ring-sky-500 shadow-2xs"
                        : "border-slate-200/90 hover:border-slate-300 hover:shadow-2xs"
                    }`}
                  >
                    {/* Trái: Checkbox, Badge tệp, Tên tệp & Dung lượng/Thời gian */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectFile(file.id)}
                          className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900 cursor-pointer"
                        />
                      </div>

                      {renderFileBadge()}

                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-bold text-slate-800 truncate group-hover:text-sky-600 transition"
                          title={file.name}
                        >
                          {file.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                          <span>{formatBytes(file.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(file.createdAt)}</span>
                          {file.sourceRefCode && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 font-mono">#{file.sourceRefCode}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Phải: Cụm nút hành động [Xem trước] [Tải xuống] [Xóa] theo đúng mockup */}
                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                        title="Xem trước tệp"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xem trước</span>
                      </button>

                      <a
                        href={file.fileUrl}
                        download={file.name}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                        title="Tải xuống tệp tin"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tải xuống</span>
                      </a>

                      {!file.isSystem && (
                        <button
                          onClick={() => handleDeleteDocument(file.id, file.name)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                          title="Xóa tệp tin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ======================================================== */
            /* 3.2 CHẾ ĐỘ LƯỚI (GRID VIEW HIỆN ĐẠI) */
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
                    className={`bg-white rounded-2xl border transition group overflow-hidden cursor-pointer flex flex-col relative ${
                      isSelected
                        ? "border-sky-500 ring-2 ring-sky-500/20 shadow-xs"
                        : "border-slate-200/90 hover:border-slate-400 hover:shadow-xs"
                    }`}
                  >
                    {/* Checkbox chọn tệp */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelectFile(file.id, e)}
                      className={`absolute top-2 right-2 z-20 p-1 rounded-md transition ${
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "bg-slate-900/40 text-white/80 hover:bg-slate-900/70 opacity-0 group-hover:opacity-100"
                      }`}
                      title={isSelected ? "Bỏ chọn" : "Chọn tệp"}
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
                          <FileCode className="w-10 h-10 text-amber-500 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-amber-600">SVG</span>
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          {getFileIcon(file.extension, file.mimeType)}
                          <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 block font-mono">
                            .{file.extension || "FILE"}
                          </span>
                        </div>
                      )}

                      {/* Hover Action Overlay */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                          className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 shadow-xs"
                          title="Xem trước"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={file.fileUrl}
                          download={file.name}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 shadow-xs"
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
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>{formatBytes(file.fileSize)}</span>
                        <span>{new Date(file.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
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

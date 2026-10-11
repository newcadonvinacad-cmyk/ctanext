"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Palette,
  Compass,
  Receipt,
  FileCheck,
  ShieldCheck,
  Cloud,
  FolderPlus,
  ArrowLeft,
  Menu,
  X,
  HardDrive,
  Folder,
  FolderOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Bell,
  FileText,
  Camera,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { toast } from "@/components/ui";

interface FolderSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  itemCount: number;
  isSystem: boolean;
  systemCode?: string;
  description?: string;
  parentId?: string | null;
}

interface StorageMetrics {
  usedBytes: number;
  maxBytes: number;
  usedGB: string;
  maxGB: string;
  freeGB: string;
  usedPercent: number;
}

export default function DocumentAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentFolder = searchParams.get("folder") || "all";
  const { user } = useAuthorization();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [systemFolders, setSystemFolders] = React.useState<FolderSummary[]>([]);
  const [userFolders, setUserFolders] = React.useState<FolderSummary[]>([]);
  const [storageMetrics, setStorageMetrics] = React.useState<StorageMetrics>({
    usedBytes: 6.2 * 1024 * 1024 * 1024,
    maxBytes: 10 * 1024 * 1024 * 1024,
    usedGB: "6.2",
    maxGB: "10",
    freeGB: "3.8",
    usedPercent: 62,
  });
  const [loadingFolders, setLoadingFolders] = React.useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [newFolderColor, setNewFolderColor] = React.useState("#f59e0b");
  const [creatingFolder, setCreatingFolder] = React.useState(false);

  // Trạng thái thu gọn nhóm thư mục tự tạo
  const [userFoldersExpanded, setUserFoldersExpanded] = React.useState(true);

  // Load danh mục thư mục & dung lượng
  const fetchFolders = React.useCallback(async () => {
    try {
      setLoadingFolders(true);
      const res = await fetch("/api/documents/folders");
      if (res.ok) {
        const data = await res.json();
        if (data.systemFolders) setSystemFolders(data.systemFolders);
        if (data.userFolders) setUserFolders(data.userFolders);
        if (data.storage) setStorageMetrics(data.storage);
      }
    } catch (e) {
      console.error("Lỗi tải danh mục thư mục:", e);
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      setCreatingFolder(true);
      const res = await fetch("/api/documents/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          color: newFolderColor,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewFolderName("");
        setShowNewFolderModal(false);
        toast.success("Đã tạo thư mục mới thành công!");
        await fetchFolders();
        if (data.folder?.id) {
          router.push(`/apps/tai-lieu?folder=${data.folder.id}`);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Không thể tạo thư mục");
      }
    } catch (err: any) {
      toast.error("Lỗi: " + err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const getSystemIcon = (iconName: string) => {
    switch (iconName) {
      case "palette":
        return Layers;
      case "compass":
        return Camera;
      case "receipt":
        return Receipt;
      case "file-check":
        return FileCheck;
      case "shield-check":
        return ShieldCheck;
      case "cloud":
        return Cloud;
      default:
        return FileText;
    }
  };

  const getSystemIconColor = (iconName: string) => {
    switch (iconName) {
      case "palette":
        return "text-indigo-600 bg-indigo-50 border-indigo-200";
      case "compass":
        return "text-sky-600 bg-sky-50 border-sky-200";
      case "receipt":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "file-check":
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "shield-check":
        return "text-teal-600 bg-teal-50 border-teal-200";
      case "cloud":
        return "text-purple-600 bg-purple-50 border-purple-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  // Xác định tên thư mục hiện tại để hiển thị trên TopBar
  const currentFolderName = React.useMemo(() => {
    if (currentFolder === "all") return "Kho Tài Liệu";
    const sys = systemFolders.find((f) => f.id === currentFolder);
    if (sys) return sys.name;
    const usr = userFolders.find((f) => f.id === currentFolder);
    if (usr) return usr.name;
    return "Tài Liệu";
  }, [currentFolder, systemFolders, userFolders]);

  return (
    <div className="min-h-screen bg-[#f3f5f9] flex flex-col font-sans text-slate-800">
      {/* ======================================================== */}
      {/* 1. TOP GLOBAL APP BAR (THEO CHUẨN MOCKUP) */}
      {/* ======================================================== */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left: App Logo & Breadcrumb Header Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/apps/tai-lieu" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0e1726] flex items-center justify-center text-white shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-[#0e1726] flex items-center gap-2">
                <span>{currentFolder === "all" ? "Kho Tài Liệu" : currentFolderName}</span>
                {currentFolder !== "all" && (
                  <>
                    <span className="text-slate-400 font-normal">•</span>
                    <span className="text-xs font-semibold text-slate-500">
                      Hệ thống quản lý file
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Right: Quick actions, notifications, user avatar */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Quay về bàn làm việc ERP"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Bàn Làm Việc</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <button
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
            title="Thông báo"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
            title="Trợ giúp"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User Avatar & Dropdown */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-[#94a3b8] flex items-center justify-center font-bold text-xs text-white uppercase shadow-2xs">
              {user?.name ? user.name.slice(0, 2) : "NA"}
            </div>
            <div className="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-700">
              <span className="max-w-[120px] truncate">{user?.name || "Người dùng"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. BODY CONTAINER: SIDEBAR SÁNG + MAIN WORKSPACE */}
      {/* ======================================================== */}
      <div className="flex-1 flex max-w-[1920px] w-full mx-auto">
        {/* ======================================================== */}
        {/* 2.1 SIDEBAR SÁNG TINH TẾ (THEO PHONG CÁCH DRIVE MOCKUP) */}
        {/* ======================================================== */}
        <aside
          className={`fixed md:sticky top-16 left-0 z-20 h-[calc(100vh-4rem)] w-72 bg-[#f8fafc] flex flex-col border-r border-slate-200/80 transition-transform duration-200 ease-in-out print:hidden shrink-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* Mobile close button */}
          <div className="md:hidden px-4 py-3 flex items-center justify-between border-b border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh Mục Tài Liệu
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nội dung danh mục thư mục có thể cuộn */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 text-xs select-none">
            {/* NHÓM 1: DANH MỤC TỆP HỆ THỐNG */}
            <div>
              <div className="px-2 pb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
                DANH MỤC TỆP
              </div>

              <div className="space-y-1">
                {/* Toàn bộ kho */}
                <Link
                  href="/apps/tai-lieu?folder=all"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                    currentFolder === "all"
                      ? "bg-[#0e1726] text-white font-bold shadow-xs"
                      : "text-slate-700 hover:bg-slate-200/70 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <HardDrive
                      className={`w-4 h-4 shrink-0 ${
                        currentFolder === "all" ? "text-sky-400" : "text-slate-500"
                      }`}
                    />
                    <span className="truncate">Tất Cả Tệp Tin</span>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      currentFolder === "all"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {systemFolders.reduce((sum, f) => sum + (f.itemCount || 0), 0) +
                      userFolders.reduce((sum, f) => sum + (f.itemCount || 0), 0)}
                  </span>
                </Link>

                {/* Các danh mục hệ thống ERP */}
                {systemFolders.map((sf) => {
                  const IconComponent = getSystemIcon(sf.icon);
                  const isActive = currentFolder === sf.id;

                  return (
                    <Link
                      key={sf.id}
                      href={`/apps/tai-lieu?folder=${sf.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                        isActive
                          ? "bg-[#0e1726] text-white font-bold shadow-xs"
                          : "text-slate-700 hover:bg-slate-200/70 font-semibold"
                      }`}
                      title={sf.description}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            isActive
                              ? "bg-white/10 border-white/20 text-white"
                              : getSystemIconColor(sf.icon)
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{sf.name}</span>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {sf.itemCount}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* NHÓM 2: THƯ MỤC TỰ TẠO (CÂY THƯ MỤC THEO MOCKUP) */}
            <div>
              <div className="px-2 pb-2 text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <button
                  onClick={() => setUserFoldersExpanded(!userFoldersExpanded)}
                  className="flex items-center gap-1.5 hover:text-slate-700 transition"
                >
                  {userFoldersExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>THƯ MỤC TỰ TẠO</span>
                </button>
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded transition"
                  title="Tạo thư mục mới"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {userFoldersExpanded && (
                <div className="space-y-1 pl-1">
                  {userFolders.length === 0 ? (
                    <div className="px-3 py-3 rounded-xl border border-dashed border-slate-300 text-center bg-white/50">
                      <p className="text-[11px] text-slate-400">Chưa có thư mục tự tạo</p>
                      <button
                        onClick={() => setShowNewFolderModal(true)}
                        className="mt-1 text-[11px] text-sky-600 hover:text-sky-700 font-bold inline-flex items-center gap-1"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>+ Thư mục mới</span>
                      </button>
                    </div>
                  ) : (
                    userFolders.map((uf) => {
                      const isActive = currentFolder === uf.id;
                      return (
                        <Link
                          key={uf.id}
                          href={`/apps/tai-lieu?folder=${uf.id}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl transition ${
                            isActive
                              ? "bg-[#0e1726] text-white font-bold shadow-xs"
                              : "text-slate-700 hover:bg-slate-200/70 font-semibold"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                              <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                            </span>
                            <span className="truncate">{uf.name}</span>
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "text-slate-400 bg-slate-200/60"
                            }`}
                          >
                            {uf.itemCount}
                          </span>
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2.2 WIDGET DUNG LƯỢNG LƯU TRỮ (STORAGE QUOTA DƯỚI GÓC TRÁI) */}
          {/* ======================================================== */}
          <div className="p-4 border-t border-slate-200/80 bg-white/70">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium text-[11px]">Bộ nhớ đã dùng</span>
            </div>
            <div className="text-base font-extrabold text-[#0e1726]">
              {storageMetrics.usedGB} GB{" "}
              <span className="text-xs font-semibold text-slate-400">
                / {storageMetrics.maxGB} GB
              </span>
            </div>

            {/* Thanh tiến trình màu tối theo mockup */}
            <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#0e1726] h-full rounded-full transition-all duration-300"
                style={{ width: `${storageMetrics.usedPercent}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-400 font-medium mt-1.5">
              Còn trống {storageMetrics.freeGB} GB
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* 2.3 MAIN WORKSPACE AREA */}
        {/* ======================================================== */}
        <main className="flex-1 min-w-0 bg-white border-l border-slate-200/60 flex flex-col min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL TẠO THƯ MỤC MỚI */}
      {/* ======================================================== */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Tạo Thư Mục Tự Quản Mới</h3>
              </div>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Thư Mục *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ví dụ: Hợp đồng 2026, Biểu mẫu tạm ứng..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Màu Sắc Nhận Diện
                </label>
                <div className="flex items-center gap-3">
                  {[
                    "#f59e0b", // Amber/Gold folder
                    "#0284c7", // Sky blue
                    "#10b981", // Emerald green
                    "#ef4444", // Red
                    "#8b5cf6", // Purple
                    "#ec4899", // Pink
                    "#475569", // Slate
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewFolderColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        newFolderColor === c ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-4 py-2 text-xs font-bold bg-[#0e1726] hover:bg-slate-800 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingFolder ? "Đang tạo..." : "Tạo Thư Mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

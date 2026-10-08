"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  FolderKanban,
  Files,
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
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";

interface FolderSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  itemCount: number;
  isSystem: boolean;
  systemCode?: string;
  description?: string;
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
  const [loadingFolders, setLoadingFolders] = React.useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [newFolderColor, setNewFolderColor] = React.useState("#0284c7");
  const [creatingFolder, setCreatingFolder] = React.useState(false);

  // Load danh mục thư mục
  const fetchFolders = React.useCallback(async () => {
    try {
      setLoadingFolders(true);
      const res = await fetch("/api/documents/folders");
      if (res.ok) {
        const data = await res.json();
        if (data.systemFolders) setSystemFolders(data.systemFolders);
        if (data.userFolders) setUserFolders(data.userFolders);
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
        await fetchFolders();
        if (data.folder?.id) {
          router.push(`/apps/tai-lieu?folder=${data.folder.id}`);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Không thể tạo thư mục");
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const getSystemIcon = (iconName: string) => {
    switch (iconName) {
      case "palette":
        return Palette;
      case "compass":
        return Compass;
      case "receipt":
        return Receipt;
      case "file-check":
        return FileCheck;
      case "shield-check":
        return ShieldCheck;
      case "cloud":
        return Cloud;
      default:
        return Files;
    }
  };

  // Tính tổng số tệp tin hệ thống
  const totalFilesCount = React.useMemo(() => {
    const sysTotal = systemFolders.reduce((sum, f) => sum + (f.itemCount || 0), 0);
    const userTotal = userFolders.reduce((sum, f) => sum + (f.itemCount || 0), 0);
    return sysTotal + userTotal;
  }, [systemFolders, userFolders]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900">
      {/* ======================================================== */}
      {/* 1. SIDEBAR DỌC NỀN SLATE TỐI (FILE EXPLORER NAV SIDEBAR) */}
      {/* ======================================================== */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 bg-[#0c1a30] text-slate-200 flex flex-col border-r border-[#1a2e4c] transition-transform duration-200 ease-in-out print:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header: Brand & App Title */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#1a2e4c]">
          <Link href="/apps/tai-lieu" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                KHO TÀI LIỆU
                <span className="text-[9px] px-1.5 py-0.2 bg-sky-500/20 text-sky-300 font-bold rounded">
                  Drive
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Quản Trị File &amp; Chứng Từ Nội Bộ
              </div>
            </div>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nút Quay lại Hệ Thống ERP */}
        <div className="p-3 border-b border-[#1a2e4c]">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#162744] rounded-lg transition group border border-slate-700/50"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Về Bàn Làm Việc ERP</span>
          </Link>
        </div>

        {/* Nội dung danh mục thư mục có thể cuộn */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 text-xs">
          {/* MỤC 1: TẤT CẢ TÀI LIỆU */}
          <div>
            <Link
              href="/apps/tai-lieu?folder=all"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-bold transition ${
                currentFolder === "all"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-300 hover:bg-[#162744] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span>Toàn Bộ Kho Tệp Tin</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  currentFolder === "all"
                    ? "bg-white/20 text-white"
                    : "bg-[#162744] text-slate-400"
                }`}
              >
                {totalFilesCount}
              </span>
            </Link>
          </div>

          {/* MỤC 2: THƯ MỤC HỆ THỐNG TỰ ĐỘNG GOM TỪ ERP */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Hệ Thống Tự Động Phân Loại</span>
              <span className="text-[9px] text-emerald-400 font-semibold lowercase">
                live sync
              </span>
            </div>

            <div className="space-y-1 mt-1">
              {systemFolders.map((sf) => {
                const IconComponent = getSystemIcon(sf.icon);
                const isActive = currentFolder === sf.id;

                return (
                  <Link
                    key={sf.id}
                    href={`/apps/tai-lieu?folder=${sf.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition ${
                      isActive
                        ? "bg-sky-600 text-white font-bold shadow-xs"
                        : "text-slate-300 hover:bg-[#162744] hover:text-white font-medium"
                    }`}
                    title={sf.description}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: sf.color }}
                      />
                      <IconComponent className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="truncate text-xs">{sf.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white font-bold"
                          : "bg-[#162744] text-slate-400"
                      }`}
                    >
                      {sf.itemCount}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* MỤC 3: THƯ MỤC TỰ TẠO (CUSTOM USER FOLDERS) */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Thư Mục Tự Tạo</span>
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="p-1 hover:bg-[#162744] text-sky-400 hover:text-sky-300 rounded transition"
                title="Tạo thư mục mới"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 mt-1">
              {userFolders.length === 0 ? (
                <div className="px-3 py-3 rounded-lg border border-dashed border-[#1a2e4c] text-center">
                  <p className="text-[11px] text-slate-400">Chưa có thư mục tự tạo nào</p>
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="mt-1.5 text-[11px] text-sky-400 hover:text-sky-300 font-bold inline-flex items-center gap-1"
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
                      className={`flex items-center justify-between px-3 py-2 rounded-lg transition ${
                        isActive
                          ? "bg-sky-600 text-white font-bold shadow-xs"
                          : "text-slate-300 hover:bg-[#162744] hover:text-white font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Folder
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: uf.color || "#0284c7" }}
                        />
                        <span className="truncate text-xs">{uf.name}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                          isActive
                            ? "bg-white/20 text-white font-bold"
                            : "bg-[#162744] text-slate-400"
                        }`}
                      >
                        {uf.itemCount}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Sidebar: User Information & Storage Status */}
        <div className="p-3 border-t border-[#1a2e4c] bg-[#091424]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || "Người dùng"}
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>Kho lưu trữ an toàn</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. TOP MOBILE HEADER BAR */}
      {/* ======================================================== */}
      <div className="md:hidden h-14 bg-[#0c1a30] text-white px-4 flex items-center justify-between border-b border-[#1a2e4c] sticky top-0 z-30 print:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-[#162744] rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-sky-400" />
          <span className="text-xs font-black uppercase tracking-wider">Kho Tài Liệu Nội Bộ</span>
        </div>

        <Link href="/" className="text-xs text-slate-300 hover:text-white font-semibold">
          Thoát
        </Link>
      </div>

      {/* ======================================================== */}
      {/* 3. VÙNG NỘI DUNG CHÍNH (MAIN WORKSPACE) */}
      {/* ======================================================== */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        {children}
      </main>

      {/* ======================================================== */}
      {/* MODAL TẠO THƯ MỤC MỚI */}
      {/* ======================================================== */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                  placeholder="Ví dụ: Hợp đồng thầu phụ 2026, Biểu mẫu tạm ứng..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Màu Sắc Nhận Diện
                </label>
                <div className="flex items-center gap-3">
                  {[
                    "#0284c7", // Sky blue
                    "#10b981", // Emerald green
                    "#f59e0b", // Amber
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
                  className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
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

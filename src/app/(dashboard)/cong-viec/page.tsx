"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckSquare, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  PlayCircle, 
  Sliders, 
  Send, 
  FileCheck,
  Building,
  Navigation,
  Sparkles,
  ChevronRight,
  HardHat,
  Search,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui";
import { useSetPageHeader } from "@/contexts/page-header-context";

interface PersonalTask {
  id: string;
  code: string;
  title: string;
  status: "todo" | "doing" | "awaiting_acceptance" | "done" | "cancelled";
  dueAt: string | null;
  progressPercent: number;
  projectId: string;
  projectCode: string;
  projectName: string;
  projectAddress?: string;
  projectLat?: number | null;
  projectLon?: number | null;
}

export default function CongViecPage() {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [employee, setEmployee] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // State cập nhật tiến độ
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(0);
  const [updating, setUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/field/my-tasks");
      if (!res.ok) {
        throw new Error("Không thể tải danh sách công việc");
      }
      const data = await res.json();
      setTasks(data.tasks || []);
      setEmployee(data.employee || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const handleUpdateProgress = async (taskId: string) => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/projects/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressPercent: tempProgress,
          status: tempProgress === 100 ? "done" : tempProgress > 0 ? "doing" : "todo",
        }),
      });

      if (!res.ok) {
        throw new Error("Cập nhật tiến độ thất bại");
      }

      setToastMessage("Cập nhật tiến độ thành công!");
      setTimeout(() => setToastMessage(null), 3000);
      setEditingTaskId(null);
      await fetchMyTasks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchStatus = 
      filterStatus === "all" ? true :
      filterStatus === "doing" ? t.status === "doing" :
      filterStatus === "done" ? t.status === "done" :
      filterStatus === "todo" ? t.status === "todo" : true;

    const matchQuery = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchStatus && matchQuery;
  });

  const doingCount = tasks.filter((t) => t.status === "doing").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const todoCount = tasks.filter((t) => t.status === "todo").length;

  // Đồng bộ tiêu đề & nút vào TopBar
  useSetPageHeader(
    {
      title: "Việc làm",
      subtitle: "Trung tâm phân công",
      screenCode: "M10",
      primaryAction: (
        <div className="flex items-center gap-1.5">
          <Link
            href="/hien-truong"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>App Mobile (M14)</span>
          </Link>
          <button
            onClick={fetchMyTasks}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Làm mới công việc"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      ),
      quickViews: [
        { label: "Việc hôm nay", href: "/cong-viec?filter=today" },
        { label: "Đang làm", href: "/cong-viec?filter=doing" },
        { label: "Chờ nhận việc", href: "/cong-viec?filter=todo" },
        { label: "Đã hoàn thành", href: "/cong-viec?filter=done" },
      ],
    },
    [employee, loading]
  );

  return (
    <div className="w-full flex flex-col space-y-2 flex-1">

      {/* 2. StatBar 1 dòng thu gọn theo quy chuẩn UI/UX */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        <button
          onClick={() => setFilterStatus("all")}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg text-left transition ${
            filterStatus === "all" ? "bg-white shadow-xs font-bold text-blue-600" : "text-slate-600 hover:bg-slate-100/60"
          }`}
        >
          <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 font-normal">Tất Cả Việc:</span>{" "}
            <strong>{tasks.length}</strong>
          </div>
        </button>

        <button
          onClick={() => setFilterStatus("doing")}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg text-left transition border-l border-slate-200 ${
            filterStatus === "doing" ? "bg-white shadow-xs font-bold text-amber-600" : "text-slate-600 hover:bg-slate-100/60"
          }`}
        >
          <PlayCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 font-normal">Đang Làm:</span>{" "}
            <strong className="text-amber-600">{doingCount}</strong>
          </div>
        </button>

        <button
          onClick={() => setFilterStatus("todo")}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg text-left transition border-l border-slate-200 ${
            filterStatus === "todo" ? "bg-white shadow-xs font-bold text-purple-600" : "text-slate-600 hover:bg-slate-100/60"
          }`}
        >
          <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 font-normal">Chờ Nhận:</span>{" "}
            <strong className="text-purple-600">{todoCount}</strong>
          </div>
        </button>

        <button
          onClick={() => setFilterStatus("done")}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg text-left transition border-l border-slate-200 ${
            filterStatus === "done" ? "bg-white shadow-xs font-bold text-emerald-600" : "text-slate-600 hover:bg-slate-100/60"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 font-normal">Đã Xong:</span>{" "}
            <strong className="text-emerald-600">{doneCount}</strong>
          </div>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Thanh tìm kiếm & lọc */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên việc, mã công việc, dự án..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Hiển thị: <strong>{filteredTasks.length}</strong> / {tasks.length} đầu việc</span>
        </div>
      </div>

      {/* 4. Danh sách công việc dạng thẻ chi tiết chuẩn UI/UX */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
            Đang tải dữ liệu công việc được giao...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
            Không có công việc nào trong danh mục lọc này
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isEditing = editingTaskId === t.id;
            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 hover:border-slate-300 transition"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                        {t.code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{t.title}</h3>
                      <Badge
                        variant={
                          t.status === "done"
                            ? "success"
                            : t.status === "doing"
                            ? "warning"
                            : "neutral"
                        }
                        className="text-[10px]"
                      >
                        {t.status === "done"
                          ? "Hoàn thành"
                          : t.status === "doing"
                          ? "Đang thi công"
                          : "Chờ thực hiện"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <strong>Dự án:</strong> {t.projectName} ({t.projectCode})
                      </span>
                      {t.projectAddress && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {t.projectAddress}
                        </span>
                      )}
                      {t.dueAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Hạn chót: {new Date(t.dueAt).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>

                    {/* Thanh tiến độ */}
                    <div className="pt-1 max-w-md">
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Tiến độ thực tế:</span>
                        <span className="font-bold text-blue-600">{t.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            t.progressPercent === 100
                              ? "bg-emerald-500"
                              : "bg-blue-600"
                          }`}
                          style={{ width: `${t.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Hành động cập nhật */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                    {isEditing ? (
                      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={tempProgress}
                          onChange={(e) => setTempProgress(Number(e.target.value))}
                          className="w-24 accent-blue-600"
                        />
                        <span className="text-xs font-bold w-9 text-center">{tempProgress}%</span>
                        <button
                          onClick={() => handleUpdateProgress(t.id)}
                          disabled={updating}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs hover:bg-slate-300 transition"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingTaskId(t.id);
                            setTempProgress(t.progressPercent);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          Cập nhật %
                        </button>

                        <Link
                          href={`/du-an/${t.projectId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition"
                        >
                          Chi tiết dự án <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

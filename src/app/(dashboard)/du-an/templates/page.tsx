"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  toast,
} from "@/components/ui";
import {
  ArrowLeft,
  Layers,
  Plus,
  Copy,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  HardHat,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { ProjectTemplateDto } from "@/services/project.service";

export default function ProjectTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = React.useState<ProjectTemplateDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedTemplate, setSelectedTemplate] = React.useState<ProjectTemplateDto | null>(null);

  const fetchTemplates = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects/templates");
      if (!res.ok) throw new Error("Không thể tải danh sách mẫu dự án");
      const data = await res.json();
      setTemplates(data.templates || []);
      if (data.templates?.length > 0) {
        setSelectedTemplate(data.templates[0]);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải mẫu");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/du-an"
              className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dự án
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800 dark:bg-primary-950 dark:text-primary-300">
              M13
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Thư Viện Mẫu Quy Trình Dự Án (Templates)
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Định nghĩa sẵn các Giai đoạn và Cây công việc WBS chuẩn ngành biển quảng cáo & nội thất. Khi tạo dự án mới, 1-click là nhân bản toàn bộ quy trình.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/du-an">
            <Button variant="outline" size="sm">
              Xem Danh Sách Dự Án
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* CỘT DANH SÁCH MẪU */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider px-1">
              Danh Mục Mẫu Chuẩn ({templates.length})
            </div>

            {templates.map((tpl) => {
              const isSelected = selectedTemplate?.id === tpl.id;
              const stageCount = tpl.definition?.stages?.length || 0;
              const taskCount =
                tpl.definition?.stages?.reduce((acc, s) => acc + (s.tasks?.length || 0), 0) || 0;

              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-primary-500 bg-primary-50/50 shadow-sm dark:border-primary-600 dark:bg-primary-950/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
                      {tpl.code}
                    </span>
                    <Badge variant="success">Hoạt động</Badge>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2">
                    {tpl.name}
                  </h3>

                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                    <span>{stageCount} giai đoạn</span>
                    <span>{taskCount} đầu việc WBS</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CỘT CHI TIẾT CÂY QUY TRÌNH MẪU ĐƯỢC CHỌN */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary-600">
                        {selectedTemplate.code}
                      </span>
                      <span className="text-xs text-neutral-400">
                        Phiên bản: v{selectedTemplate.revisionNo}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold mt-1">
                      {selectedTemplate.name}
                    </CardTitle>
                  </div>

                  <Link href={`/du-an`}>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-primary-600 text-white hover:bg-primary-700 shadow-sm"
                    >
                      <Copy className="h-4 w-4" />
                      Dùng Mẫu Này Tạo Dự Án
                    </Button>
                  </Link>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Cấu Trúc Quy Trình & Phân Rã Giai Đoạn
                  </div>

                  <div className="space-y-4">
                    {selectedTemplate.definition?.stages?.map((stage, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-lg border border-neutral-200 overflow-hidden dark:border-neutral-800"
                      >
                        <div className="flex items-center justify-between bg-neutral-50 px-4 py-2.5 dark:bg-neutral-800/60">
                          <div className="flex items-center gap-2 font-bold text-xs text-neutral-800 dark:text-neutral-200">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                              {sIdx + 1}
                            </span>
                            <span>{stage.name}</span>
                          </div>
                          <span className="text-[11px] text-neutral-500">
                            {stage.tasks?.length || 0} công việc
                          </span>
                        </div>

                        <div className="divide-y divide-neutral-100 p-2 dark:divide-neutral-800">
                          {stage.tasks?.map((task, tIdx) => (
                            <div
                              key={tIdx}
                              className="flex items-center justify-between px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                                <span>{task.title}</span>
                              </div>
                              <span className="font-mono text-[11px] text-neutral-400">
                                Trọng số: {task.weight}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-400">
                Chọn một mẫu bên trái để xem chi tiết
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";

export default function ProjectTemplatesPage() {
  const router = useRouter();
  const { can } = useAuthorization();
  const [templates, setTemplates] = React.useState<ProjectTemplateDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedTemplate, setSelectedTemplate] = React.useState<ProjectTemplateDto | null>(null);

  useSetPageHeader(
    {
      title: "Thư viện mẫu quy trình",
      subtitle: "Định nghĩa giai đoạn & cây công việc WBS chuẩn",
      screenCode: "M13",
      quickViews: [
        { label: "Danh sách công trình", href: "/du-an?view=projects" },
        { label: "Kanban tiến độ đầu việc", href: "/du-an?view=tasks" },
        { label: "Mẫu quy trình (M13)", href: "/du-an/templates" },
      ],
      primaryAction: (
        <Link href="/du-an">
          <Button variant="outline" size="sm" className="h-8 text-xs border-slate-300">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Về danh sách dự án
          </Button>
        </Link>
      ),
    },
    []
  );

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

  if (!can("project.read") && !can("project_template.read")) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 max-w-md mx-auto mt-8">
        <p className="text-sm font-semibold text-slate-800">Bạn không có quyền xem mẫu quy trình dự án</p>
        <Link href="/du-an">
          <Button variant="outline" size="sm" className="mt-3 text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Về trang dự án
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* CỘT DANH SÁCH MẪU */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
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
                      ? "border-blue-500 bg-blue-50/50 shadow-2xs ring-1 ring-blue-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {tpl.code}
                    </span>
                    <Badge variant="success">Hoạt động</Badge>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-slate-900 line-clamp-2">
                    {tpl.name}
                  </h3>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
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
              <Card className="border-slate-200 bg-white shadow-2xs rounded-xl">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600">
                        {selectedTemplate.code}
                      </span>
                      <span className="text-xs text-slate-400">
                        Phiên bản: v{selectedTemplate.revisionNo}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold mt-1 text-slate-900">
                      {selectedTemplate.name}
                    </CardTitle>
                  </div>

                  <Link href={`/du-an`}>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800 shadow-2xs font-semibold"
                    >
                      <Copy className="h-4 w-4" />
                      Dùng Mẫu Này Tạo Dự Án
                    </Button>
                  </Link>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Cấu Trúc Quy Trình & Phân Rã Giai Đoạn
                  </div>

                  <div className="space-y-4">
                    {selectedTemplate.definition?.stages?.map((stage, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-lg border border-slate-200 overflow-hidden"
                      >
                        <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                          <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                              {sIdx + 1}
                            </span>
                            <span>{stage.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {stage.tasks?.length || 0} công việc
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100 p-2">
                          {stage.tasks?.map((task, tIdx) => (
                            <div
                              key={tIdx}
                              className="flex items-center justify-between px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2 text-slate-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <span>{task.title}</span>
                              </div>
                              <span className="font-mono text-[11px] text-slate-400">
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

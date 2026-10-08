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
  Modal,
  Input,
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
  Edit3,
  Trash2,
  Save,
  X,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  GripVertical,
} from "lucide-react";
import type {
  ProjectTemplateDto,
  ProjectTemplateStage,
} from "@/services/project.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";

// Các mẫu quy trình gợi ý thực tế ngành biển hiệu
const PRESET_TEMPLATES: {
  name: string;
  codePrefix: string;
  stages: ProjectTemplateStage[];
}[] = [
  {
    name: "Biển Mặt Dựng Alu & Bộ Chữ Nổi Inox/Mica Sáng Đèn",
    codePrefix: "TPL-ALU-INOX",
    stages: [
      {
        name: "1. Khảo sát hiện trường & Đo đạc mặt bằng",
        tasks: [
          { title: "Đo đạc kích thước thực tế dài x rộng x cao mặt tiền", weight: 5, mode: "manual" },
          { title: "Kiểm tra kết cấu chịu lực dầm tường & nguồn điện cấp", weight: 5, mode: "manual" },
        ],
      },
      {
        name: "2. Thiết kế 2D/3D & Duyệt market sản xuất",
        tasks: [
          { title: "Vẽ bản vẽ kỹ thuật 2D kết cấu khung sắt", weight: 5, mode: "manual" },
          { title: "Phối cảnh 3D & duyệt mẫu màu sắc với khách hàng", weight: 5, mode: "manual" },
        ],
      },
      {
        name: "3. Gia công sản xuất tại xưởng",
        tasks: [
          { title: "Hàn kết cấu khung sắt hộp mạ kẽm & sơn chống gỉ", weight: 15, mode: "manual" },
          { title: "Cắt CNC tấm Alu & uốn chân chữ nổi Inox/Mica", weight: 15, mode: "manual" },
          { title: "Đấu nối cụm module LED 12V & chạy thử độ sáng (Aging test)", weight: 10, mode: "manual" },
        ],
      },
      {
        name: "4. Vận chuyển & Điều phối đội xe",
        tasks: [
          { title: "Bọc màng PE bảo vệ bề mặt chữ và tấm ốp", weight: 5, mode: "manual" },
          { title: "Vận chuyển đến địa điểm thi công bằng xe chuyên dụng", weight: 5, mode: "manual" },
        ],
      },
      {
        name: "5. Thi công lắp dựng hiện trường",
        tasks: [
          { title: "Dựng giàn giáo, neo dầm bu-lông chịu lực an toàn", weight: 15, mode: "manual" },
          { title: "Ốp tấm Alu, gắn chữ nổi và căn chỉnh cân đối", weight: 10, mode: "manual" },
          { title: "Đấu nối tủ điện, timer hẹn giờ và kiểm tra an toàn điện", weight: 5, mode: "manual" },
        ],
      },
      {
        name: "6. Nghiệm thu & Bàn giao công trình",
        tasks: [
          { title: "Vệ sinh bề mặt & test sáng ngày/đêm cùng đại diện khách hàng", weight: 5, mode: "manual" },
          { title: "Ký kết biên bản nghiệm thu hoàn thành công trình", weight: 5, mode: "manual" },
        ],
      },
    ],
  },
  {
    name: "Hộp Đèn Hiflex Khung Sắt & Hộp Đèn Siêu Mỏng LED",
    codePrefix: "TPL-HOPDEN",
    stages: [
      {
        name: "1. Khảo sát & Đo đạc kích thước",
        tasks: [
          { title: "Đo đạc vị trí lắp đặt hộp đèn & nguồn điện 220V", weight: 10, mode: "manual" },
        ],
      },
      {
        name: "2. In ấn bạt & Gia công khung hộp đèn",
        tasks: [
          { title: "In kỹ thuật số bạt Hiflex không gân xuyên sáng", weight: 20, mode: "manual" },
          { title: "Cắt khung nhôm định hình & hàn khung sắt gia cố", weight: 20, mode: "manual" },
          { title: "Lắp đặt thanh LED thanh & nguồn Meanwell 12V", weight: 20, mode: "manual" },
        ],
      },
      {
        name: "3. Lắp dựng & Bàn giao",
        tasks: [
          { title: "Cố định hộp đèn lên vị trí & đấu nối nguồn điện", weight: 20, mode: "manual" },
          { title: "Test sáng & ký biên bản bàn giao", weight: 10, mode: "manual" },
        ],
      },
    ],
  },
  {
    name: "Thi Công Trọn Gói Kèm Bảo Trì Định Kỳ (Có Bảo Hành)",
    codePrefix: "TPL-FULL-MAINTAIN",
    stages: [
      {
        name: "1. Khảo sát & Thiết kế",
        tasks: [
          { title: "Khảo sát hiện trường & duyệt bản vẽ phối cảnh", weight: 15, mode: "manual" },
        ],
      },
      {
        name: "2. Sản xuất tại xưởng",
        tasks: [
          { title: "Gia công toàn bộ khung, mặt biển & hệ thống LED", weight: 35, mode: "manual" },
        ],
      },
      {
        name: "3. Thi công & Nghiệm thu",
        tasks: [
          { title: "Lắp dựng hoàn thiện tại hiện trường", weight: 30, mode: "manual" },
          { title: "Nghiệm thu bàn giao đưa vào sử dụng", weight: 10, mode: "manual" },
        ],
      },
      {
        name: "4. Bảo hành & Bảo trì định kỳ (Tùy chọn)",
        tasks: [
          { title: "Kiểm tra bảo dưỡng hệ thống LED & nguồn định kỳ 6 tháng", weight: 5, mode: "manual" },
          { title: "Vệ sinh bề mặt biển & siết lại bu-lông neo giằng", weight: 5, mode: "manual" },
        ],
      },
    ],
  },
];

export default function ProjectTemplatesPage() {
  const router = useRouter();
  const { can } = useAuthorization();
  const [templates, setTemplates] = React.useState<ProjectTemplateDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedTemplate, setSelectedTemplate] = React.useState<ProjectTemplateDto | null>(null);

  // Modal Thêm / Sửa mẫu
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null);
  const [templateCode, setTemplateCode] = React.useState("");
  const [templateName, setTemplateName] = React.useState("");
  const [templateStages, setTemplateStages] = React.useState<ProjectTemplateStage[]>([]);
  const [saving, setSaving] = React.useState(false);

  // Modal Xóa mẫu
  const [deletingTemplate, setDeletingTemplate] = React.useState<ProjectTemplateDto | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  useSetPageHeader(
    {
      title: "Thư viện mẫu quy trình",
      subtitle: "Tùy biến giai đoạn, thứ tự và các đầu mục công việc WBS linh hoạt",
      screenCode: "M13",
      quickViews: [
        { label: "Danh sách công trình", href: "/du-an?view=projects" },
        { label: "Kanban tiến độ đầu việc", href: "/du-an?view=tasks" },
        { label: "Mẫu quy trình (M13)", href: "/du-an/templates" },
      ],
      primaryAction: (
        <div className="flex items-center gap-2">
          {can("project_template.create") && (
            <Button
              size="sm"
              onClick={() => handleOpenCreate()}
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo mẫu mới</span>
            </Button>
          )}
          <Link href="/du-an">
            <Button variant="outline" size="sm" className="h-8 text-xs border-slate-300">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Về danh sách dự án
            </Button>
          </Link>
        </div>
      ),
    },
    [can]
  );

  const fetchTemplates = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects/templates");
      if (!res.ok) throw new Error("Không thể tải danh sách mẫu dự án");
      const data = await res.json();
      const list = data.templates || [];
      setTemplates(list);
      if (list.length > 0) {
        setSelectedTemplate((prev) => {
          if (!prev) return list[0];
          const found = list.find((t: ProjectTemplateDto) => t.id === prev.id);
          return found || list[0];
        });
      } else {
        setSelectedTemplate(null);
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

  // Mở modal tạo mới với mẫu mặc định
  const handleOpenCreate = () => {
    setEditingTemplateId(null);
    setTemplateCode(`TPL-${Date.now().toString().slice(-4)}`);
    setTemplateName("");
    // Nạp sẵn mẫu Alu Inox gợi ý nhưng cho phép sửa/xóa/thêm thoải mái
    loadPreset(PRESET_TEMPLATES[0]);
    setIsEditorOpen(true);
  };

  // Nạp nhanh preset
  const loadPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    if (!editingTemplateId) {
      setTemplateCode(`${preset.codePrefix}-${Date.now().toString().slice(-4)}`);
      setTemplateName(preset.name);
    }
    setTemplateStages(
      preset.stages.map((s) => ({
        name: s.name,
        tasks: (s.tasks || []).map((t) => ({ ...t })),
      }))
    );
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (tpl: ProjectTemplateDto) => {
    setEditingTemplateId(tpl.id);
    setTemplateCode(tpl.code);
    setTemplateName(tpl.name);

    const existingStages = tpl.definition?.stages || [];
    setTemplateStages(
      existingStages.map((s) => ({
        name: s.name,
        tasks: (s.tasks || []).map((t) => ({ ...t })),
      }))
    );
    setIsEditorOpen(true);
  };

  // 1. Thêm giai đoạn mới
  const handleAddStage = () => {
    const nextIdx = templateStages.length + 1;
    setTemplateStages((prev) => [
      ...prev,
      {
        name: `Giai đoạn ${nextIdx}: Tên giai đoạn mới`,
        tasks: [{ title: "Đầu mục công việc 1", weight: 10, mode: "manual" }],
      },
    ]);
  };

  // 2. Xóa giai đoạn
  const handleDeleteStage = (stageIdx: number) => {
    if (templateStages.length <= 1) {
      toast.warning("Mẫu quy trình cần có ít nhất 1 giai đoạn");
      return;
    }
    setTemplateStages((prev) => prev.filter((_, i) => i !== stageIdx));
  };

  // 3. Sửa tên giai đoạn
  const handleUpdateStageName = (stageIdx: number, newName: string) => {
    setTemplateStages((prev) => {
      const next = [...prev];
      next[stageIdx] = { ...next[stageIdx], name: newName };
      return next;
    });
  };

  // 4. Di chuyển giai đoạn lên / xuống
  const handleMoveStage = (stageIdx: number, direction: "up" | "down") => {
    if (direction === "up" && stageIdx === 0) return;
    if (direction === "down" && stageIdx === templateStages.length - 1) return;

    setTemplateStages((prev) => {
      const next = [...prev];
      const targetIdx = direction === "up" ? stageIdx - 1 : stageIdx + 1;
      const temp = next[stageIdx];
      next[stageIdx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  // 5. Thêm đầu việc cho 1 giai đoạn
  const handleAddTaskToStage = (stageIdx: number) => {
    setTemplateStages((prev) => {
      const next = [...prev];
      const stage = { ...next[stageIdx] };
      stage.tasks = [
        ...stage.tasks,
        { title: "", weight: 10, mode: "manual" },
      ];
      next[stageIdx] = stage;
      return next;
    });
  };

  // 6. Cập nhật thông tin đầu việc
  const handleUpdateTaskInStage = (stageIdx: number, taskIdx: number, field: "title" | "weight", value: any) => {
    setTemplateStages((prev) => {
      const next = [...prev];
      const stage = { ...next[stageIdx] };
      const tasks = [...stage.tasks];
      tasks[taskIdx] = {
        ...tasks[taskIdx],
        [field]: field === "weight" ? Number(value) || 1 : value,
      };
      stage.tasks = tasks;
      next[stageIdx] = stage;
      return next;
    });
  };

  // 7. Xóa đầu việc
  const handleDeleteTaskFromStage = (stageIdx: number, taskIdx: number) => {
    setTemplateStages((prev) => {
      const next = [...prev];
      const stage = { ...next[stageIdx] };
      stage.tasks = stage.tasks.filter((_, i) => i !== taskIdx);
      next[stageIdx] = stage;
      return next;
    });
  };

  // Lưu mẫu (Tạo mới hoặc Sửa)
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Vui lòng nhập tên mẫu quy trình");
      return;
    }
    if (!templateCode.trim()) {
      toast.error("Vui lòng nhập mã mẫu quy trình");
      return;
    }
    if (templateStages.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 giai đoạn cho mẫu");
      return;
    }

    // Kiểm tra tên giai đoạn và đầu việc
    for (let sIdx = 0; sIdx < templateStages.length; sIdx++) {
      const s = templateStages[sIdx];
      if (!s.name.trim()) {
        toast.error(`Giai đoạn số ${sIdx + 1} chưa có tên. Vui lòng nhập tên giai đoạn`);
        return;
      }
      for (let tIdx = 0; tIdx < s.tasks.length; tIdx++) {
        if (!s.tasks[tIdx].title.trim()) {
          toast.error(`Vui lòng nhập tiêu đề công việc ở [${s.name}] hoặc xóa dòng rỗng`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      if (editingTemplateId) {
        // Cập nhật
        const res = await fetch(`/api/projects/templates/${editingTemplateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName.trim(),
            definition: { stages: templateStages },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Lỗi cập nhật mẫu");
        }
        toast.success("Đã cập nhật mẫu quy trình thành công!");
      } else {
        // Tạo mới
        const res = await fetch("/api/projects/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: templateCode.trim(),
            name: templateName.trim(),
            definition: { stages: templateStages },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Lỗi tạo mẫu");
        }
        toast.success("Đã khởi tạo mẫu quy trình mới!");
      }

      setIsEditorOpen(false);
      await fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu mẫu");
    } finally {
      setSaving(false);
    }
  };

  // Xác nhận xóa mẫu
  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/projects/templates/${deletingTemplate.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi xóa mẫu");
      }
      toast.success(`Đã xóa mẫu quy trình [${deletingTemplate.code}]`);
      setDeletingTemplate(null);
      await fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa mẫu");
    } finally {
      setDeleting(false);
    }
  };

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
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Danh Mục Mẫu ({templates.length})
              </span>
              {can("project_template.create") && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm mẫu</span>
                </button>
              )}
            </div>

            {templates.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                Chưa có mẫu quy trình nào. Bấm nút "Thêm mẫu" để tạo quy trình chuẩn.
              </div>
            ) : (
              templates.map((tpl) => {
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
              })
            )}
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

                  <div className="flex items-center gap-2">
                    {can("project_template.update") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(selectedTemplate)}
                        className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sửa mẫu</span>
                      </Button>
                    )}

                    {can("project_template.archive") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingTemplate(selectedTemplate)}
                        className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Xóa</span>
                      </Button>
                    )}

                    <Link href={`/du-an`}>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-slate-900 text-white hover:bg-slate-800 shadow-2xs font-semibold text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Dùng Tạo Dự Án</span>
                      </Button>
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Cấu Trúc {selectedTemplate.definition?.stages?.length || 0} Giai Đoạn & Đầu Việc WBS
                    </span>
                    <span className="text-xs text-slate-400">
                      Có thể chỉnh sửa, thêm/bớt hoặc thay đổi thứ tự bất kỳ lúc nào
                    </span>
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
                          <span className="text-[11px] text-slate-500 font-mono">
                            {stage.tasks?.length || 0} công việc
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100 p-2">
                          {(stage.tasks || []).length === 0 ? (
                            <div className="py-2.5 px-3 text-xs text-slate-400 italic">
                              Chưa có đầu việc nào trong giai đoạn này.
                            </div>
                          ) : (
                            stage.tasks?.map((task, tIdx) => (
                              <div
                                key={tIdx}
                                className="flex items-center justify-between px-3 py-2 text-xs"
                              >
                                <div className="flex items-center gap-2 text-slate-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                  <span>{task.title}</span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  Trọng số: x{task.weight}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-400 text-xs">
                Chọn một mẫu bên trái để xem chi tiết hoặc tạo mới mẫu quy trình
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL THÊM / CHỈNH SỬA MẪU QUY TRÌNH (HOÀN TOÀN LINH HOẠT) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingTemplateId ? "Chỉnh Sửa Mẫu Quy Trình (WBS)" : "Tạo Mới Mẫu Quy Trình Chuẩn"}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mã mẫu *
              </label>
              <Input
                required
                disabled={Boolean(editingTemplateId)}
                placeholder="VD: TPL-ALU-INOX"
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                className="text-xs uppercase font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Tên mẫu quy trình *
              </label>
              <Input
                required
                placeholder="VD: Biển Mặt Dựng Alu Alcorest & Bộ Chữ Nổi Inox Vàng"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* NẠP NHANH MẪU GỢI Ý */}
          {!editingTemplateId && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Nạp nhanh mẫu gợi ý phổ biến:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_TEMPLATES.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => loadPreset(preset)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-[11px] font-medium text-slate-700 transition"
                  >
                    {preset.name} ({preset.stages.length} giai đoạn)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* THANH CÔNG CỤ QUẢN LÝ GIAI ĐOẠN */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-slate-800 text-xs">
              Danh sách giai đoạn ({templateStages.length} giai đoạn):
            </span>
            <Button
              type="button"
              size="sm"
              onClick={handleAddStage}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm giai đoạn</span>
            </Button>
          </div>

          {/* DANH SÁCH CÁC GIAI ĐOẠN & CÁC ĐẦU VIỆC BÊN TRONG (CHO PHÉP THÊM/BỚT/SỬA/ĐỔI THỨ TỰ) */}
          <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
            {templateStages.map((stage, sIdx) => (
              <div key={sIdx} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {/* HEADER GIAI ĐOẠN: SỬA TÊN, ĐỔI THỨ TỰ, XÓA GIAI ĐOẠN */}
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200 gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      {sIdx + 1}
                    </span>
                    <Input
                      value={stage.name}
                      onChange={(e) => handleUpdateStageName(sIdx, e.target.value)}
                      placeholder={`Tên giai đoạn ${sIdx + 1}...`}
                      className="text-xs h-7 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Di chuyển lên */}
                    <button
                      type="button"
                      disabled={sIdx === 0}
                      onClick={() => handleMoveStage(sIdx, "up")}
                      className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                      title="Di chuyển giai đoạn lên trên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    {/* Di chuyển xuống */}
                    <button
                      type="button"
                      disabled={sIdx === templateStages.length - 1}
                      onClick={() => handleMoveStage(sIdx, "down")}
                      className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                      title="Di chuyển giai đoạn xuống dưới"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {/* Thêm việc */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddTaskToStage(sIdx)}
                      className="h-6 text-[11px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50 gap-1 ml-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm việc</span>
                    </Button>
                    {/* Xóa giai đoạn */}
                    <button
                      type="button"
                      onClick={() => handleDeleteStage(sIdx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded ml-1"
                      title="Xóa giai đoạn này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* DANH SÁCH ĐẦU VIỆC CỦA GIAI ĐOẠN */}
                <div className="p-2.5 space-y-2">
                  {stage.tasks.length === 0 ? (
                    <div className="text-slate-400 italic text-[11px] py-1 text-center">
                      Chưa có đầu việc nào. Bấm "Thêm việc" ở trên để bổ sung.
                    </div>
                  ) : (
                    stage.tasks.map((task, tIdx) => (
                      <div key={tIdx} className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-[11px] w-5 text-right shrink-0">
                          {tIdx + 1}.
                        </span>
                        <Input
                          required
                          placeholder="Tiêu đề đầu việc..."
                          value={task.title}
                          onChange={(e) => handleUpdateTaskInStage(sIdx, tIdx, "title", e.target.value)}
                          className="text-xs h-7 flex-1"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-400">Trọng số:</span>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={task.weight}
                            onChange={(e) => handleUpdateTaskInStage(sIdx, tIdx, "weight", e.target.value)}
                            className="text-xs h-7 w-14 font-mono text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTaskFromStage(sIdx, tIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                          title="Xóa đầu việc này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditorOpen(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Đang lưu..." : editingTemplateId ? "Lưu Cập Nhật" : "Khởi Tạo Mẫu"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL XÁC NHẬN XÓA MẪU                                    */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(deletingTemplate)}
        onClose={() => setDeletingTemplate(null)}
        title="Xác Nhận Xóa Mẫu Quy Trình"
      >
        {deletingTemplate && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Bạn có chắc chắn muốn xóa mẫu quy trình này?</p>
                <p className="mt-1 text-[11px] text-rose-700">
                  Mã mẫu: <strong>{deletingTemplate.code}</strong> - {deletingTemplate.name}
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  Mẫu sẽ được ẩn khỏi danh sách tạo dự án mới nhưng vẫn bảo toàn dữ liệu đối với các công trình đã sử dụng trước đó.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingTemplate(null)}
                className="text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                disabled={deleting}
                onClick={handleDeleteTemplate}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                {deleting ? "Đang xóa..." : "Xác Nhận Xóa"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

'use client';

import * as React from 'react';
import { useSetPageHeader } from '@/contexts/page-header-context';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Button,
  Modal,
  Badge,
  toast,
  ImageLightboxModal,
  safeOpenExternalImage,
  safeDownloadImage,
} from '@/components/ui';
import {
  readJson,
  useWorkflowMutation,
  fieldClass,
  statusLabels,
  statusVariants,
} from '@/components/production/client';
import { OrderDraft } from '@/components/production/OrderDraft';
import { StockDocuments } from '@/components/production/StockDocuments';
import { PhotosField } from '@/components/production/PhotosField';
import { requiredQcChecks } from '@/lib/production/bom';
import {
  RotateCw,
  Edit3,
  Send,
  XCircle,
  ShoppingCart,
  Layers,
  Boxes,
  CheckCircle2,
  FileText,
  Clock,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Zap,
  MapPin,
  Building,
  Image as ImageIcon,
  Sparkles,
  Ruler,
  ShieldCheck,
  Maximize2,
  Eye,
  Play,
  PackageCheck,
  Package,
  Warehouse,
  Phone,
  User,
  Users,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';

const checkNames: Record<string, string> = {
  dimensions: 'Kích thước / dấu chữ',
  appearance: 'Bề mặt / màu sắc',
  structure: 'Khung / liên kết',
  accessories: 'Phụ kiện / đóng gói',
  electrical: 'An toàn điện',
  lightUniformity: 'Độ đều ánh sáng',
};

export default function ProductionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [o, setOrder] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Xem ảnh bản vẽ kỹ thuật phóng to
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    title: string;
    subtitle?: string;
    meta?: React.ReactNode;
  } | null>(null);

  // Mở rộng chi tiết công đoạn nâng cao (thu gọn mặc định)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'steps' | 'materials' | 'qc'>('steps');

  // Modal Bắt đầu sản xuất
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');

  // Modal Hoàn tất sản xuất
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  // Modal Đề xuất nhập kho thành phẩm
  const [receiptModal, setReceiptModal] = useState<{
    lineId: string;
    lineTitle: string;
    targetQty: number;
    receivedQty: number;
    unitName: string;
  } | null>(null);
  const [receiptWarehouseId, setReceiptWarehouseId] = useState('');
  const [receiptQty, setReceiptQty] = useState<number>(1);
  const [receiptNotes, setReceiptNotes] = useState('');

  useSetPageHeader(
    { title: 'Sản xuất', subtitle: 'Chi tiết hồ sơ lệnh sản xuất thực chiến', screenCode: 'M13.1' },
    []
  );
  const { busy, mutate, run } = useWorkflowMutation();

  async function load() {
    try {
      const [d, m] = await Promise.all([
        readJson(`/api/production-orders/${id}`),
        readJson('/api/production-orders/metadata'),
      ]);
      setOrder(d.order);
      setMeta(m);
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const action = async (body: any) => {
    await mutate(`/api/production-orders/${id}/actions`, body);
    setForm(null);
    setStartModalOpen(false);
    setCompleteModalOpen(false);
    setReceiptModal(null);
    toast.success('Đã lưu dữ liệu thành công');
    await load();
  };

  if (error) {
    return (
      <div className="p-6 max-w-lg mx-auto my-12 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 mb-1">Không thể tải hồ sơ sản xuất</h3>
        <p role="alert" className="text-sm text-rose-600 mb-4">
          {error}
        </p>
        <Button onClick={() => load()}>
          <RotateCw className="w-3.5 h-3.5 mr-1" />
          Tải lại
        </Button>
      </div>
    );
  }

  if (!o || !meta) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Đang tải hồ sơ sản xuất…
      </div>
    );
  }

  const caps = meta.capabilities;
  const line = o.lines.find((l: any) => l.id === form?.lineId);
  const change = (v: any) => setForm((f: any) => ({ ...f, ...v }));

  // Thông tin bản vẽ & khảo sát từ dòng đầu tiên
  const firstLine = o.lines[0] || {};
  const proofCode = firstLine.proof_code || 'MK-CHƯA-GÁN';
  const proofTitle = firstLine.proof_title || 'Bản vẽ phối cảnh Market kỹ thuật';
  const proofUrl = firstLine.proof_file_url || firstLine.snapshot?.bom?.source_snapshot?.proof?.fileUrl;
  const proofThumb = firstLine.proof_thumbnail_url || firstLine.snapshot?.bom?.source_snapshot?.proof?.thumbnailUrl;
  const bgMaterial = firstLine.background_material || firstLine.snapshot?.bom?.source_snapshot?.proof?.backgroundMaterial || 'Alu Alcorest 3mm';
  const letterMaterial = firstLine.letter_material || firstLine.snapshot?.bom?.source_snapshot?.proof?.letterMaterial || 'Inox uốn nổi lọng mica';
  const ledSpec = firstLine.led_spec || firstLine.snapshot?.bom?.source_snapshot?.proof?.ledSpec || 'LED Hàn Quốc 12V';
  const powerSpec = firstLine.power_spec || firstLine.snapshot?.bom?.source_snapshot?.proof?.powerSpec || 'Meanwell IP67';

  // Thông tin ngày bắt đầu / ngày hoàn thành
  const startDateStr = o.source_snapshot?.startDate || o.source_snapshot?.started_at || o.created_at;
  const startDateDisplay = startDateStr ? new Date(startDateStr).toLocaleDateString('vi-VN') : 'Chưa đặt';
  const dueDateDisplay = o.due_at ? new Date(o.due_at).toLocaleDateString('vi-VN') : 'Chưa đặt hạn';

  // Trạng thái các giai đoạn
  const isDraft = o.status === 'draft';
  const isReleased = o.status === 'released';
  const isInProgress = o.status === 'in_progress';
  const isCompleted = o.status === 'completed';

  // Đã xong công đoạn gia công xưởng chưa?
  const hasFinishedProduction =
    Boolean(o.source_snapshot?.completed_production_at) ||
    isCompleted ||
    (o.lines.length > 0 &&
      o.lines.every((l: any) =>
        Array.isArray(l.steps) && l.steps.length > 1
          ? l.steps.slice(0, -1).every((s: any) => s.status === 'done')
          : true
      ));

  // Đã nhập kho đủ toàn bộ thành phẩm chưa?
  const allReceived =
    o.lines.length > 0 &&
    o.lines.every((l: any) => Number(l.received_qty) >= Number(l.target_qty));

  // Phiếu xuất NVL đã cấp
  const materialDocs = (o.documents || []).filter((d: any) => d.workflow_kind === 'production_material');
  // Phiếu nhập kho thành phẩm đã tạo
  const outputDocs = (o.documents || []).filter((d: any) => d.workflow_kind === 'production_output');

  // Mở modal Đề xuất nhập kho
  const openReceiptModal = (targetLine: any) => {
    const rem = Number(targetLine.target_qty) - Number(targetLine.received_qty);
    setReceiptModal({
      lineId: targetLine.id,
      lineTitle: targetLine.title,
      targetQty: Number(targetLine.target_qty),
      receivedQty: Number(targetLine.received_qty),
      unitName: targetLine.unit_name,
    });
    setReceiptQty(rem > 0 ? rem : Number(targetLine.target_qty));
    setReceiptWarehouseId(meta.warehouses.find((w: any) => w.is_active)?.id || meta.warehouses[0]?.id || '');
    setReceiptNotes('');
  };

  return (
    <div className="space-y-3.5 p-3 text-xs">
      {/* 1. HEADER: THÔNG TIN LỆNH & CÁC NÚT ĐIỀU HƯỚNG */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Link href="/san-xuat" className="text-blue-600 hover:underline font-medium">
                Sản xuất
              </Link>
              <span>/</span>
              <span className="font-mono text-slate-700 font-semibold">{o.code}</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-bold text-slate-900">{o.title}</h1>
              <Badge variant={statusVariants[o.status] || 'neutral'} dot>
                {statusLabels[o.status] || o.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-[11px] pt-0.5">
              <span>
                Ngày bắt đầu: <strong className="text-slate-800 font-medium">{startDateDisplay}</strong>
              </span>
              <span>•</span>
              <span>
                Hạn hoàn thành: <strong className="text-slate-800 font-medium">{dueDateDisplay}</strong>
              </span>
              <span>•</span>
              <span>
                Tổng số hạng mục: <strong className="text-slate-800 font-medium">{o.lines.length}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" className="h-8" onClick={() => load()}>
              <RotateCw className="w-3.5 h-3.5 mr-1" />
              Làm mới
            </Button>

            {isDraft && !o.documents.length && caps['production_order.update'] && (
              <Button size="sm" variant="secondary" className="h-8" onClick={() => setEdit(true)}>
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Sửa lệnh nháp
              </Button>
            )}

            {isDraft && !o.documents.length && caps['production_order.release'] && (
              <Button
                size="sm"
                variant="primary"
                className="h-8 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                disabled={busy}
                onClick={() => run(() => action({ action: 'submit' }))}
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Gửi duyệt & Cấp NVL
              </Button>
            )}

            {caps['production_order.update'] &&
              !o.documents.some((d: any) => ['completed', 'reversed'].includes(d.status)) &&
              !o.lines.some((l: any) => l.reports.length) &&
              o.status !== 'cancelled' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-rose-600 hover:bg-rose-50"
                  disabled={busy}
                  onClick={() => run(() => action({ action: 'cancel' }))}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                  Hủy lệnh
                </Button>
              )}

            {caps['sales_order.read'] && (
              <Link
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
                href={`/ban-hang/theo-san-xuat?projectId=${o.project_id}&productionOrderId=${id}`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Bán thành phẩm
              </Link>
            )}
          </div>
        </div>

        {/* 2. THANH TIẾN TRÌNH 3 GIAI ĐOẠN TINH GỌN (PIPELINE STEPPER) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Giai đoạn 1 */}
            <div
              className={`p-2.5 rounded-lg border transition-all ${
                isDraft
                  ? 'bg-blue-50/60 border-blue-200 text-blue-900 ring-1 ring-blue-500/20'
                  : 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                    isDraft ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isDraft ? '1' : '✓'}
                </span>
                <span className="font-semibold text-xs">1. Tiếp Nhận Hồ Sơ & Cấp NVL</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-7">
                {isDraft
                  ? 'Chờ duyệt để tạo phiếu xuất kho NVL'
                  : 'Đã sẵn sàng bản vẽ & định mức NVL'}
              </p>
            </div>

            {/* Giai đoạn 2 */}
            <div
              className={`p-2.5 rounded-lg border transition-all ${
                isInProgress && !hasFinishedProduction
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 ring-1 ring-blue-500/30'
                  : hasFinishedProduction || isCompleted
                  ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                    isInProgress && !hasFinishedProduction
                      ? 'bg-blue-600 text-white animate-pulse'
                      : hasFinishedProduction || isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {hasFinishedProduction || isCompleted ? '✓' : '2'}
                </span>
                <span className="font-semibold text-xs">2. Đang Sản Xuất Tại Xưởng</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-7">
                {hasFinishedProduction || isCompleted
                  ? 'Xưởng đã gia công hoàn thiện'
                  : isInProgress
                  ? 'Đang tiến hành gia công chế tác'
                  : 'Chờ xưởng bấm bắt đầu'}
              </p>
            </div>

            {/* Giai đoạn 3 */}
            <div
              className={`p-2.5 rounded-lg border transition-all ${
                allReceived || isCompleted
                  ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/20'
                  : hasFinishedProduction
                  ? 'bg-amber-50/60 border-amber-300 text-amber-900 ring-1 ring-amber-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                    allReceived || isCompleted
                      ? 'bg-emerald-600 text-white'
                      : hasFinishedProduction
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {allReceived || isCompleted ? '✓' : '3'}
                </span>
                <span className="font-semibold text-xs">3. Hoàn Thành & Đề Xuất Nhập Kho</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-7">
                {allReceived || isCompleted
                  ? 'Đã nhập kho thành phẩm 100%'
                  : hasFinishedProduction
                  ? 'Sẵn sàng tạo đề xuất nhập kho'
                  : 'Sau khi gia công xong'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. BANNER HÀNH ĐỘNG GIAI ĐOẠN (STAGE ACTION BANNER) */}
        <div className="pt-1">
          {isDraft && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-amber-800">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Lệnh sản xuất đang ở trạng thái <strong>Nháp</strong>. Hãy gửi duyệt để hệ thống tự động kiểm tra tồn kho và tạo phiếu cấp phát NVL.
                </span>
              </div>
              {caps['production_order.release'] && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold"
                  disabled={busy}
                  onClick={() => run(() => action({ action: 'submit' }))}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Gửi duyệt & Cấp NVL
                </Button>
              )}
            </div>
          )}

          {isReleased && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-blue-900">
                <Play className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  Hồ sơ bản vẽ & định mức vật tư đã sẵn sàng! Xưởng kiểm tra vật liệu và bấm <strong>Bắt đầu sản xuất</strong>.
                </span>
              </div>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold px-4"
                disabled={busy}
                onClick={() => {
                  setStartDateInput(
                    startDateStr
                      ? new Date(startDateStr).toISOString().slice(0, 16)
                      : new Date().toISOString().slice(0, 16)
                  );
                  setStartModalOpen(true);
                }}
              >
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                Bắt đầu sản xuất
              </Button>
            </div>
          )}

          {isInProgress && !hasFinishedProduction && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-blue-900">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                <span>
                  Xưởng đang tiến hành gia công chế tác. Khi thợ xưởng hoàn thành công việc, hãy nhấn <strong>Kết thúc sản xuất</strong>.
                </span>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold px-4"
                disabled={busy}
                onClick={() => setCompleteModalOpen(true)}
              >
                <Check className="w-4 h-4 mr-1.5 stroke-[3]" />
                Kết thúc sản xuất
              </Button>
            </div>
          )}

          {hasFinishedProduction && !allReceived && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  Xưởng đã hoàn thành sản xuất thành công! Hãy tạo <strong>Đề xuất nhập kho thành phẩm</strong> để nhập vào kho lưu trữ.
                </span>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold px-4"
                disabled={busy}
                onClick={() => openReceiptModal(o.lines[0])}
              >
                <PackageCheck className="w-4 h-4 mr-1.5" />
                Tạo đề xuất nhập kho
              </Button>
            </div>
          )}

          {(allReceived || isCompleted) && (
            <div className="bg-emerald-50/80 border border-emerald-300 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  Lệnh sản xuất đã hoàn tất 100%! Toàn bộ thành phẩm đã được nghiệm thu và tạo phiếu nhập kho.
                </span>
              </div>
              <Badge variant="success" className="font-semibold px-3 py-1">
                Hoàn tất 100%
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* 4. KHỐI CỐT LÕI: HỒ SƠ TIẾP NHẬN SẢN XUẤT (3 CỘT: BẢN VẼ + ĐƠN HÀNG + ĐỊNH MỨC BOM) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* CỘT 1: BẢN VẼ KỸ THUẬT ĐÃ DUYỆT */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
              Bản Vẽ Kỹ Thuật Đã Duyệt
            </span>
            <span className="font-mono text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {proofCode}
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-800">{proofTitle}</p>

          {/* Preview ảnh bản vẽ kỹ thuật */}
          {proofUrl ? (
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-950 relative group">
              <div
                onClick={() =>
                  setPreviewImage({
                    src: proofUrl,
                    title: `${proofCode} · ${proofTitle}`,
                    subtitle: 'Bản vẽ Maket kỹ thuật 2D/3D đã chốt phê duyệt',
                    meta: (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                        <div>
                          <span className="text-slate-400">Nền biển:</span>{' '}
                          <strong className="text-slate-200">{bgMaterial}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Chữ & Logo:</span>{' '}
                          <strong className="text-slate-200">{letterMaterial}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Module LED:</span>{' '}
                          <strong className="text-slate-200">{ledSpec}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Bộ nguồn:</span>{' '}
                          <strong className="text-slate-200">{powerSpec}</strong>
                        </div>
                      </div>
                    ),
                  })
                }
                title="Nhấn để phóng to bản vẽ chi tiết"
                className="aspect-video flex items-center justify-center p-2 cursor-pointer bg-slate-900"
              >
                <img
                  src={proofThumb || proofUrl}
                  alt="Bản vẽ đã duyệt"
                  className="max-h-48 object-contain rounded"
                />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1.5 transition-opacity">
                  <Maximize2 className="w-4 h-4 text-blue-400" />
                  Phóng to xem bản vẽ gốc
                </div>
              </div>

              {/* Thanh thao tác dưới ảnh */}
              <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewImage({
                      src: proofUrl,
                      title: `${proofCode} · ${proofTitle}`,
                      subtitle: 'Bản vẽ Maket kỹ thuật 2D/3D đã chốt phê duyệt',
                      meta: (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                          <div>
                            <span className="text-slate-400">Nền biển:</span>{' '}
                            <strong className="text-slate-200">{bgMaterial}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Chữ & Logo:</span>{' '}
                            <strong className="text-slate-200">{letterMaterial}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Module LED:</span>{' '}
                            <strong className="text-slate-200">{ledSpec}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Bộ nguồn:</span>{' '}
                            <strong className="text-slate-200">{powerSpec}</strong>
                          </div>
                        </div>
                      ),
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Phóng to bản vẽ
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => safeOpenExternalImage(proofUrl, `${proofCode} - ${proofTitle}`)}
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    title="Mở ảnh trong tab mới"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                    Mở tab mới
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-slate-400">
              Chưa có file ảnh bản vẽ kỹ thuật
            </div>
          )}

          {/* Quy chuẩn vật tư từ Maket */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">Nền biển:</span>
              <strong className="text-slate-800">{bgMaterial}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">Bộ chữ & Logo:</span>
              <strong className="text-slate-800">{letterMaterial}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">Module LED:</span>
              <strong className="text-slate-800">{ledSpec}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">Bộ nguồn:</span>
              <strong className="text-slate-800">{powerSpec}</strong>
            </div>
          </div>
        </div>

        {/* CỘT 2: THÔNG TIN ĐƠN HÀNG & CÔNG TRÌNH */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              Thông Tin Đơn Hàng & Dự Án
            </span>
            <Link
              href={`/du-an/${o.project_id}`}
              className="text-blue-600 hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
            >
              Xem dự án <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Dự án:</span>
                <span className="font-mono text-blue-700 font-semibold">{o.project_code || '—'}</span>
              </div>
              <p className="font-semibold text-slate-800 text-xs">{o.project_name}</p>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-start gap-2 text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>
                  Khách hàng: <strong>{o.customer_name || 'Khách lẻ / Đang cập nhật'}</strong>
                </span>
              </div>

              {o.customer_phone && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Điện thoại: <strong>{o.customer_phone}</strong>
                  </span>
                </div>
              )}

              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>
                  Địa chỉ công trình: <strong>{o.project_address || firstLine.survey_address || '—'}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Ngày bắt đầu: <strong>{startDateDisplay}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Hạn hoàn thành: <strong>{dueDateDisplay}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Nhóm phụ trách: <strong>{firstLine.team_name || 'Xưởng sản xuất'}</strong>
                </span>
              </div>
            </div>

            {/* Phiếu xuất kho NVL đã cấp */}
            <div className="pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-700 text-[11px] block mb-1">
                Phiếu cấp NVL từ kho:
              </span>
              {materialDocs.length > 0 ? (
                <div className="space-y-1">
                  {materialDocs.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200 text-[11px]"
                    >
                      <span className="font-mono font-semibold text-blue-700">{doc.code}</span>
                      <Badge
                        variant={doc.status === 'completed' ? 'success' : 'warning'}
                        className="text-[10px]"
                      >
                        {doc.status === 'completed' ? 'Đã xuất kho' : 'Chờ xuất kho'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-[11px] italic">Chưa phát sinh phiếu cấp NVL</p>
              )}
            </div>
          </div>
        </div>

        {/* CỘT 3: ĐỊNH MỨC VẬT TƯ (BOM) */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
              <Boxes className="w-3.5 h-3.5 text-blue-600" />
              Định Mức Vật Tư Sản Xuất (BOM)
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-medium">
              v{firstLine.snapshot?.bom?.revision_no ?? 1}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
              Danh sách vật tư định mức xưởng cần chuẩn bị để gia công:
            </p>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-2.5">Vật tư cần xuất</th>
                    <th className="py-2 px-2.5 text-right">Định mức</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {firstLine.materials && firstLine.materials.length > 0 ? (
                    firstLine.materials.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-2.5">
                          <strong className="text-slate-800 block text-[11px]">{m.name}</strong>
                          <span className="font-mono text-[10px] text-slate-400">{m.code}</span>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-700">
                          {Number(m.required_base_qty)} {m.unit_name}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-slate-400">
                        Chưa có dữ liệu định mức BOM
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              * Định mức đã bao gồm tỷ lệ hao hụt kỹ thuật theo quy chuẩn xưởng.
            </p>
          </div>
        </div>
      </div>

      {/* 5. KHỐI THÀNH PHẨM & ĐỀ XUẤT NHẬP KHO */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Hạng Mục Thành Phẩm & Đề Xuất Nhập Kho
              </h3>
              <p className="text-[11px] text-slate-500">
                Theo dõi sản lượng đạt và tạo phiếu nhập kho thành phẩm sau khi hoàn thành
              </p>
            </div>
          </div>

          {hasFinishedProduction && !allReceived && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              onClick={() => openReceiptModal(o.lines[0])}
            >
              <PackageCheck className="w-3.5 h-3.5 mr-1" />
              Tạo đề xuất nhập kho
            </Button>
          )}
        </div>

        {/* Danh sách các hạng mục thành phẩm */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {o.lines.map((l: any) => {
            const isLineDone = Number(l.received_qty) >= Number(l.target_qty);
            return (
              <div
                key={l.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/30 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{l.title}</h4>
                    <span className="font-mono text-slate-500 text-[11px]">Mã SP: {l.item_code}</span>
                  </div>
                  <Badge variant={isLineDone ? 'success' : 'neutral'}>
                    {isLineDone ? 'Đã nhập kho đủ' : 'Chờ hoàn tất'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-500">Sản lượng hoàn thành:</span>
                  <span className="font-mono">
                    <strong className="text-emerald-700 text-sm">{Number(l.received_qty)}</strong>
                    <span className="text-slate-400"> / {Number(l.target_qty)} {l.unit_name}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Trạng thái: <strong className="text-slate-700">{statusLabels[l.status] || l.status}</strong>
                  </span>
                  {!isLineDone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300 font-medium"
                      onClick={() => openReceiptModal(l)}
                    >
                      <PackageCheck className="w-3 h-3 mr-1" />
                      Nhập kho thành phẩm
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Danh sách phiếu nhập kho thành phẩm đã tạo */}
        {outputDocs.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-slate-600 font-semibold text-[11px] block mb-1.5">
              Phiếu nhập kho thành phẩm đã phát sinh:
            </span>
            <div className="flex flex-wrap gap-2">
              {outputDocs.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs"
                >
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-mono font-semibold text-emerald-800">{doc.code}</span>
                  <span className="text-[11px] text-slate-500">
                    ({doc.status === 'completed' ? 'Đã hoàn tất nhập kho' : 'Chờ thủ kho duyệt'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. KHỐI CHI TIẾT CÔNG ĐOẠN & NÂNG CAO (THU GỌN MẶC ĐỊNH) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50/60 hover:bg-slate-100/70 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700 text-xs">
              Tùy chọn nâng cao (Chi tiết từng công đoạn, Phiếu kho chi tiết & QC kiểm định)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <span>{showAdvanced ? 'Thu gọn' : 'Xem chi tiết'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="p-3.5 space-y-3 border-t border-slate-200">
            {/* SUB-TABS NÂNG CAO */}
            <div className="flex border-b border-slate-200 bg-white">
              {[
                ['steps', 'Chi tiết các công đoạn', Layers],
                ['materials', 'Cấp bổ sung & Trả dư NVL', Boxes],
                ['qc', 'Nhật ký QC kiểm định', CheckCircle2],
              ].map(([k, t, Icon]: any) => (
                <button
                  key={k}
                  onClick={() => setAdvancedTab(k)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    advancedTab === k
                      ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t}
                </button>
              ))}
            </div>

            {/* TAB STEPS */}
            {advancedTab === 'steps' && (
              <div className="space-y-3 pt-2">
                {o.lines.map((l: any) => (
                  <div key={l.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <strong className="text-slate-800 text-xs block">{l.title}</strong>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="py-1.5 px-2">Công đoạn</th>
                            <th className="py-1.5 px-2 text-center">Tiến độ</th>
                            <th className="py-1.5 px-2 text-center">Trạng thái</th>
                            <th className="py-1.5 px-2 text-right">Ghi nhật ký</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {l.steps.map((s: any, n: number) => (
                            <tr key={s.id}>
                              <td className="py-1.5 px-2 font-medium">
                                {n + 1}. {s.title}
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono">{s.progress}%</td>
                              <td className="py-1.5 px-2 text-center">
                                <Badge
                                  variant={s.status === 'done' ? 'success' : s.status === 'doing' ? 'info' : 'neutral'}
                                >
                                  {s.status === 'done' ? 'Xong' : s.status === 'doing' ? 'Đang làm' : 'Chờ'}
                                </Badge>
                              </td>
                              <td className="py-1.5 px-2 text-right">
                                {n < l.steps.length - 1 && caps['production_order.report'] && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[11px] px-2 text-blue-600"
                                    onClick={() =>
                                      setForm({
                                        action: 'report',
                                        lineId: l.id,
                                        stepId: s.id,
                                        progress: Number(s.progress),
                                        outputQty: 0,
                                        wasteQty: 0,
                                        notes: '',
                                        photosText: '',
                                        materials: l.materials.map((m: any) => ({ itemId: m.item_id, qty: 0 })),
                                      })
                                    }
                                  >
                                    Cập nhật
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB MATERIALS */}
            {advancedTab === 'materials' && (
              <div className="space-y-3 pt-2">
                <StockDocuments documents={o.documents} capabilities={caps} onChanged={load} />
              </div>
            )}

            {/* TAB QC */}
            {advancedTab === 'qc' && (
              <div className="space-y-3 pt-2">
                {o.lines.map((l: any) => (
                  <div key={l.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <strong className="text-slate-800 text-xs block">{l.title}</strong>
                    {l.qcRecords && l.qcRecords.length > 0 ? (
                      <div className="space-y-1">
                        {l.qcRecords.map((q: any) => (
                          <div key={q.id} className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px]">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-blue-700">{q.code}</span>
                              <Badge variant={q.status === 'passed' ? 'success' : 'danger'}>
                                {q.status === 'passed' ? 'Đạt' : 'Lỗi'}
                              </Badge>
                            </div>
                            <span className="text-slate-600 block mt-1">
                              Đạt: {Number(q.accepted_qty)} | Lỗi: {Number(q.rejected_qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-[11px] italic">Chưa có bản ghi kiểm định QC</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: BẮT ĐẦU SẢN XUẤT */}
      <Modal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        title="Xác nhận Bắt đầu Sản xuất"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Bạn đang chuẩn bị chuyển lệnh sang trạng thái <strong>Đang sản xuất</strong>. Vui lòng xác nhận thời điểm bắt đầu gia công tại xưởng:
          </p>
          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">Thời điểm bắt đầu sản xuất</span>
            <input
              type="datetime-local"
              className={fieldClass}
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setStartModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={busy}
              onClick={() => run(() => action({ action: 'start', startDate: startDateInput }))}
            >
              <Play className="w-3.5 h-3.5 mr-1 fill-current" />
              Bắt đầu ngay
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: KẾT THÚC / HOÀN TẤT SẢN XUẤT */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Xác nhận Hoàn tất Sản xuất"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Xác nhận xưởng đã gia công hoàn thiện các hạng mục theo đúng bản vẽ kỹ thuật và định mức BOM. Sau khi kết thúc, bạn có thể tạo đề xuất nhập kho thành phẩm.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setCompleteModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={busy}
              onClick={() => run(() => action({ action: 'complete' }))}
            >
              <Check className="w-3.5 h-3.5 mr-1 stroke-[3]" />
              Xác nhận hoàn thành
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: ĐỀ XUẤT NHẬP KHO THÀNH PHẨM (TINH GỌN) */}
      <Modal
        isOpen={Boolean(receiptModal)}
        onClose={() => setReceiptModal(null)}
        title={`Đề xuất Nhập kho Thành phẩm: ${receiptModal?.lineTitle || ''}`}
        maxWidth="md"
      >
        {receiptModal && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px] block">Hạng mục thành phẩm:</span>
              <strong className="text-slate-900 text-sm block">{receiptModal.lineTitle}</strong>
              <div className="flex items-center gap-3 text-slate-600 text-[11px] pt-1">
                <span>
                  Sản lượng yêu cầu: <strong>{receiptModal.targetQty} {receiptModal.unitName}</strong>
                </span>
                <span>•</span>
                <span>
                  Đã nhập kho: <strong>{receiptModal.receivedQty} {receiptModal.unitName}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-semibold text-slate-700">Kho nhập thành phẩm *</span>
                <select
                  className={fieldClass}
                  value={receiptWarehouseId}
                  onChange={(e) => setReceiptWarehouseId(e.target.value)}
                >
                  <option value="">-- Chọn kho nhập --</option>
                  {meta.warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-slate-700">
                  Số lượng nhập kho ({receiptModal.unitName}) *
                </span>
                <input
                  type="number"
                  min="0.000001"
                  step="any"
                  className={`${fieldClass} font-mono`}
                  value={receiptQty}
                  onChange={(e) => setReceiptQty(Number(e.target.value))}
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="font-semibold text-slate-700">Ghi chú nghiệm thu / Kiểm tra chất lượng</span>
              <textarea
                className={`${fieldClass} h-16 py-1.5`}
                placeholder="VD: Thành phẩm đạt chuẩn theo thiết kế, kiểm tra sáng đèn LED đồng đều."
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
              />
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setReceiptModal(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                disabled={busy || !receiptWarehouseId || receiptQty <= 0}
                onClick={() =>
                  run(() =>
                    action({
                      action: 'propose_receipt',
                      lineId: receiptModal.lineId,
                      destinationWarehouseId: receiptWarehouseId,
                      qty: receiptQty,
                      notes: receiptNotes,
                    })
                  )
                }
              >
                <PackageCheck className="w-3.5 h-3.5 mr-1" />
                Xác nhận tạo phiếu nhập kho
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 4: SỬA LỆNH NHÁP */}
      <Modal
        isOpen={edit}
        onClose={() => setEdit(false)}
        title="Chỉnh sửa lệnh sản xuất nháp"
        maxWidth="full"
      >
        <OrderDraft
          meta={meta}
          projectId={o.project_id}
          order={o}
          onSaved={() => {
            setEdit(false);
            void load();
          }}
        />
      </Modal>

      {/* MODAL 5: THAO TÁC CÔNG ĐOẠN / VẬT TƯ NÂNG CAO */}
      <Modal
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={
          form?.action === 'report'
            ? 'Ghi nhật ký công đoạn'
            : form?.action === 'supplement'
            ? 'Đề xuất cấp bổ sung NVL'
            : 'Trả NVL dư về kho'
        }
      >
        {form && (
          <div className="space-y-3 text-xs">
            {form.action === 'report' && (
              <>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">Tiến độ công đoạn (%)</span>
                  <input
                    className={`${fieldClass} font-mono`}
                    type="number"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={(e) => change({ progress: Number(e.target.value) })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">Ghi chú diễn giải</span>
                  <textarea
                    className={`${fieldClass} h-16 py-1.5`}
                    value={form.notes}
                    onChange={(e) => change({ notes: e.target.value })}
                  />
                </label>
              </>
            )}

            {['supplement', 'return'].includes(form.action) && (
              <>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">Số lượng</span>
                  <input
                    className={`${fieldClass} font-mono`}
                    type="number"
                    min="0.000001"
                    step="any"
                    value={form.qty}
                    onChange={(e) => change({ qty: Number(e.target.value) })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">Kho thực hiện</span>
                  <select
                    className={fieldClass}
                    value={form.warehouseId}
                    onChange={(e) => change({ warehouseId: e.target.value })}
                  >
                    {meta.warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button size="sm" variant="secondary" onClick={() => setForm(null)}>
                Hủy
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={busy}
                onClick={() => run(() => action(form))}
              >
                Xác nhận
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 6: LIGHTBOX XEM BẢN VẼ / ẢNH PHÓNG TO */}
      <ImageLightboxModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        src={previewImage?.src || ''}
        title={previewImage?.title || 'Bản vẽ kỹ thuật'}
        subtitle={previewImage?.subtitle}
        meta={previewImage?.meta}
      />
    </div>
  );
}

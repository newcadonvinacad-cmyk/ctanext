"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Printer,
  Save,
  Sparkles,
  Layers,
  Ruler,
  Check,
  Building2,
  Phone,
  MapPin,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  Copy,
} from "lucide-react";
import {
  SurveyInputDimensions,
  CalculatedBrandSpec,
  calculateNipponBrandSpec,
  detectRecommendedLayout,
  NIPPON_REAL_SURVEY_PRESETS,
  NipponLayoutType,
} from "@/lib/nippon-brand-guidelines";
import { NipponSignCanvas } from "@/components/design/NipponSignCanvas";

export default function ThietKeQuyChuanProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params?.id as string;

  const queryProofId = searchParams?.get("proofId");
  const queryCloneFrom = searchParams?.get("cloneFrom");
  const querySurveyId = searchParams?.get("surveyId");
  const queryW = searchParams?.get("w");
  const queryH = searchParams?.get("h");
  const queryD = searchParams?.get("d");
  const queryTitle = searchParams?.get("title");
  const queryAddr = searchParams?.get("addr");

  // State thông số khảo sát đầu vào - Mặc định theo bản vẽ kỹ thuật xưởng in 12m x 2.4m
  const [input, setInput] = React.useState<SurveyInputDimensions>({
    widthMeters: 12.0,
    heightMeters: 2.4,
    depthMeters: 0.2,
    dealerName: "THÀNH PHÁT",
    dealerType: "CÔNG TY TNHH TRANG TRÍ NỘI THẤT",
    dealerAddress: "Số 503, Tỉnh lộ 887, Ấp Long Điền, Xã Phước Long, Tỉnh Vĩnh Long",
    dealerPhone: "091 799 0037 - 0952 114455",
    dealerFax: "",
    materialType: "Bảng mặt tiền Alu Alcorest 3mm + chữ Mica hút nổi xưởng in",
    structureNote: "Khung sắt hộp mạ kẽm đan nan xương 60x60cm, nẹp viền nhôm V bo góc",
    layoutType: "LAYOUT_03_STANDARD_HORIZONTAL",
  });

  // Chế độ xem & Tùy chọn hiển thị
  const [showDimensions, setShowDimensions] = React.useState(true);
  const [showTitleBlock, setShowTitleBlock] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"blueprint" | "realistic">("realistic");
  const [isSaving, setIsSaving] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  // Trạng thái liên kết bản vẽ đang chỉnh sửa
  const [loadedProof, setLoadedProof] = React.useState<any | null>(null);
  const [isLoadingProof, setIsLoadingProof] = React.useState(false);

  const svgRef = React.useRef<SVGSVGElement>(null);

  // Tính toán thông số kỹ thuật tức thì
  const spec: CalculatedBrandSpec = React.useMemo(() => {
    return calculateNipponBrandSpec(input);
  }, [input]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Nạp thông số từ bản vẽ có sẵn (proofId / cloneFrom) hoặc từ phiếu khảo sát (surveyId)
  React.useEffect(() => {
    const targetProofId = queryProofId || queryCloneFrom;
    if (targetProofId) {
      setIsLoadingProof(true);
      fetch(`/api/design-proofs/${targetProofId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.proof) {
            const p = data.proof;
            if (!queryCloneFrom) {
              setLoadedProof(p);
            }
            // Khôi phục thông số parametric từ clientFeedback
            let restored = false;
            if (p.clientFeedback) {
              try {
                const parsed = JSON.parse(p.clientFeedback);
                if (parsed._parametricSpec?.input) {
                  setInput(parsed._parametricSpec.input);
                  if (parsed._parametricSpec.viewMode) setViewMode(parsed._parametricSpec.viewMode);
                  if (parsed._parametricSpec.showDimensions !== undefined) setShowDimensions(parsed._parametricSpec.showDimensions);
                  if (parsed._parametricSpec.showTitleBlock !== undefined) setShowTitleBlock(parsed._parametricSpec.showTitleBlock);
                  restored = true;
                }
              } catch {
                // clientFeedback is normal text string
              }
            }

            if (!restored) {
              const match = p.title.match(/(\d+(?:\.\d+)?)\s*m\s*[×x*]\s*(\d+(?:\.\d+)?)\s*m/i);
              setInput((prev) => ({
                ...prev,
                widthMeters: match ? parseFloat(match[1]) : prev.widthMeters,
                heightMeters: match ? parseFloat(match[2]) : prev.heightMeters,
                dealerName: p.title.replace(/^Maket Chuẩn Nippon Paint:\s*/i, "").replace(/\s*\(.*?\)$/, "").trim() || prev.dealerName,
                materialType: p.backgroundMaterial || prev.materialType,
              }));
            }

            showToast(queryCloneFrom ? `Đã nạp mẫu từ ${p.title} để tạo phương án mới` : `Đã tải bản vẽ: ${p.title}`);
          }
        })
        .catch((err) => console.error("Lỗi nạp bản vẽ:", err))
        .finally(() => setIsLoadingProof(false));
    } else if (querySurveyId || queryW || queryH || queryAddr || queryTitle) {
      setInput((prev) => {
        const w = queryW ? parseFloat(queryW) : prev.widthMeters;
        const h = queryH ? parseFloat(queryH) : prev.heightMeters;
        const d = queryD ? parseFloat(queryD) : (prev.depthMeters ?? 0.2);
        const addr = queryAddr ? decodeURIComponent(queryAddr) : prev.dealerAddress;
        let name = prev.dealerName;
        if (queryTitle) {
          const cleaned = decodeURIComponent(queryTitle)
            .replace(/^(Khảo sát mặt bằng|Khảo sát|Biển bảng)\s*[-:]?\s*/i, "")
            .trim();
          if (cleaned) name = cleaned;
        }
        return {
          ...prev,
          widthMeters: typeof w === "number" && !isNaN(w) ? w : prev.widthMeters,
          heightMeters: typeof h === "number" && !isNaN(h) ? h : prev.heightMeters,
          depthMeters: typeof d === "number" && !isNaN(d) ? d : prev.depthMeters,
          dealerAddress: addr || prev.dealerAddress,
          dealerName: name || prev.dealerName,
        };
      });
      showToast("Đã nạp kích thước thực tế từ phiếu khảo sát hiện trường!");
    }
  }, [queryProofId, queryCloneFrom, querySurveyId, queryW, queryH, queryD, queryTitle, queryAddr]);

  // Nạp dữ liệu từ Preset thực tế trong ảnh của user
  const handleSelectPreset = (presetId: string) => {
    const found = NIPPON_REAL_SURVEY_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setInput({
      widthMeters: found.widthMeters,
      heightMeters: found.heightMeters,
      depthMeters: found.depthMeters,
      dealerName: found.dealerName,
      dealerType: found.dealerType || "Đại lý",
      dealerAddress: found.dealerAddress,
      dealerPhone: found.dealerPhone,
      dealerFax: "",
      materialType: found.materialType,
      structureNote: found.structureNote,
      layoutType: found.layoutType,
    });
    showToast(`Đã nạp thông số đại lý: ${found.dealerName}`);
  };

  // Xuất file vector SVG
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    try {
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgRef.current);
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Maket_Nippon_${input.dealerName.replace(/\s+/g, "_")}_${input.widthMeters}x${input.heightMeters}m.svg`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Đã tải xuống file thiết kế vector SVG thành công!");
    } catch (err: any) {
      alert("Lỗi xuất SVG: " + err.message);
    }
  };

  // Xuất file ảnh PNG độ nét cao
  const handleExportPng = () => {
    if (!svgRef.current) return;
    try {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgRef.current);
      const img = new Image();
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2; // Độ phân giải x2 cho in ấn sắc nét
        canvas.width = svgRef.current!.viewBox.baseVal.width * scale;
        canvas.height = svgRef.current!.viewBox.baseVal.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `Maket_Nippon_${input.dealerName.replace(/\s+/g, "_")}_${input.widthMeters}x${input.heightMeters}m.png`;
        a.click();
        URLObj.revokeObjectURL(blobURL);
        showToast("Đã xuất file hình ảnh PNG chất lượng cao!");
      };
      img.src = blobURL;
    } catch (err: any) {
      alert("Lỗi xuất PNG: " + err.message);
    }
  };

  // Lưu hoặc Cập nhật vào Dự Án 360 (Lưu cả hình ảnh SVG + toàn bộ thông số hình học)
  const handleSaveToProject = async (saveAsNewProposal: boolean = false) => {
    try {
      setIsSaving(true);
      // Tạo snapshot data URL SVG
      const serializer = new XMLSerializer();
      const svgStr = svgRef.current ? serializer.serializeToString(svgRef.current) : "";
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;

      // Lưu toàn bộ thông số hình học để có thể mở lại, nhân bản và xuất lại bất cứ lúc nào!
      const parametricData = {
        _parametricSpec: {
          input,
          viewMode,
          showDimensions,
          showTitleBlock,
          savedAt: new Date().toISOString(),
        },
        note: input.structureNote || "",
      };

      const isUpdatingExisting = Boolean(loadedProof && !saveAsNewProposal);
      const targetVersion = loadedProof
        ? (saveAsNewProposal ? (loadedProof.versionNo || 1) + 1 : loadedProof.versionNo || 1)
        : 1;

      const payload = {
        projectId: projectId && projectId !== "thiet-ke-quy-chuan" ? projectId : null,
        title: isUpdatingExisting
          ? loadedProof.title
          : loadedProof
          ? `${loadedProof.title.replace(/\s*\(Phương án \d+\)/, "")} (Phương án ${targetVersion})`
          : `Maket Chuẩn Nippon Paint: ${input.dealerName} (${input.widthMeters}m × ${input.heightMeters}m)`,
        versionNo: targetVersion,
        fileUrl: dataUri,
        thumbnailUrl: dataUri,
        backgroundMaterial: input.materialType || "Alu Alcorest 3mm EV2002",
        letterMaterial: "Mica Đài Loan 3mm hút nổi lọng viền",
        ledSpec: "Module LED 3 mắt Hàn Quốc 12V",
        powerSpec: "Bộ nguồn Meanwell chống nước ngoài trời",
        clientFeedback: JSON.stringify(parametricData),
        status: "approved",
      };

      const url = isUpdatingExisting ? `/api/design-proofs/${loadedProof.id}` : "/api/design-proofs";
      const method = isUpdatingExisting ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể lưu vào dự án");
      }

      const resData = await res.json();
      if (resData.proof) {
        setLoadedProof(resData.proof);
      }

      showToast(
        isUpdatingExisting
          ? "Đã cập nhật bản vẽ & thông số hình học thành công!"
          : `Đã lưu bản vẽ Maket & Phương án ${targetVersion} vào Dự Án 360!`
      );
    } catch (err: any) {
      alert("Lỗi lưu: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-900">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Style cách ly khi In / Xuất PDF Khổ A4 Landscape */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page {
              size: A4 landscape;
              margin: 8mm 10mm;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body * {
              visibility: hidden !important;
            }
            .no-print, .no-print * {
              display: none !important;
            }
            #printable-blueprint-zone,
            #printable-blueprint-zone * {
              visibility: visible !important;
            }
            #printable-blueprint-zone {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `,
        }}
      />

      {/* Top Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link
            href={projectId && projectId !== "thiet-ke-quy-chuan" ? `/du-an/${projectId}` : "/du-an"}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="Quay lại dự án"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-700" />
              <h1 className="text-sm font-bold text-slate-900">
                Thiết Kế Tự Động Theo Quy Chuẩn Khảo Sát (Nippon Paint Brand Guidelines)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động khớp tỷ lệ hình học từ kích thước khảo sát, hiển thị đo ghi CAD và xuất bản vẽ Maket gửi khách duyệt
            </p>
          </div>
        </div>

        {/* Các nút hành động chính */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleExportPng}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Tải ảnh PNG gửi khách duyệt qua Zalo"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span>Xuất Ảnh PNG</span>
          </button>

          <button
            onClick={handleExportSvg}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Tải vector SVG cho xưởng cắt CNC / in ấn"
          >
            <Layers className="w-3.5 h-3.5 text-slate-700" />
            <span>Xuất Vector SVG</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="In hoặc lưu file PDF bản vẽ kỹ thuật A4 Landscape"
          >
            <Printer className="w-3.5 h-3.5 text-slate-700" />
            <span>In / PDF A4</span>
          </button>

          {projectId && projectId !== "thiet-ke-quy-chuan" && (
            <Link
              href={`/du-an/${projectId}?tab=production`}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              title="Chuyển sang Bóc Tách & Xuất Kho theo BOM"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
              <span>BOM Dự Án</span>
            </Link>
          )}

          {loadedProof ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSaveToProject(false)}
                disabled={isSaving}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Cập nhật bản vẽ đang chỉnh sửa này"
              >
                <Save className="w-3.5 h-3.5 text-white" />
                <span>{isSaving ? "Đang lưu..." : "Cập Nhật Bản Vẽ Này"}</span>
              </button>
              <button
                onClick={() => handleSaveToProject(true)}
                disabled={isSaving}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Lưu thành phương án thiết kế mới (v+1)"
              >
                <Copy className="w-3.5 h-3.5 text-slate-200" />
                <span>Tạo Phương Án Mới (v{(loadedProof.versionNo || 1) + 1}.0)</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleSaveToProject(false)}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-200" />
              <span>{isSaving ? "Đang lưu..." : "1-Click Lưu Dự Án 360"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner thông báo bản vẽ đang chỉnh sửa */}
      {loadedProof && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs no-print shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Đang mở bản vẽ: <strong>{loadedProof.title}</strong> (Phiên bản v{loadedProof.versionNo || 1}.0)
            </span>
            <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-mono">
              {loadedProof.code}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-emerald-700">
              * Tự do tinh chỉnh kích thước &amp; vật tư; chọn "Cập Nhật" hoặc "Tạo Phương Án Mới"
            </span>
            <button
              onClick={() => setLoadedProof(null)}
              className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
            >
              Tách thành bản vẽ mới
            </button>
          </div>
        </div>
      )}

      {/* Main Studio: 2 Cột Thông Minh */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ======================================================== */}
        {/* CỘT TRÁI: FORM NHẬP LIỆU KHẢO SÁT & TÍNH TOÁN (4 CỘT) */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 space-y-3 no-print">
          {/* 1. Bộ chọn nạp nhanh từ khảo sát thực tế (Presets từ ảnh Excel) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                Nạp Nhanh Khảo Sát Mẫu
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Bảng đo đạc thực tế</span>
            </div>
            <select
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden text-slate-800 font-semibold"
            >
              <option value="">-- Chọn đại lý từ danh sách khảo sát --</option>
              {NIPPON_REAL_SURVEY_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.dealerName} ({p.widthMeters}m × {p.heightMeters}m) • {p.region}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Kích thước đo đạc khảo sát thực tế */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-slate-600" />
                Kích Thước Khảo Sát (Phủ Bì)
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                S = {spec.areaM2} m²
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Rộng X (m) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="30"
                  value={input.widthMeters}
                  onChange={(e) =>
                    setInput({ ...input, widthMeters: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Cao Y (m) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.3"
                  max="15"
                  value={input.heightMeters}
                  onChange={(e) =>
                    setInput({ ...input, heightMeters: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Độ sâu Z (cm)
                </label>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="50"
                  value={(input.depthMeters || 0.15) * 100}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      depthMeters: (parseFloat(e.target.value) || 15) / 100,
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-800 text-center"
                />
              </div>
            </div>

            {/* Kiểu bố cục quy chuẩn */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Quy Chuẩn Bố Cục Brand Guideline
                </label>
                {(input.widthMeters / Math.max(0.1, input.heightMeters)) < 2.2 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    Khuyên dùng Mẫu 05
                  </span>
                )}
              </div>
              <select
                value={input.layoutType}
                onChange={(e) =>
                  setInput({ ...input, layoutType: e.target.value as NipponLayoutType })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden text-slate-800 font-semibold"
              >
                <option value="LAYOUT_03_STANDARD_HORIZONTAL">
                  Mẫu 03: Ngang Chuẩn (2/3 Logo - 1/3 Đại lý)
                </option>
                <option value="LAYOUT_04_NARROW_HORIZONTAL">
                  Mẫu 04: Ngang Hẹp (Slogan ngang hàng Logo)
                </option>
                <option value="LAYOUT_05_SPLIT_VERTICAL">
                  Mẫu 05: Chia Trên - Dưới (3/5 Logo - 2/5 Đại lý, Gần vuông)
                </option>
                <option value="LAYOUT_06_LOGO_ONLY">
                  Mẫu 06/07/08: Chỉ Logo Nippon (Không tên đại lý)
                </option>
                <option value="LAYOUT_09_PILLAR">
                  Mẫu 09: Bảng Trụ Dọc (Vertical Pillar)
                </option>
                <option value="LAYOUT_10_MOBILE">
                  Mẫu 10: Biển Di Động Chân Sắt Bánh Xe
                </option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1 italic">
                * Tỷ lệ khảo sát: {(input.widthMeters / Math.max(0.1, input.heightMeters)).toFixed(2)}:1
              </p>
            </div>

            {/* Chọn câu Slogan */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Câu Khẩu Hiệu Slogan Thương Hiệu
              </label>
              <select
                value={input.sloganText || (input.layoutType === "LAYOUT_04_NARROW_HORIZONTAL" ? "Sơn Nippon Sơn Đâu Cũng Đẹp" : "Sơn Đâu Cũng Đẹp")}
                onChange={(e) => setInput({ ...input, sloganText: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden text-slate-800 font-medium"
              >
                <option value="Sơn Đâu Cũng Đẹp">
                  Sơn Đâu Cũng Đẹp (Xưởng in thi công - Khuyên dùng)
                </option>
                <option value="Sơn Nippon Sơn Đâu Cũng Đẹp">
                  Sơn Nippon Sơn Đâu Cũng Đẹp (Đầy đủ Brand Guidelines)
                </option>
              </select>
            </div>

            {/* Chọn màu nền biển hiệu */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Màu Nền Biển Hiệu
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("realistic");
                    setInput({ ...input, backgroundColor: "#D51A21" });
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    viewMode === "realistic"
                      ? "bg-rose-50 border-rose-600 text-rose-800 ring-1 ring-rose-500/20"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D51A21] shrink-0" />
                  <span>Đỏ Nippon</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("blueprint");
                    setInput({ ...input, backgroundColor: "#BDBDBD" });
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    viewMode === "blueprint"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#BDBDBD] shrink-0" />
                  <span>Xám Xưởng In</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Thông tin đại lý & Showroom */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                Thông Tin Đại Lý
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tên Đại Lý (Viết hoa) *
              </label>
              <input
                type="text"
                value={input.dealerName}
                onChange={(e) => setInput({ ...input, dealerName: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900"
                placeholder="Ví dụ: NAM LONG PHÁT"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Địa Chỉ Showroom / Cửa Hàng *
              </label>
              <input
                type="text"
                value={input.dealerAddress}
                onChange={(e) => setInput({ ...input, dealerAddress: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800"
                placeholder="Số nhà, đường, phường, quận/huyện, tỉnh..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Số Điện Thoại / Hotline
                </label>
                <input
                  type="text"
                  value={input.dealerPhone}
                  onChange={(e) => setInput({ ...input, dealerPhone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-800"
                  placeholder="0962 464 230"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tiền Tố / Loại Hình Đơn Vị
                </label>
                <input
                  type="text"
                  value={input.dealerType || ""}
                  onChange={(e) => setInput({ ...input, dealerType: e.target.value })}
                  placeholder="VD: CÔNG TY TNHH TRANG TRÍ NỘI THẤT"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-slate-800 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* 4. Quy cách vật liệu & Dự toán vật tư nhanh */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 text-xs">
            <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              Quy Cách Vật Liệu &amp; Dự Toán Thô
            </span>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Chất Liệu Mặt Biển
              </label>
              <select
                value={input.materialType}
                onChange={(e) => setInput({ ...input, materialType: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="Bảng mặt tiền Alu Alcorest 3mm + chữ Mica hút nổi">
                  Alu Alcorest 3mm + Chữ Mica hút nổi (Cao cấp)
                </option>
                <option value="Bảng bạt Hiflex không gân in UV cao cấp chống phai">
                  Bạt Hiflex không gân in UV ngoài trời
                </option>
                <option value="Bảng Fomex 10li cán Decal ngoài trời bọc viền nhôm">
                  Fomex 10li cán Decal ngoài trời
                </option>
                <option value="Bảng Hộp đèn 3M in UV xuyên sáng ban đêm">
                  Hộp đèn bạt 3M in UV xuyên sáng
                </option>
              </select>
            </div>

            {/* Thống kê bóc tách vật tư tự động */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>Số tấm vật tư (1.22x2.44m):</span>
                <strong className="text-slate-900">{spec.materialsEstimate.sheetCount} tấm</strong>
              </div>
              <div className="flex justify-between">
                <span>Sắt hộp mạ kẽm (Cây 6m):</span>
                <strong className="text-slate-900">{spec.materialsEstimate.ironBarsCount} cây</strong>
              </div>
              <div className="flex justify-between">
                <span>Nẹp nhôm viền định hình:</span>
                <strong className="text-slate-900">{spec.materialsEstimate.aluminumTrimMeters} m</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CỘT PHẢI: BẢN VẼ MAKET KỸ THUẬT CO DÃN TRỰC QUAN (8 CỘT) */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-3">
          {/* Toolbar Điều khiển Bản Vẽ */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs no-print">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs">Hiển thị:</span>
              <button
                onClick={() => setShowDimensions(!showDimensions)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition border ${
                  showDimensions
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                Kích Thước Đo Gióng CAD
              </button>

              <button
                onClick={() => setShowTitleBlock(!showTitleBlock)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition border ${
                  showTitleBlock
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                Khung Tên Bản Vẽ Kỹ Thuật
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs">Chế độ hiển thị:</span>
              <button
                onClick={() => {
                  setViewMode("blueprint");
                  setInput((prev) => ({ ...prev, backgroundColor: "#BDBDBD" }));
                }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 border ${
                  viewMode === "blueprint"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                Bản Vẽ Kỹ Thuật (Xưởng In - Nền Xám Dim Đỏ)
              </button>
              <button
                onClick={() => {
                  setViewMode("realistic");
                  setInput((prev) => ({ ...prev, backgroundColor: "#D51A21" }));
                }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 border ${
                  viewMode === "realistic"
                    ? "bg-rose-700 text-white border-rose-700 shadow-xs"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Thành Phẩm Thực Tế (Nền Đỏ Nippon)
              </button>
            </div>
          </div>

          {/* VÙNG CHỨA BẢN VẼ VECTOR TRỰC QUAN (IN ĐƯỢC CHUẨN A4 LANDSCAPE) */}
          <div
            id="printable-blueprint-zone"
            className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs overflow-hidden flex flex-col items-center justify-center min-h-[460px] print:p-0 print:border-none print:shadow-none"
          >
            <div className="w-full overflow-x-auto flex justify-center py-2">
              <div className="w-full max-w-5xl">
                <NipponSignCanvas
                  ref={svgRef}
                  input={input}
                  spec={spec}
                  showDimensions={showDimensions}
                  showTitleBlock={showTitleBlock}
                  viewMode={viewMode}
                />
              </div>
            </div>
          </div>

          {/* BẢNG BÓC TÁCH KỸ THUẬT CHI TIẾT (SPECIFICATIONS TABLE) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3 no-print">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
              <span className="font-bold text-slate-900 uppercase">
                Bảng Bóc Tách Tỷ Lệ Chi Tiết Theo Quy Chuẩn Thương Hiệu
              </span>
              <span className="text-slate-500 font-semibold">{spec.layoutName}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[11px]">Tổng kích thước phủ bì:</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {spec.totalWidthMm.toLocaleString()} × {spec.totalHeightMm.toLocaleString()} mm
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Diện tích: {spec.areaM2} m² • Độ sâu Z: {spec.totalDepthMm} mm
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[11px]">Phần Logo Nippon Paint:</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {spec.logoSection.widthMm.toLocaleString()} × {spec.logoSection.heightMm.toLocaleString()} mm
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {spec.logoSection.ratioDescription}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[11px]">Dải màu chuyển tiếp 9 màu:</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {spec.rainbowBar.widthMm} × {spec.rainbowBar.heightMm.toLocaleString()} mm
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {spec.rainbowBar.ratioDescription}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[11px]">Phần Thông tin Đại lý:</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {spec.dealerSection.widthMm.toLocaleString()} × {spec.dealerSection.heightMm.toLocaleString()} mm
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Co chữ tên: {spec.dealerSection.fontScalePercent}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

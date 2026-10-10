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
} from "@/lib/nippon-brand-guidelines";
import type { SiteSurveyDto } from "@/services/signage-phase2.service";
import { NipponSignCanvas } from "@/components/design/NipponShopCanvas";
import { dimensionCm, type ShopDrawing } from "@/lib/nippon-shop-drawing";

export default function ThietKeQuyChuanProjectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params?.id as string;
  const surveyProjectId = projectId && projectId !== "thiet-ke-quy-chuan" ? projectId : null;

  const queryProofId = searchParams?.get("proofId");
  const queryCloneFrom = searchParams?.get("cloneFrom");
  const querySurveyId = searchParams?.get("surveyId");
  const queryW = searchParams?.get("w");
  const queryH = searchParams?.get("h");
  const queryD = searchParams?.get("d");
  const queryTitle = searchParams?.get("title");
  const queryAddr = searchParams?.get("addr");

  // Chờ dữ liệu thực tế; không nạp sẵn đại lý hoặc kích thước minh họa.
  const [settings, setInput] = React.useState<SurveyInputDimensions>({
    widthMeters: 0,
    heightMeters: 0,
    depthMeters: 0,
    dealerName: "",
    dealerType: "",
    dealerAddress: "",
    dealerPhone: "",
    dealerFax: "",
    materialType: "",
    structureNote: "",
  });
  const [projectSurveys, setProjectSurveys] = React.useState<SiteSurveyDto[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = React.useState("");
  const [surveysLoading, setSurveysLoading] = React.useState(false);
  const [surveysError, setSurveysError] = React.useState("");
  const selectedSurvey = projectSurveys.find(s => s.id === selectedSurveyId);
  const applySurvey = React.useCallback((survey: SiteSurveyDto) => {
    const meta = survey.metadata || {};
    setSelectedSurveyId(survey.id);
    setInput(prev => ({
      ...prev,
      widthMeters: survey.widthMeters,
      heightMeters: survey.heightMeters,
      depthMeters: survey.depthMeters,
      dealerName: meta.dealerName?.trim() || survey.title.replace(/^(Khảo sát mặt bằng|Khảo sát|Biển bảng|BẢNG HIỆU)\s*[-:]?\s*/i, "").trim(),
      dealerType: "",
      dealerAddress: meta.dealerAddress ?? survey.address ?? "",
      dealerPhone: meta.dealerPhone ?? survey.customerPhone ?? "",
      dealerFax: "",
      materialType: meta.signMaterial || "",
      structureNote: survey.notes || "",
    }));
  }, []);
  const input = React.useMemo<SurveyInputDimensions>(() => ({
    ...settings,
    layoutType: detectRecommendedLayout(settings.widthMeters, settings.heightMeters,
      [settings.dealerName, settings.dealerType, settings.dealerAddress, settings.dealerPhone, settings.dealerFax].some(v => Boolean(v?.trim()))),
  }), [settings]);

  // Chế độ xem & Tùy chọn hiển thị
  const [showDimensions, setShowDimensions] = React.useState(true);
  const [showTitleBlock, setShowTitleBlock] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"blueprint" | "realistic">("blueprint");
  const [drawing, setDrawing] = React.useState<ShopDrawing | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [isSaving, setIsSaving] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  // Trạng thái liên kết bản vẽ đang chỉnh sửa
  const [loadedProof, setLoadedProof] = React.useState<any | null>(null);
  const [isLoadingProof, setIsLoadingProof] = React.useState(false);
  const currentProjectId = surveyProjectId || loadedProof?.projectId || null;

  const svgRef = React.useRef<SVGSVGElement>(null);
  const validDimensions = Number.isFinite(input.widthMeters) && input.widthMeters >= 0.3
    && Number.isFinite(input.heightMeters) && input.heightMeters >= 0.3;

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
                  const restoredInput = parsed._parametricSpec.input;
                  setInput((prev) => ({
                    ...prev,
                    ...restoredInput,
                    dealerName: restoredInput.dealerName ?? prev.dealerName ?? "",
                    dealerType: restoredInput.dealerType ?? prev.dealerType ?? "",
                    dealerAddress: restoredInput.dealerAddress ?? prev.dealerAddress ?? "",
                    dealerPhone: restoredInput.dealerPhone ?? prev.dealerPhone ?? "",
                    dealerFax: restoredInput.dealerFax ?? prev.dealerFax ?? "",
                    materialType: restoredInput.materialType ?? prev.materialType ?? "",
                    structureNote: restoredInput.structureNote ?? prev.structureNote ?? "",
                    widthMeters: typeof restoredInput.widthMeters === "number" ? restoredInput.widthMeters : prev.widthMeters,
                    heightMeters: typeof restoredInput.heightMeters === "number" ? restoredInput.heightMeters : prev.heightMeters,
                    depthMeters: typeof restoredInput.depthMeters === "number" ? restoredInput.depthMeters : prev.depthMeters,
                  }));
                  setSelectedSurveyId(parsed._parametricSpec.surveyId || "");
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
    } else if (!querySurveyId && (queryW || queryH || queryAddr || queryTitle)) {
      setInput((prev) => {
        const w = queryW ? parseFloat(queryW) : prev.widthMeters;
        const h = queryH ? parseFloat(queryH) : prev.heightMeters;
        const d = queryD ? parseFloat(queryD) : (prev.depthMeters ?? 0.2);
        const addr = queryAddr ?? prev.dealerAddress;
        let name = prev.dealerName;
        if (queryTitle) {
          const cleaned = queryTitle
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
      showToast("Đã nạp thông số từ liên kết thiết kế");
    }
  }, [queryProofId, queryCloneFrom, querySurveyId, queryW, queryH, queryD, queryTitle, queryAddr]);

  React.useEffect(() => {
    let canceled = false;
    setProjectSurveys([]); setSurveysError("");
    if (!queryProofId && !queryCloneFrom && (querySurveyId || (!queryW && !queryH))) {
      setSelectedSurveyId("");
      setInput(prev => ({...prev, widthMeters:0, heightMeters:0, depthMeters:0,
        dealerName:"", dealerType:"", dealerAddress:"", dealerPhone:"", dealerFax:"", materialType:"", structureNote:""}));
    }
    const read = async (url: string) => {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được phiếu khảo sát");
      return data;
    };
    const load = async () => {
      setSurveysLoading(true);
      try {
        let scope = currentProjectId;
        let requested: SiteSurveyDto | undefined;
        if (!scope && querySurveyId) {
          requested = (await read(`/api/surveys/${encodeURIComponent(querySurveyId)}`)).survey;
          if (!requested) throw new Error("Không tìm thấy phiếu khảo sát");
          scope = requested.projectId;
        }
        const surveys: SiteSurveyDto[] = scope
          ? ((await read(`/api/surveys?projectId=${encodeURIComponent(scope)}`)).surveys || []).filter((s: SiteSurveyDto) => s.projectId === scope)
          : requested ? [requested] : [];
        if (canceled) return;
        setProjectSurveys(surveys);
        const source = querySurveyId ? surveys.find(s => s.id === querySurveyId) : surveys.length === 1 ? surveys[0] : undefined;
        if (querySurveyId && !source) throw new Error("Phiếu khảo sát không thuộc dự án đang mở");
        if (source && !queryProofId && !queryCloneFrom && (querySurveyId || (!queryW && !queryH))) applySurvey(source);
      } catch (error) {
        if (!canceled) setSurveysError(error instanceof Error ? error.message : "Không tải được phiếu khảo sát");
      } finally { if (!canceled) setSurveysLoading(false); }
    };
    void load();
    return () => { canceled = true; };
  }, [currentProjectId, querySurveyId, queryProofId, queryCloneFrom, queryW, queryH, applySurvey]);

  const handleSelectSurvey = (id: string) => {
    const survey = projectSurveys.find(s => s.id === id);
    if (survey) { applySurvey(survey); showToast(`Đã nạp phiếu khảo sát ${survey.code}`); }
  };

  // Xuất file vector SVG
  const handleExportSvg = () => {
    if (!svgRef.current || !drawing || !validDimensions) return;
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
    if (!svgRef.current || !drawing || !validDimensions) return;
    try {
      const serializer = new XMLSerializer();
      const img = new Image();
      const bounds = svgRef.current.viewBox.baseVal;
      const exportWidth = bounds.width, exportHeight = bounds.height;
      const scale = Math.min(2, 8192 / Math.max(exportWidth, exportHeight), Math.sqrt(24_000_000 / (exportWidth * exportHeight)));
      const pixelW = Math.floor(exportWidth * scale), pixelH = Math.floor(exportHeight * scale);
      const copy = svgRef.current.cloneNode(true) as SVGSVGElement;
      copy.setAttribute("width", String(pixelW)); copy.setAttribute("height", String(pixelH));
      const svgStr = serializer.serializeToString(copy);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = pixelW;
        canvas.height = pixelH;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URLObj.revokeObjectURL(blobURL); showToast("Không tạo được ảnh PNG"); return; }
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
      img.onerror = () => { URLObj.revokeObjectURL(blobURL); showToast("Không đọc được bản vẽ để xuất PNG"); };
      img.src = blobURL;
    } catch (err: any) {
      alert("Lỗi xuất PNG: " + err.message);
    }
  };

  // Lưu hoặc Cập nhật vào Dự Án 360 (Lưu cả hình ảnh SVG + toàn bộ thông số hình học)
  const handleSaveToProject = async (saveAsNewProposal: boolean = false) => {
    if (!validDimensions) { showToast("Nhập chiều rộng và chiều cao từ 0,3 m trước khi lưu"); return; }
    if (!drawing || !svgRef.current) { showToast("Chờ tính xong chữ trước khi lưu"); return; }
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
          surveyId: selectedSurveyId || null,
          viewMode,
          showDimensions,
          showTitleBlock,
          savedAt: new Date().toISOString(),
          engineVersion: 3,
          drawing,
        },
        note: input.structureNote || "",
      };

      const isUpdatingExisting = Boolean(loadedProof && !saveAsNewProposal);
      const targetVersion = loadedProof
        ? (saveAsNewProposal ? (loadedProof.versionNo || 1) + 1 : loadedProof.versionNo || 1)
        : 1;

      const payload = {
        projectId: currentProjectId || selectedSurvey?.projectId || null,
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
        status: loadedProof?.status || "pending",
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

  const handlePrintDrawing = () => {
    const source = svgRef.current;
    if (!source || !drawing || !validDimensions) return;
    document.getElementById("maquette-print-frame")?.remove();
    const frame = document.createElement("iframe");
    frame.id = "maquette-print-frame"; frame.style.cssText = "position:fixed;width:0;height:0;border:0;left:-9999px";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) { frame.remove(); return; }
    doc.title = `Bản vẽ dán chữ ${input.dealerName}`;
    const style = doc.createElement("style");
    style.textContent = "@page{size:A4 landscape;margin:10mm}body{margin:0;font:11px Arial;color:#334155}.sheet{height:185mm;break-after:page;display:flex;flex-direction:column;justify-content:center}.sheet:last-child{break-after:auto}.sheet svg{display:block;width:100%;height:auto;max-height:170mm}p{margin:3mm 0}";
    doc.head.appendChild(style);
    const width = Number(source.dataset.sheetWidth), pad = Number(source.dataset.sheetPad);
    const appendSheet = (viewBox: string, caption: string, actualScale = true) => {
      const section = doc.createElement("section"); section.className = "sheet";
      const svg = source.cloneNode(true) as SVGSVGElement;
      svg.setAttribute("viewBox", viewBox); svg.removeAttribute("width"); svg.removeAttribute("height");
      const parts = viewBox.split(" ").map(Number);
      const minimumScale = Math.max(parts[2] / 277, parts[3] / 170);
      const scale = [1, 2, 5, 10, 20, 25, 50, 75, 100, 200, 250, 500, 1000].find(s => s >= minimumScale)
        ?? Math.ceil(minimumScale / 100) * 100;
      svg.style.width = `${parts[2] / scale}mm`; svg.style.height = `${parts[3] / scale}mm`;
      const note = doc.createElement("p");
      note.textContent = caption + (actualScale ? ` · Tỷ lệ 1:${scale} (in 100%)` : " · Chi tiết phóng lớn, đọc kích thước theo số dim");
      section.append(svg, note); doc.body.appendChild(section);
    };
    appendSheet(`${-pad} ${-pad} ${width + 2 * pad} ${Number(source.dataset.mainHeight) + pad}`,
      `Bản tổng thể · ${input.dealerName.replace(/\s+/g, " ")} · Dim cm, tọa độ từ góc trái trên`);
    frame.contentWindow?.focus(); frame.contentWindow?.print();
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
              Bố trí theo quy chuẩn /acc, tính kích thước và tọa độ từng chữ để thi công
            </p>
          </div>
        </div>

        {/* Các nút hành động chính */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleExportPng}
            disabled={!drawing || !validDimensions}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Tải ảnh PNG gửi khách duyệt qua Zalo"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span>Xuất Ảnh PNG</span>
          </button>

          <button
            onClick={handleExportSvg}
            disabled={!drawing || !validDimensions}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Tải bản vẽ SVG giữ nguyên đường nét chữ và kích thước"
          >
            <Layers className="w-3.5 h-3.5 text-slate-700" />
            <span>Xuất Vector SVG</span>
          </button>


          <button
            onClick={handlePrintDrawing}
            disabled={!drawing || !validDimensions}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="In hoặc lưu file PDF bản vẽ kỹ thuật A4 Landscape"
          >
            <Printer className="w-3.5 h-3.5 text-slate-700" />
            <span>In / PDF A4</span>
          </button>

          {projectId && projectId !== "thiet-ke-quy-chuan" && (
            <Link
              href={`/san-xuat?projectId=${projectId}&tab=bom${loadedProof?.id?`&designProofId=${loadedProof.id}`:""}`}
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
          {/* 1. Phiếu khảo sát đã lưu của dự án */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                Phiếu Khảo Sát Của Dự Án
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Dữ liệu đã lưu</span>
            </div>
            <select
              aria-label="Phiếu khảo sát của dự án"
              value={projectSurveys.some(s => s.id === selectedSurveyId) ? selectedSurveyId : ""}
              disabled={surveysLoading || !projectSurveys.length}
              onChange={(e) => handleSelectSurvey(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden text-slate-800 font-semibold"
            >
              <option value="">{surveysLoading ? "Đang tải phiếu khảo sát…" : "-- Chọn phiếu khảo sát của dự án --"}</option>
              {projectSurveys.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.metadata?.dealerName || p.title} ({p.widthMeters}m × {p.heightMeters}m)
                </option>
              ))}
            </select>
            {surveysError ? <p role="alert" className="text-xs text-red-700">{surveysError}</p>
              : !surveysLoading && !projectSurveys.length && <p className="text-xs text-slate-500">
                {currentProjectId ? "Dự án chưa có phiếu khảo sát." : "Mở thiết kế từ dự án hoặc một phiếu khảo sát để nạp dữ liệu."}
              </p>}
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

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="block text-slate-500 mb-1">Loại bảng tự chọn theo kích thước</span>
              <strong data-auto-layout={validDimensions ? spec.layoutType : undefined} className="text-slate-800">{validDimensions ? spec.layoutName : "Chưa có kích thước khảo sát"}</strong>
            </div>

            {/* Chọn câu Slogan */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Câu Khẩu Hiệu Slogan Thương Hiệu
              </label>
              <select
                value={input.sloganText ?? (["LAYOUT_04_NARROW_HORIZONTAL", "LAYOUT_08_NARROW_BRAND"].includes(input.layoutType || "") ? "Sơn Nippon Sơn Đâu Cũng Đẹp" : "Sơn Đâu Cũng Đẹp")}
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
                    setInput({ ...input, backgroundColor: "#B30024" });
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
              <textarea
                rows={2}
                aria-label="Tên đại lý"
                value={input.dealerName || ""}
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
                value={input.dealerAddress || ""}
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
                  value={input.dealerPhone || ""}
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


          </div>

          {/* VÙNG CHỨA BẢN VẼ VECTOR TRỰC QUAN (IN ĐƯỢC CHUẨN A4 LANDSCAPE) */}
          <div className="flex flex-wrap justify-end items-center gap-3 text-xs no-print">
            {!validDimensions && <p className="text-red-700">Nhập chiều rộng và chiều cao từ 0,3 m để xuất bản vẽ.</p>}
            <select aria-label="Phóng to bản vẽ" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="border rounded px-2 py-1">
              <option value={1}>Vừa màn hình</option><option value={2}>Phóng to 200%</option><option value={3}>Phóng to 300%</option>
            </select>
          </div>
          <div
            id="printable-blueprint-zone"
            className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs overflow-hidden flex flex-col items-center justify-center min-h-[460px] print:p-0 print:border-none print:shadow-none"
          >
            <div className="w-full overflow-x-auto py-2">
              <div style={{ width: `${zoom * 100}%` }}>
                {validDimensions ? <NipponSignCanvas
                  ref={svgRef}
                  input={input}
                  spec={spec}
                  showDimensions={showDimensions}
                  showTitleBlock={showTitleBlock}
                  viewMode={viewMode}
                  onDrawingChange={setDrawing}
                /> : <div className="py-16 text-center text-sm text-slate-500">Chọn phiếu khảo sát hoặc nhập kích thước thực tế để dựng bản vẽ.</div>}
              </div>
            </div>
          </div>

          {/* BẢNG BÓC TÁCH KỸ THUẬT CHI TIẾT (SPECIFICATIONS TABLE) */}
          {validDimensions && <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3 no-print">
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
                  {drawing?.lines.filter(l => l.role === "name").map(l => `${dimensionCm(l.width)} × ${dimensionCm(l.height)} cm · co ${Math.round(l.scaleX * 100)}%`).join(" / ") || "Không có chữ đại lý"}
                </div>
              </div>
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

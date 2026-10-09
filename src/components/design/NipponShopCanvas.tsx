"use client";

import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { parse, type Font } from "opentype.js";
import { NIPPON_BRAND_COLORS, NIPPON_RAINBOW_COLORS, type CalculatedBrandSpec, type SurveyInputDimensions } from "@/lib/nippon-brand-guidelines";
import { createShopDrawing, dimensionCm, type DrawingLine, type ShopDrawing } from "@/lib/nippon-shop-drawing";
import { planNipponDimensions, type DrawingDimension } from "@/lib/nippon-dimensions";
import { safeVectorContent } from "@/lib/nippon-vector-assets";
import { NIPPON_VECTOR_ARTWORK } from "@/lib/nippon-brand-artwork";

interface Props {
  input: SurveyInputDimensions; spec: CalculatedBrandSpec;
  showDimensions?: boolean; showTitleBlock?: boolean;
  viewMode?: "blueprint" | "realistic" | "clean";
  renderMode?: "shop_drawing" | "realistic"; className?: string;
  onDrawingChange?: (drawing: ShopDrawing | null) => void;
}
const GlyphLine = ({ line, color = "#fff" }: { line: DrawingLine; color?: string }) => (
  <g data-line-id={line.id} data-role={line.role} aria-label={line.text}>
    <title>{line.text}</title>
    {line.glyphs.map((g, i) => <path key={i} d={g.path} fill={color}
      data-char={g.char} data-x={g.x} data-y={g.y} data-width={g.width} data-height={g.height}
      transform={`translate(${g.originX} ${g.baseline}) ${line.rotated ? "rotate(-90)" : ""} scale(${line.fontSize / 1000 * line.scaleX} ${line.fontSize / 1000})`} />)}
  </g>
);
function Dim({ a, b, at, sourceA, sourceB, vertical, size, label, kind, background = "#fff", id,
  extensionA, extensionB, labelX, labelY, labelBox }: DrawingDimension & { background?: string }) {
  if (Math.abs(b - a) < 0.01) return null;
  const color = kind === "overall" || !vertical ? "#28658a" : "#c93645";
  const value = label;
  const badge = vertical ? labelBox.height : labelBox.width;
  const path = (points: [number, number][]) => points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  return <g className={vertical ? "cad-dim-v" : "cad-dim-h"} data-mm={b - a} data-dimension-id={id} data-dimension-kind={kind}
    data-a={a} data-b={b} data-at={at} data-source-a={sourceA} data-source-b={sourceB}
    fill="none" stroke={color} strokeWidth={size * 0.035}>
    <path data-extension="a" d={path(extensionA)} />
    <path data-extension="b" d={path(extensionB)} />
    <path data-dim-track="true" d={vertical ? `M${at},${a}V${b}` : `M${a},${at}H${b}`} />
    {[a, b].map((p, i) => kind === "overall" ? <path key={i} fill={color} stroke="none" d={vertical
      ? `M${at},${p}l${-size * 0.1},${(i ? -1 : 1) * size * 0.28}h${size * 0.2}Z`
      : `M${p},${at}l${(i ? -1 : 1) * size * 0.28},${-size * 0.1}v${size * 0.2}Z`} />
      : <path key={i} d={vertical
        ? `M${at - size * 0.12},${p - size * 0.12}l${size * 0.24},${size * 0.24}`
        : `M${p - size * 0.12},${at - size * 0.12}l${size * 0.24},${size * 0.24}`} />)}
    <g transform={vertical ? `translate(${labelX} ${labelY}) rotate(-90)` : `translate(${labelX} ${labelY})`} stroke="none">
      <rect x={-badge / 2} y={-size * 0.65} width={badge} height={size * 1.3} fill={background} />
      <text textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size} fontWeight="600">{value}</text>
    </g>
  </g>;
}

export const NipponSignCanvas = forwardRef<SVGSVGElement, Props>(function NipponSignCanvas({
  input, spec, showDimensions = true, showTitleBlock = true, viewMode = "blueprint", className = "", onDrawingChange,
}, ref) {
  const [fonts, setFonts] = useState<{ name: Font; info: Font } | null>(null);
  const [fontError, setFontError] = useState("");
  useEffect(() => {
    let canceled = false;
    setFonts(null); setFontError("");
    Promise.all([input.nameFontDataUrl || "/fonts/nippon-preview/NotoSans-BlackItalic.ttf",
      input.infoFontDataUrl || "/fonts/nippon-preview/NotoSans-Bold.ttf"].map(async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Không tải được font");
      return parse(await response.arrayBuffer());
    })).then(([name, info]) => { if (!canceled) setFonts({ name, info }); })
      .catch(error => { if (!canceled) setFontError(error.message || "Không đọc được font TTF/OTF"); });
    return () => { canceled = true; };
  }, [input.nameFontDataUrl, input.infoFontDataUrl]);
  const drawing = useMemo(() => fonts ? createShopDrawing(input, spec, fonts) : null, [input, spec, fonts]);
  useEffect(() => { onDrawingChange?.(drawing); }, [drawing, onDrawingChange]);
  if (!drawing) return <div role="status" className="p-8 text-center text-sm text-slate-600">{fontError || "Đang tính đường nét chữ…"}</div>;
  const logoVector = input.logoVector ?? NIPPON_VECTOR_ARTWORK.badge;

  const { width: X, height: Y, lines, logo } = drawing;
  const W = Math.max(X, Math.min(Y, 3200));
  const S = Math.max(W / 130, 16);
  const bodyX = (W - X) / 2;
  const bar = spec.rainbowBar;
  const dimensions = showDimensions ? planNipponDimensions(drawing, spec, S) : [];
  const dimBounds = dimensions.flatMap(d => [d.labelBox, ...[...d.extensionA, ...d.extensionB].map(([x, y]) =>
    ({ x: x - S * 0.2, y: y - S * 0.2, width: S * 0.4, height: S * 0.4 }))]);
  const pad = Math.max(S * 4, ...dimBounds.map(b => -b.x - bodyX + S), ...dimBounds.map(b => -b.y + S));
  const sheetW = Math.max(W, ...dimBounds.map(b => bodyX + b.x + b.width + S));
  const mainBottom = Math.max(Y, ...dimBounds.map(b => b.y + b.height)) + S * 2;
  const footerY = mainBottom + S * 2, footerH = showTitleBlock ? S * 5 : 0;
  const fill = viewMode === "blueprint" ? NIPPON_BRAND_COLORS.shopDrawingGray
    : viewMode === "clean" ? "#606773" : input.backgroundColor || NIPPON_BRAND_COLORS.redBackground;

  return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bản vẽ kích thước dán chữ"
    data-ready="true" data-provisional={drawing.provisional} className={`w-full h-auto ${className}`}
    data-sheet-width={sheetW} data-main-height={mainBottom + S * 2} data-sheet-pad={pad}
    viewBox={`${-pad} ${-pad} ${sheetW + 2 * pad} ${footerY + footerH + pad * 2}`}
    width={sheetW + pad * 2} height={footerY + footerH + pad * 2} style={{ fontFamily: "Arial, sans-serif" }}>
    <title>Bản vẽ {input.dealerName} · Đơn vị cm · Tọa độ từ góc trái trên</title>
    <defs>
      <linearGradient id="nippon-spectrum" x1="0%" y1="0%" x2={bar.isVertical ? "0%" : "100%"} y2={bar.isVertical ? "100%" : "0%"}>
        {NIPPON_RAINBOW_COLORS.map((color, i) => <stop key={color} offset={`${i / 8 * 100}%`} stopColor={color} />)}
      </linearGradient>
    </defs>
    <rect x={-pad} y={-pad} width={sheetW + 2 * pad} height={footerY + footerH + pad * 2} fill="#fff" />
    <g transform={`translate(${bodyX} 0)`}>
      <g id="sign-body">
        <rect x={0} y={0} width={X} height={Y} fill={fill} stroke="#8795a1" strokeWidth={S * 0.035} />
        {bar.widthMm > 0 && <rect id="spectrum-bar" x={bar.positionLeftMm} y={bar.positionTopMm}
          width={bar.widthMm} height={bar.heightMm} fill="url(#nippon-spectrum)" />}
        <svg id="logo-badge-vector" x={logo.x} y={logo.y} width={logo.width} height={logo.height}
          viewBox={`0 0 ${logoVector.width} ${logoVector.height}`} dangerouslySetInnerHTML={{ __html: safeVectorContent(logoVector.content) }} />
        {drawing.wordmark && (() => {
          const mark = drawing.wordmark;
          const asset = mark.rotated ? input.pillarWordmarkVector ?? NIPPON_VECTOR_ARTWORK.inline
            : input.wordmarkVector ?? NIPPON_VECTOR_ARTWORK.stacked;
          return asset && <g transform={mark.rotated ? `translate(${mark.x} ${mark.y + mark.height}) rotate(-90)` : `translate(${mark.x} ${mark.y})`}>
            <svg id="brand-wordmark-vector" width={mark.rotated ? mark.height : mark.width} height={mark.rotated ? mark.width : mark.height}
              viewBox={`0 0 ${asset.width} ${asset.height}`} dangerouslySetInnerHTML={{ __html: safeVectorContent(asset.content) }} />
          </g>;
        })()}
        {lines.map(line => <GlyphLine key={line.id} line={line} />)}
      </g>
      {showDimensions && <g id="technical-dimensions">
        {dimensions.map(d => <Dim key={d.id} {...d} background={
          d.labelBox.x >= 0 && d.labelBox.y >= 0 && d.labelBox.x + d.labelBox.width <= X
            && d.labelBox.y + d.labelBox.height <= Y ? fill : "#fff"} />)}
      </g>}
    </g>
    {showDimensions && <text x={0} y={mainBottom + S * 0.6} fontSize={S * 0.8} fill="#334155">
      Đơn vị dim: cm · X/Y đo từ góc trái trên · Cao chữ bao gồm dấu tiếng Việt
    </text>}
    {showTitleBlock && <g id="technical-title-block" transform={`translate(0 ${footerY})`}>
      <rect width={W} height={footerH} fill="#fff" stroke="#94a3b8" strokeWidth={S * 0.04} />
      <text x={S} y={S * 1.8} fontSize={S * 1.1} fill="#0f172a" fontWeight="bold">BẢN VẼ BỐ TRÍ DÁN CHỮ · {dimensionCm(X)} × {dimensionCm(Y)} cm</text>
      <text x={S} y={S * 3.3} fontSize={S * 0.85} fill="#475569">{spec.layoutName}</text>
      <text x={S} y={S * 4.5} fontSize={S * 0.7} fill="#64748b">Đơn vị: cm</text>
    </g>}
  </svg>;
});

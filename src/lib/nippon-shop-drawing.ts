import type { Font, Glyph } from "opentype.js";
import type { CalculatedBrandSpec, SurveyInputDimensions } from "./nippon-brand-guidelines";
import { NIPPON_VECTOR_ARTWORK } from "./nippon-brand-artwork";

export interface DrawingBox { x: number; y: number; width: number; height: number }
export interface DrawingGlyph extends DrawingBox { char: string; path: string; originX: number; baseline: number }
export interface DrawingWord extends DrawingBox { text: string }
export interface DrawingLine extends DrawingBox {
  id: string; role: string; text: string; fontSize: number; scaleX: number;
  rotated?: boolean;
  glyphs: DrawingGlyph[]; words: DrawingWord[];
}
export interface ShopDrawing {
  width: number; height: number; logo: DrawingBox;
  brandBox: DrawingBox; wordmark?: DrawingBox & { rotated?: boolean };
  typography: { referenceF: number; nameRatio: number; nameScale: number; typeRatio: number; infoRatio: number };
  brandDetails: DrawingLine[];
  lines: DrawingLine[]; issues: string[]; provisional: boolean;
}
const union = (boxes: DrawingBox[]): DrawingBox => {
  if (!boxes.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
  return { x, y, width: Math.max(...boxes.map(b => b.x + b.width)) - x,
    height: Math.max(...boxes.map(b => b.y + b.height)) - y };
};
export const dimensionCm = (mm: number) => (mm / 10).toLocaleString("vi-VN", { maximumFractionDigits: 1, useGrouping: false });

// All measurements come from exactly the same glyph paths that are rendered/exported.
// NFC retains Vietnamese composite letters; no guessed width-per-character factors.
function measure(font: Font, text: string) {
  let pen = 0, previous: Glyph | undefined;
  const glyphs: DrawingGlyph[] = [];
  const words: DrawingWord[] = [];
  let word: DrawingGlyph[] = [];
  const flush = () => { if (word.length) words.push({ ...union(word), text: word.map(g => g.char).join("") }); word = []; };
  for (const char of Array.from(text.normalize("NFC"))) {
    const glyph = font.charToGlyph(char);
    if (previous) pen += font.getKerningValue(previous, glyph) * 1000 / font.unitsPerEm;
    const outline = glyph.getPath(pen, 0, 1000);
    if (char.trim()) {
      const b = outline.getBoundingBox();
      const item = { char, path: glyph.getPath(0, 0, 1000).toPathData(3), x: b.x1, y: b.y1,
        width: b.x2 - b.x1, height: b.y2 - b.y1, originX: pen, baseline: 0 };
      glyphs.push(item); word.push(item);
    } else flush();
    pen += (glyph.advanceWidth || 0) * 1000 / font.unitsPerEm;
    previous = glyph;
  }
  flush();
  return { ...union(glyphs), glyphs, words };
}

function wrap(font: Font, text: string, count: number): string[] {
  const paragraphs = text.normalize("NFC").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (count <= 1) return paragraphs;
  const result: string[] = [];
  for (const paragraph of paragraphs) {
    const tokens = paragraph.split(/\s+/);
    const target = measure(font, paragraph).width / count;
    let line = "";
    for (const token of tokens) {
      const candidate = line ? `${line} ${token}` : token;
      if (line && measure(font, candidate).width > target && result.length < count - 1) {
        result.push(line); line = token;
      } else line = candidate;
    }
    if (line) result.push(line);
  }
  return result;
}

export function fitText(font: Font, text: string, box: DrawingBox, role: string, options: {
  maxFont: number; maxLines?: number; minScale?: number; gap?: number;
  align?: "left" | "center"; mode?: "auto" | "single" | "manual";
  fixedScale?: number;
}): DrawingLine[] {
  if (!text.trim() || box.width <= 0 || box.height <= 0) return [];
  let best: { measured: ReturnType<typeof measure>[]; font: number; scale: number; score: number; texts: string[] } | undefined;
  const normalized = text.normalize("NFC").trim();
  const manual = options.mode === "manual" || normalized.includes("\n");
  const maxLines = options.mode === "single" || manual ? 1 : options.maxLines || 1;
  for (let count = 1; count <= maxLines; count++) {
    const texts = options.mode === "single" ? [normalized.replace(/\s+/g, " ")] : wrap(font, normalized, count);
    const measured = texts.map(t => measure(font, t));
    const naturalWidth = Math.max(...measured.map(m => m.width));
    const naturalHeight = Math.max(...measured.map(m => m.height));
    for (const scale of options.fixedScale ? [options.fixedScale]
      : Array.from(new Set([1, 0.9, options.minScale || 1])).filter(s => s >= (options.minScale || 1))) {
      const gap = options.gap ?? 0.25;
      const size = Math.min(options.maxFont, box.width / Math.max(1, naturalWidth * scale) * 1000,
        box.height / Math.max(1, naturalHeight * (texts.length + gap * (texts.length - 1))) * 1000);
      const score = size * scale / (1 + 0.12 * (texts.length - 1));
      if (!best || score > best.score) best = { measured, font: size, scale, score, texts };
    }
  }
  if (!best) return [];
  const { measured, font: fontSize, scale, texts } = best;
  const factor = fontSize / 1000;
  const lineHeight = Math.max(...measured.map(m => m.height)) * factor;
  const step = lineHeight * (1 + (options.gap ?? 0.25));
  const totalHeight = lineHeight + step * (texts.length - 1);
  return measured.map((m, i) => {
    const width = m.width * factor * scale;
    const x = box.x + (options.align === "left" ? 0 : (box.width - width) / 2);
    const y = box.y + (box.height - totalHeight) / 2 + i * step;
    const tx = x - m.x * factor * scale, baseline = y - m.y * factor;
    const convert = (b: DrawingBox) => ({ x: tx + b.x * factor * scale, y: baseline + b.y * factor,
      width: b.width * factor * scale, height: b.height * factor });
    return { id: `${role}-${i}`, role, text: texts[i], x, y, width, height: m.height * factor,
      fontSize, scaleX: scale,
      glyphs: m.glyphs.map(g => ({ ...g, ...convert(g), originX: tx + g.originX * factor * scale, baseline })),
      words: m.words.map(w => ({ ...w, ...convert(w) })) };
  });
}

interface DealerTextRow {
  text: string; role: string; font: Font; ratio: number; maxLines: number; scale: number;
}

/** Fit the whole dealer block at one common reduction factor. A group can borrow
 * vertical space from its neighbors; fixed percentage slots cannot shrink the
 * dealer name independently and invert the intended visual hierarchy.
 */
function fitDealerBlock(rows: DealerTextRow[], box: DrawingBox, referenceF: number, align: "left" | "center"): DrawingLine[] {
  const caches = new Map<Font, Map<string, ReturnType<typeof measure>>>();
  const measured = (font: Font, text: string) => {
    if (!caches.has(font)) caches.set(font, new Map());
    const cache = caches.get(font)!;
    if (!cache.has(text)) cache.set(text, measure(font, text));
    return cache.get(text)!;
  };
  const texts = rows.map(r => r.text.normalize("NFC").trim().replace(/[^\S\r\n]+/g, " "));
  const infoRows = rows.filter(r => ["address", "phone"].includes(r.role));
  // Both contact groups use the same font size, including when their accents
  // produce different measured outline heights.
  const infoHeight = Math.max(1, ...infoRows.map(r => measured(r.font, r.text).height));
  const targetFonts = rows.map((r, i) => referenceF * r.ratio * 1000 /
    Math.max(1, ["address", "phone"].includes(r.role) ? infoHeight : measured(r.font, texts[i]).height));

  const wrapAtWidth = (row: DealerTextRow, text: string, fontSize: number): string[] | null => {
    const fits = (s: string) => measured(row.font, s).width * fontSize / 1000 * row.scale <= box.width + 0.001;
    const paragraphs = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    // Enter is an explicit layout decision; never join or re-wrap those lines.
    if (paragraphs.length > 1) return paragraphs.every(fits) ? paragraphs : null;
    const paragraph = paragraphs[0];
    if (fits(paragraph)) return [paragraph];
    const tokens = [...paragraph.matchAll(/\S+/g)];
    const protectedRanges = row.role === "phone"
      ? [...paragraph.matchAll(/(?:ĐT:|Fax:)?\s*\+?\d[\d .()]*\d/gi)].map(m => [m.index!, m.index! + m[0].length]) : [];
    const canBreak = (end: number) => end === tokens.length || !protectedRanges.some(([a,b]) => tokens[end].index! > a && tokens[end].index! < b);
    const segment = (start: number, end: number) => paragraph.slice(tokens[start].index!, tokens[end - 1].index! + tokens[end - 1][0].length);
    for (let count = 2; count <= Math.min(row.maxLines, tokens.length); count++) {
      const target = measured(row.font, paragraph).width / count;
      const memo = new Map<string, { cost: number; lines: string[] } | null>();
      const solve = (start: number, remaining: number): { cost: number; lines: string[] } | null => {
        if (!remaining) return start === tokens.length ? {cost:0,lines:[]} : null;
        if (tokens.length - start < remaining) return null;
        const key = `${start}/${remaining}`;
        if (memo.has(key)) return memo.get(key)!;
        let best: { cost: number; lines: string[] } | null = null;
        for (let end = start + 1; end <= tokens.length - remaining + 1; end++) {
          const line = segment(start, end), width = measured(row.font, line).width;
          if (!fits(line)) break;
          if (!canBreak(end)) continue;
          const tail = solve(end, remaining - 1);
          if (!tail) continue;
          const cost = tail.cost + (width / Math.max(1, target) - 1) ** 2
            + (end - start === 1 && tokens.length > count + 1 ? 0.25 : 0)
            + (row.role === "address" && end < tokens.length && !/[,;]$/.test(line) ? 0.12 : 0);
          if (!best || cost < best.cost) best = { cost, lines: [line, ...tail.lines] };
        }
        memo.set(key, best); return best;
      };
      const result = solve(0, count);
      if (result) return result.lines;
    }
    return null;
  };
  const plan = (reduction: number) => {
    const fonts = targetFonts.map(f => f * reduction);
    const wrapped: string[][] = [];
    for (let i = 0; i < rows.length; i++) {
      const result = wrapAtWidth(rows[i], texts[i], fonts[i]);
      if (!result) return null;
      wrapped.push(result);
    }
    const nameIndex = rows.findIndex(r => r.role === "name");
    if (nameIndex >= 0) {
      const name = rows[nameIndex];
      const smallestName = Math.min(...wrapped[nameIndex].map(s => measured(name.font, s).height)) * fonts[nameIndex] / 1000;
      // A line without accents must still stay visually above the other groups.
      for (let i = 0; i < rows.length; i++) if (i !== nameIndex) {
        const maxHeight = Math.max(...wrapped[i].map(s => measured(rows[i].font, s).height));
        const ceiling = smallestName * rows[i].ratio / name.ratio * 1000 / Math.max(1, maxHeight);
        if (["address", "phone"].includes(rows[i].role)) {
          for (let j = 0; j < rows.length; j++) if (["address", "phone"].includes(rows[j].role)) fonts[j] = Math.min(fonts[j], ceiling);
        } else fonts[i] = Math.min(fonts[i], ceiling);
      }
    }
    const heights = rows.map((r,i) => Math.max(...wrapped[i].map(s => measured(r.font, s).height)) * fonts[i] / 1000
      * (wrapped[i].length + 0.3 * (wrapped[i].length - 1)));
    const gaps = rows.slice(1).map((r,i) => Math.max(fonts[i], fonts[i+1]) * 0.15);
    const used = heights.reduce((a,b) => a+b,0) + gaps.reduce((a,b) => a+b,0);
    return used <= box.height + 0.001 ? {fonts,wrapped,heights,gaps,used} : null;
  };
  // Try all groups at their specified heights first. Only reduce the whole block
  // after word wrapping cannot fit within the available width and height.
  let chosen = plan(1);
  if (!chosen) {
    let low = 0, high = 1;
    for (let i = 0; i < 24; i++) {
      const middle = (low + high) / 2, candidate = plan(middle);
      if (candidate) { low = middle; chosen = candidate; } else high = middle;
    }
  }
  if (!chosen) return [];
  const extra = Math.max(0, box.height - chosen.used);
  const weights = [0.5, ...rows.slice(1).map((r,i) => rows[i].role === "name" ? 1.5
    : r.role === "name" ? 1 : 0), 0.5];
  const totalWeight = weights.reduce((a,b) => a+b,0);
  let y = box.y + extra * weights[0] / totalWeight;
  const result: DrawingLine[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    result.push(...fitText(row.font, chosen.wrapped[i].join("\n"), {...box,y,height:chosen.heights[i]}, row.role,
      {maxFont:chosen.fonts[i],fixedScale:row.scale,mode:"manual",gap:0.3,align:row.role === "name" ? "center" : align}));
    y += chosen.heights[i] + (chosen.gaps[i] || 0) + extra * weights[i+1] / totalWeight;
  }
  return result;
}

export function createShopDrawing(input: SurveyInputDimensions, spec: CalculatedBrandSpec,
  fonts: { name: Font; info: Font }): ShopDrawing {
  const X = spec.totalWidthMm, Y = spec.totalHeightMm;
  const lines: DrawingLine[] = [], issues: string[] = [];
  const pillar = spec.layoutType === "LAYOUT_09_PILLAR";
  const narrow = ["LAYOUT_04_NARROW_HORIZONTAL", "LAYOUT_08_NARROW_BRAND"].includes(spec.layoutType);
  const brand = spec.logoSection, bar = spec.rainbowBar, dealer = spec.dealerSection;
  const logoVector = input.logoVector ?? NIPPON_VECTOR_ARTWORK.badge;
  const wordmarkVector = input.wordmarkVector ?? NIPPON_VECTOR_ARTWORK.stacked;
  const pillarVector = input.pillarWordmarkVector ?? NIPPON_VECTOR_ARTWORK.inline;
  const originalPair = !input.logoVector && !input.wordmarkVector;
  const originalLayout = NIPPON_VECTOR_ARTWORK.stackedLayout;
  const slogan = input.sloganText ?? (narrow ? "Sơn Nippon Sơn Đâu Cũng Đẹp" : "Sơn Đâu Cũng Đẹp");
  const nippon = measure(fonts.name, "NIPPON"), paint = measure(fonts.name, "PAINT");
  const naturalMarkH = nippon.height + paint.height + 100;
  const naturalBadgeW = naturalMarkH * logoVector.width / logoVector.height;
  const naturalWordH = originalPair ? naturalMarkH * wordmarkVector.height / originalLayout.badgeHeight : naturalMarkH;
  const wordTop = originalPair ? naturalMarkH * originalLayout.top / originalLayout.badgeHeight : 0;
  const naturalMarkW = naturalWordH * wordmarkVector.width / wordmarkVector.height;
  const naturalSlogan = measure(fonts.name, slogan);
  const sloganFactor = naturalMarkH * 0.24 / Math.max(1, naturalSlogan.height);
  const markX = naturalBadgeW + naturalMarkH * (originalPair ? originalLayout.gap / originalLayout.badgeHeight : 0.12);
  const naturalW = markX + naturalMarkW;
  const fullW = narrow ? naturalW + naturalMarkH * 0.16 + naturalSlogan.width * sloganFactor : naturalW;
  const fullH = narrow ? naturalMarkH : naturalMarkH * 1.4;
  const scale = Math.min(brand.logoWidthMm / fullW, (brand.heightMm - 2 * brand.marginTopMm) / fullH);
  const originX = (brand.widthMm - fullW * scale) / 2;
  const originY = (brand.heightMm - fullH * scale) / 2;
  const logo = { x: originX, y: originY, width: naturalBadgeW * scale, height: naturalMarkH * scale };
  let brandBox: DrawingBox = { x: originX, y: originY, width: fullW * scale, height: fullH * scale };
  let wordmark: ShopDrawing["wordmark"];
  let referenceF = nippon.height * scale;
  if (pillar) {
    logo.height = Math.min(brand.logoHeightMm, brand.logoWidthMm / (naturalBadgeW / naturalMarkH));
    logo.width = logo.height * naturalBadgeW / naturalMarkH;
    logo.x = (X - logo.width) / 2; logo.y = brand.marginTopMm;
  } else {
    const bx = originX + markX * scale;
    wordmark = { x: bx, y: originY + wordTop * scale, width: naturalMarkW * scale, height: naturalWordH * scale };
    if (wordmarkVector.parts?.[0]) referenceF = wordmarkVector.parts[0].height * wordmark.width / wordmarkVector.width;
    lines.push(...fitText(fonts.name, slogan, narrow
      ? { x: originX + (naturalW + naturalMarkH * 0.16) * scale, y: originY + naturalMarkH * 0.76 * scale,
        width: naturalSlogan.width * sloganFactor * scale, height: naturalMarkH * 0.24 * scale }
      : { x: originX, y: originY + naturalMarkH * 1.14 * scale, width: naturalW * scale, height: naturalMarkH * 0.26 * scale },
      "slogan", { maxFont: sloganFactor * 1000 * scale, fixedScale: 1, align: "center" }));
    if (brandBox.width < brand.logoWidthMm - 1)
      issues.push(`Chiều cao giới hạn cụm thương hiệu: W thực tế ${dimensionCm(brandBox.width)} cm; W theo tỷ lệ ${dimensionCm(brand.logoWidthMm)} cm. Cần duyệt khoảng đệm hoặc đổi mẫu.`);
  }
  if (pillar) {
    const bodyTop = logo.y + logo.height + brand.heightMm * 0.035;
    const bodyBottom = brand.heightMm - brand.heightMm * 0.035;
    const availableH = Math.max(1, bodyBottom - bodyTop);
    {
      const asset = pillarVector;
      const vectorScale = Math.min(availableH / asset.width, X * 0.6 / asset.height);
      wordmark = { x: (X - asset.height * vectorScale) / 2, y: bodyTop + (availableH - asset.width * vectorScale) / 2,
        width: asset.height * vectorScale, height: asset.width * vectorScale, rotated: true };
      referenceF = wordmark.width;
    }
    const pivot = bodyBottom;
    const rotate = (b: DrawingBox): DrawingBox => ({ x: b.y, y: pivot - b.x - b.width, width: b.height, height: b.width });
    for (const line of lines.filter(l => l.role === "pillar-brand")) {
      Object.assign(line, rotate(line), { rotated: true });
      line.words = line.words.map(w => ({ ...w, ...rotate(w) }));
      line.glyphs = line.glyphs.map(g => ({ ...g, ...rotate(g), originX: g.baseline, baseline: pivot - g.originX }));
      referenceF = line.fontSize;
    }
    brandBox = union([logo, ...(wordmark ? [wordmark] : []), ...lines.filter(l => l.role === "pillar-brand")]);
  }
  // Measured source paths drive the brand dimensions; they are rendered as SVG artwork, never retyped.
  const brandDetails: DrawingLine[] = [];
  if (wordmark) {
    const asset = pillar ? pillarVector : wordmarkVector;
    const k = (wordmark.rotated ? wordmark.height : wordmark.width) / asset.width;
    const convert = (b: DrawingBox): DrawingBox => wordmark!.rotated
      ? { x: wordmark!.x + b.y * k, y: wordmark!.y + wordmark!.height - (b.x + b.width) * k, width: b.height * k, height: b.width * k }
      : { x: wordmark!.x + b.x * k, y: wordmark!.y + b.y * k, width: b.width * k, height: b.height * k };
    for (const [i, part] of (asset.parts ?? []).entries()) {
      let offset = 0;
      const words = part.text.split(/\s+/).map(text => {
        const glyphs = part.glyphs.slice(offset, offset + text.length); offset += text.length;
        return { text, ...convert(union(glyphs)) };
      });
      brandDetails.push({ ...convert(part), id: pillar ? "pillar-brand-vector" : `brand-${i}-vector`,
        role: pillar ? "pillar-brand" : `brand-${i}`, text: part.text, fontSize: referenceF, scaleX: 1,
        rotated: wordmark.rotated, words,
        glyphs: part.glyphs.map(g => ({ ...g, ...convert(g), path: "", originX: 0, baseline: 0 })) });
    }
  }
  const normalizedName = input.dealerName.normalize("NFC").toUpperCase().trim().replace(/\s+/g, " ");
  const nameRatio = pillar ? 1 / 2 : normalizedName === "SƠN" ? 1 : 2 / 3;
  const nameScale = (normalizedName === "ĐỨC VƯỢNG" ? 90 : normalizedName === "TÂN TÀI PHÁT" ? 80 : 100) / 100;
  const typeRatio = pillar ? 1 / 4 : 1 / 2, infoRatio = pillar ? 1 / 6 : 1 / 4;
  if (dealer.widthMm > 0) {
    const top = Math.max(dealer.positionTopMm, bar.isVertical ? 0 : bar.positionTopMm + bar.heightMm);
    const left = Math.max(dealer.positionLeftMm, bar.isVertical ? bar.positionLeftMm + bar.widthMm : 0);
    const padX = (X - left) * 0.05, padY = (Y - top) * 0.05;
    const w = X - left - 2 * padX, h = Y - top - 2 * padY;
    const align = bar.isVertical ? "left" : "center";
    const rows: DealerTextRow[] = [
      { text: input.dealerType || "", role: "type", font: fonts.info, ratio: typeRatio, maxLines: 2, scale:1 },
      { text: (input.dealerName || "").toUpperCase(), role: "name", font: fonts.name, ratio: nameRatio, maxLines: 4, scale:nameScale },
      { text: input.dealerAddress || "", role: "address", font: fonts.info, ratio: infoRatio, maxLines: 3, scale:1 },
      { text: [input.dealerPhone ? `ĐT: ${input.dealerPhone}` : "", input.dealerFax ? `Fax: ${input.dealerFax}` : ""].filter(Boolean).join(" - "),
        role: "phone", font: fonts.info, ratio: infoRatio, maxLines: 2, scale:1 },
    ].filter(r => r.text.trim());
    const fitted = fitDealerBlock(rows, {x:left+padX,y:top+padY,width:w,height:h}, referenceF, align);
    lines.push(...fitted);
    for (const row of rows) {
      if (fitted.some(l => l.role === row.role && l.height < referenceF * row.ratio * 0.97))
        issues.push(`Đã giảm cỡ ${row.role === "name" ? "tên đại lý" : row.role === "type" ? "loại hình" : row.role === "address" ? "địa chỉ" : "điện thoại"} để vừa vùng bố trí; cần duyệt so với tỷ lệ F.`);
    }
  }
  for (const line of lines) {
    const font = ["name", "slogan", "pillar-brand", "brand-0", "brand-1"].includes(line.role) ? fonts.name : fonts.info;
    const missing = Array.from(new Set(Array.from(line.text).filter(c => c.trim() && font.charToGlyphIndex(c) === 0)));
    if (missing.length) issues.push(`Font thiếu ký tự: ${missing.join(" ")}`);
    if (line.height < 20 && ["name", "address", "phone", "type"].includes(line.role))
      issues.push(`Chữ ${line.role === "name" ? "tên đại lý" : line.role === "address" ? "địa chỉ" : line.role === "phone" ? "điện thoại" : "loại hình"} thấp hơn 2 cm; cần kiểm tra khả năng đọc hoặc chọn bố cục khác.`);
  }
  return { width: X, height: Y, logo, brandBox, wordmark, typography: { referenceF, nameRatio, nameScale, typeRatio, infoRatio },
    lines, brandDetails, issues: Array.from(new Set(issues)), provisional: !input.nameFontDataUrl || !input.infoFontDataUrl };
}

export function drawingCsv(drawing: ShopDrawing): string {
  const cell = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const rows: Array<Array<string | number>> = [["Dòng", "Nội dung", "STT chữ", "Chữ", "X từ mép trái (mm)", "Y từ mép trên (mm)",
    "Rộng (mm)", "Cao gồm dấu (mm)", "Khe tới chữ sau (mm)", "Co ngang (%)"]];
  for (const line of drawing.lines) {
    line.glyphs.forEach((g, i) => rows.push([line.id, line.text, i + 1, g.char,
      g.x.toFixed(1), g.y.toFixed(1), g.width.toFixed(1), g.height.toFixed(1),
      i + 1 < line.glyphs.length ? (line.rotated ? g.y - line.glyphs[i + 1].y - line.glyphs[i + 1].height
        : line.glyphs[i + 1].x - g.x - g.width).toFixed(1) : "", (line.scaleX * 100).toFixed(0)]));
  }
  return "\uFEFF" + rows.map(r => r.map(cell).join(";")).join("\r\n");
}

import type { CalculatedBrandSpec } from "./nippon-brand-guidelines";
import { dimensionCm, type DrawingBox, type ShopDrawing } from "./nippon-shop-drawing";
import { dimensionPathCutsBoxes, routeDimensionExtension, type DimPoint } from "./nippon-dimension-router";

export interface DrawingDimension {
  id: string; kind: "overall" | "partition" | "size" | "position" | "gap";
  a: number; b: number; at: number; sourceA: number; sourceB: number;
  vertical: boolean; size: number; label: string; labelBox: DrawingBox;
  labelX: number; labelY: number; extensionA: DimPoint[]; extensionB: DimPoint[];
}
const intersects = (a: DrawingBox, b: DrawingBox) =>
  a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0
    && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

/** Tracks are chosen against the actual outlines and previously placed labels.
 * Extension origins retain the two measured edges, even if their heights differ.
 */
export function planNipponDimensions(drawing: ShopDrawing, spec: CalculatedBrandSpec, size: number): DrawingDimension[] {
  const { width: X, height: Y, logo } = drawing;
  const details = drawing.brandDetails ?? [];
  const lines = [...drawing.lines, ...details];
  const content = [logo, ...(drawing.wordmark && !details.length ? [drawing.wordmark] : []), ...lines.flatMap(l => l.glyphs),
    ...(spec.rainbowBar.widthMm > 0 ? [{ x: spec.rainbowBar.positionLeftMm, y: spec.rainbowBar.positionTopMm,
      width: spec.rainbowBar.widthMm, height: spec.rainbowBar.heightMm }] : [])];
  const placed: DrawingDimension[] = [];
  const bar = spec.rainbowBar;
  // Keep label backgrounds away from the source points of later measurements.
  const blocks = [...new Set(lines.map(l => l.role))].map(role => {
    const rows = lines.filter(l => l.role === role), x = Math.min(...rows.map(l => l.x)), y = Math.min(...rows.map(l => l.y));
    return { x, y, width: Math.max(...rows.map(l => l.x + l.width)) - x,
      height: Math.max(...rows.map(l => l.y + l.height)) - y };
  });
  const reserved = [logo, ...lines, ...blocks, ...lines.flatMap(l => [...l.words, ...l.glyphs])].flatMap(b =>
    [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height],
      [b.x, b.y + b.height / 2], [b.x + b.width, b.y + b.height / 2]].map(([x, y]) => ({x:x-0.2,y:y-0.2,width:0.4,height:0.4})));
  // Margin dimensions also originate at the projection onto the board edge.
  // A label placed there would trap a later extension, especially for packed rows.
  reserved.push(...[logo, ...lines, ...blocks].flatMap(b =>
    [[b.x, 0], [b.x, Y], [b.x + b.width, 0], [b.x + b.width, Y],
      [0, b.y], [X, b.y], [0, b.y + b.height], [X, b.y + b.height]]
      .map(([x,y]) => ({x:x-0.2,y:y-0.2,width:0.4,height:0.4}))));
  const labelPlacement = (a: number, b: number, at: number, vertical: boolean, fontSize: number, label: string, side: number) => {
    const length = Math.max(fontSize * 1.3, label.length * fontSize * 0.61 + fontSize * 0.35);
    const offset = b - a < length + fontSize * 0.1 ? fontSize * 1.15 * side : 0;
    const labelX = vertical ? at + offset : (a + b) / 2, labelY = vertical ? (a + b) / 2 : at + offset;
    const labelBox = vertical ? { x: labelX - fontSize * 0.65, y: labelY - length / 2, width: fontSize * 1.3, height: length }
      : { x: labelX - length / 2, y: labelY - fontSize * 0.65, width: length, height: fontSize * 1.3 };
    return { labelX, labelY, labelBox };
  };
  const add = (id: string, kind: DrawingDimension["kind"], a: number, b: number, sourceA: number, sourceB: number,
    preferred: number, vertical = false, fontSize = size * 0.72, label = dimensionCm(b - a), direction = 1,
    alternative?: { sourceA: number; sourceB: number; preferred: number; direction: number }) => {
    if (!Number.isFinite(b - a) || b - a < 0.5) return;
    const starts = [{ sourceA, sourceB, preferred, direction }, ...(alternative ? [alternative] : [])];
    const obstacles = [...content, ...placed.map(d => d.labelBox)];
    const trackPoints = (at: number): DimPoint[] => vertical ? [[at, a], [at, b]] : [[a, at], [b, at]];
    const tryAt = (at: number, origins: typeof starts[number], routed: boolean) => {
      const placement = labelPlacement(a, b, at, vertical, fontSize, label, origins.direction);
      if ([...obstacles, ...reserved].some(c => intersects(placement.labelBox, c)) || dimensionPathCutsBoxes(trackPoints(at), obstacles)) return false;
      const fromA: DimPoint = vertical ? [origins.sourceA, a] : [a, origins.sourceA];
      const fromB: DimPoint = vertical ? [origins.sourceB, b] : [b, origins.sourceB];
      const toA: DimPoint = vertical ? [at, a] : [a, at], toB: DimPoint = vertical ? [at, b] : [b, at];
      const avoid = [...obstacles, placement.labelBox];
      if (!routed && (dimensionPathCutsBoxes([fromA, toA], avoid) || dimensionPathCutsBoxes([fromB, toB], avoid))) return false;
      let extensionA: DimPoint[], extensionB: DimPoint[];
      try {
        extensionA = routed ? routeDimensionExtension(fromA, toA, avoid, size * 0.12) : [fromA, toA];
        extensionB = routed ? routeDimensionExtension(fromB, toB, avoid, size * 0.12) : [fromB, toB];
      } catch { return false; }
      placed.push({ id, kind, a, b, at, sourceA: origins.sourceA, sourceB: origins.sourceB,
        vertical, size: fontSize, label, ...placement, extensionA, extensionB });
      return true;
    };
    // Try both sides of the object first, keeping nearby dimensions inside the design.
    for (let i = 0; i < 6; i++) for (const origins of starts) {
      if (tryAt(origins.preferred + origins.direction * i * size * 0.65, origins, false)) return;
    }
    // Keep every requested measurement. Crowded details use routed extension lines
    // and an outside track; origins and numeric values remain unchanged.
    for (let i = 0; i < 6; i++) for (const origins of starts) {
      if (tryAt(origins.preferred + origins.direction * i * size * 0.65, origins, true)) return;
    }
    // Reuse compact outside lanes rather than moving every subsequent dim farther away.
    const outside = (vertical ? X : Y) + size * 1.5;
    for (let i = 0; i < 80; i++) if (tryAt(outside + i * size * 1.5, starts[0], true)) return;
    throw new Error(`Không thể đặt dim ${id}`);
  };
  add("overall-width", "overall", 0, X, 0, 0, -size * 2.5, false, size * 1.4, `${dimensionCm(X)} cm`, -1);
  add("overall-height", "overall", 0, Y, 0, 0, -size * 2.5, true, size * 1.4, `${dimensionCm(Y)} cm`, -1);

  if (bar.widthMm > 0) {
    if (bar.isVertical) {
      add("brand-region", "partition", 0, spec.logoSection.widthMm, Y, Y, Y + size * 1.5, false, size * 0.8,
        `${dimensionCm(spec.logoSection.widthMm)} (2/3 X)`);
      add("dealer-region", "partition", spec.dealerSection.positionLeftMm, X, Y, Y, Y + size * 1.5, false, size * 0.8,
        `${dimensionCm(spec.dealerSection.widthMm)} (1/3 X)`);
      add("spectrum-width", "size", bar.positionLeftMm, bar.positionLeftMm + bar.widthMm, 0, 0, -size * 1.2);
    } else {
      const pillar = spec.layoutType === "LAYOUT_09_PILLAR";
      add("brand-region", "partition", 0, bar.positionTopMm, X, X, X + size * 1.6, true, size * 0.8,
        `${dimensionCm(bar.positionTopMm)} (${pillar ? "3/4 Y" : "3/5 Y"})`);
      add("dealer-region", "partition", bar.positionTopMm, Y, X, X, X + size * 1.6, true, size * 0.8,
        `${dimensionCm(Y - bar.positionTopMm)} (${pillar ? "1/4 Y" : "2/5 Y"})`);
      add("spectrum-height", "size", bar.positionTopMm, bar.positionTopMm + bar.heightMm, X, X, X + size * 0.5, true);
    }
  }

  add("logo-left", "position", 0, logo.x, logo.y + logo.height / 2, logo.y + logo.height / 2, logo.y + logo.height / 2);
  add("logo-top", "position", 0, logo.y, logo.x, logo.x, logo.x - size * 0.7, true, size * 0.72, undefined, -1);
  add("logo-width", "size", logo.x, logo.x + logo.width, logo.y, logo.y, logo.y - size * 0.85, false, size * 0.8, undefined, -1,
    { sourceA: logo.y + logo.height, sourceB: logo.y + logo.height, preferred: logo.y + logo.height + size * 0.7, direction: 1 });
  add("logo-height", "size", logo.y, logo.y + logo.height, logo.x, logo.x, logo.x - size * 0.85, true, size * 0.8, undefined, -1,
    { sourceA: logo.x + logo.width, sourceB: logo.x + logo.width, preferred: logo.x + logo.width + size * 0.6, direction: 1 });

  if (drawing.wordmark && !details.length) {
    const mark = drawing.wordmark;
    add("wordmark-width", "size", mark.x, mark.x + mark.width, mark.y, mark.y, mark.y - size * 0.8, false, size * 0.8, undefined, -1);
    add("wordmark-height", "size", mark.y, mark.y + mark.height, mark.x + mark.width, mark.x + mark.width, mark.x + mark.width + size * 0.7, true);
    if (!mark.rotated) add("logo-wordmark", "gap", logo.x + logo.width, mark.x, logo.y + logo.height / 2,
      mark.y + mark.height / 2, logo.y + logo.height / 2);
  }

  const leftMarkers: number[] = [];
  for (const line of lines) {
    const right = line.x + line.width, bottom = line.y + line.height;
    const dealer = ["type", "name", "address", "phone"].includes(line.role);
    if (dealer && !leftMarkers.some(x => Math.abs(x - line.x) < 0.5)) {
      leftMarkers.push(line.x);
      const anchor = bar.isVertical ? bar.positionLeftMm + bar.widthMm : 0;
      add(`${line.id}-left`, "position", anchor, line.x, line.y + line.height / 2, line.y + line.height / 2,
        line.y + line.height / 2, false, size * 0.65);
    } else if (line.role === "brand-0" || line.role === "brand-1") {
      add(`${line.id}-logo-gap`, "gap", logo.x + logo.width, line.x, line.y + line.height / 2, line.y + line.height / 2, line.y + line.height / 2);
    } else if (line.role === "slogan" || line.role === "pillar-brand") {
      add(`${line.id}-left`, "position", 0, line.x, line.y + line.height / 2, line.y + line.height / 2, line.y + line.height / 2);
    }
    // A word chain already gives the width of a multiword name/slogan, avoiding a duplicate overall width.
    const wordChain = ["name", "slogan"].includes(line.role) && line.words.length > 1 && !line.rotated;
    const multiInfo = ["address", "phone", "type"].includes(line.role) && lines.filter(l => l.role === line.role).length > 1;
    if (!wordChain && !multiInfo) add(`${line.id}-width`, "size", line.x, right, line.y, line.y,
      line.y - size * 0.8, false, size * 0.8, undefined, -1,
      { sourceA: bottom, sourceB: bottom, preferred: bottom + size * 0.75, direction: 1 });
    add(`${line.id}-height`, "size", line.y, bottom, right, right, right + size * 0.65, true, size * 0.72, undefined, 1,
      { sourceA: line.x, sourceB: line.x, preferred: line.x - size * 0.65, direction: -1 });
    if (wordChain) {
      line.words.forEach((word, i) => {
        const row = bottom + size * 0.75;
        add(`${line.id}-word-${i}`, "size", word.x, word.x + word.width, word.y + word.height, word.y + word.height, row,
          false, size * 0.72, undefined, 1, { sourceA: word.y, sourceB: word.y, preferred: line.y - size * 0.75, direction: -1 });
        const next = line.words[i + 1];
        if (next) add(`${line.id}-word-gap-${i}`, "gap", word.x + word.width, next.x,
          word.y + word.height, next.y + next.height, row + size * 0.95, false, size * 0.65, undefined, 1,
          { sourceA: word.y, sourceB: next.y, preferred: line.y - size * 0.65, direction: -1 });
      });
    }
    if (line.role === "type" && line.words.length <= 10) line.words.slice(0, -1).forEach((word, i) => {
      const next = line.words[i + 1];
      add(`${line.id}-word-gap-${i}`, "gap", word.x + word.width, next.x,
        word.y + word.height, next.y + next.height, bottom + size * 0.4, false, size * 0.5, undefined, 1,
        { sourceA: word.y, sourceB: next.y, preferred: line.y - size * 0.6, direction: -1 });
    });
    // Brand letter spacing is controlled on the same drawing as the reference.
    if (line.role.startsWith("brand-")) line.glyphs.slice(0, -1).forEach((g, i) => {
      const next = line.glyphs[i + 1];
      add(`${line.id}-letter-gap-${i}`, "gap", g.x + g.width, next.x, g.y + g.height, next.y + next.height,
        bottom + size * 0.4, false, size * 0.5, undefined, 1,
        { sourceA: g.y, sourceB: next.y, preferred: line.y - size * 0.65, direction: -1 });
    });
  }

  const roleGroups = ["brand-0", "brand-1", "slogan", "type", "name", "address", "phone"];
  const groups = roleGroups.map(role => {
    const rows = lines.filter(l => l.role === role);
    return rows.length ? { role, x: Math.min(...rows.map(l => l.x)), right: Math.max(...rows.map(l => l.x + l.width)),
      y: Math.min(...rows.map(l => l.y)), bottom: Math.max(...rows.map(l => l.y + l.height)), rows } : null;
  }).filter(g => g !== null);
  const dealerGroups = groups.filter(g => ["type", "name", "address", "phone"].includes(g.role));
  const brandGroups = groups.filter(g => !dealerGroups.includes(g));
  for (const g of dealerGroups.filter(g => g.rows.length > 1 && ["address", "phone", "type"].includes(g.role))) {
    add(`${g.role}-block-width`, "size", g.x, g.right, g.y, g.y, g.y - size * 0.75, false, size * 0.72, undefined, -1);
  }
  for (const g of groups) for (let i = 1; i < g.rows.length; i++) {
    const previous = g.rows[i - 1], row = g.rows[i];
    add(`${g.role}-row-gap-${i}`, "gap", previous.y + previous.height, row.y,
      previous.x + previous.width, row.x + row.width, g.right + size * 0.7, true);
  }
  const slogan = groups.find(g => g.role === "slogan");
  if (slogan && !["LAYOUT_04_NARROW_HORIZONTAL", "LAYOUT_08_NARROW_BRAND"].includes(spec.layoutType)) {
    add("slogan-bottom", "position", slogan.bottom, spec.logoSection.heightMm, slogan.right, slogan.right,
      slogan.right + size * 0.7, true);
    add("logo-slogan-gap", "gap", logo.y + logo.height, slogan.y, logo.x, slogan.x,
      Math.min(logo.x, slogan.x) - size * 0.7, true, size * 0.72, undefined, -1);
  }
  const pillarMark = details.find(l => l.role === "pillar-brand");
  if (pillarMark) {
    add("pillar-logo-wordmark", "gap", logo.y + logo.height, pillarMark.y, logo.x + logo.width,
      pillarMark.x + pillarMark.width, Math.max(logo.x + logo.width, pillarMark.x + pillarMark.width) + size * 0.6, true);
    add("pillar-wordmark-bottom", "position", pillarMark.y + pillarMark.height, spec.logoSection.heightMm,
      pillarMark.x + pillarMark.width, pillarMark.x + pillarMark.width, pillarMark.x + pillarMark.width + size * 0.6, true);
  }
  for (const group of [brandGroups, dealerGroups]) {
    group.forEach((g, i) => {
      const next = group[i + 1];
      if (next && next.y > g.bottom) add(`${g.role}-${next.role}-vertical-gap`, "gap", g.bottom, next.y,
        g.right, next.right, Math.max(g.right, next.right) + size * 0.7, true);
    });
  }
  if (dealerGroups.length) {
    const first = dealerGroups[0], last = dealerGroups[dealerGroups.length - 1];
    const top = bar.isVertical ? 0 : bar.positionTopMm + bar.heightMm;
    add("dealer-top", "position", top, first.y, first.right, first.right, first.right + size * 0.7, true);
    add("dealer-bottom", "position", last.bottom, Y, last.right, last.right, last.right + size * 0.7, true);
  }
  // The overall dimensions always stay outside the detail lanes.
  const detail = placed.filter(d => d.kind !== "overall");
  for (const dim of placed.filter(d => d.kind === "overall")) {
    const at = Math.min(0, ...detail.map(d => dim.vertical ? d.labelBox.x : d.labelBox.y)) - size * 2;
    const delta = at - dim.at;
    if (dim.vertical) { dim.labelX += delta; dim.labelBox.x += delta; }
    else { dim.labelY += delta; dim.labelBox.y += delta; }
    dim.at = at;
    dim.extensionA = dim.vertical ? [[0, 0], [at, 0]] : [[0, 0], [0, at]];
    dim.extensionB = dim.vertical ? [[0, Y], [at, Y]] : [[X, 0], [X, at]];
  }
  return placed;
}

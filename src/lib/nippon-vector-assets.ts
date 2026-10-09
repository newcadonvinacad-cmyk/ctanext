import type { BrandVectorAsset } from "./nippon-brand-guidelines";

const tags = new Set(["svg", "g", "path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "defs",
  "linearGradient", "radialGradient", "stop", "clipPath"]);
const attributes = new Set(["xmlns", "viewBox", "preserveAspectRatio", "id", "d", "x", "y", "x1", "y1", "x2", "y2",
  "width", "height", "rx", "ry", "cx", "cy", "r", "points", "transform", "fill", "fill-rule", "fill-opacity",
  "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "opacity",
  "clip-path", "clip-rule", "clipPathUnits", "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform",
  "spreadMethod", "fx", "fy", "fr", "color"]);

function checkedSvg(source: string): SVGSVGElement {
  if (source.length > 500_000) throw new Error("SVG tối đa 500 KB");
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg") throw new Error("File SVG không hợp lệ");
  const svg = doc.documentElement as unknown as SVGSVGElement;
  for (const element of [svg, ...svg.querySelectorAll("*")]) {
    if (["title", "desc", "metadata"].includes(element.localName)) { element.remove(); continue; }
    if (!tags.has(element.localName)) throw new Error("SVG chỉ dùng đường nét vector; chuyển chữ thành outline và bỏ ảnh, CSS, liên kết ngoài");
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === "style") {
        for (const rule of attribute.value.split(";").filter(r => r.trim())) {
          const colon = rule.indexOf(":"), key = rule.slice(0, colon).trim(), value = rule.slice(colon + 1).trim();
          if (colon < 0 || !attributes.has(key)) throw new Error("SVG có thuộc tính CSS chưa hỗ trợ");
          element.setAttribute(key, value);
        }
        element.removeAttribute("style");
      }
    }
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === "xmlns" && attribute.value === "http://www.w3.org/2000/svg") continue;
      if (!attributes.has(attribute.name) || /(?:javascript:|data:|https?:|@import)/i.test(attribute.value)
        || (/url\s*\(/i.test(attribute.value) && !/^url\(#[\w.-]+\)$/.test(attribute.value)))
        throw new Error("SVG có liên kết ngoài hoặc thuộc tính chưa hỗ trợ");
    }
  }
  if (!svg.querySelector("path,rect,circle,ellipse,polygon,polyline,line")) throw new Error("SVG không có đường nét");
  return svg;
}

// Recheck persisted assets as well as uploads before they enter the SVG DOM.
export function safeVectorContent(content: string): string {
  try { return checkedSvg(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`).innerHTML; }
  catch { return ""; }
}

export async function readBrandVector(file: File): Promise<BrandVectorAsset> {
  if (file.size > 500_000) throw new Error("SVG tối đa 500 KB");
  const svg = checkedSvg(await file.text());
  // Prefix local paint/clip IDs to keep independently uploaded logos self-contained.
  const prefix = `brand-${crypto.randomUUID()}-`;
  const ids = new Map<string, string>();
  svg.querySelectorAll("[id]").forEach(e => { const id = e.id; ids.set(id, prefix + id); e.id = prefix + id; });
  svg.querySelectorAll("*").forEach(e => Array.from(e.attributes).forEach(a => {
    const match = a.value.match(/^url\(#([\w.-]+)\)$/);
    if (match) { if (!ids.has(match[1])) throw new Error("SVG có tham chiếu màu không tồn tại"); e.setAttribute(a.name, `url(#${ids.get(match[1])})`); }
  }));
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";
  // Retain root transforms and presentation attributes inside the measured group.
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  for (const attr of Array.from(svg.attributes)) if (!["xmlns", "viewBox", "width", "height", "preserveAspectRatio"].includes(attr.name)) group.setAttribute(attr.name, attr.value);
  while (svg.firstChild) group.appendChild(svg.firstChild);
  svg.appendChild(group); host.appendChild(svg); document.body.appendChild(host);
  try {
    const bounds = group.getBBox();
    const strokePadding = Math.max(0, ...Array.from(group.querySelectorAll("[stroke]")).map(e => {
      if (e.getAttribute("stroke") === "none") return 0;
      return Number(e.getAttribute("stroke-width") || 1) / 2;
    }));
    const width = bounds.width + strokePadding * 2, height = bounds.height + strokePadding * 2;
    if (![bounds.x, bounds.y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error("Không đo được đường nét SVG");
    const content = `<g transform="translate(${-bounds.x + strokePadding} ${-bounds.y + strokePadding})">${group.outerHTML}</g>`;
    return { content, width, height, label: file.name };
  } finally { host.remove(); }
}

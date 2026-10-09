import type { DrawingBox } from "./nippon-shop-drawing";

export type DimPoint = [number, number];
const EPS = 0.15;
export function dimensionSegmentCutsBox(a: DimPoint, b: DimPoint, box: DrawingBox): boolean {
  if (Math.abs(a[0] - b[0]) < EPS) return a[0] > box.x + EPS && a[0] < box.x + box.width - EPS
    && Math.min(a[1], b[1]) < box.y + box.height - EPS && Math.max(a[1], b[1]) > box.y + EPS;
  return a[1] > box.y + EPS && a[1] < box.y + box.height - EPS
    && Math.min(a[0], b[0]) < box.x + box.width - EPS && Math.max(a[0], b[0]) > box.x + EPS;
}
export function dimensionPathCutsBoxes(points: DimPoint[], boxes: DrawingBox[]): boolean {
  return points.slice(1).some((p, i) => boxes.some(box => dimensionSegmentCutsBox(points[i], p, box)));
}
const compact = (points: DimPoint[]): DimPoint[] => {
  const result: DimPoint[] = [];
  for (const p of points) {
    if (result.length && Math.abs(result[result.length - 1][0] - p[0]) + Math.abs(result[result.length - 1][1] - p[1]) < EPS) continue;
    if (result.length > 1) {
      const a = result[result.length - 2], b = result[result.length - 1];
      if ((a[0] === b[0] && b[0] === p[0]) || (a[1] === b[1] && b[1] === p[1])) result.pop();
    }
    result.push(p);
  }
  return result;
};

/** Keep extension origins on the measured edges. Route crowded extensions through
 * free corridors instead of dropping the measurement or drawing through letters.
 */
export function routeDimensionExtension(start: DimPoint, end: DimPoint, boxes: DrawingBox[], clearance: number): DimPoint[] {
  if (!dimensionPathCutsBoxes([start, end], boxes)) return [start, end];
  const vertical = Math.abs(start[0] - end[0]) < EPS;
  const swap = (p: DimPoint): DimPoint => vertical ? p : [p[1], p[0]];
  const s = swap(start), t = swap(end);
  const obstacles = vertical ? boxes : boxes.map(b => ({ x: b.y, y: b.x, width: b.height, height: b.width }));
  const xs = [s[0] - clearance, s[0] + clearance,
    Math.min(s[0], t[0], ...obstacles.map(b => b.x)) - clearance,
    Math.max(s[0], t[0], ...obstacles.map(b => b.x + b.width)) + clearance];
  const escapes = [s[1], s[1] - clearance, s[1] + clearance];
  for (const b of obstacles) {
    if (s[0] >= b.x - clearance && s[0] <= b.x + b.width + clearance) {
      xs.push(b.x - clearance, b.x + b.width + clearance);
      escapes.push(b.y - clearance, b.y + b.height + clearance);
    }
  }
  const lanes = [...new Set(xs)].sort((a, b) => Math.abs(a - s[0]) - Math.abs(b - s[0])).slice(0, 24);
  const ys = [...new Set(escapes)].sort((a, b) => Math.abs(a - s[1]) - Math.abs(b - s[1])).slice(0, 16);
  let best: DimPoint[] | undefined, distance = Infinity;
  for (const y of ys) for (const x of lanes) {
    const points = compact([s, [s[0], y], [x, y], [x, t[1]], t]);
    const length = points.slice(1).reduce((n, p, i) => n + Math.abs(p[0] - points[i][0]) + Math.abs(p[1] - points[i][1]), 0);
    if (length >= distance || dimensionPathCutsBoxes(points, obstacles)) continue;
    best = points; distance = length;
  }
  if (best) return best.map(swap);

  // Unusual multiline layouts can need several turns. A rectilinear visibility
  // grid supplies a complete route around the source outlines and label boxes.
  const gridX = [...new Set([start[0], end[0], ...boxes.flatMap(b => [b.x - clearance, b.x, b.x + b.width, b.x + b.width + clearance])])].sort((a, b) => a - b);
  const gridY = [...new Set([start[1], end[1], ...boxes.flatMap(b => [b.y - clearance, b.y, b.y + b.height, b.y + b.height + clearance])])].sort((a, b) => a - b);
  const nx = gridX.length, begin = gridY.indexOf(start[1]) * nx + gridX.indexOf(start[0]);
  const goal = gridY.indexOf(end[1]) * nx + gridX.indexOf(end[0]);
  const point = (id: number): DimPoint => [gridX[id % nx], gridY[Math.floor(id / nx)]];
  const costs = new Map<number, number>([[begin, 0]]), parent = new Map<number, number>();
  const heap: Array<{ id: number; score: number; cost: number }> = [];
  const push = (item: typeof heap[number]) => {
    heap.push(item); let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p].score <= item.score) break; heap[i] = heap[p]; i = p; }
    heap[i] = item;
  };
  const pop = () => {
    const first = heap[0], last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
        if (heap[child].score >= last.score) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
    }
    return first;
  };
  push({ id: begin, cost: 0, score: Math.abs(start[0] - end[0]) + Math.abs(start[1] - end[1]) });
  while (heap.length) {
    const current = pop();
    if (current.cost !== costs.get(current.id)) continue;
    if (current.id === goal) {
      const result = [end]; let id = goal;
      while (id !== begin) { id = parent.get(id)!; result.push(point(id)); }
      return compact(result.reverse());
    }
    const x = current.id % nx, y = Math.floor(current.id / nx), a = point(current.id);
    const neighbors = [x > 0 ? current.id - 1 : -1, x + 1 < nx ? current.id + 1 : -1,
      y > 0 ? current.id - nx : -1, y + 1 < gridY.length ? current.id + nx : -1];
    for (const id of neighbors) {
      if (id < 0) continue;
      const b = point(id);
      if (dimensionPathCutsBoxes([a, b], boxes)) continue;
      const cost = current.cost + Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
      if (cost >= (costs.get(id) ?? Infinity)) continue;
      costs.set(id, cost); parent.set(id, current.id);
      push({ id, cost, score: cost + Math.abs(b[0] - end[0]) + Math.abs(b[1] - end[1]) });
    }
  }
  throw new Error("Không tìm được đường dóng cho kích thước");
}

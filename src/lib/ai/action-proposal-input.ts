/** Require an explicit progress value; incomplete/negated reports cannot turn
 * into guessed 80% or 100% updates. Vietnamese decimal commas are supported.
 */
export function parseProgressPercent(text: string): number {
  const explicit = [...text.matchAll(/(?<![\d.,])([+-]?\d+(?:[.,]\d+)?)\s*%/g)].map(m => m[1]);
  const raw = explicit.length ? explicit : [...text.matchAll(/(?:tiến độ|lên|đạt|mức)\s*([+-]?\d+(?:[.,]\d+)?)/gi)].map(m => m[1]);
  if (raw.length) {
    const values = [...new Set(raw.map(v => Number(v.replace(",", "."))))];
    if (values.some(v => !Number.isFinite(v) || v < 0 || v > 100)) throw new Error("Tiến độ phải nằm trong khoảng 0–100%");
    if (values.length !== 1) throw new Error("Có nhiều mức tiến độ trong báo cáo; vui lòng chỉ rõ mức muốn cập nhật");
    return values[0];
  }
  const completed = /(hoàn thành|làm xong|xong rồi)/i.test(text);
  const negated = /(chưa|không|chẳng)[^.!?\n]{0,30}(hoàn thành|làm xong|xong rồi)/i.test(text);
  if (completed && !negated) return 100;
  throw new Error("Vui lòng cung cấp tiến độ phần trăm trước khi tạo bản nháp nhật trình");
}

export function mentionsEntity(text: string, value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const escaped = value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}_-])${escaped}($|[^\\p{L}\\p{N}_-])`, "iu").test(text);
}

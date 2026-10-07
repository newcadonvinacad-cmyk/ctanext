/**
 * Các giai đoạn mẫu gợi ý chuẩn ngành biển hiệu quảng cáo
 * Người dùng hoàn toàn có thể thêm, bớt, sửa tên hoặc thay đổi thứ tự theo nhu cầu dự án.
 */
export const SUGGESTED_SIGNAGE_STAGES = [
  "Giai đoạn 1: Khảo sát hiện trường & Đo đạc",
  "Giai đoạn 2: Thiết kế 2D/3D & Duyệt market",
  "Giai đoạn 3: Gia công sản xuất tại xưởng",
  "Giai đoạn 4: Vận chuyển & Điều xe",
  "Giai đoạn 5: Thi công lắp dựng hiện trường",
  "Giai đoạn 6: Nghiệm thu & Bàn giao",
  "Giai đoạn 7: Bảo hành & Bảo trì định kỳ (Tùy chọn)",
] as const;

export const STANDARD_SIGNAGE_STAGES = SUGGESTED_SIGNAGE_STAGES;
export type StandardSignageStageName = string;

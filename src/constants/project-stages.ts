/**
 * 6 Giai đoạn chuẩn ngành biển hiệu quảng cáo (Cố định, bất biến)
 * Áp dụng thống nhất cho toàn bộ hệ thống Dự án 360°
 */
export const STANDARD_SIGNAGE_STAGES = [
  "Giai đoạn 1: Khảo sát hiện trường",
  "Giai đoạn 2: Gia công sản xuất tại xưởng",
  "Giai đoạn 3: Vận chuyển & Điều xe",
  "Giai đoạn 4: Thi công lắp dựng hiện trường",
  "Giai đoạn 5: Nghiệm thu & Bàn giao",
  "Giai đoạn 6: Bảo hành & Xử lý sự cố",
] as const;

export type StandardSignageStageName = (typeof STANDARD_SIGNAGE_STAGES)[number];

-- ====================================================================
-- MIGRATION 015: HRM SALARY POLICIES, TEMPLATES & ATTENDANCE EXTENSION
-- ====================================================================

-- 1. Thêm cột policy (jsonb) và template_code vào erp.salary_terms nếu chưa có
ALTER TABLE erp.salary_terms
ADD COLUMN IF NOT EXISTS policy jsonb NOT NULL DEFAULT '{
  "loai": "Tháng",
  "muc_luong": 10000000,
  "cong_chuan": 26,
  "tong_phep": 12,
  "ngay_onboard": "2026-10-01",
  "luong_gio_mac_dinh": 0,
  "luong_theo_ca": {},
  "he_so_ot": 150,
  "he_so_ot_t7": 150,
  "he_so_ot_cn": 200,
  "he_so_le": 300,
  "thuong_bat": false,
  "thuong": [],
  "phu_cap_bat": false,
  "phu_cap": [],
  "phat_bat": false,
  "phat_muon": 0,
  "phat_quen_cham": 0,
  "luong_bhxh": 0,
  "ptram_bhxh": 10.5
}';

ALTER TABLE erp.salary_terms
ADD COLUMN IF NOT EXISTS template_code text;

-- 2. Bảng Mẫu Chính Sách Lương (Salary Policy Templates)
CREATE TABLE IF NOT EXISTS erp.salary_policy_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  target_group text NOT NULL DEFAULT 'all', -- 'office', 'workshop', 'field', 'part_time'
  policy jsonb NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Index tra cứu nhanh
CREATE INDEX IF NOT EXISTS idx_salary_policy_templates_org ON erp.salary_policy_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_entries_emp_date ON erp.attendance_entries(organization_id, employee_id, work_date);

-- RLS
ALTER TABLE erp.salary_policy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.salary_policy_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.salary_policy_templates;
CREATE POLICY organization_isolation ON erp.salary_policy_templates
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);


-- 3. Nạp sẵn 4 mẫu chính sách phổ biến trong doanh nghiệp Quảng Cáo & Nội Thất
INSERT INTO erp.salary_policy_templates (organization_id, code, name, description, target_group, policy, is_default)
SELECT 
  o.id,
  'TEMPLATE_OFFICE',
  'Khối Văn Phòng & Hành Chính',
  'Áp dụng cho Kế toán, Thiết kế đồ họa, Nhân sự, Hành chính. Lương tháng chuẩn 26 ngày, phụ cấp ăn trưa 730k, thưởng chuyên cần, trích đóng BHXH.',
  'office',
  '{
    "loai": "Tháng",
    "muc_luong": 12000000,
    "cong_chuan": 26,
    "tong_phep": 12,
    "ngay_onboard": "2026-01-01",
    "luong_gio_mac_dinh": 57692,
    "luong_theo_ca": {"hanh_chinh": 461538},
    "he_so_ot": 150,
    "he_so_ot_t7": 150,
    "he_so_ot_cn": 200,
    "he_so_le": 300,
    "thuong_bat": true,
    "thuong": [
      {"ten": "Thưởng chuyên cần (đủ 26 công, không đi muộn)", "so_tien": 500000, "tu_dong": true},
      {"ten": "Thưởng năng suất hoàn thành KPI", "so_tien": 1000000, "tu_dong": false}
    ],
    "phu_cap_bat": true,
    "phu_cap": [
      {"ten": "Tiền ăn trưa", "so_tien": 730000, "mien_thue": true},
      {"ten": "Phụ cấp điện thoại & liên lạc", "so_tien": 300000, "mien_thue": false}
    ],
    "phat_bat": true,
    "phat_muon": 50000,
    "phat_quen_cham": 50000,
    "luong_bhxh": 5500000,
    "ptram_bhxh": 10.5
  }'::jsonb,
  true
FROM erp.organizations o
WHERE o.code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.salary_policy_templates (organization_id, code, name, description, target_group, policy, is_default)
SELECT 
  o.id,
  'TEMPLATE_WORKSHOP',
  'Khối Xưởng Cơ Khí & In Ấn Quảng Cáo',
  'Áp dụng cho Thợ hàn, Thợ uốn chữ mica, Thợ in bạt UV, Thợ cắt laser CNC. Có phụ cấp độc hại, OT T7 & CN cao, kiểm soát giờ ca nghiêm ngặt.',
  'workshop',
  '{
    "loai": "Tháng",
    "muc_luong": 11000000,
    "cong_chuan": 26,
    "tong_phep": 12,
    "ngay_onboard": "2026-01-01",
    "luong_gio_mac_dinh": 52885,
    "luong_theo_ca": {"ca_ngay": 423077, "ca_dem": 550000},
    "he_so_ot": 150,
    "he_so_ot_t7": 150,
    "he_so_ot_cn": 200,
    "he_so_le": 300,
    "thuong_bat": true,
    "thuong": [
      {"ten": "Thưởng sản lượng xưởng hoàn thành vượt định mức", "so_tien": 1500000, "tu_dong": false}
    ],
    "phu_cap_bat": true,
    "phu_cap": [
      {"ten": "Phụ cấp độc hại nghề xưởng (bụi sơn, khói hàn)", "so_tien": 1000000, "mien_thue": true},
      {"ten": "Tiền ăn trưa / ca", "so_tien": 730000, "mien_thue": true}
    ],
    "phat_bat": true,
    "phat_muon": 50000,
    "phat_quen_cham": 50000,
    "luong_bhxh": 5000000,
    "ptram_bhxh": 10.5
  }'::jsonb,
  false
FROM erp.organizations o
WHERE o.code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.salary_policy_templates (organization_id, code, name, description, target_group, policy, is_default)
SELECT 
  o.id,
  'TEMPLATE_FIELD',
  'Khối Kỹ Thuật Lắp Đặt Hiện Trường & Lái Xe',
  'Áp dụng cho Thợ thi công leo cao, Đội trưởng lắp biển tấm lớn, Lái xe cẩu tự hành. Có phụ cấp công trình xa, phụ cấp trách nhiệm xe, tính OT lũy kế theo giờ thực tế.',
  'field',
  '{
    "loai": "Tháng",
    "muc_luong": 14000000,
    "cong_chuan": 26,
    "tong_phep": 12,
    "ngay_onboard": "2026-01-01",
    "luong_gio_mac_dinh": 67308,
    "luong_theo_ca": {"lap_dat_tieu_chuan": 538462},
    "he_so_ot": 150,
    "he_so_ot_t7": 150,
    "he_so_ot_cn": 200,
    "he_so_le": 300,
    "thuong_bat": true,
    "thuong": [
      {"ten": "Thưởng bàn giao công trình đúng / vượt tiến độ", "so_tien": 2000000, "tu_dong": false}
    ],
    "phu_cap_bat": true,
    "phu_cap": [
      {"ten": "Phụ cấp công trình xa / leo cao nguy hiểm", "so_tien": 2000000, "mien_thue": true},
      {"ten": "Hỗ trợ lưu trú & ăn uống hiện trường", "so_tien": 1000000, "mien_thue": true}
    ],
    "phat_bat": true,
    "phat_muon": 50000,
    "phat_quen_cham": 100000,
    "luong_bhxh": 6000000,
    "ptram_bhxh": 10.5
  }'::jsonb,
  false
FROM erp.organizations o
WHERE o.code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.salary_policy_templates (organization_id, code, name, description, target_group, policy, is_default)
SELECT 
  o.id,
  'TEMPLATE_PART_TIME',
  'Khối Thời Vụ / Thực Tập Sinh / Khoán Giờ',
  'Áp dụng cho CTV bán thời gian, Thợ thời vụ tăng cường mùa vụ cao điểm. Tính trực tiếp theo giờ làm việc thực tế, không trừ BHXH.',
  'part_time',
  '{
    "loai": "Giờ",
    "muc_luong": 0,
    "cong_chuan": 26,
    "tong_phep": 0,
    "ngay_onboard": "2026-01-01",
    "luong_gio_mac_dinh": 35000,
    "luong_theo_ca": {"ca_4h": 140000, "ca_8h": 280000},
    "he_so_ot": 120,
    "he_so_ot_t7": 120,
    "he_so_ot_cn": 150,
    "he_so_le": 200,
    "thuong_bat": false,
    "thuong": [],
    "phu_cap_bat": true,
    "phu_cap": [
      {"ten": "Hỗ trợ cơm ca thực tế", "so_tien": 30000, "mien_thue": true}
    ],
    "phat_bat": true,
    "phat_muon": 20000,
    "phat_quen_cham": 30000,
    "luong_bhxh": 0,
    "ptram_bhxh": 0
  }'::jsonb,
  false
FROM erp.organizations o
WHERE o.code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

-- 4. Đồng bộ dữ liệu mẫu ban đầu cho các bản ghi salary_terms hiện có
UPDATE erp.salary_terms st
SET policy = jsonb_build_object(
  'loai', 'Tháng',
  'muc_luong', st.base_salary,
  'cong_chuan', 26,
  'tong_phep', 12,
  'ngay_onboard', '2026-01-01',
  'luong_gio_mac_dinh', ROUND(st.base_salary / (26 * 8)),
  'luong_theo_ca', jsonb_build_object('ca_hanh_chinh', ROUND(st.base_salary / 26)),
  'he_so_ot', 150,
  'he_so_ot_t7', 150,
  'he_so_ot_cn', 200,
  'he_so_le', 300,
  'thuong_bat', true,
  'thuong', jsonb_build_array(jsonb_build_object('ten', 'Thưởng chuyên cần', 'so_tien', 500000, 'tu_dong', true)),
  'phu_cap_bat', true,
  'phu_cap', jsonb_build_array(
    jsonb_build_object('ten', 'Ăn trưa', 'so_tien', 730000, 'mien_thue', true),
    jsonb_build_object('ten', 'Phụ cấp vị trí', 'so_tien', COALESCE((st.allowances->>'responsibility')::numeric, (st.allowances->>'site')::numeric, 1000000), 'mien_thue', false)
  ),
  'phat_bat', true,
  'phat_muon', 50000,
  'phat_quen_cham', 50000,
  'luong_bhxh', 5500000,
  'ptram_bhxh', 10.5
)
WHERE policy IS NULL OR policy = '{}'::jsonb;

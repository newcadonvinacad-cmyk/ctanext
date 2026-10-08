-- Migration 016: HRM Shifts, Holidays, and Leave Policies
CREATE TABLE IF NOT EXISTS erp.work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'split', 'overnight', 'parttime')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes integer NOT NULL DEFAULT 60,
  work_hours numeric(4,2) NOT NULL DEFAULT 8.0,
  split_start_time time,
  split_end_time time,
  night_multiplier numeric(5,2) NOT NULL DEFAULT 130,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS erp.holiday_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  multiplier numeric(5,2) NOT NULL DEFAULT 300,
  is_paid boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS erp.leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  standard_days integer NOT NULL DEFAULT 12,
  seniority_bonus_years integer NOT NULL DEFAULT 5,
  carryover_max_days integer NOT NULL DEFAULT 5,
  cash_out_allowed boolean NOT NULL DEFAULT true,
  pay_basis_types jsonb NOT NULL DEFAULT '["monthly", "daily", "hourly", "shift"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Seed Ca làm việc mẫu (Chuẩn, Ca Kíp Xưởng, Ca Ghép, Ca Bán Thời Gian)
INSERT INTO erp.work_shifts (organization_id, code, name, type, start_time, end_time, break_minutes, work_hours, night_multiplier, is_default)
SELECT id, 'SHIFT_OFFICE', 'Ca Hành Chính Văn Phòng (Chuẩn)', 'standard', '08:00', '17:30', 90, 8.0, 130, true
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.work_shifts (organization_id, code, name, type, start_time, end_time, break_minutes, work_hours, night_multiplier, is_default)
SELECT id, 'SHIFT_WORKSHOP_MORNING', 'Ca Kíp Sáng Xưởng In & Cơ Khí', 'standard', '06:00', '14:00', 0, 8.0, 130, false
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.work_shifts (organization_id, code, name, type, start_time, end_time, break_minutes, work_hours, night_multiplier, is_default)
SELECT id, 'SHIFT_WORKSHOP_AFTERNOON', 'Ca Kíp Chiều Xưởng In & Cơ Khí', 'standard', '14:00', '22:00', 0, 8.0, 130, false
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.work_shifts (organization_id, code, name, type, start_time, end_time, break_minutes, work_hours, night_multiplier, is_default)
SELECT id, 'SHIFT_WORKSHOP_NIGHT', 'Ca Đêm Xưởng Gia Công & Lắp Biển', 'overnight', '22:00', '06:00', 0, 8.0, 150, false
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.work_shifts (organization_id, code, name, type, start_time, end_time, break_minutes, work_hours, split_start_time, split_end_time, night_multiplier, is_default)
SELECT id, 'SHIFT_SPLIT_2', 'Ca Ghép 2 Buổi (Ca Gãy Thi Công)', 'split', '08:00', '12:00', 0, 8.0, '16:00', '20:00', 130, false
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.work_shifts (organization_id, code, name, type, start_time, end_time, break_minutes, work_hours, night_multiplier, is_default)
SELECT id, 'SHIFT_PARTTIME', 'Ca Bán Thời Gian (Sinh viên / Thời vụ)', 'parttime', '08:00', '12:00', 0, 4.0, 130, false
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

-- Seed Ngày nghỉ lễ năm 2026 theo Luật Lao Động Việt Nam
INSERT INTO erp.holiday_configs (organization_id, code, name, start_date, end_date, multiplier, is_paid, note)
SELECT id, 'HOLIDAY_TET_DUONG_2026', 'Tết Dương Lịch 2026', '2026-01-01', '2026-01-01', 300, true, 'Nghỉ 1 ngày hưởng nguyên lương'
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.holiday_configs (organization_id, code, name, start_date, end_date, multiplier, is_paid, note)
SELECT id, 'HOLIDAY_TET_AM_2026', 'Tết Nguyên Đán Bính Ngọ 2026', '2026-02-14', '2026-02-22', 300, true, 'Nghỉ Tết 9 ngày theo quy định'
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.holiday_configs (organization_id, code, name, start_date, end_date, multiplier, is_paid, note)
SELECT id, 'HOLIDAY_GIO_TO_2026', 'Giỗ Tổ Hùng Vương (10/3 ÂL)', '2026-04-26', '2026-04-26', 300, true, 'Nghỉ 1 ngày'
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.holiday_configs (organization_id, code, name, start_date, end_date, multiplier, is_paid, note)
SELECT id, 'HOLIDAY_30_4_1_5_2026', 'Ngày Chiến Thắng 30/4 & Quốc Tế Lao Động 1/5', '2026-04-30', '2026-05-01', 300, true, 'Nghỉ lễ 2 ngày'
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO erp.holiday_configs (organization_id, code, name, start_date, end_date, multiplier, is_paid, note)
SELECT id, 'HOLIDAY_QUOC_KHANH_2026', 'Quốc Khánh 2/9/2026', '2026-09-01', '2026-09-02', 300, true, 'Nghỉ 2 ngày'
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id, code) DO NOTHING;

-- Seed Chính sách phép năm
INSERT INTO erp.leave_policies (organization_id, standard_days, seniority_bonus_years, carryover_max_days, cash_out_allowed)
SELECT id, 12, 5, 5, true
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT (organization_id) DO NOTHING;

-- RLS policies
ALTER TABLE erp.work_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.work_shifts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.work_shifts;
CREATE POLICY organization_isolation ON erp.work_shifts
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE erp.holiday_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.holiday_configs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.holiday_configs;
CREATE POLICY organization_isolation ON erp.holiday_configs
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE erp.leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.leave_policies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.leave_policies;
CREATE POLICY organization_isolation ON erp.leave_policies
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);


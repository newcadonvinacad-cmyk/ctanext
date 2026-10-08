-- Migration 017: HRM GPS Locations & Employee Request Workflow (Nghỉ phép, Tăng ca OT, Giải trình công)
-- Bảng erp.hrm_work_locations: Quản lý các điểm làm việc & bán kính GPS hợp lệ
CREATE TABLE IF NOT EXISTS erp.hrm_work_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  name text NOT NULL,
  address text,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  radius_meters integer NOT NULL DEFAULT 150,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bảng erp.hrm_requests: Quản lý 3 loại đơn từ nghiệp vụ
-- type: 'leave' (xin nghỉ phép), 'overtime' (xin làm thêm giờ OT), 'explanation' (giải trình đi muộn/về sớm/quên check-in)
-- status: 'pending' (chờ duyệt), 'approved' (đã duyệt), 'rejected' (từ chối)
CREATE TABLE IF NOT EXISTS erp.hrm_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  employee_id uuid NOT NULL REFERENCES erp.employees(id),
  type text NOT NULL CHECK (type IN ('leave', 'overtime', 'explanation')),
  title text NOT NULL,
  reason text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  duration_hours numeric(5, 2) DEFAULT 0,
  leave_category text, -- 'annual_paid', 'unpaid', 'sick', 'special'
  image_url text, -- ảnh minh chứng/đơn/hiện trường
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approver_id text, -- user_id người duyệt
  approver_name text,
  approver_note text,
  approved_at timestamptz,
  payroll_applied boolean NOT NULL DEFAULT false,
  payroll_fine_adjustment numeric(15, 2) DEFAULT 0, -- giảm trừ tiền phạt (khi giải trình được duyệt)
  payroll_ot_hours numeric(5, 2) DEFAULT 0, -- cộng giờ OT vào bảng lương
  payroll_leave_days numeric(5, 2) DEFAULT 0, -- số ngày nghỉ trừ vào phép năm hoặc tính nghỉ không lương
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed Điểm làm việc mặc định: Trụ sở văn phòng & Xưởng sản xuất Signage
INSERT INTO erp.hrm_work_locations (organization_id, name, address, latitude, longitude, radius_meters, is_active, is_default, note)
SELECT id, 'Văn Phòng & Xưởng Sản Xuất Chính', 'Tòa nhà Điều hành & Nhà xưởng Quảng Cáo', 10.7768890, 106.7008060, 200, true, true, 'Văn phòng trụ sở và nhà máy sản xuất'
FROM erp.organizations WHERE code = 'SIGNAGE'
ON CONFLICT DO NOTHING;

-- RLS Security
ALTER TABLE erp.hrm_work_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.hrm_work_locations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.hrm_work_locations;
CREATE POLICY organization_isolation ON erp.hrm_work_locations
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE erp.hrm_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.hrm_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.hrm_requests;
CREATE POLICY organization_isolation ON erp.hrm_requests
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

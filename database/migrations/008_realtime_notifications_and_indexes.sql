CREATE TABLE IF NOT EXISTS erp.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  user_id text NOT NULL REFERENCES public."user"(id),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- 'info' | 'success' | 'warning' | 'error' | 'task' | 'project' | 'approval'
  link text, -- đường dẫn chuyển trang: /du-an/[id] hoặc /cong-viec
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- Chỉ mục truy vấn thông báo chưa đọc theo người dùng siêu tốc
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON erp.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_org_created 
  ON erp.notifications (organization_id, created_at DESC);

-- 2. CÁC CHỈ MỤC TỐI ƯU HÓA HIỆU NĂNG CHO NHIỀU NGƯỜI TRUY CẬP ĐỒNG THỜI
CREATE INDEX IF NOT EXISTS idx_projects_org_status_created 
  ON erp.projects (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_project_parent 
  ON erp.tasks (project_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_task_assignees_lookup 
  ON erp.task_assignees (task_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_work_reports_task_date 
  ON erp.work_reports (task_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_memberships_user_org 
  ON erp.memberships (user_id, organization_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_membership 
  ON erp.employees (membership_id) WHERE is_active = true;

-- 3. BỔ SUNG NGHIỆP VỤ BẢO HÀNH & BẢO TRÌ BIỂN QUẢNG CÁO (WARRANTY)
ALTER TABLE erp.projects ADD COLUMN IF NOT EXISTS warranty_months integer DEFAULT 12;
ALTER TABLE erp.projects ADD COLUMN IF NOT EXISTS warranty_until date;
ALTER TABLE erp.projects ADD COLUMN IF NOT EXISTS maintenance_notes text;

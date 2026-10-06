BEGIN;

-- 1. Index cho erp.memberships (Tăng tốc kiểm tra quyền và xác thực người dùng)
CREATE INDEX IF NOT EXISTS idx_memberships_user_id 
  ON erp.memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_org_status 
  ON erp.memberships(organization_id, status);

-- 2. Index cho erp.projects (Tăng tốc tải danh sách dự án, sắp xếp ngày tạo và lọc khách hàng/quản lý)
CREATE INDEX IF NOT EXISTS idx_projects_org_created 
  ON erp.projects(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_customer_id 
  ON erp.projects(customer_id);

CREATE INDEX IF NOT EXISTS idx_projects_manager_membership 
  ON erp.projects(manager_membership_id);

-- 3. Index cho erp.tasks (Tăng tốc WBS, Kanban và thống kê tiến độ)
CREATE INDEX IF NOT EXISTS idx_tasks_org_status 
  ON erp.tasks(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_project_created 
  ON erp.tasks(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_parent_created 
  ON erp.tasks(parent_id, created_at ASC) 
  WHERE parent_id IS NOT NULL;

-- 4. Index cho erp.task_assignees (Tăng tốc nạp danh sách thợ phân công công việc)
CREATE INDEX IF NOT EXISTS idx_task_assignees_employee 
  ON erp.task_assignees(employee_id) 
  WHERE valid_to IS NULL;

-- 5. Index cho erp.items và cấu hình kho (Tăng tốc tra cứu vật tư, bảng tồn kho và LATERAL subquery)
CREATE INDEX IF NOT EXISTS idx_items_org_code 
  ON erp.items(organization_id, code);

CREATE INDEX IF NOT EXISTS idx_items_org_category 
  ON erp.items(organization_id, category_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_item_settings_item 
  ON erp.warehouse_item_settings(organization_id, item_id);

-- 6. Index cho erp.project_members (Tăng tốc kiểm tra quyền phụ trách công trình)
CREATE INDEX IF NOT EXISTS idx_project_members_proj_mem 
  ON erp.project_members(project_id, membership_id) 
  WHERE valid_to IS NULL;

-- 7. Cập nhật thống kê bộ tối ưu truy vấn PostgreSQL (Cost-based optimizer statistics)
ANALYZE erp.memberships;
ANALYZE erp.projects;
ANALYZE erp.tasks;
ANALYZE erp.task_assignees;
ANALYZE erp.items;
ANALYZE erp.stock_balances;
ANALYZE erp.warehouse_item_settings;
ANALYZE erp.project_members;
ANALYZE iam.user_roles;
ANALYZE iam.role_grants;

COMMIT;

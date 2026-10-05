-- Migration 007: Thêm trường công việc hiện trường (is_field) và thời gian thực hiện (start_at)
ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS is_field boolean NOT NULL DEFAULT false;
ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS start_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_tasks_field ON erp.tasks(organization_id, is_field, due_at);

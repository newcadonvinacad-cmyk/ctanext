ALTER TABLE erp.tasks
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS safety_checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photo_evidence jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS materials_quota jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS piece_rate_type text DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS piece_rate_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS piece_rate_unit text DEFAULT '',
  ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Tạo chỉ mục tìm kiếm theo category
CREATE INDEX IF NOT EXISTS idx_tasks_category ON erp.tasks(organization_id, category);

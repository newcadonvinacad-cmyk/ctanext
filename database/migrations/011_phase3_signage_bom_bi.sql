CREATE TABLE IF NOT EXISTS erp.project_boms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  title text NOT NULL,
  project_id uuid REFERENCES erp.projects(id),
  quotation_id uuid REFERENCES erp.quotations(id),
  signage_type text NOT NULL DEFAULT 'alu_letters' CHECK (signage_type IN (
    'alu_letters', 'lightbox_3m', 'led_matrix', 'pylon_sign', 'neon_sign', 'canvas_hiflex', 'other'
  )),
  width_meters numeric(10,2) NOT NULL DEFAULT 1.0,
  height_meters numeric(10,2) NOT NULL DEFAULT 1.0,
  depth_meters numeric(10,2) NOT NULL DEFAULT 0.1,
  area_sqm numeric(10,2) GENERATED ALWAYS AS (width_meters * height_meters) STORED,

  -- Thông số khung sắt
  iron_box_type text NOT NULL DEFAULT 'Hộp mạ kẽm 25x25x1.4mm',
  grid_spacing_cm integer NOT NULL DEFAULT 40,
  calculated_steel_meters numeric(10,2) DEFAULT 0,
  calculated_steel_bars numeric(10,2) DEFAULT 0,

  -- Thông số mặt dựng Alu
  alu_sheet_size text NOT NULL DEFAULT '1.22m x 2.44m (2.977 m²)',
  alu_margin_cm integer NOT NULL DEFAULT 8,
  alu_scrap_rate numeric(5,2) NOT NULL DEFAULT 10.0,
  calculated_alu_sheets numeric(10,2) DEFAULT 0,

  -- Thông số LED & Nguồn
  led_type text NOT NULL DEFAULT 'Module LED 3 mắt Hàn Quốc 12V 1.2W',
  led_density_per_m2 integer NOT NULL DEFAULT 80,
  led_watts_per_unit numeric(5,2) NOT NULL DEFAULT 1.2,
  power_unit_type text NOT NULL DEFAULT 'Nguồn Meanwell ngoài trời 12V 400W IP67',
  power_unit_watts integer NOT NULL DEFAULT 400,
  calculated_led_count integer DEFAULT 0,
  calculated_total_watts numeric(10,2) DEFAULT 0,
  calculated_power_units integer DEFAULT 0,

  -- Phụ kiện & Tiêu hao
  calculated_titebond_tubes integer DEFAULT 0,
  calculated_silicone_tubes integer DEFAULT 0,
  calculated_rivets_count integer DEFAULT 0,
  calculated_screws_count integer DEFAULT 0,

  -- Dự toán chi phí & Danh mục vật tư
  estimated_material_cost numeric(15,2) DEFAULT 0,
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  cutting_nesting_layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'applied', 'stock_issued')),
  notes text DEFAULT '',

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_project_boms_org_proj ON erp.project_boms(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_boms_status ON erp.project_boms(organization_id, status);

-- 2. NÂNG CẤP BẢNG ACCEPTANCES (KÝ SỐ CẢM ỨNG BÀN GIAO)
ALTER TABLE erp.acceptances ADD COLUMN IF NOT EXISTS signature_data text;
ALTER TABLE erp.acceptances ADD COLUMN IF NOT EXISTS surveyor_signature text;
ALTER TABLE erp.acceptances ADD COLUMN IF NOT EXISTS acceptance_notes text;

-- 3. NÂNG CẤP BẢNG SITE_SURVEYS (KÝ SỐ XÁC NHẬN SỐ ĐO HIỆN TRƯỜNG)
ALTER TABLE erp.site_surveys ADD COLUMN IF NOT EXISTS customer_signature text;
ALTER TABLE erp.site_surveys ADD COLUMN IF NOT EXISTS surveyor_signature text;

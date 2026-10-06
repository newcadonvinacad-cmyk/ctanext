CREATE TABLE IF NOT EXISTS erp.site_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  customer_id uuid REFERENCES erp.partners(id),
  project_id uuid REFERENCES erp.projects(id),
  quotation_id uuid REFERENCES erp.quotations(id),
  title text NOT NULL,
  address text NOT NULL,
  survey_date date NOT NULL DEFAULT CURRENT_DATE,
  surveyor_employee_id uuid REFERENCES erp.employees(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'converted')),
  width_meters numeric(10,2) DEFAULT 0,
  height_meters numeric(10,2) DEFAULT 0,
  depth_meters numeric(10,2) DEFAULT 0,
  floor_level text DEFAULT 'Tầng 1',
  elevation_meters numeric(10,2) DEFAULT 0,
  structure_type text DEFAULT 'concrete_beam',
  power_source text DEFAULT '220v_single_phase',
  power_distance_meters numeric(10,2) DEFAULT 0,
  installation_method text DEFAULT 'ladder',
  obstacles text DEFAULT '',
  notes text DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_site_surveys_org_status ON erp.site_surveys(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_site_surveys_customer ON erp.site_surveys(organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_project ON erp.site_surveys(organization_id, project_id);

-- 2. BẢNG QUẢN LÝ DUYỆT MARKET THIẾT KẾ 2D/3D (DESIGN PROOFS)
CREATE TABLE IF NOT EXISTS erp.design_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  project_id uuid REFERENCES erp.projects(id),
  quotation_id uuid REFERENCES erp.quotations(id),
  code text NOT NULL,
  title text NOT NULL,
  version_no integer NOT NULL DEFAULT 1,
  file_url text NOT NULL,
  thumbnail_url text,
  background_material text DEFAULT 'Alu Alcorest 3mm EV2002',
  letter_material text DEFAULT 'Inox vàng gương 304 uốn nổi lọng mica',
  led_spec text DEFAULT 'Module LED 3 mắt Hàn Quốc 12V 3000K/6500K',
  power_spec text DEFAULT 'Bộ nguồn chống nước Meanwell 12V 400W ngoài trời',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'feedback', 'approved', 'rejected')),
  client_feedback text DEFAULT '',
  approved_at timestamptz,
  approved_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_design_proofs_project ON erp.design_proofs(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_design_proofs_quotation ON erp.design_proofs(organization_id, quotation_id);

-- 3. BẢNG KIỂM THỬ XUẤT XƯỞNG & QC TEST ĐÈN LED (FACTORY QC RECORDS)
CREATE TABLE IF NOT EXISTS erp.factory_qc_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  project_id uuid NOT NULL REFERENCES erp.projects(id),
  code text NOT NULL,
  inspector_employee_id uuid REFERENCES erp.employees(id),
  qc_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
  aging_test_hours numeric(5,1) NOT NULL DEFAULT 4.0,
  voltage_drop_check boolean NOT NULL DEFAULT true,
  waterproof_check boolean NOT NULL DEFAULT true,
  frame_weld_check boolean NOT NULL DEFAULT true,
  light_uniformity_check boolean NOT NULL DEFAULT true,
  accessories_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  defect_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_factory_qc_project ON erp.factory_qc_records(organization_id, project_id);

-- 4. BẢNG SỔ BẢO HÀNH & TICKET SỰ CỐ CÔNG TRÌNH (SERVICE TICKETS)
CREATE TABLE IF NOT EXISTS erp.service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  project_id uuid NOT NULL REFERENCES erp.projects(id),
  customer_id uuid NOT NULL REFERENCES erp.partners(id),
  title text NOT NULL,
  issue_type text NOT NULL DEFAULT 'led_power' CHECK (issue_type IN ('led_power', 'structural', 'decal_acrylic', 'weather_damage', 'other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'dispatched', 'in_progress', 'resolved', 'cancelled')),
  is_warranty boolean NOT NULL DEFAULT true,
  reported_at timestamptz NOT NULL DEFAULT now(),
  assigned_employee_id uuid REFERENCES erp.employees(id),
  resolution_notes text DEFAULT '',
  resolved_at timestamptz,
  cost_amount numeric(20,2) NOT NULL DEFAULT 0,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_service_tickets_project ON erp.service_tickets(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_customer ON erp.service_tickets(organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON erp.service_tickets(organization_id, status);

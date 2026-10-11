BEGIN;

-- 1. BẢNG MẪU SẢN PHẨM (PRODUCT TEMPLATES)
-- Hỗ trợ mẫu toàn hệ thống (organization_id IS NULL) và mẫu riêng của từng tổ chức
CREATE TABLE IF NOT EXISTS erp.product_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  signage_type text NOT NULL,
  version_no integer NOT NULL DEFAULT 1,
  description text DEFAULT '',
  parameter_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code, version_no)
);

-- 2. BẢNG CÔNG THỨC ĐỊNH MỨC THEO MẪU SẢN PHẨM (PRODUCT TEMPLATE LINES)
CREATE TABLE IF NOT EXISTS erp.product_template_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES erp.organizations(id),
  template_id uuid NOT NULL REFERENCES erp.product_templates(id) ON DELETE CASCADE,
  line_no integer NOT NULL CHECK (line_no > 0),
  group_code text NOT NULL,
  line_type text NOT NULL DEFAULT 'material' CHECK (line_type IN ('material', 'service', 'posm')),
  description text NOT NULL,
  formula_expression text NOT NULL,
  default_representative_id uuid REFERENCES erp.material_representatives(id),
  unit_name text NOT NULL DEFAULT 'Cái',
  waste_rate numeric(8,4) NOT NULL DEFAULT 0 CHECK (waste_rate BETWEEN 0 AND 100),
  condition_expression text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, line_no)
);

-- 3. BẢNG HẠNG MỤC KHẢO SÁT HIỆN TRƯỜNG (SITE SURVEY ITEMS)
CREATE TABLE IF NOT EXISTS erp.site_survey_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES erp.organizations(id),
  survey_id uuid NOT NULL REFERENCES erp.site_surveys(id) ON DELETE CASCADE,
  template_id uuid REFERENCES erp.product_templates(id),
  item_title text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  width_meters numeric(10,2) NOT NULL DEFAULT 1.0,
  height_meters numeric(10,2) NOT NULL DEFAULT 1.0,
  depth_meters numeric(10,2) NOT NULL DEFAULT 0.1,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  designated_item_text text DEFAULT '',
  notes text DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_cost numeric(15,2) DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. BỔ SUNG CỘT CHO PROJECT BOMS
ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS bom_kind text NOT NULL DEFAULT 'production' CHECK (bom_kind IN ('estimate', 'production'));
ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS survey_item_id uuid;
ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS template_version integer NOT NULL DEFAULT 1;
ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS params_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_bom_survey_item_fk'
  ) THEN
    ALTER TABLE erp.project_boms ADD CONSTRAINT project_bom_survey_item_fk
      FOREIGN KEY (survey_item_id) REFERENCES erp.site_survey_items(id);
  END IF;
END $$;

-- 5. BỔ SUNG CỘT CHO PROJECT BOM LINES
ALTER TABLE erp.project_bom_lines ADD COLUMN IF NOT EXISTS line_type text NOT NULL DEFAULT 'material' CHECK (line_type IN ('material', 'service', 'posm'));
ALTER TABLE erp.project_bom_lines ADD COLUMN IF NOT EXISTS usage_unit text;
ALTER TABLE erp.project_bom_lines ADD COLUMN IF NOT EXISTS usage_quantity numeric(20,6);
ALTER TABLE erp.project_bom_lines ADD COLUMN IF NOT EXISTS conversion_factor numeric(12,6) NOT NULL DEFAULT 1.0;
ALTER TABLE erp.project_bom_lines ADD COLUMN IF NOT EXISTS mapping_status text NOT NULL DEFAULT 'unmapped' CHECK (mapping_status IN ('mapped', 'unmapped'));

-- 6. BỔ SUNG CẤU HÌNH THƯƠNG HIỆU CHO KHÁCH HÀNG (PARTNERS)
ALTER TABLE erp.partners ADD COLUMN IF NOT EXISTS brand_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 7. NẠP DỮ LIỆU HẠT GIỐNG CHO 3 MẪU SẢN PHẨM CHUẨN (HỆ THỐNG TOÀN CỤC)
-- 7.1 Mẫu: alu_letters (Biển Alu Chữ Nổi LED)
INSERT INTO erp.product_templates (organization_id, code, name, signage_type, version_no, description, parameter_schema)
VALUES (
  NULL,
  'TPL-ALU-LETTERS',
  'Biển Alu Chữ Nổi LED Đèn Hắt',
  'alu_letters',
  1,
  'Mẫu định mức chuẩn: Khung sắt mạ kẽm, mặt Alu ngoài trời 3mm, chữ nổi LED, nguồn chống nước',
  '[
    {"key": "w", "label": "Chiều ngang (m)", "type": "number", "default": 6.0},
    {"key": "h", "label": "Chiều cao (m)", "type": "number", "default": 2.0},
    {"key": "d", "label": "Chiều sâu (m)", "type": "number", "default": 0.2},
    {"key": "grid_cm", "label": "Khoảng cách đan nan (cm)", "type": "number", "default": 40},
    {"key": "is_lit", "label": "Có đèn LED chiếu sáng", "type": "boolean", "default": true},
    {"key": "has_logo", "label": "Kèm Logo nổi", "type": "boolean", "default": false}
  ]'::jsonb
)
ON CONFLICT (code, version_no) DO UPDATE SET
  name = EXCLUDED.name,
  parameter_schema = EXCLUDED.parameter_schema;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 1, 'frame', 'material', 'Sắt hộp mạ kẽm đan nan',
       'ceil((2 * (w + h) + (w / max(0.1, grid_cm / 100)) * h) * 1.08 / 6)', 'Cây 6m', 8.0, '', 'Cây sắt hộp 6m đã tính hao hụt hàn'
FROM erp.product_templates t WHERE t.code = 'TPL-ALU-LETTERS'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 2, 'face', 'material', 'Tấm Alu mặt biển ngoài trời',
       'ceil(w * h * 1.10 / 2.977)', 'Tấm', 10.0, '', 'Tấm alu 1.22x2.44m (2.977 m2) đã gồm phay gấp mép'
FROM erp.product_templates t WHERE t.code = 'TPL-ALU-LETTERS'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 3, 'lighting', 'material', 'Module LED 3 bóng hắt sáng',
       'round(w * h * 80)', 'Con', 5.0, 'is_lit == true', 'Mật độ trung bình 80 bóng LED/m2'
FROM erp.product_templates t WHERE t.code = 'TPL-ALU-LETTERS'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 4, 'power', 'material', 'Bộ nguồn ngoài trời 12V 400W chống nước',
       'ceil((w * h * 80 * 1.2 * 1.25) / 400)', 'Bộ', 0.0, 'is_lit == true', 'Tải 80% công suất danh định'
FROM erp.product_templates t WHERE t.code = 'TPL-ALU-LETTERS'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 5, 'sub_materials', 'material', 'Keo dán chuyên dụng & Vít bắn alu',
       'ceil(w * h / 4)', 'Chai', 5.0, '', 'Keo Titebond/Xbond kết cấu'
FROM erp.product_templates t WHERE t.code = 'TPL-ALU-LETTERS'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

-- 7.2 Mẫu: lightbox_3m (Biển Hộp Đèn 3M UV)
INSERT INTO erp.product_templates (organization_id, code, name, signage_type, version_no, description, parameter_schema)
VALUES (
  NULL,
  'TPL-LIGHTBOX-3M',
  'Biển Hộp Đèn 3M / Bạt Không Gân In UV',
  'lightbox_3m',
  1,
  'Mẫu định mức hộp đèn: Khung hộp sắt, viền nhôm định hình nhét bạt, bạt 3M in UV, LED hắt module',
  '[
    {"key": "w", "label": "Chiều ngang (m)", "type": "number", "default": 4.0},
    {"key": "h", "label": "Chiều cao (m)", "type": "number", "default": 1.2},
    {"key": "d", "label": "Độ sâu hộp (m)", "type": "number", "default": 0.15},
    {"key": "faces", "label": "Số mặt hiển thị", "type": "number", "default": 1}
  ]'::jsonb
)
ON CONFLICT (code, version_no) DO UPDATE SET
  name = EXCLUDED.name,
  parameter_schema = EXCLUDED.parameter_schema;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 1, 'frame', 'material', 'Khung sắt hộp mạ kẽm hộp đèn',
       'ceil((2 * (w + h) * max(1, faces) + (w / 0.5) * h) * 1.05 / 6)', 'Cây 6m', 5.0, '', 'Sắt hộp định hình kết cấu hộp đèn'
FROM erp.product_templates t WHERE t.code = 'TPL-LIGHTBOX-3M'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 2, 'face', 'material', 'Bạt 3M Panagraphics in UV cao cấp',
       '(w + 0.1) * (h + 0.1) * max(1, faces)', 'm²', 5.0, '', 'Bạt 3M không gân in UV chống phai'
FROM erp.product_templates t WHERE t.code = 'TPL-LIGHTBOX-3M'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 3, 'frame', 'material', 'Nhôm định hình viền hộp đèn',
       'ceil(2 * (w + h) / 6)', 'Cây 6m', 5.0, '', 'Nẹp nhôm bo viền hộp đèn'
FROM erp.product_templates t WHERE t.code = 'TPL-LIGHTBOX-3M'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 4, 'lighting', 'material', 'Module LED mắt lồi hộp đèn 1.5W',
       'round(w * h * 90 * max(1, faces))', 'Con', 5.0, '', 'LED góc rộng 160 độ chống sọc ánh sáng'
FROM erp.product_templates t WHERE t.code = 'TPL-LIGHTBOX-3M'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 5, 'power', 'material', 'Bộ nguồn Meanwell ngoài trời 12V 400W',
       'ceil((w * h * 90 * 1.5 * 1.25 * max(1, faces)) / 400)', 'Bộ', 0.0, '', 'Nguồn cấp hộp đèn'
FROM erp.product_templates t WHERE t.code = 'TPL-LIGHTBOX-3M'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

-- 7.3 Mẫu: canvas_hiflex (Biển Bạt Khung Sắt)
INSERT INTO erp.product_templates (organization_id, code, name, signage_type, version_no, description, parameter_schema)
VALUES (
  NULL,
  'TPL-CANVAS-HIFLEX',
  'Biển Bạt Hiflex / Bạt UV Khung Sắt',
  'canvas_hiflex',
  1,
  'Mẫu định mức biển bạt kinh tế: Khung sắt vuông đan nan, bạt Hiflex căng phẳng nẹp V nhôm hoặc keo',
  '[
    {"key": "w", "label": "Chiều ngang (m)", "type": "number", "default": 5.0},
    {"key": "h", "label": "Chiều cao (m)", "type": "number", "default": 1.5},
    {"key": "grid_cm", "label": "Khoảng cách đan nan (cm)", "type": "number", "default": 50}
  ]'::jsonb
)
ON CONFLICT (code, version_no) DO UPDATE SET
  name = EXCLUDED.name,
  parameter_schema = EXCLUDED.parameter_schema;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 1, 'frame', 'material', 'Sắt hộp mạ kẽm 20x20mm hàn khung',
       'ceil((2 * (w + h) + (w / max(0.1, grid_cm / 100)) * h) * 1.05 / 6)', 'Cây 6m', 5.0, '', 'Sắt hộp 20x20 tiêu chuẩn'
FROM erp.product_templates t WHERE t.code = 'TPL-CANVAS-HIFLEX'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 2, 'face', 'material', 'Bạt Hiflex bạt căng ngoài trời dày dặn',
       '(w + 0.1) * (h + 0.1)', 'm²', 5.0, '', 'Bạt Hiflex gập viền đóng khoen/bắn vít'
FROM erp.product_templates t WHERE t.code = 'TPL-CANVAS-HIFLEX'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

INSERT INTO erp.product_template_lines (template_id, line_no, group_code, line_type, description, formula_expression, unit_name, waste_rate, condition_expression, notes)
SELECT t.id, 3, 'accessories', 'material', 'V nhôm bo viền biển bạt',
       'ceil(2 * (w + h) / 6)', 'Cây 6m', 5.0, '', 'V nhôm 20x20 che viền bắn vít'
FROM erp.product_templates t WHERE t.code = 'TPL-CANVAS-HIFLEX'
ON CONFLICT (template_id, line_no) DO UPDATE SET formula_expression = EXCLUDED.formula_expression;

COMMIT;

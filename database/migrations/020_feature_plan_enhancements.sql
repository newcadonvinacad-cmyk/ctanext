-- Migration 020: Feature Plan Enhancements 2026-10-10
-- Warehouse locations, stock doc receiver, payment attachments & approval, work shift kind, attendance shift sessions & HR review

BEGIN;

-- 1. Bảng vị trí kho (Warehouse locations / khu / kệ / ô)
CREATE TABLE IF NOT EXISTS erp.warehouse_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  warehouse_id uuid NOT NULL REFERENCES erp.warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  zone text,
  aisle text,
  rack text,
  shelf text,
  bin text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, warehouse_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_wh ON erp.warehouse_locations(organization_id, warehouse_id);

-- 2. Bổ sung trường vị trí trên dòng phiếu kho
ALTER TABLE erp.stock_document_lines ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES erp.warehouse_locations(id);
ALTER TABLE erp.stock_document_lines ADD COLUMN IF NOT EXISTS location_name text;

-- 3. Bổ sung thông tin người nhận trên phiếu xuất kho
ALTER TABLE erp.stock_documents ADD COLUMN IF NOT EXISTS receiver_name text;
ALTER TABLE erp.stock_documents ADD COLUMN IF NOT EXISTS receiver_type text DEFAULT 'internal';
ALTER TABLE erp.stock_documents ADD COLUMN IF NOT EXISTS receiver_employee_id uuid REFERENCES erp.employees(id);
ALTER TABLE erp.stock_documents ADD COLUMN IF NOT EXISTS receiver_phone text;
ALTER TABLE erp.stock_documents ADD COLUMN IF NOT EXISTS received_at timestamptz;

-- 4. Bổ sung tệp đính kèm và phê duyệt thanh toán
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS document_image text;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS document_file_url text;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS document_file_name text;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS document_file_size bigint;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS document_file_type text;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS document_mime_type text;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS submitted_by text REFERENCES public."user"(id);
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS approved_by text REFERENCES public."user"(id);
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS posted_at timestamptz;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS posted_by text REFERENCES public."user"(id);
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS rejected_by text REFERENCES public."user"(id);
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS returned_at timestamptz;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS returned_by text REFERENCES public."user"(id);
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS return_reason text;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS is_reversal boolean NOT NULL DEFAULT false;
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS reversal_of_payment_id uuid REFERENCES erp.payments(id);
ALTER TABLE erp.payments ADD COLUMN IF NOT EXISTS review_note text;

-- 4b. Bổ sung trường tệp đính kèm và điều khoản cho hợp đồng
ALTER TABLE erp.contracts ADD COLUMN IF NOT EXISTS document_file_url text;
ALTER TABLE erp.contracts ADD COLUMN IF NOT EXISTS terms jsonb DEFAULT '{}';
ALTER TABLE erp.contracts ADD COLUMN IF NOT EXISTS notes text;

-- 5. Bổ sung phân loại ca thường/OT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'erp' AND table_name = 'work_shifts' AND column_name = 'shift_kind'
  ) THEN
    ALTER TABLE erp.work_shifts ADD COLUMN shift_kind text NOT NULL DEFAULT 'regular';
  END IF;
END $$;

-- 6. Bổ sung trường chấm công theo phiên ca & rà soát HR
ALTER TABLE erp.attendance_entries ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES erp.work_shifts(id);
ALTER TABLE erp.attendance_entries ADD COLUMN IF NOT EXISTS regular_minutes integer DEFAULT 0;
ALTER TABLE erp.attendance_entries ADD COLUMN IF NOT EXISTS ot_minutes integer DEFAULT 0;
ALTER TABLE erp.attendance_entries ADD COLUMN IF NOT EXISTS explanation_required boolean DEFAULT false;
ALTER TABLE erp.attendance_entries ADD COLUMN IF NOT EXISTS explanation_note text;
ALTER TABLE erp.attendance_entries ADD COLUMN IF NOT EXISTS hr_approved_ot_minutes integer;
ALTER TABLE erp.attendance_entries ADD COLUMN IF NOT EXISTS hr_decision_note text;
ALTER TABLE erp.attendance_entries ADD COLUMN IF NOT EXISTS hr_decided_by text REFERENCES public."user"(id);
ALTER TABLE erp.attendance_entries ADD COLUMN IF NOT EXISTS hr_decided_at timestamptz;

-- 7. Mở rộng trạng thái kỳ công/lương (cho phép locked, approved)
ALTER TABLE erp.attendance_periods DROP CONSTRAINT IF EXISTS attendance_periods_status_check;
ALTER TABLE erp.attendance_periods ADD CONSTRAINT attendance_periods_status_check CHECK (status IN ('open', 'closed', 'locked', 'approved'));

-- 8. Bổ sung trường quản lý dự án chuỗi biển hiệu CEN / QCNT
ALTER TABLE erp.projects ADD COLUMN IF NOT EXISTS project_group text DEFAULT 'CEN';
ALTER TABLE erp.projects ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE erp.projects ADD COLUMN IF NOT EXISTS actual_completion_date date;

ALTER TABLE erp.quotation_lines ADD COLUMN IF NOT EXISTS width_meters numeric(10,3);
ALTER TABLE erp.quotation_lines ADD COLUMN IF NOT EXISTS height_meters numeric(10,3);
ALTER TABLE erp.quotation_lines ADD COLUMN IF NOT EXISTS category_name text;

-- Ghi nhận migration marker
INSERT INTO erp.application_migrations (code, applied_at)
VALUES ('020_feature_plan_enhancements', now())
ON CONFLICT (code) DO NOTHING;

COMMIT;

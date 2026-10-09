BEGIN;
ALTER TABLE erp.site_surveys ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS erp.material_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL, name text NOT NULL, specification_key text NOT NULL DEFAULT '',
  quantity_basis text NOT NULL CHECK(quantity_basis IN ('area','perimeter','count','manual')),
  rules jsonb NOT NULL DEFAULT '{}', default_item_id uuid, default_unit_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id), UNIQUE(organization_id,code,specification_key),
  FOREIGN KEY(organization_id,default_item_id) REFERENCES erp.items(organization_id,id),
  FOREIGN KEY(organization_id,default_unit_id) REFERENCES erp.units(organization_id,id)
);
INSERT INTO erp.material_representatives(organization_id,code,name,quantity_basis)
SELECT o.id,v.code,v.name,v.basis FROM erp.organizations o CROSS JOIN (VALUES
 ('frame','Khung và kết cấu','perimeter'),('face','Mặt biển','area'),('letters','Chữ nổi','manual'),
 ('logo','Logo thương hiệu','count'),('color_strip','Dải màu','area'),('lighting','Đèn / LED','manual'),
 ('power','Nguồn điện','manual'),('accessories','Phụ kiện','manual'),('other','Hạng mục bổ sung','manual')
) v(code,name,basis) ON CONFLICT DO NOTHING;

ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS design_proof_id uuid;
ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS survey_id uuid;
ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS revision_no integer NOT NULL DEFAULT 1;
ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS previous_revision_id uuid;
ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS source_snapshot jsonb NOT NULL DEFAULT '{}';
ALTER TABLE erp.project_boms ADD COLUMN IF NOT EXISTS mapped boolean NOT NULL DEFAULT false;
ALTER TABLE erp.project_boms ADD CONSTRAINT production_bom_design_fk FOREIGN KEY(organization_id,design_proof_id) REFERENCES erp.design_proofs(organization_id,id);
ALTER TABLE erp.project_boms ADD CONSTRAINT production_bom_survey_fk FOREIGN KEY(organization_id,survey_id) REFERENCES erp.site_surveys(organization_id,id);
ALTER TABLE erp.project_boms ADD CONSTRAINT production_bom_revision_fk FOREIGN KEY(organization_id,previous_revision_id) REFERENCES erp.project_boms(organization_id,id);

CREATE TABLE erp.project_bom_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES erp.organizations(id),
 bom_id uuid NOT NULL, line_no integer NOT NULL CHECK(line_no>0), representative_id uuid NOT NULL,
 description text NOT NULL, quantity numeric(20,6) NOT NULL CHECK(quantity>0),
 item_id uuid, unit_id uuid, waste_rate numeric(8,4) NOT NULL DEFAULT 0 CHECK(waste_rate BETWEEN 0 AND 100),
 notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id), UNIQUE(organization_id,bom_id,line_no),
 FOREIGN KEY(organization_id,bom_id) REFERENCES erp.project_boms(organization_id,id),
 FOREIGN KEY(organization_id,representative_id) REFERENCES erp.material_representatives(organization_id,id),
 FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id),
 FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id)
);

ALTER TABLE erp.production_orders ALTER COLUMN output_item_id DROP NOT NULL;
ALTER TABLE erp.production_orders ALTER COLUMN unit_id DROP NOT NULL;
ALTER TABLE erp.production_orders ALTER COLUMN target_qty DROP NOT NULL;
ALTER TABLE erp.production_orders ADD COLUMN project_id uuid;
ALTER TABLE erp.production_orders ADD COLUMN title text NOT NULL DEFAULT '';
ALTER TABLE erp.production_orders ADD COLUMN source_snapshot jsonb NOT NULL DEFAULT '{}';
ALTER TABLE erp.production_orders ADD CONSTRAINT production_project_fk FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id);

CREATE TABLE erp.production_order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES erp.organizations(id),
 production_order_id uuid NOT NULL, bom_id uuid, design_proof_id uuid, task_id uuid NOT NULL, team_id uuid NOT NULL,
 output_item_id uuid NOT NULL, unit_id uuid NOT NULL, title text NOT NULL,
 target_qty numeric(20,6) NOT NULL CHECK(target_qty>0), bom_yield_qty numeric(20,6) NOT NULL DEFAULT 1 CHECK(bom_yield_qty>0), received_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(received_qty>=0),
 status text NOT NULL DEFAULT 'waiting_materials' CHECK(status IN ('waiting_materials','ready','in_progress','rework','completed','cancelled')),
 has_electrical boolean NOT NULL DEFAULT false, snapshot jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id),
 FOREIGN KEY(organization_id,production_order_id) REFERENCES erp.production_orders(organization_id,id),
 FOREIGN KEY(organization_id,bom_id) REFERENCES erp.project_boms(organization_id,id),
 FOREIGN KEY(organization_id,design_proof_id) REFERENCES erp.design_proofs(organization_id,id),
 FOREIGN KEY(organization_id,task_id) REFERENCES erp.tasks(organization_id,id),
 FOREIGN KEY(organization_id,team_id) REFERENCES erp.teams(organization_id,id),
 FOREIGN KEY(organization_id,output_item_id) REFERENCES erp.items(organization_id,id),
 FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id)
);
ALTER TABLE erp.production_materials ADD COLUMN production_order_line_id uuid;
ALTER TABLE erp.production_materials ADD COLUMN source_paths jsonb NOT NULL DEFAULT '[]';
ALTER TABLE erp.production_materials ADD COLUMN source_warehouse_id uuid;
ALTER TABLE erp.production_materials ADD CONSTRAINT production_material_warehouse_fk FOREIGN KEY(organization_id,source_warehouse_id) REFERENCES erp.warehouses(organization_id,id);
ALTER TABLE erp.production_materials ADD CONSTRAINT production_material_line_fk FOREIGN KEY(organization_id,production_order_line_id) REFERENCES erp.production_order_lines(organization_id,id);

CREATE TABLE erp.production_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES erp.organizations(id),
 order_line_id uuid NOT NULL, sequence integer NOT NULL CHECK(sequence>0), title text NOT NULL,
 status text NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','doing','done')),
 progress numeric(5,2) NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
 started_at timestamptz, completed_at timestamptz, UNIQUE(organization_id,id), UNIQUE(organization_id,order_line_id,sequence),
 FOREIGN KEY(organization_id,order_line_id) REFERENCES erp.production_order_lines(organization_id,id)
);
CREATE TABLE erp.production_step_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES erp.organizations(id), step_id uuid NOT NULL,
 progress numeric(5,2) NOT NULL CHECK(progress BETWEEN 0 AND 100), output_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(output_qty>=0),
 waste_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(waste_qty>=0), materials jsonb NOT NULL DEFAULT '[]', photos jsonb NOT NULL DEFAULT '[]',
 notes text NOT NULL DEFAULT '', reported_by text NOT NULL REFERENCES public."user"(id), reported_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,step_id) REFERENCES erp.production_steps(organization_id,id)
);

ALTER TABLE erp.factory_qc_records ADD COLUMN production_order_line_id uuid;
ALTER TABLE erp.factory_qc_records ADD COLUMN accepted_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(accepted_qty>=0);
ALTER TABLE erp.factory_qc_records ADD COLUMN rejected_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(rejected_qty>=0);
ALTER TABLE erp.factory_qc_records ADD COLUMN checks jsonb NOT NULL DEFAULT '{}';
ALTER TABLE erp.factory_qc_records ADD CONSTRAINT production_qc_line_fk FOREIGN KEY(organization_id,production_order_line_id) REFERENCES erp.production_order_lines(organization_id,id);
ALTER TABLE erp.production_outputs ALTER COLUMN work_report_id DROP NOT NULL;
ALTER TABLE erp.production_outputs ADD COLUMN production_order_line_id uuid;
ALTER TABLE erp.production_outputs ADD COLUMN qc_record_id uuid;
ALTER TABLE erp.production_outputs ADD COLUMN lot_id uuid;
ALTER TABLE erp.production_outputs ADD COLUMN receipt_document_id uuid;
ALTER TABLE erp.production_outputs ADD CONSTRAINT production_output_line_fk FOREIGN KEY(organization_id,production_order_line_id) REFERENCES erp.production_order_lines(organization_id,id);
ALTER TABLE erp.production_outputs ADD CONSTRAINT production_output_qc_fk FOREIGN KEY(organization_id,qc_record_id) REFERENCES erp.factory_qc_records(organization_id,id);
ALTER TABLE erp.production_outputs ADD CONSTRAINT production_output_lot_fk FOREIGN KEY(organization_id,lot_id) REFERENCES erp.stock_lots(organization_id,id);
ALTER TABLE erp.production_outputs ADD CONSTRAINT production_output_receipt_fk FOREIGN KEY(organization_id,receipt_document_id) REFERENCES erp.stock_documents(organization_id,id);
CREATE UNIQUE INDEX production_output_qc_once ON erp.production_outputs(organization_id,qc_record_id) WHERE qc_record_id IS NOT NULL;

ALTER TABLE erp.stock_lots ADD COLUMN production_order_line_id uuid;
ALTER TABLE erp.stock_lots ADD COLUMN project_id uuid;
ALTER TABLE erp.stock_lots ADD COLUMN design_proof_id uuid;
ALTER TABLE erp.stock_lots ADD COLUMN design_snapshot jsonb NOT NULL DEFAULT '{}';
ALTER TABLE erp.stock_lots ADD CONSTRAINT production_lot_line_fk FOREIGN KEY(organization_id,production_order_line_id) REFERENCES erp.production_order_lines(organization_id,id);
ALTER TABLE erp.stock_lots ADD CONSTRAINT production_lot_project_fk FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id);
ALTER TABLE erp.stock_lots ADD CONSTRAINT production_lot_design_fk FOREIGN KEY(organization_id,design_proof_id) REFERENCES erp.design_proofs(organization_id,id);
ALTER TABLE erp.stock_documents ADD COLUMN workflow_kind text CHECK(workflow_kind IN ('production_material','production_output','production_return','sales_fulfillment','reversal'));
ALTER TABLE erp.stock_documents ADD COLUMN sales_order_id uuid;
ALTER TABLE erp.stock_documents ADD COLUMN reverses_document_id uuid;
ALTER TABLE erp.stock_documents ADD CONSTRAINT production_sales_doc_fk FOREIGN KEY(organization_id,sales_order_id) REFERENCES erp.sales_orders(organization_id,id);
ALTER TABLE erp.stock_documents ADD CONSTRAINT production_reverse_doc_fk FOREIGN KEY(organization_id,reverses_document_id) REFERENCES erp.stock_documents(organization_id,id);
ALTER TABLE erp.stock_document_lines ADD COLUMN production_material_id uuid;
ALTER TABLE erp.stock_document_lines ADD CONSTRAINT production_stock_material_fk FOREIGN KEY(organization_id,production_material_id) REFERENCES erp.production_materials(organization_id,id);
ALTER TABLE erp.stock_reservations ADD COLUMN document_line_id uuid;
ALTER TABLE erp.stock_reservations ADD CONSTRAINT production_reservation_line_fk FOREIGN KEY(organization_id,document_line_id) REFERENCES erp.stock_document_lines(organization_id,id);
CREATE UNIQUE INDEX production_reservation_once ON erp.stock_reservations(organization_id,document_line_id) WHERE status='active' AND document_line_id IS NOT NULL;
ALTER TABLE erp.sales_order_lines ADD COLUMN lot_id uuid;
ALTER TABLE erp.sales_order_lines ADD COLUMN warehouse_id uuid;
ALTER TABLE erp.sales_order_lines ADD COLUMN production_order_line_id uuid;
ALTER TABLE erp.sales_order_lines ADD COLUMN delivered_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(delivered_qty>=0);
ALTER TABLE erp.sales_order_lines ADD CONSTRAINT production_sales_lot_fk FOREIGN KEY(organization_id,lot_id,item_id) REFERENCES erp.stock_lots(organization_id,id,item_id);
ALTER TABLE erp.sales_order_lines ADD CONSTRAINT production_sales_warehouse_fk FOREIGN KEY(organization_id,warehouse_id) REFERENCES erp.warehouses(organization_id,id);
ALTER TABLE erp.sales_order_lines ADD CONSTRAINT production_sales_line_fk FOREIGN KEY(organization_id,production_order_line_id) REFERENCES erp.production_order_lines(organization_id,id);

CREATE TABLE erp.production_requests (
 organization_id uuid NOT NULL REFERENCES erp.organizations(id), request_id uuid NOT NULL, operation text NOT NULL, payload_hash text NOT NULL,
 result jsonb, requested_by text NOT NULL REFERENCES public."user"(id), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,request_id)
);

-- Preserve any legacy single-output orders without interpreting mixed units.
INSERT INTO erp.production_order_lines(organization_id,production_order_id,task_id,team_id,output_item_id,unit_id,title,target_qty,received_qty,status)
SELECT organization_id,id,task_id,team_id,output_item_id,unit_id,code,target_qty,completed_qty,
 CASE WHEN status='completed' THEN 'completed' WHEN status='cancelled' THEN 'cancelled' ELSE 'waiting_materials' END
FROM erp.production_orders WHERE output_item_id IS NOT NULL;

CREATE INDEX production_lines_order ON erp.production_order_lines(organization_id,production_order_id);
CREATE INDEX production_lots_project ON erp.stock_lots(organization_id,project_id,production_order_line_id);
CREATE INDEX production_materials_line ON erp.production_materials(organization_id,production_order_line_id);
CREATE INDEX production_stock_order ON erp.stock_documents(organization_id,production_order_id,workflow_kind);
CREATE UNIQUE INDEX production_one_reversal ON erp.stock_documents(organization_id,reverses_document_id) WHERE reverses_document_id IS NOT NULL AND status NOT IN ('cancelled','rejected');

-- Reversing an output receipt also needs a reservation, linked to its document line.
DO $$ DECLARE c text; BEGIN
 SELECT conname INTO c FROM pg_constraint WHERE conrelid='erp.stock_reservations'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%num_nonnulls(sales_line_id, production_material_id)%';
 IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE erp.stock_reservations DROP CONSTRAINT %I',c); END IF;
END $$;
ALTER TABLE erp.stock_reservations ADD CONSTRAINT production_reservation_source CHECK(num_nonnulls(sales_line_id,production_material_id)<=1 AND (num_nonnulls(sales_line_id,production_material_id)=1 OR document_line_id IS NOT NULL));

CREATE FUNCTION erp.freeze_production_bom() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.design_proof_id IS NOT NULL AND OLD.status<>'draft' AND (TG_OP='DELETE' OR
 (to_jsonb(NEW)-ARRAY['status','updated_at','updated_by','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','updated_at','updated_by','version'])) THEN
  RAISE EXCEPTION 'BOM da chot: tao phien ban moi truoc khi sua';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF OLD.design_proof_id IS NOT NULL AND OLD.status<>'draft' AND NEW.status='draft' THEN RAISE EXCEPTION 'Khong mo lai BOM da chot'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER freeze_production_bom BEFORE UPDATE OR DELETE ON erp.project_boms FOR EACH ROW EXECUTE FUNCTION erp.freeze_production_bom();

DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['material_representatives','project_bom_lines','production_order_lines','production_steps','production_step_reports','production_requests'] LOOP
  EXECUTE format('ALTER TABLE erp.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE erp.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY organization_isolation ON erp.%I USING (organization_id = nullif(current_setting(''app.organization_id'',true),'''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'',true),'''')::uuid)',tab);
 END LOOP;
END $$;

INSERT INTO iam.permissions(key,resource,action,description,supported_scopes,is_sensitive,supports_amount_limit)
VALUES ('production_order.report','production_order','report','Nhật ký công đoạn',ARRAY['ORG','ASSIGNED','SELECTED'],false,false),
 ('production_order.qc','production_order','qc','Kiểm tra chất lượng',ARRAY['ORG','ASSIGNED','SELECTED'],false,false)
ON CONFLICT(key) DO NOTHING;
INSERT INTO iam.role_grants(organization_id,role_id,permission_id,scope_kind)
SELECT r.organization_id,r.id,p.id,CASE WHEN r.code='SUPER_ADMIN' THEN 'ORG' ELSE 'ASSIGNED' END
FROM iam.roles r CROSS JOIN iam.permissions p
WHERE (r.code IN ('SUPER_ADMIN','PROJECT_MANAGER') AND p.key IN ('production_order.report','production_order.qc'))
 OR (r.code='FIELD_WORKER' AND p.key IN ('production_order.read','production_order.report'))
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS erp.application_migrations(code text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO erp.application_migrations(code) VALUES('019_production_workflow');
COMMIT;

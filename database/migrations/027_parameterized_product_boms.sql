BEGIN;
CREATE TABLE erp.product_parameter_schemas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES erp.organizations(id),
 product_item_id uuid NOT NULL, version integer NOT NULL CHECK(version>0), definitions jsonb NOT NULL CHECK(jsonb_typeof(definitions)='array'),
 created_by text REFERENCES public."user"(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id), UNIQUE(organization_id,product_item_id,version),
 FOREIGN KEY(organization_id,product_item_id) REFERENCES erp.items(organization_id,id)
);
CREATE TABLE erp.product_bom_samples (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES erp.organizations(id),
 product_item_id uuid NOT NULL, schema_id uuid, name text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','confirmed','archived')),
 parameter_values jsonb NOT NULL DEFAULT '{}', lines jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(lines)='array'),
 version integer NOT NULL DEFAULT 1, legacy_source jsonb, notes text NOT NULL DEFAULT '',
 created_by text REFERENCES public."user"(id), updated_by text REFERENCES public."user"(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id), FOREIGN KEY(organization_id,product_item_id) REFERENCES erp.items(organization_id,id),
 FOREIGN KEY(organization_id,schema_id) REFERENCES erp.product_parameter_schemas(organization_id,id)
);
CREATE INDEX product_bom_sample_lookup ON erp.product_bom_samples(organization_id,product_item_id,schema_id,status);
ALTER TABLE erp.site_survey_items ADD COLUMN product_item_id uuid;
ALTER TABLE erp.site_survey_items ADD COLUMN parameter_schema_id uuid;
ALTER TABLE erp.site_survey_items ADD COLUMN parameter_values jsonb NOT NULL DEFAULT '{}';
ALTER TABLE erp.site_survey_items ADD CONSTRAINT survey_product_fk FOREIGN KEY(organization_id,product_item_id) REFERENCES erp.items(organization_id,id);
ALTER TABLE erp.site_survey_items ADD CONSTRAINT survey_schema_fk FOREIGN KEY(organization_id,parameter_schema_id) REFERENCES erp.product_parameter_schemas(organization_id,id);
ALTER TABLE erp.site_survey_items ADD CONSTRAINT survey_product_template_exclusive CHECK(product_item_id IS NULL OR template_id IS NULL);
CREATE TABLE erp.material_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES erp.organizations(id),
 project_id uuid NOT NULL, survey_item_id uuid REFERENCES erp.site_survey_items(id) ON DELETE SET NULL,
 product_item_id uuid NOT NULL, schema_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','confirmed')),
 version integer NOT NULL DEFAULT 1, input_hash text NOT NULL, source_snapshot jsonb NOT NULL,
 lines jsonb NOT NULL CHECK(jsonb_typeof(lines)='array'), method text NOT NULL CHECK(method IN ('exact_sample','ai')),
 explanation text NOT NULL DEFAULT '', warnings jsonb NOT NULL DEFAULT '[]', review_notes text NOT NULL DEFAULT '',
 bom_id uuid, created_by text REFERENCES public."user"(id), confirmed_by text REFERENCES public."user"(id),
 created_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz,
 UNIQUE(organization_id,id), FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id),
 FOREIGN KEY(organization_id,product_item_id) REFERENCES erp.items(organization_id,id),
 FOREIGN KEY(organization_id,schema_id) REFERENCES erp.product_parameter_schemas(organization_id,id),
 FOREIGN KEY(organization_id,bom_id) REFERENCES erp.project_boms(organization_id,id)
);
CREATE INDEX material_proposals_project ON erp.material_proposals(organization_id,project_id,created_at);
-- Preserve old JSON verbatim. No dimensions or reusable material quantities are invented.
INSERT INTO erp.product_bom_samples(organization_id,product_item_id,name,legacy_source,notes)
 SELECT organization_id,id,name || ' (BOM cũ cần rà soát)',specification->'bom','Bổ sung thông số và đơn vị hợp lệ trước khi xác nhận mẫu.'
 FROM erp.items WHERE kind='product' AND jsonb_typeof(specification->'bom')='array' AND jsonb_array_length(specification->'bom')>0;
-- New records retain the organization's isolation policy.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['product_parameter_schemas','product_bom_samples','material_proposals'] LOOP
  EXECUTE format('ALTER TABLE erp.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE erp.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY organization_isolation ON erp.%I USING (organization_id = nullif(current_setting(''app.organization_id'',true),'''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'',true),'''')::uuid)',tab);
 END LOOP;
END $$;
CREATE FUNCTION erp.freeze_parameterized_bom() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.source_snapshot ? 'materialProposal' THEN
  IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['status','updated_at','updated_by','version','survey_id','survey_item_id','area_sqm']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','updated_at','updated_by','version','survey_id','survey_item_id','area_sqm']) THEN
   RAISE EXCEPTION 'BOM thuoc de xuat da xac nhan: lap de xuat moi de sua';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER freeze_parameterized_bom BEFORE UPDATE OR DELETE ON erp.project_boms FOR EACH ROW EXECUTE FUNCTION erp.freeze_parameterized_bom();
CREATE FUNCTION erp.freeze_product_bom_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='product_parameter_schemas' THEN RAISE EXCEPTION 'Product parameter schema versions are immutable'; END IF;
 IF TG_TABLE_NAME='product_bom_samples' AND OLD.status IN ('confirmed','archived') THEN
  IF TG_OP='DELETE' OR NEW.status<>'archived' OR (to_jsonb(NEW)-ARRAY['status','updated_at','updated_by','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','updated_at','updated_by','version']) THEN RAISE EXCEPTION 'Confirmed sample is immutable; copy a new sample'; END IF;
 END IF;
 IF TG_TABLE_NAME='material_proposals' AND OLD.status='confirmed' THEN
  IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['survey_item_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['survey_item_id']) OR (NEW.survey_item_id IS NOT NULL AND NEW.survey_item_id IS DISTINCT FROM OLD.survey_item_id) THEN RAISE EXCEPTION 'Confirmed material proposal is immutable'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER freeze_product_schema BEFORE UPDATE OR DELETE ON erp.product_parameter_schemas FOR EACH ROW EXECUTE FUNCTION erp.freeze_product_bom_history();
CREATE TRIGGER freeze_product_sample BEFORE UPDATE OR DELETE ON erp.product_bom_samples FOR EACH ROW EXECUTE FUNCTION erp.freeze_product_bom_history();
CREATE TRIGGER freeze_material_proposal BEFORE UPDATE OR DELETE ON erp.material_proposals FOR EACH ROW EXECUTE FUNCTION erp.freeze_product_bom_history();
CREATE FUNCTION erp.freeze_proposal_material_lines() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_org uuid; current_bom uuid;
BEGIN
 IF TG_OP='INSERT' THEN current_org=NEW.organization_id; current_bom=NEW.bom_id; ELSE current_org=OLD.organization_id; current_bom=OLD.bom_id; END IF;
 IF EXISTS(SELECT 1 FROM erp.material_proposals WHERE organization_id=current_org AND bom_id=current_bom AND status='confirmed') THEN RAISE EXCEPTION 'Confirmed proposal material lines are immutable'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM erp.material_proposals WHERE organization_id=NEW.organization_id AND bom_id=NEW.bom_id AND status='confirmed') THEN RAISE EXCEPTION 'Confirmed proposal material lines are immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER freeze_proposal_lines BEFORE INSERT OR UPDATE OR DELETE ON erp.project_bom_lines FOR EACH ROW EXECUTE FUNCTION erp.freeze_proposal_material_lines();
COMMIT;

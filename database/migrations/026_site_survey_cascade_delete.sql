-- Migration 026: Enable CASCADE / SET NULL on foreign keys referencing site_surveys
-- 1. Cho phép xóa phiếu khảo sát (site_surveys) thì tự động xóa các hạng mục con (site_survey_items)
ALTER TABLE erp.site_survey_items
  DROP CONSTRAINT IF EXISTS site_survey_items_organization_id_survey_id_fkey,
  DROP CONSTRAINT IF EXISTS site_survey_items_survey_id_fkey;

ALTER TABLE erp.site_survey_items
  ADD CONSTRAINT site_survey_items_organization_id_survey_id_fkey
  FOREIGN KEY (organization_id, survey_id)
  REFERENCES erp.site_surveys(organization_id, id)
  ON DELETE CASCADE;

-- 2. Cho phép xóa phiếu khảo sát thì gỡ liên kết (SET NULL) trên project_boms
ALTER TABLE erp.project_boms
  DROP CONSTRAINT IF EXISTS production_bom_survey_fk;

ALTER TABLE erp.project_boms
  ADD CONSTRAINT production_bom_survey_fk
  FOREIGN KEY (organization_id, survey_id)
  REFERENCES erp.site_surveys(organization_id, id)
  ON DELETE SET NULL;

-- 3. Cho phép xóa hạng mục khảo sát thì gỡ liên kết (SET NULL) trên project_boms
ALTER TABLE erp.project_boms
  DROP CONSTRAINT IF EXISTS project_bom_survey_item_fk;

ALTER TABLE erp.project_boms
  ADD CONSTRAINT project_bom_survey_item_fk
  FOREIGN KEY (survey_item_id)
  REFERENCES erp.site_survey_items(id)
  ON DELETE SET NULL;

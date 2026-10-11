-- Migration 025: Enable ON DELETE CASCADE for project_bom_lines and revision previous_revision_id
ALTER TABLE erp.project_bom_lines
  DROP CONSTRAINT IF EXISTS project_bom_lines_organization_id_bom_id_fkey,
  ADD CONSTRAINT project_bom_lines_organization_id_bom_id_fkey
  FOREIGN KEY (organization_id, bom_id)
  REFERENCES erp.project_boms(organization_id, id)
  ON DELETE CASCADE;

-- Previous revision foreign key set null on delete
ALTER TABLE erp.project_boms
  DROP CONSTRAINT IF EXISTS production_bom_revision_fk;

ALTER TABLE erp.project_boms
  ADD CONSTRAINT production_bom_revision_fk
  FOREIGN KEY (organization_id, previous_revision_id)
  REFERENCES erp.project_boms(organization_id, id)
  ON DELETE SET NULL;

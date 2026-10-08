-- Migration 018: Quản lý Thư mục & Tệp tin Tài liệu Nội bộ (Internal Document Explorer)

-- 1. Bảng thư mục người dùng tự tạo
CREATE TABLE IF NOT EXISTS erp.document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  name text NOT NULL,
  parent_id uuid REFERENCES erp.document_folders(id) ON DELETE CASCADE,
  color text DEFAULT '#0284c7',
  icon text DEFAULT 'folder',
  description text DEFAULT '',
  created_by text REFERENCES public."user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_system boolean NOT NULL DEFAULT false,
  UNIQUE(organization_id, id)
);

CREATE INDEX IF NOT EXISTS idx_doc_folders_org_parent ON erp.document_folders(organization_id, parent_id);

-- 2. Bảng tệp tin tải lên trực tiếp trong Kho Tài Liệu
CREATE TABLE IF NOT EXISTS erp.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  folder_id uuid REFERENCES erp.document_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT 'application/octet-stream',
  extension text DEFAULT '',
  source_module text DEFAULT 'manual_upload', -- 'manual_upload', 'design_proof', 'site_survey', 'po_invoice', 'acceptance', 'qc_record'
  source_ref_id text,
  source_ref_code text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by text REFERENCES public."user"(id),
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_org_folder ON erp.documents(organization_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_source ON erp.documents(organization_id, source_module);

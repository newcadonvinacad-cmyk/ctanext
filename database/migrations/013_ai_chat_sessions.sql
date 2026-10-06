BEGIN;

-- Phien chat AI (1 user co nhieu phien, nhu ChatGPT)
CREATE TABLE IF NOT EXISTS erp.ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  user_id text NOT NULL REFERENCES public."user"(id),
  title text NOT NULL DEFAULT 'Doan chat moi',
  mode text NOT NULL DEFAULT 'query' CHECK (mode IN ('query','ingest')),
  pinned boolean NOT NULL DEFAULT false,
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (organization_id, id)
);

-- Tin nhan trong tung phien chat
CREATE TABLE IF NOT EXISTS erp.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  tools_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  permission_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_proposal jsonb,
  ai_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  UNIQUE (organization_id, id)
);

-- FK session (composite org + id) + cascade xoa tin nhan khi xoa phien
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_chat_messages_session_fk'
  ) THEN
    ALTER TABLE erp.ai_chat_messages
      ADD CONSTRAINT ai_chat_messages_session_fk
      FOREIGN KEY (organization_id, session_id)
      REFERENCES erp.ai_chat_sessions (organization_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- FK toi ai_runs (optional, set null khi xoa run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_chat_messages_ai_run_fk'
  ) THEN
    ALTER TABLE erp.ai_chat_messages
      ADD CONSTRAINT ai_chat_messages_ai_run_fk
      FOREIGN KEY (organization_id, ai_run_id)
      REFERENCES erp.ai_runs (organization_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_updated
  ON erp.ai_chat_sessions (organization_id, user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_pinned
  ON erp.ai_chat_sessions (organization_id, user_id, pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_created
  ON erp.ai_chat_messages (organization_id, session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id
  ON erp.ai_chat_messages (session_id);

-- Trigger version nhu cac bang ERP khac
DROP TRIGGER IF EXISTS touch_version ON erp.ai_chat_sessions;
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION erp.touch_version();

-- RLS co lap theo organization
ALTER TABLE erp.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.ai_chat_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.ai_chat_sessions;
CREATE POLICY organization_isolation ON erp.ai_chat_sessions
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE erp.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.ai_chat_messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.ai_chat_messages;
CREATE POLICY organization_isolation ON erp.ai_chat_messages
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

-- Va RLS con thieu tu cac migration 008/010/011 (verify yeu cau 100% bang co RLS)
ALTER TABLE erp.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.notifications;
CREATE POLICY organization_isolation ON erp.notifications
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE erp.site_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.site_surveys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.site_surveys;
CREATE POLICY organization_isolation ON erp.site_surveys
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE erp.design_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.design_proofs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.design_proofs;
CREATE POLICY organization_isolation ON erp.design_proofs
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE erp.factory_qc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.factory_qc_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.factory_qc_records;
CREATE POLICY organization_isolation ON erp.factory_qc_records
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE erp.service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.service_tickets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.service_tickets;
CREATE POLICY organization_isolation ON erp.service_tickets
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE erp.project_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.project_boms FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_isolation ON erp.project_boms;
CREATE POLICY organization_isolation ON erp.project_boms
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

COMMIT;

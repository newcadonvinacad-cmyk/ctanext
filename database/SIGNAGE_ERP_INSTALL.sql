-- SIGNAGE ERP: run this entire file in Supabase SQL Editor as database owner.
-- Creates 100 ERP/IAM tables, Better Auth tables if missing, and RBAC seed configuration.
-- No demo users/passwords/operational transactions. Existing auth tables are validated and reused.
-- All changes are atomic. If ERP/IAM tables already exist, STOP without replacing them.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SELECT pg_advisory_xact_lock(842617305);
DO $preflight$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema IN ('erp','iam') AND table_type='BASE TABLE') THEN
    RAISE EXCEPTION 'ERP/IAM tables already exist. Installer stopped; nothing overwritten. Use versioned migrations for an existing installation.';
  END IF;
END $preflight$;
CREATE SCHEMA IF NOT EXISTS erp;
CREATE TABLE erp.schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON erp.schema_migrations FROM PUBLIC;

-- ===== 001_better_auth.sql =====
-- Auth tables: generated from installed Better Auth schema. Existing auth data is never overwritten.
DO $auth$
BEGIN
  IF to_regclass('public."user"') IS NULL THEN
CREATE TABLE public."user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."user" FROM PUBLIC;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='id' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column id; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='name' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column name; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='email' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column email; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='emailVerified' AND data_type IN ('boolean') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column emailVerified; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='image' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column image; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='createdAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column createdAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='updatedAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table user has incompatible column updatedAt; migration stopped'; END IF;
  END IF;
  IF to_regclass('public."session"') IS NULL THEN
CREATE TABLE public."session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES public."user"("id") ON DELETE CASCADE
);
CREATE INDEX "session_userId_idx" ON public."session"("userId");
ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."session" FROM PUBLIC;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='id' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column id; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='expiresAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column expiresAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='token' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column token; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='createdAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column createdAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='updatedAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column updatedAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='ipAddress' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column ipAddress; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='userAgent' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column userAgent; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='session' AND column_name='userId' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table session has incompatible column userId; migration stopped'; END IF;
  END IF;
  IF to_regclass('public."account"') IS NULL THEN
CREATE TABLE public."account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES public."user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
CREATE INDEX "account_userId_idx" ON public."account"("userId");
ALTER TABLE public."account" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."account" FROM PUBLIC;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='id' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column id; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='accountId' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column accountId; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='providerId' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column providerId; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='userId' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column userId; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='accessToken' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column accessToken; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='refreshToken' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column refreshToken; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='idToken' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column idToken; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='accessTokenExpiresAt' AND data_type IN ('timestamp with time zone','timestamp without time zone')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column accessTokenExpiresAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='refreshTokenExpiresAt' AND data_type IN ('timestamp with time zone','timestamp without time zone')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column refreshTokenExpiresAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='scope' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column scope; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='password' AND data_type IN ('text','character varying')) THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column password; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='createdAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column createdAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account' AND column_name='updatedAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table account has incompatible column updatedAt; migration stopped'; END IF;
  END IF;
  IF to_regclass('public."verification"') IS NULL THEN
CREATE TABLE public."verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
CREATE INDEX "verification_identifier_idx" ON public."verification"("identifier");
ALTER TABLE public."verification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."verification" FROM PUBLIC;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='id' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column id; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='identifier' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column identifier; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='value' AND data_type IN ('text','character varying') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column value; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='expiresAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column expiresAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='createdAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column createdAt; migration stopped'; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification' AND column_name='updatedAt' AND data_type IN ('timestamp with time zone','timestamp without time zone') AND is_nullable='NO') THEN RAISE EXCEPTION 'Existing Better Auth table verification has incompatible column updatedAt; migration stopped'; END IF;
  END IF;
END $auth$;

INSERT INTO erp.schema_migrations(name,checksum) VALUES ('001_better_auth.sql','e268d34f88858c3873c6265da74f0ce77898e7af14a7cccadea478f8390c37d4');

-- ===== 002_erp_iam.sql =====
-- Signage ERP: PostgreSQL business schema. Managed in one transaction by installer.
CREATE SCHEMA IF NOT EXISTS erp;
CREATE SCHEMA IF NOT EXISTS iam;

CREATE TABLE erp.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  policy_version bigint NOT NULL DEFAULT 1,
  bootstrap_state text NOT NULL DEFAULT 'pending' CHECK(bootstrap_state IN ('pending','locked')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(code)
);

CREATE TABLE erp.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  user_id text NOT NULL REFERENCES public."user"(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE erp.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  parent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  CHECK(parent_id IS DISTINCT FROM id)
);

CREATE TABLE erp.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  department_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  phone text,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  membership_id uuid,
  department_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  UNIQUE (organization_id, membership_id),
  CHECK(end_date IS NULL OR end_date >= hire_date)
);

CREATE TABLE erp.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  is_lead boolean NOT NULL DEFAULT false,
  team_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, team_id, employee_id, valid_from)
);

CREATE TABLE erp.employee_private_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  bank_details jsonb,
  identity_details jsonb,
  emergency_contact jsonb,
  employee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, employee_id)
);

CREATE TABLE erp.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  tax_code text,
  phone text,
  address text,
  is_customer boolean NOT NULL DEFAULT false,
  is_supplier boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  owner_membership_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  CHECK(is_customer OR is_supplier)
);

CREATE TABLE erp.partner_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  name text NOT NULL,
  phone text,
  email text,
  position text,
  partner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.partner_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  side text NOT NULL CHECK (side IN ('receivable','payable')),
  credit_limit numeric(20,2) NOT NULL DEFAULT 0 CHECK(credit_limit>=0),
  payment_days integer NOT NULL DEFAULT 0 CHECK(payment_days>=0),
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  partner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, partner_id,side,currency)
);

CREATE TABLE erp.partner_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  note text NOT NULL,
  partner_id uuid NOT NULL,
  owner_membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  dimension text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.item_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  parent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  CHECK(parent_id IS DISTINCT FROM id)
);

CREATE TABLE erp.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('material','product','service','tool')),
  track_stock boolean NOT NULL DEFAULT true,
  specification jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  category_id uuid,
  base_unit_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  CHECK(kind <> 'service' OR NOT track_stock)
);

CREATE TABLE erp.item_unit_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  factor_to_base numeric(20,6) NOT NULL CHECK(factor_to_base>0),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  item_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.supplier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  price numeric(20,2) NOT NULL CHECK(price>=0),
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  partner_id uuid NOT NULL,
  item_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  plate_no text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  UNIQUE (organization_id, plate_no)
);

CREATE TABLE erp.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('workshop','distribution','vehicle','transit')),
  is_active boolean NOT NULL DEFAULT true,
  vehicle_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.warehouse_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  warehouse_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.warehouse_item_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  min_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(min_qty>=0),
  reorder_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(reorder_qty>=0),
  bin_label text,
  warehouse_id uuid NOT NULL,
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, warehouse_id,item_id)
);

CREATE TABLE erp.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.project_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  revision_no integer NOT NULL CHECK(revision_no>0),
  definition jsonb NOT NULL,
  published_at timestamptz,
  template_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, template_id,revision_no)
);

CREATE TABLE erp.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  latitude numeric(10,7),
  longitude numeric(10,7),
  start_date date,
  due_date date,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','survey','production','transport','installation','acceptance','completed','cancelled')),
  customer_id uuid NOT NULL,
  manager_membership_id uuid NOT NULL,
  template_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  CHECK(due_date IS NULL OR start_date IS NULL OR due_date>=start_date)
);

CREATE TABLE erp.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  duty text NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  project_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','awaiting_acceptance','done','cancelled')),
  due_at timestamptz,
  weight numeric(20,6) NOT NULL DEFAULT 1 CHECK(weight>0),
  progress_mode text NOT NULL DEFAULT 'manual' CHECK (progress_mode IN ('manual','children')),
  progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100),
  project_id uuid,
  parent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  CHECK(parent_id IS DISTINCT FROM id)
);

CREATE TABLE erp.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  task_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  assignment_source_team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  task_kind text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.report_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  revision_no integer NOT NULL CHECK(revision_no>0),
  schema_json jsonb NOT NULL,
  published_at timestamptz,
  template_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, template_id,revision_no)
);

CREATE TABLE erp.report_template_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  task_kind text,
  priority integer NOT NULL DEFAULT 0,
  template_id uuid NOT NULL,
  role_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.work_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  work_date date NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','completed')),
  submitted_at timestamptz,
  client_request_id uuid NOT NULL,
  task_id uuid NOT NULL,
  author_employee_id uuid NOT NULL,
  template_version_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, author_employee_id,client_request_id)
);

CREATE TABLE erp.report_labor_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  minutes integer NOT NULL CHECK(minutes>0),
  description text,
  report_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.report_material_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  used_base_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(used_base_qty>=0),
  wasted_base_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(wasted_base_qty>=0),
  report_id uuid NOT NULL,
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  target_qty numeric(20,6) NOT NULL CHECK(target_qty>0),
  due_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','released','in_progress','completed','cancelled')),
  completed_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK(completed_qty>=0),
  task_id uuid NOT NULL,
  output_item_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  team_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.production_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  required_base_qty numeric(20,6) NOT NULL CHECK(required_base_qty>0),
  waste_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK(waste_rate>=0),
  production_order_id uuid NOT NULL,
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.production_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  accepted_qty numeric(20,6) NOT NULL CHECK(accepted_qty>0),
  accepted_by text NOT NULL REFERENCES public."user"(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  production_order_id uuid NOT NULL,
  work_report_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, production_order_id,work_report_id)
);

CREATE TABLE erp.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','completed')),
  customer_id uuid NOT NULL,
  owner_membership_id uuid NOT NULL,
  accepted_revision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.quotation_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  revision_no integer NOT NULL CHECK(revision_no>0),
  valid_until date NOT NULL,
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(20,2) NOT NULL CHECK(subtotal>=0),
  discount_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0),
  tax_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK(tax_amount>=0),
  total numeric(20,2) NOT NULL CHECK(total>=0),
  terms_snapshot jsonb NOT NULL DEFAULT '{}',
  sent_at timestamptz,
  quotation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, quotation_id,revision_no),
  CHECK(total=subtotal-discount_amount+tax_amount)
);

CREATE TABLE erp.quotation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  line_no integer NOT NULL CHECK(line_no>0),
  description text NOT NULL,
  qty numeric(20,6) NOT NULL CHECK(qty>0),
  unit_price numeric(20,6) NOT NULL CHECK(unit_price>=0),
  discount_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0),
  tax_rate numeric(8,5) NOT NULL DEFAULT 0 CHECK(tax_rate BETWEEN 0 AND 1),
  line_total numeric(20,2) NOT NULL CHECK(line_total>=0),
  revision_id uuid NOT NULL,
  item_id uuid,
  unit_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, revision_id,line_no)
);

CREATE TABLE erp.estimate_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  kind text NOT NULL CHECK (kind IN ('material','labor','transport','other')),
  qty numeric(20,6) NOT NULL CHECK(qty>0),
  unit_cost numeric(20,6) NOT NULL CHECK(unit_cost>=0),
  waste_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK(waste_rate>=0),
  quotation_line_id uuid NOT NULL,
  item_id uuid,
  unit_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','completed')),
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  total numeric(20,2) NOT NULL CHECK(total>=0),
  customer_id uuid NOT NULL,
  quotation_revision_id uuid,
  project_id uuid,
  owner_membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.sales_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  line_no integer NOT NULL CHECK(line_no>0),
  description text NOT NULL,
  qty numeric(20,6) NOT NULL CHECK(qty>0),
  unit_price numeric(20,6) NOT NULL CHECK(unit_price>=0),
  discount_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0),
  tax_rate numeric(8,5) NOT NULL DEFAULT 0 CHECK(tax_rate BETWEEN 0 AND 1),
  line_total numeric(20,2) NOT NULL CHECK(line_total>=0),
  factor_snapshot numeric(20,6) NOT NULL CHECK(factor_snapshot>0),
  specification_snapshot jsonb NOT NULL DEFAULT '{}',
  sales_order_id uuid NOT NULL,
  item_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, sales_order_id,line_no)
);

CREATE TABLE erp.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','completed')),
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  total numeric(20,2) NOT NULL CHECK(total>=0),
  expected_date date,
  supplier_id uuid NOT NULL,
  project_id uuid,
  requested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  line_no integer NOT NULL CHECK(line_no>0),
  description text NOT NULL,
  qty numeric(20,6) NOT NULL CHECK(qty>0),
  unit_price numeric(20,6) NOT NULL CHECK(unit_price>=0),
  discount_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0),
  tax_rate numeric(8,5) NOT NULL DEFAULT 0 CHECK(tax_rate BETWEEN 0 AND 1),
  line_total numeric(20,2) NOT NULL CHECK(line_total>=0),
  factor_snapshot numeric(20,6) NOT NULL CHECK(factor_snapshot>0),
  specification_snapshot jsonb NOT NULL DEFAULT '{}',
  purchase_order_id uuid NOT NULL,
  item_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, purchase_order_id,line_no)
);

CREATE TABLE erp.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  signed_on date,
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  contract_value numeric(20,2) NOT NULL CHECK(contract_value>=0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','completed')),
  customer_id uuid NOT NULL,
  project_id uuid NOT NULL,
  quotation_revision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.contract_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  sequence integer NOT NULL CHECK(sequence>0),
  name text NOT NULL,
  due_date date,
  amount numeric(20,2) NOT NULL CHECK(amount>0),
  contract_id uuid NOT NULL,
  acceptance_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, contract_id,sequence)
);

CREATE TABLE erp.stock_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  lot_code text NOT NULL,
  kind text NOT NULL DEFAULT 'standard' CHECK (kind IN ('standard','remnant','scrap')),
  length_mm numeric(20,6) CHECK(length_mm>0),
  width_mm numeric(20,6) CHECK(width_mm>0),
  item_id uuid NOT NULL,
  parent_lot_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, item_id,lot_code),
  UNIQUE (organization_id, id,item_id),
  CHECK(parent_lot_id IS DISTINCT FROM id)
);

CREATE TABLE erp.stock_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('receipt','issue','transfer','adjustment')),
  purpose text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','dispatched','completed','cancelled','reversed')),
  posted_at timestamptz,
  source_warehouse_id uuid,
  destination_warehouse_id uuid,
  project_id uuid,
  production_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  CHECK((type='receipt' AND source_warehouse_id IS NULL AND destination_warehouse_id IS NOT NULL) OR (type='issue' AND source_warehouse_id IS NOT NULL AND destination_warehouse_id IS NULL) OR (type='transfer' AND source_warehouse_id IS NOT NULL AND destination_warehouse_id IS NOT NULL AND source_warehouse_id<>destination_warehouse_id) OR (type='adjustment' AND source_warehouse_id IS NULL AND destination_warehouse_id IS NOT NULL AND reason IS NOT NULL AND length(trim(reason))>0))
);

CREATE TABLE erp.stock_document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  line_no integer NOT NULL CHECK(line_no>0),
  qty numeric(20,6) NOT NULL CHECK(qty<>0),
  factor_snapshot numeric(20,6) NOT NULL CHECK(factor_snapshot>0),
  base_qty numeric(20,6) NOT NULL CHECK(base_qty<>0),
  unit_cost_snapshot numeric(20,6) NOT NULL CHECK(unit_cost_snapshot>=0),
  document_id uuid NOT NULL,
  item_id uuid NOT NULL,
  lot_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  purchase_line_id uuid,
  sales_line_id uuid,
  reverses_line_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, document_id,line_no),
  UNIQUE (organization_id, id,document_id,item_id,lot_id),
  CHECK(base_qty=qty*factor_snapshot),
  CHECK(num_nonnulls(purchase_line_id,sales_line_id)<=1)
);

CREATE TABLE erp.stock_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  phase text NOT NULL CHECK (phase IN ('complete','dispatch','receive','reverse')),
  posted_by text NOT NULL REFERENCES public."user"(id),
  posted_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid NOT NULL,
  document_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, document_id,phase),
  UNIQUE (organization_id, request_id),
  UNIQUE (organization_id, id,document_id)
);

CREATE TABLE erp.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  qty_delta numeric(20,6) NOT NULL CHECK(qty_delta<>0),
  value_delta numeric(20,2) NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  posting_id uuid NOT NULL,
  document_id uuid NOT NULL,
  document_line_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  item_id uuid NOT NULL,
  lot_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, posting_id,document_line_id,warehouse_id)
);

CREATE TABLE erp.stock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  on_hand_qty numeric(20,6) NOT NULL DEFAULT 0,
  reserved_qty numeric(20,6) NOT NULL DEFAULT 0,
  inventory_value numeric(20,2) NOT NULL DEFAULT 0 CHECK(inventory_value>=0),
  warehouse_id uuid NOT NULL,
  item_id uuid NOT NULL,
  lot_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, warehouse_id,item_id,lot_id),
  CHECK(on_hand_qty>=reserved_qty AND reserved_qty>=0)
);

CREATE TABLE erp.stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  qty numeric(20,6) NOT NULL CHECK(qty>0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','released')),
  sales_line_id uuid,
  production_material_id uuid,
  warehouse_id uuid NOT NULL,
  item_id uuid NOT NULL,
  lot_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  CHECK(num_nonnulls(sales_line_id,production_material_id)=1)
);

CREATE TABLE erp.inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','completed')),
  counted_at timestamptz,
  warehouse_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.inventory_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  expected_qty_snapshot numeric(20,6) NOT NULL CHECK(expected_qty_snapshot>=0),
  actual_qty numeric(20,6) NOT NULL CHECK(actual_qty>=0),
  count_id uuid NOT NULL,
  item_id uuid NOT NULL,
  lot_id uuid NOT NULL,
  adjustment_line_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, count_id,item_id,lot_id),
  UNIQUE (organization_id, adjustment_line_id)
);

CREATE TABLE erp.cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('cash','bank')),
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.open_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  side text NOT NULL CHECK (side IN ('receivable','payable')),
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  original_amount numeric(20,2) NOT NULL CHECK(original_amount>0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','closed','cancelled')),
  source_sequence integer NOT NULL CHECK(source_sequence>0),
  partner_id uuid NOT NULL,
  sales_order_id uuid,
  purchase_order_id uuid,
  contract_milestone_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  CHECK(num_nonnulls(sales_order_id,purchase_order_id,contract_milestone_id)=1)
);

CREATE TABLE erp.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('receipt','disbursement')),
  amount numeric(20,2) NOT NULL CHECK(amount>0),
  currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','posted','reversed','cancelled')),
  paid_at timestamptz,
  purpose text NOT NULL,
  cash_account_id uuid NOT NULL,
  partner_id uuid,
  employee_id uuid,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code),
  CHECK(num_nonnulls(partner_id,employee_id)<=1)
);

CREATE TABLE erp.open_item_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  amount_delta numeric(20,2) NOT NULL CHECK(amount_delta<>0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','posted','cancelled')),
  approved_by text REFERENCES public."user"(id),
  posted_at timestamptz,
  open_item_id uuid NOT NULL,
  reverses_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, reverses_id),
  CHECK(reverses_id IS DISTINCT FROM id)
);

CREATE TABLE erp.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  amount numeric(20,2) NOT NULL CHECK(amount>0),
  payment_id uuid NOT NULL,
  open_item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, payment_id,open_item_id)
);

CREATE TABLE erp.cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  amount_delta numeric(20,2) NOT NULL CHECK(amount_delta<>0),
  posted_at timestamptz NOT NULL DEFAULT now(),
  payment_id uuid NOT NULL,
  cash_account_id uuid NOT NULL,
  reverses_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, reverses_entry_id),
  CHECK(reverses_entry_id IS DISTINCT FROM id)
);

CREATE TABLE erp.expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','completed')),
  total numeric(20,2) NOT NULL CHECK(total>=0),
  employee_id uuid NOT NULL,
  project_id uuid,
  trip_id uuid,
  advance_payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.expense_claim_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  category text NOT NULL,
  amount numeric(20,2) NOT NULL CHECK(amount>0),
  occurred_on date NOT NULL,
  description text NOT NULL,
  claim_id uuid NOT NULL,
  evidence_id uuid,
  purchase_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.expense_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  amount numeric(20,2) NOT NULL CHECK(amount>0),
  kind text NOT NULL CHECK (kind IN ('advance_offset','reimbursement','refund')),
  claim_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, claim_id,payment_id,kind)
);

CREATE TABLE erp.project_cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  category text NOT NULL CHECK (category IN ('material','labor','transport','other')),
  amount numeric(20,2) NOT NULL CHECK(amount<>0),
  project_id uuid NOT NULL,
  source_stock_movement_id uuid,
  source_labor_entry_id uuid,
  source_expense_line_id uuid,
  reverses_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  CHECK(num_nonnulls(source_stock_movement_id,source_labor_entry_id,source_expense_line_id,reverses_id)=1),
  UNIQUE (organization_id, source_stock_movement_id),
  UNIQUE (organization_id, source_labor_entry_id),
  UNIQUE (organization_id, source_expense_line_id),
  UNIQUE (organization_id, reverses_id)
);

CREATE TABLE erp.period_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  domain text NOT NULL CHECK (domain IN ('stock','cash','payroll')),
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by text NOT NULL REFERENCES public."user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, domain,period_start,period_end),
  CHECK(period_end>=period_start)
);

CREATE TABLE erp.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','dispatched','completed','cancelled')),
  planned_departure timestamptz,
  vehicle_id uuid NOT NULL,
  driver_employee_id uuid NOT NULL,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  sequence integer NOT NULL CHECK(sequence>0),
  address text NOT NULL,
  arrived_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','delivered','failed')),
  trip_id uuid NOT NULL,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, trip_id,sequence)
);

CREATE TABLE erp.trip_stock_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  trip_id uuid NOT NULL,
  stock_document_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, trip_id,stock_document_id)
);

CREATE TABLE erp.field_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  type text NOT NULL CHECK (type IN ('check_in','check_out')),
  occurred_at timestamptz NOT NULL,
  server_received_at timestamptz NOT NULL DEFAULT now(),
  latitude numeric(10,7) NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude numeric(10,7) NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  accuracy_m numeric(20,6) NOT NULL CHECK(accuracy_m>=0),
  client_request_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  task_id uuid,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, employee_id,client_request_id)
);

CREATE TABLE erp.acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','completed')),
  accepted_at timestamptz,
  customer_signer_name text,
  project_id uuid NOT NULL,
  task_id uuid,
  signature_file_id uuid,
  document_file_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE erp.attendance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  work_date date NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  source text NOT NULL CHECK (source IN ('field','workshop','manual')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','cancelled','completed')),
  employee_id uuid NOT NULL,
  field_in_id uuid,
  field_out_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  CHECK(end_at IS NULL OR end_at>start_at)
);

CREATE TABLE erp.attendance_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  year integer NOT NULL CHECK(year BETWEEN 2000 AND 2200),
  month integer NOT NULL CHECK(month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, year,month)
);

CREATE TABLE erp.salary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  base_salary numeric(20,2) NOT NULL CHECK(base_salary>=0),
  pay_basis text NOT NULL CHECK (pay_basis IN ('monthly','daily','hourly')),
  allowances jsonb NOT NULL DEFAULT '{}',
  employee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  revision_no integer NOT NULL CHECK(revision_no>0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','superseded','paid')),
  approved_by text REFERENCES public."user"(id),
  approved_at timestamptz,
  period_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, period_id,revision_no)
);

CREATE TABLE erp.payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  salary_snapshot jsonb NOT NULL,
  regular_minutes integer NOT NULL DEFAULT 0 CHECK(regular_minutes>=0),
  overtime_minutes integer NOT NULL DEFAULT 0 CHECK(overtime_minutes>=0),
  base_amount numeric(20,2) NOT NULL CHECK(base_amount>=0),
  allowances numeric(20,2) NOT NULL DEFAULT 0 CHECK(allowances>=0),
  bonus numeric(20,2) NOT NULL DEFAULT 0 CHECK(bonus>=0),
  deductions numeric(20,2) NOT NULL DEFAULT 0 CHECK(deductions>=0),
  net_amount numeric(20,2) NOT NULL CHECK(net_amount>=0),
  run_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  ai_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, run_id,employee_id),
  CHECK(net_amount=base_amount+allowances+bonus-deductions)
);

CREATE TABLE erp.payroll_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  amount numeric(20,2) NOT NULL CHECK(amount>0),
  payroll_line_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, payroll_line_id,payment_id)
);

CREATE TABLE erp.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  bucket text NOT NULL DEFAULT 'erp-evidence',
  object_key text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK(size_bytes>=0),
  sha256 text NOT NULL,
  uploaded_by text NOT NULL REFERENCES public."user"(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','quarantined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE(bucket,object_key)
);

CREATE TABLE erp.record_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  category text NOT NULL,
  file_id uuid NOT NULL,
  project_id uuid,
  report_id uuid,
  purchase_order_id uuid,
  expense_line_id uuid,
  acceptance_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  CHECK(num_nonnulls(project_id,report_id,purchase_order_id,expense_line_id,acceptance_id)=1)
);

CREATE TABLE erp.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  agent_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','confirmed','permission_revoked')),
  model text NOT NULL,
  input_snapshot jsonb NOT NULL,
  output_json jsonb,
  schema_version text NOT NULL,
  error_code text,
  request_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  report_id uuid,
  purchase_order_id uuid,
  payroll_line_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, requested_by,request_id),
  CHECK(num_nonnulls(report_id,purchase_order_id,payroll_line_id)<=1)
);

CREATE TABLE erp.ai_run_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  purpose text NOT NULL CHECK (purpose IN ('input','output')),
  ai_run_id uuid NOT NULL,
  file_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, ai_run_id,file_id,purpose)
);

CREATE TABLE erp.approval_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  resource_type text NOT NULL,
  version_no integer NOT NULL CHECK(version_no>0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  conditions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code,version_no)
);

CREATE TABLE erp.approval_policy_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  sequence integer NOT NULL CHECK(sequence>0),
  min_approvals integer NOT NULL DEFAULT 1 CHECK(min_approvals>0),
  amount_limit numeric(20,2) CHECK(amount_limit>=0),
  exclude_submitter boolean NOT NULL DEFAULT true,
  policy_id uuid NOT NULL,
  approver_role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, policy_id,sequence)
);

CREATE TABLE erp.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  policy_snapshot jsonb NOT NULL,
  resource_version integer NOT NULL CHECK(resource_version>0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  submitted_by text NOT NULL REFERENCES public."user"(id),
  policy_id uuid NOT NULL,
  purchase_order_id uuid,
  sales_order_id uuid,
  quotation_revision_id uuid,
  contract_id uuid,
  acceptance_id uuid,
  stock_document_id uuid,
  payment_id uuid,
  expense_claim_id uuid,
  payroll_run_id uuid,
  work_report_id uuid,
  open_item_adjustment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  CHECK(num_nonnulls(purchase_order_id,sales_order_id,quotation_revision_id,contract_id,acceptance_id,stock_document_id,payment_id,expense_claim_id,payroll_run_id,work_report_id,open_item_adjustment_id)=1)
);

CREATE TABLE erp.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  step_sequence integer NOT NULL CHECK(step_sequence>0),
  decided_by text NOT NULL REFERENCES public."user"(id),
  decision text NOT NULL CHECK (decision IN ('approve','reject')),
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, request_id,step_sequence,decided_by)
);

CREATE TABLE erp.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  actor_user_id text,
  actor_kind text NOT NULL CHECK (actor_kind IN ('user','system')),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  request_id uuid NOT NULL,
  before_redacted jsonb,
  after_redacted jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  actor_user_id text NOT NULL REFERENCES public."user"(id),
  operation text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  result_id text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, actor_user_id,operation,key)
);

CREATE TABLE erp.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id)
);

CREATE TABLE erp.number_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  document_type text NOT NULL,
  period_key text NOT NULL,
  next_value bigint NOT NULL DEFAULT 1 CHECK(next_value>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, document_type,period_key)
);

CREATE TABLE erp.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, key)
);

CREATE TABLE iam.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  resource text NOT NULL,
  action text NOT NULL,
  description text NOT NULL,
  supported_scopes text[] NOT NULL,
  supports_amount_limit boolean NOT NULL DEFAULT false,
  is_sensitive boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(resource,action),
  CHECK(key=resource||'.'||action),
  CHECK(cardinality(supported_scopes)>0 AND supported_scopes <@ ARRAY['ORG','OWN','ASSIGNED','TEAM','DEPARTMENT','SELECTED']::text[])
);

CREATE TABLE iam.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, code)
);

CREATE TABLE iam.role_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  permission_id uuid NOT NULL REFERENCES iam.permissions(id),
  scope_kind text NOT NULL CHECK (scope_kind IN ('ORG','OWN','ASSIGNED','TEAM','DEPARTMENT','SELECTED')),
  amount_limit numeric(20,2) CHECK(amount_limit>=0),
  currency text,
  role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, role_id,permission_id,scope_kind),
  CHECK((amount_limit IS NULL AND currency IS NULL) OR (amount_limit IS NOT NULL AND currency IS NOT NULL AND currency ~ '^[A-Z]{3}$'))
);

CREATE TABLE iam.grant_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  grant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, grant_id,project_id)
);

CREATE TABLE iam.grant_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  grant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, grant_id,warehouse_id)
);

CREATE TABLE iam.grant_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  grant_id uuid NOT NULL,
  department_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, grant_id,department_id)
);

CREATE TABLE iam.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  assigned_by text NOT NULL REFERENCES public."user"(id),
  reason text NOT NULL,
  membership_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, membership_id,role_id,valid_from)
);

CREATE TABLE iam.role_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  requested_by text NOT NULL REFERENCES public."user"(id),
  change_kind text NOT NULL,
  expected_policy_version bigint NOT NULL,
  proposed_change jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','applied')),
  reviewed_by text REFERENCES public."user"(id),
  reviewed_at timestamptz,
  role_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  CHECK(reviewed_by IS NULL OR reviewed_by<>requested_by)
);

CREATE TABLE iam.permission_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_id uuid NOT NULL REFERENCES iam.permissions(id),
  required_permission_id uuid NOT NULL REFERENCES iam.permissions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(permission_id,required_permission_id),
  CHECK(permission_id<>required_permission_id)
);

CREATE TABLE iam.resource_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  resource text NOT NULL,
  allowed_field_keys text[] NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(resource,key)
);

CREATE TABLE iam.role_read_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id),
  resource text NOT NULL,
  projection_key text NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text REFERENCES public."user"(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text REFERENCES public."user"(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(organization_id,id),
  UNIQUE (organization_id, role_id,resource,projection_key),
  FOREIGN KEY(resource,projection_key) REFERENCES iam.resource_projections(resource,key)
);
ALTER TABLE erp.departments ADD FOREIGN KEY(organization_id,parent_id) REFERENCES erp.departments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.departments(organization_id,parent_id);
ALTER TABLE erp.teams ADD FOREIGN KEY(organization_id,department_id) REFERENCES erp.departments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.teams(organization_id,department_id);
ALTER TABLE erp.employees ADD FOREIGN KEY(organization_id,membership_id) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.employees(organization_id,membership_id);
ALTER TABLE erp.employees ADD FOREIGN KEY(organization_id,department_id) REFERENCES erp.departments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.employees(organization_id,department_id);
ALTER TABLE erp.team_members ADD FOREIGN KEY(organization_id,team_id) REFERENCES erp.teams(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.team_members(organization_id,team_id);
ALTER TABLE erp.team_members ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.team_members(organization_id,employee_id);
ALTER TABLE erp.employee_private_profiles ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.employee_private_profiles(organization_id,employee_id);
ALTER TABLE erp.partners ADD FOREIGN KEY(organization_id,owner_membership_id) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.partners(organization_id,owner_membership_id);
ALTER TABLE erp.partner_contacts ADD FOREIGN KEY(organization_id,partner_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.partner_contacts(organization_id,partner_id);
ALTER TABLE erp.partner_terms ADD FOREIGN KEY(organization_id,partner_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.partner_terms(organization_id,partner_id);
ALTER TABLE erp.partner_activities ADD FOREIGN KEY(organization_id,partner_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.partner_activities(organization_id,partner_id);
ALTER TABLE erp.partner_activities ADD FOREIGN KEY(organization_id,owner_membership_id) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.partner_activities(organization_id,owner_membership_id);
ALTER TABLE erp.item_categories ADD FOREIGN KEY(organization_id,parent_id) REFERENCES erp.item_categories(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.item_categories(organization_id,parent_id);
ALTER TABLE erp.items ADD FOREIGN KEY(organization_id,category_id) REFERENCES erp.item_categories(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.items(organization_id,category_id);
ALTER TABLE erp.items ADD FOREIGN KEY(organization_id,base_unit_id) REFERENCES erp.units(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.items(organization_id,base_unit_id);
ALTER TABLE erp.item_unit_conversions ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.item_unit_conversions(organization_id,item_id);
ALTER TABLE erp.item_unit_conversions ADD FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.item_unit_conversions(organization_id,unit_id);
ALTER TABLE erp.supplier_prices ADD FOREIGN KEY(organization_id,partner_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.supplier_prices(organization_id,partner_id);
ALTER TABLE erp.supplier_prices ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.supplier_prices(organization_id,item_id);
ALTER TABLE erp.supplier_prices ADD FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.supplier_prices(organization_id,unit_id);
ALTER TABLE erp.warehouses ADD FOREIGN KEY(organization_id,vehicle_id) REFERENCES erp.vehicles(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.warehouses(organization_id,vehicle_id);
ALTER TABLE erp.warehouse_members ADD FOREIGN KEY(organization_id,warehouse_id) REFERENCES erp.warehouses(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.warehouse_members(organization_id,warehouse_id);
ALTER TABLE erp.warehouse_members ADD FOREIGN KEY(organization_id,membership_id) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.warehouse_members(organization_id,membership_id);
ALTER TABLE erp.warehouse_item_settings ADD FOREIGN KEY(organization_id,warehouse_id) REFERENCES erp.warehouses(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.warehouse_item_settings(organization_id,warehouse_id);
ALTER TABLE erp.warehouse_item_settings ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.warehouse_item_settings(organization_id,item_id);
ALTER TABLE erp.project_template_versions ADD FOREIGN KEY(organization_id,template_id) REFERENCES erp.project_templates(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.project_template_versions(organization_id,template_id);
ALTER TABLE erp.projects ADD FOREIGN KEY(organization_id,customer_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.projects(organization_id,customer_id);
ALTER TABLE erp.projects ADD FOREIGN KEY(organization_id,manager_membership_id) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.projects(organization_id,manager_membership_id);
ALTER TABLE erp.projects ADD FOREIGN KEY(organization_id,template_version_id) REFERENCES erp.project_template_versions(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.projects(organization_id,template_version_id);
ALTER TABLE erp.project_members ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.project_members(organization_id,project_id);
ALTER TABLE erp.project_members ADD FOREIGN KEY(organization_id,membership_id) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.project_members(organization_id,membership_id);
ALTER TABLE erp.tasks ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.tasks(organization_id,project_id);
ALTER TABLE erp.tasks ADD FOREIGN KEY(organization_id,parent_id) REFERENCES erp.tasks(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.tasks(organization_id,parent_id);
ALTER TABLE erp.task_assignees ADD FOREIGN KEY(organization_id,task_id) REFERENCES erp.tasks(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.task_assignees(organization_id,task_id);
ALTER TABLE erp.task_assignees ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.task_assignees(organization_id,employee_id);
ALTER TABLE erp.task_assignees ADD FOREIGN KEY(organization_id,assignment_source_team_id) REFERENCES erp.teams(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.task_assignees(organization_id,assignment_source_team_id);
ALTER TABLE erp.report_template_versions ADD FOREIGN KEY(organization_id,template_id) REFERENCES erp.report_templates(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.report_template_versions(organization_id,template_id);
ALTER TABLE erp.report_template_bindings ADD FOREIGN KEY(organization_id,template_id) REFERENCES erp.report_templates(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.report_template_bindings(organization_id,template_id);
ALTER TABLE erp.report_template_bindings ADD FOREIGN KEY(organization_id,role_id) REFERENCES iam.roles(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.report_template_bindings(organization_id,role_id);
ALTER TABLE erp.work_reports ADD FOREIGN KEY(organization_id,task_id) REFERENCES erp.tasks(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.work_reports(organization_id,task_id);
ALTER TABLE erp.work_reports ADD FOREIGN KEY(organization_id,author_employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.work_reports(organization_id,author_employee_id);
ALTER TABLE erp.work_reports ADD FOREIGN KEY(organization_id,template_version_id) REFERENCES erp.report_template_versions(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.work_reports(organization_id,template_version_id);
ALTER TABLE erp.report_labor_entries ADD FOREIGN KEY(organization_id,report_id) REFERENCES erp.work_reports(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.report_labor_entries(organization_id,report_id);
ALTER TABLE erp.report_labor_entries ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.report_labor_entries(organization_id,employee_id);
ALTER TABLE erp.report_material_usage ADD FOREIGN KEY(organization_id,report_id) REFERENCES erp.work_reports(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.report_material_usage(organization_id,report_id);
ALTER TABLE erp.report_material_usage ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.report_material_usage(organization_id,item_id);
ALTER TABLE erp.production_orders ADD FOREIGN KEY(organization_id,task_id) REFERENCES erp.tasks(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.production_orders(organization_id,task_id);
ALTER TABLE erp.production_orders ADD FOREIGN KEY(organization_id,output_item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.production_orders(organization_id,output_item_id);
ALTER TABLE erp.production_orders ADD FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.production_orders(organization_id,unit_id);
ALTER TABLE erp.production_orders ADD FOREIGN KEY(organization_id,team_id) REFERENCES erp.teams(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.production_orders(organization_id,team_id);
ALTER TABLE erp.production_materials ADD FOREIGN KEY(organization_id,production_order_id) REFERENCES erp.production_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.production_materials(organization_id,production_order_id);
ALTER TABLE erp.production_materials ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.production_materials(organization_id,item_id);
ALTER TABLE erp.production_outputs ADD FOREIGN KEY(organization_id,production_order_id) REFERENCES erp.production_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.production_outputs(organization_id,production_order_id);
ALTER TABLE erp.production_outputs ADD FOREIGN KEY(organization_id,work_report_id) REFERENCES erp.work_reports(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.production_outputs(organization_id,work_report_id);
ALTER TABLE erp.quotations ADD FOREIGN KEY(organization_id,customer_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.quotations(organization_id,customer_id);
ALTER TABLE erp.quotations ADD FOREIGN KEY(organization_id,owner_membership_id) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.quotations(organization_id,owner_membership_id);
ALTER TABLE erp.quotations ADD FOREIGN KEY(organization_id,accepted_revision_id) REFERENCES erp.quotation_revisions(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.quotations(organization_id,accepted_revision_id);
ALTER TABLE erp.quotation_revisions ADD FOREIGN KEY(organization_id,quotation_id) REFERENCES erp.quotations(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.quotation_revisions(organization_id,quotation_id);
ALTER TABLE erp.quotation_lines ADD FOREIGN KEY(organization_id,revision_id) REFERENCES erp.quotation_revisions(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.quotation_lines(organization_id,revision_id);
ALTER TABLE erp.quotation_lines ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.quotation_lines(organization_id,item_id);
ALTER TABLE erp.quotation_lines ADD FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.quotation_lines(organization_id,unit_id);
ALTER TABLE erp.estimate_components ADD FOREIGN KEY(organization_id,quotation_line_id) REFERENCES erp.quotation_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.estimate_components(organization_id,quotation_line_id);
ALTER TABLE erp.estimate_components ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.estimate_components(organization_id,item_id);
ALTER TABLE erp.estimate_components ADD FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.estimate_components(organization_id,unit_id);
ALTER TABLE erp.sales_orders ADD FOREIGN KEY(organization_id,customer_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.sales_orders(organization_id,customer_id);
ALTER TABLE erp.sales_orders ADD FOREIGN KEY(organization_id,quotation_revision_id) REFERENCES erp.quotation_revisions(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.sales_orders(organization_id,quotation_revision_id);
ALTER TABLE erp.sales_orders ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.sales_orders(organization_id,project_id);
ALTER TABLE erp.sales_orders ADD FOREIGN KEY(organization_id,owner_membership_id) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.sales_orders(organization_id,owner_membership_id);
ALTER TABLE erp.sales_order_lines ADD FOREIGN KEY(organization_id,sales_order_id) REFERENCES erp.sales_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.sales_order_lines(organization_id,sales_order_id);
ALTER TABLE erp.sales_order_lines ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.sales_order_lines(organization_id,item_id);
ALTER TABLE erp.sales_order_lines ADD FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.sales_order_lines(organization_id,unit_id);
ALTER TABLE erp.purchase_orders ADD FOREIGN KEY(organization_id,supplier_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.purchase_orders(organization_id,supplier_id);
ALTER TABLE erp.purchase_orders ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.purchase_orders(organization_id,project_id);
ALTER TABLE erp.purchase_orders ADD FOREIGN KEY(organization_id,requested_by) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.purchase_orders(organization_id,requested_by);
ALTER TABLE erp.purchase_order_lines ADD FOREIGN KEY(organization_id,purchase_order_id) REFERENCES erp.purchase_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.purchase_order_lines(organization_id,purchase_order_id);
ALTER TABLE erp.purchase_order_lines ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.purchase_order_lines(organization_id,item_id);
ALTER TABLE erp.purchase_order_lines ADD FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.purchase_order_lines(organization_id,unit_id);
ALTER TABLE erp.contracts ADD FOREIGN KEY(organization_id,customer_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.contracts(organization_id,customer_id);
ALTER TABLE erp.contracts ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.contracts(organization_id,project_id);
ALTER TABLE erp.contracts ADD FOREIGN KEY(organization_id,quotation_revision_id) REFERENCES erp.quotation_revisions(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.contracts(organization_id,quotation_revision_id);
ALTER TABLE erp.contract_milestones ADD FOREIGN KEY(organization_id,contract_id) REFERENCES erp.contracts(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.contract_milestones(organization_id,contract_id);
ALTER TABLE erp.contract_milestones ADD FOREIGN KEY(organization_id,acceptance_id) REFERENCES erp.acceptances(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.contract_milestones(organization_id,acceptance_id);
ALTER TABLE erp.stock_lots ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_lots(organization_id,item_id);
ALTER TABLE erp.stock_lots ADD FOREIGN KEY(organization_id,parent_lot_id) REFERENCES erp.stock_lots(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_lots(organization_id,parent_lot_id);
ALTER TABLE erp.stock_documents ADD FOREIGN KEY(organization_id,source_warehouse_id) REFERENCES erp.warehouses(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_documents(organization_id,source_warehouse_id);
ALTER TABLE erp.stock_documents ADD FOREIGN KEY(organization_id,destination_warehouse_id) REFERENCES erp.warehouses(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_documents(organization_id,destination_warehouse_id);
ALTER TABLE erp.stock_documents ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_documents(organization_id,project_id);
ALTER TABLE erp.stock_documents ADD FOREIGN KEY(organization_id,production_order_id) REFERENCES erp.production_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_documents(organization_id,production_order_id);
ALTER TABLE erp.stock_document_lines ADD FOREIGN KEY(organization_id,document_id) REFERENCES erp.stock_documents(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_document_lines(organization_id,document_id);
ALTER TABLE erp.stock_document_lines ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_document_lines(organization_id,item_id);
ALTER TABLE erp.stock_document_lines ADD FOREIGN KEY(organization_id,lot_id) REFERENCES erp.stock_lots(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_document_lines(organization_id,lot_id);
ALTER TABLE erp.stock_document_lines ADD FOREIGN KEY(organization_id,unit_id) REFERENCES erp.units(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_document_lines(organization_id,unit_id);
ALTER TABLE erp.stock_document_lines ADD FOREIGN KEY(organization_id,purchase_line_id) REFERENCES erp.purchase_order_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_document_lines(organization_id,purchase_line_id);
ALTER TABLE erp.stock_document_lines ADD FOREIGN KEY(organization_id,sales_line_id) REFERENCES erp.sales_order_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_document_lines(organization_id,sales_line_id);
ALTER TABLE erp.stock_document_lines ADD FOREIGN KEY(organization_id,reverses_line_id) REFERENCES erp.stock_document_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_document_lines(organization_id,reverses_line_id);
ALTER TABLE erp.stock_postings ADD FOREIGN KEY(organization_id,document_id) REFERENCES erp.stock_documents(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_postings(organization_id,document_id);
ALTER TABLE erp.stock_movements ADD FOREIGN KEY(organization_id,posting_id) REFERENCES erp.stock_postings(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_movements(organization_id,posting_id);
ALTER TABLE erp.stock_movements ADD FOREIGN KEY(organization_id,document_id) REFERENCES erp.stock_documents(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_movements(organization_id,document_id);
ALTER TABLE erp.stock_movements ADD FOREIGN KEY(organization_id,document_line_id) REFERENCES erp.stock_document_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_movements(organization_id,document_line_id);
ALTER TABLE erp.stock_movements ADD FOREIGN KEY(organization_id,warehouse_id) REFERENCES erp.warehouses(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_movements(organization_id,warehouse_id);
ALTER TABLE erp.stock_movements ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_movements(organization_id,item_id);
ALTER TABLE erp.stock_movements ADD FOREIGN KEY(organization_id,lot_id) REFERENCES erp.stock_lots(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_movements(organization_id,lot_id);
ALTER TABLE erp.stock_balances ADD FOREIGN KEY(organization_id,warehouse_id) REFERENCES erp.warehouses(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_balances(organization_id,warehouse_id);
ALTER TABLE erp.stock_balances ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_balances(organization_id,item_id);
ALTER TABLE erp.stock_balances ADD FOREIGN KEY(organization_id,lot_id) REFERENCES erp.stock_lots(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_balances(organization_id,lot_id);
ALTER TABLE erp.stock_reservations ADD FOREIGN KEY(organization_id,sales_line_id) REFERENCES erp.sales_order_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_reservations(organization_id,sales_line_id);
ALTER TABLE erp.stock_reservations ADD FOREIGN KEY(organization_id,production_material_id) REFERENCES erp.production_materials(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_reservations(organization_id,production_material_id);
ALTER TABLE erp.stock_reservations ADD FOREIGN KEY(organization_id,warehouse_id) REFERENCES erp.warehouses(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_reservations(organization_id,warehouse_id);
ALTER TABLE erp.stock_reservations ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_reservations(organization_id,item_id);
ALTER TABLE erp.stock_reservations ADD FOREIGN KEY(organization_id,lot_id) REFERENCES erp.stock_lots(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.stock_reservations(organization_id,lot_id);
ALTER TABLE erp.inventory_counts ADD FOREIGN KEY(organization_id,warehouse_id) REFERENCES erp.warehouses(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.inventory_counts(organization_id,warehouse_id);
ALTER TABLE erp.inventory_count_lines ADD FOREIGN KEY(organization_id,count_id) REFERENCES erp.inventory_counts(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.inventory_count_lines(organization_id,count_id);
ALTER TABLE erp.inventory_count_lines ADD FOREIGN KEY(organization_id,item_id) REFERENCES erp.items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.inventory_count_lines(organization_id,item_id);
ALTER TABLE erp.inventory_count_lines ADD FOREIGN KEY(organization_id,lot_id) REFERENCES erp.stock_lots(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.inventory_count_lines(organization_id,lot_id);
ALTER TABLE erp.inventory_count_lines ADD FOREIGN KEY(organization_id,adjustment_line_id) REFERENCES erp.stock_document_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.inventory_count_lines(organization_id,adjustment_line_id);
ALTER TABLE erp.open_items ADD FOREIGN KEY(organization_id,partner_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.open_items(organization_id,partner_id);
ALTER TABLE erp.open_items ADD FOREIGN KEY(organization_id,sales_order_id) REFERENCES erp.sales_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.open_items(organization_id,sales_order_id);
ALTER TABLE erp.open_items ADD FOREIGN KEY(organization_id,purchase_order_id) REFERENCES erp.purchase_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.open_items(organization_id,purchase_order_id);
ALTER TABLE erp.open_items ADD FOREIGN KEY(organization_id,contract_milestone_id) REFERENCES erp.contract_milestones(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.open_items(organization_id,contract_milestone_id);
ALTER TABLE erp.payments ADD FOREIGN KEY(organization_id,cash_account_id) REFERENCES erp.cash_accounts(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payments(organization_id,cash_account_id);
ALTER TABLE erp.payments ADD FOREIGN KEY(organization_id,partner_id) REFERENCES erp.partners(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payments(organization_id,partner_id);
ALTER TABLE erp.payments ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payments(organization_id,employee_id);
ALTER TABLE erp.payments ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payments(organization_id,project_id);
ALTER TABLE erp.open_item_adjustments ADD FOREIGN KEY(organization_id,open_item_id) REFERENCES erp.open_items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.open_item_adjustments(organization_id,open_item_id);
ALTER TABLE erp.open_item_adjustments ADD FOREIGN KEY(organization_id,reverses_id) REFERENCES erp.open_item_adjustments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.open_item_adjustments(organization_id,reverses_id);
ALTER TABLE erp.payment_allocations ADD FOREIGN KEY(organization_id,payment_id) REFERENCES erp.payments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payment_allocations(organization_id,payment_id);
ALTER TABLE erp.payment_allocations ADD FOREIGN KEY(organization_id,open_item_id) REFERENCES erp.open_items(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payment_allocations(organization_id,open_item_id);
ALTER TABLE erp.cash_entries ADD FOREIGN KEY(organization_id,payment_id) REFERENCES erp.payments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.cash_entries(organization_id,payment_id);
ALTER TABLE erp.cash_entries ADD FOREIGN KEY(organization_id,cash_account_id) REFERENCES erp.cash_accounts(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.cash_entries(organization_id,cash_account_id);
ALTER TABLE erp.cash_entries ADD FOREIGN KEY(organization_id,reverses_entry_id) REFERENCES erp.cash_entries(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.cash_entries(organization_id,reverses_entry_id);
ALTER TABLE erp.expense_claims ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.expense_claims(organization_id,employee_id);
ALTER TABLE erp.expense_claims ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.expense_claims(organization_id,project_id);
ALTER TABLE erp.expense_claims ADD FOREIGN KEY(organization_id,trip_id) REFERENCES erp.trips(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.expense_claims(organization_id,trip_id);
ALTER TABLE erp.expense_claims ADD FOREIGN KEY(organization_id,advance_payment_id) REFERENCES erp.payments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.expense_claims(organization_id,advance_payment_id);
ALTER TABLE erp.expense_claim_lines ADD FOREIGN KEY(organization_id,claim_id) REFERENCES erp.expense_claims(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.expense_claim_lines(organization_id,claim_id);
ALTER TABLE erp.expense_claim_lines ADD FOREIGN KEY(organization_id,evidence_id) REFERENCES erp.files(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.expense_claim_lines(organization_id,evidence_id);
ALTER TABLE erp.expense_claim_lines ADD FOREIGN KEY(organization_id,purchase_order_id) REFERENCES erp.purchase_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.expense_claim_lines(organization_id,purchase_order_id);
ALTER TABLE erp.expense_settlements ADD FOREIGN KEY(organization_id,claim_id) REFERENCES erp.expense_claims(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.expense_settlements(organization_id,claim_id);
ALTER TABLE erp.expense_settlements ADD FOREIGN KEY(organization_id,payment_id) REFERENCES erp.payments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.expense_settlements(organization_id,payment_id);
ALTER TABLE erp.project_cost_entries ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.project_cost_entries(organization_id,project_id);
ALTER TABLE erp.project_cost_entries ADD FOREIGN KEY(organization_id,source_stock_movement_id) REFERENCES erp.stock_movements(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.project_cost_entries(organization_id,source_stock_movement_id);
ALTER TABLE erp.project_cost_entries ADD FOREIGN KEY(organization_id,source_labor_entry_id) REFERENCES erp.report_labor_entries(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.project_cost_entries(organization_id,source_labor_entry_id);
ALTER TABLE erp.project_cost_entries ADD FOREIGN KEY(organization_id,source_expense_line_id) REFERENCES erp.expense_claim_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.project_cost_entries(organization_id,source_expense_line_id);
ALTER TABLE erp.project_cost_entries ADD FOREIGN KEY(organization_id,reverses_id) REFERENCES erp.project_cost_entries(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.project_cost_entries(organization_id,reverses_id);
ALTER TABLE erp.trips ADD FOREIGN KEY(organization_id,vehicle_id) REFERENCES erp.vehicles(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.trips(organization_id,vehicle_id);
ALTER TABLE erp.trips ADD FOREIGN KEY(organization_id,driver_employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.trips(organization_id,driver_employee_id);
ALTER TABLE erp.trips ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.trips(organization_id,project_id);
ALTER TABLE erp.trip_stops ADD FOREIGN KEY(organization_id,trip_id) REFERENCES erp.trips(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.trip_stops(organization_id,trip_id);
ALTER TABLE erp.trip_stops ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.trip_stops(organization_id,project_id);
ALTER TABLE erp.trip_stock_documents ADD FOREIGN KEY(organization_id,trip_id) REFERENCES erp.trips(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.trip_stock_documents(organization_id,trip_id);
ALTER TABLE erp.trip_stock_documents ADD FOREIGN KEY(organization_id,stock_document_id) REFERENCES erp.stock_documents(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.trip_stock_documents(organization_id,stock_document_id);
ALTER TABLE erp.field_events ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.field_events(organization_id,employee_id);
ALTER TABLE erp.field_events ADD FOREIGN KEY(organization_id,task_id) REFERENCES erp.tasks(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.field_events(organization_id,task_id);
ALTER TABLE erp.field_events ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.field_events(organization_id,project_id);
ALTER TABLE erp.acceptances ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.acceptances(organization_id,project_id);
ALTER TABLE erp.acceptances ADD FOREIGN KEY(organization_id,task_id) REFERENCES erp.tasks(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.acceptances(organization_id,task_id);
ALTER TABLE erp.acceptances ADD FOREIGN KEY(organization_id,signature_file_id) REFERENCES erp.files(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.acceptances(organization_id,signature_file_id);
ALTER TABLE erp.acceptances ADD FOREIGN KEY(organization_id,document_file_id) REFERENCES erp.files(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.acceptances(organization_id,document_file_id);
ALTER TABLE erp.attendance_entries ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.attendance_entries(organization_id,employee_id);
ALTER TABLE erp.attendance_entries ADD FOREIGN KEY(organization_id,field_in_id) REFERENCES erp.field_events(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.attendance_entries(organization_id,field_in_id);
ALTER TABLE erp.attendance_entries ADD FOREIGN KEY(organization_id,field_out_id) REFERENCES erp.field_events(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.attendance_entries(organization_id,field_out_id);
ALTER TABLE erp.salary_terms ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.salary_terms(organization_id,employee_id);
ALTER TABLE erp.payroll_runs ADD FOREIGN KEY(organization_id,period_id) REFERENCES erp.attendance_periods(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payroll_runs(organization_id,period_id);
ALTER TABLE erp.payroll_lines ADD FOREIGN KEY(organization_id,run_id) REFERENCES erp.payroll_runs(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payroll_lines(organization_id,run_id);
ALTER TABLE erp.payroll_lines ADD FOREIGN KEY(organization_id,employee_id) REFERENCES erp.employees(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payroll_lines(organization_id,employee_id);
ALTER TABLE erp.payroll_lines ADD FOREIGN KEY(organization_id,ai_run_id) REFERENCES erp.ai_runs(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payroll_lines(organization_id,ai_run_id);
ALTER TABLE erp.payroll_payments ADD FOREIGN KEY(organization_id,payroll_line_id) REFERENCES erp.payroll_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payroll_payments(organization_id,payroll_line_id);
ALTER TABLE erp.payroll_payments ADD FOREIGN KEY(organization_id,payment_id) REFERENCES erp.payments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.payroll_payments(organization_id,payment_id);
ALTER TABLE erp.record_files ADD FOREIGN KEY(organization_id,file_id) REFERENCES erp.files(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.record_files(organization_id,file_id);
ALTER TABLE erp.record_files ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.record_files(organization_id,project_id);
ALTER TABLE erp.record_files ADD FOREIGN KEY(organization_id,report_id) REFERENCES erp.work_reports(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.record_files(organization_id,report_id);
ALTER TABLE erp.record_files ADD FOREIGN KEY(organization_id,purchase_order_id) REFERENCES erp.purchase_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.record_files(organization_id,purchase_order_id);
ALTER TABLE erp.record_files ADD FOREIGN KEY(organization_id,expense_line_id) REFERENCES erp.expense_claim_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.record_files(organization_id,expense_line_id);
ALTER TABLE erp.record_files ADD FOREIGN KEY(organization_id,acceptance_id) REFERENCES erp.acceptances(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.record_files(organization_id,acceptance_id);
ALTER TABLE erp.ai_runs ADD FOREIGN KEY(organization_id,requested_by) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.ai_runs(organization_id,requested_by);
ALTER TABLE erp.ai_runs ADD FOREIGN KEY(organization_id,report_id) REFERENCES erp.work_reports(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.ai_runs(organization_id,report_id);
ALTER TABLE erp.ai_runs ADD FOREIGN KEY(organization_id,purchase_order_id) REFERENCES erp.purchase_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.ai_runs(organization_id,purchase_order_id);
ALTER TABLE erp.ai_runs ADD FOREIGN KEY(organization_id,payroll_line_id) REFERENCES erp.payroll_lines(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.ai_runs(organization_id,payroll_line_id);
ALTER TABLE erp.ai_run_files ADD FOREIGN KEY(organization_id,ai_run_id) REFERENCES erp.ai_runs(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.ai_run_files(organization_id,ai_run_id);
ALTER TABLE erp.ai_run_files ADD FOREIGN KEY(organization_id,file_id) REFERENCES erp.files(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.ai_run_files(organization_id,file_id);
ALTER TABLE erp.approval_policy_steps ADD FOREIGN KEY(organization_id,policy_id) REFERENCES erp.approval_policies(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_policy_steps(organization_id,policy_id);
ALTER TABLE erp.approval_policy_steps ADD FOREIGN KEY(organization_id,approver_role_id) REFERENCES iam.roles(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_policy_steps(organization_id,approver_role_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,policy_id) REFERENCES erp.approval_policies(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,policy_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,purchase_order_id) REFERENCES erp.purchase_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,purchase_order_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,sales_order_id) REFERENCES erp.sales_orders(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,sales_order_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,quotation_revision_id) REFERENCES erp.quotation_revisions(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,quotation_revision_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,contract_id) REFERENCES erp.contracts(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,contract_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,acceptance_id) REFERENCES erp.acceptances(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,acceptance_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,stock_document_id) REFERENCES erp.stock_documents(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,stock_document_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,payment_id) REFERENCES erp.payments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,payment_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,expense_claim_id) REFERENCES erp.expense_claims(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,expense_claim_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,payroll_run_id) REFERENCES erp.payroll_runs(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,payroll_run_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,work_report_id) REFERENCES erp.work_reports(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,work_report_id);
ALTER TABLE erp.approval_requests ADD FOREIGN KEY(organization_id,open_item_adjustment_id) REFERENCES erp.open_item_adjustments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_requests(organization_id,open_item_adjustment_id);
ALTER TABLE erp.approval_decisions ADD FOREIGN KEY(organization_id,request_id) REFERENCES erp.approval_requests(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON erp.approval_decisions(organization_id,request_id);
ALTER TABLE iam.role_grants ADD FOREIGN KEY(organization_id,role_id) REFERENCES iam.roles(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.role_grants(organization_id,role_id);
ALTER TABLE iam.grant_projects ADD FOREIGN KEY(organization_id,grant_id) REFERENCES iam.role_grants(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.grant_projects(organization_id,grant_id);
ALTER TABLE iam.grant_projects ADD FOREIGN KEY(organization_id,project_id) REFERENCES erp.projects(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.grant_projects(organization_id,project_id);
ALTER TABLE iam.grant_warehouses ADD FOREIGN KEY(organization_id,grant_id) REFERENCES iam.role_grants(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.grant_warehouses(organization_id,grant_id);
ALTER TABLE iam.grant_warehouses ADD FOREIGN KEY(organization_id,warehouse_id) REFERENCES erp.warehouses(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.grant_warehouses(organization_id,warehouse_id);
ALTER TABLE iam.grant_departments ADD FOREIGN KEY(organization_id,grant_id) REFERENCES iam.role_grants(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.grant_departments(organization_id,grant_id);
ALTER TABLE iam.grant_departments ADD FOREIGN KEY(organization_id,department_id) REFERENCES erp.departments(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.grant_departments(organization_id,department_id);
ALTER TABLE iam.user_roles ADD FOREIGN KEY(organization_id,membership_id) REFERENCES erp.memberships(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.user_roles(organization_id,membership_id);
ALTER TABLE iam.user_roles ADD FOREIGN KEY(organization_id,role_id) REFERENCES iam.roles(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.user_roles(organization_id,role_id);
ALTER TABLE iam.role_change_requests ADD FOREIGN KEY(organization_id,role_id) REFERENCES iam.roles(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.role_change_requests(organization_id,role_id);
ALTER TABLE iam.role_read_projections ADD FOREIGN KEY(organization_id,role_id) REFERENCES iam.roles(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX ON iam.role_read_projections(organization_id,role_id);
CREATE INDEX ON erp.memberships(organization_id,created_at DESC,id);
CREATE INDEX ON erp.departments(organization_id,created_at DESC,id);
CREATE INDEX ON erp.teams(organization_id,created_at DESC,id);
CREATE INDEX ON erp.employees(organization_id,created_at DESC,id);
CREATE INDEX ON erp.team_members(organization_id,created_at DESC,id);
CREATE INDEX ON erp.employee_private_profiles(organization_id,created_at DESC,id);
CREATE INDEX ON erp.partners(organization_id,created_at DESC,id);
CREATE INDEX ON erp.partner_contacts(organization_id,created_at DESC,id);
CREATE INDEX ON erp.partner_terms(organization_id,created_at DESC,id);
CREATE INDEX ON erp.partner_activities(organization_id,created_at DESC,id);
CREATE INDEX ON erp.units(organization_id,created_at DESC,id);
CREATE INDEX ON erp.item_categories(organization_id,created_at DESC,id);
CREATE INDEX ON erp.items(organization_id,created_at DESC,id);
CREATE INDEX ON erp.item_unit_conversions(organization_id,created_at DESC,id);
CREATE INDEX ON erp.supplier_prices(organization_id,created_at DESC,id);
CREATE INDEX ON erp.vehicles(organization_id,created_at DESC,id);
CREATE INDEX ON erp.warehouses(organization_id,created_at DESC,id);
CREATE INDEX ON erp.warehouse_members(organization_id,created_at DESC,id);
CREATE INDEX ON erp.warehouse_item_settings(organization_id,created_at DESC,id);
CREATE INDEX ON erp.project_templates(organization_id,created_at DESC,id);
CREATE INDEX ON erp.project_template_versions(organization_id,created_at DESC,id);
CREATE INDEX ON erp.projects(organization_id,created_at DESC,id);
CREATE INDEX ON erp.project_members(organization_id,created_at DESC,id);
CREATE INDEX ON erp.tasks(organization_id,created_at DESC,id);
CREATE INDEX ON erp.task_assignees(organization_id,created_at DESC,id);
CREATE INDEX ON erp.report_templates(organization_id,created_at DESC,id);
CREATE INDEX ON erp.report_template_versions(organization_id,created_at DESC,id);
CREATE INDEX ON erp.report_template_bindings(organization_id,created_at DESC,id);
CREATE INDEX ON erp.work_reports(organization_id,created_at DESC,id);
CREATE INDEX ON erp.report_labor_entries(organization_id,created_at DESC,id);
CREATE INDEX ON erp.report_material_usage(organization_id,created_at DESC,id);
CREATE INDEX ON erp.production_orders(organization_id,created_at DESC,id);
CREATE INDEX ON erp.production_materials(organization_id,created_at DESC,id);
CREATE INDEX ON erp.production_outputs(organization_id,created_at DESC,id);
CREATE INDEX ON erp.quotations(organization_id,created_at DESC,id);
CREATE INDEX ON erp.quotation_revisions(organization_id,created_at DESC,id);
CREATE INDEX ON erp.quotation_lines(organization_id,created_at DESC,id);
CREATE INDEX ON erp.estimate_components(organization_id,created_at DESC,id);
CREATE INDEX ON erp.sales_orders(organization_id,created_at DESC,id);
CREATE INDEX ON erp.sales_order_lines(organization_id,created_at DESC,id);
CREATE INDEX ON erp.purchase_orders(organization_id,created_at DESC,id);
CREATE INDEX ON erp.purchase_order_lines(organization_id,created_at DESC,id);
CREATE INDEX ON erp.contracts(organization_id,created_at DESC,id);
CREATE INDEX ON erp.contract_milestones(organization_id,created_at DESC,id);
CREATE INDEX ON erp.stock_lots(organization_id,created_at DESC,id);
CREATE INDEX ON erp.stock_documents(organization_id,created_at DESC,id);
CREATE INDEX ON erp.stock_document_lines(organization_id,created_at DESC,id);
CREATE INDEX ON erp.stock_postings(organization_id,created_at DESC,id);
CREATE INDEX ON erp.stock_movements(organization_id,created_at DESC,id);
CREATE INDEX ON erp.stock_balances(organization_id,created_at DESC,id);
CREATE INDEX ON erp.stock_reservations(organization_id,created_at DESC,id);
CREATE INDEX ON erp.inventory_counts(organization_id,created_at DESC,id);
CREATE INDEX ON erp.inventory_count_lines(organization_id,created_at DESC,id);
CREATE INDEX ON erp.cash_accounts(organization_id,created_at DESC,id);
CREATE INDEX ON erp.open_items(organization_id,created_at DESC,id);
CREATE INDEX ON erp.payments(organization_id,created_at DESC,id);
CREATE INDEX ON erp.open_item_adjustments(organization_id,created_at DESC,id);
CREATE INDEX ON erp.payment_allocations(organization_id,created_at DESC,id);
CREATE INDEX ON erp.cash_entries(organization_id,created_at DESC,id);
CREATE INDEX ON erp.expense_claims(organization_id,created_at DESC,id);
CREATE INDEX ON erp.expense_claim_lines(organization_id,created_at DESC,id);
CREATE INDEX ON erp.expense_settlements(organization_id,created_at DESC,id);
CREATE INDEX ON erp.project_cost_entries(organization_id,created_at DESC,id);
CREATE INDEX ON erp.period_locks(organization_id,created_at DESC,id);
CREATE INDEX ON erp.trips(organization_id,created_at DESC,id);
CREATE INDEX ON erp.trip_stops(organization_id,created_at DESC,id);
CREATE INDEX ON erp.trip_stock_documents(organization_id,created_at DESC,id);
CREATE INDEX ON erp.field_events(organization_id,created_at DESC,id);
CREATE INDEX ON erp.acceptances(organization_id,created_at DESC,id);
CREATE INDEX ON erp.attendance_entries(organization_id,created_at DESC,id);
CREATE INDEX ON erp.attendance_periods(organization_id,created_at DESC,id);
CREATE INDEX ON erp.salary_terms(organization_id,created_at DESC,id);
CREATE INDEX ON erp.payroll_runs(organization_id,created_at DESC,id);
CREATE INDEX ON erp.payroll_lines(organization_id,created_at DESC,id);
CREATE INDEX ON erp.payroll_payments(organization_id,created_at DESC,id);
CREATE INDEX ON erp.files(organization_id,created_at DESC,id);
CREATE INDEX ON erp.record_files(organization_id,created_at DESC,id);
CREATE INDEX ON erp.ai_runs(organization_id,created_at DESC,id);
CREATE INDEX ON erp.ai_run_files(organization_id,created_at DESC,id);
CREATE INDEX ON erp.approval_policies(organization_id,created_at DESC,id);
CREATE INDEX ON erp.approval_policy_steps(organization_id,created_at DESC,id);
CREATE INDEX ON erp.approval_requests(organization_id,created_at DESC,id);
CREATE INDEX ON erp.approval_decisions(organization_id,created_at DESC,id);
CREATE INDEX ON erp.audit_events(organization_id,created_at DESC,id);
CREATE INDEX ON erp.idempotency_keys(organization_id,created_at DESC,id);
CREATE INDEX ON erp.outbox_events(organization_id,created_at DESC,id);
CREATE INDEX ON erp.number_sequences(organization_id,created_at DESC,id);
CREATE INDEX ON erp.company_settings(organization_id,created_at DESC,id);
CREATE INDEX ON iam.roles(organization_id,created_at DESC,id);
CREATE INDEX ON iam.role_grants(organization_id,created_at DESC,id);
CREATE INDEX ON iam.grant_projects(organization_id,created_at DESC,id);
CREATE INDEX ON iam.grant_warehouses(organization_id,created_at DESC,id);
CREATE INDEX ON iam.grant_departments(organization_id,created_at DESC,id);
CREATE INDEX ON iam.user_roles(organization_id,created_at DESC,id);
CREATE INDEX ON iam.role_change_requests(organization_id,created_at DESC,id);
CREATE INDEX ON iam.role_read_projections(organization_id,created_at DESC,id);

-- Ensure composite item / lot / posting references cannot drift apart.
ALTER TABLE erp.stock_document_lines ADD FOREIGN KEY(organization_id,lot_id,item_id) REFERENCES erp.stock_lots(organization_id,id,item_id);
ALTER TABLE erp.stock_balances ADD FOREIGN KEY(organization_id,lot_id,item_id) REFERENCES erp.stock_lots(organization_id,id,item_id);
ALTER TABLE erp.stock_reservations ADD FOREIGN KEY(organization_id,lot_id,item_id) REFERENCES erp.stock_lots(organization_id,id,item_id);
ALTER TABLE erp.stock_movements ADD FOREIGN KEY(organization_id,lot_id,item_id) REFERENCES erp.stock_lots(organization_id,id,item_id);
ALTER TABLE erp.inventory_count_lines ADD FOREIGN KEY(organization_id,lot_id,item_id) REFERENCES erp.stock_lots(organization_id,id,item_id);
ALTER TABLE erp.stock_movements ADD FOREIGN KEY(organization_id,posting_id,document_id) REFERENCES erp.stock_postings(organization_id,id,document_id);
ALTER TABLE erp.stock_movements ADD FOREIGN KEY(organization_id,document_line_id,document_id,item_id,lot_id) REFERENCES erp.stock_document_lines(organization_id,id,document_id,item_id,lot_id);
ALTER TABLE erp.quotation_revisions ADD UNIQUE(organization_id,id,quotation_id);
ALTER TABLE erp.quotations ADD FOREIGN KEY(organization_id,accepted_revision_id,id) REFERENCES erp.quotation_revisions(organization_id,id,quotation_id);
CREATE UNIQUE INDEX cash_entry_original_once ON erp.cash_entries(organization_id,payment_id) WHERE reverses_entry_id IS NULL;
CREATE UNIQUE INDEX payroll_effective_period ON erp.payroll_runs(organization_id,period_id) WHERE status IN ('approved','paid');
CREATE UNIQUE INDEX ON erp.open_items(organization_id,sales_order_id,source_sequence) WHERE sales_order_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.open_items(organization_id,purchase_order_id,source_sequence) WHERE purchase_order_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.open_items(organization_id,contract_milestone_id,source_sequence) WHERE contract_milestone_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,purchase_order_id) WHERE status='pending' AND purchase_order_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,sales_order_id) WHERE status='pending' AND sales_order_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,quotation_revision_id) WHERE status='pending' AND quotation_revision_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,contract_id) WHERE status='pending' AND contract_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,acceptance_id) WHERE status='pending' AND acceptance_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,stock_document_id) WHERE status='pending' AND stock_document_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,payment_id) WHERE status='pending' AND payment_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,expense_claim_id) WHERE status='pending' AND expense_claim_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,payroll_run_id) WHERE status='pending' AND payroll_run_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,work_report_id) WHERE status='pending' AND work_report_id IS NOT NULL;
CREATE UNIQUE INDEX ON erp.approval_requests(organization_id,open_item_adjustment_id) WHERE status='pending' AND open_item_adjustment_id IS NOT NULL;
CREATE INDEX ON erp.tasks(organization_id,due_at,id);
CREATE INDEX ON erp.work_reports(organization_id,author_employee_id,work_date);
CREATE INDEX ON erp.work_reports(organization_id,task_id,work_date);
CREATE INDEX ON erp.stock_movements(organization_id,warehouse_id,item_id,posted_at,id);
CREATE INDEX ON erp.open_items(organization_id,partner_id,side,due_date);
ALTER TABLE iam.role_grants ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;
CREATE INDEX ON iam.role_grants(permission_id);
CREATE INDEX ON iam.user_roles(organization_id,membership_id,valid_from,valid_to);

INSERT INTO erp.schema_migrations(name,checksum) VALUES ('002_erp_iam.sql','ba7b685f30cc1a034eef1a1caf0019186431724911a46d1c7972b32b9bc1f822');

-- ===== 003_integrity.sql =====

-- Row-level tenant isolation is defense in depth. This is NOT the application action/scope authorizer.
-- No browser/Supabase anon/authenticated role receives ERP/IAM privileges.
CREATE FUNCTION erp.touch_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.reject_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Append-only table: %', TG_TABLE_NAME USING ERRCODE='23514';
END $$;

CREATE FUNCTION erp.guard_published_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Published version is immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.guard_tree() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cyclic boolean; parent_project uuid;
BEGIN
  PERFORM 1 FROM erp.organizations WHERE id=NEW.organization_id FOR UPDATE;
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  EXECUTE format(
    'WITH RECURSIVE ancestors AS (
       SELECT id,parent_id FROM %I.%I WHERE organization_id=$1 AND id=$2
       UNION
       SELECT p.id,p.parent_id FROM %I.%I p JOIN ancestors a ON p.id=a.parent_id WHERE p.organization_id=$1
     ) SELECT EXISTS(SELECT 1 FROM ancestors WHERE id=$3)',TG_TABLE_SCHEMA,TG_TABLE_NAME,TG_TABLE_SCHEMA,TG_TABLE_NAME)
    INTO cyclic USING NEW.organization_id,NEW.parent_id,NEW.id;
  IF cyclic THEN RAISE EXCEPTION 'Hierarchy cycle' USING ERRCODE='23514'; END IF;
  IF TG_TABLE_NAME='tasks' THEN
    SELECT project_id INTO parent_project FROM erp.tasks WHERE organization_id=NEW.organization_id AND id=NEW.parent_id;
    IF parent_project IS DISTINCT FROM NEW.project_id THEN
      RAISE EXCEPTION 'Parent and child task must share project' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.guard_task_project_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id AND EXISTS(
    SELECT 1 FROM erp.tasks WHERE organization_id=OLD.organization_id AND parent_id=OLD.id
  ) THEN RAISE EXCEPTION 'Cannot move a task with children between projects' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

-- Serialize overlapping assignment/term writes per organization. No extension is required.
CREATE FUNCTION erp.guard_effective_interval() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE predicate text := ''; k text; overlap_found boolean;
BEGIN
  PERFORM 1 FROM erp.organizations WHERE id=NEW.organization_id FOR UPDATE;
  FOREACH k IN ARRAY TG_ARGV LOOP
    predicate := predicate || format(' AND t.%I::text = ($4->>%L)',k,k);
  END LOOP;
  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM %I.%I t WHERE organization_id=$1 AND id<>$2
       AND tstzrange(valid_from,valid_to,''[)'') && tstzrange($3::timestamptz,($4->>''valid_to'')::timestamptz,''[)'') %s)',
    TG_TABLE_SCHEMA,TG_TABLE_NAME,predicate)
    INTO overlap_found USING NEW.organization_id,NEW.id,NEW.valid_from,to_jsonb(NEW);
  IF overlap_found THEN RAISE EXCEPTION 'Overlapping effective interval' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION iam.guard_grant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p iam.permissions%ROWTYPE;
BEGIN
  SELECT * INTO STRICT p FROM iam.permissions WHERE id=NEW.permission_id;
  IF NOT NEW.scope_kind = ANY(p.supported_scopes) THEN
    RAISE EXCEPTION 'Unsupported permission scope' USING ERRCODE='23514';
  END IF;
  IF NEW.amount_limit IS NOT NULL AND NOT p.supports_amount_limit THEN
    RAISE EXCEPTION 'This permission does not support an amount limit' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION iam.assert_selected_grant(p_org uuid,p_grant uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE g iam.role_grants%ROWTYPE; resource_name text; n bigint;
BEGIN
  SELECT * INTO g FROM iam.role_grants WHERE organization_id=p_org AND id=p_grant;
  IF NOT FOUND OR NOT g.is_enabled OR g.scope_kind<>'SELECTED' THEN RETURN; END IF;
  SELECT resource INTO resource_name FROM iam.permissions WHERE id=g.permission_id;
  IF resource_name IN ('inventory','stock_document') THEN
    SELECT count(*) INTO n FROM iam.grant_warehouses WHERE organization_id=p_org AND grant_id=p_grant;
  ELSIF resource_name IN ('employee','attendance') THEN
    SELECT count(*) INTO n FROM iam.grant_departments WHERE organization_id=p_org AND grant_id=p_grant;
  ELSE
    SELECT count(*) INTO n FROM iam.grant_projects WHERE organization_id=p_org AND grant_id=p_grant;
  END IF;
  IF n=0 THEN RAISE EXCEPTION 'Enabled SELECTED grant requires scope bindings' USING ERRCODE='23514'; END IF;
END $$;

CREATE FUNCTION iam.guard_selected_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g iam.role_grants%ROWTYPE; resource_name text;
BEGIN
  SELECT * INTO STRICT g FROM iam.role_grants WHERE organization_id=NEW.organization_id AND id=NEW.grant_id;
  SELECT resource INTO resource_name FROM iam.permissions WHERE id=g.permission_id;
  IF g.scope_kind<>'SELECTED'
    OR (TG_TABLE_NAME='grant_warehouses' AND resource_name NOT IN ('inventory','stock_document'))
    OR (TG_TABLE_NAME='grant_departments' AND resource_name NOT IN ('employee','attendance'))
    OR (TG_TABLE_NAME='grant_projects' AND resource_name NOT IN ('purchase_order','project','contract','production_order','acceptance','project_finance','task','work_report','trip','expense_claim'))
  THEN RAISE EXCEPTION 'Binding does not match grant scope/resource' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION iam.check_selected_after_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='role_grants' THEN
    IF TG_OP<>'DELETE' THEN PERFORM iam.assert_selected_grant(NEW.organization_id,NEW.id); END IF;
  ELSE
    IF TG_OP<>'INSERT' THEN PERFORM iam.assert_selected_grant(OLD.organization_id,OLD.grant_id); END IF;
    IF TG_OP<>'DELETE' THEN PERFORM iam.assert_selected_grant(NEW.organization_id,NEW.grant_id); END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION iam.record_policy_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE org uuid; row_id uuid; actor text;
BEGIN
  IF TG_OP='DELETE' THEN org:=OLD.organization_id; row_id:=OLD.id;
  ELSE org:=NEW.organization_id; row_id:=NEW.id; END IF;
  actor:=nullif(current_setting('app.actor_user_id',true),'');
  UPDATE erp.organizations SET policy_version=policy_version+1 WHERE id=org;
  INSERT INTO erp.audit_events(organization_id,actor_user_id,actor_kind,action,resource_type,resource_id,request_id,before_redacted,after_redacted)
  VALUES(org,actor,CASE WHEN actor IS NULL THEN 'system' ELSE 'user' END,
    'policy.'||lower(TG_OP),TG_TABLE_SCHEMA||'.'||TG_TABLE_NAME,row_id::text,gen_random_uuid(),
    CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) END,CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) END);
  RETURN NULL;
END $$;

CREATE FUNCTION erp.guard_approval_decision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE req erp.approval_requests%ROWTYPE;
BEGIN
  SELECT * INTO STRICT req FROM erp.approval_requests WHERE organization_id=NEW.organization_id AND id=NEW.request_id FOR UPDATE;
  IF req.status<>'pending' OR NEW.decided_by=req.submitted_by THEN
    RAISE EXCEPTION 'Invalid approval state or self-approval' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM erp.approval_policy_steps s WHERE s.organization_id=NEW.organization_id
    AND s.policy_id=req.policy_id AND s.sequence=NEW.step_sequence) THEN
    RAISE EXCEPTION 'Approval step not found' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.guard_stock_line() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text; state text;
BEGIN
  SELECT type,status INTO kind,state FROM erp.stock_documents WHERE organization_id=NEW.organization_id AND id=NEW.document_id FOR UPDATE;
  IF state<>'draft' THEN RAISE EXCEPTION 'Only draft stock lines can change' USING ERRCODE='23514'; END IF;
  IF kind<>'adjustment' AND NEW.qty<=0 THEN RAISE EXCEPTION 'Stock quantity must be positive' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION erp.guard_payment_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pay erp.payments%ROWTYPE; debt erp.open_items%ROWTYPE; allocated numeric;
BEGIN
  PERFORM 1 FROM erp.organizations WHERE id=NEW.organization_id FOR UPDATE;
  SELECT * INTO STRICT pay FROM erp.payments WHERE organization_id=NEW.organization_id AND id=NEW.payment_id FOR UPDATE;
  SELECT * INTO STRICT debt FROM erp.open_items WHERE organization_id=NEW.organization_id AND id=NEW.open_item_id FOR UPDATE;
  IF pay.status IN ('posted','reversed','cancelled') OR pay.partner_id IS DISTINCT FROM debt.partner_id
    OR pay.currency<>debt.currency OR (pay.direction='receipt')<>(debt.side='receivable')
  THEN RAISE EXCEPTION 'Invalid allocation parties, currency, direction or state' USING ERRCODE='23514'; END IF;
  SELECT coalesce(sum(amount),0) INTO allocated FROM erp.payment_allocations
    WHERE organization_id=NEW.organization_id AND payment_id=NEW.payment_id AND id<>NEW.id;
  IF allocated+NEW.amount>pay.amount THEN RAISE EXCEPTION 'Allocation exceeds payment' USING ERRCODE='23514'; END IF;
  -- Open-item balance is checked again under lock when the service posts payment.
  RETURN NEW;
END $$;

CREATE TRIGGER approval_decision_guard BEFORE INSERT ON erp.approval_decisions FOR EACH ROW EXECUTE FUNCTION erp.guard_approval_decision();
CREATE TRIGGER stock_line_guard BEFORE INSERT OR UPDATE ON erp.stock_document_lines FOR EACH ROW EXECUTE FUNCTION erp.guard_stock_line();
CREATE TRIGGER payment_allocation_guard BEFORE INSERT OR UPDATE ON erp.payment_allocations FOR EACH ROW EXECUTE FUNCTION erp.guard_payment_allocation();
CREATE TRIGGER grant_guard BEFORE INSERT OR UPDATE ON iam.role_grants FOR EACH ROW EXECUTE FUNCTION iam.guard_grant();
CREATE TRIGGER task_project_guard BEFORE UPDATE ON erp.tasks FOR EACH ROW EXECUTE FUNCTION erp.guard_task_project_change();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.organizations FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.memberships FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.departments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.teams FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.employees FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.team_members FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.employee_private_profiles FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.partners FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.partner_contacts FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.partner_terms FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.partner_activities FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.units FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.item_categories FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.items FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.item_unit_conversions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.supplier_prices FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.vehicles FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.warehouses FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.warehouse_members FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.warehouse_item_settings FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.project_templates FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.project_template_versions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.projects FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.project_members FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.tasks FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.task_assignees FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_templates FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_template_versions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_template_bindings FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.work_reports FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_labor_entries FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.report_material_usage FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.production_orders FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.production_materials FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.production_outputs FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.quotations FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.quotation_revisions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.quotation_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.estimate_components FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.sales_orders FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.sales_order_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.purchase_orders FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.purchase_order_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.contracts FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.contract_milestones FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_lots FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_documents FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_document_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.stock_postings FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.stock_movements FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_balances FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.stock_reservations FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.inventory_counts FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.inventory_count_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.cash_accounts FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.open_items FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.open_item_adjustments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payment_allocations FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.cash_entries FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.expense_claims FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.expense_claim_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.expense_settlements FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.project_cost_entries FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.period_locks FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.trips FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.trip_stops FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.trip_stock_documents FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.field_events FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.acceptances FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.attendance_entries FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.attendance_periods FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.salary_terms FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payroll_runs FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payroll_lines FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.payroll_payments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.files FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.record_files FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.ai_runs FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.ai_run_files FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.approval_policies FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.approval_policy_steps FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.approval_requests FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.approval_decisions FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON erp.audit_events FOR EACH ROW EXECUTE FUNCTION erp.reject_ledger_mutation();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.idempotency_keys FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.outbox_events FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.number_sequences FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON erp.company_settings FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.permissions FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.roles FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.role_grants FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.grant_projects FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.grant_warehouses FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.grant_departments FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.user_roles FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.role_change_requests FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.permission_dependencies FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.resource_projections FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER touch_version BEFORE UPDATE ON iam.role_read_projections FOR EACH ROW EXECUTE FUNCTION erp.touch_version();
CREATE TRIGGER tree_guard BEFORE INSERT OR UPDATE ON erp.departments FOR EACH ROW EXECUTE FUNCTION erp.guard_tree();
CREATE TRIGGER tree_guard BEFORE INSERT OR UPDATE ON erp.item_categories FOR EACH ROW EXECUTE FUNCTION erp.guard_tree();
CREATE TRIGGER tree_guard BEFORE INSERT OR UPDATE ON erp.tasks FOR EACH ROW EXECUTE FUNCTION erp.guard_tree();
CREATE TRIGGER published_guard BEFORE UPDATE OR DELETE ON erp.project_template_versions FOR EACH ROW EXECUTE FUNCTION erp.guard_published_version();
CREATE TRIGGER published_guard BEFORE UPDATE OR DELETE ON erp.report_template_versions FOR EACH ROW EXECUTE FUNCTION erp.guard_published_version();
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.team_members FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('team_id','employee_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.project_members FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('project_id','membership_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.warehouse_members FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('warehouse_id','membership_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.task_assignees FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('task_id','employee_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.item_unit_conversions FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('item_id','unit_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.supplier_prices FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('partner_id','item_id','unit_id','currency');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON erp.salary_terms FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('employee_id');
CREATE TRIGGER interval_guard BEFORE INSERT OR UPDATE ON iam.user_roles FOR EACH ROW EXECUTE FUNCTION erp.guard_effective_interval('membership_id','role_id');
CREATE CONSTRAINT TRIGGER selected_binding_required AFTER INSERT OR UPDATE OR DELETE ON iam.role_grants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION iam.check_selected_after_change();
CREATE CONSTRAINT TRIGGER selected_binding_required AFTER INSERT OR UPDATE OR DELETE ON iam.grant_projects DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION iam.check_selected_after_change();
CREATE TRIGGER binding_guard BEFORE INSERT OR UPDATE ON iam.grant_projects FOR EACH ROW EXECUTE FUNCTION iam.guard_selected_binding();
CREATE CONSTRAINT TRIGGER selected_binding_required AFTER INSERT OR UPDATE OR DELETE ON iam.grant_warehouses DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION iam.check_selected_after_change();
CREATE TRIGGER binding_guard BEFORE INSERT OR UPDATE ON iam.grant_warehouses FOR EACH ROW EXECUTE FUNCTION iam.guard_selected_binding();
CREATE CONSTRAINT TRIGGER selected_binding_required AFTER INSERT OR UPDATE OR DELETE ON iam.grant_departments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION iam.check_selected_after_change();
CREATE TRIGGER binding_guard BEFORE INSERT OR UPDATE ON iam.grant_departments FOR EACH ROW EXECUTE FUNCTION iam.guard_selected_binding();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.roles FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.role_grants FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.grant_projects FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.grant_warehouses FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.grant_departments FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.user_roles FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON iam.role_read_projections FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.memberships FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.project_members FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.warehouse_members FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.team_members FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();
CREATE TRIGGER policy_changed AFTER INSERT OR UPDATE OR DELETE ON erp.task_assignees FOR EACH ROW EXECUTE FUNCTION iam.record_policy_change();

INSERT INTO erp.schema_migrations(name,checksum) VALUES ('003_integrity.sql','7a3be3cac2a26831007325eac9d0065d8e14652acf8d5c55230b6f40aa46d5aa');

-- ===== 004_seed.sql =====
-- Only configuration is seeded; no users, passwords or operational records.
INSERT INTO erp.organizations(code,name) VALUES ('SIGNAGE','Signage ERP');
INSERT INTO iam.permissions(key,resource,action,description,supported_scopes,supports_amount_limit,is_sensitive) VALUES
('customer.read','customer','read','customer.read',ARRAY['ORG','OWN']::text[],false,false),
('customer.create','customer','create','customer.create',ARRAY['ORG','OWN']::text[],false,false),
('customer.update','customer','update','customer.update',ARRAY['ORG','OWN']::text[],false,false),
('customer.archive','customer','archive','customer.archive',ARRAY['ORG','OWN']::text[],false,false),
('customer.export','customer','export','customer.export',ARRAY['ORG','OWN']::text[],false,false),
('supplier.read','supplier','read','supplier.read',ARRAY['ORG']::text[],false,false),
('supplier.create','supplier','create','supplier.create',ARRAY['ORG']::text[],false,false),
('supplier.update','supplier','update','supplier.update',ARRAY['ORG']::text[],false,false),
('supplier.archive','supplier','archive','supplier.archive',ARRAY['ORG']::text[],false,false),
('supplier.export','supplier','export','supplier.export',ARRAY['ORG']::text[],false,false),
('quotation.read','quotation','read','quotation.read',ARRAY['ORG','OWN']::text[],false,false),
('quotation.create','quotation','create','quotation.create',ARRAY['ORG','OWN']::text[],false,false),
('quotation.update','quotation','update','quotation.update',ARRAY['ORG','OWN']::text[],false,false),
('quotation.submit','quotation','submit','quotation.submit',ARRAY['ORG','OWN']::text[],false,false),
('quotation.approve','quotation','approve','quotation.approve',ARRAY['ORG','OWN']::text[],true,true),
('quotation.export','quotation','export','quotation.export',ARRAY['ORG','OWN']::text[],false,false),
('quotation.cost_read','quotation','cost_read','quotation.cost_read',ARRAY['ORG','OWN']::text[],false,true),
('sales_order.read','sales_order','read','sales_order.read',ARRAY['ORG','OWN']::text[],false,false),
('sales_order.create','sales_order','create','sales_order.create',ARRAY['ORG','OWN']::text[],false,false),
('sales_order.update','sales_order','update','sales_order.update',ARRAY['ORG','OWN']::text[],false,false),
('sales_order.submit','sales_order','submit','sales_order.submit',ARRAY['ORG','OWN']::text[],false,false),
('sales_order.approve','sales_order','approve','sales_order.approve',ARRAY['ORG','OWN']::text[],true,true),
('sales_order.cancel','sales_order','cancel','sales_order.cancel',ARRAY['ORG','OWN']::text[],false,false),
('sales_order.export','sales_order','export','sales_order.export',ARRAY['ORG','OWN']::text[],false,false),
('purchase_order.read','purchase_order','read','purchase_order.read',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('purchase_order.create','purchase_order','create','purchase_order.create',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('purchase_order.update','purchase_order','update','purchase_order.update',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('purchase_order.submit','purchase_order','submit','purchase_order.submit',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('purchase_order.approve','purchase_order','approve','purchase_order.approve',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],true,true),
('purchase_order.cancel','purchase_order','cancel','purchase_order.cancel',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('purchase_order.export','purchase_order','export','purchase_order.export',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('item.read','item','read','item.read',ARRAY['ORG']::text[],false,false),
('item.create','item','create','item.create',ARRAY['ORG']::text[],false,false),
('item.update','item','update','item.update',ARRAY['ORG']::text[],false,false),
('item.archive','item','archive','item.archive',ARRAY['ORG']::text[],false,false),
('item.import','item','import','item.import',ARRAY['ORG']::text[],false,false),
('item.export','item','export','item.export',ARRAY['ORG']::text[],false,false),
('item.cost_read','item','cost_read','item.cost_read',ARRAY['ORG']::text[],false,true),
('inventory.read','inventory','read','inventory.read',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('inventory.export','inventory','export','inventory.export',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('inventory.count','inventory','count','inventory.count',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('inventory.adjust','inventory','adjust','inventory.adjust',ARRAY['ORG','ASSIGNED','SELECTED']::text[],true,false),
('stock_document.read','stock_document','read','stock_document.read',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('stock_document.create','stock_document','create','stock_document.create',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('stock_document.update','stock_document','update','stock_document.update',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('stock_document.submit','stock_document','submit','stock_document.submit',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('stock_document.approve','stock_document','approve','stock_document.approve',ARRAY['ORG','ASSIGNED','SELECTED']::text[],true,true),
('stock_document.post','stock_document','post','stock_document.post',ARRAY['ORG','ASSIGNED','SELECTED']::text[],true,true),
('stock_document.reverse','stock_document','reverse','stock_document.reverse',ARRAY['ORG','ASSIGNED','SELECTED']::text[],true,true),
('stock_document.export','stock_document','export','stock_document.export',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('stock_document.cost_read','stock_document','cost_read','stock_document.cost_read',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,true),
('task.read','task','read','task.read',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('task.create','task','create','task.create',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('task.update','task','update','task.update',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('task.assign','task','assign','task.assign',ARRAY['ORG','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('task.complete','task','complete','task.complete',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('work_report.read','work_report','read','work_report.read',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('work_report.create','work_report','create','work_report.create',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('work_report.update','work_report','update','work_report.update',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('work_report.submit','work_report','submit','work_report.submit',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('work_report.approve','work_report','approve','work_report.approve',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],true,true),
('work_report.export','work_report','export','work_report.export',ARRAY['ORG','OWN','ASSIGNED','TEAM','SELECTED']::text[],false,false),
('project.read','project','read','project.read',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('project.create','project','create','project.create',ARRAY['ORG','ASSIGNED','SELECTED','OWN']::text[],false,false),
('project.update','project','update','project.update',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('project.assign','project','assign','project.assign',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('project.close','project','close','project.close',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('project.export','project','export','project.export',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('contract.read','contract','read','contract.read',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('contract.create','contract','create','contract.create',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('contract.update','contract','update','contract.update',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('contract.approve','contract','approve','contract.approve',ARRAY['ORG','ASSIGNED','SELECTED']::text[],true,true),
('contract.export','contract','export','contract.export',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('production_order.read','production_order','read','production_order.read',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('production_order.create','production_order','create','production_order.create',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('production_order.update','production_order','update','production_order.update',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('production_order.release','production_order','release','production_order.release',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('production_order.complete','production_order','complete','production_order.complete',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('project_template.read','project_template','read','project_template.read',ARRAY['ORG']::text[],false,false),
('project_template.create','project_template','create','project_template.create',ARRAY['ORG']::text[],false,false),
('project_template.update','project_template','update','project_template.update',ARRAY['ORG']::text[],false,false),
('project_template.publish','project_template','publish','project_template.publish',ARRAY['ORG']::text[],false,true),
('project_template.archive','project_template','archive','project_template.archive',ARRAY['ORG']::text[],false,false),
('report_template.read','report_template','read','report_template.read',ARRAY['ORG']::text[],false,false),
('report_template.create','report_template','create','report_template.create',ARRAY['ORG']::text[],false,false),
('report_template.update','report_template','update','report_template.update',ARRAY['ORG']::text[],false,false),
('report_template.publish','report_template','publish','report_template.publish',ARRAY['ORG']::text[],false,true),
('report_template.archive','report_template','archive','report_template.archive',ARRAY['ORG']::text[],false,false),
('acceptance.read','acceptance','read','acceptance.read',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('acceptance.create','acceptance','create','acceptance.create',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('acceptance.update','acceptance','update','acceptance.update',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('acceptance.submit','acceptance','submit','acceptance.submit',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('acceptance.approve','acceptance','approve','acceptance.approve',ARRAY['ORG','ASSIGNED','SELECTED']::text[],true,true),
('acceptance.export','acceptance','export','acceptance.export',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('trip.read','trip','read','trip.read',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('trip.create','trip','create','trip.create',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('trip.update','trip','update','trip.update',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('trip.assign','trip','assign','trip.assign',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('trip.dispatch','trip','dispatch','trip.dispatch',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('trip.complete','trip','complete','trip.complete',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,false),
('field_event.read','field_event','read','field_event.read',ARRAY['ORG','OWN','ASSIGNED']::text[],false,false),
('field_event.create','field_event','create','field_event.create',ARRAY['ORG','OWN','ASSIGNED']::text[],false,false),
('field_event.correct','field_event','correct','field_event.correct',ARRAY['ORG','OWN','ASSIGNED']::text[],false,false),
('payment.read','payment','read','payment.read',ARRAY['ORG']::text[],false,false),
('payment.create','payment','create','payment.create',ARRAY['ORG']::text[],false,false),
('payment.update','payment','update','payment.update',ARRAY['ORG']::text[],false,false),
('payment.submit','payment','submit','payment.submit',ARRAY['ORG']::text[],false,false),
('payment.approve','payment','approve','payment.approve',ARRAY['ORG']::text[],true,true),
('payment.post','payment','post','payment.post',ARRAY['ORG']::text[],true,true),
('payment.reverse','payment','reverse','payment.reverse',ARRAY['ORG']::text[],true,true),
('payment.export','payment','export','payment.export',ARRAY['ORG']::text[],false,false),
('receivable.read','receivable','read','receivable.read',ARRAY['ORG']::text[],false,false),
('receivable.export','receivable','export','receivable.export',ARRAY['ORG']::text[],false,false),
('receivable.adjust','receivable','adjust','receivable.adjust',ARRAY['ORG']::text[],true,false),
('payable.read','payable','read','payable.read',ARRAY['ORG']::text[],false,false),
('payable.export','payable','export','payable.export',ARRAY['ORG']::text[],false,false),
('payable.adjust','payable','adjust','payable.adjust',ARRAY['ORG']::text[],true,false),
('expense_claim.read','expense_claim','read','expense_claim.read',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('expense_claim.create','expense_claim','create','expense_claim.create',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('expense_claim.update','expense_claim','update','expense_claim.update',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('expense_claim.submit','expense_claim','submit','expense_claim.submit',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('expense_claim.approve','expense_claim','approve','expense_claim.approve',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],true,true),
('expense_claim.settle','expense_claim','settle','expense_claim.settle',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],true,false),
('expense_claim.export','expense_claim','export','expense_claim.export',ARRAY['ORG','OWN','ASSIGNED','SELECTED']::text[],false,false),
('project_finance.read','project_finance','read','project_finance.read',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,true),
('project_finance.export','project_finance','export','project_finance.export',ARRAY['ORG','ASSIGNED','SELECTED']::text[],false,true),
('employee.read','employee','read','employee.read',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('employee.create','employee','create','employee.create',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('employee.update','employee','update','employee.update',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('employee.archive','employee','archive','employee.archive',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('employee.private_read','employee','private_read','employee.private_read',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,true),
('employee.private_update','employee','private_update','employee.private_update',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,true),
('employee.export','employee','export','employee.export',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('attendance.read','attendance','read','attendance.read',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('attendance.create','attendance','create','attendance.create',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('attendance.update','attendance','update','attendance.update',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('attendance.approve','attendance','approve','attendance.approve',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],true,true),
('attendance.close','attendance','close','attendance.close',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('attendance.export','attendance','export','attendance.export',ARRAY['ORG','OWN','TEAM','DEPARTMENT','SELECTED']::text[],false,false),
('salary.read','salary','read','salary.read',ARRAY['ORG','OWN']::text[],false,true),
('salary.update','salary','update','salary.update',ARRAY['ORG']::text[],false,true),
('payroll.read','payroll','read','payroll.read',ARRAY['ORG','OWN']::text[],false,true),
('payroll.generate','payroll','generate','payroll.generate',ARRAY['ORG']::text[],false,true),
('payroll.update','payroll','update','payroll.update',ARRAY['ORG']::text[],false,true),
('payroll.approve','payroll','approve','payroll.approve',ARRAY['ORG']::text[],true,true),
('payroll.pay','payroll','pay','payroll.pay',ARRAY['ORG']::text[],true,true),
('payroll.export','payroll','export','payroll.export',ARRAY['ORG']::text[],false,true),
('payroll.ai_suggest','payroll','ai_suggest','payroll.ai_suggest',ARRAY['ORG']::text[],false,true),
('ai_run.read','ai_run','read','ai_run.read',ARRAY['ORG','OWN']::text[],false,false),
('ai_run.ocr','ai_run','ocr','ai_run.ocr',ARRAY['ORG','OWN']::text[],false,false),
('ai_run.speech','ai_run','speech','ai_run.speech',ARRAY['ORG','OWN']::text[],false,false),
('ai_run.ask','ai_run','ask','ai_run.ask',ARRAY['ORG','OWN']::text[],false,false),
('ai_run.retry','ai_run','retry','ai_run.retry',ARRAY['ORG','OWN']::text[],false,false),
('role.read','role','read','role.read',ARRAY['ORG']::text[],false,false),
('role.manage','role','manage','role.manage',ARRAY['ORG']::text[],false,false),
('role.publish','role','publish','role.publish',ARRAY['ORG']::text[],false,true),
('membership.read','membership','read','membership.read',ARRAY['ORG']::text[],false,false),
('membership.invite','membership','invite','membership.invite',ARRAY['ORG']::text[],false,false),
('membership.suspend','membership','suspend','membership.suspend',ARRAY['ORG']::text[],false,false),
('membership.assign_role','membership','assign_role','membership.assign_role',ARRAY['ORG']::text[],false,true),
('approval_policy.read','approval_policy','read','approval_policy.read',ARRAY['ORG']::text[],false,false),
('approval_policy.manage','approval_policy','manage','approval_policy.manage',ARRAY['ORG']::text[],false,false),
('approval_policy.publish','approval_policy','publish','approval_policy.publish',ARRAY['ORG']::text[],false,true),
('company_setting.read','company_setting','read','company_setting.read',ARRAY['ORG']::text[],false,false),
('company_setting.update','company_setting','update','company_setting.update',ARRAY['ORG']::text[],false,false),
('period_lock.read','period_lock','read','period_lock.read',ARRAY['ORG']::text[],false,false),
('period_lock.close','period_lock','close','period_lock.close',ARRAY['ORG']::text[],false,false),
('period_lock.reopen','period_lock','reopen','period_lock.reopen',ARRAY['ORG']::text[],false,false),
('audit.read','audit','read','audit.read',ARRAY['ORG']::text[],false,false),
('audit.export','audit','export','audit.export',ARRAY['ORG']::text[],false,false);
INSERT INTO iam.roles(organization_id,code,name,is_system)
SELECT o.id,v.code,v.name,true FROM erp.organizations o CROSS JOIN (VALUES
('SUPER_ADMIN','Quản trị hệ thống'),('ACCOUNTANT','Kế toán'),('WAREHOUSE_KEEPER','Thủ kho'),('PROJECT_MANAGER','Quản lý dự án'),('FIELD_WORKER','Thợ / lái xe')
) v(code,name) WHERE o.code='SIGNAGE';
INSERT INTO iam.role_grants(organization_id,role_id,permission_id,scope_kind)
SELECT r.organization_id,r.id,p.id,'ORG' FROM iam.roles r CROSS JOIN iam.permissions p JOIN erp.organizations o ON o.id=r.organization_id WHERE r.code='SUPER_ADMIN' AND o.code='SIGNAGE';
INSERT INTO iam.role_grants(organization_id,role_id,permission_id,scope_kind,amount_limit,currency,is_enabled)
SELECT r.organization_id,r.id,p.id,v.scope_kind,v.amount_limit,CASE WHEN v.amount_limit IS NOT NULL THEN 'VND' END,v.scope_kind <> 'SELECTED'
FROM (VALUES
('ACCOUNTANT','customer.read','ORG',NULL::numeric),
('ACCOUNTANT','customer.create','ORG',NULL::numeric),
('ACCOUNTANT','customer.update','ORG',NULL::numeric),
('ACCOUNTANT','customer.export','ORG',NULL::numeric),
('PROJECT_MANAGER','customer.read','OWN',NULL::numeric),
('PROJECT_MANAGER','customer.create','OWN',NULL::numeric),
('PROJECT_MANAGER','customer.update','OWN',NULL::numeric),
('ACCOUNTANT','supplier.read','ORG',NULL::numeric),
('ACCOUNTANT','supplier.create','ORG',NULL::numeric),
('ACCOUNTANT','supplier.update','ORG',NULL::numeric),
('ACCOUNTANT','supplier.export','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','supplier.read','ORG',NULL::numeric),
('ACCOUNTANT','quotation.read','ORG',NULL::numeric),
('ACCOUNTANT','quotation.export','ORG',NULL::numeric),
('PROJECT_MANAGER','quotation.read','OWN',NULL::numeric),
('PROJECT_MANAGER','quotation.create','OWN',NULL::numeric),
('PROJECT_MANAGER','quotation.update','OWN',NULL::numeric),
('PROJECT_MANAGER','quotation.submit','OWN',NULL::numeric),
('PROJECT_MANAGER','quotation.export','OWN',NULL::numeric),
('ACCOUNTANT','sales_order.read','ORG',NULL::numeric),
('ACCOUNTANT','sales_order.create','ORG',NULL::numeric),
('ACCOUNTANT','sales_order.update','ORG',NULL::numeric),
('ACCOUNTANT','sales_order.submit','ORG',NULL::numeric),
('ACCOUNTANT','sales_order.export','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','sales_order.read','ORG',NULL::numeric),
('PROJECT_MANAGER','sales_order.read','OWN',NULL::numeric),
('PROJECT_MANAGER','sales_order.create','OWN',NULL::numeric),
('PROJECT_MANAGER','sales_order.update','OWN',NULL::numeric),
('PROJECT_MANAGER','sales_order.submit','OWN',NULL::numeric),
('ACCOUNTANT','purchase_order.read','ORG',NULL::numeric),
('ACCOUNTANT','purchase_order.create','ORG',NULL::numeric),
('ACCOUNTANT','purchase_order.update','ORG',NULL::numeric),
('ACCOUNTANT','purchase_order.submit','ORG',NULL::numeric),
('ACCOUNTANT','purchase_order.approve','ORG',20000000),
('ACCOUNTANT','purchase_order.export','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','purchase_order.read','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','purchase_order.create','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','purchase_order.update','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','purchase_order.submit','OWN',NULL::numeric),
('PROJECT_MANAGER','purchase_order.read','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','purchase_order.create','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','purchase_order.update','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','purchase_order.submit','ASSIGNED',NULL::numeric),
('FIELD_WORKER','purchase_order.create','OWN',NULL::numeric),
('FIELD_WORKER','purchase_order.read','OWN',NULL::numeric),
('FIELD_WORKER','purchase_order.update','OWN',NULL::numeric),
('FIELD_WORKER','purchase_order.submit','OWN',NULL::numeric),
('ACCOUNTANT','item.read','ORG',NULL::numeric),
('ACCOUNTANT','item.export','ORG',NULL::numeric),
('ACCOUNTANT','item.cost_read','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','item.read','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','item.create','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','item.update','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','item.import','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','item.export','ORG',NULL::numeric),
('PROJECT_MANAGER','item.read','ORG',NULL::numeric),
('FIELD_WORKER','item.read','ORG',NULL::numeric),
('ACCOUNTANT','inventory.read','ORG',NULL::numeric),
('ACCOUNTANT','inventory.export','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','inventory.read','ASSIGNED',NULL::numeric),
('WAREHOUSE_KEEPER','inventory.export','ASSIGNED',NULL::numeric),
('WAREHOUSE_KEEPER','inventory.count','ASSIGNED',NULL::numeric),
('ACCOUNTANT','stock_document.read','ORG',NULL::numeric),
('ACCOUNTANT','stock_document.approve','ORG',50000000),
('ACCOUNTANT','stock_document.export','ORG',NULL::numeric),
('ACCOUNTANT','stock_document.cost_read','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','stock_document.read','ASSIGNED',NULL::numeric),
('WAREHOUSE_KEEPER','stock_document.create','ASSIGNED',NULL::numeric),
('WAREHOUSE_KEEPER','stock_document.update','ASSIGNED',NULL::numeric),
('WAREHOUSE_KEEPER','stock_document.submit','ASSIGNED',NULL::numeric),
('WAREHOUSE_KEEPER','stock_document.post','ASSIGNED',NULL::numeric),
('WAREHOUSE_KEEPER','stock_document.export','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','stock_document.read','SELECTED',NULL::numeric),
('PROJECT_MANAGER','stock_document.create','SELECTED',NULL::numeric),
('PROJECT_MANAGER','stock_document.update','SELECTED',NULL::numeric),
('PROJECT_MANAGER','stock_document.submit','SELECTED',NULL::numeric),
('ACCOUNTANT','task.read','OWN',NULL::numeric),
('ACCOUNTANT','task.create','OWN',NULL::numeric),
('ACCOUNTANT','task.update','OWN',NULL::numeric),
('ACCOUNTANT','task.complete','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','task.read','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','task.create','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','task.update','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','task.complete','OWN',NULL::numeric),
('PROJECT_MANAGER','task.read','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','task.create','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','task.update','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','task.assign','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','task.complete','ASSIGNED',NULL::numeric),
('FIELD_WORKER','task.read','ASSIGNED',NULL::numeric),
('FIELD_WORKER','task.update','ASSIGNED',NULL::numeric),
('FIELD_WORKER','task.complete','ASSIGNED',NULL::numeric),
('FIELD_WORKER','task.create','OWN',NULL::numeric),
('ACCOUNTANT','work_report.read','ORG',NULL::numeric),
('ACCOUNTANT','work_report.export','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','work_report.read','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','work_report.create','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','work_report.update','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','work_report.submit','OWN',NULL::numeric),
('PROJECT_MANAGER','work_report.read','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','work_report.approve','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','work_report.export','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','work_report.create','OWN',NULL::numeric),
('PROJECT_MANAGER','work_report.update','OWN',NULL::numeric),
('PROJECT_MANAGER','work_report.submit','OWN',NULL::numeric),
('FIELD_WORKER','work_report.read','OWN',NULL::numeric),
('FIELD_WORKER','work_report.create','OWN',NULL::numeric),
('FIELD_WORKER','work_report.update','OWN',NULL::numeric),
('FIELD_WORKER','work_report.submit','OWN',NULL::numeric),
('ACCOUNTANT','project.read','ORG',NULL::numeric),
('ACCOUNTANT','project.export','ORG',NULL::numeric),
('PROJECT_MANAGER','project.read','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','project.update','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','project.assign','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','project.close','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','project.export','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','project.create','OWN',NULL::numeric),
('ACCOUNTANT','contract.read','ORG',NULL::numeric),
('ACCOUNTANT','contract.export','ORG',NULL::numeric),
('PROJECT_MANAGER','contract.read','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','contract.create','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','contract.update','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','contract.export','ASSIGNED',NULL::numeric),
('ACCOUNTANT','production_order.read','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','production_order.read','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','production_order.read','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','production_order.create','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','production_order.update','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','production_order.release','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','production_order.complete','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','project_template.read','ORG',NULL::numeric),
('ACCOUNTANT','acceptance.read','ORG',NULL::numeric),
('ACCOUNTANT','acceptance.export','ORG',NULL::numeric),
('PROJECT_MANAGER','acceptance.read','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','acceptance.create','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','acceptance.update','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','acceptance.submit','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','acceptance.approve','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','acceptance.export','ASSIGNED',NULL::numeric),
('FIELD_WORKER','acceptance.read','ASSIGNED',NULL::numeric),
('FIELD_WORKER','acceptance.create','ASSIGNED',NULL::numeric),
('FIELD_WORKER','acceptance.update','ASSIGNED',NULL::numeric),
('FIELD_WORKER','acceptance.submit','ASSIGNED',NULL::numeric),
('ACCOUNTANT','field_event.read','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','field_event.read','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','field_event.create','OWN',NULL::numeric),
('PROJECT_MANAGER','field_event.read','ASSIGNED',NULL::numeric),
('PROJECT_MANAGER','field_event.create','OWN',NULL::numeric),
('FIELD_WORKER','field_event.read','OWN',NULL::numeric),
('FIELD_WORKER','field_event.create','OWN',NULL::numeric),
('ACCOUNTANT','trip.read','ORG',NULL::numeric),
('PROJECT_MANAGER','trip.read','SELECTED',NULL::numeric),
('PROJECT_MANAGER','trip.create','SELECTED',NULL::numeric),
('PROJECT_MANAGER','trip.update','SELECTED',NULL::numeric),
('PROJECT_MANAGER','trip.assign','SELECTED',NULL::numeric),
('PROJECT_MANAGER','trip.dispatch','SELECTED',NULL::numeric),
('FIELD_WORKER','trip.read','ASSIGNED',NULL::numeric),
('FIELD_WORKER','trip.complete','ASSIGNED',NULL::numeric),
('ACCOUNTANT','payment.read','ORG',NULL::numeric),
('ACCOUNTANT','payment.create','ORG',NULL::numeric),
('ACCOUNTANT','payment.update','ORG',NULL::numeric),
('ACCOUNTANT','payment.submit','ORG',NULL::numeric),
('ACCOUNTANT','payment.post','ORG',NULL::numeric),
('ACCOUNTANT','payment.export','ORG',NULL::numeric),
('ACCOUNTANT','receivable.read','ORG',NULL::numeric),
('ACCOUNTANT','receivable.export','ORG',NULL::numeric),
('ACCOUNTANT','payable.read','ORG',NULL::numeric),
('ACCOUNTANT','payable.export','ORG',NULL::numeric),
('ACCOUNTANT','expense_claim.read','ORG',NULL::numeric),
('ACCOUNTANT','expense_claim.approve','ORG',5000000),
('ACCOUNTANT','expense_claim.settle','ORG',NULL::numeric),
('ACCOUNTANT','expense_claim.export','ORG',NULL::numeric),
('ACCOUNTANT','expense_claim.create','OWN',NULL::numeric),
('ACCOUNTANT','expense_claim.update','OWN',NULL::numeric),
('ACCOUNTANT','expense_claim.submit','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','expense_claim.read','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','expense_claim.create','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','expense_claim.update','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','expense_claim.submit','OWN',NULL::numeric),
('PROJECT_MANAGER','expense_claim.read','OWN',NULL::numeric),
('PROJECT_MANAGER','expense_claim.create','OWN',NULL::numeric),
('PROJECT_MANAGER','expense_claim.update','OWN',NULL::numeric),
('PROJECT_MANAGER','expense_claim.submit','OWN',NULL::numeric),
('FIELD_WORKER','expense_claim.read','OWN',NULL::numeric),
('FIELD_WORKER','expense_claim.create','OWN',NULL::numeric),
('FIELD_WORKER','expense_claim.update','OWN',NULL::numeric),
('FIELD_WORKER','expense_claim.submit','OWN',NULL::numeric),
('ACCOUNTANT','project_finance.read','ORG',NULL::numeric),
('ACCOUNTANT','project_finance.export','ORG',NULL::numeric),
('ACCOUNTANT','employee.read','ORG',NULL::numeric),
('ACCOUNTANT','employee.create','ORG',NULL::numeric),
('ACCOUNTANT','employee.update','ORG',NULL::numeric),
('ACCOUNTANT','employee.private_read','ORG',NULL::numeric),
('ACCOUNTANT','employee.private_update','ORG',NULL::numeric),
('ACCOUNTANT','employee.export','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','employee.read','OWN',NULL::numeric),
('PROJECT_MANAGER','employee.read','TEAM',NULL::numeric),
('FIELD_WORKER','employee.read','OWN',NULL::numeric),
('ACCOUNTANT','attendance.read','ORG',NULL::numeric),
('ACCOUNTANT','attendance.create','ORG',NULL::numeric),
('ACCOUNTANT','attendance.update','ORG',NULL::numeric),
('ACCOUNTANT','attendance.approve','ORG',NULL::numeric),
('ACCOUNTANT','attendance.close','ORG',NULL::numeric),
('ACCOUNTANT','attendance.export','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','attendance.read','OWN',NULL::numeric),
('PROJECT_MANAGER','attendance.read','TEAM',NULL::numeric),
('FIELD_WORKER','attendance.read','OWN',NULL::numeric),
('ACCOUNTANT','salary.read','ORG',NULL::numeric),
('ACCOUNTANT','payroll.read','ORG',NULL::numeric),
('ACCOUNTANT','payroll.generate','ORG',NULL::numeric),
('ACCOUNTANT','payroll.update','ORG',NULL::numeric),
('ACCOUNTANT','payroll.pay','ORG',NULL::numeric),
('ACCOUNTANT','payroll.export','ORG',NULL::numeric),
('ACCOUNTANT','payroll.ai_suggest','ORG',NULL::numeric),
('WAREHOUSE_KEEPER','payroll.read','OWN',NULL::numeric),
('PROJECT_MANAGER','payroll.read','OWN',NULL::numeric),
('FIELD_WORKER','payroll.read','OWN',NULL::numeric),
('ACCOUNTANT','ai_run.read','OWN',NULL::numeric),
('ACCOUNTANT','ai_run.ocr','OWN',NULL::numeric),
('ACCOUNTANT','ai_run.speech','OWN',NULL::numeric),
('ACCOUNTANT','ai_run.ask','OWN',NULL::numeric),
('ACCOUNTANT','ai_run.retry','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','ai_run.read','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','ai_run.ocr','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','ai_run.speech','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','ai_run.ask','OWN',NULL::numeric),
('WAREHOUSE_KEEPER','ai_run.retry','OWN',NULL::numeric),
('PROJECT_MANAGER','ai_run.read','OWN',NULL::numeric),
('PROJECT_MANAGER','ai_run.ocr','OWN',NULL::numeric),
('PROJECT_MANAGER','ai_run.speech','OWN',NULL::numeric),
('PROJECT_MANAGER','ai_run.ask','OWN',NULL::numeric),
('PROJECT_MANAGER','ai_run.retry','OWN',NULL::numeric),
('FIELD_WORKER','ai_run.read','OWN',NULL::numeric),
('FIELD_WORKER','ai_run.ocr','OWN',NULL::numeric),
('FIELD_WORKER','ai_run.speech','OWN',NULL::numeric),
('FIELD_WORKER','ai_run.ask','OWN',NULL::numeric),
('FIELD_WORKER','ai_run.retry','OWN',NULL::numeric),
('PROJECT_MANAGER','report_template.read','ORG',NULL::numeric),
('ACCOUNTANT','period_lock.read','ORG',NULL::numeric),
('ACCOUNTANT','period_lock.close','ORG',NULL::numeric)) v(role_code,permission_key,scope_kind,amount_limit)
JOIN iam.roles r ON r.code=v.role_code JOIN erp.organizations o ON o.id=r.organization_id AND o.code='SIGNAGE'
JOIN iam.permissions p ON p.key=v.permission_key;
-- SELECTED grants stay disabled until warehouse/project/department bindings are configured.
INSERT INTO iam.resource_projections(key,resource,allowed_field_keys,description) VALUES
('sales_order.delivery','sales_order',ARRAY['id','code','status','customer_label','delivery_address','items.quantity','items.description'],'Giao hàng: không giá bán, không tổng tiền'),
('sales_order.commercial','sales_order',ARRAY['id','code','status','customer_label','delivery_address','items.quantity','items.description','items.unit_price','total','currency'],'Đơn bán thương mại');
INSERT INTO iam.role_read_projections(organization_id,role_id,resource,projection_key)
SELECT r.organization_id,r.id,'sales_order',CASE WHEN r.code='WAREHOUSE_KEEPER' THEN 'sales_order.delivery' ELSE 'sales_order.commercial' END
FROM iam.roles r JOIN erp.organizations o ON o.id=r.organization_id AND o.code='SIGNAGE' WHERE r.code IN ('SUPER_ADMIN','ACCOUNTANT','WAREHOUSE_KEEPER','PROJECT_MANAGER');
INSERT INTO iam.permission_dependencies(permission_id,required_permission_id)
SELECT p.id,r.id FROM (VALUES ('customer.export','customer.read'),('supplier.export','supplier.read'),('quotation.export','quotation.read'),('sales_order.export','sales_order.read'),('purchase_order.export','purchase_order.read'),('item.export','item.read'),('inventory.export','inventory.read'),('stock_document.export','stock_document.read'),('work_report.export','work_report.read'),('project.export','project.read'),('contract.export','contract.read'),('acceptance.export','acceptance.read'),('payment.export','payment.read'),('receivable.export','receivable.read'),('payable.export','payable.read'),('expense_claim.export','expense_claim.read'),('project_finance.export','project_finance.read'),('employee.export','employee.read'),('attendance.export','attendance.read'),('payroll.export','payroll.read'),('audit.export','audit.read'),('ai_run.ocr','purchase_order.create'),('ai_run.speech','work_report.create'),('payroll.ai_suggest','salary.read'),('payroll.ai_suggest','attendance.read'),('payroll.ai_suggest','work_report.read'),('payroll.ai_suggest','payroll.update'),('payroll.pay','payment.create'),('payroll.pay','payment.submit')) v(permission,required)
JOIN iam.permissions p ON p.key=v.permission JOIN iam.permissions r ON r.key=v.required;
INSERT INTO erp.units(organization_id,code,name,dimension)
SELECT o.id,v.code,v.name,v.dimension FROM erp.organizations o CROSS JOIN (VALUES
('M','Mét','length'),('M2','Mét vuông','area'),('TAM','Tấm','count'),('CAY','Cây','count'),('CUON','Cuộn','count'),('CAI','Cái','count'),('BO','Bộ','count'),('TUYP','Tuýp','count'),('GIO','Giờ','time'),('KG','Kilogram','mass')
) v(code,name,dimension) WHERE o.code='SIGNAGE';

INSERT INTO erp.schema_migrations(name,checksum) VALUES ('004_seed.sql','39986f7be6f7b4ef57c05c99bc8a05acb4c05d5b20c767170e435356a52d865f');

-- ===== 005_access.sql =====
-- Do not expose ERP/IAM or auth credentials through the Supabase Data API.
-- Flush deferred SELECTED-scope checks before changing table security metadata.
SET CONSTRAINTS ALL IMMEDIATE;
REVOKE ALL ON SCHEMA erp,iam FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA erp,iam FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA erp,iam FROM PUBLIC;
ALTER TABLE erp.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.organizations USING (id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.memberships USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.departments FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.departments USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.teams FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.teams USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.employees FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.employees USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.team_members FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.team_members USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.employee_private_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.employee_private_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.employee_private_profiles USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.partners FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.partners USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.partner_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.partner_contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.partner_contacts USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.partner_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.partner_terms FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.partner_terms USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.partner_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.partner_activities FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.partner_activities USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.units FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.units USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.item_categories FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.item_categories USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.items FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.items USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.item_unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.item_unit_conversions FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.item_unit_conversions USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.supplier_prices FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.supplier_prices USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.vehicles FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.vehicles USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.warehouses FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.warehouses USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.warehouse_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.warehouse_members FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.warehouse_members USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.warehouse_item_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.warehouse_item_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.warehouse_item_settings USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.project_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.project_templates USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.project_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.project_template_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.project_template_versions USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.projects FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.projects USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.project_members FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.project_members USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.tasks USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.task_assignees FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.task_assignees USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.report_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.report_templates USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.report_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.report_template_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.report_template_versions USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.report_template_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.report_template_bindings FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.report_template_bindings USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.work_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.work_reports USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.report_labor_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.report_labor_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.report_labor_entries USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.report_material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.report_material_usage FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.report_material_usage USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.production_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.production_orders USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.production_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.production_materials FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.production_materials USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.production_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.production_outputs FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.production_outputs USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.quotations FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.quotations USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.quotation_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.quotation_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.quotation_revisions USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.quotation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.quotation_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.quotation_lines USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.estimate_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.estimate_components FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.estimate_components USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.sales_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.sales_orders USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.sales_order_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.sales_order_lines USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.purchase_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.purchase_orders USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.purchase_order_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.purchase_order_lines USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.contracts FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.contracts USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.contract_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.contract_milestones FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.contract_milestones USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.stock_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.stock_lots FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.stock_lots USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.stock_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.stock_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.stock_documents USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.stock_document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.stock_document_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.stock_document_lines USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.stock_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.stock_postings FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.stock_postings USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.stock_movements FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.stock_movements USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.stock_balances FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.stock_balances USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.stock_reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.stock_reservations USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.inventory_counts FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.inventory_counts USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.inventory_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.inventory_count_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.inventory_count_lines USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.cash_accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.cash_accounts USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.open_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.open_items FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.open_items USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.payments FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.payments USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.open_item_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.open_item_adjustments FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.open_item_adjustments USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.payment_allocations FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.payment_allocations USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.cash_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.cash_entries USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.expense_claims FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.expense_claims USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.expense_claim_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.expense_claim_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.expense_claim_lines USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.expense_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.expense_settlements FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.expense_settlements USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.project_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.project_cost_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.project_cost_entries USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.period_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.period_locks FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.period_locks USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.trips FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.trips USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.trip_stops FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.trip_stops USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.trip_stock_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.trip_stock_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.trip_stock_documents USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.field_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.field_events FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.field_events USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.acceptances FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.acceptances USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.attendance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.attendance_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.attendance_entries USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.attendance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.attendance_periods FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.attendance_periods USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.salary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.salary_terms FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.salary_terms USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.payroll_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.payroll_runs USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.payroll_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.payroll_lines USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.payroll_payments FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.payroll_payments USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.files FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.files USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.record_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.record_files FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.record_files USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.ai_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.ai_runs USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.ai_run_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.ai_run_files FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.ai_run_files USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.approval_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.approval_policies USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.approval_policy_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.approval_policy_steps FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.approval_policy_steps USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.approval_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.approval_requests USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.approval_decisions FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.approval_decisions USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.audit_events USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.idempotency_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.idempotency_keys USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.outbox_events FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.outbox_events USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.number_sequences FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.number_sequences USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE erp.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.company_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON erp.company_settings USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE iam.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON iam.permissions FOR SELECT USING (true);
ALTER TABLE iam.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.roles FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON iam.roles USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE iam.role_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.role_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON iam.role_grants USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE iam.grant_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.grant_projects FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON iam.grant_projects USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE iam.grant_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.grant_warehouses FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON iam.grant_warehouses USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE iam.grant_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.grant_departments FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON iam.grant_departments USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE iam.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.user_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON iam.user_roles USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE iam.role_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.role_change_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON iam.role_change_requests USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
ALTER TABLE iam.permission_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.permission_dependencies FORCE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON iam.permission_dependencies FOR SELECT USING (true);
ALTER TABLE iam.resource_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.resource_projections FORCE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON iam.resource_projections FOR SELECT USING (true);
ALTER TABLE iam.role_read_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.role_read_projections FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_isolation ON iam.role_read_projections USING (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid) WITH CHECK (organization_id = nullif(current_setting('app.organization_id',true),'')::uuid);
DO $access$
DECLARE r text; t text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA erp,iam FROM %I',r);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA erp,iam FROM %I',r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA erp,iam FROM %I',r);
      FOREACH t IN ARRAY ARRAY['user','session','account','verification'] LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM %I',t,r);
      END LOOP;
    END IF;
  END LOOP;
END $access$;
-- Runtime DB role/provisioning and server authorization are intentionally not enabled by this installer.

INSERT INTO erp.schema_migrations(name,checksum) VALUES ('005_access.sql','4e52943b8dc7bac2612a9f6021f64148dac3b46156f560ccd50128373ed5a55c');

-- Read-only assertions: run after installation. Raises an error on mismatch.
DO $verify$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM information_schema.tables WHERE table_schema IN ('erp','iam') AND table_type='BASE TABLE' AND table_name<>'schema_migrations';
  IF n<>100 THEN RAISE EXCEPTION 'Expected 100 ERP/IAM tables, got %',n; END IF;
  SELECT count(*) INTO n FROM iam.permissions;
  IF n<>170 THEN RAISE EXCEPTION 'Expected 170 permissions, got %',n; END IF;
  SELECT count(*) INTO n FROM iam.roles r JOIN erp.organizations o ON o.id=r.organization_id WHERE o.code='SIGNAGE';
  IF n<>5 THEN RAISE EXCEPTION 'Expected 5 seed roles, got %',n; END IF;
  SELECT count(*) INTO n FROM iam.role_grants g JOIN erp.organizations o ON o.id=g.organization_id WHERE o.code='SIGNAGE';
  IF n<>410 THEN RAISE EXCEPTION 'Expected 410 seed grants, got %',n; END IF;
  IF EXISTS(SELECT 1 FROM iam.role_grants g JOIN iam.permissions p ON p.id=g.permission_id WHERE NOT g.scope_kind=ANY(p.supported_scopes)) THEN
    RAISE EXCEPTION 'Unsupported grant scope';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace WHERE s.nspname IN ('erp','iam') AND c.relkind='r' AND c.relname<>'schema_migrations' AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Missing RLS on application table';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_namespace s ON s.oid=c.connamespace WHERE s.nspname IN ('erp','iam') AND NOT c.convalidated) THEN
    RAISE EXCEPTION 'Unvalidated constraints';
  END IF;
END $verify$;

COMMIT;
SELECT 'Installed successfully' AS result,
  (SELECT count(*) FROM iam.permissions) AS permissions,
  (SELECT count(*) FROM iam.roles) AS roles,
  (SELECT count(*) FROM iam.role_grants) AS grants,
  (SELECT count(*) FROM erp.schema_migrations) AS migrations;

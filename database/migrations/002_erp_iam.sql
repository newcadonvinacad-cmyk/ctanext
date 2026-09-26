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

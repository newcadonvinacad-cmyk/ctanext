-- Migration 022: Fleet GPS Bình Minh Import & Persistence Tables
-- Hệ thống tiếp nhận, lưu trữ bền vững và chống trùng lặp dữ liệu GPS Bình Minh

CREATE TABLE IF NOT EXISTS erp.fleet_gps_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  report_type text NOT NULL CHECK (report_type IN ('summary', 'journey')),
  vehicle_plate text NOT NULL,
  period_range text,
  status text NOT NULL DEFAULT 'committed' CHECK (status IN ('previewed', 'committed', 'rolled_back')),
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text REFERENCES public."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_gps_batches_org_plate 
  ON erp.fleet_gps_import_batches(organization_id, vehicle_plate, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fleet_gps_batches_hash 
  ON erp.fleet_gps_import_batches(organization_id, file_hash);

-- Bảng tổng hợp ngày lịch (Báo cáo tổng hợp)
CREATE TABLE IF NOT EXISTS erp.fleet_gps_daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id) ON DELETE CASCADE,
  vehicle_plate text NOT NULL,
  calendar_date date NOT NULL,
  moving_seconds integer NOT NULL DEFAULT 0,
  gps_km numeric(10,2) NOT NULL DEFAULT 0,
  odo_km numeric(10,2) NOT NULL DEFAULT 0,
  reported_working_seconds integer NOT NULL DEFAULT 0,
  stops_count integer NOT NULL DEFAULT 0,
  speeding_count integer NOT NULL DEFAULT 0,
  door_open_count integer NOT NULL DEFAULT 0,
  ac_open_count integer NOT NULL DEFAULT 0,
  continuous_4h_count integer NOT NULL DEFAULT 0,
  reported_fuel_liters numeric(10,2) NOT NULL DEFAULT 0,
  fuel_norm_km numeric(10,2) NOT NULL DEFAULT 0,
  fuel_norm_hour numeric(10,2) NOT NULL DEFAULT 0,
  business_type_label text,
  vehicle_type_label text,
  batch_id uuid REFERENCES erp.fleet_gps_import_batches(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, vehicle_plate, calendar_date)
);

CREATE INDEX IF NOT EXISTS idx_fleet_gps_daily_lookup 
  ON erp.fleet_gps_daily_summaries(organization_id, vehicle_plate, calendar_date DESC);

-- Bảng lịch sử sửa đổi / cập nhật tổng hợp ngày (Audit Trail)
CREATE TABLE IF NOT EXISTS erp.fleet_gps_summary_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id) ON DELETE CASCADE,
  summary_id uuid NOT NULL REFERENCES erp.fleet_gps_daily_summaries(id) ON DELETE CASCADE,
  previous_values jsonb NOT NULL,
  new_values jsonb NOT NULL,
  batch_id uuid REFERENCES erp.fleet_gps_import_batches(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

-- Bảng sự kiện hành trình (Báo cáo hành trình)
CREATE TABLE IF NOT EXISTS erp.fleet_gps_journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES erp.organizations(id) ON DELETE CASCADE,
  vehicle_plate text NOT NULL,
  event_time timestamptz NOT NULL,
  calendar_date date NOT NULL,
  work_date date NOT NULL, -- Ngày công 04:00 - 04:00
  event_type text NOT NULL,
  raw_note text NOT NULL,
  latitude numeric(10,6),
  longitude numeric(10,6),
  address text,
  batch_id uuid REFERENCES erp.fleet_gps_import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, vehicle_plate, event_time, event_type)
);

CREATE INDEX IF NOT EXISTS idx_fleet_gps_journey_workdate 
  ON erp.fleet_gps_journey_events(organization_id, vehicle_plate, work_date, event_time ASC);

CREATE INDEX IF NOT EXISTS idx_fleet_gps_journey_caldate 
  ON erp.fleet_gps_journey_events(organization_id, vehicle_plate, calendar_date, event_time ASC);

-- Row Level Security (RLS)
ALTER TABLE erp.fleet_gps_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.fleet_gps_daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.fleet_gps_summary_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.fleet_gps_journey_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY rls_fleet_gps_batches_org ON erp.fleet_gps_import_batches
    USING (organization_id = (SELECT organization_id FROM erp.memberships WHERE user_id = auth.uid() LIMIT 1));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_fleet_gps_daily_org ON erp.fleet_gps_daily_summaries
    USING (organization_id = (SELECT organization_id FROM erp.memberships WHERE user_id = auth.uid() LIMIT 1));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_fleet_gps_audit_org ON erp.fleet_gps_summary_audit
    USING (organization_id = (SELECT organization_id FROM erp.memberships WHERE user_id = auth.uid() LIMIT 1));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_fleet_gps_journey_org ON erp.fleet_gps_journey_events
    USING (organization_id = (SELECT organization_id FROM erp.memberships WHERE user_id = auth.uid() LIMIT 1));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

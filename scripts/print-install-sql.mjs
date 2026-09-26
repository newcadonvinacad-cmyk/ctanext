// Prints a deterministic standalone installer. Does not read .env or connect to any database.
import fs from 'node:fs';
import crypto from 'node:crypto';

const names = fs.readdirSync('database/migrations').filter(x => x.endsWith('.sql')).sort();
let sql = `-- SIGNAGE ERP: run this entire file in Supabase SQL Editor as database owner.
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
`;
for (const name of names) {
  const content = fs.readFileSync(`database/migrations/${name}`, 'utf8');
  const checksum = crypto.createHash('sha256').update(content).digest('hex');
  sql += `\n-- ===== ${name} =====\n${content}\nINSERT INTO erp.schema_migrations(name,checksum) VALUES ('${name}','${checksum}');\n`;
}
sql += '\n' + fs.readFileSync('database/verify.sql', 'utf8');
sql += `
COMMIT;
SELECT 'Installed successfully' AS result,
  (SELECT count(*) FROM iam.permissions) AS permissions,
  (SELECT count(*) FROM iam.roles) AS roles,
  (SELECT count(*) FROM iam.role_grants) AS grants,
  (SELECT count(*) FROM erp.schema_migrations) AS migrations;
`;
process.stdout.write(sql);

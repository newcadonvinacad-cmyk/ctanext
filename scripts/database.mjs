import nextEnv from '@next/env';
import pg from 'pg';
import fs from 'node:fs';
import crypto from 'node:crypto';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const mode = process.argv[2] || 'inspect';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, application_name: 'signage-erp-migrations' });
try {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  await client.connect();
  if (mode === 'inspect') {
    const version = await client.query('SHOW server_version');
    const tables = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public','erp','iam') AND table_type='BASE TABLE' ORDER BY 1,2");
    const columns = await client.query("SELECT table_schema,table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema IN ('erp','iam') OR (table_schema='public' AND table_name IN ('user','session','account','verification')) ORDER BY 1,2,ordinal_position");
    console.log(JSON.stringify({ version: version.rows[0].server_version, tables: tables.rows, columns: columns.rows }, null, 2));
  } else if (mode === 'apply' || mode === 'check') {
    const files = fs.readdirSync('database/migrations').filter(x => x.endsWith('.sql')).sort();
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'; SET LOCAL statement_timeout = '120s'");
    await client.query("SELECT pg_advisory_xact_lock(842617305)");
    await client.query('CREATE SCHEMA IF NOT EXISTS erp');
    await client.query('CREATE TABLE IF NOT EXISTS erp.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const name of files) {
      const sql = fs.readFileSync(`database/migrations/${name}`, 'utf8');
      const hash = crypto.createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM erp.schema_migrations WHERE name=$1', [name]);
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== hash) throw new Error(`Checksum mismatch: ${name}`);
        console.log(`Already applied: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO erp.schema_migrations(name,checksum) VALUES($1,$2)', [name, hash]);
      console.log(`Validated: ${name}`);
    }
    if (fs.existsSync('database/verify.sql')) {
      await client.query(fs.readFileSync('database/verify.sql', 'utf8'));
      console.log('Database assertions passed');
    }
    await client.query(mode === 'apply' ? 'COMMIT' : 'ROLLBACK');
    console.log(mode === 'apply' ? 'Migration committed' : 'Validation rolled back; no changes persisted');
  } else if (mode === 'verify') {
    await client.query('BEGIN');
    await client.query(fs.readFileSync('database/verify.sql', 'utf8'));
    const summary = await client.query("SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='erp' AND table_type='BASE TABLE') erp_tables, (SELECT count(*) FROM information_schema.tables WHERE table_schema='iam' AND table_type='BASE TABLE') iam_tables, (SELECT count(*) FROM iam.permissions) permissions, (SELECT count(*) FROM iam.roles) roles, (SELECT count(*) FROM iam.role_grants) grants, (SELECT count(*) FROM erp.schema_migrations) migrations");
    await client.query('ROLLBACK');
    console.log(JSON.stringify(summary.rows[0], null, 2));
  } else throw new Error('Unknown mode');
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  // Never print config, credentials, connection URL, query parameters or row data.
  console.error(JSON.stringify({ error: error.code || error.name, message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED]'), position: error.position, constraint: error.constraint }));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

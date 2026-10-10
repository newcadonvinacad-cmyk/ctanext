import nextEnv from '@next/env';
import pg from 'pg';
import { readMigrations, migrationStatus, runMigrations } from './lib/migrations.mjs';
import { expectedSchema, columnQuery, compareColumns } from './lib/schema-check.mjs';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const mode = process.argv[2] || 'status';
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false }, application_name: 'signage-erp-migrations',
});
try {
  if (!['status', 'inspect', 'verify', 'check', 'apply'].includes(mode)) throw new Error('Use status, inspect, verify, check or apply');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  const migrations = readMigrations();
  // Validate a complete, seeded installation before touching the real database.
  const expected = ['verify', 'check', 'apply'].includes(mode) ? await expectedSchema(migrations) : null;
  await client.connect();
  if (mode === 'check' || mode === 'apply') {
    const names = await runMigrations(client, migrations, { apply: mode === 'apply', only, log: console.log });
    console.log(`${mode === 'apply' ? 'Committed' : 'Validated and rolled back'}: ${names.length} migration(s)`);
  } else {
    await client.query('BEGIN READ ONLY');
    const status = await migrationStatus(client, migrations);
    const output = { ...status };
    if (mode === 'inspect') output.columns = (await client.query(columnQuery)).rows;
    if (mode === 'verify') {
      output.schemaDifferences = compareColumns(expected, (await client.query(columnQuery)).rows);
      output.expectedColumns = expected.length;
    }
    await client.query('ROLLBACK');
    console.log(JSON.stringify(output, null, 2));
    if (status.pending.length || status.changed.length || status.unknown.length || output.schemaDifferences?.length) process.exitCode = 1;
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(JSON.stringify({ error: error.cause?.code || error.code || error.name,
    message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED]') }));
  process.exitCode = 1;
} finally { await client.end().catch(() => {}); }

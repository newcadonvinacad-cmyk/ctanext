const test = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { btree_gist } = require('@electric-sql/pglite/contrib/btree_gist');

test('complete seeded installation, migration rollback and schema drift detection', async () => {
  const { readMigrations, migrationBody, runMigrations, migrationStatus } = await import('../scripts/lib/migrations.mjs');
  const { columnQuery, compareColumns } = await import('../scripts/lib/schema-check.mjs');
  const db = new PGlite({ extensions: { btree_gist } });
  const adapter = { query: (sql, values) => values ? db.query(sql, values) : db.exec(sql).then(r => r.at(-1)) };
  try {
    await db.exec('CREATE EXTENSION btree_gist');
    const migrations = readMigrations();
    await runMigrations(adapter, migrations, { apply: true });
    assert.equal((await migrationStatus(adapter, migrations)).pending.length, 0);
    assert.deepEqual(await runMigrations(adapter, migrations, { apply: true }), []);
    const roles = (await db.query("SELECT code FROM iam.roles WHERE code LIKE 'FLEET_%' ORDER BY code")).rows;
    assert.deepEqual(roles.map(r => r.code), ['FLEET_MANAGER', 'FLEET_OPERATOR']);
    const columns = (await db.query(columnQuery)).rows;
    assert.ok(columns.some(c => c.table_name === 'payments' && c.column_name === 'document_file_url'));
    assert.deepEqual(compareColumns(columns, columns), []);
    const missing = columns.filter(c => !(c.table_name === 'payments' && c.column_name === 'document_file_url'));
    assert.deepEqual(compareColumns(columns, missing), [{ column: 'erp.payments.document_file_url', problem: 'missing', expected: 'text' }]);

    const probe = { name: '999_probe.sql', checksum: 'test', sql: migrationBody('-- comment before BEGIN\nBEGIN; CREATE TABLE erp.rollback_probe(id int); COMMIT; -- trailing comment') };
    await runMigrations(adapter, [...migrations, probe]);
    assert.equal((await db.query("SELECT to_regclass('erp.rollback_probe') AS name")).rows[0].name, null, 'dry run must never commit a wrapped migration');
    assert.equal((await db.query("SELECT count(*)::int AS n FROM erp.schema_migrations WHERE name='999_probe.sql'")).rows[0].n, 0);
    const failing = { name: '999_failure.sql', checksum: 'bad', sql: 'CREATE TABLE erp.failed_probe(id int); SELECT absent_column FROM erp.payments;' };
    await assert.rejects(runMigrations(adapter, [...migrations, failing], { apply: true }), /absent_column/);
    assert.equal((await db.query("SELECT to_regclass('erp.failed_probe') AS name")).rows[0].name, null, 'failed upgrade must roll back schema and ledger');
    const deferred = { name: '999_deferred.sql', checksum: 'bad', sql: 'CREATE TABLE erp.deferred_probe(id uuid REFERENCES erp.organizations(id) DEFERRABLE INITIALLY DEFERRED); INSERT INTO erp.deferred_probe VALUES (gen_random_uuid());' };
    await assert.rejects(runMigrations(adapter, [...migrations, deferred]), /foreign key/);
    assert.throws(() => migrationBody('BEGIN; SELECT 1; COMMIT; SELECT 2;'), /both outer/);
    assert.throws(() => migrationBody('SELECT 1; ROLLBACK;'), /Transaction control/);
    assert.ok(migrationBody("BEGIN; DO $body$ BEGIN RAISE NOTICE 'COMMIT;'; END $body$; COMMIT;").includes("RAISE NOTICE 'COMMIT;'"));
  } finally { await db.close(); }
});

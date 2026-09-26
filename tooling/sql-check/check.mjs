import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const db = new PGlite();
let passed = 0;
async function expectReject(label, sql, expected = '23514') {
  await db.exec('SAVEPOINT negative_test');
  try {
    await db.exec(sql);
    throw new Error(`Unexpected acceptance: ${label}`);
  } catch (e) {
    if (e.code !== expected) throw e;
    passed++;
    console.log(`PASS ${label}`);
  } finally {
    await db.exec('ROLLBACK TO SAVEPOINT negative_test');
  }
}
try {
  await db.exec('BEGIN; CREATE SCHEMA erp');
  for (const name of fs.readdirSync(path.join(root, 'database/migrations')).sort()) {
    await db.exec(fs.readFileSync(path.join(root, 'database/migrations', name), 'utf8'));
    console.log(`PASS migration ${name}`);
  }
  await db.exec(fs.readFileSync(path.join(root, 'database/verify.sql'), 'utf8'));
  await db.exec('COMMIT');
  console.log('PASS install and deferred constraints');
  await db.exec(`BEGIN;
    INSERT INTO erp.organizations(id,code,name) VALUES ('10000000-0000-0000-0000-000000000001','TEST_A','Test A'),('10000000-0000-0000-0000-000000000002','TEST_B','Test B');
    INSERT INTO public."user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES ('sql-test-user','SQL test','sql-test@example.invalid',false,now(),now());
    INSERT INTO erp.departments(id,organization_id,code,name) VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','D1','D1');
    INSERT INTO erp.memberships(id,organization_id,user_id) VALUES ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','sql-test-user');
    INSERT INTO iam.roles(id,organization_id,code,name) VALUES ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','TEST','Test');
  `);
  await expectReject('cross-organization FK', `INSERT INTO erp.teams(organization_id,code,name,department_id) VALUES ('10000000-0000-0000-0000-000000000002','X','X','20000000-0000-0000-0000-000000000001')`, '23503');
  await expectReject('hierarchy cycle', `UPDATE erp.departments SET parent_id=id WHERE code='D1'`);
  await expectReject('unsupported permission scope', `INSERT INTO iam.role_grants(organization_id,role_id,permission_id,scope_kind) SELECT '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',id,'TEAM' FROM iam.permissions WHERE key='supplier.read'`);
  await expectReject('unsupported amount limit', `INSERT INTO iam.role_grants(organization_id,role_id,permission_id,scope_kind,amount_limit,currency) SELECT '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',id,'ORG',100,'VND' FROM iam.permissions WHERE key='supplier.read'`);
  await expectReject('enabled SELECTED grant without bindings', `INSERT INTO iam.role_grants(organization_id,role_id,permission_id,scope_kind) SELECT '10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',id,'SELECTED' FROM iam.permissions WHERE key='project.read'; SET CONSTRAINTS ALL IMMEDIATE;`);
  await db.exec(`INSERT INTO iam.user_roles(organization_id,membership_id,role_id,assigned_by,reason,valid_from,valid_to) VALUES ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','sql-test-user','test','2026-01-01','2026-03-01')`);
  await expectReject('overlapping role assignment', `INSERT INTO iam.user_roles(organization_id,membership_id,role_id,assigned_by,reason,valid_from,valid_to) VALUES ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','sql-test-user','test','2026-02-01','2026-04-01')`);
  await expectReject('audit is append-only', `UPDATE erp.audit_events SET action='tampered'`);
  await expectReject('role change cannot self-approve', `INSERT INTO iam.role_change_requests(organization_id,requested_by,reviewed_by,change_kind,expected_policy_version,proposed_change) VALUES ('10000000-0000-0000-0000-000000000001','sql-test-user','sql-test-user','grant',1,'{}')`);
  await db.exec('ROLLBACK');
  // Check tenant RLS with a non-owner role. No role is created on the user's server.
  await db.exec(`BEGIN; CREATE ROLE sql_test_reader; GRANT USAGE ON SCHEMA erp TO sql_test_reader; GRANT SELECT ON erp.organizations TO sql_test_reader; SET LOCAL ROLE sql_test_reader;`);
  const hidden = await db.query('SELECT count(*)::int AS count FROM erp.organizations');
  if (hidden.rows[0].count !== 0) throw new Error('RLS leaked rows without tenant context');
  await db.exec('RESET ROLE');
  const org = await db.query("SELECT id FROM erp.organizations WHERE code='SIGNAGE'");
  await db.query("SELECT set_config('app.organization_id',$1,true)", [org.rows[0].id]);
  await db.exec('SET LOCAL ROLE sql_test_reader');
  const visible = await db.query('SELECT count(*)::int AS count FROM erp.organizations');
  if (visible.rows[0].count !== 1) throw new Error('RLS tenant filter failed');
  await db.exec('ROLLBACK');
  passed += 2;
  console.log(`PASS RLS deny without context / allow matching tenant`);
  console.log(`${passed} behavioral assertions passed; no remote connection used.`);
  const standalone = new PGlite();
  try {
    const installSql = fs.readFileSync(path.join(root, 'database/SIGNAGE_ERP_INSTALL.sql'), 'utf8');
    await standalone.exec(installSql);
    console.log('PASS exact standalone SQL Editor installer');
    try {
      await standalone.exec(installSql);
      throw new Error('Installer unexpectedly overwrote an existing schema');
    } catch (error) {
      if (!error.message.includes('ERP/IAM tables already exist')) throw error;
      await standalone.exec('ROLLBACK');
    }
    const count = await standalone.query('SELECT count(*)::int AS count FROM iam.permissions');
    if (count.rows[0].count !== 170) throw new Error('Reinstall changed existing data');
    console.log('PASS rerun stops safely and preserves installed data');
  } finally {
    await standalone.close();
  }
} catch (error) {
  console.error({ code: error.code, message: error.message, position: error.position, where: error.where });
  process.exitCode = 1;
} finally {
  await db.close();
}

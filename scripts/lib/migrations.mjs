import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Split top-level SQL only. Semicolons in strings, comments and DO/function
// bodies must not expose an inner COMMIT to the migration runner.
export function splitSql(source) {
  const statements = [];
  let start = 0, quote = null, block = 0, line = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (line) { if (ch === '\n') line = false; continue; }
    if (block) {
      if (ch === '/' && next === '*') { block++; i++; }
      else if (ch === '*' && next === '/') { block--; i++; }
      continue;
    }
    if (quote) {
      if (source.startsWith(quote, i)) {
        if (quote.length === 1 && next === quote) i++;
        else { i += quote.length - 1; quote = null; }
      } else if (quote === "'" && ch === '\\') i++;
      continue;
    }
    if (ch === '-' && next === '-') { line = true; i++; continue; }
    if (ch === '/' && next === '*') { block = 1; i++; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '$') {
      const tag = source.slice(i).match(/^\$(?:[a-zA-Z_][\w]*)?\$/)?.[0];
      if (tag) { quote = tag; i += tag.length - 1; continue; }
    }
    if (ch === ';') { statements.push(source.slice(start, i + 1)); start = i + 1; }
  }
  if (quote || block) throw new Error('Unterminated SQL string or comment');
  statements.push(source.slice(start));
  return statements;
}

function withoutLeadingComments(statement) {
  let text = statement.trim();
  while (text.startsWith('--') || text.startsWith('/*')) {
    if (text.startsWith('--')) text = text.slice(text.indexOf('\n') < 0 ? text.length : text.indexOf('\n') + 1).trim();
    else {
      let depth = 1, i = 2;
      for (; i < text.length && depth; i++) {
        if (text.slice(i, i + 2) === '/*') { depth++; i++; }
        else if (text.slice(i, i + 2) === '*/') { depth--; i++; }
      }
      text = text.slice(i).trim();
    }
  }
  return text;
}

export function migrationBody(source) {
  const parts = splitSql(source).filter(s => withoutLeadingComments(s));
  const first = withoutLeadingComments(parts[0] || '');
  const last = withoutLeadingComments(parts.at(-1) || '');
  const hasBegin = /^BEGIN(?:\s+(?:WORK|TRANSACTION))?\s*;$/i.test(first);
  const hasCommit = /^COMMIT(?:\s+(?:WORK|TRANSACTION))?\s*;$/i.test(last);
  if (hasBegin !== hasCommit) throw new Error('Migration must have both outer BEGIN and COMMIT, or neither');
  if (hasBegin) { parts.shift(); parts.pop(); }
  for (const part of parts) {
    if (/^(?:BEGIN|START\s+TRANSACTION|COMMIT|END|ROLLBACK|ABORT|SAVEPOINT|RELEASE|PREPARE\s+TRANSACTION)\b/i.test(withoutLeadingComments(part))) {
      throw new Error('Transaction control inside migration is not allowed');
    }
  }
  return parts.join('\n');
}

export function readMigrations(root = process.cwd()) {
  const dir = path.join(root, 'database/migrations');
  return fs.readdirSync(dir).filter(n => /^\d+_.+\.sql$/.test(n)).sort().map(name => {
    const source = fs.readFileSync(path.join(dir, name), 'utf8');
    return { name, checksum: crypto.createHash('sha256').update(source).digest('hex'), sql: migrationBody(source) };
  });
}

export async function migrationStatus(db, migrations) {
  const ready = (await db.query("SELECT to_regclass('erp.schema_migrations') IS NOT NULL AS ready")).rows[0].ready;
  const applied = ready ? (await db.query('SELECT name, checksum FROM erp.schema_migrations ORDER BY name')).rows : [];
  const byName = new Map(applied.map(r => [r.name, r.checksum]));
  return {
    applied: migrations.filter(m => byName.get(m.name) === m.checksum).map(m => m.name),
    pending: migrations.filter(m => !byName.has(m.name)).map(m => m.name),
    changed: migrations.filter(m => byName.has(m.name) && byName.get(m.name) !== m.checksum).map(m => m.name),
    unknown: applied.filter(m => !migrations.some(f => f.name === m.name)).map(m => m.name),
  };
}

export async function runMigrations(db, migrations, { apply = false, only, log = () => {} } = {}) {
  await db.query('BEGIN');
  try {
    await db.query("SET LOCAL lock_timeout = '10s'; SET LOCAL statement_timeout = '120s'");
    await db.query('SELECT pg_advisory_xact_lock(842617305)');
    await db.query('CREATE SCHEMA IF NOT EXISTS erp');
    await db.query('CREATE TABLE IF NOT EXISTS erp.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    await db.query('REVOKE ALL ON erp.schema_migrations FROM PUBLIC');
    const status = await migrationStatus(db, migrations);
    if (status.changed.length || status.unknown.length) throw new Error(`Migration history differs: ${[...status.changed, ...status.unknown].join(', ')}`);
    if (only && !migrations.some(m => m.name === only)) throw new Error(`Unknown migration: ${only}`);
    const pending = migrations.filter(m => status.pending.includes(m.name) && (!only || only === m.name));
    const latest = status.applied.at(-1);
    if (!only && latest && pending.some(m => m.name < latest)) {
      throw new Error(`Untracked older migrations: ${pending.filter(m => m.name < latest).map(m => m.name).join(', ')}. Reconcile existing schema/history before applying all migrations; do not rerun old seed data blindly.`);
    }
    for (const migration of pending) {
      try { await db.query(migration.sql); }
      catch (e) { throw new Error(`${migration.name}: ${e.message}`, { cause: e }); }
      await db.query('INSERT INTO erp.schema_migrations(name,checksum) VALUES($1,$2)', [migration.name, migration.checksum]);
      log(`Validated: ${migration.name}`);
    }
    await db.query('SET CONSTRAINTS ALL IMMEDIATE');
    await db.query(apply ? 'COMMIT' : 'ROLLBACK');
    return pending.map(m => m.name);
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  }
}

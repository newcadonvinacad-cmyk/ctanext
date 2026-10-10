import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readMigrations, runMigrations } from './migrations.mjs';

export const columnQuery = `SELECT table_schema, table_name, column_name, udt_name
  FROM information_schema.columns
  WHERE table_schema IN ('erp','iam') OR
    (table_schema='public' AND table_name IN ('user','session','account','verification'))
  ORDER BY table_schema, table_name, ordinal_position`;

export async function expectedSchema(migrations = readMigrations()) {
  const db = new PGlite({ extensions: { btree_gist } });
  try {
    await db.exec('CREATE EXTENSION btree_gist');
    const adapter = { query: (sql, values) => values ? db.query(sql, values) : db.exec(sql).then(r => r.at(-1)) };
    await runMigrations(adapter, migrations, { apply: true });
    return (await db.query(columnQuery)).rows;
  } finally { await db.close(); }
}

export function compareColumns(expected, actual) {
  const key = r => `${r.table_schema}.${r.table_name}.${r.column_name}`;
  const actualMap = new Map(actual.map(r => [key(r), r]));
  return expected.flatMap(row => {
    const found = actualMap.get(key(row));
    if (!found) return [{ column: key(row), problem: 'missing', expected: row.udt_name }];
    return found.udt_name === row.udt_name ? [] : [{ column: key(row), problem: 'type', expected: row.udt_name, actual: found.udt_name }];
  });
}

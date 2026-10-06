import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
  orgIdCache?: Map<string, string>;
};

export const dbPool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL || "",
    max: 20,
    min: 4,
    idleTimeoutMillis: 120000,
    connectionTimeoutMillis: 7000,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
  });

globalForPg.pgPool = dbPool;

dbPool.on("error", (err) => {
  console.error("[DB POOL ERROR] Lỗi kết nối CSDL:", err.message);
});

export function getDbPool(): Pool {
  return dbPool;
}

const orgIdCache = globalForPg.orgIdCache ?? new Map<string, string>();
globalForPg.orgIdCache = orgIdCache;

export async function getCachedOrgId(orgCode = "SIGNAGE"): Promise<string> {
  const cached = orgIdCache.get(orgCode);
  if (cached) return cached;

  const res = await dbPool.query(
    "SELECT id FROM erp.organizations WHERE code = $1 LIMIT 1",
    [orgCode]
  );
  if (res.rows.length === 0) {
    throw new Error(`Organization '${orgCode}' not found in database!`);
  }
  const id = res.rows[0].id;
  orgIdCache.set(orgCode, id);
  return id;
}

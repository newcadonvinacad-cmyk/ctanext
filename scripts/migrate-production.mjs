import nextEnv from '@next/env';
import pg from 'pg';
import fs from 'node:fs';
import crypto from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const mode=process.argv[2] || 'check';
if(!['check','apply'].includes(mode))throw new Error('Use check or apply');
const code='019_production_workflow',name=code+'.sql',source=fs.readFileSync('database/migrations/'+name,'utf8');
const db=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000,ssl:{rejectUnauthorized:false},application_name:'signage-production-migration'});
try{
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL missing');await db.connect();
 const marker=(await db.query("SELECT to_regclass('erp.application_migrations') IS NOT NULL AS ready")).rows[0].ready;
 if(marker && (await db.query('SELECT code FROM erp.application_migrations WHERE code=$1',[code])).rowCount){console.log('Production migration already applied');}
 else{
  await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='120s'");await db.query('SELECT pg_advisory_xact_lock(842617306)');
  const before=(await db.query('SELECT (SELECT COUNT(*) FROM erp.stock_balances) AS balances,(SELECT COUNT(*) FROM erp.stock_movements) AS movements,(SELECT COUNT(*) FROM erp.sales_orders) AS orders')).rows[0];
  await db.query(source.replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,''));
  const after=(await db.query('SELECT (SELECT COUNT(*) FROM erp.stock_balances) AS balances,(SELECT COUNT(*) FROM erp.stock_movements) AS movements,(SELECT COUNT(*) FROM erp.sales_orders) AS orders')).rows[0];
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Operational record counts changed');
  const hasTracking=(await db.query("SELECT to_regclass('erp.schema_migrations') IS NOT NULL AS ready")).rows[0].ready;
  if(hasTracking)await db.query('INSERT INTO erp.schema_migrations(name,checksum) VALUES($1,$2) ON CONFLICT(name) DO NOTHING',[name,crypto.createHash('sha256').update(source).digest('hex')]);
  await db.query(mode==='apply'?'COMMIT':'ROLLBACK');console.log(mode==='apply'?'Production migration committed; stock and sales records preserved':'Production migration validated and rolled back; no changes persisted');
 }
}catch(e){await db.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({error:e.code || e.name,message:String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'[REDACTED]'),constraint:e.constraint}));process.exitCode=1;}finally{await db.end().catch(()=>{});}

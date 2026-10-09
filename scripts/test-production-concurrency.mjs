import nextEnv from '@next/env';
import pg from 'pg';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const source=new URL(process.env.DATABASE_URL),name='codex_prod_test_'+crypto.randomUUID().replaceAll('-',''),tag='Codex disposable production concurrency test '+crypto.randomUUID();
if(!/^codex_prod_test_[a-f0-9]{32}$/.test(name)||source.pathname.slice(1)===name)throw Error('Unsafe test target');
const db=new pg.Client({connectionString:source.toString(),ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});let created=false;
try{
 await db.connect();await db.query(`CREATE DATABASE "${name}"`);created=true;await db.query(`COMMENT ON DATABASE "${name}" IS '${tag}'`);
 const testUrl=new URL(source);testUrl.pathname='/'+name;
 const status=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['tests/production-concurrency.test.cjs'],{stdio:'inherit',env:{...process.env,PRODUCTION_CONCURRENCY_DATABASE_URL:testUrl.toString()}});p.on('error',reject);p.on('exit',resolve);});
 if(status!==0)process.exitCode=Number(status)||1;
}catch(e){console.error('Concurrency test setup failed:',e.code || e.name);process.exitCode=1;}
finally{
 if(created){const r=await db.query("SELECT shobj_description(oid,'pg_database') AS tag FROM pg_database WHERE datname=$1",[name]);if(r.rows[0]?.tag!==tag)throw Error('Test database ownership marker changed; cleanup stopped');await db.query(`DROP DATABASE "${name}" WITH (FORCE)`);console.log('Disposable concurrency database removed; application database preserved');}
 await db.end();
}

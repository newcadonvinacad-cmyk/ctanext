const {PGlite}=require('@electric-sql/pglite');
const {btree_gist}=require('@electric-sql/pglite/contrib/btree_gist');
const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const {prepareValue}=require('pg/lib/utils');
async function productionDb(options={}){
 let realPool;
 if(options.connectionString){const name=new URL(options.connectionString).pathname.slice(1);if(!/^codex_prod_test_[a-f0-9]{32}$/.test(name))throw Error('Only a disposable concurrency-test database is allowed');realPool=new (require('pg').Pool)({connectionString:options.connectionString,ssl:{rejectUnauthorized:false},max:10,connectionTimeoutMillis:15000});const check=await realPool.query("SELECT to_regclass('erp.organizations') IS NOT NULL AS occupied");if(check.rows[0].occupied)throw Error('Test database must be empty');}
 const pg=realPool?{exec:sql=>realPool.query(sql),query:(sql,args)=>realPool.query(sql,args),close:()=>realPool.end()}:new PGlite({extensions:{btree_gist}});
 await pg.exec('CREATE EXTENSION btree_gist;');
 for(const file of ['001_better_auth.sql','002_erp_iam.sql','003_integrity.sql','010_phase2_signage_features.sql','011_phase3_signage_bom_bi.sql','015_hrm_salary_policy.sql','016_hrm_shifts_holidays_leave.sql','017_hrm_locations_and_requests.sql','018_internal_documents_and_folders.sql','019_production_workflow.sql','020_feature_plan_enhancements.sql','021_permission_audit_enhancements.sql']){
  try{await pg.exec(fs.readFileSync('database/migrations/'+file,'utf8'));}catch(e){console.error('Migration failed:',file,e.message);throw e;}
 }
 let queue=Promise.resolve();
 const query=async(sql,params=[])=>{const r=await pg.query(sql,params.map(p=>prepareValue(p)));return {...r,rowCount:r.affectedRows ?? r.rows.length};};
 const pool=realPool || {query,async connect(){let unlock;const previous=queue;queue=new Promise(r=>unlock=r);await previous;return {query,release:unlock};}};
 const user='test-production-user';
 await query('INSERT INTO public."user"(id,name,email,"createdAt","updatedAt") VALUES($1,$2,$3,now(),now())',[user,'Test User','production-test@example.invalid']);
 const org=(await query("INSERT INTO erp.organizations(code,name,bootstrap_state) VALUES('TEST-PRODUCTION','Test production','locked') RETURNING id")).rows[0].id;
 const membership=(await query('INSERT INTO erp.memberships(organization_id,user_id) VALUES($1,$2) RETURNING id',[org,user])).rows[0].id;
 const employee=(await query("INSERT INTO erp.employees(organization_id,code,name,membership_id) VALUES($1,'TEST','Test User',$2) RETURNING id",[org,membership])).rows[0].id;
 const permissions=['item.read','item.update','production_order.read','production_order.create','production_order.update','production_order.release','production_order.report','production_order.qc','production_order.complete','stock_document.create','stock_document.read','stock_document.approve','stock_document.post','stock_document.complete','stock_document.cancel','stock_document.reverse','sales_order.create','sales_order.read','sales_order.approve','sales_order.cancel'];
 const capabilities=Object.fromEntries(permissions.map(key=>[key,{permission:key,scope:'ORG',isEnabled:true,amountLimit:null}]));
 const ctx={orgId:org,userId:user,membershipId:membership,employeeId:employee,capabilities};
 const cache=new Map();
 const mocks={
  '@/lib/db':{getDbPool:()=>pool,getCachedOrgId:async()=>org},
  './authorization.service':{AuthorizationService:{getUserCapabilities:async(uid)=>({roles:uid===user?['SUPER_ADMIN']:[],membershipStatus:'active',employeeId:employee,membershipId:membership,capabilities})},invalidateUserCapabilitiesCache:()=>{}},
  '@/services/authorization.service':{AuthorizationService:{getUserCapabilities:async(uid)=>({roles:uid===user?['SUPER_ADMIN']:[],membershipStatus:'active',employeeId:employee,membershipId:membership,capabilities})},invalidateUserCapabilitiesCache:()=>{}},
 };
 function load(file){
  file=path.resolve(file);if(cache.has(file))return cache.get(file);
  const exports={};cache.set(file,exports);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const req=id=>{if(id in mocks)return mocks[id];if(id.startsWith('@/'))return load(path.join('src',id.slice(2))+'.ts');if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id)+'.ts');return require(id);};
  vm.runInNewContext(code,{exports,require:req,console,Date,Set,Map,Buffer,process,crypto:require('crypto')},{filename:file});return exports;
 }
 return {pg,pool,query,ctx,load,close:()=>pg.close()};
}
module.exports={productionDb};

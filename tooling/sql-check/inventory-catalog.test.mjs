// Integration tests against an isolated PostgreSQL-compatible database; no .env or remote DB is used.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const nativeRequire=createRequire(path.join(root,'package.json'));
const ts=nativeRequire('typescript');
const db=new PGlite();
const client={query:(sql,args)=>db.query(sql,args),release(){}};
const pool={...client,connect:async()=>client};
let capabilities={}, session={user:{id:'catalog-test-user'}};
const cache=new Map();
function load(relative) {
  const filename=path.resolve(root,relative);
  if(cache.has(filename)) return cache.get(filename).exports;
  const module={exports:{}};cache.set(filename,module);
  const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  function requireForTest(id) {
    if(id==='./authorization.service'||id==='@/services/authorization.service') return {getDbPool:()=>pool,AuthorizationService:{getUserCapabilities:async()=>({capabilities,membershipStatus:'active'})}};
    if(id==='@/lib/auth') return {auth:{api:{getSession:async()=>session}}};
    if(id==='next/headers') return {headers:async()=>new Headers()};
    if(id==='next/server') return {NextResponse:{json:(data,options)=>({data,status:options?.status||200})}};
    if(id.startsWith('@/')) return load('src/'+id.slice(2)+'.ts');
    if(id.startsWith('.')) return load(path.relative(root,path.resolve(path.dirname(filename),id+'.ts')));
    return nativeRequire(id);
  }
  new Function('require','module','exports',source)(requireForTest,module,module.exports);
  return module.exports;
}
let passed=0;
function check(label,fn){fn();passed++;console.log('PASS '+label);}
async function rejects(label,fn,pattern){await assert.rejects(fn,pattern);passed++;console.log('PASS '+label);}
try {
  await db.exec('CREATE SCHEMA erp');
  for(const file of fs.readdirSync(path.join(root,'database/migrations')).sort()) await db.exec(fs.readFileSync(path.join(root,'database/migrations',file),'utf8'));
  await db.exec(`INSERT INTO public."user"(id,name,email,"emailVerified","createdAt","updatedAt")
    VALUES('catalog-test-user','Catalog test','catalog-test@example.invalid',false,now(),now());`);
  const org=(await db.query("SELECT id FROM erp.organizations WHERE code='SIGNAGE'")).rows[0].id;
  const member=(await db.query("INSERT INTO erp.memberships(organization_id,user_id) VALUES($1,'catalog-test-user') RETURNING id",[org])).rows[0].id;
  const {InventoryCatalogService:service}=load('src/services/inventory-catalog.service.ts');
  const {InventoryService:inventory}=load('src/services/inventory.service.ts');
  const {catalogItemSchema,warehouseSchema}=load('src/lib/inventory-validation.ts');
  const user='catalog-test-user';
  const a=await service.saveWarehouse(org,user,{code:'QA-A',name:'Kho A',type:'workshop',isActive:true});
  const b=await service.saveWarehouse(org,user,{code:'QA-B',name:'Kho B',type:'workshop',isActive:true});
  await service.saveWarehouse(org,user,{code:'QA-A',name:'Kho A sửa',type:'distribution',isActive:true},a);
  const wh=(await db.query('SELECT name,kind FROM erp.warehouses WHERE id=$1',[a])).rows[0];
  check('warehouse edits persist',()=>assert.deepEqual(wh,{name:'Kho A sửa',kind:'distribution'}));
  await rejects('duplicate warehouse code rejected',()=>service.saveWarehouse(org,user,{code:'QA-A',name:'Duplicate',type:'workshop',isActive:true}),{code:'23505'});
  await rejects('editing missing warehouse returns 404',()=>service.saveWarehouse(org,user,{code:'X',name:'X',type:'workshop',isActive:true},crypto.randomUUID()),{status:404});
  const category=await service.saveLookup(org,user,'categories',{code:'QA-CAT',name:'Tấm kiểm thử'});
  const metre=await service.saveLookup(org,user,'units',{code:'QA-M',name:'Mét',dimension:'length'});
  const roll=await service.saveLookup(org,user,'units',{code:'QA-ROLL',name:'Cuộn',dimension:'count'});
  const input=catalogItemSchema.parse({code:'qa-sheet',name:'Vật tư kiểm thử',kind:'material',categoryId:category,baseUnitId:metre,specJson:{thickness:'3mm'},conversions:[{unitId:roll,factorToBase:80}]});
  const item=await service.saveItem(org,user,input);
  const list=await service.listItems(org),saved=list.find(i=>i.id===item);
  check('catalog keeps specifications and conversions without stock fields',()=>{
    assert.equal(saved.specJson.thickness,'3mm');assert.equal(saved.conversions[0].factorToBase,80);
    assert.equal('totalOnHand' in saved,false);assert.equal('inventoryValue' in saved,false);
  });
  const counts=(await db.query('SELECT (SELECT count(*) FROM erp.stock_balances WHERE item_id=$1)::int AS balances,(SELECT count(*) FROM erp.warehouse_item_settings WHERE item_id=$1)::int AS settings',[item])).rows[0];
  check('creating material does not create stock or arbitrary warehouse settings',()=>assert.deepEqual(counts,{balances:0,settings:0}));
  await service.saveItem(org,user,{...input,name:'Tên đã sửa',conversions:[{unitId:roll,factorToBase:60}]},item);
  const current=(await service.listItems(org)).find(i=>i.id===item);
  check('conversion change expires history and returns only current factor',()=>{assert.equal(current.name,'Tên đã sửa');assert.equal(current.conversions.length,1);assert.equal(current.conversions[0].factorToBase,60);});
  const legacy=await inventory.listItems({keyword:'QA-SHEET'});
  check('existing document item API uses current conversion only',()=>assert.equal(legacy.items[0].conversions.length,1));
  await rejects('base unit changes are rejected',()=>service.saveItem(org,user,{...input,baseUnitId:roll,conversions:[]},item),{status:409});
  await rejects('used category cannot be deleted',()=>service.deleteLookup(org,'categories',category),{code:'23503'});
  await rejects('used unit cannot be deleted',()=>service.deleteLookup(org,'units',metre),{code:'23503'});
  const disposable=await service.saveLookup(org,user,'categories',{code:'QA-EMPTY',name:'Xóa được'});
  await service.deleteLookup(org,'categories',disposable);
  const deletedCategory=await db.query('SELECT id FROM erp.item_categories WHERE id=$1',[disposable]);
  check('unused category can be deleted',()=>assert.equal(deletedCategory.rows.length,0));
  const lot=(await db.query('SELECT id FROM erp.stock_lots WHERE item_id=$1',[item])).rows[0].id;
  for(const [warehouse,qty] of [[a,12],[b,7]]) await db.query(`INSERT INTO erp.stock_balances
    (organization_id,warehouse_id,item_id,lot_id,on_hand_qty,reserved_qty,inventory_value) VALUES($1,$2,$3,$4,$5::numeric,0,$5::numeric*10)`,[org,warehouse,item,lot,qty]);
  const all=await inventory.getWarehouseStock(undefined,{warehouseIds:[a,b]},{canViewCost:true});
  const single=await inventory.getWarehouseStock(b,{warehouseIds:[a,b]},{canViewCost:false});
  check('all warehouses includes both same-kind warehouse balances',()=>{assert.equal(all.length,2);assert.equal(all.reduce((s,r)=>s+r.onHandQty,0),19);});
  check('warehouse filter returns exact warehouse and hides cost',()=>{assert.equal(single.length,1);assert.equal(single[0].warehouseId,b);assert.equal(single[0].inventoryValue,0);});
  const noStocks=await inventory.getWarehouseStock(undefined,{warehouseIds:[]});
  check('empty allowed warehouse list cannot leak stocks',()=>assert.equal(noStocks.length,0));
  await rejects('warehouse with stock cannot be deleted',()=>service.deleteWarehouse(org,a),{code:'23503'});
  await rejects('warehouse with stock cannot be deactivated',()=>service.saveWarehouse(org,user,{code:'QA-A',name:'A',type:'workshop',isActive:false},a),{status:409});
  const empty=await service.saveWarehouse(org,user,{code:'QA-EMPTY',name:'Kho trống',type:'transit',isActive:true});
  await service.saveWarehouse(org,user,{code:'QA-EMPTY',name:'Kho trống',type:'transit',isActive:false},empty);
  await service.deleteWarehouse(org,empty);
  const deletedWarehouse=await db.query('SELECT id FROM erp.warehouses WHERE id=$1',[empty]);
  check('unused warehouse can be deactivated and deleted',()=>assert.equal(deletedWarehouse.rows.length,0));
  check('invalid catalog conversions rejected before database',()=>{
    assert.equal(catalogItemSchema.safeParse({...input,conversions:[{unitId:roll,factorToBase:0}]}).success,false);
    assert.equal(catalogItemSchema.safeParse({...input,conversions:[{unitId:metre,factorToBase:1}]}).success,false);
    assert.equal(warehouseSchema.safeParse({code:' ',name:' ',type:'invalid'}).success,false);
  });
  const {allowedWarehouseIds}=load('src/lib/inventory-api.ts');
  const role=(await db.query("INSERT INTO iam.roles(organization_id,code,name) VALUES($1,'QA-WH','Kho được giao') RETURNING id",[org])).rows[0].id;
  await db.query("INSERT INTO iam.user_roles(organization_id,membership_id,role_id,assigned_by,reason) VALUES($1,$2,$3,$4,'Test')",[org,member,role,user]);
  await db.query("INSERT INTO iam.role_grants(organization_id,role_id,permission_id,scope_kind) SELECT $1,$2,id,'ASSIGNED' FROM iam.permissions WHERE key='inventory.read'",[org,role]);
  await db.query('INSERT INTO erp.warehouse_members(organization_id,warehouse_id,membership_id) VALUES($1,$2,$3)',[org,a,member]);
  const assigned=await allowedWarehouseIds(user,org);
  check('assigned scope includes only assigned warehouse',()=>assert.deepEqual(assigned,[a]));
  capabilities={'inventory.read':{isEnabled:true},'item.read':{isEnabled:true}};
  const warehouseRoutes=load('src/app/api/inventory/warehouses/route.ts');
  const stockRoutes=load('src/app/api/inventory/warehouses/[id]/stocks/route.ts');
  const catalogRoutes=load('src/app/api/inventory/catalog/route.ts');
  const denied=await warehouseRoutes.POST(new Request('http://test/api',{method:'POST',body:JSON.stringify({code:'DENIED',name:'Denied',type:'workshop'})}));
  check('read-only user cannot create warehouse',()=>assert.equal(denied.status,403));
  const listed=await warehouseRoutes.GET();
  check('warehouse dropdown respects assignment',()=>assert.deepEqual(listed.data.warehouses.map(w=>w.id),[a]));
  const forbidden=await stockRoutes.GET(new Request('http://test/api'),{params:Promise.resolve({id:b})});
  check('direct request to another warehouse is denied',()=>assert.equal(forbidden.status,403));
  const allowed=await stockRoutes.GET(new Request('http://test/api'),{params:Promise.resolve({id:'all'})});
  check('all API returns authorized balances only',()=>{assert.equal(allowed.data.stocks.length,1);assert.equal(allowed.data.stocks[0].warehouseId,a);});
  session=null;
  const anonymous=await catalogRoutes.GET();
  check('unauthenticated catalog request denied',()=>assert.equal(anonymous.status,401));
  console.log(`${passed} inventory integration checks passed; isolated local database only.`);
} catch(error) {
  console.error(error.message, error.code || "", error.detail || "");
  process.exitCode=1;
} finally { await db.close(); }

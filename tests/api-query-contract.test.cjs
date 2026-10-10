const test = require('node:test');
const assert = require('node:assert/strict');
const { productionDb } = require('./helpers/production-db.cjs');

// Next route handlers and SQL are real. Only the signed-in identity and its
// capabilities are supplied by the fixture; no live database/network is used.
test('page and form API handlers execute against real SQL', {timeout:60000}, async t => {
  const db = await productionDb({http:true});
  try {
    for (const {key} of (await db.query('SELECT key FROM iam.permissions')).rows) {
      db.ctx.capabilities[key]={permission:key,scope:'ORG',isEnabled:true,amountLimit:null};
    }
    // The production fixture deliberately omits demo seed 004. Give this actor
    // the explicit read capabilities needed to exercise each endpoint's SQL.
    for(const resource of ['payment','receivable','payable','customer','supplier','purchase_order','project','project_template',
      'task','field_event','attendance','salary','employee','payroll','role','membership','company_setting','project_finance']){
      const key=`${resource}.read`;
      db.ctx.capabilities[key]={permission:key,scope:'ORG',isEnabled:true,amountLimit:null};
    }
    const customerId=await db.load('src/services/crm.service.ts').CrmService.createCustomer({name:'API customer'},db.ctx.userId);
    const projectId=await db.load('src/services/project.service.ts').ProjectService.createProject({name:'API project',address:'API address',customerId},db.ctx.userId);
    const paths = [
      'finance/overview','finance/accounts','finance/movements','finance/payments','finance/open-items?side=receivable',
      'crm/customers','crm/quotations','crm/orders','procurement/suppliers','procurement/orders',
      'projects','projects/employees','projects/templates','projects/tasks','field/my-tasks','field/work-reports',
      'inventory/items','inventory/catalog','inventory/categories','inventory/units','inventory/warehouses',
      'inventory/metadata','inventory/remnants','inventory/counts','inventory/documents',
      'hr/attendance','hr/salaries','hrm/employees','hrm/attendance?year=2026&month=10',
      'hrm/attendance/today','hrm/attendance/today-status','hrm/shifts','hrm/holidays','hrm/leave-policy',
      'hrm/leave-balances','hrm/locations','hrm/payroll/periods','hrm/requests','hrm/templates',
      'design-proofs','surveys','service-tickets','documents','documents/folders',
      'iam/roles','iam/users','iam/role-change-requests','settings/company','notifications',
      'fleet/vehicles','fleet/trips','production-orders/metadata','production-orders',
      `production-orders/available-products?projectId=${projectId}`,'production-orders/readiness','material-representatives',
      'bom','analytics/signage','dashboard/stats',
    ];
    const cases=paths.map(endpoint=>({endpoint,path:endpoint.split('?')[0],params:{}}));
    for(const path of ['projects/[id]','projects/[id]/acceptances','projects/[id]/contracts','projects/[id]/design-proofs',
      'projects/[id]/documents','projects/[id]/finance','projects/[id]/materials','projects/[id]/members',
      'projects/[id]/qc-records','projects/[id]/reports','projects/[id]/tasks','projects/[id]/warranty']){
      cases.push({endpoint:path.replace('[id]',projectId),path,params:{id:projectId}});
    }
    cases.push({endpoint:`crm/customers/${customerId}`,path:'crm/customers/[id]',params:{id:customerId}});
    for (const {endpoint,path,params} of cases) {
      await t.test(`GET /api/${endpoint}`, async () => {
        const route=db.load(`src/app/api/${path}/route.ts`);
        const request=new (require('next/server').NextRequest)(`http://test.invalid/api/${endpoint}`);
        await db.query('BEGIN READ ONLY');
        try {
          const response=await route.GET(request,{params:Promise.resolve(params)});
          const body=await response.json();
          assert.equal(response.status,200,JSON.stringify(body));
          assert.ok(body && typeof body==='object');
        } finally { await db.query('ROLLBACK'); }
      });
    }
    const call=async(path,method='GET',payload,params={},expected=200)=>{
      const request=new Request(`http://test.invalid/api/${path}`,{method,...(payload===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})});
      const response=await db.load(`src/app/api/${path}/route.ts`)[method](request,{params:Promise.resolve(params)});
      const body=await response.json();
      assert.equal(response.status,expected,JSON.stringify(body));
      return body;
    };
    for(const key of ['customer.create','customer.update','employee.create','attendance.update','document.manage','item.create']){
      db.ctx.capabilities[key]={permission:key,scope:'ORG',isEnabled:true,amountLimit:null};
    }
    await t.test('customer form API: rejects missing name, creates, edits, reopens',async()=>{
      await call('crm/customers','POST',{name:''},{},400);
      const {customerId:id}=await call('crm/customers','POST',{name:'HTTP customer',contactName:'Contact'},{},201);
      await call('crm/customers/[id]','PUT',{name:'HTTP customer edited',phone:'0902222222'},{id});
      const saved=await call('crm/customers/[id]','GET',undefined,{id});
      assert.equal(saved.customer.name,'HTTP customer edited');
      assert.equal(saved.customer.phone,'0902222222');
    });
    await t.test('employee form API: saves salary and reopens',async()=>{
      const {employee}=await call('hrm/employees','POST',{name:'HTTP employee',baseSalary:'8000000',payBasis:'monthly'},{},201);
      const {employees}=await call('hrm/employees');
      assert.equal(Number(employees.find(r=>r.id===employee.id).baseSalary),8000000);
    });
    await t.test('shift form API: validates, saves and reopens edits',async()=>{
      await call('hrm/shifts','POST',{name:'Incomplete'},{},400);
      const data={code:'HTTP-SHIFT',name:'HTTP shift',startTime:'08:00',endTime:'17:00'};
      const {data:created}=await call('hrm/shifts','POST',data);
      await call('hrm/shifts','POST',{...data,id:created.id,name:'HTTP shift edited'});
      assert.equal((await call('hrm/shifts')).data.find(r=>r.id===created.id).name,'HTTP shift edited');
    });
    await t.test('survey form API: creates, edits and reopens detail',async()=>{
      const {survey}=await call('surveys','POST',{title:'HTTP survey',address:'Address',customerId,projectId,widthMeters:3},{},201);
      await call('surveys/[id]','PUT',{title:'HTTP survey edited',widthMeters:5},{id:survey.id});
      assert.equal((await call('surveys/[id]','GET',undefined,{id:survey.id})).survey.widthMeters,5);
    });
    await t.test('folder form API: rejects missing name, creates and lists',async()=>{
      await call('documents/folders','POST',{name:''},{},400);
      const {folder}=await call('documents/folders','POST',{name:'HTTP folder'});
      assert.ok((await call('documents/folders')).userFolders.some(r=>r.id===folder.id));
    });
    await t.test('catalog form API: validates, saves, rejects duplicate, edits, opens item detail',async()=>{
      const K=db.load('src/services/inventory-catalog.service.ts').InventoryCatalogService;
      const baseUnitId=await K.saveLookup(db.ctx.orgId,db.ctx.userId,'units',{code:'HTTP-EA',name:'Each',dimension:'count'});
      const categoryId=await K.saveLookup(db.ctx.orgId,db.ctx.userId,'categories',{code:'HTTP-CAT',name:'Materials'});
      const data={code:'HTTP-ITEM',name:'HTTP item',kind:'material',baseUnitId,categoryId,specJson:{color:'blue'},isActive:true,conversions:[]};
      await call('inventory/catalog','POST',{...data,baseUnitId:'bad-uuid'},{},400);
      const {id}=await call('inventory/catalog','POST',data,{},201);
      await call('inventory/catalog','POST',data,{},409);
      await call('inventory/catalog/[id]','PUT',{...data,name:'HTTP item edited'},{id});
      assert.equal((await call('inventory/items/[id]','GET',undefined,{id})).item.name,'HTTP item edited');
    });
    await t.test('ItemModal payload: create preserves specifications, warehouse settings and inactive state; edit reopens',async()=>{
      const K=db.load('src/services/inventory-catalog.service.ts').InventoryCatalogService;
      const baseUnitId=await K.saveLookup(db.ctx.orgId,db.ctx.userId,'units',{code:'MODAL-EA',name:'Each',dimension:'count'});
      const categoryId=await K.saveLookup(db.ctx.orgId,db.ctx.userId,'categories',{code:'MODAL-CAT',name:'Materials'});
      await K.saveWarehouse(db.ctx.orgId,db.ctx.userId,{code:'MODAL-WH',name:'Workshop',type:'workshop',isActive:true});
      // Match ItemModal.tsx and vat-tu/page.tsx: they send `specification`, not `specJson`.
      const payload={code:'MODAL-ITEM',name:'Modal item',kind:'material',baseUnitId,categoryId,specification:{color:'blue',width:'1200'},isActive:false,minQty:5,binLabel:'A1',conversions:[]};
      const {item}=await call('inventory/items','POST',payload,{},201);
      const created=(await call('inventory/items/[id]','GET',undefined,{id:item.id})).item;
      assert.equal(created.specJson.color,'blue');
      assert.equal(created.isActive,false);
      assert.equal(created.minQty,5);
      assert.equal(created.binLabel,'A1');
      await call('inventory/items/[id]','PUT',{...payload,name:'Modal edited',specification:{color:'red'},isActive:true,minQty:8},{id:item.id});
      const edited=(await call('inventory/items/[id]','GET',undefined,{id:item.id})).item;
      assert.equal(edited.specJson.color,'red');
      assert.equal(edited.isActive,true);
      assert.equal(edited.minQty,8);
    });
    await t.test('unauthorized form save returns 403 without inserting data',async()=>{
      const before=(await db.query('SELECT count(*) FROM erp.partners')).rows[0].count;
      const cap=db.ctx.capabilities['customer.create'];
      cap.isEnabled=false;
      try { await call('crm/customers','POST',{name:'Must not be saved'},{},403); }
      finally { cap.isEnabled=true; }
      assert.equal((await db.query('SELECT count(*) FROM erp.partners')).rows[0].count,before);
    });
  } finally { await db.close(); }
});

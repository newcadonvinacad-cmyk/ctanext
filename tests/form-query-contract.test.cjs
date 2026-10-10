const test = require('node:test');
const assert = require('node:assert/strict');
const { productionDb } = require('./helpers/production-db.cjs');

// Execute the services behind form/detail APIs against disposable PostgreSQL.
// No query results are mocked, and every write is read back through the service.
test('form saves and detail/lookup queries work with populated data', {timeout:60000}, async t => {
  const db = await productionDb();
  const { orgId, userId, membershipId, employeeId } = db.ctx;
  const load = (file, name) => db.load(`src/services/${file}.service.ts`)[name];
  const C = load('crm', 'CrmService');
  const P = load('project', 'ProjectService');
  const S = load('procurement', 'ProcurementService');
  const H = load('hrm', 'HrmService');
  const D = load('document', 'DocumentService');
  const K = load('inventory-catalog', 'InventoryCatalogService');
  const I = load('inventory', 'InventoryService');
  const F = load('signage-phase2', 'SignagePhase2Service');
  const read = async fn => {
    await db.query('BEGIN READ ONLY');
    try { return await fn(); } finally { await db.query('ROLLBACK'); }
  };
  try {
    const customerId = (await db.query(`INSERT INTO erp.partners
      (organization_id,code,name,is_customer,owner_membership_id)
      VALUES($1,'FORM-CUSTOMER','Form customer',true,$2) RETURNING id`, [orgId,membershipId])).rows[0].id;
    const projectId = (await db.query(`INSERT INTO erp.projects
      (organization_id,code,name,address,customer_id,manager_membership_id)
      VALUES($1,'FORM-PROJECT','Form project','Test address',$2,$3) RETURNING id`, [orgId,customerId,membershipId])).rows[0].id;

    await t.test('customer: create, detail, edit, filtered lookup', async () => {
      const id = await C.createCustomer({name:'Customer form',contactName:'Buyer',contactEmail:'buyer@example.invalid'},userId);
      assert.equal((await read(()=>C.getCustomerDetail(id))).customer.name,'Customer form');
      await C.updateCustomer(id,{name:'Customer edited',phone:'0900000000',creditLimit:1000000,paymentDays:30},userId);
      assert.equal((await read(()=>C.getCustomerDetail(id))).customer.phone,'0900000000');
      assert.ok((await read(()=>C.listCustomers({keyword:'Customer edited'}))).some(r=>r.id===id));
    });
    await t.test('supplier: create, detail, edit, filtered lookup', async () => {
      const id = await S.createSupplier({name:'Supplier form',creditLimit:1000000,paymentDays:30},userId);
      assert.equal((await read(()=>S.getSupplierById(id))).supplier.name,'Supplier form');
      await S.updateSupplier(id,{name:'Supplier edited',phone:'0911111111'},userId);
      assert.equal((await read(()=>S.getSupplierById(id))).supplier.phone,'0911111111');
      assert.ok((await read(()=>S.listSuppliers({search:'Supplier edited'}))).some(r=>r.id===id));
    });
    await t.test('project: create workflow, detail, edit, financial/material tabs', async () => {
      const id = await P.createProject({name:'Project form',address:'Test address',customerId,managerMembershipId:membershipId,createCustomWorkflow:true},userId);
      assert.ok(await read(()=>P.getProjectById(id)));
      await P.updateProjectDetails(id,{name:'Project edited',dueDate:'2027-12-31'},userId);
      assert.equal((await read(()=>P.getProjectById(id))).name,'Project edited');
      assert.ok((await read(()=>P.listTasks(id))).length>0);
      await read(()=>P.getProjectMaterials(id));
      await read(()=>P.getProjectFinancialSummary(id));
    });
    await t.test('task: create with assignee, reload, update progress', async () => {
      const id = await P.createTask({projectId,title:'Task form',assigneeIds:[employeeId]},userId);
      assert.ok((await read(()=>P.listTasks(projectId))).some(r=>r.id===id));
      await P.updateTaskProgress(id,50,'doing',userId);
      assert.equal((await read(()=>P.listTasks(projectId))).find(r=>r.id===id).progressPercent,50);
      assert.ok((await read(()=>P.listProjectMembers(projectId))).length>0);
    });
    await t.test('catalog: unit/category/material/conversion create and edit', async () => {
      const unit = await K.saveLookup(orgId,userId,'units',{code:'FORM-EA',name:'Each',dimension:'count'});
      const box = await K.saveLookup(orgId,userId,'units',{code:'FORM-BOX',name:'Box',dimension:'count'});
      const category = await K.saveLookup(orgId,userId,'categories',{code:'FORM-CAT',name:'Category'});
      const input = {code:'FORM-ITEM',name:'Material form',kind:'material',categoryId:category,baseUnitId:unit,specJson:{color:'red'},isActive:true,conversions:[{unitId:box,factorToBase:10}]};
      const id = await K.saveItem(orgId,userId,input);
      assert.equal((await read(()=>I.getItemById(id))).item.name,'Material form');
      await K.saveItem(orgId,userId,{...input,name:'Material edited',conversions:[{unitId:box,factorToBase:12}]},id);
      const saved = (await read(()=>K.listItems(orgId))).find(r=>r.id===id);
      assert.equal(saved.name,'Material edited');
      assert.equal(Number(saved.conversions[0].factorToBase),12);
      await K.saveLookup(orgId,userId,'units',{code:'FORM-BOX',name:'Box edited',dimension:'count'},box);
      await K.saveLookup(orgId,userId,'categories',{code:'FORM-CAT',name:'Category edited'},category);
      assert.ok((await read(()=>I.listUnits())).some(r=>r.id===box && r.name==='Box edited'));
      assert.ok((await read(()=>I.listCategories())).some(r=>r.id===category && r.name==='Category edited'));
    });
    await t.test('warehouse: create, edit, stock lookup, deactivate, delete', async () => {
      const input = {code:'FORM-WH',name:'Warehouse form',type:'workshop',isActive:true};
      const id = await K.saveWarehouse(orgId,userId,input);
      assert.ok((await read(()=>I.listWarehouses())).some(r=>r.id===id));
      await read(()=>I.getWarehouseStock(id));
      await K.saveWarehouse(orgId,userId,{...input,name:'Warehouse edited',isActive:false},id);
      assert.equal((await read(()=>I.listWarehouses())).find(r=>r.id===id).name,'Warehouse edited');
      await K.deleteWarehouse(orgId,id);
      assert.ok(!(await read(()=>I.listWarehouses())).some(r=>r.id===id));
    });
    await t.test('employee: create with salary, reopen salary policy', async () => {
      const employee = await H.createEmployee({name:'Employee form',baseSalary:9000000,payBasis:'monthly',createdBy:userId});
      assert.equal((await read(()=>H.getEmployeeSalaryPolicy(employee.id))).muc_luong,9000000);
      assert.ok((await read(()=>H.listEmployeesWithPolicy('Employee form'))).some(r=>r.id===employee.id));
    });
    await t.test('shift: create, edit, lookup, delete', async () => {
      const data = {code:'FORM-SHIFT',name:'Shift form',startTime:'08:00',endTime:'17:00',breakMinutes:60};
      const shift = await H.upsertWorkShift(data);
      await H.upsertWorkShift({...data,id:shift.id,name:'Shift edited',shiftKind:'overtime'});
      assert.equal((await read(()=>H.listWorkShifts())).find(r=>r.id===shift.id).shift_kind,'overtime');
      assert.equal(await H.deleteWorkShift(shift.id),true);
    });
    await t.test('holiday: create, edit, lookup, delete', async () => {
      const data = {code:'FORM-HOLIDAY',name:'Holiday form',startDate:'2027-01-01',endDate:'2027-01-01'};
      const holiday = await H.upsertHolidayConfig(data);
      await H.upsertHolidayConfig({...data,id:holiday.id,name:'Holiday edited',multiplier:200});
      assert.equal(Number((await read(()=>H.listHolidayConfigs())).find(r=>r.id===holiday.id).multiplier),200);
      assert.equal(await H.deleteHolidayConfig(holiday.id),true);
    });
    await t.test('work location: create, edit, active lookup, delete', async () => {
      const data = {name:'Location form',latitude:10.8,longitude:106.7,radiusMeters:150};
      const location = await H.upsertWorkLocation(data);
      await H.upsertWorkLocation({...data,id:location.id,radiusMeters:250});
      assert.equal((await read(()=>H.listWorkLocations(true))).find(r=>r.id===location.id).radiusMeters,250);
      assert.equal(await H.deleteWorkLocation(location.id),true);
    });
    await t.test('leave policy: open defaults, save, reopen', async () => {
      await read(()=>H.getLeavePolicy());
      await H.updateLeavePolicy({standardDays:14,seniorityBonusYears:5,carryoverMaxDays:3,cashOutAllowed:false});
      assert.equal(Number((await read(()=>H.getLeavePolicy())).standard_days),14);
      await read(()=>H.listEmployeeLeaveBalances());
    });
    await t.test('HR request: submit leave, reload employee filter', async () => {
      const request = await H.createHrmRequest(userId,{type:'leave',title:'Leave form',reason:'Personal',startDate:'2027-01-04',endDate:'2027-01-04',durationHours:8,leaveCategory:'annual'});
      assert.ok((await read(()=>H.listHrmRequests({employeeId,type:'leave',status:'pending'}))).some(r=>r.id===request.id));
    });
    await t.test('survey: create with photo, detail, edit, filtered lookup', async () => {
      const survey = await F.createSiteSurvey({title:'Survey form',address:'Address',customerId,projectId,surveyorEmployeeId:employeeId,widthMeters:3,photos:[{url:'https://example.invalid/survey.jpg'}]},userId);
      assert.equal((await read(()=>F.getSiteSurveyById(survey.id))).widthMeters,3);
      await F.updateSiteSurvey(survey.id,{title:'Survey edited',widthMeters:4},userId);
      assert.equal((await read(()=>F.listSiteSurveys({projectId,customerId,status:'draft',search:'Survey edited'})))[0].widthMeters,4);
    });
    await t.test('design: create, edit, approve, filtered lookup', async () => {
      const proof = await F.createDesignProof({projectId,title:'Design form',fileUrl:'https://example.invalid/design.pdf',status:'pending'},userId);
      await F.updateDesignProof(proof.id,{title:'Design edited'},userId);
      await F.updateDesignProofStatus(proof.id,{status:'approved',approvedByName:'Buyer'},userId);
      assert.equal((await read(()=>F.listDesignProofs({projectId,status:'approved'}))).find(r=>r.id===proof.id).title,'Design edited');
    });
    await t.test('factory QC: create, reload with photos', async () => {
      const qc = await F.createFactoryQcRecord({projectId,inspectorEmployeeId:employeeId,status:'passed',photos:[{url:'https://example.invalid/qc.jpg'}]},userId);
      assert.ok((await read(()=>F.listFactoryQcRecords({projectId}))).some(r=>r.id===qc.id));
    });
    await t.test('warranty: create ticket, resolve, reload project warranty', async () => {
      const ticket = await F.createServiceTicket({projectId,customerId,title:'Warranty form',assignedEmployeeId:employeeId},userId);
      await F.updateServiceTicket(ticket.id,{status:'resolved',resolutionNotes:'Replaced LED',costAmount:100000},userId);
      assert.equal((await read(()=>F.listServiceTickets({projectId,status:'resolved'}))).find(r=>r.id===ticket.id).costAmount,100000);
      assert.equal((await read(()=>F.getProjectWarrantyInfo(projectId))).ticketsCount,1);
    });
    await t.test('documents: folder/file create, edit, aggregate and folder lists, delete', async () => {
      const folder = await D.createFolder({orgId,userId,name:'Folder form'});
      const doc = await D.createDocument({orgId,userId,folderId:folder.id,name:'Contract.pdf',fileUrl:'https://example.invalid/contract.pdf',mimeType:'application/pdf',fileSize:1234});
      await D.updateFolder({orgId,folderId:folder.id,name:'Folder edited'});
      assert.ok((await read(()=>D.listAllFolders(orgId))).userFolders.some(r=>r.id===folder.id && r.itemCount===1));
      assert.ok((await read(()=>D.listDocuments({orgId,folderId:folder.id}))).files.some(r=>r.id===doc.id));
      assert.ok((await read(()=>D.listDocuments({orgId}))).files.some(r=>r.id===doc.id));
      await D.deleteDocument({orgId,documentId:doc.id});
      await D.deleteFolder({orgId,folderId:folder.id});
      assert.ok(!(await read(()=>D.listAllFolders(orgId))).userFolders.some(r=>r.id===folder.id));
    });
  } finally { await db.close(); }
});

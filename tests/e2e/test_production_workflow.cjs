// Browser UI calls real services backed by a disposable PostgreSQL database.
// Intercept every write in this workflow; never write test records to DATABASE_URL.
const {chromium}=require('playwright'),assert=require('assert/strict'),fs=require('fs');
const {productionDb}=require('../helpers/production-db.cjs'),{fixture}=require('../helpers/production-fixture.cjs');
(async()=>{const db=await productionDb(),browser=await chromium.launch({headless:true});try{
 const f=await fixture(db),ctx=db.ctx,{ProductionService:P}=db.load('src/services/production.service.ts'),{ProductionBomService:B,loadCatalog}=db.load('src/services/production-bom.service.ts'),{ProductionSalesService:S}=db.load('src/services/production-sales.service.ts'),{InventoryService:I}=db.load('src/services/inventory.service.ts');
 const page=await browser.newPage({viewport:{width:1600,height:1050},storageState:'tests/e2e/state-admin.json'});page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function metadata(){return {ready:true,projects:(await db.query('SELECT * FROM erp.projects')).rows,warehouses:(await db.query('SELECT * FROM erp.warehouses')).rows,items:await loadCatalog(db.pool,ctx.orgId),teams:(await db.query('SELECT * FROM erp.teams')).rows,representatives:(await db.query('SELECT * FROM erp.material_representatives')).rows,designs:(await db.query('SELECT * FROM erp.design_proofs')).rows,boms:(await db.query('SELECT * FROM erp.project_boms')).rows,capabilities:Object.fromEntries(Object.keys(ctx.capabilities).map(k=>[k,true]))};}
 await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url()),p=url.pathname,method=req.method();let result;try{
  const body=method==='POST'||method==='PUT'?req.postDataJSON() || {}:{};
  if(p==='/api/production-orders/metadata')result=await metadata();
  else if(p==='/api/production-orders/readiness')result={ready:true};
  else if(p==='/api/production-orders/available-products')result={products:await S.available(ctx,url.searchParams.get('projectId'),url.searchParams.get('productionOrderId') || undefined)};
  else if(p==='/api/production-orders')result=method==='GET'?{orders:await P.list(ctx,url.searchParams.get('projectId') || undefined)}:await P.create(ctx,body);
  else if(/^\/api\/production-orders\/[^/]+\/actions$/.test(p)){const id=p.split('/')[3];if(body.action==='return'||body.action==='supplement')result=await P.materialDocument(ctx,id,body,body.action==='return');else result=await P[{edit_draft:'editDraft'}[body.action] || body.action](ctx,id,body);}
  else if(/^\/api\/production-orders\/[^/]+$/.test(p))result={order:await P.detail(ctx,p.split('/')[3])};
  else if(p==='/api/bom/from-design')result=await B.fromDesign(ctx,body);
  else if(/^\/api\/bom\/[^/]+\/production$/.test(p)){const id=p.split('/')[3];result=method==='GET'?{bom:await B.detail(ctx,id)}:method==='PUT'?await B.save(ctx,id,body):await B.revise(ctx,id,body);}
  else if(/^\/api\/projects\/[^/]+$/.test(p))result={tasks:[]};
  else if(/^\/api\/inventory\/documents\/[^/]+\/(approve|complete)$/.test(p)){const parts=p.split('/');await I[parts[5]==='approve'?'approveDocument':'completeDocument'](parts[4],ctx.userId);result={success:true};}
  else if(p==='/api/crm/orders' && method==='POST')result=await S.create(ctx,body);
  else if(/^\/api\/crm\/orders\/[^/]+\/actions$/.test(p))result=await S[body.action](ctx,p.split('/')[4],body);
  else if(/^\/api\/crm\/orders\/[^/]+$/.test(p))result={order:await S.detail(ctx,p.split('/')[4])};
  else {if(!['GET','HEAD'].includes(method))throw Error('Unexpected write outside isolated workflow: '+p);return route.continue();}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 }catch(e){return route.fulfill({status:e.status || 400,contentType:'application/json',body:JSON.stringify({error:e.message})});}});
 const base=process.env.E2E_BASE_URL || 'http://localhost:3000';
 await page.goto(base+'/san-xuat?projectId='+f.project,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'BOM dự án',exact:true}).click();await page.getByRole('button',{name:'Xem / Sửa',exact:true}).click();
 await page.getByLabel('Số lượng 1',{exact:true}).fill('4');await page.getByRole('button',{name:'Lưu BOM',exact:true}).click();await page.getByText('Đã lưu BOM và đối chiếu vật tư',{exact:true}).waitFor();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Lệnh sản xuất',exact:true}).click();await page.getByRole('button',{name:'Lập lệnh sản xuất',exact:true}).click();
 await page.getByLabel('Tên lệnh',{exact:true}).fill('Sản xuất kiểm thử cô lập');await page.getByLabel('Kho NVL mặc định',{exact:true}).selectOption(f.warehouse);await page.getByLabel('Thêm BOM',{exact:true}).selectOption(f.bom);
 await page.getByLabel('Thành phẩm 1',{exact:true}).selectOption(f.product);await page.getByLabel('Nhóm 1',{exact:true}).selectOption(f.team);
 await page.getByRole('button',{name:'Lưu lệnh nháp',exact:true}).click();await page.waitForURL(/\/san-xuat\/[0-9a-f-]+$/);const id=page.url().split('/').pop();
 await page.getByRole('button',{name:'Gửi duyệt / Tạo phiếu NVL',exact:true}).click();await page.getByRole('button',{name:'NVL & Phiếu kho',exact:true}).click();
 await page.getByRole('button',{name:'Duyệt',exact:true}).click();await page.getByRole('button',{name:'Xác nhận thực tế',exact:true}).click();
 await page.getByRole('button',{name:'Hạng mục & Công đoạn',exact:true}).click();
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'Ghi công đoạn',exact:true}).nth(i).click();await page.getByLabel('Tiến độ %',{exact:true}).fill('100');if(i===0){await page.getByLabel('Ảnh công đoạn QC',{exact:true}).setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=','base64')});await page.getByRole('img',{name:'Ảnh 1',exact:true}).waitFor();}const response=page.waitForResponse(r=>r.url().endsWith('/actions')&&r.request().method()==='POST');await page.getByRole('button',{name:'Lưu',exact:true}).click();assert.equal((await response).status(),200);await page.getByRole('heading',{name:'Ghi nhận công đoạn',exact:true}).waitFor({state:'hidden'});}
 await page.getByRole('button',{name:'QC & Nhập thành phẩm',exact:true}).click();await page.getByRole('button',{name:'QC đợt hoàn thành',exact:true}).click();
 assert.equal(await page.getByLabel('Kích thước / dấu chữ',{exact:true}).inputValue(),'','QC does not default to pass');
 await page.getByLabel('Lượng đạt',{exact:true}).fill('1');for(const text of ['Kích thước / dấu chữ','Bề mặt / màu sắc','Khung / liên kết','Phụ kiện / đóng gói'])await page.getByLabel(text,{exact:true}).selectOption('true');
 await page.getByLabel('Kho nhập thành phẩm',{exact:true}).selectOption(f.outputWarehouse);await page.getByRole('button',{name:'Lưu / Tạo phiếu nhập chờ duyệt',exact:true}).click();
 await page.getByRole('button',{name:'Duyệt',exact:true}).click();await page.getByRole('button',{name:'Xác nhận thực tế',exact:true}).click();await page.getByText('Hoàn tất · Hạn:',{exact:false}).waitFor();
 fs.mkdirSync('scratch',{recursive:true});await page.screenshot({path:'scratch/production-workflow-qc.png',fullPage:true});
 await page.getByRole('link',{name:'Bán thành phẩm',exact:true}).click();const products=await S.available(ctx,f.project);const lot=products[0].lot_code;
 await page.getByLabel('Chọn lô '+lot,{exact:true}).check();await page.getByLabel('Lượng '+lot,{exact:true}).fill('1');await page.getByLabel('Giá '+lot,{exact:true}).fill('100');
 await page.getByRole('button',{name:'Lập đơn bán chờ duyệt',exact:true}).click();await page.getByRole('button',{name:'Duyệt đơn / Tạo phiếu xuất',exact:true}).click();
 await page.getByRole('button',{name:'Duyệt',exact:true}).click();await page.getByRole('button',{name:'Xác nhận thực tế',exact:true}).click();
 await page.getByText(/SO.*Hoàn tất/).waitFor();await page.screenshot({path:'scratch/production-workflow-sale.png',fullPage:true});
 assert.equal(Number((await db.query('SELECT on_hand_qty FROM erp.stock_balances WHERE lot_id=$1',[products[0].lot_id])).rows[0].on_hand_qty),0);assert.deepEqual(errors,[]);
 console.log('PASS: browser BOM editing, multi-item draft form, material approval/posting, stage reports, explicit QC, output receipt and exact-lot sales using disposable database');
}finally{await browser.close();await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

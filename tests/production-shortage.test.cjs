const assert=require('assert/strict'),{productionDb}=require('./helpers/production-db.cjs'),{fixture}=require('./helpers/production-fixture.cjs');
(async()=>{const db=await productionDb();try{
 const f=await fixture(db),ctx=db.ctx,{ProductionService:P}=db.load('src/services/production.service.ts'),{InventoryService:I}=db.load('src/services/inventory.service.ts');
 await db.query('UPDATE erp.stock_balances SET on_hand_qty=4,inventory_value=40 WHERE lot_id=$1',[f.lot]);
 const o=await P.create(ctx,{requestId:f.request(),projectId:f.project,sourceWarehouseId:f.warehouse,lines:[{bomId:f.bom,outputItemId:f.product,unitId:f.unit,teamId:f.team,targetQty:2}]});
 const s=await P.submit(ctx,o.orderId,{requestId:f.request()});assert.equal(s.documentIds.length,1);const doc=s.documentIds[0];assert.equal((await db.query('SELECT status FROM erp.stock_documents WHERE id=$1',[doc])).rows[0].status,'submitted');
 await assert.rejects(I.approveDocument(doc,ctx.userId),/thiếu 6/);assert.equal((await P.detail(ctx,o.orderId)).status,'draft');assert.equal(Number((await db.query('SELECT reserved_qty FROM erp.stock_balances WHERE lot_id=$1',[f.lot])).rows[0].reserved_qty),0);
 const newLot=(await db.query("INSERT INTO erp.stock_lots(organization_id,item_id,lot_code) VALUES($1,$2,'NEW-SUPPLY') RETURNING id",[ctx.orgId,f.raw])).rows[0].id;
 const receipt=await I.createDocument({type:'receipt',purpose:'New supply',destinationWarehouseId:f.warehouse,submitNow:true,lines:[{itemId:f.raw,lotId:newLot,unitId:f.rawUnit,qty:6,unitCostSnapshot:10}]},ctx.userId);await I.approveDocument(receipt,ctx.userId);await I.completeDocument(receipt,ctx.userId);
 await I.approveDocument(doc,ctx.userId);const ls=(await db.query('SELECT * FROM erp.stock_document_lines WHERE document_id=$1',[doc])).rows;assert.equal(ls.length,2);assert.equal(ls.every(l=>[f.lot,newLot].includes(l.lot_id)),true,'Approval replaces demand lot with real incoming lots');
 assert.equal(Number((await db.query('SELECT SUM(on_hand_qty) AS n FROM erp.stock_balances WHERE item_id=$1',[f.raw])).rows[0].n),10,'Approval does not consume stock');
 await I.completeDocument(doc,ctx.userId);assert.equal(Number((await db.query('SELECT SUM(on_hand_qty) AS n FROM erp.stock_balances WHERE item_id=$1',[f.raw])).rows[0].n),0);assert.equal((await P.detail(ctx,o.orderId)).lines[0].status,'ready');
 console.log('PASS: shortage still creates pending issue, approval blocks atomically, replenishment in new lot, physical-lot allocation and posting after approval');
}finally{await db.close();}})().catch(e=>{console.error(e.message,e.detail || '',e.stack);process.exitCode=1;});

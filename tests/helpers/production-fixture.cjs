const crypto=require('crypto');
async function fixture(db){
 const q=db.query,{orgId:org,userId:user,membershipId:mem,employeeId:employee}=db.ctx;
 const insert=async(sql,args)=> (await q(sql+' RETURNING id',args)).rows[0].id;
 const customer=await insert("INSERT INTO erp.partners(organization_id,code,name,is_customer,owner_membership_id) VALUES($1,'CUSTOMER','Test customer',true,$2)",[org,mem]);
 const project=await insert("INSERT INTO erp.projects(organization_id,code,name,address,customer_id,manager_membership_id,created_by) VALUES($1,'PROJECT','Test project','Test address',$2,$3,$4)",[org,customer,mem,user]);
 const project2=await insert("INSERT INTO erp.projects(organization_id,code,name,address,customer_id,manager_membership_id,created_by) VALUES($1,'PROJECT2','Other project','Test address',$2,$3,$4)",[org,customer,mem,user]);
 const unit=await insert("INSERT INTO erp.units(organization_id,code,name,dimension) VALUES($1,'PIECE','Cái','count')",[org]);
 const rawUnit=await insert("INSERT INTO erp.units(organization_id,code,name,dimension) VALUES($1,'METRE','Mét','length')",[org]);
 const warehouse=await insert("INSERT INTO erp.warehouses(organization_id,code,name,kind) VALUES($1,'RAW','Kho NVL','workshop')",[org]);
 const outputWarehouse=await insert("INSERT INTO erp.warehouses(organization_id,code,name,kind) VALUES($1,'OUTPUT','Kho TP','distribution')",[org]);
 const team=await insert("INSERT INTO erp.teams(organization_id,code,name) VALUES($1,'TEAM','Tổ xưởng')",[org]);
 await q('INSERT INTO erp.team_members(organization_id,team_id,employee_id) VALUES($1,$2,$3)',[org,team,employee]);
 const raw=await insert("INSERT INTO erp.items(organization_id,code,name,kind,base_unit_id) VALUES($1,'RAW','Test NVL','material',$2)",[org,rawUnit]);
 const product=await insert("INSERT INTO erp.items(organization_id,code,name,kind,base_unit_id) VALUES($1,'TP','Biển đại diện','product',$2)",[org,unit]);
 const rep=await insert("INSERT INTO erp.material_representatives(organization_id,code,name,quantity_basis,default_item_id,default_unit_id) VALUES($1,'frame','Khung','perimeter',$2,$3)",[org,raw,rawUnit]);
 for(const [code,name,basis] of [['face','Mặt biển','area'],['letters','Bộ chữ','manual']])await q('INSERT INTO erp.material_representatives(organization_id,code,name,quantity_basis) VALUES($1,$2,$3,$4)',[org,code,name,basis]);
 const lot=await insert("INSERT INTO erp.stock_lots(organization_id,lot_code,item_id) VALUES($1,'RAW-LOT',$2)",[org,raw]);
 await q('INSERT INTO erp.stock_balances(organization_id,warehouse_id,item_id,lot_id,on_hand_qty,reserved_qty,inventory_value) VALUES($1,$2,$3,$4,100,0,1000)',[org,warehouse,raw,lot]);
 const survey=await insert("INSERT INTO erp.site_surveys(organization_id,code,title,address,project_id,width_meters,height_meters,status) VALUES($1,'SURVEY','Survey','Address',$2,12,2.4,'completed')",[org,project]);
 const spec={_parametricSpec:{surveyId:survey,input:{widthMeters:12,heightMeters:2.4,materialType:'Alu'},drawing:{width:12000,height:2400}}};
 const proof=await insert("INSERT INTO erp.design_proofs(organization_id,code,title,project_id,file_url,status,client_feedback) VALUES($1,'DESIGN','Design',$2,'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=','approved',$3)",[org,project,JSON.stringify(spec)]);
 const bom=await insert("INSERT INTO erp.project_boms(organization_id,code,title,project_id,signage_type,width_meters,height_meters,design_proof_id,survey_id,mapped,source_snapshot) VALUES($1,'BOM','BOM',$2,'other',12,2.4,$3,$4,true,$5)",[org,project,proof,survey,{proof:{id:proof,version:1},survey:{id:survey}}]);
 await q('INSERT INTO erp.project_bom_lines(organization_id,bom_id,line_no,representative_id,description,quantity,item_id,unit_id) VALUES($1,$2,1,$3,$4,5,$5,$6)',[org,bom,rep,'NVL',raw,rawUnit]);
 return {customer,project,project2,unit,rawUnit,warehouse,outputWarehouse,team,raw,product,rep,lot,survey,proof,bom,request:()=>crypto.randomUUID()};
}
module.exports={fixture};

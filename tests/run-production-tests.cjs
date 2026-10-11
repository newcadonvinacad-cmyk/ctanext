const {spawnSync}=require('node:child_process');
for(const file of ['production-bom','production-migration','production-stock-hooks','production-edge-cases','production-shortage','production-lifecycle','inventory-transaction-candidate','permission-audit-fixes','project-stock-issues','signage-bom-takeoff','survey-cascade-delete']){
 const r=spawnSync(process.execPath,[`tests/${file}.test.cjs`],{stdio:'inherit'});if(r.status!==0)process.exit(r.status || 1);
}

// Exercises the proposed transaction-only refactor in memory before applying it.
// No repository source or database is mutated by this test.
const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
const source=require('child_process').execFileSync('git',['show','79b418ad9b00e9310bdf5356f4373f17a3400ede:src/services/inventory.service.ts'],{encoding:'utf8'});
const start=source.indexOf('  static async createDocument('),end=source.indexOf('  static async submitDocument(',start);
assert.ok(start>=0&&end>start);
const original=source.slice(start,end);
function candidate(block){
  assert.equal((block.match(/const client = await getDbPool\(\)\.connect\(\);/g)||[]).length,1);
  return block.replace('userId: string\n  ): Promise<string>', 'userId: string,\n    options?: { client: any }\n  ): Promise<string>')
    .replace('const client = await getDbPool().connect();','const client = options?.client || await getDbPool().connect();')
    .replace('await client.query("BEGIN");','if (!options) await client.query("BEGIN");')
    .replace('await client.query("COMMIT");','if (!options) await client.query("COMMIT");')
    .replace('await client.query("ROLLBACK");','if (!options) await client.query("ROLLBACK");')
    .replace('client.release();','if (!options) client.release();');
}
const normalized=original.replace(/\r\n/g,'\n');
const patched=candidate(normalized);
assert.ok(patched.includes('options?: { client: any }'));
async function run(block,external=false,failure=false){
  const calls=[];let releases=0,connects=0;
  const client={async query(sql,args){calls.push({sql,args});if(sql.includes('SELECT id FROM erp.organizations'))return {rows:[{id:'org'}]};if(sql.includes('INSERT INTO erp.stock_documents'))return {rows:[{id:'doc'}]};if(sql.includes('INSERT INTO erp.stock_document_lines')&&failure)throw Error('constraint');return {rows:[{id:'lot'}]};},release(){releases++;}};
  const code=ts.transpileModule(`class Service {static async getOrganizationId(){return 'org';} ${block}} exports.Service=Service;`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};vm.runInNewContext(code,{exports,getDbPool:()=>({connect:async()=>{connects++;return client;}}),getNextDocumentCode:async()=> 'PXK-1'});
  const input={type:'issue',purpose:'Test',sourceWarehouseId:'warehouse',submitNow:true,lines:[{itemId:'item',lotId:'lot',unitId:'unit',qty:3}]};
  const operation=exports.Service.createDocument(input,'user',external?{client}:undefined);
  if(failure)await assert.rejects(operation,/constraint/);else assert.equal(await operation,'doc');
  const control=calls.filter(c=>['BEGIN','COMMIT','ROLLBACK'].includes(c.sql)).map(c=>c.sql);
  assert.deepEqual(control,external?[]:failure?['BEGIN','ROLLBACK']:['BEGIN','COMMIT']);
  assert.equal(releases,external?0:1);assert.equal(connects,external?0:1);
  return JSON.parse(JSON.stringify(calls.filter(c=>!['BEGIN','COMMIT','ROLLBACK'].includes(c.sql))));
}
(async()=>{
  assert.deepEqual(await run(normalized),await run(patched));
  assert.deepEqual(await run(normalized,false,true),await run(patched,false,true));
  await run(patched,true);await run(patched,true,true);
  console.log('PASS: existing create SQL and parameters unchanged; own/external transactions, failure rollback and client ownership verified for proposed refactor');
})().catch(e=>{console.error(e);process.exitCode=1;});

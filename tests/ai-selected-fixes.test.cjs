const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require: id => {
    if (id in mocks) return mocks[id];
    if (id === 'crypto') return require(id);
    throw new Error(`Unexpected dependency: ${id}`);
  }, console: { ...console, warn() {} }, Date, Set, Map, Buffer }, { filename: file });
  return exports;
}

const input = load('src/lib/ai/action-proposal-input.ts');
for (const [text, expected] of [['0%', 0], ['47,5%', 47.5], ['47.5%', 47.5], ['đạt 60', 60], ['làm xong', 100]]) {
  assert.equal(input.parseProgressPercent(text), expected);
}
for (const text of ['đang thi công', 'chưa hoàn thành', 'không làm xong', '101%', '-1%', '20% và 40%']) {
  assert.throws(() => input.parseProgressPercent(text));
}
assert.equal(input.mentionsEntity('TK-10 đạt 0%', 'TK-1'), false);
assert.equal(input.mentionsEntity('TK-1 đạt 0%', 'TK-1'), true);
assert.equal(input.mentionsEntity('dự án ABC', ''), false);

const projects = [{ id: 'p1', code: 'DA-1', name: 'Biển A' }, { id: 'p2', code: 'DA-2', name: 'Biển B' }];
const tasks = [{ id: 't1', code: 'TK-1', title: 'Lắp đặt', project_id: 'p1' },
  { id: 't10', code: 'TK-10', title: 'Lắp đặt', project_id: 'p2' },
  { id: 't2', code: 'TK-2', title: 'Chuẩn bị', project_id: 'p1' }];
let activeMembership = true;
let writes = 0;
const pool = { async query(sql, values) {
  if (/FROM erp.memberships/.test(sql)) {
    assert.match(sql, /organization_id = \$2/);
    assert.match(sql, /status = 'active'/);
    assert.equal(values[1], 'org');
    return { rows: activeMembership ? [{ id: 'member' }] : [] };
  }
  if (/INSERT|UPDATE|DELETE/.test(sql)) { writes++; return { rows: [{ id: 'run' }] }; }
  if (/FROM erp.projects/.test(sql)) return { rows: projects };
  if (/FROM erp.tasks/.test(sql)) return { rows: tasks };
  return { rows: [] };
} };
const { AiService } = load('src/services/ai.service.ts', {
  '@/lib/db': { getDbPool: () => pool, getCachedOrgId: async () => 'org' },
  '@/lib/ai/action-proposal-input': input,
  './authorization.service': { AuthorizationService: {} },
  '@/lib/ai/gemini': { geminiService: { generateJSON: async () => ({ canAutoFix: true,
    correctedPayload: { taskId: 't10' }, fixExplanation: 'Đề xuất công việc phù hợp' }) } },
  '@/lib/ai/agents/assistant.agent': {},
  './inventory.service': {}, './project.service': {}, './finance.service': {},
  './procurement.service': {}, './crm.service': {},
});

(async () => {
  const parse = text => AiService.parseActionProposal({ actionType: 'work_report', text, userId: 'user', organizationId: 'org' });
  const proposal = await parse('TK-10 đạt 0%');
  assert.equal(proposal.draftPayload.taskId, 't10');
  assert.equal(proposal.draftPayload.projectId, 'p2');
  assert.equal(proposal.draftPayload.completionPercentage, 0);
  const beforeInvalid = writes;
  for (const text of ['thi công đạt 80%', 'Lắp đặt đạt 80%', 'DA-1 đạt 80%', 'TK-1 DA-2 đạt 80%', 'TK-1 chưa hoàn thành', 'TK-1 đạt 120%']) {
    await assert.rejects(parse(text));
  }
  assert.equal(writes, beforeInvalid, 'Invalid input must not create an AI run or a business record');
  activeMembership = false;
  await assert.rejects(parse('TK-10 đạt 50%'), /membership/);
  activeMembership = true;
  let confirmations = 0;
  AiService.confirmActionProposal = async () => { confirmations++; throw new Error('constraint'); };
  const result = await AiService.executeActionWithAiRemediation({ actionType: 'work_report', draftPayload: { taskId: 'bad' }, userId: 'user', organizationId: 'org' });
  assert.equal(confirmations, 1, 'Remediation must not automatically retry a changed business write');
  assert.equal(result.success, false);
  assert.equal(result.autoFixed, false);
  assert.equal(result.needsUserClarification, true);
  assert.equal(result.correctedPayload.taskId, 't10');
  const fieldFile = 'src/app/(dashboard)/hien-truong/page.tsx';
  const fieldSource = ts.createSourceFile(fieldFile, fs.readFileSync(fieldFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let materialHandler;
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(fieldSource) === 'onClick' &&
        node.initializer?.expression?.getText(fieldSource).includes('Xác nhận kiểm kê vật tư cấp theo xe vận chuyển')) {
      materialHandler = node.initializer.expression.getText(fieldSource);
    }
    ts.forEachChild(node, visit);
  }
  visit(fieldSource);
  assert.ok(materialHandler);
  for (const mode of ['success', 'http-error', 'network-error', 'missing-task']) {
    let successes = 0, errors = 0, redirects = 0, requests = 0;
    const exports = {};
    const handlerCode = ts.transpileModule(`exports.handler = ${materialHandler};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(handlerCode, { exports, selectedTask: mode === 'missing-task' ? null : { id: 't1', projectId: 'p1' }, materials: [],
      fetch: async () => { requests++; if (mode === 'network-error') throw Error('Network'); return { ok: mode === 'success', json: async () => ({ error: 'Not saved' }) }; },
      toast: { success() { successes++; }, error() { errors++; } }, setCurrentScreen() { redirects++; }, Error });
    await exports.handler();
    assert.equal(successes, mode === 'success' ? 1 : 0);
    assert.equal(redirects, mode === 'success' ? 1 : 0);
    assert.equal(errors, mode === 'success' ? 0 : 1);
    assert.equal(requests, mode === 'missing-task' ? 0 : 1);
  }
  console.log('PASS: progress parsing, exact entity matching, ambiguity rejection, membership scope, and remediation without automatic writes');
  console.log('PASS: material confirmation on success, HTTP/network errors and missing task');
})().catch(error => { console.error(error); process.exitCode = 1; });

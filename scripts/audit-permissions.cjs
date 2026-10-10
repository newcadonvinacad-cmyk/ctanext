// Offline audit probes: actual handlers/services, isolated from the real database.
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const assert = require('assert/strict');

function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: id => {
      if (id in mocks) return mocks[id];
      if (id === 'crypto') return require('crypto');
      throw Error('Unmocked dependency: ' + id);
    },
    console, Date, Map, Set, Buffer, URL,
    process: { env: { NODE_ENV: 'test' } }, crypto: require('crypto'),
  }, { filename: file });
  return exports;
}

let capabilities = {};
let calls = [];
const user = { id: 'audit-user', email: 'worker@example.invalid', name: 'Worker' };
const base = {
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
  'next/headers': { headers: async () => ({}) },
  '@/lib/auth': { auth: { api: { getSession: async () => ({ user }) } } },
  '@/lib/auth-cache': { getCachedSession: async () => ({ user }) },
  '@/services/authorization.service': { AuthorizationService: {
    getUserCapabilities: async () => ({ capabilities, roles: [], membershipStatus: 'active' }),
  } },
  '@/lib/db': { getCachedOrgId: async () => 'org-a', getDbPool: () => ({}) },
};
const capture = async (...args) => { calls.push(args); return {}; };
const request = body => ({ json: async () => body });
const params = id => ({ params: Promise.resolve({ id }) });
const results = [];

async function probe(name, file, mocks, invoke, caps = {}) {
  calls = [];
  capabilities = caps;
  const module = load(file, { ...base, ...mocks });
  const response = await invoke(module);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(calls.length, 1);
  results.push({ name, reproduced: true });
  console.log('REPRODUCED: ' + name);
}

(async () => {
  await probe('Salary policy write with no capabilities', 'src/app/api/hrm/policy/route.ts', {
    '@/services/hrm.service': { HrmService: { upsertEmployeeSalaryPolicy: capture } },
  }, m => m.POST(request({ employeeId: 'other-employee', policy: { baseSalary: 99000000 } })));
  await probe('Payroll calculation read without payroll.read', 'src/app/api/hrm/payroll/calculate/route.ts', {
    '@/services/hrm.service': { HrmService: { calculateMonthlyPayroll: capture } },
  }, m => m.GET({ url: 'http://example.invalid/api/hrm/payroll/calculate' }));
  await probe('HR request approval with no approval capabilities', 'src/app/api/hrm/requests/[id]/review/route.ts', {
    '@/services/hrm.service': { HrmService: { reviewHrmRequest: capture } },
  }, m => m.POST(request({ action: 'approve' }), params('other-request')));
  await probe('Quotation status submitted with empty capabilities', 'src/app/api/crm/quotations/[id]/route.ts', {
    '@/services/crm.service': { CrmService: { updateQuotationStatus: capture } },
  }, m => m.PUT(request({ status: 'submitted' }), params('other-quotation')));
  await probe('Payroll update alone permits approval', 'src/app/api/hrm/payroll/approve/route.ts', {
    '@/services/hrm.service': { HrmService: { approvePayroll: capture } },
  }, m => m.POST(request({ lines: [{ employeeId: 'other' }] })), { 'payroll.update': { isEnabled: true } });
  await probe('Project finance read alone permits cash account creation', 'src/app/api/finance/accounts/route.ts', {
    '@/services/finance.service': { FinanceService: { createCashAccount: capture } },
  }, m => m.POST(request({ name: 'Quy moi', kind: 'cash' })), {
    'project_finance.read': { isEnabled: true, scope: 'ASSIGNED' },
  });
  await probe('Stock approval alone permits posting', 'src/app/api/inventory/documents/[id]/complete/route.ts', {
    '@/services/inventory.service': { InventoryService: { completeDocument: capture } },
  }, m => m.POST({}, params('other-document')), {
    'stock_document.approve': { isEnabled: true, scope: 'SELECTED', amountLimit: 1000 },
  });
  await probe('Shared document deletion with no capabilities', 'src/app/api/documents/[id]/route.ts', {
    '@/services/document.service': { DocumentService: { deleteDocument: capture } },
  }, m => m.DELETE({}, params('other-document')));
  calls = [];
  const holiday = load('src/app/api/hrm/holidays/route.ts', {
    'next/server': base['next/server'],
    '@/services/hrm.service': { HrmService: { upsertHolidayConfig: capture } },
  });
  assert.equal((await holiday.POST(request({ code: 'H', name: 'Holiday', startDate: '2026-10-10', endDate: '2026-10-10' }))).status, 200);
  assert.equal(calls.length, 1);
  results.push({ name: 'Holiday write without any session check in handler', reproduced: true });
  calls = [];
  let authorizationChecks = 0;
  const ai = load('src/services/ai.service.ts', {
    '@/lib/ai/action-proposal-input': {}, '@/lib/db': base['@/lib/db'],
    './authorization.service': { AuthorizationService: { getUserCapabilities: async () => {
      authorizationChecks++; return { capabilities: {} };
    } } },
    '@/lib/ai/gemini': {}, '@/lib/ai/agents/assistant.agent': {},
    './inventory.service': {}, './project.service': {},
    './finance.service': { FinanceService: { createPayment: capture } },
    './procurement.service': {}, './crm.service': {},
  }).AiService;
  const aiResult = await ai.confirmActionProposal({
    actionType: 'disbursement', draftPayload: { amount: 100000000, status: 'posted' }, userId: user.id,
  });
  assert.equal(aiResult.success, true);
  assert.equal(calls.length, 1);
  assert.equal(authorizationChecks, 0);
  results.push({ name: 'AI confirmation forwards posted payment without checking capabilities', reproduced: true });
  const authorization = load('src/services/authorization.service.ts', {
    '@/constants/permissions': { SEED_ROLE_GRANTS: [], SCREEN_REQUIREMENTS: {}, ROLE_DEFAULT_ROUTES: {} },
    '@/lib/db': { getDbPool: () => ({}) },
  }).AuthorizationService;
  assert.equal(authorization.authorize({ 'project.read': { isEnabled: true, scope: 'OWN' } }, 'project.read', { scope: 'SELECTED' }).allowed, true);
  results.push({ name: 'OWN satisfies SELECTED in generic authorize scope ranking', reproduced: true });
  fs.writeFileSync('docs/PHAN_QUYEN_KET_QUA_TAI_HIEN_2026-10-10.json', JSON.stringify({
    mode: 'Isolated VM, mocked data services; no live database, network or production mutation. Reproduced means the current guard accepts the scenario, not that authorization is correct.',
    total: results.length, results,
  }, null, 2) + '\n');
  console.log('TOTAL: ' + results.length + ' authorization gaps reproduced offline');
})().catch(error => { console.error(error); process.exitCode = 1; });

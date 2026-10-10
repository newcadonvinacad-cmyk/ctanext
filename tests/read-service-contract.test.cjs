const test = require('node:test');
const assert = require('node:assert/strict');
const { productionDb } = require('./helpers/production-db.cjs');

test('module list queries work against real SQL and never mutate data', async t => {
  const db = await productionDb();
  try {
    const cases = {
      'finance.service': ['listCashAccounts', 'listCashMovements', 'listPayments', ['listOpenItems', 'receivable'], ['listOpenItems', 'payable'], 'listAttendanceSummary', 'listSalaryTerms', 'getExecutiveKpis'],
      'crm.service': ['listCustomers', 'listQuotations', 'listSalesOrders'],
      'procurement.service': ['listSuppliers', 'listPurchaseOrders'],
      'project.service': ['listProjects', 'listEmployees', 'listAllTasks', 'listTemplates', 'listWorkReports', 'listVehicles', 'listTrips'],
      'inventory.service': ['listItems', 'listCategories', 'listUnits', 'listWarehouses', 'listRemnants', 'getInventorySummary', 'listDocuments', 'listInventoryCounts'],
      'hrm.service': ['listPolicyTemplates', 'listEmployeesWithPolicy', 'listPayrollPeriods', 'listWorkShifts', 'listHolidayConfigs', 'listEmployeeLeaveBalances', 'listWorkLocations', 'listHrmRequests'],
    };
    for (const [file, methods] of Object.entries(cases)) {
      const exports = db.load(`src/services/${file}.ts`);
      const service = Object.values(exports).find(value => typeof value === 'function' && methods.some(m => typeof value[Array.isArray(m) ? m[0] : m] === 'function'));
      assert.ok(service, `load ${file}`);
      for (const item of methods) {
        const [method, ...args] = Array.isArray(item) ? item : [item];
        await t.test(`${file}.${method}(${args.join(',')})`, async () => {
          await db.query('BEGIN READ ONLY');
          try { assert.notEqual(await service[method](...args), undefined); }
          finally { await db.query('ROLLBACK'); }
        });
      }
    }
  } finally { await db.close(); }
});

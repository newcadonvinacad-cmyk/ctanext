const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const moduleCache = new Map();

function loadTsModule(filePath) {
  let resolvedPath = filePath;
  if (!path.isAbsolute(resolvedPath)) {
    resolvedPath = path.resolve(resolvedPath);
  }
  if (!fs.existsSync(resolvedPath)) {
    if (fs.existsSync(resolvedPath + '.ts')) resolvedPath += '.ts';
    else if (fs.existsSync(resolvedPath + '.tsx')) resolvedPath += '.tsx';
  }

  if (moduleCache.has(resolvedPath)) {
    return moduleCache.get(resolvedPath);
  }

  const code = fs.readFileSync(resolvedPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  const mod = { exports: {} };
  moduleCache.set(resolvedPath, mod.exports);

  const customRequire = (id) => {
    if (id === '@/lib/db') {
      return {
        getDbPool: () => null,
        getCachedOrgId: async () => 'test-org-id',
      };
    }
    if (id.startsWith('@/')) {
      const subPath = path.resolve('src', id.slice(2));
      return loadTsModule(subPath);
    }
    if (id.startsWith('.')) {
      const subPath = path.resolve(path.dirname(resolvedPath), id);
      return loadTsModule(subPath);
    }
    return require(id);
  };

  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', transpiled);
  fn(mod, mod.exports, customRequire, path.dirname(resolvedPath), resolvedPath);
  return mod.exports;
}

const {
  SEED_ROLE_GRANTS,
  ROLE_DEFAULT_ROUTES,
  SCREEN_REQUIREMENTS
} = loadTsModule(path.resolve('src/constants/permissions.ts'));

const { AuthorizationService } = loadTsModule(path.resolve('src/services/authorization.service.ts'));
const { GpsImportService } = loadTsModule(path.resolve('src/services/gps-import.service.ts'));

const fileHino = path.resolve('docs/Phân hệ xe/dữ liệu thô/Báo cáo tổng hợp - tháng 8- hino.xlsx');

test('RBAC 1: Ma trận quyền cài sẵn theo đúng tài liệu CHOT_VAI_TRO_VA_QUYEN_PHAN_HE_XE', () => {
  // 1. Điều phối xe (FLEET_OPERATOR) - đúng 13 grants O (ORG)
  const operatorGrants = SEED_ROLE_GRANTS.filter(g => g.roleCode === 'FLEET_OPERATOR');
  assert.ok(operatorGrants.length > 0, 'FLEET_OPERATOR role must have grants');
  assert.equal(operatorGrants.length, 13, 'FLEET_OPERATOR must have exactly 13 grants');

  const expectedOperatorCodes = [
    'trip.read', 'trip.create', 'trip.update', 'trip.assign', 'trip.dispatch',
    'trip.complete', 'trip.cancel', 'trip.attach', 'fleet.read', 'fleet.update',
    'fleet.import', 'fleet.export', 'fleet_report.read'
  ];
  for (const code of expectedOperatorCodes) {
    const grant = operatorGrants.find(g => g.permission === code);
    assert.ok(grant, `FLEET_OPERATOR must have permission ${code}`);
    assert.equal(grant.scope, 'ORG', `${code} for FLEET_OPERATOR must have scope ORG`);
  }

  // Điều phối KHÔNG có các quyền quản lý/duyệt
  const operatorForbidden = [
    'fleet_ot.approve', 'fleet_issue.close', 'fleet_setting.update',
    'fleet_period.close', 'fleet_period.reopen'
  ];
  for (const forbidden of operatorForbidden) {
    const grant = operatorGrants.find(g => g.permission === forbidden);
    assert.equal(grant, undefined, `FLEET_OPERATOR must NOT have ${forbidden}`);
  }

  // 2. Quản lý đội xe (FLEET_MANAGER) - đúng 18 grants O (ORG)
  const managerGrants = SEED_ROLE_GRANTS.filter(g => g.roleCode === 'FLEET_MANAGER');
  assert.ok(managerGrants.length > 0, 'FLEET_MANAGER role must have grants');
  assert.equal(managerGrants.length, 18, 'FLEET_MANAGER must have exactly 18 grants');

  const allManagerExpected = [...expectedOperatorCodes, ...operatorForbidden];
  for (const code of allManagerExpected) {
    const grant = managerGrants.find(g => g.permission === code);
    assert.ok(grant, `FLEET_MANAGER must have permission ${code}`);
    assert.equal(grant.scope, 'ORG', `${code} for FLEET_MANAGER must have scope ORG`);
  }

  // 3. Kế toán (ACCOUNTANT)
  const accGrants = SEED_ROLE_GRANTS.filter(g => g.roleCode === 'ACCOUNTANT');
  assert.ok(accGrants.some(g => g.permission === 'trip.read' && g.scope === 'ORG'));
  assert.ok(accGrants.some(g => g.permission === 'fleet.export' && g.scope === 'ORG'));
  assert.ok(accGrants.some(g => g.permission === 'fleet_report.read' && g.scope === 'ORG'));
  assert.ok(!accGrants.some(g => g.permission === 'fleet.import'), 'Kế toán không được có fleet.import');
  assert.ok(!accGrants.some(g => g.permission === 'fleet.update'), 'Kế toán không được có fleet.update');
  assert.ok(!accGrants.some(g => g.permission === 'fleet_ot.approve'), 'Kế toán không được có fleet_ot.approve');

  // 4. Phụ trách dự án (PROJECT_MANAGER)
  const pmGrants = SEED_ROLE_GRANTS.filter(g => g.roleCode === 'PROJECT_MANAGER');
  assert.ok(pmGrants.some(g => g.permission === 'trip.read' && g.scope === 'ASSIGNED'));
  assert.ok(pmGrants.some(g => g.permission === 'trip.attach' && g.scope === 'ASSIGNED'));
  assert.ok(pmGrants.some(g => g.permission === 'fleet.export' && g.scope === 'ASSIGNED'));
  assert.ok(pmGrants.some(g => g.permission === 'fleet_report.read' && g.scope === 'ASSIGNED'));
  assert.ok(!pmGrants.some(g => g.permission === 'trip.create'), 'PM không được có trip.create');
  assert.ok(!pmGrants.some(g => g.permission === 'trip.dispatch'), 'PM không được có trip.dispatch');
  assert.ok(!pmGrants.some(g => g.permission === 'fleet.import'), 'PM không được có fleet.import');
});

test('RBAC 2: Tuyến đường mặc định và Cổng vào phân hệ xe', () => {
  // 1. Tuyến đường mặc định
  assert.equal(ROLE_DEFAULT_ROUTES.FLEET_OPERATOR, '/apps/doi-xe');
  assert.equal(ROLE_DEFAULT_ROUTES.FLEET_MANAGER, '/apps/doi-xe');

  // 2. Cổng vào M15 và APP_FLEET phải yêu cầu quyền xe thật, không có project.read bypass
  const m15 = SCREEN_REQUIREMENTS.M15;
  const appFleet = SCREEN_REQUIREMENTS.APP_FLEET;

  assert.deepEqual(m15.permissions, ['fleet.read', 'trip.read', 'fleet_report.read']);
  assert.deepEqual(appFleet.permissions, ['fleet.read', 'trip.read', 'fleet_report.read']);

  assert.ok(!m15.permissions.includes('project.read'), 'M15 must not allow project.read bypass');
  assert.ok(!appFleet.permissions.includes('project.read'), 'APP_FLEET must not allow project.read bypass');
});

test('RBAC 3: Fallback capabilities và Điều hướng trong AuthorizationService', () => {
  // 1. Fallback capabilities cho FLEET_OPERATOR
  const operatorRes = AuthorizationService.getFallbackCapabilities('usr-dieuphoi-01');
  const operatorCaps = operatorRes.capabilities;
  assert.equal(operatorCaps['fleet.read']?.isEnabled, true);
  assert.equal(operatorCaps['fleet.import']?.isEnabled, true);
  assert.equal(operatorCaps['trip.create']?.isEnabled, true);
  assert.equal(operatorCaps['trip.dispatch']?.isEnabled, true);
  assert.equal(operatorCaps['fleet_ot.approve']?.isEnabled, undefined);
  assert.equal(operatorCaps['fleet_period.close']?.isEnabled, undefined);

  // 2. Fallback capabilities cho FLEET_MANAGER
  const managerRes = AuthorizationService.getFallbackCapabilities('usr-quanlyxe-01');
  const managerCaps = managerRes.capabilities;
  assert.equal(managerCaps['fleet.read']?.isEnabled, true);
  assert.equal(managerCaps['fleet.import']?.isEnabled, true);
  assert.equal(managerCaps['fleet_ot.approve']?.isEnabled, true);
  assert.equal(managerCaps['fleet_period.close']?.isEnabled, true);

  // 3. Fallback capabilities cho ACCOUNTANT
  const accRes = AuthorizationService.getFallbackCapabilities('usr-ketoan-01');
  const accCaps = accRes.capabilities;
  assert.equal(accCaps['fleet_report.read']?.isEnabled, true);
  assert.equal(accCaps['fleet.export']?.isEnabled, true);
  assert.equal(accCaps['fleet.read']?.isEnabled, undefined);
  assert.equal(accCaps['fleet.import']?.isEnabled, undefined);

  // 4. Resolve default route
  assert.equal(AuthorizationService.resolveDefaultRoute(operatorRes.roles, operatorCaps), '/apps/doi-xe');
  assert.equal(AuthorizationService.resolveDefaultRoute(managerRes.roles, managerCaps), '/apps/doi-xe');
});

test('RBAC 4: Cô lập đa công ty và bảo vệ quyền sở hữu đợt xem trước (Multi-tenant & Preview Security)', async () => {
  GpsImportService.clearStore();

  const buf = fs.readFileSync(fileHino);
  const org1 = 'company-org-01';
  const org2 = 'company-org-02';
  const user1 = 'user-operator-01';
  const user2 = 'user-operator-02';

  // 1. User 1 thuộc Org 1 tạo bản xem trước
  const preview = await GpsImportService.previewFile(buf, 'hino_thang_8.xlsx', user1, org1);
  assert.ok(preview.batchId);
  assert.equal(preview.totalRows, 31);

  // 2. User 2 (cùng Org 1) cố tình xác nhận đợt xem trước do User 1 tạo -> PHẢI BỊ CHẶN
  await assert.rejects(
    async () => {
      await GpsImportService.commitImport(preview.batchId, user2, org1);
    },
    /Bạn không có quyền xác nhận đợt xem trước do người khác tạo/
  );

  // 3. Người dùng thuộc Org 2 cố tình dùng batchId của Org 1 -> PHẢI BỊ CHẶN
  await assert.rejects(
    async () => {
      await GpsImportService.commitImport(preview.batchId, user1, org2);
    },
    /Đợt xem trước không thuộc tổ chức\/công ty của bạn/
  );

  // 4. Đúng User 1 và đúng Org 1 xác nhận -> THÀNH CÔNG
  const batch1 = await GpsImportService.commitImport(preview.batchId, user1, org1);
  assert.equal(batch1.id, preview.batchId);
  assert.equal(batch1.organizationId, org1);
  assert.equal(batch1.stats.newRows, 31);

  // 5. Kiểm tra dữ liệu: Org 1 thấy 31 ngày, Org 2 hoàn toàn không thấy dữ liệu của Org 1
  const logsOrg1 = await GpsImportService.getDailyLogs({ orgId: org1 });
  const logsOrg2 = await GpsImportService.getDailyLogs({ orgId: org2 });
  assert.equal(logsOrg1.length, 31, 'Org 1 must see 31 days imported');
  assert.equal(logsOrg2.length, 0, 'Org 2 must NOT see any data from Org 1');

  // 6. Kiểm tra thống kê tháng: Org 1 có 7682 km, Org 2 có 0 km
  const statsOrg1 = GpsImportService.getVehicleMonthStats('51D-982.46', '2026-08', org1);
  const statsOrg2 = GpsImportService.getVehicleMonthStats('51D-982.46', '2026-08', org2);
  assert.equal(statsOrg1.totalKm, 7682);
  assert.equal(statsOrg2.totalKm, 0);

  // 7. Org 2 nhập cùng file Excel (cùng biển số, cùng ngày) -> được xử lý độc lập hoàn toàn
  const previewOrg2 = await GpsImportService.previewFile(buf, 'hino_thang_8.xlsx', user2, org2);
  assert.equal(previewOrg2.newRows, 31, 'Org 2 preview must see 31 new rows (isolated from Org 1)');
  const batch2 = await GpsImportService.commitImport(previewOrg2.batchId, user2, org2);
  assert.equal(batch2.organizationId, org2);

  // Danh sách batch của Org 1 và Org 2 tách bạch
  const batchesOrg1 = GpsImportService.getBatches(org1);
  const batchesOrg2 = GpsImportService.getBatches(org2);
  assert.equal(batchesOrg1.length, 1);
  assert.equal(batchesOrg1[0].id, batch1.id);
  assert.equal(batchesOrg2.length, 1);
  assert.equal(batchesOrg2[0].id, batch2.id);
});

test('RBAC 5: Phân quyền hành động lệnh điều xe (Dispatch, Complete, Cancel, Create)', () => {
  const operatorRes = AuthorizationService.getFallbackCapabilities('usr-dieuphoi-01');
  const workerRes = AuthorizationService.getFallbackCapabilities('usr-worker-01');
  const pmRes = AuthorizationService.getFallbackCapabilities('usr-pm-01');

  // Điều phối có đủ quyền vòng đời lệnh
  assert.equal(operatorRes.capabilities['trip.create']?.isEnabled, true);
  assert.equal(operatorRes.capabilities['trip.dispatch']?.isEnabled, true);
  assert.equal(operatorRes.capabilities['trip.complete']?.isEnabled, true);
  assert.equal(operatorRes.capabilities['trip.cancel']?.isEnabled, true);

  // Thợ/lái xe chỉ có quyền đọc và hoàn thành trong phạm vi được giao, KHÔNG có dispatch, cancel, create
  assert.equal(workerRes.capabilities['trip.complete']?.isEnabled, true);
  assert.equal(workerRes.capabilities['trip.dispatch']?.isEnabled, undefined);
  assert.equal(workerRes.capabilities['trip.cancel']?.isEnabled, undefined);
  assert.equal(workerRes.capabilities['trip.create']?.isEnabled, undefined);

  // Phụ trách dự án (PM) KHÔNG có quyền tạo, phát hành hoặc hoàn thành lệnh xe
  assert.equal(pmRes.capabilities['trip.create']?.isEnabled, undefined);
  assert.equal(pmRes.capabilities['trip.dispatch']?.isEnabled, undefined);
  assert.equal(pmRes.capabilities['trip.complete']?.isEnabled, undefined);
  assert.equal(pmRes.capabilities['trip.cancel']?.isEnabled, undefined);
  // PM chỉ có trip.attach và trip.read
  assert.equal(pmRes.capabilities['trip.read']?.isEnabled, true);
  assert.equal(pmRes.capabilities['trip.attach']?.isEnabled, true);
});

test('RBAC 6: Kiểm tra nghiệp vụ đặc quyền Quản lý xe (OT Approval, Policy, Period Lock)', () => {
  const operatorRes = AuthorizationService.getFallbackCapabilities('usr-dieuphoi-01');
  const managerRes = AuthorizationService.getFallbackCapabilities('usr-quanlyxe-01');

  // 1. Duyệt OT (fleet_ot.approve)
  assert.equal(operatorRes.capabilities['fleet_ot.approve']?.isEnabled, undefined, 'Điều phối KHÔNG được duyệt OT');
  assert.equal(managerRes.capabilities['fleet_ot.approve']?.isEnabled, true, 'Quản lý xe ĐƯỢC duyệt OT');

  // 2. Đóng vấn đề (fleet_issue.close)
  assert.equal(operatorRes.capabilities['fleet_issue.close']?.isEnabled, undefined, 'Điều phối KHÔNG được đóng vấn đề nặng');
  assert.equal(managerRes.capabilities['fleet_issue.close']?.isEnabled, true, 'Quản lý xe ĐƯỢC đóng vấn đề');

  // 3. Chính sách xe (fleet_setting.update)
  assert.equal(operatorRes.capabilities['fleet_setting.update']?.isEnabled, undefined, 'Điều phối KHÔNG được sửa chính sách');
  assert.equal(managerRes.capabilities['fleet_setting.update']?.isEnabled, true, 'Quản lý xe ĐƯỢC sửa chính sách');

  // 4. Chốt/mở kỳ (fleet_period.close, fleet_period.reopen)
  assert.equal(operatorRes.capabilities['fleet_period.close']?.isEnabled, undefined);
  assert.equal(operatorRes.capabilities['fleet_period.reopen']?.isEnabled, undefined);
  assert.equal(managerRes.capabilities['fleet_period.close']?.isEnabled, true);
  assert.equal(managerRes.capabilities['fleet_period.reopen']?.isEnabled, true);
});


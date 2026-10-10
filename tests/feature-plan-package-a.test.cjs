const { productionDb } = require('./helpers/production-db.cjs');

(async () => {
  const db = await productionDb();
  try {
    const { IamService } = db.load('src/services/iam.service.ts');
    const { allowedWarehouseIds } = db.load('src/lib/inventory-api.ts');
    const { AuthorizationService } = db.load('src/services/authorization.service.ts');

    // 1. Setup 2 warehouses
    const w1 = (await db.query("INSERT INTO erp.warehouses(organization_id, code, name, kind, is_active) VALUES($1, 'WH-A', 'Kho A', 'workshop', true) RETURNING id", [db.ctx.orgId])).rows[0].id;
    const w2 = (await db.query("INSERT INTO erp.warehouses(organization_id, code, name, kind, is_active) VALUES($1, 'WH-B', 'Kho B', 'workshop', true) RETURNING id", [db.ctx.orgId])).rows[0].id;

    // 2. Setup user with role WAREHOUSE_KEEPER
    const wkUser = 'user-wh-keeper-01';
    await db.query('INSERT INTO public."user"(id, name, email, "createdAt", "updatedAt") VALUES($1, $2, $3, now(), now())', [wkUser, 'Thủ Kho', 'thukho@example.invalid']);
    const wkMem = (await db.query("INSERT INTO erp.memberships(organization_id, user_id, status) VALUES($1, $2, 'active') RETURNING id", [db.ctx.orgId, wkUser])).rows[0].id;

    const whRoleRes = await db.query("SELECT id FROM iam.roles WHERE code = 'WAREHOUSE_KEEPER' LIMIT 1");
    let whRoleId = whRoleRes.rows[0]?.id;
    if (!whRoleId) {
      whRoleId = (await db.query("INSERT INTO iam.roles(organization_id, code, name, is_active) VALUES($1, 'WAREHOUSE_KEEPER', 'Thủ kho', true) RETURNING id", [db.ctx.orgId])).rows[0].id;
    }
    await db.query('INSERT INTO iam.user_roles(organization_id, membership_id, role_id, valid_from, assigned_by, reason) VALUES($1, $2, $3, now() - interval \'1 day\', $4, \'Phân vai trò thủ kho\')', [db.ctx.orgId, wkMem, whRoleId, db.ctx.userId]);

    await db.query(`
      INSERT INTO iam.permissions(key, resource, action, description, supported_scopes, supports_amount_limit)
      VALUES 
        ('stock_document.read', 'stock_document', 'read', 'Xem phiếu kho', ARRAY['ORG','ASSIGNED','SELECTED']::text[], false),
        ('stock_document.approve', 'stock_document', 'approve', 'Duyệt phiếu kho', ARRAY['ORG','ASSIGNED','SELECTED']::text[], true)
      ON CONFLICT (key) DO UPDATE SET supports_amount_limit = EXCLUDED.supports_amount_limit
    `);

    const readPermRes = await db.query("SELECT id FROM iam.permissions WHERE key = 'stock_document.read' LIMIT 1");
    const readPermId = readPermRes.rows[0]?.id;
    if (readPermId) {
      await db.query(`
        INSERT INTO iam.role_grants(organization_id, role_id, permission_id, scope_kind, is_enabled, created_by, updated_by)
        VALUES($1, $2, $3, 'ASSIGNED', true, $4, $4)
        ON CONFLICT (organization_id, role_id, permission_id, scope_kind) DO UPDATE SET is_enabled = true
      `, [db.ctx.orgId, whRoleId, readPermId, db.ctx.userId]);
    }

    // Check allowed warehouses BEFORE assignment -> Must be EMPTY (0 warehouses)
    const initialAllowed = await allowedWarehouseIds(wkUser, db.ctx.orgId);
    if (initialAllowed.length !== 0) {
      throw new Error(`Expected 0 allowed warehouses for unassigned keeper, but got ${initialAllowed.length}`);
    }

    // Assign to Warehouse A
    const assignRes = await IamService.assignWarehouseMember({
      warehouseId: w1,
      membershipId: wkMem,
      createdBy: db.ctx.userId,
    });
    if (!assignRes.id) throw new Error('Assign warehouse member failed');

    // List members
    const members = await IamService.listWarehouseMembers(w1);
    if (members.length === 0 || members[0].membership_id !== wkMem) {
      throw new Error('Assigned member not found in listWarehouseMembers');
    }

    // Check allowed warehouses AFTER assignment -> Must contain ONLY w1
    const afterAllowed = await allowedWarehouseIds(wkUser, db.ctx.orgId);
    if (afterAllowed.length !== 1 || afterAllowed[0] !== w1) {
      throw new Error(`Expected allowed warehouse [${w1}], but got: ${JSON.stringify(afterAllowed)}`);
    }

    // 3. Amount limit 0 test in getRoleGrants
    const testPerm = (await db.query("SELECT id FROM iam.permissions WHERE key = 'stock_document.approve' LIMIT 1")).rows[0]?.id;
    if (testPerm) {
      await db.query(`
        INSERT INTO iam.role_grants(organization_id, role_id, permission_id, scope_kind, amount_limit, currency, is_enabled, created_by, updated_by)
        VALUES($1, $2, $3, 'ASSIGNED', 0, 'VND', true, $4, $4)
        ON CONFLICT(organization_id, role_id, permission_id, scope_kind)
        DO UPDATE SET amount_limit = 0, is_enabled = true
      `, [db.ctx.orgId, whRoleId, testPerm, db.ctx.userId]);

      const grants = await IamService.getRoleGrants(whRoleId);
      const approveGrant = grants.find(g => g.permissionId === testPerm);
      if (!approveGrant || approveGrant.amountLimit !== 0) {
        throw new Error(`Expected amountLimit 0 to be preserved, but got: ${approveGrant ? approveGrant.amountLimit : 'not found'}`);
      }
    }

    // 4. Role change request workflow
    const rcr = await IamService.createRoleChangeRequest({
      roleId: whRoleId,
      changeKind: 'role_grants',
      proposedChange: { grants: [] },
      requestedBy: db.ctx.userId,
    });
    if (!rcr.id) throw new Error('Create role change request failed');

    await IamService.submitRoleChangeRequest(rcr.id, db.ctx.userId);

    // Self-review must fail!
    let selfReviewFailed = false;
    try {
      await IamService.reviewRoleChangeRequest({
        requestId: rcr.id,
        reviewedBy: db.ctx.userId,
        action: 'approve',
      });
    } catch (e) {
      selfReviewFailed = true;
    }
    if (!selfReviewFailed) {
      throw new Error('Self-approval should have failed but succeeded!');
    }

    // Review by another user
    const reviewerId = 'test-reviewer-01';
    await db.query('INSERT INTO public."user"(id, name, email, "createdAt", "updatedAt") VALUES($1, $2, $3, now(), now())', [reviewerId, 'Reviewer', 'reviewer@example.invalid']);
    await IamService.reviewRoleChangeRequest({
      requestId: rcr.id,
      reviewedBy: reviewerId,
      action: 'approve',
    });

    // Apply change request
    await IamService.applyRoleChangeRequest(rcr.id, reviewerId);

    const reqs = await IamService.listRoleChangeRequests(whRoleId);
    const appliedReq = reqs.find(r => r.id === rcr.id);
    if (!appliedReq || appliedReq.status !== 'applied') {
      throw new Error('Expected role change request to be in status applied');
    }

    console.log('PASS: Package A - Warehouse assignments, zero limit preservation, and role change requests workflow');
  } finally {
    await db.close();
  }
})().catch(e => {
  console.error('FAIL Package A:', e.message);
  process.exitCode = 1;
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { productionDb } = require("./helpers/production-db.cjs");

test("Finance & Debt Settlement Bug Fixes Verification", async (t) => {
  const db = await productionDb();
  const { FinanceService } = db.load("./src/services/finance.service.ts");
  const pool = db.pool;
  const orgId = db.ctx.orgId;
  const userId = db.ctx.userId;

  // 1. Tạo tài khoản quỹ test
  const cashAccountId = await FinanceService.createCashAccount(
    {
      code: "TK-TEST-" + Math.floor(Math.random() * 10000),
      name: "Quỹ Test Bug Fixes",
      kind: "bank",
      initialBalance: 100000000,
    },
    userId
  );

  // 2. Tạo đối tác khách hàng
  const partnerRes = await pool.query(
    `INSERT INTO erp.partners (organization_id, code, name, is_customer, is_supplier, is_active, created_by, updated_by)
     VALUES ($1, 'TEST-BUG-CUST-' || floor(random()*10000), 'Khách hàng kiểm thử bug tài chính', true, false, true, $2, $2)
     RETURNING id`,
    [orgId, userId]
  );
  const testPartnerId = partnerRes.rows[0].id;

  // 3. Tạo sales order và open item 5.000.000 đ
  const soRes = await pool.query(
    `INSERT INTO erp.sales_orders (organization_id, code, total, customer_id, owner_membership_id, created_by, updated_by)
     VALUES ($1, 'SO-BUG-001', 5000000, $2, $3, $4, $4)
     RETURNING id`,
    [orgId, testPartnerId, db.ctx.membershipId, userId]
  );
  const soId = soRes.rows[0].id;

  const openItemRes = await pool.query(
    `INSERT INTO erp.open_items (organization_id, partner_id, side, sales_order_id, source_sequence, original_amount, currency, status, due_date, created_by, updated_by)
     VALUES ($1, $2, 'receivable', $3, 1, 5000000, 'VND', 'confirmed', now() + interval '30 days', $4, $4)
     RETURNING id`,
    [orgId, testPartnerId, soId, userId]
  );
  const testOpenItemId = openItemRes.rows[0].id;

  await t.test("BUG #2: Thu vượt công nợ (6tr cho đơn nợ 5tr) bị từ chối ngay lập tức và rollback", async () => {
    await assert.rejects(
      async () => {
        await FinanceService.createPayment(
          {
            direction: "receipt",
            amount: 6000000,
            purpose: "Thu tiền test vượt nợ",
            cashAccountId,
            partnerId: testPartnerId,
            status: "posted",
            allocatedItemIds: [testOpenItemId],
          },
          userId
        );
      },
      /vượt quá tổng nợ có thể gạch/
    );

    // Đảm bảo không có phân bổ nào bị lưu lại dở dang (không rò rỉ tiền)
    const allocCount = await pool.query(
      `SELECT count(*) FROM erp.payment_allocations WHERE open_item_id = $1`,
      [testOpenItemId]
    );
    assert.equal(parseInt(allocCount.rows[0].count, 10), 0);
  });

  await t.test("BUG #1: Thu đúng nợ (5tr) được ghi sổ ngay vào quỹ (cash_entries) và đóng nợ (open_items)", async () => {
    const paymentId = await FinanceService.createPayment(
      {
        direction: "receipt",
        amount: 5000000,
        purpose: "Thu tiền test hợp lệ",
        cashAccountId,
        partnerId: testPartnerId,
        status: "posted",
        allocatedItemIds: [testOpenItemId],
      },
      userId
    );

    assert.ok(paymentId);

    // Phiếu thu ở trạng thái posted
    const payCheck = await pool.query(`SELECT status FROM erp.payments WHERE id = $1`, [paymentId]);
    assert.equal(payCheck.rows[0].status, "posted");

    // Nhật ký quỹ cash_entries có bản ghi +5.000.000 đ
    const cashEntry = await pool.query(
      `SELECT amount_delta, cash_account_id FROM erp.cash_entries WHERE payment_id = $1`,
      [paymentId]
    );
    assert.equal(cashEntry.rows.length, 1);
    assert.equal(parseFloat(cashEntry.rows[0].amount_delta), 5000000);
    assert.equal(cashEntry.rows[0].cash_account_id, cashAccountId);

    // Khoản nợ open_items chuyển trạng thái closed
    const itemCheck = await pool.query(`SELECT status FROM erp.open_items WHERE id = $1`, [testOpenItemId]);
    assert.equal(itemCheck.rows[0].status, "closed");
  });
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { productionDb } = require("./helpers/production-db.cjs");

test("Package B (Payments) & Package E (Finance, Vouchers, Statement Export)", async (t) => {
  const db = await productionDb();

  try {
    const { FinanceService } = db.load("./src/services/finance.service.ts");
    const pool = db.pool;
    const orgId = db.ctx.orgId;
    const userA = db.ctx.userId; // Creator
    const userB = "test-approver-user";
    const userC = "test-accountant-user";

    // Create userB and userC in database
    await pool.query(
      `INSERT INTO public."user" (id, name, email, "createdAt", "updatedAt")
       VALUES ($1, 'Approver User', 'approver@example.com', now(), now()),
              ($2, 'Accountant User', 'accountant@example.com', now(), now())`,
      [userB, userC]
    );

    // Create a cash account
    const accId = await FinanceService.createCashAccount(
      { code: "TM-01", name: "Quỹ tiền mặt chính", kind: "cash", initialBalance: 50000000 },
      userA
    );

    // Create a customer partner and an open item (receivable debt)
    const partnerRes = await pool.query(
      `INSERT INTO erp.partners (organization_id, code, name, phone, address, is_customer, created_by, updated_by)
       VALUES ($1, 'KH-001', 'Công ty Khách Hàng Test', '0901234567', '123 Lê Lợi, Q1, TP.HCM', true, $2, $2)
       RETURNING id`,
      [orgId, userA]
    );
    const partnerId = partnerRes.rows[0].id;

    // Create a sales order to back the open item
    const soRes = await pool.query(
      `INSERT INTO erp.sales_orders (organization_id, code, total, customer_id, owner_membership_id, created_by, updated_by)
       VALUES ($1, 'SO-TEST-001', 20000000, $2, $3, $4, $4)
       RETURNING id`,
      [orgId, partnerId, db.ctx.membershipId, userA]
    );
    const soId = soRes.rows[0].id;

    const openItemRes = await pool.query(
      `INSERT INTO erp.open_items (organization_id, side, partner_id, sales_order_id, source_sequence, original_amount, currency, due_date, status, created_by, updated_by)
       VALUES ($1, 'receivable', $2, $3, 1, 20000000, 'VND', CURRENT_DATE + interval '30 days', 'confirmed', $4, $4)
       RETURNING id`,
      [orgId, partnerId, soId, userA]
    );
    const openItemId = openItemRes.rows[0].id;

    // Verify initial balance
    const accountsInit = await FinanceService.listCashAccounts();
    const initAcc = accountsInit.find((a) => a.id === accId);
    assert.equal(initAcc.balance, 50000000, "Initial balance should be 50,000,000 VND");

    await t.test("1. Draft and Submitted Payments do not touch cash balance or close debt", async () => {
      // Create payment as draft
      const paymentId = await FinanceService.createPayment(
        {
          direction: "receipt",
          amount: 20000000,
          purpose: "Thu tiền hợp đồng khách hàng KH-001",
          cashAccountId: accId,
          partnerId,
          status: "draft",
          allocatedItemIds: [openItemId],
        },
        userA
      );

      // Verify payment status is draft
      const payments = await FinanceService.listPayments();
      const p = payments.find((x) => x.id === paymentId);
      assert.equal(p.status, "draft");

      // Verify NO cash entry was created
      const entriesRes = await pool.query(
        `SELECT COUNT(*) FROM erp.cash_entries WHERE payment_id = $1`,
        [paymentId]
      );
      assert.equal(Number(entriesRes.rows[0].count), 0, "Draft payment must not create cash entries");

      // Verify open item is still confirmed, NOT closed
      const oiCheck = await pool.query(`SELECT status FROM erp.open_items WHERE id = $1`, [openItemId]);
      assert.equal(oiCheck.rows[0].status, "confirmed", "Open item must remain confirmed while payment is in draft");

      // Submit payment
      await FinanceService.submitPayment(paymentId, userA);
      const pSubmitted = (await FinanceService.listPayments()).find((x) => x.id === paymentId);
      assert.equal(pSubmitted.status, "submitted");
      assert.ok(pSubmitted.submittedAt, "submitted_at must be populated");
      assert.equal(pSubmitted.submittedBy, userA);

      // Balance must STILL be unchanged
      const accCheck = (await FinanceService.listCashAccounts()).find((a) => a.id === accId);
      assert.equal(accCheck.balance, 50000000, "Cash balance must not change on submit");
    });

    await t.test("2. Separation of Duties: No self-approval and limit check", async () => {
      // Find the submitted payment
      const p = (await FinanceService.listPayments()).find((x) => x.status === "submitted");
      assert.ok(p);

      // Creator (userA) tries to approve -> must fail
      await assert.rejects(
        () => FinanceService.approvePayment(p.id, userA, 100000000, false),
        /Người lập phiếu không thể tự phê duyệt/,
        "Creator cannot approve their own payment"
      );

      // Approver (userB) tries to approve with amount limit lower than 20,000,000 -> must fail
      await assert.rejects(
        () => FinanceService.approvePayment(p.id, userB, 15000000, false),
        /vượt quá hạn mức phê duyệt/,
        "Approver limit check must enforce maximum amount"
      );

      // Approver (userB) with sufficient limit (e.g. 50,000,000) approves -> succeeds
      await FinanceService.approvePayment(p.id, userB, 50000000, false);
      const pApproved = (await FinanceService.listPayments()).find((x) => x.id === p.id);
      assert.equal(pApproved.status, "approved");
      assert.equal(pApproved.approvedBy, userB);
      assert.ok(pApproved.approvedAt);

      // Balance must STILL be unchanged after approval (Thủ quỹ chưa ghi sổ)
      const accCheck = (await FinanceService.listCashAccounts()).find((a) => a.id === accId);
      assert.equal(accCheck.balance, 50000000, "Balance must not change on approval");
    });

    await t.test("3. Ghi sổ (Posting): atomic cash entry, debt closing, and period lock check", async () => {
      const p = (await FinanceService.listPayments()).find((x) => x.status === "approved");
      assert.ok(p);

      // Lock current period to test period locking
      const now = new Date();
      await pool.query(
        `INSERT INTO erp.attendance_periods (organization_id, year, month, status, created_by, updated_by)
         VALUES ($1, $2, $3, 'locked', $4, $4)
         ON CONFLICT (organization_id, year, month) DO UPDATE SET status = 'locked'`,
        [orgId, now.getFullYear(), now.getMonth() + 1, userA]
      );

      // Attempting to post in locked period must fail
      await assert.rejects(
        () => FinanceService.postPayment(p.id, userC, null),
        /Kỳ tài chính\/kế toán.*đã bị khóa/,
        "Posting must be rejected in a locked period"
      );

      // Unlock period
      await pool.query(
        `UPDATE erp.attendance_periods SET status = 'open' WHERE organization_id = $1 AND year = $2 AND month = $3`,
        [orgId, now.getFullYear(), now.getMonth() + 1]
      );

      // Post payment
      await FinanceService.postPayment(p.id, userC, null);

      // Verify payment status is posted
      const pPosted = (await FinanceService.listPayments()).find((x) => x.id === p.id);
      assert.equal(pPosted.status, "posted");
      assert.equal(pPosted.postedBy, userC);
      assert.ok(pPosted.postedAt);

      // Verify cash entry was inserted and balance updated: 50,000,000 + 20,000,000 = 70,000,000
      const accCheck = (await FinanceService.listCashAccounts()).find((a) => a.id === accId);
      assert.equal(accCheck.balance, 70000000, "Cash balance must increase by 20,000,000 on receipt post");

      // Verify open item was closed
      const oiCheck = await pool.query(`SELECT status FROM erp.open_items WHERE id = $1`, [openItemId]);
      assert.equal(oiCheck.rows[0].status, "closed", "Fully allocated open item must be closed upon posting");

      // Cannot post again (idempotency)
      await assert.rejects(
        () => FinanceService.postPayment(p.id, userC, null),
        /Phiếu phải được phê duyệt trước khi ghi sổ|đã được ghi sổ trước đó/,
        "Cannot post an already posted payment"
      );
    });

    await t.test("4. Reversal (Đảo phiếu) restores debt and reverses cash balance", async () => {
      const p = (await FinanceService.listPayments()).find((x) => x.status === "posted");
      assert.ok(p);

      // Reverse payment
      const reversalId = await FinanceService.reversePayment(
        p.id,
        userC,
        "Khách chuyển nhầm tài khoản, thực hiện hoàn trả"
      );

      assert.ok(reversalId, "Reversal payment ID returned");

      // Verify original payment is marked reversed
      const pOrig = (await FinanceService.listPayments()).find((x) => x.id === p.id);
      assert.equal(pOrig.status, "reversed");

      // Verify reversal payment details
      const pRev = (await FinanceService.listPayments()).find((x) => x.id === reversalId);
      assert.equal(pRev.status, "posted");
      assert.equal(pRev.direction, "disbursement", "Reversal of receipt must be a disbursement");
      assert.equal(pRev.amount, p.amount);
      assert.equal(pRev.isReversal, true);
      assert.equal(pRev.reversalOfPaymentId, p.id);

      // Verify cash balance restored back to 50,000,000: 70,000,000 - 20,000,000 = 50,000,000
      const accCheck = (await FinanceService.listCashAccounts()).find((a) => a.id === accId);
      assert.equal(accCheck.balance, 50000000, "Cash balance must be restored back after reversal");

      // Verify open item is reopened to confirmed
      const oiCheck = await pool.query(`SELECT status FROM erp.open_items WHERE id = $1`, [openItemId]);
      assert.equal(oiCheck.rows[0].status, "confirmed", "Open item must be reopened back to confirmed after payment reversal");
    });

    await t.test("5. Payment Voucher Data & Vietnamese Amount in Words (E02)", async () => {
      // Create a disbursement voucher
      const pId = await FinanceService.createPayment(
        {
          direction: "disbursement",
          amount: 15250000,
          purpose: "Chi tiền mua vật tư nhôm hộp dự án",
          cashAccountId: accId,
          partnerId,
          status: "posted",
          documentFileName: "hoa_don_vat_tu_001.pdf",
        },
        userA
      );

      const voucher = await FinanceService.generatePaymentVoucherData(pId);
      assert.equal(voucher.voucherType, "PAYMENT");
      assert.equal(voucher.voucherTitle, "PHIẾU CHI");
      assert.equal(voucher.amount, 15250000);
      assert.equal(voucher.amountFormatted, "15.250.000 đ");
      assert.equal(
        voucher.amountInWords,
        "Mười lăm triệu hai trăm năm mươi nghìn đồng chẵn.",
        "Vietnamese amount in words must match standard accounting format"
      );
      assert.equal(voucher.documentFileName, "hoa_don_vat_tu_001.pdf");
      assert.ok(voucher.signers.directorOrApprover);
      assert.ok(voucher.signers.chiefAccountant);
      assert.ok(voucher.signers.treasurer);
      assert.ok(voucher.signers.creator);

      // Test HTML voucher generator
      const html = FinanceService.generateVoucherHtml(voucher);
      assert.ok(html.includes("PHIẾU CHI"));
      assert.ok(html.includes("15.250.000 đ"));
      assert.ok(html.includes("Mười lăm triệu hai trăm năm mươi nghìn đồng chẵn."));
      assert.ok(html.includes("Giám đốc"));
      assert.ok(html.includes("Thủ quỹ"));
    });

    await t.test("6. Transaction History Statement and Excel Export (E03)", async () => {
      const history = await FinanceService.exportTransactionHistory({
        accountId: accId,
      });

      assert.ok(history.rows.length >= 2, "Must return transactions recorded in the account");
      assert.ok(history.closingBalance !== undefined);
      assert.equal(typeof history.totalDebit, "number");
      assert.equal(typeof history.totalCredit, "number");

      // Verify Excel export returns valid buffer
      const buffer = await FinanceService.exportTransactionHistoryExcel({
        accountId: accId,
      });
      assert.ok(Buffer.isBuffer(buffer), "Export must return a Node.js Buffer");
      assert.ok(buffer.length > 1000, "Excel buffer should be non-empty and well-formed");
    });
  } finally {
    await db.close();
  }
});

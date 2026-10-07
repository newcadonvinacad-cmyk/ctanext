/**
 * DỊCH VỤ MUA HÀNG, NHÀ CUNG CẤP & AI OCR HÓA ĐƠN (PROCUREMENT SERVICE)
 * Triển khai theo quy chuẩn M05, M06 trong docs/DANH_SACH_MAN_HINH_HE_THONG.md
 * và ma trận phân quyền docs/MA_TRAN_PHAN_QUYEN_DONG.md
 */

import { getDbPool, getCachedOrgId } from "@/lib/db";
import { geminiService } from "@/lib/ai/gemini";
import { getNextDocumentCode } from "@/lib/sequences";
import { storageService } from "@/lib/supabase/storage";

export interface SupplierDto {
  id: string;
  code: string;
  name: string;
  taxCode: string | null;
  phone: string | null;
  address: string | null;
  creditLimit: number;
  paymentDays: number;
  totalPayable: number;
  priceCount: number;
  poCount: number;
  createdAt: string;
}

export interface SupplierOpenItemDto {
  id: string;
  originalAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: string;
  purchaseOrderId: string | null;
  purchaseOrderCode: string | null;
  createdAt: string;
}

export interface SupplierPaymentHistoryDto {
  id: string;
  code: string;
  amount: number;
  paidAt: string | null;
  purpose: string;
  status: string;
  accountName: string | null;
  documentImage?: string | null;
  createdAt: string;
}

export interface SupplierPriceDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId: string;
  unitName: string;
  price: number;
  currency: string;
}

export interface PurchaseOrderLineDto {
  id: string;
  lineNo: number;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId: string;
  unitName: string;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrderDto {
  id: string;
  code: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "completed";
  currency: string;
  total: number;
  expectedDate: string | null;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  supplierPhone: string | null;
  projectId: string | null;
  projectName: string | null;
  requestedBy: string;
  requesterName: string | null;
  linesCount: number;
  createdAt: string;
  invoiceImage?: string | null;
  lines?: PurchaseOrderLineDto[];
}

let hasEnsuredInvoiceImageCol = false;
async function ensureInvoiceImageColumn(pool: any) {
  if (hasEnsuredInvoiceImageCol) return;
  try {
    await pool.query(`ALTER TABLE erp.purchase_orders ADD COLUMN IF NOT EXISTS invoice_image text;`);
    await pool.query(`UPDATE erp.purchase_orders SET status = 'approved' WHERE status IN ('draft', 'submitted');`);
    // Đảm bảo các đơn PO đều có bản ghi công nợ erp.open_items
    await pool.query(`
      INSERT INTO erp.open_items (
        organization_id, side, currency, original_amount, due_date, status,
        source_sequence, partner_id, purchase_order_id, created_by, updated_by
      )
      SELECT 
        po.organization_id,
        'payable',
        'VND',
        po.total,
        COALESCE(po.expected_date, (po.created_at + INTERVAL '15 days')::date),
        'confirmed',
        1,
        po.supplier_id,
        po.id,
        po.created_by,
        po.created_by
      FROM erp.purchase_orders po
      LEFT JOIN erp.open_items oi ON oi.purchase_order_id = po.id
      WHERE oi.id IS NULL AND po.total > 0;
    `);
    hasEnsuredInvoiceImageCol = true;
  } catch (e) {
    console.error("Failed to ensure invoice_image column or open_items on erp.purchase_orders:", e);
  }
}

export class ProcurementService {
  private static async getOrgId(): Promise<string> {
    return getCachedOrgId("SIGNAGE");
  }

  // ------------------------------------------
  // M05: QUẢN LÝ NHÀ CUNG CẤP & BẢNG GIÁ
  // ------------------------------------------
  static async listSuppliers(filters?: { search?: string }): Promise<SupplierDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    await ensureInvoiceImageColumn(pool);

    let sql = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.tax_code,
        p.phone,
        p.address,
        p.created_at,
        COALESCE(pt.credit_limit, 0) as credit_limit,
        COALESCE(pt.payment_days, 0) as payment_days,
        COALESCE(
          GREATEST(
            0,
            COALESCE((SELECT SUM(po.total) FROM erp.purchase_orders po WHERE po.organization_id = p.organization_id AND po.supplier_id = p.id AND po.status NOT IN ('cancelled', 'rejected')), 0) -
            COALESCE((SELECT SUM(pm.amount) FROM erp.payments pm WHERE pm.organization_id = p.organization_id AND pm.partner_id = p.id AND pm.direction = 'disbursement' AND pm.status = 'posted'), 0)
          ),
          0
        ) as total_payable,
        COUNT(DISTINCT sp.id) as price_count,
        COUNT(DISTINCT po.id) as po_count
      FROM erp.partners p
      LEFT JOIN erp.partner_terms pt ON pt.partner_id = p.id AND pt.side = 'payable'
      LEFT JOIN erp.supplier_prices sp ON sp.partner_id = p.id
      LEFT JOIN erp.purchase_orders po ON po.supplier_id = p.id
      WHERE p.organization_id = $1 AND p.is_supplier = true
    `;
    const params: any[] = [orgId];

    if (filters?.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      sql += ` AND (LOWER(p.name) LIKE $${params.length} OR LOWER(p.code) LIKE $${params.length})`;
    }

    sql += `
      GROUP BY p.id, pt.credit_limit, pt.payment_days
      ORDER BY p.created_at DESC
    `;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      taxCode: r.tax_code,
      phone: r.phone,
      address: r.address,
      creditLimit: Number(r.credit_limit) || 0,
      paymentDays: Number(r.payment_days) || 0,
      totalPayable: Number(r.total_payable) || 0,
      priceCount: Number(r.price_count) || 0,
      poCount: Number(r.po_count) || 0,
      createdAt: r.created_at.toISOString(),
    }));
  }

  static async getSupplierById(id: string): Promise<{
    supplier: SupplierDto | null;
    prices: SupplierPriceDto[];
    purchaseOrders: PurchaseOrderDto[];
    openItems: SupplierOpenItemDto[];
    payments: SupplierPaymentHistoryDto[];
  }> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    await ensureInvoiceImageColumn(pool);

    const suppliers = await this.listSuppliers();
    const supplier = suppliers.find((s) => s.id === id) || null;

    // Lấy bảng giá thỏa thuận
    const pricesRes = await pool.query(
      `SELECT 
         sp.id,
         sp.item_id,
         i.code as item_code,
         i.name as item_name,
         sp.unit_id,
         u.name as unit_name,
         sp.price,
         sp.currency
       FROM erp.supplier_prices sp
       JOIN erp.items i ON i.id = sp.item_id
       JOIN erp.units u ON u.id = sp.unit_id
       WHERE sp.organization_id = $1 AND sp.partner_id = $2
       ORDER BY i.name ASC`,
      [orgId, id]
    );

    const prices: SupplierPriceDto[] = pricesRes.rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      itemCode: r.item_code,
      itemName: r.item_name,
      unitId: r.unit_id,
      unitName: r.unit_name,
      price: Number(r.price),
      currency: r.currency,
    }));

    // Lấy lịch sử đơn mua
    const poList = await this.listPurchaseOrders({ supplierId: id });

    // Lấy danh sách công nợ hóa đơn (open_items)
    const openItemsRes = await pool.query(
      `SELECT 
         oi.id,
         oi.original_amount,
         oi.due_date,
         oi.status,
         oi.purchase_order_id,
         po.code as purchase_order_code,
         COALESCE((SELECT SUM(pa.amount) FROM erp.payment_allocations pa WHERE pa.open_item_id = oi.id), 0) as allocated_amount,
         (oi.original_amount - COALESCE((SELECT SUM(pa.amount) FROM erp.payment_allocations pa WHERE pa.open_item_id = oi.id), 0)) as remaining_amount,
         oi.created_at
       FROM erp.open_items oi
       LEFT JOIN erp.purchase_orders po ON po.id = oi.purchase_order_id
       WHERE oi.organization_id = $1 AND oi.partner_id = $2 AND oi.side = 'payable'
       ORDER BY oi.created_at DESC`,
      [orgId, id]
    );

    const openItems: SupplierOpenItemDto[] = openItemsRes.rows.map((r) => ({
      id: r.id,
      originalAmount: Number(r.original_amount),
      allocatedAmount: Number(r.allocated_amount),
      remainingAmount: Math.max(0, Number(r.remaining_amount)),
      dueDate: r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : "",
      status: r.status,
      purchaseOrderId: r.purchase_order_id,
      purchaseOrderCode: r.purchase_order_code,
      createdAt: r.created_at.toISOString(),
    }));

    // Lấy lịch sử phiếu chi thanh toán cho NCC
    const paymentsRes = await pool.query(
      `SELECT 
         pm.id,
         pm.code,
         pm.amount,
         pm.paid_at,
         pm.purpose,
         pm.status,
         pm.document_image,
         ca.name as account_name,
         pm.created_at
       FROM erp.payments pm
       LEFT JOIN erp.cash_accounts ca ON ca.id = pm.cash_account_id
       WHERE pm.organization_id = $1 AND pm.partner_id = $2 AND pm.direction = 'disbursement'
       ORDER BY pm.created_at DESC`,
      [orgId, id]
    );

    const payments: SupplierPaymentHistoryDto[] = paymentsRes.rows.map((r) => ({
      id: r.id,
      code: r.code,
      amount: Number(r.amount),
      paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
      purpose: r.purpose,
      status: r.status,
      accountName: r.account_name,
      documentImage: r.document_image || null,
      createdAt: r.created_at.toISOString(),
    }));

    return { supplier, prices, purchaseOrders: poList, openItems, payments };
  }

  static async createSupplier(
    data: {
      code?: string;
      name: string;
      taxCode?: string;
      phone?: string;
      address?: string;
      creditLimit?: number;
      paymentDays?: number;
    },
    userId: string
  ): Promise<string> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let code = data.code;
    if (!code) {
      const cRes = await pool.query(
        "SELECT COUNT(*) FROM erp.partners WHERE organization_id = $1 AND is_supplier = true",
        [orgId]
      );
      code = `NCC-${String(Number(cRes.rows[0].count) + 1).padStart(3, "0")}`;
    }

    const memRes = await pool.query(
      "SELECT id FROM erp.memberships WHERE organization_id = $1 LIMIT 1",
      [orgId]
    );
    const ownerMemId = memRes.rows[0].id;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertRes = await client.query(
        `INSERT INTO erp.partners (
           organization_id, code, name, tax_code, phone, address,
           is_customer, is_supplier, is_active, owner_membership_id, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, false, true, true, $7, $8, $8)
         RETURNING id`,
        [orgId, code, data.name, data.taxCode || null, data.phone || null, data.address || null, ownerMemId, userId]
      );
      const supplierId = insertRes.rows[0].id;

      await client.query(
        `INSERT INTO erp.partner_terms (
           organization_id, partner_id, side, credit_limit, payment_days, currency, created_by, updated_by
         )
         VALUES ($1, $2, 'payable', $3, $4, 'VND', $5, $5)`,
        [orgId, supplierId, data.creditLimit || 50000000, data.paymentDays || 15, userId]
      );

      await client.query("COMMIT");
      return supplierId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ------------------------------------------
  // M06: ĐƠN MUA HÀNG (PO)
  // ------------------------------------------
  static async listPurchaseOrders(filters?: {
    status?: string;
    supplierId?: string;
    projectId?: string;
  }): Promise<PurchaseOrderDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    await ensureInvoiceImageColumn(pool);

    let sql = `
      SELECT 
        po.id,
        po.code,
        po.status,
        po.currency,
        po.total,
        po.expected_date,
        po.supplier_id,
        po.invoice_image,
        pt.code as supplier_code,
        pt.name as supplier_name,
        pt.phone as supplier_phone,
        po.project_id,
        pj.name as project_name,
        po.requested_by,
        u.name as requester_name,
        COUNT(pol.id) as lines_count,
        po.created_at
      FROM erp.purchase_orders po
      JOIN erp.partners pt ON pt.id = po.supplier_id
      LEFT JOIN erp.projects pj ON pj.id = po.project_id
      LEFT JOIN erp.memberships m ON m.id = po.requested_by
      LEFT JOIN public."user" u ON u.id = m.user_id
      LEFT JOIN erp.purchase_order_lines pol ON pol.purchase_order_id = po.id
      WHERE po.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND po.status = $${params.length}`;
    }
    if (filters?.supplierId) {
      params.push(filters.supplierId);
      sql += ` AND po.supplier_id = $${params.length}`;
    }
    if (filters?.projectId) {
      params.push(filters.projectId);
      sql += ` AND po.project_id = $${params.length}`;
    }

    sql += `
      GROUP BY po.id, po.invoice_image, pt.code, pt.name, pt.phone, pj.name, u.name
      ORDER BY po.created_at DESC
    `;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      currency: r.currency,
      total: Number(r.total),
      expectedDate: r.expected_date ? new Date(r.expected_date).toISOString().split("T")[0] : null,
      supplierId: r.supplier_id,
      supplierCode: r.supplier_code,
      supplierName: r.supplier_name,
      supplierPhone: r.supplier_phone,
      projectId: r.project_id,
      projectName: r.project_name,
      requestedBy: r.requested_by,
      requesterName: r.requester_name,
      linesCount: Number(r.lines_count) || 0,
      createdAt: r.created_at.toISOString(),
      invoiceImage: r.invoice_image || null,
    }));
  }

  static async getPurchaseOrderById(id: string): Promise<PurchaseOrderDto | null> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const orders = await this.listPurchaseOrders();
    const po = orders.find((o) => o.id === id);
    if (!po) return null;

    const linesRes = await pool.query(
      `SELECT 
         pol.id,
         pol.line_no,
         pol.item_id,
         COALESCE(i.code, 'VT') as item_code,
         COALESCE(i.name, pol.description) as item_name,
         pol.unit_id,
         COALESCE(u.name, 'Cái') as unit_name,
         pol.description,
         pol.qty,
         pol.unit_price,
         pol.line_total
       FROM erp.purchase_order_lines pol
       LEFT JOIN erp.items i ON i.id = pol.item_id
       LEFT JOIN erp.units u ON u.id = pol.unit_id
       WHERE pol.organization_id = $1 AND pol.purchase_order_id = $2
       ORDER BY pol.line_no ASC`,
      [orgId, id]
    );

    po.lines = linesRes.rows.map((r) => ({
      id: r.id,
      lineNo: r.line_no,
      itemId: r.item_id,
      itemCode: r.item_code,
      itemName: r.item_name,
      unitId: r.unit_id,
      unitName: r.unit_name,
      description: r.description,
      qty: Number(r.qty),
      unitPrice: Number(r.unit_price),
      lineTotal: Number(r.line_total),
    }));

    return po;
  }

  static async createPurchaseOrder(
    data: {
      supplierId: string;
      projectId?: string;
      expectedDate?: string;
      invoiceImage?: string | null;
      lines: {
        itemId: string;
        unitId: string;
        description: string;
        qty: number;
        unitPrice: number;
      }[];
    },
    userId: string
  ): Promise<string> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    await ensureInvoiceImageColumn(pool);

    const total = data.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

    // Xử lý upload ảnh lên Supabase Storage bucket nếu là base64
    let finalImageUrl = data.invoiceImage || null;
    if (finalImageUrl && finalImageUrl.startsWith("data:image/")) {
      try {
        const uploadRes = await storageService.uploadReceiptPhoto({
          fileOrBase64: finalImageUrl,
          isServer: true,
        });
        finalImageUrl = uploadRes.publicUrl;
      } catch (uploadErr) {
        console.error("Lỗi upload ảnh lên Supabase Storage:", uploadErr);
      }
    }

    // Lấy membership của người tạo
    const memRes = await pool.query(
      "SELECT id FROM erp.memberships WHERE user_id = $1 AND organization_id = $2 LIMIT 1",
      [userId, orgId]
    );
    const requesterMemId = memRes.rows[0]?.id || (await pool.query("SELECT id FROM erp.memberships LIMIT 1")).rows[0].id;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // DOC-01: Cấp mã PO tuần tự nguyên tử chống trùng lặp đa luồng
      const code = await getNextDocumentCode(client, orgId, "purchase_order", "PO");

      // Đơn mua không cần duyệt: cấp mã PO và lưu trực tiếp với status = 'approved'
      const poRes = await client.query(
        `INSERT INTO erp.purchase_orders (
           organization_id, code, status, currency, total, expected_date,
           supplier_id, project_id, requested_by, invoice_image, created_by, updated_by
         )
         VALUES ($1, $2, 'approved', 'VND', $3, $4, $5, $6, $7, $8, $9, $9)
         RETURNING id`,
        [
          orgId,
          code,
          total,
          data.expectedDate || null,
          data.supplierId,
          data.projectId || null,
          requesterMemId,
          finalImageUrl,
          userId,
        ]
      );
      const poId = poRes.rows[0].id;

      let lineNo = 1;
      for (const line of data.lines) {
        let unitId = line.unitId;
        if (!unitId) {
          const itemRes = await client.query(
            "SELECT base_unit_id FROM erp.items WHERE id = $1 LIMIT 1",
            [line.itemId]
          );
          unitId = itemRes.rows[0]?.base_unit_id;
        }
        if (!unitId) {
          const fallbackUnit = await client.query("SELECT id FROM erp.units LIMIT 1");
          unitId = fallbackUnit.rows[0]?.id;
        }

        await client.query(
          `INSERT INTO erp.purchase_order_lines (
             organization_id, purchase_order_id, line_no, item_id, unit_id,
             description, qty, unit_price, line_total, factor_snapshot, created_by, updated_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $10)`,
          [
            orgId,
            poId,
            lineNo,
            line.itemId,
            unitId,
            line.description,
            line.qty,
            line.unitPrice,
            line.qty * line.unitPrice,
            userId,
          ]
        );
        lineNo++;
      }

      // Tự động tạo bản ghi công nợ phải trả (erp.open_items) cho đơn mua hàng
      if (total > 0) {
        const dueDate = data.expectedDate || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0];
        await client.query(
          `INSERT INTO erp.open_items (
             organization_id, side, currency, original_amount, due_date, status,
             source_sequence, partner_id, purchase_order_id, created_by, updated_by
           )
           VALUES ($1, 'payable', 'VND', $2, $3, 'confirmed', 1, $4, $5, $6, $6)`,
          [orgId, total, dueDate, data.supplierId, poId, userId]
        );
      }

      await client.query("COMMIT");
      return poId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async approvePurchaseOrder(
    id: string,
    userCapabilities: any,
    userId: string
  ): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrgId();

      // DOC-02: Khóa chứng từ FOR UPDATE trong transaction
      const poRes = await client.query(
        "SELECT id, total, status, created_by FROM erp.purchase_orders WHERE organization_id = $1 AND id = $2 FOR UPDATE",
        [orgId, id]
      );
      if (poRes.rows.length === 0) throw new Error("Không tìm thấy đơn mua");
      const po = poRes.rows[0];

      // DOC-02: Chặn trạng thái không hợp lệ
      if (po.status === "approved") {
        throw new Error("Đơn mua hàng này đã được phê duyệt trước đó!");
      }
      if (po.status === "cancelled" || po.status === "completed") {
        throw new Error(`Không thể phê duyệt đơn mua hàng ở trạng thái '${po.status}'!`);
      }

      // DOC-02: Chống tự phê duyệt
      if (po.created_by === userId) {
        throw new Error("Người lập đơn không được tự phê duyệt đơn mua hàng của chính mình (Separation of Duties)!");
      }

      const total = Number(po.total);

      // Kiểm tra quyền và hạn mức duyệt
      const poApproveCap = userCapabilities["purchase_order.approve"];
      if (!poApproveCap?.isEnabled) {
        throw new Error("Bạn không có quyền phê duyệt đơn mua hàng");
      }

      if (poApproveCap.amountLimit !== null && poApproveCap.amountLimit !== undefined && total > poApproveCap.amountLimit) {
        throw new Error(
          `Đơn hàng trị giá ${total.toLocaleString("vi-VN")} đ vượt quá hạn mức duyệt của bạn (${poApproveCap.amountLimit.toLocaleString("vi-VN")} đ). Vui lòng chuyển Ban Giám Đốc duyệt!`
        );
      }

      await client.query(
        `UPDATE erp.purchase_orders 
         SET status = 'approved', updated_at = now(), updated_by = $1
         WHERE organization_id = $2 AND id = $3`,
        [userId, orgId, id]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // ------------------------------------------
  // AI OCR HÓA ĐƠN MUA HÀNG
  // ------------------------------------------
  static async processInvoiceOcr(
    imageDataOrPrompt: string,
    userId: string
  ): Promise<any> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

    const memRes = await pool.query(
      "SELECT id FROM erp.memberships WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    const memId = memRes.rows[0]?.id || (await pool.query("SELECT id FROM erp.memberships LIMIT 1")).rows[0]?.id;

    if (!imageDataOrPrompt || imageDataOrPrompt.trim().length === 0) {
      throw new Error("Không có dữ liệu hình ảnh để phân tích OCR");
    }

    let mimeType = "image/jpeg";
    if (imageDataOrPrompt.startsWith("data:image/png")) mimeType = "image/png";
    else if (imageDataOrPrompt.startsWith("data:image/webp")) mimeType = "image/webp";

    let rawOcrResult: any = null;
    try {
      rawOcrResult = await geminiService.ocrReceiptImage({
        imageBase64: imageDataOrPrompt,
        mimeType,
      });
    } catch (ocrErr: any) {
      // Ghi log thất bại vào erp.ai_runs
      await pool.query(
        `INSERT INTO erp.ai_runs (
           organization_id, agent_code, status, model, input_snapshot, output_json,
           schema_version, request_id, requested_by, created_by
         )
         VALUES ($1, 'INVOICE_OCR', 'failed', $2, $3, $4, 'v1', $5, $6, $7)`,
        [
          orgId,
          modelName,
          JSON.stringify({ mimeType, imageLength: imageDataOrPrompt.length }),
          JSON.stringify({ error: ocrErr.message }),
          crypto.randomUUID(),
          memId,
          userId,
        ]
      ).catch(() => {});
      throw new Error(`Dịch vụ Gemini OCR thất bại: ${ocrErr.message}`);
    }

    // Lấy danh mục vật tư trong kho để so khớp tên / SKU
    const itemsRes = await pool.query(
      "SELECT id, code, name, base_unit_id FROM erp.items WHERE organization_id = $1 AND is_active = true",
      [orgId]
    );
    const allItems = itemsRes.rows;

    const rawItems = Array.isArray(rawOcrResult?.items) ? rawOcrResult.items : [];
    const matchedLines = rawItems.map((item: any, idx: number) => {
      const rawName = (item.item_name || item.name || "").trim();
      const matched = allItems.find(
        (it: any) =>
          it.name.toLowerCase().includes(rawName.toLowerCase()) ||
          (rawName.length > 3 && rawName.toLowerCase().includes(it.name.toLowerCase()))
      );

      const qty = Number(item.quantity || item.qty) || 1;
      const unitPrice = Number(item.unit_price || item.unitPrice) || 0;
      const amount = Number(item.amount) || qty * unitPrice;

      return {
        id: String(idx + 1),
        description: rawName,
        rawName,
        qty,
        unit: item.unit || "Cái",
        unitPrice,
        amount,
        matchedItemId: matched?.id || undefined,
        matchedItemName: matched?.name || undefined,
        matchedItemCode: matched?.code || undefined,
      };
    });

    const parsedData = {
      supplierName: rawOcrResult?.vendor_name || rawOcrResult?.supplierName || "",
      invoiceNo: rawOcrResult?.invoice_number || rawOcrResult?.invoiceNo || "",
      invoiceDate: rawOcrResult?.invoice_date || new Date().toISOString().split("T")[0],
      totalAmount:
        Number(rawOcrResult?.total_amount) ||
        matchedLines.reduce((s: number, l: any) => s + l.amount, 0),
      items: matchedLines,
      lines: matchedLines,
    };

    // Ghi log thành công vào erp.ai_runs
    await pool.query(
      `INSERT INTO erp.ai_runs (
         organization_id, agent_code, status, model, input_snapshot, output_json,
         schema_version, request_id, requested_by, created_by
       )
       VALUES ($1, 'INVOICE_OCR', 'completed', $2, $3, $4, 'v1', $5, $6, $7)`,
      [
        orgId,
        modelName,
        JSON.stringify({ mimeType, imageLength: imageDataOrPrompt.length }),
        JSON.stringify(parsedData),
        crypto.randomUUID(),
        memId,
        userId,
      ]
    ).catch(() => {});

    return parsedData;
  }
}

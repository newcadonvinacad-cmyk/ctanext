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

  /**
   * Cập nhật thông tin nhà cung cấp
   */
  static async updateSupplier(
    supplierId: string,
    data: {
      name?: string;
      code?: string;
      taxCode?: string;
      phone?: string;
      address?: string;
      creditLimit?: number;
      paymentDays?: number;
      isActive?: boolean;
    },
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updates: string[] = ["updated_by = $1", "updated_at = now()"];
      const params: any[] = [userId, orgId, supplierId];
      let pIdx = 4;

      if (data.name !== undefined) {
        updates.push(`name = $${pIdx}`);
        params.push(data.name.trim());
        pIdx++;
      }
      if (data.code !== undefined) {
        updates.push(`code = $${pIdx}`);
        params.push(data.code.trim().toUpperCase());
        pIdx++;
      }
      if (data.taxCode !== undefined) {
        updates.push(`tax_code = $${pIdx}`);
        params.push(data.taxCode.trim() || null);
        pIdx++;
      }
      if (data.phone !== undefined) {
        updates.push(`phone = $${pIdx}`);
        params.push(data.phone.trim() || null);
        pIdx++;
      }
      if (data.address !== undefined) {
        updates.push(`address = $${pIdx}`);
        params.push(data.address.trim() || null);
        pIdx++;
      }
      if (data.isActive !== undefined) {
        updates.push(`is_active = $${pIdx}`);
        params.push(data.isActive);
        pIdx++;
      }

      await client.query(
        `UPDATE erp.partners SET ${updates.join(", ")} WHERE organization_id = $2 AND id = $3 AND is_supplier = true`,
        params
      );

      // Cập nhật terms nếu có
      if (data.creditLimit !== undefined || data.paymentDays !== undefined) {
        await client.query(
          `INSERT INTO erp.partner_terms(
             organization_id, partner_id, side, credit_limit, payment_days, currency, created_by, updated_by
           )
           VALUES($1, $2, 'payable', $3, $4, 'VND', $5, $5)
           ON CONFLICT (organization_id, partner_id, side, currency)
           DO UPDATE SET
             credit_limit = COALESCE($3, erp.partner_terms.credit_limit),
             payment_days = COALESCE($4, erp.partner_terms.payment_days),
             updated_by = $5, updated_at = now()`,
          [orgId, supplierId, data.creditLimit ?? 0, data.paymentDays ?? 0, userId]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Xóa hoặc vô hiệu hóa nhà cung cấp
   */
  static async deleteSupplier(supplierId: string, userId: string): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const poRes = await pool.query(
      "SELECT 1 FROM erp.purchase_orders WHERE organization_id = $1 AND supplier_id = $2 LIMIT 1",
      [orgId, supplierId]
    );
    const debtRes = await pool.query(
      "SELECT 1 FROM erp.open_items WHERE organization_id = $1 AND partner_id = $2 LIMIT 1",
      [orgId, supplierId]
    );

    if (poRes.rows.length > 0 || debtRes.rows.length > 0) {
      await pool.query(
        "UPDATE erp.partners SET is_active = false, updated_by = $1, updated_at = now() WHERE organization_id = $2 AND id = $3",
        [userId, orgId, supplierId]
      );
    } else {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM erp.partner_terms WHERE organization_id = $1 AND partner_id = $2", [orgId, supplierId]);
        await client.query("DELETE FROM erp.partner_contacts WHERE organization_id = $1 AND partner_id = $2", [orgId, supplierId]);
        await client.query("DELETE FROM erp.partners WHERE organization_id = $1 AND id = $2", [orgId, supplierId]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
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
      status?: string;
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

      // BUG-05: Hỗ trợ lifecycle status chuẩn, mặc định 'submitted' thay vì ép cứng 'approved'
      const poStatus = data.status || "submitted";
      const poRes = await client.query(
        `INSERT INTO erp.purchase_orders (
           organization_id, code, status, currency, total, expected_date,
           supplier_id, project_id, requested_by, invoice_image, created_by, updated_by
         )
         VALUES ($1, $2, $3, 'VND', $4, $5, $6, $7, $8, $9, $10, $10)
         RETURNING id`,
        [
          orgId,
          code,
          poStatus,
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

      // TỐI ƯU HÓA: Truy vấn trước thông tin vật tư (unitId, tên vật tư) để fallback an toàn
      const allItemIds = [...new Set(data.lines.map((l) => l.itemId).filter(Boolean))];
      const itemMetaMap = new Map<string, { unitId?: string; name?: string }>();
      if (allItemIds.length > 0) {
        const itemRes = await client.query(
          "SELECT id, name, base_unit_id FROM erp.items WHERE id = ANY($1::uuid[])",
          [allItemIds]
        );
        for (const r of itemRes.rows) {
          itemMetaMap.set(r.id, { unitId: r.base_unit_id, name: r.name });
        }
      }

      let fallbackUnitId: string | null = null;
      const needsFallback = data.lines.some((l) => !l.unitId && !itemMetaMap.get(l.itemId)?.unitId);
      if (needsFallback) {
        const fallbackUnit = await client.query("SELECT id FROM erp.units LIMIT 1");
        fallbackUnitId = fallbackUnit.rows[0]?.id || null;
      }

      let lineNo = 1;
      for (const line of data.lines) {
        const unitId = line.unitId || itemMetaMap.get(line.itemId)?.unitId || fallbackUnitId;
        const lineDesc = line.description || (line as any).notes || itemMetaMap.get(line.itemId)?.name || "Vật tư mua ngoài";

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
            lineDesc,
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

      // DOC-02: Chống tự phê duyệt (Không áp dụng với Super Admin có toàn quyền hệ thống)
      const poApproveCap = userCapabilities["purchase_order.approve"];
      const isSuperAdmin = poApproveCap?.fromRole === "SUPER_ADMIN" || userCapabilities["*"]?.isEnabled;
      if (po.created_by === userId && !isSuperAdmin) {
        throw new Error("Người lập đơn không được tự phê duyệt đơn mua hàng của chính mình (Separation of Duties)!");
      }

      const total = Number(po.total);

      // Kiểm tra quyền và hạn mức duyệt
      if (!poApproveCap?.isEnabled && !isSuperAdmin) {
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

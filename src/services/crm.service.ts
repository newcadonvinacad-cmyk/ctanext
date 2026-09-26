/**
 * DỊCH VỤ KINH DOANH, KHÁCH HÀNG & BÁO GIÁ DỰ TOÁN (CRM SERVICE)
 * Triển khai theo quy chuẩn M02, M03, M04 trong docs/DANH_SACH_MAN_HINH_HE_THONG.md
 * và ma trận phân quyền docs/MA_TRAN_PHAN_QUYEN_DONG.md
 */

import { getDbPool } from "./authorization.service";
import { getNextDocumentCode } from "@/lib/sequences";

export interface CustomerDto {
  id: string;
  code: string;
  name: string;
  taxCode: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  creditLimit: number;
  paymentDays: number;
  totalReceivable: number;
  overdueAmount: number;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactPosition: string | null;
  createdAt: string;
}

export interface QuotationDto {
  id: string;
  code: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "completed";
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string | null;
  revisionNo: number;
  validUntil: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  estimatedCost: number;
  grossMarginPct: number;
  terms: {
    warranty?: string;
    paymentTerms?: string;
    advance?: string;
  };
  totalLines: number;
  createdAt: string;
  createdByName: string;
}

export interface QuotationLineDto {
  id: string;
  lineNo: number;
  description: string;
  qty: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  lineTotal: number;
  unitId: string;
  unitCode: string;
  unitName: string;
  components: Array<{
    id: string;
    kind: "material" | "labor" | "transport" | "other";
    qty: number;
    unitCost: number;
    wasteRate: number;
    totalCost: number;
    unitName: string;
  }>;
}

export interface SalesOrderDto {
  id: string;
  code: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "completed";
  currency: string;
  total: number;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string | null;
  quotationRevisionId: string | null;
  quotationCode?: string | null;
  totalLines: number;
  lines?: Array<{
    id?: string;
    description: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    unitName?: string;
  }>;
  createdAt: string;
  createdByName: string;
}

export class CrmService {
  /**
   * Lấy organization ID mặc định
   */
  static async getOrganizationId(client?: any): Promise<string> {
    const db = client || (await getDbPool().connect());
    const shouldRelease = !client;
    try {
      const res = await db.query("SELECT id FROM erp.organizations WHERE code = 'SIGNAGE' LIMIT 1");
      if (res.rows.length === 0) throw new Error("Chưa có Organization 'SIGNAGE'");
      return res.rows[0].id;
    } finally {
      if (shouldRelease) db.release();
    }
  }

  // ==========================================
  // 1. QUẢN LÝ KHÁCH HÀNG & CÔNG NỢ (M02)
  // ==========================================

  /**
   * Danh sách khách hàng kèm số dư công nợ
   */
  static async listCustomers(filters: { keyword?: string } = {}): Promise<CustomerDto[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const conditions: string[] = ["p.organization_id = $1", "p.is_customer = true"];
      const params: any[] = [orgId];
      let pIdx = 2;

      if (filters.keyword && filters.keyword.trim()) {
        conditions.push(`(p.code ILIKE $${pIdx} OR p.name ILIKE $${pIdx} OR p.phone ILIKE $${pIdx} OR p.tax_code ILIKE $${pIdx})`);
        params.push(`%${filters.keyword.trim()}%`);
        pIdx++;
      }

      const query = `
        SELECT 
          p.id, p.code, p.name, p.tax_code, p.phone, p.address, p.is_active, p.created_at,
          COALESCE(pt.credit_limit, 0) as credit_limit,
          COALESCE(pt.payment_days, 0) as payment_days,
          pc.name as contact_name, pc.phone as contact_phone, pc.email as contact_email, pc.position as contact_position,
          COALESCE(debts.total_receivable, 0) as total_receivable,
          COALESCE(debts.overdue_amount, 0) as overdue_amount
        FROM erp.partners p
        LEFT JOIN erp.partner_terms pt ON pt.partner_id = p.id AND pt.side = 'receivable'
        LEFT JOIN LATERAL (
          SELECT name, phone, email, position 
          FROM erp.partner_contacts 
          WHERE partner_id = p.id 
          ORDER BY created_at ASC LIMIT 1
        ) pc ON true
        LEFT JOIN (
          SELECT 
            partner_id,
            SUM(original_amount) as total_receivable,
            SUM(CASE WHEN due_date < CURRENT_DATE THEN original_amount ELSE 0 END) as overdue_amount
          FROM erp.open_items
          WHERE organization_id = $1 AND side = 'receivable' AND status = 'confirmed'
          GROUP BY partner_id
        ) debts ON debts.partner_id = p.id
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.code ASC
      `;

      const res = await client.query(query, params);

      return res.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        taxCode: r.tax_code,
        phone: r.phone,
        address: r.address,
        isActive: r.is_active,
        creditLimit: parseFloat(r.credit_limit),
        paymentDays: parseInt(r.payment_days, 10),
        totalReceivable: parseFloat(r.total_receivable),
        overdueAmount: parseFloat(r.overdue_amount),
        contactName: r.contact_name,
        contactPhone: r.contact_phone,
        contactEmail: r.contact_email,
        contactPosition: r.contact_position,
        createdAt: r.created_at,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Chi tiết hồ sơ 360° khách hàng
   */
  static async getCustomerDetail(customerId: string): Promise<{
    customer: CustomerDto;
    quotations: Array<{ id: string; code: string; status: string; total: number; createdAt: string }>;
    orders: Array<{ id: string; code: string; status: string; total: number; createdAt: string }>;
    openItems: Array<{ id: string; amount: number; dueDate: string; status: string; orderCode: string | null }>;
  }> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const custRes = await client.query(
        `SELECT 
           p.id, p.code, p.name, p.tax_code, p.phone, p.address, p.is_active, p.created_at,
           COALESCE(pt.credit_limit, 0) as credit_limit,
           COALESCE(pt.payment_days, 0) as payment_days,
           pc.name as contact_name, pc.phone as contact_phone, pc.email as contact_email, pc.position as contact_position,
           COALESCE(debts.total_receivable, 0) as total_receivable,
           COALESCE(debts.overdue_amount, 0) as overdue_amount
         FROM erp.partners p
         LEFT JOIN erp.partner_terms pt ON pt.partner_id = p.id AND pt.side = 'receivable'
         LEFT JOIN LATERAL (
           SELECT name, phone, email, position 
           FROM erp.partner_contacts 
           WHERE partner_id = p.id 
           ORDER BY created_at ASC LIMIT 1
         ) pc ON true
         LEFT JOIN (
           SELECT 
             partner_id,
             SUM(original_amount) as total_receivable,
             SUM(CASE WHEN due_date < CURRENT_DATE THEN original_amount ELSE 0 END) as overdue_amount
           FROM erp.open_items
           WHERE organization_id = $1 AND side = 'receivable' AND status = 'confirmed'
           GROUP BY partner_id
         ) debts ON debts.partner_id = p.id
         WHERE p.organization_id = $1 AND p.id = $2`,
        [orgId, customerId]
      );

      if (custRes.rows.length === 0) {
        throw new Error("Không tìm thấy khách hàng!");
      }
      const r = custRes.rows[0];

      // Lấy danh sách báo giá của khách
      const qRes = await client.query(
        `SELECT q.id, q.code, q.status, q.created_at, COALESCE(qr.total, 0) as total
         FROM erp.quotations q
         LEFT JOIN LATERAL (
           SELECT total FROM erp.quotation_revisions 
           WHERE quotation_id = q.id 
           ORDER BY revision_no DESC LIMIT 1
         ) qr ON true
         WHERE q.organization_id = $1 AND q.customer_id = $2
         ORDER BY q.created_at DESC LIMIT 10`,
        [orgId, customerId]
      );

      // Lấy danh sách đơn bán hàng của khách
      const soRes = await client.query(
        `SELECT id, code, status, total, created_at 
         FROM erp.sales_orders 
         WHERE organization_id = $1 AND customer_id = $2 
         ORDER BY created_at DESC LIMIT 10`,
        [orgId, customerId]
      );

      // Lấy danh sách các khoản nợ (open_items)
      const debtRes = await client.query(
        `SELECT oi.id, oi.original_amount as amount, oi.due_date, oi.status, so.code as order_code
         FROM erp.open_items oi
         LEFT JOIN erp.sales_orders so ON so.id = oi.sales_order_id
         WHERE oi.organization_id = $1 AND oi.partner_id = $2
         ORDER BY oi.due_date ASC`,
        [orgId, customerId]
      );

      return {
        customer: {
          id: r.id,
          code: r.code,
          name: r.name,
          taxCode: r.tax_code,
          phone: r.phone,
          address: r.address,
          isActive: r.is_active,
          creditLimit: parseFloat(r.credit_limit),
          paymentDays: parseInt(r.payment_days, 10),
          totalReceivable: parseFloat(r.total_receivable),
          overdueAmount: parseFloat(r.overdue_amount),
          contactName: r.contact_name,
          contactPhone: r.contact_phone,
          contactEmail: r.contact_email,
          contactPosition: r.contact_position,
          createdAt: r.created_at,
        },
        quotations: qRes.rows.map((q) => ({
          id: q.id,
          code: q.code,
          status: q.status,
          total: parseFloat(q.total),
          createdAt: q.created_at,
        })),
        orders: soRes.rows.map((o) => ({
          id: o.id,
          code: o.code,
          status: o.status,
          total: parseFloat(o.total),
          createdAt: o.created_at,
        })),
        openItems: debtRes.rows.map((d) => ({
          id: d.id,
          amount: parseFloat(d.amount),
          dueDate: d.due_date,
          status: d.status,
          orderCode: d.order_code,
        })),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Tạo khách hàng mới
   */
  static async createCustomer(
    data: {
      code: string;
      name: string;
      taxCode?: string;
      phone?: string;
      address?: string;
      creditLimit?: number;
      paymentDays?: number;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      contactPosition?: string;
    },
    userId: string
  ): Promise<string> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      // Lấy membership
      const memRes = await client.query("SELECT id FROM erp.memberships WHERE organization_id = $1 LIMIT 1", [orgId]);
      const ownerMembershipId = memRes.rows[0].id;

      // 1. Insert erp.partners
      const pRes = await client.query(
        `INSERT INTO erp.partners(
           organization_id, code, name, tax_code, phone, address,
           is_customer, is_supplier, is_active, owner_membership_id, created_by, updated_by
         )
         VALUES($1, $2, $3, $4, $5, $6, true, false, true, $7, $8, $8)
         RETURNING id`,
        [
          orgId,
          data.code.trim().toUpperCase(),
          data.name.trim(),
          data.taxCode?.trim() || null,
          data.phone?.trim() || null,
          data.address?.trim() || null,
          ownerMembershipId,
          userId,
        ]
      );
      const partnerId = pRes.rows[0].id;

      // 2. Insert erp.partner_terms
      await client.query(
        `INSERT INTO erp.partner_terms(
           organization_id, partner_id, side, credit_limit, payment_days, currency, created_by, updated_by
         )
         VALUES($1, $2, 'receivable', $3, $4, 'VND', $5, $5)`,
        [orgId, partnerId, data.creditLimit || 0, data.paymentDays || 0, userId]
      );

      // 3. Insert contact
      if (data.contactName) {
        await client.query(
          `INSERT INTO erp.partner_contacts(
             organization_id, partner_id, name, phone, email, position, created_by, updated_by
           )
           VALUES($1, $2, $3, $4, $5, $6, $7, $7)`,
          [
            orgId,
            partnerId,
            data.contactName.trim(),
            data.contactPhone?.trim() || null,
            data.contactEmail?.trim() || null,
            data.contactPosition?.trim() || null,
            userId,
          ]
        );
      }

      await client.query("COMMIT");
      return partnerId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cập nhật thông tin khách hàng
   */
  static async updateCustomer(
    customerId: string,
    data: {
      name?: string;
      taxCode?: string;
      phone?: string;
      address?: string;
      creditLimit?: number;
      paymentDays?: number;
      isActive?: boolean;
    },
    userId: string
  ): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      const updates: string[] = ["updated_by = $1", "updated_at = now()"];
      const params: any[] = [userId, orgId, customerId];
      let pIdx = 4;

      if (data.name !== undefined) {
        updates.push(`name = $${pIdx}`);
        params.push(data.name.trim());
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
        `UPDATE erp.partners SET ${updates.join(", ")} WHERE organization_id = $2 AND id = $3`,
        params
      );

      // Cập nhật terms
      if (data.creditLimit !== undefined || data.paymentDays !== undefined) {
        await client.query(
          `INSERT INTO erp.partner_terms(
             organization_id, partner_id, side, credit_limit, payment_days, currency, created_by, updated_by
           )
           VALUES($1, $2, 'receivable', $3, $4, 'VND', $5, $5)
           ON CONFLICT (organization_id, partner_id, side, currency)
           DO UPDATE SET 
             credit_limit = COALESCE($3, erp.partner_terms.credit_limit),
             payment_days = COALESCE($4, erp.partner_terms.payment_days),
             updated_by = $5, updated_at = now()`,
          [orgId, customerId, data.creditLimit ?? 0, data.paymentDays ?? 0, userId]
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

  // ==========================================
  // 2. BÁO GIÁ DỰ TOÁN & BÓC TÁCH KỸ THUẬT (M03)
  // ==========================================

  /**
   * Danh sách báo giá dự toán
   */
  static async listQuotations(filters: { status?: string; customerId?: string; keyword?: string } = {}): Promise<QuotationDto[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const conditions: string[] = ["q.organization_id = $1"];
      const params: any[] = [orgId];
      let pIdx = 2;

      if (filters.status && filters.status !== "all") {
        conditions.push(`q.status = $${pIdx}`);
        params.push(filters.status);
        pIdx++;
      }

      if (filters.customerId) {
        conditions.push(`q.customer_id = $${pIdx}`);
        params.push(filters.customerId);
        pIdx++;
      }

      if (filters.keyword && filters.keyword.trim()) {
        conditions.push(`(q.code ILIKE $${pIdx} OR p.name ILIKE $${pIdx} OR p.code ILIKE $${pIdx})`);
        params.push(`%${filters.keyword.trim()}%`);
        pIdx++;
      }

      const query = `
        SELECT 
          q.id, q.code, q.status, q.created_at,
          p.id as customer_id, p.code as customer_code, p.name as customer_name, p.phone as customer_phone,
          qr.id as revision_id, qr.revision_no, qr.valid_until, qr.currency,
          qr.subtotal, qr.discount_amount, qr.tax_amount, qr.total, qr.terms_snapshot,
          u.name as created_by_name,
          COALESCE(est.total_est_cost, 0) as total_est_cost,
          COALESCE(lines.total_lines, 0) as total_lines
        FROM erp.quotations q
        JOIN erp.partners p ON p.id = q.customer_id
        LEFT JOIN public."user" u ON u.id = q.created_by
        LEFT JOIN LATERAL (
          SELECT * FROM erp.quotation_revisions 
          WHERE quotation_id = q.id 
          ORDER BY revision_no DESC LIMIT 1
        ) qr ON true
        LEFT JOIN LATERAL (
          SELECT 
            COUNT(ql.id) as total_lines,
            SUM(ec.comp_cost) as total_est_cost
          FROM erp.quotation_lines ql
          LEFT JOIN (
            SELECT quotation_line_id, SUM(qty * unit_cost * (1 + waste_rate)) as comp_cost
            FROM erp.estimate_components
            GROUP BY quotation_line_id
          ) ec ON ec.quotation_line_id = ql.id
          WHERE ql.revision_id = qr.id
        ) est ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) as total_lines FROM erp.quotation_lines WHERE revision_id = qr.id
        ) lines ON true
        WHERE ${conditions.join(" AND ")}
        ORDER BY q.created_at DESC
      `;

      const res = await client.query(query, params);

      return res.rows.map((r) => {
        const total = parseFloat(r.total || "0");
        const cost = parseFloat(r.total_est_cost || "0");
        const margin = total > 0 ? Math.round(((total - cost) / total) * 100) : 0;

        return {
          id: r.id,
          code: r.code,
          status: r.status,
          customerId: r.customer_id,
          customerCode: r.customer_code,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          revisionNo: r.revision_no || 1,
          validUntil: r.valid_until || "",
          currency: r.currency || "VND",
          subtotal: parseFloat(r.subtotal || "0"),
          discountAmount: parseFloat(r.discount_amount || "0"),
          taxAmount: parseFloat(r.tax_amount || "0"),
          total,
          estimatedCost: cost,
          grossMarginPct: margin,
          terms: r.terms_snapshot || {},
          totalLines: parseInt(r.total_lines || "0", 10),
          createdAt: r.created_at,
          createdByName: r.created_by_name || "Hệ thống",
        };
      });
    } finally {
      client.release();
    }
  }

  /**
   * Chi tiết báo giá dự toán kèm bóc tách linh kiện
   */
  static async getQuotationDetail(quotationId: string): Promise<{
    quotation: QuotationDto;
    lines: QuotationLineDto[];
  }> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const qList = await this.listQuotations({ keyword: quotationId });
      let q = qList.find((item) => item.id === quotationId);

      if (!q) {
        // Query trực tiếp theo ID
        const res = await client.query(
          `SELECT q.code FROM erp.quotations q WHERE q.organization_id = $1 AND q.id = $2`,
          [orgId, quotationId]
        );
        if (res.rows.length === 0) throw new Error("Không tìm thấy báo giá!");
        const directList = await this.listQuotations({ keyword: res.rows[0].code });
        q = directList[0];
      }

      // Lấy revision hiện tại
      const revRes = await client.query(
        `SELECT id FROM erp.quotation_revisions WHERE organization_id = $1 AND quotation_id = $2 ORDER BY revision_no DESC LIMIT 1`,
        [orgId, quotationId]
      );
      if (revRes.rows.length === 0) throw new Error("Chưa có bản sửa đổi báo giá nào!");
      const revisionId = revRes.rows[0].id;

      // Lấy danh sách dòng báo giá
      const linesRes = await client.query(
        `SELECT 
           ql.id, ql.line_no, ql.description, ql.qty, ql.unit_price, 
           ql.discount_amount, ql.tax_rate, ql.line_total, ql.unit_id,
           u.code as unit_code, u.name as unit_name
         FROM erp.quotation_lines ql
         JOIN erp.units u ON u.id = ql.unit_id
         WHERE ql.organization_id = $1 AND ql.revision_id = $2
         ORDER BY ql.line_no ASC`,
        [orgId, revisionId]
      );

      // Lấy các components bóc tách kỹ thuật cho từng dòng
      const compRes = await client.query(
        `SELECT 
           c.id, c.quotation_line_id, c.kind, c.qty, c.unit_cost, c.waste_rate,
           u.name as unit_name
         FROM erp.estimate_components c
         JOIN erp.units u ON u.id = c.unit_id
         WHERE c.organization_id = $1 AND c.quotation_line_id = ANY($2::uuid[])`,
        [orgId, linesRes.rows.map((l) => l.id)]
      );

      const compMap: Record<string, any[]> = {};
      for (const comp of compRes.rows) {
        if (!compMap[comp.quotation_line_id]) compMap[comp.quotation_line_id] = [];
        const qty = parseFloat(comp.qty);
        const cost = parseFloat(comp.unit_cost);
        const waste = parseFloat(comp.waste_rate);
        compMap[comp.quotation_line_id].push({
          id: comp.id,
          kind: comp.kind,
          qty,
          unitCost: cost,
          wasteRate: waste,
          totalCost: qty * cost * (1 + waste),
          unitName: comp.unit_name,
        });
      }

      const lines: QuotationLineDto[] = linesRes.rows.map((lr) => ({
        id: lr.id,
        lineNo: lr.line_no,
        description: lr.description,
        qty: parseFloat(lr.qty),
        unitPrice: parseFloat(lr.unit_price),
        discountAmount: parseFloat(lr.discount_amount),
        taxRate: parseFloat(lr.tax_rate),
        lineTotal: parseFloat(lr.line_total),
        unitId: lr.unit_id,
        unitCode: lr.unit_code,
        unitName: lr.unit_name,
        components: compMap[lr.id] || [],
      }));

      return { quotation: q, lines };
    } finally {
      client.release();
    }
  }

  /**
   * Tạo báo giá dự toán bóc tách kỹ thuật mới
   */
  static async createQuotation(
    data: {
      customerId: string;
      validDays?: number;
      discountAmount?: number;
      taxRate?: number;
      terms?: { warranty?: string; paymentTerms?: string };
      lines: Array<{
        description: string;
        qty: number;
        unitPrice: number;
        unitId: string;
        components?: Array<{
          kind: "material" | "labor" | "transport" | "other";
          qty: number;
          unitCost: number;
          wasteRate?: number;
          unitId: string;
        }>;
      }>;
    },
    userId: string
  ): Promise<string> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      if (!data.lines || data.lines.length === 0) {
        throw new Error("Báo giá phải có ít nhất 1 hạng mục!");
      }

      // Lấy owner membership
      const memRes = await client.query("SELECT id FROM erp.memberships WHERE organization_id = $1 LIMIT 1", [orgId]);
      const ownerMembershipId = memRes.rows[0].id;

      // DOC-01: Cấp mã báo giá tuần tự nguyên tử chống trùng lặp đa luồng
      const code = await getNextDocumentCode(client, orgId, "quotation", "BG");

      // 1. Tạo erp.quotations
      const qRes = await client.query(
        `INSERT INTO erp.quotations(
           organization_id, code, status, customer_id, owner_membership_id, created_by, updated_by
         )
         VALUES($1, $2, 'draft', $3, $4, $5, $5)
         RETURNING id`,
        [orgId, code, data.customerId, ownerMembershipId, userId]
      );
      const qId = qRes.rows[0].id;

      // Tính subtotal
      let subtotal = 0;
      for (const line of data.lines) {
        subtotal += line.qty * line.unitPrice;
      }
      const discount = data.discountAmount || 0;
      const taxRate = data.taxRate ?? 0.1; // VAT 10%
      const taxable = Math.max(0, subtotal - discount);
      const tax = Math.round(taxable * taxRate);
      const total = taxable + tax;

      // 2. Tạo revision 1 (CHECK: total = subtotal - discount + tax)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (data.validDays || 30));

      const revRes = await client.query(
        `INSERT INTO erp.quotation_revisions(
           organization_id, quotation_id, revision_no, valid_until, currency,
           subtotal, discount_amount, tax_amount, total, terms_snapshot, created_by, updated_by
         )
         VALUES($1, $2, 1, $3, 'VND', $4, $5, $6, $7, $8, $9, $9)
         RETURNING id`,
        [
          orgId,
          qId,
          validUntil.toISOString().split("T")[0],
          subtotal,
          discount,
          tax,
          total,
          JSON.stringify(data.terms || {}),
          userId,
        ]
      );
      const revId = revRes.rows[0].id;

      // 3. Tạo các dòng quotation_lines & estimate_components
      let lineNo = 1;
      for (const line of data.lines) {
        const lineTotal = line.qty * line.unitPrice;
        const lineRes = await client.query(
          `INSERT INTO erp.quotation_lines(
             organization_id, revision_id, line_no, description, qty, unit_price,
             discount_amount, tax_rate, line_total, unit_id, created_by, updated_by
           )
           VALUES($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10, $10)
           RETURNING id`,
          [orgId, revId, lineNo++, line.description.trim(), line.qty, line.unitPrice, taxRate, lineTotal, line.unitId, userId]
        );
        const lineId = lineRes.rows[0].id;

        // Bóc tách dự toán (components) nếu có
        if (line.components && line.components.length > 0) {
          for (const comp of line.components) {
            await client.query(
              `INSERT INTO erp.estimate_components(
                 organization_id, quotation_line_id, kind, qty, unit_cost, waste_rate, unit_id, created_by, updated_by
               )
               VALUES($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
              [orgId, lineId, comp.kind, comp.qty, comp.unitCost, comp.wasteRate || 0, comp.unitId, userId]
            );
          }
        }
      }

      await client.query("COMMIT");
      return qId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cập nhật trạng thái báo giá (Gửi duyệt, Duyệt, Từ chối)
   */
  static async updateQuotationStatus(
    quotationId: string,
    status: "draft" | "submitted" | "approved" | "rejected" | "cancelled",
    userId: string
  ): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      const qRes = await client.query(
        `SELECT id, status FROM erp.quotations WHERE organization_id = $1 AND id = $2 FOR UPDATE`,
        [orgId, quotationId]
      );
      if (qRes.rows.length === 0) throw new Error("Không tìm thấy báo giá!");

      // Nếu duyệt thì cập nhật accepted_revision_id
      let acceptedRevId = null;
      if (status === "approved") {
        const revRes = await client.query(
          `SELECT id FROM erp.quotation_revisions WHERE organization_id = $1 AND quotation_id = $2 ORDER BY revision_no DESC LIMIT 1`,
          [orgId, quotationId]
        );
        acceptedRevId = revRes.rows[0].id;
      }

      await client.query(
        `UPDATE erp.quotations 
         SET status = $1, 
             accepted_revision_id = COALESCE($2, accepted_revision_id),
             updated_by = $3, 
             updated_at = now()
         WHERE id = $4`,
        [status, acceptedRevId, userId, quotationId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Chuyển báo giá đã duyệt thành Đơn Bán Hàng (Sales Order)
   */
  static async convertQuotationToSalesOrder(quotationId: string, userId: string): Promise<string> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      // Kiểm tra báo giá
      const qRes = await client.query(
        `SELECT q.id, q.code, q.status, q.customer_id, q.owner_membership_id, qr.id as rev_id, qr.total
         FROM erp.quotations q
         JOIN erp.quotation_revisions qr ON qr.quotation_id = q.id
         WHERE q.organization_id = $1 AND q.id = $2
         ORDER BY qr.revision_no DESC LIMIT 1
         FOR UPDATE`,
        [orgId, quotationId]
      );
      if (qRes.rows.length === 0) throw new Error("Không tìm thấy báo giá!");
      const q = qRes.rows[0];

      if (q.status !== "approved") {
        throw new Error("Chỉ báo giá ở trạng thái 'Đã duyệt' mới có thể chuyển thành Đơn bán hàng!");
      }

      // DOC-01: Cấp mã đơn bán hàng tuần tự nguyên tử chống trùng lặp đa luồng
      const soCode = await getNextDocumentCode(client, orgId, "sales_order", "SO");

      // 1. Tạo sales_orders
      const soRes = await client.query(
        `INSERT INTO erp.sales_orders(
           organization_id, code, status, currency, total, customer_id, 
           quotation_revision_id, owner_membership_id, created_by, updated_by
         )
         VALUES($1, $2, 'approved', 'VND', $3, $4, $5, $6, $7, $7)
         RETURNING id`,
        [orgId, soCode, q.total, q.customer_id, q.rev_id, q.owner_membership_id, userId]
      );
      const soId = soRes.rows[0].id;

      // 2. Chuyển các dòng quotation_lines sang sales_order_lines
      const qLinesRes = await client.query(
        `SELECT line_no, description, qty, unit_price, discount_amount, tax_rate, line_total, unit_id, item_id
         FROM erp.quotation_lines 
         WHERE organization_id = $1 AND revision_id = $2`,
        [orgId, q.rev_id]
      );

      // Lấy 1 default item nếu line chưa gắn item_id (yêu cầu NOT NULL item_id của sales_order_lines)
      const defaultItemRes = await client.query("SELECT id FROM erp.items WHERE organization_id = $1 LIMIT 1", [orgId]);
      const fallbackItemId = defaultItemRes.rows[0]?.id;

      for (const line of qLinesRes.rows) {
        await client.query(
          `INSERT INTO erp.sales_order_lines(
             organization_id, sales_order_id, line_no, description, qty, unit_price,
             discount_amount, tax_rate, line_total, factor_snapshot, item_id, unit_id, created_by, updated_by
           )
           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $11, $12, $12)`,
          [
            orgId,
            soId,
            line.line_no,
            line.description,
            line.qty,
            line.unit_price,
            line.discount_amount,
            line.tax_rate,
            line.line_total,
            line.item_id || fallbackItemId,
            line.unit_id,
            userId,
          ]
        );
      }

      // 3. Ghi nhận công nợ phải thu ban đầu (erp.open_items)
      await client.query(
        `INSERT INTO erp.open_items(
           organization_id, side, currency, original_amount, due_date, status, source_sequence, partner_id, sales_order_id, created_by, updated_by
         )
         VALUES($1, 'receivable', 'VND', $2, CURRENT_DATE + interval '30 days', 'confirmed', 1, $3, $4, $5, $5)`,
        [orgId, q.total, q.customer_id, soId, userId]
      );

      // 4. Cập nhật trạng thái báo giá thành 'completed'
      await client.query(
        `UPDATE erp.quotations SET status = 'completed', updated_by = $1, updated_at = now() WHERE id = $2`,
        [userId, quotationId]
      );

      await client.query("COMMIT");
      return soId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 3. BÁN HÀNG THƯƠNG MẠI & TẠI QUẦY (M04)
  // ==========================================

  /**
   * Danh sách đơn bán hàng
   */
  static async listSalesOrders(filters: { status?: string; keyword?: string } = {}): Promise<SalesOrderDto[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const conditions: string[] = ["so.organization_id = $1"];
      const params: any[] = [orgId];
      let pIdx = 2;

      if (filters.status && filters.status !== "all") {
        conditions.push(`so.status = $${pIdx}`);
        params.push(filters.status);
        pIdx++;
      }

      if (filters.keyword && filters.keyword.trim()) {
        conditions.push(`(so.code ILIKE $${pIdx} OR p.name ILIKE $${pIdx} OR p.code ILIKE $${pIdx})`);
        params.push(`%${filters.keyword.trim()}%`);
        pIdx++;
      }

      const query = `
        SELECT 
          so.id, so.code, so.status, so.currency, so.total, so.created_at,
          p.id as customer_id, p.code as customer_code, p.name as customer_name, p.phone as customer_phone,
          so.quotation_revision_id, q.code as quotation_code,
          u.name as created_by_name,
          COALESCE(COUNT(sol.id), 0) as total_lines
        FROM erp.sales_orders so
        JOIN erp.partners p ON p.id = so.customer_id
        LEFT JOIN public."user" u ON u.id = so.created_by
        LEFT JOIN erp.quotation_revisions qr ON qr.id = so.quotation_revision_id
        LEFT JOIN erp.quotations q ON q.id = qr.quotation_id
        LEFT JOIN erp.sales_order_lines sol ON sol.sales_order_id = so.id
        WHERE ${conditions.join(" AND ")}
        GROUP BY 
          so.id, so.code, so.status, so.currency, so.total, so.created_at,
          p.id, p.code, p.name, p.phone,
          so.quotation_revision_id, q.code, u.name
        ORDER BY so.created_at DESC
      `;

      const res = await client.query(query, params);

      return res.rows.map((r) => ({
        id: r.id,
        code: r.code,
        status: r.status,
        currency: r.currency,
        total: parseFloat(r.total),
        customerId: r.customer_id,
        customerCode: r.customer_code,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        quotationRevisionId: r.quotation_revision_id,
        quotationCode: r.quotation_code,
        totalLines: parseInt(r.total_lines, 10),
        createdAt: r.created_at,
        createdByName: r.created_by_name || "Hệ thống",
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Tạo đơn bán hàng thương mại tại quầy
   */
  static async createSalesOrder(
    data: {
      customerId: string;
      lines: Array<{
        itemId: string;
        unitId: string;
        description: string;
        qty: number;
        unitPrice: number;
        discountAmount?: number;
      }>;
      recordReceivable?: boolean;
      paymentDays?: number;
    },
    userId: string
  ): Promise<string> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      if (!data.lines || data.lines.length === 0) {
        throw new Error("Đơn bán hàng phải có ít nhất 1 dòng mặt hàng!");
      }

      const memRes = await client.query("SELECT id FROM erp.memberships WHERE organization_id = $1 LIMIT 1", [orgId]);
      const ownerMembershipId = memRes.rows[0].id;

      // DOC-01: Cấp mã đơn bán hàng tuần tự nguyên tử chống trùng lặp đa luồng
      const soCode = await getNextDocumentCode(client, orgId, "sales_order", "SO");

      // Tính tổng tiền đơn
      let total = 0;
      for (const line of data.lines) {
        const lineTotal = line.qty * line.unitPrice - (line.discountAmount || 0);
        total += Math.max(0, lineTotal);
      }

      // FIN-04: Đơn bán mới khởi tạo ở trạng thái 'submitted' (đang xử lý), không tự đánh dấu 'completed'
      const soRes = await client.query(
        `INSERT INTO erp.sales_orders(
           organization_id, code, status, currency, total, customer_id, owner_membership_id, created_by, updated_by
         )
         VALUES($1, $2, 'submitted', 'VND', $3, $4, $5, $6, $6)
         RETURNING id`,
        [orgId, soCode, total, data.customerId, ownerMembershipId, userId]
      );
      const soId = soRes.rows[0].id;

      // 2. Tạo sales_order_lines
      let lineNo = 1;
      for (const line of data.lines) {
        const lineTotal = line.qty * line.unitPrice - (line.discountAmount || 0);
        await client.query(
          `INSERT INTO erp.sales_order_lines(
             organization_id, sales_order_id, line_no, description, qty, unit_price,
             discount_amount, tax_rate, line_total, factor_snapshot, item_id, unit_id, created_by, updated_by
           )
           VALUES($1, $2, $3, $4, $5, $6, $7, 0, $8, 1, $9, $10, $11, $11)`,
          [
            orgId,
            soId,
            lineNo++,
            line.description.trim(),
            line.qty,
            line.unitPrice,
            line.discountAmount || 0,
            lineTotal,
            line.itemId,
            line.unitId,
            userId,
          ]
        );
      }

      // 3. Nếu ghi nợ: ghi nhận vào open_items
      if (data.recordReceivable) {
        const days = data.paymentDays || 15;
        await client.query(
          `INSERT INTO erp.open_items(
             organization_id, side, currency, original_amount, due_date, status, source_sequence, partner_id, sales_order_id, created_by, updated_by
           )
           VALUES($1, 'receivable', 'VND', $2, CURRENT_DATE + ($3 || ' days')::interval, 'confirmed', 1, $4, $5, $6, $6)`,
          [orgId, total, days, data.customerId, soId, userId]
        );
      }

      await client.query("COMMIT");
      return soId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

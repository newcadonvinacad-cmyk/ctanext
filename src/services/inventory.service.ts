/**
 * DỊCH VỤ QUẢN TRỊ VẬT TƯ, QUY CÁCH & ĐA KHO (INVENTORY SERVICE)
 * Triển khai theo quy chuẩn M07, M08, M09 trong docs/DANH_SACH_MAN_HINH_HE_THONG.md
 * và ma trận phân quyền docs/MA_TRAN_PHAN_QUYEN_DONG.md
 */

import { getDbPool, getCachedOrgId } from "@/lib/db";
import { getNextDocumentCode } from "@/lib/sequences";

export interface ItemFilter {
  keyword?: string;
  categoryId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ItemDto {
  id: string;
  code: string;
  name: string;
  kind: "material" | "product" | "service" | "semi_finished";
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  baseUnitId: string;
  baseUnitCode: string;
  baseUnitName: string;
  specJson: Record<string, any>;
  isActive: boolean;
  minQty: number;
  reorderQty: number;
  binLabel: string;
  totalOnHand: number;
  referenceCost: number;
  conversions: Array<{
    unitId: string;
    unitCode: string;
    unitName: string;
    factorToBase: number;
    isPurchaseDefault: boolean;
    isSalesDefault: boolean;
  }>;
}

export interface WarehouseDto {
  id: string;
  code: string;
  name: string;
  type: "workshop" | "distribution" | "vehicle" | "transit";
  isActive: boolean;
  totalSku: number;
  totalOnHand: number;
  totalValue: number;
}

export interface StockBalanceDto {
  balanceId: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitCode: string;
  unitName: string;
  lotId: string;
  lotCode: string;
  lotKind: "standard" | "remnant" | "scrap";
  lengthMm: number | null;
  widthMm: number | null;
  binLabel: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  minQty: number;
  inventoryValue: number;
  stockStatus: "out_of_stock" | "low_stock" | "normal";
}

export interface RemnantDto {
  lotId: string;
  lotCode: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  kind: "remnant" | "scrap";
  lengthMm: number;
  widthMm: number;
  areaM2: number;
  onHandQty: number;
  warehouseId: string;
  warehouseName: string;
  binLabel: string;
  inventoryValue: number;
  createdAt: string;
}

export interface StockDocumentDto {
  id: string;
  code: string;
  type: "receipt" | "issue" | "transfer" | "adjustment";
  purpose: string;
  reason: string | null;
  status:
    | "draft"
    | "submitted"
    | "approved"
    | "rejected"
    | "dispatched"
    | "completed"
    | "cancelled"
    | "reversed";
  postedAt: string | null;
  sourceWarehouseId: string | null;
  sourceWarehouseName: string | null;
  destinationWarehouseId: string | null;
  destinationWarehouseName: string | null;
  projectId: string | null;
  projectName?: string | null;
  totalLines: number;
  totalAmount: number;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockDocumentLineDto {
  id: string;
  lineNo: number;
  itemId: string;
  itemCode: string;
  itemName: string;
  lotId: string;
  lotCode: string;
  lotKind: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  qty: number;
  factorSnapshot: number;
  baseQty: number;
  unitCostSnapshot: number;
  lineTotal: number;
}

export interface InventoryCountLineDto {
  id: string;
  countId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitName: string;
  lotId: string;
  lotCode: string;
  expectedQtySnapshot: number;
  actualQty: number;
  differenceQty: number;
}

export interface InventoryCountDto {
  id: string;
  code: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "completed";
  countedAt: string | null;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  linesCount: number;
  discrepancyCount: number;
  createdAt: string;
  createdBy?: string;
  lines?: InventoryCountLineDto[];
}

export class InventoryService {
  /**
   * Lấy organization ID mặc định
   */
  static async getOrganizationId(_client?: any): Promise<string> {
    return getCachedOrgId("SIGNAGE");
  }

  // ==========================================
  // 1. DANH MỤC VẬT TƯ & QUY CÁCH (M07)
  // ==========================================

  /**
   * Danh sách vật tư kèm tồn kho, quy cách và đơn vị quy đổi
   */
  static async listItems(
    filters: ItemFilter = {},
    options: { canViewCost?: boolean } = { canViewCost: true }
  ): Promise<{ items: ItemDto[]; total: number }> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const conditions: string[] = ["i.organization_id = $1"];
      const params: any[] = [orgId];
      let pIdx = 2;

      if (filters.keyword && filters.keyword.trim()) {
        conditions.push(`(i.code ILIKE $${pIdx} OR i.name ILIKE $${pIdx})`);
        params.push(`%${filters.keyword.trim()}%`);
        pIdx++;
      }

      if (filters.categoryId) {
        conditions.push(`i.category_id = $${pIdx}`);
        params.push(filters.categoryId);
        pIdx++;
      }

      if (filters.isActive !== undefined) {
        conditions.push(`i.is_active = $${pIdx}`);
        params.push(filters.isActive);
        pIdx++;
      }

      const whereClause = conditions.join(" AND ");

      // Đếm tổng số
      const countRes = await client.query(
        `SELECT COUNT(*) as count FROM erp.items i WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countRes.rows[0].count, 10);

      // Lấy danh sách items kèm category, unit, settings và tổng tồn kho
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      const dataQuery = `
        SELECT
          i.id, i.code, i.name, i.kind, i.category_id, i.base_unit_id,
          i.specification as spec_json, i.is_active,
          c.code as category_code, c.name as category_name,
          u.code as base_unit_code, u.name as base_unit_name,
          COALESCE(wis.min_qty, 0) as min_qty,
          COALESCE(wis.reorder_qty, 0) as reorder_qty,
          COALESCE(wis.bin_label, 'Chưa xếp kệ') as bin_label,
          COALESCE(bal.total_on_hand, 0) as total_on_hand,
          COALESCE(bal.total_value, 0) as total_value
        FROM erp.items i
        LEFT JOIN erp.item_categories c ON c.id = i.category_id
        LEFT JOIN erp.units u ON u.id = i.base_unit_id
        LEFT JOIN LATERAL (
          SELECT min_qty, reorder_qty, bin_label
          FROM erp.warehouse_item_settings
          WHERE item_id = i.id AND organization_id = i.organization_id
          ORDER BY created_at ASC LIMIT 1
        ) wis ON true
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(on_hand_qty), 0) as total_on_hand,
            COALESCE(SUM(inventory_value), 0) as total_value
          FROM erp.stock_balances
          WHERE organization_id = $1 AND item_id = i.id
        ) bal ON true
        WHERE ${whereClause}
        ORDER BY i.code ASC
        LIMIT $${pIdx} OFFSET $${pIdx + 1}
      `;
      params.push(limit, offset);

      const itemsRes = await client.query(dataQuery, params);

      if (itemsRes.rows.length === 0) {
        return { items: [], total };
      }

      // Lấy danh sách quy đổi đơn vị (conversions)
      const itemIds = itemsRes.rows.map((r) => r.id);
      const convRes = await client.query(
        `SELECT
           c.item_id, c.unit_id, c.factor_to_base,
           u.code as unit_code, u.name as unit_name
         FROM erp.item_unit_conversions c
         JOIN erp.units u ON u.id = c.unit_id
         WHERE c.organization_id = $1 AND c.item_id = ANY($2::uuid[])
           AND c.valid_from <= now() AND (c.valid_to IS NULL OR c.valid_to > now())`,
        [orgId, itemIds]
      );

      const convMap: Record<string, any[]> = {};
      for (const conv of convRes.rows) {
        if (!convMap[conv.item_id]) convMap[conv.item_id] = [];
        convMap[conv.item_id].push({
          unitId: conv.unit_id,
          unitCode: conv.unit_code,
          unitName: conv.unit_name,
          factorToBase: parseFloat(conv.factor_to_base),
          isPurchaseDefault: false,
          isSalesDefault: false,
        });
      }

      const items: ItemDto[] = itemsRes.rows.map((row) => {
        const onHand = parseFloat(row.total_on_hand);
        const val = parseFloat(row.total_value);
        const refCost = onHand > 0 ? Math.round(val / onHand) : 0;

        return {
          id: row.id,
          code: row.code,
          name: row.name,
          kind: row.kind,
          categoryId: row.category_id,
          categoryCode: row.category_code,
          categoryName: row.category_name || "Chưa phân nhóm",
          baseUnitId: row.base_unit_id,
          baseUnitCode: row.base_unit_code,
          baseUnitName: row.base_unit_name,
          specJson: row.spec_json || {},
          isActive: row.is_active,
          minQty: parseFloat(row.min_qty),
          reorderQty: parseFloat(row.reorder_qty),
          binLabel: row.bin_label,
          totalOnHand: onHand,
          // Nếu không có quyền xem giá vốn thì ẩn về 0
          referenceCost: options.canViewCost ? refCost : 0,
          conversions: convMap[row.id] || [],
        };
      });

      return { items, total };
    } finally {
      client.release();
    }
  }

  /**
   * Tạo vật tư mới kèm quy cách và cấu hình kho
   */
  static async createItem(
    data: {
      code: string;
      name: string;
      kind?: "material" | "product" | "service" | "semi_finished";
      categoryId: string;
      baseUnitId: string;
      specJson?: Record<string, any>;
      minQty?: number;
      reorderQty?: number;
      binLabel?: string;
      conversions?: Array<{
        unitId: string;
        factorToBase: number;
        isPurchaseDefault?: boolean;
        isSalesDefault?: boolean;
      }>;
    },
    userId: string
  ): Promise<ItemDto> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      // Kiểm tra trùng mã SKU
      const existing = await client.query(
        "SELECT id FROM erp.items WHERE organization_id = $1 AND code = $2 LIMIT 1",
        [orgId, data.code.trim().toUpperCase()]
      );
      if (existing.rows.length > 0) {
        throw new Error(`Mã vật tư SKU '${data.code}' đã tồn tại trên hệ thống!`);
      }

      // 1. Thêm vào erp.items
      const itemRes = await client.query(
        `INSERT INTO erp.items(
           organization_id, code, name, kind, category_id, base_unit_id,
           specification, is_active, created_by, updated_by
         )
         VALUES($1, $2, $3, $4, $5, $6, $7, true, $8, $8)
         RETURNING id`,
        [
          orgId,
          data.code.trim().toUpperCase(),
          data.name.trim(),
          data.kind || "material",
          data.categoryId,
          data.baseUnitId,
          JSON.stringify(data.specJson || {}),
          userId,
        ]
      );
      const itemId = itemRes.rows[0].id;

      // 2. Tạo Standard Stock Lot
      await client.query(
        `INSERT INTO erp.stock_lots(
           organization_id, lot_code, kind, item_id, created_by, updated_by
         )
         VALUES($1, $2, 'standard', $3, $4, $4)`,
        [orgId, `${data.code.trim().toUpperCase()}-STD`, itemId, userId]
      );

      // 3. Cài đặt định mức kho (warehouse_item_settings cho Kho xưởng chính)
      const whRes = await client.query(
        `SELECT id FROM erp.warehouses WHERE organization_id = $1 AND kind = 'workshop' LIMIT 1`,
        [orgId]
      );
      if (whRes.rows.length > 0) {
        const whId = whRes.rows[0].id;
        await client.query(
          `INSERT INTO erp.warehouse_item_settings(
             organization_id, warehouse_id, item_id, min_qty, reorder_qty, bin_label, created_by, updated_by
           )
           VALUES($1, $2, $3, $4, $5, $6, $7, $7)`,
          [
            orgId,
            whId,
            itemId,
            data.minQty || 0,
            data.reorderQty || 0,
            data.binLabel || "Chưa xếp kệ",
            userId,
          ]
        );
      }

      // 4. Lưu conversions nếu có
      if (data.conversions && data.conversions.length > 0) {
        for (const conv of data.conversions) {
          await client.query(
            `INSERT INTO erp.item_unit_conversions(
               organization_id, item_id, unit_id, factor_to_base, created_by, updated_by
             )
             VALUES($1, $2, $3, $4, $5, $5)`,
            [
              orgId,
              itemId,
              conv.unitId,
              conv.factorToBase,
              userId,
            ]
          );
        }
      }

      await client.query("COMMIT");

      // Trả về item vừa tạo
      const res = await this.listItems({ keyword: data.code.trim() });
      return res.items[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cập nhật thông tin vật tư
   */
  static async updateItem(
    itemId: string,
    data: {
      name?: string;
      code?: string;
      kind?: "material" | "product" | "service" | "semi_finished" | "tool";
      categoryId?: string;
      baseUnitId?: string;
      specJson?: Record<string, any>;
      specification?: Record<string, any>;
      isActive?: boolean;
      minQty?: number;
      reorderQty?: number;
      binLabel?: string;
      conversions?: Array<{
        unitId: string;
        factorToBase: number;
      }>;
    },
    userId: string
  ): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      const updates: string[] = ["updated_by = $1", "updated_at = now()"];
      const params: any[] = [userId, orgId, itemId];
      let pIdx = 4;

      if (data.name !== undefined) {
        updates.push(`name = $${pIdx}`);
        params.push(data.name.trim());
        pIdx++;
      }
      if (data.code !== undefined && data.code.trim()) {
        updates.push(`code = $${pIdx}`);
        params.push(data.code.trim().toUpperCase());
        pIdx++;
      }
      if (data.kind !== undefined) {
        const validKind = data.kind === "semi_finished" ? "product" : data.kind;
        updates.push(`kind = $${pIdx}`);
        params.push(validKind);
        pIdx++;
      }
      if (data.categoryId !== undefined) {
        updates.push(`category_id = $${pIdx}`);
        params.push(data.categoryId);
        pIdx++;
      }
      if (data.baseUnitId !== undefined) {
        updates.push(`base_unit_id = $${pIdx}`);
        params.push(data.baseUnitId);
        pIdx++;
      }
      const finalSpec = data.specJson !== undefined ? data.specJson : data.specification;
      if (finalSpec !== undefined) {
        updates.push(`specification = $${pIdx}`);
        params.push(JSON.stringify(finalSpec));
        pIdx++;
      }
      if (data.isActive !== undefined) {
        updates.push(`is_active = $${pIdx}`);
        params.push(data.isActive);
        pIdx++;
      }

      await client.query(
        `UPDATE erp.items
         SET ${updates.join(", ")}
         WHERE organization_id = $2 AND id = $3`,
        params
      );

      // Cập nhật conversions nếu được gửi lên
      if (data.conversions !== undefined) {
        await client.query(
          `DELETE FROM erp.item_unit_conversions WHERE organization_id = $1 AND item_id = $2`,
          [orgId, itemId]
        );
        for (const conv of data.conversions) {
          if (conv.unitId && Number(conv.factorToBase) > 0) {
            await client.query(
              `INSERT INTO erp.item_unit_conversions(
                 organization_id, item_id, unit_id, factor_to_base, created_by, updated_by
               )
               VALUES($1, $2, $3, $4, $5, $5)`,
              [orgId, itemId, conv.unitId, conv.factorToBase, userId]
            );
          }
        }
      }

      // Cập nhật cài đặt kho
      if (
        data.minQty !== undefined ||
        data.reorderQty !== undefined ||
        data.binLabel !== undefined
      ) {
        const whRes = await client.query(
          `SELECT id FROM erp.warehouses WHERE organization_id = $1 AND kind = 'workshop' LIMIT 1`,
          [orgId]
        );
        if (whRes.rows.length > 0) {
          const whId = whRes.rows[0].id;
          await client.query(
            `INSERT INTO erp.warehouse_item_settings(
               organization_id, warehouse_id, item_id, min_qty, reorder_qty, bin_label, created_by, updated_by
             )
             VALUES($1, $2, $3, $4, $5, $6, $7, $7)
             ON CONFLICT (organization_id, warehouse_id, item_id)
             DO UPDATE SET
               min_qty = COALESCE($4::numeric, erp.warehouse_item_settings.min_qty),
               reorder_qty = COALESCE($5::numeric, erp.warehouse_item_settings.reorder_qty),
               bin_label = COALESCE($6::text, erp.warehouse_item_settings.bin_label),
               updated_by = $7,
               updated_at = now()`,
            [
              orgId,
              whId,
              itemId,
              data.minQty ?? 0,
              data.reorderQty ?? 0,
              data.binLabel ?? "Chưa xếp kệ",
              userId,
            ]
          );
        }
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
   * Lấy chi tiết một vật tư kèm tồn kho các kho (M07 detail)
   */
  static async getItemById(
    itemId: string,
    options: { canViewCost?: boolean } = { canViewCost: true }
  ): Promise<{ item: ItemDto; stocks: StockBalanceDto[] } | null> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const itemRes = await client.query(
        `SELECT
          i.id, i.code, i.name, i.kind, i.category_id, i.base_unit_id,
          i.specification as spec_json, i.is_active,
          c.code as category_code, c.name as category_name,
          u.code as base_unit_code, u.name as base_unit_name,
          COALESCE(wis.min_qty, 0) as min_qty,
          COALESCE(wis.reorder_qty, 0) as reorder_qty,
          COALESCE(wis.bin_label, 'Chưa xếp kệ') as bin_label,
          COALESCE(bal.total_on_hand, 0) as total_on_hand,
          COALESCE(bal.total_value, 0) as total_value
        FROM erp.items i
        LEFT JOIN erp.item_categories c ON c.id = i.category_id
        LEFT JOIN erp.units u ON u.id = i.base_unit_id
        LEFT JOIN LATERAL (
          SELECT min_qty, reorder_qty, bin_label
          FROM erp.warehouse_item_settings
          WHERE item_id = i.id AND organization_id = i.organization_id
          ORDER BY created_at ASC LIMIT 1
        ) wis ON true
        LEFT JOIN (
          SELECT
            item_id,
            SUM(on_hand_qty) as total_on_hand,
            SUM(inventory_value) as total_value
          FROM erp.stock_balances
          WHERE organization_id = $1 AND item_id = $2
          GROUP BY item_id
        ) bal ON bal.item_id = i.id
        WHERE i.organization_id = $1 AND i.id = $2
        LIMIT 1`,
        [orgId, itemId]
      );
      if (itemRes.rows.length === 0) return null;
      const row = itemRes.rows[0];

      const convRes = await client.query(
        `SELECT
           c.item_id, c.unit_id, c.factor_to_base,
           u.code as unit_code, u.name as unit_name
         FROM erp.item_unit_conversions c
         JOIN erp.units u ON u.id = c.unit_id
         WHERE c.organization_id = $1 AND c.item_id = $2
           AND c.valid_from <= now() AND (c.valid_to IS NULL OR c.valid_to > now())`,
        [orgId, itemId]
      );
      const conversions = convRes.rows.map((c: any) => ({
        unitId: c.unit_id,
        unitCode: c.unit_code,
        unitName: c.unit_name,
        factorToBase: parseFloat(c.factor_to_base),
        isPurchaseDefault: false,
        isSalesDefault: false,
      }));

      const onHand = parseFloat(row.total_on_hand);
      const val = parseFloat(row.total_value);
      const refCost = onHand > 0 ? Math.round(val / onHand) : 0;

      const item: ItemDto = {
        id: row.id,
        code: row.code,
        name: row.name,
        kind: row.kind,
        categoryId: row.category_id,
        categoryCode: row.category_code,
        categoryName: row.category_name || "Chưa phân nhóm",
        baseUnitId: row.base_unit_id,
        baseUnitCode: row.base_unit_code,
        baseUnitName: row.base_unit_name,
        specJson: row.spec_json || {},
        isActive: row.is_active,
        minQty: parseFloat(row.min_qty),
        reorderQty: parseFloat(row.reorder_qty),
        binLabel: row.bin_label,
        totalOnHand: onHand,
        referenceCost: options.canViewCost ? refCost : 0,
        conversions,
      };

      const stocks = await this.getWarehouseStock(undefined, { itemId }, options);
      return { item, stocks };
    } finally {
      client.release();
    }
  }

  /**
   * Danh sách nhóm ngành / loại vật tư kèm số lượng mặt hàng
   */
  static async listCategories(): Promise<
    Array<{ id: string; code: string; name: string; itemCount: number }>
  > {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const res = await client.query(
        `SELECT c.id, c.code, c.name, count(i.id)::int as item_count
         FROM erp.item_categories c
         LEFT JOIN erp.items i ON i.category_id = c.id
         WHERE c.organization_id = $1
         GROUP BY c.id, c.code, c.name
         ORDER BY c.code ASC`,
        [orgId]
      );
      return res.rows.map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        itemCount: Number(r.item_count) || 0,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Thêm loại vật tư mới
   */
  static async createCategory(data: { code: string; name: string }, userId: string): Promise<{ id: string }> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const res = await client.query(
        `INSERT INTO erp.item_categories(organization_id, code, name, created_by, updated_by)
         VALUES($1, $2, $3, $4, $4)
         RETURNING id`,
        [orgId, data.code.trim().toUpperCase(), data.name.trim(), userId]
      );
      return { id: res.rows[0].id };
    } finally {
      client.release();
    }
  }

  /**
   * Sửa loại vật tư
   */
  static async updateCategory(id: string, data: { code: string; name: string }, userId: string): Promise<void> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      await client.query(
        `UPDATE erp.item_categories
         SET code = $1, name = $2, updated_by = $3, updated_at = now()
         WHERE id = $4 AND organization_id = $5`,
        [data.code.trim().toUpperCase(), data.name.trim(), userId, id, orgId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Xóa loại vật tư (chỉ xóa khi không có mặt hàng nào trực thuộc)
   */
  static async deleteCategory(id: string): Promise<void> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const check = await client.query(
        `SELECT 1 FROM erp.items WHERE category_id = $1 AND organization_id = $2 LIMIT 1`,
        [id, orgId]
      );
      if (check.rows.length > 0) {
        throw new Error("Không thể xóa loại vật tư đang có mặt hàng trực thuộc. Vui lòng chuyển các mặt hàng sang nhóm khác trước.");
      }
      await client.query(
        `DELETE FROM erp.item_categories WHERE id = $1 AND organization_id = $2`,
        [id, orgId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Danh sách đơn vị tính kèm số lượng mặt hàng đang sử dụng
   */
  static async listUnits(): Promise<
    Array<{ id: string; code: string; name: string; dimension: string; itemCount: number }>
  > {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const res = await client.query(
        `SELECT u.id, u.code, u.name, u.dimension, count(i.id)::int as item_count
         FROM erp.units u
         LEFT JOIN erp.items i ON i.base_unit_id = u.id
         WHERE u.organization_id = $1
         GROUP BY u.id, u.code, u.name, u.dimension
         ORDER BY u.code ASC`,
        [orgId]
      );
      return res.rows.map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        dimension: r.dimension,
        itemCount: Number(r.item_count) || 0,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Thêm đơn vị tính mới
   */
  static async createUnit(data: { code: string; name: string; dimension?: string }, userId: string): Promise<{ id: string }> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const res = await client.query(
        `INSERT INTO erp.units(organization_id, code, name, dimension, created_by, updated_by)
         VALUES($1, $2, $3, $4, $5, $5)
         RETURNING id`,
        [orgId, data.code.trim().toUpperCase(), data.name.trim(), data.dimension || "count", userId]
      );
      return { id: res.rows[0].id };
    } finally {
      client.release();
    }
  }

  /**
   * Sửa đơn vị tính
   */
  static async updateUnit(id: string, data: { code: string; name: string; dimension?: string }, userId: string): Promise<void> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      await client.query(
        `UPDATE erp.units
         SET code = $1, name = $2, dimension = COALESCE($3, dimension), updated_by = $4, updated_at = now()
         WHERE id = $5 AND organization_id = $6`,
        [data.code.trim().toUpperCase(), data.name.trim(), data.dimension, userId, id, orgId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Xóa đơn vị tính (chỉ xóa khi không có mặt hàng nào trực thuộc)
   */
  static async deleteUnit(id: string): Promise<void> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const check = await client.query(
        `SELECT 1 FROM erp.items WHERE base_unit_id = $1 AND organization_id = $2 LIMIT 1`,
        [id, orgId]
      );
      if (check.rows.length > 0) {
        throw new Error("Không thể xóa đơn vị tính đang được sử dụng bởi các mặt hàng trong hệ thống.");
      }
      await client.query(
        `DELETE FROM erp.units WHERE id = $1 AND organization_id = $2`,
        [id, orgId]
      );
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 2. QUẢN TRỊ TỒN KHO ĐA KHO (M08)
  // ==========================================

  /**
   * Danh sách 4 loại kho và giá trị tổng tồn từng kho
   */
  static async listWarehouses(options: { canViewCost?: boolean } = { canViewCost: true }): Promise<WarehouseDto[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const res = await client.query(
        `SELECT
           w.id, w.code, w.name, w.kind as type, w.is_active,
           COALESCE(COUNT(DISTINCT b.item_id), 0) as total_sku,
           COALESCE(SUM(b.on_hand_qty), 0) as total_on_hand,
           COALESCE(SUM(b.inventory_value), 0) as total_value
         FROM erp.warehouses w
         LEFT JOIN erp.stock_balances b ON b.warehouse_id = w.id AND b.organization_id = w.organization_id
         WHERE w.organization_id = $1
         GROUP BY w.id, w.code, w.name, w.kind, w.is_active
         ORDER BY
           CASE w.kind
             WHEN 'workshop' THEN 1
             WHEN 'distribution' THEN 2
             WHEN 'vehicle' THEN 3
             WHEN 'transit' THEN 4
             ELSE 5
           END, w.code ASC`,
        [orgId]
      );

      return res.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        isActive: r.is_active,
        totalSku: parseInt(r.total_sku, 10),
        totalOnHand: parseFloat(r.total_on_hand),
        totalValue: options.canViewCost ? parseFloat(r.total_value) : 0,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Truy vấn số dư tồn kho chi tiết (theo kho, hoặc tất cả)
   */
  static async getWarehouseStock(
    warehouseId?: string,
    filters: { keyword?: string; onlyLowStock?: boolean; itemId?: string; warehouseIds?: string[] } = {},
    options: { canViewCost?: boolean } = { canViewCost: true }
  ): Promise<StockBalanceDto[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const conditions: string[] = ["b.organization_id = $1"];
      const params: any[] = [orgId];
      let pIdx = 2;

      if (warehouseId) {
        conditions.push(`b.warehouse_id = $${pIdx}`);
        params.push(warehouseId);
        pIdx++;
      }

      if (filters.warehouseIds) {
        conditions.push(`b.warehouse_id = ANY($${pIdx}::uuid[])`);
        params.push(filters.warehouseIds);
        pIdx++;
      }

      if (filters.itemId) {
        conditions.push(`b.item_id = $${pIdx}`);
        params.push(filters.itemId);
        pIdx++;
      }

      if (filters.keyword && filters.keyword.trim()) {
        conditions.push(
          `(i.code ILIKE $${pIdx} OR i.name ILIKE $${pIdx} OR l.lot_code ILIKE $${pIdx})`
        );
        params.push(`%${filters.keyword.trim()}%`);
        pIdx++;
      }

      const query = `
        SELECT
          b.id as balance_id,
          b.warehouse_id, w.code as warehouse_code, w.name as warehouse_name,
          b.item_id, i.code as item_code, i.name as item_name,
          u.code as unit_code, u.name as unit_name,
          b.lot_id, l.lot_code, l.kind as lot_kind,
          l.length_mm, l.width_mm,
          COALESCE(wis.bin_label, 'Chưa xếp kệ') as bin_label,
          COALESCE(wis.min_qty, 0) as min_qty,
          b.on_hand_qty, b.reserved_qty,
          (b.on_hand_qty - b.reserved_qty) as available_qty,
          b.inventory_value
        FROM erp.stock_balances b
        JOIN erp.warehouses w ON w.id = b.warehouse_id
        JOIN erp.items i ON i.id = b.item_id
        JOIN erp.units u ON u.id = i.base_unit_id
        JOIN erp.stock_lots l ON l.id = b.lot_id
        LEFT JOIN erp.warehouse_item_settings wis
          ON wis.warehouse_id = b.warehouse_id AND wis.item_id = b.item_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY w.code ASC, i.code ASC, l.lot_code ASC
      `;

      const res = await client.query(query, params);

      const items: StockBalanceDto[] = res.rows.map((r) => {
        const onHand = parseFloat(r.on_hand_qty);
        const minQ = parseFloat(r.min_qty);
        let stockStatus: "out_of_stock" | "low_stock" | "normal" = "normal";

        if (onHand <= 0) {
          stockStatus = "out_of_stock";
        } else if (minQ > 0 && onHand <= minQ) {
          stockStatus = "low_stock";
        }

        return {
          balanceId: r.balance_id,
          warehouseId: r.warehouse_id,
          warehouseCode: r.warehouse_code,
          warehouseName: r.warehouse_name,
          itemId: r.item_id,
          itemCode: r.item_code,
          itemName: r.item_name,
          unitCode: r.unit_code,
          unitName: r.unit_name,
          lotId: r.lot_id,
          lotCode: r.lot_code,
          lotKind: r.lot_kind,
          lengthMm: r.length_mm ? parseFloat(r.length_mm) : null,
          widthMm: r.width_mm ? parseFloat(r.width_mm) : null,
          binLabel: r.bin_label,
          onHandQty: onHand,
          reservedQty: parseFloat(r.reserved_qty),
          availableQty: parseFloat(r.available_qty),
          minQty: minQ,
          inventoryValue: options.canViewCost ? parseFloat(r.inventory_value) : 0,
          stockStatus,
        };
      });

      if (filters.onlyLowStock) {
        return items.filter((i) => i.stockStatus !== "normal");
      }

      return items;
    } finally {
      client.release();
    }
  }

  /**
   * Danh sách tấm lẻ Alu & Mica cắt dở (Remnants & Scraps)
   */
  static async listRemnants(options: { canViewCost?: boolean } = { canViewCost: true }): Promise<RemnantDto[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const query = `
        SELECT
          l.id as lot_id, l.lot_code, l.kind,
          l.length_mm, l.width_mm, l.created_at,
          i.id as item_id, i.code as item_code, i.name as item_name,
          b.warehouse_id, w.name as warehouse_name,
          COALESCE(wis.bin_label, 'Kệ Tấm Lẻ') as bin_label,
          COALESCE(b.on_hand_qty, 0) as on_hand_qty,
          COALESCE(b.inventory_value, 0) as inventory_value
        FROM erp.stock_lots l
        JOIN erp.items i ON i.id = l.item_id
        LEFT JOIN erp.stock_balances b ON b.lot_id = l.id
        LEFT JOIN erp.warehouses w ON w.id = b.warehouse_id
        LEFT JOIN erp.warehouse_item_settings wis
          ON wis.warehouse_id = b.warehouse_id AND wis.item_id = i.id
        WHERE l.organization_id = $1 AND l.kind IN ('remnant', 'scrap')
        ORDER BY l.created_at DESC
      `;

      const res = await client.query(query, [orgId]);

      return res.rows.map((r) => {
        const l = parseFloat(r.length_mm || "0");
        const w = parseFloat(r.width_mm || "0");
        const areaM2 = (l * w) / 1000000;

        return {
          lotId: r.lot_id,
          lotCode: r.lot_code,
          itemId: r.item_id,
          itemCode: r.item_code,
          itemName: r.item_name,
          kind: r.kind,
          lengthMm: l,
          widthMm: w,
          areaM2: Math.round(areaM2 * 1000) / 1000,
          onHandQty: parseFloat(r.on_hand_qty),
          warehouseId: r.warehouse_id,
          warehouseName: r.warehouse_name || "Kho Tấm Lẻ",
          binLabel: r.bin_label,
          inventoryValue: options.canViewCost ? parseFloat(r.inventory_value) : 0,
          createdAt: r.created_at,
        };
      });
    } finally {
      client.release();
    }
  }

  /**
   * Cắt tấm lẻ Alu & Mica tận dụng cho công trình (API-02)
   */
  static async cutRemnant(
    input: {
      sourceRemnantId: string;
      cutLengthMm: number;
      cutWidthMm: number;
      projectId?: string;
    },
    userId: string
  ): Promise<{
    success: boolean;
    childRemnant?: {
      lotId: string;
      lotCode: string;
      lengthMm: number;
      widthMm: number;
      areaM2: number;
    };
    consumedPiece: {
      lengthMm: number;
      widthMm: number;
      areaM2: number;
    };
  }> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      const lotRes = await client.query(
        `SELECT l.id, l.lot_code, l.kind, l.length_mm, l.width_mm, l.item_id,
                b.id as balance_id, b.warehouse_id, b.on_hand_qty, b.inventory_value
         FROM erp.stock_lots l
         JOIN erp.stock_balances b ON b.lot_id = l.id AND b.organization_id = l.organization_id
         WHERE l.id = $1 AND l.organization_id = $2
         FOR UPDATE OF l, b`,
        [input.sourceRemnantId, orgId]
      );

      if (lotRes.rows.length === 0) {
        throw new Error("Không tìm thấy tấm lẻ nguồn hoặc tấm lẻ chưa có số dư kho!");
      }

      const row = lotRes.rows[0];
      const onHand = parseFloat(row.on_hand_qty);
      if (onHand < 1) {
        throw new Error("Tấm lẻ đã hết hàng hoặc đã được tiêu hao!");
      }

      const origLength = parseFloat(row.length_mm);
      const origWidth = parseFloat(row.width_mm);

      if (input.cutLengthMm <= 0 || input.cutWidthMm <= 0) {
        throw new Error("Kích thước cắt phải lớn hơn 0!");
      }
      if (input.cutLengthMm > origLength || input.cutWidthMm > origWidth) {
        throw new Error(
          `Kích thước cắt (${input.cutLengthMm}x${input.cutWidthMm}mm) vượt quá kích thước tấm (${origLength}x${origWidth}mm)!`
        );
      }

      const origArea = origLength * origWidth;
      const cutArea = input.cutLengthMm * input.cutWidthMm;
      const remainingArea = origArea - cutArea;

      // Giảm 1 tấm lẻ nguồn
      await client.query(
        `UPDATE erp.stock_balances
         SET on_hand_qty = GREATEST(0, on_hand_qty - 1),
             updated_at = now()
         WHERE id = $1`,
        [row.balance_id]
      );

      let childRemnant: any = undefined;

      // Nếu diện tích còn lại >= 0.01 m2 (tương đương 100x100mm), tạo lot tấm lẻ con
      if (remainingArea >= 10000) {
        let remL = origLength;
        let remW = origWidth;
        if (input.cutLengthMm < origLength && input.cutWidthMm === origWidth) {
          remL = origLength - input.cutLengthMm;
        } else if (input.cutWidthMm < origWidth && input.cutLengthMm === origLength) {
          remW = origWidth - input.cutWidthMm;
        } else {
          if (origLength - input.cutLengthMm >= origWidth - input.cutWidthMm) {
            remL = origLength - input.cutLengthMm;
          } else {
            remW = origWidth - input.cutWidthMm;
          }
        }

        const countRes = await client.query(
          `SELECT COUNT(*) as count FROM erp.stock_lots WHERE parent_lot_id = $1`,
          [row.id]
        );
        const childSeq = parseInt(countRes.rows[0].count, 10) + 1;
        const childLotCode = `${row.lot_code}-R${childSeq}`;
        const childKind = remainingArea / 1_000_000 < 0.1 ? "scrap" : "remnant";
        const childVal = Math.round(
          parseFloat(row.inventory_value || "0") * (remainingArea / origArea)
        );

        const insLotRes = await client.query(
          `INSERT INTO erp.stock_lots(
             organization_id, lot_code, kind, length_mm, width_mm,
             item_id, parent_lot_id, created_by, updated_by
           )
           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $8)
           RETURNING id, lot_code, length_mm, width_mm`,
          [
            orgId,
            childLotCode,
            childKind,
            remL,
            remW,
            row.item_id,
            row.id,
            userId,
          ]
        );
        const childLot = insLotRes.rows[0];

        // Tạo số dư tồn kho cho tấm con
        await client.query(
          `INSERT INTO erp.stock_balances(
             organization_id, warehouse_id, item_id, lot_id,
             on_hand_qty, reserved_qty, inventory_value, created_by, updated_by
           )
           VALUES($1, $2, $3, $4, 1, 0, $5, $6, $6)`,
          [
            orgId,
            row.warehouse_id,
            row.item_id,
            childLot.id,
            childVal,
            userId,
          ]
        );

        childRemnant = {
          lotId: childLot.id,
          lotCode: childLot.lot_code,
          lengthMm: parseFloat(childLot.length_mm),
          widthMm: parseFloat(childLot.width_mm),
          areaM2: Math.round((remainingArea / 1_000_000) * 1000) / 1000,
        };
      }

      await client.query("COMMIT");

      return {
        success: true,
        childRemnant,
        consumedPiece: {
          lengthMm: input.cutLengthMm,
          widthMm: input.cutWidthMm,
          areaM2: Math.round((cutArea / 1_000_000) * 1000) / 1000,
        },
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Thống kê tổng hợp Dashboard Quản Trị Kho
   */
  static async getInventorySummary(options: { canViewCost?: boolean } = { canViewCost: true }) {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const res = await client.query(
        `SELECT
           (SELECT COUNT(*) FROM erp.items WHERE organization_id = $1 AND is_active = true) as total_items,
           (SELECT COUNT(*) FROM erp.warehouses WHERE organization_id = $1 AND is_active = true) as total_warehouses,
           (SELECT COALESCE(SUM(inventory_value), 0) FROM erp.stock_balances WHERE organization_id = $1) as total_inventory_value,
           (SELECT COUNT(*) FROM erp.stock_lots WHERE organization_id = $1 AND kind = 'remnant') as total_remnants,
           (SELECT COUNT(*) FROM erp.stock_documents WHERE organization_id = $1 AND status = 'submitted') as pending_approvals
        `,
        [orgId]
      );

      const r = res.rows[0];

      // Đếm số lượng vật tư sắp hết (low stock)
      const lowStockRes = await client.query(
        `SELECT COUNT(DISTINCT b.item_id) as count
         FROM erp.stock_balances b
         JOIN erp.warehouse_item_settings wis
           ON wis.warehouse_id = b.warehouse_id AND wis.item_id = b.item_id
         WHERE b.organization_id = $1 AND wis.min_qty > 0 AND b.on_hand_qty <= wis.min_qty`,
        [orgId]
      );

      return {
        totalItems: parseInt(r.total_items, 10),
        totalWarehouses: parseInt(r.total_warehouses, 10),
        totalInventoryValue: options.canViewCost ? parseFloat(r.total_inventory_value) : 0,
        totalRemnants: parseInt(r.total_remnants, 10),
        pendingApprovals: parseInt(r.pending_approvals, 10),
        lowStockItems: parseInt(lowStockRes.rows[0].count, 10),
      };
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 3. TRUNG TÂM LẬP & DUYỆT PHIẾU KHO (M09)
  // ==========================================

  /**
   * Danh sách phiếu kho kèm bộ lọc
   */
  static async listDocuments(
    filters: {
      type?: "receipt" | "issue" | "transfer" | "adjustment";
      status?: string;
      warehouseId?: string;
      pendingOnly?: boolean;
      userApprovalLimit?: number | null;
    } = {},
    options: { canViewCost?: boolean } = { canViewCost: true }
  ): Promise<StockDocumentDto[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const conditions: string[] = ["d.organization_id = $1"];
      const params: any[] = [orgId];
      let pIdx = 2;

      if (filters.type) {
        conditions.push(`d.type = $${pIdx}`);
        params.push(filters.type);
        pIdx++;
      }

      if (filters.status) {
        conditions.push(`d.status = $${pIdx}`);
        params.push(filters.status);
        pIdx++;
      }

      if (filters.warehouseId) {
        conditions.push(
          `(d.source_warehouse_id = $${pIdx} OR d.destination_warehouse_id = $${pIdx})`
        );
        params.push(filters.warehouseId);
        pIdx++;
      }

      if (filters.pendingOnly) {
        conditions.push("d.status = 'submitted'");
      }

      const query = `
        SELECT
          d.id, d.code, d.type, d.purpose, d.reason, d.status, d.posted_at,
          d.source_warehouse_id, sw.name as source_warehouse_name,
          d.destination_warehouse_id, dw.name as destination_warehouse_name,
          d.project_id,
          d.created_at, d.updated_at,
          u.name as created_by_name, u.email as created_by_email,
          COALESCE(COUNT(l.id), 0) as total_lines,
          COALESCE(SUM(l.qty * l.unit_cost_snapshot), 0) as total_amount
        FROM erp.stock_documents d
        LEFT JOIN erp.warehouses sw ON sw.id = d.source_warehouse_id
        LEFT JOIN erp.warehouses dw ON dw.id = d.destination_warehouse_id
        LEFT JOIN public."user" u ON u.id = d.created_by
        LEFT JOIN erp.stock_document_lines l ON l.document_id = d.id
        WHERE ${conditions.join(" AND ")}
        GROUP BY
          d.id, d.code, d.type, d.purpose, d.reason, d.status, d.posted_at,
          d.source_warehouse_id, sw.name,
          d.destination_warehouse_id, dw.name,
          d.project_id, d.created_at, d.updated_at,
          u.name, u.email
        ORDER BY d.created_at DESC
      `;

      const res = await client.query(query, params);

      let docs: StockDocumentDto[] = res.rows.map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type,
        purpose: r.purpose,
        reason: r.reason,
        status: r.status,
        postedAt: r.posted_at,
        sourceWarehouseId: r.source_warehouse_id,
        sourceWarehouseName: r.source_warehouse_name,
        destinationWarehouseId: r.destination_warehouse_id,
        destinationWarehouseName: r.destination_warehouse_name,
        projectId: r.project_id,
        totalLines: parseInt(r.total_lines, 10),
        totalAmount: options.canViewCost ? parseFloat(r.total_amount) : 0,
        createdByName: r.created_by_name || "Hệ thống",
        createdByEmail: r.created_by_email || "",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      // Nếu có filter "Chờ tôi duyệt" (pendingOnly) và user có hạn mức duyệt
      if (
        filters.pendingOnly &&
        filters.userApprovalLimit !== undefined &&
        filters.userApprovalLimit !== null
      ) {
        docs = docs.filter((d) => d.totalAmount <= (filters.userApprovalLimit ?? Infinity));
      }

      return docs;
    } finally {
      client.release();
    }
  }

  /**
   * Chi tiết phiếu kho kèm danh sách dòng
   */
  static async getDocumentDetail(
    documentId: string,
    options: { canViewCost?: boolean } = { canViewCost: true }
  ): Promise<{
    document: StockDocumentDto;
    lines: StockDocumentLineDto[];
  }> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);

      const docRes = await client.query(
        `SELECT
           d.id, d.code, d.type, d.purpose, d.reason, d.status, d.posted_at,
           d.source_warehouse_id, sw.name as source_warehouse_name,
           d.destination_warehouse_id, dw.name as destination_warehouse_name,
           d.project_id,
           d.created_at, d.updated_at,
           u.name as created_by_name, u.email as created_by_email
         FROM erp.stock_documents d
         LEFT JOIN erp.warehouses sw ON sw.id = d.source_warehouse_id
         LEFT JOIN erp.warehouses dw ON dw.id = d.destination_warehouse_id
         LEFT JOIN public."user" u ON u.id = d.created_by
         WHERE d.organization_id = $1 AND d.id = $2`,
        [orgId, documentId]
      );

      if (docRes.rows.length === 0) {
        throw new Error("Không tìm thấy phiếu kho yêu cầu!");
      }

      const r = docRes.rows[0];

      // Lấy chi tiết dòng
      const linesRes = await client.query(
        `SELECT
           l.id, l.line_no, l.qty, l.factor_snapshot, l.base_qty,
           l.unit_cost_snapshot,
           l.item_id, i.code as item_code, i.name as item_name,
           l.lot_id, lot.lot_code, lot.kind as lot_kind,
           l.unit_id, u.code as unit_code, u.name as unit_name
         FROM erp.stock_document_lines l
         JOIN erp.items i ON i.id = l.item_id
         JOIN erp.stock_lots lot ON lot.id = l.lot_id
         JOIN erp.units u ON u.id = l.unit_id
         WHERE l.organization_id = $1 AND l.document_id = $2
         ORDER BY l.line_no ASC`,
        [orgId, documentId]
      );

      let totalAmount = 0;
      const lines: StockDocumentLineDto[] = linesRes.rows.map((lr) => {
        const qty = parseFloat(lr.qty);
        const cost = options.canViewCost ? parseFloat(lr.unit_cost_snapshot) : 0;
        const lineTotal = qty * cost;
        totalAmount += lineTotal;

        return {
          id: lr.id,
          lineNo: lr.line_no,
          itemId: lr.item_id,
          itemCode: lr.item_code,
          itemName: lr.item_name,
          lotId: lr.lot_id,
          lotCode: lr.lot_code,
          lotKind: lr.lot_kind,
          unitId: lr.unit_id,
          unitCode: lr.unit_code,
          unitName: lr.unit_name,
          qty,
          factorSnapshot: parseFloat(lr.factor_snapshot),
          baseQty: parseFloat(lr.base_qty),
          unitCostSnapshot: cost,
          lineTotal,
        };
      });

      const document: StockDocumentDto = {
        id: r.id,
        code: r.code,
        type: r.type,
        purpose: r.purpose,
        reason: r.reason,
        status: r.status,
        postedAt: r.posted_at,
        sourceWarehouseId: r.source_warehouse_id,
        sourceWarehouseName: r.source_warehouse_name,
        destinationWarehouseId: r.destination_warehouse_id,
        destinationWarehouseName: r.destination_warehouse_name,
        projectId: r.project_id,
        totalLines: lines.length,
        totalAmount,
        createdByName: r.created_by_name || "Hệ thống",
        createdByEmail: r.created_by_email || "",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };

      return { document, lines };
    } finally {
      client.release();
    }
  }

  /**
   * Tạo phiếu kho mới (Nhập, Xuất, Điều chuyển) kèm các dòng
   */
  static async createDocument(
    data: {
      type: "receipt" | "issue" | "transfer" | "adjustment";
      purpose: string;
      reason?: string;
      sourceWarehouseId?: string | null;
      destinationWarehouseId?: string | null;
      projectId?: string | null;
      productionOrderId?: string | null;
      submitNow?: boolean;
      lines: Array<{
        itemId: string;
        lotId?: string;
        unitId: string;
        qty: number;
        factorSnapshot?: number;
        unitCostSnapshot?: number;
        purchaseLineId?: string | null;
        salesLineId?: string | null;
      }>;
    },
    userId: string
  ): Promise<string> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      if (!data.lines || data.lines.length === 0) {
        throw new Error("Phiếu kho phải có ít nhất 1 dòng chi tiết vật tư!");
      }

      // Kiểm tra constraint kho theo loại phiếu
      if (data.type === "receipt") {
        if (!data.destinationWarehouseId) {
          throw new Error("Phiếu nhập kho bắt buộc chọn Kho nhập!");
        }
        data.sourceWarehouseId = null;
      } else if (data.type === "issue") {
        if (!data.sourceWarehouseId) {
          throw new Error("Phiếu xuất kho bắt buộc chọn Kho xuất!");
        }
        data.destinationWarehouseId = null;
      } else if (data.type === "transfer") {
        if (!data.sourceWarehouseId || !data.destinationWarehouseId) {
          throw new Error("Phiếu điều chuyển bắt buộc chọn cả Kho nguồn và Kho đích!");
        }
        if (data.sourceWarehouseId === data.destinationWarehouseId) {
          throw new Error("Kho nguồn và Kho đích không được trùng nhau!");
        }
      } else if (data.type === "adjustment") {
        if (!data.destinationWarehouseId) {
          throw new Error("Phiếu điều chỉnh kiểm kê bắt buộc chọn Kho!");
        }
        if (!data.reason || !data.reason.trim()) {
          throw new Error("Phiếu điều chỉnh bắt buộc nhập lý do chênh lệch!");
        }
        data.sourceWarehouseId = null;
      }

      // Tạo mã phiếu tự sinh (ví dụ: PNK-2026-0001, PXK-2026-0001, PDC-2026-0001)
      const prefix =
        data.type === "receipt"
          ? "PNK"
          : data.type === "issue"
          ? "PXK"
          : data.type === "transfer"
          ? "PDC"
          : "PDC";
      // DOC-01: Cấp mã phiếu kho tuần tự nguyên tử chống trùng lặp đa luồng
      const code = await getNextDocumentCode(client, orgId, `stock_document_${data.type}`, prefix);

      // B1: Insert stock_documents với status='draft' (Bắt buộc do trigger guard_stock_line)
      const docRes = await client.query(
        `INSERT INTO erp.stock_documents(
           organization_id, code, type, purpose, reason, status,
           source_warehouse_id, destination_warehouse_id, project_id, production_order_id,
           created_by, updated_by
         )
         VALUES($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $10)
         RETURNING id`,
        [
          orgId,
          code,
          data.type,
          data.purpose.trim(),
          data.reason ? data.reason.trim() : null,
          data.sourceWarehouseId || null,
          data.destinationWarehouseId || null,
          data.projectId || null,
          data.productionOrderId || null,
          userId,
        ]
      );
      const docId = docRes.rows[0].id;

      // B2: Insert stock_document_lines
      let lineNo = 1;
      for (const line of data.lines) {
        // Nếu không truyền lotId thì lấy standard lot của item (tự sinh nếu chưa có)
        let lotId = line.lotId;
        if (!lotId) {
          const lotRes = await client.query(
            `SELECT id FROM erp.stock_lots WHERE organization_id = $1 AND item_id = $2 AND kind = 'standard' LIMIT 1`,
            [orgId, line.itemId]
          );
          if (lotRes.rows.length === 0) {
            const itemCodeRes = await client.query(
              `SELECT code FROM erp.items WHERE id = $1 LIMIT 1`,
              [line.itemId]
            );
            const itemCode = itemCodeRes.rows[0]?.code || "ITEM";
            const newLotRes = await client.query(
              `INSERT INTO erp.stock_lots(organization_id, lot_code, kind, item_id, created_by, updated_by)
               VALUES($1, $2, 'standard', $3, $4, $4)
               RETURNING id`,
              [orgId, `${itemCode}-STD`, line.itemId, userId]
            );
            lotId = newLotRes.rows[0].id;
          } else {
            lotId = lotRes.rows[0].id;
          }
        }

        let unitId = line.unitId;
        if (!unitId) {
          const itemRes = await client.query(
            `SELECT base_unit_id FROM erp.items WHERE id = $1 LIMIT 1`,
            [line.itemId]
          );
          unitId = itemRes.rows[0]?.base_unit_id;
        }

        const factor = line.factorSnapshot || 1;
        const baseQty = line.qty * factor;
        const unitCost = line.unitCostSnapshot || 0;

        await client.query(
          `INSERT INTO erp.stock_document_lines(
             organization_id, document_id, line_no, item_id, lot_id, unit_id,
             qty, factor_snapshot, base_qty, unit_cost_snapshot,
             purchase_line_id, sales_line_id, created_by, updated_by
           )
           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
          [
            orgId,
            docId,
            lineNo++,
            line.itemId,
            lotId,
            unitId,
            line.qty,
            factor,
            baseQty,
            unitCost,
            line.purchaseLineId || null,
            line.salesLineId || null,
            userId,
          ]
        );
      }

      // B3: Nếu yêu cầu gửi duyệt ngay -> Chuyển sang 'submitted'
      if (data.submitNow) {
        await client.query(
          `UPDATE erp.stock_documents
           SET status = 'submitted', updated_by = $1, updated_at = now()
           WHERE id = $2`,
          [userId, docId]
        );
      }

      await client.query("COMMIT");
      return docId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Gửi duyệt phiếu kho (Chuyển từ 'draft' sang 'submitted')
   */
  static async submitDocument(documentId: string, userId: string): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      const docRes = await client.query(
        `SELECT id, status FROM erp.stock_documents WHERE organization_id = $1 AND id = $2 FOR UPDATE`,
        [orgId, documentId]
      );
      if (docRes.rows.length === 0) {
        throw new Error("Không tìm thấy phiếu kho!");
      }
      const doc = docRes.rows[0];
      if (doc.status !== "draft") {
        throw new Error(`Chỉ có thể gửi duyệt phiếu ở trạng thái 'Nháp' (draft)! Hiện tại: '${doc.status}'`);
      }

      await client.query(
        `UPDATE erp.stock_documents SET status = 'submitted', updated_by = $1, updated_at = now() WHERE id = $2`,
        [userId, documentId]
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
   * Duyệt phiếu kho (Chuyển sang 'approved')
   * Kiểm tra hạn mức duyệt của người duyệt
   */
  static async approveDocument(
    documentId: string,
    userId: string,
    approvalLimit?: number | null
  ): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      // Kiểm tra trạng thái hiện tại
      const docRes = await client.query(
        `SELECT id, status, code FROM erp.stock_documents WHERE organization_id = $1 AND id = $2 FOR UPDATE`,
        [orgId, documentId]
      );
      if (docRes.rows.length === 0) {
        throw new Error("Không tìm thấy phiếu kho!");
      }
      const doc = docRes.rows[0];
      if (doc.status !== "submitted" && doc.status !== "draft") {
        throw new Error(`Chỉ có thể duyệt phiếu ở trạng thái 'Chờ duyệt' hoặc 'Nháp'! Hiện tại: '${doc.status}'`);
      }

      // Tính tổng giá trị phiếu để kiểm tra hạn mức
      const sumRes = await client.query(
        `SELECT COALESCE(SUM(qty * unit_cost_snapshot), 0) as total FROM erp.stock_document_lines WHERE organization_id = $1 AND document_id = $2`,
        [orgId, documentId]
      );
      const totalAmount = parseFloat(sumRes.rows[0].total);

      if (approvalLimit !== undefined && approvalLimit !== null && totalAmount > approvalLimit) {
        throw new Error(
          `Phiếu kho có tổng giá trị ${totalAmount.toLocaleString(
            "vi-VN"
          )} VND vượt quá hạn mức duyệt của bạn (${approvalLimit.toLocaleString(
            "vi-VN"
          )} VND). Vui lòng chuyển cấp trên duyệt!`
        );
      }

      await client.query(
        `UPDATE erp.stock_documents
         SET status = 'approved', updated_by = $1, updated_at = now()
         WHERE id = $2`,
        [userId, documentId]
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
   * Hoàn tất phiếu kho (Ghi sổ biến động tồn kho và chuyển status sang 'completed')
   */
  static async completeDocument(documentId: string, userId: string): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      // Khóa bản ghi phiếu kho
      const docRes = await client.query(
        `SELECT id, code, type, status, source_warehouse_id, destination_warehouse_id
         FROM erp.stock_documents
         WHERE organization_id = $1 AND id = $2 FOR UPDATE`,
        [orgId, documentId]
      );
      if (docRes.rows.length === 0) {
        throw new Error("Không tìm thấy phiếu kho!");
      }
      const doc = docRes.rows[0];

      // INV-01: Chỉ phiếu đã được phê duyệt mới được ghi sổ và cập nhật tồn kho
      if (doc.status !== "approved") {
        throw new Error(`Chỉ có thể hoàn tất và ghi sổ phiếu kho đã được phê duyệt (status='approved')! Trạng thái hiện tại: '${doc.status}'`);
      }

      // Lấy chi tiết các dòng phiếu kèm ID dòng
      const linesRes = await client.query(
        `SELECT id, item_id, lot_id, base_qty, unit_cost_snapshot
         FROM erp.stock_document_lines
         WHERE organization_id = $1 AND document_id = $2`,
        [orgId, documentId]
      );

      const postingId = crypto.randomUUID();

      // INV-05: Ghi nhận chứng từ bút toán kho (stock_postings)
      await client.query(
        `INSERT INTO erp.stock_postings(
           id, organization_id, phase, posted_by, posted_at, request_id, document_id, created_by, updated_by
         )
         VALUES($1, $2, 'complete', $3, now(), gen_random_uuid(), $4, $3, $3)`,
        [postingId, orgId, userId, documentId]
      );

      // Cập nhật tồn kho theo loại phiếu
      for (const line of linesRes.rows) {
        const qty = parseFloat(line.base_qty);
        const cost = parseFloat(line.unit_cost_snapshot || "0");
        const val = qty * cost;

        // INV-03: Đảm bảo có lot_id hợp lệ
        let lotId = line.lot_id;
        if (!lotId) {
          const stdLot = await client.query(
            "SELECT id FROM erp.stock_lots WHERE organization_id = $1 AND item_id = $2 AND kind = 'standard' LIMIT 1",
            [orgId, line.item_id]
          );
          if (stdLot.rows.length === 0) {
            throw new Error(`Không tìm thấy lô hợp lệ cho vật tư id: ${line.item_id}`);
          }
          lotId = stdLot.rows[0].id;
        }

        if (doc.type === "receipt") {
          // Nhập kho: tăng tồn tại kho đích
          await client.query(
            `INSERT INTO erp.stock_balances(
               organization_id, warehouse_id, item_id, lot_id, on_hand_qty, reserved_qty, inventory_value, created_by, updated_by
             )
             VALUES($1, $2, $3, $4, $5, 0, $6, $7, $7)
             ON CONFLICT (organization_id, warehouse_id, item_id, lot_id)
             DO UPDATE SET
               on_hand_qty = erp.stock_balances.on_hand_qty + EXCLUDED.on_hand_qty,
               inventory_value = erp.stock_balances.inventory_value + EXCLUDED.inventory_value,
               updated_by = $7, updated_at = now()`,
            [orgId, doc.destination_warehouse_id, line.item_id, lotId, qty, val, userId]
          );

          // INV-04: Ghi sổ biến động tồn kho stock_movements
          await client.query(
            `INSERT INTO erp.stock_movements(
               organization_id, qty_delta, value_delta, posted_at, posting_id,
               document_id, document_line_id, warehouse_id, item_id, lot_id,
               created_by, updated_by
             )
             VALUES($1, $2, $3, now(), $4, $5, $6, $7, $8, $9, $10, $10)`,
            [orgId, qty, val, postingId, documentId, line.id, doc.destination_warehouse_id, line.item_id, lotId, userId]
          );
        } else if (doc.type === "issue") {
          // INV-02: Kiểm tra tồn kho trước khi trừ, không cho phép xuất âm
          const balRes = await client.query(
            `SELECT on_hand_qty, inventory_value FROM erp.stock_balances
             WHERE organization_id = $1 AND warehouse_id = $2 AND item_id = $3 AND lot_id = $4
             FOR UPDATE`,
            [orgId, doc.source_warehouse_id, line.item_id, lotId]
          );
          const currentQty = balRes.rows.length > 0 ? parseFloat(balRes.rows[0].on_hand_qty) : 0;
          if (currentQty < qty) {
            throw new Error(`Kho xuất không đủ tồn kho! (Tồn hiện tại: ${currentQty}, yêu cầu xuất: ${qty})`);
          }

          // Xuất kho: giảm tồn tại kho nguồn
          await client.query(
            `UPDATE erp.stock_balances
             SET
               on_hand_qty = on_hand_qty - $1,
               inventory_value = GREATEST(0, inventory_value - $2),
               updated_by = $3, updated_at = now()
             WHERE organization_id = $4 AND warehouse_id = $5 AND item_id = $6 AND lot_id = $7`,
            [qty, val, userId, orgId, doc.source_warehouse_id, line.item_id, lotId]
          );

          // INV-04: Ghi sổ biến động tồn kho stock_movements
          await client.query(
            `INSERT INTO erp.stock_movements(
               organization_id, qty_delta, value_delta, posted_at, posting_id,
               document_id, document_line_id, warehouse_id, item_id, lot_id,
               created_by, updated_by
             )
             VALUES($1, $2, $3, now(), $4, $5, $6, $7, $8, $9, $10, $10)`,
            [orgId, -qty, -val, postingId, documentId, line.id, doc.source_warehouse_id, line.item_id, lotId, userId]
          );
        } else if (doc.type === "transfer") {
          // INV-02: Kiểm tra tồn kho nguồn trước khi điều chuyển
          const balRes = await client.query(
            `SELECT on_hand_qty, inventory_value FROM erp.stock_balances
             WHERE organization_id = $1 AND warehouse_id = $2 AND item_id = $3 AND lot_id = $4
             FOR UPDATE`,
            [orgId, doc.source_warehouse_id, line.item_id, lotId]
          );
          const currentQty = balRes.rows.length > 0 ? parseFloat(balRes.rows[0].on_hand_qty) : 0;
          if (currentQty < qty) {
            throw new Error(`Kho nguồn không đủ hàng để điều chuyển! (Tồn hiện tại: ${currentQty}, yêu cầu chuyển: ${qty})`);
          }

          // Điều chuyển: giảm ở kho nguồn
          await client.query(
            `UPDATE erp.stock_balances
             SET
               on_hand_qty = on_hand_qty - $1,
               inventory_value = GREATEST(0, inventory_value - $2),
               updated_by = $3, updated_at = now()
             WHERE organization_id = $4 AND warehouse_id = $5 AND item_id = $6 AND lot_id = $7`,
            [qty, val, userId, orgId, doc.source_warehouse_id, line.item_id, lotId]
          );

          // INV-04: Ghi movement giảm ở kho nguồn
          await client.query(
            `INSERT INTO erp.stock_movements(
               organization_id, qty_delta, value_delta, posted_at, posting_id,
               document_id, document_line_id, warehouse_id, item_id, lot_id,
               created_by, updated_by
             )
             VALUES($1, $2, $3, now(), $4, $5, $6, $7, $8, $9, $10, $10)`,
            [orgId, -qty, -val, postingId, documentId, line.id, doc.source_warehouse_id, line.item_id, lotId, userId]
          );

          // Tăng ở kho đích
          await client.query(
            `INSERT INTO erp.stock_balances(
               organization_id, warehouse_id, item_id, lot_id, on_hand_qty, reserved_qty, inventory_value, created_by, updated_by
             )
             VALUES($1, $2, $3, $4, $5, 0, $6, $7, $7)
             ON CONFLICT (organization_id, warehouse_id, item_id, lot_id)
             DO UPDATE SET
               on_hand_qty = erp.stock_balances.on_hand_qty + EXCLUDED.on_hand_qty,
               inventory_value = erp.stock_balances.inventory_value + EXCLUDED.inventory_value,
               updated_by = $7, updated_at = now()`,
            [orgId, doc.destination_warehouse_id, line.item_id, lotId, qty, val, userId]
          );

          // INV-04: Ghi movement tăng ở kho đích
          await client.query(
            `INSERT INTO erp.stock_movements(
               organization_id, qty_delta, value_delta, posted_at, posting_id,
               document_id, document_line_id, warehouse_id, item_id, lot_id,
               created_by, updated_by
             )
             VALUES($1, $2, $3, now(), $4, $5, $6, $7, $8, $9, $10, $10)`,
            [orgId, qty, val, postingId, documentId, line.id, doc.destination_warehouse_id, line.item_id, lotId, userId]
          );
        }
      }

      // Cập nhật trạng thái phiếu kho sang 'completed'
      await client.query(
        `UPDATE erp.stock_documents
         SET status = 'completed', posted_at = now(), updated_by = $1, updated_at = now()
         WHERE id = $2`,
        [userId, documentId]
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
   * Hủy phiếu kho
   */
  static async cancelDocument(documentId: string, userId: string, reason?: string): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      const docRes = await client.query(
        `SELECT id, status FROM erp.stock_documents WHERE organization_id = $1 AND id = $2 FOR UPDATE`,
        [orgId, documentId]
      );
      if (docRes.rows.length === 0) {
        throw new Error("Không tìm thấy phiếu kho!");
      }
      if (docRes.rows[0].status === "completed") {
        throw new Error("Không thể hủy phiếu kho đã hoàn tất và ghi sổ!");
      }

      await client.query(
        `UPDATE erp.stock_documents
         SET status = 'cancelled', reason = COALESCE($1::text, reason), updated_by = $2, updated_at = now()
         WHERE id = $3`,
        [reason || "Đã hủy bởi người dùng", userId, documentId]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // 6. KIỂM KÊ KHO & CÂN ĐỐI TỒN KHO (STOCKTAKE)
  // ==========================================

  /**
   * Lấy danh sách phiếu kiểm kê kho
   */
  static async listInventoryCounts(warehouseId?: string): Promise<InventoryCountDto[]> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const conditions = ["c.organization_id = $1"];
      const params: any[] = [orgId];
      if (warehouseId && warehouseId !== "all") {
        conditions.push("c.warehouse_id = $2");
        params.push(warehouseId);
      }

      const res = await client.query(`
        SELECT
          c.id,
          c.code,
          c.status,
          c.counted_at,
          c.warehouse_id,
          w.code as warehouse_code,
          w.name as warehouse_name,
          c.created_at,
          c.created_by,
          COUNT(l.id) as lines_count,
          COUNT(CASE WHEN l.actual_qty <> l.expected_qty_snapshot THEN 1 END) as discrepancy_count
        FROM erp.inventory_counts c
        JOIN erp.warehouses w ON w.id = c.warehouse_id
        LEFT JOIN erp.inventory_count_lines l ON l.count_id = c.id
        WHERE ${conditions.join(" AND ")}
        GROUP BY c.id, w.code, w.name
        ORDER BY c.created_at DESC
      `, params);

      return res.rows.map((r) => ({
        id: r.id,
        code: r.code,
        status: r.status,
        countedAt: r.counted_at,
        warehouseId: r.warehouse_id,
        warehouseCode: r.warehouse_code,
        warehouseName: r.warehouse_name,
        linesCount: parseInt(r.lines_count || "0", 10),
        discrepancyCount: parseInt(r.discrepancy_count || "0", 10),
        createdAt: r.created_at,
        createdBy: r.created_by,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Xem chi tiết phiếu kiểm kê kèm danh sách dòng
   */
  static async getInventoryCountById(countId: string): Promise<InventoryCountDto | null> {
    const client = await getDbPool().connect();
    try {
      const orgId = await this.getOrganizationId(client);
      const countRes = await client.query(`
        SELECT
          c.id,
          c.code,
          c.status,
          c.counted_at,
          c.warehouse_id,
          w.code as warehouse_code,
          w.name as warehouse_name,
          c.created_at,
          c.created_by
        FROM erp.inventory_counts c
        JOIN erp.warehouses w ON w.id = c.warehouse_id
        WHERE c.organization_id = $1 AND c.id = $2
      `, [orgId, countId]);

      if (countRes.rows.length === 0) return null;
      const count = countRes.rows[0];

      const linesRes = await client.query(`
        SELECT
          l.id,
          l.count_id,
          l.item_id,
          i.code as item_code,
          i.name as item_name,
          u.name as unit_name,
          l.lot_id,
          lot.lot_code,
          l.expected_qty_snapshot,
          l.actual_qty,
          (l.actual_qty - l.expected_qty_snapshot) as difference_qty
        FROM erp.inventory_count_lines l
        JOIN erp.items i ON i.id = l.item_id
        JOIN erp.units u ON u.id = i.base_unit_id
        JOIN erp.stock_lots lot ON lot.id = l.lot_id
        WHERE l.organization_id = $1 AND l.count_id = $2
        ORDER BY i.name ASC
      `, [orgId, countId]);

      const lines: InventoryCountLineDto[] = linesRes.rows.map((r) => ({
        id: r.id,
        countId: r.count_id,
        itemId: r.item_id,
        itemCode: r.item_code,
        itemName: r.item_name,
        unitName: r.unit_name,
        lotId: r.lot_id,
        lotCode: r.lot_code,
        expectedQtySnapshot: parseFloat(r.expected_qty_snapshot),
        actualQty: parseFloat(r.actual_qty),
        differenceQty: parseFloat(r.difference_qty),
      }));

      return {
        id: count.id,
        code: count.code,
        status: count.status,
        countedAt: count.counted_at,
        warehouseId: count.warehouse_id,
        warehouseCode: count.warehouse_code,
        warehouseName: count.warehouse_name,
        linesCount: lines.length,
        discrepancyCount: lines.filter((l) => l.differenceQty !== 0).length,
        createdAt: count.created_at,
        createdBy: count.created_by,
        lines,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Tạo phiếu kiểm kê kho mới
   */
  static async createInventoryCount(
    input: {
      warehouseId: string;
      lines: Array<{
        itemId: string;
        lotId: string;
        expectedQty?: number;
        actualQty: number;
      }>;
    },
    userId: string
  ): Promise<InventoryCountDto> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      const code = await getNextDocumentCode(client, orgId, "inventory_count", "KK");

      const countRes = await client.query(`
        INSERT INTO erp.inventory_counts(
          organization_id, code, status, warehouse_id, counted_at, created_by, updated_by
        )
        VALUES ($1, $2, 'draft', $3, now(), $4, $4)
        RETURNING id, code, status, warehouse_id, created_at
      `, [orgId, code, input.warehouseId, userId]);

      const countId = countRes.rows[0].id;

      for (const line of input.lines) {
        let lotId = line.lotId;
        if (!lotId) {
          const stdLot = await client.query(
            "SELECT id FROM erp.stock_lots WHERE organization_id = $1 AND item_id = $2 AND kind = 'standard' LIMIT 1",
            [orgId, line.itemId]
          );
          if (stdLot.rows.length > 0) {
            lotId = stdLot.rows[0].id;
          } else {
            const newLot = await client.query(
              `INSERT INTO erp.stock_lots(organization_id, lot_code, kind, item_id, created_by, updated_by)
               VALUES ($1, $2, 'standard', $3, $4, $4)
               RETURNING id`,
              [orgId, `LOT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, line.itemId, userId]
            );
            lotId = newLot.rows[0].id;
          }
        }

        const actualQty = (line as any).actualQty !== undefined
          ? Number((line as any).actualQty)
          : (line as any).countedQty !== undefined
          ? Number((line as any).countedQty)
          : 0;

        let expected = line.expectedQty;
        if (expected === undefined) {
          const balRes = await client.query(`
            SELECT COALESCE(on_hand_qty, 0) as on_hand_qty
            FROM erp.stock_balances
            WHERE organization_id = $1 AND warehouse_id = $2 AND lot_id = $3
            LIMIT 1
          `, [orgId, input.warehouseId, lotId]);
          expected = balRes.rows[0] ? parseFloat(balRes.rows[0].on_hand_qty) : 0;
        }

        await client.query(`
          INSERT INTO erp.inventory_count_lines(
            organization_id, count_id, item_id, lot_id, expected_qty_snapshot, actual_qty, created_by, updated_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        `, [orgId, countId, line.itemId, lotId, Math.max(0, expected), Math.max(0, actualQty), userId]);
      }

      await client.query("COMMIT");

      const created = await this.getInventoryCountById(countId);
      return created!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Chốt kiểm kê và tự động cân đối tồn kho (tạo phiếu điều chỉnh adjustment)
   */
  static async completeInventoryCount(countId: string, userId: string): Promise<void> {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      const countRes = await client.query(`
        SELECT id, code, warehouse_id, status
        FROM erp.inventory_counts
        WHERE organization_id = $1 AND id = $2 FOR UPDATE
      `, [orgId, countId]);

      if (countRes.rows.length === 0) throw new Error("Không tìm thấy phiếu kiểm kê!");
      const count = countRes.rows[0];
      if (count.status === "completed") throw new Error("Phiếu kiểm kê đã được chốt hoàn tất trước đó!");

      // Lấy danh sách các dòng kiểm kê
      const linesRes = await client.query(`
        SELECT
          l.id, l.item_id, l.lot_id, l.expected_qty_snapshot, l.actual_qty,
          i.base_unit_id
        FROM erp.inventory_count_lines l
        JOIN erp.items i ON i.id = l.item_id
        WHERE l.organization_id = $1 AND l.count_id = $2
      `, [orgId, countId]);

      // Nếu có chênh lệch, tạo phiếu điều chỉnh kho tự động (StockDocument adjustment)
      const diffLines = linesRes.rows.filter(
        (r) => parseFloat(r.actual_qty) !== parseFloat(r.expected_qty_snapshot)
      );

      if (diffLines.length > 0) {
        const adjCode = await getNextDocumentCode(client, orgId, "stock_document_adjustment", "DC");
        const docRes = await client.query(`
          INSERT INTO erp.stock_documents(
            organization_id, code, type, purpose, reason, status, posted_at,
            source_warehouse_id, destination_warehouse_id, created_by, updated_by
          )
          VALUES (
            $1, $2, 'adjustment', 'Điều chỉnh cân đối tồn kho sau kiểm kê',
            'Cân đối tự động theo phiếu kiểm kê ' || $3, 'draft', null,
            null, $4, $5, $5
          )
          RETURNING id
        `, [orgId, adjCode, count.code, count.warehouse_id, userId]);
        const adjDocId = docRes.rows[0].id;

        let lineNo = 1;
        for (const dl of diffLines) {
          const diff = parseFloat(dl.actual_qty) - parseFloat(dl.expected_qty_snapshot);
          const adjLineRes = await client.query(`
            INSERT INTO erp.stock_document_lines(
              organization_id, document_id, line_no, item_id, lot_id, unit_id,
              qty, factor_snapshot, base_qty, unit_cost_snapshot, created_by, updated_by
            )
            VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, 1, $7, 0, $8, $8
            )
            RETURNING id
          `, [
            orgId, adjDocId, lineNo++, dl.item_id, dl.lot_id, dl.base_unit_id,
            diff, userId
          ]);

          // Cập nhật adjustment_line_id vào inventory_count_lines
          await client.query(`
            UPDATE erp.inventory_count_lines
            SET adjustment_line_id = $1, updated_at = now(), updated_by = $2
            WHERE id = $3
          `, [adjLineRes.rows[0].id, userId, dl.id]);

          // Cập nhật stock balance
          const balCheck = await client.query(`
            SELECT id, on_hand_qty FROM erp.stock_balances
            WHERE organization_id = $1 AND warehouse_id = $2 AND lot_id = $3
          `, [orgId, count.warehouse_id, dl.lot_id]);

          if (balCheck.rows.length > 0) {
            await client.query(`
              UPDATE erp.stock_balances
              SET on_hand_qty = $1, updated_at = now(), updated_by = $2
              WHERE id = $3
            `, [Math.max(0, parseFloat(dl.actual_qty)), userId, balCheck.rows[0].id]);
          } else {
            await client.query(`
              INSERT INTO erp.stock_balances(
                organization_id, warehouse_id, item_id, lot_id, on_hand_qty, reserved_qty, created_by, updated_by, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, 0, $6, $6, now(), now())
            `, [orgId, count.warehouse_id, dl.item_id, dl.lot_id, Math.max(0, parseFloat(dl.actual_qty)), userId]);
          }
        }

        // Chuyển chứng từ điều chỉnh sang hoàn tất
        await client.query(`
          UPDATE erp.stock_documents
          SET status = 'completed', posted_at = now(), updated_at = now(), updated_by = $1
          WHERE id = $2
        `, [userId, adjDocId]);
      }

      // Đánh dấu hoàn tất phiếu kiểm kê
      await client.query(`
        UPDATE erp.inventory_counts
        SET status = 'completed', counted_at = now(), updated_by = $1, updated_at = now()
        WHERE id = $2
      `, [userId, countId]);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Nhập tồn kho hàng loạt từ file Excel theo kho đã chọn:
   * - Nếu mã vật tư chưa tồn tại: Tự động tạo mới vật tư (theo phân loại NVL hoặc Thành phẩm)
   * - Nếu đơn vị tính chưa có: Tự động tạo mới đơn vị tính
   * - Tạo / lấy Standard Lot của mặt hàng
   * - Cập nhật / Ghi nhận số dư tồn kho (on_hand_qty = Tồn đầu kỳ)
   */
  static async importStocksFromExcel(
    rows: Array<Record<string, any>>,
    defaultWarehouseId: string,
    userId: string
  ): Promise<{
    successCount: number;
    createdItemsCount: number;
    updatedCount: number;
    errors: string[];
  }> {
    const client = await getDbPool().connect();
    let successCount = 0;
    let createdItemsCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    try {
      await client.query("BEGIN");
      const orgId = await this.getOrganizationId(client);

      // 1. Lấy danh mục kho
      const whRes = await client.query(
        "SELECT id, code, name FROM erp.warehouses WHERE organization_id = $1",
        [orgId]
      );
      const whMapByCode: Record<string, string> = {};
      const whMapById: Record<string, string> = {};
      whRes.rows.forEach((w) => {
        whMapByCode[w.code.toUpperCase()] = w.id;
        whMapById[w.id] = w.id;
      });

      // 2. Lấy danh mục đơn vị tính
      const uRes = await client.query(
        "SELECT id, code, name FROM erp.units WHERE organization_id = $1",
        [orgId]
      );
      const unitMapByName: Record<string, string> = {};
      const unitMapByCode: Record<string, string> = {};
      uRes.rows.forEach((u) => {
        unitMapByName[u.name.trim().toLowerCase()] = u.id;
        unitMapByCode[u.code.trim().toUpperCase()] = u.id;
      });

      // 3. Lấy danh mục loại vật tư (category)
      const catRes = await client.query(
        "SELECT id, code, name FROM erp.item_categories WHERE organization_id = $1",
        [orgId]
      );
      const catMapByCode: Record<string, string> = {};
      catRes.rows.forEach((c) => {
        catMapByCode[c.code.toUpperCase()] = c.id;
      });
      let defaultCatId = catRes.rows[0]?.id;
      if (!defaultCatId) {
        const newCatRes = await client.query(
          `INSERT INTO erp.item_categories(organization_id, code, name, created_by, updated_by)
           VALUES($1, 'KHAC', 'Vật tư khác', $2, $2) RETURNING id`,
          [orgId, userId]
        );
        defaultCatId = newCatRes.rows[0].id;
      }

      // Xử lý từng dòng Excel
      let rowIdx = 1;
      for (const row of rows) {
        rowIdx++;
        try {
          const rawItemCode = (row["Mã vật tư"] || row["Mã hàng"] || row["itemCode"] || "").toString().trim();
          const rawItemName = (row["Tên vật tư"] || row["Tên hàng"] || row["itemName"] || "").toString().trim();
          const rawUnit = (row["Đơn vị tính"] || row["ĐVT"] || row["unit"] || "").toString().trim();
          const rawWhCode = (row["Mã kho"] || row["warehouseCode"] || "").toString().trim().toUpperCase();
          const rawQty = row["Tồn đầu kỳ"] ?? row["Số lượng"] ?? row["Tồn kho"] ?? row["onHandQty"] ?? 0;
          const onHandQty = parseFloat(String(rawQty).replace(/,/g, "")) || 0;
          const rawCost = row["Đơn giá vốn"] ?? row["Đơn giá"] ?? row["cost"] ?? 0;
          const unitCost = parseFloat(String(rawCost).replace(/,/g, "")) || 0;
          const rawKind = (row["Phân loại"] || row["Loại"] || row["kind"] || "").toString().trim().toLowerCase();
          const binLabel = (row["Vị trí kệ"] || row["binLabel"] || "").toString().trim() || "Chưa xếp kệ";
          const rawMinQty = row["Tồn an toàn"] ?? row["minQty"] ?? 0;
          const minQty = parseFloat(String(rawMinQty).replace(/,/g, "")) || 0;

          if (!rawItemName && !rawItemCode) {
            continue; // Bỏ qua dòng trống
          }

          // Xác định kho đích
          let targetWarehouseId = defaultWarehouseId;
          if (rawWhCode && whMapByCode[rawWhCode]) {
            targetWarehouseId = whMapByCode[rawWhCode];
          }
          if (!targetWarehouseId || targetWarehouseId === "all") {
            const firstWh = whRes.rows[0]?.id;
            if (!firstWh) {
              throw new Error("Hệ thống chưa có kho nào để nhập tồn!");
            }
            targetWarehouseId = firstWh;
          }

          // Xác định Đơn vị tính: nếu chưa có thì tự động tạo mới
          let unitId = "";
          if (rawUnit) {
            const lowUnit = rawUnit.toLowerCase();
            const upUnit = rawUnit.toUpperCase();
            if (unitMapByName[lowUnit]) {
              unitId = unitMapByName[lowUnit];
            } else if (unitMapByCode[upUnit]) {
              unitId = unitMapByCode[upUnit];
            } else {
              // Tự động tạo mới đơn vị tính
              const insUnit = await client.query(
                `INSERT INTO erp.units(organization_id, code, name, dimension, created_by, updated_by)
                 VALUES($1, $2, $3, 'count', $4, $4) RETURNING id`,
                [orgId, upUnit.slice(0, 15), rawUnit, userId]
              );
              unitId = insUnit.rows[0].id;
              unitMapByName[lowUnit] = unitId;
              unitMapByCode[upUnit] = unitId;
            }
          } else {
            // Mặc định đơn vị đầu tiên
            unitId = Object.values(unitMapByName)[0] || "";
            if (!unitId) {
              const insUnit = await client.query(
                `INSERT INTO erp.units(organization_id, code, name, dimension, created_by, updated_by)
                 VALUES($1, 'CAI', 'Cái', 'count', $2, $2) RETURNING id`,
                [orgId, userId]
              );
              unitId = insUnit.rows[0].id;
            }
          }

          // Xác định phân loại: NVL (material), Thành phẩm (product), Bán thành phẩm (semi_finished)
          let kind: "material" | "product" | "semi_finished" = "material";
          if (rawKind.includes("thành phẩm") || rawKind.includes("product")) {
            kind = "product";
          } else if (rawKind.includes("bán thành phẩm") || rawKind.includes("semi")) {
            kind = "semi_finished";
          }

          // Kiểm tra xem Item đã tồn tại chưa
          let itemId = "";
          const itemCode = rawItemCode ? rawItemCode.toUpperCase() : `VT-${Date.now().toString().slice(-6)}`;
          const itemName = rawItemName || itemCode;

          const existingItem = await client.query(
            "SELECT id, code, base_unit_id FROM erp.items WHERE organization_id = $1 AND (code = $2 OR name = $3) LIMIT 1",
            [orgId, itemCode, itemName]
          );

          if (existingItem.rows.length > 0) {
            itemId = existingItem.rows[0].id;
          } else {
            // TỰ ĐỘNG TẠO MỚI MẶT HÀNG / THÀNH PHẨM
            const insItem = await client.query(
              `INSERT INTO erp.items(
                 organization_id, code, name, kind, category_id, base_unit_id,
                 specification, is_active, created_by, updated_by
               )
               VALUES($1, $2, $3, $4, $5, $6, '{}'::jsonb, true, $7, $7)
               RETURNING id`,
              [orgId, itemCode, itemName, kind === "semi_finished" ? "product" : kind, defaultCatId, unitId, userId]
            );
            itemId = insItem.rows[0].id;
            createdItemsCount++;
          }

          // Lấy hoặc tạo Standard Lot
          let lotId = "";
          const lotRes = await client.query(
            "SELECT id FROM erp.stock_lots WHERE organization_id = $1 AND item_id = $2 AND kind = 'standard' LIMIT 1",
            [orgId, itemId]
          );
          if (lotRes.rows.length > 0) {
            lotId = lotRes.rows[0].id;
          } else {
            const insLot = await client.query(
              `INSERT INTO erp.stock_lots(organization_id, lot_code, kind, item_id, created_by, updated_by)
               VALUES($1, $2, 'standard', $3, $4, $4) RETURNING id`,
              [orgId, `${itemCode}-STD`, itemId, userId]
            );
            lotId = insLot.rows[0].id;
          }

          // Cài đặt vị trí kệ và tồn an toàn
          await client.query(
            `INSERT INTO erp.warehouse_item_settings(
               organization_id, warehouse_id, item_id, min_qty, bin_label, created_by, updated_by
             )
             VALUES($1, $2, $3, $4, $5, $6, $6)
             ON CONFLICT (organization_id, warehouse_id, item_id)
             DO UPDATE SET
               min_qty = EXCLUDED.min_qty,
               bin_label = EXCLUDED.bin_label,
               updated_at = now()`,
            [orgId, targetWarehouseId, itemId, minQty, binLabel, userId]
          );

          // Cập nhật số dư tồn kho (stock_balances)
          const invValue = onHandQty * unitCost;
          const balRes = await client.query(
            `INSERT INTO erp.stock_balances(
               organization_id, warehouse_id, item_id, lot_id, on_hand_qty, reserved_qty, inventory_value, created_by, updated_by
             )
             VALUES($1, $2, $3, $4, $5, 0, $6, $7, $7)
             ON CONFLICT (organization_id, warehouse_id, item_id, lot_id)
             DO UPDATE SET
               on_hand_qty = EXCLUDED.on_hand_qty,
               inventory_value = EXCLUDED.inventory_value,
               updated_by = $7,
               updated_at = now()
             RETURNING (xmax = 0) AS is_insert`,
            [orgId, targetWarehouseId, itemId, lotId, onHandQty, invValue, userId]
          );

          if (balRes.rows[0]?.is_insert) {
            successCount++;
          } else {
            updatedCount++;
            successCount++;
          }
        } catch (lineErr: any) {
          errors.push(`Dòng ${rowIdx}: ${lineErr.message || String(lineErr)}`);
        }
      }

      await client.query("COMMIT");
      return {
        successCount,
        createdItemsCount,
        updatedCount,
        errors,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

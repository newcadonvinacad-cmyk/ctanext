import { getDbPool } from "./authorization.service";
import { InventoryApiError } from "@/lib/inventory-error";
import type { CatalogItemInput, WarehouseInput } from "@/lib/inventory-validation";
import type { CatalogItem } from "@/types/inventory-catalog";

export class InventoryCatalogService {
  static async listItems(orgId: string): Promise<CatalogItem[]> {
    const result = await getDbPool().query(
      `SELECT i.id,i.code,i.name,i.kind,i.category_id AS "categoryId",c.name AS "categoryName",
        i.base_unit_id AS "baseUnitId",u.name AS "baseUnitName",i.specification AS "specJson",i.is_active AS "isActive",
        COALESCE((SELECT json_agg(json_build_object('unitId',v.unit_id,'unitName',cu.name,'factorToBase',v.factor_to_base))
          FROM erp.item_unit_conversions v JOIN erp.units cu ON cu.id=v.unit_id AND cu.organization_id=v.organization_id
          WHERE v.organization_id=i.organization_id AND v.item_id=i.id AND v.valid_from<=now()
          AND (v.valid_to IS NULL OR v.valid_to>now())), '[]') AS conversions
       FROM erp.items i LEFT JOIN erp.item_categories c ON c.id=i.category_id AND c.organization_id=i.organization_id
       JOIN erp.units u ON u.id=i.base_unit_id AND u.organization_id=i.organization_id
       WHERE i.organization_id=$1 ORDER BY i.code`, [orgId]);
    return result.rows;
  }

  static async saveItem(orgId: string, userId: string, data: CatalogItemInput, id?: string) {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      if (id) {
        const existing = await client.query("SELECT code,base_unit_id,kind FROM erp.items WHERE organization_id=$1 AND id=$2 FOR UPDATE", [orgId,id]);
        if (!existing.rows[0]) throw new InventoryApiError("Không tìm thấy vật tư",404);
        // Identity and base unit are immutable: past quantities and references must retain their meaning.
        const old = existing.rows[0];
        if (old.code !== data.code || old.base_unit_id !== data.baseUnitId || old.kind !== data.kind) {
          throw new InventoryApiError("Không được đổi mã, tính chất hoặc đơn vị gốc của vật tư đã tạo",409);
        }
        await client.query(`UPDATE erp.items SET name=$3,category_id=$4,specification=$5,is_active=$6,updated_by=$7
          WHERE organization_id=$1 AND id=$2`, [orgId,id,data.name,data.categoryId,JSON.stringify(data.specJson),data.isActive,userId]);
      } else {
        const result = await client.query(`INSERT INTO erp.items
          (organization_id,code,name,kind,category_id,base_unit_id,specification,is_active,track_stock,created_by,updated_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING id`,
          [orgId,data.code,data.name,data.kind,data.categoryId,data.baseUnitId,JSON.stringify(data.specJson),data.isActive,data.kind!=='service',userId]);
        id = result.rows[0].id;
        if (data.kind !== "service") await client.query(`INSERT INTO erp.stock_lots
          (organization_id,lot_code,kind,item_id,created_by,updated_by) VALUES($1,$2,'standard',$3,$4,$4)`,[orgId,`${data.code}-STD`,id,userId]);
      }
      // Preserve conversion history; only replace entries whose value actually changed.
      const current = await client.query(`SELECT id,unit_id,factor_to_base FROM erp.item_unit_conversions
        WHERE organization_id=$1 AND item_id=$2 AND valid_to IS NULL FOR UPDATE`,[orgId,id]);
      for (const row of current.rows) {
        const next = data.conversions.find(c => c.unitId === row.unit_id);
        if (!next || next.factorToBase !== Number(row.factor_to_base)) {
          await client.query("UPDATE erp.item_unit_conversions SET valid_to=clock_timestamp(),updated_by=$2 WHERE id=$1",[row.id,userId]);
        }
      }
      for (const next of data.conversions) {
        if (!current.rows.some(r => r.unit_id===next.unitId && Number(r.factor_to_base)===next.factorToBase)) {
          await client.query(`INSERT INTO erp.item_unit_conversions (organization_id,item_id,unit_id,factor_to_base,created_by,updated_by,valid_from)
            VALUES($1,$2,$3,$4,$5,$5,clock_timestamp())`,[orgId,id,next.unitId,next.factorToBase,userId]);
        }
      }
      await client.query("COMMIT");
      return id;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  static async saveLookup(orgId: string, userId: string, kind: "categories" | "units", data: {code:string;name:string;dimension?:string}, id?: string) {
    const table = kind === "categories" ? "erp.item_categories" : "erp.units";
    const params = [orgId,data.code,data.name,userId,...(kind === "units" ? [data.dimension] : [])];
    const dimension = kind === "units" ? ",dimension=$5" : "";
    const sql = id
      ? `UPDATE ${table} SET code=$2,name=$3,updated_by=$4${dimension} WHERE organization_id=$1 AND id=$${params.length+1} RETURNING id`
      : `INSERT INTO ${table}(organization_id,code,name,created_by,updated_by${kind==='units'?',dimension':''})
         VALUES($1,$2,$3,$4,$4${kind==='units'?',$5':''}) RETURNING id`;
    const result = await getDbPool().query(sql, id ? [...params,id] : params);
    if (!result.rows[0]) throw new InventoryApiError("Không tìm thấy danh mục",404);
    return result.rows[0].id;
  }

  static async deleteLookup(orgId:string, kind:"categories"|"units", id:string) {
    const table = kind === "categories" ? "erp.item_categories" : "erp.units";
    const result = await getDbPool().query(`DELETE FROM ${table} WHERE organization_id=$1 AND id=$2 RETURNING id`,[orgId,id]);
    if (!result.rows[0]) throw new InventoryApiError("Không tìm thấy danh mục",404);
  }

  static async saveWarehouse(orgId:string,userId:string,data:WarehouseInput,id?:string) {
    const client = await getDbPool().connect();
    try {
      await client.query("BEGIN");
      if (id) {
        const existing = await client.query("SELECT id FROM erp.warehouses WHERE organization_id=$1 AND id=$2 FOR UPDATE",[orgId,id]);
        if (!existing.rows[0]) throw new InventoryApiError("Không tìm thấy kho",404);
        if (!data.isActive) {
          const busy = await client.query(`SELECT EXISTS(SELECT 1 FROM erp.stock_balances WHERE organization_id=$1 AND warehouse_id=$2
            AND (on_hand_qty<>0 OR reserved_qty<>0)) OR EXISTS(SELECT 1 FROM erp.stock_documents WHERE organization_id=$1
            AND (source_warehouse_id=$2 OR destination_warehouse_id=$2) AND status IN ('draft','submitted','approved','dispatched')) AS busy`,[orgId,id]);
          if (busy.rows[0].busy) throw new InventoryApiError("Kho còn tồn, hàng giữ chỗ hoặc phiếu chưa hoàn tất; chưa thể ngừng sử dụng",409);
        }
        await client.query(`UPDATE erp.warehouses SET code=$3,name=$4,kind=$5,is_active=$6,updated_by=$7
          WHERE organization_id=$1 AND id=$2`,[orgId,id,data.code,data.name,data.type,data.isActive,userId]);
      } else {
        const result = await client.query(`INSERT INTO erp.warehouses(organization_id,code,name,kind,is_active,created_by,updated_by)
          VALUES($1,$2,$3,$4,$5,$6,$6) RETURNING id`,[orgId,data.code,data.name,data.type,data.isActive,userId]);
        id=result.rows[0].id;
      }
      await client.query("COMMIT"); return id;
    } catch(error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  static async deleteWarehouse(orgId:string,id:string) {
    // FK RESTRICT also protects documents, movements, assignments, settings and concurrent references.
    const result = await getDbPool().query("DELETE FROM erp.warehouses WHERE organization_id=$1 AND id=$2 RETURNING id",[orgId,id]);
    if (!result.rows[0]) throw new InventoryApiError("Không tìm thấy kho",404);
  }
}

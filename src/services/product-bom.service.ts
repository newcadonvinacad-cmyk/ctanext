import type { PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import { requireCapability, transaction, once, WorkflowError, type WorkflowContext } from '@/lib/production/context';
import { canonicalJson, validateDefinitions, validateParameterValues, validateProductBomLines, type ProductBomCatalogItem, type ProductBomSample } from '@/lib/product-bom';

type Db = Pick<PoolClient,'query'>;
export class ProductBomService {
  static async surveyCatalog(ctx: WorkflowContext) {
    if(!['item.read','project.read','customer.read','quotation.read'].some(k=>ctx.capabilities[k as keyof typeof ctx.capabilities]?.isEnabled))throw new WorkflowError('Không có quyền xem danh mục thành phẩm khảo sát',403);
    const db=getDbPool();
    return {catalog:(await this.catalog(db,ctx.orgId)).filter(i=>i.kind==='product'),schemas:(await db.query('SELECT id,product_item_id AS "productItemId",version,definitions FROM erp.product_parameter_schemas WHERE organization_id=$1',[ctx.orgId])).rows};
  }
  static async catalog(db: Db, orgId: string): Promise<ProductBomCatalogItem[]> {
    const r = await db.query(`SELECT i.id,i.code,i.name,i.kind,i.base_unit_id,u.name AS unit_name,
      s.id AS schema_id,s.version,s.definitions,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.unit_id,'name',cu.name,'factor',c.factor_to_base))
       FROM erp.item_unit_conversions c JOIN erp.units cu ON cu.organization_id=c.organization_id AND cu.id=c.unit_id
       WHERE c.organization_id=i.organization_id AND c.item_id=i.id AND c.unit_id<>i.base_unit_id AND c.valid_from<=now() AND (c.valid_to IS NULL OR c.valid_to>now())),'[]') AS conversions
      FROM erp.items i JOIN erp.units u ON u.organization_id=i.organization_id AND u.id=i.base_unit_id
      LEFT JOIN LATERAL (SELECT * FROM erp.product_parameter_schemas s WHERE s.organization_id=i.organization_id AND s.product_item_id=i.id ORDER BY s.version DESC LIMIT 1) s ON true
      WHERE i.organization_id=$1 AND i.is_active AND (i.kind IN ('product','service') OR (i.kind='material' AND i.track_stock)) ORDER BY i.code`,[orgId]);
    return r.rows.map(r=>({id:r.id,code:r.code,name:r.name,kind:r.kind,baseUnitId:r.base_unit_id,
      units:[{id:r.base_unit_id,name:r.unit_name,factor:1},...r.conversions.map((u:any)=>({...u,factor:Number(u.factor)}))],
      schemaId:r.schema_id,schemaVersion:r.version,definitions:r.definitions || []}));
  }
  static async saveSchema(db: Db, orgId: string, itemId: string, input: unknown, userId: string) {
    const definitions=validateDefinitions(input);
    const item=(await db.query('SELECT kind FROM erp.items WHERE organization_id=$1 AND id=$2 FOR UPDATE',[orgId,itemId])).rows[0];
    if(item?.kind!=='product') throw new WorkflowError('Thông số BOM chỉ được khai báo cho thành phẩm');
    const old=(await db.query('SELECT * FROM erp.product_parameter_schemas WHERE organization_id=$1 AND product_item_id=$2 ORDER BY version DESC LIMIT 1',[orgId,itemId])).rows[0];
    if(old && canonicalJson(old.definitions)===canonicalJson(definitions))return old;
    return (await db.query('INSERT INTO erp.product_parameter_schemas(organization_id,product_item_id,version,definitions,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *',[orgId,itemId,(old?.version || 0)+1,JSON.stringify(definitions),userId])).rows[0];
  }
  static async schema(db: Db, orgId: string, itemId: string, schemaId?: string) {
    const schema=(await db.query(`SELECT s.* FROM erp.product_parameter_schemas s JOIN erp.items i ON i.organization_id=s.organization_id AND i.id=s.product_item_id
      WHERE s.organization_id=$1 AND s.product_item_id=$2 AND i.kind='product' AND i.is_active AND ($3::uuid IS NULL OR s.id=$3) ORDER BY s.version DESC LIMIT 1`,[orgId,itemId,schemaId || null])).rows[0];
    if(!schema)throw new WorkflowError('Thành phẩm chưa có bộ thông số. Khai báo khi sửa thành phẩm trước.');
    return schema;
  }
  static sample(r:any): ProductBomSample {
    return {id:r.id,productItemId:r.product_item_id,schemaId:r.schema_id,name:r.name,status:r.status,parameterValues:r.parameter_values,lines:r.lines,version:r.version,legacySource:r.legacy_source,notes:r.notes};
  }
  static async list(ctx: WorkflowContext) {
    requireCapability(ctx,'item.read');
    const db=getDbPool();
    const [catalog,samples,schemas]=await Promise.all([
      this.catalog(db,ctx.orgId),
      db.query('SELECT * FROM erp.product_bom_samples WHERE organization_id=$1 ORDER BY created_at DESC',[ctx.orgId]),
      db.query('SELECT id,product_item_id AS "productItemId",version,definitions FROM erp.product_parameter_schemas WHERE organization_id=$1',[ctx.orgId])
    ]);
    return {catalog,samples:samples.rows.map(this.sample),schemas:schemas.rows};
  }
  static async saveSample(ctx:WorkflowContext,input:any) {
    requireCapability(ctx,'item.update');
    return transaction(ctx,db=>once(db,ctx,input.requestId,'product-bom.save',input,async()=>{
      const schema=await this.schema(db,ctx.orgId,input.productItemId,input.schemaId);
      const values=validateParameterValues(schema.definitions,input.parameterValues);
      const lines=validateProductBomLines(input.lines,await this.catalog(db,ctx.orgId));
      if(!input.name?.trim() || input.name.length>200)throw new WorkflowError('Nhập tên BOM mẫu (tối đa 200 ký tự)');
      const status=input.confirm ? 'confirmed':'draft';
      await db.query('SELECT id FROM erp.items WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,input.productItemId]);
      if(input.confirm && (await db.query("SELECT id FROM erp.product_bom_samples WHERE organization_id=$1 AND product_item_id=$2 AND schema_id=$3 AND parameter_values=$4::jsonb AND status='confirmed'",[ctx.orgId,input.productItemId,schema.id,JSON.stringify(values)])).rows.length)throw new WorkflowError('Bộ giá trị này đã có BOM mẫu xác nhận. Đổi thông số hoặc ngừng sử dụng mẫu cũ trước.',409);
      let row;
      if(input.id){
        const old=(await db.query('SELECT * FROM erp.product_bom_samples WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,input.id])).rows[0];
        if(!old || old.status!=='draft' || old.version!==input.version || old.product_item_id!==input.productItemId)throw new WorkflowError('BOM mẫu đã đổi hoặc đã chốt; sao chép thành mẫu mới để sửa',409);
        row=(await db.query(`UPDATE erp.product_bom_samples SET schema_id=$1,name=$2,parameter_values=$3,lines=$4,status=$5,notes=$6,version=version+1,updated_by=$7,updated_at=now() WHERE organization_id=$8 AND id=$9 RETURNING *`,[schema.id,input.name.trim(),JSON.stringify(values),JSON.stringify(lines),status,String(input.notes || '').slice(0,4000),ctx.userId,ctx.orgId,input.id])).rows[0];
      }else row=(await db.query(`INSERT INTO erp.product_bom_samples(organization_id,product_item_id,schema_id,name,parameter_values,lines,status,notes,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,[ctx.orgId,input.productItemId,schema.id,input.name.trim(),JSON.stringify(values),JSON.stringify(lines),status,String(input.notes || '').slice(0,4000),ctx.userId])).rows[0];
      return {sample:this.sample(row)};
    }));
  }
  static async archive(ctx:WorkflowContext,input:any) {
    requireCapability(ctx,'item.update');
    return transaction(ctx,db=>once(db,ctx,input.requestId,'product-bom.archive',input,async()=>{
      const r=await db.query("UPDATE erp.product_bom_samples SET status='archived',version=version+1,updated_by=$1,updated_at=now() WHERE organization_id=$2 AND id=$3 AND version=$4 RETURNING id",[ctx.userId,ctx.orgId,input.id,input.version]);
      if(!r.rows.length)throw new WorkflowError('Mẫu đã thay đổi hoặc không tồn tại',409);
      return {id:input.id};
    }));
  }
}

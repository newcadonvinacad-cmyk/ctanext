import { NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { InventoryCatalogService } from "@/services/inventory-catalog.service";
import { inventoryActor, inventoryError, allowedWarehouseIds } from "@/lib/inventory-api";
import { warehouseSchema } from "@/lib/inventory-validation";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const actor = await inventoryActor(["inventory.read", "stock_document.read", "company_setting.update"]);
    const canViewCost = !!actor.capabilities["item.cost_read"]?.isEnabled;
    const all = await InventoryService.listWarehouses({ canViewCost });
    const allowed = new Set(await allowedWarehouseIds(actor.userId, actor.orgId));
    const manage = !!actor.capabilities["company_setting.update"]?.isEnabled;
    const warehouses = all.filter(w => manage || allowed.has(w.id)).map(w =>
      allowed.has(w.id) ? w : { ...w, totalSku: 0, totalOnHand: 0, totalValue: 0 });
    return NextResponse.json({ warehouses });
  } catch (error) { return inventoryError(error); }
}
export async function POST(req: Request) {
  try {
    const actor = await inventoryActor(["company_setting.update"]);
    const id = await InventoryCatalogService.saveWarehouse(actor.orgId, actor.userId, warehouseSchema.parse(await req.json()));
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { return inventoryError(error); }
}

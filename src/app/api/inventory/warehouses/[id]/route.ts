import { NextResponse } from "next/server";
import { inventoryActor, inventoryError } from "@/lib/inventory-api";
import { warehouseSchema } from "@/lib/inventory-validation";
import { InventoryCatalogService } from "@/services/inventory-catalog.service";
type Context = { params: Promise<{ id: string }> };
export async function PUT(req: Request, { params }: Context) {
  try {
    const actor = await inventoryActor(["company_setting.update"]);
    const { id } = await params;
    await InventoryCatalogService.saveWarehouse(actor.orgId,actor.userId,warehouseSchema.parse(await req.json()),id);
    return NextResponse.json({ success: true });
  } catch (error) { return inventoryError(error); }
}
export async function DELETE(req: Request, { params }: Context) {
  try {
    const actor = await inventoryActor(["company_setting.update"]);
    await InventoryCatalogService.deleteWarehouse(actor.orgId,(await params).id);
    return NextResponse.json({ success: true });
  } catch (error) { return inventoryError(error); }
}

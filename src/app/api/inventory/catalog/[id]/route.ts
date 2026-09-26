import { NextResponse } from "next/server";
import { inventoryActor, inventoryError } from "@/lib/inventory-api";
import { catalogItemSchema } from "@/lib/inventory-validation";
import { InventoryCatalogService } from "@/services/inventory-catalog.service";
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await inventoryActor(["item.update"]);
    const { id } = await params;
    await InventoryCatalogService.saveItem(actor.orgId, actor.userId, catalogItemSchema.parse(await req.json()), id);
    return NextResponse.json({ success: true });
  } catch (error) { return inventoryError(error); }
}

import { NextResponse } from "next/server";
import { inventoryActor, inventoryError } from "@/lib/inventory-api";
import { catalogItemSchema } from "@/lib/inventory-validation";
import { InventoryCatalogService } from "@/services/inventory-catalog.service";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const actor = await inventoryActor(["item.read"]);
    return NextResponse.json({ items: await InventoryCatalogService.listItems(actor.orgId) });
  } catch (error) { return inventoryError(error); }
}
export async function POST(req: Request) {
  try {
    const actor = await inventoryActor(["item.create"]);
    const data = catalogItemSchema.parse(await req.json());
    const id = await InventoryCatalogService.saveItem(actor.orgId, actor.userId, data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { return inventoryError(error); }
}

import { NextResponse } from "next/server";
import { inventoryActor, inventoryError, InventoryApiError } from "@/lib/inventory-api";
import { categorySchema, unitSchema } from "@/lib/inventory-validation";
import { InventoryCatalogService } from "@/services/inventory-catalog.service";
type Context = { params: Promise<{ kind: string; id: string }> };
export async function PUT(req: Request, { params }: Context) {
  try {
    const actor = await inventoryActor(["item.update"]);
    const { kind,id } = await params;
    if (kind !== "categories" && kind !== "units") throw new InventoryApiError("Không tìm thấy danh mục",404);
    const data = (kind === "units" ? unitSchema : categorySchema).parse(await req.json());
    await InventoryCatalogService.saveLookup(actor.orgId,actor.userId,kind,data,id);
    return NextResponse.json({ success: true });
  } catch (error) { return inventoryError(error); }
}
export async function DELETE(req: Request, { params }: Context) {
  try {
    const actor = await inventoryActor(["item.update"]);
    const { kind,id } = await params;
    if (kind !== "categories" && kind !== "units") throw new InventoryApiError("Không tìm thấy danh mục",404);
    await InventoryCatalogService.deleteLookup(actor.orgId,kind,id);
    return NextResponse.json({ success: true });
  } catch (error) { return inventoryError(error); }
}

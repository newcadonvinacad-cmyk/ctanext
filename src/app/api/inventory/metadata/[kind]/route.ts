import { NextResponse } from "next/server";
import { inventoryActor, inventoryError, InventoryApiError } from "@/lib/inventory-api";
import { categorySchema, unitSchema } from "@/lib/inventory-validation";
import { InventoryCatalogService } from "@/services/inventory-catalog.service";
export async function POST(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const actor = await inventoryActor(["item.create"]);
    const { kind } = await params;
    if (kind !== "categories" && kind !== "units") throw new InventoryApiError("Không tìm thấy danh mục",404);
    const data = (kind === "units" ? unitSchema : categorySchema).parse(await req.json());
    const id = await InventoryCatalogService.saveLookup(actor.orgId,actor.userId,kind,data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { return inventoryError(error); }
}

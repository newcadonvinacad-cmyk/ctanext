import { NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { inventoryActor, inventoryError, allowedWarehouseIds, InventoryApiError } from "@/lib/inventory-api";
export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await inventoryActor(["inventory.read", "stock_document.read"]);
    const { id } = await params;
    const ids = await allowedWarehouseIds(actor.userId, actor.orgId);
    if (id !== "all" && !ids.includes(id)) throw new InventoryApiError("Bạn không có quyền xem kho này",403);
    const query = new URL(req.url).searchParams;
    const stocks = ids.length ? await InventoryService.getWarehouseStock(id === "all" ? undefined : id,
      { keyword: query.get("keyword") || undefined, onlyLowStock: query.get("onlyLowStock")==="true", warehouseIds: ids },
      { canViewCost: !!actor.capabilities["item.cost_read"]?.isEnabled }) : [];
    return NextResponse.json({ stocks });
  } catch (error) { return inventoryError(error); }
}

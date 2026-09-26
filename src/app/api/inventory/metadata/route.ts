import { NextResponse } from "next/server";
import { inventoryActor, inventoryError } from "@/lib/inventory-api";
import { InventoryService } from "@/services/inventory.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await inventoryActor(["item.read", "item.create", "item.update", "stock_document.read"]);

    const [categories, units] = await Promise.all([
      InventoryService.listCategories(),
      InventoryService.listUnits(),
    ]);

    return NextResponse.json({ categories, units });
  } catch (err: any) {
    return inventoryError(err);
  }
}

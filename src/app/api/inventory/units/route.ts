import { NextResponse } from "next/server";
import { inventoryActor, inventoryError } from "@/lib/inventory-api";
import { InventoryService } from "@/services/inventory.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await inventoryActor(["item.read", "item.create", "item.update", "stock_document.read"]);
    const units = await InventoryService.listUnits();
    return NextResponse.json({ units });
  } catch (err: any) {
    return inventoryError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await inventoryActor(["item.create", "company_setting.update"]);
    const body = await req.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Vui lòng nhập mã và tên đơn vị tính" }, { status: 400 });
    }
    const result = await InventoryService.createUnit(
      { code: body.code, name: body.name, dimension: body.dimension },
      actor.userId
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return inventoryError(err);
  }
}

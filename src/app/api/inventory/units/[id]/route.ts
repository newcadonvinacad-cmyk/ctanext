import { NextResponse } from "next/server";
import { inventoryActor, inventoryError } from "@/lib/inventory-api";
import { InventoryService } from "@/services/inventory.service";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await inventoryActor(["item.update", "company_setting.update"]);
    const body = await req.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Vui lòng nhập mã và tên đơn vị tính" }, { status: 400 });
    }
    await InventoryService.updateUnit(
      id,
      { code: body.code, name: body.name, dimension: body.dimension },
      actor.userId
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return inventoryError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await inventoryActor(["item.delete", "company_setting.update"]);
    await InventoryService.deleteUnit(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return inventoryError(err);
  }
}

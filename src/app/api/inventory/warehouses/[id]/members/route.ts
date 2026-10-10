import { NextResponse } from "next/server";
import { IamService } from "@/services/iam.service";
import { inventoryActor, inventoryError } from "@/lib/inventory-api";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await inventoryActor(["inventory.read", "company_setting.update"]);
    const { id } = await params;
    const members = await IamService.listWarehouseMembers(id);
    return NextResponse.json({ members });
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await inventoryActor(["company_setting.update"]);
    const { id } = await params;
    const body = await req.json();
    if (!body.membershipId) {
      return NextResponse.json({ error: "membershipId là bắt buộc" }, { status: 400 });
    }
    const result = await IamService.assignWarehouseMember({
      warehouseId: id,
      membershipId: body.membershipId,
      validFrom: body.validFrom,
      validTo: body.validTo,
      createdBy: actor.userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await inventoryActor(["company_setting.update"]);
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId là bắt buộc" }, { status: 400 });
    }
    await IamService.removeWarehouseMember(memberId, actor.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return inventoryError(error);
  }
}

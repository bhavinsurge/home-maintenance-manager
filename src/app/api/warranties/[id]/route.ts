import { NextRequest } from "next/server";
import { deleteWarranty, updateWarranty } from "@/services/maintenance-service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return updateWarranty(request, id);
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return deleteWarranty(request, id);
}

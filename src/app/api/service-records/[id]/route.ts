import { NextRequest } from "next/server";
import {
  deleteServiceRecord,
  updateServiceRecord,
} from "@/services/maintenance-service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return updateServiceRecord(request, id);
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return deleteServiceRecord(request, id);
}

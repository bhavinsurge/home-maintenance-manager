import { NextRequest } from "next/server";
import { deactivateSchedule, updateSchedule } from "@/services/maintenance-service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return updateSchedule(request, id);
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return deactivateSchedule(request, id);
}

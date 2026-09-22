import { NextRequest } from "next/server";
import {
  deleteHousehold,
  getHousehold,
  updateHousehold,
} from "@/services/household-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return getHousehold(request, id);
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return updateHousehold(request, id);
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return deleteHousehold(request, id);
}

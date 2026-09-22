import { NextRequest } from "next/server";
import { deleteAsset, getAsset, updateAsset } from "@/services/asset-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return getAsset(request, id);
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return updateAsset(request, id);
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return deleteAsset(request, id);
}

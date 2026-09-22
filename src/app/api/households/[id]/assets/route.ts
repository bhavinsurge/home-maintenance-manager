import { NextRequest } from "next/server";
import { createAsset, listAssets } from "@/services/asset-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return listAssets(request, id);
}

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return createAsset(request, id);
}

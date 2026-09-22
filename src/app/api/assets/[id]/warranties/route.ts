import { NextRequest } from "next/server";
import { createWarranty, listWarranties } from "@/services/maintenance-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return listWarranties(request, id);
}

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return createWarranty(request, id);
}

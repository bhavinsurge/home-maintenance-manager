import { NextRequest } from "next/server";
import { getDashboard } from "@/services/dashboard-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return getDashboard(request, id);
}

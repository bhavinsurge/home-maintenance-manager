import { NextRequest } from "next/server";
import { markNotificationRead } from "@/services/dashboard-service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return markNotificationRead(request, id);
}

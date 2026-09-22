import { NextRequest } from "next/server";
import { listAuditLogs } from "@/services/dashboard-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return listAuditLogs(request, id);
}

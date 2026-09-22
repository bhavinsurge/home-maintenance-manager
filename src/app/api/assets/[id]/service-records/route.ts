import { NextRequest } from "next/server";
import {
  createServiceRecord,
  listServiceRecords,
} from "@/services/maintenance-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return listServiceRecords(request, id);
}

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return createServiceRecord(request, id);
}

import { NextRequest } from "next/server";
import { createSchedule, listSchedules } from "@/services/maintenance-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return listSchedules(request, id);
}

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return createSchedule(request, id);
}

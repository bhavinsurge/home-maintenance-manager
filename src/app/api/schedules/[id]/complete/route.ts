import { NextRequest } from "next/server";
import { completeSchedule } from "@/services/maintenance-service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return completeSchedule(request, id);
}

import { NextRequest } from "next/server";
import { addMember, listMembers } from "@/services/household-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return listMembers(request, id);
}

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return addMember(request, id);
}

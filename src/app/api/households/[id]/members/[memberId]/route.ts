import { NextRequest } from "next/server";
import { removeMember, updateMemberRole } from "@/services/household-service";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id, memberId } = await context.params;
  return updateMemberRole(request, id, memberId);
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id, memberId } = await context.params;
  return removeMember(request, id, memberId);
}

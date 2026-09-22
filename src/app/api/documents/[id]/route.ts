import { NextRequest } from "next/server";
import { deleteDocument } from "@/services/document-service";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return deleteDocument(request, id);
}

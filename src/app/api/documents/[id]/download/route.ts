import { NextRequest } from "next/server";
import { downloadDocument } from "@/services/document-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return downloadDocument(request, id);
}

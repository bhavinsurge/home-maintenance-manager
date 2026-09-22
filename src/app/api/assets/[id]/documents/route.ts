import { NextRequest } from "next/server";
import { uploadAssetDocument } from "@/services/document-service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const { id } = await context.params;
  return uploadAssetDocument(request, id);
}

import { NextRequest } from "next/server";
import { POST_refresh } from "@/services/auth-service";

export async function POST(request: NextRequest) {
  return POST_refresh(request);
}

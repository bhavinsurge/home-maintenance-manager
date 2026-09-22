import { NextRequest } from "next/server";
import { POST_register } from "@/services/auth-service";

export async function POST(request: NextRequest) {
  return POST_register(request);
}

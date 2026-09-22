import { NextRequest } from "next/server";
import { POST_login } from "@/services/auth-service";

export async function POST(request: NextRequest) {
  return POST_login(request);
}

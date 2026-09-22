import { NextRequest } from "next/server";
import { POST_logout } from "@/services/auth-service";

export async function POST(request: NextRequest) {
  return POST_logout(request);
}

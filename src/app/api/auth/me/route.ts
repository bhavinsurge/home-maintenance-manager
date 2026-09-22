import { NextRequest } from "next/server";
import { GET_me } from "@/services/auth-service";

export async function GET(request: NextRequest) {
  return GET_me(request);
}

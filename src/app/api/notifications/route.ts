import { NextRequest } from "next/server";
import { listNotifications } from "@/services/dashboard-service";

export async function GET(request: NextRequest) {
  return listNotifications(request);
}

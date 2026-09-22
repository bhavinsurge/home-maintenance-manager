import { NextRequest } from "next/server";
import { markAllNotificationsRead } from "@/services/dashboard-service";

export async function POST(request: NextRequest) {
  return markAllNotificationsRead(request);
}

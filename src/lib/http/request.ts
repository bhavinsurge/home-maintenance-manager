import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { rateLimited } from "@/lib/errors/app-error";
import { consumeRateLimit } from "@/lib/cache/redis";

export function getRequestId(request: NextRequest) {
  return request.headers.get("x-request-id") ?? randomUUID();
}

export function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const result = await consumeRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw rateLimited();
  }
  return result;
}

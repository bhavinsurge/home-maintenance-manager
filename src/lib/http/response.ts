import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details: unknown };
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccess<T>, {
    status: 200,
    ...init,
  });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccess<T>, {
    status: 201,
  });
}

export function fail(error: AppError, requestId?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    } satisfies ApiFailure,
    {
      status: error.status,
      headers: requestId ? { "x-request-id": requestId } : undefined,
    },
  );
}

export function handleRouteError(error: unknown, requestId: string) {
  if (error instanceof AppError) {
    if (error.status >= 500) {
      logger.error({ err: error, requestId }, error.message);
    } else {
      logger.warn({ err: error, requestId, code: error.code }, error.message);
    }
    return fail(error, requestId);
  }

  if (error instanceof ZodError) {
    return fail(
      new AppError("VALIDATION_ERROR", "Request validation failed", 400, error.flatten()),
      requestId,
    );
  }

  logger.error({ err: error, requestId }, "Unhandled error");
  return fail(
    new AppError("INTERNAL_ERROR", "An unexpected error occurred", 500),
    requestId,
  );
}

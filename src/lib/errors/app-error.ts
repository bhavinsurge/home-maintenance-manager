export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details ?? null;
  }
}

export function validationError(message: string, details?: unknown) {
  return new AppError("VALIDATION_ERROR", message, 400, details);
}

export function unauthorized(message = "Authentication required") {
  return new AppError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "You do not have permission to perform this action") {
  return new AppError("FORBIDDEN", message, 403);
}

export function notFound(message = "Resource was not found") {
  return new AppError("RESOURCE_NOT_FOUND", message, 404);
}

export function conflict(message: string, details?: unknown) {
  return new AppError("CONFLICT", message, 409, details);
}

export function rateLimited(message = "Too many requests. Please try again later.") {
  return new AppError("RATE_LIMITED", message, 429);
}

export function badRequest(message: string, details?: unknown) {
  return new AppError("BAD_REQUEST", message, 400, details);
}

export function serviceUnavailable(message: string) {
  return new AppError("SERVICE_UNAVAILABLE", message, 503);
}

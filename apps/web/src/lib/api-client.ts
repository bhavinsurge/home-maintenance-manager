export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export class ApiClientError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    body,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      throw new ApiClientError(response.statusText || "Request failed", "HTTP_ERROR", response.status);
    }
    return undefined as T;
  }

  const payload = (await response.json()) as ApiResult<T>;
  if (!payload.success) {
    throw new ApiClientError(
      payload.error.message,
      payload.error.code,
      response.status,
      payload.error.details,
    );
  }
  return payload.data;
}

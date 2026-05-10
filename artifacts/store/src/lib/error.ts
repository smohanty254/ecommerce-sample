export interface ApiErrorShape {
  error?: string;
  message?: string;
  code?: string;
  details?: { path: string; message: string }[];
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: ApiErrorShape["details"],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function parseApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details && err.details.length > 0) {
      return err.details.map((d) => `${d.path}: ${d.message}`).join(", ");
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred";
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

export function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

export function isClientError(err: unknown): boolean {
  return err instanceof ApiError && err.status >= 400 && err.status < 500;
}

export function shouldRetry(failureCount: number, err: Error): boolean {
  if (err instanceof ApiError && err.status < 500) return false;
  return failureCount < 2;
}

import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { captureError } from "../lib/logger";

const HTTP_STATUS_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  501: "NOT_IMPLEMENTED",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
};

function statusToCode(status: number): string {
  return HTTP_STATUS_CODES[status] ?? "INTERNAL_SERVER_ERROR";
}

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Hono onError handler — wire with `app.onError(errorHandler())`.
 *
 * Returns structured JSON for all thrown errors:
 *   { error: { code, message } }
 *
 * In production, internal error messages are suppressed.
 */
export function errorHandler(): (err: Error, c: Context) => Response {
  return (err: Error, c: Context): Response => {
    if (err instanceof HTTPException) {
      const code = statusToCode(err.status);
      return c.json(
        { error: { code, message: err.message } },
        err.status as
          | 400
          | 401
          | 403
          | 404
          | 405
          | 409
          | 422
          | 429
          | 500
          | 502
          | 503,
      );
    }

    // Unknown error — capture it and return 500
    captureError(err);

    const message = isProduction()
      ? "An unexpected error occurred"
      : err instanceof Error
        ? err.message
        : String(err);

    return c.json({ error: { code: "INTERNAL_SERVER_ERROR", message } }, 500);
  };
}

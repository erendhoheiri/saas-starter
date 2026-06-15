export interface LogPayload {
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  msg?: string;
  level?: string;
  [key: string]: unknown;
}

function writeJson(payload: LogPayload): void {
  process.stdout.write(JSON.stringify(payload) + "\n");
}

export const logger = {
  info(payload: LogPayload): void {
    writeJson({ level: "info", ...payload });
  },
  error(payload: LogPayload): void {
    writeJson({ level: "error", ...payload });
  },
  warn(payload: LogPayload): void {
    writeJson({ level: "warn", ...payload });
  },
};

/**
 * Stub for capturing errors to an external service (e.g. Sentry).
 * TODO: replace console.error with actual Sentry.captureException(err) call.
 */
export function captureError(err: unknown): void {
  // TODO: integrate Sentry — Sentry.captureException(err)
  console.error("[captureError]", err);
}

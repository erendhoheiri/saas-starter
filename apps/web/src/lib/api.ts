import type { AppType } from "@starter/api/routes";
import { hc } from "hono/client";

// In dev (VITE_API_URL unset) requests go to the same origin as the page,
// so the Vite proxy forwards /api/* to the API server and cookies are
// same-origin (no CORS). In production set VITE_API_URL to the API origin.
export const api = hc<AppType>(
  import.meta.env.VITE_API_URL || window.location.origin,
  { init: { credentials: "include" } },
);

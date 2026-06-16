import type { AppType } from "@starter/api/routes";
import { hc } from "hono/client";

export const api = hc<AppType>(
  import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  { init: { credentials: "include" } },
);

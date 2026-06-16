import { hc } from "hono/client"
import type { AppType } from "@starter/api/routes"

export const api = hc<AppType>(import.meta.env.VITE_API_URL ?? "http://localhost:3000")

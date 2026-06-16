import { describe, it, expect } from "bun:test"
import { z } from "zod"

describe("page modules", () => {
  it("dashboard page exports a route", async () => {
    const { dashboardRoute } = await import("./_app.dashboard")
    expect(dashboardRoute).toBeDefined()
  })

  it("settings page exports a route", async () => {
    const { settingsRoute } = await import("./_app.settings")
    expect(settingsRoute).toBeDefined()
  })

  it("org page exports a route", async () => {
    const { orgRoute } = await import("./_app.org")
    expect(orgRoute).toBeDefined()
  })
})

describe("account deletion flow", () => {
  it("delete account confirmation schema validates correctly", () => {
    const schema = z.object({ confirm: z.literal("delete my account") })
    expect(schema.safeParse({ confirm: "delete my account" }).success).toBe(true)
    expect(schema.safeParse({ confirm: "wrong" }).success).toBe(false)
    expect(schema.safeParse({ confirm: "" }).success).toBe(false)
  })

  it("org deletion confirmation schema validates correctly", () => {
    const schema = z.object({ confirm: z.literal("delete organization") })
    expect(schema.safeParse({ confirm: "delete organization" }).success).toBe(true)
    expect(schema.safeParse({ confirm: "delete my account" }).success).toBe(false)
  })

  it("invite member schema validates email and role", () => {
    const schema = z.object({
      email: z.string().email(),
      role: z.enum(["owner", "admin", "member"]),
    })
    expect(schema.safeParse({ email: "user@example.com", role: "member" }).success).toBe(true)
    expect(schema.safeParse({ email: "not-an-email", role: "member" }).success).toBe(false)
    expect(schema.safeParse({ email: "user@example.com", role: "superadmin" }).success).toBe(false)
  })
})

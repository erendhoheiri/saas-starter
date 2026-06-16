import { describe, expect, it } from "bun:test";

describe("admin modules", () => {
  it("admin users module exports a route", async () => {
    const { adminUsersRoute } = await import("./_admin.users");
    expect(adminUsersRoute).toBeDefined();
  });
  it("admin orgs module exports a route", async () => {
    const { adminOrgsRoute } = await import("./_admin.orgs");
    expect(adminOrgsRoute).toBeDefined();
  });
  it("impersonation banner exports component", async () => {
    const { ImpersonationBanner } = await import(
      "../components/impersonation-banner"
    );
    expect(typeof ImpersonationBanner).toBe("function");
  });
});

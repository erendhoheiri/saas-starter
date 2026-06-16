import { describe, expect, it } from "bun:test";

// Smoke test: verify the OrgSwitcher module loads and exports the component
describe("OrgSwitcher", () => {
  it("exports OrgSwitcher component", async () => {
    // Dynamic import to verify the module loads without errors
    const mod = await import("./org-switcher");
    expect(typeof mod.OrgSwitcher).toBe("function");
  });
});

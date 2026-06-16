import { describe, it, expect } from "bun:test"
import { api } from "./api"

describe("api client", () => {
  it("has expected route namespaces", () => {
    expect(api.api).toBeDefined()
  })
})

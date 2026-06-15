import { describe, expect, it } from "bun:test";
import { parseEnv } from "./env";

const validEnv = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/starter",
  AUTH_SECRET: "super-secret-value",
  APP_URL: "http://localhost:5173",
  API_URL: "http://localhost:3000",
};

describe("parseEnv", () => {
  it("throws an Error naming a missing required var", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("lists all missing required vars in the message", () => {
    let message = "";
    try {
      parseEnv({});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("DATABASE_URL");
    expect(message).toContain("AUTH_SECRET");
    expect(message).toContain("APP_URL");
    expect(message).toContain("API_URL");
  });

  it("returns a typed object with parsed values", () => {
    const env = parseEnv(validEnv);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.AUTH_SECRET).toBe(validEnv.AUTH_SECRET);
    expect(env.APP_URL).toBe(validEnv.APP_URL);
    expect(env.API_URL).toBe(validEnv.API_URL);
  });

  it("applies defaults for provider vars", () => {
    const env = parseEnv(validEnv);
    expect(env.EMAIL_PROVIDER).toBe("console");
    expect(env.STORAGE_PROVIDER).toBe("local");
  });
});

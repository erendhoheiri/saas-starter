import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { forgotPasswordSchema } from "@/routes/forgot-password";
import { loginSchema } from "@/routes/login";
import { resetPasswordSchema } from "@/routes/reset-password";
import { signupSchema } from "@/routes/signup";

describe("login form schema", () => {
  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "bad",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });
});

describe("signup form schema", () => {
  it("rejects missing name", () => {
    const result = signupSchema.safeParse({
      name: "",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Alice",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
  it("accepts valid signup data", () => {
    const result = signupSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });
});

describe("forgot password form schema", () => {
  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "notvalid" });
    expect(result.success).toBe(false);
  });
  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("reset password form schema", () => {
  it("rejects short password", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });
  it("rejects mismatched passwords", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "password123",
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
  });
  it("accepts matching valid passwords", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
  });
});

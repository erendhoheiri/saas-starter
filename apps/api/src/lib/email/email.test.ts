import { describe, expect, it, spyOn } from "bun:test";
import { ConsoleEmailProvider } from "./console";
import { createEmailProvider } from "./index";

describe("ConsoleEmailProvider", () => {
  it("logs a structured payload to stdout on send", async () => {
    const provider = new ConsoleEmailProvider();
    const writes: string[] = [];
    const spy = spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    });

    await provider.send({
      to: "hello@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    spy.mockRestore();

    expect(writes.length).toBeGreaterThanOrEqual(1);
    const payload = JSON.parse(writes[0] ?? "{}");
    expect(payload.to).toBe("hello@example.com");
    expect(payload.subject).toBe("Test Subject");
    expect(payload.html).toBe("<p>Hello</p>");
    expect(payload.text).toBe("Hello");
  });

  it("works without optional text field", async () => {
    const provider = new ConsoleEmailProvider();
    const writes: string[] = [];
    const spy = spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    });

    await provider.send({
      to: "no-text@example.com",
      subject: "No Text",
      html: "<p>body</p>",
    });

    spy.mockRestore();

    expect(writes.length).toBeGreaterThanOrEqual(1);
    const payload = JSON.parse(writes[0] ?? "{}");
    expect(payload.to).toBe("no-text@example.com");
  });
});

describe("createEmailProvider", () => {
  it("returns ConsoleEmailProvider when EMAIL_PROVIDER=console", () => {
    const provider = createEmailProvider({ EMAIL_PROVIDER: "console" });
    expect(provider).toBeInstanceOf(ConsoleEmailProvider);
  });

  it("returns a ResendEmailProvider instance when EMAIL_PROVIDER=resend", () => {
    // We don't need a real API key for instantiation — just verify the factory returns an object
    const provider = createEmailProvider({ EMAIL_PROVIDER: "resend" });
    expect(typeof provider.send).toBe("function");
  });

  it("ResendEmailProvider throws when send is called without RESEND_API_KEY", async () => {
    const provider = createEmailProvider({
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: undefined,
    });
    await expect(
      provider.send({
        to: "x@example.com",
        subject: "s",
        html: "<p>h</p>",
      }),
    ).rejects.toThrow("Resend not configured");
  });
});

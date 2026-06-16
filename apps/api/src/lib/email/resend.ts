import type { EmailProvider, SendEmailOptions } from "./index";

export class ResendEmailProvider implements EmailProvider {
  private apiKey: string | undefined;

  constructor(apiKey: string | undefined) {
    this.apiKey = apiKey;
  }

  async send(options: SendEmailOptions): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Resend not configured: RESEND_API_KEY is missing");
    }

    // Dynamically import resend only when an API key is available
    // biome-ignore lint/suspicious/noExplicitAny: resend is an optional peer dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Resend } = await import("resend" as any);
    const resend = new Resend(this.apiKey);

    await resend.emails.send({
      from: "noreply@example.com",
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text !== undefined ? { text: options.text } : {}),
    });
  }
}

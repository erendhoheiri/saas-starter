import type { EmailProvider, SendEmailOptions } from "./index";

export class ConsoleEmailProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<void> {
    process.stdout.write(
      `${JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.text !== undefined ? { text: options.text } : {}),
      })}\n`,
    );
  }
}

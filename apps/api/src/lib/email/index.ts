import { ConsoleEmailProvider } from "./console";
import { ResendEmailProvider } from "./resend";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<void>;
}

interface EmailEnv {
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
}

export function createEmailProvider(
  env: EmailEnv = process.env as unknown as EmailEnv,
): EmailProvider {
  if (env.EMAIL_PROVIDER === "resend") {
    return new ResendEmailProvider(env.RESEND_API_KEY);
  }
  return new ConsoleEmailProvider();
}

export { ConsoleEmailProvider } from "./console";
export { ResendEmailProvider } from "./resend";

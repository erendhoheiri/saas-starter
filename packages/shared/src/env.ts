import { z } from "zod";

/**
 * Environment variable schema for the SaaS starter.
 *
 * Required vars must be present and non-empty. Provider selectors have sane
 * local defaults. Everything else is optional and only needed when the
 * corresponding provider is enabled.
 */
export const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),

  // Provider selectors (with defaults)
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),

  // Optional — test database
  TEST_DATABASE_URL: z.string().min(1).optional(),

  // Optional — email (Resend)
  RESEND_API_KEY: z.string().min(1).optional(),

  // Optional — storage (S3)
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_ENDPOINT: z.string().min(1).optional(),

  // Optional — OAuth
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

  // Optional — observability
  SENTRY_DSN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 *
 * @param source - the raw env source, defaults to `process.env`.
 * @throws Error listing every invalid/missing variable on failure.
 */
export function parseEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.join(".") || "(root)";
        return `  - ${path}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return result.data;
}

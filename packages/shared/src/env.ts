import { z } from "zod";

/**
 * Wrap an optional schema so that empty-string values (common in `.env` files,
 * e.g. `TEST_DATABASE_URL=`) are treated as absent rather than failing
 * validation.
 */
function optionalNonEmpty<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
}

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
  APP_URL: z.url(),
  API_URL: z.url(),

  // Provider selectors (with defaults)
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),

  // Optional — test database
  TEST_DATABASE_URL: optionalNonEmpty(z.string().min(1)),

  // Optional — email (Resend)
  RESEND_API_KEY: optionalNonEmpty(z.string().min(1)),

  // Optional — storage (S3)
  S3_REGION: optionalNonEmpty(z.string().min(1)),
  S3_BUCKET: optionalNonEmpty(z.string().min(1)),
  S3_ACCESS_KEY_ID: optionalNonEmpty(z.string().min(1)),
  S3_SECRET_ACCESS_KEY: optionalNonEmpty(z.string().min(1)),
  S3_ENDPOINT: optionalNonEmpty(z.string().min(1)),

  // Optional — OAuth
  GOOGLE_CLIENT_ID: optionalNonEmpty(z.string().min(1)),
  GOOGLE_CLIENT_SECRET: optionalNonEmpty(z.string().min(1)),
  GITHUB_CLIENT_ID: optionalNonEmpty(z.string().min(1)),
  GITHUB_CLIENT_SECRET: optionalNonEmpty(z.string().min(1)),

  // Optional — observability
  SENTRY_DSN: optionalNonEmpty(z.string().min(1)),
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

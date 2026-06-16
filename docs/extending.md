# Extending the Starter

Common extension patterns for this monorepo.

## Adding a tenant-scoped table

All multi-tenant data should be scoped to an organization. Use the `tenantTable()` helper from `packages/db/src/schema/_helpers.ts`, which automatically adds `orgId`, `id`, `createdAt`, and `updatedAt` columns.

1. Create the schema file, e.g. `packages/db/src/schema/widgets.ts`:

```ts
import { text } from "drizzle-orm/pg-core";
import { tenantTable, timestamps } from "./_helpers";

export const widget = tenantTable("widget", {
  name: text("name").notNull(),
  description: text("description"),
});
```

2. Export it from the schema index (`packages/db/src/schema/index.ts`):

```ts
export * from "./widgets";
```

3. Generate and apply the migration:

```bash
bun run --cwd packages/db db:generate
bun run db:migrate
```

4. Add an isolation test to verify org-level row separation using `withTestDb`:

```ts
import { withTestDb } from "../test-utils";
import { widget } from "./widgets";

test("widgets are org-isolated", async () => {
  await withTestDb(async (db, orgA, orgB) => {
    await db.insert(widget).values({ orgId: orgA.id, name: "A widget" });
    const forB = await db.select().from(widget).where(eq(widget.orgId, orgB.id));
    expect(forB).toHaveLength(0);
  });
});
```

## Swapping the email provider

The email system uses the `EmailProvider` interface (`apps/api/src/lib/email/index.ts`). The default provider logs to the console; Resend is built in.

**Enable Resend:**

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
```

**Implement a custom provider:**

Create a class that satisfies `EmailProvider`:

```ts
// apps/api/src/lib/email/my-provider.ts
import type { EmailProvider, SendEmailOptions } from "./index";

export class MyEmailProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<void> {
    // call your email API here
  }
}
```

Then register it in `createEmailProvider()` in `apps/api/src/lib/email/index.ts`.

## Swapping the storage provider

The storage system uses the `StorageProvider` interface (`apps/api/src/lib/storage/index.ts`). Local disk is the default; S3-compatible storage is built in.

**Enable S3:**

```env
STORAGE_PROVIDER=s3
S3_BUCKET=my-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
# Optional: S3_ENDPOINT=https://... (for R2, MinIO, etc.)
```

**Implement a custom provider:**

```ts
// apps/api/src/lib/storage/my-provider.ts
import type { StorageProvider } from "./index";

export class MyStorageProvider implements StorageProvider {
  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> { ... }
  async download(key: string): Promise<Buffer> { ... }
  async delete(key: string): Promise<void> { ... }
  getUrl(key: string): string { ... }
}
```

Register it in `createStorageProvider()` in `apps/api/src/lib/storage/index.ts`.

## Adding a billing provider (Stripe or similar)

The `subscription` table is already defined in the schema as a dormant slot — it tracks plan, status, and period dates per organization. To activate it:

1. Install the provider SDK (e.g. `bun add stripe --cwd apps/api`).
2. Create a billing module under `apps/api/src/modules/billing/`.
3. Add webhook handling for subscription lifecycle events (created, updated, deleted) and sync state to the `subscription` table.
4. Expose billing endpoints (checkout session, customer portal) from the module and mount them in `apps/api/src/routes.ts`.
5. Gate feature access by checking `subscription.status` in your route middleware or guards.

## Adding social auth providers

Social providers are auto-enabled when the corresponding environment variables are set. `buildSocialProviders()` in `packages/auth/src/server.ts` reads them at startup.

**Google:**

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**GitHub:**

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

No code changes are required — just set the variables and restart the API. The Better Auth client picks up the new providers automatically.

To add a provider not yet wired (e.g. Microsoft, Apple), add a similar `if` block inside `buildSocialProviders()` and the corresponding env vars to `packages/shared/src/env.ts`.

## Stripping the demo scaffolding

To start with a clean slate (no seed data or admin panel):

1. Delete `packages/db/src/seed.ts` and remove the `db:seed` script from `packages/db/package.json`.
2. Delete `apps/api/src/modules/admin/`.
3. Remove the admin route registration from `apps/api/src/routes.ts` and `apps/api/src/app.ts`.
4. Optionally remove the `_admin` route files from `apps/web/src/routes/`.

The rest of the stack (auth, org management, settings) continues to work unchanged.

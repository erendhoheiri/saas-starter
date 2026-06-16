import { createId } from "@paralleldrive/cuid2";
import { parseEnv } from "@starter/shared";
import { and, eq } from "drizzle-orm";
import { createDb } from "./client";
import { loadEnv } from "./load-env";
import { account, member, organization, user } from "./schema";

/**
 * Seed users. Passwords are hashed at runtime — change these before seeding a
 * shared/staging environment.
 */
const SEED_USERS = [
  {
    name: "Demo Admin",
    email: "admin@example.com",
    password: "Admin1234!",
    role: "admin" as const,
  },
  {
    name: "Demo Owner",
    email: "owner@example.com",
    password: "Owner1234!",
    role: "user" as const,
  },
  {
    name: "Demo Member",
    email: "member@example.com",
    password: "Member1234!",
    role: "user" as const,
  },
] satisfies {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
}[];

/**
 * Idempotent demo seed.
 *
 * For each seed user:
 *   - upserts the `user` row
 *   - upserts the `account` credential row (so Better Auth can verify the
 *     password at sign-in — the previous seed omitted this, making sign-in
 *     impossible)
 *   - creates a personal org (slug: `personal-<userId>`) that mirrors what
 *     the Better Auth `databaseHooks.user.create.after` would have done
 *
 * Also creates a shared "Demo Org" for multi-tenant testing, with Demo Owner
 * as owner and Demo Member as member.
 *
 * Safe to run repeatedly — all writes use ON CONFLICT guards.
 */
export async function seed(databaseUrl: string): Promise<void> {
  const { db, client } = createDb(databaseUrl);
  try {
    const seededUsers: { id: string; email: string; role: string }[] = [];

    for (const u of SEED_USERS) {
      const hashedPassword = await Bun.password.hash(u.password, "argon2id");

      // Upsert user (conflict on unique email).
      const [seededUser] = await db
        .insert(user)
        .values({
          id: createId(),
          name: u.name,
          email: u.email,
          emailVerified: true,
          role: u.role,
        })
        .onConflictDoUpdate({
          target: user.email,
          set: { name: u.name, role: u.role, emailVerified: true },
        })
        .returning();

      if (!seededUser) throw new Error(`failed to seed user ${u.email}`);
      seededUsers.push(seededUser);

      // Upsert credential account. No DB-level unique on (userId, providerId),
      // so we do a manual check-then-update.
      const [existingAccount] = await db
        .select({ id: account.id })
        .from(account)
        .where(
          and(
            eq(account.userId, seededUser.id),
            eq(account.providerId, "credential"),
          ),
        )
        .limit(1);

      if (existingAccount) {
        await db
          .update(account)
          .set({ password: hashedPassword })
          .where(eq(account.id, existingAccount.id));
      } else {
        await db.insert(account).values({
          userId: seededUser.id,
          accountId: seededUser.id,
          providerId: "credential",
          password: hashedPassword,
        });
      }

      // Personal org — mirrors the databaseHooks.user.create.after logic.
      // onConflictDoNothing so users who signed up normally (hook already ran)
      // are not affected.
      const personalSlug = `personal-${seededUser.id}`;
      const [personalOrg] = await db
        .insert(organization)
        .values({ name: u.name, slug: personalSlug })
        .onConflictDoNothing({ target: organization.slug })
        .returning();

      if (personalOrg) {
        // Only add membership when we just created the org; if it already
        // existed, the membership was created by the hook.
        await db
          .insert(member)
          .values({
            userId: seededUser.id,
            organizationId: personalOrg.id,
            role: "owner",
          })
          .onConflictDoNothing();
      }
    }

    // Shared "Demo Org" for multi-tenant testing.
    const [demoOrg] = await db
      .insert(organization)
      .values({ name: "Demo Org", slug: "demo-org" })
      .onConflictDoUpdate({
        target: organization.slug,
        set: { name: "Demo Org" },
      })
      .returning();

    if (!demoOrg) throw new Error("failed to seed Demo Org");

    const ownerUser = seededUsers.find((u) => u.email === "owner@example.com");
    const memberUser = seededUsers.find(
      (u) => u.email === "member@example.com",
    );

    if (ownerUser) {
      await db
        .insert(member)
        .values({
          userId: ownerUser.id,
          organizationId: demoOrg.id,
          role: "owner",
        })
        .onConflictDoUpdate({
          target: [member.userId, member.organizationId],
          set: { role: "owner" },
        });
    }

    if (memberUser) {
      await db
        .insert(member)
        .values({
          userId: memberUser.id,
          organizationId: demoOrg.id,
          role: "member",
        })
        .onConflictDoUpdate({
          target: [member.userId, member.organizationId],
          set: { role: "member" },
        });
    }

    console.log("\nSeed complete. Test credentials:\n");
    console.log("  Email                   Password       Role");
    console.log("  ──────────────────────  ─────────────  ──────");
    for (const u of SEED_USERS) {
      console.log(
        `  ${u.email.padEnd(22)}  ${u.password.padEnd(13)}  ${u.role}`,
      );
    }
    console.log();
    console.log(
      `  Shared org: "${demoOrg.slug}" (owner@, member@ are members)`,
    );
    console.log();
  } finally {
    await client.end({ timeout: 5 });
  }
}

// Run when invoked directly (`bun run db:seed`).
if (import.meta.main) {
  loadEnv();
  const env = parseEnv();
  await seed(env.DATABASE_URL);
}

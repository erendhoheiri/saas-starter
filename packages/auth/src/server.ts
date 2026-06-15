import { db, schema } from "@starter/db";
import { parseEnv } from "@starter/shared";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

const env = parseEnv();

/**
 * Build the socialProviders config object, gated on env presence.
 * Only includes a provider when both client ID and secret are set.
 */
function buildSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> =
    {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }

  return providers;
}

export const auth = betterAuth({
  baseURL: env.API_URL,
  secret: env.AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
    },
  }),

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO(Phase 3, Task 3.4): replace with real email service
      console.log(`[auth] password-reset email → ${user.email}: ${url}`);
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // TODO(Phase 3, Task 3.4): replace with real email service
      console.log(`[auth] verification email → ${user.email}: ${url}`);
    },
    sendOnSignUp: true,
  },

  socialProviders: buildSocialProviders(),

  plugins: [organization()],

  databaseHooks: {
    user: {
      create: {
        /**
         * After a new user is persisted, create their personal organization via
         * the organization plugin's internal API.
         */
        after: async (user) => {
          try {
            await auth.api.createOrganization({
              body: {
                name: user.name,
                slug: `personal-${user.id}`,
                userId: user.id,
              },
            });
          } catch (err) {
            // Non-fatal: log but don't block sign-up
            console.error(
              "[auth] failed to create personal org for user",
              user.id,
              err,
            );
          }
        },
      },
    },
  },
});

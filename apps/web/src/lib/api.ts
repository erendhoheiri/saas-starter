import type { AppType } from "@starter/api/routes";
import type {
  AccountProfile,
  AdminOrg,
  AdminUser,
  Paginated,
} from "@starter/shared";
import { hc } from "hono/client";

// In dev (VITE_API_URL unset) requests go to the same origin as the page,
// so the Vite proxy forwards /api/* to the API server and cookies are
// same-origin (no CORS). In production set VITE_API_URL to the API origin.
//
// `window` is guarded so this module can be imported in non-DOM environments
// (e.g. the test runner) without throwing at module-eval time.
const baseUrl =
  import.meta.env?.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost");

/**
 * Minimal response surface used by callers (`res.ok`, `await res.json()`).
 * JSON is returned as `unknown` — callers narrow it to the expected shape.
 */
interface Res<T = unknown> {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<T>;
}

interface PageQuery {
  q?: string;
  page?: string;
  limit?: string;
}

type UserAction = { $post(args: { param: { userId: string } }): Promise<Res> };

/**
 * Hand-written type for the RPC client. Hono's `hc<AppType>` inference collapses
 * to `unknown` when `AppType` is resolved across the workspace boundary under
 * `tsc -b`, so we describe the exact surface the app uses. This still type-checks
 * every path, route param, query, and request body — only response bodies are
 * intentionally `unknown` and narrowed at the call site.
 */
interface ApiClient {
  api: {
    account: {
      me: {
        $get(): Promise<Res<AccountProfile>>;
        $patch(args: { json: { name: string } }): Promise<Res>;
        $delete(): Promise<Res>;
      };
      export: { $get(): Promise<Res> };
      orgs: Record<
        ":orgId",
        { $delete(args: { param: { orgId: string } }): Promise<Res> }
      >;
    };
    organizations: {
      invite: {
        $post(args: {
          json: { email: string; role: string; organizationId?: string };
        }): Promise<Res>;
      };
      members: {
        role: {
          $post(args: {
            json: { memberId: string; role: string; organizationId?: string };
          }): Promise<Res>;
        };
        remove: {
          $post(args: {
            json: { memberIdOrEmail: string; organizationId?: string };
          }): Promise<Res>;
        };
      };
    };
    admin: {
      users: {
        $get(args: { query: PageQuery }): Promise<Res<Paginated<AdminUser>>>;
      } & Record<
        ":userId",
        { suspend: UserAction; unsuspend: UserAction; impersonate: UserAction }
      >;
      orgs: {
        $get(args: { query: PageQuery }): Promise<Res<Paginated<AdminOrg>>>;
      };
      impersonate: { exit: { $post(): Promise<Res> } };
    };
  };
}

export const api = hc<AppType>(baseUrl, {
  init: { credentials: "include" },
}) as unknown as ApiClient;

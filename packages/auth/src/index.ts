export type { Auth } from "better-auth";
export { auth, handler } from "./server";

// Inferred session/user types derived from the configured auth instance.
// Consumers (e.g. the API layer) import these instead of spelling out the
// generic parameters manually.
export type Session = typeof import("./server").auth.$Infer.Session.session;
export type User = typeof import("./server").auth.$Infer.Session.user;

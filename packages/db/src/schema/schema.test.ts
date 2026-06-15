import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { scopedTo } from "../query";
import { note } from "../test-fixtures/note";
import { makeOrg, withTestDb } from "../test-helpers";
import { organization } from "./index";

describe("tenant isolation", () => {
  test("a query scoped to org A returns only org A's rows, never org B's", async () => {
    await withTestDb(async (db) => {
      // Two organizations.
      const [orgA] = await db
        .insert(organization)
        .values(makeOrg({ name: "A" }))
        .returning();
      const [orgB] = await db
        .insert(organization)
        .values(makeOrg({ name: "B" }))
        .returning();
      if (!orgA || !orgB) throw new Error("failed to insert orgs");

      // A row in the tenant-scoped `note` table for each org.
      await db.insert(note).values([
        { organizationId: orgA.id, title: "A-note-1" },
        { organizationId: orgA.id, title: "A-note-2" },
        { organizationId: orgB.id, title: "B-note-1" },
      ]);

      // Scoped read for org A must return ONLY org A's notes.
      const aNotes = await db
        .select()
        .from(note)
        .where(scopedTo(note, orgA.id));
      expect(aNotes).toHaveLength(2);
      expect(aNotes.every((n) => n.organizationId === orgA.id)).toBe(true);
      expect(aNotes.some((n) => n.title === "B-note-1")).toBe(false);

      // Scoped read for org B must return ONLY org B's notes.
      const bNotes = await db
        .select()
        .from(note)
        .where(scopedTo(note, orgB.id));
      expect(bNotes).toHaveLength(1);
      expect(bNotes[0]?.organizationId).toBe(orgB.id);

      // Sanity: an explicit non-scoped query sees everything (proves the
      // scoping above is what filters, not the data).
      const all = await db.select().from(note);
      expect(all).toHaveLength(3);

      // Combining scopedTo with another predicate still narrows to the org.
      const aByTitle = await db
        .select()
        .from(note)
        .where(scopedTo(note, orgA.id, eq(note.title, "A-note-1")));
      expect(aByTitle).toHaveLength(1);
      expect(aByTitle[0]?.title).toBe("A-note-1");
    });
  });
});

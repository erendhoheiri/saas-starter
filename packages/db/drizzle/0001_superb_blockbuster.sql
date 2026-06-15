CREATE TABLE "note" (
	"organization_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "note_organization_id_idx" ON "note" USING btree ("organization_id");
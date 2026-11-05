CREATE TABLE "table_view" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"table_key" text NOT NULL,
	"name" text NOT NULL,
	"state" jsonb NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"conference_id" text,
	"owner_user_id" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by_id" text,
	CONSTRAINT "table_view_owned_unless_shared" CHECK (("shared" and "owner_user_id" is null) or (not "shared" and "owner_user_id" is not null)),
	CONSTRAINT "table_view_default_is_shared" CHECK (not "is_default" or "shared")
);
--> statement-breakpoint
CREATE TABLE "table_view_default" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" text NOT NULL,
	"table_key" text NOT NULL,
	"conference_id" text NOT NULL,
	"view_id" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "table_view_table_key_conference_id_idx" ON "table_view" ("table_key","conference_id");--> statement-breakpoint
CREATE INDEX "table_view_owner_user_id_idx" ON "table_view" ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "table_view_conference_default_key" ON "table_view" ("table_key","conference_id") WHERE "is_default" and "conference_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "table_view_global_default_key" ON "table_view" ("table_key") WHERE "is_default" and "conference_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "table_view_default_user_table_conference_key" ON "table_view_default" ("user_id","table_key","conference_id");--> statement-breakpoint
CREATE INDEX "table_view_default_view_id_idx" ON "table_view_default" ("view_id");--> statement-breakpoint
ALTER TABLE "table_view" ADD CONSTRAINT "table_view_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "table_view" ADD CONSTRAINT "table_view_owner_user_id_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "table_view" ADD CONSTRAINT "table_view_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "table_view_default" ADD CONSTRAINT "table_view_default_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "table_view_default" ADD CONSTRAINT "table_view_default_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "table_view_default" ADD CONSTRAINT "table_view_default_view_id_table_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "table_view"("id") ON DELETE CASCADE ON UPDATE CASCADE;
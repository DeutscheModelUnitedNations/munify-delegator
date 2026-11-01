CREATE TABLE "school_suggestion" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"key" text NOT NULL,
	"similarity" double precision NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"conference_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_suggestion_variant" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"school" text NOT NULL,
	"sum_participants" integer NOT NULL,
	"suggestion_id" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "school_suggestion_conference_id_key_key" ON "school_suggestion" ("conference_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "school_suggestion_variant_suggestion_id_school_key" ON "school_suggestion_variant" ("suggestion_id","school");--> statement-breakpoint
ALTER TABLE "school_suggestion" ADD CONSTRAINT "school_suggestion_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "school_suggestion_variant" ADD CONSTRAINT "school_suggestion_variant_u9ar4BtxbwNE_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "school_suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;